// Draft title. Tap to drop dough from the swinging arm onto the moving tray; the landing spot sets the shape.
var PX = 180, PY = 120, LEN = 150, TRAYY = 520, TRAYW = 120, SHAPES = ['centre', 'edge', 'half'], FRAME = { centre: 0, edge: 1, half: 2 };
EagleGame.run({ id: 'pendulum-bakery', title: 'Pendulum Bakery', howto: 'Tap to drop the dough. Match the order: CENTRE (middle of tray), EDGE (near the rim) or HALF (hanging half off).',
  art: ['pendulum', 'dough', 'tray', 'bread_shapes', 'order_card', 'baker', 'land_puff_sheet'], reskinKeys: ['pendulum', 'dough', 'tray', 'baker', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#e1c8b0', bottom: '#bc8256' }, levelEvery: 5, likeScore: 15, overSfx: 'burnt',
  achievements: [{ id: 'baker5', score: 5, name: 'First Batch' }, { id: 'baker25', score: 25, name: 'Master Baker' }],
  init: function (g) { g.data = { lives: 3, n: 0, drop: null, wait: 0, res: null, order: 'centre', lastSign: 0 }; newOrder(g); },
  down: function (g) { var D = g.data; if (D.drop || D.wait > 0) return; var p = bob(g); D.drop = { x: p.x, y: p.y, vy: 0 }; g.sfx('drop', null, 'jump'); },
  update: function (g, dt) {
    var D = g.data; if (D.puff) { D.puff.t += dt; if (D.puff.t > 0.4) D.puff = null; } D.flash = Math.max(0, (D.flash || 0) - dt); D.wait = Math.max(0, D.wait - dt); if (D.res) { D.res.t -= dt; if (D.res.t <= 0) D.res = null; }
    var s = Math.sign(Math.cos(swingPh(g))); if (s !== D.lastSign) { D.lastSign = s; g.sfx('swingTick'); }
    var d = D.drop; if (!d) return;
    d.vy += 900 * dt; d.y += d.vy * dt;
    if (d.y >= TRAYY - 14) { var tx = trayX(g), o = Math.abs(d.x - tx) / (TRAYW / 2);
      var kind = o < 0.3 ? 'centre' : o >= 0.55 && o < 0.95 ? 'edge' : o >= 0.95 && o < 1.25 ? 'half' : o < 0.55 ? 'between' : 'floor';
      D.drop = null; D.wait = 0.5;
      if (kind !== 'floor' && kind !== 'between') g.sfx('land', kind);
      D.res = { kind: kind, x: d.x - tx, t: 0.9 }; D.puff = { x: d.x, t: 0 };
      if (kind === D.order) { g.sfx('orderMatch', null, 'coin'); g.addScore(1); newOrder(g); }
      else { g.sfx('orderMiss', null, 'hit'); egLoseLife(g, kind === 'floor' ? 'dropped on the floor' : 'wrong shape', true); if (g.state === 'play') newOrder(g); } }
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; g.bg();
    g.sprite('baker', 300, 590, 72, 72);
    var a = swingAngle(g);
    // arm drawn in code from the pivot, claw sprite hangs from its own top-centre pivot
    c.save(); c.translate(PX, PY); c.rotate(a); c.strokeStyle = th.dim; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, LEN - 60); c.stroke();
    if (g.art.pendulum) c.drawImage(g.art.pendulum, -20, LEN - 120, 40, 120); c.restore();
    c.fillStyle = th.fg; c.beginPath(); c.arc(PX, PY, 6, 0, 7); c.fill();
    var p = D.drop || bob(g); if (D.wait <= 0 || D.drop) g.sprite('dough', p.x, p.y, 40, 40, function (c, x, y) { c.fillStyle = '#f3dcb0'; c.beginPath(); c.arc(x, y, 16, 0, 7); c.fill(); });
    var tx = trayX(g);
    g.sprite('tray', tx, TRAYY + 10, TRAYW, 40, function (c, x, y, w) { c.fillStyle = '#8a8f9c'; c.fillRect(x - w / 2, y - 6, w, 12); });
    c.fillStyle = 'rgba(255,181,71,.35)'; zone(D.order).forEach(function (z) { c.fillRect(tx + z[0] * TRAYW / 2, TRAYY - 8, (z[1] - z[0]) * TRAYW / 2, 6); });
    if (D.res && FRAME[D.res.kind] != null) g.frame('bread_shapes', FRAME[D.res.kind], 0, 3, 1, tx + D.res.x, TRAYY - 8, 48, 48);
    if (D.puff) g.frame('land_puff_sheet', Math.min(3, D.puff.t * 10 | 0), 0, 4, 1, D.puff.x, TRAYY - 14, 64, 64);
    g.sprite('order_card', 60, 190, 80, 100, function (c, x, y, w, h) { c.fillStyle = th.panel; c.fillRect(x - w / 2, y - h / 2, w, h); });
    g.frame('bread_shapes', FRAME[D.order], 0, 3, 1, 60, 182, 48, 48);
    c.fillStyle = th.fg; c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.fillText(D.order.toUpperCase(), 60, 228);
    if (D.res) { c.fillStyle = th.dim; c.fillText(D.res.kind, tx, TRAYY + 50); }
    egLives(g, c); egFlash(g, c);
  }
});
function swingPh(g) { return g.t * Math.min(3.6, 2 + g.level * 0.15); }
function swingAngle(g) { return 0.85 * Math.sin(swingPh(g)); }
function bob(g) { var a = swingAngle(g); return { x: PX - Math.sin(a) * LEN, y: PY + Math.cos(a) * LEN }; }
function trayX(g) { return 180 + Math.min(130, 70 + g.level * 12) * Math.sin(g.t * Math.min(2, 0.7 + g.level * 0.12)); }
function zone(k) { return k === 'centre' ? [[-0.3, 0.3]] : k === 'edge' ? [[-0.95, -0.55], [0.55, 0.95]] : [[-1.25, -0.95], [0.95, 1.25]]; }
function newOrder(g) { var D = g.data; D.n++; D.order = D.n <= 2 ? 'centre' : SHAPES[Math.floor(Math.random() * 3)]; g.sfx('newOrder'); }
