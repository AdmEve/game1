/** Freeing GPU resources of a scene subtree: geometry, materials and their textures. */
import * as THREE from 'three';

const TEXTURE_SLOTS = ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap'] as const;

/**
 * Mark a texture made once and shared by every level (a module-level cache): freeing a level must not free it, or
 * the next level uploads it again (scripts/reuse.cjs). Clones copy the flag; a per-level clone sets it back to false.
 */
export function keepTex<T extends THREE.Texture>(t: T): T { t.userData.keep = true; return t; }

function disposeMaterial(mat: THREE.Material) {
  if (mat.userData.keep) return;
  for (const slot of TEXTURE_SLOTS) {
    const t = (mat as unknown as Record<string, THREE.Texture | null | undefined>)[slot];
    if (t && !t.userData.keep) t.dispose();
  }
  // The material itself is not disposed: that would release its compiled shader program once nothing else uses
  // it, and the next level (which builds the same kinds of materials again) would stall compiling it anew. A
  // material holds no GPU memory of its own; the program cache stays bounded by the handful of shader variants.
}

/** Dispose everything under `root` except what is flagged `userData.keep` (vehicle templates and shared materials). */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const g = o as THREE.Mesh;
    if ((g.isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) && g.geometry) {
      if (g.geometry.userData.keep) return;
      g.geometry.dispose();
    }
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) disposeMaterial(m);
  });
}
