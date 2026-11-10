// Types for the plain-JS car builder.
import type * as THREE from 'three';
export const CARS: Record<string, any>;
export function buildCar(spec: any, color: number | THREE.Material, opts?: Record<string, unknown>): THREE.Group;
export function buildZamyad(color: number | THREE.Material, opts?: Record<string, unknown>): THREE.Group;
export function buildBus(color?: number | THREE.Material, opts?: Record<string, unknown>): THREE.Group;
export function curve(pts: [number, number][]): (x: number) => number;
export function loft(o: Record<string, unknown>): THREE.BufferGeometry;
export function paint(color: number, metallic?: boolean): THREE.MeshPhysicalMaterial;
export function plateTex(o?: Record<string, unknown>): THREE.Texture;
export const M: Record<string, THREE.Material>;
export function buildVanet(color: number | THREE.Material, opts?: Record<string, unknown>): THREE.Group;
export function buildBenzBus(color?: number | THREE.Material, opts?: Record<string, unknown>): THREE.Group;
export function buildJeep(color: number | THREE.Material, opts?: Record<string, unknown>): THREE.Group;
export function buildLandRover(color: number | THREE.Material, opts?: Record<string, unknown>): THREE.Group;
export function setSnow(k: number): void;
export function setPaintLift(k: number): void;
