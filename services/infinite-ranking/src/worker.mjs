import { DAY } from './calendar.mjs';
import { digest, readSession, signSession, verifyGameCenter } from './identity.mjs';
import { acceptScore, getLeaderboard, settleRecent } from './ledger.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUUID = value => typeof value === 'string' && UUID.test(value);
const base64 = value => typeof value === 'string' && /^[a-z0-9+/]+={0,2}$/i.test(value) && value.length <= 1024;
const fail = (error, status) => Response.json({ error }, { status });

class BadRequest extends Error {}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  const reader = request.body?.getReader();
  if (!reader) throw new BadRequest('invalid_body');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8192) {
      await reader.cancel();
      throw new BadRequest('payload_too_large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {}
  throw new BadRequest('invalid_body');
}

async function authenticate(request, env, now, verifyIdentity) {
  const clientKey = digest(request.headers.get('cf-connecting-ip') || 'unknown');
  const limit = await env.DB.prepare(`INSERT INTO auth_limits(client_key, minute, requests) VALUES (?, ?, 1)
    ON CONFLICT(client_key, minute) DO UPDATE SET requests = requests + 1 RETURNING requests`)
    .bind(clientKey, Math.floor(now / 60_000)).first();
  if (limit.requests > 20) return fail('rate_limited', 429);

  const data = await readJson(request);
  if (typeof data.playerId !== 'string' || !/^[\x21-\x7e]{2,128}$/.test(data.playerId) ||
      typeof data.publicKeyUrl !== 'string' || data.publicKeyUrl.length > 240 ||
      !Number.isSafeInteger(data.timestamp) || Math.abs(now - data.timestamp) > 5 * 60_000 ||
      !base64(data.salt) || !base64(data.signature)) return fail('invalid_identity', 400);
  try { new URL(data.publicKeyUrl); } catch { return fail('invalid_identity', 400); }
  if (!await verifyIdentity(data, env, now)) return fail('invalid_identity', 401);
  const replayKey = digest(data.playerId + ':' + data.timestamp + ':' + data.signature.replace(/=+$/, ''));
  const inserted = await env.DB.prepare(`INSERT INTO auth_replays(signature_key, expires_at) VALUES (?, ?)
    ON CONFLICT DO NOTHING RETURNING signature_key`).bind(replayKey, now + 11 * 60_000).first();
  if (!inserted) return fail('identity_replay', 409);
  const playerKey = digest(env.APPLE_BUNDLE_ID + ':' + data.playerId);
  const player = await env.DB.prepare(`INSERT INTO players(player_key) VALUES (?)
    ON CONFLICT(player_key) DO UPDATE SET player_key=excluded.player_key RETURNING id, display_name`).bind(playerKey).first();
  return Response.json({ token: signSession(player.id, env.SESSION_SECRET, now), player: { id: player.id, name: player.display_name } });
}

async function register(request, env, playerId) {
  const { displayName } = await readJson(request);
  const name = typeof displayName === 'string' ? displayName.normalize('NFKC').trim() : '';
  if (Array.from(name).length < 2 || Array.from(name).length > 20 || /[\p{Cc}\p{Cf}<>]/u.test(name)) return fail('invalid_name', 400);
  const player = await env.DB.prepare('UPDATE players SET display_name = ? WHERE id = ? RETURNING id, display_name')
    .bind(name, playerId).first();
  return Response.json({ player: { id: player.id, name: player.display_name } });
}

async function startRun(request, db, playerId, now) {
  const { clientRunId } = await readJson(request);
  if (!isUUID(clientRunId)) return fail('invalid_run', 400);
  const match = db.prepare('SELECT nonce, expires_at AS expiresAt FROM ranked_runs WHERE player_id = ? AND client_run_id = ?')
    .bind(playerId, clientRunId);
  const existing = await match.first();
  if (existing) return Response.json(existing);
  // A repeated request after a timeout returns the same run instead of minting another.
  const created = await db.prepare(`INSERT INTO ranked_runs(nonce, player_id, client_run_id, started_at, expires_at)
    SELECT ?, ?, ?, ?, ? WHERE (
      SELECT COUNT(*) FROM ranked_runs WHERE player_id = ? AND started_at >= ?
    ) < 60 ON CONFLICT(player_id, client_run_id) DO NOTHING RETURNING nonce, expires_at AS expiresAt`)
    .bind(crypto.randomUUID(), playerId, clientRunId, now, now + 14 * DAY, playerId, now - 3_600_000).first();
  const run = created || await match.first();
  return run ? Response.json(run) : fail('rate_limited', 429);
}

async function submitScore(request, db, playerId, now) {
  const { nonce, floor } = await readJson(request);
  if (!isUUID(nonce) || !Number.isSafeInteger(floor) || floor < 1 || floor > 9999) return fail('invalid_score', 400);
  const inserted = await acceptScore(db, playerId, nonce, floor, now);
  if (inserted) return Response.json({ floor: inserted.floor });
  const saved = await db.prepare('SELECT floor FROM scores WHERE nonce = ? AND player_id = ?')
    .bind(nonce, playerId).first();
  if (saved?.floor === floor) return Response.json(saved);
  return fail('score_not_accepted', 409);
}

function cors(request, env) {
  const origin = request.headers.get('origin') || '';
  return (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).includes(origin) && origin
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' } : {};
}

export function createWorker({ clock = Date.now, verifyIdentity = verifyGameCenter } = {}) {
  async function route(request, env, now) {
    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.GAME_CENTER_CA_PEMS) return fail('service_not_configured', 503);
    const path = new URL(request.url).pathname;
    if (request.method === 'POST' && path === '/v1/session') return authenticate(request, env, now, verifyIdentity);
    const id = readSession(request.headers.get('authorization'), env.SESSION_SECRET, now);
    if (!id) return fail('unauthorized', 401);
    const player = await env.DB.prepare('SELECT id, display_name FROM players WHERE id = ?').bind(id).first();
    if (!player) return fail('unauthorized', 401);
    if (request.method === 'POST' && path === '/v1/registration') return register(request, env, id);
    if (!player.display_name) return fail('registration_required', 403);
    if (request.method === 'GET' && path === '/v1/leaderboard') {
      return Response.json({ ...await getLeaderboard(env.DB, id, now), displayName: player.display_name });
    }
    if (request.method === 'POST' && path === '/v1/runs') return startRun(request, env.DB, id, now);
    if (request.method === 'POST' && path === '/v1/scores') return submitScore(request, env.DB, id, now);
    return fail('not_found', 404);
  }
  return {
    async fetch(request, env) {
      const headers = cors(request, env);
      if (request.headers.has('origin') && !headers['Access-Control-Allow-Origin']) return fail('origin_not_allowed', 403);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      let response;
      try { response = await route(request, env, clock()); }
      catch (error) {
        if (error instanceof BadRequest) response = fail(error.message, 400);
        else {
          console.error('ranking request failed', error instanceof Error ? error.name : 'unknown');
          response = fail('service_unavailable', 503);
        }
      }
      for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    },
    async scheduled(controller, env) {
      const now = clock();
      await settleRecent(env.DB, controller.scheduledTime, now);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM auth_replays WHERE expires_at < ?').bind(now),
        env.DB.prepare('DELETE FROM auth_limits WHERE minute < ?').bind(Math.floor((now - DAY) / 60_000)),
        env.DB.prepare('DELETE FROM ranked_runs WHERE expires_at < ? AND NOT EXISTS (SELECT 1 FROM scores WHERE scores.nonce=ranked_runs.nonce)').bind(now)
      ]);
    }
  };
}

export default createWorker();
