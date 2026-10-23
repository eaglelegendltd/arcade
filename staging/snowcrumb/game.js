// Snowcrumb (slate design + Luna's robin): a hungry robin follows a trail of crumbs across the snowy garden. An aim marker swings
// side to side ahead of the trail; tap to toss a crumb there. The robin hops straight to each crumb in turn, so place them to
// lead it round the pine trees, cones and sledges. Bumping into one is a miss, and so is letting the robin go hungry.
// Craft: the first crumb has nothing in the way; the first miss is free; the line from the trail end to the marker turns gold
// (NOW) when the way is clear and red when something's in the way.
var SC_AHEAD = 125, SC_SCREEN = 470, SC_R = 12;
var SC_OB = { pine: { s: 64, r: 22 }, cone: { s: 40, r: 13 }, sledge: { s: 70, r: 24 } };
function scSpeed(g) { var D = g.data; return Math.min(170, 92 + D.eaten * 1.2 + (g.level - 1) * 5); }
function scSwing(g) { var D = g.data; return D.eaten === 0 ? 1.3 : Math.min(3.8, 1.7 + D.eaten * 0.03 + (g.level - 1) * 0.1); }
function scDrain(g) { var D = g.data; return D.eaten === 0 ? 0 : Math.min(0.16, 0.075 + D.eaten * 0.0015); }
function scEnd(g) { var D = g.data, q = D.crumbs; return q.length ? [q[q.length - 1].x, q[q.length - 1].y] : [D.x, D.y]; }
function scMark(g) { var D = g.data, e = scEnd(g); return [180 + Math.sin(D.mph) * 130, Math.min(e[1], D.y) - SC_AHEAD]; }
function scSegHit(ax, ay, bx, by, o, pad) { var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = xmClamp(((o.x - ax) * dx + (o.y - ay) * dy) / L2, 0, 1);
  return Math.hypot(ax + dx * t - o.x, ay + dy * t - o.y) < SC_OB[o.k].r + pad; }
function scClear(g, a, b) { return !g.data.obs.some(function (o) { return !o.hit && scSegHit(a[0], a[1], b[0], b[1], o, SC_R); }); }
function scRow(g) { var D = g.data, y = D.rowY; D.rowY -= 120 + xmRand() * 50; if (D.rows++ < 2) return;
  var n = 1 + (xmRand() < Math.min(0.6, 0.2 + D.rows * 0.02) ? 1 : 0), ks = ['pine', 'cone', 'sledge'];
  for (var i = 0; i < n; i++) D.obs.push({ k: xmPick(ks), x: 50 + xmRand() * 260, y: y + (xmRand() - 0.5) * 40, hit: 0 }); }
EagleGame.run({ id: 'snowcrumb', title: XM_NAMES['snowcrumb'],
  howto: 'A hungry robin follows your crumbs. The marker swings side to side ahead: tap to toss a crumb there. The robin hops straight to each crumb, so lead it round the trees, cones and sledges and keep it fed. Keys: Space / Enter tosses.',
  art: xmArtList(['robin_hop_sheet', 'robin_peck_sheet', 'robin_idle_sheet', 'crumb_spin_sheet', 'robin_prints', 'peck_snow_puff_sheet', 'trail_burst_sheet', 'pine', 'cone', 'sledge', 'holly']),
  fill: { top: '#c9d6e6', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#e6edf4' } }, levelEvery: 15, likeScore: 25,
  achievements: [{ id: 's10', score: 10, name: 'Breadcrumb Trail' }, { id: 's50', score: 50, name: 'Garden Guide' }, { id: 's120', score: 120, name: 'Robin\'s Friend' }],
  init: function (g) { xmSeed(); var D = g.data = { x: 180, y: 0, cam: -SC_SCREEN, crumbs: [], fly: [], obs: [], prints: [], pd: 0, mph: 0, eaten: 0, combo: 0, hunger: 1, peck: 0, face: 1, lives: 3, maxLives: 3, rowY: -200, rows: 0, fx: [] };
    for (var i = 0; i < 8; i++) scRow(g); },
  down: function (g) { var D = g.data; if (D.crumbs.length + D.fly.length >= 3) { D.toast = { text: 'Let the robin catch up', t: 0.8 }; return; }
    var e = scEnd(g), m = scMark(g); D.fly.push({ x0: D.x, y0: D.y, x: m[0], y: m[1], t: 0 }); g.sfx('drop', null, 'jump'); },
  update: function (g, dt) { var D = g.data, i; xmTick(g, dt); D.mph += scSwing(g) * dt;
    D.fly.forEach(function (f) { f.t += dt * 2.8; }); D.fly = D.fly.filter(function (f) { if (f.t < 1) return true;
      var on = D.obs.find(function (o) { return !o.hit && Math.hypot(o.x - f.x, o.y - f.y) < SC_OB[o.k].r + 4; });
      if (on) xmFloat(g, f.x, f.y - D.cam - 20, 'Crumb lost', '#c06060'); else D.crumbs.push({ x: f.x, y: f.y }); return false; });
    D.hunger -= scDrain(g) * dt; if (D.hunger <= 0) { D.hunger = 0.6; D.combo = 0; D.toast = { text: 'The robin got too hungry', t: 1.3 }; if (xmMiss(g, 'the robin went hungry')) return; }
    if (D.peck > 0) { D.peck -= dt; } else if (D.crumbs.length) { var c0 = D.crumbs[0], dx = c0.x - D.x, dy = c0.y - D.y, d = Math.hypot(dx, dy), st = scSpeed(g) * dt;
      if (Math.abs(dx) > 2) D.face = dx > 0 ? 1 : -1;
      if (d <= st) { D.x = c0.x; D.y = c0.y; D.crumbs.shift(); D.peck = 0.3; D.eaten++; D.combo++; D.hunger = Math.min(1, D.hunger + 0.3); var pts = 1 + Math.min(Math.floor(D.combo / 5), 4); g.addScore(pts);
        xmFloat(g, D.x, D.y - D.cam - 34, '+' + pts); xmAnim(g, 'peck_snow_puff_sheet', D.x + D.face * 14, D.y - D.cam + 8, 56, 6, 0.4); g.sfx('good', D.combo - 1, 'coin');
        if (D.combo % 5 === 0) { g.addScore(3); xmAnim(g, 'trail_burst_sheet', D.x, D.y - D.cam - 10, 96, 6, 0.55); D.toast = { text: D.combo + '-crumb trail! +3', t: 1.2 }; } }
      else { D.x += dx / d * st; D.y += dy / d * st; D.pd += st; if (D.pd > 20) { D.pd = 0; D.prints.push({ x: D.x, y: D.y, f: D.face }); if (D.prints.length > 40) D.prints.shift(); } }
      for (i = 0; i < D.obs.length; i++) { var o = D.obs[i]; if (o.hit || Math.hypot(o.x - D.x, o.y - D.y) > SC_OB[o.k].r + SC_R) continue;
        o.hit = 1; D.combo = 0; D.crumbs.shift(); xmAnim(g, 'peck_snow_puff_sheet', D.x, D.y - D.cam, 70, 6, 0.45); g.shake(5); xmFloat(g, D.x, D.y - D.cam - 30, 'Bump!', '#ffb3b3');
        var bx = D.x - o.x, by = D.y - o.y, bl = Math.hypot(bx, by) || 1; D.x += bx / bl * 14; D.y += by / bl * 14; if (xmMiss(g, 'the robin bumped into a ' + (o.k === 'pine' ? 'pine tree' : o.k))) return; break; } }
    D.cam += (D.y - SC_SCREEN - D.cam) * Math.min(1, dt * 3);
    while (D.rowY > D.cam - 200) scRow(g); D.obs = D.obs.filter(function (o) { return o.y - D.cam < 760; }); },
  draw: function (g, c) { var D = g.data, i; if (!g.bg()) xmSky(c, '#c9d6e6', '#eef3f8'); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(0, 0, 360, 640);
    // snowy ground scrolls with the garden: faint drift lines
    c.strokeStyle = 'rgba(150,170,200,.25)'; c.lineWidth = 2; for (var yy = -((-D.cam) % 90) - 90; yy < 700; yy += 90) { c.beginPath(); c.moveTo(0, yy); c.quadraticCurveTo(180, yy + 18, 360, yy); c.stroke(); }
    D.prints.forEach(function (p, k) { c.globalAlpha = 0.25 + 0.5 * k / D.prints.length; g.sprite('robin_prints', p.x, p.y - D.cam + 12, 34, 17, null, p.f < 0 ? Math.PI : 0); }); c.globalAlpha = 1;
    D.obs.forEach(function (o) { var y = o.y - D.cam; if (y < -60 || y > 700) return; c.globalAlpha = o.hit ? 0.45 : 1; c.fillStyle = 'rgba(80,100,140,.2)'; c.beginPath(); c.ellipse(o.x, y + SC_OB[o.k].s * 0.35, SC_OB[o.k].r + 4, 6, 0, 0, 7); c.fill();
      g.sprite(o.k, o.x, y, SC_OB[o.k].s, SC_OB[o.k].s, function (c2, x, y2) { xmBlob(c2, x, y2, SC_OB[o.k].r, '#4b6b4b'); }); c.globalAlpha = 1; });
    D.crumbs.forEach(function (cr) { g.frame('crumb_spin_sheet', 0, 0, 4, 1, cr.x, cr.y - D.cam, 22, 22, function (c2, x, y) { xmBlob(c2, x, y, 4, '#c8954a'); }); });
    D.fly.forEach(function (f) { var x = f.x0 + (f.x - f.x0) * f.t, y = f.y0 + (f.y - f.y0) * f.t - Math.sin(f.t * Math.PI) * 50 - D.cam; g.frame('crumb_spin_sheet', Math.floor(f.t * 12) % 4, 0, 4, 1, x, y, 22, 22, function (c2, x2, y2) { xmBlob(c2, x2, y2, 4, '#c8954a'); }); });
    // aim marker + path cue
    if (g.state === 'play') { var e = scEnd(g), m = scMark(g), ok = scClear(g, e, m) && !D.obs.some(function (o) { return !o.hit && Math.hypot(o.x - m[0], o.y - m[1]) < SC_OB[o.k].r + 4; });
      c.save(); c.setLineDash([4, 6]); c.strokeStyle = ok ? '#e0a400' : 'rgba(210,60,60,.8)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(e[0], e[1] - D.cam); c.lineTo(m[0], m[1] - D.cam); c.stroke(); c.restore();
      c.strokeStyle = ok ? '#e0a400' : '#d23c3c'; c.lineWidth = 3; c.beginPath(); c.arc(m[0], m[1] - D.cam, 11, 0, 7); c.stroke(); c.beginPath(); c.moveTo(m[0] - 16, m[1] - D.cam); c.lineTo(m[0] + 16, m[1] - D.cam); c.moveTo(m[0], m[1] - D.cam - 16); c.lineTo(m[0], m[1] - D.cam + 16); c.stroke();
      if (ok && D.crumbs.length + D.fly.length < 3) xmNow(g, c, m[0], m[1] - D.cam, 18, 'NOW', '#c98a00'); }
    // robin
    var ry = D.y - D.cam, moving = D.crumbs.length && D.peck <= 0;
    if (D.peck > 0) g.frame('robin_peck_sheet', Math.min(3, Math.floor((0.3 - D.peck) / 0.075)), 0, 4, 1, D.x, ry - 10, 58, 58, null, 0, D.face < 0);
    else g.frame(moving ? 'robin_hop_sheet' : 'robin_idle_sheet', Math.floor(g.t * (moving ? 12 : 5)) % (moving ? 6 : 4), 0, moving ? 6 : 4, 1, D.x, ry - 10, 58, 58, function (c2, x, y) { xmBlob(c2, x, y, 14, '#c0502a'); }, 0, D.face < 0);
    // hunger meter
    c.fillStyle = 'rgba(16,20,38,.6)'; xmRound(c, 120, g.safeTop + 104, 120, 10, 5); c.fill(); c.fillStyle = D.hunger < 0.3 ? '#ff7a6a' : '#f2a33a'; xmRound(c, 121, g.safeTop + 105, 118 * D.hunger, 8, 4); c.fill();
    c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.fillStyle = '#2a3550'; c.fillText('robin\'s tummy', 180, g.safeTop + 128);
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.eaten === 0) xmPill(g, c, 'Tap to toss a crumb where the marker is', 600);
    else if (g.state === 'play' && D.combo >= 4) xmPill(g, c, 'Crumb trail ×' + D.combo, 600, '#ffe27a'); }
});
