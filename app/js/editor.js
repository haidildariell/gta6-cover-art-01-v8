// editor.js — the Tideline Cover Press editor.
//
// Wires the preview canvas, the cast strip, the layout diagrams, the grade
// chips, the caption fields, the furniture toggles, drag-to-position and
// wheel zoom per panel, undo/redo and the three PNG exports. The same
// renderer draws the live preview and the exports, so what you see is
// what the PNG holds. ?shot=cover renders a bare cover for screenshots;
// ?selftest=1 exports all three sizes and reports the byte counts.

import { LAYOUTS, layoutById, renderPoster, CAST } from './poster.js';
import { GRADES, gradeById } from './grades.js';
import {
  defaultState,
  activeLayout,
  effectiveSlots,
  castLabel,
  cloneState,
  createHistory,
  slotsForLayout,
  SAMPLE_PHOTOS,
} from './state.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const ASPECT = params.get('aspect') || 'landscape';
const SELFTEST = params.get('selftest') === '1';

/** The export sizes: square, story, landscape. */
export const EXPORT_SIZES = [
  { id: 'square', label: '1080 \u00D7 1080', w: 1080, h: 1080 },
  { id: 'story', label: '1080 \u00D7 1350', w: 1080, h: 1350 },
  { id: 'landscape', label: '1920 \u00D7 1080', w: 1920, h: 1080 },
];

/** Loaded images by photo id (samples + the user's own uploads). */
const images = {};
/** The user's uploaded photos, in upload order. */
const userPhotos = [];

async function loadSampleImages() {
  await Promise.all(
    SAMPLE_PHOTOS.map(
      (p) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images[p.id] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = p.file;
        }),
    ),
  );
}

async function loadDisplayFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.ready,
    ]);
  } catch (err) {
    // The app still draws with its fallback faces when a font is missing.
    console.warn('font load failed', err);
  }
}

/** Render the current state onto a canvas of W x H and return the canvas. */
function renderCoverCanvas(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderPoster(canvas.getContext('2d'), w, h, state, images);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Download a canvas as a PNG file. */
function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

/** Draw a layout's mini diagram (its panel rects) on a small canvas. */
function drawLayoutDiagram(canvas, layout) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#1c0a1e';
  ctx.fillRect(0, 0, W, H);
  for (const p of layout.panels) {
    ctx.save();
    ctx.translate((p.x + p.w / 2) * W, (p.y + p.h / 2) * H);
    ctx.rotate(p.rot || 0);
    ctx.fillStyle = '#3d1a3d';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.fillRect((-p.w / 2) * W, (-p.h / 2) * H, p.w * W, p.h * H);
    ctx.strokeRect((-p.w / 2) * W, (-p.h / 2) * H, p.w * W, p.h * H);
    ctx.restore();
  }
}

/** Build the cast strip: the samples plus any uploaded photos. */
function buildCastStrip(history, onCast) {
  const strip = $('#cast-strip');
  strip.innerHTML = '';
  const addThumb = (photoId, label, img) => {
    const btn = document.createElement('button');
    btn.className = 'cast-thumb';
    btn.type = 'button';
    btn.title = label;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = label;
    const cap = document.createElement('span');
    cap.textContent = label;
    btn.append(thumb, cap);
    btn.addEventListener('click', () => onCast(photoId));
    strip.append(btn);
  };
  for (const p of SAMPLE_PHOTOS) {
    if (images[p.id]) addThumb(p.id, castLabel(p.id), images[p.id]);
  }
  for (const up of userPhotos) {
    addThumb(up.id, up.name, up.img);
  }
}

/** Build the layout picker buttons with mini diagrams. */
function buildLayoutPicker(history) {
  const picker = $('#layout-picker');
  picker.innerHTML = '';
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.className = 'layout-btn';
    btn.type = 'button';
    btn.dataset.layout = layout.id;
    const diagram = document.createElement('canvas');
    diagram.width = 96;
    diagram.height = 54;
    drawLayoutDiagram(diagram, layout);
    const name = document.createElement('span');
    name.textContent = layout.name;
    btn.append(diagram, name);
    btn.addEventListener('click', () => {
      const state = history.state;
      if (state.layout === layout.id) return;
      history.checkpoint();
      const next = cloneState(state);
      next.slots = slotsForLayout(state, layout.id);
      next.layout = layout.id;
      next.selectedSlot = 0;
      history.replace(next);
      syncControls(next);
      renderPreview(next);
    });
    picker.append(btn);
  }
}

/** Build the grade picker chips from each grade's swatch colours. */
function buildGradePicker(history) {
  const picker = $('#grade-picker');
  picker.innerHTML = '';
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.className = 'grade-chip';
    btn.type = 'button';
    btn.dataset.grade = grade.id;
    btn.title = grade.name;
    btn.style.background = `linear-gradient(135deg, ${grade.swatches.join(', ')})`;
    const name = document.createElement('span');
    name.textContent = grade.name;
    btn.append(name);
    btn.addEventListener('click', () => {
      if (history.state.grade === grade.id) return;
      history.checkpoint();
      const next = cloneState(history.state);
      next.grade = grade.id;
      history.replace(next);
      syncControls(next);
      renderPreview(next);
    });
    picker.append(btn);
  }
}

/** Push the current state into every control (after undo/redo/layout change). */
function syncControls(state) {
  document.querySelectorAll('.layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('.grade-chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  $('#input-title').value = state.title;
  $('#input-subtitle').value = state.subtitle;
  $('#input-tagline').value = state.tagline;
  $('#input-quote').value = state.quote;
  $('#input-gazette').value = state.gazette;
  $('#toggle-tags').checked = state.showTags !== false;
  $('#toggle-press').checked = state.showPress !== false;
  $('#toggle-billing').checked = state.showBilling !== false;
  $('#toggle-corners').checked = state.showCorners !== false;
  $('#btn-undo').disabled = !historyRef.canUndo();
  $('#btn-redo').disabled = !historyRef.canRedo();
}

let historyRef = null;
let previewScale = 1;

/** Draw the live preview from the state. */
function renderPreview(state) {
  const canvas = $('#preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderPoster(ctx, canvas.width, canvas.height, state, images);
  // Outline the selected panel so the user sees what drag/zoom will move.
  const slots = effectiveSlots(state);
  const sel = slots[state.selectedSlot];
  if (sel) {
    previewScale = canvas.width / 1920;
    ctx.save();
    ctx.translate((sel.x + sel.w / 2) * canvas.width, (sel.y + sel.h / 2) * canvas.height);
    ctx.rotate(sel.rot || 0);
    ctx.strokeStyle = '#ff5da2';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect((-sel.w / 2) * canvas.width, (-sel.h / 2) * canvas.height, sel.w * canvas.width, sel.h * canvas.height);
    ctx.restore();
  }
}

/** Hit-test the preview canvas: which slot (if any) sits under (px, py). */
function slotAtPoint(state, px, py) {
  const canvas = $('#preview-canvas');
  const slots = effectiveSlots(state);
  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i];
    const x = s.x * canvas.width;
    const y = s.y * canvas.height;
    const w = s.w * canvas.width;
    const h = s.h * canvas.height;
    if (px >= x && px <= x + w && py >= y && py <= y + h) return i;
  }
  return -1;
}

/** Wire drag-to-position (pointer) and wheel zoom on the preview canvas. */
function wirePreviewDrag(history) {
  const canvas = $('#preview-canvas');
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const slotIndex = slotAtPoint(history.state, px, py);
    if (slotIndex < 0) return;
    history.checkpoint();
    const next = cloneState(history.state);
    next.selectedSlot = slotIndex;
    history.replace(next);
    renderPreview(next);
    drag = { slotIndex, lastX: px, lastY: py, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const dx = px - drag.lastX;
    const dy = py - drag.lastY;
    drag.lastX = px;
    drag.lastY = py;
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    drag.moved = true;
    const state = history.state;
    const slots = effectiveSlots(state);
    const slot = slots[drag.slotIndex];
    const next = cloneState(state);
    const cur = { ...(next.slots[drag.slotIndex] || {}), ...slot };
    const panelW = slot.w * canvas.width;
    const panelH = slot.h * canvas.height;
    cur.cx = Math.max(0, Math.min(1, cur.cx - dx / (panelW * (cur.zoom || 1))));
    cur.cy = Math.max(0, Math.min(1, cur.cy - dy / (panelH * (cur.zoom || 1))));
    next.slots[drag.slotIndex] = { photo: cur.photo, cx: cur.cx, cy: cur.cy, zoom: cur.zoom };
    // Apply without a new checkpoint: the drag shares the pointerdown one.
    history.replace(next);
    renderPreview(next);
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const state = history.state;
    const slots = effectiveSlots(state);
    const slot = slots[state.selectedSlot];
    if (!slot) return;
    history.checkpoint();
    const next = cloneState(state);
    const cur = { ...(next.slots[state.selectedSlot] || {}), ...slot };
    cur.zoom = Math.max(1, Math.min(3, (cur.zoom || 1) * (1 - e.deltaY * 0.001)));
    next.slots[state.selectedSlot] = { photo: cur.photo, cx: cur.cx, cy: cur.cy, zoom: cur.zoom };
    history.replace(next);
    renderPreview(next);
  }, { passive: false });
}

/** Wire the caption fields, toggles, action buttons and export buttons. */
function wireControls(history) {
  const bindText = (id, key) => {
    // Checkpoint on focus (before the edit), so one undo step restores
    // the text as it was when the field was entered, not per keystroke.
    $(id).addEventListener('focus', () => {
      history.checkpoint();
    });
    $(id).addEventListener('input', (e) => {
      const next = cloneState(history.state);
      next[key] = e.target.value;
      history.replace(next);
      renderPreview(next);
    });
  };
  bindText('#input-title', 'title');
  bindText('#input-subtitle', 'subtitle');
  bindText('#input-tagline', 'tagline');
  bindText('#input-quote', 'quote');
  bindText('#input-gazette', 'gazette');

  const bindToggle = (id, key) => {
    $(id).addEventListener('change', (e) => {
      history.checkpoint();
      const next = cloneState(history.state);
      next[key] = e.target.checked;
      history.replace(next);
      renderPreview(next);
    });
  };
  bindToggle('#toggle-tags', 'showTags');
  bindToggle('#toggle-press', 'showPress');
  bindToggle('#toggle-billing', 'showBilling');
  bindToggle('#toggle-corners', 'showCorners');

  $('#btn-undo').addEventListener('click', () => {
    if (history.undo()) {
      syncControls(history.state);
      renderPreview(history.state);
    }
  });
  $('#btn-redo').addEventListener('click', () => {
    if (history.redo()) {
      syncControls(history.state);
      renderPreview(history.state);
    }
  });
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (history.undo()) {
        syncControls(history.state);
        renderPreview(history.state);
      }
    } else if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault();
      if (history.redo()) {
        syncControls(history.state);
        renderPreview(history.state);
      }
    }
  });

  $('#btn-fill-all').addEventListener('click', () => {
    const state = history.state;
    const slots = effectiveSlots(state);
    const photo = slots[state.selectedSlot]?.photo;
    if (!photo) return;
    history.checkpoint();
    const next = cloneState(state);
    next.slots = slots.map(() => ({ photo }));
    history.replace(next);
    renderPreview(next);
  });

  $('#btn-shuffle').addEventListener('click', () => {
    const state = history.state;
    const slots = effectiveSlots(state);
    const photos = slots.map((s) => s.photo);
    for (let i = photos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photos[i], photos[j]] = [photos[j], photos[i]];
    }
    history.checkpoint();
    const next = cloneState(state);
    next.slots = slots.map((s, i) => ({ photo: photos[i], cx: s.cx, cy: s.cy, zoom: s.zoom }));
    history.replace(next);
    renderPreview(next);
  });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const size = EXPORT_SIZES.find((s) => s.id === btn.dataset.export);
      if (!size) return;
      const canvas = renderCoverCanvas(history.state, size.w, size.h);
      downloadCanvas(canvas, `tideline-cover-${size.id}-${size.w}x${size.h}.png`);
    });
  });

  $('#input-upload').addEventListener('change', (e) => {
    const files = [...e.target.files];
    if (files.length === 0) return;
    let loaded = 0;
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const id = `upload-${Date.now()}-${i}`;
          images[id] = img;
          userPhotos.push({ id, name: `Your photo ${userPhotos.length + 1}`, img });
          loaded++;
          if (loaded === files.length) buildCastStrip(history, castIntoSelected);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  function castIntoSelected(photoId) {
    const state = history.state;
    const slots = effectiveSlots(state);
    const slotIndex = state.selectedSlot ?? 0;
    if (!slots[slotIndex]) return;
    history.checkpoint();
    const next = cloneState(state);
    const cur = { ...(next.slots[slotIndex] || {}), ...slots[slotIndex] };
    next.slots[slotIndex] = { photo: photoId, cx: cur.cx, cy: cur.cy, zoom: cur.zoom };
    history.replace(next);
    renderPreview(next);
  }
  // The cast strip needs the same handler: rebuild it with the closure.
  buildCastStrip(history, castIntoSelected);
}

/** The bare-cover screenshot scene: one canvas, no editor chrome. */
async function runShotCover() {
  document.body.classList.add('shot-mode');
  const state = defaultState();
  const size =
    ASPECT === 'story'
      ? { w: 1080, h: 1350 }
      : ASPECT === 'square'
        ? { w: 1080, h: 1080 }
        : { w: 1920, h: 1080 };
  const canvas = renderCoverCanvas(state, size.w, size.h);
  canvas.id = 'shot-canvas';
  document.body.append(canvas);
  document.title = 'COVER READY';
  window.__coverReady = true;
}

/** The headless self-test: export all three sizes, report byte counts. */
async function runSelfTest() {
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
  const state = defaultState();
  const results = [];
  for (const size of EXPORT_SIZES) {
    const canvas = renderCoverCanvas(state, size.w, size.h);
    const blob = await canvasToBlob(canvas);
    results.push({ id: size.id, w: size.w, h: size.h, bytes: blob ? blob.size : 0 });
  }
  const report = { ok: errors.length === 0, errors, exports: results };
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = JSON.stringify(report);
  document.body.append(pre);
  document.title = 'SELFTEST DONE';
  window.__selftestDone = true;
}

/** Boot the editor (or the shot/selftest scene). */
async function boot() {
  await loadDisplayFonts();
  await loadSampleImages();
  if (SHOT === 'cover') {
    await runShotCover();
    return;
  }
  const history = createHistory(defaultState(), () => {});
  historyRef = history;
  buildLayoutPicker(history);
  buildGradePicker(history);
  wireControls(history);
  wirePreviewDrag(history);
  syncControls(history.state);
  renderPreview(history.state);
  if (SELFTEST) await runSelfTest();
  document.title = 'Tideline Cover Press';
  window.__tidelineReady = true;
}

boot();
