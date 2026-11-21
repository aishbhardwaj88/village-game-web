// Shoots the house kit review images (S7 sprint, houses agent): node docs/s7/houses/shoot.mjs [only-name ...]
// Starts vite on PORT, renders docs/s7/houses/preview.html headless (SwiftShader) and saves docs/s7/houses/<name>.png.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = +(process.env.PORT || 5397);
const base = `http://localhost:${PORT}/village-game-web/docs/s7/houses/preview.html`;
const SHOTS = [
  ...['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((d, i) => [`design_${d}`, `mode=design&d=${d}&wash=${[0, 1, 0, 4, 2, 3, 0, 0][i]}`]),
  ['gali_eye', 'mode=gali&view=eye'],
  ['gali_above', 'mode=gali&view=above'],
  ['gali_eye_shadows', 'mode=gali&view=eye&shadows=1'],
  ['village_gali_eye', 'mode=village&view=gali_eye'],
  ['village_gali_above', 'mode=village&view=gali_above'],
  ['village_east_block', 'mode=village&view=east_block'],
];
const only = process.argv.slice(2);
let server = null;
async function startServer() {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'docs/s7/houses/vite.preview.config.js', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
  server.stderr.on('data', () => {});
  for (let i = 0; i < 200; i++) { try { await fetch(`http://localhost:${PORT}/village-game-web/`); return; } catch { await new Promise((r) => setTimeout(r, 300)); } }
}
async function alive() { try { await fetch(`http://localhost:${PORT}/village-game-web/`); return true; } catch { return false; } }
await startServer();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
try {
  for (const [name, q] of SHOTS) {
    if (only.length && !only.includes(name)) continue;
    if (!(await alive())) { try { server.kill(); } catch {} await startServer(); } // another job may have stopped the server
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(`${base}?${q}`, { waitUntil: 'load' });
    try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 400000, polling: 2000 }); }
    catch (e) { console.log(name, 'TIMEOUT', errors.join(' | ').slice(0, 2000)); await page.close(); continue; }
    const stats = await page.evaluate(() => window.__houseStats);
    try { await page.screenshot({ path: `docs/s7/houses/${name}.png`, timeout: 240000 }); } catch (e) { console.log(name, 'SHOT FAILED', String(e).slice(0, 200)); await page.close(); continue; }
    console.log(name, JSON.stringify(stats), errors.length ? 'ERRORS ' + errors.join(' | ') : '');
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
