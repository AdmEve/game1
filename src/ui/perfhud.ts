/**
 * A small overlay for testers: rendered fps, the worst frame of the last second, resolution scale, frame
 * divisor, draw calls and triangles. On with `?perf`, or three taps on the version line in Settings.
 */
import type * as THREE from 'three';
import type { Pacing } from '../render/pacing';

let el: HTMLDivElement | null = null;
let frames = 0, worst = 0, since = 0;

export function perfHudOn(): boolean { return !!el; }
export function togglePerfHud(on = !el) {
  if (on && !el) {
    el = document.createElement('div');
    el.className = 'perfhud';
    el.setAttribute('dir', 'ltr');
    document.body.append(el);
  } else if (!on && el) { el.remove(); el = null; }
}

/** Call once per rendered frame with the time since the previous one (ms). */
export function perfFrame(t: number, intervalMs: number, renderer: THREE.WebGLRenderer, pace: Pacing) {
  if (!el) return;
  frames++; worst = Math.max(worst, intervalMs);
  if (!since) since = t;
  if (t - since < 1000) return;
  const fps = (frames * 1000) / (t - since);
  const r = renderer.info.render;
  el.textContent = `${fps.toFixed(0)} fps · worst ${worst.toFixed(0)} ms · ${Math.round(1000 / pace.vsync)}Hz/${pace.div} · res ${(renderer.getPixelRatio()).toFixed(2)}×${pace.scale.toFixed(2)} · ${r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
  frames = 0; worst = 0; since = t;
}
