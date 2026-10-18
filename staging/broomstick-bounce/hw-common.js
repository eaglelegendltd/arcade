// Halloween batch shared helpers (copied into each game by build.sh). EDIT NAMES HERE ONLY: trade-mark checks may change them.
var HW_NAMES = {
  'broomstick-bounce': 'Broomstick Bounce',
  'glowgourd-dash': 'Glowgourd Dash',
  'treatdrop-bucket': 'Treatdrop Bucket',
  'gourdburst': 'Gourdburst',
  'batwing-bridges': 'Batwing Bridges',
  'eggshade-nursery': 'Eggshade Nursery',
  'gloomlinks': 'Gloomlinks',
  'cauldron-stir': 'Cauldron Stir',
  'spellsock-sorting': 'Spellsock Sorting',
  'moonlit-mazelings': 'Moonlit Mazelings'
};
// desktop keys: Enter (and any code in HW_ACTION_KEYS) behaves exactly like Space, i.e. the main one-touch action.
// Games may push extra codes (e.g. 'ArrowUp') and read held arrows via hwKeys[code].
var HW_ACTION_KEYS = ['Enter', 'NumpadEnter'], hwKeys = {};
(function () { function fwd(type, e) { if (HW_ACTION_KEYS.indexOf(e.code) < 0 || e.__hw) return; e.preventDefault(); if (type === 'keydown' && e.repeat) return;
    var k = new KeyboardEvent(type, { code: 'Space', key: ' ', bubbles: true }); k.__hw = 1; window.dispatchEvent(k); }
  addEventListener('keydown', function (e) { hwKeys[e.code] = true; if (e.code === 'Space' || /^Arrow/.test(e.code)) e.preventDefault(); fwd('keydown', e); });
  addEventListener('keyup', function (e) { hwKeys[e.code] = false; fwd('keyup', e); });
  addEventListener('blur', function () { hwKeys = {}; }); })();
// true when a run is live and unpaused (for game-level key handlers)
function hwLive() { var g = window.__eagle; return !!(g && g.state === 'play' && !g.paused && !g.hostPaused && !g.hidden); }
// random runs; ?seed=N makes a run reproducible (tests). Re-seeded at every run start via hwSeed().
var HW_SEED = (function () { var m = /[?&]seed=(\d+)/.exec(location.search); return m ? +m[1] >>> 0 : null; })(), hwS = HW_SEED;
function hwSeed() { hwS = HW_SEED; }
function hwRand() { if (hwS === null) return Math.random(); hwS = (hwS + 0x6D2B79F5) >>> 0; var t = hwS; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function hwPick(a) { return a[Math.floor(hwRand() * a.length)]; }
// procedural spooky-cute placeholders (used when Luna's art isn't in assets/)
function hwSky(c, top, bot) { var gr = c.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, top || '#1b1240'); gr.addColorStop(1, bot || '#3a1f4f'); c.fillStyle = gr; c.fillRect(0, 0, 360, 640);
  c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(290, 90, 34, 0, 7); c.fill(); c.fillStyle = top || '#1b1240'; c.beginPath(); c.arc(304, 82, 30, 0, 7); c.fill(); }
function hwEyes(c, x, y, s) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x - s, y, s * 0.8, 0, 7); c.arc(x + s, y, s * 0.8, 0, 7); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(x - s, y + s * 0.15, s * 0.4, 0, 7); c.arc(x + s, y + s * 0.15, s * 0.4, 0, 7); c.fill(); }
function hwPumpkin(c, x, y, r, col) { c.fillStyle = col || '#ff8a1f'; for (var i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(x + i * r * 0.45, y, r * 0.6, r * 0.85, 0, 0, 7); c.fill(); }
  c.fillStyle = '#3c8a3a'; c.fillRect(x - r * 0.1, y - r * 1.05, r * 0.2, r * 0.35); c.fillStyle = 'rgba(40,20,0,.7)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.1, r * 0.13, 0, 7); c.arc(x + r * 0.3, y - r * 0.1, r * 0.13, 0, 7); c.fill();
  c.beginPath(); c.arc(x, y + r * 0.2, r * 0.3, 0.2, Math.PI - 0.2); c.lineWidth = Math.max(1.5, r * 0.1); c.strokeStyle = 'rgba(40,20,0,.7)'; c.stroke(); }
function hwGhost(c, x, y, r) { c.fillStyle = '#f4f0ff'; c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.lineTo(x + r, y + r); for (var i = 0; i < 4; i++) c.lineTo(x + r - (i + 0.5) * r / 2, y + r * (i % 2 ? 1 : 0.7)); c.lineTo(x - r, y + r); c.fill(); hwEyes(c, x, y - r * 0.1, r * 0.25); }
function hwSpider(c, x, y, r) { c.strokeStyle = '#ccc'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y - r); c.stroke(); c.strokeStyle = '#2a1a3a'; c.lineWidth = 2.5;
  for (var i = 0; i < 4; i++) { var a = 0.3 + i * 0.3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * 1.6, y + r * (a - 0.7) * 2); c.moveTo(x, y); c.lineTo(x + r * 1.6, y + r * (a - 0.7) * 2); c.stroke(); }
  c.fillStyle = '#2a1a3a'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); hwEyes(c, x, y - r * 0.15, r * 0.3); }
// draw frame from Luna's per-game sheet if loaded; returns false so callers can fall back to kit sprite / placeholder
function hwFrame(g, key, col, cols, rows, x, y, w, h, rot) { if (!g.art[key]) return false; g.frame(key, Math.floor(col), 0, cols, rows || 1, x, y, w, h, null, rot); return true; }
