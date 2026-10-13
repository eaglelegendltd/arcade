# Tidepin licensing (B2B)

**This is a client-side deterrent only.** Anyone holding the files can edit `EAGLE_CONFIG` or delete the check. What actually protects the game is the licence contract, plus hosting controls on our side: per-licensee builds, CSP `frame-ancestors` on our hosts, and takedowns.

## Config (top of `tidepin/game.js`)
- `tier`: `STANDARD` (default), `WHITE_LABEL`, `ENTERPRISE_RESKIN` or `SOURCE`.
  - SOURCE (plan C source licence and E exclusive buy-out): no logo, no outbound links, and **no domain or app lock**. What the buyer may do (sites/apps covered, no resale, exclusivity) is set only by that buyer's signed contract. A header comment in game.js points to it.
  - STANDARD: a semi-transparent Eagle Legend logo (`assets/eagle_legend_logo.png`) sits top-left on a subtle backing chip. If the image is missing it shows an "EL" text badge instead. Clicking it opens https://www.eaglelegend.com in a new tab. The click is stopped before it reaches the game, so it never counts as a tap.
  - WHITE_LABEL: no Eagle Legend logo or links. Optional `clientLogo` (image path) and `clientLink` (https only, opened `_blank` with `noopener`) show the licensee's logo in the same spot. This closes Gap 1 in tier_mapping.md. If `clientLogo` is unset there is no logo and no links.
  - ENTERPRISE_RESKIN: no logo. `sprites: {pin, hammer, bg}` replaces those image paths. `sprites` is ignored on the other tiers.
- `defaultDomains`: eaglelegend.com (subdomains included), eaglelegendltd.github.io, localhost, 127.0.0.1, and file://.
- `allowedDomains`: an array (`'x'` matches x, www.x and any subdomain; `'*.x'` matches subdomains only, not the apex) of extra domains for one licensee. Each entry also matches its subdomains by exact `'.'+domain` suffix, not by substring: `noteaglelegend.com` and `eaglelegend.com.evil.example` are both blocked (tested).
- `demoTierSwitch`: turns the local `?tier=` demo switch on or off. **Set it to false for production/licensee builds.**
- Tier mapping to the business plan (DRAFT, see /workspace/licensing/tier_mapping.md): STANDARD=A, WHITE_LABEL=B, ENTERPRISE_RESKIN=D, SOURCE=C and E.
- On any other host the game shows a polite "isn't licensed for this site" screen. Nothing runs and no events are sent.

## Per-licensee builds
Edit `EAGLE_CONFIG`, or ship a `licensee.js` that is loaded before `game.js` and sets:
`window.EAGLE_LICENSEE = { tier:'WHITE_LABEL', licensee:'Partner Ltd', allowedDomains:['games.partner.com'] }`
(also add it to the index.html script list). Its values are merged over the defaults.

## Demo switch (local only)
`test-host.html?tier=STANDARD|WHITE_LABEL|ENTERPRISE_RESKIN`, or the tier dropdown on the test host, passes `?tier=` to the Tidepin iframe. `game.js` only honours it when the hostname is localhost or 127.0.0.1. On a production host it is ignored (tested). The ENTERPRISE_RESKIN demo uses `assets/demo_reskin/`, which holds hue-shifted DEMO copies, not real licensee art.

## Tests
`node test-licensing.js` checks: blocked host, subdomain, licensee domain, each tier, logo click not counted as a tap, reskin paths, the demo switch, and the EagleGrantXP milestone path.

## Wrapped apps (`allowedAppIds`)
This is a deterrent only. Any real app ID can be spoofed by whoever controls the wrapper; the contract (naming the app IDs it covers) is what enforces it.
- Optional `allowedAppIds: ['com.partner.tidepin']`. If the domain check passes, the game runs at once. Otherwise, when `allowedAppIds` is set, the game looks for `?appId=<id>` in the URL; if that's missing, it waits up to `appIdWaitMs` (1500 ms) for the wrapper to post `{type:'app-id', appId}`. A listed ID runs the game. A wrong ID, a timeout, or no `allowedAppIds` at all shows the not-licensed screen.
- Scheme rule: once `allowedAppIds` is set, non-http(s) pages (`file:`, `capacitor:`, `ionic:`, `app:` and so on) no longer get the localhost/file defaults; they must present a listed ID. http(s) hosts use the domain list as usual.
- Known gap: Capacitor Android serves from `https://localhost`, which passes as a dev host. For Android builds, configure Capacitor to use a custom hostname or scheme, or accept that this is a deterrent.
- SOURCE ignores both locks.
- Tests: `node test-licensing.js` (app ID by URL, by message, wrong ID, timeout, none configured, SOURCE on any host) and `node test-appscheme.js` (file:, capacitor:, https://localhost rules).
