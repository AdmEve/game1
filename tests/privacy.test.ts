import { describe, expect, it } from 'vitest';
import POLICY from '../store/privacy-fa.md?raw';
import { policyHtml } from '../src/ui/privacy';

describe('privacy policy (in the game and on the store page, one text)', () => {
  it('renders the store text: title, sections, lists and paragraphs', () => {
    const html = policyHtml();
    expect(html.startsWith('<h2>حریم خصوصی در راه‌بندون</h2>')).toBe(true);
    for (const h of ['خلاصه', 'تبلیغات', 'خرید درون‌برنامه‌ای', 'اعلان‌ها', 'اشتراک‌گذاری', 'دسترسی‌های برنامه', 'کودکان']) expect(html).toContain(`<h3>${h}</h3>`);
    expect((html.match(/<li>/g) ?? []).length).toBe((POLICY.match(/^- /gm) ?? []).length);
    expect(html).not.toContain('##');
  });

  it('names the services the app really uses, and escapes markup', () => {
    expect(POLICY).toContain('تپسل');
    expect(POLICY).toContain('کافه‌بازار');
    expect(policyHtml('# a\n\n- <b>x</b> & y\n\ntext')).toBe('<h2>a</h2><ul><li>&lt;b&gt;x&lt;/b&gt; &amp; y</li></ul><p>text</p>');
  });
});
