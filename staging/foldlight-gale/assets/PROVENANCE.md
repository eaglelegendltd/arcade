# Asset provenance: Foldlight Gale

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
| `blowout_sheet.png` | 2400x420 | 5-frame strip, 480x420 per frame (2400x420), flame snuffs out and smoke rises |
| `glow.png` | 1140x1140 | Soft radial glow, transparent edge, additive-friendly (kept from v1 on purpose: a soft gradient or palette swatch needs no ink) |
| `gust.png` | 270x270 | Gust pointing right, 270x270 |
| `icon_512.png` | 512x512 | Square icon (rounded corners, transparent outside) |
| `lantern.png` | 480x420 | Lantern fully open (frame 6 of the sheet) |
| `lantern_closed.png` | 480x420 | Lantern folded shut (frame 0 of the sheet) |
| `lantern_sheet.png` | 3360x420 | 7-frame strip (0-6 panels open), 480x420 per frame (3360x420) |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Foldlight Gale", mascot cameo (Quill) |
