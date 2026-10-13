/* Tidepin - original SFX + loop. Requires audio-kit.js. */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  // Filtered-noise burst (for water); routes through the kit master, so mute/pause apply.
  function fnoise(o) {
    var c = K.getContext(); if (!c) return; var t = o.t != null ? o.t : c.currentTime, d = o.dur;
    var len = Math.ceil(c.sampleRate * (d + 0.05)), b = c.createBuffer(1, len, c.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b;
    f.type = o.ftype || 'lowpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f0, t); f.frequency.exponentialRampToValueAtTime(o.f1 || o.f0, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + (o.att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(K.getOutput()); s.start(t); s.stop(t + d + 0.05);
  }
  var lastImpact = -1e9, IMPACT_MS = 150, impactPlays = 0;
  function perfectStrike() { var t = n(); // bright metallic "ting" + rising sparkle
    T({ type: 'noise', dur: 0.03, gain: 0.25, t: t }); T({ type: 'square', f0: 1568, dur: 0.18, gain: 0.12, t: t }); T({ type: 'sine', f0: 1568 * 2.76, dur: 0.3, gain: 0.05, t: t });
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
  K.games = K.games || {};
  K.games.tidepin = {
    impactIntervalMs: IMPACT_MS, impactPlays: function () { return impactPlays; },
    sfx: {
      perfectStrike: perfectStrike, waterImpact: waterImpact, pinDamage: pinDamage, pinSnap: pinSnap,
      hammer: function () { var t = n(); T({ type: 'noise', dur: 0.05, gain: 0.35, t: t }); T({ type: 'square', f0: 330, f1: 110, dur: 0.08, gain: 0.25, t: t }); },
      wave: function () { var t = n(); T({ type: 'noise', dur: 0.9, gain: 0.18, t: t }); T({ type: 'triangle', f0: 90, f1: 60, dur: 0.9, gain: 0.2, t: t }); },
      // Aliases for the names the current game.js calls:
      waveSurvived: perfectStrike,   // game: perfect strike
      washAway: function () { waterImpact(0.9); }, // game: underwater strike
      snap: pinSnap,                 // game: durability 0
    },
    loop: { bpm: 100, stepsPerBeat: 4,
      square: 'G4 . . A4 B4 . D5 . . . B4 . A4 . . . E4 . . G4 A4 . B4 . . . A4 . G4 . . .'.split(' '),
      triangle: 'G2 . . . D3 . . . E2 . . . B2 . . . C3 . . . G2 . . . D2 . . . D3 . . .'.split(' '),
      noise: '. . o . . . o . . . o . . . o o . . o . . . o . . . o . . o o .'.split(' ') }
  };
})(window.AudioKit);
