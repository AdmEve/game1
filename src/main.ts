import 'vazirmatn/Vazirmatn-font-face.css';
import './style.css';
import './content';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { Life } from './engine/types';
import { killNow } from './engine/play';
import { initMonetization } from './monetize';
import { cancelReminders, scheduleReminders } from './notify';
import { meta, persist } from './save';
import { closeTop, h, layers } from './ui/dom';
import { showDeath } from './ui/death';
import { hooks, runQueue } from './ui/flow';
import { currentLife, refresh, showGame } from './ui/game';
import { achievements, app, gameMenu, meSheet, shop, showHome } from './ui/menu';
import { openTab } from './ui/tabs';

let screen: 'home' | 'game' = 'home';

function play(L: Life) {
  screen = 'game';
  meta.life = L;
  persist();
  showGame(L);
}

function home() {
  screen = 'home';
  showHome();
}

app.play = play;
app.home = home;
hooks.refresh = () => refresh(false);
hooks.openTab = openTab;
hooks.openShop = shop;
hooks.openMenu = gameMenu;
hooks.openAchievements = achievements;
hooks.openMe = meSheet;
hooks.afterDeath = () => {
  const L = currentLife();
  if (L?.dead) showDeath(L, { newLife: () => home(), play });
};

function onBack() {
  if (layers.length) { closeTop(); return; }
  if (screen === 'game') { home(); return; }
  CapApp.exitApp().catch(() => {});
}

function boot() {
  const app = document.getElementById('app')!;
  app.append(h('div', { id: 'screen' }), h('div', { id: 'layers' }));
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    CapApp.addListener('backButton', onBack);
    CapApp.addListener('pause', () => { persist(); void scheduleReminders(); });
    CapApp.addListener('resume', () => void cancelReminders());
    void cancelReminders();
  }
  window.addEventListener('beforeunload', () => persist());
  if (meta.life && !meta.life.dead) play(meta.life);
  else home();
  void initMonetization();
  SplashScreen.hide().catch(() => {});
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __z: unknown }).__z = {
      meta,
      currentLife,
      kill: () => { const L = currentLife(); if (L) { killNow(L, 'سکته‌ی قلبی'); hooks.afterDeath(); } },
      /** Show a specific event now (store screenshots, testing). */
      event: (id: string, p?: Record<string, unknown>) => { const L = currentLife(); if (L) { L.queue.unshift({ id, p }); void runQueue(L); } },
      refresh: () => refresh(),
    };
  }
}

boot();
