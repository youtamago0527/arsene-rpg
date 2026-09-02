import { previousWeek, weekAt } from './time';
import { sha256, signToken, verifyGameCenterSignature, verifyToken } from './crypto';

type Session = { playerId: number; gamePlayerId: string; exp: number };
type Json = Record<string, unknown>;
type RuntimeEnv = Env & { SESSION_SECRET: string };

const json = (body: Json, status = 200, headers: HeadersInit = {}) => Response.json(body, { status, headers });
const now = () => Date.now();
const cleanName = (value: unknown) => String(value || 'PLAYER').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'PLAYER';
const bearer = (request: Request) => request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1] || '';

async function body(request: Request): Promise<Json> {
  if (Number(request.headers.get('content-length') || 0) > 16384) throw new Error('payload_too_large');
  const parsed: unknown = await request.json();
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_json');
  return parsed as Json;
}

async function session(request: Request, env: RuntimeEnv): Promise<Session | null> {
  const value = await verifyToken<Session>(bearer(request), env.SESSION_SECRET);
  return value && value.exp > now() ? value : null;
}

async function rateLimit(env: RuntimeEnv, bucket: string, subject: string, limit: number) {
  const start = Math.floor(now() / 60000) * 60000, hash = await sha256(subject);
  await env.DB.prepare(`INSERT INTO rate_limits(bucket,subject_hash,window_start,request_count) VALUES(?,?,?,1)
    ON CONFLICT(bucket,subject_hash,window_start) DO UPDATE SET request_count=request_count+1`).bind(bucket, hash, start).run();
  const row = await env.DB.prepare('SELECT request_count FROM rate_limits WHERE bucket=? AND subject_hash=? AND window_start=?').bind(bucket, hash, start).first<{ request_count: number }>();
  return (row?.request_count || 0) <= limit;
}

function cors(request: Request, env: RuntimeEnv): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-App-Attest', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' } : {};
}

async function authenticate(request: Request, env: RuntimeEnv) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!await rateLimit(env, 'auth', ip, 10)) return json({ error: 'rate_limited' }, 429);
  const data = await body(request);
  const playerId = String(data.playerId || ''), timestamp = Number(data.timestamp);
  if (!playerId || !Number.isSafeInteger(timestamp) || Math.abs(now() - timestamp) > 5 * 60_000) return json({ error: 'invalid_or_stale_identity' }, 400);
  const signature = String(data.signature || ''), salt = String(data.salt || ''), publicKeyUrl = String(data.publicKeyUrl || '');
  const signatureHash = await sha256(`${playerId}:${timestamp}:${signature}`);
  if (await env.DB.prepare('SELECT 1 ok FROM auth_replays WHERE signature_hash=?').bind(signatureHash).first()) return json({ error: 'identity_replay' }, 409);
  if (!await verifyGameCenterSignature({ playerId, bundleId: env.APPLE_BUNDLE_ID, timestamp, salt, signature, publicKeyUrl })) return json({ error: 'invalid_identity_signature' }, 401);
  const created = now(), displayName = cleanName(data.displayName);
  await env.DB.prepare(`INSERT INTO players(game_player_id,display_name,created_at,last_seen_at) VALUES(?,?,?,?)
    ON CONFLICT(game_player_id) DO UPDATE SET display_name=excluded.display_name,last_seen_at=excluded.last_seen_at`).bind(playerId, displayName, created, created).run();
  const player = await env.DB.prepare('SELECT id FROM players WHERE game_player_id=?').bind(playerId).first<{ id: number }>();
  if (!player) throw new Error('player_upsert_failed');
  await env.DB.prepare('INSERT INTO auth_replays(signature_hash,player_id,expires_at) VALUES(?,?,?)').bind(signatureHash, player.id, created + 10 * 60_000).run();
  const token = await signToken({ playerId: player.id, gamePlayerId: playerId, exp: created + 60 * 60_000 }, env.SESSION_SECRET);
  return json({ token, player: { displayName }, leaderboardId: env.GAME_CENTER_LEADERBOARD_ID, appAttest: { mode: env.APP_ATTEST_MODE } });
}

async function startRun(request: Request, env: RuntimeEnv, auth: Session) {
  if (!await rateLimit(env, 'run', String(auth.playerId), 20)) return json({ error: 'rate_limited' }, 429);
  if (String(env.APP_ATTEST_MODE) === 'required' && !request.headers.get('x-app-attest')) return json({ error: 'app_attest_required' }, 403);
  const week = weekAt(now()), nonce = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO run_nonces(nonce,player_id,week_id,started_at,expires_at,attest_key_id) VALUES(?,?,?,?,?,?)')
    .bind(nonce, auth.playerId, week.id, now(), week.endMs + 15 * 60_000, request.headers.get('x-app-attest')).run();
  return json({ runNonce: nonce, week });
}

async function submitScore(request: Request, env: RuntimeEnv, auth: Session) {
  if (!await rateLimit(env, 'score', String(auth.playerId), 30)) return json({ error: 'rate_limited' }, 429);
  const data = await body(request), floor = Number(data.floor), nonce = String(data.runNonce || ''), current = weekAt(now());
  if (!Number.isSafeInteger(floor) || floor < 1 || floor > 1_000_000 || !nonce) return json({ error: 'invalid_score' }, 400);
  const run = await env.DB.prepare('SELECT week_id,claimed_at,expires_at FROM run_nonces WHERE nonce=? AND player_id=?').bind(nonce, auth.playerId).first<{ week_id: string; claimed_at: number | null; expires_at: number }>();
  if (!run || run.claimed_at || run.expires_at < now() || run.week_id !== current.id) return json({ error: 'invalid_run_proof' }, 409);
  await env.DB.batch([
    env.DB.prepare('UPDATE run_nonces SET claimed_at=? WHERE nonce=? AND claimed_at IS NULL').bind(now(), nonce),
    env.DB.prepare(`INSERT INTO weekly_scores(week_id,player_id,max_floor,achieved_at,run_nonce,proof_version) VALUES(?,?,?,?,?,1)
      ON CONFLICT(week_id,player_id) DO UPDATE SET max_floor=excluded.max_floor,achieved_at=excluded.achieved_at,run_nonce=excluded.run_nonce
      WHERE excluded.max_floor>weekly_scores.max_floor`).bind(current.id, auth.playerId, floor, now(), nonce)
  ]);
  const score = await env.DB.prepare('SELECT max_floor FROM weekly_scores WHERE week_id=? AND player_id=?').bind(current.id, auth.playerId).first<{ max_floor: number }>();
  return json({ accepted: true, bestFloor: score?.max_floor || floor, week: current, leaderboardId: env.GAME_CENTER_LEADERBOARD_ID });
}

async function rankings(env: RuntimeEnv, auth: Session) {
  const week = weekAt(now());
  const rows = await env.DB.prepare(`SELECT p.display_name displayName,s.max_floor maxFloor,s.achieved_at achievedAt,
    (SELECT COUNT(*)+1 FROM weekly_scores x WHERE x.week_id=s.week_id AND (x.max_floor>s.max_floor OR (x.max_floor=s.max_floor AND (x.achieved_at<s.achieved_at OR (x.achieved_at=s.achieved_at AND x.player_id<s.player_id))))) rank
    FROM weekly_scores s JOIN players p ON p.id=s.player_id WHERE s.week_id=? ORDER BY s.max_floor DESC,s.achieved_at ASC,s.player_id ASC LIMIT 100`).bind(week.id).all();
  const mine = await env.DB.prepare(`SELECT s.max_floor maxFloor,(SELECT COUNT(*)+1 FROM weekly_scores x WHERE x.week_id=s.week_id AND (x.max_floor>s.max_floor OR (x.max_floor=s.max_floor AND (x.achieved_at<s.achieved_at OR (x.achieved_at=s.achieved_at AND x.player_id<s.player_id))))) rank FROM weekly_scores s WHERE s.week_id=? AND s.player_id=?`).bind(week.id, auth.playerId).first();
  return json({ week, leaderboardId: env.GAME_CENTER_LEADERBOARD_ID, rows: rows.results, me: mine || null });
}

async function gifts(env: RuntimeEnv, auth: Session) {
  const rows = await env.DB.prepare('SELECT id,week_id weekId,item_id itemId,quantity,label,granted_at grantedAt FROM reward_grants WHERE player_id=? AND claimed_at IS NULL ORDER BY granted_at').bind(auth.playerId).all();
  return json({ gifts: rows.results });
}

async function claim(request: Request, env: RuntimeEnv, auth: Session) {
  const data = await body(request), grantId = String(data.grantId || ''), claimId = String(data.claimId || '');
  if (!grantId || !/^[0-9a-f-]{36}$/i.test(claimId)) return json({ error: 'invalid_claim' }, 400);
  const existing = await env.DB.prepare('SELECT receipt FROM reward_claims WHERE claim_id=? AND player_id=?').bind(claimId, auth.playerId).first<{ receipt: string }>();
  if (existing) return json({ claimed: true, receipt: JSON.parse(existing.receipt) });
  const grant = await env.DB.prepare('SELECT id,item_id itemId,quantity,label,claimed_at claimedAt,claim_receipt claimReceipt FROM reward_grants WHERE id=? AND player_id=?').bind(grantId, auth.playerId).first<{ id: string; itemId: string; quantity: number; label: string; claimedAt: number | null; claimReceipt: string | null }>();
  if (!grant) return json({ error: 'grant_not_found' }, 404);
  if (grant.claimedAt && grant.claimReceipt) return json({ claimed: true, receipt: JSON.parse(grant.claimReceipt) });
  const receipt = JSON.stringify({ receiptId: crypto.randomUUID(), grantId, itemId: grant.itemId, quantity: grant.quantity, label: grant.label });
  const won = await env.DB.prepare('UPDATE reward_grants SET claimed_at=?,claim_receipt=? WHERE id=? AND player_id=? AND claimed_at IS NULL RETURNING claim_receipt claimReceipt').bind(now(), receipt, grantId, auth.playerId).first<{ claimReceipt: string }>();
  const canonical = won?.claimReceipt || (await env.DB.prepare('SELECT claim_receipt claimReceipt FROM reward_grants WHERE id=? AND player_id=?').bind(grantId, auth.playerId).first<{ claimReceipt: string }>())?.claimReceipt;
  if (!canonical) throw new Error('claim_race_failed');
  await env.DB.prepare('INSERT OR IGNORE INTO reward_claims(claim_id,grant_id,player_id,receipt,claimed_at) VALUES(?,?,?,?,?)').bind(claimId, grantId, auth.playerId, canonical, now()).run();
  return json({ claimed: true, receipt: JSON.parse(canonical) });
}

export async function finalizeWeek(env: RuntimeEnv, atMs = now()) {
  const week = previousWeek(atMs), finalizedAt = now();
  const scores = await env.DB.prepare('SELECT player_id,max_floor FROM weekly_scores WHERE week_id=? ORDER BY max_floor DESC,achieved_at ASC,player_id ASC').bind(week.id).all<{ player_id: number; max_floor: number }>();
  const rules = await env.DB.prepare(`SELECT reward_key,item_id,quantity,label,min_rank,max_rank FROM reward_rules WHERE enabled=1 AND active_from_week=(SELECT MAX(active_from_week) FROM reward_rules WHERE active_from_week<=?)`).bind(week.id).all<{ reward_key: string; item_id: string; quantity: number; label: string; min_rank: number; max_rank: number }>();
  const statements: D1PreparedStatement[] = [];
  scores.results.forEach((score, index) => {
    const rank = index + 1;
    statements.push(env.DB.prepare('INSERT OR IGNORE INTO weekly_results(week_id,player_id,final_rank,max_floor,finalized_at) VALUES(?,?,?,?,?)').bind(week.id, score.player_id, rank, score.max_floor, finalizedAt));
    for (const rule of rules.results.filter(x => rank >= x.min_rank && rank <= x.max_rank)) {
      statements.push(env.DB.prepare('INSERT OR IGNORE INTO reward_grants(id,week_id,player_id,reward_key,item_id,quantity,label,granted_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), week.id, score.player_id, rule.reward_key, rule.item_id, rule.quantity, rule.label, finalizedAt));
    }
  });
  for (let i = 0; i < statements.length; i += 50) await env.DB.batch(statements.slice(i, i + 50));
  return { weekId: week.id, players: scores.results.length };
}

async function route(request: Request, env: RuntimeEnv) {
  const url = new URL(request.url), method = request.method;
  if (method === 'POST' && url.pathname === '/v1/auth/game-center') return authenticate(request, env);
  const auth = await session(request, env);
  if (!auth) return json({ error: 'unauthorized' }, 401);
  if (method === 'POST' && url.pathname === '/v1/runs/start') return startRun(request, env, auth);
  if (method === 'POST' && url.pathname === '/v1/scores') return submitScore(request, env, auth);
  if (method === 'GET' && (url.pathname === '/v1/rankings/weekly' || url.pathname === '/v1/rankings/me')) return rankings(env, auth);
  if (method === 'GET' && url.pathname === '/v1/gifts') return gifts(env, auth);
  if (method === 'POST' && url.pathname === '/v1/gifts/claim') return claim(request, env, auth);
  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === 'OPTIONS') return Object.keys(headers).length ? new Response(null, { status: 204, headers }) : json({ error: 'origin_not_allowed' }, 403);
    try { const response = await route(request, env); for (const [key, value] of Object.entries(headers)) response.headers.set(key, value); response.headers.set('Cache-Control', 'no-store'); return response; }
    catch (error) { console.error(JSON.stringify({ message: 'request_failed', path: new URL(request.url).pathname, error: error instanceof Error ? error.message : String(error) })); return json({ error: 'internal_error' }, 500, headers); }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      const result = await finalizeWeek(env, controller.scheduledTime);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM auth_replays WHERE expires_at<?').bind(now()),
        env.DB.prepare('DELETE FROM rate_limits WHERE window_start<?').bind(now() - 24 * 60 * 60_000),
        env.DB.prepare('DELETE FROM run_nonces WHERE expires_at<? AND claimed_at IS NULL').bind(now() - 7 * 24 * 60 * 60_000)
      ]);
      console.log(JSON.stringify({ message: 'weekly_finalized', ...result }));
    })());
  }
} satisfies ExportedHandler<RuntimeEnv>;
