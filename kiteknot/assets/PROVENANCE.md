# Asset provenance: Kiteknot

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
| `kite.png` (+ `.svg` flat source) | 210x210 | Kite character, nose up; tether attaches at bottom tip |
| `stake.png` (+ `.svg` flat source) | 90x150 | Ground stake (tether anchor at top ring) |
| `ring.png` (+ `.svg` flat source) | 180x180 | High-wind score ring |
| `cloud.png` (+ `.svg` flat source) | 300x180 | Background cloud |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Kiteknot", cameo of mascot Tapper |
| `icon_512.png` (+ `.svg` flat source) | 512x512 | Square icon, rounded corners |
| `bg.png` | 1080x1920 | Opaque background scene (no title) |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `snap_sheet.png` (+ `.svg` source) | 768x192 | NEW: 4-frame line snap, 192x192 each |
