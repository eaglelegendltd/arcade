/* Doorkeep Hollow - original SFX + loop. Requires audio-kit.js. */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  K.games = K.games || {};
  K.games['doorkeep-hollow'] = {
    sfx: {
      doorOpen: function () { T({ type: 'sawtooth', f0: 180, f1: 320, dur: 0.18, gain: 0.12 }); },
      doorShut: function () { var t = n(); T({ type: 'noise', dur: 0.06, gain: 0.4, t: t }); T({ type: 'triangle', f0: 120, f1: 60, dur: 0.15, gain: 0.35, t: t }); },
      guestIn: function () { var t = n(); T({ type: 'square', f0: 784, dur: 0.08, gain: 0.15, t: t }); T({ type: 'square', f0: 1047, dur: 0.15, gain: 0.15, t: t + 0.08 }); },
      junkBlocked: function () { var t = n(); T({ type: 'noise', dur: 0.08, gain: 0.35, t: t }); T({ type: 'square', f0: 220, f1: 330, dur: 0.1, gain: 0.15, t: t + 0.03 }); },
      guestBlocked: function () { var t = n(); T({ type: 'square', f0: 330, f1: 220, dur: 0.25, gain: 0.18, t: t }); },
      junkIn: function () { var t = n(); T({ type: 'noise', dur: 0.3, gain: 0.4, t: t }); T({ type: 'sawtooth', f0: 150, f1: 40, dur: 0.6, gain: 0.3, t: t }); }
    },
    loop: { bpm: 120, stepsPerBeat: 4,
      square: 'C5 . . C5 D#5 . C5 . G4 . . . A#4 . C5 . F5 . . D#5 C5 . A#4 . C5 . . . . . G4 .'.split(' '),
      triangle: 'C3 . C3 . . . G2 . C3 . C3 . A#2 . G2 . F2 . F2 . . . C3 . G2 . G2 . . . G2 .'.split(' '),
      noise: 'x . . o . . x . . . o . x . . . x . . o . . x . . . o . x . o o'.split(' ') }
  };
})(window.AudioKit);
