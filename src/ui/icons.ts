/** Monochrome line icons (24×24, stroke = currentColor) for the premium UI, in place of colorful emoji. */
const P: Record<string, string> = {
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.2"/><path d="M12 9.5v5"/>',
  person: '<circle cx="12" cy="7" r="3.3"/><path d="M5.5 21v-1.6a5.4 5.4 0 0 1 5.4-5.4h2.2a5.4 5.4 0 0 1 5.4 5.4V21"/>',
  crane: '<path d="M4 21h9M8 21V4h12M8 4l3.5-2M8 9l5-5M17 4v6"/><rect x="15" y="10" width="4" height="3" rx=".5"/>',
  whistle: '<path d="M3.5 14a5 5 0 1 0 10 0h7v-4H10a5 5 0 0 0-6.5 4z"/><path d="M14 10V7"/><circle cx="8.5" cy="14" r="1.2"/>',
  parking: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M9.5 17V7.5h3.6a3 3 0 0 1 0 6H9.5"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6a6 6 0 0 1 7.9-7.9z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  trophy: '<path d="M8 21h8M12 16.5V21M7 3.5h10v5.5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4v1.5a3 3 0 0 0 3 3M17 5.5h3v1.5a3 3 0 0 1-3 3"/>',
  ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14.5 7.5v2M14.5 11v2M14.5 14.5v2"/>',
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5M10 20v-5.5h4V20"/>',
  key: '<circle cx="7.5" cy="15.5" r="4"/><path d="M10.4 12.6 20 3M16.5 6.5l2.2 2.2M18.7 4.3l2 2"/>',
  star: '<path d="m12 3.2 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.6l6-.9z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  pin: '<path d="M12 21s-6.5-5.9-6.5-11a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  heart: '<path d="M12 20s-7.4-4.5-9.3-9A4.9 4.9 0 0 1 12 6.6 4.9 4.9 0 0 1 21.3 11c-1.9 4.5-9.3 9-9.3 9z"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.8l2.4 1.6M9.5 2.5h5"/>',
  tap: '<path d="M9 11.5V5.2a1.6 1.6 0 0 1 3.2 0v5.6M12.2 10.2V9a1.6 1.6 0 0 1 3.2 0v1.8M15.4 10.6a1.6 1.6 0 0 1 3.2 0v4a6.4 6.4 0 0 1-6.4 6.4h-.9a6 6 0 0 1-5-2.6l-2.3-3.5a1.6 1.6 0 0 1 2.6-1.8L9 15"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  radio: '<rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M7 8l9-4.5"/><circle cx="15.5" cy="14" r="3"/><path d="M6.5 12.5h3M6.5 15.5h3"/>',
  camera: '<path d="M4 8h3l2-2.8h6L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
  shield: '<path d="M12 3 19 6v5.2c0 4.7-3.2 8.2-7 9.8-3.8-1.6-7-5.1-7-9.8V6z"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  chevron: '<path d="m14.5 6-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
};
export function icon(name: keyof typeof P | string, cls = 'ico'): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ''}</svg>`;
}
