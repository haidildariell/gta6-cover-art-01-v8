// state.js — the editor state of Tideline Cover Press.
//
// One plain object holds everything: layout, grade, caption texts, the
// furniture toggles and the per-slot photo/crop overrides. Undo/redo keeps
// JSON snapshots of that object, so every control (including the toggles
// and the caption fields) is covered by Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.

import { LAYOUTS, CAST } from './poster.js';
import { GRADES } from './grades.js';

/** The six sample photos, in cast order, with their file and character. */
export const SAMPLE_PHOTOS = [
  { id: 'convertible', file: 'samples/sample-convertible.jpg' },
  { id: 'boss', file: 'samples/sample-boss.jpg' },
  { id: 'rooftop', file: 'samples/sample-rooftop.jpg' },
  { id: 'neon', file: 'samples/sample-neon.jpg' },
  { id: 'rider', file: 'samples/sample-rider.jpg' },
  { id: 'pier', file: 'samples/sample-pier.jpg' },
];

/** The default cover: Hero Stack + Sunset + the de-templated texts. */
export function defaultState() {
  return {
    layout: 'hero-stack',
    grade: 'sunset',
    title: 'VELVET TIDE',
    subtitle: 'salt on the wind',
    tagline: 'Seven strangers \u00B7 One burning coast \u00B7 Every debt comes due',
    quote: 'EVERY FRAME DRIPS WITH SUNLIGHT AND SIN',
    gazette: 'The Coral Bay Chronicle',
    vol: 8,
    showTags: true,
    showPress: true,
    showBilling: true,
    showCorners: true,
    // Per-slot overrides, parallel to the active layout's panels.
    // Empty means "use the layout's own photo and crop".
    slots: [],
    selectedSlot: 1, // the hero BOSS panel of Hero Stack
  };
}

/** The layout definition the state currently uses. */
export function activeLayout(state) {
  return LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS.find((l) => l.def);
}

/** The effective slots: layout defaults merged with the state's overrides. */
export function effectiveSlots(state) {
  const layout = activeLayout(state);
  return layout.panels.map((def, i) => ({ ...def, ...(state.slots[i] || {}) }));
}

/** The cast label for a photo id ("Marina Sol — THE DRIVER"), or "Scene". */
export function castLabel(photoId) {
  const cast = CAST[photoId];
  return cast ? `${cast.name} \u2014 ${cast.role}` : 'Scene \u2014 no cast';
}

/** A deep copy of a state through JSON (the state holds plain data only). */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Undo/redo history over state snapshots. `onChange` runs after every
 * undo/redo so the editor can re-render. Snapshots cover layout, grade,
 * panel photos, crops, captions and every toggle.
 */
export function createHistory(initial, onChange) {
  const past = [];
  const future = [];
  let current = cloneState(initial);
  return {
    get state() {
      return current;
    },
    /** Record the state before a mutation (call first, then mutate). */
    checkpoint() {
      past.push(cloneState(current));
      if (past.length > 60) past.shift();
      future.length = 0;
    },
    /** Replace the current state wholesale (after a checkpoint). */
    replace(next) {
      current = cloneState(next);
      onChange(current);
    },
    undo() {
      if (past.length === 0) return false;
      future.push(cloneState(current));
      current = past.pop();
      onChange(current);
      return true;
    },
    redo() {
      if (future.length === 0) return false;
      past.push(cloneState(current));
      current = future.pop();
      onChange(current);
      return true;
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}

/** Reassign the slots when the layout changes: keep photos by id where possible. */
export function slotsForLayout(state, layoutId) {
  const next = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS.find((l) => l.def);
  const old = effectiveSlots(state);
  const byPhoto = new Map(old.map((s) => [s.photo, s]));
  return next.panels.map((def) => {
    const kept = byPhoto.get(def.photo);
    if (!kept) return {};
    // Keep the user's photo and crop, but take the new layout's geometry.
    return { photo: kept.photo, cx: kept.cx, cy: kept.cy, zoom: kept.zoom };
  });
}

export { GRADES };
