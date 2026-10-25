/** «چونه زدن»: the seller's hidden lowest price and how they answer offers. */

export interface Haggle {
  /** The first asking price. */
  price: number;
  /** What the seller asks now. */
  ask: number;
  /** The lowest price the seller will take (hidden from the player). */
  floor: number;
  /** Offers and prices are rounded to this. */
  step: number;
  /** Rounds left before the seller loses patience. */
  patience: number;
  /** The seller made a last offer: take it or leave it. */
  final: boolean;
}

export type Reply =
  | { kind: 'deal'; price: number }
  | { kind: 'counter'; ask: number }
  | { kind: 'final'; ask: number }
  | { kind: 'insult' }
  | { kind: 'walk' };

export const PATIENCE = 3;

export function haggleStep(price: number): number {
  return 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, price))) - 2);
}

/** `room` is extra discount the player's charm or stinginess earns (0..0.1). */
export function startHaggle(price: number, room: number, rnd: () => number): Haggle {
  const step = haggleStep(price);
  const d = Math.min(0.22, 0.04 + rnd() * 0.12 + room);
  return { price, ask: price, floor: Math.floor((price * (1 - d)) / step) * step, step, patience: PATIENCE, final: false };
}

export function offer(h: Haggle, o: number, rnd: () => number): Reply {
  if (o >= h.floor || o >= h.ask) return { kind: 'deal', price: Math.min(o, h.ask) };
  if (h.final) return { kind: 'walk' };
  // A lowball offer only annoys the seller.
  if (o < h.floor * 0.85) {
    h.patience -= 2;
    return h.patience <= 0 ? { kind: 'walk' } : { kind: 'insult' };
  }
  h.patience -= 1;
  if (h.patience <= 0) {
    h.ask = Math.ceil(h.floor / h.step) * h.step;
    h.final = true;
    return { kind: 'final', ask: h.ask };
  }
  const next = h.ask - (h.ask - h.floor) * (0.4 + rnd() * 0.25);
  h.ask = Math.max(h.floor, Math.ceil(next / h.step) * h.step);
  return { kind: 'counter', ask: h.ask };
}
