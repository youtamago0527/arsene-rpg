const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weekAt(nowMs: number): { id: string; startMs: number; endMs: number } {
  const shifted = new Date(nowMs + JST_OFFSET_MS);
  const day = shifted.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const startMs = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysFromMonday) - JST_OFFSET_MS;
  return { id: new Date(startMs + JST_OFFSET_MS).toISOString().slice(0, 10), startMs, endMs: startMs + WEEK_MS };
}

export function previousWeek(nowMs: number) {
  return weekAt(nowMs - WEEK_MS);
}
