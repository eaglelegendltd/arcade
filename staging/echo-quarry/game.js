// Draft title. Dark quarry: forks are visible but which branch is safe is only revealed by a sonar ping.
var CARTY = 520, ZONE = 170, BR = 35, CARTX = 24, PINGY = 160; // fork_sheet: split ~15 px above frame bottom, branch top centres at +-70 of 192 px -> +-35 logical at the frame top (y-144)
EagleGame.run({ id: 'echo-quarry', title: 'Echo Quarry', howto: 'Forks come at you in the dark. The first fork is free. Tap left or right to pick a track (keys: Left/Right). Tap the top of the screen (or press Up/Space) to ping sonar (cuts your multiplier).',
  art: ['cart', 'track', 'junction_sign', 'ping_sheet', 'fork_sheet', 'rubble'], reskinKeys: ['cart', 'track', 'rubble', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#070607', bottom: '#272329' }, levelEvery: 8, likeScore: 15, overSfx: 'crash',
  achievements: [{ id: 'mine10', score: 10, name: 'Deep Digger' }, { id: 'mine50', score: 50, name: 'Echo Master' }],
  init: function (g) { g.data = { lives: 3, j: [], dist: 0, side: 'L', mult: 2, ping: 0, pingT: -1, clack: 0, jn: 0 };
    for (var i = 0; i < 4; i++) addJ(g); g.data.j[0].seen = 1; g.data.j[0].freeReveal = 1; },
  down: function (g) {
    // Direct choice (no toggle): left half = left track, right half = right track. Top band (HUD) = sonar ping.
    // Space (keyboard, no tap position) = ping. Left/Right/Up keys are handled below.
    if (g.tapX == null || g.tapY == null) return ping(g);
    if (onButton(g)) return; // pause/mute hit areas and the theme's top-right HUD: never a ping or a pick
    if (g.tapY < PINGY) return ping(g);
    pick(g, g.tapX >= 180 ? 'R' : 'L');
  },
  update: function (g, dt) {
    var D = g.data, sp = Math.min(300, 120 + g.level * 18); D.flash = Math.max(0, (D.flash || 0) - dt);
    D.dist += sp * dt; D.ping = Math.max(0, D.ping - dt); if (D.pingT >= 0) { D.pingT += dt; if (D.pingT > 0.6) D.pingT = -1; }
    D.clack += sp * dt; if (D.clack > 64) { D.clack = 0; g.sfx('railClack'); }
    D.j.forEach(function (j) { var y = jy(D, j);
      if (!j.near && CARTY - y < ZONE) { j.near = 1; g.sfx('junctionNear'); }
      if (!j.done && y >= CARTY) { j.done = 1;
        if (D.side === j.safe) { g.addScore(D.mult); D.mult = Math.min(8, D.mult + 1); g.sfx('gem', null, 'coin'); /* pack mirrors the multiplier (forkPass / multMax at x8) */ }
        else { D.mult = 1; g.sfx('crash', null, 'hit'); egLoseLife(g, 'wrong track', true); } } });
    D.j = D.j.filter(function (j) { return jy(D, j) < 700; }); while (D.j.length < 4) addJ(g);
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; g.bg();
    var off = D.dist % 64; for (var y = -64; y < 640; y += 64) g.sprite('track', 180, y + off + 32, 64, 64, function (c, x, y) { c.fillStyle = th.dim; c.fillRect(x - 18, y - 32, 4, 64); c.fillRect(x + 14, y - 32, 4, 64); });
    D.j.forEach(function (j) { var y = jy(D, j); if (y < -40) return; var show = j.seen && (D.ping > 0 || j.done || j.freeReveal);
      // fork_sheet: frame 0 = left branch, 1 = right branch (192x288 each), drawn bottom-anchored at the fork point
      ['L', 'R'].forEach(function (s) { var dx = s === 'L' ? -1 : 1, fi = s === 'L' ? 0 : 1;
        if (show) { c.globalAlpha = 0.5; c.fillStyle = s === j.safe ? th.good : th.bad; c.beginPath(); c.arc(180 + dx * BR, y - 128, 20, 0, 7); c.fill(); c.globalAlpha = 1; }
        g.frame('fork_sheet', fi, 0, 2, 1, 180, y - 72, 96, 144, function (c) { c.strokeStyle = show ? (s === j.safe ? th.good : th.bad) : th.dim; c.lineWidth = 4; c.beginPath(); c.moveTo(180, y); c.lineTo(180, y - 8); c.quadraticCurveTo(180, y - 90, 180 + dx * BR, y - 144); c.stroke(); });
        if (show && s !== j.safe) g.sprite('rubble', 180 + dx * BR, y - 128, 36, 36, function (c, x, yy) { c.fillStyle = th.bad; c.fillRect(x - 12, yy - 12, 24, 24); }); });
      if (j.seen && !show) { c.fillStyle = th.accent; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText('?', 180, y - 30); } });
    var nj = D.j.find(function (j) { return !j.done; });
    if (nj && CARTY - jy(D, nj) < ZONE) g.sprite('junction_sign', 270, CARTY - 60, 50, 50, function (c, x, y) { c.fillStyle = th.accent; c.fillRect(x - 20, y - 10, 40, 20); }, 0, D.side === 'L');
    g.sprite('cart', 180 + (D.side === 'L' ? -CARTX : CARTX), CARTY + 30, 64, 64, function (c, x, y) { c.fillStyle = '#777'; c.fillRect(x - 22, y - 16, 44, 32); });
    if (D.pingT >= 0) g.frame('ping_sheet', Math.min(3, D.pingT * 7 | 0), 0, 4, 1, 180, CARTY, 260, 260, function (c, x, y, w) { c.strokeStyle = th.accent; c.beginPath(); c.arc(x, y, w / 2 * D.pingT / 0.6, 0, 7); c.stroke(); });
    // darkness vignette: lifts while a ping is active
    var gr = c.createRadialGradient(180, CARTY, 60, 180, CARTY, 420); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + (D.ping > 0 ? 0.3 : 0.85) + ')'); c.fillStyle = gr; c.fillRect(0, 0, 360, 640);
    c.fillStyle = th.accent; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.fillText('×' + D.mult + '  track ' + D.side, 180, 140);
    c.fillStyle = '#cfd6e6'; c.font = '13px system-ui'; c.fillText('tap left or right to pick a track', 180, g.safeY(620));
    egLives(g, c); egFlash(g, c);
  }
});
function jy(D, j) { return D.dist - j.at + CARTY; }
function addJ(g) { var D = g.data, last = D.j.length ? D.j[D.j.length - 1].at : 300; D.jn++;
  D.j.push({ at: last + Math.max(260, 420 - g.level * 15) + Math.random() * 120, safe: Math.random() < 0.5 ? 'L' : 'R' }); }
// Dead zone: the bridge's pause/mute buttons (+12 css px slop) and the top-right HUD corner (logical x>=240, above safeTop+64).
function onButton(g) { if (g.tapX >= 240 && g.tapY < (g.safeTop || 0) + 64) return true;
  var e = g.lastClient; if (!e) return false; var b = document.querySelectorAll('.eg-btn');
  for (var i = 0; i < b.length; i++) { var r = b[i].getBoundingClientRect(); if (e.x >= r.left - 12 && e.x <= r.right + 12 && e.y >= r.top - 12 && e.y <= r.bottom + 12) return true; } return false; }
window.addEventListener('pointerdown', function (e) { var g = window.__eagle; if (g) g.lastClient = { x: e.clientX, y: e.clientY }; }, true);
function pick(g, s) { var D = g.data; if (D.side === s) return; D.side = s; g.sfx('switchTrack', s, 'jump'); }
function ping(g) { var D = g.data; D.ping = 1.6; D.pingT = 0; D.mult = Math.max(1, D.mult - 2); D.j.forEach(function (j) { if (!j.done && CARTY - jy(D, j) < 520) j.seen = 1; }); g.sfx('ping'); g.sfx('multiplierDown'); }
// Keyboard: Left/Right pick the same tracks as tapping; Up pings. (Space = ping, via the bridge down().)
window.addEventListener('keydown', function (e) { var g = window.__eagle; if (!g || g.state !== 'play' || g.paused || g.hostPaused || e.repeat) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); pick(g, 'L'); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); pick(g, 'R'); }
  else if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); ping(g); } });
