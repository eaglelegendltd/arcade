# Tidepin: STAGING / DEMO build (not for production)
This is a copy of /workspace/batch1/tidepin (Tidepin v3 with the shared eagle-license.js + eagle-bridge.js; assets/_v1 and _v2 excluded). It is local and uncommitted.

**Demo tier switch:** `index.html?tier=STANDARD|WHITE_LABEL|ENTERPRISE_RESKIN|SOURCE` changes the licence tier, for staging/demo only. It works only on localhost/127.0.0.1 and only while `EAGLE_CONFIG.demoTierSwitch` is `true`. The ENTERPRISE_RESKIN demo uses `assets/demo_reskin/`, which holds hue-shifted DEMO art and is not licensee art.

**Before a production or licensee build:** set `demoTierSwitch: false` (top of game.js) and delete `assets/demo_reskin/`. Then set `tier`, `allowedDomains`, `allowedAppIds` (for wrapped apps) and, for WHITE_LABEL, `clientLogo`/`clientLink`. See LICENSING.md. The domain and app-ID locks are client-side deterrents only; the contract enforces.

## Water prototype (opt-in)
`?water=gl` turns on the WebGL water (visual only). `?waterTier=high|med|low` locks the quality tier. The default is the 2D waves. It falls back to 2D when there is no WebGL, on context loss, with reduced motion, or when auto-downgrade finds it too slow.
