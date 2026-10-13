// Draft title. Hold = reel in, release = pay out. Fly through rings; watch the line tension.
var SX = 50, SY = 550, LMIN = 90, LMAX = 470;
EagleGame.run({ id: 'kiteknot', title: 'Kiteknot', howto: 'Hold to reel in, release to let line out. Fly the kite through rings (missing two in a row costs a life). Long line in strong wind builds tension; red for too long and the line snaps.',
  art: ['kite', 'ring', 'stake', 'cloud', 'snap_sheet'], reskinKeys: ['kite', 'ring', 'stake', 'cloud', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#87bfea', bottom: '#66b265' }, levelEvery: 6, likeScore: 15, overSfx: 'lineSnap',
  achievements: [{ id: 'ring5', score: 5, name: 'Loop de Loop' }, { id: 'ring25', score: 25, name: 'Sky Knotter' }],
  init: function (g) { g.data = { lives: 3, L: 220, T: 0.3, over: 0, wind: 0.5, wt: 0.5, wnext: 4, ring: null, combo: 0, miss: 0, tick: 0, rt: 0, clouds: [[60, 120], [250, 220], [150, 330]] }; newRing(g); },
  up: function (g) { g.sfx('payOut'); },
  update: function (g, dt) {
    var D = g.data; D.flash = Math.max(0, (D.flash || 0) - dt); if (D.snapFx) { D.snapFx.t += dt; if (D.snapFx.t > 0.5) D.snapFx = null; }
    D.wnext -= dt; if (D.wnext <= 0) { D.wt = 0.35 + Math.random() * Math.min(0.75, 0.4 + g.level * 0.07); D.wnext = 3 + Math.random() * 2; g.sfx('gust'); }
    D.wind += (D.wt - D.wind) * Math.min(1, dt * 1.5);
    D.L = Math.max(LMIN, Math.min(LMAX, D.L + (g.held ? -130 : 75) * dt));
    var target = D.wind * (0.25 + D.L / 520) + (g.held ? 0.3 : 0); D.T += (target - D.T) * Math.min(1, dt * 3);
    g.sfx('tension', Math.min(1, D.T)); /* sustained hum; auto-fades ~400 ms after calls stop */ D.rt += dt; if (g.held && D.rt > 0.08) { D.rt = 0; g.sfx('reel'); }
    if (D.T > 1) { D.over += dt; if (D.over > 0.7) { var kk = kite(D); D.snapFx = { x: kk.x, y: kk.y, t: 0 }; D.over = 0; D.T = 0.4; D.L = 200; D.combo = 0; g.sfx('lineSnap', null, 'hit'); egLoseLife(g, 'line snapped', true); } } else D.over = Math.max(0, D.over - dt);
    var k = kite(D), r = D.ring; if (r) { r.t -= dt; r.age = (r.age || 0) + dt; if (r.age >= RING_GRACE && Math.hypot(k.x - r.x, k.y - r.y) < 30) { D.combo++; D.miss = 0; g.sfx('ringHit', D.combo, 'coin'); g.addScore(1); newRing(g); } else if (r.t <= 0) { D.combo = 0; D.miss++; D.flash = 0.15; if (D.miss >= 2) { D.miss = 0; egLoseLife(g, 'missed rings'); } if (g.state === 'play') newRing(g); } }
    D.clouds.forEach(function (cl) { cl[0] += D.wind * 20 * dt; if (cl[0] > 420) cl[0] = -60; });
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; g.bg();
    D.clouds.forEach(function (cl) { g.sprite('cloud', cl[0], cl[1], 100, 60); });
    if (D.miss) { c.fillStyle = th.bad; c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.fillText('missed ring: one more costs a life', 190, 160); }
    var r = D.ring; if (r) { c.globalAlpha = Math.min(1, r.t); g.sprite('ring', r.x, r.y, 60, 60, function (c, x, y) { c.strokeStyle = th.accent; c.lineWidth = 5; c.beginPath(); c.arc(x, y, 24, 0, 7); c.stroke(); }); c.globalAlpha = 1; }
    var k = kite(D), shake = D.T > 0.85 ? (Math.random() - 0.5) * 6 * D.T : 0;
    c.strokeStyle = D.T > 1 ? th.bad : D.T > 0.8 ? th.accent : th.fg; c.lineWidth = 1.5; c.beginPath(); c.moveTo(SX, SY - 20);
    c.quadraticCurveTo((SX + k.x) / 2 + shake, (SY + k.y) / 2 + 30 * (1 - Math.min(1, D.T)) + shake, k.x, k.y); c.stroke();
    g.sprite('stake', SX, SY, 30, 50, function (c, x, y) { c.fillStyle = '#7a5a3a'; c.fillRect(x - 4, y - 20, 8, 40); });
    g.sprite('kite', k.x, k.y, 70, 70, function (c, x, y) { c.fillStyle = th.bad; c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x + 22, y); c.lineTo(x, y + 30); c.lineTo(x - 22, y); c.fill(); }, Math.sin(g.t * 3) * 0.15 + shake * 0.02);
    if (D.snapFx) g.frame('snap_sheet', Math.min(3, D.snapFx.t * 8 | 0), 0, 4, 1, D.snapFx.x, D.snapFx.y, 64, 64);
    c.fillStyle = th.dim; c.fillRect(30, 140, 10, 300); c.fillStyle = D.T > 1 ? th.bad : D.T > 0.8 ? th.accent : th.good; var h = Math.min(1.2, D.T) / 1.2 * 300; c.fillRect(30, 440 - h, 10, h);
    c.fillStyle = th.fg; c.fillRect(26, 440 - 250, 18, 2);
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('hold: reel in · release: let out · wind ' + Math.round(D.wind * 10), 190, g.safeY(625));
    egLives(g, c); egFlash(g, c);
  }
});
function kite(D) { var a = 0.75 + D.wind * 0.35 + Math.sin(Date.now() / 900) * 0.05; return { x: SX + D.L * Math.cos(a), y: SY - D.L * Math.sin(a) }; }
// Ring spawn: at least RING_GAP px from the kite and from its line (stake -> kite), so the drifting kite can't score
// a ring without input; also ring hits are ignored for RING_GRACE s after each spawn.
var RING_GAP = 60, RING_GRACE = 0.3;
function segDist(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
function newRing(g) { var D = g.data, k = kite(D), best = null, bestD = -1, a = 0.75 + D.wt * 0.35;
  for (var i = 0; i < 16; i++) { var L = LMIN + 40 + Math.random() * (Math.min(LMAX - 20, 260 + g.level * 30) - LMIN - 40), x = SX + L * Math.cos(a), y = SY - L * Math.sin(a);
    var d = Math.min(Math.hypot(x - k.x, y - k.y), segDist(x, y, SX, SY - 20, k.x, k.y));
    if (d > bestD) { bestD = d; best = { x: x, y: y, L: L }; } if (d >= RING_GAP) break; }
  // same angle as the line can leave no valid spot: then push the ring sideways off the line
  if (bestD < RING_GAP) { var nx = -(k.y - SY), ny = k.x - SX, nl = Math.hypot(nx, ny) || 1, off = RING_GAP + 10;
    var c1 = { x: best.x + nx / nl * off, y: best.y + ny / nl * off }, c2 = { x: best.x - nx / nl * off, y: best.y - ny / nl * off },
      on = function (p) { return p.x > 30 && p.x < 330 && p.y > 120 && p.y < SY - 60; };
    var pick = on(c1) ? c1 : on(c2) ? c2 : c1; best.x = Math.max(30, Math.min(330, pick.x)); best.y = Math.max(120, Math.min(SY - 60, pick.y)); }
  D.ring = { x: best.x, y: best.y, L: best.L, t: Math.max(2.6, 4.6 - g.level * 0.2), age: 0 }; }
