/**
 * Player progress, kept in localStorage under two keys: the save and a backup written with it, so a write cut
 * short (the app killed mid-save, a full disk) can only ever spoil one of them.
 */
export interface Save {
  /** Save format version (for migrations). */
  v: number;
  level: number;
  coins: number;
  boosters: { crane: number; whistle: number; bay: number };
  /**
   * `sound`/`music` are on whenever their volume (0–100) is above zero. `reduceMotion` null follows the phone's
   * own setting. `bigText` scales card and toast text.
   */
  settings: {
    sound: boolean; music: boolean; haptics: boolean; colorblind: boolean; quality: 'auto' | 'high' | 'balanced' | 'low';
    sfxVol: number; musicVol: number; reduceMotion: boolean | null; bigText: boolean;
    /** Reminders (lives full, daily rush hour); off until the player says yes. */
    notify: boolean;
  };
  /** Whether the reminders question has been asked; the hours of recent app opens (for its timing). */
  notifyAsked: boolean;
  opens: number[];
  stats: { wins: number; losses: number; people: number; bestCombo: number; clean: number; bosses: number; bestRush: number };
  /** «افتخارات»: tiers claimed and tiers already announced, per achievement. */
  ach: Record<string, number>;
  achSeen: Record<string, number>;
  owned: { starter: boolean; no_ads: boolean };
  daily: { day: string; streak: number };
  ads: { lastInterstitial: number; winsSince: number };
  firstOpen: number;
  /** Mechanic intro cards already shown. */
  seen: Record<string, boolean>;
  rated: boolean;
  /** «گاراژ من»: car keys and the classics restored so far. */
  garage: { keys: number; restored: string[] };
  /** Testers: every level selectable. */
  devUnlock?: boolean;
  /** «ساعت شلوغی»: the last day it was beaten and the streak of days in a row. */
  rush: { day: string; streak: number };
  /** «شب یلدا» event: the year it was played and how many of its nights are done. */
  yalda: { year: number; done: number };
  /** «نوروز» event: the year it was played and how many «سین»s are collected. */
  nowruz: { year: number; done: number };
  /** «آژانس آقاجون»: unspent stars and the renovations done. `init` marks the one-off grant for levels won before stars existed. */
  agency: { stars: number; done: string[]; init?: boolean };
  /** Lives «جون»: how many, and when the next one grows back (ms timestamp, 0 when full). */
  lives: { n: number; next: number };
  /** «قلک»: coins saved up from wins, paid out when it is broken open. */
  piggy: number;
  /** «پشت‌سرهم»: new Journey levels won in a row (see streak.ts). */
  streak: number;
  /** Attempts, losses and wins per Journey level (see levelstats.ts). */
  lvStats: Record<string, [number, number, number]>;
  /** «کارت بلیت»: this month's punches, stations collected on each track, and the premium card. */
  pass: { month: string; punches: number; free: number[]; prem: number[]; premium: boolean };
}

const KEY = 'rahbandoon.save.v1', BAK = KEY + '.bak';
export const SAVE_VERSION = 1;
const fresh = (): Save => ({
  v: SAVE_VERSION,
  level: 0,
  coins: 200,
  boosters: { crane: 2, whistle: 2, bay: 2 },
  settings: { sound: true, music: true, haptics: true, colorblind: false, quality: 'auto', sfxVol: 90, musicVol: 70, reduceMotion: null, bigText: false, notify: false },
  notifyAsked: false,
  opens: [],
  stats: { wins: 0, losses: 0, people: 0, bestCombo: 0, clean: 0, bosses: 0, bestRush: 0 },
  ach: {},
  achSeen: {},
  owned: { starter: false, no_ads: false },
  daily: { day: '', streak: 0 },
  ads: { lastInterstitial: 0, winsSince: 0 },
  firstOpen: Date.now(),
  seen: {},
  rated: false,
  garage: { keys: 0, restored: [] },
  rush: { day: '', streak: 0 },
  yalda: { year: 0, done: 0 },
  nowruz: { year: 0, done: 0 },
  agency: { stars: 0, done: [], init: true },
  lives: { n: 5, next: 0 },
  piggy: 0,
  streak: 0,
  lvStats: {},
  pass: { month: '', punches: 0, free: [], prem: [], premium: false },
});

/** A stored save, if it parses and looks like one. */
function read(key: string): Partial<Save> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Save> | null;
    return s && typeof s === 'object' && typeof s.level === 'number' && typeof s.coins === 'number' ? s : null;
  } catch { return null; }
}

function load(): Save {
  try {
    // The main copy, or the backup when the main one is missing or spoiled.
    const s = read(KEY) ?? read(BAK);
    if (s) {
      const f = fresh();
      // Saves from before the volume sliders: a switched-off sound or music starts at zero.
      const st = { ...f.settings, ...s.settings };
      if (s.settings && s.settings.sfxVol === undefined && s.settings.sound === false) st.sfxVol = 0;
      if (s.settings && s.settings.musicVol === undefined && s.settings.music === false) st.musicVol = 0;
      st.sound = st.sfxVol > 0; st.music = st.musicVol > 0;
      return {
        ...f, ...s, v: SAVE_VERSION,
        boosters: { ...f.boosters, ...s.boosters }, settings: st, stats: { ...f.stats, ...s.stats },
        owned: { ...f.owned, ...s.owned }, daily: { ...f.daily, ...s.daily }, ads: { ...f.ads, ...s.ads }, seen: { ...s.seen }, ach: { ...s.ach }, achSeen: { ...s.achSeen }, garage: { ...f.garage, ...s.garage }, rush: { ...f.rush, ...s.rush }, yalda: { ...f.yalda, ...s.yalda }, nowruz: { ...f.nowruz, ...s.nowruz }, lives: { ...f.lives, ...s.lives }, pass: { ...f.pass, ...s.pass }, agency: s.agency ? { ...f.agency, ...s.agency } : { stars: 0, done: [] },
      };
    }
  } catch { /* corrupted or blocked storage: start fresh */ }
  return fresh();
}

export const save: Save = load();
export function persist() {
  let json: string;
  try { json = JSON.stringify(save); } catch { return; }
  // One write each; if either fails or is cut short, the other still holds a whole save.
  try { localStorage.setItem(KEY, json); } catch { /* storage unavailable or full */ }
  try { localStorage.setItem(BAK, json); } catch { /* storage unavailable or full */ }
}
