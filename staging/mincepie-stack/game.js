// Mincepie Stack: a mince pie slides above the stack; tap to drop it. Overhang is trimmed off, a perfect drop keeps the full width,
// and three perfects in a row grow the pie back. Every 10th pie is golden (triple points).
// Craft: the first drop is lined up for you and snaps if it is half on; the first miss of a run is free; gold guide lines + NOW show the moment.
var MS_PH = 28, MS_BASE = 532, MS_MAXW = 150, MS_ART_H = 34;
// Luna's pie_layer_sheet (3 tops: star, lattice, holly; 576x192 frames, pie body at x 10-570, y 43-169) drawn 3-slice so the
// crimped ends survive any trimmed width; gold pies use a cached warm-gold tint of the same frame.
var msTint = {};
function msSrc(g, v, gold) { var im = g.art.pie_layer_sheet; if (!im) return null; var key = v + (gold ? 'g' : '');
  if (!msTint[key]) { var oc = document.createElement('canvas'); oc.width = 560; oc.height = 126; var o = oc.getContext('2d'); o.drawImage(im, v * 576 + 10, 43, 560, 126, 0, 0, 560, 126);
    if (gold) { o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(255,206,40,.42)'; o.fillRect(0, 0, 560, 126); } msTint[key] = oc; } return msTint[key]; }
function msPie(c, x, y, w, h, gold, a, v) { // x = centre, y = top of the layer slot
  if (w < 1) return; var g = window.__eagle, src = g && msSrc(g, v || 0, gold);
  if (src) { c.save(); c.globalAlpha = a == null ? 1 : a; var top = y - (MS_ART_H - h), H = MS_ART_H, l = x - w / 2, cap = Math.min(14, w / 2), sc = cap * 560 / MS_MAXW;
    c.drawImage(src, 0, 0, sc, 126, l, top, cap, H); c.drawImage(src, 560 - sc, 0, sc, 126, l + w - cap, top, cap, H);
    if (w > cap * 2) c.drawImage(src, sc, 0, 560 - 2 * sc, 126, l + cap, top, w - 2 * cap, H); c.restore(); return; }
  c.save(); c.globalAlpha = a == null ? 1 : a; var l = x - w / 2;
  c.fillStyle = gold ? '#e8b923' : '#b8742e'; xmRound(c, l, y + 4, w, h - 4, Math.min(8, w / 4)); c.fill();               // tin-shaped side (placeholder)
  c.fillStyle = gold ? '#ffe680' : '#e6b469'; xmRound(c, l, y, w, h * 0.55, Math.min(8, w / 4)); c.fill();
  c.strokeStyle = 'rgba(70,35,10,.55)'; c.lineWidth = 1.5; xmRound(c, l, y, w, h, Math.min(8, w / 4)); c.stroke(); c.restore(); }
function msTol(D) { return D.n === 0 ? D.cur.w * 0.5 : D.n < 4 ? 12 : 6; }
function msNext(g) { var D = g.data, top = D.stack[D.stack.length - 1], side = D.n % 2 ? 1 : -1;
  D.cur = { w: top.w, x: D.n === 0 ? top.x - 70 : 180 + side * 150, dir: D.n === 0 ? 1 : -side, gold: (D.n + 1) % 10 === 0, v: (D.n + 1) % 3 };
  D.v = Math.min(300, 80 + D.n * 5 + (g.level - 1) * 12); if (D.n === 0) D.v = 55; }
EagleGame.run({ id: 'mincepie-stack', title: XM_NAMES['mincepie-stack'],
  howto: 'A mince pie slides along. Tap to drop it on the stack: any overhang is trimmed off. Perfect drops keep the pie whole, and 3 in a row make it grow. Every 10th pie is golden. Keys: Space / Enter drops.',
  art: ['hog', 'holly', 'star_coin', 'pie_layer_sheet', 'plate_base', 'crumb_burst_sheet', 'perfect_burst_sheet'], fill: { top: '#1b2a52', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#dfe6ee' } }, levelEvery: 25, likeScore: 30,
  achievements: [{ id: 's10', score: 10, name: 'Plate Starter' }, { id: 's60', score: 60, name: 'Tower of Treats' }, { id: 's150', score: 150, name: 'Pie in the Sky' }],
  init: function (g) { xmSeed(); g.data = { stack: [{ x: 180, w: 120, sq: 0, v: 0 }], n: 0, lives: 3, maxLives: 3, combo: 0, cam: 0, fall: [], fx: [] }; msNext(g); },
  down: function (g) { var D = g.data, top = D.stack[D.stack.length - 1], cur = D.cur, dx = cur.x - top.x, tol = msTol(D);
    var ov = Math.min(cur.x + cur.w / 2, top.x + top.w / 2) - Math.max(cur.x - cur.w / 2, top.x - top.w / 2), ty = MS_BASE - D.stack.length * MS_PH + D.cam;
    if (Math.abs(dx) <= tol) { D.combo++; var w = top.w; if (D.combo % 3 === 0 && w < MS_MAXW) { w = Math.min(MS_MAXW, w + 12); D.toast = { text: 'Perfect ×3, the pie grows!', t: 1.4 }; }
      D.stack.push({ x: top.x, w: w, sq: 1, gold: cur.gold, v: cur.v }); var pts = (2 + Math.min(D.combo, 8)) * (cur.gold ? 3 : 1); g.addScore(pts);
      xmFloat(g, top.x, ty - 20, 'Perfect +' + pts, '#ffe27a'); xmAnim(g, 'perfect_burst_sheet', top.x, ty - 8, 96, 6, 0.5); g.sfx('good', D.combo - 1, 'coin'); g.vibrate(12); }
    else if (ov >= 10) { var nx = (Math.max(cur.x - cur.w / 2, top.x - top.w / 2) + Math.min(cur.x + cur.w / 2, top.x + top.w / 2)) / 2;
      var cut = cur.w - ov, cx = dx > 0 ? nx + ov / 2 + cut / 2 : nx - ov / 2 - cut / 2; D.fall.push({ x: cx, y: ty - MS_PH, w: cut, vy: 0, vx: dx > 0 ? 40 : -40, r: 0, gold: cur.gold, v: cur.v });
      xmAnim(g, 'crumb_burst_sheet', dx > 0 ? nx + ov / 2 : nx - ov / 2, ty - 6, 72, 6, 0.45);
      D.stack.push({ x: nx, w: ov, sq: 1, gold: cur.gold, v: cur.v }); D.combo = 0; var p2 = cur.gold ? 3 : 1; g.addScore(p2); xmFloat(g, nx, ty - 20, '+' + p2); g.sfx('land', null, 'coin'); }
    else { D.fall.push({ x: cur.x, y: ty - MS_PH, w: cur.w, vy: 0, vx: dx > 0 ? 60 : -60, r: 0, gold: cur.gold, v: cur.v }); D.combo = 0; if (xmMiss(g, 'the pie slid off the stack')) return; msNext(g); return; }
    D.n++; msNext(g); },
  update: function (g, dt) { var D = g.data, c = D.cur; xmTick(g, dt);
    var v = D.v * (g.level >= 3 ? 1 + 0.3 * Math.sin(g.t * 2.2) : 1); c.x += c.dir * v * dt; var lo = 22 + c.w / 2, hi = 338 - c.w / 2;
    if (c.x < lo && c.dir < 0) { c.x = lo; c.dir = 1; } if (c.x > hi && c.dir > 0) { c.x = hi; c.dir = -1; }
    var want = Math.max(0, D.stack.length * MS_PH - (MS_BASE - 330)); D.cam += (want - D.cam) * Math.min(1, dt * 6);
    D.stack.forEach(function (p) { if (p.sq) p.sq = Math.max(0, p.sq - dt * 5); });
    D.fall.forEach(function (f) { f.vy += 900 * dt; f.y += f.vy * dt; f.x += f.vx * dt; f.r += (f.vx > 0 ? 3 : -3) * dt; }); D.fall = D.fall.filter(function (f) { return f.y < 700; }); },
  draw: function (g, c) { var D = g.data, i; if (!g.bg()) xmSky(c, '#1b2a52', '#a9c3dd'); xmSnow(g, c, 26);
    c.fillStyle = 'rgba(12,18,40,.28)'; c.fillRect(0, 0, 360, 640);
    var py = MS_BASE + D.cam; c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(180, py + 14, 110, 14, 0, 0, 7); c.fill();
    if (g.art.plate_base) g.sprite('plate_base', 180, py + 4, 240, 80); else { c.fillStyle = '#f4f6fb'; c.beginPath(); c.ellipse(180, py + 6, 104, 14, 0, 0, 7); c.fill(); c.strokeStyle = '#4a74b8'; c.lineWidth = 3; c.beginPath(); c.ellipse(180, py + 6, 92, 10, 0, 0, 7); c.stroke(); }
    for (i = 0; i < D.stack.length; i++) { var p = D.stack[i], y = MS_BASE - (i + 1) * MS_PH + D.cam; if (y > 700) continue; var s = 1 + (p.sq || 0) * 0.12; msPie(c, p.x, y + MS_PH * (1 - 1 / s), p.w * s, MS_PH / s, p.gold, 1, p.v); }
    D.fall.forEach(function (f) { c.save(); c.translate(f.x, f.y + MS_PH / 2); c.rotate(f.r); msPie(c, 0, -MS_PH / 2, f.w, MS_PH, f.gold, 0.9, f.v); c.restore(); });
    var top = D.stack[D.stack.length - 1], ty = MS_BASE - D.stack.length * MS_PH + D.cam, sy = ty - 78, on = g.state === 'play' && Math.abs(D.cur.x - top.x) <= msTol(D);
    // 'now' cue: guide lines rise from the top pie's edges; they turn gold (and NOW shows) while a drop would be perfect
    c.save(); c.setLineDash([5, 6]); c.lineWidth = on ? 3 : 1.5; c.strokeStyle = on ? '#ffe27a' : 'rgba(255,255,255,.45)';
    [top.x - top.w / 2, top.x + top.w / 2].forEach(function (x) { c.beginPath(); c.moveTo(x, ty); c.lineTo(x, sy - 6); c.stroke(); }); c.restore();
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(D.cur.x, ty - 2, D.cur.w / 2, 4, 0, 0, 7); c.fill();
    msPie(c, D.cur.x, sy, D.cur.w, MS_PH, D.cur.gold, 1, D.cur.v); if (on) { c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.fillStyle = '#ffe27a'; c.fillText('NOW', top.x, sy - 10); }
    if (g.art.hog) g.frame('hog', Math.floor(g.t * 5) % 4, 0, 4, 1, 300, Math.min(g.safeBottom - 44, py - 30), 88, 88);
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.n === 0) xmPill(g, c, 'Tap when the pie lines up with the stack', 600);
    else if (g.state === 'play' && D.combo >= 2) xmPill(g, c, 'Perfect streak ×' + D.combo + (D.combo % 3 === 2 ? ' · one more grows it!' : ''), 600, '#ffe27a'); }
});
