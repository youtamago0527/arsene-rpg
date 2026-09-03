import { applyD1Migrations, env, SELF } from 'cloudflare:test';
import type { D1Migration } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { signToken } from '../src/crypto';
import { weekAt } from '../src/time';
import worker from '../src/index';

declare global {
  namespace Cloudflare {
    interface Env {
      SESSION_SECRET: string;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

const origin = 'capacitor://localhost';
const request = (path: string, token: string, init: RequestInit = {}) => SELF.fetch(`https://ranking.test${path}`, {
  ...init,
  headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers }
});

describe('weekly ranking Worker', () => {
  beforeAll(async () => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

  it('fails closed when App Attest is accidentally marked required before assertion verification exists', async () => {
    const response = await worker.fetch!(new Request('https://ranking.test/v1/rankings/weekly') as never, { ...env, APP_ATTEST_MODE: 'required' } as never);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'service_disabled' });
  });

  it('consumes a run nonce once and treats an identical retry as idempotent', async () => {
    const timestamp = Date.now(), week = weekAt(timestamp), nonce = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO players(id,game_player_id,display_name,created_at,last_seen_at) VALUES(1,?,?,?,?)').bind('G:1', 'ARSENE', timestamp, timestamp).run();
    await env.DB.prepare('INSERT INTO run_nonces(nonce,player_id,week_id,started_at,expires_at) VALUES(?,?,?,?,?)').bind(nonce, 1, week.id, timestamp, week.endMs + 900000).run();
    const token = await signToken({ playerId: 1, gamePlayerId: 'G:1', exp: timestamp + 3600000 }, env.SESSION_SECRET);

    const first = await request('/v1/scores', token, { method: 'POST', body: JSON.stringify({ floor: 42, runNonce: nonce }) });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ accepted: true, bestFloor: 42 });

    const retry = await request('/v1/scores', token, { method: 'POST', body: JSON.stringify({ floor: 999, runNonce: nonce }) });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ accepted: true, replayed: true, bestFloor: 42 });

    const ranking = await request('/v1/rankings/weekly', token);
    expect(await ranking.json()).toMatchObject({ me: { rank: 1, maxFloor: 42 }, rows: [{ rank: 1, maxFloor: 42 }] });
  });

  it('returns one canonical receipt and rejects claim-id reuse for another grant', async () => {
    const timestamp = Date.now(), week = weekAt(timestamp), token = await signToken({ playerId: 1, gamePlayerId: 'G:1', exp: timestamp + 3600000 }, env.SESSION_SECRET);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO reward_grants(id,week_id,player_id,reward_key,item_id,quantity,label,granted_at) VALUES(?,?,?,?,?,?,?,?)').bind('grant-1', week.id, 1, 'r1', 'itemA', 2, 'A', timestamp),
      env.DB.prepare('INSERT INTO reward_grants(id,week_id,player_id,reward_key,item_id,quantity,label,granted_at) VALUES(?,?,?,?,?,?,?,?)').bind('grant-2', week.id, 1, 'r2', 'itemB', 1, 'B', timestamp)
    ]);
    const claimId = crypto.randomUUID(), payload = JSON.stringify({ grantId: 'grant-1', claimId });
    const first = await request('/v1/gifts/claim', token, { method: 'POST', body: payload });
    const receipt = (await first.json() as { receipt: { receiptId: string } }).receipt;
    const retry = await request('/v1/gifts/claim', token, { method: 'POST', body: payload });
    expect(await retry.json()).toMatchObject({ claimed: true, replayed: true, receipt });
    const conflict = await request('/v1/gifts/claim', token, { method: 'POST', body: JSON.stringify({ grantId: 'grant-2', claimId }) });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: 'claim_id_conflict' });
  });
});
