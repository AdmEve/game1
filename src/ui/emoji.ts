/** Twemoji images (copied into public/emoji by scripts/copy-emoji.mjs) so emoji look the same on every phone. */
export function codeOf(e: string): string {
  const cps = [...e].map((ch) => ch.codePointAt(0)!.toString(16));
  return (e.includes('‍') ? cps : cps.filter((c) => c !== 'fe0f')).join('-');
}
export const emo = (e: string, cls = 'emo') => `<img class="${cls}" src="emoji/${codeOf(e)}.svg" alt="${e}" draggable="false">`;
