# Asset provenance: Wickmoth Relay

All assets in this folder are **original work by Luna (Art & Animation Director) for Eagle Legend LTD**, made on 2026-10-13 in the v2 hand-drawn style.
No third-party, stock or copyrighted assets were used, and no existing creatures or IP were copied or imitated. The user's virtual-pet reference sheets were viewed only for the general rendering feel (inked outlines, airbrush shading, chibi proportions).

**How it was made:**
1. **Flat art:** shapes are hand-written as SVG primitives in `/workspace/art_src/gen_b2.py` and rasterised with CairoSVG at up to 4x the final size. Glossy eye highlights are added automatically.
2. **Hand-drawn pass:** `/workspace/art_src/hd.py` applies SVG filters, rendered in headless Google Chrome:
   - wobble displacement;
   - a thick, uneven outer ink line built from the dilated alpha, over the thinner inner lines;
   - cel shadow and highlight from offset blurred alpha;
   - mottled turbulence texture and light grain.
   The result is then downsampled to the exact file size. Sprites keep transparent backgrounds.
3. **Thumbnails:** a stylised background and sprites, plus a title drawn with Luna's own wobbly stroke alphabet (`/workspace/art_src/letters.py`, no font file) and a cameo of an Eagle Legend mascot from `/workspace/mascots/v2/`. Everything is composed in `/workspace/art_src/render_v2.py`.


Rebuild: `cd /workspace/art_src && /workspace/.venv/bin/python render_v2.py batch2`.

| File | Size (px) | What |
|---|---|---|
| `moth.png` (+ `.svg` flat source) | 144x144 | Moth carrier character (wings level) |
| `moth_sheet.png` (+ `.svg` flat source) | 576x144 | 4-frame wing-flap strip, 144x144 per frame |
| `candle.png` (+ `.svg` flat source) | 120x300 | Unlit candle, tall 120x300, wick at top centre |
| `candle_lit.png` (+ `.svg` flat source) | 120x300 | Lit candle, same frame as candle.png |
| `flame_sheet.png` (+ `.svg` flat source) | 384x96 | 4-frame flicker strip, 96x96 per frame |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Wickmoth Relay", cameo of mascot Quill |
| `icon_512.png` (+ `.svg` flat source) | 512x512 | Square icon, rounded corners |
| `bg.png` | 1080x1920 | Opaque background scene (no title) |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `darkness_edge.png` (+ `.svg` source) | 1080x240 | NEW: smoky top edge of the rising dark, transparent to opaque #0e0a18 (made directly as an SVG gradient + turbulence in Chrome) |
