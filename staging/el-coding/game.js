/* Eagle Legend Coding (el-coding): subject config for the shared shell (kit/learn-shell.js). Original code, British English.
   States are never shown by colour alone (tritanopia: yellow and light blue look alike): every block carries a text label,
   program steps are numbered, the start and flag are distinct shapes, and answer squares carry letters. */
(function (W, D) {
  'use strict';
  var LK = W.LearnKit, A0 = 'assets/', img = {};
  ['floor', 'start', 'goal', 'path'].forEach(function (k) { var i = new Image(); i.src = A0 + 'tiles/grid_' + k + '.webp'; img[k] = i; });
  var robot = new Image(); robot.src = A0 + 'sprites/robot_sheet.webp';
  var ROW = [3, 1, 0, 2]; // dir up/right/down/left -> sheet row (back, right, front, left)
  function bgFor(id) { var s = id.split('.')[1]; return s === 'seq' || s === 'events' || s === 'decompose' ? 'bg_sequence' : s === 'loop' || s === 'predict' ? 'bg_loops' : s === 'debug' ? 'bg_debug' : 'bg_nested'; }
  var BL = { F: ['block_forward', 'Forward'], L: ['block_turn_left', 'Turn left'], R: ['block_turn_right', 'Turn right'], x2: ['block_repeat', 'Repeat 2'], x3: ['block_repeat', 'Repeat 3'], x4: ['block_repeat', 'Repeat 4'] };
  function blockHtml(c, A) { var b = BL[c]; return '<img src="' + A + 'blocks/' + b[0] + '.webp" alt=""><span class="lab">' + b[1] + '</span>'; }
  function artHtml(item, A) { var a = item.prompt.art; if (!a || a.type !== 'grid') return '';
    return '<canvas id="lm-grid" width="250" height="250" role="img" aria-label="' + esc(describe(a)) + '"></canvas>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function describe(a) { var t = 'A 5 by 5 grid. The robot starts at column ' + (a.start.x + 1) + ', row ' + (a.start.y + 1) + ', facing ' + ['up', 'right', 'down', 'left'][a.start.d] + '.';
    if (a.goal) t += ' The flag is at column ' + (a.goal.x + 1) + ', row ' + (a.goal.y + 1) + '.';
    (a.marks || []).forEach(function (m) { t += ' Square ' + m.l + ' is at column ' + (m.x + 1) + ', row ' + (m.y + 1) + '.'; }); return t; }
  function drawGrid(id, a, set, prog) {
    var cv = D.getElementById(id); if (!cv) return; var c = cv.getContext('2d'), s = 50, ink = '#172033'; c.clearRect(0, 0, 250, 250);
    for (var y = 0; y < 5; y++) for (var x = 0; x < 5; x++) { var t = img.floor; if (t.complete && t.naturalWidth) c.drawImage(t, x * s, y * s, s, s); else { c.fillStyle = '#e9edf3'; c.fillRect(x * s, y * s, s, s); }
      c.strokeStyle = 'rgba(23,32,51,.35)'; c.lineWidth = 1; c.strokeRect(x * s + 0.5, y * s + 0.5, s - 1, s - 1); }
    var r = null;
    if (prog) { r = LK.codingRun(a.start, prog); c.strokeStyle = set.highContrast ? '#000' : '#5b2a86'; c.lineWidth = 5; c.setLineDash([8, 6]); c.beginPath();
      r.path.forEach(function (p, i) { var px = p.x * s + s / 2, py = p.y * s + s / 2; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); c.setLineDash([]);
      c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      r.path.forEach(function (p, i) { if (!i) return; var px = p.x * s + s / 2, py = p.y * s + s / 2; c.fillStyle = '#fff'; c.beginPath(); c.arc(px, py, 10, 0, 7); c.fill(); c.strokeStyle = ink; c.lineWidth = 2; c.stroke(); c.fillStyle = ink; c.fillText(i, px, py); }); }
    if (a.goal) { var g = img.goal; if (g.complete && g.naturalWidth) c.drawImage(g, a.goal.x * s + s * .17, a.goal.y * s + 1, s * .66, s * .66); c.font = 'bold 11px system-ui'; c.textAlign = 'center'; var fx = a.goal.x * s + s / 2, fy = a.goal.y * s + s - 2; c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(fx - 17, fy - 12, 34, 13); c.fillStyle = ink; c.fillText('FLAG', fx, fy - 2); }
    (a.marks || []).forEach(function (m) { var px = m.x * s + s / 2, py = m.y * s + s / 2; c.fillStyle = '#fff'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(px, py, 15, 0, 7); c.fill(); c.stroke();
      c.fillStyle = ink; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(m.l, px, py); });
    var rx = a.start.x, ry = a.start.y, rd = a.start.d; if (r && r.ok) { rx = r.x; ry = r.y; rd = r.d; }
    if (robot.complete && robot.naturalWidth) c.drawImage(robot, 0, ROW[rd] * 256, 256, 256, rx * s + 2, ry * s + 2, s - 4, s - 4);
    else { c.fillStyle = ink; c.fillRect(rx * s + 12, ry * s + 12, 26, 26); }
    // direction arrow (shape, not colour) so the facing direction is always readable
    var cx = rx * s + s / 2, cy = ry * s + s / 2, dx = [0, 1, 0, -1][rd], dy = [-1, 0, 1, 0][rd]; c.fillStyle = ink; c.beginPath();
    c.moveTo(cx + dx * 24, cy + dy * 24); c.lineTo(cx + dx * 15 - dy * 6, cy + dy * 15 + dx * 6); c.lineTo(cx + dx * 15 + dy * 6, cy + dy * 15 - dx * 6); c.fill();
  }
  function drawArt(item, set) { var a = item.prompt.art; if (a && a.type === 'grid') drawGrid('lm-grid', a, set, null); }
  function feedbackArt(item) { return item.kind === 'program' ? '<div class="lm-art"><canvas id="lm-grid-fb" width="250" height="250" role="img" aria-label="Your program\u2019s path, with numbered steps"></canvas></div>' : ''; }
  function drawFeedback(item, set, built) { if (item.kind === 'program') drawGrid('lm-grid-fb', item.prompt.art, set, built); }
  var newt = new Image(); newt.src = A0 + 'characters/robonewt_idle_strip.webp'; var ny = null;
  function drawScene(gg, c, s) { var size = 72, lo = s.free.y1 - size * 0.55, hi = s.free.y0 + size * 0.55; if (lo < hi || !newt.complete || !newt.naturalWidth) return;
    var target = lo; ny = ny == null ? target : ny + (target - ny) * 0.08; var f = s.reduced ? 0 : Math.floor(s.t * 3) % 4;
    c.drawImage(newt, f * 512, 0, 512, 512, 300 - size / 2, ny - size / 2, size, size); }
  LearnShell.start({ subject: 'coding', slug: 'el-coding', name: 'Coding', title: 'Eagle Legend Coding', howto: 'Build programs at your own pace. Hints are always there.',
    tagline: 'Calm coding practice that adjusts to you: sequences, loops and debugging, up to around KS3. Any age welcome.', guide: 'characters/robonewt_celebrate.webp',
    bgs: ['bg_sequence', 'bg_loops', 'bg_debug', 'bg_nested'], bgFor: bgFor, artHtml: artHtml, drawArt: drawArt, blockHtml: blockHtml, blockLabel: function (c) { return BL[c] ? BL[c][1] : c; },
    feedbackArt: feedbackArt, drawFeedback: drawFeedback, drawScene: drawScene });
})(window, document);
