/**
 * The little the game uses that older Android WebViews lack (the supported floor is Chrome 84: see
 * capacitor.config.json and BEST_IN_MARKET_PLAN N10). Loaded before every other game module, since badges, plates
 * and effects are drawn while the world is built.
 */
type Radii = number | DOMPointInit | (number | DOMPointInit)[];

/** Canvas `roundRect` (Chrome 99): one radius for all four corners is all the game draws. */
function roundRect(this: CanvasRenderingContext2D | Path2D, x: number, y: number, w: number, h: number, radii: Radii = 0) {
  const first = Array.isArray(radii) ? radii[0] ?? 0 : radii;
  const r0 = typeof first === 'number' ? first : first.x ?? 0;
  const r = Math.max(0, Math.min(r0, Math.abs(w) / 2, Math.abs(h) / 2));
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
}
for (const proto of [globalThis.CanvasRenderingContext2D?.prototype, globalThis.Path2D?.prototype, (globalThis as { OffscreenCanvasRenderingContext2D?: { prototype: object } }).OffscreenCanvasRenderingContext2D?.prototype]) {
  if (proto && !('roundRect' in proto)) Object.defineProperty(proto, 'roundRect', { value: roundRect, writable: true, configurable: true });
}

export {};
