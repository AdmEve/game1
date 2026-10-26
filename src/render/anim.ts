/** A tiny frame-driven animation system: tweens, delays and path driving. */
import * as THREE from 'three';

interface Job { start: number; dur: number; step: (k: number, dt: number) => void; ease: (k: number) => number; done: () => void; }
const jobs = new Set<Job>();
let now = 0;
let speed = 1;

export const ease = {
  linear: (k: number) => k,
  inOut: (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
  out: (k: number) => 1 - (1 - k) ** 3,
  in: (k: number) => k * k * k,
  back: (k: number) => { const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
  elastic: (k: number) => (k === 0 || k === 1 ? k : 2 ** (-10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

export function tween(dur: number, step: (k: number, dt: number) => void, e: (k: number) => number = ease.inOut): Promise<void> {
  return new Promise((done) => { jobs.add({ start: now, dur: Math.max(1e-3, dur), step, ease: e, done }); });
}
export const wait = (s: number) => tween(s, () => {}, ease.linear);

/** Advance all animations; dt in seconds. */
export function tick(dt: number) {
  dt *= speed;
  now += dt;
  for (const j of [...jobs]) {
    const k = Math.min(1, (now - j.start) / j.dur);
    j.step(j.ease(k), dt);
    if (k >= 1) { jobs.delete(j); j.done(); }
  }
}
export const busy = () => jobs.size > 0;
export function setSpeed(s: number) { speed = s; }

/** Build a smooth path through waypoints (on the ground) with rounded corners. */
export function roundedPath(pts: THREE.Vector3[], radius = 0.75): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cur = pts[0].clone();
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (i === pts.length - 1) { if (cur.distanceTo(p) > 1e-4) path.add(new THREE.LineCurve3(cur, p.clone())); break; }
    const next = pts[i + 1];
    const din = p.clone().sub(cur), dout = next.clone().sub(p);
    const r = Math.min(radius, din.length() / 2, dout.length() / 2);
    const a = p.clone().sub(din.normalize().multiplyScalar(r)), b = p.clone().add(dout.normalize().multiplyScalar(r));
    if (cur.distanceTo(a) > 1e-4) path.add(new THREE.LineCurve3(cur, a));
    path.add(new THREE.QuadraticBezierCurve3(a, p.clone(), b));
    cur = b;
  }
  return path;
}

export interface DriveOpts { vmax?: number; accel?: number; reverse?: boolean; onProgress?: (k: number) => void; brake?: boolean; }

/**
 * Drive an object along a path: accelerates, cruises, brakes; yaw follows the tangent; `body` pitches
 * under acceleration and rolls in turns, like real suspension.
 */
export function drive(root: THREE.Object3D, body: THREE.Object3D, path: THREE.CurvePath<THREE.Vector3>, o: DriveOpts = {}): Promise<void> {
  const L = path.getLength();
  const vmax = o.vmax ?? 9, acc = o.accel ?? 16, brake = o.brake ?? true;
  // Time to cover L with a trapezoid speed profile.
  const tA = vmax / acc, dA = 0.5 * acc * tA * tA;
  let tTotal: number, peak = vmax;
  const decel = brake ? 1 : 0;
  if (L < dA * (1 + decel)) { peak = Math.sqrt((2 * acc * L) / (1 + decel)); tTotal = (peak / acc) * (1 + decel); }
  else tTotal = tA * (1 + decel) + (L - dA * (1 + decel)) / vmax;
  const tUp = peak / acc;
  const distAt = (t: number) => {
    if (t <= tUp) return 0.5 * acc * t * t;
    const dUp = 0.5 * acc * tUp * tUp;
    const tDown = brake ? tTotal - tUp : tTotal;
    if (t <= tDown) return dUp + peak * (t - tUp);
    const td = t - tDown;
    return Math.min(L, dUp + peak * (tDown - tUp) + peak * td - 0.5 * acc * td * td);
  };
  let prevYaw = root.rotation.y, prevV = 0;
  const tan = new THREE.Vector3();
  return tween(tTotal, (k, dt) => {
    const t = k * tTotal;
    const u = Math.min(1, distAt(t) / L);
    const p = path.getPointAt(u);
    root.position.x = p.x; root.position.z = p.z;
    path.getTangentAt(u, tan);
    if (o.reverse) tan.negate();
    // Our vehicles face −z at yaw 0.
    const yaw = Math.atan2(-tan.x, -tan.z);
    let dy = yaw - prevYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    root.rotation.y = prevYaw + dy;
    const v = (distAt(Math.min(tTotal, t + 0.02)) - distAt(t)) / 0.02;
    const a = dt > 0 ? (v - prevV) / dt : 0;
    const yawRate = dt > 0 ? dy / dt : 0;
    // Pitch: nose lifts on launch, dips on braking. Roll: lean out of the turn.
    const sgn = o.reverse ? -1 : 1;
    body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, THREE.MathUtils.clamp(sgn * a * 0.004, -0.06, 0.06), 0.25);
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, THREE.MathUtils.clamp(-yawRate * v * 0.012, -0.08, 0.08), 0.25);
    prevYaw = root.rotation.y; prevV = v;
    o.onProgress?.(u);
  }, ease.linear).then(() => { void settleBody(body); });
}

/** Let the suspension bounce back to rest. */
export function settleBody(body: THREE.Object3D, amp = 1): Promise<void> {
  const z0 = body.rotation.z, x0 = body.rotation.x;
  return tween(0.45, (k) => {
    const d = Math.exp(-6 * k) * Math.cos(k * 14);
    body.rotation.z = z0 * d * amp; body.rotation.x = x0 * d * amp;
  }, ease.linear);
}
