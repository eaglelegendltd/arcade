// Spellsock Sorting: one sock drops at a time; tap the left or right half to fling it into the basket that takes its colour.
// New colours join the baskets as you level up, and socks fall faster.
var SS_COLS = ['#ff5a5a', '#4c9dff', '#5fd36b', '#a46bff', '#ff9a2f', '#ffd23f'], SS_NAMES = ['red', 'blue', 'green', 'purple', 'orange', 'yellow'];
// colour k belongs to basket SS_SIDE[k] (0 left, 1 right); colours unlock in order as the level rises
var SS_SIDE = [0, 1, 0, 1, 0, 1], SS_UNLOCK = [1, 1, 3, 5, 7, 9];
function ssBY(g) { return Math.min(500, g.safeBottom - 64); }
function ssCount(g) { var n = 0; for (var i = 0; i < 6; i++) if (g.level >= SS_UNLOCK[i]) n++; return n; }
function ssSpawn(g) { var D = g.data, n = ssCount(g), k = Math.floor(hwRand() * n); if (k === D.lastK && hwRand() < 0.4) k = Math.floor(hwRand() * n); D.lastK = k;
  D.sock = { k: k, x: 180, y: 140, rot: (hwRand() - 0.5) * 0.6, fly: null }; }
function ssSend(g, side) { var D = g.data, s = D.sock; if (!s || s.fly) return; s.fly = { side: side, t: 0, x0: s.x, y0: s.y };
  if (SS_SIDE[s.k] === side) { D.combo++; g.addScore(1 + Math.floor(D.combo / 10)); g.sfx('sockSort', side, 'coin');
    if (D.combo % 10 === 0) { g.sfx('sparkle', null, 'powerUp'); D.msg = { text: 'Combo ×' + D.combo + '!', t: 1 }; }
    D.glow[side] = 0.35; }
  else { D.combo = 0; s.bad = true; g.sfx('sockWrong', null, 'hit'); g.shake && g.shake(4); egLoseLife(g, 'a ' + SS_NAMES[s.k] + ' sock went in the wrong basket', true); } }
EagleGame.run({ id: 'spellsock-sorting', title: HW_NAMES['spellsock-sorting'], howto: 'A spell sock drops from the top. Tap the left or right side to send it into the basket that takes its colour (the coloured dots under each basket). Wrong basket or a dropped sock costs a life; 3 lives. New colours join and socks fall faster as you level up. Keys: Left / Right arrows.',
  art: ['socks_sheet', 'baskets_sheet'], levelEvery: 15, likeScore: 40,
  achievements: [{ id: 's25', score: 25, name: 'Sock Sorter' }, { id: 's100', score: 100, name: 'Laundry Wizard' }],
  init: function (g) { hwSeed(); g.data = { lives: 3, flash: 0, combo: 0, glow: [0, 0], msg: null, lastLevel: 1, lastK: -1 }; ssSpawn(g); },
  down: function (g) { if (g.tapX === undefined) return; ssSend(g, g.tapX < 180 ? 0 : 1); },
  update: function (g, dt) { var D = g.data, s = D.sock, BY = ssBY(g);
    if (g.level !== D.lastLevel) { var was = ssCount({ level: D.lastLevel }), now = ssCount(g); D.lastLevel = g.level; if (now > was) { D.msg = { text: 'New colour: ' + SS_NAMES[now - 1] + '!', t: 1.6 }; g.sfx('pairMatch', null, 'powerUp'); } }
    if (s) { if (s.fly) { s.fly.t += dt * 4.5; var f = Math.min(1, s.fly.t), tx = s.fly.side ? 270 : 90; s.x = s.fly.x0 + (tx - s.fly.x0) * f; s.y = s.fly.y0 + (BY - 10 - s.fly.y0) * f - Math.sin(f * Math.PI) * 50; s.rot += dt * 9 * (s.fly.side ? 1 : -1);
        if (f >= 1) { D.sock = null; D.wait = 0.12; } }
      else { s.y += dt * Math.min(330, 95 + g.level * 16 + g.t * 0.6); s.x = 180 + Math.sin(g.t * 3) * 6;
        if (s.y > BY + 30) { D.combo = 0; D.sock = null; D.wait = 0.3; g.sfx('binFull', null, 'hit'); egLoseLife(g, 'a ' + SS_NAMES[s.k] + ' sock hit the floor', true); } } }
    else if (g.state === 'play') { D.wait -= dt; if (D.wait <= 0) ssSpawn(g); }
    D.glow[0] = Math.max(0, D.glow[0] - dt); D.glow[1] = Math.max(0, D.glow[1] - dt); if (D.flash > 0) D.flash = Math.max(0, D.flash - dt); if (D.msg) { D.msg.t -= dt; if (D.msg.t <= 0) D.msg = null; } },
  draw: function (g, c) { var D = g.data, th = g.theme, BY = ssBY(g); if (!g.bg()) hwSky(c, '#1d1238', '#3a2050');
    egLives(g, c); var n = ssCount(g);
    for (var side = 0; side < 2; side++) { var x = side ? 270 : 90;
      if (D.glow[side]) { c.fillStyle = 'rgba(255,240,160,' + D.glow[side] + ')'; c.beginPath(); c.arc(x, BY, 70, 0, 7); c.fill(); }
      if (!hwFrame(g, 'baskets_sheet', 2, 3, 1, x, BY, 120, 120)) { c.fillStyle = '#8a5a2b'; c.beginPath(); c.moveTo(x - 52, BY - 30); c.lineTo(x + 52, BY - 30); c.lineTo(x + 40, BY + 40); c.lineTo(x - 40, BY + 40); c.fill(); }
      var ks = []; for (var k = 0; k < n; k++) if (SS_SIDE[k] === side) ks.push(k);
      ks.forEach(function (k, i) { var dx = x + (i - (ks.length - 1) / 2) * 26, dy = BY + 52; c.fillStyle = SS_COLS[k]; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(dx, dy, 9, 0, 7); c.fill(); c.stroke(); }); }
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(180, 150); c.lineTo(180, BY + 40); c.stroke(); c.setLineDash([]);
    var s = D.sock; if (s) { if (!hwFrame(g, 'socks_sheet', s.k, 6, 1, s.x, s.y, 72, 72, s.rot)) { c.save(); c.translate(s.x, s.y); c.rotate(s.rot); c.fillStyle = SS_COLS[s.k]; c.fillRect(-10, -26, 20, 36); c.fillRect(-10, 2, 30, 16); c.restore(); }
      if (!s.fly) { c.strokeStyle = SS_COLS[s.k]; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 42, 0, 7); c.stroke(); } }
    if (D.msg) { c.globalAlpha = Math.min(1, D.msg.t * 2); c.fillStyle = th.accent; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText(D.msg.text, 180, 210); c.globalAlpha = 1; }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('◀ tap left · tap right ▶ · level ' + g.level + (D.combo > 1 ? ' · combo ' + D.combo : ''), 180, g.safeY(BY + 82));
    egFlash(g, c); }
});
// desktop: Left / Right arrows choose the basket
addEventListener('keydown', function (e) { if (!hwLive() || e.repeat) return; if (e.code === 'ArrowLeft') ssSend(__eagle, 0); else if (e.code === 'ArrowRight') ssSend(__eagle, 1); });
