var DOORX = 250, FLOOR = 470;
EagleGame.run({ id: 'doorkeep-hollow', packAlias: 'hinge-hollow', title: 'Doorkeep Hollow', howto: 'Tap to open or shut the door. Let guests in, keep junk out.',
  art: ['door', 'door_open', 'guest', 'junk', 'guest_sheet', 'junk_variants', 'doorframe_bg'], reskinKeys: ['door', 'guest', 'junk', 'doorframe_bg', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#30482f', bottom: '#593d23' }, levelEvery: 10, likeScore: 20, overSfx: 'junkIn',
  achievements: [{ id: 'host10', score: 10, name: 'Good Host' }, { id: 'keep40', score: 40, name: 'Hollow Keeper' }],
  init: function (g) { g.data = { open: false, lives: 3, q: [], spawn: 0.8 }; },
  down: function (g) { var D = g.data; D.open = !D.open; g.sfx(D.open ? 'doorOpen' : 'doorShut', null, 'jump'); },
  update: function (g, dt) {
    var D = g.data, sp = Math.min(260, 85 + g.level * 14); D.flash = Math.max(0, (D.flash || 0) - dt);
    D.spawn -= dt; if (D.spawn <= 0) { D.q.push({ x: -30, junk: Math.random() < 0.42, v: Math.floor(Math.random() * 4), y: FLOOR - 26 }); D.spawn = Math.max(0.5, 1.7 - g.level * 0.1) + Math.random() * 0.4; }
    for (var i = D.q.length - 1; i >= 0; i--) { var it = D.q[i]; it.x += sp * dt * (it.junk ? 1.1 : 1); it.t = (it.t || 0) + dt; if (it.junk) it.r = it.t * 6;
      if (it.x >= DOORX - 20) { D.q.splice(i, 1);
        if (it.junk === D.open) { g.sfx(it.junk ? 'junkIn' : 'guestBlocked', null, 'hit'); egLoseLife(g, it.junk ? 'junk got in' : 'guest turned away', true); if (g.state !== 'play') return; }
        else { g.sfx(it.junk ? 'junkBlocked' : 'guestIn', null, 'coin'); g.addScore(1); } } }
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; g.bg();
    g.sprite('doorframe_bg', DOORX + 55, FLOOR - 135, 110, 270, function (c, x, y, w, h) { c.fillStyle = g.themeName === 'light' ? '#d8cbb3' : '#2a2238'; c.fillRect(x - w / 2, y - h / 2, w, h); });
    c.fillStyle = th.dim; c.fillRect(0, FLOOR, 360, 4);
    // doorframe_bg 330 px wide: opening x0-300, jamb 300-330 -> logical opening 250-350, so the 100-wide door fills it exactly
    // door and door_open share the hinge on their left edge: same box, x = hinge
    var hx = DOORX, dw = 100, dh = 160;
    g.sprite(D.open ? 'door_open' : 'door', hx + dw / 2, FLOOR - dh / 2, dw, dh, function (c, x, y, w, h) { c.fillStyle = D.open ? '#3a2a1a' : '#a0632f'; c.fillRect(hx, y - h / 2, D.open ? 16 : w, h); });
    D.q && D.q.forEach(function (it) {
      if (it.junk) g.frame('junk_variants', it.v, 0, 4, 1, it.x, it.y, 52, 52, function (c, x, y) { c.fillStyle = th.bad; c.fillRect(x - 18, y - 18, 36, 36); }, it.r);
      else g.frame('guest_sheet', (it.t * 8 | 0) % 4, 0, 4, 1, it.x, it.y, 52, 52, function (c, x, y) { c.fillStyle = th.good; c.beginPath(); c.arc(x, y, 20, 0, 7); c.fill(); }); });
    c.fillStyle = th.fg; c.font = 'bold 16px system-ui'; c.textAlign = 'center'; c.fillText(D.open ? 'OPEN' : 'SHUT', DOORX + 50, g.safeY(560, 20));
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.fillText('guests in · junk out', 180, g.safeY(600));
    egLives(g, c); egFlash(g, c);
  }
});
