/* Wickmoth Relay - original SFX + loop. Requires audio-kit.js. Slug chosen (no game folder found). */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  var lastCreep = -1e9, CREEP_MS = 600, creepPlays = 0;
  K.games = K.games || {};
  K.games['wickmoth-relay'] = {
    creepIntervalMs: CREEP_MS, creepPlays: function () { return creepPlays; },
    sfx: {
      flutter: function () { var t = n(); for (var i = 0; i < 4; i++) T({ type: 'noise', dur: 0.02, gain: 0.08, t: t + i * 0.04 }); },
      lightWick: function (chain) { var f = 440 * Math.pow(1.0595, Math.min(12, chain || 0)), t = n(); T({ type: 'noise', dur: 0.08, gain: 0.2, t: t }); T({ type: 'triangle', f0: f, f1: f * 1.5, dur: 0.25, gain: 0.25, t: t + 0.02 }); },
      missWick: function () { T({ type: 'square', f0: 200, f1: 150, dur: 0.12, gain: 0.15 }); },
      relight: function () { var t = n(); [659, 880].forEach(function (f, i) { T({ type: 'triangle', f0: f, dur: 0.12, gain: 0.2, t: t + i * 0.06 }); }); },
      burnOut: function () { T({ type: 'noise', dur: 0.35, gain: 0.15 }); T({ type: 'sine', f0: 300, f1: 120, dur: 0.35, gain: 0.12 }); },
      // darknessCreep(): very quiet low rumble, rate-limited to one audible play per CREEP_MS (extra calls are dropped)
      darknessCreep: function () { var c = K.getContext(); if (!c) return; var t = c.currentTime;
        if (t - lastCreep < CREEP_MS / 1000) return; lastCreep = t; creepPlays++;
        T({ type: 'triangle', f0: 62, f1: 55, dur: 0.35, gain: 0.035, t: t }); T({ type: 'noise', dur: 0.2, gain: 0.012, t: t }); },
      snuffed: function () { var t = n(); T({ type: 'noise', dur: 0.6, gain: 0.3, t: t }); T({ type: 'triangle', f0: 392, f1: 98, dur: 1.1, gain: 0.3, t: t + 0.05 }); }
    },
    loop: { bpm: 108, stepsPerBeat: 4,
      square: 'B4 . D5 F#5 . E5 D5 . C#5 . . A4 . B4 . . G4 . B4 D5 . C#5 B4 . A4 . F#4 . . . . .'.split(' '),
      triangle: 'B2 . . F#2 . . B2 . A2 . . E2 . . A2 . G2 . . D3 . . G2 . F#2 . . C#3 . . F#2 .'.split(' '),
      noise: '. . o . . o . . . . o . . o . . . . o . . o . . . . o . o . o .'.split(' ') }
  };
})(window.AudioKit);
