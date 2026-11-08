/**
 * One small 3D view shared by the garage and the agency screens. It is created once and kept (with its
 * compiled shaders and environment map), so opening those screens again costs nothing.
 */
import * as THREE from 'three';

let r: THREE.WebGLRenderer | null = null;
export function stageRenderer(w: number, h: number): THREE.WebGLRenderer {
  if (!r) {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: location.search.includes('shot') });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.debug.checkShaderErrors = location.search.includes('debug');
  }
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(w, h);
  return r;
}
