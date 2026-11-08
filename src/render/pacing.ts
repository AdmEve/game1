/**
 * Frame pacing: steady frames matter more than many frames.
 *
 * - The display's refresh is measured; on 90/120 Hz screens the game renders every other refresh (45/60 fps)
 *   when that is what it can hold, so frames come at an even rhythm instead of jittering.
 * - In 'auto' quality a governor watches rendered frames during play: if too many arrive late it lowers the
 *   render resolution a step (at most one change every few seconds), and only when the lowest step still can't
 *   keep up does it drop to an even half rate. When frames are comfortably on time for a while it steps back up,
 *   and stops trying if a step up immediately proved too much.
 */
export interface Pacing {
  /** Render one refresh out of `div`. */
  div: number;
  /** Resolution multiplier on top of the quality setting's pixel ratio. */
  scale: number;
  /** Measured display refresh interval (ms). */
  vsync: number;
}

const SCALES = [1, 0.85, 0.72, 0.6];

export function createPacer(o: { adaptive: () => boolean; onScale: (s: number) => void }) {
  const p: Pacing = { div: 1, scale: 1, vsync: 1000 / 60 };
  let frame = 0, lastRaf = 0, lastRender = 0;
  // Refresh estimate: the low end of rAF intervals over the first couple of seconds.
  const raf: number[] = [];
  let measured = false;
  // Governor state.
  let level = 0, windowStart = 0, n = 0, late = 0, calm = 0, lastChange = 0, lockedUp = false, lastStep: 'up' | 'down' | null = null;
  let baseDiv = 1;

  function setLevel(l: number) {
    level = Math.max(0, Math.min(SCALES.length - 1, l));
    if (p.scale !== SCALES[level]) { p.scale = SCALES[level]; o.onScale(p.scale); }
  }

  return {
    state: p,
    /** Call at the top of every rAF; returns the dt (s) to advance by, or null to skip this refresh. */
    frame(t: number): number | null {
      if (!measured && lastRaf) {
        const d = t - lastRaf;
        if (d > 4 && d < 40) raf.push(d);
        if (raf.length >= 90) {
          raf.sort((a, b) => a - b);
          p.vsync = raf[Math.floor(raf.length * 0.2)];
          // 90 Hz and up: aim for 60/45 fps on an even rhythm.
          baseDiv = p.vsync < 9.5 ? 2 : 1;
          p.div = Math.max(p.div, baseDiv);
          measured = true;
        }
      }
      lastRaf = t;
      frame++;
      if (frame % p.div !== 0) return null;
      const dt = lastRender ? Math.min(0.05, (t - lastRender) / 1000) : 1 / 60;
      lastRender = t;
      return dt;
    },
    /**
     * Report a rendered frame of play (not behind a menu). `dt` is the time since the previous rendered frame.
     */
    observe(t: number, dt: number) {
      if (!o.adaptive() || !measured) return;
      if (!windowStart) { windowStart = t; n = 0; late = 0; return; }
      n++;
      if (dt * 1000 > p.vsync * p.div * 1.45) late++;
      if (t - windowStart < 2000) return;
      const ratio = n ? late / n : 0;
      windowStart = t; n = 0; late = 0;
      if (t - lastChange < 2500) return;
      if (ratio > 0.12) {
        calm = 0;
        if (lastStep === 'up' && t - lastChange < 6000) lockedUp = true; // the step up was too much
        if (level < SCALES.length - 1) setLevel(level + 1);
        else if (p.vsync * (p.div + 1) <= 34) p.div++;
        else return;
        lastStep = 'down'; lastChange = t;
      } else if (ratio < 0.02 && !lockedUp) {
        if (++calm < 3) return;
        calm = 0;
        if (p.div > baseDiv) p.div--;
        else if (level > 0) setLevel(level - 1);
        else return;
        lastStep = 'up'; lastChange = t;
      } else calm = 0;
    },
    /** Forget the window (e.g. after a menu or a level change), so a pause doesn't count as late frames. */
    reset() { windowStart = 0; lastRender = 0; },
  };
}
