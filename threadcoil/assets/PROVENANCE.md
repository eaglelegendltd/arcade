# Asset provenance: Threadcoil

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
| `runner.png` | 90x90 | Runner facing right 90x90 |
| `snap.png` | 180x180 | Thread snap burst 180x180 |
| `spool.png` | 210x210 | Top-down spool 210x210 |
| `thread.png` | 128x128 | Thread swatch (not used by the game) |
| `thread_tint.png` | 400x100 | Thread age palette swatch (new to old); hex values in thread_tint.json (kept from v1 on purpose: a soft gradient or palette swatch needs no ink) |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Threadcoil", mascot cameo (Tapper) |
| `thread_tint.json` | n/a | Thread-age palette (4 hex colours) |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `wound_burst.png` (+ `.svg` source) | 360x360 | NEW (optional): burst of snapped thread loops around a star |
