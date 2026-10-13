# Asset provenance: Gravel Choir

All assets in this folder are **original work by Luna (Art & Animation Director) for Eagle Legend LTD**, made on 2026-10-13 in the v2 hand-drawn style.
No third-party, stock or copyrighted assets were used, and no existing creatures or IP were copied or imitated. The user's virtual-pet reference sheets were viewed only for the general rendering feel (inked outlines, airbrush shading, chibi proportions).

**How it was made:**
1. **Flat art:** shapes are hand-written as SVG primitives in `/workspace/art_src/gen.py` and rasterised with CairoSVG at up to 4x the final size. Glossy eye highlights are added automatically.
2. **Hand-drawn pass:** `/workspace/art_src/hd.py` applies SVG filters, rendered in headless Google Chrome:
   - wobble displacement;
   - a thick, uneven outer ink line built from the dilated alpha, over the thinner inner lines;
   - cel shadow and highlight from offset blurred alpha;
   - mottled turbulence texture and light grain.
   The result is then downsampled to the exact file size. Sprites keep transparent backgrounds.
3. **Thumbnails:** a stylised background and sprites, plus a title drawn with Luna's own wobbly stroke alphabet (`/workspace/art_src/letters.py`, no font file) and a cameo of an Eagle Legend mascot from `/workspace/mascots/v2/`. Everything is composed in `/workspace/art_src/render_v2.py`.
4. The previous flat v1 files are kept in `_v1/` for comparison.

Rebuild: `cd /workspace/art_src && /workspace/.venv/bin/python render_v2.py batch1`.

| File | Size (px) | What |
|---|---|---|
| `bg.png` | 1080x1920 | Optional opaque background (scene only, no title) |
| `icon_512.png` | 512x512 | Square icon (rounded corners, transparent outside) |
| `pebble.png` | 102x102 | Pebble 102x102 |
| `pebble_glow.png` | 102x102 | Glowing pebble 102x102 |
| `row.png` | 900x78 | Choir row bar 900x78; uniform horizontal grain with square ends so it stretches cleanly |
| `singer.png` | 144x144 | Singer idle, 144x144 |
| `singer_sheet.png` | 288x576 | 4 rows (pitch 1-4, colour-coded purple/blue/green/orange) x 2 frames (idle, sing), 144x144 each (288x576) |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Gravel Choir", mascot cameo (Tapper) |
| `wrong_burst.png` | 192x192 | Wrong-catch burst 192x192 |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `singer_sheet.png` (+ `.svg` source) | 288x720 | REPLACED: now 5 rows (C5,A4,G4,F4,D4 = purple, blue, green, orange, rose) x 2 frames (idle, sing), 144x144 each |
