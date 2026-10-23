// Advent Pocket (sweep design kept; Luna's board, pockets and 12 treats): today's pocket glows somewhere on the 4x6 felt board
// (the day numbers are shuffled, like a real calendar). A gold star sweeps back and forth along that pocket's row; tap as it passes
// over today's pocket to open it and find a treat. Open all 24 for a full board bonus; the next board is shuffled and faster.
// Tapping off the pocket is a miss; letting the star pass three times without opening keeps the pocket shut (miss).
// Craft: day 1 is slow with a wide window; the first miss is free; the target glows and NOW rings while the star is over it.
var AP_X = 180, AP_Y = 318, AP_W = 300, AP_H = 400, AP_K = 300 / 960;
function apSlot(i) { var c = i % 4, r = Math.floor(i / 4); return [AP_X - AP_W / 2 + (125 + 230 * c) * AP_K, AP_Y - AP_H / 2 + (190 + 185 * r) * AP_K]; }
function apSpeed(g) { var D = g.data; return D.opened === 0 ? 70 : Math.min(330, 120 + D.opened * 3.5 + D.boards * 25); }
function apTol(g) { var D = g.data; return D.opened === 0 ? 22 : D.opened < 5 ? 15 : Math.max(9, 13 - D.boards); }
function apNewBoard(g) { var D = g.data, days = []; for (var i = 1; i <= 24; i++) days.push(i);
  for (i = 23; i > 0; i--) { var j = Math.floor(xmRand() * (i + 1)), t = days[i]; days[i] = days[j]; days[j] = t; }
  D.days = days; D.open = []; for (i = 0; i < 24; i++) D.open.push(0); D.day = 1; apAim(g); }
function apAim(g) { var D = g.data; D.target = D.days.indexOf(D.day); D.passes = 0; var s = apSlot(D.target);
  // the star starts at the far end of the row from the pocket so there's always a run-up
  D.sx = s[0] < AP_X ? AP_X + 118 : AP_X - 118; D.sdir = s[0] < AP_X ? -1 : 1; D.row = Math.floor(D.target / 4); D.was = null; }
EagleGame.run({ id: 'advent-pocket', title: XM_NAMES['advent-pocket'],
  howto: 'Today\'s pocket glows on the advent board. A star sweeps along its row: tap as the star passes over the pocket to open it and find a treat. Open all 24 for a bonus. Keys: Space / Enter opens.',
  art: xmArtList(['board_panel_960x1280', 'pocket_sheet', 'pocket_colours_sheet', 'treats_sheet', 'pocket_glow', 'open_burst_sheet', 'hog', 'holly']),
  fill: { top: '#2a1a14', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#3a2618' } }, levelEvery: 20, likeScore: 30,
  achievements: [{ id: 's12', score: 12, name: 'Twelve Days In' }, { id: 's60', score: 60, name: 'Full Calendar' }, { id: 's160', score: 160, name: 'Treat Keeper' }],
  init: function (g) { xmSeed(); g.data = { opened: 0, boards: 0, combo: 0, lives: 3, maxLives: 3, fx: [], tray: [], done: 0 }; apNewBoard(g); },
  down: function (g) { var D = g.data; if (D.done > 0) return; var s = apSlot(D.target), dx = D.sx - s[0];
    if (Math.abs(dx) <= apTol(g)) { var perfect = Math.abs(dx) <= 5; D.open[D.target] = 0.001; D.opened++; D.combo++;
      var pts = 1 + Math.min(D.combo - 1, 5) + (perfect ? 2 : 0); g.addScore(pts); xmFloat(g, s[0], s[1] - 34, (perfect ? 'Perfect +' : '+') + pts, perfect ? '#ffe27a' : '#fff');
      xmAnim(g, 'open_burst_sheet', s[0], s[1] - 6, 84, 6, 0.5); g.sfx(perfect ? 'perfect' : 'good', D.combo - 1, 'coin'); g.vibrate(12);
      D.tray.unshift({ k: (D.day - 1) % 12, t: 0, x: s[0], y: s[1] }); D.tray = D.tray.slice(0, 6);
      if (D.day === 24) { D.boards++; var b = 20 + D.boards * 5; g.addScore(b); D.toast = { text: 'Every pocket open! +' + b, t: 1.5 }; D.done = 1.4; g.sfx('powerUp', null, 'powerUp'); }
      else { D.day++; apAim(g); } }
    else { D.combo = 0; xmFloat(g, s[0], s[1] - 34, dx * D.sdir < 0 ? 'Too early' : 'Too late', '#ffb3b3'); if (xmMiss(g, 'missed the pocket')) return; } },
  update: function (g, dt) { var D = g.data, i; xmTick(g, dt);
    for (i = 0; i < 24; i++) if (D.open[i] > 0 && D.open[i] < 1) D.open[i] = Math.min(1, D.open[i] + dt * 3);
    D.tray.forEach(function (t) { t.t += dt; });
    if (D.done > 0) { D.done -= dt; if (D.done <= 0) apNewBoard(g); return; }
    var s = apSlot(D.target), lo = AP_X - 128, hi = AP_X + 128; D.sx += D.sdir * apSpeed(g) * dt; if (D.sx < lo) { D.sx = lo; D.sdir = 1; } if (D.sx > hi) { D.sx = hi; D.sdir = -1; }
    var side = D.sx > s[0] + apTol(g) ? 1 : D.sx < s[0] - apTol(g) ? -1 : 0;
    if (side !== 0 && D.was === 0) { D.passes++; if (D.passes >= 3) { D.combo = 0; D.passes = 0; xmFloat(g, s[0], s[1] - 34, 'It stayed shut', '#ffb3b3'); if (xmMiss(g, 'the pocket stayed shut')) return; } }
    if (side !== 0 && D.was != null && D.was !== 0 && side !== D.was) { D.passes++; if (D.passes >= 3) { D.combo = 0; D.passes = 0; if (xmMiss(g, 'the pocket stayed shut')) return; } } // skipped the window in one frame
    D.was = side; },
  draw: function (g, c) { var D = g.data, i; if (!g.bg()) xmSky(c, '#2a1a14', '#5a3a28'); c.fillStyle = 'rgba(10,8,20,.30)'; c.fillRect(0, 0, 360, 640);
    g.sprite('board_panel_960x1280', AP_X, AP_Y, AP_W, AP_H, function (c2) { c2.fillStyle = '#efe6d2'; c2.fillRect(AP_X - AP_W / 2, AP_Y - AP_H / 2, AP_W, AP_H); });
    var row = D.row, ry = apSlot(row * 4)[1];
    if (g.state !== 'title' && D.done <= 0) { c.fillStyle = 'rgba(255,226,122,.16)'; xmRound(c, AP_X - 142, ry - 34, 284, 68, 14); c.fill(); }
    for (i = 0; i < 24; i++) { var p = apSlot(i), o = D.open[i], tgt = i === D.target && D.done <= 0 && g.state !== 'title';
      if (tgt) { c.globalAlpha = 0.6 + 0.4 * Math.sin(g.t * 6) * (g.reducedMotion ? 0 : 1); g.sprite('pocket_glow', p[0], p[1], 84, 84); c.globalAlpha = 1; }
      if (o > 0) { g.frame('pocket_sheet', o < 1 ? 1 + Math.floor(o * 2.99) : 3, 0, 4, 1, p[0], p[1], 66, 66);
        if (o >= 1) g.frame('treats_sheet', (D.days[i] - 1) % 12, 0, 12, 1, p[0], p[1] + 4, 30, 30); }
      else { g.frame('pocket_colours_sheet', Math.floor(i / 4) % 4, 0, 4, 1, p[0], p[1], 66, 66, function (c2, x, y) { c2.fillStyle = '#b33'; c2.fillRect(x - 26, y - 22, 52, 44); });
        c.font = 'bold 17px system-ui'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(40,20,10,.75)'; c.strokeText(D.days[i], p[0], p[1] + 14); c.fillStyle = '#fff6dc'; c.fillText(D.days[i], p[0], p[1] + 14); } }
    // the sweeping star
    if (g.state !== 'title' && D.done <= 0) { var tp = apSlot(D.target), on = Math.abs(D.sx - tp[0]) <= apTol(g);
      c.save(); c.translate(D.sx, ry - 30); c.fillStyle = on ? '#ffe27a' : '#f5d77a'; c.strokeStyle = 'rgba(80,40,10,.8)'; c.lineWidth = 2; c.beginPath();
      for (var k = 0; k < 10; k++) { var r = k % 2 ? 5 : 12, an = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } c.closePath(); c.fill(); c.stroke(); c.restore();
      c.strokeStyle = 'rgba(255,226,122,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(D.sx, ry - 18); c.lineTo(D.sx, ry + 30); c.stroke();
      if (on) xmNow(g, c, tp[0], tp[1], 36, 'NOW'); }
    // treat tray
    c.font = 'bold 14px system-ui'; c.textAlign = 'left'; c.fillStyle = '#fff1c4'; c.fillText('Day ' + Math.min(D.day, 24) + ' of 24' + (D.boards ? ' · board ' + (D.boards + 1) : ''), 30, AP_Y + AP_H / 2 + 26);
    D.tray.forEach(function (t, k) { var x = 40 + k * 32, y = AP_Y + AP_H / 2 + 50, a = Math.min(1, t.t * 3); g.frame('treats_sheet', t.k, 0, 12, 1, t.x + (x - t.x) * a, t.y + (y - t.y) * a, 30, 30); });
    if (g.art.hog) g.frame('hog', Math.floor(g.t * 5) % 4, 0, 4, 1, 312, Math.min(g.safeBottom - 44, 560), 80, 80);
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.opened === 0) xmPill(g, c, 'Tap as the star passes over pocket ' + D.day, 600);
    else if (g.state === 'play' && D.passes === 2) xmPill(g, c, 'Last pass before it stays shut!', 600, '#ffb3b3');
    else if (g.state === 'play' && D.combo >= 3) xmPill(g, c, 'Treat streak ×' + D.combo, 600, '#ffe27a'); }
});
