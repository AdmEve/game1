/**
 * Instanced drawing for repeated models (cars, arrows, shadow blobs, passengers).
 *
 * A model placed in the scene keeps its usual node tree, so the game moves, tilts and scales it as before, but
 * instead of meshes its leaves are `Slot`s: invisible nodes that each say "draw this geometry with this
 * material here". Right before every render, the slots under the registered roots are collected, and each
 * (geometry, material) pair is drawn with one InstancedMesh. A full lot of cars costs a few dozen draw calls
 * instead of hundreds.
 */
import * as THREE from 'three';

export interface Batch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  mesh: THREE.InstancedMesh | null;
  cap: number;
  n: number;
  colored: boolean;
  castShadow: boolean;
  renderOrder: number;
}

const batches = new Map<string, Batch>();
let host: THREE.Scene | null = null;
const roots = new Set<THREE.Object3D>();

/** A leaf that stands for one instance of (geometry, material). An optional per-instance color tints it. */
export class Slot extends THREE.Object3D {
  readonly isSlot = true;
  constructor(readonly batch: Batch, public tint: THREE.Color | null = null) { super(); this.matrixAutoUpdate = true; }
}

export interface SlotOpts { castShadow?: boolean; renderOrder?: number; colored?: boolean }

/** The batch for a (geometry, material) pair; created on first use. */
export function batchFor(geometry: THREE.BufferGeometry, material: THREE.Material, o: SlotOpts = {}): Batch {
  const key = `${geometry.uuid}|${material.uuid}|${o.castShadow ? 1 : 0}|${o.renderOrder ?? 0}`;
  let b = batches.get(key);
  if (!b) {
    b = { geometry, material, mesh: null, cap: 0, n: 0, colored: !!o.colored, castShadow: !!o.castShadow, renderOrder: o.renderOrder ?? 0 };
    batches.set(key, b);
  }
  if (o.colored) b.colored = true;
  return b;
}

export function slot(geometry: THREE.BufferGeometry, material: THREE.Material, o: SlotOpts = {}, tint: THREE.Color | null = null): Slot {
  return new Slot(batchFor(geometry, material, o), tint);
}

function grow(b: Batch, need: number) {
  let cap = Math.max(16, b.cap);
  while (cap < need) cap *= 2;
  const old = b.mesh;
  if (old) { host?.remove(old); old.dispose(); }
  const m = new THREE.InstancedMesh(b.geometry, b.material, cap);
  // Instances already gathered this frame carry over.
  if (old) m.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, b.n * 16));
  m.frustumCulled = false; // instances move every frame; their bounds would need recomputing
  m.castShadow = b.castShadow;
  m.receiveShadow = true;
  m.renderOrder = b.renderOrder;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (b.colored) {
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    if (old?.instanceColor) m.instanceColor.array.set(old.instanceColor.array.subarray(0, b.n * 3));
  }
  m.userData.keep = true;
  m.count = 0;
  b.mesh = m; b.cap = cap;
  host?.add(m);
}

const WHITE = new THREE.Color(1, 1, 1);
function collect(o: THREE.Object3D) {
  if (!o.visible) return;
  if ((o as Slot).isSlot) {
    const s = o as Slot, b = s.batch;
    if (b.n >= b.cap || !b.mesh) grow(b, b.n + 1);
    const m = b.mesh!;
    s.matrixWorld.toArray(m.instanceMatrix.array, b.n * 16);
    if (b.colored) (s.tint ?? WHITE).toArray(m.instanceColor!.array, b.n * 3);
    b.n++;
  }
  const c = o.children;
  for (let i = 0; i < c.length; i++) collect(c[i]);
}

/** Gather every slot under the registered roots into the instanced meshes (call after matrices are updated). */
export function syncInstances() {
  for (const b of batches.values()) b.n = 0;
  for (const r of roots) if (r.parent) collect(r);
  for (const b of batches.values()) {
    const m = b.mesh;
    if (!m) continue;
    m.count = b.n;
    m.visible = b.n > 0;
    if (b.n) {
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, b.n * 16); m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) { m.instanceColor.clearUpdateRanges(); m.instanceColor.addUpdateRange(0, b.n * 3); m.instanceColor.needsUpdate = true; }
    }
  }
}

/**
 * Draw instances into `scene`: the instanced meshes live there, and the slots are gathered right before each
 * render (after the scene's matrices are updated, before anything is drawn, shadows included).
 */
export function attachInstancer(scene: THREE.Scene) {
  host = scene;
  for (const b of batches.values()) if (b.mesh) scene.add(b.mesh);
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = (...a) => { syncInstances(); prev.apply(scene, a); };
}

/** Subtrees to look for slots in (e.g. the level's group). */
export function addInstanceRoot(o: THREE.Object3D) { roots.add(o); }
export function removeInstanceRoot(o: THREE.Object3D) { roots.delete(o); }

/** Slots and their batches in a subtree, for tests and the perf overlay. */
export function instanceStats() {
  let used = 0, instances = 0;
  for (const b of batches.values()) if (b.n) { used++; instances += b.n; }
  return { batches: batches.size, drawn: used, instances };
}

/**
 * Turn the meshes of a baked model into slots (same transforms), so the copy placed in the scene is drawn
 * instanced. `paint` names the material whose instances take the per-instance color; others draw as they are.
 */
export function toSlots(model: THREE.Object3D, o: { castShadow: boolean; tint?: THREE.Color | null; paint?: (m: THREE.Material) => THREE.Material | null; renderOrder?: number }): THREE.Object3D {
  const out = new THREE.Group();
  out.position.copy(model.position); out.quaternion.copy(model.quaternion); out.scale.copy(model.scale);
  for (const c of model.children) {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) continue;
    const mat = mesh.material as THREE.Material;
    const painted = o.paint?.(mat) ?? null;
    const s = slot(mesh.geometry, painted ?? mat, { castShadow: o.castShadow && mesh.castShadow, renderOrder: o.renderOrder ?? mesh.renderOrder, colored: !!painted }, painted ? o.tint ?? null : null);
    s.position.copy(mesh.position); s.quaternion.copy(mesh.quaternion); s.scale.copy(mesh.scale);
    out.add(s);
  }
  return out;
}
