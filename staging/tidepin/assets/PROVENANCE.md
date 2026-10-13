# Asset provenance: Tidepin

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
| `beach.png` | 192x192 | Seamless sand tile (dots wrap across edges), opaque |
| `bg.png` | 1080x1920 | Optional opaque background (scene only, no title) |
| `hammer.png` | 128x128 | Hammer sprite (game draws at 64x64) |
| `icon_512.png` | 512x512 | Square icon (rounded corners, transparent outside) |
| `pin.png` | 144x330 | Tall pin character, 144x330 (cropped viewBox, not stretched) |
| `snap_sheet.png` | 768x192 | 4-frame horizontal strip, 192x192 per frame (768x192), pin breaks |
| `splash_sheet.png` | 1152x192 | 6-frame horizontal strip, 192x192 per frame (1152x192), wave hits the pin |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Tidepin", mascot cameo (Leggy v3) |
| `wave.png` | 420x420 | Wave, crest at top, flat bottom edge |

## eagle_legend_logo.png (13 Oct 2026)
384x384 transparent PNG. This is the official Eagle Legend LTD company logo, supplied by Richie Legend (the owner): a green wing made of an upside-down L plus two feather strokes, reading EL. Luna only trimmed, centred and resized it, keeping the original transparency, with fill #4FA62C. The shape is unchanged.

## Update 13 Oct 2026, 15:30: clean beach `bg.png` + `beach.png` (no painted water)
The previous v2 versions are backed up in `_v2/`: `bg.png/.svg`, `beach.png/.svg`, and the old `demo_reskin_bg.png`. The v1 flat files are still in `_v1/`.
- **`bg.png`** (1080x1920, opaque) has **no water anywhere**. From top to bottom:
  - **Sky, y 0–840:** sky gradient, a sun at the top right (880, 270) and two clouds.
  - **Horizon, y ≈ 840:** low green dunes/headland, with an ink line at y 840.
  - **Dry sand, y 840–960:** with grass tufts and two shells, kept clear of the pin column.
  - **Plain sand, y 960–1290:** slightly darker, with faint ripple marks only. y 960 is the highest point the tide reaches.
  - **Ground, y 1290–1920:** compacted ground in the beach-tile colour, so it matches where the code tiles `beach.png` from GROUND = 430 (1290 px).
  - **Tide range:** the game's tide rises from y 1374 (low) to y 960 (high) (game.js: lowY = GROUND+28, highY = ZONE_Y−40, ×3).
  - Rendered with the v2 hand-drawn pass and softer mottling (`mott=0.35`).
- **`beach.png`** (192x192, opaque, seamless): compacted tan sand with grains, a shell and a pebble, all wrapped across the edges, with stitched noise and no wobble so it tiles cleanly.
- **`demo_reskin/bg.png`** (1080x1920): DEMO ONLY. The same new bg with a hue shift of +110/256 (matching the previous demo) applied **above the horizon only**, because shifting the sand turned it water-blue.
- **Generator:** `/workspace/art_src/tidepin_beach.py`. Original work by Luna for Eagle Legend LTD.
- **Preview:** `/workspace/batch1/screenshots/tidepin_bg_v3_preview.png`, showing the bg alone, low tide, high tide, and the demo reskin, composited with the pin, wave row and tide overlay at their in-game positions.

## Update 13 Oct 2026, 16:20 (art audit): `splash_sheet.png` redrawn with no pin
Same name and size: 1152x192, 6 frames of 192x192. The old version had a pin baked into every frame, so game.js skips it. The new one is water only: a splash mound rises and falls while droplets scatter outwards and shrink. It's centred on x 96 per frame with the base at y ≈ 177. It's opaque colour throughout, because translucent fades turn dark under the ink pass. Old version backed up as `_v2/splash_sheet.png/.svg`. Original work by Luna for Eagle Legend LTD.
