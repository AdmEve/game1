/** Persian number and money formatting. Everything the player sees goes through here. */

const FA = '۰۱۲۳۴۵۶۷۸۹';

export function fa(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => FA[+d]).replace(/\./g, '٫').replace(/-/g, '−');
}

/** 1234567 → ۱٬۲۳۴٬۵۶۷ */
export function num(n: number): string {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return (neg ? '−' : '') + fa(s);
}

function short(x: number): string {
  if (x >= 100) return fa(Math.round(x));
  if (x >= 10) return fa(Math.round(x * 10) / 10);
  return fa(Math.round(x * 10) / 10);
}

/** Money in the way people say it: «۲۷۰ میلیون تومان», «۱٫۵ میلیارد تومان». */
export function money(n: number, unit = 'تومان'): string {
  const neg = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (a < 1000) s = `${fa(Math.round(a))} ${unit}`;
  else if (a < 1e6) s = `${short(a / 1e3)} هزار ${unit}`;
  else if (a < 1e9) s = `${short(a / 1e6)} میلیون ${unit}`;
  else if (a < 1e12) s = `${short(a / 1e9)} میلیارد ${unit}`;
  else if (a < 1e15) s = `${short(a / 1e12)} هزار میلیارد ${unit}`;
  else s = `${short(a / 1e15)} میلیون میلیارد ${unit}`;
  return neg ? `منفی ${s}` : s;
}

/** Compact money for tight places (top bar): «۲۷۰م», «۱٫۵ میلیارد». */
export function moneyShort(n: number): string {
  const neg = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (a < 1e6) s = `${short(a / 1e3)} هزار`;
  else if (a < 1e9) s = `${short(a / 1e6)} میلیون`;
  else if (a < 1e12) s = `${short(a / 1e9)} میلیارد`;
  else if (a < 1e15) s = `${short(a / 1e12)} هزار میلیارد`;
  else s = `${short(a / 1e15)} میلیون میلیارد`;
  return (neg ? '−' : '') + s;
}

export function pct(x: number): string {
  return `${fa(Math.round(x * 100))}٪`;
}

/** Ordinal for school grades etc: 1 → «اول». */
const ORD = ['', 'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم'];
export function ordinal(n: number): string {
  return ORD[n] ?? `${fa(n)}م`;
}

/** GPA out of 20 with two decimals at most: 17.25 → «۱۷٫۲۵». */
export function gpa(x: number): string {
  return fa(Math.round(x * 100) / 100);
}
