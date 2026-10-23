// Frostnib (Luna's reading): hold to draw a frost line along the glowing guide; the nib follows the pattern while you hold.
// Gold rings mark the lift points: let go as the nib reaches each ring, then hold again. Finish the pattern (star, tree, heart,
// spiral) for a bonus; each new pattern is faster with more rings. Letting go short of a ring or running past it is a miss,
// and leaving the glass alone too long lets it mist over (miss).
// Craft: the first pattern is slow with wide rings; the first miss is free; the ring under the nib rings NOW inside the window.
var FN_X = 180, FN_Y = 316, FN_S = 112, FN_TIP = (177 - 96) / 192; // nib tip offset in the 64px cursor
function fnShape(k) { var p = [], i, t; // unit coords, y down
  if (k === 0) for (i = 0; i <= 10; i++) { var r = i % 2 ? 0.42 : 1, a = -Math.PI / 2 + i * Math.PI / 5; p.push([Math.cos(a) * r, Math.sin(a) * r]); }
  else if (k === 1) p = [[0, -1], [0.45, -0.38], [0.2, -0.38], [0.65, 0.28], [0.3, 0.28], [0.85, 0.85], [-0.85, 0.85], [-0.3, 0.28], [-0.65, 0.28], [-0.2, -0.38], [-0.45, -0.38], [0, -1]];
  else if (k === 2) for (i = 0; i <= 64; i++) { t = i / 64 * 2 * Math.PI; p.push([Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 - 0.1]); }
  else for (i = 0; i <= 120; i++) { t = i / 120 * 5 * Math.PI; var rr = 0.1 + 0.9 * t / (5 * Math.PI); p.push([Math.cos(t) * rr, Math.sin(t) * rr]); }
  // resample to ~3px steps in logical space
  var pts = p.map(function (q) { return [FN_X + q[0] * FN_S, FN_Y + q[1] * FN_S]; }), out = [pts[0]], acc = [0];
  for (i = 1; i < pts.length; i++) { var a0 = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a0[0], b[1] - a0[1]), n = Math.max(1, Math.ceil(L / 3));
    for (var j = 1; j <= n; j++) { var q2 = [a0[0] + (b[0] - a0[0]) * j / n, a0[1] + (b[1] - a0[1]) * j / n]; acc.push(acc[acc.length - 1] + L / n); out.push(q2); } }
  return { pts: out, acc: acc, len: acc[acc.length - 1] }; }
function fnAt(P, s) { var a = P.acc, lo = 0, hi = a.length - 1; s = xmClamp(s, 0, P.len); while (hi - lo > 1) { var m = (lo + hi) >> 1; if (a[m] <= s) lo = m; else hi = m; }
  var f = (s - a[lo]) / Math.max(1e-6, a[hi] - a[lo]); return [P.pts[lo][0] + (P.pts[hi][0] - P.pts[lo][0]) * f, P.pts[lo][1] + (P.pts[hi][1] - P.pts[lo][1]) * f]; }
function fnSpeed(g) { var D = g.data; return D.pats === 0 ? 85 : Math.min(260, 120 + D.pats * 14 + D.lifts * 1.2); }
function fnTol(g) { var D = g.data; return D.pats === 0 ? 26 : Math.max(10, 18 - D.pats); }
function fnIdle(g) { var D = g.data; return D.pats === 0 ? 99 : Math.max(2.4, 4.5 - D.pats * 0.2); }
function fnNew(g) { var D = g.data, k = D.pats === 0 ? 0 : (D.kind + 1 + Math.floor(xmRand() * 3)) % 4; D.kind = k; D.P = fnShape(k); D.s = 0; D.idle = 0; D.done = 0;
  var n = Math.min(5, 2 + Math.floor(D.pats / 2)), L = D.P.len, ring = [];
  for (var i = 1; i < n; i++) ring.push(L * (i / n + (xmRand() - 0.5) * 0.5 / n)); ring.push(L); D.rings = ring; D.ri = 0; }
function fnRelease(g) { var D = g.data; if (!D.hold) return; D.hold = false; if (D.lock) { D.lock = false; return; } if (D.done > 0) return; D.idle = 0;
  var r = D.rings[D.ri], d = r - D.s, p = fnAt(D.P, r);
  if (Math.abs(d) <= fnTol(g)) { var perfect = Math.abs(d) <= 4; D.s = r; D.ri++; D.lifts++; D.combo++; var pts = 1 + Math.min(D.combo - 1, 4) + (perfect ? 2 : 0);
    g.addScore(pts); xmFloat(g, p[0], p[1] - 24, (perfect ? 'Perfect +' : '+') + pts, perfect ? '#ffe27a' : '#fff'); g.sfx(perfect ? 'perfect' : 'good', D.combo - 1, 'coin'); g.vibrate(10); xmBurst(g, p[0], p[1], 8, '#dff3ff');
    if (D.ri >= D.rings.length) { D.pats++; var b = 5 + D.pats * 2; g.addScore(b); D.toast = { text: ['Star', 'Tree', 'Heart', 'Spiral'][D.kind] + ' drawn! +' + b, t: 1.4 }; D.done = 1.4;
      xmAnim(g, 'flake_bloom_sheet', p[0], p[1], 96, 6, 0.6); g.sfx('powerUp', null, 'powerUp'); } }
  else { D.combo = 0; xmFloat(g, p[0], p[1] - 24, 'Lifted too soon', '#ffb3b3'); xmMiss(g, 'lifted the nib too soon'); } }
EagleGame.run({ id: 'frostnib', title: XM_NAMES['frostnib'],
  howto: 'Hold to draw a frost line: the nib follows the pattern while you hold. Let go as it reaches each gold ring, then hold again. Finish the pattern for a bonus. Keys: hold Space / Enter.',
  art: xmArtList(['nib_cursor', 'frost_trail_dot', 'guide_dot', 'flake_bloom_sheet', 'holly']),
  fill: { top: '#16234a', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#e6edf4' } }, levelEvery: 20, likeScore: 30,
  achievements: [{ id: 's12', score: 12, name: 'First Frost' }, { id: 's60', score: 60, name: 'Window Artist' }, { id: 's150', score: 150, name: 'Jack of All Frost' }],
  init: function (g) { xmSeed(); g.data = { pats: 0, lifts: 0, combo: 0, lives: 3, maxLives: 3, hold: false, lock: false, kind: 0, fx: [] }; fnNew(g); },
  down: function (g) { var D = g.data; if (D.done > 0) return; D.hold = true; D.idle = 0; },
  up: function (g) { fnRelease(g); },
  update: function (g, dt) { var D = g.data; xmTick(g, dt);
    if (D.done > 0) { D.done -= dt; if (D.done <= 0) fnNew(g); return; }
    if (D.hold && !D.lock) { D.s += fnSpeed(g) * dt; var r = D.rings[D.ri];
      if (D.s > r + fnTol(g)) { D.s = r; D.lock = true; D.combo = 0; var p = fnAt(D.P, r); xmFloat(g, p[0], p[1] - 24, 'Ran past the ring', '#ffb3b3'); if (xmMiss(g, 'the frost line smudged')) return; } }
    else if (!D.hold) { D.idle += dt; if (D.idle > fnIdle(g)) { D.idle = 0; D.combo = 0; D.toast = { text: 'The glass misted over', t: 1.2 }; if (xmMiss(g, 'the glass misted over')) return; } } },
  draw: function (g, c) { var D = g.data, P = D.P, s, i, CUE = xmCue(g, D.lifts); if (!g.bg()) xmSky(c, '#16234a', '#4a6a9a'); xmSnow(g, c, 20);
    c.fillStyle = 'rgba(14,22,50,.38)'; xmRound(c, FN_X - 150, FN_Y - 150, 300, 300, 24); c.fill();
    // one polyline (D.P) drives the guide dots, the rings, the nib, the scoring and the finished picture, so they always match
    if (D.done > 0) { var k = Math.min(1, (1.4 - D.done) * 2); c.save(); c.lineJoin = c.lineCap = 'round'; c.beginPath(); P.pts.forEach(function (q, j) { if (j) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); });
      c.strokeStyle = 'rgba(200,230,255,' + (0.35 * k) + ')'; c.lineWidth = 18; c.stroke(); c.strokeStyle = 'rgba(240,250,255,' + (0.9 * k) + ')'; c.lineWidth = 7; c.stroke(); c.restore();
      for (s = 0; s <= P.len; s += 5) { var t0 = fnAt(P, s); g.sprite('frost_trail_dot', t0[0], t0[1], 16, 16, function (c2, x, y) { xmBlob(c2, x, y, 4, '#eaf6ff'); }); } }
    else { // guide ahead, trail behind
      c.globalAlpha = 0.5; for (s = D.s + 14; s < P.len; s += 14) { var q = fnAt(P, s); c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(q[0], q[1], 1.8, 0, 7); c.fill(); } c.globalAlpha = 1;
      for (s = 0; s <= D.s; s += 5) { var t = fnAt(P, s); g.sprite('frost_trail_dot', t[0], t[1], 16, 16, function (c2, x, y) { xmBlob(c2, x, y, 4, '#eaf6ff'); }); }
      for (i = D.ri; i < D.rings.length; i++) { var rp = fnAt(P, D.rings[i]), nxt = i === D.ri, on = nxt && Math.abs(D.rings[i] - D.s) <= fnTol(g);
        c.globalAlpha = nxt ? 1 : 0.55; g.sprite('guide_dot', rp[0], rp[1], nxt ? 34 : 24, nxt ? 34 : 24, function (c2, x, y) { c2.strokeStyle = '#ffd34d'; c2.lineWidth = 3; c2.beginPath(); c2.arc(x, y, 8, 0, 7); c2.stroke(); }); c.globalAlpha = 1;
        if (on && D.hold && !D.lock && g.state === 'play') xmNow(g, c, rp[0], rp[1], 20, 'LET GO'); } }
    var np = fnAt(P, D.done > 0 ? P.len : D.s); g.sprite('nib_cursor', np[0], np[1] - FN_TIP * 64, 64, 64, function (c2, x, y) { c2.fillStyle = '#bfe0ff'; c2.fillRect(x - 5, y - 26, 10, 30); }, 0);
    if (!D.hold && D.done <= 0 && g.state === 'play' && fnIdle(g) < 50) { var f = 1 - D.idle / fnIdle(g); c.fillStyle = 'rgba(255,255,255,' + (0.25 * (1 - f)) + ')'; xmRound(c, FN_X - 150, FN_Y - 150, 300, 300, 24); c.fill(); }
    c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.fillStyle = '#e6f2ff'; c.fillText('Rings ' + D.ri + ' / ' + D.rings.length, FN_X, FN_Y + 176);
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.lifts === 0) xmPill(g, c, D.hold ? 'Let go on the gold ring' : 'Hold to draw, let go on the gold ring', 600);
    else if (g.state === 'play' && D.combo >= 3) xmPill(g, c, 'Frost streak ×' + D.combo, 600, '#ffe27a'); }
});
