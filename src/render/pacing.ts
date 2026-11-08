/**
 * Frame pacing: steady frames matter more than many frames.
 *
 * - The display's refresh is measured; on 90/120 Hz screens the game renders every other refresh (45/60 fps)
 *   when that is what it can hold, so frames come at an even rhythm instead of jittering.
 * - In 'auto' quality a governor watches rendered frames during play: if too many arrive late it lowers the
 *   render resolution a step (at most one change every few seconds), and only when the lowest step still can't
 *   keep up does it drop to an even half rate. When frames are comfortably on time for a while it steps up (even
 *   past the setting's resolution, for a sharper picture on strong phones), and stops trying if a step up
 *   immediately proved too much.
 */
export interface Pacing {
  /** Render one refresh out of `div`. */
  div: number;
  /** Resolution multiplier on top of the quality setting's pixel ratio. */
  scale: number;
  /** Measured display refresh interval (ms). */
  vsync: number;
}

/** Resolution steps: above 1 only when a phone has headroom to spare (sharper image), below 1 when it struggles. */
const SCALES = [1.5, 1.25, 1, 0.85, 0.72, 0.6];
const START = 2;

/** What the governor learned on this phone, kept between launches (so it starts where it settled last time). */
export interface PaceMemory { level: number; ceiling: number }

export function createPacer(o: { adaptive: () => boolean; onScale: (s: number) => void; memory?: PaceMemory | null; remember?: (m: PaceMemory) => void }) {
  const p: Pacing = { div: 1, scale: 1, vsync: 1000 / 60 };
  let frame = 0, lastRaf = 0, lastRender = 0;
  // Refresh estimate: the low end of rAF intervals over the first couple of seconds.
  const raf: number[] = [];
  let measured = false;
  // Governor state.
  let level = START, windowStart = 0, n = 0, late = 0, calm = 0, lastChange = 0, lockedUp = false, lastStep: 'up' | 'down' | null = null;
  let baseDiv = 1, eff = 1;
  // The sharpest step this phone has shown it can hold (a step up beyond it proved too much once).
  let ceiling = 0;
  const m = o.memory;
  if (m && Number.isInteger(m.level) && m.level >= 0 && m.level < SCALES.length) { level = m.level; ceiling = Math.max(0, Math.min(SCALES.length - 1, m.ceiling | 0)); p.scale = SCALES[level]; }

  function setLevel(l: number) {
    level = Math.max(0, Math.min(SCALES.length - 1, l));
    if (p.scale !== SCALES[level]) { p.scale = SCALES[level]; o.onScale(p.scale); }
    o.remember?.({ level, ceiling });
  }

  return {
    state: p,
    /**
     * Call at the top of every rAF; returns the dt (s) to advance by, or null to skip this refresh. `calm` (nothing
     * moving, no recent touch) halves the rate: an idle board at 30 fps keeps the phone cool, and a phone that
     * stays cool doesn't throttle itself into stutter later.
     */
    frame(t: number, calm = false): number | null {
      if (!measured && lastRaf) {
        const d = t - lastRaf;
        // Every interval counts (a struggling phone gives only slow ones; the estimate is snapped below anyway).
        if (d > 4 && d < 250) raf.push(d);
        if (raf.length >= 90) {
          raf.sort((a, b) => a - b);
          // Snap to a real refresh rate. A phone that can't keep up slows rAF down with it (every frame ~33 ms),
          // which must not read as a "30 Hz screen": phone screens run at 60 Hz or more.
          const d = raf[Math.floor(raf.length * 0.2)];
          p.vsync = d < 9.5 ? 1000 / 120 : d < 12.5 ? 1000 / 90 : 1000 / 60;
          // 90 Hz and up: aim for 60/45 fps on an even rhythm.
          baseDiv = p.vsync < 9.5 ? 2 : 1;
          p.div = Math.max(p.div, baseDiv);
          measured = true;
        }
      }
      lastRaf = t;
      frame++;
      eff = calm ? p.div * 2 : p.div;
      if (frame % eff !== 0) return null;
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
      if (dt * 1000 > p.vsync * eff * 1.45) late++;
      if (t - windowStart < 2000) return;
      const ratio = n ? late / n : 0;
      windowStart = t; n = 0; late = 0;
      if (t - lastChange < 2500) return;
      if (ratio > 0.12) {
        calm = 0;
        // The step up was too much: don't try that resolution again (this session or later ones).
        if (lastStep === 'up' && t - lastChange < 6000) { lockedUp = true; ceiling = Math.min(SCALES.length - 1, level + 1); }
        // Far behind (most frames late): drop two steps at once, so a phone settles within a few seconds.
        if (level < SCALES.length - 1) setLevel(level + (ratio > 0.4 ? 2 : 1));
        else if (p.vsync * (p.div + 1) <= 34) p.div++;
        else return;
        lastStep = 'down'; lastChange = t;
      } else if (ratio < 0.02 && !lockedUp) {
        if (++calm < 3) return;
        calm = 0;
        if (p.div > baseDiv) p.div--;
        else if (level > ceiling) setLevel(level - 1);
        else return;
        lastStep = 'up'; lastChange = t;
      } else calm = 0;
    },
    /** Forget the window (e.g. after a menu or a level change), so a pause doesn't count as late frames. */
    reset() { windowStart = 0; lastRender = 0; },
  };
}
