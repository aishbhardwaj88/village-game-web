// Vite config for the houses preview shots only (no hot reload, no file watching: edits made while shots render cannot reload the page).
import { defineConfig } from 'vite';
export default defineConfig({ base: '/village-game-web/', server: { hmr: false, watch: { ignored: ['**/*'] } } });
