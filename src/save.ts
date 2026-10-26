/** Player progress, kept in localStorage. */
export interface Save {
  level: number;
  coins: number;
  boosters: { crane: number; whistle: number; bay: number };
  settings: { sound: boolean; music: boolean; haptics: boolean };
  stats: { wins: number; losses: number };
}

const KEY = 'rahbandoon.save.v1';
const fresh = (): Save => ({
  level: 0,
  coins: 200,
  boosters: { crane: 2, whistle: 2, bay: 2 },
  settings: { sound: true, music: true, haptics: true },
  stats: { wins: 0, losses: 0 },
});

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Save>;
      const f = fresh();
      return { ...f, ...s, boosters: { ...f.boosters, ...s.boosters }, settings: { ...f.settings, ...s.settings }, stats: { ...f.stats, ...s.stats } };
    }
  } catch { /* corrupted or blocked storage: start fresh */ }
  return fresh();
}

export const save: Save = load();
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
}
