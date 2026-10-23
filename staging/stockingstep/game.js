// Stockingstep (Luna's reading): stockings swing on ribbons from the garland, stepping up the chimney breast. The stoatlet rides in one;
// tap to hop to the next as the two swing towards each other. Too far apart and she slips back (miss). Every stocking only holds her
// for a few swings, so keep climbing. Some stockings hold a star coin.
// Craft: the first hop has a long reach; the first miss is free; a dashed arc to the next stocking turns gold and NOW rings when a hop would land (learning phase only: xmCue).
// Placeholder: Luna's v1 sheet has green and gold both striped; until her redraw lands (XM_FIX.stockingGreenPattern) the green one is
// recoloured plain green with white dots in code.
var SS_DX = 56, SS_GAP = 128, SS_ROPE = 70, SS_BASE = 300, SS_HOP = 0.42, SS_SW = 82; // hooks alternate 180 -/+ 56
function ssHook(i) { return [180 + (i % 2 ? SS_DX : -SS_DX), SS_BASE - i * SS_GAP]; }
function ssW(g) { var D = g.data; return D.n <= 1 ? 1.7 : Math.min(3.4, 1.9 + D.n * 0.04); } // one shared swing clock
function ssAng(g, i, t) { var D = g.data, S = D.st[i]; return S.amp * Math.sin(D.phase + ssW(g) * (t - g.t) + S.ph); }
function ssMouth(g, i, t) { var h = ssHook(i), a = ssAng(g, i, t); return [h[0] + Math.sin(a) * SS_ROPE, h[1] + Math.cos(a) * SS_ROPE]; }
function ssReach(g) { var D = g.data; return D.n === 0 ? 120 : Math.max(72, 88 - D.n * 0.4); }
function ssHold(g) { var D = g.data; return D.n < 2 ? 99 : 1.6 * 2 * Math.PI / ssW(g); }
function ssAdd(g) { var D = g.data, i = D.st.length;
  // neighbours swing in opposite phase (towards each other together); later stockings drift off-beat a little so the window moves
  D.st.push({ amp: i === 0 ? 0.3 : Math.min(0.62, 0.5 + i * 0.004), ph: i * Math.PI + (i > 4 ? (xmRand() - 0.5) * Math.min(1.2, i * 0.04) : 0), col: i % 4, coin: i > 2 && xmRand() < 0.3 }); }
function ssGap(g, t) { var D = g.data, a = ssMouth(g, D.on, t), b = ssMouth(g, D.on + 1, t + SS_HOP); return Math.hypot(b[0] - a[0], (b[1] - a[1]) * 0.3); }
var ssFixCache = null;
function ssStockingSrc(g) { var im = g.art.stocking_colours_sheet; if (!im || !(window.XM_FIX && XM_FIX.stockingGreenPattern)) return im; if (ssFixCache) return ssFixCache;
  var oc = document.createElement('canvas'); oc.width = im.width; oc.height = im.height; var o = oc.getContext('2d'); o.drawImage(im, 0, 0);
  var fw = im.width / 4, f = document.createElement('canvas'); f.width = fw; f.height = im.height; var q = f.getContext('2d'); q.drawImage(im, fw, 0, fw, im.height, 0, 0, fw, im.height);
  q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(46,140,70,.82)'; q.fillRect(0, 40, fw, im.height - 40); // keep the cuff, recolour the leg
  q.fillStyle = '#fff'; for (var y = 52; y < im.height; y += 22) for (var x = 20 + (y % 44 ? 11 : 0); x < fw; x += 22) { q.beginPath(); q.arc(x, y, 4.5, 0, 7); q.fill(); }
  o.clearRect(fw, 0, fw, im.height); o.drawImage(f, fw, 0); ssFixCache = oc; return oc; }
EagleGame.run({ id: 'stockingstep', title: XM_NAMES['stockingstep'],
  howto: 'Stockings swing on ribbons up the chimney breast. Tap to hop to the next one as the two swing close together. Each stocking only holds you for a few swings, so keep climbing. Keys: Space / Enter hops.',
  art: xmArtList(['stocking_colours_sheet', 'climber_hop_sheet', 'climber_idle_sheet', 'step_burst_sheet', 'holly']),
  fill: { top: '#2a1a14', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#3a2618' } }, levelEvery: 15, likeScore: 25,
  achievements: [{ id: 's10', score: 10, name: 'Mantel Climber' }, { id: 's50', score: 50, name: 'Garland Gymnast' }, { id: 's120', score: 120, name: 'Top of the Tree' }],
  init: function (g) { xmSeed(); var D = g.data = { st: [], phase: 0, on: 0, n: 0, cam: 0, hop: null, hold: 0, lives: 3, maxLives: 3, combo: 0, fx: [], fall: 0 }; for (var i = 0; i < 6; i++) ssAdd(g); },
  down: function (g) { var D = g.data; if (D.hop || D.fall > 0) return; var a = ssMouth(g, D.on, g.t), b = ssMouth(g, D.on + 1, g.t + SS_HOP);
    D.hop = { t: 0, a: a, b: b, ok: ssGap(g, g.t) <= ssReach(g) }; g.sfx('step', null, 'jump'); },
  update: function (g, dt) { var D = g.data; xmTick(g, dt); D.phase += ssW(g) * dt; var want = SS_BASE - ssHook(D.on)[1]; D.cam += (want - D.cam) * Math.min(1, dt * 4);
    if (D.fall > 0) { D.fall -= dt; return; }
    if (!D.hop) { D.hold += dt; if (D.hold > ssHold(g)) { D.hold = 0; D.combo = 0; D.fall = 0.5; var m = ssMouth(g, D.on, g.t); xmFloat(g, m[0], m[1] + D.cam - 50, 'The ribbon slipped!', '#ffb3b3'); if (xmMiss(g, 'the stocking ribbon slipped')) return; } return; }
    var h = D.hop; h.t += dt; if (h.t < SS_HOP) return; D.hop = null;
    if (h.ok) { D.on++; D.n++; D.hold = 0; D.combo++; var S = D.st[D.on], gap = Math.hypot(h.b[0] - h.a[0], (h.b[1] - h.a[1]) * 0.3), perfect = gap <= ssReach(g) - 14, pts = 1 + (perfect ? 2 : 0) + Math.min(Math.floor(D.combo / 5), 3);
      if (S.coin) { S.coin = false; pts += 3; g.sfx('coin', null, 'coin'); }
      g.addScore(pts); xmFloat(g, h.b[0], h.b[1] + D.cam - 50, (perfect ? 'Perfect +' : '+') + pts, perfect ? '#ffe27a' : '#fff'); xmAnim(g, 'step_burst_sheet', h.b[0], h.b[1] + D.cam - 10, 76, 6, 0.45);
      g.sfx(perfect ? 'perfect' : 'good', D.combo - 1, 'coin'); g.vibrate(12); ssAdd(g); }
    else { D.combo = 0; D.fall = 0.5; xmFloat(g, h.b[0], h.b[1] + D.cam - 40, 'Too far to reach', '#ffb3b3'); if (xmMiss(g, 'missed the stocking')) return; } },
  draw: function (g, c) { var D = g.data, i, CUE = xmCue(g, D.n); if (!g.bg()) xmSky(c, '#2a1a14', '#5a3a28'); c.fillStyle = 'rgba(10,8,20,.34)'; c.fillRect(0, 0, 360, 640);
    var src = ssStockingSrc(g);
    for (i = Math.max(0, D.on - 2); i < D.st.length; i++) { var hk = ssHook(i), hy = hk[1] + D.cam; if (hy < -120 || hy > 700) continue; var a = ssAng(g, i, g.t), m = ssMouth(g, i, g.t), my = m[1] + D.cam;
      // garland peg + ribbon
      c.fillStyle = '#2e6b34'; c.beginPath(); c.arc(hk[0], hy, 9, 0, 7); c.fill(); c.fillStyle = '#e2363f'; c.beginPath(); c.arc(hk[0] + 3, hy - 2, 3.5, 0, 7); c.fill();
      c.strokeStyle = '#d9b04a'; c.lineWidth = 2; c.beginPath(); c.moveTo(hk[0], hy); c.lineTo(m[0], my); c.stroke();
      var S = D.st[i], rider = i === D.on && !D.hop && D.fall <= 0;
      if (rider) g.frame('climber_idle_sheet', Math.floor(g.t * 5) % 4, 0, 4, 1, m[0], my - 16, 66, 66, function (c2, x, y) { xmBlob(c2, x, y, 16, '#9a6a44'); }, a * 0.6);
      c.save(); c.translate(m[0], my); c.rotate(-a);
      if (src) c.drawImage(src, S.col * (src.width / 4), 0, src.width / 4, src.height, -97 / 192 * SS_SW, -4, SS_SW, SS_SW); else { c.fillStyle = '#c33'; c.fillRect(-16, 0, 32, 52); }
      c.restore();
      if (S.coin) { c.fillStyle = '#f2c230'; c.beginPath(); c.arc(m[0], my + 30, 8, 0, 7); c.fill(); c.fillStyle = '#fff6c0'; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('★', m[0], my + 34); } }
    // aim arc + NOW
    if (g.state === 'play' && !D.hop && D.fall <= 0) { var A = ssMouth(g, D.on, g.t), B = ssMouth(g, D.on + 1, g.t + SS_HOP), on = CUE > 0 && ssGap(g, g.t) <= ssReach(g) - 4;
      c.save(); c.globalAlpha = 0.35 + 0.65 * CUE; c.setLineDash([4, 6]); c.strokeStyle = on ? '#ffe27a' : 'rgba(255,255,255,.28)'; c.lineWidth = on ? 2.5 : 1.5; c.beginPath(); c.moveTo(A[0], A[1] + D.cam - 20);
      c.quadraticCurveTo((A[0] + B[0]) / 2, Math.min(A[1], B[1]) + D.cam - 70, B[0], B[1] + D.cam - 10); c.stroke(); c.restore(); if (on) xmNow(g, c, B[0], B[1] + D.cam + 20, 26, 'NOW'); }
    // hop / slip animation
    if (D.hop) { var h = D.hop, p = Math.min(1, h.t / SS_HOP), x = h.a[0] + (h.b[0] - h.a[0]) * p, y = h.a[1] + (h.b[1] - h.a[1]) * p - Math.sin(p * Math.PI) * 60 + D.cam - 14;
      if (!h.ok) y += p * p * 60; g.frame('climber_hop_sheet', Math.min(5, Math.floor(p * 6)), 0, 6, 1, x, y, 60, 60, null, 0, h.b[0] < h.a[0]); }
    else if (D.fall > 0) { var m0 = ssMouth(g, D.on, g.t); g.frame('climber_hop_sheet', 4, 0, 6, 1, m0[0], m0[1] + D.cam - 14 + Math.sin(D.fall * 6.28) * 6, 60, 60); }
    if (!D.hop && ssHold(g) < 50 && g.state === 'play' && D.fall <= 0) { var f = 1 - D.hold / ssHold(g), mm = ssMouth(g, D.on, g.t); c.fillStyle = 'rgba(16,20,38,.6)'; c.fillRect(mm[0] - 22, mm[1] + D.cam + 64, 44, 5); c.fillStyle = f < 0.3 ? '#ff8a8a' : '#ffe9b0'; c.fillRect(mm[0] - 22, mm[1] + D.cam + 64, 44 * f, 5); }
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.n === 0) xmPill(g, c, 'Tap to hop when the stockings swing close', 600);
    else if (g.state === 'play' && D.combo >= 5) xmPill(g, c, 'Climb streak ×' + D.combo, 600, '#ffe27a'); }
});
