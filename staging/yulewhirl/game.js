// Yulewhirl (slate design + Luna's art): a snowflake whirligig rolls along the snowy ridge, and its spin sets the way it travels.
// Tap to reverse the spin (and the direction) to sweep in falling sparkles and stay clear of soot puffs. It turns round by itself at
// the ends of the ridge. Sparkles you miss only break the streak; soot costs a holly. Every 12th sparkle is a big one (x3).
// Craft: the opening sparkles fall gently on the side you're not heading to, so the first tap is taught; the first soot hit is free;
// every falling thing casts a marker on the ridge (gold = sparkle, grey = soot), and the marker under the whirligig rings NOW (learning phase only: xmCue).
var YW_RAIL = 470, YW_SIZE = 112, YW_HUB = YW_RAIL - 54, YW_L = 44, YW_R = 316, YW_CATCH = 40;
function ywSpeed(g) { var D = g.data; return Math.min(230, 105 + D.caught * 1.4 + (g.level - 1) * 8); }
function ywFall(g) { var D = g.data; return Math.min(250, 95 + D.caught * 1.6 + (g.level - 1) * 10); }
// where the whirligig will be in t seconds if nobody taps (it turns round at the ridge ends)
function ywWhere(g, t) { var D = g.data, span = YW_R - YW_L, u = (D.x - YW_L) + D.dir * ywSpeed(g) * t; u = ((u % (2 * span)) + 2 * span) % (2 * span); return YW_L + (u > span ? 2 * span - u : u); }
function ywSpawn(g) { var D = g.data, n = D.spawned++, x, soot;
  if (n < 3) { soot = false; x = D.dir > 0 ? 80 + n * 20 : 280 - n * 20; }               // teach: sparkles behind you
  else { soot = xmRand() < Math.min(0.42, 0.18 + (g.level - 1) * 0.05);
    x = soot && xmRand() < 0.5 ? xmClamp(ywWhere(g, (YW_HUB + 20) / ywFall(g)) + (xmRand() - 0.5) * 50, YW_L, YW_R) : YW_L + xmRand() * (YW_R - YW_L); }
  var big = !soot && (D.sparks + 1) % 12 === 0; if (!soot) D.sparks++;
  D.items.push({ x: x, y: -20, soot: soot, big: big, ph: xmRand() * 4, sway: soot ? 0 : (xmRand() - 0.5) * 20 }); }
EagleGame.run({ id: 'yulewhirl', title: XM_NAMES['yulewhirl'],
  howto: 'The whirligig rolls the way it spins. Tap to reverse it: sweep up the falling sparkles and keep clear of the soot puffs. Markers on the ridge show where things will land. Keys: Space / Enter reverses.',
  art: ['whirligig_spin_sheet', 'whirligig_reverse', 'sparkle_sheet', 'soot_sheet', 'collect_burst_sheet', 'soot_hit_puff_sheet', 'holly'],
  fill: { top: '#141c45', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#dfe6ee' } }, levelEvery: 20, likeScore: 30,
  achievements: [{ id: 's15', score: 15, name: 'Sparkle Sweeper' }, { id: 's75', score: 75, name: 'Whirling Wonder' }, { id: 's180', score: 180, name: 'Yule Tornado' }],
  init: function (g) { xmSeed(); g.data = { x: 180, dir: 1, spin: 0, flip: 0, items: [], spawned: 0, sparks: 0, caught: 0, combo: 0, lives: 3, maxLives: 3, next: 0.6, fx: [] }; },
  down: function (g) { var D = g.data; D.dir = -D.dir; D.flip = 0.15; g.sfx('reverse', null, 'jump'); D.taps = (D.taps || 0) + 1; },
  update: function (g, dt) { var D = g.data, i; xmTick(g, dt); if (D.flip) D.flip = Math.max(0, D.flip - dt);
    var v = ywSpeed(g); D.x += D.dir * v * dt; if (D.x < YW_L) { D.x = YW_L; D.dir = 1; } if (D.x > YW_R) { D.x = YW_R; D.dir = -1; }
    D.spin += D.dir * dt * (6 + v / 25);
    D.next -= dt; if (D.next <= 0) { ywSpawn(g); D.next = D.spawned < 3 ? 0.8 : Math.max(0.36, 0.8 - D.caught * 0.008 - (g.level - 1) * 0.04) * (0.75 + xmRand() * 0.5); }
    var fs = ywFall(g);
    for (i = 0; i < D.items.length; i++) { var it = D.items[i]; it.y += fs * (D.spawned <= 3 && !it.soot ? 0.7 : 1) * dt; it.ph += dt;
      var dx = it.x + Math.sin(it.ph * 2) * it.sway * 0.05 - D.x, dy = it.y - YW_HUB;
      if (!it.done && Math.abs(dy) < YW_CATCH * 0.8 && Math.abs(dx) < YW_CATCH) { it.done = true;
        if (it.soot) { D.combo = 0; xmAnim(g, 'soot_hit_puff_sheet', it.x, it.y, 80, 6, 0.5); if (xmMiss(g, 'a soot puff smudged the whirligig')) return; }
        else { D.caught++; D.combo++; var pts = (1 + Math.min(Math.floor(D.combo / 4), 4)) * (it.big ? 3 : 1); g.addScore(pts); xmFloat(g, it.x, it.y - 24, '+' + pts, it.big ? '#ffe27a' : '#fff');
          xmAnim(g, 'collect_burst_sheet', it.x, it.y, it.big ? 96 : 72, 6, 0.45); g.sfx(it.big ? 'perfect' : 'good', D.combo - 1, 'coin'); if (D.combo % 10 === 0) D.toast = { text: D.combo + ' sparkles in a row!', t: 1.3 }; } }
      if (!it.done && it.y > YW_RAIL + 6) { it.done = true; if (!it.soot) { if (D.combo >= 3) xmFloat(g, it.x, YW_RAIL - 10, 'streak lost', '#c9d6ff'); D.combo = 0; } } }
    D.items = D.items.filter(function (it) { return !it.done; }); },
  draw: function (g, c) { var D = g.data, i, CUE = xmCue(g, D.caught); if (!g.bg()) xmSky(c, '#141c45', '#3b4f8a'); xmSnow(g, c, 24);
    // the ridge
    c.fillStyle = 'rgba(20,26,56,.55)'; c.fillRect(0, YW_RAIL + 4, 360, 200); c.fillStyle = '#eef3fa'; xmRound(c, 16, YW_RAIL - 4, 328, 14, 7); c.fill();
    c.fillStyle = 'rgba(120,140,190,.5)'; c.fillRect(24, YW_RAIL + 6, 312, 2);
    // landing markers ('now' cue)
    D.items.forEach(function (it) { var a = Math.max(0.15, Math.min(0.9, it.y / YW_HUB)) * CUE; if (a <= 0) return; c.globalAlpha = a; c.fillStyle = it.soot ? '#4a4a5a' : '#ffe27a';
      c.beginPath(); c.ellipse(it.x, YW_RAIL + 2, it.soot ? 12 : 9, 3, 0, 0, 7); c.fill(); c.globalAlpha = 1; });
    // falling things
    D.items.forEach(function (it) { var x = it.x + Math.sin(it.ph * 2) * it.sway * 0.05, f = Math.floor(it.ph * 8) % 4;
      if (it.soot) g.frame('soot_sheet', f, 0, 4, 1, x, it.y, 40, 40, function (c2, x2, y2) { xmBlob(c2, x2, y2, 15, '#2b2b36'); });
      else g.frame('sparkle_sheet', f, 0, 4, 1, x, it.y, it.big ? 50 : 34, it.big ? 50 : 34, function (c2, x2, y2) { xmBlob(c2, x2, y2, 8, '#ffe27a'); }); });
    // whirligig: spin frames forward when heading right, backwards when heading left (vanes repeat every 60deg over 8 frames)
    var fr = ((Math.floor(D.spin * 8 / 1.0472) % 8) + 8) % 8;
    if (D.flip && g.art.whirligig_reverse) g.sprite('whirligig_reverse', D.x, YW_RAIL - YW_SIZE / 2, YW_SIZE, YW_SIZE, null, 0, D.dir < 0);
    else g.frame('whirligig_spin_sheet', fr, 0, 8, 1, D.x, YW_RAIL - YW_SIZE / 2, YW_SIZE, YW_SIZE, function (c2, x, y) { xmBlob(c2, x, y - 10, 34, '#9cc3ff'); });
    // direction chevrons
    c.fillStyle = 'rgba(255,241,196,.85)'; var cx = D.x + D.dir * 70; c.beginPath(); c.moveTo(cx + D.dir * 8, YW_RAIL - 54); c.lineTo(cx - D.dir * 4, YW_RAIL - 63); c.lineTo(cx - D.dir * 4, YW_RAIL - 45); c.fill();
    // NOW: a sparkle is about to land on the far side, so reversing now would sweep it in
    if (g.state === 'play') { var tgt = null; D.items.forEach(function (it) { if (!it.soot && (it.x - D.x) * D.dir < -YW_CATCH && it.y > 150 && (!tgt || it.y > tgt.y)) tgt = it; });
      var need = tgt && Math.abs(tgt.x - D.x) / ywSpeed(g) >= (YW_HUB - tgt.y) / ywFall(g) - 0.15 && Math.abs(tgt.x - D.x) / ywSpeed(g) <= (YW_HUB - tgt.y) / ywFall(g) + 0.25;
      if (need) xmNow(g, c, tgt.x, YW_RAIL + 2, 16, 'NOW'); }
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && !D.taps) xmPill(g, c, 'Tap to reverse and sweep up the sparkles', 600);
    else if (g.state === 'play' && D.combo >= 4) xmPill(g, c, 'Sparkle streak ×' + D.combo, 600, '#ffe27a'); }
});
