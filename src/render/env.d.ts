import type * as THREE from 'three';
export function outdoorEnv(renderer: THREE.WebGLRenderer, o?: Record<string, unknown>): THREE.Texture;
export function skyEnv(renderer: THREE.WebGLRenderer, o?: { elevation?: number; azimuth?: number; turbidity?: number; rayleigh?: number; mie?: number; ground?: number; city?: number; night?: boolean; bare?: boolean }): THREE.Texture;
