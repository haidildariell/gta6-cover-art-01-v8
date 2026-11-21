# Tideline Cover Press — GTA 6-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v8/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v8/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Bounty: https://make.fun/bounty/gta6-cover-art-01

Turn any photo into a GTA 6-style poster cover — the multi-panel mosaic,
the giant banded chrome title, the neon script subtitle, the press strip,
the billing block — and export it as a PNG to share. Everything runs
offline in the browser from these static files; photos never leave the
machine.

## What it does

- **6 sample photos, one named cast** — Marina Sol (The Driver), Silas
  Marlowe (The Boss), Dante Reyes (The Courier), Roxy Vane (The Insider),
  Cole Brannon (The Rider), Elias Cove (The Lookout). Click a cast photo
  to fill the selected panel.
- **8 layouts** — Hero Stack (default: a tilted asymmetric mosaic with a
  giant hero panel), Four Square, Nine Lives, Tilted Snaps, Full Bleed,
  Split Duo, Triptych, Spotlight.
- **9 grades** — Sunset (default: one hard, uniform golden-hour grade over
  every panel, hardened in v8 with a second full-frame unify wash so no
  panel can stay pale daylight or neon night), Vice Neon, Golden Hour,
  Teal & Orange, Bubblegum, Noir B&W, Smog, Heatwave, Palm Shade.
- **The chrome title** — seven hard-edged sunset bands, fully opaque, with
  a fat magenta slab, a dark-purple underlay and a thick black outline.
  Edit the title, script subtitle, tagline, press quote and gazette name
  in the caption panel. In v8 the title band sits below the hero's chin:
  every face on the default cover is 100% visible, never touched by the
  title or the furniture.
- **Full movie-poster furniture** — press strip with five gold stars, the
  Tideline roundel, the LEONIDA 18+ rating box, the PS5 · XBOX · PC pill,
  the HEAT star meter, the tagline banner, the billing block with the real
  cast names, a big gold ORIGINAL COVER ART seal, a barcode, film grain
  and a vignette. Each furniture group can be toggled off. The v8 default
  is full-bleed: the mosaic touches the frame edges and the title zone
  carries sunset stripes instead of dead dark space.
- **Per-panel crop** — click a panel to select it, drag to reposition the
  photo, scroll to zoom. Fill all panels with one photo, or shuffle the
  panel assignment.
- **Undo / redo** — buttons plus Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, covering
  layout, grade, photos, crops, captions and every toggle.
- **Export PNG** — 1080×1080, 1080×1350 and 1920×1080 in one click.

## How to run

No build step, no network. Serve `app/` with any static server and open
`index.html` in desktop Chrome, for example:

```sh
cd app
python3 -m http.server 8080
```

Then open http://localhost:8080. Or open `app/index.html` directly from
the file system.

Screenshot scenes (used to take the entry's screenshots):

- `index.html?shot=cover` — the default cover, full window
- `index.html?shot=cover&aspect=story` — the 1080×1350 story cover
- `index.html?shot=cover&aspect=square` — the 1080×1080 square cover
- `index.html?selftest=1` — exports all three sizes headlessly and
  reports the PNG byte counts in the page

## Files

- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` (Node 22, stdlib only).
- `app/index.html`, `app/styles.css` — the editor page.
- `app/js/poster.js` — the poster composer (layouts, panels, title,
  furniture placement).
- `app/js/chrome-title.js` — the opaque banded chrome title.
- `app/js/grades.js` — the nine colour grades.
- `app/js/furniture.js` — press strip, seal, barcode, billing, grain.
- `app/js/state.js` — editor state, defaults, undo/redo history.
- `app/js/editor.js` — the editor wiring, exports and screenshot scenes.
- `app/fonts/` — Anton and Pacifico, SIL Open Font License (OFL texts
  beside them).
- `app/samples/` — the six sample photos.

## Photo credits

Sample photos generated with an image model for this entry; no real
person depicted. Fonts: Anton and Pacifico under the SIL Open Font
License. No Rockstar Games logo, artwork, character or font is used.
