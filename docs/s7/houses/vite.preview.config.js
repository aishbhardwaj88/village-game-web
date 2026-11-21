// Vite config for the houses preview shots only: no hot reload (edits made while shots render cannot reload the page) and its
// own cache folder (node_modules is shared between worktrees, so the default cache could serve another tree's code).
import { defineConfig } from 'vite';
export default defineConfig({ base: '/village-game-web/', cacheDir: 'tmp/.vite-houses', server: { hmr: false } });
