// Treatdrop Bucket: drag (or hold a side / arrow keys) to slide the bucket; catch falling treats, dodge dangling spiders. 3 lives.
var CC_Y = 540, CC_W = 70;
EagleGame.run({ id: 'treatdrop-bucket', title: HW_NAMES['treatdrop-bucket'], howto: 'Drag, hold the left/right side, or use the arrow keys to slide your bucket. Catch the treats (5 in a row = combo bonus). Spiders cost a life; so does every 5th treat you drop.',
  art: ['bucket_move_sheet', 'bucket_catch_sheet', 'candy_sheet', 'spider_sheet'], reskinKeys: ['bg', 'bucket_move_sheet', 'candy_sheet'], fill: { top: '#221b44', bottom: '#593a3a' }, levelEvery: 12, likeScore: 25,
  achievements: [{ id: 'c20', score: 20, name: 'Sweet Tooth' }, { id: 'c80', score: 80, name: 'Candy Hoarder' }],
  init: function (g) { hwSeed(); g.data = { x: 180, lives: 3, flash: 0, items: [], next: 0.8, combo: 0, drops: 0, pops: [] }; },
  down: function (g) { g.data.drag = null; },
  update: function (g, dt) {
    var D = g.data; if (D.flash > 0) D.flash = Math.max(0, D.flash - dt);
    if (g.held && D.drag == null && g.tapX !== undefined && !D.dragged) D.x += Math.sign(g.tapX - D.x) * Math.min(Math.abs(g.tapX - D.x), 420 * dt);
    var kd = (hwKeys.ArrowRight || hwKeys.KeyD ? 1 : 0) - (hwKeys.ArrowLeft || hwKeys.KeyA ? 1 : 0); if (kd) D.x += kd * 380 * dt; if (D.catchT > 0) D.catchT -= dt;
    D.x = Math.max(CC_W / 2, Math.min(360 - CC_W / 2, D.x));
    var fall = Math.min(420, 150 + g.level * 18); D.next -= dt;
    if (D.next <= 0) { var r = hwRand(), k = r < Math.min(0.38, 0.14 + g.level * 0.025) ? 'spider' : r > 0.95 ? 'gold' : 'corn';
      D.items.push({ x: 24 + hwRand() * 312, y: -20, k: k, v: fall * (0.85 + hwRand() * 0.3), sw: k === 'spider' && g.level >= 4 ? (hwRand() - 0.5) * 2 : 0, ph: hwRand() * 6, v2: Math.floor(hwRand() * 4) }); D.next = Math.max(0.32, 0.85 - g.level * 0.04); }
    for (var i = D.items.length - 1; i >= 0; i--) { var o = D.items[i]; o.y += o.v * dt; if (o.sw) o.x = Math.max(20, Math.min(340, o.x + Math.sin(g.t * 3 + o.ph) * 60 * dt * o.sw));
      if (o.y > CC_Y - 14 && o.y < CC_Y + 14 && Math.abs(o.x - D.x) < CC_W / 2 + 6) { D.items.splice(i, 1);
        if (o.k === 'spider') { D.combo = 0; egLoseLife(g, 'caught a spider'); if (g.state !== 'play') return; }
        else { D.combo++; var p = o.k === 'gold' ? 5 : 1; if (D.combo % 5 === 0) p += 3; g.addScore(p); D.catchT = 0.3; g.sfx(o.k === 'gold' || D.combo % 5 === 0 ? 'bonus' : 'catch', null, 'coin'); D.pops.push({ x: o.x, y: CC_Y - 30, t: 0.7, s: '+' + p }); } continue; }
      if (o.y > 660) { D.items.splice(i, 1); if (o.k !== 'spider') { D.combo = 0; D.drops++; if (D.drops % 5 === 0) { egLoseLife(g, 'too much candy dropped'); if (g.state !== 'play') return; } } } }
    D.pops.forEach(function (p) { p.t -= dt; p.y -= 40 * dt; }); D.pops = D.pops.filter(function (p) { return p.t > 0; });
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; if (!g.bg()) { hwSky(c, '#24123a', '#4a2448'); c.fillStyle = '#2a1830'; c.fillRect(0, CC_Y + 30, 360, 120); }
    D.items.forEach(function (o) { if (o.k === 'spider') { if (hwFrame(g, 'spider_sheet', (g.t * 6 + o.ph) % 4, 4, 1, o.x, o.y - 22, 40, 64)) return; g.sprite('spider', o.x, o.y, 44, 44, function (c, x, y) { hwSpider(c, x, y, 12); }); }
      else if (!hwFrame(g, 'candy_sheet', o.k === 'gold' ? 4 : o.v2, 5, 1, o.x, o.y, 36, 36)) g.sprite(o.k === 'gold' ? 'goldcorn' : 'corn', o.x, o.y, 36, 36, function (c, x, y) { var cols = o.k === 'gold' ? ['#fff3a0', '#ffd700', '#e6a800'] : ['#fff6e0', '#ffb300', '#ff6a1f'];
        for (var b = 0; b < 3; b++) { c.fillStyle = cols[b]; c.beginPath(); var t0 = b / 3, t1 = (b + 1) / 3; c.moveTo(x - 11 * t0, y - 14 + 28 * t0); c.lineTo(x + 11 * t0, y - 14 + 28 * t0); c.lineTo(x + 11 * t1, y - 14 + 28 * t1); c.lineTo(x - 11 * t1, y - 14 + 28 * t1); c.fill(); } }); });
    if (!(D.catchT > 0 ? hwFrame(g, 'bucket_catch_sheet', Math.min(2, (0.3 - D.catchT) * 10), 3, 1, D.x, CC_Y - 4, 96, 96) : hwFrame(g, 'bucket_move_sheet', (g.t * 8) % 4, 4, 1, D.x, CC_Y - 4, 96, 96))) g.sprite('bucket', D.x, CC_Y + (g.art.bucket ? 0 : 8), g.art.bucket ? 92 : CC_W + 10, g.art.bucket ? 92 : 54, function (c, x, y) { hwPumpkin(c, x, y + 4, 30); c.fillStyle = '#1b0f22'; c.beginPath(); c.ellipse(x, y - 18, 28, 7, 0, 0, 7); c.fill(); });
    D.pops.forEach(function (p) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = th.accent; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.fillText(p.s, p.x, p.y); c.globalAlpha = 1; });
    egLives(g, c); egFlash(g, c);
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText(D.combo >= 2 ? 'combo ' + D.combo : 'drag to move · avoid spiders', 180, g.safeY(615));
  }
});
// drag support: the bridge only reports down/up, so track movement in CSS px and convert to play-area units
(function () { var lx = null; addEventListener('pointerdown', function (e) { lx = e.clientX; if (window.__eagle && __eagle.data) __eagle.data.dragged = false; });
  addEventListener('pointermove', function (e) { var g = window.__eagle; if (lx === null || !g || g.state !== 'play' || !g.held) return; var k = 360 / Math.min(innerWidth, innerHeight * 9 / 16), dx = (e.clientX - lx) * k; lx = e.clientX;
    if (Math.abs(dx) > 0.5) { g.data.dragged = true; g.data.x += dx; } });
  addEventListener('pointerup', function () { lx = null; }); addEventListener('pointercancel', function () { lx = null; }); })();
