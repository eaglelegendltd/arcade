# Asset provenance: Pendulum Bakery

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
| `dough.png` (+ `.svg` flat source) | 144x144 | Dough-ball character (the swinging piece) |
| `baker.png` (+ `.svg` flat source) | 192x192 | Baker character (order-giver / mascot of the game) |
| `pendulum.png` (+ `.svg` flat source) | 120x360 | Pendulum arm and claw, pivot at top centre |
| `tray.png` (+ `.svg` flat source) | 360x120 | Moving baking tray |
| `bread_shapes.png` (+ `.svg` flat source) | 432x144 | 3 baked results: centre=round loaf, edge=crescent, half-on=half loaf; 144x144 each |
| `order_card.png` (+ `.svg` flat source) | 240x300 | Order card (shows target shape) |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Pendulum Bakery", cameo of mascot Leggy |
| `icon_512.png` (+ `.svg` flat source) | 512x512 | Square icon, rounded corners |
| `bg.png` | 1080x1920 | Opaque background scene (no title) |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `land_puff_sheet.png` (+ `.svg` source) | 768x192 | NEW (optional): 4-frame flour puff, 192x192 each; soft flat render (no ink pass, which muddied the translucent puffs) |
