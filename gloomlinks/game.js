// Gloomlinks: top-down one-shot mini golf in a moonlit graveyard. Drag back from anywhere and let go to putt.
// Endless procedural holes dotted with tombstones; one shared stroke budget, topped up each time you sink a ball.
var GL_L = 24, GL_R = 336, GL_T = 186, GL_DEC = 230, GL_MAXV = 720, GL_BR = 11, GL_HR = 16, GL_TR = 21;
function glBot(g) { return Math.min(560, g.safeBottom - 24); }
function glHole(g) { var D = g.data, B = glBot(g), n = Math.min(7, 2 + Math.floor(D.holeNo / 2)), tries = 0;
  D.ball = { x: 100 + hwRand() * 160, y: B - 40, vx: 0, vy: 0, f: 0 }; D.hole = { x: 60 + hwRand() * 240, y: GL_T + 30 + hwRand() * 70 }; D.stones = [];
  while (D.stones.length < n && tries++ < 400) { var s = { x: GL_L + 30 + hwRand() * (GL_R - GL_L - 60), y: GL_T + 40 + hwRand() * (B - GL_T - 110), k: Math.floor(hwRand() * 3) };
    if (Math.hypot(s.x - D.ball.x, s.y - D.ball.y) < 60 || Math.hypot(s.x - D.hole.x, s.y - D.hole.y) < 52 || D.stones.some(function (o) { return Math.hypot(o.x - s.x, o.y - s.y) < 56; })) continue; D.stones.push(s); }
  D.par = 2 + (n >= 5 ? 1 : 0); D.taken = 0; D.sunk = 0; D.aim = -Math.PI / 2; }
function glShoot(g, dx, dy) { var D = g.data, b = D.ball; if (D.sunk || Math.hypot(b.vx, b.vy) > 0 || D.strokes <= 0) return; var len = Math.hypot(dx, dy); if (len < 12) return;
  var v = Math.min(GL_MAXV, len * 4.2); b.vx = dx / len * v; b.vy = dy / len * v; D.strokes--; D.taken++; g.sfx('link', v / GL_MAXV, 'hit'); D.swing = 0.25; }
EagleGame.run({ id: 'gloomlinks', title: HW_NAMES['gloomlinks'], howto: 'Drag back from anywhere on the screen and let go to putt the ball; the further you pull, the harder the shot. Bounce off tombstones and walls to reach the flag. You share one stroke budget across endless holes: sinking a ball tops it up, more for beating par. Run out of strokes and the round ends. Keys: Left / Right arrows aim, hold Space / Enter to charge and release to putt.',
  art: ['golf_ball_roll_sheet', 'golf_club', 'hole_flag_sheet', 'putting_green_tile_256', 'tombstone_sheet'], levelEvery: 60, likeScore: 60, fill: { top: '#1b1b3c', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#2c4639' } },
  achievements: [{ id: 'g50', score: 50, name: 'Tombstone Putter' }, { id: 'g200', score: 200, name: 'Gloom Champion' }],
  init: function (g) { hwSeed(); g.data = { holeNo: 0, strokes: 6, drag: null, msg: null, charge: 0, kb: false, swing: 0 }; glHole(g); },
  down: function (g) { var D = g.data; if (g.tapX === undefined) { D.kb = true; D.charge = 0.001; return; } D.kb = false; D.drag = { x0: g.tapX, y0: g.tapY, x: g.tapX, y: g.tapY }; },
  up: function (g) { var D = g.data; if (D.charge > 0) { var p = D.charge; D.charge = 0; glShoot(g, Math.cos(D.aim) * p * 170, Math.sin(D.aim) * p * 170); return; }
    if (D.drag) { glShoot(g, D.drag.x0 - D.drag.x, D.drag.y0 - D.drag.y); D.drag = null; } },
  update: function (g, dt) { var D = g.data, b = D.ball, B = glBot(g);
    if (D.charge > 0) { D.chT = (D.chT || 0) + dt; D.charge = 0.05 + 0.95 * (0.5 - 0.5 * Math.cos(D.chT * 2.6)); } else D.chT = 0;
    if (hwKeys.ArrowLeft) D.aim -= dt * 2.2; if (hwKeys.ArrowRight) D.aim += dt * 2.2; if (D.swing > 0) D.swing -= dt;
    var sp = Math.hypot(b.vx, b.vy);
    if (D.sunk) { D.sunk -= dt; if (D.sunk <= 0) { D.sunk = 0; D.holeNo++; glHole(g); } }
    else if (sp > 0) { var steps = Math.ceil(sp * dt / 4); for (var i = 0; i < steps; i++) { var h = dt / steps; b.x += b.vx * h; b.y += b.vy * h; b.f += sp * h / 20;
        if (b.x < GL_L + GL_BR) { b.x = GL_L + GL_BR; b.vx = Math.abs(b.vx) * 0.8; } if (b.x > GL_R - GL_BR) { b.x = GL_R - GL_BR; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y < GL_T + GL_BR) { b.y = GL_T + GL_BR; b.vy = Math.abs(b.vy) * 0.8; } if (b.y > B - GL_BR) { b.y = B - GL_BR; b.vy = -Math.abs(b.vy) * 0.8; }
        D.stones.forEach(function (s) { var dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy); if (d < GL_TR + GL_BR && d > 0) { var nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 1.8 * dot * nx; b.vy -= 1.8 * dot * ny; g.sfx('chainBreak', null, 'hit'); s.hit = 0.2; } b.x = s.x + nx * (GL_TR + GL_BR); b.y = s.y + ny * (GL_TR + GL_BR); } });
        var hd = Math.hypot(b.x - D.hole.x, b.y - D.hole.y), cs = Math.hypot(b.vx, b.vy);
        if (hd < GL_HR - 2 && cs < 420) { D.sunk = 1.1; b.vx = b.vy = 0; b.x = D.hole.x; b.y = D.hole.y; var under = D.par - D.taken, ace = D.taken === 1;
          var pts = 10 + Math.max(0, under) * 5 + (ace ? 10 : 0); g.addScore(pts); D.strokes += 3 + Math.max(0, under) + (ace ? 1 : 0); g.sfx('linkClear', null, 'win');
          D.msg = { text: ace ? 'Hole in one! +' + pts : under > 0 ? 'Under par! +' + pts : under === 0 ? 'Par +' + pts : 'Sunk +' + pts, t: 1.2 }; break; }
        if (hd < GL_HR + 6 && cs >= 420) { b.vx += (b.x - D.hole.x) * 2; b.vy += (b.y - D.hole.y) * 2; } }
      sp = Math.hypot(b.vx, b.vy); var ns = Math.max(0, sp - GL_DEC * dt); if (ns < 6) ns = 0; if (sp > 0) { b.vx *= ns / sp; b.vy *= ns / sp; }
      if (ns === 0 && !D.sunk && D.strokes <= 0) { g.sfx('gloomCreep', null, 'hit'); g.gameOver('out of strokes'); return; } }
    D.stones.forEach(function (s) { if (s.hit) s.hit = Math.max(0, s.hit - dt); }); if (D.msg) { D.msg.t -= dt; if (D.msg.t <= 0) D.msg = null; } },
  draw: function (g, c) { var D = g.data, th = g.theme, b = D.ball, B = glBot(g); if (!g.bg()) hwSky(c, '#120e26', '#1f2a1c');
    c.save(); c.beginPath(); c.rect(GL_L, GL_T, GL_R - GL_L, B - GL_T); c.clip(); var tile = g.art.putting_green_tile_256;
    if (tile) for (var x = GL_L; x < GL_R; x += 96) for (var y = GL_T; y < B; y += 96) c.drawImage(tile, x, y, 96, 96); else { c.fillStyle = '#2f6a3a'; c.fillRect(GL_L, GL_T, GL_R - GL_L, B - GL_T); }
    if (th === g.theme && g.themeName !== 'light') { c.fillStyle = 'rgba(10,8,30,.18)'; c.fillRect(GL_L, GL_T, GL_R - GL_L, B - GL_T); } c.restore();
    c.strokeStyle = '#4a3a2a'; c.lineWidth = 6; c.strokeRect(GL_L - 3, GL_T - 3, GL_R - GL_L + 6, B - GL_T + 6);
    c.fillStyle = '#0b0a12'; c.beginPath(); c.arc(D.hole.x, D.hole.y, GL_HR, 0, 7); c.fill();
    if (!hwFrame(g, 'hole_flag_sheet', (g.t * 5) % 4, 4, 1, D.hole.x + 4, D.hole.y - 24, 64, 64)) { c.strokeStyle = '#ddd'; c.lineWidth = 2; c.beginPath(); c.moveTo(D.hole.x, D.hole.y); c.lineTo(D.hole.x, D.hole.y - 44); c.stroke(); c.fillStyle = '#ff8a1f'; c.fillRect(D.hole.x, D.hole.y - 44, 20, 12); }
    D.stones.forEach(function (s) { var j = s.hit ? Math.sin(g.t * 70) * 2 : 0; if (!hwFrame(g, 'tombstone_sheet', s.k, 3, 1, s.x + j, s.y - 6, 54, 54)) { c.fillStyle = '#8a8aa0'; c.beginPath(); c.arc(s.x, s.y, GL_TR, 0, 7); c.fill(); } });
    var sp = Math.hypot(b.vx, b.vy), ready = !sp && !D.sunk;
    if (ready && (D.drag || D.charge > 0 || D.kb)) { var dx, dy; if (D.drag) { dx = D.drag.x0 - D.drag.x; dy = D.drag.y0 - D.drag.y; } else { var p = D.charge || 0.25; dx = Math.cos(D.aim) * p * 170; dy = Math.sin(D.aim) * p * 170; }
      var len = Math.hypot(dx, dy); if (len > 4) { var pw = Math.min(1, len * 4.2 / GL_MAXV); c.strokeStyle = pw > 0.85 ? th.bad : '#fff3b0'; c.lineWidth = 3; c.setLineDash([5, 6]); c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + dx / len * (30 + pw * 110), b.y + dy / len * (30 + pw * 110)); c.stroke(); c.setLineDash([]);
        if (g.art.golf_club) g.sprite('golf_club', b.x - dx / len * 22, b.y - dy / len * 22, 46, 46, null, Math.atan2(dy, dx) + Math.PI / 2); } }
    if (D.sunk) { c.globalAlpha = Math.max(0, D.sunk - 0.6) * 2; } if (!hwFrame(g, 'golf_ball_roll_sheet', b.f % 4, 4, 1, b.x, b.y, 36, 36)) { c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, GL_BR, 0, 7); c.fill(); } c.globalAlpha = 1;
    c.textAlign = 'center'; c.font = 'bold 15px system-ui'; c.fillStyle = D.strokes <= 2 ? th.bad : '#fff3b0'; c.fillText('Hole ' + (D.holeNo + 1) + ' · par ' + D.par + ' · strokes left ' + D.strokes, 180, 170);
    if (D.msg) { c.globalAlpha = Math.min(1, D.msg.t * 2); c.fillStyle = th.accent; c.font = 'bold 22px system-ui'; c.fillText(D.msg.text, 180, 300); c.globalAlpha = 1; }
    c.fillStyle = th.dim; c.font = '12px system-ui'; c.fillText('drag back and let go to putt', 180, g.safeY(B + 18)); }
});
document.addEventListener('pointermove', function (e) { var g = window.__eagle; if (!g || !hwLive() || !g.data.drag) return; var v = g.view.css; if (!v.w) return;
  g.data.drag.x = (e.clientX - v.x) / v.w * 360; g.data.drag.y = (e.clientY - v.y) / v.h * 640; });
