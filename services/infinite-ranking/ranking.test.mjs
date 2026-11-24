import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { DAY, dayLabel, dayStart, weekStart } from './src/calendar.mjs';
import { settleCutoff } from './src/ledger.mjs';
import { createWorker } from './src/worker.mjs';

function database() {
  const local = new DatabaseSync(':memory:');
  local.exec(readFileSync(new URL('./migrations/0001_ranking.sql', import.meta.url), 'utf8'));
  const db = {
    prepare(sql) {
      const stmt = local.prepare(sql);
      const query = (...input) => ({
        first: async () => stmt.get(...input) || null,
        all: async () => ({ results: stmt.all(...input) }),
        run: async () => stmt.run(...input)
      });
      const bound = (...input) => sql.includes('?1')
        ? query(Object.fromEntries(input.map((value, i) => ['?' + (i+1), value]))) : query(...input);
      return { bind: bound, ...query() };
    },
    async batch(queries) {
      local.exec('BEGIN IMMEDIATE');
      try {
        const results = [];
        for (const query of queries) results.push(await query.all());
        local.exec('COMMIT');
        return results;
      } catch (error) { local.exec('ROLLBACK'); throw error; }
    }
  };
  return { local, db };
}

const monday = Date.parse('2026-11-23T00:00:00+09:00');
test('day and week are JST, Monday belongs to the new period', () => {
  assert.equal(dayStart(monday - 1), monday - DAY);
  assert.equal(weekStart(monday - 1), monday - 7 * DAY);
  assert.equal(dayLabel(monday - 1), '2026-11-22');
  assert.equal(weekStart(monday), monday);
  assert.equal(weekStart(monday + 6*DAY), monday);
});

test('registration, score ownership, replay, rank boundaries, and one shared Monday snapshot', async () => {
  const { local, db } = database();
  const env = {
    DB:db, SESSION_SECRET:'fixture-only-high-entropy-key-0123456789',
    GAME_CENTER_CA_PEMS:'test fixture', APPLE_BUNDLE_ID:'com.arsene.remix', ALLOWED_ORIGINS:'https://localhost'
  };
  let now = monday - DAY - 35*60_000;
  const worker = createWorker({ clock: () => now, verifyIdentity: async data => data.salt === 'QUJD' });
  const call = (path, { token, data, origin = 'https://localhost' } = {}) =>
    worker.fetch(new Request('https://ranking.example/v1' + path, {
      method: data ? 'POST' : 'GET',
      headers: { Origin:origin, ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: data ? JSON.stringify(data) : undefined
    }), env);
  const request = async (path, parameters, status = 200) => {
    const response = await call(path, parameters);
    const body = await response.json();
    assert.equal(response.status, status, JSON.stringify(body));
    return body;
  };

  await request('/leaderboard', undefined, 401);
  await request('/leaderboard', { origin:'https://other.example' }, 403);
  const origin = await call('/leaderboard', { token:'invalid' });
  assert.equal(origin.headers.get('access-control-allow-origin'), 'https://localhost');
  const players = [];
  for (let index = 0; index < 11; index++) {
    const data = { playerId:'test-player-' + index, salt:'QUJD', signature:'QUJD',
      publicKeyUrl:'https://static.gc.apple.com/public-key/gc-test.cer', timestamp:now };
    const { token, player } = await request('/session', { data });
    if (index === 0) {
      await request('/session', { data }, 409);
      await request('/leaderboard', { token }, 403);
      await request('/registration', { token, data:{ displayName:'<x>' } }, 400);
    }
    await request('/registration', { token, data:{ displayName:'PLAYER ' + index } });
    const clientRunId = crypto.randomUUID();
    const run = await request('/runs', { token, data:{ clientRunId } });
    if (index === 0) assert.deepEqual(await request('/runs', { token, data:{ clientRunId } }), run);
    players.push({ token, id:player.id, nonce:run.nonce });
  }
  await request('/scores', { token:players[0].token, data:{ nonce:players[0].nonce, floor:250 } }, 409);
  now = monday - DAY - 20_000;
  for (let i = 0; i < players.length; i++) {
    const { token, nonce } = players[i];
    const floor = i === 1 ? 200 : 200 - i;
    const data = { nonce, floor };
    if (i === 0) await request('/scores', { token:players[10].token, data }, 409);
    assert.equal((await request('/scores', { token, data })).floor, floor);
    if (i === 0) {
      await request('/scores', { token, data });
      await request('/scores', { token, data:{ nonce, floor:floor+1 } }, 409);
    }
    now++;
  }
  const top = await request('/leaderboard', { token:players[0].token });
  assert.deepEqual(top.me, { floor:200, place:1 });
  assert.equal(top.rows[1].place, 2);
  assert.equal(top.rows[1].floor, 200);
  assert.equal(top.weeklyRewards, null);
  assert.equal(top.nextDailyAt, monday-DAY);

  await settleCutoff(db, monday-DAY, monday-DAY+1);
  await settleCutoff(db, monday-DAY, monday-DAY+5000);
  let awarded = local.prepare('SELECT place, points FROM reward_ledger ORDER BY place').all();
  assert.deepEqual(awarded.map(row => row.points), [1000, 500, 500, 500, 500, 300, 300, 300, 300, 300]);

  const first = players[0], second = players[1];
  const refresh = async (index) => {
    const data = { playerId:'test-player-' + index, salt:'QUJD', signature:'QUJD',
      publicKeyUrl:'https://static.gc.apple.com/public-key/gc-test.cer', timestamp:now };
    players[index].token = (await request('/session', { data })).token;
  };
  now = monday - 20*60_000;
  await refresh(0);
  await refresh(1);
  const newRun = await request('/runs', { token: second.token, data:{ clientRunId:crypto.randomUUID() } });
  const lateRun = await request('/runs', { token: first.token, data:{ clientRunId:crypto.randomUUID() } });
  now = monday - 2;
  await request('/scores', { token: second.token, data:{ nonce:newRun.nonce, floor:210 } });
  now = monday;
  await request('/scores', { token: first.token, data:{ nonce:lateRun.nonce, floor:220 } });
  local.exec("INSERT INTO weekly_reward_policy VALUES ('2026-11-16', 6000, 4000, 2000)");
  now = monday + 5 * 60_000;
  await worker.scheduled({ scheduledTime:now }, env);
  await worker.scheduled({ scheduledTime:now }, env);
  awarded = local.prepare('SELECT kind, player_id, place, points FROM reward_ledger WHERE cutoff=? ORDER BY kind, place').all(monday);
  assert.equal(awarded.length,20);
  assert.equal(awarded[0].player_id, second.id);
  assert.equal(awarded[0].points,1000);
  assert.equal(awarded[10].player_id, second.id);
  assert.equal(awarded[10].points,6000);

  const fresh = await request('/leaderboard', { token:first.token });
  assert.deepEqual(fresh.me, { floor:220, place:1 });
  assert.equal(fresh.overallMe.floor,220);
  assert.equal(fresh.overallRows[1].floor,210);
  assert.equal(fresh.rows.length,1);
  assert.equal(fresh.points,5500);
  assert(fresh.rewards.some(row => row.kind === 'weekly' && row.place === 2));
  assert(fresh.rewards.some(row => row.kind === 'daily' && row.place === 1));
});
