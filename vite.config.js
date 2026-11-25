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

// Writes the build manifest (current chunk names + asset hashes) into dist/sw.js, so the service worker's 'prune' knows
// what is current. Placeholder lives in public/sw.js.
function swManifestPlugin(hashes) {
  const chunks = [];
  return {
    name: 'sw-manifest',
    apply: 'build',
    enforce: 'post',
    generateBundle(_o, bundle) { for (const f of Object.keys(bundle)) if (/\.(js|css|json)$/.test(f)) chunks.push(f); },
    closeBundle() {
      // inline <style> url() is minified after transformIndexHtml runs, so stamp the font url in the written html here
      for (const f of ['dist/index.html', 'dist/people.html']) {
        const hp = resolve(__dirname, f);
        if (!existsSync(hp)) continue;
        writeFileSync(hp, readFileSync(hp, 'utf8').replace(/(url\(['"]?[^)'"]*?\/)(fonts\/[^)'"?]+)/g, (m, pre, path) => (hashes[path] ? `${m}?v=${hashes[path]}` : m)));
      }
      const p = resolve(__dirname, 'dist/sw.js');
      if (!existsSync(p)) return;
      const manifest = { chunks, assets: Object.entries(hashes).map(([k, v]) => `${k}?v=${v}`) };
      writeFileSync(p, readFileSync(p, 'utf8').replace(/\/\*MANIFEST\*\/[\s\S]*?\/\*END\*\//, () => `/*MANIFEST*/${JSON.stringify(manifest)}/*END*/`));
    },
  };
}

// Task C1 (25 Nov): the land map was shipped twice. src/layout/mapData.json (packed, in the main chunk) already holds the
// same ring points as docs/layout/approved-map-2026-11-21.json for 1059 of 1643 objects, so the raw copy shipped to the
// browser keeps only what the packed copy lacks (places, roads, canal and the 584 objects that have no rings there).
// src/kit/landLayout.js hydrates the missing objects from the in-memory packed copy, giving back the EXACT raw export
// (this plugin checks that at build time and ships the full object whenever it would not). Dev server: raw file as before.
function landMapPlugin(command) {
  const RAW = resolve(__dirname, 'docs/layout/approved-map-2026-11-21.json');
  const PACK = resolve(__dirname, 'src/layout/mapData.json');
  const FIELDS = ['kind', 'label', 'color', 'y0', 'y1', 'y', 'rings'];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return {
    name: 'land-map-slim',
    resolveId(id) { return id === 'virtual:land-map-url' ? '\0virtual:land-map-url' : null; },
    load(id) {
      if (id !== '\0virtual:land-map-url') return null;
      if (command !== 'build') return `import u from '${RAW.replace(/\\/g, '/')}?url'; export default u; export const SLIM = false;`;
      const raw = JSON.parse(readFileSync(RAW, 'utf8'));
      const pack = JSON.parse(readFileSync(PACK, 'utf8'));
      let nulled = 0;
      const objects = raw.objects.map((o, i) => {
        const q = pack.objects[i];
        if (q && FIELDS.every((k) => same(o[k], q[k])) && Object.keys(o).length === FIELDS.length) { nulled++; return null; }
        return o;
      });
      this.addWatchFile(RAW); this.addWatchFile(PACK);
      const ref = this.emitFile({ type: 'asset', name: 'land-map-slim.json', source: JSON.stringify({ ...raw, objects }) });
      this.info(`land map: ${nulled}/${raw.objects.length} objects served from the packed copy`);
      return `export default import.meta.ROLLUP_FILE_URL_${ref}; export const SLIM = true;`;
    },
  };
}

export default defineConfig(({ command }) => {
  const hashes = command === 'build' ? computeAssetHashes() : {};
  return {
  base: '/village-game-web/',
  plugins: [landMapPlugin(command), genModelManifestPlugin(), bustPreloadsPlugin(hashes), swManifestPlugin(hashes)],
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
