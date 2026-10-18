// Broomstick Bounce: hold to rise, release to fall; fly the witch through the gaps between chimney stacks and dodge the bats.
var BB_X = 100, BB_TOP = 70, BB_BOT = 560, BB_HW = 30; // BB_HW: chimney half-width for collisions (caps are 64 logical wide)
function bbChimney(g, c, x, y0, y1, top) { // y0..y1 vertical extent; top=true hangs from the sky with its cap at the bottom
  var body = g.art.chimney_body_tile, cap = g.art[top ? 'chimney_cap_top' : 'chimney_cap_bottom'], h = y1 - y0;
  if (!body || !cap) { c.fillStyle = '#7a3b2e'; c.fillRect(x - 22, y0, 44, h); c.fillStyle = '#4b2a2a'; c.fillRect(x - 32, top ? y1 - 32 : y0, 64, 32); return; }
  c.save(); c.beginPath(); c.rect(x - 32, y0, 64, h); c.clip();
  if (top) { for (var y = y1 - 32 - 64; y > y0 - 64; y -= 64) c.drawImage(body, x - 32, y, 64, 64); c.drawImage(cap, x - 32, y1 - 32, 64, 32); }
  else { for (y = y0 + 32; y < y1; y += 64) c.drawImage(body, x - 32, y, 64, 64); c.drawImage(cap, x - 32, y0, 64, 32); }
  c.restore(); }
EagleGame.run({ id: 'broomstick-bounce', title: HW_NAMES['broomstick-bounce'], howto: 'Hold (or hold Space / Enter) to fly up, let go to drop. Weave between the chimneys and dodge the bats. Each gap scores; grab moon sweets for +2.',
  art: ['sweet', 'witch_sheet', 'bat_sheet', 'chimney_body_tile', 'chimney_cap_top', 'chimney_cap_bottom'], reskinKeys: ['bg', 'witch_sheet', 'sweet'], fill: { top: '#201a3f', bottom: '#1c1529' }, levelEvery: 8, likeScore: 15,
  achievements: [{ id: 'g10', score: 10, name: 'Night Flyer' }, { id: 'g40', score: 40, name: 'Broom Ace' }],
  init: function (g) { hwSeed(); g.data = { y: 300, vy: 0, cols: [], bats: [], sweets: [], next: 0.6, grace: true, gt: 0, puff: [] }; },
  down: function (g) { g.data.grace = false; g.sfx('flap', null, 'jump'); },
  update: function (g, dt) {
    var D = g.data; if (D.grace) { D.gt += dt; D.y = 300 + Math.sin(D.gt * 3) * 10; if (D.gt < 2.5) return; D.grace = false; }
    var sp = Math.min(260, 140 + g.level * 12), gap = Math.max(130, 210 - g.level * 8);
    D.vy += (g.held ? -900 : 700) * dt; D.vy = Math.max(-320, Math.min(380, D.vy)); D.y += D.vy * dt;
    if (D.y < BB_TOP + 14 || D.y > BB_BOT - 14) { g.gameOver(D.y < BB_TOP + 14 ? 'flew into the clouds' : 'crashed onto the rooftops'); return; }
    D.next -= dt; if (D.next <= 0) { var c = BB_TOP + gap / 2 + 20 + hwRand() * (BB_BOT - BB_TOP - gap - 40); D.cols.push({ x: 400, c: c, gap: gap, done: false });
      var r = hwRand(); if (g.level >= 2 && r < Math.min(0.55, 0.2 + g.level * 0.05)) D.bats.push({ x: 400 + 120, y0: BB_TOP + 60 + hwRand() * (BB_BOT - BB_TOP - 120), ph: hwRand() * 6, amp: 20 + hwRand() * 30 });
      else if (r > 0.55) D.sweets.push({ x: 400 + 120, y: c + (hwRand() - 0.5) * gap * 0.5 }); D.next = Math.max(1.05, 1.7 - g.level * 0.05); }
    for (var i = D.cols.length - 1; i >= 0; i--) { var o = D.cols[i]; o.x -= sp * dt;
      if (!o.done && o.x + BB_HW < BB_X) { o.done = true; g.addScore(1); g.sfx('score', null, 'coin'); }
      if (Math.abs(o.x - BB_X) < BB_HW + 12 && (D.y - 12 < o.c - o.gap / 2 || D.y + 12 > o.c + o.gap / 2)) { g.sfx('chimneyBonk', null, 'hit'); g.gameOver('bonked a chimney'); return; }
      if (o.x < -50) D.cols.splice(i, 1); }
    for (i = D.bats.length - 1; i >= 0; i--) { var b = D.bats[i]; b.x -= (sp + 30) * dt; b.y = b.y0 + Math.sin(g.t * 2.5 + b.ph) * b.amp;
      if (Math.hypot(b.x - BB_X, b.y - D.y) < 26) { g.gameOver('bumped into a bat'); return; } if (b.x < -30) D.bats.splice(i, 1); }
    for (i = D.sweets.length - 1; i >= 0; i--) { var s = D.sweets[i]; s.x -= sp * dt;
      if (Math.hypot(s.x - BB_X, s.y - D.y) < 24) { D.sweets.splice(i, 1); g.addScore(2); g.sfx('bonus', null, 'powerUp'); continue; } if (s.x < -20) D.sweets.splice(i, 1); }
    if (g.held && Math.random() < 0.5) D.puff.push({ x: BB_X - 26, y: D.y + 10, t: 0.5 }); D.puff.forEach(function (p) { p.t -= dt; p.x -= 80 * dt; }); D.puff = D.puff.filter(function (p) { return p.t > 0; });
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; if (!g.bg()) { hwSky(c); c.fillStyle = '#1a0f2a'; c.fillRect(0, BB_BOT, 360, 80); }
    D.cols.forEach(function (o) { bbChimney(g, c, o.x, BB_TOP - 80, o.c - o.gap / 2, true); bbChimney(g, c, o.x, o.c + o.gap / 2, BB_BOT + 80, false); });
    D.bats.forEach(function (b) { hwFrame(g, 'bat_sheet', (g.t * 10 + b.ph) % 4, 4, 1, b.x, b.y, 40, 40) || (c.fillStyle = '#3b2457', c.beginPath(), c.arc(b.x, b.y, 12, 0, 7), c.fill()); });
    D.sweets.forEach(function (s) { g.sprite('sweet', s.x, s.y, 26, 26, function (c, x, y) { c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.fillStyle = '#ff6fb1'; c.fillRect(x - 15, y - 3, 6, 6); c.fillRect(x + 9, y - 3, 6, 6); }); });
    D.puff.forEach(function (p) { c.fillStyle = 'rgba(200,180,255,' + p.t + ')'; c.beginPath(); c.arc(p.x, p.y, 5, 0, 7); c.fill(); });
    var tilt = Math.max(-0.4, Math.min(0.4, D.vy / 700));
    if (!hwFrame(g, 'witch_sheet', g.held ? (g.t * 12) % 4 : 2, 4, 1, BB_X, D.y, 60, 60, tilt)) { c.fillStyle = '#7b5cd6'; c.beginPath(); c.arc(BB_X, D.y, 14, 0, 7); c.fill(); }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText(D.grace ? 'hold to rise · let go to fall' : 'level ' + g.level, 180, g.safeY(600));
  }
});
