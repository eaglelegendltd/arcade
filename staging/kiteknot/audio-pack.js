/* Kiteknot - original SFX + loop. Requires audio-kit.js. Slug chosen (no game folder found). */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  // Sustained tension hum: one persistent voice (saw + detuned triangle -> lowpass -> gain -> kit master).
  // tension(t 0..1) glides pitch/volume/brightness; t<=0, tensionStop(), or ~400 ms without updates fades it out.
  // Mute = kit master gain; pause = AudioContext suspend (both handled by audio-kit.js).
  var hum = null, idle = null, IDLE_MS = 400, GLIDE = 0.12;
  function ensureHum() {
    var c = K.getContext(); if (!c) return null;
    if (hum) return hum;
    var a = c.createOscillator(), b = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), mb = c.createGain();
    a.type = 'sawtooth'; b.type = 'triangle'; b.detune.value = 7; f.type = 'lowpass'; f.Q.value = 4; mb.gain.value = 0.6;
    g.gain.value = 0.0001; a.frequency.value = 110; b.frequency.value = 220; f.frequency.value = 400;
    a.connect(f); b.connect(mb); mb.connect(f); f.connect(g); g.connect(K.getOutput());
    a.start(); b.start();
    hum = { a: a, b: b, f: f, g: g, level: 0 }; return hum;
  }
  function tension(k) {
    k = Math.max(0, Math.min(1, +k || 0));
    if (k <= 0) { tensionStop(); return; }
    var h = ensureHum(); if (!h) return; var t = K.getContext().currentTime;
    var fr = 90 + 360 * k * k;
    h.a.frequency.setTargetAtTime(fr, t, GLIDE); h.b.frequency.setTargetAtTime(fr * 2, t, GLIDE);
    h.f.frequency.setTargetAtTime(300 + 2200 * k, t, GLIDE);
    h.g.gain.setTargetAtTime(0.015 + 0.075 * k, t, GLIDE); h.level = k;
    clearTimeout(idle); idle = setTimeout(tensionStop, IDLE_MS);
  }
  function tensionStop() {
    clearTimeout(idle); if (!hum) return;
    var h = hum, c = K.getContext(), t = c.currentTime; hum = null;
    h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(h.g.gain.value, t); h.g.gain.setTargetAtTime(0.0001, t, 0.08);
    try { h.a.stop(t + 0.6); h.b.stop(t + 0.6); } catch (e) {}
    setTimeout(function () { try { h.g.disconnect(); } catch (e) {} }, 1500);
  }
  K.games = K.games || {};
  K.games.kiteknot = {
    tensionActive: function () { return !!hum; }, tensionLevel: function () { return hum ? hum.level : 0; }, _hum: function () { return hum; },
    sfx: {
      reel: function () { var t = n(); for (var i = 0; i < 3; i++) T({ type: 'square', f0: 900, dur: 0.015, gain: 0.08, t: t + i * 0.035 }); },
      payOut: function () { T({ type: 'noise', dur: 0.15, gain: 0.08 }); T({ type: 'triangle', f0: 500, f1: 350, dur: 0.15, gain: 0.08 }); },
      // tension(0..1): string hum that rises in pitch as tension builds; call periodically
      tension: tension,
      tensionStop: tensionStop,
      gust: function () { T({ type: 'noise', dur: 0.7, gain: 0.12 }); T({ type: 'sine', f0: 300, f1: 700, dur: 0.7, gain: 0.06 }); },
      ringHit: function (combo) { var f = 660 * Math.pow(1.122, Math.min(8, combo || 0)), t = n(); T({ type: 'triangle', f0: f, dur: 0.15, gain: 0.22, t: t }); T({ type: 'triangle', f0: f * 1.5, dur: 0.2, gain: 0.15, t: t + 0.07 }); },
      lineSnap: function () { tensionStop(); var t = n(); T({ type: 'sawtooth', f0: 2200, f1: 80, dur: 0.25, gain: 0.25, t: t }); T({ type: 'noise', dur: 0.08, gain: 0.35, t: t }); T({ type: 'sine', f0: 600, f1: 150, dur: 1.2, gain: 0.15, t: t + 0.25 }); }
    },
    loop: { bpm: 116, stepsPerBeat: 4,
      square: 'D5 . . A5 . . F#5 . G5 . . E5 . . . . B4 . . F#5 . . D5 . E5 . . C#5 . D5 . .'.split(' '),
      triangle: 'D3 . . . A2 . . . G2 . . . E2 . . . B2 . . . F#2 . . . A2 . . . D3 . A2 .'.split(' '),
      noise: 'o . . o . . o . o . . o . . o . o . . o . . o . o . . o . o o o'.split(' ') }
  };
})(window.AudioKit);
