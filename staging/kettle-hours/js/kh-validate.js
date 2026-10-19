/* Kettle Hours content validator. Shared by the browser (runtime check before a pack is used)
   and node (tools/validate.js). No dependencies. Implements the JSON Schema subset used by
   schema/kettle-hours.schema.json, then semantic checks (references, branches, safety rules). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KHValidate = factory();
})(this, function () {
  'use strict';
  function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : (typeof v === 'number' && Number.isInteger(v)) ? 'integer' : typeof v; }
  function typeOk(v, t) { var a = typeOf(v); return a === t || (t === 'number' && a === 'integer'); }
  function resolve(root, ref) { return ref.replace(/^#\//, '').split('/').reduce(function (o, k) { return o && o[k]; }, root); }

  function check(root, s, v, path, errs) {
    if (s.$ref) return check(root, resolve(root, s.$ref), v, path, errs);
    var n0 = errs.length;
    if (s.type && !typeOk(v, s.type)) { errs.push(path + ': should be ' + s.type); return false; }
    if ('const' in s && v !== s.const) errs.push(path + ': should be ' + JSON.stringify(s.const));
    if (s.enum && s.enum.indexOf(v) < 0) errs.push(path + ': should be one of ' + s.enum.join(', ') + ' (got ' + JSON.stringify(v) + ')');
    if (typeof v === 'string') {
      if (s.minLength != null && v.length < s.minLength) errs.push(path + ': is empty');
      if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(path + ': "' + v + '" does not match ' + s.pattern);
    }
    if (typeof v === 'number') {
      if (s.minimum != null && v < s.minimum) errs.push(path + ': below ' + s.minimum);
      if (s.maximum != null && v > s.maximum) errs.push(path + ': above ' + s.maximum);
    }
    if (typeOf(v) === 'array') {
      if (s.minItems != null && v.length < s.minItems) errs.push(path + ': needs at least ' + s.minItems + ' item(s)');
      if (s.items) v.forEach(function (x, i) { check(root, s.items, x, path + '[' + i + ']', errs); });
    }
    if (typeOf(v) === 'object') {
      var keys = Object.keys(v);
      if (s.minProperties != null && keys.length < s.minProperties) errs.push(path + ': needs at least ' + s.minProperties + ' key(s)');
      (s.required || []).forEach(function (k) { if (!(k in v)) errs.push(path + ': missing "' + k + '"'); });
      keys.forEach(function (k) {
        if (s.properties && s.properties[k]) check(root, s.properties[k], v[k], path + '.' + k, errs);
        else if (s.additionalProperties === false) errs.push(path + ': unknown key "' + k + '"');
        else if (s.additionalProperties && typeof s.additionalProperties === 'object') check(root, s.additionalProperties, v[k], path + '.' + k, errs);
      });
    }
    if (s.oneOf) {
      var ok = s.oneOf.filter(function (sub) { var e = []; check(root, sub, v, path, e); return !e.length; }).length;
      if (ok !== 1) errs.push(path + ': does not match exactly one allowed form');
    }
    (s.allOf || []).forEach(function (sub) { check(root, sub, v, path, errs); });
    if (s.if) { var e2 = []; check(root, s.if, v, path, e2); if (!e2.length && s.then) check(root, s.then, v, path, errs); }
    return errs.length === n0;
  }

  var STEP_KEYS = {
    say: ['speaker', 'expression', 'text', 'audio'], narrate: ['text', 'audio'],
    observe: ['mode', 'prompt', 'art', 'before', 'after', 'beforeLabel', 'afterLabel', 'minFind', 'doneText', 'hotspots'],
    choice: ['prompt', 'options'], nextstep: ['prompt', 'options'],
    drink: ['for', 'prompt', 'order', 'matchEffects', 'matchText', 'otherText'],
    journal: ['id', 'text', 'about', 'tag', 'silent'], set: ['effects'], goto: ['scene'], audio: ['audio'],
    expression: ['character', 'expression'], signpost: ['text', 'level']
  };
  var BANNED = [/\bMHFA\b/i, /mental health first aid/i];
  var HEAVY_WORDS = /suicid|self[- ]?harm/i;

  function semantic(pack, errs, warns) {
    var chars = pack.characters || {}, vars = pack.vars || ['trust', 'rapport'];
    var flagsSet = {}, flagsRead = {}, chapterIds = {};
    function txt(s, p) { if (typeof s !== 'string') return; BANNED.forEach(function (re) { if (re.test(s)) errs.push(p + ': uses banned branding "' + s.match(re)[0] + '"'); });
      if (s.length > 400) warns.push(p + ': long line (' + s.length + ' chars); consider splitting for small screens'); }
    var pvars = Object.keys(pack.playerVars || {});
    function varRef(r, p) { if (!r) return; var a = r.split('.');
      if (a[0] === 'player') { if (pvars.indexOf(a[1]) < 0) errs.push(p + ': unknown player var "' + a[1] + '" (declare it in pack.playerVars)'); return; }
      if (!chars[a[0]]) errs.push(p + ': unknown character "' + a[0] + '" in var ' + r);
      if (vars.indexOf(a[1]) < 0) errs.push(p + ': unknown var "' + a[1] + '" (declare it in pack.vars)'); }
    function effects(list, p) { (list || []).forEach(function (e, i) { var q = p + '[' + i + ']';
      if (e.flag) flagsSet[e.flag] = 1; if (e.var) { varRef(e.var, q); if (!('add' in e) && !('set' in e)) errs.push(q + ': var needs add or set'); }
      if (e.skill && pack.skills && !pack.skills.some(function (k) { return k.id === e.skill; })) errs.push(q + ': unknown skill ' + e.skill);
      if (e.guide && pack.guides && pack.guides.length && !pack.guides.some(function (g) { return g.id === e.guide; })) warns.push(q + ': guide card "' + e.guide + '" not written yet');
      if (e.skill) flagsSet['skill_' + e.skill] = 1; if (e.street) flagsSet['street_' + e.street] = 1; if (e.guide) flagsSet['guide_' + e.guide] = 1;
      if (e.expression) { var a = e.expression.split('.'); if (!chars[a[0]] || chars[a[0]].expressions.indexOf(a[1]) < 0) errs.push(q + ': unknown expression ' + e.expression); } }); }
    function cond(c, p) { if (!c) return; if (c.flag) flagsRead[c.flag] = p; if (c.noflag) flagsRead[c.noflag] = p; if (c.var) varRef(c.var, p);
      (c.all || []).concat(c.any || []).forEach(function (x) { cond(x, p); }); if (c.not) cond(c.not, p);
      if (c.chapterDone && !(pack.chapters || []).some(function (ch) { return ch.id === c.chapterDone; })) errs.push(p + ': chapterDone refers to unknown chapter ' + c.chapterDone); }
    function art(a, p) { if (a && typeof a === 'object' && a.placeholder && a.placeholder.character && !chars[a.placeholder.character]) errs.push(p + ': placeholder for unknown character ' + a.placeholder.character); }

    Object.keys(chars).forEach(function (id) { if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) errs.push('characters.' + id + ': id must be lower-case letters, digits, - or _');
      Object.keys(chars[id].start || {}).forEach(function (v) { if (vars.indexOf(v) < 0) errs.push('characters.' + id + '.start: unknown var ' + v); }); });

    (pack.chapters || []).forEach(function (ch, ci) {
      var cp = 'chapters[' + ci + '](' + ch.id + ')';
      if (chapterIds[ch.id]) errs.push(cp + ': duplicate chapter id'); chapterIds[ch.id] = 1;
      txt(ch.title, cp + '.title'); txt(ch.skipSummary, cp + '.skipSummary');
      var cws = ch.contentWarnings || [];
      var heavy = ch.heavy || cws.some(function (w) { return HEAVY_WORDS.test(w); });
      if (heavy && !ch.skippable) errs.push(cp + ': covers suicide/self-harm, so it must be skippable (safe-messaging rule)');
      if (heavy && !cws.length) errs.push(cp + ': heavy chapter needs contentWarnings');
      if (ch.skippable && !ch.skipSummary) errs.push(cp + ': skippable chapter needs a gentle skipSummary');
      if (cws.length && !ch.skippable) warns.push(cp + ': has content warnings but is not skippable');
      effects(ch.skipEffects, cp + '.skipEffects');
      var sceneIds = {}; (ch.scenes || []).forEach(function (s) { if (sceneIds[s.id]) errs.push(cp + ': duplicate scene id ' + s.id); sceneIds[s.id] = 1; });
      if (ch.startScene && !sceneIds[ch.startScene]) errs.push(cp + ': startScene ' + ch.startScene + ' not found');
      var reach = {}, ends = false;
      function target(id, p) { if (!sceneIds[id]) errs.push(p + ': goes to unknown scene "' + id + '" (scenes are local to the chapter)'); else reach[id] = 1; }
      function steps(list, p, s) { (list || []).forEach(function (st, i) {
        var q = p + '[' + i + '](' + st.type + ')', allowed = STEP_KEYS[st.type];
        if (allowed) Object.keys(st).forEach(function (k) { if (k !== 'type' && k !== 'if' && allowed.indexOf(k) < 0) errs.push(q + ': unknown key "' + k + '" for a ' + st.type + ' step'); });
        cond(st.if, q); txt(st.text, q); txt(st.prompt, q);
        if (st.type === 'say') { var c = chars[st.speaker]; if (!c && st.speaker !== 'you') errs.push(q + ': unknown speaker "' + st.speaker + '" (use a character id or "you")');
          else if (c && st.expression && c.expressions.indexOf(st.expression) < 0) errs.push(q + ': ' + st.speaker + ' has no expression "' + st.expression + '"'); }
        if (st.type === 'expression') { var c2 = chars[st.character]; if (!c2) errs.push(q + ': unknown character'); else if (c2.expressions.indexOf(st.expression) < 0) errs.push(q + ': unknown expression'); }
        if (st.type === 'drink' && !chars[st.for]) errs.push(q + ': unknown character "' + st.for + '"');
        if (st.type === 'drink') effects(st.matchEffects, q + '.matchEffects');
        if (st.type === 'journal' && st.about && !chars[st.about]) errs.push(q + ': about unknown character');
        if (st.type === 'set') effects(st.effects, q + '.effects');
        if (st.type === 'goto') target(st.scene, q);
        if (st.type === 'observe') { art(st.art, q); art(st.before, q); art(st.after, q);
          if (st.mode === 'compare' && (!st.before || !st.after)) errs.push(q + ': compare mode needs before and after art');
          var hs = st.hotspots || [], ids = {}, changed = hs.filter(function (h) { return h.changed; }).length;
          hs.forEach(function (h, j) { if (ids[h.id]) errs.push(q + '.hotspots: duplicate id ' + h.id); ids[h.id] = 1; effects(h.effects, q + '.hotspots[' + j + ']');
            if (h.x + h.w > 100.01 || h.y + h.h > 100.01) errs.push(q + '.hotspots[' + j + ']: runs off the picture (x+w and y+h must be <= 100)'); txt(h.found, q); });
          if ((st.minFind || 0) > changed) errs.push(q + ': minFind ' + st.minFind + ' but only ' + changed + ' hotspot(s) are marked changed'); }
        if (st.type === 'choice' || st.type === 'nextstep') {
          var opts = st.options || [];
          if (!opts.some(function (o) { return !o.if; })) warns.push(q + ': every option has a condition; make sure one is always available or the player can get stuck');
          opts.forEach(function (o, j) { var oq = q + '.options[' + j + ']'; txt(o.text, oq); txt(o.outcome, oq); cond(o.if, oq); effects(o.effects, oq);
            if (o.goto) target(o.goto, oq); steps(o.reply, oq + '.reply', s);
            if (st.type === 'choice' && o.outcome) warns.push(oq + ': outcome is only shown on nextstep steps'); });
        }
      }); }
      (ch.scenes || []).forEach(function (s, si) {
        var sp = cp + '.scenes[' + si + '](' + s.id + ')';
        cond(s.if, sp); art(s.bg, sp); (s.present || []).forEach(function (c) { if (!chars[c]) errs.push(sp + ': present lists unknown character ' + c); });
        if (s.next) target(s.next, sp); if (s.skipTo) target(s.skipTo, sp + '.skipTo'); if (s.ifFailNext) target(s.ifFailNext, sp + '.ifFailNext');
        var scw = s.contentWarnings || [], sheavy = scw.some(function (w) { return HEAVY_WORDS.test(w); });
        if (sheavy && !s.skippable) errs.push(sp + ': covers suicide/self-harm, so it must be skippable');
        if (s.skippable && !scw.length) warns.push(sp + ': skippable but has no contentWarnings, so the skip screen never shows');
        if (s.skippable && !s.skipSummary && !s.skipTo) errs.push(sp + ': skippable scene needs skipSummary or skipTo');
        txt(s.skipSummary, sp + '.skipSummary'); txt(s.cwText, sp + '.cwText'); if (s.endsChapter) ends = true; steps(s.steps, sp + '.steps', s);
      });
      var list = ch.scenes || []; var first = ch.startScene || (list[0] && list[0].id);
      list.forEach(function (s, i) { if (i > 0 && !reach[s.id] && s.id !== first) { var prev = list[i - 1]; if (prev.next || prev.endsChapter) warns.push(cp + ': scene ' + s.id + ' may be unreachable'); } });
      if (!list.some(function (s) { return s.endsDay; })) warns.push(cp + ': no scene has endsDay; the day ends when the chapter ends');
      void ends;
    });
    Object.keys(flagsRead).forEach(function (f) { if (!flagsSet[f]) warns.push(flagsRead[f] + ': flag "' + f + '" is checked but never set'); });
    if (pack.contentWarning) txt(pack.contentWarning, 'contentWarning');
  }

  function validatePack(pack, schema) {
    var errs = [], warns = [];
    if (!pack || typeof pack !== 'object') return { ok: false, errors: ['pack is not a JSON object'], warnings: [] };
    if (schema) check(schema, schema, pack, '$', errs);
    try { semantic(pack, errs, warns); } catch (e) { errs.push('semantic check crashed: ' + e.message); }
    return { ok: errs.length === 0, errors: errs, warnings: warns };
  }
  return { validatePack: validatePack };
});
