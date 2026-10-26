/** Player progress, kept in localStorage. */
export interface Save {
  level: number;
  coins: number;
  boosters: { crane: number; whistle: number; bay: number };
  settings: { sound: boolean; music: boolean; haptics: boolean };
  stats: { wins: number; losses: number };
  owned: { starter: boolean; no_ads: boolean };
  daily: { day: string; streak: number };
  ads: { lastInterstitial: number; winsSince: number };
  firstOpen: number;
  /** Mechanic intro cards already shown. */
  seen: Record<string, boolean>;
  rated: boolean;
  /** «گاراژ من»: car keys and the classics restored so far. */
  garage: { keys: number; restored: string[] };
}

const KEY = 'rahbandoon.save.v1';
const fresh = (): Save => ({
  level: 0,
  coins: 200,
  boosters: { crane: 2, whistle: 2, bay: 2 },
  settings: { sound: true, music: true, haptics: true },
  stats: { wins: 0, losses: 0 },
  owned: { starter: false, no_ads: false },
  daily: { day: '', streak: 0 },
  ads: { lastInterstitial: 0, winsSince: 0 },
  firstOpen: Date.now(),
  seen: {},
  rated: false,
  garage: { keys: 0, restored: [] },
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
        owned: { ...f.owned, ...s.owned }, daily: { ...f.daily, ...s.daily }, ads: { ...f.ads, ...s.ads }, seen: { ...s.seen }, garage: { ...f.garage, ...s.garage },
      };
    }
  } catch { /* corrupted or blocked storage: start fresh */ }
  return fresh();
}

export const save: Save = load();
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
}
