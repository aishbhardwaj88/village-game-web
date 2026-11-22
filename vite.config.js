import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/village-game-web/',
  // Cache-busting token for the raw files under public/assets/ (textures, grass, trees).
  // Vite copies public/ verbatim with NO content hash in the filename (unlike the hashed
  // JS/CSS chunks below), so a texture that changes content at the same URL (e.g. a
  // material swap) can keep serving the OLD bytes from the browser's own cache or GitHub
  // Pages' CDN after a deploy, even though the new file really is live on the server - her
  // "textures aren't updated, boards still look the same" report, 23 Nov. Every texture load
  // now appends ?v=<this>, so a changed texture gets a changed URL and is never served stale.
  // Bumped automatically every build (process.argv has no stable "nothing changed" case worth
  // optimising for - a cheap always-different token is simpler and safer than trying to hash
  // public/assets/ ourselves here).
  define: {
    __ASSET_V__: JSON.stringify(Date.now().toString(36)),
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
