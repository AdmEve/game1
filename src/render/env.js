// Outdoor studio environment for reflections: sky dome, bright horizon, warm ground, a few soft boxes.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
export function outdoorEnv(renderer, { sky = 0x6aa8e8, horizon = 0xf4f1ea, ground = 0x6b665e, sun = true } = {}) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 64, 32);
  const cols = [], p = geo.attributes.position, c1 = new THREE.Color(sky), c2 = new THREE.Color(horizon), c3 = new THREE.Color(ground), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 50;
    if (y > 0) t.copy(c2).lerp(c1, Math.pow(y, 0.55)); else t.copy(c2).lerp(c3, Math.min(1, -y * 6));
    cols.push(t.r, t.g, t.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, pos, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(0, 0, 0); s.add(m); };
  box(30, 8, new THREE.Vector3(0, 30, 10), 2.2);
  box(14, 30, new THREE.Vector3(-40, 12, 0), 1.4);
  box(14, 30, new THREE.Vector3(40, 12, -10), 1.2);
  if (sun) { const m = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(30) })); m.position.set(20, 30, 20); s.add(m); }
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(s, 0.02).texture;
}

// Physically based sky (Preetham) with a city around the horizon and a dark ground, baked into a PMREM
// cube: cars and glass reflect a real sky gradient, a hot sun and a skyline, like photos of real streets.
const skyCache = new Map();
export function skyEnv(renderer, { elevation = 50, azimuth = 140, turbidity = 4, rayleigh = 1.4, mie = 0.004, ground = 0x2a2a28, city = 0x3a3d42, night = false } = {}) {
  const key = [elevation, azimuth, turbidity, rayleigh, mie, ground, city, night].join();
  if (skyCache.has(key)) return skyCache.get(key);
  const s = new THREE.Scene();
  const sky = new Sky(); sky.scale.setScalar(10);
  const u = sky.material.uniforms;
  u.turbidity.value = turbidity; u.rayleigh.value = rayleigh; u.mieCoefficient.value = mie; u.mieDirectionalG.value = 0.82;
  const phi = THREE.MathUtils.degToRad(90 - elevation), theta = THREE.MathUtils.degToRad(azimuth);
  u.sunPosition.value.setFromSphericalCoords(1, phi, theta);
  s.add(sky);
  if (night) { // a deep blue night dome with a faint warm city glow at the horizon
    const geo = new THREE.SphereGeometry(8, 48, 24), p = geo.attributes.position, cols = [];
    const top = new THREE.Color(0.02, 0.03, 0.08), hor = new THREE.Color(0.35, 0.24, 0.16);
    for (let i = 0; i < p.count; i++) { const y = Math.max(0, p.getY(i) / 8); const c = hor.clone().lerp(top, Math.pow(y, 0.4)); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })));
  }
  // Ground and a ring of buildings: what the lower half of every car body reflects.
  const g = new THREE.Mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: ground }));
  g.position.y = -0.6; s.add(g);
  const cityMat = new THREE.MeshBasicMaterial({ color: city }), lit = new THREE.MeshBasicMaterial({ color: night ? new THREE.Color(1.6, 1.2, 0.7) : new THREE.Color(0.55, 0.6, 0.66) });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + rnd() * 0.05, h = 0.6 + rnd() * 1.8, w = 0.7 + rnd() * 0.9;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), cityMat);
    b.position.set(Math.cos(a) * 7, -0.6 + h / 2, Math.sin(a) * 7); b.lookAt(0, b.position.y, 0); s.add(b);
    if (night || rnd() < 0.5) for (let k = 0; k < 3; k++) {
      const wdw = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 0.05), lit);
      wdw.position.copy(b.position).multiplyScalar(0.955); wdw.position.y = -0.6 + h * (0.3 + k * 0.22); wdw.lookAt(0, wdw.position.y, 0); s.add(wdw);
    }
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.01, 0.1, 30).texture;
  pm.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
  skyCache.set(key, tex);
  return tex;
}
