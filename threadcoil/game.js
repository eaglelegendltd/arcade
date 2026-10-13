var BINS = 120, CX = 180, CY = 370, RMIN = 34, RMAX = 166, TINT = ['#e2445c', '#e8765e', '#d9a07a', '#b9a99a'];
EagleGame.run({ id: 'threadcoil', packAlias: 'spoolrunner', title: 'Threadcoil', howto: 'Hold to spiral out, release to spiral in. Never cross or touch your older thread. Each lap scores (tight laps double). Wind to the other wall (2+ laps) for +5 and a fresh spool.',
  art: ['spool', 'runner', 'thread', 'snap', 'wound_burst'], reskinKeys: ['spool', 'runner', 'thread', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#e1d2c0', bottom: '#e3d4c1' }, json: ['thread_tint'], levelEvery: 6, likeScore: 12, overSfx: 'snap',
  achievements: [{ id: 'lap5', score: 5, name: 'Wound Up' }, { id: 'lap25', score: 25, name: 'Master Spinner' }],
  init: function (g) { g.data = { a: 0, r: 100, bin: 0, laps: [new Float32Array(BINS).fill(NaN)], prevR: 100, snap: null, lapMin: 999, wall: null, wallMsg: 0 }; },
  down: function (g) { g.sfx('spiralOut'); }, up: function (g) { g.sfx('spiralIn'); },
  update: function (g, dt) {
    var D = g.data, w = Math.min(3, 1.5 + g.level * 0.12), vr = Math.min(70, 40 + g.level * 4);
    var prevR = D.r; D.r = Math.max(RMIN, Math.min(RMAX, D.r + (g.held ? vr : -vr) * dt)); D.lapMin = Math.min(D.lapMin, D.r);
    D.dr = D.r - prevR;
    // reaching the wall opposite the last one wound = bonus + fresh thread (gives a goal and resets clutter)
    var at = D.r <= RMIN + 0.5 ? 'in' : D.r >= RMAX - 0.5 ? 'out' : null;
    if (at && at !== D.wall && D.laps.some(function (L) { return L.some(function (v) { return !isNaN(v); }); }) && D.bin > (D.wallBin || 0) + BINS * 2) {
      D.wall = at; D.wallBin = D.bin; g.addScore(5); g.sfx('lap', 1, 'powerUp'); D.wallMsg = 1.2; D.laps = [new Float32Array(BINS).fill(NaN)]; D.prevR = D.r; }
    if (D.wallMsg) D.wallMsg = Math.max(0, D.wallMsg - dt);
    D.a += w * dt; var nb = Math.floor(D.a / (Math.PI * 2) * BINS);
    // ramp: only the previous 1 lap is solid at first, 2 laps from level 3, 3 laps from level 6
    var keep = 1 + (g.level >= 3) + (g.level >= 6);
    while (D.bin < nb) {
      D.bin++; var b = D.bin % BINS, pb = (D.bin - 1) % BINS;
      if (b === 0) { var tight = D.lapMin < 80; g.addScore(tight ? 2 : 1); g.sfx('lap', tight ? 1 : 0, 'coin'); D.lapMin = 999;
        D.laps.push(new Float32Array(BINS).fill(NaN)); while (D.laps.length > keep + 1) D.laps.shift(); }
      var cur = D.laps[D.laps.length - 1]; cur[b] = D.r;
      for (var i = 0; i < D.laps.length - 1; i++) { var o = D.laps[i]; if (isNaN(o[b])) continue;
        var gap = Math.abs(D.r - o[b]);
        // at the lap seam the previous point belongs to this same thread, so ignore near-zero differences
        var d0 = D.prevR - o[pb], cross = !isNaN(o[pb]) && Math.abs(d0) > 0.5 && d0 * (D.r - o[b]) < 0;
        if (cross || gap < 3) { D.snap = { a: D.a, r: D.r }; g.gameOver('thread snapped'); return; }
        if (gap < 10 && !D.nm) { D.nm = 0.5; g.sfx('nearMiss'); } }
      D.prevR = D.r;
    }
    if (D.nm) D.nm = Math.max(0, D.nm - dt);
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme, tint = (g.json.thread_tint && g.json.thread_tint.thread_tint) || TINT; g.bg();
    c.strokeStyle = th.dim; c.setLineDash([4, 6]); [RMIN, RMAX].forEach(function (r) { c.beginPath(); c.arc(CX, CY, r, 0, 7); c.stroke(); }); c.setLineDash([]);
    g.sprite('spool', CX, CY, 70, 70, function (c, x, y) { c.fillStyle = '#3d7bd9'; c.beginPath(); c.arc(x, y, 30, 0, 7); c.fill(); });
    var n = D.laps.length;
    D.laps.forEach(function (L, li) { c.strokeStyle = tint[Math.min(tint.length - 1, n - 1 - li)]; c.lineWidth = 3; c.beginPath(); var st = false;
      for (var b = 0; b < BINS; b++) { if (isNaN(L[b])) { st = false; continue; } var a = b / BINS * Math.PI * 2 - Math.PI / 2, x = CX + Math.cos(a) * L[b], y = CY + Math.sin(a) * L[b]; st ? c.lineTo(x, y) : c.moveTo(x, y); st = true; }
      c.stroke(); });
    var a = D.a - Math.PI / 2, heading = a + Math.PI / 2 + Math.atan2(D.dr || 0, (D.r * 0.05) || 1) * -1;
    g.sprite('runner', CX + Math.cos(a) * D.r, CY + Math.sin(a) * D.r, 30, 30, function (c, x, y) { c.fillStyle = th.bad; c.beginPath(); c.arc(x, y, 10, 0, 7); c.fill(); }, heading);
    if (D.snap) { var s = D.snap.a - Math.PI / 2; g.sprite('snap', CX + Math.cos(s) * D.snap.r, CY + Math.sin(s) * D.snap.r, 60, 60, function (c, x, y) { c.fillStyle = th.bad; c.fillRect(x - 15, y - 15, 30, 30); }); }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('hold: out · release: in · next bonus: ' + (D.wall === 'in' ? 'outer' : D.wall === 'out' ? 'inner' : 'either') + ' wall', 180, g.safeY(600));
    if (D.wallMsg) { c.globalAlpha = Math.min(1, D.wallMsg); var ws = 120 + (1.2 - D.wallMsg) * 120; g.sprite('wound_burst', CX, CY, ws, ws); c.globalAlpha = 1; c.fillStyle = th.accent; c.font = 'bold 20px system-ui'; c.fillText('Spool wound +5', 180, 160); }
  }
});
