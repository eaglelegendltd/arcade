// Christmas & Advent slate shared helpers (copied into each game by xm-build.py). PLAYER-FACING NAMES LIVE HERE ONLY.
// Titles: Ruby's final slate (19 Oct 2026), public TM searches clear (Sienna). Richie can still veto any name before launch.
var XM_NAMES = {
  'tinselpluck': 'Tinselpluck', 'mincepie-stack': 'Mincepie Stack', 'advent-pocket': 'Advent Pocket', 'holly-hopper': 'Holly Hopper',
  'flue-drop': 'Flue Drop', 'frostnib': 'Frostnib', 'stockingstep': 'Stockingstep', 'wreathweave': 'Wreathweave',
  'snowcrumb': 'Snowcrumb', 'yulewhirl': 'Yulewhirl'
};
// desktop keys: Enter behaves exactly like Space (the one-touch action). Arrow keys are readable via xmKeys[code].
var XM_ACTION_KEYS = ['Enter', 'NumpadEnter'], xmKeys = {};
(function () { function fwd(type, e) { if (XM_ACTION_KEYS.indexOf(e.code) < 0 || e.__xm) return; e.preventDefault(); if (type === 'keydown' && e.repeat) return;
    var k = new KeyboardEvent(type, { code: 'Space', key: ' ', bubbles: true }); k.__xm = 1; window.dispatchEvent(k); }
  addEventListener('keydown', function (e) { xmKeys[e.code] = true; if (e.code === 'Space' || /^Arrow/.test(e.code)) e.preventDefault(); fwd('keydown', e); });
  addEventListener('keyup', function (e) { xmKeys[e.code] = false; fwd('keyup', e); });
  addEventListener('blur', function () { xmKeys = {}; }); })();
function xmLive() { var g = window.__eagle; return !!(g && g.state === 'play' && !g.paused && !g.hostPaused && !g.hidden); }
// seeded randomness: ?seed=N makes runs reproducible (tests). Re-seeded at every run start via xmSeed().
var XM_SEED = (function () { var m = /[?&]seed=(\d+)/.exec(location.search); return m ? +m[1] >>> 0 : null; })(), xmS = XM_SEED;
function xmSeed() { xmS = XM_SEED; }
function xmRand() { if (xmS === null) return Math.random(); xmS = (xmS + 0x6D2B79F5) >>> 0; var t = xmS; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function xmPick(a) { return a[Math.floor(xmRand() * a.length)]; }
function xmClamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- craft rules shared by every game ----
// 1) cheap first misses: xmMiss() forgives the first miss of every run (and the first one after each level up for the first 2 levels).
// 2) a visible 'now' cue: xmNow() draws a pulsing ring + label where the next action lands.
// 3) the first decision is taught for free: each game slows / widens its first target and shows a hint pill until the first success.
function xmMiss(g, why, cost) { var D = g.data; D.flash = 0.25; g.shake(5); g.vibrate(30);
  if (!D.forgiven) { D.forgiven = true; D.toast = { text: 'Close! That one was free', t: 1.6 }; g.sfx('soft', null, 'hit'); return false; }
  D.lives -= cost || 1; g.sfx('miss', null, 'hit'); if (D.lives <= 0) { g.gameOver(why); return true; } return false; }
function xmLives(g, c, icon) { var D = g.data, k = icon || 'holly'; for (var i = 0; i < (D.maxLives || 3); i++) { var x = 338 - i * 26, y = g.safeTop + 74, on = i < D.lives;
    c.globalAlpha = on ? 1 : 0.25; if (g.art[k]) g.sprite(k, x, y, 24, 24); else { c.fillStyle = on ? '#e2363f' : '#888'; c.beginPath(); c.arc(x - 4, y + 3, 5, 0, 7); c.arc(x + 4, y + 3, 5, 0, 7); c.arc(x, y - 4, 5, 0, 7); c.fill(); } c.globalAlpha = 1; } }
function xmNow(g, c, x, y, r, label, col) { var p = g.reducedMotion ? 0.5 : (Math.sin(g.t * 7) + 1) / 2; c.save(); c.strokeStyle = col || '#ffe27a'; c.lineWidth = 3; c.globalAlpha = 0.55 + p * 0.45;
  c.beginPath(); c.arc(x, y, r + p * 5, 0, 7); c.stroke(); if (label) { c.globalAlpha = 1; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(20,24,40,.85)'; c.strokeText(label, x, y - r - 12); c.fillStyle = col || '#ffe27a'; c.fillText(label, x, y - r - 12); } c.restore(); }
function xmPill(g, c, text, y, col) { c.save(); c.font = 'bold 15px system-ui'; c.textAlign = 'center'; var w = c.measureText(text).width + 28; y = g.safeY(y, 14);
  c.fillStyle = 'rgba(16,20,38,.72)'; xmRound(c, 180 - w / 2, y - 18, w, 28, 14); c.fill(); c.fillStyle = col || '#fff'; c.fillText(text, 180, y + 1); c.restore(); }
function xmRound(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function xmToast(g, c) { var D = g.data; if (!D.toast || D.toast.t <= 0) return; c.save(); c.globalAlpha = Math.min(1, D.toast.t * 2); xmPill(g, c, D.toast.text, 170, '#ffe27a'); c.restore(); }
function xmFlash(g, c) { var D = g.data; if (D.flash > 0) { c.fillStyle = 'rgba(255,90,100,' + (D.flash * 1.2) + ')'; c.fillRect(0, 0, 360, 640); } }
function xmTick(g, dt) { var D = g.data; if (D.flash > 0) D.flash = Math.max(0, D.flash - dt); if (D.toast) D.toast.t -= dt;
  (D.fx || []).forEach(function (f) { f.t -= dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; f.vy = (f.vy || 0) + (f.g || 0) * dt; }); if (D.fx) D.fx = D.fx.filter(function (f) { return f.t > 0; }); }
// sparkle burst + floating score text
function xmBurst(g, x, y, n, col) { var D = g.data; D.fx = D.fx || []; if (g.reducedMotion) n = Math.min(n, 3);
  for (var i = 0; i < n; i++) { var a = xmRand() * 6.283, s = 60 + xmRand() * 120; D.fx.push({ k: 'p', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 160, t: 0.5 + xmRand() * 0.3, col: col || '#fff3b0' }); } }
function xmFloat(g, x, y, text, col) { var D = g.data; D.fx = D.fx || []; D.fx.push({ k: 't', x: x, y: y, vy: -50, t: 0.9, text: text, col: col || '#fff' }); }
// one-shot sprite-strip effect from Luna's sheets (e.g. crumb_burst_sheet: 6 frames). Falls back to a sparkle burst if the sheet is missing.
function xmAnim(g, key, x, y, size, frames, dur) { var D = g.data; D.fx = D.fx || []; if (!g.art[key]) { xmBurst(g, x, y, 8); return; }
  D.fx.push({ k: 'a', key: key, x: x, y: y, s: size, n: frames || 6, t: dur || 0.45, d: dur || 0.45 }); }
function xmFx(g, c) { (g.data.fx || []).forEach(function (f) { if (f.k === 'a') { c.globalAlpha = 1; g.frame(f.key, Math.min(f.n - 1, Math.floor((1 - f.t / f.d) * f.n)), 0, f.n, 1, f.x, f.y, f.s, f.s); return; }
  c.globalAlpha = Math.min(1, f.t * 2); if (f.k === 'p') { c.fillStyle = f.col; c.beginPath(); c.arc(f.x, f.y, 2.5, 0, 7); c.fill(); }
  else { c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(20,24,40,.8)'; c.strokeText(f.text, f.x, f.y); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y); } }); c.globalAlpha = 1; }
// gentle falling snow over any scene (cheap; off under reduced motion)
function xmSnow(g, c, n) { if (g.reducedMotion) return; var D = g.data; if (!D.snow) { D.snow = []; for (var i = 0; i < (n || 40); i++) D.snow.push([Math.random() * 360, Math.random() * 640, 0.6 + Math.random() * 1.6]); }
  c.fillStyle = 'rgba(255,255,255,.8)'; D.snow.forEach(function (s) { s[1] += s[2] * 0.6; s[0] += Math.sin((g.t + s[2]) * 1.3) * 0.25; if (s[1] > 640) { s[1] = -4; s[0] = Math.random() * 360; } c.beginPath(); c.arc(s[0], s[1], s[2], 0, 7); c.fill(); }); }
// code-drawn placeholders (used only if a kit/Luna file is missing)
function xmSky(c, top, bot) { var gr = c.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, top || '#16234a'); gr.addColorStop(1, bot || '#3b5a8a'); c.fillStyle = gr; c.fillRect(0, 0, 360, 640); }
function xmBlob(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
// draw an art key or a placeholder; returns nothing
function xmArt(g, key, x, y, w, h, fb, rot) { g.sprite(key, x, y, w, h, fb || function (c, x, y) { xmBlob(c, x, y, Math.min(w, h) / 2.2, '#c33'); }, rot); }
