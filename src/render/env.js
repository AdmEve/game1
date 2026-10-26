// Outdoor studio environment for reflections: sky dome, bright horizon, warm ground, a few soft boxes.
import * as THREE from 'three';
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
