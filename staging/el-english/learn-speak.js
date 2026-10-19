/* LearnSpeak - optional spoken phonics/words via the browser's built-in speechSynthesis. No licensed voices, no network calls by this code.
   OFF by default; the game must call LearnSpeak.setEnabled(true) from a user toggle. Never throws; falls back to showing text. */
(function (root) {
  'use strict';
  var KEY = 'learnSpeakEnabled', synth = root.speechSynthesis || null, voice = null, enabled = false, rate = 0.8, pitch = 1.05,
      allowNetwork = false, fallbackFn = null, speaking = 0, voicesReady = false;
  try { enabled = root.localStorage && localStorage.getItem(KEY) === '1'; } catch (e) {}
  // Phase 2-3 (Letters and Sounds) phonemes -> speakable spellings. Key = grapheme (or phoneme label), value = spelling the TTS says.
  var PHONEMES = {
    // Phase 2
    s: 'sss', a: 'ah', t: 'tuh', p: 'puh', i: 'ih', n: 'nnn', m: 'mmm', d: 'duh', g: 'guh', o: 'oh', c: 'kuh', k: 'kuh', ck: 'kuh', e: 'eh', u: 'uh', r: 'rrr',
    h: 'huh', b: 'buh', f: 'fff', ff: 'fff', l: 'lll', ll: 'lll', ss: 'sss',
    // Phase 3
    j: 'juh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz', zz: 'zzz', qu: 'kwuh', ch: 'ch', sh: 'shh', th: 'thh', ng: 'ng', nk: 'nk',
    ai: 'ay', ee: 'ee', igh: 'eye', oa: 'oh', oo: 'oo', 'oo-short': 'uh', ar: 'ar', or: 'or', ur: 'er', ow: 'ow', oi: 'oy', ear: 'ear', air: 'air', er: 'uh',
    // rest of the 44 phonemes (Phase 4-5 spellings)
    'th-voiced': 'the', zh: 'zhh', ure: 'oor', 'ay': 'ay', 'ie': 'eye', 'ue': 'you'
  };
  var listeners = { change: [], boundary: [], start: [], end: [], fallback: [] };
  function emit(n, d) { (listeners[n] || []).forEach(function (f) { try { f(d); } catch (e) {} }); }
  function isLocal(v) { return v && v.localService !== false; }
  function pickVoice() {
    if (!synth) return null;
    var vs = []; try { vs = synth.getVoices() || []; } catch (e) {}
    if (vs.length) voicesReady = true;
    var ok = vs.filter(function (v) { return allowNetwork || isLocal(v); });
    function find(re) { for (var i = 0; i < ok.length; i++) if (re.test((ok[i].lang || '').replace('_', '-'))) return ok[i]; return null; }
    voice = find(/^en-GB/i) || find(/^en-(IE|AU|NZ)/i) || find(/^en/i) || null;
    return voice;
  }
  if (synth) { pickVoice(); try { synth.addEventListener ? synth.addEventListener('voiceschanged', pickVoice) : (synth.onvoiceschanged = pickVoice); } catch (e) {} }
  function duck() { if (root.LearnAudio) root.LearnAudio.duck(); }
  function unduck() { if (root.LearnAudio) root.LearnAudio.unduck(); }
  function muted() { var K = root.AudioKit; return !!(K && (K.isMuted() || K.isPaused())); }
  function fallback(text, why, opts) { emit('fallback', { text: text, reason: why }); if (opts && opts.onFallback) try { opts.onFallback(text, why); } catch (e) {} else if (fallbackFn) try { fallbackFn(text, why); } catch (e) {} return Promise.resolve({ spoken: false, reason: why }); }
  // speak(text, {onWord(index, charIndex, word), rate, onFallback}) -> Promise<{spoken, reason?}>
  function speak(text, opts) {
    opts = opts || {}; text = String(text || '');
    if (!enabled) return fallback(text, 'disabled', opts);
    if (muted()) return fallback(text, 'muted', opts);
    if (!synth || typeof root.SpeechSynthesisUtterance !== 'function') return fallback(text, 'unsupported', opts);
    if (!voice) pickVoice();
    if (!voice) return fallback(text, voicesReady ? 'no-local-voice' : 'no-voice', opts);
    return new Promise(function (resolve) {
      var u, done = false, words = [], re = /\S+/g, m;
      while ((m = re.exec(text))) words.push({ i: m.index, w: m[0] });
      function finish(r) { if (done) return; done = true; speaking = Math.max(0, speaking - 1); if (!speaking) unduck(); clearTimeout(guard); emit('end', r); resolve(r); }
      try {
        u = new SpeechSynthesisUtterance(text); u.voice = voice; u.lang = voice.lang; u.rate = opts.rate || rate; u.pitch = pitch; u.volume = 1;
        u.onstart = function () { emit('start', { text: text }); };
        u.onboundary = function (e) { if (e.name && e.name !== 'word') return; var k = 0; for (var j = 0; j < words.length; j++) if (words[j].i <= e.charIndex) k = j;
          var d = { index: k, charIndex: e.charIndex, word: words[k] && words[k].w }; emit('boundary', d); if (opts.onWord) try { opts.onWord(d.index, d.charIndex, d.word); } catch (x) {} };
        u.onend = function () { finish({ spoken: true }); };
        u.onerror = function (e) { var r = { spoken: false, reason: 'error:' + (e && e.error) }; if (opts.onFallback) try { opts.onFallback(text, r.reason); } catch (x) {} else if (fallbackFn) try { fallbackFn(text, r.reason); } catch (x) {} finish(r); };
        speaking++; duck(); synth.speak(u);
      } catch (e) { speaking = Math.max(0, speaking - 1); unduck(); fallback(text, 'error:' + e.message, opts).then(resolve); return; }
      // guard: some engines never fire onend (or no audio device); release ducking after a generous estimate.
      var guard = setTimeout(function () { finish({ spoken: false, reason: 'timeout' }); }, 1500 + text.length * 180 / (opts.rate || rate));
    });
  }
  function sayPhoneme(g, opts) { var k = String(g).toLowerCase(), s = PHONEMES[k]; if (!s) return fallback(g, 'unknown-phoneme', opts); return speak(s, Object.assign({ rate: 0.7 }, opts || {})); }
  // sayWordSounds('cat') -> "kuh ... ah ... tuh ... cat" using greedy longest grapheme match (igh, ch, ee...).
  function segment(word) { var w = String(word).toLowerCase(), out = [], i = 0; while (i < w.length) { var hit = null; for (var L = 3; L >= 1; L--) { var g = w.substr(i, L); if (PHONEMES[g] && g.length === L) { hit = g; break; } } out.push(hit || w[i]); i += hit ? hit.length : 1; } return out; }
  function sayWordSounds(word, opts) { var seg = segment(word), txt = seg.map(function (g) { return PHONEMES[g] || g; }).join(', ') + '. ' + word; return speak(txt, Object.assign({ rate: 0.7 }, opts || {})); }
  function stop() { try { synth && synth.cancel(); } catch (e) {} speaking = 0; unduck(); }
  function setEnabled(on) { enabled = !!on; try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {} if (!enabled) stop(); emit('change', { enabled: enabled }); }
  // kit pause/mute stop speech too
  root.addEventListener && root.addEventListener('message', function (e) { var d = e.data, t = d && (d.type || d); if (t === 'mute' || t === 'pause') stop(); });
  root.document && document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  root.LearnSpeak = {
    speak: speak, sayWord: speak, saySentence: speak, sayPhoneme: sayPhoneme, sayWordSounds: sayWordSounds, segment: segment, stop: stop,
    setEnabled: setEnabled, isEnabled: function () { return enabled; }, toggle: function () { setEnabled(!enabled); return enabled; },
    isAvailable: function () { return !!(synth && (voice || pickVoice())); },
    getVoice: function () { return voice ? { name: voice.name, lang: voice.lang, local: isLocal(voice) } : null; },
    listVoices: function () { try { return (synth ? synth.getVoices() : []).map(function (v) { return { name: v.name, lang: v.lang, local: isLocal(v) }; }); } catch (e) { return []; } },
    setVoiceByName: function (n) { var vs = synth ? synth.getVoices() : []; for (var i = 0; i < vs.length; i++) if (vs[i].name === n && (allowNetwork || isLocal(vs[i]))) { voice = vs[i]; return true; } return false; },
    setRate: function (r) { rate = Math.max(0.5, Math.min(1.2, r)); }, getRate: function () { return rate; },
    allowNetworkVoices: function (b) { allowNetwork = !!b; pickVoice(); }, // off by default: network voices may send text to a cloud service
    setFallback: function (fn) { fallbackFn = fn; }, on: function (n, f) { (listeners[n] = listeners[n] || []).push(f); },
    PHONEMES: PHONEMES
  };
})(window);
