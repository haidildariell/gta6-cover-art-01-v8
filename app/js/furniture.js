// furniture.js — the movie-poster furniture of Tideline Cover Press.
//
// Press strip, roundel, rating box, platform pill, heat meter, gold seal,
// barcode, billing block, film grain and vignette. Everything is drawn
// with canvas paths (no images, no network), sized from the frame width so
// it scales to every export size.

/** Deterministic PRNG (mulberry32) so the grain is identical every export. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw a five-point gold star centred at (cx, cy) with outer radius r. */
export function drawGoldStar(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = '#f5c542';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draw text along a circular arc (used by the roundel). */
export function drawArcText(ctx, text, cx, cy, radius, startAngle, endAngle, font, fill) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const total = endAngle - startAngle;
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const a = startAngle + (total * (i + 0.5)) / n;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * The press strip across the top: five gold stars, the pull-quote, the
 * gazette name, the heat meter and the VOL tag.
 */
export function drawPressStrip(ctx, W, H, state) {
  const u = W / 1920;
  const stripH = H * 0.054;
  ctx.save();
  ctx.fillStyle = '#1c0a1e';
  ctx.fillRect(0, 0, W, stripH);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, stripH - 2 * u, W, 2 * u);

  // Five gold stars, far left. Sized from the frame width so they never
  // collide with the quote on portrait exports.
  const starR = W * 0.008;
  for (let i = 0; i < 5; i++) {
    drawGoldStar(ctx, W * 0.022 + i * starR * 2.4, stripH / 2, starR);
  }

  // Pull-quote in condensed caps, gazette in italic serif.
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f7e8c9';
  ctx.font = `${Math.round(26 * u)}px Anton, "Arial Narrow", sans-serif`;
  const quote = `\u201C${state.quote}\u201D`;
  const quoteX = W * 0.115;
  ctx.fillText(quote, quoteX, stripH / 2 + 1 * u);
  const quoteW = ctx.measureText(quote).width;
  ctx.fillStyle = '#d4af37';
  ctx.font = `italic ${Math.round(24 * u)}px Georgia, serif`;
  ctx.fillText(`\u2014 ${state.gazette}`, quoteX + quoteW + 14 * u, stripH / 2 + 1 * u);

  // Heat meter, then the VOL tag at the far right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f5c542';
  ctx.font = `${Math.round(24 * u)}px Anton, "Arial Narrow", sans-serif`;
  ctx.fillText('HEAT \u2605\u2605\u2605\u2605\u2605', W * 0.9, stripH / 2 + 1 * u);
  const volText = `VOL. ${state.vol}`;
  ctx.font = `${Math.round(24 * u)}px Anton, "Arial Narrow", sans-serif`;
  const volW = ctx.measureText(volText).width;
  const boxX = W * 0.925;
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = Math.max(1.5, 2 * u);
  ctx.strokeRect(boxX, stripH * 0.16, volW + 18 * u, stripH * 0.68);
  ctx.fillStyle = '#f5c542';
  ctx.fillText(volText, boxX + volW + 9 * u, stripH / 2 + 1 * u);
  ctx.restore();
}

/**
 * The roundel sticker: a gold ring with the press name on an arc and the
 * TC monogram in the middle. It sits on a panel corner, clear of the
 * press strip (the v6c collision is gone).
 */
export function drawRoundel(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  // Gold disc with a dark ring.
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c0a1e';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  // Arc text around the top and bottom.
  drawArcText(ctx, 'TIDELINE', 0, 0, r * 0.62, -Math.PI * 0.78, -Math.PI * 0.22, `${Math.round(r * 0.22)}px Anton, sans-serif`, '#f5c542');
  drawArcText(ctx, 'COVER PRESS', 0, 0, r * 0.62, Math.PI * 0.22, Math.PI * 0.78, `${Math.round(r * 0.2)}px Anton, sans-serif`, '#f5c542');
  // Monogram.
  ctx.fillStyle = '#f7e8c9';
  ctx.font = `${Math.round(r * 0.62)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TC', 0, r * 0.04);
  ctx.restore();
}

/** The LEONIDA 18+ rating box at the bottom-left of the frame. */
export function drawRatingBox(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1c0a1e';
  ctx.lineWidth = Math.max(2, w * 0.03);
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8102e';
  ctx.font = `${Math.round(h * 0.16)}px Anton, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('LEONIDA', x + w / 2, y + h * 0.2);
  ctx.fillStyle = '#1c0a1e';
  ctx.font = `${Math.round(Math.min(w * 0.52, h * 0.52))}px Anton, sans-serif`;
  ctx.fillText('18+', x + w / 2, y + h * 0.68);
  ctx.font = `${Math.round(Math.min(w * 0.12, h * 0.13))}px Anton, sans-serif`;
  ctx.fillText('ADULTS ONLY', x + w / 2, y + h * 0.9);
  ctx.restore();
}

/** The platform pill (PS5 · XBOX · PC) overlapping a panel's top corner. */
export function drawPlatformPill(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,6,20,0.92)';
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = Math.max(1.5, h * 0.08);
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f7e8c9';
  ctx.font = `${Math.round(h * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PS5 \u00B7 XBOX \u00B7 PC', cx, cy + h * 0.04);
  ctx.restore();
}

/**
 * The gold starburst seal, big, overlapping a panel edge the way the
 * winners do it. Two lines of text inside: ORIGINAL / COVER ART.
 */
export function drawGoldSeal(ctx, cx, cy, r, lines) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#f5c542';
  ctx.strokeStyle = '#8a6d1f';
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.beginPath();
  const points = 24;
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI / points) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.88;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a6d1f';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7e8c9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 0.24)}px Anton, sans-serif`;
  ctx.fillText(lines[0], 0, -r * 0.16);
  ctx.fillText(lines[1], 0, r * 0.16);
  ctx.restore();
}

/** A deterministic barcode (fixed digit string, fixed bar pattern). */
export function drawBarcode(ctx, x, y, w, h, digits) {
  const rng = mulberry32(20261121);
  ctx.save();
  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#111111';
  let bx = x + w * 0.04;
  const maxX = x + w * 0.96;
  while (bx < maxX) {
    const bw = (1 + Math.floor(rng() * 3)) * (w / 110);
    const gap = (1 + Math.floor(rng() * 2)) * (w / 110);
    ctx.fillRect(bx, y + h * 0.06, bw, h * 0.62);
    bx += bw + gap;
  }
  ctx.font = `${Math.round(Math.min(h * 0.18, (w * 0.92) / (digits.length * 0.6)))}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(digits, x + w / 2, y + h * 0.92);
  ctx.restore();
}

/**
 * The billing block along the bottom: COMING SOON at the left, the studio
 * credit and the cast line centred, the seal and barcode at the right.
 * `castLine` names only the cast actually placed on the cover.
 */
export function drawBillingBlock(ctx, W, H, castLine) {
  const u = W / 1920;
  const y = H * 0.885;
  ctx.save();
  ctx.textBaseline = 'middle';
  // COMING SOON, left, after the rating box.
  ctx.fillStyle = '#f7e8c9';
  ctx.font = `${Math.round(30 * u)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('C O M I N G   S O O N', W * 0.115, y + H * 0.045);
  // Studio credit + cast line, centred.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7e8c9';
  ctx.font = `${Math.round(25 * u)}px Anton, sans-serif`;
  ctx.fillText('A TIDELINE PICTURES PRODUCTION', W * 0.52, y + H * 0.028);
  ctx.fillStyle = '#cbb8a8';
  ctx.font = `${Math.round(19 * u)}px Anton, sans-serif`;
  ctx.fillText(castLine, W * 0.52, y + H * 0.068);
  ctx.restore();
}

/** Fine deterministic film grain tiled over the whole frame. */
export function drawFilmGrain(ctx, W, H, alpha) {
  const tile = 192;
  const noise = document.createElement('canvas');
  noise.width = tile;
  noise.height = tile;
  const g = noise.getContext('2d');
  const img = g.createImageData(tile, tile);
  const rng = mulberry32(777);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(noise, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A soft dark vignette around the frame edges. */
export function drawVignette(ctx, W, H) {
  ctx.save();
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.72,
  );
  g.addColorStop(0, 'rgba(20,4,20,0)');
  g.addColorStop(1, 'rgba(20,4,20,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
