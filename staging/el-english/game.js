/* Eagle Legend English (el-english): subject config for the shared shell (kit/learn-shell.js). Original code, British English.
   Read-aloud uses Harper's LearnSpeak (local voices only, off by default); with no voice it shows the text instead. */
(function (W, D) {
  'use strict';
  var LS = W.LearnSpeak || null;
  function bgFor(id) { var s = id.split('.')[1]; return s === 'phonics' ? 'bg_phonics' : s === 'spell' ? 'bg_spelling' : s === 'grammar' ? 'bg_grammar' : 'bg_reading'; }
  function artHtml(item, A) { var a = item.prompt.art; if (!a || a.type !== 'card') return '';
    return '<img class="lm-picture" src="' + A + 'cards/card_' + a.word + '.webp" alt="Picture: ' + a.word + '">'; }
  function tileHtml(l, A) { return '<img src="' + A + 'tiles/tile_' + l + '.webp" alt=""><span class="sr">' + l + '</span>'; }
  var moth = new Image(); moth.src = 'assets/characters/bookmoth_idle_strip.webp'; var my = null;
  function drawScene(gg, c, s) { // the bookmoth guide drifts in the open space between the question and the answers
    var size = 70, lo = s.free.y1 - size * 0.6, hi = s.free.y0 + size * 0.6; if (lo < hi || !moth.complete || !moth.naturalWidth) return;
    var target = lo - (lo - hi) * s.k; my = my == null ? target : my + (target - my) * 0.05;
    var f = s.reduced ? 0 : Math.floor(s.t * 4) % 4, x = 300 + (s.reduced ? 0 : Math.sin(s.t * 0.6) * 8), y = my + (s.reduced ? 0 : Math.sin(s.t * 1.3) * 4);
    c.drawImage(moth, f * 512, 0, 512, 512, x - size / 2, y - size / 2, size, size); }
  LearnShell.start({ levels: [{ band: 1, label: 'Letter sounds and blending' }, { band: 2, label: 'Digraphs, tricky words and sentences' }, { band: 3, label: 'Word classes, tense and spelling patterns' }, { band: 4, label: 'Vocabulary and inference' }, { band: 5, label: 'Cohesion and paragraphs' }, { band: 6, label: 'Summary, purpose and register' }, { band: 7, label: 'Passive voice and the subjunctive' }, { band: 8, label: 'Language effects, persuasion and poetry' }], subject: 'english', slug: 'el-english', name: 'English', title: 'Eagle Legend English', howto: 'Answer at your own pace. Hints are always there.',
    tagline: 'Calm English practice that adjusts to you: phonics and spelling through to grammar, reading and writing. Any age welcome.', guide: 'characters/bookmoth_celebrate.webp',
    bgs: ['bg_reading', 'bg_phonics', 'bg_spelling', 'bg_grammar'], bgFor: bgFor, artHtml: artHtml, tileHtml: tileHtml, drawScene: drawScene, readAloudLabel: 'Read aloud',
    onSettings: function (s) { if (LS) try { if (LS.isEnabled() !== !!s.readAloud) LS.setEnabled(!!s.readAloud); } catch (e) {} },
    say: function (text, fallback) { if (!LS) return fallback(text); LS.speak(text, { onFallback: function (t) { fallback(t); } }); } });
})(window, document);
