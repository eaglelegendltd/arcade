// Batwing Bridges: hold to stretch a bat-wing plank upward, release to tip it across the gap.
// Land the tip on the next pillar to cross; too short or too long and the batfox tumbles. Endless pillars, narrower and wider apart as you go.
var BW_TOP = 420, BW_HERO = 70; // pillar top (logical y) and on-screen x of the current pillar's right edge
function bwPillar(g, x) { var lv = g.level, w = Math.max(22, 74 - lv * 4 - hwRand() * 26), gap = 40 + hwRand() * Math.min(190, 90 + lv * 12); return { x: x + gap, w: w }; }
function bwUp(g) { var D = g.data; if (D.st === 'grow') { D.st = 'tip'; D.ang = 0; g.sfx('batSwoop', null, 'hit'); } }
EagleGame.run({ id: 'batwing-bridges', title: HW_NAMES['batwing-bridges'], howto: 'Hold to stretch a bat-wing plank upward, then let go to drop it across the gap. If the plank tip lands on the next pillar the batfox crosses; too short or too long and it tumbles into the dark. Hit the glowing centre for a perfect bonus. Keys: hold Space / Enter.',
  art: ['bat_plank_tile_128x96', 'batfox_runner_sheet', 'pillar_top', 'gap_pit_tile_128'], levelEvery: 8, likeScore: 15,
  achievements: [{ id: 'b10', score: 10, name: 'Plank Rookie' }, { id: 'b40', score: 40, name: 'Batwing Architect' }],
  init: function (g) { hwSeed(); var p0 = { x: BW_HERO - 70, w: 70 }; g.data = { P: [p0, bwPillar(g, BW_HERO)], i: 0, cam: 0, len: 0, ang: 0, st: 'idle', hx: BW_HERO - 14, hy: BW_TOP, vy: 0, msg: null, creak: 0, perfects: 0 }; },
  down: function (g) { var D = g.data; if (D.st === 'idle') { D.st = 'grow'; D.len = 0; } },
  up: function (g) { bwUp(g); },
  update: function (g, dt) { var D = g.data, cur = D.P[D.i], nx = D.P[D.i + 1], edge = cur.x + cur.w;
    if (D.st === 'grow') { D.len = Math.min(560, D.len + dt * (210 + g.level * 12)); D.creak -= dt; if (D.creak <= 0) { D.creak = 0.18; g.sfx('bridgeCreak', D.len / 400, null); } if (!g.held) bwUp(g); }
    else if (D.st === 'tip') { D.ang = Math.min(Math.PI / 2, D.ang + dt * (2 + D.ang * 9)); if (D.ang >= Math.PI / 2) { var tip = edge + D.len; D.ok = tip >= nx.x && tip <= nx.x + nx.w;
        D.perfect = D.ok && Math.abs(tip - (nx.x + nx.w / 2)) <= 5; D.walkTo = D.ok ? nx.x + nx.w - 14 : tip + 6; D.st = 'walk'; g.sfx('bridgePlace', null, 'coin'); } }
    else if (D.st === 'walk') { D.hx += dt * 230; if (D.hx >= D.walkTo) { D.hx = D.walkTo;
        if (D.ok) { g.addScore(D.perfect ? 3 : 1); g.sfx(D.perfect ? 'combo' : 'cross', null, 'coin'); if (D.perfect) { D.perfects++; D.msg = { text: 'Perfect! +3', t: 1 }; }
          D.i++; D.P.push(bwPillar(g, D.P[D.P.length - 1].x + D.P[D.P.length - 1].w)); D.st = 'scroll'; D.oldLen = D.len; D.oldEdge = edge; }
        else { D.st = 'drop'; D.vy = 0; g.sfx('fall', null, 'hit'); } } }
    else if (D.st === 'drop') { D.vy += 1400 * dt; D.hy += D.vy * dt; if (D.hy > 760) g.gameOver(D.hx - 6 < nx.x ? 'the plank was too short' : 'the plank was too long'); }
    else if (D.st === 'scroll') { var target = D.P[D.i].x + D.P[D.i].w - BW_HERO; D.cam += Math.min(target - D.cam, dt * 520); if (target - D.cam < 0.5) { D.cam = target; D.st = 'idle'; D.len = 0; } }
    if (D.msg) { D.msg.t -= dt; if (D.msg.t <= 0) D.msg = null; } },
  draw: function (g, c) { var D = g.data, th = g.theme, cam = D.cam; if (!g.bg()) hwSky(c, '#130f2e', '#2e1c48');
    var pitY = Math.max(BW_TOP + 120, g.safeBottom - 40);
    if (g.art.gap_pit_tile_128) for (var x = -((cam * 0.5) % 48) - 48; x < 400; x += 48) c.drawImage(g.art.gap_pit_tile_128, x, pitY, 48, 48);
    else { c.fillStyle = 'rgba(10,6,20,.7)'; c.fillRect(0, pitY, 360, 200); }
    D.P.forEach(function (p, k) { var x = p.x - cam; if (x > 380 || x + p.w < -20) return; c.fillStyle = '#241a36'; c.fillRect(x, BW_TOP, p.w, 400); c.fillStyle = '#3a2b52'; c.fillRect(x + 3, BW_TOP, 4, 400);
      if (g.art.pillar_top) c.drawImage(g.art.pillar_top, x - 6, BW_TOP - 14, p.w + 12, Math.min(60, p.w + 12)); else { c.fillStyle = '#5a4580'; c.fillRect(x - 3, BW_TOP - 6, p.w + 6, 10); }
      if (k > D.i) { c.fillStyle = '#ffd23f'; c.fillRect(x + p.w / 2 - 5, BW_TOP - 4, 10, 4); } });
    // plank: from the current (or previous, while scrolling) pillar edge
    var edge = (D.st === 'scroll' ? D.oldEdge : D.P[D.i].x + D.P[D.i].w) - cam, L = D.st === 'scroll' ? D.oldLen : D.len, a = D.st === 'grow' || D.st === 'idle' ? 0 : D.st === 'tip' ? D.ang : Math.PI / 2;
    if (D.st === 'drop' && !D.ok) a = Math.min(Math.PI, Math.PI / 2 + (D.hy - BW_TOP) / 200);
    if (L > 0) { c.save(); c.translate(edge, BW_TOP); c.rotate(a - Math.PI / 2); var im = g.art.bat_plank_tile_128x96;
      if (im) { for (var d = 0; d < L; d += 32) { var w = Math.min(32, L - d); c.drawImage(im, 0, 0, im.width * w / 32, im.height, d, -12, w, 24); } }
      else { c.fillStyle = '#3b2a4f'; c.fillRect(0, -4, L, 8); }
      c.restore(); }
    var hx = D.hx - cam, f = D.st === 'walk' ? Math.floor(g.t * 14) % 6 : 0;
    if (!hwFrame(g, 'batfox_runner_sheet', f, 6, 1, hx, D.hy - 20, 44, 44)) hwGhost(c, hx, D.hy - 22, 14);
    if (D.msg) { c.globalAlpha = Math.min(1, D.msg.t * 2); c.fillStyle = th.accent; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText(D.msg.text, 180, 220); c.globalAlpha = 1; }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText(D.st === 'idle' && g.score === 0 ? 'hold to stretch the plank, let go to drop it' : 'level ' + g.level + ' · perfects ' + D.perfects, 180, g.safeY(pitY - 8)); }
});
