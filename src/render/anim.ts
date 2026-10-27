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

/** Open-ended per-frame jobs: they run until `step` returns true. */
const loops = new Set<{ step: (dt: number) => boolean; done: () => void }>();
export function loop(step: (dt: number) => boolean): Promise<void> {
  return new Promise((done) => { loops.add({ step, done }); });
}

/** Advance all animations; dt in seconds. */
export function tick(dt: number) {
  dt *= speed;
  now += dt;
  for (const l of [...loops]) if (l.step(dt)) { loops.delete(l); l.done(); }
  for (const j of [...jobs]) {
    const k = Math.min(1, (now - j.start) / j.dur);
    j.step(j.ease(k), dt);
    if (k >= 1) { jobs.delete(j); j.done(); }
  }
}
export const busy = () => jobs.size > 0 || loops.size > 0;
export function setSpeed(s: number) { speed = s; }

/**
 * Keep to the right-hand lane: shifts the inner waypoints of a route `off` to the right of the
 * direction of travel (mitred at corners), so cars going opposite ways pass side by side.
 */
export function keepRight(pts: THREE.Vector3[], off = 0.45, fixed = 1): THREE.Vector3[] {
  const right = (a: THREE.Vector3, b: THREE.Vector3) => { const d = b.clone().sub(a).setY(0).normalize(); return new THREE.Vector3(-d.z, 0, d.x); };
  return pts.map((p, i) => {
    if (i < fixed || i === pts.length - 1) return p.clone();
    const n = right(pts[i - 1], p).add(right(p, pts[i + 1]));
    const len = n.length();
    if (len < 1e-3) return p.clone();
    const cos = len / 2;
    return p.clone().add(n.normalize().multiplyScalar(off / Math.max(0.5, cos)));
  });
}

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

/** Cars currently on the move, so each can keep its distance from the one in front. */
interface Driver { root: THREE.Object3D; heading: THREE.Vector3; id: number; waitingFor: Driver | null; }
const traffic = new Set<Driver>();
let nextId = 0;
/** Centre-to-centre gap kept behind the car in front (a sedan is about 2.2 long). */
const GAP = 2.6;

/** Forget every car on the road (a new level starts). */
export function resetTraffic() { traffic.clear(); }

/** A car standing on the road (e.g. waiting for its bay): others queue behind it. Returns the release. */
export function occupy(root: THREE.Object3D): () => void {
  const yaw = root.rotation.y;
  const d: Driver = { root, heading: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), id: nextId++, waitingFor: null };
  traffic.add(d);
  return () => { traffic.delete(d); };
}

/** The car this one should wait for: close, straight ahead and in the same lane. */
function carAhead(me: Driver): Driver | null {
  let best: Driver | null = null, bestD = GAP;
  for (const o of traffic) {
    if (o === me) continue;
    const dx = o.root.position.x - me.root.position.x, dz = o.root.position.z - me.root.position.z;
    const d = Math.hypot(dx, dz);
    if (d >= bestD || d < 1e-3) continue;
    const along = (dx * me.heading.x + dz * me.heading.z) / d;
    const lateral = Math.abs(dx * me.heading.z - dz * me.heading.x);
    if (along < 0.75 || lateral > 0.75) continue;
    // Two cars waiting on each other: the one that set off first goes.
    if (o.waitingFor === me && me.id < o.id) continue;
    best = o; bestD = d;
  }
  return best;
}

/**
 * Drive an object along a path: accelerates, cruises, brakes; yaw follows the tangent; `body` pitches
 * under acceleration and rolls in turns, like real suspension. Cars keep their distance: one that
 * catches up with another in its lane slows down and waits behind it.
 */
export function drive(root: THREE.Object3D, body: THREE.Object3D, path: THREE.CurvePath<THREE.Vector3>, o: DriveOpts = {}): Promise<void> {
  const L = path.getLength();
  const vmax = o.vmax ?? 9, acc = o.accel ?? 16, brake = o.brake ?? true;
  const me: Driver = { root, heading: new THREE.Vector3(0, 0, -1), id: nextId++, waitingFor: null };
  traffic.add(me);
  let s = 0, v = 0, waited = 0, prevYaw = root.rotation.y;
  const tan = new THREE.Vector3();
  const place = (dt: number) => {
    const u = Math.min(1, s / L);
    const p = path.getPointAt(u);
    root.position.x = p.x; root.position.z = p.z;
    path.getTangentAt(u, tan);
    // Look out along the way the car is moving (backwards when reversing).
    me.heading.set(tan.x, 0, tan.z).normalize();
    if (o.reverse) tan.negate();
    // Our vehicles face −z at yaw 0.
    const yaw = Math.atan2(-tan.x, -tan.z);
    let dy = yaw - prevYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    root.rotation.y = prevYaw + dy;
    const yawRate = dt > 0 ? dy / dt : 0;
    prevYaw = root.rotation.y;
    return yawRate;
  };
  return loop((dt) => {
    if (dt <= 0) return false;
    const ahead = carAhead(me);
    // Give up waiting after a while rather than ever locking up.
    const hold = !!ahead && waited < 2.5;
    me.waitingFor = hold ? ahead : null;
    waited = hold ? waited + dt : 0;
    const left = L - s;
    let target = hold ? 0 : vmax;
    if (brake) target = Math.min(target, Math.sqrt(2 * acc * Math.max(0, left)) + 0.4);
    const v0 = v;
    v = target > v ? Math.min(target, v + acc * dt) : Math.max(target, v - acc * 1.6 * dt);
    s = Math.min(L, s + v * dt);
    const yawRate = place(dt);
    const a = (v - v0) / dt;
    // Pitch: nose lifts on launch, dips on braking. Roll: lean out of the turn.
    const sgn = o.reverse ? -1 : 1;
    body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, THREE.MathUtils.clamp(sgn * a * 0.004, -0.06, 0.06), 0.25);
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, THREE.MathUtils.clamp(-yawRate * v * 0.012, -0.08, 0.08), 0.25);
    o.onProgress?.(s / L);
    if (s >= L - 1e-4) { traffic.delete(me); return true; }
    return false;
  }).then(() => { void settleBody(body); });
}

/** Let the suspension bounce back to rest. */
export function settleBody(body: THREE.Object3D, amp = 1): Promise<void> {
  const z0 = body.rotation.z, x0 = body.rotation.x;
  return tween(0.45, (k) => {
    const d = Math.exp(-6 * k) * Math.cos(k * 14);
    body.rotation.z = z0 * d * amp; body.rotation.x = x0 * d * amp;
  }, ease.linear);
}
