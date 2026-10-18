/* Echo Quarry - original SFX + loop. Requires audio-kit.js. Slug chosen (no game folder found). */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };

  // [loop gain] per-pack music level: a pack-only reimplementation of AudioKit.Player._sched that routes this pack's loop
  // through its own GainNode (-> kit master, so mute/pause/volume still apply). Only active for songs with song.gain set.
  (function () { var P = K.Player && K.Player.prototype; if (!P || P.__loopGainPatched) return; P.__loopGainPatched = true; var orig = P._sched;
    P._sched = function () { var s = this.song; if (!s || s.gain == null) return orig.call(this);
      var c = K.getContext(); if (!c) return; if (K.isPaused && K.isPaused()) return;
      if (!s.__bus || s.__bus.context !== c) { s.__bus = c.createGain(); s.__bus.gain.value = s.gain; s.__bus.connect(K.getOutput()); }
      var d = s.__bus, spb = s.stepsPerBeat || 4, len = this._len(), stepDur = 60 / this.bpm / spb, f;
      if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
      while (this.playing && this.next < c.currentTime + 0.12) { var i = this.step, t = this.next;
        if (s.square && (f = K.noteFreq(s.square[i % s.square.length]))) K.tone({ type: 'square', f0: f, dur: stepDur * 0.9, gain: 0.12, t: t, dest: d });
        if (s.triangle && (f = K.noteFreq(s.triangle[i % s.triangle.length]))) K.tone({ type: 'triangle', f0: f, dur: stepDur * 0.95, gain: 0.3, t: t, dest: d });
        if (s.noise) { var k = s.noise[i % s.noise.length];
          if (k === 'x') K.tone({ type: 'noise', dur: 0.12, gain: 0.22 * (s.noiseGain || 1), t: t, filter: 'bandpass', filterFreq: 1800, filterQ: 0.85, dest: d });
          else if (k === 'o') K.tone({ type: 'noise', dur: 0.028, gain: 0.1 * (s.noiseGain || 1), t: t, filter: 'highpass', filterFreq: 7000, filterQ: 0.7, dest: d }); }
        this._q.push([t, i]); if (this._q.length > 64) this._q.shift();
        this.next += stepDur; this.step++; if (this.step >= len) { if (this.loop) this.step = 0; else this.stop(); } } }; })();
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
      // switchTrack(side): clunk panned to the chosen lane (L -0.7 / R +0.7), right lane a touch higher so it reads without stereo
      switchTrack: function (side) { var t = n(), c = K.getContext(), d, p = side === 'L' ? -0.7 : side === 'R' ? 0.7 : 0, k = side === 'R' ? 1.19 : 1;
        if (c && c.createStereoPanner && p) { d = c.createStereoPanner(); d.pan.value = p; d.connect(K.getOutput()); }
        T({ type: 'noise', dur: 0.05, gain: 0.3, t: t, dest: d }); T({ type: 'square', f0: 160 * k, dur: 0.06, gain: 0.2, t: t, dest: d }); T({ type: 'square', f0: 120 * k, dur: 0.06, gain: 0.2, t: t + 0.07, dest: d }); },
      junctionNear: function () { var t = n(); [880, 880].forEach(function (f, i) { T({ type: 'square', f0: f, dur: 0.04, gain: 0.1, t: t + i * 0.1 }); }); },
      railClack: function () { T({ type: 'noise', dur: 0.025, gain: 0.1 }); },
      multiplierDown: function () { mult = Math.max(1, mult - 2); T({ type: 'triangle', f0: 600, f1: 400, dur: 0.15, gain: 0.15 }); },
      crash: function () { mult = 1; var t = n(); T({ type: 'noise', dur: 0.9, gain: 0.45, t: t }); T({ type: 'sawtooth', f0: 120, f1: 30, dur: 1.0, gain: 0.3, t: t }); for (var i = 1; i < 4; i++) T({ type: 'noise', dur: 0.1, gain: 0.2 / i, t: t + 0.3 * i }); }
    },
    loop: { bpm: 88, stepsPerBeat: 4, gain: 1.78, // [loop gain] approx +5 dB (machine QA 14 Oct: bring music to ~-33 dBFS)
      square: 'E4 . . . G4 . . . . . F#4 . . . . . E4 . . . B4 . . . . . A4 . G4 . F#4 .'.split(' '),
      triangle: 'E2 . . . . . E2 . C3 . . . . . C3 . E2 . . . . . E2 . B2 . . . A2 . . .'.split(' '),
      noise: 'o . . . . . o . . . . . o . . . o . . . . . o . . . . . o . o .'.split(' ') }
  };
})(window.AudioKit);
