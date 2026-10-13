# Tidepin: STAGING / DEMO build (not for production)
This is a copy of /workspace/batch1/tidepin (Tidepin v3). It is local and uncommitted.

**Demo tier switch:** `index.html?tier=STANDARD|WHITE_LABEL|ENTERPRISE_RESKIN` changes the licence tier, for staging/demo only. It works only on localhost/127.0.0.1 and only while `EAGLE_CONFIG.demoTierSwitch` is `true`. The ENTERPRISE_RESKIN demo uses `assets/demo_reskin/`, which holds hue-shifted DEMO art and is not licensee art.

**Before a production or licensee build:** set `demoTierSwitch: false` (top of game.js) and delete `assets/demo_reskin/`. Then set `tier`, `allowedDomains` and, for WHITE_LABEL, `clientLogo`/`clientLink`. See LICENSING.md. The domain lock is a client-side deterrent only.
