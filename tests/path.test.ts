import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeKinks, roundedPath } from '../src/render/anim';

const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
/** The largest heading change between samples `ds` apart along a path (radians). */
function maxTurnPer(path: THREE.CurvePath<THREE.Vector3>, ds: number) {
  const L = path.getLength(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let worst = 0;
  path.getTangentAt(0, a);
  for (let s = ds; s <= L; s += ds) {
    path.getTangentAt(Math.min(1, s / L), b);
    worst = Math.max(worst, Math.acos(Math.min(1, a.dot(b))));
    a.copy(b);
  }
  return worst;
}

describe('rounded paths', () => {
  it('merge a corner split into two kinks by a lane offset', () => {
    // A real route: west out of the lot, a 0.64 jog, then north up the side road.
    const pts = [V(-0.63, 1.88), V(-3.35, 1.88), V(-3.79, 1.43), V(-3.79, -0.67), V(4.05, -0.67)];
    const m = mergeKinks(pts);
    expect(m).toHaveLength(4);
    expect(m[1].x).toBeCloseTo(-3.79, 2);
    expect(m[1].z).toBeCloseTo(1.88, 2);
  });
  it('turn corners on a steady arc (no kink at the apex)', () => {
    const path = roundedPath([V(0, 0), V(-4, 0), V(-4, -4)], 0.8);
    // A 90° bend of radius 0.8 turns about 0.31 rad per 0.25 of travel; a kink would show as one big jump.
    expect(maxTurnPer(path, 0.25)).toBeLessThan(0.4);
    const kinked = roundedPath([V(-0.63, 1.88), V(-3.35, 1.88), V(-3.79, 1.43), V(-3.79, -0.67)], 0.8);
    expect(maxTurnPer(kinked, 0.25)).toBeLessThan(0.4);
  });
  it('leave turns the other way alone', () => {
    const pts = [V(0, 0), V(-3, 0), V(-3.5, -0.5), V(-3.5, 0.5)];
    expect(mergeKinks(pts)).toHaveLength(4);
  });
});
