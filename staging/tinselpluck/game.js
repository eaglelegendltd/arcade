// Tinselpluck (Luna's tree + hooks; colour-called timing): a glint runs round the 6 hooks on the tree. The tag calls a tinsel colour;
// tap while the glint is on a strand of that colour to pluck it. A fresh strand is hung and a new colour is called. Wrong strand = miss;
// if the glint goes round twice without a pluck the tinsel tangles (miss). The glint speeds up as you go.
// Colour-blind safe: every colour has its own pattern (gold zigzag, silver dots, red zigzag+band, green dots, blue stars) on the strand and the tag.
// Placeholder: until Luna's per-colour swing/pluck sheets land (tinsel_swing_sheet_<c> / tinsel_pluck_sheet_<c>, delivered 23 Oct 22:11), the gold strand is
// recoloured in code and patterned with code-drawn marks.
var TP_C = ['gold', 'silver', 'red', 'green', 'blue'], TP_HEX = ['#f2c230', '#dfe6ee', '#e0393f', '#3fa356', '#4a7fe0'];
var TP_X = 180, TP_Y = 354, TP_W = 340, TP_H = 378, TP_K = 340 / 720;
var TP_HOOKS = [[280, 300], [440, 320], [490, 450], [430, 610], [300, 590], [235, 440]]; // Luna's hook px, ordered round the tree
function tpHook(i) { var h = TP_HOOKS[i]; return [TP_X - TP_W / 2 + h[0] * TP_K, TP_Y - TP_H / 2 + h[1] * TP_K]; }
var tpCache = {};
function tpStrandSrc(g, kind, c) { // kind 'swing' | 'pluck'
  var own = 'tinsel_' + kind + '_sheet_' + TP_C[c]; if (c > 0 && g.art[own]) return g.art[own];
  var base = g.art['tinsel_' + kind + '_sheet']; if (!base || c === 0) return base; var key = kind + c; if (tpCache[key]) return tpCache[key];
  var oc = document.createElement('canvas'); oc.width = base.width; oc.height = base.height; var o = oc.getContext('2d');
  o.filter = 'grayscale(1) brightness(' + (c === 1 ? 1.5 : 1.1) + ')'; o.drawImage(base, 0, 0); o.filter = 'none';
  o.globalCompositeOperation = 'multiply'; o.fillStyle = TP_HEX[c]; o.fillRect(0, 0, oc.width, oc.height);
  o.globalCompositeOperation = 'destination-in'; o.drawImage(base, 0, 0); tpCache[key] = oc; return oc; }
function tpMarks(c, ctx, x, y, h, ph) { // code-drawn pattern marks down a strand (placeholder until Luna's sheets)
  ctx.save(); for (var k = 1; k <= 4; k++) { var yy = y + h * k / 5, xx = x + Math.sin(ph + k) * 2;
    if (c === 1 || c === 3) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xx, yy, 2.4, 0, 7); ctx.fill(); }
    else if (c === 4) { ctx.fillStyle = '#fff6c0'; ctx.beginPath(); for (var j = 0; j < 10; j++) { var r = j % 2 ? 1.4 : 3.6, an = -Math.PI / 2 + j * Math.PI / 5; ctx.lineTo(xx + Math.cos(an) * r, yy + Math.sin(an) * r); } ctx.fill(); }
    else if (c === 2 && k % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(xx - 5, yy - 1.5, 10, 3); } } ctx.restore(); }
function tpIcon(g, c, ctx, x, y, s) { g.frame('tinsel_colours_sheet', c, 0, 5, 1, x, y, s, s, function (c2) { xmBlob(c2, x, y, s / 3, TP_HEX[c]); }); }
function tpDwell(g) { var D = g.data; return D.plucks === 0 ? 0.9 : Math.max(0.26, 0.62 - D.plucks * 0.012 - (g.level - 1) * 0.02); }
function tpCall(g) { var D = g.data, present = []; D.str.forEach(function (s) { if (s && present.indexOf(s.c) < 0) present.push(s.c); });
  var opts = present.filter(function (c) { return c !== D.want; }); D.want = xmPick(opts.length ? opts : present); D.passes = 0; }
function tpHang(g, i) { var D = g.data;
  var c = Math.floor(xmRand() * 5); D.str[i] = { c: c, t: 0, ph: xmRand() * 6 }; }
EagleGame.run({ id: 'tinselpluck', title: XM_NAMES['tinselpluck'],
  howto: 'A glint runs round the hooks on the tree. The tag shows a tinsel colour: tap while the glint is on that colour to pluck it. Wrong colour is a miss, and two laps without a pluck tangles the tinsel. Keys: Space / Enter plucks.',
  art: xmArtList(['tree_hero', 'tinsel_glint_sheet', 'tinsel_colours_sheet', 'tinsel_swing_sheet', 'tinsel_pluck_sheet', 'hook_glow', 'pluck_burst_sheet', 'hog', 'holly'].concat(
    [].concat.apply([], TP_C.slice(1).map(function (c) { return ['tinsel_swing_sheet_' + c, 'tinsel_pluck_sheet_' + c]; })))),
  fill: { top: '#2a1a14', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#3a2618' } }, levelEvery: 20, likeScore: 30,
  achievements: [{ id: 's10', score: 10, name: 'Tinsel Tidier' }, { id: 's60', score: 60, name: 'Tree Trimmer' }, { id: 's150', score: 150, name: 'Glint Master' }],
  init: function (g) { xmSeed(); var D = g.data = { str: [], plucks: 0, combo: 0, lives: 3, maxLives: 3, glint: 0, gt: 0, want: -1, passes: 0, fx: [], gone: [] };
    for (var i = 0; i < 6; i++) D.str[i] = { c: i % 5, t: 0, ph: i }; D.str[5].c = 1; tpCall(g);
    // first pluck is taught: the wanted colour sits two hooks ahead of the glint
    var k = D.str.findIndex(function (s) { return s.c === D.want; }); if (k !== 2) { var t = D.str[2].c; D.str[2].c = D.want; D.str[k].c = t; } },
  down: function (g) { var D = g.data, i = D.glint, s = D.str[i], p = tpHook(i);
    if (s && s.c === D.want) { var mid = Math.abs(D.gt / tpDwell(g) - 0.5) < 0.25; D.plucks++; D.combo++; var pts = 1 + Math.min(D.combo - 1, 5) + (mid ? 1 : 0);
      g.addScore(pts); xmFloat(g, p[0], p[1] - 20, (mid ? 'Perfect +' : '+') + pts, mid ? '#ffe27a' : '#fff'); xmAnim(g, 'pluck_burst_sheet', p[0], p[1] + 20, 80, 6, 0.5);
      D.gone.push({ c: s.c, x: p[0], y: p[1], t: 0 }); D.str[i] = null; g.sfx(mid ? 'perfect' : 'good', D.combo - 1, 'coin'); g.vibrate(12);
      setTimeout(function () { if (g.data === D) tpHang(g, i); }, 380); tpCall(g); if (D.combo % 8 === 0) D.toast = { text: D.combo + ' plucks in a row!', t: 1.3 }; }
    else { D.combo = 0; xmFloat(g, p[0], p[1] - 20, s ? 'Not that one!' : 'Empty hook', '#ffb3b3'); if (xmMiss(g, 'plucked the wrong tinsel')) return; } },
  update: function (g, dt) { var D = g.data; xmTick(g, dt); D.gt += dt; var dw = tpDwell(g);
    if (D.gt >= dw) { D.gt -= dw; D.glint = (D.glint + 1) % 6; if (D.glint === 0 && D.str.some(function (s) { return s && s.c === D.want; })) { D.passes++;
        if (D.passes >= 2) { D.combo = 0; D.passes = 0; xmFloat(g, TP_X, TP_Y + 190, 'The tinsel tangled', '#ffb3b3'); if (xmMiss(g, 'the tinsel tangled')) return; } } }
    D.str.forEach(function (s) { if (s) s.t += dt; }); D.gone.forEach(function (o) { o.t += dt; }); D.gone = D.gone.filter(function (o) { return o.t < 0.6; }); },
  draw: function (g, c) { var D = g.data, i; if (!g.bg()) xmSky(c, '#2a1a14', '#5a3a28'); c.fillStyle = 'rgba(10,8,20,.32)'; c.fillRect(0, 0, 360, 640);
    g.sprite('tree_hero', TP_X, TP_Y, TP_W, TP_H, function (c2) { c2.fillStyle = '#2e6b34'; c2.beginPath(); c2.moveTo(TP_X, TP_Y - 160); c2.lineTo(TP_X + 120, TP_Y + 130); c2.lineTo(TP_X - 120, TP_Y + 130); c2.fill(); });
    var on = false;
    for (i = 0; i < 6; i++) { var p = tpHook(i), s = D.str[i], lit = i === D.glint && g.state !== 'title';
      if (lit) { c.globalAlpha = 0.95; g.sprite('hook_glow', p[0], p[1], 44, 44, function (c2, x, y) { xmBlob(c2, x, y, 14, 'rgba(255,226,122,.7)'); }); c.globalAlpha = 1; }
      if (s) { var src = tpStrandSrc(g, 'swing', s.c), fr = Math.floor((g.t * 5 + s.ph)) % 4, w = 36, h = 108, ty = p[1] - 20 / 288 * h, drop = Math.min(1, s.t * 4);
        c.save(); c.globalAlpha = drop; if (src) c.drawImage(src, fr * (src.width / 4), 0, src.width / 4, src.height, p[0] - w / 2, ty, w, h);
        else { c.strokeStyle = TP_HEX[s.c]; c.lineWidth = 5; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0], p[1] + 70); c.stroke(); }
        if (s.c > 0 && !g.art['tinsel_swing_sheet_' + TP_C[s.c]]) tpMarks(s.c, c, p[0], p[1] + 2, h - 14, g.t * 5 + s.ph); c.restore();
        if (lit && s.c === D.want) on = true; }
      c.fillStyle = '#e8c45a'; c.beginPath(); c.arc(p[0], p[1], 3, 0, 7); c.fill();
      if (lit && g.art.tinsel_glint_sheet) g.frame('tinsel_glint_sheet', Math.floor(g.t * 12) % 4, 0, 4, 1, p[0], p[1] + 10, 38, 38); }
    D.gone.forEach(function (o) { var src = tpStrandSrc(g, 'pluck', o.c), fr = Math.min(3, Math.floor(o.t / 0.15)); c.save(); c.globalAlpha = 1 - o.t / 0.6;
      if (src) c.drawImage(src, fr * (src.width / 4), 0, src.width / 4, src.height, o.x - 18, o.y - 8 - o.t * 60, 36, 108); c.restore(); });
    if (on && (D.plucks < 3 || g.reducedMotion)) { var q = tpHook(D.glint); xmNow(g, c, q[0], q[1] + 30, 30, 'NOW'); }
    // the colour tag
    if (g.state !== 'title') { c.save(); c.fillStyle = 'rgba(16,20,38,.8)'; xmRound(c, 8, 98, 108, 44, 22); c.fill(); c.strokeStyle = TP_HEX[D.want]; c.lineWidth = 3; c.stroke();
      tpIcon(g, D.want, c, 32, 120, 32); c.textAlign = 'left'; c.fillStyle = '#c9d2e8'; c.font = 'bold 10px system-ui'; c.fillText('PLUCK', 52, 114); c.fillStyle = '#fff'; c.font = 'bold 15px system-ui'; c.fillText(TP_C[D.want], 52, 132); c.restore(); }
    if (g.art.hog) g.frame('hog', Math.floor(g.t * 5) % 4, 0, 4, 1, 322, Math.min(g.safeBottom - 40, 552), 72, 72);
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.plucks === 0) xmPill(g, c, 'Tap when the glint is on the ' + TP_C[D.want] + ' tinsel', 600);
    else if (g.state === 'play' && D.passes === 1) xmPill(g, c, 'Last lap before it tangles!', 600, '#ffb3b3');
    else if (g.state === 'play' && D.combo >= 3) xmPill(g, c, 'Pluck streak ×' + D.combo, 600, '#ffe27a'); }
});
