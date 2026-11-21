// grades.js — the nine colour grades of Tideline Cover Press.
//
// Every grade is a pair: a canvas filter chain applied to the photo itself
// plus a warm/cool colour wash laid over it. The DEFAULT grade, Sunset, is
// the hard uniform sunset the winners run: saturation pushed, contrast up,
// one warm wash over every panel so the whole cover reads as a single poster
// instead of a collage of mismatched photos.
//
// v8 hardening (recon round 8, finding #1): the v7 Sunset grade did not
// fully unify the panels — the daylight driver panel stayed pale and the
// neon night panel stayed pink. Sunset is pushed harder here (saturate
// 1.50, contrast 1.20, stronger overlay wash) and the renderer adds a
// second full-frame unify wash over every panel after compositing, so no
// panel can stay pale daylight, dusk blue or neon night in the default.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    def: true,
    swatches: ['#ffd76a', '#ff7a3c', '#d81b8c'],
    filter: 'saturate(1.50) contrast(1.20) brightness(1.03)',
    washTop: 'rgba(255,138,42,0.26)',
    washBottom: 'rgba(216,27,140,0.30)',
    washMode: 'overlay',
  },
  {
    id: 'vice-neon',
    name: 'Vice Neon',
    swatches: ['#ff2ea6', '#2ee6ff', '#7b2d8b'],
    filter: 'saturate(1.28) contrast(1.10) brightness(1.02)',
    washTop: 'rgba(255,46,166,0.14)',
    washBottom: 'rgba(46,230,255,0.10)',
    washMode: 'overlay',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    swatches: ['#fff3a6', '#ffb347', '#ff8c42'],
    filter: 'saturate(1.22) contrast(1.07) brightness(1.05)',
    washTop: 'rgba(255,196,66,0.18)',
    washBottom: 'rgba(255,140,66,0.14)',
    washMode: 'soft-light',
  },
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    swatches: ['#0f766e', '#ff8c42', '#ffd76a'],
    filter: 'saturate(1.30) contrast(1.16) brightness(1.01)',
    washTop: 'rgba(255,140,66,0.15)',
    washBottom: 'rgba(15,118,110,0.16)',
    washMode: 'overlay',
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    swatches: ['#ff9ecf', '#ff5da2', '#b537f2'],
    filter: 'saturate(1.36) contrast(1.08) brightness(1.04)',
    washTop: 'rgba(255,93,162,0.16)',
    washBottom: 'rgba(181,55,242,0.14)',
    washMode: 'overlay',
  },
  {
    id: 'noir',
    name: 'Noir B&W',
    swatches: ['#e8e8e8', '#888888', '#111111'],
    filter: 'saturate(0) contrast(1.18) brightness(1.06)',
    washTop: 'rgba(255,255,255,0.05)',
    washBottom: 'rgba(0,0,0,0.10)',
    washMode: 'overlay',
  },
  {
    id: 'smog',
    name: 'Smog',
    swatches: ['#b8c4a8', '#7d8c6f', '#3a3a2e'],
    filter: 'saturate(0.85) contrast(0.96) brightness(1.02)',
    washTop: 'rgba(184,196,168,0.14)',
    washBottom: 'rgba(58,58,46,0.16)',
    washMode: 'soft-light',
  },
  {
    id: 'heatwave',
    name: 'Heatwave',
    swatches: ['#ff3b30', '#ff9500', '#ffd60a'],
    filter: 'saturate(1.46) contrast(1.19) brightness(1.02)',
    washTop: 'rgba(255,59,48,0.15)',
    washBottom: 'rgba(255,149,0,0.16)',
    washMode: 'overlay',
  },
  {
    id: 'palm-shade',
    name: 'Palm Shade',
    swatches: ['#2fbf71', '#0f766e', '#ffd76a'],
    filter: 'saturate(1.12) contrast(1.06) brightness(1.03)',
    washTop: 'rgba(47,191,113,0.12)',
    washBottom: 'rgba(15,118,110,0.14)',
    washMode: 'soft-light',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES.find((g) => g.def);
}

/** Apply one grade's photo filter to a 2d context (reset with clearGradeFilter). */
export function applyGradeFilter(ctx, grade) {
  ctx.filter = grade.filter;
}

export function clearGradeFilter(ctx) {
  ctx.filter = 'none';
}

/**
 * Lay one grade's warm wash over a rectangle, clipped to the current path.
 * The wash is what forces every panel — daylight, neon night, dusk — into
 * the same sunset family before the title goes on.
 */
export function applyGradeWash(ctx, grade, x, y, w, h) {
  if (!grade.washTop && !grade.washBottom) return;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, grade.washTop || 'rgba(0,0,0,0)');
  g.addColorStop(1, grade.washBottom || 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = grade.washMode || 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * v8: the second unification pass. After all panels are drawn, one warm
 * sunset wash crosses the WHOLE frame (panels, gutters and background
 * alike) so the cover cannot read as a collage of differently-graded
 * photos. Called before the title goes on, so the letters stay crisp.
 */
export function applyUnifyWash(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,122,40,0.12)');
  g.addColorStop(0.55, 'rgba(255,110,60,0.10)');
  g.addColorStop(1, 'rgba(216,27,140,0.16)');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(255,150,60,0.10)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
