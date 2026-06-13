/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy shipped with the static build.
 *
 * SECURITY (requirement #4): a strict policy is the single most effective
 * defense for a client-only app that renders user input.
 *  - `script-src 'self'`  → no inline scripts, no eval, no remote JS.
 *  - `object-src 'none'`  → blocks <object>/<embed> plugin vectors.
 *  - `base-uri 'self'`    → blocks <base> tag hijacking of relative URLs.
 *  - `connect-src 'none'` → the app makes ZERO network calls. This turns the
 *                            "your diagrams never leave the browser" promise
 *                            into a browser-enforced guarantee.
 *  - `frame-ancestors 'none'` → clickjacking protection (equivalent of
 *                            X-Frame-Options: DENY, but expressible in a meta tag).
 *  - `'unsafe-inline'` is allowed for *styles only* — Mermaid injects inline
 *    <style> blocks and style attributes into its SVG. Scripts stay locked down.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * Injects the CSP + referrer meta tags into the built index.html.
 *
 * Why build-only (`apply: 'build'`): Vite's dev server relies on an inline
 * bootstrap script for HMR, which a strict `script-src 'self'` would block. By
 * injecting at build time we keep `npm run dev` working while still shipping a
 * strict policy to static hosts that cannot set headers (e.g. GitHub Pages).
 * For platforms that CAN set headers (Vercel/Netlify) the same policy is also
 * defined as a real response header — see vercel.json / README.
 */
function securityMetaPlugin(): PluginOption {
  return {
    name: 'archviz:security-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const meta =
        `    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n` +
        `    <meta name="referrer" content="no-referrer" />\n`;
      return html.replace('  </head>', `${meta}  </head>`);
    },
  };
}

export default defineConfig({
  // Relative base so the static build works from any path: a custom domain,
  // a Vercel root deploy, or a GitHub Pages project subpath (/repo/).
  base: './',
  plugins: [react(), securityMetaPlugin()],
  build: {
    target: 'es2020',
    sourcemap: false,
    // Mermaid is loaded as its own lazily-imported chunk; raise the limit so a
    // clean `npm run build` produces no chunk-size warnings.
    chunkSizeWarningLimit: 3000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
