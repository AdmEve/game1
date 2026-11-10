/**
 * Characters speak (L2; GDD §5 wants them voiced): a card's line from Mash Rahim, Ms. Sabouri or Mr. Ajool writes
 * itself in, a syllable at a time, in the character's voice (audio.ts: babble until actors record lines). The words
 * hold their places from the start, unseen until reached, so nothing on the card moves; a tap anywhere on the card
 * shows the rest at once. With reduced motion the line is there at once and only says hello.
 */
import { squelch, syllable, VOICES, type Voice } from '../audio';

/** Letters per second: the old driver takes his time, the dispatcher is brisk, Mr. Ajool is in a hurry. */
const PACE: Record<Voice, number> = { rahim: 30, sabouri: 38, ajool: 50 };
/** A breath after punctuation (ms). */
const PAUSE: Record<string, number> = { '،': 140, ',': 140, '؛': 180, '.': 260, '!': 260, '؟': 280, '?': 280, '…': 300, ':': 160 };
const LETTER = /[؀-ۿA-Za-z]/;

/** The vowel a letter suggests (Persian writes few vowels: a fixed guess from the letter, so a line always sounds the same). */
function vowelOf(ch: string, i: number): number {
  if (ch === 'ا' || ch === 'آ') return 0;
  if (ch === 'ی' || ch === 'ي') return i % 3 ? 3 : 2;
  if (ch === 'و') return i % 2 ? 5 : 4;
  if (ch === 'ه') return 2;
  return [1, 2, 4, 1, 0][ch.charCodeAt(0) % 5];
}

/** One step of a line being said: how many letters are shown after it, the wait before the next, and its syllable. */
export interface Step { upto: number; wait: number; syl?: { vowel: number; lift: number; wobble: number } }

/**
 * How a line is said (the same every time): a letter at the speaker's pace, a breath after punctuation, a run of
 * spaces and line breaks from the card's markup as one space, and a syllable every third letter, rising before a
 * question and falling at a sentence's end.
 */
export function plan(text: string, who: Voice): Step[] {
  const steps: Step[] = [];
  let i = 0, letters = 0;
  while (i < text.length) {
    const ch = text[i++];
    if (/\s/.test(ch)) while (/\s/.test(text[i] ?? '')) i++;
    const step: Step = { upto: i, wait: 1000 / PACE[who] + (PAUSE[ch] ?? 0) };
    if (LETTER.test(ch) && letters++ % 3 === 0) {
      const ahead = text.slice(i, i + 4);
      step.syl = { vowel: vowelOf(ch, i), lift: /[؟?]/.test(ahead) ? 0.22 : /[.!…]/.test(ahead) ? -0.1 : 0, wobble: Math.sin(i * 1.7) };
    }
    steps.push(step);
  }
  return steps;
}

/** What a line is made of, past the speaker's name: its text, and the icons in it (with where in the text they sit). */
function lineParts(line: HTMLElement): { nodes: Text[]; icons: { el: HTMLElement | SVGElement; at: number }[] } {
  const nodes: Text[] = [], icons: { el: HTMLElement | SVGElement; at: number }[] = [];
  const label = line.firstElementChild?.matches('.who, b') && /:\s*$/.test(line.firstElementChild.textContent ?? '') ? line.firstElementChild : null;
  const tw = document.createTreeWalker(line, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let at = 0;
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (label?.contains(n)) continue;
    if (n instanceof Text) { if (n.textContent) { nodes.push(n); at += n.textContent.length; } }
    else if ((n as Element).matches('img, svg')) icons.push({ el: n as HTMLElement | SVGElement, at });
  }
  return { nodes, icons };
}

/** Three syllables in a character's voice («سلام!»-ish): reduced motion's line, and the voices switch turned on. */
export function hello(who: Voice) {
  if (who === 'sabouri') squelch();
  [0, 2, 3].forEach((v, k) => setTimeout(() => syllable(who, v, k === 2 ? -0.08 : 0, k === 1 ? 0.5 : -0.3), 160 + k * 1100 * VOICES[who].len));
}

const quiet = () => /[?&]shot\b/.test(location.search);
const still = () => document.documentElement.classList.contains('reduce-motion');

/** Start the first character line on a card speaking (does nothing on a card without one). */
export function talk(card: HTMLElement) {
  const sp = card.querySelector<HTMLElement>('.speech, .beaten');
  if (!sp || sp.dataset.said) return;
  sp.dataset.said = '1';
  const who = (sp.querySelector('[data-who]') ?? card.querySelector('[data-who]'))?.getAttribute('data-who') as Voice | null;
  if (!who || !(who in VOICES)) return;
  const line = sp.matches('.with-face, .beaten') ? sp.querySelector<HTMLElement>(':scope > div') ?? sp : sp;
  const { nodes, icons } = lineParts(line);
  const text = nodes.map((n) => n.textContent ?? '').join('');
  if (!text.trim() || quiet()) return;
  // Reduced motion: the words at once, and a short hello in the voice.
  if (still()) { hello(who); return; }
  // Each text node becomes what's said so far, then the rest (laid out but unseen).
  const parts = nodes.map((n) => {
    const rest = document.createElement('span'); rest.className = 'tw-rest'; rest.textContent = n.textContent;
    n.after(rest); n.textContent = '';
    return { said: n, rest, full: rest.textContent ?? '' };
  });
  const steps = plan(text, who);
  let next = 0, timer = 0;
  const show = (k: number) => {
    let left = k;
    for (const p of parts) {
      const n = Math.max(0, Math.min(p.full.length, left));
      p.said.textContent = p.full.slice(0, n); p.rest.textContent = p.full.slice(n);
      left -= p.full.length;
    }
    for (const ic of icons) ic.el.style.visibility = k > ic.at ? '' : 'hidden';
  };
  const done = () => {
    clearTimeout(timer);
    for (const p of parts) { p.said.textContent = p.full; p.rest.remove(); }
    for (const ic of icons) ic.el.style.visibility = '';
    card.removeEventListener('pointerdown', done, true);
    if (who === 'sabouri' && sp.isConnected) squelch(0.05);
  };
  card.addEventListener('pointerdown', done, true);
  const step = () => {
    // The card closed (or is closing): stop, silently.
    if (!sp.isConnected || sp.closest('.modal-back.out')) { clearTimeout(timer); card.removeEventListener('pointerdown', done, true); return; }
    if (next >= steps.length) { done(); return; }
    const st = steps[next++];
    show(st.upto);
    if (st.syl) syllable(who, st.syl.vowel, st.syl.lift, st.syl.wobble);
    timer = window.setTimeout(step, st.wait);
  };
  show(0);
  // After the card's pop, once nothing covers it (a level's veil), and after a card's own entrance (the boss's drums).
  const begin = () => {
    if (!sp.isConnected) return;
    if (document.querySelector('.veil.on')) { timer = window.setTimeout(begin, 120); return; }
    if (who === 'sabouri') squelch(0.18);
    timer = window.setTimeout(step, 260 + Number(sp.dataset.talkAfter ?? 0));
  };
  begin();
}
