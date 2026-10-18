// Eggshade Nursery: critters creep in from the edges toward a nest of 5 eggs. Tap them to shoo them away.
// A critter that reaches the nest carries off an egg; lose all 5 and the run ends. More critters, faster, as you go.
var EN_NX = 180, EN_NY = 330, EN_KINDS = ['beetle', 'mouse', 'spider'], EN_SPD = [1, 1.35, 0.85];
var EN_EGGS = [[-34, 8], [0, -6], [34, 8], [-17, 26], [17, 26]];
function enSpawn(g) { var D = g.data, a = hwRand() * Math.PI * 2, R = 260, k = Math.floor(hwRand() * Math.min(3, 1 + Math.floor(g.level / 2)));
  var x = EN_NX + Math.cos(a) * R, y = EN_NY + Math.sin(a) * R * 1.25; x = Math.max(-20, Math.min(380, x)); y = Math.max(150, Math.min(g.safeBottom + 10, y));
  D.crit.push({ k: k, x: x, y: y, t: hwRand(), run: 0 }); }
function enShoo(g, cr) { cr.run = 1; var D = g.data; D.combo++; g.addScore(1 + (D.combo >= 8 ? 1 : 0)); g.sfx('chirp', null, 'coin'); D.puffs.push({ x: cr.x, y: cr.y, t: 0.35 }); }
EagleGame.run({ id: 'eggshade-nursery', title: HW_NAMES['eggshade-nursery'], howto: 'Beetles, mice and spiders creep toward your nest of 5 eggs. Tap a critter to shoo it away before it reaches the nest. Each critter that gets there carries off an egg; lose all 5 and the night is over. Every 20 points a lost egg comes back. Keys: Space / Enter shoos the closest critter.',
  art: ['eggs_sheet', 'egg_cracked', 'critter_beetle_walk_sheet', 'critter_mouse_walk_sheet', 'critter_spider_walk_sheet', 'hatchlings_sheet'], levelEvery: 20, likeScore: 40,
  achievements: [{ id: 'e25', score: 25, name: 'Night Nanny' }, { id: 'e100', score: 100, name: 'Nest Guardian' }],
  init: function (g) { hwSeed(); g.data = { eggs: [1, 1, 1, 1, 1], crit: [], puffs: [], spawn: 1.2, combo: 0, lost: [], msg: null, nextBack: 20 }; },
  down: function (g) { var D = g.data, best = null, bd = 1e9;
    D.crit.forEach(function (cr) { if (cr.run) return; var d = g.tapX === undefined ? Math.hypot(cr.x - EN_NX, cr.y - EN_NY) : Math.hypot(cr.x - g.tapX, cr.y - g.tapY); if (d < bd) { bd = d; best = cr; } });
    if (best && (g.tapX === undefined || bd < 46)) enShoo(g, best); else { D.combo = 0; g.sfx('eggChill', null, 'hit'); } },
  update: function (g, dt) { var D = g.data, sp = Math.min(95, 34 + g.level * 5 + g.t * 0.25);
    D.spawn -= dt; if (D.spawn <= 0) { enSpawn(g); D.spawn = Math.max(0.42, 1.6 - g.level * 0.1 - g.t * 0.004) * (0.7 + hwRand() * 0.6); }
    D.crit.forEach(function (cr) { cr.t += dt; var dx = EN_NX - cr.x, dy = EN_NY - cr.y, d = Math.hypot(dx, dy) || 1;
      if (cr.run) { cr.x -= dx / d * 260 * dt; cr.y -= dy / d * 260 * dt; cr.flip = dx > 0; return; }
      cr.x += dx / d * sp * EN_SPD[cr.k] * dt + Math.sin(cr.t * 5) * 12 * dt; cr.y += dy / d * sp * EN_SPD[cr.k] * dt; cr.flip = dx < 0;
      if (d < 34) { cr.run = 2; var left = []; D.eggs.forEach(function (e, i) { if (e) left.push(i); }); if (!left.length) return; var i = hwPick(left); D.eggs[i] = 0; D.combo = 0;
        D.lost.push({ i: i, t: 0.8 }); g.sfx('eggCrack', 5 - left.length, 'hit'); g.shake && g.shake(5); g.vibrate(40);
        if (left.length === 1) g.gameOver('the critters took every egg'); } });
    D.crit = D.crit.filter(function (cr) { return cr.x > -60 && cr.x < 420 && cr.y > 40 && cr.y < 720; });
    if (g.score >= D.nextBack) { D.nextBack += 20; var gone = D.eggs.indexOf(0); if (gone >= 0) { D.eggs[gone] = 1; g.sfx('nestSettle', null, 'powerUp'); D.msg = { text: 'An egg rolls back home!', t: 1.4 }; }
      else { g.sfx('hatch', null, 'powerUp'); D.hatch = { t: 1.2 }; D.msg = { text: 'Full nest! A little one cheers', t: 1.4 }; g.addScore(3); } }
    D.puffs.forEach(function (p) { p.t -= dt; }); D.puffs = D.puffs.filter(function (p) { return p.t > 0; });
    D.lost.forEach(function (p) { p.t -= dt; }); D.lost = D.lost.filter(function (p) { return p.t > 0; });
    if (D.msg) { D.msg.t -= dt; if (D.msg.t <= 0) D.msg = null; } if (D.hatch) { D.hatch.t -= dt; if (D.hatch.t <= 0) D.hatch = null; } },
  draw: function (g, c) { var D = g.data, th = g.theme; if (!g.bg()) hwSky(c, '#14102c', '#26301f');
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(EN_NX, EN_NY + 20, 78, 34, 0, 0, 7); c.fill();
    c.strokeStyle = '#7a5530'; c.lineWidth = 5; for (var i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2; c.beginPath(); c.ellipse(EN_NX, EN_NY + 14, 68 + (i % 3) * 3, 30, a * 0.08, a, a + 1.4); c.stroke(); }
    EN_EGGS.forEach(function (p, i) { var x = EN_NX + p[0], y = EN_NY + p[1];
      if (D.eggs[i]) { if (!hwFrame(g, 'eggs_sheet', i, 5, 1, x, y, 40, 40)) { c.fillStyle = '#f4ecd8'; c.beginPath(); c.ellipse(x, y, 14, 18, 0, 0, 7); c.fill(); } }
      else { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 10, 12, 5, 0, 0, 7); c.fill(); } });
    D.lost.forEach(function (p) { var e = EN_EGGS[p.i]; c.globalAlpha = p.t / 0.8; g.sprite('egg_cracked', EN_NX + e[0], EN_NY + e[1] - (0.8 - p.t) * 30, 44, 44, function (c, x, y) { c.fillStyle = '#f4ecd8'; c.beginPath(); c.ellipse(x, y, 14, 18, 0, 0, 7); c.fill(); }); c.globalAlpha = 1; });
    if (D.hatch) hwFrame(g, 'hatchlings_sheet', (g.t * 8) % 6, 6, 1, EN_NX, EN_NY - 44, 54, 54);
    D.crit.forEach(function (cr) { var key = 'critter_' + EN_KINDS[cr.k] + '_walk_sheet', f = Math.floor(cr.t * 8) % 2;
      if (g.art[key]) g.frame(key, f, 0, 2, 1, cr.x, cr.y, 52, 52, null, 0, cr.flip); else if (cr.k === 2) hwSpider(c, cr.x, cr.y, 10); else { c.fillStyle = cr.k ? '#9a8a9a' : '#3a6a3a'; c.beginPath(); c.ellipse(cr.x, cr.y, 18, 12, 0, 0, 7); c.fill(); hwEyes(c, cr.x, cr.y - 3, 4); } });
    D.puffs.forEach(function (p) { c.globalAlpha = p.t / 0.35; c.strokeStyle = '#fff3b0'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 20 + (0.35 - p.t) * 80, 0, 7); c.stroke(); c.globalAlpha = 1; });
    var n = D.eggs.filter(Boolean).length; c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.fillStyle = n <= 1 ? th.bad : '#fff3b0'; c.fillText('🥚 ' + n + ' / 5', 180, 178);
    if (D.msg) { c.globalAlpha = Math.min(1, D.msg.t * 2); c.fillStyle = th.accent; c.font = 'bold 20px system-ui'; c.fillText(D.msg.text, 180, 210); c.globalAlpha = 1; }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.fillText('tap critters to shoo them · level ' + g.level, 180, g.safeY(600)); }
});
