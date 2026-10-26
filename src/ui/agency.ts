/** «آژانس آقاجون» screen: spend stars from levels to renovate grandpa's taxi agency, one piece at a time. */
import * as THREE from 'three';
import { coin } from '../audio';
import { haptic } from '../haptics';
import { RENOVATIONS, buildAgency } from '../render/agency';
import { outdoorEnv } from '../render/env.js';
import { persist, save } from '../save';
import { emo } from './emoji';
import { button, fa, h, modal } from './hud';

/** The next renovation to buy, or null when the agency is finished. */
export const nextRenovation = () => RENOVATIONS.find((r) => !save.agency.done.includes(r.id)) ?? null;

export function addStars(n: number) { save.agency.stars += n; persist(); }

export function showAgency(onClose: () => void) {
  const shot = location.search.includes('shot');
  const c = h('div', 'agency');
  c.innerHTML = `<h2>${emo('🏠')} آژانس آقاجون</h2><div class="stars">${emo('⭐')} <b></b> ستاره</div>`;
  const stage = h('div', 'stage');
  const canvas = document.createElement('canvas');
  stage.append(canvas);
  const bar = h('div', 'abar2');
  const action = h('div', 'gaction');
  c.append(stage, bar, action);
  const close = modal(c, 'pop agency-card');
  let stop = false;
  c.append(button('بستن', 'ghost', () => { stop = true; renderer.dispose(); close(); onClose(); }));

  const Wd = Math.min(360, window.innerWidth - 40), Ht = 250;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: shot });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(Wd, Ht);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256;
  const sg = sky.getContext('2d')!, gr = sg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#4b93dd'); gr.addColorStop(0.6, '#a9d4f5'); gr.addColorStop(1, '#f6e7cf'); sg.fillStyle = gr; sg.fillRect(0, 0, 2, 256);
  const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  scene.environment = outdoorEnv(renderer); scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight(0xe3f0ff, 0x6b5a45, 0.8));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.position.set(-8, 14, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); sun.shadow.bias = -0.0005;
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(32, Wd / Ht, 0.5, 120);
  let agency: THREE.Group | null = null;
  let pop: { g: THREE.Object3D; t: number } | null = null;

  const rebuild = (fresh?: string) => {
    if (agency) scene.remove(agency);
    agency = buildAgency(new Set(save.agency.done));
    scene.add(agency);
    const g = fresh ? agency.getObjectByName(fresh) : undefined;
    if (g && g.children.length) { pop = { g, t: 0 }; g.scale.setScalar(0.01); }
  };

  const show = () => {
    (c.querySelector('.stars b') as HTMLElement).textContent = fa(save.agency.stars);
    const done = save.agency.done.length, all = RENOVATIONS.length;
    bar.innerHTML = `<span class="pbar"><i style="width:${Math.round((done / all) * 100)}%"></i></span><small>${fa(done)} از ${fa(all)} بازسازی</small>`;
    action.innerHTML = '';
    const next = nextRenovation();
    if (!next) { action.append(h('p', 'story', `${emo('🎉', 'emo sm')} آژانس آقاجون مثل روز اولش شد! آقاجون اگه بود کلی کیف می‌کرد.`)); return; }
    const can = save.agency.stars >= next.cost;
    action.append(h('div', 'nextr', `${emo(next.icon)}<b>${next.name}</b>`));
    const b = button(`${emo('🔨', 'emo sm')} بازسازی کن، ${emo('⭐', 'emo sm')} ${fa(next.cost)}`, can ? 'gold big' : 'ghost', () => {
      if (save.agency.stars < next.cost) { b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); haptic('warn'); return; }
      save.agency.stars -= next.cost; save.agency.done.push(next.id); persist();
      coin(); coin(0.12); coin(0.24); haptic('success');
      stage.classList.add('sparkle'); setTimeout(() => stage.classList.remove('sparkle'), 900);
      rebuild(next.id);
      show();
      action.prepend(h('p', 'story', `${emo('📜', 'emo sm')} ${next.line}`));
    });
    action.append(b);
    if (!can) action.append(h('small', 'hint', 'با بردن هر مرحله ستاره می‌گیری؛ مرحله‌های سخت و رئیس بیشتر!'));
  };

  rebuild();
  show();
  let t = 0;
  const frame = () => {
    // A slow swing in front of the building.
    const a = Math.sin(t * 0.25) * 0.35;
    cam.position.set(Math.sin(a) * 19, 6.2, 2.5 + Math.cos(a) * 19);
    cam.lookAt(0, 2.6, 3.2);
    if (pop) {
      pop.t += 0.016;
      const k = Math.min(1, pop.t / 0.6), s = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 - (1 - k) * (1 - k) : 1;
      pop.g.scale.setScalar(Math.max(0.01, s));
      if (k >= 1) pop = null;
    }
    renderer.render(scene, cam);
  };
  const loop = () => {
    if (stop) return;
    t += 0.016;
    frame();
    if (!shot) requestAnimationFrame(loop);
  };
  loop();
}
