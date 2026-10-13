/* AudioKit - dependency-free procedural Web Audio SFX + chiptune loop player. Original work. */
(function (root) {
  'use strict';
  var ctx = null, master = null, volume = 0.6, muted = false, paused = false, hiddenPause = false, players = [];

  function getCtx() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && !paused && !hiddenPause) ctx.resume();
    return ctx;
  }

  function unlock() {
    var evs = ['pointerdown', 'keydown', 'touchstart'];
    function h() { getCtx(); evs.forEach(function (e) { root.removeEventListener(e, h, true); }); }
    evs.forEach(function (e) { root.addEventListener(e, h, true); });
  }

  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master && !muted) master.gain.value = volume; }
  function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : volume; }
  function toggleMute() { setMuted(!muted); return muted; }

  var noiseBuf = null;
  function noise() {
    var c = getCtx();
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
  }

  // Generic tone: type, freq start/end, duration, gain, start time
  function tone(o) {
    var c = getCtx(); if (!c) return;
    var t = o.t != null ? o.t : c.currentTime, d = o.dur || 0.15, g = c.createGain();
    var src;
    if (o.type === 'noise') src = noise();
    else {
      src = c.createOscillator(); src.type = o.type || 'square';
      src.frequency.setValueAtTime(o.f0, t);
      if (o.f1) src.frequency.exponentialRampToValueAtTime(o.f1, t + d);
    }
    var peak = o.gain != null ? o.gain : 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(g); g.connect(o.dest || master);
    src.start(t); src.stop(t + d + 0.02);
  }

  function now() { var c = getCtx(); return c ? c.currentTime : 0; }

  var sfx = {
    jump: function () { tone({ type: 'square', f0: 220, f1: 660, dur: 0.18, gain: 0.25 }); },
    coin: function () { var t = now(); tone({ type: 'square', f0: 988, dur: 0.07, gain: 0.2, t: t }); tone({ type: 'square', f0: 1319, dur: 0.25, gain: 0.2, t: t + 0.07 }); },
    hit: function () { var t = now(); tone({ type: 'noise', dur: 0.2, gain: 0.4, t: t }); tone({ type: 'sawtooth', f0: 180, f1: 40, dur: 0.2, gain: 0.3, t: t }); },
    powerUp: function () { var t = now(), n = [262, 330, 392, 523, 659, 784, 1047]; n.forEach(function (f, i) { tone({ type: 'square', f0: f, f1: f * 1.02, dur: 0.09, gain: 0.18, t: t + i * 0.06 }); }); },
    gameOver: function () { var t = now(), n = [392, 370, 349, 330]; n.forEach(function (f, i) { tone({ type: 'triangle', f0: f, f1: i === 3 ? f / 2 : f * 0.97, dur: i === 3 ? 0.9 : 0.3, gain: 0.35, t: t + i * 0.32 }); }); }
  };

  // ---- Chiptune step sequencer ----
  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function noteFreq(n) {
    if (n == null || n === '-' || n === '.') return 0;
    if (typeof n === 'number') return n;
    var m = /^([A-G]#?)(-?\d)$/.exec(n); if (!m) return 0;
    return 440 * Math.pow(2, (NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12 - 69) / 12);
  }

  // song: { bpm, stepsPerBeat, square:[...], triangle:[...], noise:[...] } ; '.' = rest, noise uses 'x'/'o'
  function Player() { players.push(this); this.song = null; this.timer = null; this.step = 0; this.loop = true; this.playing = false; }
  Player.prototype.play = function (song, opts) {
    this.stop(); var c = getCtx(); if (!c) return;
    this.song = song; this.loop = !opts || opts.loop !== false; this.bpm = (opts && opts.bpm) || song.bpm || 120;
    this.step = 0; this.next = c.currentTime + 0.05; this.playing = true; this._q = [];
    var self = this; this.timer = setInterval(function () { self._sched(); }, 25); this._sched();
  };
  Player.prototype.setTempo = function (bpm) { this.bpm = bpm; };
  Player.prototype.stop = function () { if (this.timer) clearInterval(this.timer); this.timer = null; this.playing = false; };
  // Step currently audible (by AudioContext time), or -1 when idle.
  Player.prototype.currentStep = function () {
    if (!this.playing || !this._q || !ctx) return -1;
    var now = ctx.currentTime, cur = -1;
    for (var k = 0; k < this._q.length; k++) if (this._q[k][0] <= now) cur = this._q[k][1];
    return cur;
  };
  Player.prototype._len = function () { var s = this.song; return Math.max(s.square ? s.square.length : 0, s.triangle ? s.triangle.length : 0, s.noise ? s.noise.length : 0); };
  Player.prototype._sched = function () {
    var c = getCtx(), s = this.song, spb = s.stepsPerBeat || 4, len = this._len();
    var stepDur = 60 / this.bpm / spb;
    if (paused || hiddenPause) return;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.playing && this.next < c.currentTime + 0.12) {
      var i = this.step, t = this.next, f;
      if (s.square && (f = noteFreq(s.square[i % s.square.length]))) tone({ type: 'square', f0: f, dur: stepDur * 0.9, gain: 0.12, t: t });
      if (s.triangle && (f = noteFreq(s.triangle[i % s.triangle.length]))) tone({ type: 'triangle', f0: f, dur: stepDur * 0.95, gain: 0.3, t: t });
      if (s.noise) { var k = s.noise[i % s.noise.length];
        if (k === 'x') tone({ type: 'noise', dur: 0.12, gain: 0.25, t: t });
        else if (k === 'o') tone({ type: 'noise', dur: 0.03, gain: 0.12, t: t }); }
      this._q.push([t, i]); if (this._q.length > 64) this._q.shift();
      this.next += stepDur; this.step++;
      if (this.step >= len) { if (this.loop) this.step = 0; else { this.stop(); } }
    }
  };

  // ---- Parent-site control (pause/resume/mute) ----
  function applyPause() {
    var want = paused || hiddenPause;
    if (!ctx) return;
    if (want && ctx.state === 'running') ctx.suspend();
    else if (!want && ctx.state === 'suspended') ctx.resume();
  }
  function pause() { paused = true; applyPause(); }
  function resume() { paused = false; applyPause(); }
  function handleCommand(cmd) {
    var t = typeof cmd === 'string' ? cmd : (cmd && cmd.type);
    if (t === 'mute') setMuted(true);
    else if (t === 'unmute') setMuted(false);
    else if (t === 'pause') pause();
    else if (t === 'resume') resume();
    else return false;
    return true;
  }
  if (root.addEventListener) {
    root.addEventListener('message', function (e) { handleCommand(e.data); });
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      hiddenPause = document.visibilityState === 'hidden';
      applyPause();
    });
  }

  function p(str) { return str.trim().split(/\s+/); }
  // Original demo loops composed for this kit.
  var loops = {
    meadowRun: { bpm: 140, stepsPerBeat: 4,
      square: p('E5 . G5 A5 . G5 E5 . D5 . E5 G5 . . . . C5 . E5 G5 . A5 G5 . E5 . D5 C5 D5 . . .'),
      triangle: p('C3 . . C3 . . G2 . A2 . . A2 . . E2 . F2 . . F2 . . C3 . G2 . . G2 . . B2 .'),
      noise: p('x . o . x . o o x . o . x . o . x . o . x . o o x . o . x o x o') },
    caveEcho: { bpm: 96, stepsPerBeat: 4,
      square: p('A4 . C5 . E5 . . D5 C5 . B4 . . . G#4 . A4 . E5 . F5 . E5 . D5 . C5 . B4 . . .'),
      triangle: p('A2 . . . A2 . . . F2 . . . F2 . . . D2 . . . D2 . . . E2 . . . E2 . E2 .'),
      noise: p('x . . . o . . . x . . o o . . . x . . . o . . . x . o . o . o o') }
  };

  root.AudioKit = { unlock: unlock, getContext: getCtx, getOutput: function () { getCtx(); return master; }, setVolume: setVolume, getVolume: function () { return volume; },
    setMuted: setMuted, isMuted: function () { return muted; }, toggleMute: toggleMute,
    sfx: sfx, jump: sfx.jump, coin: sfx.coin, hit: sfx.hit, powerUp: sfx.powerUp, gameOver: sfx.gameOver,
    pause: pause, resume: resume, isPaused: function () { return paused || hiddenPause; }, handleCommand: handleCommand,
    tone: tone, noteFreq: noteFreq, Player: Player, loops: loops };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AudioKit;
})(typeof window !== 'undefined' ? window : globalThis);
