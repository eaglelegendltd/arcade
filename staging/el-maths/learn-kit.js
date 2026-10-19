/* learn-kit.js v0.1.0 - Eagle Legend adaptive skill engine (ENGINE.md). Vanilla ES5, no dependencies, 100% original.
   Privacy (ENGINE.md §1): everything stays in localStorage on this device. This file makes no network requests of any kind
   and posts nothing out of the page. Events from LearnKit.on() are in-page only. */
(function (W) {
  'use strict';
  var VERSION = '0.1.0', PREFIX = 'eagle.learn.v1.', BAK = 'eagle.learn.bak.', SCHEMA = 1;
  var ID_RE = /^(maths|english|coding)(\.[a-z][a-z0-9]{0,23}){2,3}$/;
  var DAY = 86400000, BOX_DAYS = [1, 3, 7, 16, 35], LN4 = Math.log(4);
  var DEF_BKT = { L0: 0.20, T: 0.15, S: 0.10 };
  var skills = {}, order = [], gens = {}, banks = {}, listeners = {}, mem = {}, storageOk = true, sessions = {};

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function now() { return K._now ? K._now() : Date.now(); }
  function emit(ev, data) { (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) {} }); }
  function mulberry32(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---- storage (localStorage only; memory fallback with a calm notice) ----
  function sget(k) { if (storageOk) { try { var v = W.localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { fail(e); } } return mem[k] ? JSON.parse(mem[k]) : null; }
  function sset(k, v) { var s = JSON.stringify(v); mem[k] = s; if (!storageOk) return false; try { W.localStorage.setItem(k, s); return true; } catch (e) { fail(e); return false; } }
  function sdel(k) { delete mem[k]; if (storageOk) try { W.localStorage.removeItem(k); } catch (e) {} }
  function fail(e) { if (storageOk) { storageOk = false; emit('storage-error', { message: "Progress won't be saved on this browser." }); } }
  try { var t = '__eagle_learn_test'; W.localStorage.setItem(t, '1'); W.localStorage.removeItem(t); } catch (e) { storageOk = false; }

  // ---- settings ----
  var SET_DEF = { schema: 1, mute: false, volume: 0.8, reducedMotion: null, textSize: 1.0, readAloud: false, highContrast: false, dyslexiaFont: false, music: false };
  var settings = {
    get: function () { var s = sget(PREFIX + 'settings') || {}, o = {}; for (var k in SET_DEF) o[k] = k in s ? s[k] : SET_DEF[k]; return o; },
    set: function (patch) { var s = settings.get(); for (var k in patch) if (k in SET_DEF) s[k] = patch[k]; sset(PREFIX + 'settings', s); return s; }
  };

  // ---- skill graph ----
  function defineSkills(list, opts) {
    var dev = !opts || opts.dev !== false, byId = {};
    list.forEach(function (s) {
      if (!ID_RE.test(s.id) || s.id.length > 64) throw new Error('Bad skill id: ' + s.id);
      if (byId[s.id]) throw new Error('Duplicate skill id: ' + s.id); byId[s.id] = s; });
    list.forEach(function (s) { (s.prereqs || []).forEach(function (p) { if (!byId[p] && dev) throw new Error('Unknown prereq ' + p + ' in ' + s.id); }); });
    var state = {}; // cycle check (DFS)
    function visit(id, path) { if (state[id] === 2) return; if (state[id] === 1) throw new Error('Cycle in skill graph at ' + id);
      state[id] = 1; (byId[id].prereqs || []).forEach(function (p) { if (byId[p]) visit(p, path); }); state[id] = 2; }
    list.forEach(function (s) { visit(s.id); });
    list.forEach(function (s) { skills[s.id] = s; if (order.indexOf(s.id) < 0) order.push(s.id); });
    return list.length;
  }
  function subjectSkills(subj) { return order.filter(function (id) { return id.split('.')[0] === subj && !skills[id].deprecated; }); }
  function registerGenerator(name, fn) { gens[name] = fn; }
  function loadBank(json) { if (!json || json.version !== 1 || !ID_RE.test(json.skill) || !json.items) throw new Error('Bad bank'); banks[json.skill] = json.items; return json.items.length; }

  // ---- maths (BKT §5.1, Elo §5.2) ----
  function bkt(p, correct, S, G, T) {
    var q = correct ? p * (1 - S) / (p * (1 - S) + (1 - p) * G) : p * S / (p * S + (1 - p) * (1 - G));
    return q + (1 - q) * T;
  }
  function expected(th, d) { return 1 / (1 + Math.exp(-(th - d))); }
  function kFactor(n) { return Math.max(0.15, 0.6 / (1 + n / 10)); }

  // ---- data record ----
  function blank(subject) { var t = now(); return { schema: SCHEMA, kit: VERSION, subject: subject, created: t, updated: t, curriculum: null, placement: null, offset: 0, skills: {} }; }
  function migrate(d, subject) {
    if (!d || typeof d !== 'object') return null;
    if (d.schema > SCHEMA) { d.readOnly = true; return d; }
    var from = d.schema | 0;
    if (from < SCHEMA) { sset(BAK + subject, d); for (var v = from + 1; v <= SCHEMA; v++) if (K.migrations[v]) d = K.migrations[v](d); d.schema = SCHEMA; }
    for (var id in d.skills) { var s = skills[id]; if (s && s.deprecated && skills[s.deprecated]) { if (!d.skills[s.deprecated]) d.skills[s.deprecated] = d.skills[id]; delete d.skills[id]; } }
    return d;
  }
  function cleanSkill(r) { r = r || {}; return { p: clamp(+r.p || 0, 0, 1), th: clamp(+r.th || 0, -3, 3), n: Math.max(0, r.n | 0),
    streak3: (r.streak3 || []).slice(-3).map(function (x) { return x ? 1 : 0; }), box: clamp(r.box | 0, 0, 5), last: +r.last || 0,
    hist: (r.hist || []).slice(-20).map(function (x) { return x === 0.5 ? 0.5 : x ? 1 : 0; }) }; }
  function sanitise(d, subject) { // drops unknown keys and unknown skill IDs (import + load)
    var o = blank(subject); if (!d) return o;
    o.created = +d.created || o.created; o.updated = +d.updated || o.updated; o.offset = clamp(+d.offset || 0, -1.5, 1.5);
    if (d.curriculum && typeof d.curriculum.framework === 'string') o.curriculum = { framework: String(d.curriculum.framework).slice(0, 40), level: String(d.curriculum.level || '').slice(0, 40) };
    if (d.placement && d.placement.band) o.placement = { band: clamp(d.placement.band | 0, 1, 12), at: +d.placement.at || 0 };
    for (var id in (d.skills || {})) if (skills[id] && id.split('.')[0] === subject) o.skills[id] = cleanSkill(d.skills[id]);
    return o;
  }

  // ---- session ----
  function Session(subject, opts) {
    opts = opts || {}; this.subject = subject; this.rng = mulberry32(opts.seed == null ? (now() & 0xffffffff) : opts.seed);
    var raw = migrate(sget(PREFIX + subject), subject);
    this.readOnly = !!(raw && raw.readOnly);
    this.data = raw && !raw.readOnly ? sanitise(raw, subject) : blank(subject);
    if (opts.curriculum) this.data.curriculum = opts.curriculum;
    this.ids = subjectSkills(subject); this.acc = []; this.recent = {}; this.wrongRun = {}; this.rightRun = 0; this.count = 0;
    this.back = null; this.bonus = 0; this.preHint = false; this.last2 = []; this.dNudge = {}; this.timer = null; this.placement = null;
    sessions[subject] = this;
  }
  var P = Session.prototype;
  P.rec = function (id) { var r = this.data.skills[id]; if (!r) { r = this.data.skills[id] = cleanSkill({ p: (skills[id].bkt || {}).L0 || DEF_BKT.L0 }); } return r; };
  P.isMastered = function (id) { var r = this.data.skills[id]; if (!r) return false; var s3 = r.streak3; return r.p >= 0.95 && r.n >= 5 && s3.length === 3 && s3[0] && s3[1] && s3[2]; };
  P.isUnlocked = function (id) { var self = this; return (skills[id].prereqs || []).every(function (p) { return !skills[p] || self.rec(p).p >= 0.80; }); };
  P.frontier = function () { var self = this;
    return this.ids.filter(function (id) { return self.isUnlocked(id) && !self.isMastered(id); })
      .sort(function (a, b) { return (skills[a].band - skills[b].band) || (self.rec(a).p - self.rec(b).p) || (order.indexOf(a) - order.indexOf(b)); }); };
  P.dueList = function () { var self = this, t = now();
    return this.ids.filter(function (id) { var r = self.data.skills[id]; return r && r.box >= 1 && t >= r.last + BOX_DAYS[r.box - 1] * DAY; }); };
  P.needsPlacement = function () { return !this.data.placement && !this.data.curriculum && !Object.keys(this.data.skills).length; };
  P.acc10 = function () { if (!this.acc.length) return 0.8; var s = 0; this.acc.forEach(function (x) { s += x; }); return s / this.acc.length; };

  P.make = function (id, d, extra) {
    var s = skills[id], rng = this.rng, item, tries = 0, rc = this.recent[id] || (this.recent[id] = []);
    d = clamp(d, -2, 2);
    do {
      if (banks[id]) { var pool = banks[id].slice().sort(function (a, b) { return Math.abs(a.diff - d) - Math.abs(b.diff - d); }).slice(0, 6);
        var b = pool[Math.floor(rng() * pool.length)]; item = { id: b.id, diff: b.diff, kind: b.kind, prompt: { text: b.prompt, speak: b.speak || b.prompt, art: b.art || null },
          answer: b.answer != null ? b.answer : b.word, choices: b.choices, tiles: b.tiles, hints: b.hints, worked: b.worked, distractorTags: b.distractorTags || {} }; }
      else { var g = gens[s.gen]; if (!g) throw new Error('No generator ' + s.gen + ' for ' + id); item = g(s.params || {}, d, rng); }
    } while (rc.indexOf(item.id) >= 0 && ++tries < 12);
    rc.push(item.id); if (rc.length > 20) rc.shift();
    item.skill = id; if (item.diff == null) item.diff = d; item.hintLevel = 0;
    for (var k in (extra || {})) item[k] = extra[k];
    return item;
  };
  P.targetD = function (id) { return this.rec(id).th - LN4 + this.data.offset; };

  // §7.1 controller
  P.next = function () {
    this.started = true; this.count++;
    var id, extra = {}, d, due = this.dueList();
    if (this.back && this.back.left > 0) { id = this.back.id; this.back.left--; extra.confidence = true; if (!this.back.left) this.back = null; }
    else if (due.length && this.count % 5 === 0) { var self = this; due.sort(function (a, b) { return self.rec(a).last - self.rec(b).last; }); id = due[0]; extra.review = true; }
    else if (this.lowerNext) { id = this.lowerNext; this.lowerNext = null; extra.confidence = true; }
    else {
      var fr = this.frontier();
      if (!fr.length) { var me = this; fr = this.ids.slice().sort(function (a, b) { return me.rec(a).p - me.rec(b).p; }); }
      var two = fr.slice(0, 2); id = two[this.count % two.length];
      if (this.preHintSkill && two.indexOf(this.preHintSkill) >= 0) id = this.preHintSkill;
    }
    d = this.targetD(id) + (this.dNudge[id] || 0);
    if (extra.confidence) d -= 0.8;
    if (this.preHintSkill === id) { d -= 1.0; extra.preHint = true; }
    if (this.bonus) { d += this.bonus; this.bonus = 0; }
    this.preHintSkill = null;
    var item = this.make(id, d, extra);
    if (item.preHint) item.hintLevel = 1;
    return item;
  };
  P.hint = function (item) { var h = item.hints || []; item.hintLevel = Math.min(3, (item.hintLevel || 0) + 1); return { level: item.hintLevel, text: h[Math.min(item.hintLevel, h.length) - 1] || '' }; };
  P.check = function (item, resp) { if (typeof item.check === 'function') return !!item.check(resp); if (typeof item.answer === 'number') return Number(resp) === item.answer; return String(resp).trim().toLowerCase() === String(item.answer).trim().toLowerCase(); };

  P.answer = function (item, response, weight) {
    var id = item.skill, s = skills[id], r = this.rec(id), b = s.bkt || {}, S = b.S || DEF_BKT.S, T = b.T || DEF_BKT.T;
    var G0 = b.G || (item.kind === 'choice' ? Math.max(0.20, 1 / ((item.choices || []).length || 4)) : 0.05), h = item.hintLevel || 0;
    var correct = weight === 'skip' ? false : this.check(item, response), credited = correct && h < 3, G = h >= 1 ? Math.min(0.5, G0 + 0.15 * h) : G0;
    var beforeU = this.unlockedSet(), beforeM = this.isMastered(id), p0 = r.p;
    var p1 = bkt(r.p, credited, S, credited ? G : G0, T);
    if (weight === 'skip') { var pi = bkt(r.p, false, S, G0, 0); r.p = 0.5 * r.p + 0.5 * (pi + (1 - pi) * T); } else r.p = p1;
    var rr = correct ? (h === 0 ? 1 : h < 3 ? 0.5 : 0) : 0, E = expected(r.th, item.diff);
    r.th = clamp(r.th + kFactor(r.n) * (rr - E), -3, 3); this.dNudge[id] = clamp((this.dNudge[id] || 0) - 0.02 * (rr - E), -0.5, 0.5);
    r.n++; r.hist.push(rr); if (r.hist.length > 20) r.hist.shift(); r.streak3.push(credited ? 1 : 0); if (r.streak3.length > 3) r.streak3.shift();
    if (item.review) { if (correct && h === 0) r.box = Math.min(5, r.box + 1); else { r.box = 1; r.p = Math.min(r.p, 0.70); } r.last = now(); }
    // rolling correction (§7.1.4)
    this.acc.push(rr); if (this.acc.length > 10) this.acc.shift();
    if (this.acc.length >= 5) { var a = this.acc10();
      if (a < 0.65) { this.data.offset -= 0.3; var w = this.weakestPrereq(id, true); if (w) this.lowerNext = w; }
      else if (a > 0.90) this.data.offset += 0.3;
      this.data.offset = clamp(this.data.offset, -1.5, 1.5); }
    // struggle / success rules (§7.1.5-6)
    if (credited) { this.wrongRun[id] = 0; } else { this.wrongRun[id] = (this.wrongRun[id] || 0) + 1; }
    if (correct && h === 0) this.rightRun++; else this.rightRun = 0;
    if (this.wrongRun[id] === 2) this.preHintSkill = id;
    if (this.wrongRun[id] >= 3) { var wp = this.weakestPrereq(id); if (wp) this.back = { id: wp, left: 2 }; this.wrongRun[id] = 0; }
    if (this.rightRun >= 5) { this.bonus = 0.7; this.rightRun = 0; }
    var mastered = [], unlocked = [];
    if (!beforeM && this.isMastered(id)) { mastered.push(id); if (!r.box) { r.box = 1; r.last = now(); } emit('mastered', { id: id }); }
    var afterU = this.unlockedSet(); for (var k in afterU) if (!beforeU[k]) { unlocked.push(k); emit('unlocked', { id: k }); }
    this.dirty();
    var fb = correct ? (h === 0 ? 'Nice, that\u2019s right.' : 'That\u2019s right. Well worked out.') : (weight === 'skip' ? 'Skipped. We\u2019ll come back to this kind later.' : 'Not quite. Here\u2019s a hint.');
    var tag = !correct && item.distractorTags ? item.distractorTags[response] : null;
    return { correct: correct, hintLevel: h, feedback: fb, misconception: tag || null, mastered: mastered, unlocked: unlocked, pBefore: p0, pAfter: r.p };
  };
  P.skip = function (item) { return this.answer(item, null, 'skip'); };
  P.unlockedSet = function () { var o = {}, self = this; this.ids.forEach(function (id) { if (self.isUnlocked(id)) o[id] = 1; }); return o; };
  P.weakestPrereq = function (id, masteredOk) { var self = this, ps = (skills[id].prereqs || []).filter(function (p) { return skills[p]; });
    if (!ps.length) return null; ps.sort(function (a, b) { return self.rec(a).p - self.rec(b).p; }); return ps[masteredOk ? ps.length - 1 : 0]; };
  P.progress = function () { var self = this;
    return { skills: this.ids.map(function (id) { return { id: id, title: skills[id].title, band: skills[id].band, state: self.isMastered(id) ? 'mastered' : self.isUnlocked(id) ? 'open' : 'locked' }; }), due: this.dueList().length }; };

  // §6 placement
  P.bandSkill = function (band) { var best = null, bd = 99, self = this;
    this.ids.forEach(function (id) { var dd = Math.abs(skills[id].band - band); if (dd < bd) { bd = dd; best = id; } }); return best; };
  P.bandRange = function () { var b = this.ids.map(function (id) { return skills[id].band; }); return [Math.min.apply(null, b), Math.max.apply(null, b)]; };
  P.startPlacement = function (startBand) { var rg = this.bandRange(), sb = startBand || (this.subject === 'coding' ? 2 : 4);
    this.placement = { band: clamp(sb, rg[0], rg[1]), step: 4, asked: 0, pair: [], done: false }; return this.placementItem(); };
  P.placementItem = function () { var pl = this.placement; var it = this.make(this.bandSkill(pl.band), 0, { placement: true }); return it; };
  P.placementAnswer = function (item, resp) {
    var pl = this.placement; if (!pl || pl.done) return null;
    pl.pair.push(this.check(item, resp) && (item.hintLevel || 0) === 0 ? 1 : 0); pl.asked++;
    if (pl.pair.length === 2) { var n = pl.pair[0] + pl.pair[1], rg = this.bandRange(), st = pl.step, hold = n === 1;
      if (n === 2) pl.band += st; else if (n === 0) pl.band -= st;
      var clamped = clamp(pl.band, rg[0], rg[1]); if (clamped !== pl.band) hold = hold || st === 1; pl.band = clamped;
      pl.pair = []; if (st === 1 && hold) pl.done = true; pl.step = Math.max(1, st / 2); }
    if (pl.asked >= 12) pl.done = true;
    if (pl.done) { this.seed(pl.band); this.data.placement = { band: pl.band, at: now() }; this.dirty(); return null; }
    return this.placementItem();
  };
  P.placementBand = function () { return this.placement ? this.placement.band : null; };
  P.seed = function (B) { var self = this; this.data.skills = {}; this.data.offset = 0; this.started = true;
    this.ids.forEach(function (id) { var bd = skills[id].band; self.data.skills[id] = cleanSkill({ p: bd < B ? 0.85 : bd === B ? 0.40 : 0.10, th: 0 }); }); };
  // curriculum pickers: only when LEARN_CURRICULUM_PICKER is on, and only frameworks whose per-picker flag
  // (built from curriculum-map.json <subject>Verified.pickerEnabled) is exactly true (ENGINE.md §9)
  function pickers() { var C = W.LEARN_CURRICULA; if (W.LEARN_CURRICULUM_PICKER !== true || !C || !C.frameworks) return [];
    return C.frameworks.filter(function (f) { return f && f.enabled === true && f.levels && f.levels.length; }); }
  P.pickLevel = function (framework, level) {
    var fw = null, lv = null; pickers().forEach(function (f) { if (f.id === framework) fw = f; });
    (fw && fw.levels || []).forEach(function (l) { if (l.id === level) lv = l; });
    if (!lv) return false; this.seed(lv.band || 1); this.data.curriculum = { framework: framework, level: level }; this.data.placement = null; this.dirty(); return lv.band;
  };
  P.pickBand = function (band) { var rg = this.bandRange(), b = clamp(band | 0, rg[0], rg[1]); this.seed(b); this.data.curriculum = { framework: 'level', level: String(b) }; this.data.placement = null; this.dirty(); return b; };
  P.startAtBeginning = function () { this.seed(1); this.dirty(); };

  // persistence (debounced 1 s, flushed on visibilitychange)
  P.dirty = function () { var self = this; if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(function () { self.save(); }, 1000); };
  P.save = function () { if (this.timer) { clearTimeout(this.timer); this.timer = null; } if (this.readOnly) return false;
    this.data.updated = now();
    var ok = sset(PREFIX + this.subject, this.data); emit('saved', { ok: ok }); return ok; };
  if (W.document) W.document.addEventListener('visibilitychange', function () { for (var k in sessions) if (sessions[k].timer) sessions[k].save(); });

  function reset(subject) { sdel(PREFIX + subject); sdel(BAK + subject); var s = sessions[subject];
    if (s) { if (s.timer) clearTimeout(s.timer); s.timer = null; s.data = blank(subject); s.acc = []; s.recent = {}; s.wrongRun = {}; s.back = null; s.placement = null; s.lowerNext = null; s.preHintSkill = null; s.readOnly = false; } return true; }
  function resetAll() { var ks = []; try { for (var i = 0; i < W.localStorage.length; i++) ks.push(W.localStorage.key(i)); } catch (e) {}
    ks.concat(Object.keys(mem)).forEach(function (k) { if (k && k.indexOf('eagle.learn.') === 0) sdel(k); }); for (var s in sessions) reset(s); return true; }

  // §8.3 export / import (local file only, no upload)
  function exportData(subject) { var s = sessions[subject]; if (s) s.save(); var d = sget(PREFIX + subject) || (s && s.data) || blank(subject); return { format: 'eagle-learn-export', schema: SCHEMA, data: sanitise(d, subject) }; }
  function exportFile(subject) {
    var obj = exportData(subject), d = new Date(now()), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var name = 'eagle-learn-' + subject + '-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.json';
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 0); return name;
  }
  function parseImport(text, subject) {
    var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, reason: 'That file isn\u2019t a progress file.' }; }
    if (!o || o.format !== 'eagle-learn-export') return { ok: false, reason: 'That file isn\u2019t a progress file.' };
    if ((o.schema | 0) > SCHEMA || !o.data) return { ok: false, reason: 'That file is from a newer version.' };
    var subj = o.data.subject; if (subject && subj !== subject) return { ok: false, reason: 'That file is for a different subject.' };
    if (!/^(maths|english|coding)$/.test(subj)) return { ok: false, reason: 'That file isn\u2019t a progress file.' };
    var clean = sanitise(migrate(o.data, subj), subj);
    return { ok: true, reason: '', subject: subj, data: clean, skills: Object.keys(clean.skills).length,
      apply: function () { sset(PREFIX + subj, clean); var s = sessions[subj]; if (s) { s.data = sanitise(clean, subj); s.readOnly = false; } return true; } };
  }
  function importFile(file, subject) { return new Promise(function (res) {
    if (typeof file === 'string') return res(parseImport(file, subject));
    var r = new FileReader(); r.onload = function () { res(parseImport(String(r.result), subject)); }; r.onerror = function () { res({ ok: false, reason: 'Couldn\u2019t read that file.' }); };
    if (!file || file.size > 200000) return res({ ok: false, reason: 'That file isn\u2019t a progress file.' }); r.readAsText(file); }); }

  var K = W.LearnKit = {
    version: VERSION, defineSkills: defineSkills, registerGenerator: registerGenerator, loadBank: loadBank,
    open: function (subject, opts) { return new Session(subject, opts); },
    reset: reset, resetAll: resetAll, exportFile: exportFile, exportData: exportData, importFile: importFile, settings: settings, migrations: {},
    on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    storageOk: function () { return storageOk; }, pickers: pickers, skill: function (id) { return skills[id]; }, skillIds: subjectSkills,
    util: { mulberry32: mulberry32, bkt: bkt, expected: expected, kFactor: kFactor, clamp: clamp, ID_RE: ID_RE, BOX_DAYS: BOX_DAYS },
    _now: null, _clear: function () { skills = {}; order = []; gens = {}; banks = {}; sessions = {}; }
  };
})(window);
