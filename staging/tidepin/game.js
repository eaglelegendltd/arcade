/* Tidepin v3: tide-timing strike game. Eagle Legend LTD.
 * Licensing (tiers, domain/app-id lock, logo, reskin, ?tier= demo switch) lives in the shared eagle-license.js; see LICENSING.md.
 * Reskin keys: pin, hammer, bg.
 */

// ---------------- gameplay constants ----------------
var GROUND = 430, PINX = 180, ZONE_Y = GROUND - 70, DUR_MAX = 5, NOTCHES = 5, OB_KEY = 'tidepin3-onboarded';
var groundCanvas = null;

function startTidepin() {
  var G = EagleGame.run({ id: 'tidepin', title: 'Tidepin',
    howto: 'The tide rises and falls. Strike when the water is LOW to drive the pin. Perfect low-tide strikes build a combo; striking underwater or mistimed cracks the pin. A broken pin ends the run.',
    art: ['pin', 'hammer', 'wave', 'beach', 'snap_sheet', 'splash_sheet'], /* splash_sheet v3: water only (the old one had a pin baked in) */ reskinKeys: ['pin', 'hammer', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#8ac3de', bottom: { tile: 'beach', size: 64, originY: 430, tint: 'rgba(52,130,210,.55)', color: '#c5a571' } },
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
      g.data = { dur: DUR_MAX, depth: 0, ph: 0, period: 3.4, tide: 0, prevTide: 0, struck: false, tried: false, hurt: 0, troughSeen: false, combo: 0, mult: 1,
        swing: 0, cool: 0, parts: [], pops: [], breaking: -1, splashT: -1, crack: 0, onboard: ob, okHits: 0, bestShown: false, bestAt: g.best, judge: null, peakDone: false, wave: -1 };
    },
    down: function (g) { strike(g); },
    update: update, draw: draw, drawOver: drawOver
  });
  return G;
}

// tide height 0 (low) .. 1 (high). Rhythmic: a sine with a slight surge shape; period shrinks with score.
function tideAt(ph) { var s = (1 - Math.cos(ph * Math.PI * 2)) / 2; return Math.pow(s, 0.85); }
function periodFor(g) { var t = g.t, s = g.score; if (t < 20) return 3.4; return Math.max(1.45, 3.4 - (s - 5) * 0.025 - (t - 20) * 0.01); }
function coolFor(g) { return Math.max(0.16, 0.42 - g.score * 0.0025); } // hammer gets faster with score
// judgement windows on tide height (water covers the target zone above COVER)
var PERFECT = 0.14, GOOD = 0.3, COVER = 0.62, HURT_COOL = 0.8; // HURT_COOL: s after a damage during which no further damage applies

function strike(g) {
  var D = g.data; if (D.breaking >= 0 || D.cool > 0) return;
  D.swing = 1; D.cool = coolFor(g); g.sfx('hammer', null, 'jump'); g.vibrate(8); sand(g, 5); g.shake(2);
  var h = D.tide, j; D.tried = true; // any strike this cycle counts as an attempt (no extra 'missed low tide' on top)
  if (h > COVER) { j = 'underwater'; damage(g, 1, 'UNDERWATER −1'); g.sfx('waterImpact', 0.9, 'hit'); splash(g, 10); }
  else if (D.struck) { j = 'double'; damage(g, 1, 'TOO MANY −1'); }
  else if (h <= PERFECT) { j = 'perfect'; D.combo++; D.mult = Math.min(5, 1 + Math.floor(D.combo / 2)); var pts = 2 * D.mult;
    g.addScore(pts); drive(g); g.sfx('perfectStrike', null, 'coin'); D.splashT = 0; splash(g, 12); g.shake(3);
    pop(g, '+' + pts + (D.mult > 1 ? '  PERFECT ×' + D.mult : '  PERFECT'), '#ffd166', 24); }
  else if (h <= GOOD) { j = 'good'; g.addScore(D.mult > 1 ? D.mult - 1 : 1); /* good keeps the combo; only mistakes reset it */ drive(g); pop(g, '+' + (D.mult > 1 ? D.mult - 1 : 1), '#ffffff', 20); }
  else { j = 'mistimed'; damage(g, 1, 'MISTIMED −1'); }
  if (j === 'perfect' || j === 'good') { D.struck = true; D.okHits++; if (D.onboard && D.okHits >= 3) { D.onboard = false; try { localStorage.setItem(OB_KEY, '1'); } catch (e) {} pop(g, 'You got it!', '#5ee08a', 20); } }
  D.judge = (j === 'perfect' || j === 'good') ? { kind: j, t: 0.6 } : null; // mistakes: the damage popup is the one message
  if (!D.bestShown && D.bestAt > 0 && g.score > D.bestAt) { D.bestShown = true; g.sfx('powerUp'); pop(g, 'NEW BEST!', '#ffd166', 32); confetti(g); g.vibrate([20, 30, 20]); }
}
function drive(g) { var D = g.data; D.depth++; if (D.depth >= NOTCHES) { D.depth = 0; D.dur = Math.min(DUR_MAX, D.dur + 1); g.addScore(5); pop(g, 'PIN SET +5 · durability +1', '#5ee08a', 18); g.sfx('powerUp'); } }
// one mistake = one damage + one message: a short hit cooldown swallows any further damage (double taps, the
// low-tide-missed check on the same cycle, overlapping triggers). Returns true if damage was applied.
function damage(g, n, label) {
  var D = g.data; D.combo = 0; D.mult = 1; if (D.hurt > 0 || D.breaking >= 0) return false; D.hurt = HURT_COOL; D.damageEvents = (D.damageEvents || 0) + 1;
  D.dur = Math.max(0, D.dur - n); D.crack = 0.4; if (D.dur > 0) g.sfx('pinDamage', 1 - D.dur / DUR_MAX, 'hit'); g.shake(6); g.vibrate(40); pop(g, label, '#ff5a6a', 22);
  if (D.dur <= 0) { D.breaking = 0; g.sfx('pinSnap', null, 'hit'); g.shake(10); }
}

function update(g, dt) { g.dt = dt;
  var D = g.data; D.crack = Math.max(0, D.crack - dt); D.swing = Math.max(0, D.swing - dt * 6); D.cool = Math.max(0, D.cool - dt); D.hurt = Math.max(0, D.hurt - dt);
  if (D.judge) { D.judge.t -= dt; if (D.judge.t <= 0) D.judge = null; }
  if (D.splashT >= 0) { D.splashT += dt; if (D.splashT > 0.5) D.splashT = -1; }
  if (D.wave != null && D.wave >= 0) { D.wave += dt; if (D.wave > 0.5) D.wave = -1; }
  stepParts(D, dt);
  if (D.breaking >= 0) { D.breaking += dt; if (D.breaking > 0.6) g.gameOver('pin broke'); return; } // snap anim, then game over
  D.period = periodFor(g); D.prevTide = D.tide; D.ph += dt / D.period; D.tide = tideAt(D.ph);
  var cyc = D.ph % 1;
  // new low-tide window opens after each high tide
  if (D.tide > COVER) { D.struck = false; if (D.ph % 1 > 0.25 && D.ph % 1 < 0.75) D.tried = false; }
  if (D.tide > 0.97 && !D.peakDone) { D.peakDone = true; g.sfx('waterImpact', 0.3); D.splashT = 0; D.wave = 0; splash(g, 6); }
  if (D.tide < 0.5) D.peakDone = false;
  // a low tide that passes with no strike loosens the pin (pressure to act every cycle). Grace: first 2 cycles.
  if (D.tide <= GOOD && cyc > 0.5) D.troughSeen = true;
  if (D.troughSeen && D.tide > GOOD && D.prevTide <= GOOD) { D.troughSeen = false; if (!D.struck && !D.tried && D.ph > 2) damage(g, 1, 'MISSED LOW TIDE −1'); }
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
  var sw = D.swing; if (D.breaking < 0) g.sprite('hammer', PINX + 34, pinTop - 52 + sw * 18, 64, 64, function (c, x, y) { c.fillStyle = '#8a5a2b'; c.fillRect(x - 3, y - 4, 40, 8); c.fillStyle = '#555'; c.fillRect(x - 14, y - 16, 22, 32); }, -0.5 + sw * 0.9);
  // strike splash: Luna's water-only splash_sheet (6 frames) at the pin head, ~96 px; code ring if the sheet is missing
  if (D.splashT >= 0) { if (g.art.splash_sheet) g.frame('splash_sheet', Math.min(5, D.splashT * 12 | 0), 0, 6, 1, PINX, ZONE_Y + 4 + D.depth * 10, 96, 96); else splashRing(g, c, D.splashT); }
  // water: level from below ground (low) to over the target zone (high)
  var lowY = GROUND + 28, highY = TIDE_MAX_Y, wy = lowY + (highY - lowY) * D.tide, bob = g.reducedMotion ? 0 : Math.sin(g.t * 3) * 2;
  { // 2D water
  c.fillStyle = 'rgba(52,130,210,.55)'; c.fillRect(0, wy + bob, 360, 660 - wy) /* past the bottom edge: no untinted sub-pixel row (tan seam) */;
  c.fillStyle = 'rgba(220,240,255,.7)'; c.fillRect(0, wy + bob - 2, 360, 3);
  if (g.art.wave) { var off = (g.t * 40) % 36; for (var x = -36 + off; x < 360; x += 36) c.drawImage(g.art.wave, x, wy + bob - 26, 36, 36); }
  }
  // high-tide crest splash (Luna v3 water-only sheet, 6 frames) at the waterline over the pin
  if (D.wave != null && D.wave >= 0) g.frame('splash_sheet', Math.min(5, D.wave * 12 | 0), 0, 6, 1, PINX, wy + bob - 30, 120, 120);
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
function splashRing(g, c, t) { var k = t / 0.5; c.globalAlpha = Math.max(0, 0.7 * (1 - k)); c.strokeStyle = '#e6f6ff'; c.lineWidth = 3;
  c.beginPath(); c.ellipse(PINX, ZONE_Y + 18 + g.data.depth * 10, 14 + 40 * k, 5 + 10 * k, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
// bg v3 (Luna): sky, then sand down to y=320 logical (=1080x1920 y960, the tide's max level), plain sand to the ground line
// y=430 (y1290) = GROUND. The animated water rises from below GROUND to TIDE_MAX_Y.
var TIDE_MAX_Y = 320;

function drawGround(g, c) {
  var top = GROUND, hh = 640 - top;
  if ((!groundCanvas || groundCanvas.top !== top) && g.art.beach) { groundCanvas = document.createElement('canvas'); groundCanvas.top = top; groundCanvas.width = 720; groundCanvas.height = hh * 2; var gc = groundCanvas.getContext('2d'); gc.scale(2, 2);
    for (var x = 0; x < 360; x += 64) for (var y = 0; y < hh; y += 64) gc.drawImage(g.art.beach, x, y, 64, 64); }
  if (groundCanvas) c.drawImage(groundCanvas, 0, top, 360, hh); else { c.fillStyle = '#e8d29a'; c.fillRect(0, top, 360, hh); }
}

startTidepin(); // licensing gate is applied by eagle-license.js (wraps EagleGame.run)
