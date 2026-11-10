/**
 * «مأموریت‌های امروز» (BEST_IN_MARKET_PLAN P4; GDD §5: Ms. Sabouri, the agency's dispatcher, gives the day's
 * missions over the radio). Three a day, the same for everyone at the same stage (picked from the date), each a short
 * goal with a coin reward, and a key for doing all three. Between a single level and the long-term medals, the
 * day's reason to play a little more. Pure logic here; the card is ui/today.ts.
 */
import type { Save } from './save';

export type MissionKind = 'win' | 'clean' | 'people' | 'combo' | 'hard' | 'rush' | 'dot';
export interface Mission { kind: MissionKind; goal: number; got: number; claimed: boolean }
export interface Missions { day: string; list: Mission[]; bonus: boolean }

/** What a mission asks, in Ms. Sabouri's words. */
export function missionText(m: Pick<Mission, 'kind' | 'goal'>, fa: (n: number) => string): string {
  switch (m.kind) {
    case 'win': return `${fa(m.goal)} مرحله ببر`;
    case 'clean': return 'یه مرحله رو بدون هیچ کمکی ببر';
    case 'people': return `${fa(m.goal)} مسافر سوار کن`;
    case 'combo': return `یه کمبوی ${fa(m.goal)}تایی بزن`;
    case 'hard': return 'یه مرحله‌ی سخت ببر';
    case 'rush': return 'ساعت شلوغی امروز رو رد کن';
    case 'dot': return 'یه نقطه‌ی طلایی بگیر (یه مرحله‌ی قبلی رو بدون کمک ببر)';
  }
}
export const MISSION_ICON: Record<MissionKind, string> = { win: '🏁', clean: '🧤', people: '🧍', combo: '🔥', hard: '👑', rush: '⏰', dot: '🏅' };
export const REWARD: Record<MissionKind, number> = { win: 60, clean: 80, people: 50, combo: 60, hard: 80, rush: 60, dot: 80 };
/** For all three: coins and a key. */
export const BONUS = { coins: 100, keys: 1 };
/** Missions start once the first levels are done (with the daily gift). */
export const MISSIONS_FROM = 3;

function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/**
 * The day's three, from the date and how far the player is: a "play" mission (win or passengers), a "how" mission
 * (clean, combo, hard), and a third (the rush, a gold dot, or passengers), never two of a kind. Goals grow a little
 * with progress.
 */
export function pickMissions(day: string, level: number): Mission[] {
  let seed = 17;
  for (const ch of day) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
  const r = rng(seed), pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const people = level < 30 ? 60 : level < 120 ? 100 : 150;
  const slot1: Mission[] = [{ kind: 'win', goal: level < 20 ? 2 : 3, got: 0, claimed: false }, { kind: 'people', goal: people, got: 0, claimed: false }];
  const slot2: Mission[] = [{ kind: 'clean', goal: 1, got: 0, claimed: false }, { kind: 'combo', goal: level < 30 ? 3 : 4, got: 0, claimed: false }];
  if (level >= 10) slot2.push({ kind: 'hard', goal: 1, got: 0, claimed: false });
  const slot3: Mission[] = [{ kind: 'rush', goal: 1, got: 0, claimed: false }];
  if (level >= 15) slot3.push({ kind: 'dot', goal: 1, got: 0, claimed: false });
  const a = pick(slot1), b = pick(slot2);
  let c = pick(slot3);
  if (c.kind === a.kind || c.kind === b.kind) c = slot3[0];
  return [a, b, c];
}

/** Today's missions, made afresh on a new day. */
export function todayMissions(save: Pick<Save, 'missions' | 'level'>, day: string): Missions {
  if (save.missions?.day !== day) save.missions = { day, list: pickMissions(day, save.level), bonus: false };
  return save.missions;
}

/** What happened in a level, as missions count it. */
export interface Played { won: boolean; clean?: boolean; hard?: boolean; people: number; combo: number; rush?: boolean; dot?: boolean }

/** Count a level played towards today's missions; returns the ones it just completed. */
export function countPlayed(ms: Missions, p: Played): Mission[] {
  const done: Mission[] = [];
  for (const m of ms.list) {
    if (m.got >= m.goal) continue;
    const add = m.kind === 'people' ? p.people
      : m.kind === 'combo' ? (p.combo >= m.goal ? m.goal : 0)
      : !p.won ? 0
      : m.kind === 'win' ? 1 : m.kind === 'clean' ? +!!p.clean : m.kind === 'hard' ? +!!p.hard : m.kind === 'rush' ? +!!p.rush : +!!p.dot;
    if (!add) continue;
    m.got = Math.min(m.goal, m.got + add);
    if (m.got >= m.goal) done.push(m);
  }
  return done;
}

/** Rewards waiting to be claimed: done missions not yet claimed, and the bonus once all three are claimed. */
export function claimableMissions(ms: Missions | undefined): number {
  if (!ms) return 0;
  const ready = ms.list.filter((m) => m.got >= m.goal && !m.claimed).length;
  const bonus = !ms.bonus && ms.list.every((m) => m.claimed) ? 1 : 0;
  return ready + bonus;
}
