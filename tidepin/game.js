// Tidepin (flagship). Juice: eased pin, hammer swing, sand/water particles, shake (off under reduced motion),
// score popups, perfect streaks, onboarding hint, new-best celebration. Ground is pre-rendered for 60 fps.
var GROUND = 430, PINX = 180, NOTCH = 11, OB_KEY = 'tidepin-onboarded';
var ground = null;
EagleGame.run({ id: 'tidepin', title: 'Tidepin', howto: 'Each wave shows its strength (▲). Tap to hammer the pin that many notches before it hits. One extra notch is fine; two snaps the pin. One mistake ends the run.',
  art: ['pin', 'hammer', 'wave', 'beach', 'splash_sheet', 'snap_sheet'], levelEvery: 8, likeScore: 15, overSfx: 'washAway',
  achievements: [{ id: 'exact10', score: 10, name: 'Steady Hand' }, { id: 'tide30', score: 30, name: 'Tide Breaker' }, { id: 'tide60', score: 60, name: 'Sea Wall' }],
  init: function (g) {
    var ob = false; try { ob = !localStorage.getItem(OB_KEY); } catch (e) {}
    g.data = { d: 0, vd: 0, lives: 1, wave: null, swing: 0, n: 0, fx: null, parts: [], pops: [], streak: 0, ok: 0, onboard: ob, bestShown: false, bestAt: g.best, tideT: 0 };
    spawn(g, 400);
  },
  down: function (g) {
    var D = g.data; if (D.fx && D.fx.kind === 'snap') return;
    D.d++; D.swing = 1; g.sfx('hammer', null, 'jump'); g.vibrate(8);
    g.shake(2.5); sand(g, 6);
    if (D.wave && D.d > D.wave.s + 1) {
      D.fx = { kind: 'snap', t: 0 }; D.streak = 0; g.sfx('snap', null, 'hit'); g.shake(9); g.vibrate([30, 40, 30]);
      pop(g, 'SNAPPED', '#ff5a6a', 26); g.gameOver('snapped'); // single life: every fail ends the run
    }
  },
  update: function (g, dt) {
    var D = g.data, w = D.wave; D.flash = Math.max(0, (D.flash || 0) - dt); D.tideT += dt;
    D.vd += (D.d - D.vd) * Math.min(1, dt * 18); D.swing = Math.max(0, D.swing - dt * 7);
    if (D.fx) { D.fx.t += dt; if (D.fx.t > 0.55) D.fx = null; }
    w.x -= Math.min(200, 60 + g.level * 12) * dt; w.bob += dt;
    if (w.x <= PINX) {
      if (D.d < w.s) { D.streak = 0; g.shake(7); splash(g, 18); pop(g, 'WASHED AWAY', '#ff5a6a', 24); g.gameOver('washed away'); }
      else {
        var perfect = D.d === w.s; D.streak = perfect ? D.streak + 1 : 0; D.ok++;
        var pts = perfect ? 2 + Math.min(2, Math.floor(D.streak / 4)) : 1; /* streak bonus capped at +2 */
        g.sfx('waveSurvived', null, 'coin'); g.addScore(pts); splash(g, perfect ? 14 : 8); g.shake(perfect ? 3 : 1.5);
        pop(g, perfect ? '+' + pts + (D.streak >= 2 ? '  PERFECT ×' + D.streak : '  PERFECT') : '+1', perfect ? '#ffd166' : '#ffffff', perfect ? 24 : 20);
        if (D.onboard && D.ok >= 3) { D.onboard = false; try { localStorage.setItem(OB_KEY, '1'); } catch (e) {} pop(g, 'You got it!', '#5ee08a', 20); }
        if (!D.bestShown && D.bestAt > 0 && g.score > D.bestAt) { D.bestShown = true; g.sfx('powerUp'); pop(g, 'NEW BEST!', '#ffd166', 34); confetti(g); g.vibrate([20, 30, 20]); }
      }
      D.fx = { kind: 'splash', t: 0 };
      if (g.state === 'play') { D.d = 0; spawn(g, 400 + Math.random() * 60); }
    }
    for (var i = D.parts.length - 1; i >= 0; i--) { var p = D.parts[i]; p.t -= dt; if (p.t <= 0) { D.parts.splice(i, 1); continue; } p.vy += (p.g || 600) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.spin) p.r += p.spin * dt; }
    for (i = D.pops.length - 1; i >= 0; i--) { D.pops[i].t -= dt; if (D.pops[i].t <= 0) D.pops.splice(i, 1); }
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme;
    if (!g.bg()) { c.fillStyle = g.themeName === 'light' ? '#bfe3f2' : '#1b2a44'; c.fillRect(0, 0, 360, GROUND); }
    drawGround(g, c);
    // tide water creeping on the sand (gentle loop)
    var tide = GROUND + 6 + Math.sin(D.tideT * 1.3) * 3; c.fillStyle = 'rgba(70,150,220,.35)'; c.fillRect(0, GROUND - 2, 360, tide - GROUND + 6);
    // depth gauge: target band for the incoming wave
    var w = D.wave, gx = 146;
    for (var i = 1; i <= 7; i++) { var inBand = w && i >= w.s && i <= w.s + 1; c.fillStyle = i <= D.d ? (inBand ? '#5ee08a' : i > (w ? w.s + 1 : 9) ? '#ff5a6a' : '#ffd166') : inBand ? 'rgba(94,224,138,.45)' : 'rgba(0,0,0,.25)';
      c.fillRect(gx, GROUND + i * NOTCH - 4, 12, 6); }
    var depth = D.vd * NOTCH;
    if (D.fx && D.fx.kind === 'snap') g.frame('snap_sheet', Math.min(3, D.fx.t * 8 | 0), 0, 4, 1, PINX, GROUND - 50, 96, 96);
    else g.sprite('pin', PINX, GROUND - 45 + depth, 44, 100, function (c, x, y, w, h) { c.fillStyle = '#c9ced8'; c.fillRect(x - 5, y - h / 2, 10, h); c.fillStyle = '#ff7a59'; c.fillRect(x - 14, y - h / 2, 28, 12); });
    var sw = D.swing, hy = GROUND - 108 + depth + sw * 16;
    g.sprite('hammer', PINX + 34, hy, 64, 64, function (c, x, y) { c.fillStyle = '#8a5a2b'; c.fillRect(x - 3, y - 4, 40, 8); c.fillStyle = '#555'; c.fillRect(x - 14, y - 16, 22, 32); }, -0.5 + sw * 0.9);
    if (D.fx && D.fx.kind === 'splash') g.frame('splash_sheet', Math.min(5, D.fx.t * 12 | 0), 0, 6, 1, PINX, GROUND - 40, 120, 120);
    if (w) { var sz = 50 + w.s * 16, bob = g.reducedMotion ? 0 : Math.sin(w.bob * 6) * 3;
      g.sprite('wave', w.x + sz / 2, GROUND - sz / 2 + 6 + bob, sz, sz, function (c, x, y, ww, hh) { c.fillStyle = 'rgba(60,140,220,.85)'; c.beginPath(); c.arc(x, y + hh / 2, ww / 2, Math.PI, 0); c.fill(); });
      var near = w.x - PINX < 90; c.fillStyle = near ? '#ffd166' : th.fg; c.font = 'bold ' + (near ? 20 : 16) + 'px system-ui'; c.textAlign = 'center'; c.fillText('▲'.repeat(w.s), w.x + sz / 2, GROUND - sz - 8); }
    // particles
    D.parts.forEach(function (p) { c.globalAlpha = Math.min(1, p.t * 2.5); c.fillStyle = p.col;
      if (p.spin) { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillRect(-p.s, -p.s / 2, p.s * 2, p.s); c.restore(); } else c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
    c.globalAlpha = 1;
    c.fillStyle = th.fg; c.font = '14px system-ui'; c.textAlign = 'center';
    if (w) c.fillText('depth ' + D.d + ' · aim for ' + w.s + (D.streak >= 2 ? ' · streak ' + D.streak : ''), 180, g.safeY(GROUND + 92));
    egFlash(g, c);
  },
  drawOver: function (g, c) {
    var D = g.data; if (!D) return;
    D.pops.forEach(function (p) { var k = 1 - p.t / p.life, y = p.y - (g.reducedMotion ? 0 : k * 40), sc = g.reducedMotion ? 1 : 1 + Math.max(0, 0.3 - k) * 1.2;
      c.globalAlpha = Math.min(1, p.t * 3); c.textAlign = 'center'; c.font = 'bold ' + Math.round(p.size * sc) + 'px system-ui';
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.45)'; c.strokeText(p.text, 180, y); c.fillStyle = p.col; c.fillText(p.text, 180, y); });
    c.globalAlpha = 1;
    // onboarding: pulsing finger + exact instruction for the current wave
    if (D.onboard && g.state === 'play' && D.wave) { var left = D.wave.s - D.d, pulse = g.reducedMotion ? 0 : (Math.sin(g.t * 8) + 1) * 0.5;
      c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, 50, 238, 260, 50, 14); c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 18px system-ui'; c.textAlign = 'center';
      c.fillText(left > 0 ? 'Tap ' + left + '× before the wave hits' : left === 0 ? 'Perfect! Now wait…' : 'Careful, one more snaps it', 180, 270);
      if (left > 0) { c.globalAlpha = 0.6 + pulse * 0.4; c.beginPath(); c.arc(PINX + 70, GROUND - 120, 14 + pulse * 6, 0, 7); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); c.globalAlpha = 1; } }
  }
});
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function lim(g, n) { return g.reducedMotion ? Math.ceil(n / 3) : n; }
function add(g, p) { if (g.data.parts.length < 90) g.data.parts.push(p); }
function sand(g, n) { for (var i = 0; i < lim(g, n); i++) add(g, { x: PINX + (Math.random() - 0.5) * 14, y: GROUND + g.data.d * NOTCH - 50, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 120, s: 3, t: 0.45, col: '#e8d29a' }); }
function splash(g, n) { for (var i = 0; i < lim(g, n); i++) add(g, { x: PINX + (Math.random() - 0.3) * 30, y: GROUND - 20, vx: (Math.random() - 0.7) * 220, vy: -150 - Math.random() * 220, s: 4, t: 0.7, col: Math.random() < 0.5 ? '#bfe6ff' : '#ffffff' }); }
function confetti(g) { var cols = ['#ffd166', '#ff5a6a', '#5ee08a', '#5aa9ff', '#ffffff']; for (var i = 0; i < lim(g, 40); i++) add(g, { x: 60 + Math.random() * 240, y: 120, vx: (Math.random() - 0.5) * 200, vy: -100 - Math.random() * 200, g: 380, s: 4, t: 1.6, r: 0, spin: (Math.random() - 0.5) * 12, col: cols[i % 5] }); }
function pop(g, text, col, size, y) { var D = g.data; D.pops.forEach(function (p) { p.y -= size + 8; }); D.pops.push({ text: text, col: col, size: size, y: y || 210, t: 1.1, life: 1.1 }); if (D.pops.length > 4) D.pops.shift(); }
function drawGround(g, c) {
  if (!ground && g.art.beach) { ground = document.createElement('canvas'); ground.width = 360 * 2; ground.height = 210 * 2; var gc = ground.getContext('2d'); gc.scale(2, 2);
    for (var x = 0; x < 360; x += 64) for (var y = 0; y < 210; y += 64) gc.drawImage(g.art.beach, x, y, 64, 64); }
  if (ground) c.drawImage(ground, 0, GROUND, 360, 210); else { c.fillStyle = '#e8d29a'; c.fillRect(0, GROUND, 360, 210); }
}
// gentle start: first 4 waves strength 1-2, then up to 5
function spawn(g, x) { var D = g.data; D.n++; g.sfx('wave'); var mx = D.n <= 4 ? 2 : Math.min(5, 2 + g.level); D.wave = { x: x, s: 1 + Math.floor(Math.random() * mx), bob: 0 }; }
