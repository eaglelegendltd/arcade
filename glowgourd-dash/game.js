// Glowgourd Dash: three-lane night run. Hop lanes, jump gravestones, dodge bats, collect glowgourds.
var LL_X = [90, 180, 270], LL_Y = 520, LL_JUMP = 0.6;
// perspective matched to Luna's road in bg.png: edges converge on (180, GG_VY); the road is visible from GG_HOR down
var GG_VY = 217, GG_HOR = 262;
function ggS(y) { return Math.max(0.08, (y - GG_VY) / (LL_Y - GG_VY)); } // 1 at the runner, small near the horizon
function ggX(l, y) { return 180 + (LL_X[l] - 180) * ggS(y); }
HW_ACTION_KEYS.push('ArrowUp', 'KeyW'); // Space / Enter / ArrowUp = jump
function ggHop(g, d) { var D = g.data, n = Math.max(0, Math.min(2, D.lane + d)); if (n !== D.lane) { D.lane = n; g.sfx('move', null, 'jump'); } }
addEventListener('keydown', function (e) { if (e.repeat || !hwLive()) return; if (e.code === 'ArrowLeft' || e.code === 'KeyA') ggHop(__eagle, -1); else if (e.code === 'ArrowRight' || e.code === 'KeyD') ggHop(__eagle, 1); });
EagleGame.run({ id: 'glowgourd-dash', title: HW_NAMES['glowgourd-dash'], howto: 'Tap the left or right side to hop lanes, tap the middle to jump (keys: arrows, Space). Jump gravestones, dodge bats. Every row scores; glowgourds give +3.',
  art: ['runner_run_sheet', 'runner_jump_sheet', 'gravestone_sheet', 'pumpkin_sheet', 'bat_sheet'], reskinKeys: ['bg', 'runner_run_sheet', 'pumpkin_sheet'], fill: { top: '#221b44', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#685874' } }, levelEvery: 10, likeScore: 20,
  achievements: [{ id: 'r15', score: 15, name: 'Lane Hopper' }, { id: 'r60', score: 60, name: 'Midnight Sprinter' }],
  init: function (g) { hwSeed(); g.data = { lane: 1, px: LL_X[1], rows: [], next: 1.2, last: -1, jump: 0 }; },
  down: function (g) { var D = g.data;
    if (g.tapX !== undefined && (g.tapX < 130 || g.tapX > 230)) { ggHop(g, g.tapX < 180 ? -1 : 1); return; }
    if (D.jump <= 0) { D.jump = LL_JUMP; g.sfx('jump', null, 'jump'); } },
  update: function (g, dt) {
    var D = g.data, sp = Math.min(520, 220 + g.level * 22); D.px += (LL_X[D.lane] - D.px) * Math.min(1, dt * 18); if (D.jump > 0) D.jump = Math.max(0, D.jump - dt);
    D.next -= dt; if (D.next <= 0) { // one row: 1-2 blocked lanes, always one free lane; gravestones can also be jumped
      var free = hwRand() < 0.5 && D.last >= 0 ? D.last : Math.floor(hwRand() * 3), items = [];
      for (var l = 0; l < 3; l++) if (l !== free && (g.level >= 3 ? hwRand() < 0.75 : hwRand() < 0.55)) items.push({ l: l, k: g.level >= 2 && hwRand() < 0.3 ? 'bat' : 'stone', v: Math.floor(hwRand() * 2) });
      if (!items.length) items.push({ l: (free + 1) % 3, k: 'stone', v: 0 }); if (hwRand() < 0.4) items.push({ l: free, k: 'gourd' });
      D.rows.push({ y: GG_HOR, items: items, done: false }); D.last = free; D.next = Math.max(0.42, 1.0 - g.level * 0.05); }
    var air = D.jump > 0.08 && D.jump < LL_JUMP - 0.05;
    for (var i = D.rows.length - 1; i >= 0; i--) { var r = D.rows[i]; r.y += sp * dt * (0.3 + 0.7 * Math.min(1.3, ggS(r.y)));
      for (var j = r.items.length - 1; j >= 0; j--) { var it = r.items[j]; if (Math.abs(r.y - LL_Y) < 26 && it.l === D.lane && Math.abs(D.px - LL_X[D.lane]) < 40) {
        if (it.k === 'gourd') { r.items.splice(j, 1); g.addScore(3); g.sfx('bonus', null, 'coin'); }
        else if (it.k === 'stone' && air) continue;
        else { g.sfx(it.k === 'bat' ? 'batBonk' : 'tombstoneTrip', null, 'hit'); g.gameOver(it.k === 'bat' ? 'bonked by a bat' : 'tripped on a gravestone'); return; } } }
      if (!r.done && r.y > LL_Y + 30) { r.done = true; g.addScore(1); } if (r.y > 700) D.rows.splice(i, 1); }
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme, t = g.t;
    if (!g.bg()) { hwSky(c, '#140d2e', '#2b1c3f'); c.fillStyle = '#3a2e4a'; c.fillRect(40, 0, 280, 640); }
    c.save(); c.beginPath(); c.rect(0, GG_HOR - 2, 360, 700); c.clip();
    D.rows.forEach(function (r) { var z = ggS(r.y); c.save(); c.globalAlpha = Math.min(1, (r.y - GG_HOR) / 30 + 0.2); r.items.forEach(function (it) { var x = ggX(it.l, r.y), y = r.y;
      if (it.k === 'stone') hwFrame(g, 'gravestone_sheet', it.v, 2, 1, x, y - 7 * z, 58 * z, 58 * z) || (c.fillStyle = '#8d88a3', c.fillRect(x - 20 * z, y - 24 * z, 40 * z, 48 * z));
      else if (it.k === 'bat') hwFrame(g, 'bat_sheet', (t * 10 + it.l) % 4, 4, 1, x, y - (18 + Math.sin(t * 8 + it.l) * 4) * z, 52 * z, 52 * z) || (c.fillStyle = '#3b2457', c.beginPath(), c.arc(x, y - 18 * z, 14 * z, 0, 7), c.fill());
      else { c.fillStyle = 'rgba(255,200,80,' + (0.18 + Math.sin(t * 6) * 0.08) + ')'; c.beginPath(); c.arc(x, y, 26 * z, 0, 7); c.fill(); hwFrame(g, 'pumpkin_sheet', 1, 2, 1, x, y, 44 * z, 44 * z) || hwPumpkin(c, x, y, 16 * z, '#ffb33d'); } }); c.restore(); });
    c.restore();
    var jy = D.jump > 0 ? Math.sin((1 - D.jump / LL_JUMP) * Math.PI) * 60 : 0;
    if (jy > 0) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(D.px, LL_Y + 28, 22 - jy / 6, 6, 0, 0, 7); c.fill(); }
    var drawn = D.jump > 0 ? hwFrame(g, 'runner_jump_sheet', Math.min(2, (1 - D.jump / LL_JUMP) * 3), 3, 1, D.px, LL_Y - 6 - jy, 76, 76) : hwFrame(g, 'runner_run_sheet', (t * 12) % 6, 6, 1, D.px, LL_Y - 6, 76, 76);
    if (!drawn) hwGhost(c, D.px, LL_Y - 4 - jy, 20);
    var hy = g.safeY(600); c.font = '13px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(20,12,36,.6)'; c.fillRect(60, hy - 15, 240, 22); c.fillStyle = '#fff'; c.fillText(g.score < 2 ? 'sides hop lanes · middle jumps' : 'level ' + g.level, 180, hy);
  }
});
