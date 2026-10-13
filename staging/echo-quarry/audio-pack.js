/* Echo Quarry - original SFX + loop. Requires audio-kit.js. Slug chosen (no game folder found). */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  K.games = K.games || {};
  // Pack-side mirror of the game's multiplier (x1..x8): forks +1, ping -2, crash -> 1.
  var mult = 1, MAX = 8, maxHits = 0;
  function forkPass() { var t = n(); T({ type: 'triangle', f0: 1047, dur: 0.07, gain: 0.07, t: t }); T({ type: 'triangle', f0: 1319, dur: 0.1, gain: 0.05, t: t + 0.04 }); }
  function multMax() { maxHits++; var t = n(); [659, 831, 988, 1319, 1661].forEach(function (f, i) { T({ type: 'square', f0: f, dur: 0.09, gain: 0.12, t: t + i * 0.055 }); });
    T({ type: 'triangle', f0: 1976, dur: 0.5, gain: 0.12, t: t + 0.28 }); T({ type: 'sine', f0: 1976 * 1.5, dur: 0.4, gain: 0.04, t: t + 0.3 }); }
  K.games['echo-quarry'] = {
    getMult: function () { return mult; }, multMaxCount: function () { return maxHits; }, resetMult: function () { mult = 1; },
    sfx: {
      forkPass: forkPass,
      multMax: multMax,
      // gem(): what the game calls on each safe fork. Soft forkPass, or multMax the moment x8 is reached.
      gem: function () { var was = mult; mult = Math.min(MAX, mult + 1); if (mult === MAX && was < MAX) multMax(); else forkPass(); },
      // gemPickup(): the old bright gem, for real pickups if added later
      gemPickup: function () { var t = n(); T({ type: 'triangle', f0: 1568, dur: 0.1, gain: 0.18, t: t }); T({ type: 'triangle', f0: 2093, dur: 0.2, gain: 0.14, t: t + 0.06 }); },
      // ping(): sonar blip with three fading echoes
      ping: function () { var t = n(); for (var i = 0; i < 4; i++) T({ type: 'sine', f0: 1250, f1: 1180, dur: 0.18, gain: 0.25 * Math.pow(0.45, i), t: t + i * 0.16 }); },
      switchTrack: function () { var t = n(); T({ type: 'noise', dur: 0.05, gain: 0.3, t: t }); T({ type: 'square', f0: 160, dur: 0.06, gain: 0.2, t: t }); T({ type: 'square', f0: 120, dur: 0.06, gain: 0.2, t: t + 0.07 }); },
      junctionNear: function () { var t = n(); [880, 880].forEach(function (f, i) { T({ type: 'square', f0: f, dur: 0.04, gain: 0.1, t: t + i * 0.1 }); }); },
      railClack: function () { T({ type: 'noise', dur: 0.025, gain: 0.1 }); },
      multiplierDown: function () { mult = Math.max(1, mult - 2); T({ type: 'triangle', f0: 600, f1: 400, dur: 0.15, gain: 0.15 }); },
      crash: function () { mult = 1; var t = n(); T({ type: 'noise', dur: 0.9, gain: 0.45, t: t }); T({ type: 'sawtooth', f0: 120, f1: 30, dur: 1.0, gain: 0.3, t: t }); for (var i = 1; i < 4; i++) T({ type: 'noise', dur: 0.1, gain: 0.2 / i, t: t + 0.3 * i }); }
    },
    loop: { bpm: 88, stepsPerBeat: 4,
      square: 'E4 . . . G4 . . . . . F#4 . . . . . E4 . . . B4 . . . . . A4 . G4 . F#4 .'.split(' '),
      triangle: 'E2 . . . . . E2 . C3 . . . . . C3 . E2 . . . . . E2 . B2 . . . A2 . . .'.split(' '),
      noise: 'o . . . . . o . . . . . o . . . o . . . . . o . . . . . o . o .'.split(' ') }
  };
})(window.AudioKit);
