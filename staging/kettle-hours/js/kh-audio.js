/* Audio: Harper's files from assets/audio/ (listed in assets/audio/manifest.json) via <audio>, otherwise
   gentle WebAudio placeholders. Nothing plays until the first user gesture. All same-origin. */
(function (W) {
  'use strict';
  var D = W.document;
  var files = {}, ctx = null, master = null, muted = false, paused = false, bed = null, bedKey = null, el = null, vol = { ambience: 0.5, cue: 0.7 };
  function load() {
    return fetch('assets/audio/manifest.json').then(function (r) { return r.ok ? r.json() : { files: [] }; }).catch(function () { return { files: [] }; })
      .then(function (m) {
        // Group by name so both formats are kept (the manifest is sorted, so ogg would otherwise always win).
        var all = {}; (m.files || []).forEach(function (f) { var mm = f.match(/^(.*)\.(mp3|ogg|m4a|wav|webm)$/i); if (mm) (all[mm[1]] = all[mm[1]] || {})[mm[2].toLowerCase()] = f; });
        for (var k in all) files[k] = pick(all[k]); // null = known sound but no playable format -> stay silent
        if (m.volume) for (var v in m.volume) vol[v] = m.volume[v];
      });
  }
  var TYPES = { ogg: 'audio/ogg; codecs=vorbis', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', webm: 'audio/webm' };
  function can(ext) { try { var a = D.createElement('audio'); return !!(a.canPlayType && a.canPlayType(TYPES[ext])); } catch (e) { return false; } }
  function pick(byExt) { var order = ['ogg', 'mp3', 'm4a', 'webm', 'wav']; for (var i = 0; i < order.length; i++) if (byExt[order[i]] && can(order[i])) return byExt[order[i]]; return null; }
  function has(key) { return Object.prototype.hasOwnProperty.call(files, key); }
  function ac() {
    if (ctx) return ctx; var C = W.AudioContext || W.webkitAudioContext; if (!C) return null;
    ctx = new C(); master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination); return ctx;
  }
  function unlock() { var c = ac(); if (c && c.state === 'suspended' && !paused) c.resume(); if (bedKey && !bed && !el) ambience(bedKey, true); }
  function noiseBuffer(c) { var len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } return b; } // brown noise
  function stopBed() {
    if (el) { el.pause(); el = null; }
    if (bed) { try { bed.g.gain.setTargetAtTime(0, ctx.currentTime, 0.6); var b = bed; setTimeout(function () { try { b.src.stop(); clearInterval(b.iv); } catch (e) {} }, 2500); } catch (e) {} bed = null; }
  }
  function ambience(key, force) {
    if (!key) return; if (key === bedKey && !force && (bed || el)) return; bedKey = key; stopBed(); if (key === 'none') return;
    if (has(key) && !files[key]) return; // known loop, no playable format: silent
    if (files[key]) { try { el = new Audio('assets/audio/' + files[key]); el.loop = true; el.volume = vol.ambience; el.muted = muted; if (!paused) el.play().catch(function () {}); } catch (e) { el = null; } return; }
    var c = ac(); if (!c || c.state !== 'running' && !force) { if (c) c.resume().catch(function () {}); }
    if (!c) return;
    var src = c.createBufferSource(); src.buffer = noiseBuffer(c); src.loop = true;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = /rain/.test(key) ? 1400 : 500;
    var g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.06 * vol.ambience * 2, c.currentTime, 1.2);
    src.connect(lp); lp.connect(g); g.connect(master); src.start();
    // occasional soft cup clinks for café beds
    var iv = setInterval(function () { if (!paused && !muted && Math.random() < 0.35 && !/rain|none/.test(key)) tone(1800 + Math.random() * 900, 0.18, 0.025); }, 2600);
    bed = { src: src, g: g, iv: iv };
  }
  function tone(f, dur, gain, type) { var c = ctx; if (!c || muted) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(c.currentTime + dur + 0.05); }
  var CUES = {
    door_bell: function () { tone(1320, 0.9, 0.06); setTimeout(function () { tone(990, 1.1, 0.05); }, 140); },
    kettle: function () { tone(660, 1.4, 0.02, 'triangle'); },
    chime_soft: function () { [523, 659, 784].forEach(function (f, i) { setTimeout(function () { tone(f, 1.2, 0.04); }, i * 160); }); },
    pour: function () { tone(420, 0.5, 0.03, 'triangle'); },
    notice: function () { tone(880, 0.35, 0.035); },
    page: function () { tone(300, 0.15, 0.02, 'triangle'); },
    breathe_in: function () { tone(330, 3.8, 0.025); }, breathe_out: function () { tone(262, 4.8, 0.025); },
    sting: function () { [392, 523].forEach(function (f, i) { setTimeout(function () { tone(f, 1.4, 0.03); }, i * 220); }); }
  };
  // opts.gain scales the cue volume; opts.duringPause lets the breathe panel play its cues while the game is paused.
  function cue(key, opts) {
    opts = opts || {};
    if (!key || muted || (paused && !opts.duringPause)) return false;
    if (has(key) && !files[key]) return false; // no playable format: silent
    if (files[key]) { try { var a = new Audio('assets/audio/' + files[key]); a.volume = Math.max(0, Math.min(1, vol.cue * (opts.gain || 1))); var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { return false; } return true; }
    if (paused || !CUES[key] || !ac()) return false; CUES[key](); return true;
  }
  function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 1; if (el) el.muted = muted; }
  function setPaused(p) { paused = !!p; if (ctx) { if (p) ctx.suspend().catch(function () {}); else ctx.resume().catch(function () {}); } if (el) { if (p) el.pause(); else el.play().catch(function () {}); } }
  W.KHAudio = { load: load, unlock: unlock, ambience: ambience, cue: cue, setMuted: setMuted, setPaused: setPaused, isMuted: function () { return muted; }, files: files, currentAmbience: function () { return bedKey; } };
})(window);
