/* Tidepin v3: tide-timing strike game. Eagle Legend LTD.
 *
 * LICENSING: EAGLE_CONFIG below controls the B2B tier and allowed domains. This is a CLIENT-SIDE DETERRENT ONLY:
 * anyone with the files can edit or strip it. Real protection is contractual (licence agreement), plus server-side
 * hosting controls (licensee-specific builds, signed URLs, CSP frame-ancestors on our hosts). See LICENSING.md.
 * Per-licensee builds: edit EAGLE_CONFIG here, or ship a licensee.js loaded before game.js that sets
 * window.EAGLE_LICENSEE = { tier, licensee, allowedDomains:[...], allowedAppIds:[...], sprites:{...} } (merged over the defaults).
 *
 * SOURCE tier (plan C source licence / E exclusive buy-out): no logo, no outbound links, NO domain or app lock.
 * Use and coverage are governed entirely by the signed licence contract for that buyer (sites/apps covered, no resale,
 * exclusivity for E). [PLACEHOLDER: contract reference / solicitor-drafted terms per buyer]
 */
var EAGLE_CONFIG = {
  // tier -> plan tier (see /workspace/licensing/tier_mapping.md, DRAFT pending Richie):
  //   STANDARD = A (as-is with credit), WHITE_LABEL = B (unbranded; buyer may add own logo), ENTERPRISE_RESKIN = D (reskin).
  //   SOURCE = C (source licence) and E (exclusive buy-out): unbranded, unlocked, scope set by the contract.
  tier: 'STANDARD',                 // 'STANDARD' | 'WHITE_LABEL' | 'ENTERPRISE_RESKIN' | 'SOURCE'
  // wrapped apps (WebView/Capacitor/PWA store builds): app ids the wrapper may pass via postMessage {type:'app-id', appId}
  // or ?appId=. The game runs if the domain check passes OR the app id is listed. Deterrent only; the contract enforces.
  allowedAppIds: [],
  appIdWaitMs: 1500,                // how long to wait for the wrapper's app-id message before showing the not-licensed screen
  clientLogo: '',                   // WHITE_LABEL only, optional: the licensee's logo shown in place of ours
  clientLink: '',                   // WHITE_LABEL only, optional: opened _blank with noopener on click (https only)
  demoTierSwitch: true,             // ?tier= demo switch (localhost/staging only). MUST be false for production/licensee builds
  licensee: 'Eagle Legend LTD',
  showLogo: true,                   // STANDARD only; WHITE_LABEL and ENTERPRISE_RESKIN force this off
  logoUrl: 'https://www.eaglelegend.com',
  logoSrc: 'assets/eagle_legend_logo.png',
  // default allowed hosts (subdomains of each are allowed too). '' = opened as a local file (file://)
  defaultDomains: ['eaglelegend.com', 'eaglelegendltd.github.io', 'localhost', '127.0.0.1', ''],
  allowedDomains: [],               // per-licensee additions; each entry also matches its subdomains (exact '.'+domain suffix, not substring)
  sprites: {}                       // ENTERPRISE_RESKIN only: { pin: 'skin/pin.png', hammer: 'skin/hammer.png', bg: 'skin/bg.png' }
};
(function () { var o = window.EAGLE_LICENSEE; if (o && typeof o === 'object') for (var k in o) EAGLE_CONFIG[k] = o[k];
  // DEMO SWITCH (local test host only): ?tier=... is honoured ONLY on localhost/127.0.0.1, never on production hosts.
  // ENTERPRISE_RESKIN demo uses assets/demo_reskin/ (locally generated recolours, labelled DEMO).
  var h = location.hostname; if (EAGLE_CONFIG.demoTierSwitch && (h === 'localhost' || h === '127.0.0.1' || (h === 'eaglelegendltd.github.io' && location.pathname.indexOf('/arcade/staging/') === 0))) { var m = /[?&]tier=(STANDARD|WHITE_LABEL|ENTERPRISE_RESKIN|SOURCE)\b/i.exec(location.search);
    if (m) { m[1] = m[1].toUpperCase(); EAGLE_CONFIG.tier = m[1]; if (m[1] !== 'WHITE_LABEL') EAGLE_CONFIG.clientLogo = EAGLE_CONFIG.clientLink = ''; EAGLE_CONFIG.showLogo = m[1] === 'STANDARD'; if (m[1] === 'ENTERPRISE_RESKIN') EAGLE_CONFIG.sprites = { pin: 'assets/demo_reskin/pin.png', hammer: 'assets/demo_reskin/hammer.png', bg: 'assets/demo_reskin/bg.png' }; } }
  if (EAGLE_CONFIG.tier !== 'STANDARD') EAGLE_CONFIG.showLogo = false;
  if (EAGLE_CONFIG.tier !== 'WHITE_LABEL') { EAGLE_CONFIG.clientLogo = ''; EAGLE_CONFIG.clientLink = ''; }
  if (EAGLE_CONFIG.tier !== 'ENTERPRISE_RESKIN') EAGLE_CONFIG.sprites = {}; })();

function eagleHostAllowed(host) {
  host = String(host || '').toLowerCase().replace(/\.$/, '');
  var list = EAGLE_CONFIG.defaultDomains.concat(EAGLE_CONFIG.allowedDomains || []);
  for (var i = 0; i < list.length; i++) { var d = String(list[i]).toLowerCase();
    if (d.slice(0, 2) === '*.') { d = d.slice(2); if (d && host.slice(-(d.length + 1)) === '.' + d) return true; continue; } // '*.x' = subdomains of x only
    if (d === '' ? host === '' : (host === d || host.slice(-(d.length + 1)) === '.' + d)) return true; } // 'x' = x, www.x, any.sub.x
  return false;
}

// ---------------- gameplay constants ----------------
var GROUND = 430, PINX = 180, ZONE_Y = GROUND - 70, DUR_MAX = 5, NOTCHES = 5, OB_KEY = 'tidepin3-onboarded';
var groundCanvas = null;

// Licence gate. App-wrapper schemes (file:, capacitor:, ionic:, app:, ...) never get a free pass from the
// localhost/'' defaults once allowedAppIds is set: an app build must present a listed app id. Plain http(s) hosts use
// the domain list as normal (http(s)://localhost still passes, for dev; note Capacitor Android serves https://localhost,
// so on that platform the lock is weaker - deterrent only).
function eagleDomainOk() {
  if (EAGLE_CONFIG.tier === 'SOURCE') return true;
  var proto = location.protocol, ids = EAGLE_CONFIG.allowedAppIds || [];
  if (ids.length && !/^https?:$/.test(proto)) return false;
  return eagleHostAllowed(location.hostname);
}
function eagleAppIdOk(id) { var ids = EAGLE_CONFIG.allowedAppIds || []; return !!id && ids.indexOf(String(id)) >= 0; }
(function gate() {
  var started = false, timer = 0;
  function go(how) { if (started) return; started = true; clearTimeout(timer); window.__eagleLicensedBy = how; startTidepin(); }
  function block() { if (started) return; started = true; removeEventListener('message', onMsg);
    document.addEventListener('DOMContentLoaded', blockScreen); if (document.readyState !== 'loading') blockScreen(); }
  function onMsg(e) { var d = e.data; if (d && d.type === 'app-id') { removeEventListener('message', onMsg); eagleAppIdOk(d.appId) ? go('app-id-message') : block(); } }
  if (eagleDomainOk()) return go('domain');
  if (!(EAGLE_CONFIG.allowedAppIds || []).length) return block();
  var q = /[?&]appId=([^&#]+)/.exec(location.search); if (q) return eagleAppIdOk(decodeURIComponent(q[1])) ? go('app-id-param') : block();
  addEventListener('message', onMsg); timer = setTimeout(block, EAGLE_CONFIG.appIdWaitMs || 1500);
})();

function blockScreen() {
  if (document.getElementById('eg-license')) return;
  document.body.style.cssText = 'margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#10141f;color:#f2f4f8;font-family:system-ui,sans-serif;text-align:center';
  var d = document.createElement('div'); d.id = 'eg-license'; d.setAttribute('role', 'alert'); d.style.cssText = 'max-width:300px;padding:24px';
  d.innerHTML = '<h1 style="font-size:24px;margin:0 0 10px">Tidepin</h1><p style="opacity:.85;line-height:1.4">Sorry, this game isn\u2019t licensed for this site.</p>' +
    '<p style="opacity:.6;font-size:13px">If you run this site, contact the game\u2019s publisher to arrange a licence.</p>';
  document.body.appendChild(d); window.__eagleBlocked = true;
}

function startTidepin() {
  var G = EagleGame.run({ id: 'tidepin', title: 'Tidepin',
    howto: 'The tide rises and falls. Strike when the water is LOW to drive the pin. Perfect low-tide strikes build a combo; striking underwater or mistimed cracks the pin. A broken pin ends the run.',
    art: ['pin', 'hammer', 'wave', 'beach', 'splash_sheet', 'snap_sheet'], artPaths: EAGLE_CONFIG.sprites,
    levelEvery: 12, likeScore: 25, overSfx: null,
    achievements: [{ id: 'tide15', score: 15, name: 'Steady Hand', xp: 20 }, { id: 'tide50', score: 50, name: 'Tide Breaker', xp: 40 }, { id: 'tide120', score: 120, name: 'Sea Wall', xp: 80 }],
    // milestones -> window.EagleGrantXP if the page provides it (guarded), else the bridge's postMessage events
    onMilestone: function (g, kind, data) {
      var fn = null; try { fn = window.EagleGrantXP || (window.parent !== window && window.parent.EagleGrantXP); } catch (e) { fn = null; }
      if (typeof fn !== 'function') return false;
      try { fn({ game: 'tidepin', event: kind, id: data.id || ('level' + g.level), name: data.name || ('Level ' + g.level), xp: data.xp || 10, score: g.score, level: g.level }); return true; }
      catch (e) { return false; }
    },
    init: function (g) {
      var ob = false; try { ob = !localStorage.getItem(OB_KEY); } catch (e) {}
      g.data = { dur: DUR_MAX, depth: 0, ph: 0, period: 3.4, tide: 0, prevTide: 0, struck: false, troughSeen: false, combo: 0, mult: 1,
        swing: 0, cool: 0, parts: [], pops: [], breaking: -1, splashT: -1, crack: 0, onboard: ob, okHits: 0, bestShown: false, bestAt: g.best, judge: null, peakDone: false };
    },
    down: function (g) { strike(g); },
    update: update, draw: draw, drawOver: drawOver
  });
  if (EAGLE_CONFIG.showLogo) watermark(EAGLE_CONFIG.logoSrc, EAGLE_CONFIG.logoUrl, 'Eagle Legend: opens eaglelegend.com in a new tab', 'EL');
  else if (EAGLE_CONFIG.tier === 'WHITE_LABEL' && EAGLE_CONFIG.clientLogo) watermark(EAGLE_CONFIG.clientLogo, /^https:\/\//.test(EAGLE_CONFIG.clientLink) ? EAGLE_CONFIG.clientLink : '', (EAGLE_CONFIG.licensee || 'Licensee') + (EAGLE_CONFIG.clientLink ? ': opens in a new tab' : ''), '');
  return G;
}

// tide height 0 (low) .. 1 (high). Rhythmic: a sine with a slight surge shape; period shrinks with score.
function tideAt(ph) { var s = (1 - Math.cos(ph * Math.PI * 2)) / 2; return Math.pow(s, 0.85); }
function periodFor(g) { var t = g.t, s = g.score; if (t < 20) return 3.4; return Math.max(1.45, 3.4 - (s - 5) * 0.025 - (t - 20) * 0.01); }
function coolFor(g) { return Math.max(0.16, 0.42 - g.score * 0.0025); } // hammer gets faster with score
// judgement windows on tide height (water covers the target zone above COVER)
var PERFECT = 0.1, GOOD = 0.3, COVER = 0.62;

function strike(g) {
  var D = g.data; if (D.breaking >= 0 || D.cool > 0) return;
  D.swing = 1; D.cool = coolFor(g); g.sfx('hammer', null, 'jump'); g.vibrate(8); sand(g, 5); g.shake(2);
  var h = D.tide, j;
  if (h > COVER) { j = 'underwater'; damage(g, 2, 'UNDERWATER −2'); g.sfx('waterImpact', 0.9, 'hit'); splash(g, 10); }
  else if (D.struck) { j = 'double'; damage(g, 1, 'TOO MANY −1'); }
  else if (h <= PERFECT) { j = 'perfect'; D.combo++; D.mult = Math.min(5, 1 + Math.floor(D.combo / 3)); var pts = 2 * D.mult;
    g.addScore(pts); drive(g); g.sfx('perfectStrike', null, 'coin'); D.splashT = 0; splash(g, 12); g.shake(3);
    pop(g, '+' + pts + (D.mult > 1 ? '  PERFECT ×' + D.mult : '  PERFECT'), '#ffd166', 24); }
  else if (h <= GOOD) { j = 'good'; D.combo = 0; D.mult = 1; g.addScore(1); drive(g); pop(g, '+1', '#ffffff', 20); }
  else { j = 'mistimed'; D.combo = 0; D.mult = 1; damage(g, 1, 'MISTIMED −1'); }
  if (j === 'perfect' || j === 'good') { D.struck = true; D.okHits++; if (D.onboard && D.okHits >= 3) { D.onboard = false; try { localStorage.setItem(OB_KEY, '1'); } catch (e) {} pop(g, 'You got it!', '#5ee08a', 20); } }
  D.judge = { kind: j, t: 0.6 };
  if (!D.bestShown && D.bestAt > 0 && g.score > D.bestAt) { D.bestShown = true; g.sfx('powerUp'); pop(g, 'NEW BEST!', '#ffd166', 32); confetti(g); g.vibrate([20, 30, 20]); }
}
function drive(g) { var D = g.data; D.depth++; if (D.depth >= NOTCHES) { D.depth = 0; D.dur = Math.min(DUR_MAX, D.dur + 1); g.addScore(5); pop(g, 'PIN SET +5 · durability +1', '#5ee08a', 18); g.sfx('powerUp'); } }
function damage(g, n, label) {
  var D = g.data; D.combo = 0; D.mult = 1; D.dur = Math.max(0, D.dur - n); D.crack = 0.4; if (D.dur - n > 0) g.sfx('pinDamage', 1 - (D.dur - n) / DUR_MAX, 'hit'); g.shake(6); g.vibrate(40); pop(g, label, '#ff5a6a', 22);
  if (D.dur <= 0) { D.breaking = 0; g.sfx('pinSnap', null, 'hit'); g.shake(10); }
}

function update(g, dt) {
  var D = g.data; D.crack = Math.max(0, D.crack - dt); D.swing = Math.max(0, D.swing - dt * 6); D.cool = Math.max(0, D.cool - dt);
  if (D.judge) { D.judge.t -= dt; if (D.judge.t <= 0) D.judge = null; }
  if (D.splashT >= 0) { D.splashT += dt; if (D.splashT > 0.5) D.splashT = -1; }
  stepParts(D, dt);
  if (D.breaking >= 0) { D.breaking += dt; if (D.breaking > 0.6) g.gameOver('pin broke'); return; } // snap anim, then game over
  D.period = periodFor(g); D.prevTide = D.tide; D.ph += dt / D.period; D.tide = tideAt(D.ph);
  var cyc = D.ph % 1;
  // new low-tide window opens after each high tide
  if (D.tide > COVER && D.struck) D.struck = false;
  if (D.tide > 0.97 && !D.peakDone) { D.peakDone = true; g.sfx('waterImpact', 0.3); D.splashT = 0; splash(g, 6); }
  if (D.tide < 0.5) D.peakDone = false;
  // a low tide that passes with no strike loosens the pin (pressure to act every cycle). Grace: first 2 cycles.
  if (D.tide <= GOOD && cyc > 0.5) D.troughSeen = true;
  if (D.troughSeen && D.tide > GOOD && D.prevTide <= GOOD) { D.troughSeen = false; if (!D.struck && D.ph > 2) damage(g, 1, 'MISSED LOW TIDE −1'); }
}

function draw(g, c) {
  var D = g.data, th = g.theme;
  if (!g.bg()) { c.fillStyle = g.themeName === 'light' ? '#bfe3f2' : '#1b2a44'; c.fillRect(0, 0, 360, GROUND); }
  drawGround(g, c);
  var depth = D.depth * 10, pinTop = ZONE_Y - 8 + depth;
  // target zone band around the pin head
  c.fillStyle = 'rgba(255,209,102,.18)'; c.fillRect(PINX - 40, ZONE_Y - 26 + depth, 80, 40);
  // pin (cracks shown by durability)
  if (D.breaking >= 0) g.frame('snap_sheet', Math.min(3, D.breaking * 7 | 0), 0, 4, 1, PINX, ZONE_Y + 20, 110, 110);
  else { var wob = D.crack > 0 && !g.reducedMotion ? Math.sin(D.crack * 60) * 0.05 : 0;
    g.sprite('pin', PINX, ZONE_Y + 40 + depth, 44, 100, function (c, x, y, w, h) { c.fillStyle = '#c9ced8'; c.fillRect(x - 5, y - h / 2, 10, h); c.fillStyle = '#ff7a59'; c.fillRect(x - 14, y - h / 2, 28, 12); }, wob);
    if (D.dur < DUR_MAX) { c.strokeStyle = 'rgba(40,20,20,.85)'; c.lineWidth = 1.5; c.beginPath();
      for (var k = 0; k < DUR_MAX - D.dur; k++) { var cy = ZONE_Y + 10 + depth + k * 14; c.moveTo(PINX - 4, cy); c.lineTo(PINX + 2, cy + 5); c.lineTo(PINX - 2, cy + 10); } c.stroke(); } }
  // hammer
  var sw = D.swing; g.sprite('hammer', PINX + 34, pinTop - 52 + sw * 18, 64, 64, function (c, x, y) { c.fillStyle = '#8a5a2b'; c.fillRect(x - 3, y - 4, 40, 8); c.fillStyle = '#555'; c.fillRect(x - 14, y - 16, 22, 32); }, -0.5 + sw * 0.9);
  if (D.splashT >= 0) g.frame('splash_sheet', Math.min(5, D.splashT * 12 | 0), 0, 6, 1, PINX, ZONE_Y + 10, 120, 120);
  // water: level from below ground (low) to over the target zone (high)
  var lowY = GROUND + 28, highY = ZONE_Y - 40, wy = lowY + (highY - lowY) * D.tide, bob = g.reducedMotion ? 0 : Math.sin(g.t * 3) * 2;
  c.fillStyle = 'rgba(52,130,210,.55)'; c.fillRect(0, wy + bob, 360, 640 - wy);
  c.fillStyle = 'rgba(220,240,255,.7)'; c.fillRect(0, wy + bob - 2, 360, 3);
  if (g.art.wave) { var off = (g.t * 40) % 72; for (var x = -72 + off; x < 360; x += 72) c.drawImage(g.art.wave, x, wy + bob - 26, 36, 36); }
  // tide meter (right side): green low window, red covered zone
  var mx = 326, top = 150, hgt = 220; c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(mx, top, 14, hgt);
  c.fillStyle = 'rgba(255,90,106,.55)'; c.fillRect(mx, top, 14, hgt * (1 - COVER));
  c.fillStyle = 'rgba(94,224,138,.6)'; c.fillRect(mx, top + hgt * (1 - GOOD), 14, hgt * GOOD);
  c.fillStyle = '#ffd166'; c.fillRect(mx, top + hgt * (1 - PERFECT), 14, hgt * PERFECT);
  c.fillStyle = '#fff'; c.fillRect(mx - 4, top + hgt * (1 - D.tide) - 2, 22, 4);
  c.fillStyle = th.fg; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('TIDE', mx + 7, top - 6);
  // durability bar (clear, top-left under player info)
  var bx = 12, by = 128; c.fillStyle = th.fg; c.font = 'bold 11px system-ui'; c.textAlign = 'left'; c.fillText('PIN', bx, by - 4);
  for (var i = 0; i < DUR_MAX; i++) { c.fillStyle = i < D.dur ? (D.dur <= 2 ? '#ff5a6a' : '#5ee08a') : 'rgba(0,0,0,.3)'; c.fillRect(bx + i * 16, by, 13, 9); }
  // combo + depth line (bottom-safe)
  c.fillStyle = th.fg; c.font = '14px system-ui'; c.textAlign = 'center';
  c.fillText('combo ×' + D.mult + (D.combo ? ' (' + D.combo + ')' : '') + ' · pin ' + D.depth + '/' + NOTCHES, 180, g.safeY(GROUND + 92));
  if (D.judge) { c.globalAlpha = Math.min(1, D.judge.t * 3); c.fillStyle = D.judge.kind === 'perfect' ? '#ffd166' : D.judge.kind === 'good' ? '#5ee08a' : '#ff5a6a'; c.font = 'bold 15px system-ui';
    c.fillText(D.judge.kind.toUpperCase(), PINX, ZONE_Y - 96); c.globalAlpha = 1; }
  drawParts(D, c);
}

function drawOver(g, c) {
  var D = g.data; if (!D || !D.pops) return;
  D.pops.forEach(function (p) { var k = 1 - p.t / p.life, y = p.y - (g.reducedMotion ? 0 : k * 40), sc = g.reducedMotion ? 1 : 1 + Math.max(0, 0.3 - k) * 1.2;
    c.globalAlpha = Math.min(1, p.t * 3); c.textAlign = 'center'; c.font = 'bold ' + Math.round(p.size * sc) + 'px system-ui';
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.45)'; c.strokeText(p.text, 180, y); c.fillStyle = p.col; c.fillText(p.text, 180, y); });
  c.globalAlpha = 1;
  if (D.onboard && g.state === 'play' && D.breaking < 0) { var low = D.tide <= GOOD, pulse = g.reducedMotion ? 0 : (Math.sin(g.t * 8) + 1) * 0.5;
    c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, 40, 238, 280, 52, 14); c.fill();
    c.fillStyle = low ? '#5ee08a' : '#fff'; c.font = 'bold 17px system-ui'; c.textAlign = 'center';
    c.fillText(low ? 'Low tide: STRIKE now!' : D.tide > COVER ? 'Underwater: wait…' : 'Wait for low tide (green)', 180, 270);
    c.globalAlpha = 0.5 + pulse * 0.5; c.strokeStyle = low ? '#5ee08a' : '#fff'; c.lineWidth = 3; c.strokeRect(322, 146, 22, 228); c.globalAlpha = 1; }
}

// ---------------- watermark (STANDARD tier) ----------------
function watermark(src, url, label, fbText) {
  var wrap = document.getElementById('eg-wrap'); if (!wrap) return;
  var a = document.createElement('button'); a.id = 'eg-logo'; a.type = 'button'; a.setAttribute('aria-label', label); if (!url) a.style.cursor = 'default';
  a.style.cssText = 'position:absolute;left:8px;top:52px;width:44px;height:44px;padding:4px;border:0;border-radius:12px;z-index:6;cursor:pointer;' +
    'background:rgba(255,255,255,.28);box-shadow:0 1px 4px rgba(0,0,0,.25);opacity:.6;display:flex;align-items:center;justify-content:center';
  var img = document.createElement('img'); img.alt = ''; img.src = src; img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none';
  img.onerror = function () { a.removeChild(img); if (!fbText) { a.remove(); return; } a.textContent = fbText; a.style.font = 'bold 15px system-ui'; a.style.color = '#4FA62C'; };
  a.appendChild(img);
  // the logo must never count as a game tap: stop the pointer/touch events before the canvas/overlay handlers see them
  ['pointerdown', 'pointerup', 'touchstart', 'mousedown'].forEach(function (t) { a.addEventListener(t, function (e) { e.stopPropagation(); }, true); });
  a.addEventListener('keydown', function (e) { e.stopPropagation(); });
  a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (url) try { window.open(url, '_blank', 'noopener'); } catch (err) {} });
  wrap.appendChild(a);
}

// ---------------- juice helpers ----------------
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function lim(g, n) { return g.reducedMotion ? Math.ceil(n / 3) : n; }
function add(g, p) { if (g.data.parts.length < 90) g.data.parts.push(p); }
function sand(g, n) { for (var i = 0; i < lim(g, n); i++) add(g, { x: PINX + (Math.random() - 0.5) * 14, y: ZONE_Y + g.data.depth * 10 - 10, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 120, s: 3, t: 0.45, col: '#e8d29a' }); }
function splash(g, n) { for (var i = 0; i < lim(g, n); i++) add(g, { x: PINX + (Math.random() - 0.5) * 40, y: ZONE_Y, vx: (Math.random() - 0.5) * 240, vy: -150 - Math.random() * 220, s: 4, t: 0.7, col: Math.random() < 0.5 ? '#bfe6ff' : '#ffffff' }); }
function confetti(g) { var cols = ['#ffd166', '#ff5a6a', '#5ee08a', '#5aa9ff', '#ffffff']; for (var i = 0; i < lim(g, 40); i++) add(g, { x: 60 + Math.random() * 240, y: 120, vx: (Math.random() - 0.5) * 200, vy: -100 - Math.random() * 200, g: 380, s: 4, t: 1.6, r: 0, spin: (Math.random() - 0.5) * 12, col: cols[i % 5] }); }
function stepParts(D, dt) { for (var i = D.parts.length - 1; i >= 0; i--) { var p = D.parts[i]; p.t -= dt; if (p.t <= 0) { D.parts.splice(i, 1); continue; } p.vy += (p.g || 600) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.spin) p.r += p.spin * dt; }
  for (i = D.pops.length - 1; i >= 0; i--) { D.pops[i].t -= dt; if (D.pops[i].t <= 0) D.pops.splice(i, 1); } }
function drawParts(D, c) { D.parts.forEach(function (p) { c.globalAlpha = Math.min(1, p.t * 2.5); c.fillStyle = p.col;
  if (p.spin) { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillRect(-p.s, -p.s / 2, p.s * 2, p.s); c.restore(); } else c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }); c.globalAlpha = 1; }
function pop(g, text, col, size) { var D = g.data; D.pops.forEach(function (p) { p.y -= size + 8; }); D.pops.push({ text: text, col: col, size: size, y: 210, t: 1.1, life: 1.1 }); if (D.pops.length > 4) D.pops.shift(); }
function drawGround(g, c) {
  if (!groundCanvas && g.art.beach) { groundCanvas = document.createElement('canvas'); groundCanvas.width = 720; groundCanvas.height = 420; var gc = groundCanvas.getContext('2d'); gc.scale(2, 2);
    for (var x = 0; x < 360; x += 64) for (var y = 0; y < 210; y += 64) gc.drawImage(g.art.beach, x, y, 64, 64); }
  if (groundCanvas) c.drawImage(groundCanvas, 0, GROUND, 360, 210); else { c.fillStyle = '#e8d29a'; c.fillRect(0, GROUND, 360, 210); }
}
