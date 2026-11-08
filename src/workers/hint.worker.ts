/** The hint solver, off the main thread: a deep search can take a second on a phone, and it must never stall a frame. */
import { solve } from '../game/solver';
import type { Level, State } from '../game/rules';

self.onmessage = (e: MessageEvent<{ id: number; level: Level; state: State; limit: number }>) => {
  const { id, level, state, limit } = e.data;
  state.level = level;
  const r = solve(level, limit, state);
  (self as unknown as Worker).postMessage({ id, move: r.solvable ? r.solution[0] : -1 });
};
