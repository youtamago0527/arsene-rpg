export const DAY = 86_400_000;
const JST = 9 * 3_600_000;
const DATE = time => new Date(time + JST);
export const dayStart = time => Math.floor((time + JST) / DAY) * DAY - JST;
export const weekStart = time => dayStart(time) - ((DATE(time).getUTCDay() + 6) % 7) * DAY;
export const dayLabel = time => DATE(time).toISOString().slice(0, 10);
export const isMonday = time => DATE(time).getUTCDay() === 1;
