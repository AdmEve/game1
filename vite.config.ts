import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import pkg from './package.json';

/** The commit this build was made from, shown in Settings so testers know which version they run. */
const build = (() => { try { return process.env.GITHUB_SHA?.slice(0, 7) ?? execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();

/** The store this build is for: VITE_STORE=myket for Myket's, Cafe Bazaar's otherwise (src/config.ts STORE). */
const store = process.env.VITE_STORE === 'myket' ? 'myket' : 'bazaar';

export default defineConfig({
  base: './',
  plugins: [{
    // The privacy policy (store/privacy-fa.md, shown in Settings) names Cafe Bazaar; Myket's build names Myket instead.
    name: 'store-policy',
    transform: (code, id) => (store === 'myket' && id.includes('privacy-fa.md') ? code.split('کافه‌بازار').join('مایکت') : null),
  }],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: JSON.stringify(build),
    __STORE__: JSON.stringify(store),
  },
  // CSS for the oldest WebView the app accepts (capacitor.config.json: minWebViewVersion 84): without this the
  // minifier folds top/right/bottom/left back into `inset`, which Chrome only reads from 87.
  build: { target: 'es2019', cssTarget: 'chrome84', assetsInlineLimit: 0 },
});
