/**
 * What a tester can send about their phone: its GPU, the render profile in use, the screen, and the last few cold
 * starts broken down by stage. Headless browsers can't measure real start-up (software GL makes every frame slow),
 * so this is how start-up gets measured on the phones that matter.
 */
const KEY = 'rahbandoon.boots';
type Boot = { at: string; ready: number } & Record<string, number | string>;

/** Store this start's stage timings (the boot's `performance.measure` entries); the last five are kept. */
export function recordBoot(): void {
  try {
    const stages = Object.fromEntries(performance.getEntriesByType('measure').map((e) => [e.name, Math.round(e.duration)]));
    const list: Boot[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    list.push({ at: new Date().toISOString().slice(0, 16).replace('T', ' '), ready: Math.round(performance.now()), ...stages });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-5)));
  } catch { /* no storage: nothing to keep */ }
}

export function boots(): Boot[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

/** The GPU's own name (e.g. "Adreno (TM) 610"), when the browser tells it. */
export function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  } catch { return 'unknown'; }
}

/** The report as plain text, one fact per line; `facts` are lines the caller adds (profile, governor). */
export function deviceReport(head: string, gl: WebGLRenderingContext | WebGL2RenderingContext, facts: Record<string, string>): string {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lines = [
    head,
    navigator.userAgent,
    `GPU: ${gpuName(gl)}`,
    `Screen: ${screen.width}x${screen.height} @${devicePixelRatio}, view ${innerWidth}x${innerHeight}`,
    `Memory: ${nav.deviceMemory ?? '?'} GB, cores ${navigator.hardwareConcurrency ?? '?'}`,
    ...Object.entries(facts).map(([k, v]) => `${k}: ${v}`),
    '',
    'Cold starts (ms from page start; ready, then each stage):',
    ...boots().map((b) => {
      const { at, ready, ...stages } = b;
      return `${at}  ready ${ready}  ` + Object.entries(stages).map(([k, v]) => `${k} ${v}`).join(' · ');
    }),
  ];
  return lines.join('\n');
}
