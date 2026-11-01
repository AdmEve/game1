/** Twemoji images (copied into public/emoji by scripts/copy-emoji.mjs) so emoji look the same on every phone. */
export function codeOf(e: string): string {
  const cps = [...e].map((ch) => ch.codePointAt(0)!.toString(16));
  return (e.includes('‍') ? cps : cps.filter((c) => c !== 'fe0f')).join('-');
}
import { icon } from './icons';

/** Emoji that have a line icon are drawn as the icon (the premium UI); the rest stay as flavorful Twemoji. */
const AS_ICON: Record<string, string> = {
  '🪙': 'coin', '🔑': 'key', '⭐': 'star', '🎬': 'play', '🎁': 'gift', '🗺️': 'map', '🔧': 'wrench', '📜': 'doc', '🏆': 'trophy', '❤️': 'heart',
  '✅': 'check', '🧍': 'person', '🔒': 'lock', '📻': 'radio', '📖': 'book', '👆': 'tap', '🏠': 'home', '🎫': 'ticket', '⚙️': 'settings', '⏰': 'clock',
  '🏅': 'medal', '🔨': 'hammer', '⏱️': 'timer', '📍': 'pin', '📸': 'camera', '🅿️': 'parking',
};
const TINT: Record<string, string> = { coin: ' coin', star: ' star', heart: ' heart', key: ' key' };
export const emo = (e: string, cls = 'emo') => {
  const name = AS_ICON[e];
  if (name) return icon(name, cls.replace(/\bemo\b/, 'ico') + (TINT[name] ?? ''));
  return `<img class="${cls}" src="emoji/${codeOf(e)}.svg" alt="${e}" draggable="false">`;
};
