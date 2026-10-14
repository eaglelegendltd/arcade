# Asset provenance: Echo Quarry

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
| `cart.png` (+ `.svg` flat source) | 192x192 | Mine cart with mole rider and head-lamp (character) |
| `track.png` (+ `.svg` flat source) | 192x192 | Vertical track tile, opaque, tiles top-to-bottom |
| `ping_sheet.png` (+ `.svg` flat source) | 768x192 | 4-frame sonar ping expanding ring, 192x192 per frame |
| `junction_sign.png` (+ `.svg` flat source) | 120x120 | Junction arrow sign |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Echo Quarry", cameo of mascot Tapper |
| `icon_512.png` (+ `.svg` flat source) | 512x512 | Square icon, rounded corners |
| `bg.png` | 1080x1920 | Opaque background scene (no title) |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `fork_sheet.png` (+ `.svg` source) | 384x288 | NEW: 2 frames 192x288 (0 = left branch, 1 = right branch), transparent overlay |
| `rubble.png` (+ `.svg` source) | 72x72 | NEW: rubble pile for the unsafe branch |

## Update 13 Oct 2026, 11:30 (Ivy's ask): `fork_sheet.png` widened
Same file name, size (384x288, 2 frames of 192x288), frame order (0 = left branch, 1 = right branch) and v2 hand-drawn style. The branch now leaves the straight track near the bottom (y ≈ 273 px) and curves out, so its centreline reaches **±70 px from the frame's 96 px centre line at the top edge**: x ≈ 26 px in frame 0 and x ≈ 166 px in frame 1. Before, it was about ±30. Branch rails sit ±24 px either side of that centreline, and the straight track (rails at x 60 and 132 px) continues to the top. Generator: `fork()` in `/workspace/art_src/asks.py`. Original work by Luna for Eagle Legend LTD.

## Check 14 Oct 2026: `fork_sheet.png` spread
Ruby asked for ~±70 px of 96 at the top. Verified the current file (13 Oct widening, `fork()` in `/workspace/art_src/asks.py`) already reaches ±70 px (branch centreline x ≈ 26 / 166 px at the top edge). Unchanged, so no backup needed.
