import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import pkg from './package.json';

/** The commit this build was made from, shown in Settings so testers know which version they run. */
const build = (() => { try { return process.env.GITHUB_SHA?.slice(0, 7) ?? execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: JSON.stringify(build) },
  build: { target: 'es2019', assetsInlineLimit: 0 },
});
