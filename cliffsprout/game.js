// Draft title (was Seedsling). Hold to grow the vine, release to fling the pod to the next ledge; landing quality sets your next vine.
var BASEY = 470;
EagleGame.run({ id: 'cliffsprout', packAlias: 'seedsling', title: 'Cliffsprout', howto: 'Hold to grow your vine, release to fling the seed pod. Land in the green zone to sprout there. A sloppy landing means a weaker vine next time.',
  art: ['vine', 'vine_segment', 'seedpod', 'sprout_sheet', 'cliff', 'ledge', 'fall_sheet'], reskinKeys: ['vine', 'seedpod', 'cliff', 'ledge', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#b2d2e3', bottom: '#a49382' }, levelEvery: 6, likeScore: 15, overSfx: 'fall',
  achievements: [{ id: 'sprout5', score: 5, name: 'Taking Root' }, { id: 'sprout25', score: 25, name: 'Cliff Garden' }],
  init: function (g) { g.data = { lives: 3, p: 0, pmax: 1, q: 1, fly: null, x: 70, cam: 0, gt: 0 }; newLedge(g); },
  down: function (g) { var D = g.data; if (D.fly) g.held = false; },
  up: function (g) { var D = g.data; if (D.fly) { D.p = 0; return; } // every release flings, even a tiny tap (a weak fling falls short)
    D.fly = { t: 0, p: D.p, dur: 0.9 }; g.sfx('fling', D.p); },
  update: function (g, dt) {
    var D = g.data; D.flash = Math.max(0, (D.flash || 0) - dt); if (D.fall) { D.fall.t += dt; if (D.fall.t > 0.6) D.fall = null; }
    if (g.held && !D.fly) { D.p = Math.min(D.pmax, D.p + dt * Math.min(0.9, 0.5 + g.level * 0.05)); D.gt += dt; if (D.gt > 0.12) { D.gt = 0; g.sfx('grow', D.p / D.pmax); } }
    var f = D.fly; if (f) { f.t += dt;
      if (f.t >= f.dur) { var err = Math.abs(f.p - D.need), tol = D.tol; D.fly = null; D.p = 0;
        if (err <= tol) { D.q = 1 - err / tol; g.sfx('land'); g.sfx(D.q < 0.4 ? 'weakSprout' : 'sprout', D.q); g.addScore(D.q > 0.8 ? 2 : 1);
          D.x += D.dx; D.pmax = 0.55 + 0.45 * D.q; D.anim = 0; newLedge(g); }
        else { D.fall = { x: D.x + f.p / D.need * D.dx, t: 0 }; g.sfx('fall', null, 'hit'); D.q = 0.5; D.pmax = Math.max(D.pmax, 0.8); egLoseLife(g, 'missed the ledge', true); if (g.state === 'play') newLedge(g, true); } } }
    D.cam += (D.x - 70 - D.cam) * Math.min(1, dt * 3); if (D.anim != null) D.anim += dt;
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; g.bg();
    // ledges: current at D.x, target at D.x + dx
    ledge(g, c, D.x - D.cam, false); ledge(g, c, D.x + D.dx - D.cam, true);
    var vx = D.x - D.cam, vh = 30 + D.p * 120;
    // vine: tile vine_segment (96x96 -> 32x32) upward from the root; top tile clipped. Falls back to the tall vine, then code.
    if (g.art.vine_segment) { c.save(); c.beginPath(); c.rect(vx - 16, BASEY - vh, 32, vh); c.clip(); for (var yy = BASEY - 32; yy > BASEY - vh - 32; yy -= 32) c.drawImage(g.art.vine_segment, vx - 16, yy, 32, 32); c.restore(); }
    else if (g.art.vine) { c.save(); c.beginPath(); c.rect(vx - 12, BASEY - vh, 24, vh); c.clip(); for (var vy2 = BASEY - 72; vy2 > BASEY - vh - 72; vy2 -= 72) c.drawImage(g.art.vine, vx - 12, vy2, 24, 72); c.restore(); } // 1:3 tiles, no stretch
    else { c.fillStyle = '#4caf50'; c.fillRect(vx - 3, BASEY - vh, 6, vh); }
    // fall_sheet frames ARE the pod, so the falling pod replaces the live one (exactly one pod per frame); code fallback if the sheet is missing
    if (D.fall) g.frame('fall_sheet', Math.min(3, D.fall.t * 8 | 0), 0, 4, 1, D.fall.x - D.cam, BASEY + 20 + D.fall.t * 60, 48, 48, function (c, x, y) { c.fillStyle = '#7cc46b'; c.beginPath(); c.arc(x, y, 13, 0, 7); c.fill(); });
    // sprout_sheet frame 0 IS the pod, and the live pod is still drawn below, so skip frame 0 (double seed-pod bug); frames 1-3 are the shoot
    var sf = D.anim != null && D.anim < 0.6 ? Math.min(3, D.anim * 7 | 0) : 0; if (sf > 0) g.frame('sprout_sheet', sf, 0, 4, 1, vx, BASEY - 18, 48, 48);
    var px, py; if (D.fly) { var k = D.fly.t / D.fly.dur, dist = D.fly.p / D.need * D.dx; px = vx + dist * k; py = BASEY - vh + (vh - 10) * k - Math.sin(k * Math.PI) * 140; }
    else { px = vx; py = BASEY - vh; }
    if (!D.fall) g.sprite('seedpod', px, py, 34, 34, function (c, x, y) { c.fillStyle = '#7cc46b'; c.beginPath(); c.arc(x, y, 13, 0, 7); c.fill(); });
    // power meter with target zone
    var mx = 30, my = g.safeY(560, 34), mw = 300; c.fillStyle = th.dim; c.fillRect(mx, my, mw, 10);
    c.fillStyle = 'rgba(94,224,138,.7)'; c.fillRect(mx + (D.need - D.tol) * mw, my - 3, D.tol * 2 * mw, 16);
    c.fillStyle = th.bad; c.fillRect(mx + D.pmax * mw, my - 6, 2, 22);
    c.fillStyle = th.accent; c.fillRect(mx, my + 2, D.p * mw, 6);
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('hold: grow · release: fling · vine ' + Math.round(D.pmax * 100) + '%', 180, g.safeY(610));
    egLives(g, c); egFlash(g, c);
  }
});
function ledge(g, c, x, target) { var y = BASEY; if (g.art.ledge) c.drawImage(g.art.ledge, x - 32, y, 64, 170); else if (g.art.cliff) { for (var cy = 0; cy < 170; cy += 64) c.drawImage(g.art.cliff, 0, 0, 192, Math.min(64, 170 - cy) * 3, x - 32, y + cy, 64, Math.min(64, 170 - cy)); } // square 64x64 tiles else { c.fillStyle = '#6b5a45'; c.fillRect(x - 32, y, 64, 170); }
  if (target) { c.strokeStyle = g.theme.good; c.lineWidth = 3; c.strokeRect(x - 32, y - 2, 64, 6); } }
function newLedge(g, same) { var D = g.data, n = g.score;
  if (!same) D.need = Math.min(D.pmax * 0.9, 0.3 + Math.random() * Math.min(0.6, 0.25 + n * 0.03));
  D.tol = Math.max(0.05, 0.12 - n * 0.003); D.dx = 90 + D.need * 160; }
