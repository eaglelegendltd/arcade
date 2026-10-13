EagleGame.run({ id: 'foldlight-gale', packAlias: 'lanternfold', title: 'Foldlight Gale', howto: 'Tap to unfold a panel for more light and points. Hold to fold shut. When a gust hits, keep open panels at or below its max.',
  art: ['lantern', 'lantern_closed', 'lantern_sheet', 'blowout_sheet', 'gust', 'glow'], reskinKeys: ['lantern', 'gust', 'glow', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#1f1b3f', bottom: '#1f1b3f' }, levelEvery: 5, likeScore: 8, overSfx: 'douse',
  achievements: [{ id: 'bright', score: 6, name: 'Night Light' }, { id: 'beacon', score: 18, name: 'Beacon' }],
  init: function (g) { g.data = { open: 0, lives: 3, acc: 0, gust: null, next: 3, heldT: 0, folded: false, blow: -1, n: 0 }; },
  down: function (g) { g.data.heldT = 0; g.data.folded = false; },
  up: function (g, ms) { var D = g.data; if (!D.folded && ms < 300 && D.open < 6) { D.open++; g.sfx('unfold', D.open, 'jump'); } },
  update: function (g, dt) {
    var D = g.data; D.flash = Math.max(0, (D.flash || 0) - dt); if (D.blow >= 0) { D.blow += dt; if (D.blow > 0.6) D.blow = -1; }
    if (g.held) { D.heldT += dt; if (D.heldT > 0.3 && !D.folded) { D.folded = true; if (D.open) g.sfx('foldAll', null, 'coin'); D.open = 0; } }
    D.acc += D.open * dt * 0.2; /* ~1 pt per 5 panel-seconds, same range as other games */ if (D.acc >= 1) { var n = Math.floor(D.acc); D.acc -= n; g.addScore(n); }
    D.next -= dt;
    if (!D.gust && D.next <= 0) { D.n++; D.gust = { side: Math.random() < .5 ? -1 : 1, warn: Math.max(0.7, 1.8 - g.level * 0.15), tol: D.n <= 3 ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 4), t: 0 }; g.sfx('gust', null, 'hit'); }
    if (D.gust) { var u = D.gust; u.t += dt;
      if (u.t >= u.warn && !u.hit) { u.hit = true; if (D.open > u.tol) { g.sfx('spin', null, 'hit'); D.blow = 0; egLoseLife(g, 'blown out', true); D.open = 0; } else g.sfx('glance', null, 'coin'); }
      if (u.t > u.warn + 0.5) { D.gust = null; D.next = Math.max(1, 3 - g.level * 0.3) + Math.random(); } }
  },
  draw: function (g, c) {
    var D = g.data, k = D.open / 6;
    if (!g.bg()) { c.fillStyle = g.themeName === 'light' ? '#2a3550' : '#070a12'; c.fillRect(0, 0, 360, 640); }
    g.sprite('glow', 180, 340, 120 + k * 260, 120 + k * 260, function (c, x, y, w) { var gr = c.createRadialGradient(x, y, 5, x, y, w / 2); gr.addColorStop(0, 'rgba(255,200,90,.7)'); gr.addColorStop(1, 'rgba(255,200,90,0)'); c.fillStyle = gr; c.fillRect(x - w / 2, y - w / 2, w, w); });
    var sway = D.gust && D.gust.hit ? D.gust.side * 0.25 : 0;
    var fb = function (c, x, y, w, h) { c.fillStyle = D.open ? '#ffb547' : '#8a6a3a'; c.fillRect(x - 30 - D.open * 6, y - h / 2, 60 + D.open * 12, h); };
    if (D.blow >= 0) g.frame('blowout_sheet', Math.min(4, D.blow * 8 | 0), 0, 5, 1, 180, 340, 192, 168, fb, sway);
    else g.frame('lantern_sheet', D.open, 0, 7, 1, 180, 340, 192, 168, fb, sway);
    for (var i = 0; i < 6; i++) { c.fillStyle = i < D.open ? g.theme.accent : g.theme.dim; c.fillRect(105 + i * 26, 470, 20, 8); }
    if (D.gust) { var u = D.gust, x = u.side < 0 ? 55 : 305;
      g.sprite('gust', x, 340, 90, 90, function (c, x, y) { c.strokeStyle = '#cfe8ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x + 30, y); c.stroke(); }, 0, u.side > 0);
      c.fillStyle = u.t < u.warn ? '#fff' : g.theme.bad; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText('max ' + u.tol, x, 290); }
    c.fillStyle = '#cfd6e6'; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('tap: unfold · hold: fold shut · ' + (D.open * 0.2).toFixed(1) + ' pts/s', 180, g.safeY(600));
    egLives(g, c); egFlash(g, c);
  }
});
