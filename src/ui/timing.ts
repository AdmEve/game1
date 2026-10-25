/** A marker slides back and forth along a strip; tap when it is over the green zone. Used for parking and fire jumping. */
import { h } from './dom';
import { emo } from './emoji';

export type Hit = 'g' | 'y' | 'r';

export interface TimingOpts {
  /** The emoji that slides. */
  sprite: string;
  /** Milliseconds from one end to the other. */
  period: number;
  /** Widths of the green zone and of each yellow edge, as fractions of the strip. */
  green: number;
  yellow: number;
  /** Where the green zone is centred (default: random in the middle half). */
  center?: number;
  /** Label inside the green zone. */
  mark?: string;
  /** Extra class for the strip's look. */
  cls?: string;
}

export interface Timing {
  el: HTMLElement;
  /** Stop the marker and judge where it is; `early` means before the green zone. */
  stop: () => { hit: Hit; early: boolean };
  /** Wobble the marker after a miss. */
  shake: () => void;
}

export function timingStrip(o: TimingOpts): Timing {
  const center = o.center ?? 0.25 + Math.random() * 0.5;
  const g0 = center - o.green / 2;
  const g1 = center + o.green / 2;
  const span = o.green + o.yellow * 2;
  const zone = h('div', { class: 'drive-zone', style: `left:${(g0 - o.yellow) * 100}%;width:${span * 100}%` },
    h('div', { class: 'drive-green', style: `left:${(o.yellow / span) * 100}%;width:${(o.green / span) * 100}%`, text: o.mark ?? '' }));
  const sprite = h('div', { class: 'drive-car', html: emo(o.sprite, 'emo') });
  const el = h('div', { class: `drive-road ${o.cls ?? ''}`, dir: 'ltr' }, zone, sprite);
  let pos = 0;
  let stopped = false;
  const t0 = performance.now();
  const tick = (t: number) => {
    if (stopped) return;
    const ph = ((t - t0) / o.period) % 2;
    pos = ph < 1 ? ph : 2 - ph;
    sprite.style.left = `calc(${pos * 100}% - 17px)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    el,
    stop: () => {
      stopped = true;
      const hit: Hit = pos >= g0 && pos <= g1 ? 'g' : pos >= g0 - o.yellow && pos <= g1 + o.yellow ? 'y' : 'r';
      return { hit, early: pos < g0 };
    },
    shake: () => sprite.classList.add('crash'),
  };
}
