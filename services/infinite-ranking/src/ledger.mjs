import { DAY, dayLabel, dayStart, isMonday, weekStart } from './calendar.mjs';

export const DAILY_POINTS = Object.freeze([1000, 500, 300]);
const award = (first, topFive, topTen) =>
  `CASE WHEN place = 1 THEN ${first} WHEN place <= 5 THEN ${topFive} ELSE ${topTen} END`;
const rankingOrder = 'floor DESC, received_at ASC, player_id ASC';

export function acceptScore(db, playerId, nonce, floor, now) {
  // Ownership, expiry, and one-time use are checked in the same INSERT.
  return db.prepare(`INSERT INTO scores(nonce, player_id, floor, received_at, week_start)
    SELECT nonce, player_id, ?, ?, ? FROM ranked_runs
    WHERE nonce = ? AND player_id = ? AND expires_at > ? AND started_at <= ?
    ON CONFLICT(nonce) DO NOTHING RETURNING floor, received_at`).bind(
    floor, now, weekStart(now), nonce, playerId, now, now - (floor - 1) * 2000
  ).first();
}

export async function getLeaderboard(db, playerId, now) {
  const week = weekStart(now);
  const results = await db.batch([
    db.prepare(`SELECT p.display_name AS displayName, w.floor, w.player_id = ? AS isMe
      FROM weekly_best w JOIN players p ON p.id = w.player_id WHERE w.week_start = ?
      ORDER BY ${rankingOrder} LIMIT 50`).bind(playerId, week),
    db.prepare(`SELECT b.floor, 1 + (SELECT COUNT(*) FROM weekly_best a WHERE a.week_start=b.week_start AND
        (a.floor > b.floor OR (a.floor=b.floor AND
          (a.received_at < b.received_at OR (a.received_at=b.received_at AND a.player_id<b.player_id))))) AS place
      FROM weekly_best b WHERE b.week_start = ? AND b.player_id = ?`).bind(week, playerId),
    db.prepare('SELECT COALESCE(SUM(points), 0) AS points FROM reward_ledger WHERE player_id = ?').bind(playerId),
    db.prepare(`SELECT cutoff, kind, place, points FROM reward_ledger WHERE player_id = ?
      ORDER BY cutoff DESC, kind ASC LIMIT 30`).bind(playerId),
    db.prepare(`SELECT first_points AS first, top_five_points AS topFive, top_ten_points AS topTen
      FROM weekly_reward_policy WHERE effective_week <= ? ORDER BY effective_week DESC LIMIT 1`).bind(dayLabel(week)),
    db.prepare(`WITH attempts AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY floor DESC, received_at ASC) AS best
      FROM weekly_best
    ), ranked AS (
      SELECT player_id, floor, ROW_NUMBER() OVER (ORDER BY ${rankingOrder}) AS place
      FROM attempts WHERE best = 1
    )
    SELECT place, floor, display_name AS displayName, player_id = ?1 AS isMe
    FROM ranked JOIN players ON players.id = ranked.player_id
    WHERE place <= 50 OR player_id = ?1 ORDER BY place`).bind(playerId)
  ]);
  const lifetime = results[5].results;
  return {
    overallRows: lifetime.filter(row => row.place <= 50),
    overallMe: lifetime.find(row => row.isMe) || null,
    rows: results[0].results.map((row, index) => ({...row, place:index+1})),
    me: results[1].results[0] || null,
    points: results[2].results[0].points,
    rewards: results[3].results.map(row => ({...row, date:dayLabel(row.cutoff)})),
    weeklyRewards: results[4].results[0] || null,
    nextDailyAt: dayStart(now) + DAY,
    nextWeeklyAt: week + 7 * DAY
  };
}

export async function settleCutoff(db, cutoff, now) {
  if (dayStart(cutoff) !== cutoff || cutoff > now) throw new Error('invalid_cutoff');
  const statements = [
    db.prepare(`WITH attempts AS (
      SELECT player_id, floor, received_at, ROW_NUMBER() OVER (
        PARTITION BY player_id ORDER BY floor DESC, received_at ASC
      ) AS attempt FROM scores WHERE week_start = ?1 AND received_at < ?2
    ), board AS (
      SELECT player_id, floor, ROW_NUMBER() OVER (ORDER BY ${rankingOrder}) AS place
      FROM attempts WHERE attempt = 1
    )
    INSERT INTO snapshots (cutoff, place, player_id, floor)
      SELECT ?2, place, player_id, floor FROM board WHERE place <= 10
      AND NOT EXISTS (SELECT 1 FROM settlements WHERE cutoff = ?2)
      ON CONFLICT(cutoff, place) DO NOTHING`).bind(weekStart(cutoff - 1), cutoff),
    db.prepare(`INSERT INTO reward_ledger (cutoff, kind, player_id, place, points)
      SELECT cutoff, 'daily', player_id, place, ${award(...DAILY_POINTS)} FROM snapshots
      WHERE cutoff = ?1 AND NOT EXISTS (SELECT 1 FROM settlements WHERE cutoff = ?1)
      ON CONFLICT(cutoff, kind, player_id) DO NOTHING`).bind(cutoff)
  ];
  if (isMonday(cutoff)) {
    statements.push(db.prepare(`WITH policy AS (
      SELECT first_points, top_five_points, top_ten_points FROM weekly_reward_policy
      WHERE effective_week <= ?2 ORDER BY effective_week DESC LIMIT 1
    ), awards AS (
      SELECT cutoff, player_id, place, ${award('first_points', 'top_five_points', 'top_ten_points')} AS points
      FROM snapshots CROSS JOIN policy WHERE cutoff = ?1
    )
    INSERT INTO reward_ledger (cutoff, kind, player_id, place, points)
      SELECT cutoff, 'weekly', player_id, place, points FROM awards WHERE points > 0
      AND NOT EXISTS (SELECT 1 FROM settlements WHERE cutoff = ?1)
      ON CONFLICT(cutoff, kind, player_id) DO NOTHING`).bind(cutoff, dayLabel(weekStart(cutoff - 1))));
  }
  statements.push(db.prepare('INSERT INTO settlements (cutoff, finalized_at) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(cutoff, now));
  await db.batch(statements);
}

export async function settleRecent(db, scheduledAt, now) {
  const boundary = dayStart(scheduledAt);
  const earliest = boundary - 6 * DAY;
  const existing = await db.prepare('SELECT cutoff FROM settlements WHERE cutoff BETWEEN ? AND ?')
    .bind(earliest, boundary).all();
  const closed = new Set(existing.results.map(row => row.cutoff));
  for (let cutoff = earliest; cutoff <= boundary; cutoff += DAY) {
    if (!closed.has(cutoff)) await settleCutoff(db, cutoff, now);
  }
}
