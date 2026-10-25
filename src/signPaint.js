/**
 * Painted-board text, ONE implementation for every board in the world (art director's FINAL call, 25 Oct 2026,
 * CLAUDE.md section 7; reverses the 23 Oct rule):
 *   line 1  Hindi (Devanagari), BOLD, larger, dominant
 *   line 2  English, NOT bold, smaller but comfortably legible at walking distance
 *   English cap height 60-70% of the Hindi cap height, never below 55%
 *   both lines the same dark paint colour
 * Cap heights are measured from the real glyphs ('क' for Devanagari: its header line to the baseline, 'H' for Latin),
 * so the ratio holds whichever font the browser ends up with.
 */
export const HI_FAMILY = '"Noto Sans Devanagari", "Kohinoor Devanagari", "Devanagari Sangam MN", sans-serif';
export const EN_FAMILY = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
export const HI_WEIGHT = 700;
export const EN_WEIGHT = 500;
export const EN_CAP_RATIO = 0.7; // start here (top of the 60-70% band) ...
export const EN_CAP_RATIO_MIN = 0.58; // ... and only go down to this when the English line is too wide; the rule's floor is 0.55

export const hiFont = (px) => `${HI_WEIGHT} ${px}px ${HI_FAMILY}`;
export const enFont = (px) => `${EN_WEIGHT} ${px}px ${EN_FAMILY}`;

function capPerPx(ctx, font, ch) {
  ctx.font = font(100);
  const a = ctx.measureText(ch).actualBoundingBoxAscent;
  return (a > 0 ? a : 70) / 100;
}

/**
 * Lays out the two lines inside the rect (x, y, w, h) and returns the sizes; draws nothing.
 * `maxHiPx` caps the Hindi size on boards that should not shout.
 */
export function layoutBilingual(ctx, hi, en, w, h, { maxHiPx = h, fillFraction = 0.9, gapFraction = 0.1 } = {}) {
  const hiCap = capPerPx(ctx, hiFont, 'क');
  const enCap = capPerPx(ctx, enFont, 'H');
  let hiPx = Math.min(maxHiPx, h * 0.6);
  let ratio = EN_CAP_RATIO;
  for (let guard = 0; guard < 80; guard++) {
    ctx.font = hiFont(hiPx);
    const hiM = ctx.measureText(hi);
    const hiW = hiM.width;
    const hiAsc = hiM.actualBoundingBoxAscent;
    const hiDesc = hiM.actualBoundingBoxDescent;
    let enPx = (ratio * hiCap * hiPx) / enCap;
    ctx.font = enFont(enPx);
    let enM = ctx.measureText(en);
    // English too wide: let it drop towards the floor of the ratio band before touching the Hindi
    while (enM.width > w && ratio > EN_CAP_RATIO_MIN) {
      ratio = Math.max(EN_CAP_RATIO_MIN, ratio - 0.02);
      enPx = (ratio * hiCap * hiPx) / enCap;
      ctx.font = enFont(enPx);
      enM = ctx.measureText(en);
    }
    const gap = hiPx * gapFraction;
    const block = hiAsc + hiDesc + gap + enM.actualBoundingBoxAscent + enM.actualBoundingBoxDescent;
    if (hiW <= w && enM.width <= w && block <= h * fillFraction) {
      return { hiPx, enPx, hiAsc, hiDesc, enAsc: enM.actualBoundingBoxAscent, enDesc: enM.actualBoundingBoxDescent, gap, block, ratio: (enCap * enPx) / (hiCap * hiPx) };
    }
    hiPx *= 0.95;
    ratio = EN_CAP_RATIO; // re-try the English from the top of the band at the new Hindi size
    if (hiPx < 8) break;
  }
  return null;
}

/**
 * Paints both lines into the rect (x, y, w, h): Hindi on top, English below, `fg` for both. `align` is 'center'
 * (default), 'left' or 'right'; `x` is then the centre, left edge or right edge of the text.
 */
export function drawBilingual(ctx, hi, en, { x, y, w, h, fg, align = 'center', maxHiPx, fillFraction, gapFraction }) {
  const L = layoutBilingual(ctx, hi, en, w, h, { maxHiPx, fillFraction, gapFraction });
  if (!L) return null;
  ctx.fillStyle = fg;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const top = y + (h - L.block) / 2;
  const hiBase = top + L.hiAsc;
  const enBase = hiBase + L.hiDesc + L.gap + L.enAsc;
  ctx.font = hiFont(L.hiPx);
  ctx.fillText(hi, x, hiBase);
  ctx.font = enFont(L.enPx);
  ctx.fillText(en, x, enBase);
  return { ...L, hiBase, enBase };
}
