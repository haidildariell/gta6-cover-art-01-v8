// chrome-title.js — the giant retro-chrome cover title.
//
// The title is drawn OPAQUE, never translucent: seven hard-edged horizontal
// sunset bands are painted solid on an offscreen layer and masked to the
// letter shapes, so no panel photo can ever show through the letters. A fat
// magenta slab and a dark-purple underlay sit behind the glyphs, a thick
// near-black outline rings them, and white sparkles sit on the letter tops.

export const CHROME_BANDS = [
  '#fff3a6', // pale yellow
  '#ffd94d', // yellow
  '#ffb347', // gold
  '#ff7a3c', // orange
  '#ff5e7a', // coral pink
  '#e0218a', // magenta
  '#7b2d8b', // purple
];

const SLAB_DARK = '#6d1459';
const SLAB_MAGENTA = '#d81b8c';
const OUTLINE = '#14060f';

/**
 * Find the font size that makes the title span `targetWidth` on this canvas.
 */
export function fitChromeTitleSize(ctx, text, targetWidth, fontFamily, startSize) {
  ctx.save();
  ctx.font = `${startSize}px ${fontFamily}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  if (w <= 0) return startSize;
  return Math.max(24, Math.floor((startSize * targetWidth) / w));
}

/**
 * Paint the banded glyph layer for `text` onto an offscreen canvas and
 * return it with its metrics. Bands are opaque; the destination-in mask
 * keeps them only where the glyphs are. The layer's own coordinate frame
 * has the glyph baseline at (pad + shearShift + shear * ascent, pad + ascent)
 * and the glyph top at y = pad.
 */
function buildBandedGlyphLayer(text, fontSize, fontFamily, shear, pad) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `${fontSize}px ${fontFamily}`;
  const metrics = probe.measureText(text);
  const textW = Math.ceil(metrics.width);
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize * 0.8);
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.2);
  const boxH = ascent + descent;
  const shearShift = Math.ceil(Math.abs(shear) * boxH) + pad;
  const layer = document.createElement('canvas');
  layer.width = textW + shearShift * 2 + pad * 2;
  layer.height = boxH + pad * 2;
  const g = layer.getContext('2d');
  // Bands fill the whole glyph box, top to bottom, opaque.
  g.translate(pad + shearShift, pad);
  const bandH = boxH / CHROME_BANDS.length;
  for (let i = 0; i < CHROME_BANDS.length; i++) {
    g.fillStyle = CHROME_BANDS[i];
    g.fillRect(-shearShift - pad, i * bandH, layer.width, bandH + 1);
    // Thin dark separator between bands.
    if (i > 0) {
      g.fillStyle = 'rgba(43,6,32,0.7)';
      g.fillRect(-shearShift - pad, i * bandH, layer.width, Math.max(1.5, fontSize * 0.02));
    }
  }
  // Mask the bands to the glyph shapes. One destination-in pass only:
  // the mask is opaque white text, so the bands stay fully opaque.
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = '#ffffff';
  g.font = `${fontSize}px ${fontFamily}`;
  g.textBaseline = 'alphabetic';
  g.setTransform(1, 0, shear, 1, pad + shearShift, pad);
  g.fillText(text, 0, ascent);
  return { layer, textW, boxH, ascent, shearShift, pad };
}

/** Draw a four-point star sparkle. */
function drawSparkle(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw the chrome title on `ctx`, centred at (cx, baselineY), spanning
 * `targetWidth` pixels. `fontFamily` is the condensed display face.
 * `shear` is the italic slant (negative leans the tops right).
 *
 * Shear note: with transform (1, 0, shear, 1, 0, 0) a point (x, y) lands at
 * (x + shear * y, y), so text passed at x = drawX - shear * baselineY
 * appears with its baseline starting at drawX. The banded layer is placed
 * so its own baseline point lands on the same drawX.
 */
export function drawChromeTitle(ctx, text, cx, baselineY, targetWidth, options = {}) {
  const fontFamily = options.fontFamily || 'Anton, "Arial Narrow", sans-serif';
  const shear = options.shear ?? -0.14;
  const startSize = options.startSize || 200;
  const fontSize = fitChromeTitleSize(ctx, text, targetWidth, fontFamily, startSize);
  const pad = Math.ceil(fontSize * 0.12);
  const { layer, textW, boxH, ascent, shearShift } = buildBandedGlyphLayer(
    text,
    fontSize,
    fontFamily,
    shear,
    pad,
  );
  const drawX = cx - textW / 2;
  const drawY = baselineY - ascent;

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `${fontSize}px ${fontFamily}`;
  // The shear transform for the slab / outline passes.
  ctx.setTransform(1, 0, shear, 1, 0, 0);
  const atBaseline = (x) => x - shear * baselineY;
  // 1. Dark purple underlay, offset down-right.
  ctx.fillStyle = SLAB_DARK;
  ctx.fillText(text, atBaseline(drawX + fontSize * 0.085), baselineY + fontSize * 0.105);
  // 2. Magenta slab body, stroked and filled, offset down-right.
  ctx.fillStyle = SLAB_MAGENTA;
  ctx.strokeStyle = SLAB_MAGENTA;
  ctx.lineWidth = fontSize * 0.05;
  ctx.strokeText(text, atBaseline(drawX + fontSize * 0.058), baselineY + fontSize * 0.075);
  ctx.fillText(text, atBaseline(drawX + fontSize * 0.058), baselineY + fontSize * 0.075);
  // 3. Thick near-black outline on the letters themselves.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = fontSize * 0.14;
  ctx.strokeText(text, atBaseline(drawX), baselineY);
  // 4. The opaque banded glyph layer on top: it covers the inner half of
  //    the outline stroke and leaves the outer half ringing the letters.
  //    Layer baseline point (pad + shearShift + shear*ascent, pad + ascent)
  //    must land at (drawX, baselineY).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(
    layer,
    drawX - pad - shearShift - shear * ascent,
    drawY - pad,
  );
  // 5. White top highlight, low alpha, along the glyph tops.
  ctx.setTransform(1, 0, shear, 1, 0, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1.5, fontSize * 0.018);
  ctx.strokeText(text, atBaseline(drawX), baselineY - fontSize * 0.015);
  ctx.restore();

  // 6. Sparkles on the letter tops.
  const sparkY = baselineY - ascent * 0.92;
  drawSparkle(ctx, cx - textW * 0.34, sparkY - fontSize * 0.05, fontSize * 0.075, 0.95);
  drawSparkle(ctx, cx + textW * 0.08, sparkY - fontSize * 0.1, fontSize * 0.055, 0.9);
  drawSparkle(ctx, cx + textW * 0.42, sparkY, fontSize * 0.065, 0.95);

  return { fontSize, textW, textH: boxH, top: drawY, bottom: baselineY };
}
