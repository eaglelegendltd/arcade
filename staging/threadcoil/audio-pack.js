/* Threadcoil - original SFX + loop. Requires audio-kit.js. */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  K.games = K.games || {};
  K.games.threadcoil = {
    sfx: {
      spiralOut: function () { T({ type: 'square', f0: 300, f1: 600, dur: 0.15, gain: 0.12 }); },
      spiralIn: function () { T({ type: 'square', f0: 600, f1: 300, dur: 0.15, gain: 0.12 }); },
      lap: function (tightness) { var f = 500 + 120 * (tightness || 0); T({ type: 'triangle', f0: f, dur: 0.1, gain: 0.22 }); T({ type: 'triangle', f0: f * 1.25, dur: 0.1, gain: 0.18, t: n() + 0.08 }); },
      nearMiss: function () { T({ type: 'sawtooth', f0: 1400, f1: 900, dur: 0.1, gain: 0.1 }); },
      snap: function () { var t = n(); T({ type: 'sawtooth', f0: 1600, f1: 60, dur: 0.35, gain: 0.25, t: t }); T({ type: 'noise', dur: 0.1, gain: 0.35, t: t }); T({ type: 'triangle', f0: 196, f1: 49, dur: 0.9, gain: 0.3, t: t + 0.2 }); }
    },
    loop: { bpm: 150, stepsPerBeat: 4,
      square: 'A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 A4 C5 G4 B4 D5 G5 F5 D5 B4 D5 E4 G#4 B4 E5 D5 B4 G#4 B4'.split(' '),
      triangle: 'A2 . A3 . A2 . A3 . F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . E2 . E3 . E2 . E3 .'.split(' '),
      noise: 'x . o o x . o . x . o o x . o . x . o o x . o . x . o o x o x o'.split(' ') }
  };
})(window.AudioKit);
