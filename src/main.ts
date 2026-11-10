// First, so a failure in any module below still ends on a message instead of a frozen splash.
import { mainLoaded, showFatal } from './ui/fatal';
// Then what older WebViews lack, before any module draws with it.
import './polyfills';
import './fonts.css';
import './style.css';
import './theme.css';
import * as THREE from 'three';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import PACKED from './game/levels.pack.json';
import { unpackLevel } from './game/pack';
import { route, type Kind, type Level } from './game/rules';
import { busy, ease, resetTraffic, setSpeed, tick, tween } from './render/anim';
import { onGpuRestored, skyEnv } from './render/env.js';
import { profile } from './render/profile';
import { Post, DEFAULT_GRADE, type Grade } from './render/post';
import { setCarQuality, setCarShadows, warmFleet } from './render/fleet';
import { addInstanceRoot, attachInstancer, instanceStats, removeInstanceRoot, syncInstances } from './render/instancer';
import { setPaintLift, setSnow } from './render/cars.js';
import { sky } from './render/world';
import { MAX_BAYS, Session, worldCacheInfo, worldCached, worldSteps, worldTextures } from './play/session';
import type { WorldOpts } from './render/world';
import { CHAPTERS, chapterOf, type Light } from './game/chapters';
import { endlessLevel, placeOf } from './game/endless';
import { lightsMaterial } from './render/fleet';
import { BOOSTERS, Hud, asBack, backPress, button, fa, faNum, h, modal, note, topCard, type BoosterId } from './ui/hud';
import { emo } from './ui/emoji';
import { icon } from './ui/icons';
import { introIcon, introTitle, maybeDaily, maybeStarterOffer, showWelcomeBack, showChest, showGuide, showIntro, showRule, showShop, type IntroKind } from './ui/meta';
import { claimable, newlyReached, showAchievements } from './ui/achieve';
import { FREE_LEVELS, MAX_LIVES, addLives, fullAt, lives, loseLife } from './lives';
import { AWAY_DAYS, askNotifications, planReminders, syncReminders } from './notify';
import { UNLOCK_ALL_LEVELS } from './config';
import { errorReport, errors, installErrorLog } from './errlog';
import { deviceReport, recordBoot } from './devreport';
import { drawShareCard, shareWin, type ShareWin } from './ui/sharecard';
import { showPrivacy } from './ui/privacy';
import { showTransfer, takeTransferNote } from './ui/transfer';
import { HELP_FROM, MERCY_LEVELS, helpOpen, helpOpening } from './game/helps';
import { solve as solveLevel } from './game/solver';
import { Share } from '@capacitor/share';
import { livesPill, showNoLives } from './ui/lives';
import { addStars, nextRenovation, showAgency } from './ui/agency';
import { starsFor } from './render/agency';
import { POM, showYaldaWin, yaldaBanner } from './ui/yalda';
import { nowruzBanner, showNowruzWin } from './ui/nowruz';
import { fillPiggy } from './ui/piggy';
import { AJOOL, BOSS_LINES, RAHIM } from './ui/characters';
import { passReady, punch, showPass } from './ui/pass';
import { HAFT_SIN, nowruzLevel, yaldaLevel } from './game/events';
import { addKeys, showGarage } from './ui/garage';
import { radioCard } from './ui/radio';
import { countUp, floatingWallet, flyCoins } from './ui/juice';
import { nextStreak, streakHelps, type Help } from './streak';
import { count, hardest, statsCsv } from './levelstats';
import { today } from './game/daily';
import { prepareRush, rushReady } from './rush';
import { countPlayed, missionText, MISSIONS_FROM, todayMissions, type Mission, type Played } from './missions';
import { showToday, todayBadge, todayLine } from './ui/today';
import { initMonetization, maybeInterstitial, rateApp, rewardedAvailable, showRewarded } from './monetize';
import { persist, save } from './save';
import * as sfx from './audio';
import { scapeNow, soundscape } from './soundscape';
import { disposeTree } from './render/dispose';
import { click, coin } from './audio';
import { MOODS as WEATHER_MOODS, type WeatherKind } from './render/weather';
import { duckMusic, prepareMusic, setMood, setMusicVolume, setTension, startMusic, stopMusic } from './music';
import { warmPeople } from './render/people';
import { fxWarmObjects } from './render/fx';
import { haptic } from './haptics';
import { createPacer, type PaceMemory } from './render/pacing';
import { perfFrame, togglePerfHud } from './ui/perfhud';

// Script errors are kept on the phone (Settings can share them).
installErrorLog();

const levels: Level[] = (PACKED as string[]).map(unpackLevel);
const debug = new URLSearchParams(location.search);

// ───── Renderer and scene ─────
const app = document.getElementById('app')!;
// No WebGL (a blocklisted GPU driver, an old System WebView): say so on the splash instead of loading forever.
const renderer = (() => {
  try { return new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: debug.has('shot') }); }
  catch (e) { showFatal('webgl', String((e as Error)?.message ?? e)); throw e; }
})();
/** Phones (the APK or a mobile browser) get a lighter setup: fewer pixels, cheaper shadows, no live blur. */
const mobile = Capacitor.isNativePlatform() || /Android|iPhone|iPad/i.test(navigator.userAgent);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, debug.has('shot') ? 3 : mobile ? 1.25 : 2));
renderer.shadowMap.enabled = profile.shadows;
renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
// The world's shadows barely change, so phones redraw the shadow map only every few frames, and cars cast none.
if (mobile || profile.lite) { renderer.shadowMap.autoUpdate = false; setCarShadows(false); setCarQuality(profile.low ? 0.12 : profile.lite ? 0.17 : 0.22); }
// Checking shader logs forces the main thread to wait for every compile; only do it when debugging.
renderer.debug.checkShaderErrors = debug.has('debug');
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.append(renderer.domElement);
// Film look: HDR scene, bloom, filmic tone mapping, color grade, lens vignette, grain (see render/post.ts).
const post = new Post(renderer, { samples: mobile ? 2 : 4 });
post.enabled = !profile.lite;
document.body.classList.toggle('lite', profile.lite);

// ───── Graphics quality: 2 = full (film post, soft shadows), 1 = balanced (fewer pixels), 0 = simple (no post, hard shadows) ─────
let tier = 2;
/** Frame pacing and, in 'auto' quality, a resolution governor (render/pacing.ts). */
const PACE_KEY = 'rahbandoon.pace.v1';
let paceMemory: PaceMemory | null = null;
try { paceMemory = save.settings.quality === 'auto' ? JSON.parse(localStorage.getItem(PACE_KEY) ?? 'null') : null; } catch { /* no storage */ }
const pacer = createPacer({
  adaptive: () => save.settings.quality === 'auto' && !debug.has('shot'),
  onScale: () => setTier(tier),
  memory: paceMemory,
  remember: (m) => { try { localStorage.setItem(PACE_KEY, JSON.stringify(m)); } catch { /* no storage */ } },
});
function setTier(t: number) {
  tier = Math.max(0, Math.min(2, t));
  const dpr = window.devicePixelRatio;
  if (debug.has('shot')) return;
  // Lite (phones): no film post pass, fewer pixels. Full: the post pass while the device keeps up.
  // Sharp by default (phone screens have 2.5–3 pixels per point; drawing 1.1 of them looked soft), and the governor
  // in 'auto' steps the resolution down only if a phone can't hold its frame rate.
  const ratio = profile.lite ? [1.0, 1.4, 1.8][tier] : [1, 1.5, 2][tier];
  renderer.setPixelRatio(Math.max(0.5, Math.min(dpr, ratio * pacer.state.scale)));
  post.enabled = !profile.lite && tier > 0;
  document.body.classList.toggle('lite', !post.enabled);
  const size = tier === 0 ? 512 : mobile || tier === 1 ? 1024 : 2048;
  if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  renderer.shadowMap.needsUpdate = true;
  fitCamera();
}
function applyQuality(q: typeof save.settings.quality) { setTier(q === 'balanced' ? 1 : q === 'low' ? 0 : 2); }

// A lost GPU context (Android drops it when the GPU process restarts or memory runs short, often while the app sits
// in the background) comes back with everything drawn once gone: the sky backdrop and reflections, and the shadow
// map phones draw once per level. Without this the level returned nearly black (scripts/ctxloss.cjs).
onGpuRestored(renderer, () => { envFor(envOver); renderer.shadowMap.needsUpdate = true; });
// If it never comes back (it can't always), start again from the save rather than leave a dead screen.
renderer.domElement.addEventListener('webglcontextlost', () => {
  let seen = 0;
  const check = () => {
    if (!renderer.getContext().isContextLost()) return;
    seen = document.visibilityState === 'visible' ? seen + 1 : 0;
    if (seen >= 6) { persist(); location.reload(); } else setTimeout(check, 1000);
  };
  setTimeout(check, 1000);
});
/** Wait for the shaders to compile, but not forever: with the context lost, the wait would hold the veil up. */
const compiled = () => Promise.race([renderer.compileAsync(scene, camera).then(() => {}, () => {}), new Promise<void>((r) => setTimeout(r, 8000))]);

const scene = new THREE.Scene();
// Cars, arrows and passengers are drawn instanced: one draw call per model and material (render/instancer.ts).
attachInstancer(scene);
scene.background = sky();
scene.fog = new THREE.Fog(0xdfe9f2, 40, 95);
scene.environment = skyEnv(renderer);
scene.environmentIntensity = 1;
scene.add(new THREE.HemisphereLight(0xe3f0ff, 0x6b5a45, 0.25));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = mobile ? 2 : 3;
scene.add(sun, sun.target);

const flood = new THREE.SpotLight(0xffe2b8, 0, 70, 0.75, 0.7, 1.4);
scene.add(flood, flood.target);
const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight;

/** Per-chapter time of day: sky, fog, sun angle and color, exposure, how much lamps and headlights glow. */
type SkyOpts = { turbidity: number; rayleigh: number; mie?: number; night?: boolean; ground?: number; glow?: number; glowK?: number };
const LIGHTS: Record<Light, { sky: [number, string][]; fog: number; hemi: [number, number, number]; sun: [number, number, [number, number, number]]; exposure: number; env: number; lamps: number; air: SkyOpts; grade: Partial<Grade> }> = {
  day: { sky: [[0, '#4b93dd'], [0.5, '#9dcff7'], [0.85, '#e8eef2'], [1, '#f7e7cf']], fog: 0xdfe9f2, hemi: [0xe3f0ff, 0x6b5a45, 0.7], sun: [0xfff0d8, 2.6, [-9, 22, 11]], exposure: 0.95, env: 0.8, lamps: 0.32, air: { turbidity: 3.2, rayleigh: 1.1 }, grade: {} },
  sunset: { sky: [[0, '#34477f'], [0.45, '#c9708a'], [0.75, '#f6a05e'], [1, '#ffd79a']], fog: 0xe8956a, hemi: [0xffb98c, 0x3d2a45, 0.42], sun: [0xff8a3d, 3.2, [-22, 8, 5]], exposure: 0.92, env: 0.45, lamps: 1.0, air: { turbidity: 8, rayleigh: 2.6, mie: 0.007, glow: 0xff7a3c, glowK: 1.7 }, grade: { saturation: 1.0, shadows: [0.012, 0.0, 0.03], highlights: [0.05, 0.02, -0.01], bloom: 0.5 } },
  bazaar: { sky: [[0, '#5a8fd0'], [0.5, '#bcd6ee'], [0.85, '#f3e6cf'], [1, '#f6d9a8']], fog: 0xf0e2c8, hemi: [0xfff1d8, 0x7a5a3a, 0.62], sun: [0xffd49a, 2.8, [-14, 16, 9]], exposure: 0.95, env: 0.7, lamps: 0.4, air: { turbidity: 7, rayleigh: 1.4, mie: 0.006 }, grade: { saturation: 0.9, highlights: [0.045, 0.025, 0.0] } },
  dusk: { sky: [[0, '#0f1b4d'], [0.45, '#3b3f8f'], [0.75, '#c2607a'], [1, '#f6a96b']], fog: 0x3a3570, hemi: [0x8a8fe0, 0x2a2238, 0.45], sun: [0xff9a6a, 1.4, [-22, 7, 4]], exposure: 1.1, env: 0.35, lamps: 2.0, air: { turbidity: 6, rayleigh: 3, mie: 0.006, glow: 0xff6670, glowK: 1.3 }, grade: { saturation: 0.95, shadows: [0.015, 0.0, 0.04], highlights: [0.04, 0.012, 0.0], bloom: 0.6 } },
  spring: { sky: [[0, '#3f8fe0'], [0.5, '#9fd3fb'], [0.85, '#e9f5f2'], [1, '#fdf0f5']], fog: 0xe4f1f6, hemi: [0xeaf6ff, 0x5f7a45, 0.75], sun: [0xfff6e6, 2.7, [-10, 20, 12]], exposure: 0.96, env: 0.85, lamps: 0.3, air: { turbidity: 2.6, rayleigh: 1.0 }, grade: { saturation: 0.95 } },
  autumn: { sky: [[0, '#4f7fb8'], [0.5, '#e7b98a'], [0.82, '#f6c27a'], [1, '#ffdca3']], fog: 0xe9c89a, hemi: [0xffe0b0, 0x5a3a20, 0.55], sun: [0xffb15c, 3.0, [-18, 12, 8]], exposure: 0.93, env: 0.55, lamps: 0.8, air: { turbidity: 7, rayleigh: 1.8, mie: 0.005, glow: 0xffa860, glowK: 0.4 }, grade: { saturation: 0.9, highlights: [0.045, 0.02, -0.005] } },
  snow: { sky: [[0, '#8fb3d9'], [0.5, '#cfe0f0'], [1, '#f4f8fb']], fog: 0xe6eef6, hemi: [0xf0f6ff, 0xb9c4d0, 0.95], sun: [0xf2f6ff, 2.1, [-8, 24, 12]], exposure: 0.92, env: 0.9, lamps: 0.5, air: { turbidity: 10, rayleigh: 0.5, ground: 0x8a8f96 }, grade: { saturation: 0.82, shadows: [0.0, 0.01, 0.035], highlights: [0.0, 0.005, 0.015] } },
  night: { sky: [[0, '#040918'], [0.55, '#122148'], [1, '#2c3d6e']], fog: 0x0f1a36, hemi: [0x7f93cc, 0x2a2420, 1.2], sun: [0xd8e2ff, 1.7, [10, 20, 8]], exposure: 1.2, env: 0.7, lamps: 2.6, air: { turbidity: 2, rayleigh: 0.4, night: true }, grade: { saturation: 0.85, shadows: [0.0, 0.008, 0.04], highlights: [0.03, 0.02, 0.0], bloom: 0.9, threshold: 0.9 } },
};
let sunOffset = new THREE.Vector3(-9, 22, 11);
let envFor: (over?: Partial<SkyOpts>) => void = () => {};
let envOver: Partial<SkyOpts> | undefined; // the sky the reflections show now (weather can overcast it)
let grade: Grade = DEFAULT_GRADE;
/** How much car paint lifts its own colour in each chapter's light (measured: scripts/colorsep.cjs). */
const PAINT_LIFT: Record<Light, number> = { day: 0, spring: 0, bazaar: 0.02, sunset: 0.06, night: 0.05, snow: 0.04, dusk: 0.08, autumn: 0.16 };
function applyLight(light: Light) {
  const L = LIGHTS[light];
  setPaintLift(PAINT_LIFT[light]);
  (scene.fog as THREE.Fog).color.setHex(L.fog);
  hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
  sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sunOffset = new THREE.Vector3(...L.sun[2]);
  renderer.toneMappingExposure = L.exposure;
  sun.shadow.radius = mobile ? 2 : 3;
  // Image-based light from a real sky with the sun where the shadows say it is.
  const sd = new THREE.Vector3(...L.sun[2]).normalize();
  envFor = (over?: Partial<SkyOpts>) => {
    envOver = over;
    const a = { ...L.air, ...over };
    const o = { elevation: a.night ? -6 : Math.round(THREE.MathUtils.radToDeg(Math.asin(sd.y))), azimuth: Math.round(THREE.MathUtils.radToDeg(Math.atan2(sd.x, sd.z))), turbidity: a.turbidity, rayleigh: a.rayleigh, mie: a.mie, night: a.night, ground: a.ground, glow: a.glow, glowK: over?.turbidity ? 0 : a.glowK };
    scene.environment = skyEnv(renderer, o);
    // The backdrop is the same sky, without the reflection-only city ring.
    scene.background = skyEnv(renderer, { ...o, bare: true });
  };
  envFor();
  scene.environmentIntensity = L.env * 1.25;
  hemi.intensity = L.hemi[2] * (light === 'night' ? 1 : 0.4);
  // Night: sodium floodlights over the lot so every car's color still reads.
  flood.intensity = light === 'night' ? 260 : light === 'dusk' ? 120 : 0;
  // An unlit spotlight still costs every pixel its lighting math: leave it out of the scene by day.
  flood.visible = flood.intensity > 0;
  grade = { ...DEFAULT_GRADE, ...L.grade };
  post.setGrade(grade);
  lightsMaterial.emissiveIntensity = L.lamps;
  document.body.dataset.light = light;
}

// Weather: thicker fog and dimmer light in rain and snow, and a flash of the sky for lightning.
let wxBase = { hemi: 0.7, sun: 2.6, exposure: 0.95 };
let wxFlashing = false;
/** The chapter light of the level on screen (its soundscape follows it). */
let placeLight: Light | null = null;
function applyWeatherMood(kind: WeatherKind) {
  const m = WEATHER_MOODS[kind], fog = scene.fog as THREE.Fog;
  fog.near = m.fogNear; fog.far = m.fogFar;
  fog.color.lerp(new THREE.Color(m.tint), m.tintAmount);
  hemi.intensity *= m.light; sun.intensity *= m.light;
  // Overcast weather: a grey sky in every reflection, softer sun, a cooler, flatter grade.
  if (m.overcast) { envFor(m.overcast); scene.environmentIntensity *= 0.85; }
  if (m.grade) post.setGrade({ ...grade, ...m.grade });
  setSnow(kind === 'snow' ? 1 : 0);
  if (kind === 'rain' || kind === 'storm' || kind === 'snow') sun.shadow.radius = 6;
  wxBase = { hemi: hemi.intensity, sun: sun.intensity, exposure: renderer.toneMappingExposure };
  const amb = kind === 'rain' || kind === 'storm' || kind === 'snow' || kind === 'dust' ? kind : null;
  sfx.ambience(amb);
}
function applyFlash(f: number) {
  if (!f && !wxFlashing) return;
  wxFlashing = f > 0;
  hemi.intensity = wxBase.hemi * (1 + f * 3.5); sun.intensity = wxBase.sun * (1 + f * 2);
  renderer.toneMappingExposure = wxBase.exposure * (1 + f * 0.5);
}

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 340);
const PITCH = THREE.MathUtils.degToRad(48);

let session: Session | null = null;
let hud: Hud;
let craneMode = false;
let modalOpen = false;
const safe = { top: 132, bottom: 128 };

// Tutorial hand: on the first levels before the first tap, and after a long idle on the ramp (levels 1–8). Past the
// ramp it shows only when asked: the puzzles there are built to be thought through (BEST_IN_MARKET_PLAN C3).
const hand = h('div', 'hand', emo('👆', 'emo'));
/** Past the ramp, a long idle brings this offer instead of the answer. */
const HINT_OFFER_MS = 20000;
const hintChip = button(`${icon('bulb')} راهنما؟`, 'hint-chip', () => { hintAsked = performance.now(); hintChip.classList.remove('show'); haptic('light'); });
let hintAsked = 0; // when the player asked for a hint (0: not asked); any move after it ends the request
// Level 1, the first time: the board dims around the suggested car for the first two taps, and a tap anywhere
// else is gently refused (the hand bounces). The first moves are shown, not explained.
const spot = h('div', 'spot');
// After a new mechanic's card: a pulsing ring and its name over where it first shows on the board.
const mark = h('div', 'mark', '<i></i><span></span>');
document.body.append(spot, mark, hand, hintChip);
let hintFor = -1, hintAt = 0, spotKey = '';
let swooping = false, swoopId = 0;
function spotWanted() {
  if (!session || current !== 0 || rush || event || save.seen.spot) return false;
  if (session.taps >= 2) { save.seen.spot = true; persist(); return false; } // shown once, ever
  return !modalOpen && !session.s.over && !swooping;
}
function showSpot(on: boolean) {
  if (on && session && hintFor >= 0) {
    const b = session.screenBounds(hintFor, camera, window.innerWidth, window.innerHeight);
    const x = Math.round(b.x), y = Math.round(b.y), rx = Math.round(b.rx * 1.3 + 16), ry = Math.round(b.ry * 1.3 + 16);
    const key = `${x},${y},${rx},${ry}`;
    if (key !== spotKey) { spotKey = key; spot.style.background = `radial-gradient(${rx}px ${ry}px at ${x}px ${y}px, rgba(6, 10, 18, 0) 70%, rgba(6, 10, 18, .64) 100%)`; }
    spot.classList.add('show');
  } else spot.classList.remove('show');
}
/**
 * When the level last came into view (no card, no veil, the opening camera move done). Idle time for the hint offer
 * and the ramp's hand counts from the later of this and the last move: a level is built behind the loading screen,
 * home and the level-change veil, and time spent on a card isn't time spent stuck (scripts/hintoffer.cjs).
 */
let inViewSince = 0;
/** A rewind (C13) put the player back before their mistake at this tap count: until they tap again, the hint comes early. */
let rewoundAt = -1;
function updateHand() {
  if (!session || modalOpen || session.s.over) { inViewSince = performance.now(); hand.classList.remove('show'); hintChip.classList.remove('show'); showSpot(false); hintFor = -1; return; }
  const now = performance.now();
  if (swooping || veil.classList.contains('on')) inViewSince = now;
  const idle = now - Math.max(session.lastInput, inViewSince);
  const spotOn = spotWanted(), ramp = current < MERCY_LEVELS && !rush && !event;
  if (hintAsked && session.lastInput > hintAsked) hintAsked = 0; // a move since: that hint is done
  // Asked, but the search found nothing for this position (or gave up): say so once rather than leave them waiting.
  // Asked, and the search says there's no winning move from here: say what's true. Most such positions are still won
  // with one more bay (scripts/hintbudget.ts: 133 of 154), so that comes first, with the parking help pulsing; a
  // position lost even so is said plainly; only a search that ran out of budget keeps the "maybe" (BEST_IN_MARKET_PLAN C8).
  const verdict = hintAsked ? session.hintVerdict() : null;
  if (hintAsked && (verdict === 'bay' || verdict === 'lost')) {
    hintAsked = 0;
    if (verdict === 'bay') { hud.toast('بدون کمک دیگه راهی نیست؛ با یه «جای پارک» هنوز می‌شه برد!', 3600); hud.bump('bay'); }
    else hud.toast('از اینجا دیگه راهی نیست؛ بهتره مرحله رو از اول شروع کنی.', 3400);
  }
  if (hintAsked && now - hintAsked > 3000 && hintFor < 0) { hintAsked = 0; hud.toast('این‌بار راهنمایی پیدا نشد؛ شاید بهتره مرحله رو از اول شروع کنی.', 3200); }
  // Just back from a rewind (they lost from here a moment ago): the offer comes after 4 s, not 20.
  const offerAfter = session.taps === rewoundAt ? 4000 : HINT_OFFER_MS;
  hintChip.classList.toggle('show', !ramp && !spotOn && !hintAsked && idle > offerAfter);
  const want = spotOn || (current < 3 && session.taps === 0) || (current < 3 && idle > 3500) || (ramp && idle > 10000) || !!hintAsked;
  if (!want) {
    // Search a little ahead of the offer, so a tap on the chip shows the hand at once.
    if (!ramp && idle > offerAfter - 3000) session.hint();
    hand.classList.remove('show'); showSpot(false); hintFor = -1; return;
  }
  // The hint is searched in a worker: until it arrives (a frame or two) no hand shows.
  if (hintFor < 0 || !session.s.inLot[hintFor] || performance.now() - hintAt > 4000) { hintFor = session.hint(); if (hintFor >= 0) hintAt = performance.now(); }
  if (hintFor < 0) { hand.classList.remove('show'); showSpot(false); return; }
  const p = session.anchor(hintFor).project(camera);
  hand.style.left = `${((p.x + 1) / 2) * window.innerWidth}px`;
  hand.style.top = `${((1 - p.y) / 2) * window.innerHeight}px`;
  hand.classList.add('show');
  showSpot(spotOn);
}
/** Levels finished before the daily gift starts showing (the first session is for learning to play). */
const DAILY_FROM = 3;
/** First-levels tips, one line each. */
const TIPS = ['ماشینِ هم‌رنگِ مسافرهای جلوی صف رو بزن!', 'فلش، جهت حرکت ماشینه. اول راهش رو باز کن!', 'جای پارک کمه؛ ماشینی رو بفرست که مسافرش نزدیکه.',
  'شک داری؟ انگشتت رو روی ماشین نگه دار تا ببینی راهش بازه یا نه.'];
/**
 * Start-of-level notes wait for the player: shown one after another only while the level is in view (no card,
 * no veil, the opening camera move done), so a warning built behind the home screen or an intro card isn't lost.
 */
const notes: { text: string; ms: number; buzz: boolean; banner?: boolean }[] = [];
let noteReadyAt = 0;
function queueNote(text: string, ms = 2800, buzz = false, banner = false) { notes.push({ text, ms, buzz, banner }); }
/** A hard level's call across the board once the camera has settled (the first of its notes; taps go through it). */
const banner = h('div', 'level-banner');
banner.setAttribute('aria-live', 'polite');
document.body.append(banner);
function showBanner(html: string, ms: number) {
  banner.innerHTML = `<div class="rib">${html}</div>`;
  banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), ms);
  haptic('medium'); sfx.sting(); duckMusic(1.2);
}
/** Run `f` once the level-change veil is down (a level-start card is built behind it, then shown as it lifts). */
function afterVeil(f: () => void) { const go = () => { if (veil.classList.contains('on')) requestAnimationFrame(go); else f(); }; go(); }
function pumpNotes(now: number) {
  if (!notes.length || now < noteReadyAt) return;
  if (modalOpen || modalBacks.length || veil.classList.contains('on') || hud.root.classList.contains('hidden') || swooping) { noteReadyAt = now + 500; return; }
  const n = notes.shift()!;
  if (n.banner) showBanner(n.text, n.ms); else hud.toast(n.text, n.ms);
  if (n.buzz) haptic('success');
  noteReadyAt = now + n.ms + (n.banner ? 100 : 350);
}
function nudgeHand() { hand.classList.remove('nudge'); void hand.offsetWidth; hand.classList.add('nudge'); haptic('light'); }

/** The special rules a level has, in the Journey's order (for event intros and the pause card's chips). */
function levelRules(level: Level): IntroKind[] {
  const v = level.vehicles, o = level.obstacles ?? [];
  const has: [IntroKind, boolean][] = [
    ['cover', v.some((x) => x.covered)], ['broken', v.some((x) => x.wait)], ['vip', !!level.vip?.length], ['oddEven', !!level.oddEven],
    ['courier', v.some((x) => x.kind === 'bike')], ['officer', !!level.officer], ['cart', o.some((x) => x.kind === 'cart')],
    ['wedding', v.some((x) => x.wedding)], ['granny', !!level.granny?.length], ['tunnel', o.some((x) => x.kind === 'tunnel')],
  ];
  return has.filter(([, on]) => on).map(([k]) => k);
}

let markAt: THREE.Vector3 | null = null, markUntil = 0;
function pointAt(kind: IntroKind, ms = 2800) {
  if (!session) return;
  // The plate rule and the officer live in the HUD: their sign pulses instead.
  if (kind === 'oddEven' || kind === 'officer') {
    const el = document.querySelector<HTMLElement>(kind === 'oddEven' ? '.camsign:not(.cop)' : '.camsign.cop');
    if (el) { el.classList.remove('point'); void el.offsetWidth; el.classList.add('point'); setTimeout(() => el.classList.remove('point'), 2800); }
    return;
  }
  const at = session.mechanicSpot(kind);
  if (!at) return;
  markAt = at; markUntil = performance.now() + ms;
  mark.querySelector('span')!.textContent = introTitle(kind);
  mark.classList.add('show');
}
function updateMark() {
  if (!markAt) return;
  if (performance.now() > markUntil || !session || modalOpen) { mark.classList.remove('show'); markAt = null; return; }
  const p = markAt.clone().project(camera);
  mark.style.transform = `translate(${((p.x + 1) / 2) * window.innerWidth}px, ${((1 - p.y) / 2) * window.innerHeight}px)`;
}

/** Fit the level's focus box between the top bar and the booster bar. */
function fitCamera() {
  const W = window.innerWidth, H = window.innerHeight;
  renderer.setSize(W, H);
  post.setSize();
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  if (!session) return;
  const box = session.focus();
  const center = box.getCenter(new THREE.Vector3());
  const dir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
  const corners: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const top = 1 - (2 * safe.top) / H, bottom = -1 + (2 * safe.bottom) / H, side = 1 - 24 / W;
  let target = center.clone();
  for (let iter = 0; iter < 4; iter++) {
    let lo = 4, hi = 120;
    const fits = (d: number) => {
      camera.position.copy(target).addScaledVector(dir, d); camera.lookAt(target); camera.updateMatrixWorld();
      let minY = Infinity, maxY = -Infinity, maxX = 0;
      for (const c of corners) { const p = c.clone().project(camera); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); maxX = Math.max(maxX, Math.abs(p.x)); }
      return { ok: maxY - minY <= top - bottom && maxX <= side, minY, maxY };
    };
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (fits(m).ok) hi = m; else lo = m; }
    const r = fits(hi);
    // Sit the lot right above the booster bar; spare height goes to the city skyline.
    const want = bottom, have = r.minY;
    if (Math.abs(want - have) < 0.004) break;
    const shift = (have - want) * hi * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.sin(PITCH);
    target = target.clone().add(new THREE.Vector3(0, 0, -shift));
  }
  camBase.copy(camera.position);
  camTarget.copy(target);
  // Keep the sun's shadow box around the playfield.
  sun.position.copy(target).add(sunOffset);
  sun.target.position.copy(target);
  flood.position.copy(center).add(new THREE.Vector3(0, 16, 6)); flood.target.position.copy(center);
  const ext = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.75 + 4;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 70 });
  sun.shadow.camera.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true;
}

// ───── Juice: floating texts and camera shake ─────
let shakeAmp = 0;
/** Until this time (ms) the 3D view keeps drawing behind an open menu (the win confetti). */
let liveUntil = 0;
const camBase = new THREE.Vector3(), camTarget = new THREE.Vector3();

/** Level opening: the camera swoops down from the skyline onto the lot. */
/**
 * Level start: the camera opens on the chapter's landmark over the rooftops, then sweeps down onto the
 * lot. The full reveal plays when a chapter's place is new this session; later levels get a short swoop.
 */
let lastPlace = '';
function swoopPose(k: number, startPos: THREE.Vector3, startLook: THREE.Vector3, endPos: THREE.Vector3, endLook: THREE.Vector3) {
  // Rise a little in the middle so the move arcs over the rooftops instead of cutting through them.
  camera.position.lerpVectors(startPos, endPos, k).add(new THREE.Vector3(0, Math.sin(k * Math.PI) * 3, 0));
  camera.lookAt(new THREE.Vector3().lerpVectors(startLook, endLook, k));
}
function landmarkShot() {
  const lm = session!.landmark, v = session!.landmarkView;
  if (v) return { startPos: v.from.clone(), startLook: v.look.clone() };
  // Far enough back to frame the whole landmark (taller ones need more room), looking a little below
  // its top so the street shows underneath.
  const d = Math.min(34, Math.max(16, (lm.y * 1.4 + 6) * 1.9)); // inside the fog's clear range
  const startLook = new THREE.Vector3(lm.x, lm.y * 0.6, lm.z);
  const startPos = new THREE.Vector3(lm.x * 0.7, lm.y * 0.55 + 4, lm.z + d);
  return { startPos, startLook };
}
function introSwoop() {
  if (!session) return;
  const endPos = camBase.clone(), endLook = camTarget.clone();
  const place = session.landmark.toArray().join();
  const full = place !== lastPlace;
  lastPlace = place;
  const { startPos, startLook } = full ? landmarkShot() : { startPos: endPos.clone().add(new THREE.Vector3(0, 6, 10)), startLook: new THREE.Vector3(0, 3, session.L.walkZ - 14) };
  if (debug.has('shot') || reduceMotion()) return;
  // Hold on the landmark for a beat, then sweep down.
  const hold = full ? 0.7 : 0;
  // A newer swoop (or a level change) takes the camera over; this one then stops steering it.
  const id = ++swoopId;
  swooping = true;
  void tween(hold + (full ? 2.0 : 1.5), (t) => {
    if (id !== swoopId) return;
    const k = full ? Math.max(0, (t * (hold + 2.0) - hold) / 2.0) : t;
    swoopPose(ease.inOut(k), startPos, startLook, endPos, endLook);
    camBase.copy(camera.position);
  }, ease.linear).then(() => {
    if (id !== swoopId) return;
    camera.position.copy(endPos); camera.lookAt(endLook); camBase.copy(endPos); swooping = false;
  });
}
/** Stop any level-start camera move (the level is changing under it). */
function cancelSwoop() { swoopId++; swooping = false; }
/** Floating texts still on screen, so two at one spot (cars leaving together) stack instead of printing over each other. */
const liveFloats: { el: HTMLElement; t: number }[] = [];
function floatText(text: string, at: THREE.Vector3, kind: 'coin' | 'combo' | 'bad') {
  const p = at.clone().project(camera);
  floatTextAt(text, kind, ((p.x + 1) / 2) * window.innerWidth, ((1 - p.y) / 2) * window.innerHeight);
}
/**
 * A floating text at a screen point, kept off the HUD and clear of the others still showing. Measured, not guessed:
 * a wide «افسانه‌ای!» overlapped a neighbour whose anchor was 140 px away. It steps up past the one it meets, or down
 * near the top of the board, so it never climbs under the counters.
 */
function floatTextAt(text: string, kind: 'coin' | 'combo' | 'bad', x: number, y: number) {
  const now = performance.now();
  for (let i = liveFloats.length - 1; i >= 0; i--) if (now - liveFloats[i].t > 1300 || !liveFloats[i].el.isConnected) liveFloats.splice(i, 1);
  const minY = (hud.root.querySelector('.people')?.getBoundingClientRect().bottom ?? 110) + 22;
  y = Math.max(y, minY);
  const el = h('div', 'float float-' + kind, kind === 'coin' ? `${emo('🧍', 'emo sm')}<b dir="ltr">${fa(text)}</b>` : `<b>${fa(text)}</b>`);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.append(el);
  const others = liveFloats.map((f) => f.el.getBoundingClientRect());
  const down = y < minY + 90;
  // Its own box from its layout size, centred on the point (the pop-in animation starts it at 60% scale).
  const w = el.offsetWidth, ht = el.offsetHeight;
  for (let k = 0; k < 5; k++) {
    const r = { left: x - w / 2, right: x + w / 2, top: y - ht / 2, bottom: y + ht / 2 };
    const hit = others.find((q) => r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom);
    if (!hit) break;
    y = down ? hit.bottom + ht / 2 + 4 : hit.top - ht / 2 - 4;
    el.style.top = `${y}px`;
  }
  liveFloats.push({ el, t: now });
  setTimeout(() => el.remove(), 1300);
}
function cameraFlash() {
  const f = h('div', 'flash');
  document.body.append(f);
  click(); setTimeout(() => click(), 70);
  setTimeout(() => f.remove(), 450);
}
/** Camera shake: two incommensurate sines per axis (smooth, like a real jolt) instead of per-frame random jitter. */
let shakeT = 0;
const shakeV = new THREE.Vector3();
function applyShake(dt: number) {
  if (shakeAmp > 0 && reduceMotion()) shakeAmp = 0.0001; // no camera shake: settle at once
  if (shakeAmp <= 0.001) { if (shakeAmp > 0) { camera.position.copy(camBase); shakeAmp = 0; } return; }
  shakeT += dt;
  const n = (a: number, b: number, c: number, d: number) => (Math.sin(shakeT * a + b) * 0.6 + Math.sin(shakeT * c + d) * 0.4) * 0.5 * shakeAmp;
  camera.position.copy(camBase).add(shakeV.set(n(53, 0, 97, 1.7), n(61, 2.1, 89, 0.4), n(47, 4.2, 83, 2.9)));
  shakeAmp *= Math.exp(-dt * 14);
}

// ───── Input ─────
const ray = new THREE.Raycaster();
let down: { x: number; y: number; i: number } | null = null;
/** The car under a tap: the car body the finger is on (as drawn), or the nearest one for a tap just beside it. */
function pick(x: number, y: number): number {
  if (!session) return -1;
  ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
  return session.pickRay(ray);
}
/** Last touch anywhere (the frame rate goes back to full the moment a finger lands). */
let lastTouch = 0;
window.addEventListener('pointerdown', () => { lastTouch = performance.now(); }, { capture: true, passive: true });
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!session || modalOpen) return;
  const i = pick(e.clientX, e.clientY);
  // Level 1's spotlight: only the suggested car answers.
  if (spot.classList.contains('show') && i !== hintFor) { nudgeHand(); return; }
  down = { x: e.clientX, y: e.clientY, i };
  if (i >= 0) session.press(i, true);
  // Held a moment (not a quick tap): show where this car would go (BEST_IN_MARKET_PLAN D4).
  clearTimeout(previewTimer);
  if (i >= 0 && !craneMode) previewTimer = setTimeout(() => { if (down?.i === i) session?.preview(i); }, PREVIEW_DELAY);
});
/** Hold-to-preview: how long a finger rests on a car before its route shows (quick taps never see it). */
const PREVIEW_DELAY = 150;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
const endPreview = () => { clearTimeout(previewTimer); session?.preview(-1); };
// Sliding off cancels the tap (see pointerup), so the route goes away as soon as the finger moves off.
renderer.domElement.addEventListener('pointermove', (e) => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 14) endPreview(); });
renderer.domElement.addEventListener('pointercancel', () => { endPreview(); if (down && down.i >= 0) session?.press(down.i, false); down = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  endPreview();
  if (!down || !session || modalOpen) return;
  const d = down; down = null;
  if (d.i >= 0) session.press(d.i, false);
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) return;
  const i = d.i >= 0 ? d.i : pick(e.clientX, e.clientY);
  if (i < 0) return;
  if (craneMode) {
    if (session.crane(i)) { if (hud.free.has('crane')) hud.free.delete('crane'); else save.boosters.crane--; helped = true; persist(); hud.refresh(); }
    craneMode = false; hud.active(null);
  } else session.tap(i);
  // An attempt at a Journey level counts from its first tap (levels are also built behind the home screen).
  if (session.taps === 1 && !rush && !event) { count(save.lvStats, current, 'attempt'); persist(); }
  hand.classList.remove('show'); hintFor = -1;
});

// ───── Level flow ─────
/** When taps pile up faster than cars can park and load, play the backlog a little faster to catch up. */
function catchUp() {
  const b = session?.backlog ?? 0;
  setSpeed(b > 6 ? 2.3 : b > 4 ? 1.8 : b > 2 ? 1.4 : 1);
}

function disposeSession() {
  if (!session) return;
  resetTraffic();
  removeInstanceRoot(session.group);
  scene.remove(session.group);
  // The world is kept for the next level of the same chapter; everything else of the session is freed.
  session.detach();
  session.group.remove(session.worldGroup);
  disposeTree(session.group);
  for (const o of session.retired) disposeTree(o);
  session = null;
}

/** The level being played (a replay when below save.level). */
let current = 0;
/** Playing today's «ساعت شلوغی» instead of a Journey level. */
let rush: Level | null = null;
/** A booster or a continue was used this level (it then doesn't count as a clean win). */
let helped = false;
/** A seasonal event level being played («شب یلدا» night or «نوروز» day), or null. */
type EventRun = { kind: 'yalda' | 'nowruz' | 'endless'; i: number };
let event: EventRun | null = null;

/** Which level, chapter look and world a start of (pick, custom, ev) means. */
function levelPlan(pick?: number, custom?: Level, ev: EventRun | null = null) {
  const n = Math.min(pick ?? save.level, levels.length - 1);
  const level = custom ?? levels[n];
  // Yalda nights are played at home in Tajrish, after dark. The rush hour rotates day by day through
  // the places the player has already unlocked (never spoiling a chapter they haven't reached).
  const unlocked = CHAPTERS.filter((c) => c.from <= save.level);
  // Endless Tehran is played in the places themselves, in turn (game/endless.ts), in each one's own world.
  const place = ev?.kind === 'endless' ? placeOf(ev.i) : null;
  const ch = place ?? (ev ? { ...CHAPTERS[0], light: ev.kind === 'yalda' ? 'night' as const : 'spring' as const, weather: ev.kind === 'yalda' ? 'snow' as const : 'petals' as const } : custom ? unlocked[Math.floor(Date.now() / 864e5) % unlocked.length] : chapterOf(n));
  const world: WorldOpts = { stop: ch.stop, night: ch.light === 'night' || ch.light === 'dusk', snow: ch.light === 'snow', weather: ch.weather, worldSeed: place ? 100 + place.n : ev ? 9000 + ev.i : custom ? 8000 + ch.n : 100 + ch.n, landmark: ch.landmark, autumn: ch.light === 'autumn', boulevard: ch.n === 2, yalda: ev?.kind === 'yalda', nowruz: ev?.kind === 'nowruz', skins: save.garage.restored, colorblind: save.settings.colorblind };
  return { n, level, ch, world, seed: world.worldSeed ?? n + 1 };
}

/** The vehicle kinds a level shows: its own, plus the plain sedans parked along the kerbs. */
function kindsFor(level: Level): Kind[] {
  return [...new Set<Kind>(['pride', 'peykan', 'p405', ...level.vehicles.map((v) => v.kind)])];
}

/** Run a step generator, letting a frame through whenever a slice has taken longer than `budget` ms. */
async function runSteps<T>(it: Generator<void, T>, budget: number | (() => number) = 14): Promise<T> {
  let t = performance.now();
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
    if (performance.now() - t > (typeof budget === 'number' ? budget : budget())) { await nextFrame(); t = performance.now(); }
  }
}

/**
 * Build the next level's world ahead of time, in thin slices, while a menu covers the 3D view (the win card), and
 * upload its textures one per frame. Going on then finds it ready and the change is a quick dip. A level start
 * that needs the same world while this is still running joins the same build at full speed.
 */
let prepBudget = 5;
function prepareAhead(pick?: number) {
  const p = levelPlan(pick);
  if (worldCached(p.level.w, p.level.h, p.seed, p.world)) return;
  prepBudget = 5;
  void (async () => {
    await runSteps(worldSteps(p.level.w, p.level.h, p.seed, p.world), () => prepBudget);
    for (const k of kindsFor(p.level)) { if (!modalBacks.length) break; warmFleet([k]); await nextFrame(); }
    for (const t of worldTextures(p.level.w, p.level.h, p.seed, p.world)) { if (!modalBacks.length) break; renderer.initTexture(t); await nextFrame(); }
  })();
}
/** Every open (or closing) menu card; a live list, so checking it each frame costs nothing. */
const modalBacks = document.getElementsByClassName('modal-back');
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/** The full-screen veil that covers level changes (a quick dip) and world builds (with a loading line). */
const veil = h('div', 'veil', '<div class="ld"><i></i><i></i><i></i></div>');
document.body.append(veil);
let veilBusy: Promise<void> = Promise.resolve();
function veilTo(on: boolean, loading = false): Promise<void> {
  veil.classList.toggle('loading', loading);
  veil.classList.toggle('on', on);
  return new Promise((r) => setTimeout(r, on ? 190 : 320));
}

/**
 * Change level smoothly: dip to the veil, build (a new chapter's world is built in slices with a loading line
 * showing), compile what's new, draw one frame underneath, then lift the veil. `under` runs just before the
 * veil lifts (e.g. to open the home screen over the new level).
 */
function goLevel(pick?: number, custom?: Level, swoop = true, ev: EventRun | null = null, under?: () => void | Promise<void>): Promise<void> {
  const run = async () => {
    const p = levelPlan(pick, custom, ev);
    const heavy = !worldCached(p.level.w, p.level.h, p.seed, p.world);
    modalOpen = true;
    await veilTo(true, heavy);
    try {
      prepBudget = 14; // a build already running ahead now goes at full speed
      if (heavy) await runSteps(worldSteps(p.level.w, p.level.h, p.seed, p.world));
      startLevel(pick, custom, false, ev);
      if (heavy) {
        syncInstances();
        await compiled();
        // The new chapter's music loop starts rendering now (off the main thread), not in the middle of play.
        void prepareMusic();
      }
      post.render(scene, camera);
      await under?.();
      if (swoop && !under) introSwoop();
    } finally {
      // Never leave the player behind the veil, whatever happened while building.
      await veilTo(false);
    }
  };
  veilBusy = veilBusy.then(run, run);
  return veilBusy;
}

function startLevel(pick?: number, custom?: Level, swoop = true, ev: EventRun | null = null) {
  cancelSwoop();
  disposeSession();
  rush = custom ?? null;
  event = ev;
  const plan = levelPlan(pick, custom, ev);
  current = plan.n;
  const n = current;
  const { level, ch } = plan;
  applyLight(ch.light);
  applyWeatherMood(ch.weather);
  // The place's own sounds under the music (traffic, sparrows, the bazaar's crowd, a far horn): I7.
  placeLight = ch.light; soundscape(placeLight);
  setMood(ch.light);
  craneMode = false;
  modalOpen = false;
  helped = false;
  rewoundAt = -1;
  session = new Session(level, {
    queueLeft: (q, total) => hud.setQueue(q, total),
    toast: (t) => hud.toast(t),
    canPlay: () => !modalOpen,
    // A result decided while the pause card is up replaces it (it was opened with cars still on the move).
    won: () => { pauseClose?.(); showWin(); },
    cheer: breathe,
    lost: (why) => { pauseClose?.(); showLose(why); },
    limits: (t, m) => hud.setLimits(t, m),
    float: floatText,
    parity: (p, left) => hud.setParity(p, left),
    officer: (a) => hud.setOfficer(a),
    flash: cameraFlash,
    shake: (a) => { shakeAmp = Math.max(shakeAmp, a); },
  }, n + 1, plan.world);
  scene.add(session.group);
  addInstanceRoot(session.group);
  // Journey bookkeeping: attempts per level, and the win streak's free helps on a new level.
  hud.free.clear();
  newLevelRun = !custom && !ev && n === save.level && n < levels.length;
  let streakNote = '';
  if (newLevelRun && save.streak > 0) {
    const got: string[] = [];
    for (const k of openHelps(save.streak)) {
      if (k === 'bay') { if (session.extraBay()) got.push(HELP_NAME.bay); }
      else { hud.free.add(k); got.push(HELP_NAME[k]); }
    }
    if (got.length) streakNote = `${fa(save.streak)} برد پشت‌سرهم: ${got.join(' و ')} مجانی!`;
  }
  renderer.shadowMap.needsUpdate = true;
  if (session.weather) session.weather.onThunder = () => sfx.thunder();
  if (ev?.kind === 'endless') hud.setLevel(levels.length + ev.i + 1, level.tag);
  else if (ev?.kind === 'yalda') hud.setEvent(`شب یلدا ${fa(ev.i + 1)}`, POM('hud'));
  else if (ev?.kind === 'nowruz') hud.setEvent(`نوروز، روز ${fa(ev.i + 1)}`, emo(HAFT_SIN[ev.i].icon, 'emo'));
  else if (custom) hud.setRush(); else hud.setLevel(n + 1, level.tag);
  // Notes at the start (first-levels tip, the streak's gift, the level's limit) wait until the player can see them.
  notes.length = 0; noteReadyAt = performance.now() + 700; banner.classList.remove('show');
  // A «سخت» level is an event: its call first, with what winning it pays on a level not yet beaten (showWin).
  if ((!custom || ev?.kind === 'endless') && level.tag === 'hard') queueNote(`<b>مرحله‌ی سخت!</b>${n >= save.level || ev?.kind === 'endless' ? `<small>${emo('🔑', 'emo xs')} یه سوئیچ و ${emo('🪙', 'emo xs')} سکه‌ی بیشتر</small>` : ''}`, 2200, false, true);
  if (!custom && n < TIPS.length) queueNote(TIPS[n], 5000);
  if (streakNote) queueNote(streakNote, 2600, true);
  // Bosses have both a clock and a tap budget: each gets its note.
  if (level.time) queueNote(`این مرحله ${fa(level.time)} ثانیه وقت داره! ساعت از اولین ضربه شروع می‌شه.`);
  if (level.moves) queueNote(`فقط ${fa(level.moves)} ضربه داری! ضربه‌ی اشتباه هم حساب می‌شه.`);
  if (!level.time && !level.moves && level.bays && level.bays < 5) queueNote(`این مرحله فقط ${fa(level.bays)} جای پارک داره!`);
  hud.refresh();
  hud.active(null);
  hud.show(true);
  fitCamera();
  if (swoop) introSwoop();
  if (custom) {
    // Event and daily levels may hold mechanics the player hasn't reached yet: explain the first one.
    const unseen = levelRules(level).find((k) => !save.seen[k]);
    if (unseen) { modalOpen = true; void showIntro(unseen).then(() => { save.seen[unseen] = true; persist(); modalOpen = false; pointAt(unseen); }); }
    return;
  }
  if (n === ch.from && n > 0 && !save.seen['ch' + ch.n]) {
    modalOpen = true;
    const c = h('div', 'newch');
    const blurb = { night: 'شب‌های میدان آزادی، چراغ‌ها روشن و ترافیک سنگین!', sunset: 'غروب ولیعصر، زیر چنارهای قدیمی. ترافیک داره سنگین‌تر می‌شه!', snow: 'برف اومده! همه دارن می‌رن توچال اسکی. پلیس راهور هم سر چهارراه وایستاده.', bazaar: 'بازار بزرگ تهران! گاری‌های میوه همه‌جا هستن و جای پارک پیدا نمی‌شه.', dusk: 'غروب، برج میلاد چراغاش روشن شده و همه از تونل نیایش می‌رن خونه. حواست باشه کدوم تونل به کجا می‌ره!', spring: 'بهار اومده! پل طبیعت پر از شکوفه‌ست و حاج‌خانم‌ها با کیسه‌های خرید عید منتظر ماشینن.', autumn: 'پاییز دربند! برگ‌های نارنجی، چای و قلیون کنار رودخونه… و ماشین‌های عروس که عجله دارن.', day: '' }[ch.light];
    c.innerHTML = `<div class="burst">${emo({ night: '🌙', sunset: '🌇', snow: '❄️', bazaar: '🕌', autumn: '🍁', spring: '🌸', dusk: '🗼', day: '🌄' }[ch.light], 'emo huge')}</div><small>فصل جدید باز شد!</small><h2>فصل ${fa(ch.n)}: ${ch.name}</h2><p>${blurb}</p>`;
    const close = modal(c, 'pop');
    c.append(asBack(button('بزن بریم!', 'primary big', () => { save.seen['ch' + ch.n] = true; persist(); close(); modalOpen = false; })));
  } else if (level.intro && !save.seen[level.intro]) {
    modalOpen = true;
    showIntro(level.intro).then(() => { save.seen[level.intro!] = true; persist(); modalOpen = false; pointAt(level.intro!); });
  } else if (level.tag === 'boss' && !save.seen['boss' + n]) {
    // Mr. Ajool walks in before his boss level.
    modalOpen = true;
    const c = h('div', 'boss-card');
    const line = BOSS_LINES[(ch.n - 1) % BOSS_LINES.length];
    c.innerHTML = `<div class="vs">مرحله‌ی رئیس</div>${AJOOL('big')}<h2>آقای عجول</h2><div class="speech bad">${line.taunt}</div>`;
    const close = modal(c, 'pop boss');
    afterVeil(() => { sfx.sting(true); duckMusic(1.2); });
    c.append(asBack(button('حالا می‌بینیم! 💪', 'primary big', () => { save.seen['boss' + n] = true; persist(); close(); modalOpen = false; })));
  } else if (helpOpening(n) && n === save.level && !save.seen['help-' + helpOpening(n)]) {
    // A help opens on this level (game/helps.ts): Mash Rahim shows it, then its button pulses.
    const id = helpOpening(n)!;
    modalOpen = true;
    void showHelpCard(id).then(() => { save.seen['help-' + id] = true; persist(); modalOpen = false; hud.refresh(); hud.bump(id); });
  }
}

/** What each help does, in Mash Rahim's words (the card on the level it opens). */
const HELP_INTRO: Record<BoosterId, string> = {
  bay: 'وقتی جاهای ایستگاه داره پر می‌شه، «جای پارک» یه جای اضافه کنارشون باز می‌کنه. بذارش برای وقتی که گیر افتادی!',
  crane: '«جرثقیل» هر ماشینی رو بلند می‌کنه و می‌ذاره تو ایستگاه، حتی اگه راهش بسته باشه. اول جرثقیل رو بزن، بعد ماشین رو.',
  whistle: '«سوت پلیس» مسافرهای جلوی صف رو جوری جابه‌جا می‌کنه که ماشین‌هایی که تو ایستگاه منتظرن زودتر پر بشن.',
};
function showHelpCard(id: BoosterId): Promise<void> {
  const def = BOOSTERS.find((b) => b.id === id)!, have = save.boosters[id];
  return new Promise((done) => {
    const c = h('div', 'intro help-intro');
    c.innerHTML = `<div class="new">کمک تازه!</div><div class="burst"><span class="help-tile">${icon(def.icon)}</span></div><h2>${def.name}</h2>
      <div class="speech with-face">${RAHIM('sm')}<div><span class="who">مش‌رحیم:</span> ${HELP_INTRO[id]}</div></div>
      ${have > 0 ? `<p class="have">${fa(have)} تا داری؛ زیر صفحه پیداش می‌کنی.</p>` : ''}`;
    const close = modal(c, 'pop');
    c.append(asBack(button('فهمیدم!', 'primary big', () => { close(); done(); })));
  });
}

function useBooster(id: BoosterId) {
  if (!session || modalOpen) return;
  const def = BOOSTERS.find((b) => b.id === id)!;
  if (!helpOpen(id, save.level)) { hud.toast(`${def.name} از مرحله‌ی ${fa(HELP_FROM[id])} باز می‌شه`); return; }
  // All six bays open: say so before any coins or an offer, not after.
  if (id === 'bay' && session.s.bays.length >= MAX_BAYS && session.s.over !== 'lost') { hud.toast('همه‌ی جاهای پارک بازه!'); return; }
  const free = hud.free.has(id);
  if (!free && save.boosters[id] <= 0) {
    if (save.coins < def.price) { offerHelp(id); return; }
    save.coins -= def.price; save.boosters[id]++; persist(); hud.refresh(); coin();
  }
  if (id === 'crane') {
    craneMode = !craneMode;
    hud.active(craneMode ? 'crane' : null);
    if (craneMode) hud.toast(def.hint, 2200);
    return;
  }
  const ok = id === 'bay' ? session.extraBay() : session.whistle();
  if (!ok) { hud.toast(id === 'bay' ? 'همه‌ی جاهای پارک بازه!' : 'یه لحظه صبر کن…'); return; }
  if (free) hud.free.delete(id); else save.boosters[id]--;
  helped = true; persist(); hud.refresh(); hud.bump(id); haptic('medium');
}

/**
 * A help the player has none of and can't afford: not a dead end («سکه کافی نداری!» alone, just when the hint may have
 * pointed at it): one for a video, the shop, or not now (BEST_IN_MARKET_PLAN H10).
 */
function offerHelp(id: BoosterId) {
  const def = BOOSTERS.find((b) => b.id === id)!;
  modalOpen = true;
  const c = h('div', 'help-offer');
  c.innerHTML = `<div class="burst"><span class="help-tile">${icon(def.icon)}</span></div><h2>${def.name}</h2>
    <p>${fa(def.price)} سکه می‌خواد و ${fa(save.coins)} سکه داری.</p>`;
  const close = modal(c, 'pop');
  const back = () => { close(); modalOpen = false; };
  if (rewardedAvailable()) {
    const ad = button(`${emo('🎬', 'emo sm')} با دیدن تبلیغ یکی بگیر`, 'gold big', async () => {
      ad.setAttribute('disabled', '');
      if (await showRewarded()) { save.boosters[id]++; persist(); hud.refresh(); back(); useBooster(id); }
      else ad.removeAttribute('disabled');
    });
    c.append(ad);
  }
  c.append(button(`${icon('coin')} دکه`, rewardedAvailable() ? 'primary' : 'primary big', () => { close(); showShop(() => { modalOpen = false; }, () => hud.refresh()); }));
  c.append(asBack(button('بی‌خیال', 'ghost', back)));
}

const HELP_NAME: Record<Help, string> = { bay: 'جای پارک', crane: 'جرثقیل', whistle: 'سوت پلیس' };
/** The streak's free helps as words: «جای پارک و جرثقیل». */
/** The streak's free helps, only those open at the player's progress (game/helps.ts). */
const openHelps = (n: number) => streakHelps(n).filter((k) => helpOpen(k, save.level));
const helpsText = (n: number) => openHelps(n).map((k) => HELP_NAME[k]).join(' و ');
/** Whether the level being played is the next new Journey level (the one the streak is riding on). */
let newLevelRun = false;
/**
 * Giving up a level that has been played (restart, home): it ends the streak, so with a streak at stake ask
 * first. Resolves true to go ahead.
 */
/**
 * Leaving a level in play (pause → restart, home or another level), once a move is made. On a Journey level that
 * costs lives (13 on) it costs one, as starting over from the lose card does, or quitting would dodge it; a new
 * level's win streak burns too. Asks first, saying what goes; staying is the default (and back).
 */
function giveUp(): Promise<boolean> {
  const playing = !!session && session.taps > 0 && !session.s.over;
  const life = playing && !rush && current >= FREE_LEVELS;
  const streak = playing && newLevelRun && save.streak > 0;
  if (!life && !streak) return Promise.resolve(true);
  return new Promise((done) => {
    modalOpen = true;
    const c = h('div', 'confirm');
    const what = life && streak ? `یه جون و ${fa(save.streak)} برد پشت‌سرهمت از دست می‌ره.` : life ? 'یه جون از دست می‌ره، مثل وقتی که می‌بازی.'
      : `${fa(save.streak)} برد پشت‌سرهم داری. اگه این مرحله رو ول کنی، از صفر شروع می‌شه.`;
    c.innerHTML = `<div class="burst">${emo(life ? '💔' : '🔥', 'emo huge')}</div><h2>${life ? 'ول می‌کنی؟' : 'پشت‌سرهمت می‌سوزه!'}</h2><p>${what}</p>`;
    const close = modal(c, 'pop');
    c.append(asBack(button('ادامه می‌دم', 'primary big', () => { close(); done(false); })));
    c.append(button(life ? `ول کن <small class="life-cost">${emo('💔', 'emo xs')} یه جون</small>` : 'ول کن', 'ghost', () => {
      close();
      if (streak) save.streak = nextStreak(save.streak, 'gaveUp', true);
      if (life) loseLife();
      persist(); done(true);
    }));
  });
}

function reward(n: number) {
  return 20 + Math.min(40, n * 2) + (levels[n]?.tag ? 40 : 0);
}

/** A level played, counted towards today's missions (P4); the ones it completed, for the win card. */
function countMissions(p: Played): Mission[] {
  if (save.level < MISSIONS_FROM) return [];
  const done = countPlayed(todayMissions(save, today()), p);
  persist();
  return done;
}
const missionNotes = (done: Mission[]) => done.map((m) => `<div class="piggy-note mission-note">${emo('📻', 'emo xs')} مأموریت انجام شد: ${missionText(m, fa)}</div>`).join('');

/** Counts a win towards the achievements; returns a banner for any medal just earned. */
function recordWin(boss: boolean) {
  const st = save.stats;
  st.wins++;
  if (session) { st.people += session.s.queue.length; st.bestCombo = Math.max(st.bestCombo, session.bestCombo); }
  if (!helped) st.clean++;
  if (boss) st.bosses++;
  st.bestRush = Math.max(st.bestRush, save.rush.streak);
  const got = newlyReached();
  return got.length ? `<div class="newach">${emo('🏅', 'emo sm')} افتخار جدید: <b>${got.map((a) => a.name).join('، ')}</b><small>جایزه‌ش تو صفحه‌ی افتخارات منتظرته</small></div>` : '';
}

/** The win beat: the camera drifts back a little along its view while the confetti falls. */
function breathe() {
  duckMusic(2.2);
  if (reduceMotion()) return;
  const from = camBase.clone(), back = camBase.clone().sub(camTarget).multiplyScalar(0.08);
  void tween(1.6, (k) => { camBase.copy(from).addScaledVector(back, k); }, ease.out);
}

/**
 * A card's coin reward: the number counts up and coins fly into a wallet shown over the card, which ticks up
 * as they land. `more` pays again (the doubled reward); `close` removes the wallet with the card.
 */
function payout(c: HTMLElement, coins: number, before: number) {
  const b = c.querySelector('.reward b') as HTMLElement;
  b.textContent = '+۰';
  const wallet = floatingWallet(hud.wallet, faNum(before));
  let shown = before, owed = 0;
  const pay = (amount: number, delay: number) => {
    const from = owed, base = shown;
    owed += amount; shown += amount;
    const n = Math.min(10, 4 + Math.round(amount / 30));
    setTimeout(() => {
      void countUp(b, from, from + amount, 650, (v) => `+${faNum(v)}`);
      let landed = 0; // coins can land out of order: count them
      void flyCoins(b, wallet.el, n, () => { landed++; wallet.set(faNum(base + Math.round((amount * landed) / n))); });
    }, delay);
  };
  pay(coins, 420);
  return { more: (amount: number) => pay(amount, 0), close: () => wallet.remove() };
}

/** Play endless level `i` (0-based; level 241 is 0). One that couldn't be made is skipped. */
async function playEndless(i: number) {
  let lvl = await endlessLevel(i);
  for (let k = 1; !lvl && k < 4; k++) { i++; save.endless = i; lvl = await endlessLevel(i); }
  if (!lvl) { note('مرحله‌ی بعد آماده نشد؛ کمی بعد دوباره امتحان کن.'); showHome(); return; }
  void goLevel(undefined, lvl, true, { kind: 'endless', i });
}

/**
 * An endless level won: what a Journey level pays (coins, and a key and stars when it was «سخت»), the metro-card punch
 * and the piggy, a chest every five; then the next one, already being prepared while this card shows (C10).
 */
function showEndlessWin(i: number) {
  const lvl = rush, hard = lvl?.tag === 'hard', n = levels.length + i;
  const coins = 60 + (hard ? 40 : 0) + (session?.bonus ?? 0);
  const keys = hard ? 1 : 0, stars = starsFor(lvl?.tag);
  if (keys) addKeys(keys);
  if (stars) addStars(stars);
  const piggy = fillPiggy(n), station = punch();
  // Counted before the medals are looked at, so «جاده‌ی بی‌پایان» shows on the win that reaches it.
  save.endless = Math.max(save.endless, i + 1);
  const ach = recordWin(hard);
  const missionsDone = countMissions({ won: true, clean: !helped, hard, people: session?.s.q ?? 0, combo: session?.bestCombo ?? 0 });
  const before = save.coins;
  save.coins += coins;
  persist();
  modalOpen = true; hud.show(false); hud.refresh();
  void endlessLevel(i + 1);
  const c = h('div', 'result win');
  const rewards = `<div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div>`
    + (stars ? `<div class="reward starr">${emo('⭐')}<b dir="ltr">+${fa(stars)}</b><small>ستاره</small></div>` : '')
    + (keys ? `<div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(keys)}</b><small>سوئیچ</small></div>` : '');
  const toChest = 5 - ((i + 1) % 5 || 5), pips = Array.from({ length: 5 }, (_, k) => `<i class="${k < 5 - toChest ? 'on' : ''}"></i>`).join('');
  const notes = (toChest ? `<div class="chest-note">${emo('🎁', 'emo xs')}<span class="pips">${pips}</span><span>صندوق جایزه: <b>${fa(toChest)}</b> مرحله‌ی دیگه</span></div>`
    : `<div class="chest-note ready">${emo('🎁', 'emo xs')}<span class="pips">${pips}</span><span>صندوق جایزه آماده‌ست!</span></div>`)
    + (station ? `<div class="piggy-note">${emo('🚇', 'emo xs')} رسیدی به ایستگاه بعدی کارت بلیت!</div>` : '')
    + (piggy ? `<div class="piggy-note">${emo('🏺', 'emo xs')} ${fa(piggy)} سکه رفت تو قلکت</div>` : '') + missionNotes(missionsDone);
  c.innerHTML = `<div class="burst">${emo('🏆', 'emo huge')}</div><h2>آفرین!</h2><p>تهران بی‌پایان، مرحله‌ی ${fa(n + 1)} · ${placeOf(i).name}</p>
    <div class="rewards">${rewards}</div>${notes}${ach}`;
  const close = modal(c, 'pop');
  const pay = payout(c, coins, before);
  setTimeout(() => { if (modalBacks.length) prepareAhead(); }, 1500);
  const next = async (home = false) => {
    pay.close(); close(); modalOpen = true;
    if ((i + 1) % 5 === 0) await showChest(() => hud.refresh());
    await maybeInterstitial(n);
    if (home) goHome(); else await playEndless(i + 1);
  };
  c.append(button(`مرحله‌ی بعد ${fa(n + 2)}`, 'primary big', () => { void next(); }));
  const row = h('div', 'win-row');
  row.append(asBack(button(`${icon('home')} <span class="lbl">خونه</span>`, 'ghost home-link', () => { void next(true); })));
  if (hard && lvl) {
    row.append(shareButton({ level: lvl, title: `تهران بی‌پایان، مرحله‌ی ${fa(n + 1)}`, badge: 'سخت', brag: session?.taps ? `با ${fa(session.taps)} حرکت ردش کردم!` : 'ردش کردم!' }));
    row.classList.add('with-share');
  }
  c.append(row);
}

function showRushWin() {
  const streak = save.rush.day === new Date(Date.now() - 864e5).toISOString().slice(0, 10) ? save.rush.streak + 1 : 1;
  save.rush = { day: today(), streak };
  const coins = 250 + Math.min(6, streak - 1) * 50;
  const before = save.coins;
  save.coins += coins; addKeys(1); const ach = recordWin(false); persist();
  const missionsDone = countMissions({ won: true, rush: true, hard: true, clean: !helped, people: session?.s.q ?? 0, combo: session?.bestCombo ?? 0 });
  modalOpen = true; hud.show(false); hud.refresh();
  const c = h('div', 'result win');
  c.innerHTML = `<div class="burst">${emo('⏰', 'emo huge')}</div><h2>ساعت شلوغی رو رد کردی!</h2><p>${fa(streak)} روز پشت سر هم! فردا یه ترافیک تازه منتظرته.</p>
    <div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div><div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(1)}</b></div>${missionNotes(missionsDone)}${ach}`;
  const close = modal(c, 'pop');
  const pay = payout(c, coins, before);
  setTimeout(() => { if (modalBacks.length) prepareAhead(); }, 1500);
  const row = h('div', 'win-row');
  row.append(asBack(button('برگرد به خونه', 'primary big', () => { pay.close(); close(); void goLevel(undefined, undefined, false, null, showHome); })));
  if (rush) row.append(shareButton({ level: rush, title: 'چالش ساعت شلوغی', brag: streak > 1 ? `${fa(streak)} روز پشت سر هم ردش کردم!` : 'ساعت شلوغی امروز رو رد کردم!' }));
  c.append(row);
}

function showWin() {
  if (event?.kind === 'endless') { showEndlessWin(event.i); return; }
  if (event) {
    recordWin(false);
    countMissions({ won: true, clean: !helped, people: session?.s.q ?? 0, combo: session?.bestCombo ?? 0 });
    modalOpen = true; hud.show(false); hud.refresh();
    const back = () => { hud.refresh(); void goLevel(undefined, undefined, false, null, showHome); };
    setTimeout(() => { if (modalBacks.length) prepareAhead(); }, 1500);
    if (event.kind === 'yalda') showYaldaWin(event.i, back); else showNowruzWin(event.i, back);
    return;
  }
  if (rush) { showRushWin(); return; }
  const n = current;
  const replay = n < save.level;
  // Won without any help: marked in the level list. A level won before only with help, now won clean on a replay,
  // is a goal reached, and pays a little more (the level list's gold dots are the reason to replay).
  const cleanNow = !helped && !save.cleanLv[String(n + 1)];
  if (!helped) save.cleanLv[String(n + 1)] = 1;
  const masteryBonus = replay && cleanNow ? 30 : 0;
  // Replays pay a little; keys and progress only come from new levels.
  const coins = replay ? 10 + masteryBonus : reward(n) + (session?.bonus ?? 0);
  const lvl = levels[n];
  const keys = replay ? 0 : (lvl?.tag ? 1 : 0) + (n + 1 === chapterOf(n).to ? 2 : 0);
  if (keys) addKeys(keys);
  const piggy = replay ? 0 : fillPiggy(n);
  const station = !replay && punch();
  const stars = replay ? 0 : starsFor(lvl?.tag);
  count(save.lvStats, n, 'win');
  save.streak = nextStreak(save.streak, 'won', !replay);
  if (stars) addStars(stars);
  const ach = recordWin(!replay && !!lvl?.tag);
  const missionsDone = countMissions({ won: true, clean: !helped, hard: !!lvl?.tag, people: session?.s.q ?? 0, combo: session?.bestCombo ?? 0, dot: replay && cleanNow });
  const before = save.coins;
  save.coins += coins;
  if (!replay) save.level = Math.min(save.level + 1, levels.length);
  persist();
  modalOpen = true;
  hud.show(false);
  hud.refresh();
  liveUntil = performance.now() + 2800;
  // While the card is up (after the confetti), build the next level's world.
  setTimeout(() => { if (modalBacks.length) prepareAhead(); }, 2900);
  const c = h('div', 'result win jw');
  // Rewards in one row, then the notes (pass, money box), then Mr. Ajool and any new medal.
  const rewards = `<div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div>`
    + (stars ? `<div class="reward starr">${emo('⭐')}<b dir="ltr">+${fa(stars)}</b><small>ستاره</small></div>` : '')
    + (keys ? `<div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(keys)}</b><small>سوئیچ</small></div>` : '');
  // The next chest (one every five new levels): a reason for one more level.
  const toChest = 5 - ((n + 1) % 5 || 5), pips = Array.from({ length: 5 }, (_, k) => `<i class="${k < 5 - toChest ? 'on' : ''}"></i>`).join('');
  const chestLine = replay ? '' : toChest ? `<div class="chest-note">${emo('🎁', 'emo xs')}<span class="pips">${pips}</span><span>صندوق جایزه: <b>${fa(toChest)}</b> مرحله‌ی دیگه</span></div>`
    : `<div class="chest-note ready">${emo('🎁', 'emo xs')}<span class="pips">${pips}</span><span>صندوق جایزه آماده‌ست!</span></div>`;
  const notes = chestLine + (masteryBonus ? `<div class="piggy-note clean-note"><i class="dot"></i> این بار بدون هیچ کمکی! <b dir="ltr">+${fa(masteryBonus)}</b> ${emo('🪙', 'emo xs')}</div>` : '')
    + (station ? `<div class="piggy-note">${emo('🚇', 'emo xs')} رسیدی به ایستگاه بعدی کارت بلیت!</div>` : '')
    + (piggy ? `<div class="piggy-note">${emo('🏺', 'emo xs')} ${fa(piggy)} سکه رفت تو قلکت</div>` : '') + missionNotes(missionsDone);
  const streakLine = !replay && save.streak > 0 ? `<div class="streak-note">${emo('🔥', 'emo xs')} <b>${fa(save.streak)}</b> برد پشت‌سرهم${helpsText(save.streak) ? `<small>مرحله‌ی بعد: ${helpsText(save.streak)} مجانی</small>` : ''}</div>` : '';
  const beaten = lvl?.tag === 'boss' && !replay ? `<div class="beaten">${AJOOL('sm')}<div><b>آقای عجول:</b> ${BOSS_LINES[(chapterOf(n).n - 1) % BOSS_LINES.length].beaten}</div></div>` : '';
  c.innerHTML = `<div class="burst">${emo('🏆', 'emo huge')}</div><h2>آفرین!</h2><p>همه‌ی مسافرها سوار شدن و ترافیک باز شد.</p>
    <div class="rewards">${rewards}</div>${streakLine}${notes}${beaten}${ach}`;
  const close = modal(c, 'pop');
  const pay = payout(c, coins, before);
  const next = async (home = false) => {
    pay.close(); close(); modalOpen = true;
    let carded = false;
    if (!replay && (n + 1) % 5 === 0) { carded = true; await showChest(() => hud.refresh()); }
    // One card at a time after a win (scripts/journey.cjs): the rating ask after level 7 and the reminders ask after 13
    // (the first level that cost a life) are the only cards there; 8→9 has the crane, 10→11 the chest and the broken car.
    if ((n + 1 === 7 || n + 1 === 24) && !save.rated) { carded = true; await askRating(); }
    if (n + 1 === FREE_LEVELS + 1 && !save.notifyAsked && Capacitor.isNativePlatform()) { carded = true; await askReminders(); }
    // The starter pack, offered once, on the first win from level 18 with no other card (O2).
    if (!replay && !carded && n + 1 >= 18) await maybeStarterOffer();
    await maybeInterstitial(n);
    if (home) goHome(); else await goLevel();
  };
  // Next level is the big button; doubling and home share a row under it (the card must fit a 640-tall phone).
  const row = h('div', 'win-row');
  if (rewardedAvailable()) {
    const dbl = button(`${emo('🎬', 'emo sm')} دو برابرش کن!`, 'gold', async () => {
      dbl.setAttribute('disabled', '');
      if (await showRewarded()) {
        save.coins += coins; persist(); hud.refresh();
        pay.more(coins);
        dbl.remove();
      } else dbl.removeAttribute('disabled');
    });
    row.append(dbl);
  }
  // After the last level there is no next one: home, where the finish is marked (showHome).
  c.append(button(save.level >= levels.length ? 'همه‌ی مرحله‌ها رو بردی! 🎉' : `مرحله‌ی بعد ${fa(save.level + 1)}`, 'primary big', () => { void next(save.level >= levels.length); }));
  // Home: spend the stars and keys (agency, garage) before going on.
  row.append(asBack(button(`${icon('home')} <span class="lbl">خونه</span>`, 'ghost home-link', () => { void next(true); })));
  // Hard levels and chapter ends are worth showing off: the puzzle goes to friends as a picture (ui/sharecard.ts).
  if (!replay && lvl && (lvl.tag || n + 1 === chapterOf(n).to)) {
    const taps = session?.taps ?? 0;
    row.append(shareButton({ level: lvl, title: `مرحله‌ی ${fa(n + 1)} · ${chapterOf(n).name}`, badge: lvl.tag ? 'سخت' : undefined, brag: taps ? `با ${fa(taps)} حرکت ردش کردم!` : 'ردش کردم!' }));
    row.classList.add('with-share');
  }
  c.append(row);
}

/** A small share button for a win card: sends the level as a picture with the Bazaar link. */
function shareButton(info: ShareWin): HTMLElement {
  const b = button(icon('share'), 'ghost share', async () => {
    if (b.hasAttribute('disabled')) return;
    b.setAttribute('disabled', '');
    const r = await shareWin(info);
    b.removeAttribute('disabled');
    if (r === 'saved') note('عکسش ذخیره شد'); else if (r === 'failed') note('فرستادن نشد');
  });
  b.setAttribute('aria-label', 'فرستادن برای دوستات');
  return b;
}

/** Ask happy players (right after a win) to rate the game on Bazaar; unhappy ones are not sent there. */
function askRating(): Promise<void> {
  return new Promise((done) => {
    const c = h('div', 'rate');
    c.innerHTML = `<div class="burst">${emo('😍', 'emo huge')}</div><h2>از راه‌بندون خوشت میاد؟</h2><p>با پنج ستاره تو بازار کمکمون کن تا مرحله‌های بیشتری بسازیم!</p>`;
    const close = modal(c, 'pop');
    c.append(button(`${emo('⭐', 'emo sm')} آره، پنج ستاره!`, 'gold big', () => { save.rated = true; persist(); rateApp(); close(); done(); }));
    c.append(asBack(button('بعداً', 'ghost', () => { close(); done(); })));
  });
}

/** Ask once whether reminders are welcome (lives full, the daily rush hour), saying what they are first. */
function askReminders(): Promise<void> {
  return new Promise((done) => {
    save.notifyAsked = true; persist();
    const c = h('div', 'rate');
    c.innerHTML = `<div class="burst">${emo('🔔', 'emo huge')}</div><h2>خبرت کنیم؟</h2><p>وقتی جون‌هات پر شد، یا چالش ساعت شلوغی رسید، یه خبر کوچیک می‌دیم. شب‌ها نه، و هر وقت بخوای از تنظیمات خاموشش کن.</p>`;
    const close = modal(c, 'pop');
    c.append(button(`${emo('🔔', 'emo sm')} آره، خبرم کن`, 'primary big', async () => { save.settings.notify = await askNotifications(); persist(); close(); done(); }));
    c.append(asBack(button('نه، ممنون', 'ghost', () => { close(); done(); })));
  });
}

/**
 * Back to before the losing move (C13): the same level from the start, the player's taps up to the mistake replayed
 * behind the veil at speed and in silence, and play goes on from the last position that could still be won.
 */
function rewindTo(plan: { bays: number; taps: number[] }, move: number) {
  void goLevel(current, rush ?? undefined, false, event, async () => {
    const s = session!;
    const sound = save.settings.sound, buzz = save.settings.haptics;
    save.settings.sound = false; save.settings.haptics = false;
    try {
      while (s.s.bays.length < plan.bays && s.extraBay()) { /* the bays it began with (a win streak's free one) */ }
      setSpeed(12);
      for (const i of plan.taps) { s.tap(i); for (let f = 0; f < 4; f++) tick(1 / 30); }
      for (let f = 0; f < 1800 && (s.backlog > 0 || busy()); f++) { tick(1 / 30); if (f % 60 === 59) await nextFrame(); }
    } finally {
      setSpeed(1);
      save.settings.sound = sound; save.settings.haptics = buzz;
    }
    // Words from the replayed moves (combos and the like) are not for now.
    document.querySelectorAll('.float').forEach((e) => e.remove());
    helped = true;
    hud.refresh();
    post.render(scene, camera);
    // The level's opening notes were read the first time round: only where play goes on.
    notes.length = 0;
    rewoundAt = s.taps;
    queueNote(`برگشتی به قبل از حرکت ${fa(move)}؛ از اینجا هنوز می‌شه برد!`, 3200);
  });
}

function showLose(limit?: 'time' | 'moves') {
  // The ramp (levels 1–8, game/helps.ts MERCY_LEVELS): a level that would be lost on full bays gets Mash Rahim's extra
  // bay instead, so the first lose card comes at level 9 (GDD §9). The cover mechanic's first level (7) otherwise lost
  // 36–45% of simulated players (scripts/difficulty.ts). Clock and tap-budget losses stay real.
  if (!limit && !rush && !event && current < MERCY_LEVELS && session?.extraBay()) {
    helped = true; hud.refresh();
    hud.toast('مش‌رحیم یه جای پارک دیگه برات باز کرد!', 2800); haptic('medium');
    return;
  }
  duckMusic(1.6);
  hud.clearToast(); // the in-level advice (e.g. «آخرین جای پارک!») is over
  save.stats.losses++;
  if (!rush && !event) count(save.lvStats, current, 'loss');
  countMissions({ won: false, people: session?.s.q ?? 0, combo: session?.bestCombo ?? 0 });
  persist();
  modalOpen = true;
  const c = h('div', 'result lose');
  const price = 300;
  const COLOR_FA: Record<string, string> = { red: 'قرمز', yellow: 'زرد', blue: 'آبی', green: 'سبز', purple: 'بنفش', orange: 'نارنجی', white: 'سفید', pink: 'صورتی', silver: 'نقره‌ای', black: 'مشکی' };
  const KIND_FA: Record<Kind, string> = { pride: 'پراید', peykan: 'پیکان', p405: 'پژو ۴۰۵', samand: 'سمند', zamyad: 'وانت زامیاد', bus: 'اتوبوس', bike: 'پیک موتوری' };
  const want = session ? session.s.queue[session.s.q] : undefined;
  // Bays still free means the loss came from a wedding car missing its deadline.
  const bride = !limit && session && !session.isFull() ? session.lastLate : -1;
  const culprit = bride >= 0 ? bride : session ? session.culprit() : -1;
  if (culprit >= 0) session!.highlight(culprit);
  const why = limit === 'time' ? 'وقت تموم شد و هنوز ماشین‌ها تو پارکینگ موندن! سریع‌تر تصمیم بگیر.' : limit === 'moves' ? 'ضربه‌هات تموم شد! ضربه روی ماشین گیر کرده هم حساب می‌شه، پس قبل از زدن خوب نگاه کن.' : bride >= 0 ? 'ماشین عروس به موقع راه نیفتاد و عروس دیر رسید! دفعه‌ی بعد اول راهش رو باز کن.' : want && culprit >= 0 ? `مسافر جلوی صف ماشین <b>${COLOR_FA[want]}</b> می‌خواست، ولی هنوز تو پارکینگ گیر کرده بود.` : 'همه‌ی جاهای پارک پر شد و مسافر جلوی صف ماشینش رو نداره.';
  // A fair continue (GDD §6, BEST_IN_MARKET_PLAN C9): at a loss on full bays one more bay still wins only about a
  // third of the time (scripts/continueodds.ts), so the solver is asked first. Hopeless: no paid continue, said so.
  const bayCase = !limit && bride < 0 && !!session && session.s.bays.length < 6;
  const hopeless = bayCase && session!.continueKnown === false;
  const canBay = !!session && (!!limit || (session.s.bays.length < 6 && !hopeless) || bride >= 0);
  const HOPELESS = 'حتی با یه جای پارک دیگه هم راهی نمی‌مونه؛ این یکی رو باید از اول بری.';
  const STILL = 'با یه جای پارک دیگه هنوز می‌شه برد!';
  // Only mention continuing when the card offers it.
  const riskWhy = (offer: boolean) => (offer ? 'ادامه بدی، می‌مونه؛ از اول، می‌سوزه.' : 'از اول شروع کنی، از صفر می‌شمره.');
  const risk = newLevelRun && save.streak > 0 ? `<div class="streak-note risk">${emo('🔥', 'emo xs')} <b>${fa(save.streak)}</b> برد پشت‌سرهمت در خطره<small>${riskWhy(canBay)}</small></div>` : '';
  c.innerHTML = `<div class="burst">${emo(limit === 'time' ? '⏰' : limit === 'moves' ? '👆' : bride >= 0 ? '💔' : '🚧', 'emo huge')}</div><h2>${limit === 'time' ? 'وقت تموم شد!' : limit === 'moves' ? 'ضربه‌هات تموم شد!' : bride >= 0 ? 'عروسی به هم خورد!' : 'راه‌بندون شد!'}</h2><p>${why}</p>${risk}`;
  const close = modal(c, 'pop');
  // Which tap lost it (C12): the solver looks back over the level in the worker; the line appears when it knows,
  // usually as the card opens. Most losses are decided several moves before the bays fill, out of the player's sight.
  // When even one more bay can't win, going back to before that tap becomes the paid continue (C13).
  let rewind: { plan: { bays: number; taps: number[] }; move: number } | null = null;
  // Hopeless: no continue on offer (all six bays open), or, below, the solver says one more bay can't win.
  let hopelessNow = !limit && bride < 0 && !canBay;
  if (!limit && session) {
    const played = session;
    void played.review().then((r) => {
      if (!r || !c.isConnected || session !== played) return;
      const v = played.level.vehicles[r.car];
      const car = r.covered ? 'ماشین زیر چادر' : `${KIND_FA[v.kind]} ${COLOR_FA[v.color] ?? ''}`.trim();
      c.querySelector('p')!.after(h('div', 'review-note', `${emo('🔍', 'emo xs')}<span>بدون کمک، از حرکت <b>${fa(r.move)}</b> به بعد دیگه راهی نبود: <b>${car}</b>.</span>`));
      const plan = played.rewindPlan(r.k);
      if (plan) { rewind = { plan, move: r.move }; offerRewind(); }
    });
  }
  const resume = () => { close(); modalOpen = false; helped = true; if (limit) session!.extend(); else session!.extraBay(); };
  const verdictNote = (text: string, cls: string) => { const n = h('div', 'continue-note ' + cls, text); (offer[0] ?? restartRow).before(n); return n; };
  const offer: HTMLElement[] = [];
  if (canBay) {
    offer.push(button(`${emo(limit === 'time' ? '⏱️' : limit === 'moves' ? '👆' : bride >= 0 ? '💐' : '🅿️', 'emo sm')} ${limit === 'time' ? '۱۵ ثانیه وقت بیشتر' : limit === 'moves' ? '۴ ضربه‌ی بیشتر' : bride >= 0 ? 'ادامه بده' : 'یه جای پارک دیگه'}، ${emo('🪙', 'emo sm')} ${fa(price)}`, 'gold big', () => {
      if (save.coins < price) { hud.toast('سکه کافی نداری!'); showShop(() => {}, () => hud.refresh()); return; }
      save.coins -= price; persist(); hud.refresh();
      resume();
    }));
    if (rewardedAvailable()) {
      const ad = button(`${emo('🎬', 'emo sm')} با دیدن تبلیغ ادامه بده`, 'primary', async () => {
        ad.setAttribute('disabled', '');
        if (await showRewarded()) resume(); else ad.removeAttribute('disabled');
      });
      offer.push(ad);
    }
    c.append(...offer);
  }
  // Starting over costs a life on a Journey level (below); the button says so, so continuing is a real choice.
  const costsLife = !rush && current >= FREE_LEVELS;
  const restartAt = button(costsLife ? `از اول <small class="life-cost">${emo('💔', 'emo xs')} یه جون</small>` : 'از اول', canBay ? 'ghost' : 'primary big', async () => {
    close();
    if (newLevelRun) { save.streak = nextStreak(save.streak, 'gaveUp', true); persist(); }
    // Giving up on a Journey level costs a life (the daily challenge and events are free).
    if (costsLife) {
      loseLife();
      if (lives() <= 0 && !(await showNoLives(() => hud.refresh()))) { void goLevel(current, undefined, false, null, showHome); return; }
    }
    void goLevel(current, rush ?? undefined, true, event);
  });
  // «از اول», and beside it the level as a picture for friends: stuck is when a player most wants to show it.
  const restartRow = h('div', 'win-row lose-row');
  restartRow.append(restartAt);
  const stuck = rush ?? (current < levels.length ? levels[current] : null);
  if (stuck) {
    const title = event?.kind === 'endless' ? `تهران بی‌پایان، مرحله‌ی ${fa(levels.length + event.i + 1)}` : event ? '' : rush ? 'چالش ساعت شلوغی' : `مرحله‌ی ${fa(current + 1)} · ${chapterOf(current).name}`;
    if (title) { restartRow.append(shareButton({ level: stuck, title, badge: stuck.tag ? 'سخت' : undefined, brag: 'این مرحله گیرم انداخته!' })); restartRow.classList.add('with-share'); }
  }
  c.append(restartRow);
  // The solver's answer: known now, or patched in when it arrives (a second at most) if the card is still open.
  let hopelessNote: HTMLElement | null = null;
  const apply = (wins: boolean | null) => {
    if (!bayCase || wins === null || !c.isConnected) return;
    if (wins) { verdictNote(STILL, 'still'); return; }
    for (const o of offer.splice(0)) o.remove();
    restartAt.className = 'btn primary big';
    hopelessNote = verdictNote(HOPELESS, 'hopeless'); hopelessNow = true;
    const why = c.querySelector('.streak-note.risk small'); if (why) why.textContent = riskWhy(false);
    offerRewind();
  };
  /** Hopeless with one more bay, and the losing tap known and replayable: back to before it, for what a bay costs. */
  let rewindOffered = false;
  function offerRewind() {
    if (!rewind || !hopelessNow || rewindOffered || !c.isConnected) return;
    rewindOffered = true;
    const { plan, move } = rewind;
    const back = () => { close(); rewindTo(plan, move); };
    const pay = button(`${icon('restart')} از حرکت ${fa(move)} دوباره، ${emo('🪙', 'emo sm')} ${fa(price)}`, 'gold big rewind', () => {
      if (save.coins < price) { note(`${fa(price - save.coins)} سکه‌ی دیگه لازم داری`); showShop(() => {}, () => hud.refresh()); return; }
      save.coins -= price; persist(); hud.refresh();
      back();
    });
    const btns: HTMLElement[] = [pay];
    if (rewardedAvailable()) {
      const ad = button(`${emo('🎬', 'emo sm')} با دیدن تبلیغ، از حرکت ${fa(move)}`, 'primary', async () => {
        ad.setAttribute('disabled', '');
        if (await showRewarded()) back(); else ad.removeAttribute('disabled');
      });
      btns.push(ad);
    }
    restartRow.before(...btns);
    restartAt.className = 'btn ghost';
    if (hopelessNote) hopelessNote.textContent = `با یه جای پارک دیگه هم راهی نمی‌مونه؛ ولی از قبل از حرکت ${fa(move)} هنوز می‌شه برد.`;
  }
  if (bayCase && session!.continueKnown === undefined) void session!.continueWins.then(apply);
  else if (bayCase) { if (hopeless) { hopelessNote = verdictNote(HOPELESS, 'hopeless'); hopelessNow = true; offerRewind(); } else apply(session!.continueKnown ?? null); }
}

/** Reduced motion (a setting; it follows the phone's own preference until changed). */
function reduceMotion(): boolean { return document.documentElement.classList.contains('reduce-motion'); }
/** Apply the accessibility settings to the page: reduced motion and larger text. */
function applyAccess() {
  const os = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  document.documentElement.classList.toggle('reduce-motion', save.settings.reduceMotion ?? os);
  document.documentElement.classList.toggle('big-text', save.settings.bigText);
  document.documentElement.classList.toggle('left-hand', save.settings.leftHand);
}
applyAccess();

/** Leave whatever is being played for the home screen (the Journey's next level waits behind it). */
function goHome() { void goLevel(undefined, undefined, false, null, showHome); }

/**
 * The pause card: resume, restart, levels and home, then the settings. Opened by the gear, Android's back
 * button during play, and on coming back to a level in progress from another app. From home's gear (`home`), the
 * settings alone, under «تنظیمات», closing back to home.
 */
/** Closes the pause card while it is open. */
let pauseClose: (() => void) | null = null;
function showSettings(home = false) {
  modalOpen = true;
  craneMode = false; hud.active(null);
  const c = h('div', 'settings');
  c.innerHTML = home ? `<h2>${icon('settings')} تنظیمات</h2>` : `<h2>${icon('pause')} مکث</h2>`;
  if (!home) {
    const nav = h('div', 'pause-nav');
    const resume = asBack(button(`${icon('play')} ادامه`, 'primary big', () => { close(); modalOpen = false; if (needsRestart && session && session.s.exits === 0) void goLevel(current); }));
    nav.append(resume);
    const row2 = h('div', 'pause-row');
    row2.append(button(`${icon('restart')}<span>از اول</span>`, 'ghost', async () => {
      close();
      if (!(await giveUp())) { modalOpen = false; return; }
      // The life it cost may have been the last one.
      if (!rush && current >= FREE_LEVELS && lives() <= 0 && !(await showNoLives(() => hud.refresh()))) { void goLevel(current, undefined, false, null, showHome); return; }
      void goLevel(current, rush ?? undefined, true, event);
    }));
    row2.append(button(`${icon('map')}<span>مرحله‌ها</span>`, 'ghost', () => { close(); showLevels(); }));
    row2.append(button(`${icon('home')}<span>خونه</span>`, 'ghost', async () => { close(); if (await giveUp()) goHome(); else modalOpen = false; }));
    nav.append(row2);
    // This level's special rules, to read again (each is explained once, at its first level): J6.
    const rules = session ? levelRules(session.level) : [];
    if (rules.length) {
      const rr = h('div', 'rules-row', '<small>قانون‌های این مرحله</small>');
      for (const k of rules) {
        rr.append(button(`${emo(introIcon(k), 'emo xs')}<span>${introTitle(k)}</span>`, 'rule-chip', () => showRule(k, () => { close(); modalOpen = false; pointAt(k, 3600); })));
      }
      nav.append(rr);
    }
    c.append(nav);
    c.append(h('h3', 'set-h', `${emo('⚙️', 'emo xs')} تنظیمات`));
  }
  // Volumes: a slider each (zero is off).
  const slider = (label: string, key: 'musicVol' | 'sfxVol') => {
    const r = h('label', 'row slider', `<span>${label}</span>`);
    const t = h('input') as HTMLInputElement; t.type = 'range'; t.min = '0'; t.max = '100'; t.step = '5'; t.value = String(save.settings[key]);
    t.setAttribute('aria-label', label);
    t.oninput = () => {
      const v = Number(t.value);
      save.settings[key] = v;
      if (key === 'musicVol') { save.settings.music = v > 0; setMusicVolume(v); if (v > 0) startMusic(); else stopMusic(0.3); }
      else { save.settings.sound = v > 0; sfx.setSfxVolume(v); }
    };
    t.onchange = () => { persist(); if (key === 'sfxVol') { click(); soundscape(save.settings.sound ? placeLight : null); } };
    r.append(t); c.append(r);
  };
  const row = (label: string, key: 'haptics' | 'colorblind' | 'bigText' | 'leftHand', apply?: () => void) => {
    const r = h('label', 'row', `<span>${label}</span>`);
    const t = h('input') as HTMLInputElement; t.type = 'checkbox'; t.checked = save.settings[key]; t.className = 'switch';
    t.setAttribute('role', 'switch'); // read as on/off, not as a checkbox
    t.onchange = () => {
      save.settings[key] = t.checked; persist();
      if (key === 'colorblind') needsRestart = true;
      apply?.();
    };
    r.append(t); c.append(r);
  };
  slider('موسیقی', 'musicVol'); slider('صداها', 'sfxVol'); row('لرزش', 'haptics');
  // Reduced motion: follows the phone until switched here.
  const mr = h('label', 'row', '<span>حرکت کمتر<small>بدون لرزش دوربین و جلوه‌های پرتحرک</small></span>');
  const mt = h('input') as HTMLInputElement; mt.type = 'checkbox'; mt.className = 'switch'; mt.checked = reduceMotion();
  mt.onchange = () => { save.settings.reduceMotion = mt.checked; persist(); applyAccess(); };
  mr.append(mt); c.append(mr);
  row('متن بزرگ‌تر', 'bigText', applyAccess);
  row('چپ‌دست<small>دکمه‌های گوشه و کمک‌ها برعکس می‌شن</small>', 'leftHand', applyAccess);
  if (Capacitor.isNativePlatform()) {
    const nr = h('label', 'row', '<span>اعلان‌ها<small>جون پر شد، ساعت شلوغی رسید (شب‌ها نه)</small></span>');
    const nt = h('input') as HTMLInputElement; nt.type = 'checkbox'; nt.className = 'switch'; nt.checked = save.settings.notify;
    nt.onchange = async () => {
      save.settings.notify = nt.checked && (await askNotifications());
      if (nt.checked && !save.settings.notify) { nt.checked = false; note('اجازه‌ی اعلان رو از تنظیمات گوشی بده'); }
      save.notifyAsked = true; persist();
    };
    nr.append(nt); c.append(nr);
  }
  row('حالت کوررنگی (نماد روی رنگ‌ها)', 'colorblind');
  // Graphics quality: automatic (steps down if the phone struggles), or fixed.
  const qr = h('div', 'row quality', '<span>کیفیت گرافیک</span>');
  const seg = h('div', 'seg');
  for (const [k, label] of [['auto', 'خودکار'], ['high', 'بالا'], ['balanced', 'متوسط'], ['low', 'ساده']] as const) {
    const b = h('button', save.settings.quality === k ? 'on' : '', label);
    b.onclick = () => {
      save.settings.quality = k; persist();
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      // Materials and textures are chosen at load: a switch between the lite and full looks restarts the app.
      const lite = k === 'high' ? false : k === 'auto' ? profile.mobile : true;
      if (lite !== profile.lite || (k === 'low') !== !profile.shadows) { hud.toast('در حال اعمال تنظیمات…'); setTimeout(() => location.reload(), 400); return; }
      applyQuality(k);
    };
    seg.append(b);
  }
  qr.append(seg); c.append(qr);
  let needsRestart = false;
  const closeCard = modal(c, home ? 'pop pause-card home-settings' : 'pop pause-card');
  const close = () => { if (pauseClose === close) pauseClose = null; closeCard(); };
  if (!home) pauseClose = close;
  // Script errors seen on this phone, for testers to send.
  const errs = errors();
  if (errs.length) {
    c.append(button(`${icon('doc')} گزارش خطا (${fa(errs.reduce((a, e) => a + e.n, 0))})`, 'ghost errs', async () => {
      const text = `Rahbandoon ${__APP_VERSION__} (${__BUILD__})\n${navigator.userAgent}\n\n${errorReport()}`;
      if (Capacitor.isNativePlatform()) { await Share.share({ title: 'Rahbandoon errors', text }).catch(() => {}); return; }
      try { await navigator.clipboard.writeText(text); note('گزارش کپی شد'); } catch { note('کپی نشد'); }
    }));
  }
  // The basics, the helps and every special rule met so far (J6).
  c.append(button(`${icon('book')} راهنمای بازی`, 'ghost errs guide-btn', () => showGuide(TIPS)));
  // Progress to or from another phone (a code; Bazaar has no cloud save).
  c.append(button(`${icon('transfer')} انتقال پیشرفت به گوشی دیگه`, 'ghost errs transfer-btn', () => showTransfer(levels.length)));
  // The privacy policy (the store listing's text, store/privacy-fa.md).
  c.append(button(`${icon('shield')} حریم خصوصی`, 'ghost errs privacy-btn', () => showPrivacy()));
  // Version label: three taps show the performance overlay, seven unlock every level (for testers).
  const ver = h('div', 'ver', `نسخه‌ی ${fa(__APP_VERSION__)} · ساخت ${__BUILD__}`);
  let taps = 0;
  ver.onclick = () => {
    ++taps;
    if (taps === 3) {
      togglePerfHud();
      // Testers: which levels are hardest on this phone (copied or shared as text).
      const top = hardest(save.lvStats, 5).map((x) => `${fa(x.level)} (${fa(Math.round(x.lossRate * 100))}٪)`).join('، ');
      c.append(button(`${icon('doc')} آمار مرحله‌ها${top ? `<small>سخت‌ترین: ${top}</small>` : ''}`, 'ghost errs', async () => {
        const text = `Rahbandoon ${__APP_VERSION__} (${__BUILD__})\n${statsCsv(save.lvStats)}`;
        if (Capacitor.isNativePlatform()) { await Share.share({ title: 'Rahbandoon level stats', text }).catch(() => {}); return; }
        try { await navigator.clipboard.writeText(text); note('آمار کپی شد'); } catch { note('کپی نشد'); }
      }));
      // Testers: this phone's GPU, render profile and cold-start timings (headless tests can't measure start-up).
      c.append(button(`${icon('doc')} گزارش دستگاه`, 'ghost errs', async () => {
        const text = deviceReport(`Rahbandoon ${__APP_VERSION__} (${__BUILD__})`, renderer.getContext(), {
          Profile: `${profile.quality}, ${profile.lite ? 'lite' : 'full'}${profile.low ? ' + low' : ''}, shadows ${profile.shadows ? 'on' : 'off'}`,
          Rendering: `tier ${tier}, pixel ratio ${renderer.getPixelRatio().toFixed(2)}, governor scale ${pacer.state.scale}, frame divider ${pacer.state.div}`,
        });
        if (Capacitor.isNativePlatform()) { await Share.share({ title: 'Rahbandoon device report', text }).catch(() => {}); return; }
        try { await navigator.clipboard.writeText(text); note('گزارش کپی شد'); } catch { note('کپی نشد'); }
      }));
    }
    if (taps === 7) { save.devUnlock = true; persist(); hud.toast('همه‌ی مرحله‌ها باز شد (حالت آزمایشی)'); }
  };
  c.append(ver);
  // From home: a close in the card's corner (the card is taller than most screens); home is still open beneath.
  if (home) {
    const x = asBack(h('button', 'iconbtn card-x', icon('close')));
    x.setAttribute('aria-label', 'بستن');
    x.onclick = () => { click(); close(); };
    c.prepend(x);
  }
}

/** Level select: every chapter's levels; unlocked ones can be replayed. */
/** The level list (from the pause card, or from home once every level is won: `back` then returns there). */
function showLevels(back?: () => void) {
  modalOpen = true;
  const c = h('div', 'levels');
  c.innerHTML = `<h2>${emo('🗺️')} مرحله‌ها</h2>`;
  // The gold dot: won without any help (a replay can earn it).
  if (Object.keys(save.cleanLv).length) c.append(h('p', 'lv-legend', '<i class="dot"></i> بدون کمک برده شده؛ بقیه رو دوباره بازی کن و بگیرش!'));
  const unlocked = save.devUnlock || UNLOCK_ALL_LEVELS ? levels.length : save.level;
  let close = () => {};
  for (const ch of CHAPTERS) {
    c.append(h('h3', '', `فصل ${fa(ch.n)}: ${ch.name}`));
    const grid = h('div', 'lgrid');
    for (let i = ch.from; i < ch.to && i < levels.length; i++) {
      const open = i <= unlocked;
      const tag = levels[i].tag;
      const clean = i < save.level && !!save.cleanLv[String(i + 1)];
      const b = h('button', `lv ${i < save.level ? 'done' : i === save.level ? 'now' : ''} ${open ? '' : 'locked'} ${tag ?? ''}${clean ? ' clean' : ''}`, open ? fa(i + 1) : emo('🔒', 'emo xs'));
      if (clean) b.setAttribute('aria-label', `${fa(i + 1)}، بدون کمک برده شده`);
      if (open) b.onclick = async () => {
        // Picked from the pause card in the middle of a level: leaving it is a give-up (the card stays on a no).
        if (!(await giveUp())) return;
        if (i >= FREE_LEVELS && lives() <= 0 && !(await showNoLives(() => hud.refresh()))) return;
        close(); void goLevel(i);
      };
      grid.append(b);
    }
    c.append(grid);
  }
  close = modal(c, 'pop levels-card');
  c.append(asBack(button('بستن', 'ghost', () => { close(); if (back) back(); else modalOpen = false; })));
  // Open where the player is (the list runs to level 240), not at chapter 1.
  const here = c.querySelector<HTMLElement>('.lv.now') ?? c.querySelector<HTMLElement>(`.lgrid .lv:nth-child(1)`);
  requestAnimationFrame(() => here?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
}

/** Days away at this visit that earn the welcome back (shown once, on home), or 0. */
let welcomeBack = 0;
function noteVisit() {
  const day = today();
  if (save.lastDay === day) return;
  const away = save.lastDay ? Math.round((Date.parse(day) - Date.parse(save.lastDay)) / 864e5) : 0;
  save.lastDay = day; persist();
  if (away >= AWAY_DAYS && save.level >= 3) welcomeBack = away;
}

function showHome() {
  modalOpen = true;
  hud.show(false);
  const c = h('div', 'home');
  const ch = chapterOf(Math.min(save.level, levels.length - 1));
  const done = Math.min(save.level, ch.to) - ch.from, total = ch.to - ch.from;
  const map = CHAPTERS.map((k) => `<span class="${save.level >= k.to ? 'done' : k === ch ? 'now' : 'locked'}">${save.level >= k.from ? fa(k.n) : icon('lock')}</span>`).join('<i></i>');
  c.innerHTML = `<div class="logo"><span class="sign">راه‌بندون</span><span class="en">TEHRAN · GRIDLOCK</span><small>ترافیک تهران، تو دستای تو</small></div>
    <div class="chapter"><div class="ch-map">${map}</div><div class="ch-k">فصل ${fa(ch.n)}</div><div class="ch-t">${icon('pin')} ${ch.name}</div><div class="ch-bar"><i style="width:${Math.round((done / total) * 100)}%"></i></div><div class="ch-n">${fa(done)} از ${fa(total)} مرحله</div></div>`;
  c.prepend(radioCard());
  const yb = yaldaBanner((night) => {
    const lvl = yaldaLevel(night);
    if (!lvl) { hud.toast('مرحله‌ی امشب آماده نشد، بعداً سر بزن!'); return; }
    close(); modalOpen = false;
    void goLevel(undefined, lvl, true, { kind: 'yalda', i: night });
  });
  if (yb) c.querySelector('.chapter')!.before(yb);
  const nb = nowruzBanner((day) => {
    const lvl = nowruzLevel(day);
    if (!lvl) { hud.toast('مرحله‌ی امروز آماده نشد، بعداً سر بزن!'); return; }
    close(); modalOpen = false;
    void goLevel(undefined, lvl, true, { kind: 'nowruz', i: day });
  });
  if (nb) c.querySelector('.chapter')!.before(nb);
  const close = modal(c, 'home-card');
  // Settings from home (the HUD and its gear are hidden here): the gear in the corner it has in play.
  const gear = h('button', 'iconbtn home-gear', icon('settings'));
  gear.setAttribute('aria-label', 'تنظیمات');
  gear.onclick = () => { click(); showSettings(true); };
  c.closest('.modal-back')!.append(gear);

  const gar = button(`${icon('wrench')}<span>گاراژ من<small>${icon('key')} ${fa(save.garage.keys)} سوئیچ</small></span>`, 'garage-btn', () => {
    close(); showGarage(() => showHome());
  });
  const next = nextRenovation();
  const ready = !!next && save.agency.stars >= next.cost;
  c.append(button(`<span class="al">${icon('home')}<span>آژانس آقاجون<small>${next ? `بعدی: ${next.name}` : 'آژانس کامل بازسازی شد!'}</small></span></span><span class="sb ${ready ? 'ready' : ''}">${icon('star')} ${fa(save.agency.stars)}</span>`, 'agency-btn', () => {
    close(); showAgency(() => showHome());
  }));
  const rowEl = h('div', 'home-row');
  rowEl.append(gar);
  c.append(rowEl);
  // «امروز» (P4): today's rush hour and Ms. Sabouri's three missions, in one card; the badge counts rewards waiting.
  const rushDone = save.rush.day === today();
  const waitingToday = todayBadge(today());
  const todayBtn = button(`${icon('radio')}<span>امروز<small>${todayLine(today(), rushDone)}</small></span>${waitingToday ? `<i class="badge">${fa(waitingToday)}</i>` : ''}`, 'rush-btn today-btn', () => {
    close();
    showToday({
      day: today(), rushDone, rushStreak: save.rush.streak, onChange: () => hud.refresh(), onClose: () => showHome(),
      playRush: async (busy) => {
        // Today's level is made ahead (rush.ts); if it isn't ready yet, the row says so and waits for it.
        if (!rushReady()) busy(true);
        const lvl = await prepareRush();
        busy(false);
        if (!lvl) { note('چالش امروز آماده نشد، بعداً سر بزن!'); return false; }
        modalOpen = false;
        void goLevel(undefined, lvl);
        return true;
      },
    });
  });
  todayBtn.setAttribute('aria-label', `امروز: ساعت شلوغی و مأموریت‌ها${waitingToday ? `، ${fa(waitingToday)} جایزه آماده` : ''}`);
  rowEl.append(todayBtn);
  if (!rushDone) void prepareRush();
  const tickets = passReady();
  const passBtn = button(`${icon('ticket')}${tickets ? `<i class="badge">${fa(tickets)}</i>` : ''}`, 'ach-btn pass-btn', () => {
    close(); showPass(() => hud.refresh(), () => showHome());
  });
  passBtn.setAttribute('aria-label', tickets ? `کارت بلیت، ${fa(tickets)} جایزه آماده` : 'کارت بلیت');
  rowEl.append(passBtn);
  const waiting = claimable();
  const achBtn = button(`${icon('trophy')}${waiting ? `<i class="badge">${fa(waiting)}</i>` : ''}`, 'ach-btn', () => {
    close(); showAchievements(() => showHome(), () => hud.refresh());
  });
  achBtn.setAttribute('aria-label', waiting ? `افتخارات، ${fa(waiting)} جایزه آماده` : 'افتخارات');
  rowEl.append(achBtn);
  rowEl.classList.add('with-ach');
  c.querySelector('.chapter')!.append(livesPill());
  if (save.streak > 0 && save.level < levels.length) c.querySelector('.chapter')!.append(h('div', 'streak-chip', `${emo('🔥', 'emo xs')}<b>${fa(save.streak)}</b> برد پشت‌سرهم${helpsText(save.streak) ? `<small>${helpsText(save.streak)} مجانی</small>` : ''}`));
  // Every level won: there is no level 241 to offer (Play used to replay the final boss under that number). Home says
  // so, Play opens the level list for any replay, and the finish gets its card once (BEST_IN_MARKET_PLAN C6).
  const finished = save.level >= levels.length;
  if (finished) {
    // Every Journey level won: Play goes on into Endless Tehran; the levels stay a tap away for replays (C10).
    const fin = h('div', 'finale-note', `${emo('🏆', 'emo xs')} همه‌ی ${fa(levels.length)} مرحله رو بردی! <small>حالا تهران بی‌پایانه؛ مرحله‌های قبلی هم هر وقت بخوای:</small>`);
    fin.append(button(`${icon('map')} مرحله‌ها`, 'ghost replay-link', () => { close(); showLevels(() => showHome()); }));
    c.querySelector('.chapter')!.append(fin);
  }
  c.append(button(finished ? `<span class="go">${icon('play')}تهران بی‌پایان</span><small>مرحله‌ی ${fa(levels.length + save.endless + 1)} · ${placeOf(save.endless).name}</small>` : `<span class="go">${icon('play')}بزن بریم</span><small>مرحله‌ی ${fa(save.level + 1)}</small>`, 'primary huge', async () => {
    if (finished) { close(); modalOpen = false; await playEndless(save.endless); return; }
    if (save.level >= FREE_LEVELS && lives() <= 0 && !(await showNoLives(() => hud.refresh()))) return;
    close();
    // The daily gift waits until the first levels are done: a new player's Play goes straight into level 1 (scripts/journey.cjs).
    if (save.level >= DAILY_FROM) await maybeDaily(() => hud.refresh());
    modalOpen = false; hud.show(true);
    introSwoop();
  }));
  if (finished && !save.seen.finale) showFinale();
  else if (welcomeBack) { const days = welcomeBack; welcomeBack = 0; void showWelcomeBack(days, () => addLives(MAX_LIVES), () => hud.refresh()); }
}

/** Once, the first time home opens with every level won: the whole journey, and what comes next. */
function showFinale() {
  const c = h('div', 'finale');
  c.innerHTML = `<div class="burst">${emo('🏆', 'emo huge')}</div><h2>تبریک! راه‌بندون باز شد</h2>
    <p>همه‌ی ${fa(levels.length)} مرحله رو بردی، از تجریش تا برج میلاد، و آقای عجول رو ${fa(CHAPTERS.length)} بار شکست دادی. مش‌رحیم بهت افتخار می‌کنه!</p>
    <div class="beaten">${AJOOL('sm')}<div><b>آقای عجول:</b> باشه، باشه… این دفعه رو تو بردی. ولی من بیکار نمی‌شینم!</div></div>
    <p class="next">حالا «تهران بی‌پایان» باز شده: مرحله‌های تازه، بی‌انتها، توی همین محله‌ها. ساعت شلوغی هم هر روز سر جاشه.</p>`;
  const close = modal(c, 'pop');
  c.append(asBack(button('دمت گرم!', 'primary big', () => { save.seen.finale = true; persist(); close(); })));
}

/**
 * Android's back button (Escape in a browser): close the top card the way its own back button would, cancel
 * the crane, or pause the level. On the home screen a second press within two seconds leaves the game.
 */
let backAt = 0;
function onBack() {
  if (veil.classList.contains('on')) return;
  const top = topCard();
  if (top?.querySelector('.home')) {
    if (performance.now() - backAt < 2000) { void CapApp.exitApp().catch(() => {}); return; }
    backAt = performance.now();
    note('برای خروج، یه بار دیگه دکمه‌ی برگشت رو بزن');
    return;
  }
  if (backPress()) return;
  if (craneMode) { craneMode = false; hud.active(null); return; }
  if (session && !session.s.over && !modalOpen) showSettings();
}

// ───── Boot ─────
async function boot() {
  // Stars arrived after launch: credit players for the levels they had already won.
  if (!save.agency.init) {
    save.agency.stars += levels.slice(0, save.level).reduce((a, l) => a + starsFor(l.tag), 0);
    save.agency.init = true; persist();
  }
  hud = new Hud(document.body);
  hud.onBooster = useBooster;
  // Like back: once the level's outcome is decided (its finale is playing), the pause card can't open over it.
  hud.onSettings = () => { if (session?.s.over && !modalOpen) return; showSettings(); };
  hud.onCoins = () => { modalOpen = true; showShop(() => { modalOpen = false; }, () => hud.refresh()); };
  performance.mark('b0');
  performance.measure('before-boot', { start: 0, end: 'b0' });
  // ── Loading: everything heavy happens here, behind the loading screen, a slice at a time so it keeps moving.
  // Nothing heavy is left for later: once the menu shows, it has the phone to itself.
  const bar = document.querySelector('#splash .bar i') as HTMLElement | null;
  let done = 0;
  const STEPS = 6 + kindsFor(levelPlan().level).length;
  const progress = async (n = 1) => { done += n; if (bar) bar.style.transform = `scaleX(${Math.min(1, done / STEPS)})`; await nextFrame(); };
  await document.fonts.load('900 40px Vazirmatn').catch(() => {});
  performance.measure('fonts', 'b0');
  await progress();
  // Every vehicle model (one per kind, shared by all colors), the garage classics the player owns, and every passenger look.
  performance.mark('b1');
  // Only the kinds the first level shows (and the kerbside parked cars); later levels build what they need
  // behind their veil, or while the win card is up.
  for (const k of kindsFor(levelPlan().level)) { warmFleet([k]); await progress(); }
  warmPeople();
  performance.measure('fleet', 'b1');
  await progress();
  // The first level's world, built in slices.
  performance.mark('b2');
  const first = levelPlan();
  await runSteps(worldSteps(first.level.w, first.level.h, first.seed, first.world));
  performance.measure('world-steps', 'b2');
  await progress(2);
  startLevel(undefined, undefined, debug.has('play'));
  performance.measure('level', 'b2');
  await progress();
  // Compile every shader now (the level's, the instanced models' and the effects'), so no frame stalls later.
  performance.mark('b2c');
  syncInstances();
  const fxWarm = new THREE.Group(); fxWarm.add(...fxWarmObjects());
  scene.add(fxWarm);
  await compiled();
  scene.remove(fxWarm);
  performance.measure('compile', 'b2c');
  await progress();
  // The music loop for this chapter (rendered off the main thread, a bar at a time).
  performance.mark('b2m');
  // Rendered off the main thread a bar at a time; it finishes on its own while the menu shows.
  void prepareMusic();
  performance.measure('music', 'b2m');
  await progress();
  applyQuality(save.settings.quality);
  // Draw the first frame under the loading screen (uploads every texture now, not on the first visible frame).
  performance.mark('b3');
  post.render(scene, camera);
  performance.measure('first-frame', 'b3');
  await progress(STEPS);
  // A new player goes straight into level 1: the camera sweeps down from the landmark as the loading screen fades,
  // with the spotlight on the first car, the way the best puzzle games start. Home comes from the first win on
  // (until then it holds nothing but its Play button). scripts/journey.cjs, smoke.cjs.
  if (debug.has('play')) { /* tests start in the level */ } else if (save.level === 0) introSwoop();
  else showHome();
  // Back after days away (P3): the welcome back waits for home (none for a new player, or an old save that never kept it).
  noteVisit();
  // Back from a progress transfer (Settings → انتقال پیشرفت), which restarts the game: say it arrived.
  const moved = takeTransferNote();
  if (moved) note(moved, 3200);
  void initMonetization();
  window.addEventListener('resize', fitCamera);
  // Browsers only allow audio after a gesture: start the music on the first touch.
  window.addEventListener('pointerdown', () => startMusic(), { once: true });
  // Inside the app media may play before a touch (Capacitor's WebView setting), so the music can come in with the
  // level's opening camera move: a new player now starts in level 1, where the first touch is already a move. Only if
  // the audio really runs; otherwise the first touch starts it, as in a browser.
  if (Capacitor.isNativePlatform()) {
    const o = sfx.audioOut();
    o?.c.resume().then(() => { if (o.c.state === 'running') startMusic(); }).catch(() => {});
  }
  // Reminders wait only while the game is away: scheduled on leaving, cleared on coming back.
  save.opens = [...save.opens, new Date().getHours()].slice(-9); persist();
  void syncReminders(false, []);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMusic(0.2);
      sfx.pauseAudio();
      void syncReminders(save.settings.notify, planReminders({ now: Date.now(), livesFullAt: fullAt(), opens: save.opens, comeback: save.level >= 3 }));
      return;
    }
    void syncReminders(false, []);
    noteVisit(); // the app may have stayed in memory for days
    if (welcomeBack && topCard()?.querySelector('.home')) { const days = welcomeBack; welcomeBack = 0; void showWelcomeBack(days, () => addLives(MAX_LIVES), () => hud.refresh()); }
    sfx.resumeAudio();
    startMusic();
    // Back from another app in the middle of a level: wait on the pause card instead of dropping straight in.
    if (session && !session.s.over && session.taps > 0 && !modalOpen && !veil.classList.contains('on')) showSettings();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') onBack(); });
  let shadowTick = 0, frozen = 0, lastFrame = 0;
  if (debug.has('perf')) togglePerfHud(true);
  const loop = (t: number) => {
    requestAnimationFrame(loop);
    // Frame pacing: on 90/120 Hz screens (or when the governor halves the rate) only some refreshes render,
    // on an even rhythm; the animations advance by the time since the last rendered frame.
    // Calm: no animation running, no touch for a moment, no shake (idle people and weather are fine at 30 fps).
    const calm = !busy() && t - lastTouch > 1500 && shakeAmp <= 0.001 && !modalBacks.length;
    const dt = pacer.frame(t, calm);
    if (dt === null) return;
    const interval = lastFrame ? t - lastFrame : 16.7; lastFrame = t;
    // When taps pile up faster than cars can park and load, play the backlog a little faster to catch up.
    catchUp();
    tick(dt);
    session?.idle(t / 1000);
    applyFlash(session?.weather?.flash ?? 0);
    if (session) {
      const bays = session.s.bays, used = bays.filter(Boolean).length;
      setTension(session.s.over ? 0 : Math.max(0, (used - 2) / Math.max(1, bays.length - 2)));
    }
    applyShake(dt);
    updateHand();
    updateMark();
    pumpNotes(t);
    // Lite: nothing that moves casts a shadow, so the shadow map is drawn once per level (no periodic spike).
    if (mobile && !profile.lite && ++shadowTick % 8 === 0) renderer.shadowMap.needsUpdate = true;
    // Behind a menu the 3D view settles for a few frames and then holds still, so the phone's GPU is free for
    // the menu itself (a win keeps its confetti live for a moment).
    const covered = (modalBacks.length > 0 && t > liveUntil) || veil.classList.contains('on');
    if (!covered) frozen = 0;
    if (!covered || frozen < 3) { post.render(scene, camera, dt); if (covered) frozen++; }
    // The governor only judges frames of play.
    if (covered || modalOpen || document.visibilityState !== 'visible') pacer.reset();
    else pacer.observe(t, interval / 1000);
    perfFrame(t, interval, renderer, pacer.state);
  };
  if (debug.has('shot')) post.render(scene, camera);
  else requestAnimationFrame(loop);
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    SplashScreen.hide().catch(() => {});
    CapApp.addListener('backButton', onBack);
  }
  // Test hooks for headless screenshots.
  (window as unknown as { __rb: unknown }).__rb = {
    session: () => session, save, startLevel, goLevel, levels, camera, renderer, post, scene, instanceStats, Raycaster: THREE.Raycaster, pick,
    swooping: () => swooping, pointAt, errors, worldCacheInfo,
    /** A vehicle's way out as the hold preview draws it (scripts/holdpreview.cjs). */
    route: (i: number) => (session ? route(session.s, i) : null),
    /** The share-a-win image for level n (scripts/sharecard.cjs). */
    shareCard: async (n: number, brag = 'با ۱۲ حرکت ردش کردم!') => { await document.fonts.load('900 112px Vazirmatn'); return drawShareCard({ level: levels[n], title: `مرحله‌ی ${fa(n + 1)} · ${chapterOf(n).name}`, badge: levels[n].tag ? 'سخت' : undefined, brag }).toDataURL('image/png'); },
    /** Every card the game shows, for layout checks (scripts/cardfit.cjs). */
    cards: {
      home: showHome, pause: showSettings, levels: showLevels, rate: askRating, reminders: askReminders, giveUp, lose: showLose, win: showWin, rushWin: showRushWin,
      shop: () => showShop(() => {}, () => {}), garage: () => showGarage(() => {}), agency: () => showAgency(() => {}), pass: () => showPass(() => {}, () => {}),
      achievements: () => showAchievements(() => {}, () => {}), chest: () => showChest(() => {}), intro: (k: IntroKind) => showIntro(k), noLives: () => showNoLives(() => {}),
      daily: () => maybeDaily(() => {}), settings: () => showSettings(true), guide: () => showGuide(TIPS), starter: () => { delete save.seen.starterOffer; return maybeStarterOffer(); }, endless: (i: number) => playEndless(i), today: () => showToday({ day: today(), rushDone: save.rush.day === today(), rushStreak: save.rush.streak, onChange: () => hud.refresh(), onClose: () => {}, playRush: async () => false }), welcomeBack: (days: number) => showWelcomeBack(days, () => addLives(MAX_LIVES), () => hud.refresh()), privacy: () => showPrivacy(), transfer: () => showTransfer(levels.length), finale: () => showFinale(), helpOffer: (id: BoosterId) => offerHelp(id), yaldaWin: (i: number) => showYaldaWin(i, () => {}), nowruzWin: (i: number) => showNowruzWin(i, () => {}),
    },
    /** The solver (bundled anyway for hints), so a smoke test can win a level in the production build. */
    solve: (lv: Level) => solveLevel(lv).solution,
    /** The touch handling's state, for a test that fails (scripts/holdpreview.cjs). */
    input: () => ({ modalOpen, down: down ? { ...down } : null, craneMode, swooping, veil: veil.classList.contains('on') }),
    /** A floating text at a screen point, as a car leaving there would show it (scripts/floats.cjs). */
    floatAt: (text: string, kind: 'coin' | 'combo' | 'bad', x: number, y: number) => floatTextAt(text, kind, x, y),
    /** Pretend the player has looked at the board for `ms` without a move (the hint offer's idle clock). */
    scape: () => scapeNow(), amb: () => sfx.ambOut(),
    idleFor: (ms: number) => { const t = performance.now() - ms; if (session) session.lastInput = t; inViewSince = t; },
    /** Render the level-start camera move at progress k (0 = the landmark shot). */
    swoop: (k: number) => { const st = landmarkShot(); swoopPose(k, st.startPos, st.startLook, camBase.clone(), camTarget.clone()); post.render(scene, camera); },
    /** Advance the animations by `sec` in fixed steps, then draw one frame. */
    async advance(sec: number, draw = true) { for (let t = 0; t < sec; t += 1 / 30) { catchUp(); tick(1 / 30); session?.idle(performance.now() / 1000); await new Promise((r) => setTimeout(r, 0)); } updateHand(); if (draw) post.render(scene, camera, 1 / 30); },
  };
  const splash = document.getElementById('splash');
  if (splash) { if (debug.has('shot')) splash.remove(); else { splash.classList.add('gone'); setTimeout(() => splash.remove(), 600); } }
  recordBoot();
  document.title = 'ready';
}
mainLoaded();
boot().catch((e: unknown) => {
  // A failure before the game is on screen would leave the splash up forever: say so, with a retry.
  if (document.getElementById('splash') && document.title !== 'ready') showFatal('boot', String((e as Error)?.message ?? e));
  throw e; // still reaches the error log
});
