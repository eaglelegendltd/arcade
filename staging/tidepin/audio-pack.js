/* Tidepin - original SFX + loop. Requires audio-kit.js. */
(function (K) {
  var n = function () { return K.getContext().currentTime; };
  // [hit bus] all Tidepin sfx go through a trim gain + gentle compressor (-> kit master), so hammer/drum hits sit ~15-20 dB over the music, not ~31.
  var HIT_TRIM = 0.32, bus = null;
  function sfxBus() { var c = K.getContext(); if (!c) return null; if (bus && bus.context === c) return bus;
    var g = c.createGain(), cp = c.createDynamicsCompressor(); g.gain.value = HIT_TRIM;
    cp.threshold.value = -26; cp.knee.value = 8; cp.ratio.value = 4; cp.attack.value = 0.004; cp.release.value = 0.12;
    g.connect(cp); cp.connect(K.getOutput()); bus = g; return bus; }
  var T = function (o) { o.dest = o.dest || sfxBus() || undefined; return K.tone(o); };
  // Filtered-noise burst (for water); routes through the kit master, so mute/pause apply.
  function fnoise(o) {
    var c = K.getContext(); if (!c) return; var t = o.t != null ? o.t : c.currentTime, d = o.dur;
    var len = Math.ceil(c.sampleRate * (d + 0.05)), b = c.createBuffer(1, len, c.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b;
    f.type = o.ftype || 'lowpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f0, t); f.frequency.exponentialRampToValueAtTime(o.f1 || o.f0, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + (o.att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(sfxBus() || K.getOutput()); s.start(t); s.stop(t + d + 0.05);
  }
  var lastImpact = -1e9, IMPACT_MS = 150, impactPlays = 0;
  function perfectStrike() { var t = n(); // bright metallic "ting" + rising sparkle
    fnoise({ ftype: 'highpass', f0: 2000, dur: 0.03, gain: 0.18, att: 0.004, t: t }); T({ type: 'square', f0: 1568, dur: 0.18, gain: 0.12, t: t }); T({ type: 'sine', f0: 1568 * 2.76, dur: 0.3, gain: 0.05, t: t });
    [1047, 1319, 1760].forEach(function (f, i) { T({ type: 'triangle', f0: f, dur: 0.12, gain: 0.16, t: t + 0.05 + i * 0.05 }); }); }
  // waterImpact(intensity 0..1): low splash; rate-limited to one audible play per 150 ms (louder call within the window is dropped too)
  function waterImpact(k) { var c = K.getContext(); if (!c) return; k = Math.max(0, Math.min(1, k == null ? 0.6 : +k || 0)); var t = c.currentTime;
    if (t - lastImpact < IMPACT_MS / 1000) return; lastImpact = t; impactPlays++;
    fnoise({ f0: 900 + 2600 * k, f1: 250, dur: 0.25 + 0.45 * k, gain: 0.08 + 0.3 * k, att: 0.005 });
    T({ type: 'sine', f0: 140 + 60 * k, f1: 50, dur: 0.2 + 0.2 * k, gain: 0.08 + 0.2 * k, t: t });
    fnoise({ ftype: 'bandpass', q: 6, f0: 2500, f1: 4000, dur: 0.12, gain: 0.04 * k, t: t + 0.12 }); }
  // pinDamage(level 0..1): wooden crack; higher level = more damage = lower, longer, more splinters
  function pinDamage(k) { k = Math.max(0, Math.min(1, k == null ? 0.5 : +k || 0)); var t = n(), cracks = 1 + Math.round(k * 3);
    for (var i = 0; i < cracks; i++) fnoise({ ftype: 'bandpass', q: 3, f0: 2200 - 900 * k, f1: 1400 - 600 * k, dur: 0.04, gain: 0.3, t: t + i * 0.035 });
    T({ type: 'square', f0: 260 - 120 * k, f1: 180 - 90 * k, dur: 0.12 + 0.15 * k, gain: 0.14, t: t });
    if (k > 0.5) T({ type: 'sawtooth', f0: 95, f1: 70, dur: 0.3, gain: 0.08 * k, t: t + 0.05 }); }
  function pinSnap() { var t = n(); // sharp break, falling twang, then sinking gurgle
    fnoise({ ftype: 'highpass', f0: 3000, f1: 1500, dur: 0.08, gain: 0.5, t: t }); T({ type: 'noise', dur: 0.12, gain: 0.35, t: t });
    T({ type: 'sawtooth', f0: 900, f1: 120, dur: 0.3, gain: 0.22, t: t + 0.02 }); T({ type: 'triangle', f0: 330, f1: 82, dur: 0.6, gain: 0.25, t: t + 0.15 });
    for (var i = 0; i < 4; i++) T({ type: 'sine', f0: 300 - i * 40, f1: 500 - i * 40, dur: 0.07, gain: 0.07, t: t + 0.4 + i * 0.09 }); }

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
  K.games.tidepin = {
    impactIntervalMs: IMPACT_MS, impactPlays: function () { return impactPlays; },
    sfx: {
      perfectStrike: perfectStrike, waterImpact: waterImpact, pinDamage: pinDamage, pinSnap: pinSnap,
      hammer: function () { var t = n(); fnoise({ ftype: 'lowpass', f0: 3500, f1: 900, dur: 0.06, gain: 0.3, att: 0.006, t: t }); T({ type: 'square', f0: 330, f1: 110, dur: 0.08, gain: 0.2, t: t }); }, // softer: lowpassed click, 6 ms attack
      wave: function () { var t = n(); T({ type: 'noise', dur: 0.9, gain: 0.18, t: t }); T({ type: 'triangle', f0: 90, f1: 60, dur: 0.9, gain: 0.2, t: t }); },
      // Aliases for the names the current game.js calls:
      waveSurvived: perfectStrike,   // game: perfect strike
      washAway: function () { waterImpact(0.9); }, // game: underwater strike
      snap: pinSnap,                 // game: durability 0
      // Pack copies of the generic kit powerUp / gameOver so they also go through the hit bus (the kit's own versions bypass it).
      powerUp: function () { var t = n(); [262, 330, 392, 523, 659, 784, 1047].forEach(function (f, i) { T({ type: 'square', f0: f, f1: f * 1.02, dur: 0.09, gain: 0.18, t: t + i * 0.06 }); }); },
      gameOver: function () { var t = n(); [392, 370, 349, 330].forEach(function (f, i) { T({ type: 'triangle', f0: f, f1: i === 3 ? f / 2 : f * 0.97, dur: i === 3 ? 0.9 : 0.3, gain: 0.35 * 1.6, t: t + i * 0.32 }); }); },
    },
    loop: { bpm: 100, stepsPerBeat: 4, gain: 1.41, // [loop gain] approx +3 dB (machine QA 14 Oct: bring music to ~-33 dBFS)
      square: 'G4 . . A4 B4 . D5 . . . B4 . A4 . . . E4 . . G4 A4 . B4 . . . A4 . G4 . . .'.split(' '),
      triangle: 'G2 . . . D3 . . . E2 . . . B2 . . . C3 . . . G2 . . . D2 . . . D3 . . .'.split(' '),
      noise: '. . o . . . o . . . o . . . o o . . o . . . o . . . o . . o o .'.split(' ') }
  };
})(window.AudioKit);
