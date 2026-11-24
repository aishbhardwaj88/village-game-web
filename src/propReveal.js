/**
 * Short loading card shown at Play ONLY when props/vehicles sit near the spawn and are not ready yet (src/propGate.js).
 * Same sky gradient as the title; English larger, Hindi smaller beneath (CLAUDE.md). Lifts the moment everything near is
 * parsed, uploaded and shader-warmed, so the world is revealed with its props already in place.
 */
export function showPropReveal(stream) {
  const title = document.getElementById('start-overlay');
  const el = document.createElement('div');
  el.id = 'prop-reveal';
  const bg = title ? getComputedStyle(title).backgroundImage : 'none';
  el.style.cssText = `position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#2a1810;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-image:${bg};background-color:#cbb98a;transition:opacity .25s`;
  el.innerHTML = '<p style="font-size:1.5rem;font-weight:700;margin:0">Getting the village ready</p>'
    + '<p style="font-family:\'Noto Sans Devanagari\',sans-serif;font-size:0.95rem;opacity:.8;margin:.3rem 0 1.2rem;font-weight:600">गाँव तैयार हो रहा है</p>'
    + '<div style="width:200px;height:4px;border-radius:2px;background:rgba(42,24,16,.18);overflow:hidden"><div id="prop-reveal-fill" style="width:0%;height:100%;background:#7a3f22;transition:width .15s ease-out"></div></div>';
  document.body.appendChild(el);
  const fill = el.querySelector('#prop-reveal-fill');
  const iv = setInterval(() => { fill.style.width = `${Math.round(stream.progress() * 100)}%`; }, 80);
  return stream.done.then((ms) => {
    clearInterval(iv); fill.style.width = '100%';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
    return ms;
  });
}
