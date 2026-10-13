# Eagle Legend games: licensing (all 10 games, both batches)

**This is a client-side deterrent only.** Anyone holding the files can edit or delete it. What actually protects the games is the signed licence contract (which names the domains and app IDs it covers), plus hosting controls on our side.

## Where it lives
- Master copy: `/workspace/batch1/eagle-license.js`. `build.sh` (in both batches) copies it into every game, along with `shared-assets/eagle_legend_logo.png` → `assets/`.
- Load order in each `index.html`: `[licensee.js]`, audio-kit, pack, `eagle-bridge.js`, `eagle-license.js`, `_common.js`, `game.js`. `build.sh` adds `licensee.js` only when the game folder has one.
- `eagle-license.js` wraps `EagleGame.run(def)`, so each game only declares:
  - `reskinKeys`: the sprite keys a reskin may replace (see the table below)
  - `logo: {side, top}`: where its logo sits, in CSS px from the top of the play area. All games use top-left at 52 px, below the player name and clear of every HUD element (checked automatically by `test-shots.js`) and nowhere near the bottom 80 px. It is also offset by the device safe-area insets (`env(safe-area-inset-left/top)`).

## Config: `window.EAGLE_CONFIG` (defaults), overridden by `window.EAGLE_LICENSEE` in `licensee.js`
| key | meaning |
|---|---|
| `tier` | `STANDARD` (default), `WHITE_LABEL`, `ENTERPRISE_RESKIN` or `SOURCE` |
| `showLogo`, `logoSrc`, `logoUrl` | STANDARD: semi-transparent Eagle Legend logo on a subtle backing chip ("EL" text badge if the image is missing). Clicking it opens eaglelegend.com in a new tab. |
| `clientLogo`, `clientLink` | WHITE_LABEL only, optional: the licensee's logo in the same spot. The link must be https and opens `_blank` with `noopener`. Without them there is no logo and no links. |
| `sprites` | ENTERPRISE_RESKIN only: `{key: 'path.png'}`. Keys not in the game's `reskinKeys` are ignored. |
| `defaultDomains` / `allowedDomains` | An entry `x` matches x, www.x and any subdomain, by exact `'.'+x` suffix and never by substring, so `noteaglelegend.com` and `eaglelegend.com.evil.example` are both blocked. `*.x` matches subdomains only, not x itself. `''` means a file:// page. |
| `allowedAppIds`, `appIdWaitMs` | Wrapped apps. The game runs if the domain check passes **or** the app ID is listed. The ID comes from `?appId=` or from a `{type:'app-id', appId}` postMessage sent within `appIdWaitMs` (1500 ms). Once this list is set, non-http(s) pages (`file:`, `capacitor:`, `ionic:`, ...) must present a listed ID. Known gap: Capacitor Android serves from `https://localhost`. |
| `demoTierSwitch` | Enables `?tier=` (case-insensitive) **only** on localhost/127.0.0.1, or exactly `eaglelegendltd.github.io` with a path starting `/arcade/staging/`. When the switch applies a tier, a red `STAGING · <TIER>` badge shows at the top. ENTERPRISE_RESKIN in demo mode uses `assets/demo_reskin/<key>.png` (hue-shifted DEMO art). **Set this to false and delete `assets/demo_reskin/` for production/licensee builds.** |

On any host that isn't licensed, a polite "isn't licensed for this site" screen appears. The game doesn't run and sends no events.

## Tiers vs. the business plan (DRAFT, see /workspace/licensing/tier_mapping.md)
STANDARD = A (as-is, with credit) · WHITE_LABEL = B (unbranded, optional client logo) · ENTERPRISE_RESKIN = D (reskin) · SOURCE = C (source licence) and E (exclusive buy-out). SOURCE is unbranded with no domain or app lock; its scope is set entirely by that buyer's contract [PLACEHOLDER: contract reference].

## Reskin sprite keys per game (`sprites` keys for ENTERPRISE_RESKIN)
Animation sheets are excluded on purpose, because a reskinned sheet would need the same frame layout. Ask before adding one.
| game | keys |
|---|---|
| tidepin | pin, hammer, bg |
| foldlight-gale | lantern, gust, glow, bg |
| gravel-choir | pebble, singer, row, bg |
| threadcoil | spool, runner, thread, bg |
| doorkeep-hollow | door, guest, junk, doorframe_bg, bg |
| wickmoth-relay | candle, moth, darkness_edge, bg |
| pendulum-bakery | pendulum, dough, tray, baker, bg (pendulum: 120x360 with the pivot at the top) |
| kiteknot | kite, ring, stake, cloud, bg |
| echo-quarry | cart, track, rubble, bg |
| cliffsprout | vine, seedpod, cliff, ledge, bg |
Replacement art should match the original file's pixel size (see ART_NEEDS.md).

## Per-licensee build
Create `<game>/licensee.js`:
`window.EAGLE_LICENSEE = { tier:'WHITE_LABEL', licensee:'Partner Ltd', allowedDomains:['partner.com'], clientLogo:'assets/partner.png', clientLink:'https://partner.com', demoTierSwitch:false };`
Then run `build.sh` and delete `assets/demo_reskin/`.

## Tests
- `node test-licensing-all.js`: 39 checks per game across all 10 games: tiers, client logo, https-only links, reskin keys, SOURCE, domains, app IDs, staging switch and badge, demo flag, logo taps, logo placement and safe area, canvas filling the viewport and following resizes.
- `node test-licensing.js` (Tidepin detail), `test-stagingpath.js`, `test-appscheme.js` (file:/capacitor: rules), `test-shots.js` (STANDARD screenshots plus a logo/HUD overlap check).
