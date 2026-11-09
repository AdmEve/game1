/**
 * Render profile, decided once at load (before any material is created) from the quality setting and the
 * device. 'lite' (phones by default) trims what costs most on mobile GPUs: no film post pass, standard
 * instead of clearcoat materials, fewer draw calls per car, fewer leaf cards and weather particles, smaller
 * ground textures. URL overrides for testing: ?lite / ?full.
 */
const mobile = typeof navigator !== 'undefined' && (/Android|iPhone|iPad/i.test(navigator.userAgent) || !!(globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
let quality = 'auto';
try { quality = JSON.parse(localStorage.getItem('rahbandoon.save.v1') ?? '{}')?.settings?.quality ?? 'auto'; } catch { /* no storage */ }
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const lite = q.has('lite') ? true : q.has('full') ? false : quality === 'high' ? false : quality === 'auto' ? mobile : true;
/** 'low' («ساده»): also lighter geometry (coarser cars and passengers, fewer leaf cards and weather particles). */
export const profile = { mobile, quality, lite, shadows: quality !== 'low', low: quality === 'low' && !q.has('full') };
