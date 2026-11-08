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

const loopList: { step: (dt: number) => boolean; done: () => void }[] = [];
const jobList: Job[] = [];
/** Advance all animations; dt in seconds. */
export function tick(dt: number) {
  dt *= speed;
  now += dt;
  // Iterate snapshots kept in reused arrays (jobs started during this tick wait for the next one), so a busy
  // frame allocates nothing here.
  loopList.length = 0; for (const l of loops) loopList.push(l);
  for (const l of loopList) if (l.step(dt)) { loops.delete(l); l.done(); }
  jobList.length = 0; for (const j of jobs) jobList.push(j);
  for (const j of jobList) {
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

/**
 * Two bends in the same direction joined by a short leg (lane offsets turn one corner into two kinks) become one
 * corner where the incoming and outgoing lines cross, so it can be rounded with the full radius.
 */
export function mergeKinks(pts: THREE.Vector3[], shortLeg = 1.0): THREE.Vector3[] {
  const out = pts.map((p) => p.clone());
  for (let i = 1; i + 2 < out.length; i++) {
    const a = out[i - 1], p = out[i], q = out[i + 1], b = out[i + 2];
    if (p.distanceTo(q) >= shortLeg) continue;
    const d1x = p.x - a.x, d1z = p.z - a.z, dmx = q.x - p.x, dmz = q.z - p.z, d2x = b.x - q.x, d2z = b.z - q.z;
    const t1 = d1x * dmz - d1z * dmx, t2 = dmx * d2z - dmz * d2x, cr = d1x * d2z - d1z * d2x;
    if (t1 * t2 <= 0 || Math.abs(cr) < 1e-6) continue; // turns the other way, or the lines never cross
    // Where line a→p meets line q→b.
    const t = ((q.x - a.x) * d2z - (q.z - a.z) * d2x) / cr;
    if (t < 0.5) continue;
    const x = new THREE.Vector3(a.x + d1x * t, p.y, a.z + d1z * t);
    if (x.distanceTo(p) > shortLeg * 1.5) continue;
    out.splice(i, 2, x);
  }
  return out;
}

/** Build a smooth path through waypoints (on the ground) with rounded corners. */
export function roundedPath(pts0: THREE.Vector3[], radius = 0.75): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const pts = mergeKinks(pts0);
  let cur = pts[0].clone();
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (i === pts.length - 1) { if (cur.distanceTo(p) > 1e-4) path.add(new THREE.LineCurve3(cur, p.clone())); break; }
    const next = pts[i + 1];
    const din = p.clone().sub(cur), dout = next.clone().sub(p);
    // The incoming leg's remainder is all ours (the bend before took its share already); the outgoing leg is shared.
    const r = Math.min(radius, din.length(), dout.length() / 2);
    din.normalize(); dout.normalize();
    const a = p.clone().addScaledVector(din, -r), b = p.clone().addScaledVector(dout, r);
    if (cur.distanceTo(a) > 1e-4) path.add(new THREE.LineCurve3(cur, a));
    // A true circular arc (cubic Bézier), so the bend has one steady radius instead of a sharp kink at its apex.
    const turn = Math.acos(THREE.MathUtils.clamp(din.dot(dout), -1, 1));
    if (turn < 1e-3) path.add(new THREE.LineCurve3(a, b));
    else {
      const R = r / Math.tan(turn / 2), h = (4 / 3) * Math.tan(turn / 4) * R;
      path.add(new THREE.CubicBezierCurve3(a, a.clone().addScaledVector(din, h), b.clone().addScaledVector(dout, -h), b));
    }
    cur = b;
  }
  return path;
}

/** The fastest a car's heading may turn (rad/s): bends need up to ~10. */
const MAX_YAW_RATE = 12;

export interface DriveOpts {
  vmax?: number; accel?: number; reverse?: boolean; onProgress?: (k: number) => void; brake?: boolean;
  /** Sideways grip (units/s²): how fast a bend may be taken (speed ≤ √(grip × radius)). */
  grip?: number;
  /** Has right of way (e.g. backing out of a bay): never waits for a stopped car, only for moving ones. */
  priority?: boolean;
}

/** Cars currently on the move, so each can keep its distance from the one in front. */
interface Driver {
  root: THREE.Object3D; heading: THREE.Vector3; id: number; waitingFor: Driver | null;
  /** Where the car would be in its own lane (it may be swerving out to overtake). */
  base: THREE.Vector3;
  /** Standing still on purpose (waiting for a bay). */
  parked?: boolean;
  /** Others may pull out and pass it (only on the road, never inside the lot). */
  passable?: boolean;
  overtaking?: boolean;
  /** Points a little further along this car's own route (it yields if another car is on them). */
  look: THREE.Vector3[];
}
const traffic = new Set<Driver>();
/** Seconds cars have spent waiting behind others, and how often they gave up (for tuning). */
export const trafficStats = { held: 0, gaveUp: 0 };
// Readable from test scripts.
(globalThis as unknown as { __traffic?: typeof trafficStats }).__traffic = trafficStats;
let nextId = 0;
/** Centre-to-centre gap kept behind the car in front (a sedan is about 2.2 long). */
const GAP = 2.6;
/** Half a car's length, centre to bumper. */
const BODY = 1.15;
/** Distance from point (px, pz) to the segment a–b. */
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2)) : 0;
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

/** Forget every car on the road (a new level starts). */
export function resetTraffic() { traffic.clear(); }

/** Is any car standing (parked or stopped) within `r` of a point? */
export function standingNear(x: number, z: number, r: number): boolean {
  for (const o of traffic) if (o.parked && Math.hypot(o.root.position.x - x, o.root.position.z - z) < r) return true;
  return false;
}

/** A car standing on the road (e.g. waiting for its bay): others queue behind it. Returns the release. */
export function occupy(root: THREE.Object3D, passable = true): () => void {
  const yaw = root.rotation.y;
  const d: Driver = { root, heading: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), id: nextId++, waitingFor: null, base: root.position.clone(), parked: true, passable, look: [] };
  traffic.add(d);
  return () => { traffic.delete(d); };
}

/** The car this one should wait for: close, straight ahead and in the same lane. */
function carAhead(me: Driver, priority = false): Driver | null {
  let best: Driver | null = null, bestD = Infinity;
  for (const o of traffic) {
    // A car with right of way (backing out of a bay) only waits for cars that are moving.
    if (o === me || (me.overtaking && o.passable) || (priority && o.parked)) continue;
    const ox = o.root.position.x, oz = o.root.position.z;
    // On my route a little further on (this follows bends and sees cars merging in)… The other car is
    // a body about 2.2 long, so measure to the line from its nose to its tail, not to its centre.
    const hx = o.heading.x * BODY, hz = o.heading.z * BODY;
    let hit = me.look.some((p) => segDist(p.x, p.z, ox - hx, oz - hz, ox + hx, oz + hz) < 0.9);
    if (!hit) {
      // …or straight ahead in my lane.
      const dx = ox - me.base.x, dz = oz - me.base.z, d = Math.hypot(dx, dz);
      if (d > 1e-3 && d < GAP) hit = (dx * me.heading.x + dz * me.heading.z) / d > 0.75 && Math.abs(dx * me.heading.z - dz * me.heading.x) < 0.75;
    }
    if (!hit) continue;
    const d = Math.hypot(ox - me.base.x, oz - me.base.z);
    // Two cars waiting on each other: the one with the other more squarely in front of it gives way
    // (the other sees it off to the side and can go first); a tie goes to the one that set off first.
    if (o.waitingFor === me && d > 1e-3) {
      const mine = ((ox - me.base.x) * me.heading.x + (oz - me.base.z) * me.heading.z) / d;
      const theirs = ((me.base.x - ox) * o.heading.x + (me.base.z - oz) * o.heading.z) / d;
      if (mine < theirs - 0.05 || (Math.abs(mine - theirs) <= 0.05 && me.id < o.id)) continue;
    }
    if (d < bestD) { best = o; bestD = d; }
  }
  return best;
}

/** Is a parked car still beside or just ahead of me in my lane? */
function parkedAlongside(me: Driver) {
  for (const o of traffic) {
    if (!o.passable || o === me) continue;
    const dx = o.root.position.x - me.base.x, dz = o.root.position.z - me.base.z;
    const along = dx * me.heading.x + dz * me.heading.z, left = dx * me.heading.z - dz * me.heading.x;
    if (along > -2.4 && along < GAP + 0.3 && Math.abs(left) < 0.75) return true;
  }
  return false;
}
/** Traffic coming the other way (or in the other lane) close ahead: not safe to pull out. */
function oncoming(me: Driver) {
  for (const o of traffic) {
    if (o === me || o.parked) continue;
    const dx = o.root.position.x - me.base.x, dz = o.root.position.z - me.base.z;
    const along = dx * me.heading.x + dz * me.heading.z, left = dx * me.heading.z - dz * me.heading.x;
    if (along > -1 && along < 7 && left > 0.3 && left < 1.6) return true;
  }
  return false;
}

/**
 * Drive an object along a path: accelerates, cruises, brakes; yaw follows the tangent; `body` pitches
 * under acceleration and rolls in turns, like real suspension. Cars keep their distance: one that
 * catches up with another in its lane slows down and waits behind it.
 */
export function drive(root: THREE.Object3D, body: THREE.Object3D, path: THREE.CurvePath<THREE.Vector3>, o: DriveOpts = {}): Promise<void> {
  const L = path.getLength();
  const vmax = o.vmax ?? 12, acc = o.accel ?? 26, brake = o.brake ?? true;
  // Bends: the speed allowed at points every STEP along the route, from the curvature there, so a car eases off
  // before a corner and takes it on one steady arc instead of pivoting in a frame or two.
  const grip = o.grip ?? 70, STEP = 0.25, n = Math.max(2, Math.ceil(L / STEP) + 1);
  const bend = new Float32Array(n);
  {
    const t0 = new THREE.Vector3(), t1 = new THREE.Vector3();
    path.getTangentAt(0, t0);
    for (let k = 0; k < n; k++) {
      path.getTangentAt(Math.min(1, ((k + 1) * STEP) / L), t1);
      const dth = Math.acos(THREE.MathUtils.clamp((t0.x * t1.x + t0.z * t1.z) / (Math.hypot(t0.x, t0.z) * Math.hypot(t1.x, t1.z) || 1), -1, 1));
      bend[k] = dth > 1e-3 ? Math.sqrt(grip * (STEP / dth)) : Infinity;
      t0.copy(t1);
    }
  }
  /** The fastest speed from which the car can still slow down for every bend ahead in time. */
  const bendLimit = (s: number, v: number) => {
    let lim = Infinity;
    const reachK = Math.min(n - 1, Math.ceil((s + (v * v) / (2 * acc * 1.6) + STEP) / STEP));
    for (let k = Math.max(0, Math.floor(s / STEP)); k <= reachK; k++) {
      if (bend[k] === Infinity) continue;
      const d = Math.max(0, k * STEP - s);
      lim = Math.min(lim, Math.sqrt(bend[k] * bend[k] + 2 * acc * 1.6 * d));
    }
    return lim;
  };
  const me: Driver = { root, heading: new THREE.Vector3(0, 0, -1), id: nextId++, waitingFor: null, base: root.position.clone(), look: [0, 1, 2, 3].map(() => new THREE.Vector3()) };
  traffic.add(me);
  let s = 0, v = 0, waited = 0, gaveUp = false, prevYaw = root.rotation.y, swerve = 0;
  const left = new THREE.Vector3();
  const tan = new THREE.Vector3(), at = new THREE.Vector3();
  const place = (dt: number) => {
    const u = Math.min(1, s / L);
    const p = path.getPointAt(u, at);
    me.base.set(p.x, 0, p.z);
    // Overtaking a parked car: drift into the other lane (to the left of travel) and back.
    root.position.x = p.x + left.x * swerve; root.position.z = p.z + left.z * swerve;
    path.getTangentAt(u, tan);
    // Look out along the way the car is moving (backwards when reversing).
    me.heading.set(tan.x, 0, tan.z).normalize();
    left.set(me.heading.z, 0, -me.heading.x);
    if (o.reverse) tan.negate();
    // Our vehicles face −z at yaw 0.
    const yaw = Math.atan2(-tan.x, -tan.z);
    let dy = yaw - prevYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    // A car turns at most MAX_YAW_RATE: setting off at an angle to the route, it swings round over a few frames.
    const cap = MAX_YAW_RATE * Math.max(dt, 1 / 120);
    dy = THREE.MathUtils.clamp(dy, -cap, cap);
    root.rotation.y = prevYaw + dy;
    const yawRate = dt > 0 ? dy / dt : 0;
    prevYaw = root.rotation.y;
    return yawRate;
  };
  return loop((dt) => {
    if (dt <= 0) return false;
    // Where this car will be shortly (a car's length or so further along its route).
    // Look further ahead the faster it goes, so it has room to brake.
    const reach = 0.5 + v * 0.14;
    for (let k = 0; k < me.look.length; k++) path.getPointAt(Math.min(1, (s + 1.3 + k * reach) / L), me.look[k]);
    // Pull out past a car parked in the lane when the other lane is clear; pull back in once past it.
    if (me.overtaking) me.overtaking = parkedAlongside(me);
    else { const a = carAhead(me); if (a?.passable && !oncoming(me)) me.overtaking = true; }
    const blocked = carAhead(me, o.priority), ahead = gaveUp ? null : blocked;
    // A car that gave up waiting steers round whatever is still in its way instead of through it.
    // Back in lane before the end of the leg (a car must not stop half in the other lane and jump back later).
    const wantOut = (me.overtaking || (gaveUp && blocked)) && L - s > 1.2 + v * 0.45;
    swerve += THREE.MathUtils.clamp((wantOut ? 0.9 : 0) - swerve, -2.5 * dt, 2.5 * dt);
    // Give up waiting after a while (for the rest of this drive) rather than ever locking up.
    if (ahead) { waited += dt; trafficStats.held += dt; if (waited > 2.5) { gaveUp = true; trafficStats.gaveUp++; } } else waited = 0;
    const hold = !!ahead && !gaveUp;
    me.waitingFor = hold ? ahead : null;
    const left = L - s;
    let target = hold ? 0 : vmax;
    if (brake) target = Math.min(target, Math.sqrt(2 * acc * Math.max(0, left)) + 0.4);
    target = Math.min(target, bendLimit(s, v));
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
