/* Eagle Legend Maths (el-maths): subject config for the shared shell (kit/learn-shell.js). Original code, British English. */
(function (W, D) {
  'use strict';
  function strandOf(id) { var p = id.split('.'), s = p[1], t = p[2];
    if (s === 'fraction' || s === 'ratio' || id === 'maths.stats.probability') return 'bg_fraction';
    if (s === 'mult' || /^(primes|powers|standardform|orderops|divide)$/.test(t)) return 'bg_times';
    if (s === 'number') return 'bg_number'; return 'bg_calc'; }
  function artHtml(item, A) { var a = item.prompt.art; if (!a) return '';
    if (a.type === 'counters') { var s = '<div class="lm-counters" aria-hidden="true">'; for (var i = 0; i < a.n; i++) s += '<img src="' + A + 'number/counter_a.webp" alt="">'; return s + '</div>'; }
    if (a.type === 'frac') { var d = [2, 3, 4, 5, 8].indexOf(a.den) >= 0 ? a.den : 4;
      return '<div class="lm-stack" role="img" aria-label="A circle cut into ' + a.den + ' equal parts with one part shaded"><img src="' + A + 'fractions/frac_circle_' + d + '.webp" alt=""><img src="' + A + 'fractions/frac_circle_' + d + '_part.webp" alt=""></div>'; }
    if (a.type === 'clock') return '<canvas id="lm-clock" width="150" height="150" role="img" aria-label="An analogue clock"></canvas>';
    if (a.type === 'bars') return '<canvas id="lm-bars" width="280" height="130" role="img" aria-label="A bar chart of books read each day: ' + a.labels.map(function (l, i) { return l + ' ' + a.v[i]; }).join(', ') + '"></canvas>';
    return ''; }
  function drawArt(item, set) { var a = item.prompt.art, c = a && D.getElementById(a.type === 'clock' ? 'lm-clock' : 'lm-bars'); if (!c) return; var x = c.getContext('2d'), ink = set.highContrast ? '#000' : '#172033';
    if (a.type === 'clock') { x.fillStyle = '#fff'; x.strokeStyle = ink; x.lineWidth = 4; x.beginPath(); x.arc(75, 75, 68, 0, 7); x.fill(); x.stroke();
      x.fillStyle = ink; x.font = 'bold 15px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (var i = 1; i <= 12; i++) { var an = i / 12 * Math.PI * 2; x.fillText(i, 75 + Math.sin(an) * 54, 75 - Math.cos(an) * 54); }
      var hA = ((a.h % 12) + a.m / 60) / 12 * Math.PI * 2, mA = a.m / 60 * Math.PI * 2; x.lineCap = 'round';
      x.lineWidth = 6; x.beginPath(); x.moveTo(75, 75); x.lineTo(75 + Math.sin(hA) * 32, 75 - Math.cos(hA) * 32); x.stroke();
      x.lineWidth = 3; x.beginPath(); x.moveTo(75, 75); x.lineTo(75 + Math.sin(mA) * 50, 75 - Math.cos(mA) * 50); x.stroke(); x.beginPath(); x.arc(75, 75, 5, 0, 7); x.fill(); }
    else { var mx = Math.max.apply(null, a.v), w = 280 / a.v.length; x.font = '13px system-ui'; x.textAlign = 'center';
      a.v.forEach(function (v, i) { var h = v / mx * 90; x.fillStyle = '#2f6bd1'; x.fillRect(i * w + 10, 100 - h, w - 20, h); x.strokeStyle = ink; x.lineWidth = 2; x.strokeRect(i * w + 10, 100 - h, w - 20, h);
        x.fillStyle = ink; x.fillText(a.labels[i], i * w + w / 2, 118); x.fillText(v, i * w + w / 2, 94 - h); }); } }
  // The kite: nose up, tail down (row 0 of Luna's sheet), flying in the open sky between the question card and the answers.
  // It climbs as the round goes on; the string runs from its bridle to a point off the bottom edge of the screen.
  var kite = new Image(); kite.src = 'assets/sprites/kite_sheet.webp'; var ky = null;
  function drawScene(gg, c, s) {
    var size = 64, lo = s.free.y1 - size * 0.75, hi = s.free.y0 + size * 0.6; if (lo < hi) return; // no room: keep the kite out of sight rather than behind UI
    var target = lo - (lo - hi) * s.k; ky = ky == null ? target : ky + (target - ky) * 0.06;
    var sway = s.reduced ? 0 : Math.sin(s.t * 0.8) * 6, bob = s.reduced ? 0 : Math.sin(s.t * 1.7) * 3, kx = 286 + sway, y = ky + bob, tilt = s.reduced ? 0 : Math.sin(s.t * 0.8 + 0.6) * 0.06;
    var bx = kx, by = y + size * 0.08; // bridle point, just below the kite's cross-spar
    c.strokeStyle = 'rgba(52,44,40,.8)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 50, (by + 700) / 2 + 30, 214, 700); c.stroke();
    if (kite.complete && kite.naturalWidth) { var f = s.reduced ? 0 : Math.floor(s.t * 5) % 4; c.save(); c.translate(kx, y); c.rotate(tilt); c.drawImage(kite, f * 256, 0, 256, 256, -size / 2, -size / 2, size, size); c.restore(); }
  }
  LearnShell.start({ subject: 'maths', slug: 'el-maths', name: 'Maths', title: 'Eagle Legend Maths', howto: 'Answer at your own pace. Hints are always there.',
    tagline: 'Calm maths practice that adjusts to you, from counting up to GCSE Foundation. Any age welcome.', guide: 'characters/owlfox_celebrate.webp',
    bgs: ['bg_number', 'bg_times', 'bg_fraction', 'bg_calc'], bgFor: strandOf, artHtml: artHtml, drawArt: drawArt, drawScene: drawScene });
})(window, document);
