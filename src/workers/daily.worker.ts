/** Today's rush made a deeper puzzle (game/daily.ts hardDaily), off the main thread: it takes a phone a few seconds. */
import { hardDaily } from '../game/daily';

self.onmessage = (e: MessageEvent<{ day: string }>) => {
  (self as unknown as Worker).postMessage({ day: e.data.day, level: hardDaily(e.data.day) });
};
