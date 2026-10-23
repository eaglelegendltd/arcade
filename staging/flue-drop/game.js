// Flue Drop (Luna's reading, kept): a parcel hangs on the wire above the rooftops while chimneys slide past. Tap to let it fall
// straight down a chimney. Every chimney wants one parcel; letting one go by unfed costs a holly. Every 10th parcel is gold (x3).
// From level 3 the parcel also glides along the wire, so the lead changes. Chimneys sit at different heights (different fall times).
// Craft: the first chimney is slow with a wide catch; the first miss is free; a NOW ring shows when a drop would land in the flue.
var FD_PY = 150, FD_ROOF = 488, FD_G = 1500, FD_CW = 104, FD_CH = 156, FD_OPEN = 29; // chimney drawn 104x156 (Luna: 256x384, flue opening x 55-201, y 85-118)
function fdTopY(ch) { return FD_ROOF - FD_CH + 40 - ch.h; }               // sprite top
function fdMouthY(ch) { return fdTopY(ch) + 39; }                          // flue opening line
function fdFallT(y0, y1) { return Math.sqrt(Math.max(0, 2 * (y1 - y0) / FD_G)); }
function fdSpeed(g) { var D = g.data; return D.hits === 0 ? 48 : Math.min(205, 78 + D.hits * 3.2 + (g.level - 1) * 6); }
function fdTol(g) { var D = g.data; return D.hits === 0 ? FD_OPEN + 10 : D.hits < 4 ? FD_OPEN : FD_OPEN - 4; }
function fdSpawn(g, x) { var D = g.data, first = !D.ch.length;
  D.ch.push({ x: x, h: first ? 10 : Math.floor(xmRand() * 4) * 16, fed: false, lit: 0, gone: false }); }
function fdNewParcel(g) { var D = g.data; D.n++; D.p = { gold: D.n % 10 === 0, col: D.n % 10 === 0 ? 3 : Math.floor(xmRand() * 3), y: FD_PY, vy: 0, falling: false, t: 0 }; }
function fdTarget(g) { var D = g.data, px = D.px, best = null; // the next chimney the parcel could still reach
  D.ch.forEach(function (c) { if (c.fed || c.gone || c.x + FD_OPEN < px - 6) return; if (!best || c.x < best.x) best = c; }); return best; }
function fdAim(g) { var D = g.data, c = fdTarget(g); if (!c || !D.p || D.p.falling) return null; // where the parcel would meet that chimney's mouth
  var t = fdFallT(D.p.y, fdMouthY(c)), cx = c.x - D.v * t; return { c: c, dx: D.px - cx, t: t }; }
EagleGame.run({ id: 'flue-drop', title: XM_NAMES['flue-drop'],
  howto: 'Chimneys slide along the rooftops. Tap to drop the parcel so it falls straight into a chimney. Every chimney wants a parcel, so don\'t let one pass unfed. Every 10th parcel is gold. Keys: Space / Enter drops.',
  art: ['present_red_fall_sheet', 'present_green_fall_sheet', 'present_blue_fall_sheet', 'present_gold_fall_sheet', 'chimney_target', 'chimney_target_lit', 'chimney_puff_sheet',
    'miss_snow_puff_sheet', 'stoat_idle_sheet', 'roof', 'holly'],
  fill: { top: '#141c45', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#dfe6ee' } }, levelEvery: 15, likeScore: 25,
  achievements: [{ id: 's10', score: 10, name: 'First Round' }, { id: 's50', score: 50, name: 'Every Rooftop' }, { id: 's120', score: 120, name: 'Down the Flue' }],
  init: function (g) { xmSeed(); g.data = { ch: [], n: 0, hits: 0, combo: 0, lives: 3, maxLives: 3, px: 120, pv: 0, wire: 0, v: 48, roofX: 0, fx: [], reload: 0 };
    fdSpawn(g, 300); fdNewParcel(g); },
  down: function (g) { var D = g.data; if (!D.p || D.p.falling || D.reload > 0) return; D.p.falling = true; D.p.x = D.px; g.sfx('drop', null, 'jump'); },
  update: function (g, dt) { var D = g.data, i; xmTick(g, dt); D.v = fdSpeed(g);
    // parcel glides along the wire from level 3
    if (g.level >= 3) { D.wire += dt * (0.5 + 0.05 * g.level); var nx = 150 + Math.sin(D.wire) * 70; D.pv = (nx - D.px) / Math.max(dt, 1e-3); D.px = nx; } else { D.pv = 0; D.px += (120 - D.px) * Math.min(1, dt * 3); }
    D.roofX = (D.roofX + D.v * dt) % 64;
    D.ch.forEach(function (c) { c.x -= D.v * dt; if (c.lit) c.lit = Math.max(0, c.lit - dt); });
    var last = D.ch[D.ch.length - 1], gap = Math.max(150, D.v * 1.25) + xmRand() * 90; if (!last || last.x < 400 - gap) fdSpawn(g, Math.max(420, (last ? last.x : 0) + gap));
    // a chimney that has slid past the parcel's reach unfed costs a holly
    for (i = 0; i < D.ch.length; i++) { var c = D.ch[i]; if (!c.fed && !c.gone && c.x + FD_OPEN < D.px - 26 && !(D.p && D.p.falling)) { c.gone = true; D.combo = 0;
        xmFloat(g, Math.max(30, c.x), fdTopY(c) - 6, 'Missed a house', '#ffb3b3'); if (xmMiss(g, 'a chimney went without a parcel')) return; } }
    D.ch = D.ch.filter(function (c) { return c.x > -80; });
    if (D.reload > 0) { D.reload -= dt; if (D.reload <= 0) fdNewParcel(g); }
    var p = D.p; if (p && p.falling) { p.t += dt; p.vy += FD_G * dt; var y0 = p.y; p.y += p.vy * dt; var x = D.px; // falls straight down from where it was let go
      x = p.x;
      for (i = 0; i < D.ch.length; i++) { var ch = D.ch[i], my = fdMouthY(ch); if (ch.fed || y0 > my || p.y < my) continue;
        var dx = x - ch.x; if (Math.abs(dx) <= fdTol(g)) { ch.fed = true; ch.lit = 1.2; D.hits++; D.combo++; var perfect = Math.abs(dx) <= 6, pts = (1 + Math.min(D.combo - 1, 5) + (perfect ? 2 : 0)) * (p.gold ? 3 : 1);
            g.addScore(pts); xmFloat(g, ch.x, my - 40, (perfect ? 'Perfect +' : '+') + pts, perfect || p.gold ? '#ffe27a' : '#fff'); xmAnim(g, 'chimney_puff_sheet', ch.x, my - 26, 80, 6, 0.55);
            g.sfx(perfect ? 'perfect' : 'good', D.combo - 1, 'coin'); g.vibrate(12); if (D.combo > 1 && D.combo % 5 === 0) D.toast = { text: D.combo + ' chimneys in a row!', t: 1.3 };
            D.p = null; D.reload = 0.22; return; }
        if (Math.abs(dx) < FD_CW / 2 + 12) { // hit the pot rim / snowy cap
          xmAnim(g, 'miss_snow_puff_sheet', x, my - 4, 72, 6, 0.5); D.combo = 0; D.p = null; D.reload = 0.35; if (xmMiss(g, 'the parcel bounced off a chimney pot')) return; return; } }
      if (p.y > FD_ROOF + 6) { xmAnim(g, 'miss_snow_puff_sheet', x, FD_ROOF, 72, 6, 0.5); D.combo = 0; D.p = null; D.reload = 0.35; xmFloat(g, x, FD_ROOF - 30, 'Plop! In the snow', '#ffb3b3'); if (xmMiss(g, 'the parcel landed in the snow')) return; } } },
  draw: function (g, c) { var D = g.data, i; if (!g.bg()) xmSky(c, '#141c45', '#3b4f8a'); xmSnow(g, c, 30);
    var sh = c.createLinearGradient(0, 300, 0, 500); sh.addColorStop(0, 'rgba(8,10,30,0)'); sh.addColorStop(1, 'rgba(8,10,30,.6)'); c.fillStyle = sh; c.fillRect(0, 300, 360, 200);
    // wire across the sky
    c.strokeStyle = 'rgba(30,24,30,.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, FD_PY - 34); c.quadraticCurveTo(180, FD_PY - 20, 365, FD_PY - 34); c.stroke();
    // chimneys (behind the roof strip)
    D.ch.forEach(function (ch) { var lit = ch.fed; var k = lit && g.art.chimney_target_lit ? 'chimney_target_lit' : 'chimney_target', ty = fdTopY(ch);
      c.globalAlpha = ch.gone ? 0.55 : 1; g.sprite(k, ch.x, ty + FD_CH / 2, FD_CW, FD_CH, function (c2, x) { c2.fillStyle = '#9b3b2e'; c2.fillRect(x - 30, ty + 30, 60, 100); c2.fillStyle = '#eef3fa'; c2.fillRect(x - 36, ty + 22, 72, 12); }); c.globalAlpha = 1; });
    // roof strip: kit roof tile scrolling, snowy ridge on top
    var ry = FD_ROOF; if (g.art.roof) { c.save(); c.beginPath(); c.rect(0, ry, 360, 160); c.clip(); for (var x = -D.roofX; x < 360; x += 64) for (var y = ry; y < 660; y += 64) g.sprite('roof', x + 32, y + 32, 64, 64); c.restore(); }
    else { c.fillStyle = '#5a3a3a'; c.fillRect(0, ry, 360, 160); }
    c.fillStyle = 'rgba(14,18,40,.25)'; c.fillRect(0, ry, 360, 160); c.fillStyle = '#eef3fa'; xmRound(c, -10, ry - 8, 380, 16, 8); c.fill();
    if (g.art.stoat_idle_sheet) g.frame('stoat_idle_sheet', Math.floor(g.t * 4) % 4, 0, 4, 1, 312, ry - 30, 76, 76);
    // NOW cue: ring under the hanging parcel when a drop would land in the next flue
    var aim = g.state === 'play' ? fdAim(g) : null, on = aim && Math.abs(aim.dx) <= fdTol(g) - 3;
    if (aim) { var my = fdMouthY(aim.c); c.save(); c.setLineDash([4, 6]); c.strokeStyle = on ? '#ffe27a' : 'rgba(255,255,255,.35)'; c.lineWidth = on ? 2.5 : 1.5;
      c.beginPath(); c.moveTo(D.px, FD_PY + 26); c.lineTo(D.px, my - 6); c.stroke(); c.restore(); if (on) xmNow(g, c, D.px, FD_PY, 30, 'NOW'); }
    // parcel
    var p = D.p; if (p) { var keys = ['present_red_fall_sheet', 'present_green_fall_sheet', 'present_blue_fall_sheet', 'present_gold_fall_sheet'], x = p.falling ? p.x : D.px, fr = p.falling ? Math.floor(p.t * 14) % 6 : 0;
      if (!p.falling) { c.strokeStyle = 'rgba(30,24,30,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, FD_PY - 26); c.lineTo(x, FD_PY - 16); c.stroke(); }
      var bob = p.falling || g.reducedMotion ? 0 : Math.sin(g.t * 3) * 2; g.frame(keys[p.col], fr, 0, 6, 1, x, p.y + bob, 50, 50, function (c2, x2, y2) { c2.fillStyle = p.gold ? '#e8b923' : '#c33'; c2.fillRect(x2 - 18, y2 - 18, 36, 36); }); }
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.hits === 0) xmPill(g, c, 'Tap so the parcel drops into the chimney', 600);
    else if (g.state === 'play' && D.n % 10 === 9 && D.p) xmPill(g, c, 'Next parcel is gold: triple points', 600, '#ffe27a');
    else if (g.state === 'play' && D.combo >= 3) xmPill(g, c, 'Chimney streak ×' + D.combo, 600, '#ffe27a'); }
});
