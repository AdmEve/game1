/**
 * The privacy policy, in the game (Settings): the same text as the store listing's (store/privacy-fa.md), so the two
 * can't drift apart. The file only uses headings, paragraphs and "- " lists, which is all this renders. It names
 * Cafe Bazaar; Myket's build has Myket's name in its place (vite.config.ts).
 */
import POLICY from '../../store/privacy-fa.md?raw';
import { asBack, button, h, modal } from './hud';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The policy as HTML: `#` becomes the card title, `##` a section heading, `- ` lines a list, the rest paragraphs. */
export function policyHtml(md = POLICY): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`); list = []; } };
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue; }
    flush();
    if (!line) continue;
    if (line.startsWith('## ')) out.push(`<h3>${esc(line.slice(3))}</h3>`);
    else if (line.startsWith('# ')) out.push(`<h2>${esc(line.slice(2))}</h2>`);
    else out.push(`<p>${esc(line)}</p>`);
  }
  flush();
  return out.join('');
}

export function showPrivacy(onClose: () => void = () => {}) {
  const c = h('div', 'privacy');
  c.innerHTML = policyHtml();
  const close = modal(c, 'pop privacy-card');
  const foot = h('div', 'privacy-foot');
  foot.append(asBack(button('فهمیدم', 'primary big', () => { close(); onClose(); })));
  c.append(foot);
}
