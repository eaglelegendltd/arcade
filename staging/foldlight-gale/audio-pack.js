/* Foldlight Gale - original SFX + loop. Requires audio-kit.js. */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  K.games = K.games || {};
  K.games['foldlight-gale'] = {
    sfx: {
      unfold: function (panel) { var f = 400 * Math.pow(1.122, panel || 0); T({ type: 'noise', dur: 0.04, gain: 0.15 }); T({ type: 'triangle', f0: f, f1: f * 1.5, dur: 0.12, gain: 0.25 }); },
      foldAll: function () { var t = n(); for (var i = 0; i < 5; i++) T({ type: 'noise', dur: 0.03, gain: 0.2, t: t + i * 0.03 }); T({ type: 'triangle', f0: 700, f1: 250, dur: 0.2, gain: 0.2, t: t }); },
      gust: function () { T({ type: 'noise', dur: 0.6, gain: 0.12 }); T({ type: 'sine', f0: 200, f1: 500, dur: 0.6, gain: 0.08 }); },
      glance: function () { T({ type: 'square', f0: 1200, f1: 1800, dur: 0.05, gain: 0.1 }); },
      spin: function () { var t = n(); for (var i = 0; i < 6; i++) T({ type: 'square', f0: 600 - i * 60, dur: 0.05, gain: 0.15, t: t + i * 0.05 }); },
      douse: function () { var t = n(); T({ type: 'noise', dur: 0.5, gain: 0.3, t: t }); T({ type: 'triangle', f0: 330, f1: 82, dur: 1.0, gain: 0.3, t: t + 0.1 }); }
    },
    loop: { bpm: 84, stepsPerBeat: 4,
      square: 'D5 . . F5 . . A5 . G5 . F5 . E5 . . . C5 . . E5 . . G5 . F5 . E5 . D5 . . .'.split(' '),
      triangle: 'D3 . A2 . D3 . A2 . A#2 . F2 . A#2 . F2 . C3 . G2 . C3 . G2 . A2 . E2 . A2 . . .'.split(' '),
      noise: '. . . . o . . . . . . . o . . . . . . . o . . . . . . . o . o .'.split(' ') }
  };
})(window.AudioKit);
