window.XM_AUDIO_GAME = 'stockingstep'; window.XM_AUDIO_BED = 'fireside';
/* Christmas per-game audio map: Harper's per-game packs (PROPOSAL, 23 Oct 2026). Drop-in replacement for xm-audio.js, same format and event names.
   Requires xmas-audio.js (Harper's winter kit). XM_AUDIO_GAME / XM_AUDIO_BED are set by xm-build.py exactly as before.
   Each game gets its own original loop + signature SFX from assets/audio/<prefix>_*.ogg (MP3 copies where the browser can't play OGG, e.g. old Safari).
   Files are fetched at load and decoded on the first tap; until a file is ready (or if it can't load) the shared winter-kit sound plays instead, as today. */
(function (K) { if (!K || !K.christmas) return; var S = K.christmas.sfx, id = window.XM_AUDIO_GAME, bed = window.XM_AUDIO_BED || 'fireside';
  var lim = {}, gate = function (n, ms) { var t = Date.now(); if (lim[n] && t - lim[n] < ms) return false; lim[n] = t; return true; };
  var bellNote = 0, KIT = { // event: [gate name, ms, shared-kit sound] (identical to xm-audio.js)
    start: [null, 0, function () { S.uiSoft(); }], coin: ['pop', 45, function () { S.pop(); }], pop: ['pop', 45, function () { S.pop(); }],
    good: ['good', 60, function (n) { S.bell(((n == null ? bellNote++ : n) % 4)); }], perfect: ['perf', 120, function () { S.jingleSuccess(); }],
    soft: ['soft', 150, function () { S.uiSoft(); }], miss: ['miss', 150, function () { S.paperTear(); }], hit: ['miss', 150, function () { S.paperTear(); }],
    step: ['step', 60, function () { S.snowStep(); }], drop: ['drop', 120, function () { S.paperRustle(); }], land: ['land', 60, function () { S.pop(); }],
    powerUp: ['lvl', 400, function () { S.jingleSuccess(); }], gameOver: ['over', 600, function () { S.bell(0); }], win: ['win', 1500, function () { S.jingleWin(); }]
  };
  // ---- per-game packs: event -> file name after the prefix ('+' = pitch climbs with the streak arg, in the game's key) ----
  var PACKS = {
    'tinselpluck': { p: 'tp', sfx: { good: 'pluck+', perfect: 'pluck_perfect', miss: 'tangle', hit: 'tangle', powerUp: 'shimmer' } },
    'mincepie-stack': { p: 'mp', sfx: { good: 'stack_thud', land: 'pie_plop', miss: 'slide_off', hit: 'slide_off', powerUp: 'golden' } },
    'advent-pocket': { p: 'ap', sfx: { good: 'pocket_pop+', perfect: 'door_creak', miss: 'shut', hit: 'shut', powerUp: 'board_done' } },
    'holly-hopper': { p: 'hh', sfx: { step: 'boing', good: 'land', perfect: 'land', coin: 'star', miss: 'snow_slide', hit: 'snow_slide' } },
    'flue-drop': { p: 'fd', sfx: { drop: 'drop', good: 'chimney_thud', perfect: 'chimney_perfect', miss: 'soot_puff', hit: 'soot_puff' } },
    'frostnib': { p: 'fn', sfx: { good: 'nib_scratch', perfect: 'frost_squeak', powerUp: 'frost_bloom', miss: 'smudge', hit: 'smudge' } },
    'stockingstep': { p: 'ss', sfx: { step: 'step', good: 'fill', perfect: 'fill', coin: 'coin', miss: 'slip', hit: 'slip' } },
    'wreathweave': { p: 'ww', sfx: { good: 'tuck+', perfect: 'tuck_perfect', powerUp: 'complete', miss: 'wilt', hit: 'wilt' } },
    'snowcrumb': { p: 'sc', sfx: { drop: 'toss', good: 'chirp+', powerUp: 'trill', miss: 'hungry', hit: 'hungry' } },
    // Yulewhirl's tap calls g.sfx('reverse') (one-word game.js change), so the forgiven miss ('soft') keeps the kit sound
    'yulewhirl': { p: 'yw', sfx: { reverse: 'reverse', good: 'sparkle+', perfect: 'sparkle_big', miss: 'soot', hit: 'soot' } }
  }, P = PACKS[id];
  // ---- file loading: fetch at load, decode in the game's AudioContext on first use; OGG first, MP3 fallback ----
  var web = /^https?:$/.test(location.protocol) && window.fetch, bytes = {}, bufs = {}, waits = {}, decoding = {}, failed = {}, plays = {};
  var ext = (function () { try { var a = document.createElement('audio'); return a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3'; } catch (e) { return 'mp3'; } })();
  function get(f, e) { return fetch('assets/audio/' + f + '.' + e).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }); }
  function done(f, b) { bufs[f] = b; if (!b) failed[f] = true; var w = waits[f] || []; waits[f] = []; w.forEach(function (cb) { try { cb(b); } catch (e) {} }); }
  function decode(f, e) { var c = K.getContext(); if (!c) return done(f, null);
    bytes[f].then(function (ab) { var ok = function (b) { done(f, b); }, bad = function () { if (e === 'ogg') { bytes[f] = get(f, 'mp3'); bytes[f].catch(function () {}); decode(f, 'mp3'); } else done(f, null); };
      var p = c.decodeAudioData(ab, ok, bad); if (p && p.catch) p.catch(function () {}); }, function () { if (e === 'ogg') { bytes[f] = get(f, 'mp3'); bytes[f].catch(function () {}); decode(f, 'mp3'); } else done(f, null); }); }
  function load(f, cb) { if (bufs[f] || failed[f]) { if (cb) cb(bufs[f] || null); return; } waits[f] = waits[f] || []; if (cb) waits[f].push(cb);
    if (!web) return done(f, null); if (!bytes[f]) { bytes[f] = get(f, ext); bytes[f].catch(function () {}); } if (!decoding[f]) { decoding[f] = true; decode(f, ext); } }
  function play(f, rate) { var b = bufs[f], c; if (!b) { load(f); return false; } try { c = K.getContext(); var s = c.createBufferSource(); s.buffer = b; if (rate && rate !== 1) s.playbackRate.value = rate;
      s.connect(K.getOutput()); s.start(); plays[f] = (plays[f] || 0) + 1; return true; } catch (e) { return false; } }
  var CLIMB = [0, 2, 4, 7, 9, 12]; // major-pentatonic steps above the file's own note
  var map = {}, files = [];
  Object.keys(KIT).forEach(function (ev) { var k = KIT[ev], f = P && P.sfx[ev], climb = f && f.slice(-1) === '+', file = f && P.p + '_' + f.replace('+', '');
    if (file && files.indexOf(file) < 0) files.push(file);
    map[ev] = function (n) { if (k[0] && !gate(k[0], k[1])) return; if (file && play(file, climb && n != null && n >= 0 ? Math.pow(2, CLIMB[Math.min(n, 5)] / 12) : 1)) return; k[2](n); }; });
  // 'reverse' isn't a kit event, so give it its own handler (same gate + kit fallback as 'soft'); aliasing map.soft meant yw_reverse never loaded once soft->reverse was removed
  if (P && P.sfx.reverse) { var rvF = P.p + '_' + P.sfx.reverse.replace('+', ''), rvK = KIT.soft; if (files.indexOf(rvF) < 0) files.push(rvF);
    map.reverse = function (n) { if (rvK[0] && !gate(rvK[0], rvK[1])) return; if (play(rvF, 1)) return; rvK[2](n); }; }
  var loop = bed;
  if (P) { // the loop: a file bed the kit's Player can play (kit Player gets a small, guarded extension; other bed names still go to the kit)
    loop = P.p + '_loop'; files.push(loop);
    var PP = K.Player && K.Player.prototype;
    if (PP && !PP.__xmFiles) { var kitPlay = PP.play; PP.__xmFiles = {};
      PP.play = function (name, opts) { var fb = name && PP.__xmFiles[name]; if (!fb) return kitPlay.call(this, name, opts);
        var c = K.getContext(); if (!c) return this; this.stop(); this.name = name; this.playing = true; var self = this, tok = this.__xmTok = {}, fade = opts && opts.fadeIn != null ? Math.max(0.01, opts.fadeIn) : 1.5;
        load(fb.file, function (b) { if (self.__xmTok !== tok || !self.playing) return;
          if (!b) { self.playing = false; kitPlay.call(self, fb.fallback, opts); return; }
          var t = c.currentTime, g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fade); g.connect(K.getOutput());
          var s = c.createBufferSource(); s.buffer = b; s.loop = true; s.connect(g); s.start(); self.src = s; self.bus = g; plays[fb.file] = (plays[fb.file] || 0) + 1; });
        return this; };
    }
    if (PP) PP.__xmFiles[loop] = { file: loop, fallback: bed }; else loop = bed;
    if (web) files.forEach(function (f) { bytes[f] = get(f, ext); bytes[f].catch(function () {}); });
    var pre = function () { ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) { removeEventListener(e, pre, true); }); files.forEach(function (f) { load(f); }); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) { addEventListener(e, pre, true); });
  }
  K.games = K.games || {}; K.games[id] = { loop: loop, sfx: map, files: files, format: ext, status: function () { var o = {}; files.forEach(function (f) { o[f] = bufs[f] ? 'ready' : failed[f] ? 'failed' : 'pending'; }); return { files: o, plays: plays, format: ext }; } };
})(window.AudioKit);
