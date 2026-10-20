import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/village-game-web/',
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
