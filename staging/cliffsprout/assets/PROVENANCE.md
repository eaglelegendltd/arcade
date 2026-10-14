# Asset provenance: Cliffsprout

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
| `seedpod.png` (+ `.svg` flat source) | 144x144 | Seed-pod character |
| `vine.png` (+ `.svg` flat source) | 96x288 | Vine segment, tall 96x288, root at bottom centre |
| `sprout_sheet.png` (+ `.svg` flat source) | 576x144 | 4-frame sprout growth strip, 144x144 per frame |
| `cliff.png` (+ `.svg` flat source) | 192x192 | Cliff-face tile, opaque |
| `thumbnail_1080x1920.png` | 1080x1920 | 9:16 thumbnail, hand-lettered title "Cliffsprout", cameo of mascot Quill |
| `icon_512.png` (+ `.svg` flat source) | 512x512 | Square icon, rounded corners |
| `bg.png` | 1080x1920 | Opaque background scene (no title) |

## Update 13 Oct 2026 (ART_NEEDS follow-ups, generator `/workspace/art_src/asks.py`, same original v2 pipeline)
| File | Size (px) | What |
|---|---|---|
| `ledge.png` (+ `.svg` source) | 192x510 | NEW: tall rock ledge, grassy top |
| `vine_segment.png` (+ `.svg` source) | 96x96 | NEW: vertically tileable vine segment (cut from the middle of a 3-tile render) |
| `fall_sheet.png` (+ `.svg` source) | 576x144 | NEW: 4-frame pod tumble, 144x144 each |
| `bg.png` (+ `.svg` source) | 1080x1920 | REPLACED: plainer sky-to-rock gradient, no painted cliffs |

## Update 14 Oct 2026 (Ruby's polish ask): `bg.png` made plainer
Same name and size (1080x1920). Previous version backed up to `assets/_v2/bg.png` (+ `bg.svg`). Removed the heavy purple mottling, pulled the sky-to-rock gradient 15% toward a neutral mid tone (luminance std 13.3 → 10.3, range 150–236 → 186–237), kept two very faint clouds and a fine paper grain. Ledges now read cleanly against it (checked with ledge.png composited). Generated in numpy/PIL (inline script); `bg.svg` is the old gradient source. Original work by Luna for Eagle Legend LTD.
