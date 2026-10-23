// Wreathweave (slate design + Luna's art): a holly sprig circles the wreath. One gap glows; tap as the sprig lines up with it to tuck
// the sprig in. Fill all 8 gaps to finish the wreath (bonus), then a fresh wreath starts, faster and circling the other way.
// If the sprig goes round twice without a tuck it wilts (costs a holly), so waiting forever doesn't work.
// Craft: the first tuck is slow with a wide window; the first miss is free; the glowing gap brightens and NOW shows inside the window.
var WW_X = 180, WW_Y = 318, WW_S = 300, WW_R = 211 * 300 / 720, WW_ORBIT = WW_R + 46; // wreath_ring: 720px, ring radius 211px, gap k at k*45deg clockwise from 12
function wwAng(k) { return k * Math.PI / 4; }                       // clockwise from 12 o'clock
function wwPos(a, r) { return [WW_X + Math.sin(a) * r, WW_Y - Math.cos(a) * r]; }
function wwDiff(a, b) { var d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }
function wwTol(g) { var D = g.data; return (D.tucks === 0 ? 20 : D.tucks < 6 ? 13 : Math.max(7, 11 - g.level)) * Math.PI / 180; }
function wwSpeed(g) { var D = g.data; return D.tucks === 0 ? 1.2 : Math.min(4.6, 1.75 + D.tucks * 0.05 + (D.wreaths) * 0.18); } // rad/s
function wwPick(g) { var D = g.data, empty = [], i; for (i = 0; i < 8; i++) if (!D.filled[i]) empty.push(i);
  // prefer a gap at least 100deg ahead of the sprig so there is time to see it coming
  var ahead = empty.filter(function (k) { var d = wwDiff(wwAng(k), D.a) * D.dir; if (d < 0) d += 2 * Math.PI; return d > 1.75; });
  D.target = xmPick(ahead.length ? ahead : empty); D.laps = 0; D.prevD = null; }
function wwNewWreath(g) { var D = g.data; D.filled = [0, 0, 0, 0, 0, 0, 0, 0]; if (D.wreaths > 0) D.dir = -D.dir; wwPick(g); }
EagleGame.run({ id: 'wreathweave', title: XM_NAMES['wreathweave'],
  howto: 'A holly sprig circles the wreath. Tap as it lines up with the glowing gap to weave it in. Fill all 8 gaps to finish the wreath. If the sprig goes round twice without a tuck, it wilts. Keys: Space / Enter weaves.',
  art: ['wreath_ring', 'wreath_complete', 'sprig_orbit', 'gap_glow', 'tuck_burst_sheet', 'helper_idle_sheet', 'holly'],
  fill: { top: '#2a1a14', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#3a2618' } }, levelEvery: 20, likeScore: 30,
  achievements: [{ id: 's16', score: 16, name: 'First Wreath' }, { id: 's80', score: 80, name: 'Door Dresser' }, { id: 's200', score: 200, name: 'Master Weaver' }],
  init: function (g) { xmSeed(); g.data = { a: -1.2, dir: 1, tucks: 0, wreaths: 0, combo: 0, lives: 3, maxLives: 3, done: 0, fx: [], filledFx: [] }; wwNewWreath(g); },
  down: function (g) { var D = g.data; if (D.done > 0) return; var d = wwDiff(D.a, wwAng(D.target)), p = wwPos(wwAng(D.target), WW_R);
    if (Math.abs(d) <= wwTol(g)) { D.filled[D.target] = 1; D.tucks++; D.combo++; var perfect = Math.abs(d) <= wwTol(g) * 0.35, pts = 1 + Math.min(D.combo - 1, 4) + (perfect ? 2 : 0);
      g.addScore(pts); xmFloat(g, p[0], p[1] - 30, (perfect ? 'Perfect +' : '+') + pts, perfect ? '#ffe27a' : '#fff'); xmAnim(g, 'tuck_burst_sheet', p[0], p[1], 80, 6, 0.5);
      g.sfx(perfect ? 'perfect' : 'good', D.combo - 1, 'coin'); g.vibrate(12);
      if (D.filled.every(function (f) { return f; })) { D.wreaths++; var b = 8 + D.wreaths * 2; g.addScore(b); D.done = 1.3; D.toast = { text: 'Wreath woven! +' + b, t: 1.4 }; xmBurst(g, WW_X, WW_Y, 24, '#ffe27a'); g.sfx('powerUp', null, 'powerUp'); }
      else wwPick(g); }
    else { D.combo = 0; D.shake = 0.3; xmFloat(g, WW_X, WW_Y + WW_R + 64, d * D.dir < 0 ? 'Too early' : 'Too late', '#ffb3b3'); if (xmMiss(g, 'the sprig missed its gap')) return; D.laps = 0; } },
  update: function (g, dt) { var D = g.data; xmTick(g, dt); if (D.shake) D.shake = Math.max(0, D.shake - dt);
    if (D.done > 0) { D.done -= dt; if (D.done <= 0) wwNewWreath(g); D.a += D.dir * wwSpeed(g) * 0.4 * dt; return; }
    D.a += D.dir * wwSpeed(g) * dt;
    // count passes over the target gap: two full passes without a tuck wilts the sprig
    var d = wwDiff(D.a, wwAng(D.target)) * D.dir;
    if (D.prevD != null && D.prevD < wwTol(g) && d >= wwTol(g)) { D.laps++; if (D.laps >= 2) { D.combo = 0; D.laps = 0; xmFloat(g, WW_X, WW_Y + WW_R + 64, 'The sprig wilted', '#ffb3b3'); if (xmMiss(g, 'the sprig wilted')) return; } }
    D.prevD = d; },
  draw: function (g, c) { var D = g.data, i; if (!g.bg()) xmSky(c, '#2a1a14', '#5a3a28'); c.fillStyle = 'rgba(10,8,20,.30)'; c.fillRect(0, 0, 360, 640);
    var gr = c.createRadialGradient(WW_X, WW_Y, 40, WW_X, WW_Y, 200); gr.addColorStop(0, 'rgba(8,6,16,.55)'); gr.addColorStop(1, 'rgba(8,6,16,0)'); c.fillStyle = gr; c.fillRect(0, 100, 360, 440);
    var full = D.done > 0, wob = D.shake && !g.reducedMotion ? Math.sin(g.t * 60) * 3 : 0;
    g.sprite(full && g.art.wreath_complete ? 'wreath_complete' : 'wreath_ring', WW_X + wob, WW_Y, WW_S, WW_S, function (c2) { c2.strokeStyle = '#2e6b34'; c2.lineWidth = 34; c2.beginPath(); c2.arc(WW_X, WW_Y, WW_R, 0, 7); c2.stroke(); });
    // filled gaps: a sprig tucked in each
    if (!full) for (i = 0; i < 8; i++) if (D.filled[i]) { var q = wwPos(wwAng(i), WW_R); g.sprite('sprig_orbit', q[0] + wob, q[1], 80, 80, function (c2, x, y) { xmBlob(c2, x, y, 10, '#2e8b3e'); }, wwAng(i) + Math.PI / 2); }
    // target gap glow ('now' cue): brightens as the sprig closes in, NOW inside the window
    if (!full && g.state !== 'title') { var tp = wwPos(wwAng(D.target), WW_R), dd = Math.abs(wwDiff(D.a, wwAng(D.target))), on = dd <= wwTol(g);
      c.globalAlpha = on ? 1 : 0.45 + 0.35 * Math.max(0, 1 - dd / 1.6); g.sprite('gap_glow', tp[0], tp[1], on ? 84 : 70, on ? 84 : 70, function (c2, x, y) { xmBlob(c2, x, y, 26, 'rgba(255,226,122,.6)'); }); c.globalAlpha = 1;
      var tq = wwPos(wwAng(D.target), WW_ORBIT); c.save(); c.setLineDash([3, 5]); c.strokeStyle = on ? '#ffe27a' : 'rgba(255,240,200,.45)'; c.lineWidth = on ? 3 : 1.5; c.beginPath(); c.moveTo(tp[0], tp[1]); c.lineTo(tq[0], tq[1]); c.stroke(); c.restore();
      if (on) xmNow(g, c, tq[0], tq[1], 30, 'NOW'); }
    // the circling sprig, pointing in towards the wreath
    var sp = wwPos(D.a, WW_ORBIT); c.save(); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; c.beginPath(); c.arc(WW_X, WW_Y, WW_ORBIT, 0, 7); c.stroke(); c.restore();
    if (!full) g.sprite('sprig_orbit', sp[0], sp[1], 92, 92, function (c2, x, y) { xmBlob(c2, x, y, 12, '#2e8b3e'); }, D.a + Math.PI);
    // tuck counter + helper
    c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff1c4'; c.fillText('Wreath ' + (D.wreaths + 1) + ' · ' + D.filled.filter(function (f) { return f; }).length + ' / 8', WW_X, WW_Y + WW_R + 98);
    if (g.art.helper_idle_sheet) g.frame('helper_idle_sheet', Math.floor(g.t * 4) % 4, 0, 4, 1, 300, Math.min(g.safeBottom - 50, 548), 92, 92);
    xmFx(g, c); xmLives(g, c, 'holly'); xmToast(g, c); xmFlash(g, c);
    if (g.state === 'play' && D.tucks === 0) xmPill(g, c, 'Tap when the sprig reaches the glowing gap', 600);
    else if (g.state === 'play' && D.laps === 1) xmPill(g, c, 'Last lap before the sprig wilts!', 600, '#ffb3b3');
    else if (g.state === 'play' && D.combo >= 3) xmPill(g, c, 'Weave streak ×' + D.combo, 600, '#ffe27a'); }
});
