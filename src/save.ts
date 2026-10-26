/** Player progress, kept in localStorage. */
export interface Save {
  level: number;
  coins: number;
  boosters: { crane: number; whistle: number; bay: number };
  settings: { sound: boolean; music: boolean; haptics: boolean; colorblind: boolean };
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
}

const KEY = 'rahbandoon.save.v1';
const fresh = (): Save => ({
  level: 0,
  coins: 200,
  boosters: { crane: 2, whistle: 2, bay: 2 },
  settings: { sound: true, music: true, haptics: true, colorblind: false },
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
});

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Save>;
      const f = fresh();
      return {
        ...f, ...s,
        boosters: { ...f.boosters, ...s.boosters }, settings: { ...f.settings, ...s.settings }, stats: { ...f.stats, ...s.stats },
        owned: { ...f.owned, ...s.owned }, daily: { ...f.daily, ...s.daily }, ads: { ...f.ads, ...s.ads }, seen: { ...s.seen }, ach: { ...s.ach }, achSeen: { ...s.achSeen }, garage: { ...f.garage, ...s.garage }, rush: { ...f.rush, ...s.rush }, yalda: { ...f.yalda, ...s.yalda },
      };
    }
  } catch { /* corrupted or blocked storage: start fresh */ }
  return fresh();
}

export const save: Save = load();
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
}
