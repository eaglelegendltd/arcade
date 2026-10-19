/* Kettle Hours engine. Data-driven narrative café sim. All story text comes from JSON packs (content/).
   Safety features (help button, content warnings, skip, breathe, local-only save, accessibility) live here,
   not in content, so every pack gets them. */
(function (W, D) {
  'use strict';
  // ---------- showcase config (public showcase, not a licensed build) ----------
  // Disclaimer and partner CTA wording: Sienna, 18 Oct. Publication date and enquiry email: RICHIE TO CONFIRM before release.
  var KH_PUBLISHED = ''; // @release-stamp: filled by tools/stamp-release.js; empty = date line hidden
  var KH_DISCLAIMER = "Kettle Hours is a demonstration game. It isn't medical advice, a diagnosis or certified training. The information was correct when we published it" + (KH_PUBLISHED ? " (" + KH_PUBLISHED + ")" : "") + " and may have changed since, and it may not apply in your country. Always ask a GP or another medical or health professional for guidance on helping someone. Never try to diagnose anyone yourself: it can do more harm than good. In an emergency, call 999 (or your country's emergency number) straight away.";
  W.KH_PUBLISHED = KH_PUBLISHED;
  var KH_PARTNER_EMAIL = 'support@eaglelegend.com'; // confirmed by Richie 19 Oct (same as blog licensing link)
  function partnerCta(id) { return el('div', { class: 'card partner-cta', id: id || 'partner-cta' }, [el('p', { text: "Want a game like this for your healthcare, education or training platform? Talk to us about making one." }), el('a', { class: 'btn', href: 'mailto:' + KH_PARTNER_EMAIL + '?subject=' + encodeURIComponent('Kettle Hours: making a game like this'), text: 'Email ' + KH_PARTNER_EMAIL })]); }
  var SAVE_KEY = 'kh.save.v1', SET_KEY = 'kh.settings.v1', BEST_KEY = 'eagle-best-kettle-hours';
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var screen = $('#screen');
  var pack = null, packPath = null, schema = null, validation = {}, chars = {};
  var S = null; // run state
  var settings = { textsize: 'm', contrast: false, motion: !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches), readable: false, sound: true, cwSeen: false };
  var paused = { host: false, breathe: false, hidden: false };
  var lastFocus = null;

  // ---------- storage (localStorage only; nothing leaves the device) ----------
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function deleteAll() { try { Object.keys(localStorage).forEach(function (k) { if (/^kh\./.test(k) || k === BEST_KEY) localStorage.removeItem(k); }); } catch (e) {} }
  function save() { if (S) { S.packId = pack.id; S.savedAt = Date.now(); lsSet(SAVE_KEY, S); } }
  function saveSettings() { lsSet(SET_KEY, settings); }

  // ---------- helpers ----------
  function el(tag, attrs, kids) {
    var e = D.createElement(tag);
    if (attrs) for (var k in attrs) { var v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else if (k === 'on') for (var ev in v) e.addEventListener(ev, v[ev]); else e.setAttribute(k, v === true ? '' : v); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? D.createTextNode(c) : c); });
    return e;
  }
  function btn(text, fn, cls, extra) { var a = { type: 'button', class: 'btn ' + (cls || ''), text: text, on: { click: fn } }; if (extra) for (var k in extra) a[k] = extra[k]; return el('button', a); }
  function render(nodes, focusSel) {
    screen.innerHTML = ''; var wrap = el('div', { class: 'fade-in', style: null }); nodes.forEach(function (n) { if (n) wrap.appendChild(n); });
    wrap.className = 'fade-in'; wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.minHeight = '100%';
    screen.appendChild(wrap); screen.scrollTop = 0;
    var f = focusSel ? $(focusSel, screen) : null; if (!f) f = $('[data-autofocus]', screen);
    if (f && !anyDialogOpen()) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 30);
    W.__khScreen = screen.getAttribute('data-screen');
  }
  function setScreen(name) { screen.setAttribute('data-screen', name); D.body.setAttribute('data-screen', name); }
  function toast(t) { var x = $('#toast'); x.textContent = t; x.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { x.classList.remove('show'); }, 2600); }
  function ch() { return pack.chapters[S.chapter]; }
  function sceneById(id) { var c = ch(); for (var i = 0; i < c.scenes.length; i++) if (c.scenes[i].id === id) return c.scenes[i]; return null; }
  function sceneIndex(id) { var c = ch(); for (var i = 0; i < c.scenes.length; i++) if (c.scenes[i].id === id) return i; return -1; }
  function charName(id) { return id === 'you' ? 'You' : (chars[id] && chars[id].name) || id; }
  function best() { return Math.max(+(localStorage.getItem(BEST_KEY) || 0) || 0, 0); }
  function score() { return S ? Object.keys(S.done).length : 0; }
  function send(ev, extra) { var sc = score(), b = Math.max(best(), sc); try { localStorage.setItem(BEST_KEY, String(b)); } catch (e) {} KHBridge.send(ev, { score: sc, level: S ? S.chapter + 1 : 0, best: b }, extra); }

  // ---------- conditions & effects ----------
  function getVar(r) { var a = r.split('.'); return ((S.vars[a[0]] || {})[a[1]]) || 0; }
  function test(c) {
    if (!c) return true;
    if (c.all && !c.all.every(test)) return false;
    if (c.any && !c.any.some(test)) return false;
    if (c.not && test(c.not)) return false;
    if (c.flag && !S.flags[c.flag]) return false;
    if (c.noflag && S.flags[c.noflag]) return false;
    if (c.chapterDone && !S.done[c.chapterDone]) return false;
    if (c.var) { var v = getVar(c.var);
      if ('gte' in c && !(v >= c.gte)) return false; if ('lte' in c && !(v <= c.lte)) return false;
      if ('gt' in c && !(v > c.gt)) return false; if ('lt' in c && !(v < c.lt)) return false; if ('eq' in c && v !== c.eq) return false; }
    return true;
  }
  function apply(effects) {
    (effects || []).forEach(function (e) {
      if (e.flag) S.flags[e.flag] = true;
      if (e.unflag) delete S.flags[e.unflag];
      if (e.var) { var a = e.var.split('.'); S.vars[a[0]] = S.vars[a[0]] || {}; var cur = S.vars[a[0]][a[1]] || 0;
        var nv = 'set' in e ? e.set : cur + (e.add || 0), rg = (pack.varRanges || {})[a[1]];
        if (rg) nv = Math.max(rg[0], Math.min(rg[1], nv)); S.vars[a[0]][a[1]] = nv; }
      if (e.skill && !S.skills[e.skill]) { S.skills[e.skill] = 1; S.flags['skill_' + e.skill] = true; var sk = (pack.skills || []).filter(function (k) { return k.id === e.skill; })[0];
        var nm = sk ? sk.name : e.skill; toast('New skill card: ' + nm); journal({ tag: 'skill', text: 'Skill card: ' + nm + (sk && (sk.description || sk.card) ? '. ' + (sk.description || sk.card) : '') }); }
      if (e.street) { S.flags['street_' + e.street] = true; (S.street = S.street || {})[e.street] = 1; toast('The street feels a little brighter'); }
      if (e.guide) { S.flags['guide_' + e.guide] = true; if (!(S.guide = S.guide || {})[e.guide]) { S.guide[e.guide] = 1; var gd = (pack.guides || []).filter(function (x) { return x.id === e.guide; })[0]; if (gd) toast('New guide card: ' + gd.title); } }
      if (e.expression) { var b = e.expression.split('.'); S.expr[b[0]] = b[1]; }
    });
  }
  function journal(entry) { S.journal.push({ day: ch().day || S.chapter + 1, chapter: ch().id, about: entry.about || null, tag: entry.tag || 'reflection', text: entry.text }); }

  // ---------- state ----------
  function newState() {
    var vars = {}; Object.keys(chars).forEach(function (id) { vars[id] = {}; (pack.vars || ['trust', 'rapport']).forEach(function (v) { vars[id][v] = (chars[id].start || {})[v] || 0; }); });
    vars.player = Object.assign({}, pack.playerVars || {});
    return { v: 1, packId: pack.id, chapter: 0, scene: null, frames: [], flags: {}, vars: vars, expr: {}, journal: [], done: {}, cwAccepted: {}, skills: {}, street: {}, guide: {} };
  }

  // ---------- flow ----------
  function startChapter(i) {
    S.chapter = i; S.scene = null; S.frames = []; save();
    var c = ch();
    if ((c.contentWarnings && c.contentWarnings.length) && !S.cwAccepted[c.id]) return showChapterWarning(c);
    beginScenes();
  }
  function beginScenes() { var c = ch(); enterScene(c.startScene || c.scenes[0].id); }
  function enterScene(id) {
    var s = sceneById(id); if (!s) return endChapter();
    if (s.if && !test(s.if)) { if (s.ifFailNext) return enterScene(s.ifFailNext); return afterScene(s, true); }
    if (needsSelfCare() && !s.contentWarnings) return showSelfCare(function () { enterScene(id); });
    var cwKey = ch().id + ':' + s.id;
    if (s.contentWarnings && s.contentWarnings.length && !S.cwAccepted[cwKey]) return showSceneWarning(s, cwKey);
    S.scene = id; S.frames = [{ src: 'scene', i: 0 }]; S.lastSay = null;
    if (s.audio) { KHAudio.ambience(s.audio.ambience); KHAudio.cue(s.audio.cue); } else autoAudio(s);
    S.prevPresent = (s.present || []).slice();
    save(); advance();
  }
  // Packs without explicit audio (Sienna's) get ambience from the scene's background and time of day,
  // a kettle at the start of a café day, and the door bell when someone new walks into the café.
  function ambienceFor(s) {
    var b = s.bg || {}, ref = (typeof b === 'string' ? b : b.ref) || '', ph = (b && b.placeholder) || {}, time = ph.time || 'morning';
    if (/rain/.test(ref) || time === 'rain' || ph.weather === 'rain') return 'cafe_rain'; // rain bed for rainy scenes only
    if (/office/.test(ref)) return 'office_quiet';
    if (/park/.test(ref)) return 'outdoor_park'; // before the street rule: park placeholders are kind 'street'
    if (/street|doorstep/.test(ref) || ph.kind === 'street') return 'outdoor_street';
    if (/flat/.test(ref)) return 'home_quiet';
    if (/evening|after_hours|party|closed/.test(ref) || time === 'evening' || time === 'night' || time === 'afternoon') return 'cafe_evening';
    return 'cafe_morning';
  }
  function autoAudio(s) {
    var amb = ambienceFor(s), first = s.id === (ch().startScene || ch().scenes[0].id);
    KHAudio.ambience(amb);
    if (!/^cafe_(morning|evening)$/.test(amb)) return;
    var prev = first ? [] : (S.prevPresent || []), arrived = (s.present || []).some(function (p) { return p !== 'player' && prev.indexOf(p) < 0; });
    if (first && amb === 'cafe_morning') KHAudio.cue('kettle'); else if (arrived) KHAudio.cue('door_bell');
  }
  function framesSteps(f) {
    var s = sceneById(S.scene); if (f.src === 'scene') return s.steps;
    var st = framesSteps(f.parent)[f.step]; return (st.options[f.opt].reply) || [];
  }
  function advance() {
    while (true) {
      var f = S.frames[S.frames.length - 1];
      if (!f) return afterScene(sceneById(S.scene));
      var list = framesSteps(f);
      if (f.i >= list.length) { S.frames.pop(); continue; }
      var idx = f.i, st = list[idx]; f.i++;
      if (st.if && !test(st.if)) continue;
      save();
      if (runStep(st, f, idx) === 'wait') return;
    }
  }
  function runStep(st, frame, idx) {
    switch (st.type) {
      case 'say': if (st.expression) S.expr[st.speaker] = st.expression; if (st.audio) KHAudio.cue(st.audio.cue); showLine(charName(st.speaker), st.text, false); return 'wait';
      case 'narrate': if (st.audio) KHAudio.cue(st.audio.cue); showLine(null, st.text, true); return 'wait';
      case 'expression': S.expr[st.character] = st.expression; return;
      case 'set': apply(st.effects); return;
      case 'audio': KHAudio.ambience(st.audio.ambience); KHAudio.cue(st.audio.cue); return;
      case 'journal': journal(st); if (!st.silent) toast('Noted in your journal'); KHAudio.cue('page'); return;
      case 'goto': S.frames = []; enterScene(st.scene); return 'wait';
      case 'choice': case 'nextstep': showChoice(st, frame, idx); return 'wait';
      case 'observe': showObserve(st); return 'wait';
      case 'drink': showDrink(st); return 'wait';
      case 'signpost': showSignpost(st.text, null, st.level); return 'wait';
    }
  }
  function afterScene(s, skipped) {
    if (!skipped && s.afterHeavy) { s = Object.assign({}, s, { afterHeavy: false }); return showSignpost(null, function () { afterScene(s); }); }
    if (!skipped && s.endsDay) return showDayEnd(s);
    if (!skipped && s.endsChapter) return endChapter();
    var c = ch(), i = sceneIndex(s.id), nextId = !skipped && s.next ? s.next : (c.scenes[i + 1] && c.scenes[i + 1].id);
    if (!nextId) return endChapter();
    enterScene(nextId);
  }
  function endChapter(skipped) {
    var c = ch(); S.done[c.id] = skipped ? 'skipped' : 'played'; S.scene = null; S.frames = []; save();
    send('levelup', { chapter: c.id, skipped: !!skipped });
    if ((S.vars.player || {}).energy <= 4) S.selfCareShown = false; // the prompt can return in a later week
    showChapterComplete(c, skipped);
  }
  function nextChapterIndex() { for (var i = 0; i < pack.chapters.length; i++) if (!S.done[pack.chapters[i].id]) return i; return -1; }

  // ---------- screens ----------
  function stage() {
    var s = sceneById(S.scene) || {}, wrap = el('div', { class: 'stage' });
    var bgd = s.bg || 'bg_cafe_morning';
    if (pack.locations && typeof bgd === 'object' && bgd.ref && pack.locations[bgd.ref.replace(/^bg_/, '')]) bgd = Object.assign({}, bgd, { ref: pack.locations[bgd.ref.replace(/^bg_/, '')] });
    var bg = KHArt.resolve(bgd, chars, 'The café');
    wrap.appendChild(el('img', { class: 'bg', src: bg.src, alt: bg.alt }));
    if (s.title || s.phase) wrap.appendChild(el('div', { class: 'phase', text: [phaseName(s.phase), s.title].filter(Boolean).join(' · ') }));
    var cast = el('div', { class: 'cast' });
    (s.present || []).slice(0, 2).forEach(function (id) { var p = KHArt.portraitFor(id, S.expr[id] || exprFromMood(id), chars); cast.appendChild(el('img', { src: p.src, alt: p.alt })); });
    wrap.appendChild(cast); return wrap;
  }
  // without an explicit expression, mood picks the portrait (art shows mood, never a label)
  function exprFromMood(id) { var c = chars[id] || {}, m = (S.vars[id] || {}).mood, ex = c.expressions || [];
    if (typeof m !== 'number') return 'neutral'; var want = m <= -2 ? 'distressed' : m < 0 ? 'worried' : m >= 2 ? 'relieved' : 'neutral'; return ex.indexOf(want) >= 0 ? want : 'neutral'; }
  function phaseName(p) { return { open: 'Opening', arrive: 'Arrivals', serve: 'Serving', talk: 'Talking', close: 'Closing' }[p] || ''; }
  function showLine(speaker, text, narr, then) {
    setScreen('scene');
    var box = el('div', { class: 'dialogue' + (narr ? ' narr' : ''), role: 'group', 'aria-label': speaker ? speaker + ' says' : 'Narration' }, [
      speaker ? el('p', { class: 'speaker', text: speaker }) : null, el('p', { class: 'line', text: text })]);
    var live = el('div', { class: 'sr-only', 'aria-live': 'polite', text: (speaker ? speaker + ': ' : '') + text });
    render([stage(), box, live, el('div', { class: 'choices' }, [btn('Continue', then || advance, 'primary', { 'data-autofocus': true, id: 'btn-continue' })])]);
  }
  function showChoice(st, frame, idx) {
    setScreen('choice');
    var kids = [stage()];
    if (st.prompt) kids.push(el('p', { class: 'prompt pad', text: st.prompt, id: 'choice-prompt' }));
    var list = el('div', { class: 'choices', role: 'group', 'aria-labelledby': st.prompt ? 'choice-prompt' : null });
    var n = 0;
    st.options.forEach(function (o, j) {
      var ok = test(o.if);
      if (!ok && !o.showLocked) return;
      n++;
      var b = btn('', function () { choose(st, frame, idx, j); }, 'choice-btn', { 'data-opt': j, 'data-key': n, 'data-autofocus': n === 1 ? true : null });
      b.appendChild(D.createTextNode(n + '. ' + o.text));
      if (!ok) { b.disabled = true; b.appendChild(el('span', { class: 'lock', text: 'Not yet: this might open up as they trust you more.' })); }
      list.appendChild(b);
    });
    if (!n) list.appendChild(btn('Continue', advance, 'primary', { 'data-autofocus': true }));
    kids.push(list); render(kids);
  }
  function choose(st, frame, idx, j) {
    var o = st.options[j]; apply(o.effects); S.lastChoice = o.id || j;
    if (o.feedback) journal({ tag: 'reflection', text: o.feedback });
    if (o.quality) qualityCue(o.quality);
    if (o.goto) { save(); S.frames = []; if (st.type === 'nextstep' && o.outcome) return showOutcome(o.outcome, function () { enterScene(o.goto); }); return enterScene(o.goto); }
    if (o.reply && o.reply.length) S.frames.push({ src: 'reply', parent: frame, step: idx, opt: j, i: 0 });
    save();
    if (st.type === 'nextstep' && o.outcome) return showOutcome(o.outcome, advance);
    advance();
  }
  function qualityCue(q) {
    var t = { good: 'That seemed to help.', ok: 'That was alright.', poor: 'Hmm. That didn\'t quite land.' }[q];
    D.documentElement.setAttribute('data-cue', q); setTimeout(function () { D.documentElement.removeAttribute('data-cue'); }, 1800);
    if (t) toast(t);
  }
  function showOutcome(text, then) {
    setScreen('outcome');
    render([stage(), el('div', { class: 'dialogue narr' }, [el('p', { class: 'speaker', text: 'What happens' }), el('p', { class: 'line', text: text })]),
      el('div', { class: 'choices' }, [btn('Continue', then, 'primary', { 'data-autofocus': true })])]);
  }
  function showObserve(st) {
    setScreen('observe');
    var found = {}, nChanged = 0, need = st.minFind || 0;
    var foundList = el('ul', { class: 'found-list', 'aria-live': 'polite', 'aria-label': 'Things you noticed' });
    var doneBtn = btn(need ? 'Keep looking (or carry on when you\'re ready)' : 'Carry on', finish, 'primary', { id: 'btn-observe-done' });
    function panel(art, label, withSpots) {
      var a = KHArt.resolve(art, chars, label);
      var wrap = el('div', { class: 'obs-wrap' }, [el('img', { src: a.src, alt: a.alt })]);
      if (withSpots) st.hotspots.forEach(function (h) {
        var b = el('button', { type: 'button', class: 'hotspot', 'aria-label': 'Look at: ' + h.label, 'data-hotspot': h.id, title: h.label });
        b.style.left = h.x + '%'; b.style.top = h.y + '%'; b.style.width = h.w + '%'; b.style.height = h.h + '%';
        b.addEventListener('click', function () {
          if (found[h.id]) return; found[h.id] = 1; b.classList.add('found'); b.setAttribute('aria-pressed', 'true');
          apply(h.effects); if (h.changed) { nChanged++; KHAudio.cue('notice'); }
          foundList.appendChild(el('li', { text: h.label + ': ' + (h.found || (h.changed ? 'Something has changed.' : 'Same as before.')) }));
          if (h.changed) journal({ about: (sceneById(S.scene).present || [])[0], tag: 'noticed', text: h.found || h.label });
          if (nChanged >= need) doneBtn.textContent = 'Carry on';
          save();
        });
        b.textContent = h.label; wrap.appendChild(b);
      });
      return el('figure', { class: 'obs-panel' }, [label ? el('figcaption', { text: label }) : null, wrap]);
    }
    var grid = st.mode === 'compare'
      ? el('div', { class: 'observe' }, [panel(st.before, st.beforeLabel || 'Before', false), panel(st.after, st.afterLabel || 'Now', true)])
      : el('div', { class: 'observe single' }, [panel(st.art || sceneById(S.scene).bg, null, true)]);
    // list alternative for screen readers / keyboard: hotspot buttons are real buttons, so they're already in tab order
    function finish() { if (nChanged >= need && st.doneText) toast(st.doneText); advance(); }
    render([el('p', { class: 'prompt pad', text: st.prompt, id: 'obs-prompt' }), grid, foundList, el('div', { class: 'choices' }, [doneBtn])], '.hotspot');
  }
  var DRINK = { cup: [['mug', 'Mug'], ['teacup', 'Teacup'], ['glass', 'Glass']], base: [['tea', 'Tea'], ['coffee', 'Coffee'], ['cocoa', 'Cocoa'], ['herbal', 'Herbal'], ['water', 'Water']], extra: [['none', 'Nothing'], ['milk', 'Milk'], ['honey', 'Honey'], ['lemon', 'Lemon'], ['oat', 'Oat milk']] };
  var COLOURS = { tea: '#b0703a', coffee: '#4a2c1a', cocoa: '#7a4a2e', herbal: '#c9b45a', water: '#cfe6f0' };
  function showDrink(st) {
    setScreen('drink');
    var pick = { cup: 'mug', base: 'tea', extra: 'none' }, poured = false;
    var cupSvg = D.createElementNS('http://www.w3.org/2000/svg', 'svg'); cupSvg.setAttribute('viewBox', '0 0 120 120'); cupSvg.setAttribute('class', 'cup'); cupSvg.setAttribute('aria-hidden', 'true');
    function drawCup() {
      var col = COLOURS[pick.base]; if (pick.extra === 'milk' || pick.extra === 'oat') col = pick.base === 'coffee' ? '#9a6b48' : pick.base === 'tea' ? '#c99a6a' : col;
      var h = poured ? 52 : 0, shape = pick.cup === 'teacup' ? 'M22 50 L98 50 Q94 96 60 98 Q26 96 22 50Z' : pick.cup === 'glass' ? 'M34 22 L86 22 L80 104 L40 104Z' : 'M26 30 L94 30 L90 104 L30 104Z';
      cupSvg.innerHTML = '<defs><clipPath id="cc"><path d="' + shape + '"/></clipPath></defs>' +
        '<path d="' + shape + '" fill="#fff" stroke="#8a5a3c" stroke-width="4"/>' +
        (pick.cup !== 'glass' ? '<path d="M94 50 Q114 52 108 72 Q104 84 90 82" fill="none" stroke="#8a5a3c" stroke-width="6"/>' : '') +
        '<rect class="fill" clip-path="url(#cc)" x="0" y="' + (104 - h) + '" width="120" height="' + h + '" fill="' + col + '"/>' +
        (poured && !settings.motion ? '<path d="M50 14 Q44 6 50 0 M66 14 Q60 6 66 0" stroke="#bbb" stroke-width="3" fill="none"/>' : '');
    }
    function group(key, label) {
      var fs = el('fieldset', {}, [el('legend', { text: label })]), row = el('div', { class: 'opts' });
      DRINK[key].forEach(function (o) {
        var b = el('button', { type: 'button', class: 'opt', 'aria-pressed': pick[key] === o[0] ? 'true' : 'false', 'data-drink': key + ':' + o[0], text: o[1] });
        b.addEventListener('click', function () { pick[key] = o[0]; poured = false; Array.prototype.forEach.call(row.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); drawCup(); pourBtn.disabled = false; serveBtn.disabled = true; status.textContent = o[1] + ' chosen.'; });
        row.appendChild(b);
      }); fs.appendChild(row); return fs;
    }
    var status = el('p', { class: 'sr-only', 'aria-live': 'polite' });
    var pourBtn = btn('Pour', function () { poured = true; drawCup(); KHAudio.cue('pour'); pourBtn.disabled = true; serveBtn.disabled = false; status.textContent = 'Poured. Ready to serve.'; serveBtn.focus(); }, 'primary', { id: 'btn-pour' });
    var serveBtn = btn('Serve to ' + charName(st.for), serve, 'primary', { id: 'btn-serve', disabled: true });
    function serve() {
      var want = st.order || (chars[st.for] && chars[st.for].favourite) || {};
      var match = Object.keys(want).every(function (k) { return want[k] === pick[k]; });
      S.drinks = (S.drinks || 0) + 1;
      if (match) apply(st.matchEffects);
      save();
      showLine(null, match ? (st.matchText || charName(st.for) + ' smiles. Just right.') : (st.otherText || charName(st.for) + ' says thank you.'), true);
    }
    drawCup();
    var hint = chars[st.for] && chars[st.for].favourite ? el('p', { class: 'small', text: 'Take your time. There\'s no wrong drink, but regulars do have favourites.' }) : null;
    render([stage(), el('div', { class: 'drink' }, [el('p', { class: 'prompt', text: st.prompt || 'Make a drink for ' + charName(st.for) + '.' }), hint, cupSvg,
      group('cup', 'Cup'), group('base', 'Drink'), group('extra', 'Add'), status, pourBtn, serveBtn])], '.opt');
  }
  function signpostCard(text, level) {
    if (level === 'urgent') return el('div', { class: 'card signpost urgent', role: 'note' }, [
      el('h2', { text: 'If someone is in danger right now' }),
      el('p', { text: text || 'Call 999, or go to A&E. Stay with them while you get help.' }),
      el('a', { href: 'tel:999', class: 'urgent-call', text: 'Call 999 (emergency)' }), el('a', { href: 'tel:111', text: 'NHS 111 (urgent, not an emergency)' }), el('a', { href: 'tel:116123', text: 'Samaritans: 116 123 (free, 24/7)' })]);
    return el('div', { class: 'card signpost', role: 'note' }, [
      el('h2', { text: 'Support is always there' }),
      el('p', { text: text || 'If anything in that chapter stirred things up for you, you can talk to someone now.' }),
      el('a', { href: 'tel:116123', text: 'Samaritans: 116 123 (free, 24/7)' }), el('a', { href: 'tel:111', text: 'NHS 111 (urgent, not an emergency)' }), el('a', { href: 'tel:08001111', text: 'Childline: 0800 1111 (free, under 19s)' }), el('a', { href: 'tel:999', text: '999 in an emergency' })]);
  }
  function showSignpost(text, then, level) {
    setScreen('signpost');
    render([el('div', { class: 'pad' }, [signpostCard(text, level), btn('Continue', then || advance, 'primary', { 'data-autofocus': true })])]);
  }
  function showChapterWarning(c) {
    setScreen('chapter-warning');
    render([el('div', { class: 'pad' }, [
      el('p', { class: 'small', text: 'Before this chapter' }), el('h1', { text: c.title }),
      el('div', { class: 'card cw', role: 'note' }, [el('h2', { text: 'Content note' }), el('p', { text: 'This chapter includes:' }),
        el('ul', {}, c.contentWarnings.map(function (w) { return el('li', { text: w }); })),
        el('p', { class: 'small', text: 'You can skip it and read a short, gentle summary instead. You can also pause or open "Need help now?" at any time.' })]),
      btn('Continue to the chapter', function () { S.cwAccepted[c.id] = true; save(); beginScenes(); }, 'primary', { id: 'btn-cw-continue' }),
      c.skippable ? btn('Skip this chapter', function () { skipChapter(c); }, '', { id: 'btn-cw-skip', 'data-autofocus': true }) : null,
      btn('Take a breath first', openBreathe, ''),
      btn('Back to the title', showTitle, '')])]);
  }
  function showSceneWarning(s, key) {
    setScreen('scene-warning'); S.scene = id0(s); save();
    render([el('div', { class: 'pad' }, [
      el('p', { class: 'small', text: 'Before this scene' }), el('h1', { text: s.title || ch().title }),
      el('div', { class: 'card cw', role: 'note' }, [el('h2', { text: 'Content note' }), el('p', { text: 'This scene includes:' }),
        el('ul', {}, s.contentWarnings.map(function (w) { return el('li', { text: w }); })), s.cwText ? el('p', { text: s.cwText }) : null,
        el('p', { class: 'small', text: 'You can skip it and still carry on with the story.' })]),
      btn('Continue to the scene', function () { S.cwAccepted[key] = true; save(); enterScene(s.id); }, 'primary', { id: 'btn-cw-continue' }),
      s.skippable ? btn('Skip this scene', function () { skipScene(s, key); }, '', { id: 'btn-cw-skip', 'data-autofocus': true }) : null,
      btn('Take a breath first', openBreathe, ''), btn('Back to the title', showTitle, '')])]);
  }
  function id0(s) { return s.id; }
  function skipScene(s, key) {
    S.cwAccepted[key] = true; journal({ tag: 'reflection', text: 'Skipped a scene with a content note' + (s.title ? ' ("' + s.title + '")' : '') + '.' });
    var go = function () { if (s.skipTo) { S.cwAccepted[ch().id + ':' + s.skipTo] = true; enterScene(s.skipTo); } else afterScene(s, true); };
    setScreen('skip-summary');
    render([el('div', { class: 'pad' }, [el('p', { class: 'small', text: 'Scene skipped' }), el('h1', { text: s.title || 'Skipped' }),
      s.skipSummary ? el('div', { class: 'card', role: 'note' }, [el('h2', { text: 'What happened' }), el('p', { text: s.skipSummary, id: 'skip-summary' })]) : null,
      signpostCard(), btn('Continue', go, 'primary', { 'data-autofocus': true, id: 'btn-skip-continue' })])]);
  }
  function skipChapter(c) {
    apply(c.skipEffects); journal({ tag: 'reflection', text: 'Skipped "' + c.title + '". Summary: ' + c.skipSummary });
    setScreen('skip-summary');
    render([el('div', { class: 'pad' }, [el('p', { class: 'small', text: 'Chapter skipped' }), el('h1', { text: c.title }),
      el('div', { class: 'card', role: 'note' }, [el('h2', { text: 'What happened' }), el('p', { text: c.skipSummary, id: 'skip-summary' })]),
      signpostCard(), btn('Continue', function () { endChapter(true); }, 'primary', { 'data-autofocus': true, id: 'btn-skip-continue' })])]);
  }
  function showDayEnd(s) {
    if (!(s.audio && s.audio.cue)) KHAudio.cue('chime_soft');
    var c = ch(), day = c.day || S.chapter + 1;
    send('gameover', { reason: 'day-end', day: day, chapter: c.id });
    setScreen('day-end');
    var entries = S.journal.filter(function (j) { return j.chapter === c.id; });
    render([el('div', { class: 'pad' }, [el('p', { class: 'small', text: 'Closing time' }), el('h1', { text: 'Day ' + day + ' journal' }),
      el('p', { text: 'The chairs are up and the kettle is cooling. Here\'s what you wrote today.' }),
      journalList(entries),
      relationshipSummary(), streetCard(),
      btn('Continue', function () { if (s.endsChapter) return endChapter(); var i = sceneIndex(s.id); var nx = s.next || (c.scenes[i + 1] && c.scenes[i + 1].id); if (nx) enterScene(nx); else endChapter(); }, 'primary', { 'data-autofocus': true, id: 'btn-dayend-continue' })])]);
  }
  var WEATHER = [['⛈️', 'storm'], ['🌧️', 'heavy rain'], ['🌥️', 'overcast'], ['⛅', 'changeable'], ['🌤️', 'bright spells'], ['☀️', 'sunny'], ['🌞', 'clear blue']];
  function weatherFor(id) {
    var v = S.vars[id] || {}; if (!('mood' in v)) return null;
    var m = Math.max(-3, Math.min(3, Math.round(v.mood))), w = WEATHER[m + 3], lab = (pack.moodWeather && pack.moodWeather.labels && pack.moodWeather.labels[String(m)]) || w[1];
    return el('span', { class: 'weather', role: 'img', 'aria-label': 'Weather: ' + lab, title: lab, text: w[0] });
  }
  function skillCards() {
    var ids = Object.keys(S.skills || {}); if (!ids.length) return null;
    return el('div', { class: 'card' }, [el('h2', { text: 'Skill cards (' + ids.length + ')' }), el('div', { class: 'skill-grid' }, ids.map(function (id) {
      var s = (pack.skills || []).filter(function (x) { return x.id === id; })[0] || { name: id }, a = KHArt.has('skill_' + id);
      return el('figure', { class: 'skill-card', 'data-skill': id }, [a ? el('img', { src: KHArt.resolve('skill_' + id).src, alt: '' }) : el('div', { class: 'skill-ph', text: s.name.charAt(0) }),
        el('figcaption', {}, [el('strong', { text: s.name }), s.description ? el('span', { text: s.description }) : null])]);
    }))]);
  }
  var STREET_NAMES = { noticeboard: 'A support noticeboard', lights: 'The street lights fixed', quiet_room: 'A quiet room upstairs' };
  function streetCard() {
    var ids = Object.keys(S.street || {}); if (!ids.length) return null;
    return el('div', { class: 'card street' }, [el('h2', { text: 'Larkspur Street' }), el('p', { class: 'small', text: 'What you\'ve changed together:' }),
      el('ul', {}, ids.map(function (id) { return el('li', { text: '✨ ' + (STREET_NAMES[id] || id.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); })) }); }))]);
  }
  // Rose's self-care prompt (content/SCHEMA.md: energy <= 2). Text can be overridden with pack.selfCare.
  function needsSelfCare() { var e = (S.vars.player || {}).energy; return typeof e === 'number' && e <= 2 && !S.selfCareShown; }
  function showSelfCare(then) {
    S.selfCareShown = true; save(); setScreen('self-care');
    var sc = Object.assign({ speaker: 'rose', text: 'You look done in, love. Sit down and eat something. You can\'t pour from an empty pot, and the street will still be here in ten minutes.',
      rest: 'Take a proper break', restText: 'You sit, eat, and let someone else worry for a bit. You feel steadier.', skip: 'Keep going for now', restEnergy: 4 }, pack.selfCare || {});
    var who = chars[sc.speaker] ? sc.speaker : null, p = who ? KHArt.portraitFor(who, 'worried', chars) : null;
    render([p ? el('div', { class: 'stage' }, [el('img', { class: 'bg', src: KHArt.resolve({ ref: 'bg_cafe_closed', alt: 'The café, quiet.', placeholder: { kind: 'cafe', time: 'evening' } }, chars).src, alt: '' }), el('div', { class: 'cast' }, [el('img', { src: p.src, alt: p.alt })])]) : null,
      el('div', { class: 'dialogue' }, [el('p', { class: 'speaker', text: who ? charName(who) : 'A moment for you' }), el('p', { class: 'line', text: sc.text })]),
      el('div', { class: 'choices' }, [btn(sc.rest, function () { apply([{ var: 'player.energy', add: sc.restEnergy }, { skill: 'refill' }]); journal({ tag: 'reflection', text: sc.restText }); showLine(null, sc.restText, true, then); }, 'primary', { 'data-autofocus': true, id: 'btn-selfcare-rest' }),
        btn(sc.skip, function () { journal({ tag: 'reflection', text: 'Kept going when I was running on empty.' }); then(); }, '', { id: 'btn-selfcare-skip' }), btn('Pause and breathe', openBreathe, '')])]);
  }
  function relationshipSummary() {
    var box = el('div', { class: 'card' }, [el('h2', { text: 'Your regulars' })]);
    var ranged = (pack.varRanges || {}).trust, k = ranged ? (ranged[1] - ranged[0]) / 4 : 1, met = {};
    S.journal.forEach(function () {}); pack.chapters.slice(0, S.chapter + 1).forEach(function (c) { c.scenes.forEach(function (s) { (s.present || []).forEach(function (p) { met[p] = 1; }); }); });
    Object.keys(chars).filter(function (id) { return met[id]; }).forEach(function (id) { var t = ((S.vars[id] || {}).trust || 0) / k;
      var mood = t >= 3 ? 'feels safe talking to you' : t >= 2 ? 'is starting to open up' : t >= 1 ? 'says hello' : 'is keeping their distance';
      var w = weatherFor(id); box.appendChild(el('p', {}, [w, w ? ' ' : null, charName(id) + ' ' + mood + '.'])); });
    return box;
  }
  function journalList(entries) {
    if (!entries.length) return el('p', { class: 'small', text: 'No notes yet.' });
    return el('ul', { class: 'journal-list' }, entries.map(function (j) { return el('li', {}, [el('span', { class: 'tag', text: 'Day ' + j.day + ' · ' + j.tag + (j.about ? ' · ' + charName(j.about) : '') }), el('div', { text: j.text })]); }));
  }
  function showChapterComplete(c, skipped) {
    setScreen('chapter-complete');
    if (!skipped) KHAudio.cue('sting', { gain: 0.5 });
    var nx = nextChapterIndex();
    render([el('div', { class: 'pad' }, [el('p', { class: 'small', text: skipped ? 'Chapter skipped' : 'Chapter complete' }), el('h1', { text: c.title }),
      c.contentWarnings && c.contentWarnings.length && !skipped ? signpostCard() : null,
      nx >= 0 ? btn('Next: ' + pack.chapters[nx].title, function () { startChapter(nx); }, 'primary', { 'data-autofocus': true, id: 'btn-next-chapter' })
              : el('div', { id: 'end-of-content' }, [el('p', { text: 'That\'s everything in this build. Thank you for listening.' }), el('p', { class: 'small', text: KH_DISCLAIMER }), partnerCta()]),
      btn('Back to the title', showTitle, '', { id: 'btn-to-title', 'data-autofocus': nx < 0 ? true : null })])]);
  }
  function showJournal() {
    if (!S) { toast('Your journal fills up as you play.'); return; }
    setScreen('journal');
    var resume = S.scene, sk = Object.keys(S.skills || {});
    render([el('div', { class: 'pad' }, [el('h1', { text: 'Journal' }), journalList(S.journal), relationshipSummary(),
      skillCards(), streetCard(),
      Object.keys(S.guide || {}).length ? el('div', { class: 'card' }, [el('h2', { text: 'Street guide' })].concat(Object.keys(S.guide).map(function (id) { var g = (pack.guides || []).filter(function (x) { return x.id === id; })[0]; return g ? el('details', {}, [el('summary', { text: g.title }), el('p', { text: g.body })]) : null; }))) : null,
      btn(resume ? 'Back to the café' : 'Back to the title', function () { resume ? resumeScene() : showTitle(); }, 'primary', { 'data-autofocus': true })])]);
  }
  function resumeScene() {
    // replay from the last saved frame; the step that was on screen is shown again
    var f = S.frames[S.frames.length - 1]; if (f && f.i > 0) f.i--; advance();
  }
  function showFirstWarning() {
    setScreen('pack-warning');
    render([el('div', { class: 'pad' }, [el('h1', { text: 'Before you start' }), el('div', { class: 'card cw', role: 'note' }, [el('p', { text: pack.contentWarning })]),
      el('p', { class: 'small', text: KH_DISCLAIMER + ' Recommended for ages 14+.' }),
      btn('OK, I understand', function () { settings.cwSeen = true; saveSettings(); showTitle(); }, 'primary', { 'data-autofocus': true, id: 'btn-pack-cw-ok' })])]);
  }
  function showTitle() {
    setScreen('title');
    var saved = lsGet(SAVE_KEY), canContinue = saved && saved.packId === pack.id;
    var art = KHArt.resolve('title', chars, 'A warm corner café with a steaming kettle.'); if (!art.real) art = KHArt.resolve({ ref: 'title', alt: 'A warm corner café with a steaming kettle.', placeholder: { kind: 'cafe', time: 'morning' } }, chars);
    render([el('img', { class: 'title-art', src: art.src, alt: art.alt }), el('div', { class: 'pad' }, [
      pack.sample ? el('span', { class: 'badge', text: 'SAMPLE CONTENT' }) : null,
      el('h1', { text: 'Kettle Hours' }), el('p', { text: 'Put the kettle on, listen well and help your neighbours through their week.' }),
      canContinue ? btn('Continue', function () { S = saved; KHAudio.unlock(); send('start', { resumed: true }); if (S.scene) resumeScene(); else { var nx = nextChapterIndex(); nx >= 0 ? startChapter(nx) : showChapters(); } }, 'primary', { id: 'btn-continue-game', 'data-autofocus': true }) : null,
      btn(canContinue ? 'Start again' : 'Start', function () {
        var go = function () { S = newState(); save(); KHAudio.unlock(); send('start'); startChapter(0); };
        if (canContinue) confirmBox('Start again?', 'This replaces your saved progress on this device.', go); else go();
      }, canContinue ? '' : 'primary', { id: 'btn-new-game', 'data-autofocus': canContinue ? null : true }),
      btn('Chapters', showChapters, '', { id: 'btn-chapters' }),
      btn('Settings and accessibility', openSettings, ''),
      btn('Delete my progress', askDelete, 'danger', { id: 'btn-delete-title' }),
      el('p', { class: 'small', text: KH_DISCLAIMER }),
      el('p', { class: 'small', text: 'Made by Eagle Legend LTD. No accounts, no tracking: progress is saved only on this device.' + (validation.note ? ' ' + validation.note : '') })])]);
  }
  function showChapters() {
    if (!S) { S = lsGet(SAVE_KEY); if (!S || S.packId !== pack.id) S = newState(); }
    setScreen('chapters');
    render([el('div', { class: 'pad chapter-list' }, [el('h1', { text: 'Chapters' })].concat(pack.chapters.map(function (c, i) {
      var b = btn('', function () { send('start', { chapter: c.id }); startChapter(i); }, '', { 'data-chapter': c.id });
      b.appendChild(D.createTextNode(c.title)); var st = S.done[c.id];
      b.appendChild(el('small', { text: (st === 'played' ? 'Played' : st === 'skipped' ? 'Skipped' : 'Not played yet') + (c.contentWarnings && c.contentWarnings.length ? ' · content note' : '') }));
      return b;
    })).concat([btn('Back', showTitle, 'primary')]))]);
  }

  // ---------- dialogs ----------
  function anyDialogOpen() { return !!D.querySelector('.dialog:not([hidden])'); }
  function openDialog(id) { var d = $('#' + id); if (!d.hidden) return; lastFocus = D.activeElement; d.hidden = false; var f = d.querySelector('a,button,input'); if (f) f.focus(); }
  function closeDialog(id) { var d = $('#' + id); if (d.hidden) return; d.hidden = true; if (id === 'breathe-panel') { paused.breathe = false; applyPause(); stopBreathe(); } if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
  Array.prototype.forEach.call(D.querySelectorAll('.dialog'), function (d) {
    d.addEventListener('click', function (e) { if (e.target === d && d.id !== 'pause-panel') closeDialog(d.id); if (e.target.hasAttribute && e.target.hasAttribute('data-close')) closeDialog(d.id); });
  });
  // Paced to Harper's breathe_in.ogg (4 s) and breathe_out.ogg (5 s). Text and timing work the same when muted or when audio fails.
  var BREATHE = [{ text: 'Breathe in slowly…', cue: 'breathe_in', ms: 4000 }, { text: 'And breathe out…', cue: 'breathe_out', ms: 5000 }];
  var breatheTimer = null;
  function openBreathe() {
    paused.breathe = true; applyPause(); openDialog('breathe-panel');
    var t = $('#breathe-text'), i = 0, circ = $('#breathe-panel .breathe-circle'); clearTimeout(breatheTimer);
    if (circ) { circ.style.animation = 'none'; void circ.offsetWidth; circ.style.animation = ''; } // restart the 9 s circle in step with the text
    (function phase() {
      var p = BREATHE[i]; t.textContent = p.text; t.setAttribute('data-phase', p.cue);
      try { if (settings.sound) KHAudio.cue(p.cue, { duringPause: true }); } catch (e) {}
      breatheTimer = setTimeout(function () { i = (i + 1) % BREATHE.length; phase(); }, p.ms);
    })();
  }
  function stopBreathe() { clearTimeout(breatheTimer); breatheTimer = null; }
  function openSettings() { syncSettingsUI(); openDialog('settings-panel'); }
  function confirmBox(title, text, yes) {
    $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; openDialog('confirm-panel');
    $('#confirm-yes').onclick = function () { closeDialog('confirm-panel'); yes(); }; $('#confirm-no').onclick = function () { closeDialog('confirm-panel'); };
  }
  function askDelete() {
    confirmBox('Delete my progress?', 'This removes your saved game, journal and settings from this device. It can\'t be undone.', function () {
      deleteAll(); S = null; closeDialog('settings-panel'); settings.cwSeen = true; applySettings(); toast('Deleted. Nothing from this game is stored on this device now.'); showTitle();
      settings.cwSeen = false; // re-show the opening note next launch, but don't write it back (nothing stored)
    });
  }

  // ---------- settings ----------
  function applySettings() {
    var h = D.documentElement; h.classList.remove('ts-s', 'ts-m', 'ts-l', 'ts-xl'); h.classList.add('ts-' + settings.textsize);
    h.classList.toggle('contrast', !!settings.contrast); h.classList.toggle('reduce-motion', !!settings.motion); h.classList.toggle('readable', !!settings.readable);
    KHAudio.setMuted(!settings.sound);
  }
  function syncSettingsUI() {
    Array.prototype.forEach.call(D.querySelectorAll('input[name=textsize]'), function (r) { r.checked = r.value === settings.textsize; });
    $('#set-contrast').checked = !!settings.contrast; $('#set-motion').checked = !!settings.motion; $('#set-readable').checked = !!settings.readable; $('#set-sound').checked = !!settings.sound;
  }
  D.addEventListener('change', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#settings-panel')) return;
    if (t.name === 'textsize') settings.textsize = t.value;
    if (t.id === 'set-contrast') settings.contrast = t.checked; if (t.id === 'set-motion') settings.motion = t.checked;
    if (t.id === 'set-readable') settings.readable = t.checked; if (t.id === 'set-sound') { settings.sound = t.checked; if (t.checked) KHAudio.unlock(); }
    applySettings(); saveSettings();
  });

  // ---------- pause (player breathe, host, hidden tab) ----------
  function isPaused() { return paused.host || paused.breathe || paused.hidden; }
  function applyPause() { KHAudio.setPaused(isPaused()); $('#pause-panel').hidden = !paused.host; }
  D.addEventListener('visibilitychange', function () { paused.hidden = D.hidden; applyPause(); });
  KHBridge.on('pause', function () { paused.host = true; applyPause(); });
  KHBridge.on('resume', function () { paused.host = false; applyPause(); });
  KHBridge.on('mute', function () { settings.sound = false; applySettings(); });
  KHBridge.on('unmute', function () { settings.sound = true; applySettings(); });
  KHBridge.on('restart', function () { showTitle(); });
  KHBridge.on('set-motion', function (d) { settings.motion = !!d.reduced; applySettings(); });
  KHBridge.on('set-theme', function () { /* the café palette is fixed; high contrast is a player setting */ });

  // ---------- global controls ----------
  D.querySelectorAll('.kh-published').forEach(function (n) { n.textContent = KH_PUBLISHED; });
  D.querySelectorAll('.kh-published-wrap').forEach(function (n) { n.hidden = !KH_PUBLISHED; });
  var sc = $('#settings-cta'); if (sc) { sc.appendChild(el('p', { class: 'small', text: KH_DISCLAIMER })); sc.appendChild(partnerCta('settings-partner-cta')); }
  $('#btn-help').addEventListener('click', function () { openDialog('help-panel'); });
  $('#btn-breathe').addEventListener('click', openBreathe);
  $('#btn-menu').addEventListener('click', openSettings);
  $('#btn-journal').addEventListener('click', function () { if (anyDialogOpen()) return; showJournal(); });
  $('#btn-delete').addEventListener('click', askDelete);
  $('#btn-title').addEventListener('click', function () { closeDialog('settings-panel'); showTitle(); });
  D.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var open = D.querySelector('.dialog:not([hidden]):not(#pause-panel)'); if (open) { closeDialog(open.id); e.preventDefault(); } return; }
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (anyDialogOpen()) return;
    if (/^[1-9]$/.test(e.key)) { var b = screen.querySelector('[data-key="' + e.key + '"]:not([disabled])'); if (b) { b.click(); e.preventDefault(); } }
    else if (e.key === 'h' || e.key === 'H') openDialog('help-panel');
    else if (e.key === 'b' || e.key === 'B') openBreathe();
    else if ((e.key === 'Enter' || e.key === ' ') && (e.target === D.body || e.target === screen)) { var c = $('#btn-continue', screen); if (c) { c.click(); e.preventDefault(); } }
  });
  D.addEventListener('pointerdown', function () { KHAudio.unlock(); }, { once: true });

  // ---------- loading ----------
  function getJSON(p) { return fetch(p, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); }); }
  function loadPack() {
    return Promise.all([getJSON('schema/kettle-hours.schema.json'), getJSON('content/index.json')]).then(function (a) {
      schema = a[0]; var list = (a[1].packs || []).slice();
      var want = (location.search.match(/[?&]pack=([a-z0-9_-]+)/) || [])[1];
      if (want) list.sort(function (x, y) { return (y.indexOf(want + '/') === 0) - (x.indexOf(want + '/') === 0); });
      var tryAt = function (i) {
        if (i >= list.length) throw new Error('No valid content pack found');
        return getJSON('content/' + list[i]).then(function (p) {
          var r = KHValidate.validatePack(p, schema); validation[list[i]] = r;
          if (!r.ok) { if (W.console) console.warn('[kettle-hours] pack ' + list[i] + ' failed validation; trying the next one.', r.errors.slice(0, 5)); return tryAt(i + 1); }
          packPath = list[i]; return p;
        }, function (err) { validation[list[i]] = { ok: false, errors: [String(err.message)] }; console.warn('[kettle-hours] could not load ' + list[i]); return tryAt(i + 1); });
      };
      return tryAt(0);
    });
  }
  settings = Object.assign(settings, lsGet(SET_KEY) || {});
  applySettings();
  Promise.all([loadPack(), KHArt.load(), KHAudio.load()]).then(function (a) {
    pack = a[0]; chars = pack.characters;
    if (pack.sample) validation.note = 'Running SAMPLE content.';
    W.__kh = { get state() { return S; }, pack: pack, packPath: packPath, validation: validation, settings: settings };
    send('ready', { title: 'Kettle Hours' });
    if (pack.contentWarning && !settings.cwSeen) showFirstWarning(); else showTitle();
  }).catch(function (err) {
    setScreen('error');
    render([el('div', { class: 'pad' }, [el('h1', { text: 'Kettle Hours' }), el('p', { text: 'Sorry, the story files couldn\'t be loaded. (' + err.message + ')' })])]);
    console.warn('[kettle-hours]', err);
  });
})(window, document);
