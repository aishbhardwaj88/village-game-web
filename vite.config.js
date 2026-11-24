import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// Cache-busting token for the raw files under public/assets/ (textures, grass, trees).
// Vite copies public/ verbatim with NO content hash in the filename (unlike the hashed
// JS/CSS chunks below), so a texture that changes content at the same URL (e.g. a
// material swap) can keep serving the OLD bytes from the browser's own cache or GitHub
// Pages' CDN after a deploy, even though the new file really is live on the server - her
// "textures aren't updated, boards still look the same" report, 23 Nov. Every texture load
// appends ?v=<this>, so a changed texture gets a changed URL and is never served stale.
// Bumped automatically every build (process.argv has no stable "nothing changed" case worth
// optimising for - a cheap always-different token is simpler and safer than trying to hash
// public/assets/ ourselves here). Computed ONCE here (not inline in `define`) so the index.html
// preload plugin below can stamp the identical token onto its <link preload> hrefs - see that
// plugin's comment for why they must match exactly.
const ASSET_V = Date.now().toString(36);

// The opening-view <link rel="preload" ...> texture tags in index.html (docs/perf-2026-11-08.md) had two
// separate bugs that each caused every one of those textures to download TWICE before Play - measured 24 Nov
// (efficiency item 7, "textures fetched twice"): 38-41 duplicate requests, ~3.5 MB wasted, confirmed with
// real CDP Network-domain capture (encodedDataLength per request, not just a byte-count that double-counts a
// reused preload), not just a repeated URL in the page's own request log.
//   1. The tags were bare (no ?v=), while every real texture load goes through materials.js's bust() (and
//      trees.js's/sharedTextures.js's own bust()-ed loads), which appends ?v=<ASSET_V>. A preload and a later
//      fetch of a DIFFERENT url for the same file are two separate cache entries. Fixed by stamping the same
//      ?v=<ASSET_V> onto the preload href below, so it is the exact url the real load requests.
//   2. Even URL-matched, the tags said `as="image"`, but the actual loader (src/frameQueue.js's bitmap-patched
//      TextureLoader.load) fetches via plain `fetch()`, not an <img>/background-image - a preload's `as` is
//      matched against the REQUEST DESTINATION, and "image" only matches an <img>/CSS load, never a fetch()
//      call, so the preload was always a wasted, unmatched download whatever its URL said (confirmed directly:
//      swapping as="image" for as="fetch", same as the .glb model preloads a few lines down already correctly
//      use, collapses 2 real network transfers of the same url into 1). index.html's own tags are now written
//      as="fetch" directly (fixed at the source, like the .glb ones); this plugin only has to add the token.
function bustPreloadsPlugin() {
  return {
    name: 'bust-image-preloads',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          /(<link rel="preload" as="fetch"[^>]*href="[^"]*?\.webp)(")/g,
          (_m, pre) => `${pre}?v=${ASSET_V}"`,
        );
      },
    },
  };
}

export default defineConfig({
  base: '/village-game-web/',
  plugins: [genModelManifestPlugin(), bustPreloadsPlugin()],
  define: {
    __ASSET_V__: JSON.stringify(ASSET_V),
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
});
