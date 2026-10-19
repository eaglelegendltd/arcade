/* learn-shell.js - shared game shell for the Eagle Legend learning games (UI over learn-kit.js + eagle-bridge.js). Original code.
   A game calls LearnShell.start(cfg). Privacy: no network, no analytics; progress lives in localStorage only (ENGINE.md §1).
   Bridge events are the bridge's own plain-number start/score/levelup/gameover (the EAGLE_LEARN guard strips everything else). */
(function (W, D) {
  'use strict';
  var LK = W.LearnKit, A = 'assets/', ROUND = 10;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function start(cfg) {
    var SUBJ = cfg.subject, C = W.EAGLE_CONFIG || { tier: 'STANDARD' };
    var TITLE = C.tier === 'STANDARD' ? cfg.title : cfg.name; // partner / white-label builds: just the subject (§17)
    var session = LK.open(SUBJ), set = LK.settings.get(), g = null, pack = null;
    var ui, scr, top, live, sky, view = 'title', cur = null, round = null, placing = false, retry = false, lastMuted = null, wasPaused = false, musicOn = false, built = [], bgKey = null;
    function sfx(n, a) { if (g) g.sfx(n, a); }

    // ---------- settings / accessibility ----------
    function applySettings() {
      set = LK.settings.get(); var b = D.body.classList;
      b.toggle('hc', !!set.highContrast); b.toggle('dys', !!set.dyslexiaFont);
      var rm = set.reducedMotion == null ? (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) : set.reducedMotion;
      b.toggle('rm', !!rm); if (g) g.reducedMotion = !!rm;
      D.documentElement.style.setProperty('--ts', String(set.textSize || 1));
      if (cfg.onSettings) cfg.onSettings(set);
    }
    function setMuted(m) { if (!g) return; if (!!g.muted !== !!m) { var b = D.getElementById('eg-mute'); if (b) b.dispatchEvent(new Event('pointerdown')); } }
    function say(text) { if (!set.readAloud || !text) return; if (cfg.say) return cfg.say(text, showSpoken);
      if (!W.speechSynthesis) return showSpoken(text); try { W.speechSynthesis.cancel(); var u = new W.SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.95; W.speechSynthesis.speak(u); } catch (e) {} }
    function showSpoken(text) { if (cur && cur.prompt && cur.prompt.speakFallback) text = cur.prompt.speakFallback; var b = D.getElementById('lm-spoken'); if (b) { b.textContent = '\ud83d\udd08 ' + text; b.style.display = 'block'; } }
    function announce(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    function setBg(key) { if (key === bgKey || !sky) return; bgKey = key; sky.style.backgroundImage = 'url("' + A + 'backgrounds/' + key + '.webp")'; }

    // ---------- screens ----------
    function show(html, cls) { scr.className = 'lm-screen' + (cls ? ' ' + cls : ''); scr.innerHTML = html; scr.scrollTop = 0; fit();
      var f = scr.querySelector('[data-focus]') || scr.querySelector('button'); if (f && D.activeElement !== D.body) try { f.focus({ preventScroll: true }); } catch (e) {} }
    // stretch the UI layer to the real bottom edge, then shrink the picture/grid until the play view needs no scrolling
    // landscape (L2/L3): the UI layer spans the whole width, the question goes left and the answers right, and the
    // bridge's pause/mute buttons move to the right-hand edge so they no longer sit on the score
    function stretch() { var lm = D.getElementById('lm'), area = lm && lm.parentNode; if (!area || !area.getBoundingClientRect) return;
      var r = area.getBoundingClientRect(), vw = (W.visualViewport && W.visualViewport.width) || W.innerWidth, vh = (W.visualViewport && W.visualViewport.height) || W.innerHeight,
        land = vw > vh * 1.15, gl = land ? Math.max(0, Math.round(r.left)) : 0, gr = land ? Math.max(0, Math.round(vw - r.right)) : 0;
      D.body.classList.toggle('lm-land', land); lm.style.bottom = -Math.max(0, Math.round(vh - r.bottom)) + 'px'; lm.style.left = -gl + 'px'; lm.style.right = -gr + 'px';
      var mu = D.getElementById('eg-mute'), pa = D.getElementById('eg-pause');
      if (mu && pa) { mu.style.setProperty('right', (8 - gr) + 'px', 'important'); pa.style.setProperty('right', (64 - gr) + 'px', 'important'); }
      var lo = D.getElementById('eg-logo'); if (lo) { if (lo.__l0 == null) { lo.__l0 = lo.style.left; lo.__t0 = lo.style.top; }
        lo.style.left = land ? (64 - gl) + 'px' : lo.__l0; lo.style.top = land ? '10px' : lo.__t0; } }
    function fit() { stretch(); scr.classList.toggle('two', D.body.classList.contains('lm-land') && !!scr.querySelector('#lm-qcard')); if (!/\bplay\b/.test(scr.className)) { scr.style.removeProperty('--art'); return; }
      var a = 1; scr.style.setProperty('--art', a);
      var go = function () { while (scr.scrollHeight > scr.clientHeight + 1 && a > 0.36) { a = Math.round((a - 0.08) * 100) / 100; scr.style.setProperty('--art', a); } };
      go(); [].forEach.call(scr.querySelectorAll('img'), function (im) { if (!im.complete) im.addEventListener('load', go, { once: true }); }); }
    W.addEventListener('resize', function () { setTimeout(fit, 50); });
    function btn(act, label, cls, extra) { return '<button type="button" class="lm-btn ' + (cls || '') + '" data-act="' + act + '"' + (extra || '') + '>' + label + '</button>'; }
    function resetBtn() { return '<button type="button" class="lm-btn" data-act="reset" id="lm-reset"><img src="' + A + 'ui/icon_reset_level.webp" alt="" width="28" height="28" style="vertical-align:middle;margin-right:8px">Reset my level</button>'; }
    function title() {
      view = 'title'; setBg(cfg.bgs[0]);
      var fresh = session.needsPlacement(), img = 'title_card_900x1200_' + (C.tier === 'STANDARD' ? 'branded' : (C.tier === 'WHITE_LABEL' || C.tier === 'SOURCE' ? 'art' : 'subject'));
      show('<div class="lm-card"><img class="lm-title-art" src="' + A + 'promo/' + img + '.webp" alt=""><h1>' + esc(TITLE) + '</h1><p>' + esc(cfg.tagline) + '</p>' +
        (fresh ? '' : '<p class="lm-muted">Your personal best on this device: ' + (g ? g.best : 0) + '</p>') +
        btn(fresh ? 'begin' : 'play', fresh ? 'Get started' : 'Play a round', 'pri', ' data-focus') +
        '<div class="lm-row" style="margin-top:8px">' + btn('progress', 'My topics') + btn('settings', 'Settings') + '</div>' + resetBtn() + '</div>');
    }
    function placementChoice() { view = 'choice';
      show('<div class="lm-card"><h2>Where would you like to start?</h2><p>Want a quick check to find your starting point? About 3 minutes, and you can skip it.</p>' +
        btn('quick', 'Quick check', 'pri', ' data-focus') + btn('picker', 'I\u2019ll pick my level') + btn('beginning', 'Start at the beginning') + btn('title', 'Back') + '</div>'); }
    // plain Level list (cfg.levels: [{band, label}]); curriculum / exam-board / year-group options only when LEARN_CURRICULUM_PICKER is on
    function picker(fw) {
      view = 'picker'; var cs = LK.pickers(), h = '<div class="lm-card"><h2>Pick your level</h2>';
      if (!fw) { h += '<p>This only sets where questions start. The game keeps adjusting as you play, and you can change it any time.</p>';
        var have = {}; LK.skillIds(SUBJ).forEach(function (id) { have[LK.skill(id).band] = 1; });
        (cfg.levels || []).filter(function (l) { return have[l.band]; }).forEach(function (l, i) { h += btn('band', '<strong>Level ' + (i + 1) + '</strong> \u00b7 ' + esc(l.label), 'lm-level', ' data-v="' + l.band + '"'); });
        if (cs.length) h += btn('fws', 'Choose by school year or course'); h += btn('choice', 'Back'); }
      else if (fw === '*') { cs.forEach(function (f) { h += btn('fw', esc(f.name), '', ' data-v="' + esc(f.id) + '"'); }); h += btn('picker', 'Back'); }
      else { var f = cs.filter(function (x) { return x.id === fw; })[0]; if (!f) return picker(); h += '<p>' + esc(f.name) + '</p>';
        f.levels.forEach(function (l) { h += btn('lvl', esc(l.label), '', ' data-fw="' + esc(fw) + '" data-v="' + esc(l.id) + '"'); }); h += btn('fws', 'Back'); }
      show(h + '</div>');
    }
    function startHere(msg) { sfx('placementDone'); view = 'placed';
      show('<div class="lm-card"><h2>All set</h2><p>' + esc(msg) + '</p>' + btn('play', 'Start a round', 'pri', ' data-focus') + btn('title', 'Menu') + '</div>'); announce(msg); }

    // ---------- question view ----------
    function fmt(v) { return esc(typeof v === 'number' && v < 0 ? '\u2212' + Math.abs(v) : v); }
    function question(item, note) {
      cur = item; retry = false; built = []; view = 'q'; var n = placing ? session.placement.asked + 1 : round.i + 1, pr = item.prompt;
      var meta = placing ? 'Quick check \u00b7 question ' + n + ' of up to 12' : 'Question ' + n + ' of ' + ROUND + (item.review ? ' \u00b7 a quick look back' : '');
      var h = '<div class="lm-card" aria-live="polite" id="lm-qcard"><div class="lm-meta"><span>' + meta + '</span><span>' + esc(LK.skill(item.skill).title) + '</span></div>' +
        (pr.passage ? '<div class="lm-passage">' + esc(pr.passage) + '</div>' : '') + '<p class="lm-prompt" id="lm-q">' + esc(pr.text) + '</p>' +
        (pr.code ? '<code class="lm-code" aria-label="Code">' + esc(pr.code) + '</code>' : '') +
        '<div class="lm-art">' + (cfg.artHtml ? cfg.artHtml(item, A) : '') + '</div><div id="lm-spoken" class="lm-muted" style="display:none" role="status"></div><div id="lm-hintbox"></div></div>' +
        '<div class="lm-tools">' + (placing ? btn('pskip', 'Skip the check') : btn('hint', '<img src="' + A + 'ui/button_icon_hint.webp" alt="" width="22" height="22" style="vertical-align:middle;margin-right:6px">Hint') + btn('skip', 'Skip')) +
        (set.readAloud ? btn('speak', 'Hear it', '', ' aria-label="Read the question aloud"') : '') + '</div>';
      if (item.kind === 'tiles' || item.kind === 'program') h += buildHtml(item);
      else { var long = item.choices.some(function (c) { return String(c).length > 12; });
        h += '<div class="lm-answers' + (long ? ' long' : '') + '" role="group" aria-labelledby="lm-q" id="lm-answers">';
        item.choices.forEach(function (c, i) { h += '<button type="button" class="lm-ans" data-act="ans" data-i="' + i + '" aria-label="Answer ' + (i + 1) + ': ' + esc(c) + '"><span class="k" aria-hidden="true">' + (i + 1) + '</span><span>' + fmt(c) + '</span></button>'; });
        h += '</div>'; }
      show(h, 'play'); if (cfg.drawArt) cfg.drawArt(item, set);
      if (item.preHint && item.hints) showHint(item.hints[0], 1, 'Here\u2019s a head start.');
      if (cfg.bgFor) setBg(cfg.bgFor(item.skill));
      say(pr.speak || pr.text); if (note) announce(note);
    }
    // tiles / program building: tap a palette piece to add it, tap a placed piece to remove it; dragging onto the build area also adds it
    function buildHtml(item) {
      var isP = item.kind === 'program', pal = isP ? item.blocks : item.tiles, h = '<div class="lm-card"><div class="lm-build" id="lm-build" aria-live="polite" aria-label="' + (isP ? 'Your program' : 'Your word') + '"></div>' +
        '<p class="lm-muted lm-howto">' + (isP ? 'Tap or drag blocks to add. Tap one above to remove it.' + (item.maxBlocks ? ' Max ' + item.maxBlocks + ' blocks.' : '') : 'Tap or drag letters to spell. Tap one above to remove it.') + '</p>' +
        '<div class="lm-palette" role="group" aria-label="' + (isP ? 'Blocks' : 'Letters') + '">';
      pal.forEach(function (p, i) { h += piece(item, p, 'add', i); });
      return h + '</div></div><div class="lm-row">' + btn('clear', 'Clear') + btn('check', isP ? 'Run program' : 'Check', 'pri') + '</div>';
    }
    function piece(item, p, act, i) { var isP = item.kind === 'program', lab = isP ? cfg.blockLabel(p) : p;
      return '<button type="button" class="' + (isP ? 'lm-block' : 'lm-tile') + '" data-act="' + act + '" data-i="' + i + '" data-v="' + esc(p) + '" aria-label="' + (act === 'add' ? 'Add ' : 'Remove ') + esc(lab) + '">' + (isP ? cfg.blockHtml(p, A) : cfg.tileHtml(p, A)) + '</button>'; }
    function renderBuilt() { var b = D.getElementById('lm-build'); if (!b) return; var item = cur;
      b.innerHTML = built.length ? built.map(function (p, i) { return (item.kind === 'program' ? '<span class="lm-step" aria-hidden="true">' + (i + 1) + '</span>' : '') + piece(item, p, 'remove', i); }).join('') : '<span class="ph">' + (item.kind === 'program' ? 'Empty program' : 'Empty') + '</span>';
      if (cfg.drawArt && item.kind === 'program') cfg.drawArt(item, set, built); }
    function addPiece(v) { if (cur.maxBlocks && built.length >= cur.maxBlocks + 2) return; built.push(v); sfx('tap'); renderBuilt(); }
    function response() { return cur.kind === 'program' ? built.join(',') : built.join(''); }
    // drag support (pointer events); a tap still works without dragging (WCAG 2.5.7)
    var drag = null;
    function onDown(e) { var b = e.target.closest && e.target.closest('[data-act=add]'); if (!b) return; drag = { b: b, x: e.clientX, y: e.clientY, moved: false, ghost: null }; }
    function onMove(e) { if (!drag) return; if (!drag.moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 10) return;
      if (!drag.moved) { drag.moved = true; drag.ghost = drag.b.cloneNode(true); drag.ghost.className += ' lm-ghost'; D.body.appendChild(drag.ghost); }
      drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; var bd = D.getElementById('lm-build'); if (bd) bd.classList.toggle('over', over(bd, e)); }
    function over(bd, e) { var r = bd.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 20 && e.clientY <= r.bottom + 20; }
    function onUp(e) { if (!drag) return; var d = drag; drag = null; if (!d.moved) return; d.ghost.remove(); var bd = D.getElementById('lm-build'); if (bd) { bd.classList.remove('over'); if (over(bd, e)) addPiece(d.b.getAttribute('data-v')); }
      d.b.__dragged = true; setTimeout(function () { d.b.__dragged = false; }, 0); }

    function showHint(text, level, lead) { var b = D.getElementById('lm-hintbox'); if (!b) return;
      b.innerHTML = '<div class="lm-hint" role="status"><img src="' + A + 'ui/icon_hint.webp" alt=""><div><strong>' + esc(lead || ('Hint ' + level + ' of 3')) + '</strong><br>' + esc(text) + '</div></div>'; say(text); }
    function doHint() { if (!cur || placing || (cur.hintLevel || 0) >= 3) return; var h = session.hint(cur); sfx('hint');
      showHint(h.text, h.level, h.level === 3 ? 'Worked answer' : null); if (h.level >= 3) { var hb = scr.querySelector('[data-act=hint]'); if (hb) hb.disabled = true; } }
    function submit(v, btnEl) {
      if (!cur) return; var item = cur; sfx('select');
      if (placing) { var nx = session.placementAnswer(item, v); if (nx) question(nx); else { placing = false; startHere('Thanks, we\u2019ll start you here and adjust as you play.'); } return; }
      if (retry) { var okr = session.check(item, v); if (btnEl) btnEl.classList.add(okr ? 'sel-ok' : 'sel-no');
        feedback(okr, okr ? 'That\u2019s it. Well worked out.' : 'Not this time. Here\u2019s the worked answer: ' + item.worked, null); return; }
      var r = session.answer(item, v); if (btnEl) btnEl.classList.add(r.correct ? 'sel-ok' : 'sel-no');
      if (r.correct) { if (r.hintLevel < 3) g.addScore(r.hintLevel ? 5 : 10); round.right++; sfx('correct', round.run = (round.run || 0) + 1); } else { round.run = 0; sfx('tryAgain'); }
      if (r.mastered.length) { round.mastered = round.mastered.concat(r.mastered); setTimeout(function () { sfx('mastered'); }, 450); } else if (r.unlocked.length) setTimeout(function () { sfx('unlock'); }, 450);
      round.k = Math.min(ROUND, (round.k || 0) + (r.correct ? 1 : 0.4)); feedback(r.correct, r.feedback, r);
    }
    function answerText(item) { return item.kind === 'program' ? (item.sample ? item.sample.split(',').map(cfg.blockLabel).join(', ') : '') : fmt(item.answer); }
    function feedback(ok, text, r) {
      var item = cur, h = '<div class="lm-fb ' + (ok ? 'ok' : 'no') + '"><img src="' + A + 'ui/' + (ok ? 'icon_correct' : 'icon_tryagain') + '.webp" alt=""><div><span aria-hidden="true">' + (ok ? '\u2713 ' : '\u21bb ') + '</span><span class="lm-fbt">' + esc(text) + '</span></div></div>';
      if (r && r.mastered.length) h += '<p><strong>New topic mastered:</strong> ' + esc(LK.skill(r.mastered[0]).title) + '.</p>';
      else if (r && r.unlocked.length) h += '<p class="lm-muted">A new topic has opened up: ' + esc(LK.skill(r.unlocked[0]).title) + '.</p>';
      var next = placing ? '' : round.i + 1 >= ROUND ? 'Finish round' : 'Next question', acts;
      if (!ok && r && !retry) { // neutral feedback, a hint, then try again or move on
        item.hintLevel = Math.min(3, (item.hintLevel || 0) + 1) - 1; var hh = session.hint(item);
        h += '<div class="lm-hint"><img src="' + A + 'ui/icon_hint.webp" alt=""><div><strong>' + (hh.level === 3 ? 'Worked answer' : 'Hint') + '</strong><br>' + esc(hh.text) + '</div></div>';
        acts = (hh.level < 3 ? btn('retry', 'Try again', 'pri', ' data-focus') : '') + btn('next', next, hh.level < 3 ? '' : 'pri', hh.level < 3 ? '' : ' data-focus'); say(text + ' ' + hh.text);
      } else { acts = btn('next', next, 'pri', ' data-focus'); say(text); }
      var at = ok ? answerText(item) : '';
      show('<div class="lm-card" role="status">' + h + '</div><div class="lm-card"><p class="lm-prompt" style="font-size:1.05em">' + esc(item.prompt.text) + '</p>' + (at ? '<p class="lm-muted">Answer: ' + at + '</p>' : '') +
        (cfg.feedbackArt ? cfg.feedbackArt(item, A, ok) : '') + '</div>' + acts, 'play');
      if (cfg.drawFeedback) cfg.drawFeedback(item, set, built); announce((ok ? 'Correct. ' : 'Not quite. ') + text);
    }
    function retryItem() { var it = cur; question(it); retry = true; cur = it; if (it.hintLevel) showHint(it.hints[Math.min(it.hintLevel, it.hints.length) - 1], it.hintLevel); }
    function nextQ() { round.i++; if (round.i >= ROUND) return endRound(); question(session.next()); }

    // ---------- rounds ----------
    function playRound() { if (!g) return; placing = false; g._api.start(); }
    function beginRound() { round = { i: 0, right: 0, mastered: [], run: 0, k: 0 }; g.data = {}; sfx('start'); question(session.next()); }
    function endRound() {
      session.save(); var sc = g.score; g.gameOver(''); view = 'end'; var m = round.mastered.map(function (id) { return esc(LK.skill(id).title); });
      show('<div class="lm-card" role="status"><img src="' + A + cfg.guide + '" alt="" width="120" height="120" style="float:right">' +
        '<h2>Round complete</h2><p>You answered ' + round.right + ' of ' + ROUND + ' correctly and scored ' + sc + '.</p>' +
        (m.length ? '<p>Mastered this round: ' + m.join(', ') + '.</p>' : '<p>Every question helps the game fit the next round to you.</p>') +
        '<p class="lm-muted">Personal best on this device: ' + g.best + '</p></div>' + btn('play', 'Another round', 'pri', ' data-focus') + btn('progress', 'My topics') + btn('title', 'Menu'));
    }

    // ---------- topics, settings, dialogs ----------
    function progress() { view = 'progress'; var p = session.progress(), lab = { mastered: '\u2713 Mastered', open: '\u25cb Open', locked: '\u25a1 Not yet open' };
      var h = '<div class="lm-card"><h2>My topics</h2><p class="lm-muted">Only you can see this. Earlier topics come back now and then to keep them fresh.</p><ul class="lm-list">';
      p.skills.forEach(function (s) { h += '<li><span class="st">' + lab[s.state] + '</span><span>' + esc(s.title) + '</span></li>'; }); show(h + '</ul>' + btn('title', 'Back', 'pri') + '</div>'); }
    function tg(key, label, val, on) { return '<button type="button" class="lm-toggle" data-act="set" data-k="' + key + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span>' + label + '</span><span class="v">' + val + '</span></button>'; }
    function settings() {
      view = 'settings'; set = LK.settings.get(); var muted = g ? !!g.muted : !!set.mute, rm = D.body.classList.contains('rm');
      show('<div class="lm-card"><h2>Settings</h2>' + tg('sound', 'Sound', muted ? 'Off' : 'On', !muted) + tg('music', 'Calm music', set.music ? 'On' : 'Off', set.music) +
        tg('readAloud', cfg.readAloudLabel || 'Read questions aloud', set.readAloud ? 'On' : 'Off', set.readAloud) + tg('textSize', 'Text size', Math.round((set.textSize || 1) * 100) + '%', set.textSize > 1) +
        tg('highContrast', 'High contrast', set.highContrast ? 'On' : 'Off', set.highContrast) + tg('dyslexiaFont', 'Easier-reading spacing', set.dyslexiaFont ? 'On' : 'Off', set.dyslexiaFont) +
        tg('reducedMotion', 'Reduce motion', rm ? 'On' : 'Off', rm) + '</div>' +
        '<div class="lm-card"><h2>Your progress</h2><p id="lm-privacy">Your progress is saved only on this device. Nothing is sent anywhere. You can reset or export it at any time.</p>' +
        resetBtn() + btn('export', 'Save my progress to a file') + btn('import', 'Load progress from a file') + '<input type="file" id="lm-file" accept=".json,application/json" class="sr" tabindex="-1" aria-hidden="true">' +
        btn('clearall', 'Clear everything') + '</div>' + btn('title', 'Back', 'pri'));
    }
    function toggle(k) { var s = LK.settings.get();
      if (k === 'sound') { setMuted(!g.muted); LK.settings.set({ mute: !!g.muted }); }
      else if (k === 'textSize') { var steps = [1, 1.25, 1.5, 2], i = steps.indexOf(s.textSize); LK.settings.set({ textSize: steps[(i + 1) % steps.length] }); }
      else if (k === 'reducedMotion') LK.settings.set({ reducedMotion: !D.body.classList.contains('rm') });
      else { var p = {}; p[k] = !s[k]; LK.settings.set(p); }
      sfx('toggle'); applySettings(); var y = scr.scrollTop; settings(); scr.scrollTop = y; var b = scr.querySelector('[data-k="' + k + '"]'); if (b) b.focus(); }
    function confirmBox(text, yes, onYes) {
      var m = el('div', 'lm-modal'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'lm-dlg');
      m.innerHTML = '<div class="lm-card"><p id="lm-dlg">' + esc(text) + '</p><div class="lm-row"><button type="button" class="lm-btn" data-d="no">Cancel</button><button type="button" class="lm-btn pri" data-d="yes">' + esc(yes) + '</button></div></div>';
      ui.appendChild(m); var prev = D.activeElement; m.querySelector('[data-d=no]').focus();
      m.addEventListener('click', function (e) { var d = e.target.closest('[data-d]'); if (!d) return; m.remove(); if (d.getAttribute('data-d') === 'yes') onYes(); else if (prev && prev.focus) prev.focus(); });
      m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { m.remove(); if (prev && prev.focus) prev.focus(); } }); }
    // quiet status message: small pill at the bottom, never over the header, fades on its own (screen readers get it via role=status)
    var noticeT = null;
    function notice(text, ms) { [].forEach.call(D.querySelectorAll('.lm-notice'), function (o) { o.remove(); }); clearTimeout(noticeT);
      var n = el('div', 'lm-notice'), c = el('div', 'lm-card'); c.setAttribute('role', 'status'); c.textContent = text; n.appendChild(c); ui.appendChild(n);
      noticeT = setTimeout(function () { n.classList.add('gone'); setTimeout(function () { n.remove(); }, 450); }, ms || 3000); }
    // L1: the bridge's personal-best key goes too (memory and storage)
    function clearBest() { if (g) g.best = 0; try { W.localStorage.removeItem('eagle-best-' + cfg.slug); } catch (e) {} }
    function doReset() { confirmBox('This clears your level, progress and personal best for ' + cfg.name + ' on this device. Your settings stay.', 'Reset my level', function () {
      LK.reset(SUBJ); clearBest(); session = LK.open(SUBJ); if (g && g.state === 'play') g.state = 'title'; round = null; cur = null; placing = false; placementChoice(); announce('Your level has been reset.'); }); }
    function doImport(file) { LK.importFile(file, SUBJ).then(function (r) { if (!r.ok) return notice(r.reason);
      confirmBox('Load this progress file? It has ' + r.skills + ' topics and replaces your current ' + cfg.name + ' progress on this device.', 'Load it', function () { r.apply(); session = LK.open(SUBJ); notice('Progress loaded.'); title(); }); }); }

    // ---------- events ----------
    function onAct(e) {
      var b = e.target.closest('[data-act]'); if (!b || b.disabled || b.__dragged) return; var a = b.getAttribute('data-act');
      if (!/^(ans|set|add|remove|check)$/.test(a)) sfx(a === 'title' || a === 'choice' ? 'back' : 'tap');
      switch (a) {
        case 'begin': case 'choice': placementChoice(); break; case 'title': title(); break;
        case 'play': if (session.needsPlacement()) placementChoice(); else playRound(); break;
        case 'quick': placing = true; question(session.startPlacement()); break;
        case 'pskip': placing = false; session.startAtBeginning(); startHere('No problem. We\u2019ll start at the beginning and adjust as you play.'); break;
        case 'picker': picker(); break; case 'fws': picker('*'); break; case 'fw': picker(b.getAttribute('data-v')); break;
        case 'band': session.pickBand(+b.getAttribute('data-v')); startHere('Thanks, we\u2019ll start you there and adjust as you play.'); break;
        case 'lvl': session.pickLevel(b.getAttribute('data-fw'), b.getAttribute('data-v')); startHere('Thanks, we\u2019ll start you there and adjust as you play.'); break;
        case 'beginning': session.startAtBeginning(); startHere('We\u2019ll start at the beginning and adjust as you play.'); break;
        case 'ans': submit(cur.choices[+b.getAttribute('data-i')], b); break; case 'hint': doHint(); break;
        case 'add': addPiece(b.getAttribute('data-v')); break; case 'remove': built.splice(+b.getAttribute('data-i'), 1); sfx('back'); renderBuilt(); break;
        case 'clear': built = []; renderBuilt(); break;
        case 'check': if (!built.length) { announce('Add something first.'); break; } submit(response(), null); break;
        case 'speak': say(cur.prompt.speak || cur.prompt.text); break;
        case 'skip': session.skip(cur); round.run = 0; round.k = Math.min(ROUND, (round.k || 0) + 0.2); nextQ(); break;
        case 'retry': retryItem(); break; case 'next': if (placing) break; nextQ(); break;
        case 'progress': progress(); break; case 'settings': settings(); break; case 'set': toggle(b.getAttribute('data-k')); break;
        case 'reset': doReset(); break;
        case 'export': try { LK.exportFile(SUBJ); notice('Your progress file has been saved to your downloads.'); } catch (er) { notice('Couldn\u2019t save a file on this browser.'); } break;
        case 'import': var f = D.getElementById('lm-file'); f.value = ''; f.onchange = function () { if (f.files[0]) doImport(f.files[0]); }; f.click(); break;
        case 'clearall': confirmBox('This removes all Eagle Legend learning progress, personal bests and settings on this device.', 'Clear everything', function () { LK.resetAll(); clearBest(); if (W.LearnSpeak && W.LearnSpeak.setEnabled) try { W.LearnSpeak.setEnabled(false); W.localStorage.removeItem('learnSpeakEnabled'); } catch (e) {} session = LK.open(SUBJ); applySettings(); title(); }); break;
        case 'menu': session.save(); if (g.state === 'play') g.state = 'title'; placing = false; title(); break;
      }
    }
    function onKey(e) {
      if (e.code === 'Space' && !(e.target && e.target.closest && e.target.closest('button'))) e.stopImmediatePropagation(); // the bridge uses Space to start its own run
      if (D.querySelector('.lm-modal[role=dialog]') || wasPaused || view !== 'q') return;
      if (/^[1-4]$/.test(e.key) && cur && cur.kind === 'choice') { var bs = scr.querySelectorAll('.lm-ans'); if (bs[+e.key - 1]) { e.preventDefault(); bs[+e.key - 1].click(); } }
      else if (e.key === 'h' || e.key === 'H') doHint();
      else if (cur && cur.kind === 'tiles' && /^[a-z]$/i.test(e.key)) { var t = scr.querySelector('[data-act=add][data-v="' + e.key.toLowerCase() + '"]'); if (t) { e.preventDefault(); t.click(); } }
      else if (cur && cur.kind !== 'choice' && e.key === 'Backspace' && built.length) { e.preventDefault(); built.pop(); renderBuilt(); }
    }

    // ---------- canvas layer: the full-screen background is a CSS layer (#lm-sky); the canvas carries only the animated guide ----------
    function freeZone(gg) { // logical-space gap between the question card and the answer zone, so the guide never hides behind UI
      var k = gg.view.css.w / 360, ar = D.getElementById('eg-area').getBoundingClientRect(), card = D.getElementById('lm-qcard'), ans = D.getElementById('lm-answers') || scr.querySelector('.lm-tools');
      var y0 = card ? (card.getBoundingClientRect().bottom - ar.top) / k : 140, y1 = ans ? (ans.getBoundingClientRect().top - ar.top) / k : 560;
      if (ans && ans.id !== 'lm-answers' && view === 'q') { var t = scr.querySelector('.lm-tools'); y1 = t ? (t.getBoundingClientRect().top - ar.top) / k : y1; }
      return { y0: Math.max(100, y0), y1: Math.min(gg.safeBottom || 640, y1) };
    }
    function drawScene(gg, c) {
      c.clearRect(-10, -10, 380, 660); var tp = D.getElementById('eg-mute'); if (tp && top) top.style.top = tp.style.top || '8px';
      if (gg.state !== 'play' || view === 'title' || !cfg.drawScene) return;
      cfg.drawScene(gg, c, { free: freeZone(gg), k: (round ? round.k : 0) / ROUND, t: gg.t, reduced: !!gg.reducedMotion, view: view });
    }
    function sync(gg) {
      var paused = gg.hostPaused || gg.paused || gg.hidden;
      if (paused !== wasPaused) { wasPaused = paused; if (paused) { session.save(); if (W.speechSynthesis) try { W.speechSynthesis.cancel(); } catch (e) {} }
        var po = D.getElementById('lm-pause'); if (po) po.style.display = paused && gg.state === 'play' ? 'flex' : 'none'; }
      if (gg.muted !== lastMuted) { lastMuted = gg.muted; if (LK.settings.get().mute !== !!gg.muted) LK.settings.set({ mute: !!gg.muted }); }
      var want = !!(set.music && !gg.muted && !paused && pack && pack.music);
      if (want !== musicOn) { musicOn = want; try { if (want) { pack.music.setVolume(0.25); pack.music.play(); } else pack.music.stop(); } catch (e) {} }
    }

    // ---------- boot ----------
    function boot() {
      applySettings(); W.addEventListener('keydown', onKey, true);
      g = EagleGame.run({ id: cfg.slug, title: TITLE, howto: cfg.howto, art: [], achievements: [], likeScore: Infinity, levelEvery: 100, overSfx: 'roundEnd',
        logo: { side: 'left', top: 60 }, fill: { top: 'transparent', bottom: 'transparent' }, reskinKeys: [],
        init: function (gg) { if (gg.state === 'play') beginRound(); else gg.data = {}; }, update: function () {}, draw: function (gg, c) { drawScene(gg, c); sync(gg); } });
      if (!g) return; // licence gate showed its own screen
      pack = W.AudioKit && W.AudioKit.games ? W.AudioKit.games[cfg.slug] : null;
      var wrap = D.getElementById('eg-wrap'); sky = el('div'); sky.id = 'lm-sky'; sky.setAttribute('aria-hidden', 'true'); wrap.insertBefore(sky, wrap.firstChild);
      var area = D.getElementById('eg-area'); ui = el('div'); ui.id = 'lm'; area.appendChild(ui);
      top = el('div', 'lm-top', '<button type="button" class="lm-icon" data-act="menu" aria-label="Menu">\u2630</button>'); ui.appendChild(top);
      scr = el('div', 'lm-screen'); ui.appendChild(scr); live = el('div', 'sr'); live.setAttribute('aria-live', 'polite'); ui.appendChild(live);
      var po = el('div', 'lm-modal', '<div class="lm-card" style="text-align:center"><h2>Paused</h2><p>Your progress is saved.</p><button type="button" class="lm-btn pri" id="lm-resume">Resume</button></div>');
      po.id = 'lm-pause'; po.style.display = 'none'; ui.appendChild(po); po.querySelector('#lm-resume').addEventListener('click', function () { g.hostPaused = false; g._api.resume(); });
      ui.addEventListener('click', onAct); ui.addEventListener('pointerdown', onDown); W.addEventListener('pointermove', onMove); W.addEventListener('pointerup', onUp);
      if (set.mute) setMuted(true);
      LK.on('storage-error', function (e) { notice(e.message, 8000); }); if (!LK.storageOk()) notice('Progress won\u2019t be saved on this browser.', 8000);
      if (session.readOnly) notice('This progress was saved by a newer version. You can reset or export it in Settings.', 8000);
      W.__elLearn = { session: function () { return session; }, g: g, view: function () { return view; }, current: function () { return cur; }, built: function () { return built; } }; // test hook, in-page only
      title();
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
  }
  W.LearnShell = { start: start };
})(window, document);
