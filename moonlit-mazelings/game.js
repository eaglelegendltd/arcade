// Moonlit Mazelings: swipe to lead a line of ghost pets through small procedural mazes to the moon gate.
// Grab moon coins on the way and steer clear of the wandering lanterns. Each maze is a little bigger, with more pets and lanterns.
var MZ_DIRS = [[0, -1, 1, 'up'], [1, 0, 2, 'right'], [0, 1, 4, 'down'], [-1, 0, 8, 'left']], MZ_OPP = [2, 3, 0, 1];
function mzBuild(g) { var D = g.data, n = D.maze, C = Math.min(8, 5 + Math.floor(n / 2)), R = Math.min(10, 6 + Math.floor(n / 2)), S = Math.floor(Math.min(312 / C, (g.safeBottom - 240) / R));
  var W = [], seen = [], x, y; for (x = 0; x < C; x++) { W[x] = []; seen[x] = []; for (y = 0; y < R; y++) { W[x][y] = 15; seen[x][y] = 0; } }
  var st = [[0, R - 1]]; seen[0][R - 1] = 1; while (st.length) { var p = st[st.length - 1], opts = [];
    for (var d = 0; d < 4; d++) { var nx = p[0] + MZ_DIRS[d][0], ny = p[1] + MZ_DIRS[d][1]; if (nx >= 0 && ny >= 0 && nx < C && ny < R && !seen[nx][ny]) opts.push(d); }
    if (!opts.length) { st.pop(); continue; } var dd = hwPick(opts), qx = p[0] + MZ_DIRS[dd][0], qy = p[1] + MZ_DIRS[dd][1];
    W[p[0]][p[1]] &= ~MZ_DIRS[dd][2]; W[qx][qy] &= ~MZ_DIRS[MZ_OPP[dd]][2]; seen[qx][qy] = 1; st.push([qx, qy]); }
  var inner = []; for (x = 0; x < C; x++) for (y = 0; y < R; y++) { if (x < C - 1 && (W[x][y] & 2)) inner.push([x, y, 1]); if (y < R - 1 && (W[x][y] & 4)) inner.push([x, y, 2]); }
  for (var k = inner.length - 1; k > 0; k--) { var j = Math.floor(hwRand() * (k + 1)), tmp = inner[k]; inner[k] = inner[j]; inner[j] = tmp; } // remove ~30% of the remaining inner walls: plenty of loops to dodge lanterns
  inner.slice(0, Math.round(inner.length * 0.3)).forEach(function (w) { var d = w[2]; W[w[0]][w[1]] &= ~MZ_DIRS[d][2]; W[w[0] + MZ_DIRS[d][0]][w[1] + MZ_DIRS[d][1]] &= ~MZ_DIRS[MZ_OPP[d]][2]; });
  D.C = C; D.R = R; D.W = W; mzLayout(g);
  var dist = mzDist(D, 0, R - 1), far = [0, 0], fd = -1; for (x = 0; x < C; x++) for (y = 0; y < R; y++) if (dist[x][y] > fd) { fd = dist[x][y]; far = [x, y]; }
  D.gate = { x: far[0], y: far[1] }; D.lead = { x: 0, y: R - 1, fx: 0, fy: R - 1, d: -1, q: -1, prog: 0 }; D.trail = []; for (k = 0; k < 40; k++) D.trail.push([0, R - 1]);
  D.pets = Math.min(6, 2 + Math.floor(n / 2)); D.coins = []; var nc = 3 + Math.min(5, n);
  for (k = 0; k < 60 && D.coins.length < nc; k++) { x = Math.floor(hwRand() * C); y = Math.floor(hwRand() * R); if ((x || y !== R - 1) && !(x === far[0] && y === far[1]) && !D.coins.some(function (c) { return c.x === x && c.y === y; })) D.coins.push({ x: x, y: y }); }
  D.lan = []; var nl = n < 1 ? 0 : n < 3 ? 1 : Math.min(3, 1 + Math.floor((n - 1) / 3)); for (k = 0; k < 80 && D.lan.length < nl; k++) { x = Math.floor(hwRand() * C); y = Math.floor(hwRand() * R); if (dist[x][y] >= 5) D.lan.push({ x: x, y: y, fx: x, fy: y, d: -1, prog: 1 }); }
  D.safe = 2.5; D.done = 0; }
// maze fits between the HUD and the hint line on any screen (landscape/insets shrink safeBottom)
function mzLayout(g) { var D = g.data; D.S = Math.max(16, Math.floor(Math.min(312 / D.C, (g.safeBottom - 214 - 34) / D.R))); D.ox = 180 - D.C * D.S / 2; D.oy = 214; }
function mzDist(D, sx, sy) { var dist = [], x, y; for (x = 0; x < D.C; x++) { dist[x] = []; for (y = 0; y < D.R; y++) dist[x][y] = 1e9; } dist[sx][sy] = 0; var q = [[sx, sy]];
  while (q.length) { var p = q.shift(); for (var d = 0; d < 4; d++) { if (D.W[p[0]][p[1]] & MZ_DIRS[d][2]) continue; var nx = p[0] + MZ_DIRS[d][0], ny = p[1] + MZ_DIRS[d][1]; if (dist[nx][ny] > dist[p[0]][p[1]] + 1) { dist[nx][ny] = dist[p[0]][p[1]] + 1; q.push([nx, ny]); } } } return dist; }
function mzOpen(D, x, y, d) { return d >= 0 && !(D.W[x][y] & MZ_DIRS[d][2]); }
function mzSteer(g, d) { var D = g.data; if (!D.lead || D.done) return; D.lead.q = d; if (D.lead.d < 0 || D.lead.d === MZ_OPP[d]) { if (D.lead.d === MZ_OPP[d] && D.lead.prog < 1) { var L = D.lead; L.x = L.fx; L.y = L.fy; L.prog = 1 - L.prog; } } }
function mzCell(D, x, y) { return [D.ox + (x + 0.5) * D.S, D.oy + (y + 0.5) * D.S]; }
EagleGame.run({ id: 'moonlit-mazelings', title: HW_NAMES['moonlit-mazelings'], howto: 'Swipe up, down, left or right to lead your line of ghost pets through the maze; the leader keeps gliding until a wall or your next swipe. Reach the moon gate to clear the maze, grab moon coins for points and keep away from the wandering lanterns. A lantern touching your leader costs a life; 3 lives. Keys: arrow keys.',
  art: ['maze_floor_128', 'maze_wall_128', 'mazeling_walk_down_sheet', 'mazeling_walk_left_sheet', 'mazeling_walk_right_sheet', 'mazeling_walk_up_sheet', 'moon_coin_sheet', 'moon_gate_sheet', 'lantern'], levelEvery: 40, likeScore: 50, fill: { top: '#161131', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#1f183f' } },
  achievements: [{ id: 'm3', score: 30, name: 'Moonlit Guide' }, { id: 'm150', score: 150, name: 'Maze Shepherd' }],
  init: function (g) { hwSeed(); g.data = { maze: 0, lives: 3, flash: 0, msg: null, swipe: null }; mzBuild(g); },
  down: function (g) { var D = g.data; if (g.tapX === undefined) return; D.swipe = { x: g.tapX, y: g.tapY, used: false }; },
  up: function (g) { var D = g.data, s = D.swipe; D.swipe = null; if (!s || s.used) return; // plain tap: steer toward the tapped spot
    var p = mzCell(D, D.lead.fx, D.lead.fy), dx = s.x - p[0], dy = s.y - p[1]; if (Math.hypot(dx, dy) < 10) return; mzSteer(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); },
  update: function (g, dt) { mzLayout(g); var D = g.data, L = D.lead, sp = Math.min(7, 4 + D.maze * 0.25);
    if (D.done) { D.done -= dt; if (D.done <= 0) { D.maze++; mzBuild(g); D.msg = { text: 'Maze ' + (D.maze + 1), t: 1 }; } return; }
    if (L.prog >= 1 || L.d < 0) { L.fx = L.x; L.fy = L.y;
      if (L.q >= 0 && mzOpen(D, L.x, L.y, L.q)) { L.d = L.q; } else if (L.d >= 0 && !mzOpen(D, L.x, L.y, L.d)) { if (L.d >= 0) g.sfx('wallBump', null, 'hit'); L.d = -1; }
      if (L.d >= 0) { if (L.q === L.d) g.sfx('step', null, null); L.x = L.fx + MZ_DIRS[L.d][0]; L.y = L.fy + MZ_DIRS[L.d][1]; L.prog = 0; } }
    if (L.d >= 0 && L.prog < 1) { L.prog = Math.min(1, L.prog + dt * sp); var px = L.fx + (L.x - L.fx) * L.prog, py = L.fy + (L.y - L.fy) * L.prog, last = D.trail[0];
      if (Math.hypot(px - last[0], py - last[1]) > 0.08) { D.trail.unshift([px, py]); D.trail.length = 60; } }
    var cx = L.fx + (L.x - L.fx) * L.prog, cy = L.fy + (L.y - L.fy) * L.prog, rx = Math.round(cx), ry = Math.round(cy);
    D.coins = D.coins.filter(function (c) { if (c.x === rx && c.y === ry) { g.addScore(2); g.sfx('moonbeam', null, 'coin'); return false; } return true; });
    if (rx === D.gate.x && ry === D.gate.y) { D.done = 1; g.addScore(10 + D.pets * 2); g.sfx('mazelingFound', null, 'win'); D.msg = { text: 'Through the moon gate! +' + (10 + D.pets * 2), t: 1 }; return; }
    var ls = Math.min(2.6, 0.7 + D.maze * 0.1);
    D.lan.forEach(function (o) { if (o.wait > 0) { o.wait -= dt; o.cx = o.x; o.cy = o.y; return; }
      // lanterns never step next to the leader's head: they pick another way, or pause briefly
      var near = function (x, y) { return Math.abs(x - rx) + Math.abs(y - ry) <= 1 || (x === L.x && y === L.y); };
      if (o.prog < 1 && near(o.x, o.y) && !o.back) { var tx = o.x, ty = o.y; o.x = o.fx; o.y = o.fy; o.fx = tx; o.fy = ty; o.prog = 1 - o.prog; o.d = MZ_OPP[o.d]; o.back = 1; }
      if (o.prog >= 1) { o.back = 0; o.fx = o.x; o.fy = o.y; var opts = [], all = []; for (var d = 0; d < 4; d++) if (mzOpen(D, o.x, o.y, d) && !near(o.x + MZ_DIRS[d][0], o.y + MZ_DIRS[d][1])) { all.push(d); if (d !== MZ_OPP[o.d]) opts.push(d); }
        if (!opts.length) opts = all; if (!opts.length) { o.wait = 0.6; o.cx = o.x; o.cy = o.y; return; } o.d = hwPick(opts); o.x += MZ_DIRS[o.d][0]; o.y += MZ_DIRS[o.d][1]; o.prog = 0; }
      o.prog = Math.min(1, o.prog + dt * ls); o.cx = o.fx + (o.x - o.fx) * o.prog; o.cy = o.fy + (o.y - o.fy) * o.prog;
      if (D.safe <= 0 && Math.hypot(o.cx - cx, o.cy - cy) < 0.5) { D.safe = 2.5; var fd = mzDist(D, rx, ry), bx = o.x, by = o.y, bv = -1; for (var ax = 0; ax < D.C; ax++) for (var ay = 0; ay < D.R; ay++) if (fd[ax][ay] > bv) { bv = fd[ax][ay]; bx = ax; by = ay; } o.x = o.fx = bx; o.y = o.fy = by; o.prog = 1; o.d = -1; g.sfx('turn', null, 'hit'); g.vibrate(40); egLoseLife(g, 'a lantern caught the leader', true); } });
    if (D.safe > 0) D.safe -= dt; if (D.flash > 0) D.flash = Math.max(0, D.flash - dt); if (D.msg) { D.msg.t -= dt; if (D.msg.t <= 0) D.msg = null; } },
  draw: function (g, c) { var D = g.data, th = g.theme, S = D.S; if (!g.bg()) hwSky(c, '#120e2a', '#241a3e'); egLives(g, c);
    var fl = g.art.maze_floor_128; for (var x = 0; x < D.C; x++) for (var y = 0; y < D.R; y++) { if (fl) c.drawImage(fl, D.ox + x * S, D.oy + y * S, S, S); else { c.fillStyle = (x + y) % 2 ? '#2a2350' : '#2e2758'; c.fillRect(D.ox + x * S, D.oy + y * S, S, S); } }
    c.strokeStyle = '#c9b8ff'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath();
    for (x = 0; x < D.C; x++) for (y = 0; y < D.R; y++) { var X = D.ox + x * S, Y = D.oy + y * S, w = D.W[x][y];
      if (w & 1) { c.moveTo(X, Y); c.lineTo(X + S, Y); } if (w & 8) { c.moveTo(X, Y); c.lineTo(X, Y + S); } if ((w & 2) && x === D.C - 1) { c.moveTo(X + S, Y); c.lineTo(X + S, Y + S); } if ((w & 4) && y === D.R - 1) { c.moveTo(X, Y + S); c.lineTo(X + S, Y + S); }
      if ((w & 2) && x < D.C - 1) { c.moveTo(X + S, Y); c.lineTo(X + S, Y + S); } if ((w & 4) && y < D.R - 1) { c.moveTo(X, Y + S); c.lineTo(X + S, Y + S); } }
    c.stroke();
    var gp = mzCell(D, D.gate.x, D.gate.y); if (!hwFrame(g, 'moon_gate_sheet', D.done ? 2 : (g.t * 2) % 2, 3, 1, gp[0], gp[1], S * 1.1, S * 1.1)) { c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(gp[0], gp[1], S * 0.35, 0, 7); c.fill(); }
    D.coins.forEach(function (o) { var p = mzCell(D, o.x, o.y); if (!hwFrame(g, 'moon_coin_sheet', (g.t * 10) % 6, 6, 1, p[0], p[1], S * 0.55, S * 0.55)) { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(p[0], p[1], S * 0.18, 0, 7); c.fill(); } });
    D.lan.forEach(function (o) { var p = mzCell(D, o.cx == null ? o.x : o.cx, o.cy == null ? o.y : o.cy); c.fillStyle = 'rgba(255,190,80,.22)'; c.beginPath(); c.arc(p[0], p[1], S * 0.6, 0, 7); c.fill();
      g.sprite('lantern', p[0], p[1], S * 0.75, S * 0.75, function (c, x, y) { c.fillStyle = '#ffb347'; c.fillRect(x - 8, y - 10, 16, 20); }); });
    var L = D.lead, dn = ['up', 'right', 'down', 'left'][L.d < 0 ? 2 : L.d], f = L.d >= 0 ? Math.floor(g.t * 10) % 4 : 0;
    for (var i = D.pets; i >= 0; i--) { var tp = D.trail[Math.min(D.trail.length - 1, i * 7)], p = i ? mzCell(D, tp[0], tp[1]) : mzCell(D, L.fx + (L.x - L.fx) * L.prog, L.fy + (L.y - L.fy) * L.prog), sz = S * (i ? 0.62 : 0.8);
      if (i === 0 && D.safe > 0 && Math.floor(g.t * 12) % 2) continue;
      if (!hwFrame(g, 'mazeling_walk_' + dn + '_sheet', f, 4, 1, p[0], p[1], sz, sz)) hwGhost(c, p[0], p[1], sz * 0.35); }
    if (D.msg) { c.globalAlpha = Math.min(1, D.msg.t * 2); c.fillStyle = th.accent; c.font = 'bold 20px system-ui'; c.textAlign = 'center'; c.fillText(D.msg.text, 180, 196); c.globalAlpha = 1; }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('swipe to lead · maze ' + (D.maze + 1) + ' · ' + D.pets + ' pets', 180, g.safeY(D.oy + D.R * S + 20));
    egFlash(g, c); }
});
document.addEventListener('pointermove', function (e) { var g = window.__eagle; if (!g || !hwLive() || !g.data.swipe) return; var v = g.view.css; if (!v.w) return; var s = g.data.swipe;
  var x = (e.clientX - v.x) / v.w * 360, y = (e.clientY - v.y) / v.h * 640, dx = x - s.x, dy = y - s.y; if (Math.hypot(dx, dy) < 16) return;
  mzSteer(g, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); s.used = true; s.x = x; s.y = y; });
addEventListener('keydown', function (e) { if (!hwLive()) return; var d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.code]; if (d !== undefined) mzSteer(__eagle, d); });
