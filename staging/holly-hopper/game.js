// Holly Hopper (Luna's reading): snowy holly ledges stack up the street. The next ledge slides side to side above you; tap to hop
// straight up and land on it as it lines up. Ledges shrink (wide, mid, small) and speed up as you climb, and some carry star coins.
// A ledge only holds you for a few seconds before its snow slides off, so you can't wait for ever. Missing the hop drops you back (miss).
// Craft: the first ledge is slow and wide; the first miss is free; while learning (xmCue) a shadow appears as the ledge nears and NOW rings when it's on; during a hop a shadow marks the landing.
var HH_GAP = 112, HH_BASE = 470, HH_HOP = 0.42, HH_SZ = 76; // feet at y 248/288 of the hop/idle frames
var HH_LEDGE = { wide: 128, mid: 96, small: 64 };
function hhKind(n) { return n < 3 ? 'wide' : n < 14 ? (n % 3 ? 'wide' : 'mid') : n < 30 ? (n % 3 ? 'mid' : 'small') : (n % 2 ? 'small' : 'mid'); }
function hhSpeed(g, n) { return n <= 1 ? 50 : Math.min(230, 70 + n * 3 + (g.level - 1) * 6); }
function hhHold(g) { var D = g.data; return D.n < 2 ? 99 : Math.max(2.2, 4.2 - D.n * 0.03); }
function hhAdd(g) { var D = g.data, n = D.ledges.length, k = hhKind(n), w = HH_LEDGE[k];
  D.ledges.push({ n: n, k: k, w: w, x: n === 0 ? 180 : (xmRand() < 0.5 ? 40 + w / 2 : 320 - w / 2), dir: xmRand() < 0.5 ? 1 : -1, v: hhSpeed(g, n), coin: n > 2 && xmRand() < 0.35, y: HH_BASE - n * HH_GAP }); }
function hhNext(g) { return g.data.ledges[g.data.on + 1]; }
function hhWhere(L, t) { var lo = 22 + L.w / 2, hi = 338 - L.w / 2, span = hi - lo, u = (L.x - lo) + L.dir * L.v * t; u = ((u % (2 * span)) + 2 * span) % (2 * span); return lo + (u > span ? 2 * span - u : u); }
EagleGame.run({ id: 'holly-hopper', title: XM_NAMES['holly-hopper'],
  howto: 'The next holly ledge slides above you. Tap to hop straight up and land on it. Grab star coins on the way. Each ledge only holds you for a few seconds, so keep climbing. Keys: Space / Enter hops.',
  art: xmArtList(['hopper_hop_sheet', 'hopper_idle_sheet', 'ledge_wide', 'ledge_mid', 'ledge_small', 'coin_spin_sheet', 'land_puff_sheet', 'collect_burst_sheet', 'holly']),
  fill: { top: '#1d2650', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#dfe6ee' } }, levelEvery: 15, likeScore: 25,
  achievements: [{ id: 's10', score: 10, name: 'Up the Street' }, { id: 's50', score: 50, name: 'Rooftop Hopper' }, { id: 's120', score: 120, name: 'Holly High' }],
  init: function (g) { xmSeed(); var D = g.data = { ledges: [], on: 0, n: 0, cam: 0, hop: null, hold: 0, lives: 3, maxLives: 3, combo: 0, fx: [] }; for (var i = 0; i < 6; i++) hhAdd(g); D.px = 180; },
  down: function (g) { var D = g.data; if (D.hop) return; D.hop = { t: 0, from: D.ledges[D.on].y, to: hhNext(g).y }; g.sfx('step', null, 'jump'); },
  update: function (g, dt) { var D = g.data, i; xmTick(g, dt);
    for (i = D.on + 1; i < D.ledges.length; i++) { var L = D.ledges[i], lo = 22 + L.w / 2, hi = 338 - L.w / 2; L.x += L.dir * L.v * dt; if (L.x < lo) { L.x = lo; L.dir = 1; } if (L.x > hi) { L.x = hi; L.dir = -1; } }
    var want = Math.max(0, (HH_BASE - D.ledges[D.on].y) - 0); D.cam += (want - D.cam) * Math.min(1, dt * 4);
    if (!D.hop) { D.hold += dt; if (D.hold > hhHold(g)) { D.hold = 0; D.combo = 0; xmFloat(g, D.px, D.ledges[D.on].y + D.cam - 60, 'The snow slid off!', '#ffb3b3'); g.shake(4); if (xmMiss(g, 'the ledge\'s snow slid away')) return; } return; }
    var h = D.hop; h.t += dt; if (h.t < HH_HOP) return;
    var N = hhNext(g), dx = D.px - N.x;
    if (Math.abs(dx) <= N.w / 2 - 6) { D.on++; D.n++; D.hold = 0; D.hop = null; D.combo++; var perfect = Math.abs(dx) <= 8, pts = 1 + (perfect ? 2 : 0) + Math.min(Math.floor(D.combo / 5), 3);
      if (N.coin) { N.coin = false; pts += 3; xmAnim(g, 'collect_burst_sheet', D.px, N.y + D.cam - 50, 80, 6, 0.45); g.sfx('coin', null, 'coin'); }
      g.addScore(pts); xmFloat(g, D.px, N.y + D.cam - 70, (perfect ? 'Perfect +' : '+') + pts, perfect ? '#ffe27a' : '#fff'); xmAnim(g, 'land_puff_sheet', D.px, N.y + D.cam + 4, 70, 6, 0.4);
      g.sfx(perfect ? 'perfect' : 'good', D.combo - 1, 'coin'); g.vibrate(12); hhAdd(g); }
    else { D.hop = null; D.combo = 0; xmAnim(g, 'land_puff_sheet', D.px, D.ledges[D.on].y + D.cam + 4, 70, 6, 0.4); xmFloat(g, D.px, D.ledges[D.on].y + D.cam - 70, 'Missed the ledge', '#ffb3b3'); if (xmMiss(g, 'missed the ledge')) return; } },
  draw: function (g, c) { var D = g.data, i, CUE = xmCue(g, D.n); if (!g.bg()) xmSky(c, '#1d2650', '#6d86b8'); xmSnow(g, c, 30); c.fillStyle = 'rgba(12,18,40,.22)'; c.fillRect(0, 0, 360, 640);
    for (i = Math.max(0, D.on - 2); i < D.ledges.length; i++) { var L = D.ledges[i], y = L.y + D.cam; if (y < -40 || y > 700) continue;
      g.sprite('ledge_' + L.k, L.x, y + 6, L.w, 33, function (c2, x, y2) { c2.fillStyle = '#5b3a24'; c2.fillRect(x - L.w / 2, y2 - 8, L.w, 16); c2.fillStyle = '#fff'; c2.fillRect(x - L.w / 2, y2 - 12, L.w, 6); });
      if (L.coin) g.frame('coin_spin_sheet', Math.floor(g.t * 10) % 6, 0, 6, 1, L.x, y - 30, 30, 30, function (c2, x, y2) { xmBlob(c2, x, y2, 10, '#f2c230'); }); }
    // landing shadow (Richie, 23 Oct: only when it's needed). During a hop it marks where the feet will land and grows as they arrive.
    // Before a hop it's the learning cue: only while xmCue is on, and only once the ledge is close to lining up.
    var N = hhNext(g);
    if (N && D.hop) { var hp = Math.min(1, D.hop.t / HH_HOP), hit = Math.abs(D.px - hhWhere(N, HH_HOP - D.hop.t)) <= N.w / 2 - 6;
      c.fillStyle = hit ? 'rgba(20,30,60,' + (0.15 + 0.3 * hp) + ')' : 'rgba(0,0,0,0)'; c.beginPath(); c.ellipse(D.px, N.y + D.cam - 2, 6 + 10 * hp, 2 + 2 * hp, 0, 0, 7); c.fill(); }
    else if (N && g.state === 'play' && CUE > 0) { var nx = hhWhere(N, HH_HOP), near = Math.abs(D.px - nx) <= N.w / 2 + 24, on = Math.abs(D.px - nx) <= N.w / 2 - 8;
      if (near) { c.save(); c.globalAlpha = CUE; c.fillStyle = on ? 'rgba(255,226,122,.6)' : 'rgba(20,30,60,.3)'; c.beginPath(); c.ellipse(D.px, N.y + D.cam - 2, 16, 4, 0, 0, 7); c.fill();
        c.setLineDash([3, 6]); c.strokeStyle = on ? '#ffe27a' : 'rgba(255,255,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(D.px, D.ledges[D.on].y + D.cam - HH_SZ); c.lineTo(D.px, N.y + D.cam); c.stroke(); c.restore();
        if (on) xmNow(g, c, D.px, N.y + D.cam - 30, 22, 'NOW'); } }
    // hopper: feet sit on the ledge's snow line
    var base = D.ledges[D.on].y + D.cam, fy = base, fr = 0, sheet = 'hopper_idle_sheet', cols = 4;
    if (D.hop) { var p = Math.min(1, D.hop.t / HH_HOP), to = hhNext(g).y + D.cam; fy = base + (to - base) * p - Math.sin(p * Math.PI) * 40; sheet = 'hopper_hop_sheet'; cols = 6; fr = Math.min(5, 1 + Math.floor(p * 5)); }
    else fr = Math.floor(g.t * 5) % 4;
    var shake = !D.hop && D.hold > hhHold(g) - 1 && !g.reducedMotion ? Math.sin(g.t * 50) * 2 : 0;
    g.frame(sheet, fr, 0, cols, 1, D.px + shake, fy - HH_SZ * (248 / 288 - 0.5), HH_SZ, HH_SZ, function (c2, x, y) { xmBlob(c2, x, y, 20, '#8a5a3a'); });
    // hold meter on the current ledge
    if (!D.hop && hhHold(g) < 50 && g.state === 'play') { var f = 1 - D.hold / hhHold(g), L0 = D.ledges[D.on]; c.fillStyle = 'rgba(16,20,38,.6)'; c.fillRect(L0.x - 26, base + 22, 52, 5); c.fillStyle = f < 0.3 ? '#ff8a8a' : '#cfe8ff'; c.fillRect(L0.x - 26, base + 22, 52 * f, 5); }
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.n === 0) xmPill(g, c, 'Tap to hop when the ledge is above you', 600);
    else if (g.state === 'play' && D.combo >= 5) xmPill(g, c, 'Hop streak ×' + D.combo, 600, '#ffe27a'); }
});
