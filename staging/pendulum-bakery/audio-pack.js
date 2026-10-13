/* Pendulum Bakery - original SFX + loop. Requires audio-kit.js. Slug chosen (no game folder found). */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  K.games = K.games || {};
  K.games['pendulum-bakery'] = {
    sfx: {
      swingTick: function () { T({ type: 'triangle', f0: 1500, dur: 0.02, gain: 0.08 }); },
      drop: function () { T({ type: 'sine', f0: 700, f1: 250, dur: 0.18, gain: 0.2 }); },
      // land('edge'|'centre'|'half')
      land: function (spot) { var f = { edge: 180, centre: 260, half: 220 }[spot] || 220, t = n(); T({ type: 'noise', dur: 0.05, gain: 0.25, t: t }); T({ type: 'triangle', f0: f, f1: f * 0.7, dur: 0.12, gain: 0.3, t: t }); },
      orderMatch: function () { var t = n(); [784, 988, 1175, 1568].forEach(function (f, i) { T({ type: 'square', f0: f, dur: 0.08, gain: 0.13, t: t + i * 0.05 }); }); },
      orderMiss: function () { var t = n(); T({ type: 'square', f0: 294, f1: 262, dur: 0.3, gain: 0.15, t: t }); },
      newOrder: function () { var t = n(); T({ type: 'triangle', f0: 1319, dur: 0.6, gain: 0.18, t: t }); T({ type: 'triangle', f0: 1760, dur: 0.5, gain: 0.08, t: t }); },
      burnt: function () { var t = n(); T({ type: 'noise', dur: 0.7, gain: 0.25, t: t }); [330, 311, 277, 220].forEach(function (f, i) { T({ type: 'square', f0: f, dur: 0.22, gain: 0.15, t: t + i * 0.2 }); }); }
    },
    loop: { bpm: 126, stepsPerBeat: 4,
      square: 'F5 . A5 . C6 . A5 . A#5 . G5 . E5 . C5 . D5 . F5 . A5 . G5 F5 E5 . G5 . F5 . . .'.split(' '),
      triangle: 'F2 . C3 . A2 . C3 . C3 . G2 . E2 . G2 . D3 . A2 . F2 . A2 . C3 . G2 . F2 . . .'.split(' '),
      noise: 'x . o . . . o . x . o . . . o . x . o . . . o . x . o . x . o o'.split(' ') }
  };
})(window.AudioKit);
