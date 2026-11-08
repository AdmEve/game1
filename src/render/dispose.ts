/** Freeing GPU resources of a scene subtree: geometry, materials and their textures. */
import * as THREE from 'three';

const TEXTURE_SLOTS = ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap'] as const;

function disposeMaterial(mat: THREE.Material) {
  if (mat.userData.keep) return;
  for (const slot of TEXTURE_SLOTS) (mat as unknown as Record<string, THREE.Texture | null | undefined>)[slot]?.dispose();
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
