/** Twemoji rendering: emoji in text become <img> tags pointing at the copied SVGs. */

const RE = /(?:\p{RI}\p{RI}|[#*0-9]️?⃣|\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?)*)/gu;

export function codeOf(e: string): string {
  const cps = [...e].map((ch) => ch.codePointAt(0)!.toString(16));
  return (e.includes('‍') ? cps : cps.filter((c) => c !== 'fe0f')).join('-');
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
}

export function emo(e: string, cls = 'emo'): string {
  return `<img class="${cls}" src="./emoji/${codeOf(e)}.svg" alt="${e}" draggable="false">`;
}

/** Escape text, turn emoji into images and newlines into breaks. */
export function rich(text: string): string {
  return esc(text).replace(RE, (m) => emo(m)).replace(/\n/g, '<br>');
}

/** Character avatar for an age and gender. */
export function avatarEmoji(age: number, gender: 'm' | 'f', skin: number, beard = false): string {
  const tone = ['🏻', '🏼', '🏽', '🏾'][skin] ?? '';
  let base: string;
  if (age < 3) base = '👶';
  else if (age < 16) base = gender === 'm' ? '👦' : '👧';
  else if (age < 60) base = gender === 'm' ? (beard ? '🧔' : '👨') : '👩';
  else base = gender === 'm' ? '👴' : '👵';
  return base + tone;
}
