# Asset provenance: Doorkeep Hollow

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
| `door.png` | 300x480 | Door shut 300x480, hinge on left edge |
| `door_open.png` | 300x480 | Door open 300x480, same viewBox/hinge pivot as door.png |
| `doorframe_bg.png` | 330x810 | Room behind the door, opaque 330x810 |
| `guest.png` | 156x156 | Guest 156x156 |
| `guest_sheet.png` | 624x156 | 4 walk frames, 156x156 each (624x156) |
| `icon_512.png` | 512x512 | Square icon (rounded corners, transparent outside) |
| `junk.png` | 156x156 | Junk (scrap plate) 156x156 |
| `junk_variants.png` | 624x156 | 4 junk types (scrap plate, dented tin can, broken crate, old boot), 156x156 each (624x156) |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Doorkeep Hollow", mascot cameo (Leggy v3) |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `doorframe_bg.png` (+ `.svg` source) | 330x810 | REPLACED: room opening is exactly x 0-300 (left, hinge side), full height; x 300-330 is the right jamb post. Rendered without wobble so the edge is exact |
