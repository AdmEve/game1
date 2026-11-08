/**
 * Attempts, losses and wins per Journey level, kept on the phone so testers can report which levels are too
 * hard (the game has no analytics). Stored as level number (1-based) → [attempts, losses, wins].
 */
export type LevelStats = Record<string, [number, number, number]>;

export function count(st: LevelStats, level: number, what: 'attempt' | 'loss' | 'win') {
  const k = String(level + 1);
  const row = st[k] ?? (st[k] = [0, 0, 0]);
  row[what === 'attempt' ? 0 : what === 'loss' ? 1 : 2]++;
}

/** The levels with the most losses per attempt (at least `min` attempts), hardest first. */
export function hardest(st: LevelStats, n = 10, min = 2) {
  return Object.entries(st)
    .filter(([, [a]]) => a >= min)
    .map(([lv, [a, l, w]]) => ({ level: Number(lv), attempts: a, losses: l, wins: w, lossRate: l / a }))
    .sort((x, y) => y.lossRate - x.lossRate || y.attempts - x.attempts)
    .slice(0, n);
}

/** All levels as CSV (level,attempts,losses,wins), in level order. */
export function statsCsv(st: LevelStats): string {
  const rows = Object.entries(st).sort(([a], [b]) => Number(a) - Number(b)).map(([lv, [a, l, w]]) => `${lv},${a},${l},${w}`);
  return ['level,attempts,losses,wins', ...rows].join('\n');
}
