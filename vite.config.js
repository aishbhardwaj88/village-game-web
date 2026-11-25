import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { computeAssetHashes } from './tools/asset-hashes.mjs';
import { genModelManifest, MODELS_DIR } from './tools/gen-model-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Keeps public/assets/models/manifest.json in sync while `vite` (the dev server) is running,
// so dropping a new slot .glb in and reloading (docs/asset-slots.md's whole workflow) works
// without a manual `npm run gen-manifest` step — src/assetSlots.js's urlExists() trusts this
// file instead of sending a live HEAD request per slot (24 Nov efficiency audit, B3).
function genModelManifestPlugin() {
  return {
    name: 'gen-model-manifest',
    configureServer(server) {
      genModelManifest({ log: (m) => server.config.logger.info(`[manifest] ${m}`) });
      const onGlbChange = (path) => {
        if (!path.endsWith('.glb')) return;
        genModelManifest({ log: (m) => server.config.logger.info(`[manifest] ${m}`) });
      };
      server.watcher.add(MODELS_DIR);
      server.watcher.on('add', onGlbChange).on('unlink', onGlbChange);
    },
  };
}

// Content hashes (25 Nov caching plan, task A): every file under public/assets and public/fonts gets the first 8 hex of
// its sha1 (tools/asset-hashes.mjs). Vite copies public/ verbatim with no hash in the filename, so the hash rides as ?v=
// (src/assetUrl.js ver()). Replaces the old per-build Date.now() token, which gave every texture a new URL on every
// deploy and threw every visitor's cache away. Same bytes now means the same URL, so repeat visits are near instant.
// Dev server: no hashes, plain urls.
function bustPreloadsPlugin(hashes) {
  // Stamps ?v=<hash> on the index.html preload hrefs and the font url(), so they are the exact url the real load requests
  // (a preload and a later fetch of a different url are two separate cache entries).
  return {
    name: 'hash-preloads',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!Object.keys(hashes).length) return html;
        return html.replace(/((?:href="|url\(['"]?)[^"')]*?\/)((?:assets|fonts)\/[^"')?]+)/g, (m, pre, path) => (hashes[path] ? `${m}?v=${hashes[path]}` : m));
      },
    },
  };
}

export default defineConfig(({ command }) => {
  const hashes = command === 'build' ? computeAssetHashes() : {};
  return {
  base: '/village-game-web/',
  plugins: [genModelManifestPlugin(), bustPreloadsPlugin(hashes)],
  define: {
    __ASSET_H__: JSON.stringify(hashes),
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      // people.html (docs/FINISH_LINE.md Step 2) — a people test page deployed
      // alongside the game but linked from nowhere IN the game, so it needs its
      // own build entry or `vite build` would silently drop it from dist/.
      input: {
        main: resolve(__dirname, 'index.html'),
        people: resolve(__dirname, 'people.html'),
      },
    },
  },
};
});
