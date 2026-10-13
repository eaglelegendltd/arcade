/* Tidepin - original SFX + loop. Requires audio-kit.js. */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  K.games = K.games || {};
  K.games.tidepin = {
    sfx: {
      hammer: function () { var t = n(); T({ type: 'noise', dur: 0.05, gain: 0.35, t: t }); T({ type: 'square', f0: 330, f1: 110, dur: 0.08, gain: 0.25, t: t }); },
      wave: function () { var t = n(); T({ type: 'noise', dur: 0.9, gain: 0.18, t: t }); T({ type: 'triangle', f0: 90, f1: 60, dur: 0.9, gain: 0.2, t: t }); },
      waveSurvived: function () { var t = n(); [523, 659, 784].forEach(function (f, i) { T({ type: 'triangle', f0: f, dur: 0.14, gain: 0.25, t: t + i * 0.07 }); }); },
      snap: function () { var t = n(); T({ type: 'noise', dur: 0.15, gain: 0.5, t: t }); T({ type: 'sawtooth', f0: 900, f1: 120, dur: 0.25, gain: 0.25, t: t }); },
      washAway: function () { var t = n(); T({ type: 'triangle', f0: 440, f1: 110, dur: 0.8, gain: 0.3, t: t }); T({ type: 'noise', dur: 0.8, gain: 0.15, t: t }); }
    },
    loop: { bpm: 100, stepsPerBeat: 4,
      square: 'G4 . . A4 B4 . D5 . . . B4 . A4 . . . E4 . . G4 A4 . B4 . . . A4 . G4 . . .'.split(' '),
      triangle: 'G2 . . . D3 . . . E2 . . . B2 . . . C3 . . . G2 . . . D2 . . . D3 . . .'.split(' '),
      noise: '. . o . . . o . . . o . . . o o . . o . . . o . . . o . . o o .'.split(' ') }
  };
})(window.AudioKit);
