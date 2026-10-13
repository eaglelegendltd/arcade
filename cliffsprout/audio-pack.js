/* Cliffsprout - original SFX + loop. Requires audio-kit.js. Slug chosen (no game folder found). */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  K.games = K.games || {};
  K.games.cliffsprout = {
    sfx: {
      // grow(k 0..1): creaky rising stretch tick; call periodically while held
      grow: function (k) { k = Math.max(0, Math.min(1, k || 0)); T({ type: 'triangle', f0: 200 + 600 * k, dur: 0.06, gain: 0.12 }); },
      fling: function (power) { var p = Math.max(0.2, Math.min(1, power || 0.6)); T({ type: 'noise', dur: 0.15, gain: 0.2 }); T({ type: 'sine', f0: 300, f1: 300 + 1200 * p, dur: 0.22, gain: 0.2 }); },
      land: function () { T({ type: 'noise', dur: 0.06, gain: 0.25 }); T({ type: 'triangle', f0: 150, f1: 90, dur: 0.1, gain: 0.25 }); },
      sprout: function (quality) { var q = Math.max(0, Math.min(1, quality == null ? 1 : quality)), t = n(), notes = q > 0.66 ? [523, 659, 784, 1047] : q > 0.33 ? [523, 659, 784] : [523, 587];
        notes.forEach(function (f, i) { T({ type: 'triangle', f0: f, dur: 0.1, gain: 0.2, t: t + i * 0.06 }); }); },
      weakSprout: function () { T({ type: 'triangle', f0: 392, f1: 349, dur: 0.3, gain: 0.18 }); },
      fall: function () { var t = n(); T({ type: 'sine', f0: 900, f1: 120, dur: 0.9, gain: 0.2, t: t }); T({ type: 'noise', dur: 0.15, gain: 0.3, t: t + 0.9 }); }
    },
    loop: { bpm: 132, stepsPerBeat: 4,
      square: 'G5 E5 . C5 . D5 E5 . G5 . A5 . G5 . . . F5 D5 . A#4 . C5 D5 . F5 . G5 . F5 . E5 .'.split(' '),
      triangle: 'C3 . G2 . C3 . G2 . A2 . E2 . A2 . E2 . A#2 . F2 . A#2 . F2 . C3 . G2 . C3 . . .'.split(' '),
      noise: 'x . o . o . x o x . o . o . x . x . o . o . x o x . o . x o o o'.split(' ') }
  };
})(window.AudioKit);
