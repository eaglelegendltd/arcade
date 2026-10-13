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
