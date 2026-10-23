window.EAGLE_BRIDGE_AUDIO = true; /* host commands go through eagle-bridge.js */
/* Eagle Legend winter / Christmas audio kit: title-agnostic, 100% original procedural audio (no samples, no recordings,
   no carols or borrowed melodies; jingles are newly composed motifs). Eagle Legend LTD.
   Same shape as /workspace/audio-kit: window.AudioKit {unlock, setVolume, setMuted, pause, resume, handleCommand, Player, sfx, ...}
   plus window.AudioKit.christmas {play(bed), stop(), sfx, event(name), render(name, variant, sr)}.
   Every sound is synthesised sample by sample from a fixed seed, so live playback in a game and the rendered OGG/MP3
   files are identical. The ambient beds are periodic by construction (circular filters, events wrapped), so
   AudioBufferSourceNode.loop plays them seamlessly. Works in Node too (module.exports) for render.js. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  // ---------- DSP helpers ----------
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function db(x) { return Math.pow(10, x / 20); }
  function white(n, r) { var o = new Float32Array(n); for (var i = 0; i < n; i++) o[i] = r() * 2 - 1; return o; }
  // TPT state-variable filter. fc may be a number or function(i). circular=true runs a warm-up pass so the output is periodic.
  function svf(x, type, fc, Q, sr, circular) {
    var n = x.length, o = new Float32Array(n), ic1 = 0, ic2 = 0, k = 1 / (Q || 0.707), fixed = typeof fc === 'number', g, a1, a2, a3;
    function coef(f) { g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
    if (fixed) coef(fc);
    for (var pass = circular ? 0 : 1; pass < 2; pass++) for (var i = 0; i < n; i++) {
      if (!fixed) coef(fc(i));
      var v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      if (pass === 1) o[i] = type === 'lp' ? v2 : type === 'bp' ? v1 : type === 'hp' ? x[i] - k * v1 - v2 : v1 * k; // 'bpn' = unity-peak bandpass
    }
    return o;
  }
  function add(dst, src, at, gain, wrap) { var n = dst.length; for (var i = 0; i < src.length; i++) { var j = at + i; if (j >= n) { if (!wrap) break; j %= n; } dst[j] += src[i] * gain; } }
  function mul(x, f) { for (var i = 0; i < x.length; i++) x[i] *= f(i); return x; }
  // decaying sine partial written into dst (attack in s, decay = time constant in s)
  function partial(dst, at, f, amp, decay, attack, sr, wrap) {
    var n = Math.min(Math.ceil(decay * 9 * sr), wrap ? dst.length : dst.length - at), A = Math.max(0.002, attack || 0.004) * sr, w = TAU * f / sr;
    for (var i = 0; i < n; i++) { var e = (i < A ? i / A : 1) * Math.exp(-i / (decay * sr)); var j = at + i; if (j >= dst.length) { if (!wrap) break; j %= dst.length; } dst[j] += amp * e * Math.sin(w * i); }
  }
  function burst(n, r, attack, decay, sr) { var o = white(n, r), A = Math.max(1, attack * sr); return mul(o, function (i) { return (i < A ? i / A : 1) * Math.exp(-i / (decay * sr)); }); }
  function fadeOut(x, sec, sr) { var F = Math.min(x.length, Math.round(sec * sr)); for (var i = 0; i < F; i++) x[x.length - 1 - i] *= i / F; return x; }
  function stats(x) { var s = 0, p = 0; for (var i = 0; i < x.length; i++) { s += x[i] * x[i]; var a = Math.abs(x[i]); if (a > p) p = a; } return { rms: 10 * Math.log10(s / x.length + 1e-20), peak: 20 * Math.log10(p + 1e-20) }; }
  // Level: scale to the target peak (one-shots) or target RMS capped by a peak ceiling (beds).
  function level(x, o) { var st = stats(x), g = o.rms != null ? db(o.rms - st.rms) : db(o.peak - st.peak); if (o.ceil != null) g = Math.min(g, db(o.ceil - st.peak)); for (var i = 0; i < x.length; i++) x[i] *= g; return x; }
  var NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function noteFreq(nm) { var m = /^([A-G][#b]?)(-?\d)$/.exec(nm); return m ? 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12) : 0; }
  // A struck handbell/glass-chime voice: inharmonic partials, slight beating on the fundamental. Not a sleigh bell.
  function bellVoice(dst, at, f, amp, len, sr) {
    [[1, 1, 1.0], [1.003, 0.35, 1.0], [2.0, 0.32, 0.55], [2.76, 0.18, 0.4], [5.4, 0.07, 0.16], [8.93, 0.025, 0.07]].forEach(function (p) {
      partial(dst, at, f * p[0], amp * p[1], p[2] * len, 0.003, sr); });
  }
  function softKey(dst, at, f, amp, len, sr) { // warm celesta-ish voice for jingles
    partial(dst, at, f, amp, len, 0.006, sr); partial(dst, at, f * 2, amp * 0.22, len * 0.45, 0.005, sr); partial(dst, at, f * 3.01, amp * 0.06, len * 0.2, 0.004, sr);
  }

  // ---------- Sound definitions: name -> {variants, sec, make(sr, v) -> Float32Array} ----------
  var BELL_NOTES = ['C6', 'D6', 'E6', 'G6']; // pentatonic: any bells together always harmonise
  var DEFS = {
    bell: { variants: 4, sec: 2.4, level: { peak: -24 }, make: function (sr, v) {
      var x = new Float32Array(Math.round(2.4 * sr)); bellVoice(x, 0, noteFreq(BELL_NOTES[v]), 0.3, 1.1 - v * 0.08, sr); return fadeOut(x, 0.05, sr); } },
    crackerSnap: { variants: 1, sec: 1.0, level: { peak: -21 }, make: function (sr) {
      var r = rng(901), x = new Float32Array(Math.round(1.0 * sr));
      add(x, svf(burst(Math.round(0.05 * sr), r, 0.0012, 0.012, sr), 'bp', 2400, 0.8, sr), 0, 1);           // the snap
      for (var i = 0; i < 14; i++) add(x, svf(burst(Math.round(0.006 * sr), r, 0.0005, 0.0015, sr), 'hp', 2500, 0.7, sr), Math.round((0.004 + Math.pow(r(), 1.6) * 0.09) * sr), 0.5 * (1 - i / 16)); // crackle tail
      var thump = new Float32Array(Math.round(0.08 * sr)); for (i = 0; i < thump.length; i++) { var t = i / sr; thump[i] = Math.sin(TAU * (120 * t - 300 * t * t)) * Math.exp(-t / 0.02) * Math.min(1, i / (0.002 * sr)); } add(x, thump, 0, 0.4);
      var fl = svf(white(Math.round(0.6 * sr), r), 'bp', 4200, 0.9, sr); mul(fl, function (i) { var t = i / sr; return Math.abs(Math.sin(TAU * 11 * t)) * Math.exp(-t / 0.15) * Math.min(1, t / 0.01); }); add(x, fl, Math.round(0.03 * sr), 0.12); // paper flutter
      return fadeOut(x, 0.05, sr); } },
    snowStep: { variants: 4, sec: 0.42, level: { peak: -26 }, make: function (sr, v) {
      var r = rng(300 + v * 17), x = new Float32Array(Math.round(0.42 * sr)), toe = 0.085 + v * 0.012 + r() * 0.01, fc = [1500, 1800, 1300, 2000][v];
      [[0, 1, 0.11], [toe, 0.7, 0.13]].forEach(function (ph) { // heel then toe: dense packed-snow grains
        var len = Math.round(ph[2] * 1.6 * sr), g = new Float32Array(len), dens = 0.35 + r() * 0.15;
        for (var i = 0; i < len; i++) { var t = i / sr, envl = Math.min(1, t / 0.012) * Math.exp(-t / (ph[2] * 0.5)); g[i] = (r() < dens ? (r() * 2 - 1) : 0) * envl * (0.5 + r()); }
        add(x, svf(g, 'bp', fc * (0.9 + r() * 0.2), 0.7, sr), Math.round(ph[0] * sr), ph[1]);
        add(x, svf(g, 'lp', 350, 0.7, sr), Math.round(ph[0] * sr), ph[1] * 0.6); });
      return fadeOut(x, 0.04, sr); } },
    paperRustle: { variants: 1, sec: 1.5, level: { peak: -26 }, make: function (sr) {
      var r = rng(512), n = Math.round(1.5 * sr), crinkle = new Float32Array(n), t0 = 0;
      while (t0 < 1.4) { var len = Math.round((0.004 + r() * 0.03) * sr), a = 0.2 + r(), st = Math.round(t0 * sr); for (var i = 0; i < len && st + i < n; i++) crinkle[st + i] += a * Math.sin(Math.PI * i / len); t0 += 0.004 + r() * 0.03; }
      var x = svf(svf(white(n, r), 'bp', 3200, 0.6, sr), 'hp', 900, 0.7, sr);
      mul(x, function (i) { var t = i / sr; return crinkle[i] * Math.min(1, t / 0.08) * Math.min(1, (1.5 - t) / 0.25); }); return x; } },
    paperTear: { variants: 1, sec: 0.75, level: { peak: -24 }, make: function (sr) {
      var r = rng(777), n = Math.round(0.75 * sr), stop = 0.56, x = svf(white(n, r), 'bp', function (i) { return 900 + 1900 * Math.min(1, i / (stop * sr)); }, 1.1, sr), rat = new Float32Array(n), t = 0.02;
      while (t < stop) { var p = Math.round(t * sr); for (var i = 0; i < 0.004 * sr && p + i < n; i++) rat[p + i] += Math.exp(-i / (0.0012 * sr)) * (0.6 + r() * 0.6); t += 1 / (110 + 160 * t / stop) * (0.6 + r() * 0.8); }
      mul(x, function (i) { var tt = i / sr; return (0.35 + rat[i]) * Math.min(1, tt / 0.04) * (tt < stop ? 1 : Math.exp(-(tt - stop) / 0.015)); }); return x; } },
    pop: { variants: 3, sec: 0.25, level: { peak: -24 }, make: function (sr, v) {
      var f0 = [880, 700, 1080][v], x = new Float32Array(Math.round(0.25 * sr)), ph = 0;
      for (var i = 0; i < x.length; i++) { var t = i / sr, f = f0 * (0.4 + 0.6 * Math.exp(-t / 0.018)); ph += TAU * f / sr; x[i] = Math.sin(ph) * Math.min(1, t / 0.0015) * Math.exp(-t / 0.045); }
      add(x, svf(burst(Math.round(0.006 * sr), rng(40 + v), 0.0005, 0.001, sr), 'hp', 3000, 0.7, sr), 0, 0.25); return fadeOut(x, 0.02, sr); } },
    jingleSuccess: { variants: 1, sec: 1.5, level: { peak: -22 }, make: function (sr) { // original motif: D5 A5 F#5 B5 (held) + sparkle
      var x = new Float32Array(Math.round(1.5 * sr));
      [['D5', 0, 0.25], ['A5', 0.1, 0.25], ['F#5', 0.2, 0.25], ['B5', 0.33, 0.6]].forEach(function (nn) { softKey(x, Math.round(nn[1] * sr), noteFreq(nn[0]), 0.25, nn[2], sr); });
      bellVoice(x, Math.round(0.33 * sr), noteFreq('F#6'), 0.06, 0.6, sr); return fadeOut(x, 0.08, sr); } },
    jingleWin: { variants: 1, sec: 3.0, level: { peak: -20 }, make: function (sr) { // original 3-phrase motif ending on G add9, with a sparkle run
      var x = new Float32Array(Math.round(3.0 * sr)), seq = [['G4', 0], ['B4', 0.12], ['E5', 0.24], ['D5', 0.42], ['A5', 0.54], ['G5', 0.66], ['C6', 0.84], ['B5', 0.96], ['D6', 1.1]];
      seq.forEach(function (nn, i) { softKey(x, Math.round(nn[1] * sr), noteFreq(nn[0]), 0.2, i === seq.length - 1 ? 1.0 : 0.3, sr); });
      [['G2', 0], ['C3', 0.42], ['D3', 0.84], ['G2', 1.1]].forEach(function (nn) { partial(x, Math.round(nn[1] * sr), noteFreq(nn[0]), 0.16, 0.5, 0.01, sr); partial(x, Math.round(nn[1] * sr), noteFreq(nn[0]) * 2, 0.05, 0.4, 0.01, sr); });
      ['G3', 'D4', 'A4', 'B4'].forEach(function (nn) { partial(x, Math.round(1.1 * sr), noteFreq(nn), 0.05, 0.9, 0.08, sr); });            // warm final chord
      ['G6', 'A6', 'B6', 'D7', 'G7'].forEach(function (nn, i) { bellVoice(x, Math.round((1.2 + i * 0.07) * sr), noteFreq(nn), 0.025, 0.35, sr); }); // sparkle
      return fadeOut(x, 0.15, sr); } },
    uiSoft: { variants: 1, sec: 0.2, level: { peak: -30 }, make: function (sr) {
      var x = new Float32Array(Math.round(0.2 * sr)); partial(x, 0, 880, 0.3, 0.045, 0.003, sr); partial(x, 0, 880 * 2.76, 0.04, 0.015, 0.002, sr); partial(x, 0, 440, 0.1, 0.03, 0.003, sr); return fadeOut(x, 0.02, sr); } }
  };
  // ---------- Ambient beds (music-free, seamless) ----------
  var BED_SEC = 24;
  function lfo(L, cycles, phase) { return function (i) { return Math.sin(TAU * cycles * i / L + (phase || 0)); }; }
  function circNoise(L, r, type, fc, Q, sr) { return svf(white(L, r), type, fc, Q, sr, true); }
  function smoothRand(L, r, fc, sr) { var y = circNoise(L, r, 'lp', fc, 0.6, sr), s = stats(y); var g = 1 / db(s.rms); for (var i = 0; i < L; i++) y[i] *= g; return y; } // ~unit-RMS slow periodic random
  var BEDS = {
    fireside: { seed: 1225, level: { rms: -34.5, ceil: -19.5 }, make: function (sr, r) {
      var L = BED_SEC * sr, x = new Float32Array(L), i;
      var roar = circNoise(L, r, 'lp', 220, 0.7, sr), flick = smoothRand(L, r, 1.5, sr), sw = lfo(L, 3);
      for (i = 0; i < L; i++) x[i] += roar[i] * 2.2 * (0.8 + 0.12 * flick[i] + 0.08 * sw(i));
      var hiss = circNoise(L, r, 'bp', 1800, 0.5, sr); for (i = 0; i < L; i++) x[i] += hiss[i] * 0.05 * (0.7 + 0.3 * flick[i]);
      var t = 0; while (t < BED_SEC) { // small crackles (~7/s), random amplitudes skewed small
        var a = Math.pow(r(), 3) * 0.3 + 0.03; add(x, svf(burst(Math.round(0.004 * sr), r, 0.0004, 0.0008 + r() * 0.001, sr), 'bp', 1500 + r() * 3000, 0.9, sr), Math.round(t * sr), a, true);
        t += -Math.log(1 - r()) / 7; }
      for (var k = 0; k < 11; k++) { var at = Math.round(r() * L); add(x, svf(burst(Math.round(0.03 * sr), r, 0.0006, 0.004, sr), 'bp', 900 + r() * 1500, 2.5, sr), at, 0.45 + r() * 0.25, true); } // wood pops
      var wind = circNoise(L, r, 'bp', 450, 1.3, sr), gust = lfo(L, 2, 1.1), g2 = lfo(L, 5, 0.3), whis = circNoise(L, r, 'bp', 820, 9, sr);
      for (i = 0; i < L; i++) { var gg = Math.max(0, 0.55 + 0.35 * gust(i) + 0.1 * g2(i)); x[i] += wind[i] * 0.5 * gg + whis[i] * 0.25 * gg * gg; } // wind outside the window
      return svf(x, 'hp', 40, 0.7, sr, true); } },
    snowHush: { seed: 2412, level: { rms: -35, ceil: -21 }, make: function (sr, r) {
      var L = BED_SEC * sr, x = new Float32Array(L), i;
      var hush = svf(circNoise(L, r, 'lp', 900, 0.6, sr), 'hp', 110, 0.7, sr, true), sw = lfo(L, 2, 0.4), drift = smoothRand(L, r, 0.4, sr);
      for (i = 0; i < L; i++) x[i] += hush[i] * (0.8 + 0.1 * sw(i) + 0.08 * drift[i]);
      var gustN = circNoise(L, r, 'bp', 600, 1.6, sr), g = lfo(L, 3, 2.0), g2 = lfo(L, 1, 0.7);
      var sift = circNoise(L, r, 'bp', 5200, 0.8, sr);
      for (i = 0; i < L; i++) { var gg = Math.max(0, 0.4 + 0.4 * g(i) + 0.2 * g2(i)); x[i] += gustN[i] * 0.6 * gg + sift[i] * 0.05 * (0.3 + gg); }
      [[5.3, 0.5], [16.8, 0.35]].forEach(function (f) { // soft snow sliding off a branch
        var len = Math.round(0.5 * sr), s = svf(white(len, r), 'lp', 380, 0.7, sr); mul(s, function (j) { var t = j / sr; return Math.min(1, t / 0.03) * Math.exp(-t / 0.12); }); add(x, s, Math.round(f[0] * sr), f[1] * 3, true); });
      return x; } }
  };
  // render(name, variant, sr): name is a DEFS key or 'bed:<name>'. Returns a Float32Array (mono).
  function render(name, variant, sr) {
    sr = sr || 44100;
    if (/^bed:/.test(name)) { var b = BEDS[name.slice(4)]; return level(b.make(sr, rng(b.seed)), b.level); }
    var d = DEFS[name]; return level(d.make(sr, (variant || 0) % d.variants), d.level);
  }
  // file name for each (sound, variant): used by render.js, demo and README
  var FILES = {};
  Object.keys(DEFS).forEach(function (k) { var snake = k.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); });
    for (var v = 0; v < DEFS[k].variants; v++) FILES[DEFS[k].variants > 1 ? snake + '_' + (v + 1) : snake] = [k, v]; });
  FILES.bed_fireside = ['bed:fireside', 0]; FILES.bed_snow_hush = ['bed:snowHush', 0];

  // ---------- Live Web Audio side (browser) ----------
  var ctx = null, master = null, musicBus = null, sfxBus = null, volume = 0.8, muted = false, paused = false, hiddenPause = false, cache = {};
  function getCtx() {
    if (ctx) return ctx; var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : volume;
    musicBus = ctx.createGain(); sfxBus = ctx.createGain(); musicBus.connect(master); sfxBus.connect(master); master.connect(ctx.destination);
    applyPause(); return ctx;
  }
  function buffer(name, v) { var c = getCtx(), key = name + '#' + (v || 0); if (!c) return null; if (cache[key]) return cache[key];
    var d = render(name, v, c.sampleRate), b = c.createBuffer(1, d.length, c.sampleRate); b.getChannelData(0).set(d); return (cache[key] = b); }
  function playBuf(b, dest, gain) { var c = getCtx(); if (!c || !b) return null; var s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = gain == null ? 1 : gain; s.connect(g); g.connect(dest || sfxBus); s.start(); return s; }
  function unlock() { var evs = ['pointerdown', 'keydown', 'touchstart'];
    function h() { var c = getCtx(); if (c && c.state === 'suspended' && !paused && !hiddenPause) c.resume(); evs.forEach(function (e) { root.removeEventListener(e, h, true); }); }
    evs.forEach(function (e) { root.addEventListener(e, h, true); }); }
  function rampTo(p, v, sec) { var t = ctx.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + sec); }
  function setVolume(v) { volume = Math.max(0, Math.min(1, +v || 0)); if (master && !muted) rampTo(master.gain, volume, 0.08); }
  function setMuted(m) { muted = !!m; if (master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime); } }
  function applyPause() { var want = paused || hiddenPause; if (!ctx) return; if (want && ctx.state === 'running') ctx.suspend(); else if (!want && ctx.state === 'suspended') ctx.resume(); }
  function pause() { paused = true; applyPause(); } function resume() { paused = false; applyPause(); }
  // SFX: each call plays one variant (cycling, or pass an index)
  var counters = {}, SFX = {};
  Object.keys(DEFS).forEach(function (k) { SFX[k] = function (v) { var n = DEFS[k].variants; if (v == null) { v = counters[k] || 0; counters[k] = (v + 1) % n; } return playBuf(buffer(k, v % n)); }; });
  // Player: a looping bed with fade in/out
  function Player(name) { this.name = name || 'fireside'; this.src = null; this.bus = null; this.playing = false; }
  Player.prototype.play = function (name, opts) { var c = getCtx(); if (!c) return this; if (name) this.name = name; opts = opts || {}; this.stop();
    this.bus = c.createGain(); this.bus.gain.value = 0; this.bus.connect(musicBus); rampTo(this.bus.gain, 1, opts.fadeIn == null ? 1.5 : Math.max(0.01, opts.fadeIn));
    this.src = c.createBufferSource(); this.src.buffer = buffer('bed:' + this.name); this.src.loop = true; this.src.connect(this.bus); this.src.start(); this.playing = true; return this; };
  Player.prototype.stop = function (fade) { var s = this.src, b = this.bus; this.playing = false; this.src = this.bus = null; if (!s) return;
    if (fade) { rampTo(b.gain, 0, fade); setTimeout(function () { try { s.stop(); b.disconnect(); } catch (e) {} }, fade * 1000 + 100); } else { try { s.stop(); b.disconnect(); } catch (e) {} } };
  var current = null;
  function playBed(name, fade) { name = BEDS[name] ? name : 'fireside'; fade = fade == null ? 3 : fade; if (current && current.playing && current.name === name) return current;
    var old = current; current = new Player(name).play(name, { fadeIn: old && old.playing ? fade : 1.5 }); if (old) old.stop(old.playing ? fade : 0); return current; }
  function stopBed(fade) { if (current) current.stop(fade == null ? 2 : fade); current = null; }
  var EVENTS = { 'collect': 'pop', 'pickup': 'pop', 'pop': 'pop', 'bell': 'bell', 'cracker': 'crackerSnap', 'step': 'snowStep', 'unwrap': 'paperRustle', 'tear': 'paperTear', 'open-present': 'paperTear',
    'correct': 'jingleSuccess', 'success': 'jingleSuccess', 'level-up': 'jingleSuccess', 'win': 'jingleWin', 'ui-click': 'uiSoft', 'ui': 'uiSoft' };
  function event(name) { var s = EVENTS[name]; if (s) { SFX[s](); return true; } if (name === 'bed-fireside') { playBed('fireside'); return true; } if (name === 'bed-snow') { playBed('snowHush'); return true; } return false; }
  function handleCommand(cmd) {
    var t = typeof cmd === 'string' ? cmd : (cmd && cmd.type);
    if (cmd && typeof cmd === 'object' && (cmd.type === 'eagle-host' || cmd.type === 'el-command' || cmd.type === 'el-host')) t = cmd.cmd || cmd.command || cmd.action;
    if (t === 'mute') setMuted(true); else if (t === 'unmute') setMuted(false); else if (t === 'pause') pause(); else if (t === 'resume') resume();
    else if (t === 'xmas-event' && cmd.event) return event(cmd.event); else return false; return true; }
  if (root.addEventListener && !root.EAGLE_BRIDGE_AUDIO) root.addEventListener('message', function (e) { handleCommand(e.data); });
  if (typeof document !== 'undefined' && document.addEventListener) { hiddenPause = document.visibilityState === 'hidden';
    document.addEventListener('visibilitychange', function () { hiddenPause = document.visibilityState === 'hidden'; applyPause(); }); }

  var christmas = { beds: Object.keys(BEDS), play: playBed, crossfadeTo: function (n, s) { return playBed(n, s == null ? 4 : s); }, stop: stopBed,
    current: function () { return current && current.playing ? current.name : null; }, sfx: SFX, event: event, events: EVENTS, defs: DEFS, files: FILES,
    render: render, stats: stats, bedSeconds: BED_SEC };
  var AK = root.AudioKit || {};
  var api = { unlock: unlock, getContext: getCtx, getOutput: function () { getCtx(); return master; }, setVolume: setVolume, getVolume: function () { return volume; },
    setMuted: setMuted, isMuted: function () { return muted; }, toggleMute: function () { setMuted(!muted); return muted; }, sfx: SFX, SFX: SFX,
    pause: pause, resume: resume, isPaused: function () { return paused || hiddenPause; }, handleCommand: handleCommand,
    noteFreq: noteFreq, Player: Player, loops: BEDS, christmas: christmas, previous: AK.Player ? AK : null };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AudioKit = api;
})(typeof window !== 'undefined' ? window : this);
