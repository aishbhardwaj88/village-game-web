import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 5206, URL_ = `http://localhost:${PORT}/village-game-web/`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = async () => { for (let i = 0; i < 100; i++) { try { await fetch(URL_); return; } catch { await new Promise(r => setTimeout(r, 300)); } } throw new Error('no server'); };
try {
  await wait();
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${URL_}?dev=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 120000 }).catch(() => {});
  await page.click('#play-btn');
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
  for (const [name, x, z, yaw] of [['spawn', 603, 60, Math.PI], ['chauraha', 602.9, 30, Math.PI], ['mainroad', 603, -60, Math.PI], ['bazaar', 560, 15, Math.PI]]) {
    await page.evaluate(([x, z, yaw]) => { const d = window.__dopahar; d.teleportPlayer(x, z); d.camRig.yaw = yaw; d.camRig.pitch = -0.15; d.camRig.distance = 5; d.camRig.update(10); }, [x, z, yaw]);
    await page.waitForTimeout(8000);
    const out = await page.evaluate(() => {
      const d = window.__dopahar; const cam = d.camera || d.camRig.camera;
      const info = d.renderer.info.render;
      const groups = {};
      d.scene.traverse((o) => {
        if (!(o.isMesh || o.isInstancedMesh || o.isBatchedMesh)) return;
        let p = o, vis = true; while (p) { if (!p.visible) vis = false; p = p.parent; }
        if (!vis || o.userData.distGateHidden) return;
        let top = o; while (top.parent && !top.parent.isScene) top = top.parent;
        const key = top.name || o.name || o.type;
        groups[key] = (groups[key] || 0) + 1;
      });
      return { calls: info.calls, tris: info.triangles, groups: Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 25) };
    });
    console.log(name, out.calls, out.tris, JSON.stringify(out.groups));
  }
  await browser.close();
} finally { server.kill(); }
