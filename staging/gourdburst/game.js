// Gourdburst: tap a cluster of 2+ touching same-colour pumpkins to pop it; the patch refills forever. Pops refill the moon timer.
var PP_C = 7, PP_R = 9, PP_S = 46, PP_X = 180 - PP_C * PP_S / 2 + PP_S / 2, PP_Y = 150, PP_COLS = ['#ff8a1f', '#9b6bff', '#5fd36b', '#ff5fa2', '#4cc3ff', '#ffd23f'];
function ppCluster(G, c, r) { var k = G[c][r].k, seen = {}, st = [[c, r]], out = []; while (st.length) { var p = st.pop(), id = p[0] + ',' + p[1]; if (seen[id]) continue; seen[id] = 1;
  if (p[0] < 0 || p[0] >= PP_C || p[1] < 0 || p[1] >= PP_R || !G[p[0]][p[1]] || G[p[0]][p[1]].k !== k) continue; out.push(p); st.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]); } return out; }
function ppNew(g, y) { return { k: Math.floor(hwRand() * Math.min(g.art.pumpkin_tiles ? 5 : PP_COLS.length, 4 + (g.level >= 4) + (g.level >= 8))), y: y }; }
EagleGame.run({ id: 'gourdburst', title: HW_NAMES['gourdburst'], howto: 'Tap 2 or more touching pumpkins of the same colour to pop them. Bigger clusters score far more and refill the moon timer. Do not let the moon set! Keys: arrows move the cursor, Space / Enter pops.',
  art: ['pumpkin_tiles', 'pop_burst_sheet'], reskinKeys: ['bg', 'pumpkin_tiles'], fill: { top: '#271d4b', bottom: '#3b2c3e' }, levelEvery: 60, likeScore: 120,
  achievements: [{ id: 'p100', score: 100, name: 'Patch Picker' }, { id: 'p500', score: 500, name: 'Gourd Royalty' }],
  init: function (g) { hwSeed(); var G = []; for (var c = 0; c < PP_C; c++) { G[c] = []; for (var r = 0; r < PP_R; r++) G[c][r] = ppNew(g, r); } g.data = { G: G, time: 1, pops: [], shake: 0, cur: [3, 4], kb: false }; },
  down: function (g) { var D = g.data, c, r; if (g.tapX === undefined) { D.kb = true; c = D.cur[0]; r = D.cur[1]; } else { D.kb = false; c = Math.round((g.tapX - PP_X) / PP_S); r = Math.round((g.tapY - PP_Y) / PP_S); }
    if (c < 0 || c >= PP_C || r < 0 || r >= PP_R || !D.G[c][r]) return; var cl = ppCluster(D.G, c, r);
    if (cl.length < 2) { D.shake = 0.2; D.time = Math.max(0, D.time - 0.03); g.sfx('miss', null, 'hit'); return; }
    var n = cl.length; cl.forEach(function (p) { D.pops.push({ x: PP_X + p[0] * PP_S, y: PP_Y + p[1] * PP_S, k: D.G[p[0]][p[1]].k, t: 0.4 }); D.G[p[0]][p[1]] = null; });
    for (c = 0; c < PP_C; c++) { var col = D.G[c].filter(Boolean), miss = PP_R - col.length; for (var i = 0; i < miss; i++) col.unshift(ppNew(g, -1 - i)); D.G[c] = col; }
    D.time = Math.min(1, D.time + 0.01 + n * 0.016); g.addScore(n * (n - 1)); g.sfx(n >= 6 ? 'bonus' : 'pop', null, n >= 6 ? 'powerUp' : 'coin');
    if (n >= 6) g.toast && (g.toast = null); D.big = n >= 6 ? { n: n, t: 1 } : D.big; },
  update: function (g, dt) { var D = g.data; D.time -= dt * Math.min(0.12, 0.05 + g.level * 0.008); if (D.time <= 0) { D.time = 0; g.gameOver('the moon set'); return; }
    for (var c = 0; c < PP_C; c++) for (var r = 0; r < PP_R; r++) { var p = D.G[c][r]; if (p.y < r) p.y = Math.min(r, p.y + dt * 12); }
    D.pops.forEach(function (p) { p.t -= dt; }); D.pops = D.pops.filter(function (p) { return p.t > 0; }); if (D.shake) D.shake = Math.max(0, D.shake - dt); if (D.big) { D.big.t -= dt; if (D.big.t <= 0) D.big = null; } },
  draw: function (g, c) { var D = g.data, th = g.theme; if (!g.bg()) { hwSky(c, '#160f30', '#22381f'); }
    c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(40, 118, 280, 10); c.fillStyle = D.time < 0.25 ? th.bad : '#fff3b0'; c.fillRect(40, 118, 280 * D.time, 10);
    c.save(); c.beginPath(); c.rect(PP_X - PP_S / 2, PP_Y - PP_S / 2, PP_C * PP_S, PP_R * PP_S); c.clip(); var sx = D.shake ? Math.sin(g.t * 80) * 3 : 0;
    for (var cc = 0; cc < PP_C; cc++) for (var r = 0; r < PP_R; r++) { var p = D.G[cc][r], x = PP_X + cc * PP_S + sx, y = PP_Y + p.y * PP_S;
      if (!hwFrame(g, 'pumpkin_tiles', p.k, 5, 1, x, y, PP_S - 2, PP_S - 2)) g.sprite('pumpkin' + p.k, x, y, PP_S - 4, PP_S - 4, function (c, x, y) { hwPumpkin(c, x, y + 2, 17, PP_COLS[p.k]); }); }
    c.restore(); if (D.kb) { c.strokeStyle = '#fff3b0'; c.lineWidth = 3; c.strokeRect(PP_X + D.cur[0] * PP_S - PP_S / 2 + 2, PP_Y + D.cur[1] * PP_S - PP_S / 2 + 2, PP_S - 4, PP_S - 4); }
    D.pops.forEach(function (p) { if (hwFrame(g, 'pop_burst_sheet', (0.4 - p.t) / 0.4 * 5.99, 6, 1, p.x, p.y, 70, 70)) return; c.globalAlpha = p.t / 0.4; c.strokeStyle = PP_COLS[p.k]; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 22 + (0.4 - p.t) * 50, 0, 7); c.stroke(); c.globalAlpha = 1; });
    if (D.big) { c.globalAlpha = Math.min(1, D.big.t * 2); c.fillStyle = th.accent; c.font = 'bold 24px system-ui'; c.textAlign = 'center'; c.fillText('Mega pop ×' + D.big.n + '!', 180, 300); c.globalAlpha = 1; }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('tap clusters of 2+ · level ' + g.level, 180, g.safeY(600)); }
});
// keyboard cursor (desktop): arrows move, Space / Enter (via the bridge + hw-common) pops at the cursor
addEventListener('keydown', function (e) { if (!hwLive()) return; var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code]; if (!d) return;
  var D = __eagle.data; D.kb = true; D.cur = [Math.max(0, Math.min(PP_C - 1, D.cur[0] + d[0])), Math.max(0, Math.min(PP_R - 1, D.cur[1] + d[1]))]; });
