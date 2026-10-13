// Rows are tuned so every chord of the music's C-Am-F-G progression lights at least one row.
var ROWS = [210, 285, 360, 435, 510], NOTE = ['C5', 'A4', 'G4', 'F4', 'D4'], PC = [0, 9, 7, 5, 2], NAMES = ['C', 'A', 'G', 'F', 'D'];
var PROG = [{ name: 'C', pcs: [0, 4, 7] }, { name: 'Am', pcs: [9, 0, 4] }, { name: 'F', pcs: [5, 9, 0] }, { name: 'G', pcs: [7, 11, 2] }];
var PCN = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n) { var m = /^([A-G]#?)(\d)$/.exec(n); return 440 * Math.pow(2, (PCN[m[1]] + (+m[2] + 1) * 12 - 69) / 12); }
// chord follows the bound music Player when the pack is present and music is running; else a local 5.33 s clock
function chord(g) {
  var P = g.pack, D = g.data;
  if (P && P.currentChord && g.music && g.music.playing && g.music.currentStep() >= 0) { var c = P.currentChord(); return { i: c.index, name: c.name, left: c.beatsLeft != null ? c.beatsLeft * 60 / 90 : 0, pcs: PROG[c.index].pcs }; }
  var i = Math.floor(D.clock / 5.333) % 4; return { i: i, name: PROG[i].name, left: 5.333 - D.clock % 5.333, pcs: PROG[i].pcs };
}
function lit(ch) { var r = []; PC.forEach(function (p, i) { if (ch.pcs.indexOf(p) >= 0) r.push(i); }); return r; }
EagleGame.run({ id: 'gravel-choir', title: 'Gravel Choir', howto: 'Tap as a pebble crosses a glowing row (a note of the current chord). Tapping with no pebble on a glowing row, or letting one drop, costs a life.',
  art: ['pebble', 'pebble_glow', 'row', 'singer', 'singer_sheet', 'wrong_burst'], reskinKeys: ['pebble', 'singer', 'row', 'bg'], logo: { side: 'left', top: 52 }, fill: { top: '#3c4857', bottom: '#3d4858' }, levelEvery: 10, likeScore: 20, overSfx: 'collapse',
  achievements: [{ id: 'chord', score: 8, name: 'First Chord' }, { id: 'choir', score: 40, name: 'Full Choir' }],
  audioReady: function (g) { if (g.pack && g.pack.bindPlayer && g.music) g.pack.bindPlayer(g.music); },
  init: function (g) { g.data = { lives: 3, peb: [], spawn: 0.8, clock: 0, ci: -1, rows: [0, 1], sing: [0, 0, 0, 0, 0], burst: null }; },
  down: function (g) {
    var D = g.data, best = null, bd = 1e9, row = -1;
    D.peb.forEach(function (p) { D.rows.forEach(function (i) { var d = Math.abs(p.y - ROWS[i]); if (d < 28 && d < bd) { bd = d; best = p; row = i; } }); });
    if (best) { D.peb.splice(D.peb.indexOf(best), 1); if (g.pack) g.sfx('catchGood', freq(NOTE[row])); else g.note(freq(NOTE[row]), 0.35); D.sing[row] = 0.4; g.addScore(1); }
    else { var p = D.peb[0]; D.burst = { x: p ? p.x : 180, y: p ? p.y : 360, t: 0 }; g.sfx('catchBad', null, 'hit'); egLoseLife(g, 'off-key', true); }
  },
  update: function (g, dt) {
    var D = g.data, sp = Math.min(240, 80 + g.level * 14); D.flash = Math.max(0, (D.flash || 0) - dt); D.clock += dt;
    var ch = chord(g); D.ch = ch; if (ch.i !== D.ci) { if (D.ci >= 0) g.sfx('chordChange', null, 'powerUp'); D.ci = ch.i; D.rows = lit(ch); }
    if (D.burst) { D.burst.t += dt; if (D.burst.t > 0.4) D.burst = null; }
    D.spawn -= dt; if (D.spawn <= 0) { D.peb.push({ x: 120 + Math.random() * 120, y: 130, hum: {} }); g.sfx('pebbleFall'); D.spawn = Math.max(0.75, 2.1 - g.level * 0.15); }
    for (var i = D.peb.length - 1; i >= 0; i--) { var p = D.peb[i]; p.y += sp * dt;
      D.rows.forEach(function (r) { if (Math.abs(p.y - ROWS[r]) < 28 && !p.hum[r]) { p.hum[r] = 1; g.sfx('hum', freq(NOTE[r]), null); } });
      if (p.y > 560) { D.peb.splice(i, 1); D.burst = { x: p.x, y: 550, t: 0 }; egLoseLife(g, 'dropped', true); g.sfx('catchBad', null, 'hit'); if (g.state !== 'play') return; } }
    D.sing = D.sing.map(function (s) { return Math.max(0, s - dt); });
  },
  draw: function (g, c) {
    var D = g.data, th = g.theme; g.bg(); var rows = D.rows || [];
    ROWS.forEach(function (y, i) { var on = rows.indexOf(i) >= 0;
      c.globalAlpha = on ? 1 : 0.35;
      g.sprite('row', 185, y, 290, 25, function (c, x, y, w) { c.fillStyle = on ? th.accent : th.dim; c.fillRect(x - w / 2, y - 3, w, 6); });
      var sz = 44 + D.sing[i] * 24; // singer_sheet: 5 pitch rows top-down, idle | sing
      g.frame('singer_sheet', D.sing[i] > 0 ? 1 : 0, i, 2, 5, 26, y, sz, sz, function (c, x, y, w) { c.fillStyle = th.fg; c.beginPath(); c.arc(x, y, w / 3, 0, 7); c.fill(); });
      c.fillStyle = th.fg; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.fillText(NAMES[i], 342, y + 5); c.globalAlpha = 1; });
    D.peb && D.peb.forEach(function (p) { var near = rows.some(function (r) { return Math.abs(p.y - ROWS[r]) < 28; });
      g.sprite(near ? 'pebble_glow' : 'pebble', p.x, p.y, 34, 34, function (c, x, y) { c.fillStyle = near ? th.accent : '#9aa0a8'; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); }); });
    if (D.burst) g.sprite('wrong_burst', D.burst.x, D.burst.y, 64, 64, function (c, x, y) { c.fillStyle = th.bad; c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill(); }, D.burst.t * 3);
    if (D.ch) { c.fillStyle = th.dim; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('chord ' + D.ch.name + ' · next in ' + Math.max(0, Math.ceil(D.ch.left)) + 's', 180, g.safeY(600)); }
    egLives(g, c); egFlash(g, c);
  }
});
