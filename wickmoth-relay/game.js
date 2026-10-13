// Draft title. Tap when the moth overlaps the next wick. Lit candles hold back the dark; they burn out.
var GAP = 110;
EagleGame.run({ id: 'wickmoth-relay', title: 'Wickmoth Relay', howto: 'Tap when the moth is over the next wick to light it and climb. HOLD to fly back and relight a burnt-out candle below. Lit candles hold back the darkness; misses let it leap closer.',
  art: ['candle', 'candle_lit', 'flame_sheet', 'moth', 'moth_sheet', 'darkness_edge'], reskinKeys: ['candle', 'moth', 'darkness_edge', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#221a31', bottom: '#0e0a18' }, levelEvery: 8, likeScore: 20, overSfx: 'snuffed',
  achievements: [{ id: 'chain10', score: 10, name: 'Ten Flames' }, { id: 'tower40', score: 40, name: 'Beacon Tower' }],
  init: function (g) { var D = g.data = { c: [], next: 1, ph: 0, cam: -380, lives: 1, fl: 0 };
    for (var i = 0; i < 6; i++) addCandle(D, i); D.c[0].lit = 1; D.c[0].burn = 10; },
  // tap over the wick = light it (instant, on press). Tap elsewhere = miss (judged on release, so a hold is not a miss).
  // hold >= 0.3 s = relay back down to relight the highest burnt-out candle among the last 3 (no points, costs travel time)
  down: function (g) {
    var D = g.data; if (D.back) return; D.pend = false; D.heldT = 0;
    var c = D.c[D.next], mx = mothX(D);
    if (Math.abs(mx - c.x) < 24) { c.lit = 1; c.burn = burnTime(g); D.next++; addCandle(D, D.c.length); g.addScore(1); g.sfx('lightWick', chain(D), 'coin'); }
    else D.pend = true;
  },
  up: function (g, ms) { var D = g.data; if (D.pend && !D.back && ms < 300) { D.flash = 0.2; D.darkY = (D.darkY || 0) - 55; g.sfx('missWick', null, 'hit'); } D.pend = false; },
  update: function (g, dt) {
    var D = g.data; D.flash = Math.max(0, (D.flash || 0) - dt); D.fl += dt;
    if (g.held && D.pend && !D.back) { D.heldT += dt; if (D.heldT >= 0.3) { D.pend = false; var tgt = -1; for (var j = D.next - 1; j >= Math.max(0, D.next - 3); j--) if (!D.c[j].lit) { tgt = j; break; }
      if (tgt >= 0) { D.back = { i: tgt, t: 0 }; g.sfx('flutter'); } } }
    if (D.back) { D.back.t += dt; if (D.back.t >= 0.45 && !D.back.done) { D.back.done = 1; var k = D.c[D.back.i]; k.lit = 1; k.burn = burnTime(g) * 0.8; g.sfx('relight', null, 'coin'); } if (D.back.t >= 0.9) D.back = null; }
    var sp = Math.min(3.2, 1.3 + g.level * 0.15), prevCos = Math.cos(D.ph); D.ph += dt * sp; if (!D.back && (prevCos > 0) !== (Math.cos(D.ph) > 0)) g.sfx('flutter');
    var lit = 0; D.c.forEach(function (c, i) { if (c.lit) { c.burn -= dt; if (c.burn <= 0) { c.lit = 0; g.sfx('burnOut'); } else if (i < D.next && i >= D.next - 3) lit++; } });
    var v = (lit >= 2 ? 6 : lit === 1 ? 16 : 30) + g.level * 2.5; // world px/s the darkness climbs
    var my = -D.next * GAP + GAP; // moth height = last lit candle
    var prev = D.darkY; // darkY is a world y (smaller = higher)
    D.darkY = (D.darkY == null ? my + 260 : D.darkY) - v * dt; if (D.darkY > my + 300) D.darkY = my + 300;
    if (prev != null && Math.floor(prev / 40) !== Math.floor(D.darkY / 40)) g.sfx('darknessCreep');
    D.cam += ((my - 380) - D.cam) * Math.min(1, dt * 3);
    if (D.darkY <= my + 20) { D.lives = 0; g.gameOver('snuffed'); }
  },
  draw: function (g, c) {
    var D = g.data; g.bg();
    D.c.forEach(function (k, i) { var y = k.y - D.cam; if (y < -80 || y > 700) return;
      g.sprite(k.lit ? 'candle_lit' : 'candle', k.x, y + 30, 40, 100, function (c, x, y, w, h) { c.fillStyle = k.lit ? '#f4e3c0' : '#9b8f7c'; c.fillRect(x - 10, y - 35, 20, 70); });
      if (k.lit) var fs = 32 * Math.min(1, 0.4 + k.burn / 8); /* uniform scale, base anchored at the wick (y-10) */ g.frame('flame_sheet', (D.fl * 10 + i) | 0, 0, 4, 1, k.x, y - 10 - fs / 2, fs, fs, function (c, x, y) { c.fillStyle = '#ffb547'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); });
      if (i === D.next) { c.strokeStyle = g.theme.accent; c.setLineDash([3, 4]); c.beginPath(); c.arc(k.x, y - 20, 26, 0, 7); c.stroke(); c.setLineDash([]); } });
    var t = D.c[D.next]; if (t) { var my = t.y - D.cam - 24, mx = mothX(D);
      if (D.back) { var b = D.c[D.back.i], k2 = D.back.t < 0.45 ? D.back.t / 0.45 : 1 - (D.back.t - 0.45) / 0.45; mx += (b.x - mx) * k2; my += (b.y - D.cam - 24 - my) * k2; }
      g.frame('moth_sheet', (D.fl * 14) | 0, 0, 4, 1, mx, my, 48, 48, function (c, x, y) { c.fillStyle = '#e9e4ff'; c.beginPath(); c.ellipse(x, y, 18, 10, 0, 0, 7); c.fill(); }); }
    // darkness: Luna's darkness_edge (1080x240 -> 360x80, solid #0e0a18 at its bottom) then the same solid colour below
    var dy = (D.darkY || 0) - D.cam;
    if (g.art.darkness_edge) c.drawImage(g.art.darkness_edge, 0, dy - 60, 360, 80);
    else { var gr = c.createLinearGradient(0, dy - 60, 0, dy + 20); gr.addColorStop(0, 'rgba(14,10,24,0)'); gr.addColorStop(1, '#0e0a18'); c.fillStyle = gr; c.fillRect(0, dy - 60, 360, 80); }
    c.fillStyle = '#0e0a18'; c.fillRect(0, dy + 19, 360, 760);
    c.fillStyle = g.theme.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('tap: light wick · hold: relight below · lit ' + litBelow(D) + '/3', 180, g.safeY(620));
    egFlash(g, c);
  }
});
function addCandle(D, i) { D.c.push({ x: i === 0 ? 180 : 60 + Math.random() * 240, y: -i * GAP, lit: 0, burn: 0 }); }
function mothX(D) { return 180 + 140 * Math.sin(D.ph); }
function chain(D) { var n = 0; for (var i = D.next - 1; i >= 0 && D.c[i].lit; i--) n++; return n; }
function burnTime(g) { return Math.max(6, 11 - g.level * 0.5); }
function litBelow(D) { var n = 0; for (var i = D.next - 1; i >= Math.max(0, D.next - 3); i--) if (D.c[i].lit) n++; return n; }
