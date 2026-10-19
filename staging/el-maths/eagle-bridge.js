/* Game bridge + tiny one-touch runtime. No deps, no network.
   Protocol: see PROTOCOL.md. Usage: EagleGame.run({ id, title, init, update, draw, down, up, music }) */
(function (W) {
  'use strict';
  var VW = 360, VH = 640; // logical 9:16 space
  var THEMES = {
    dark:  { bg: '#10141f', fg: '#f2f4f8', dim: '#7c869c', accent: '#ffb547', good: '#5ee08a', bad: '#ff5a6a', panel: 'rgba(0,0,0,.55)' },
    light: { bg: '#f4f1ea', fg: '#1d2230', dim: '#8a8f9c', accent: '#e07a00', good: '#1f9d55', bad: '#d6283c', panel: 'rgba(255,255,255,.75)' }
  };
  var AK = W.AudioKit || null, PACK = null, bgCache = null, edgeCv = null, edgeTick = 0;

  function Bridge(gameId) {
    this.game = gameId; this.handlers = {};
    var self = this;
    W.addEventListener('message', function (e) {
      var d = e.data;
      // native 'eagle-host' {action}; compat: site-theme style 'el-command'/'el-host' {action|command} (theme sends none today)
      if (d && (d.type === 'el-command' || d.type === 'el-host') && typeof (d.action || d.command) === 'string') d = { type: 'eagle-host', action: d.action || d.command, game: d.game };
      if (!d || d.type !== 'eagle-host' || typeof d.action !== 'string') return;
      if (d.game && d.game !== self.game) return;
      var h = self.handlers[d.action]; if (h) h(d);
    });
  }
  Bridge.prototype.on = function (a, fn) { this.handlers[a] = fn; };
  Bridge.prototype.send = function (event, g, extra) {
    // EAGLE_LEARN guard (ENGINE.md §1.2): learning games send only plain integers for ready/start/score/levelup/gameover,
    // never achievement or like-prompt, and no extra keys (no title, reason, skill, answer or mastery data).
    if (W.EAGLE_LEARN === true) { if (!/^(ready|start|score|levelup|gameover)$/.test(event)) return; extra = null; }
    var msg = { type: 'eagle-game', game: this.game, event: event, score: g.score | 0, level: g.level | 0, best: g.best | 0 };
    if (extra) for (var k in extra) msg[k] = extra[k];
    W.__eagleLog = W.__eagleLog || []; W.__eagleLog.push(msg);
    if (W.parent && W.parent !== W) W.parent.postMessage(msg, '*');
    // compat: the site theme listens only for { type:'el-score', value:<number> } (theme_with_consent.xml ~4945)
    if (event === 'score' || event === 'gameover' || event === 'start') {
      var el = { type: 'el-score', value: g.score | 0, game: this.game, event: event };
      // logged only in __elLog, so __eagleLog stays native-only (tests count events like 'gameover' there)
      (W.__elLog = W.__elLog || []).push(el); if (W.parent && W.parent !== W) W.parent.postMessage(el, '*');
    }
  };

  function css() {
    var s = document.createElement('style');
    s.textContent = 'html,body{margin:0;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      'body{display:flex;align-items:center;justify-content:center;transition:background .3s}' +
      /* full-viewport canvas (fills Android dynamic-toolbar space; JS sets the exact visualViewport height). The 9:16 play area is
         drawn 'contain' inside it and the edge rows/columns are stretched into the leftover space, so there is never an empty bar. */
      '#eg-wrap{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100dvh;overflow:hidden}' +
      '#eg-wrap canvas{position:absolute;display:block}' +
      '#eg-area{position:absolute;pointer-events:none}#eg-area>*{pointer-events:auto}#eg-area>#eg-ov.hide{pointer-events:none}' +
      '.eg-btn{position:absolute;top:8px;right:8px;width:44px;height:44px;border-radius:22px;border:0;font-size:20px;cursor:pointer;z-index:5;background:rgba(0,0,0,.35);color:#fff}' +
      '#eg-pause{right:58px}' /* 44px touch minimum (Skye QA) */ +
      '#eg-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:4;padding:24px;box-sizing:border-box}' +
      '#eg-ov h1{margin:0 0 8px;font-size:34px}#eg-ov p{margin:4px 0;font-size:16px;opacity:.85}#eg-ov .big{font-size:22px;margin-top:18px;font-weight:700}' +
      '#eg-ov.hide{display:none}';
    document.head.appendChild(s);
  }

  function run(def) {
    css();
    var wrap = document.createElement('div'); wrap.id = 'eg-wrap';
    var cv = document.createElement('canvas'); wrap.appendChild(cv);
    var mute = document.createElement('button'); mute.className = 'eg-btn'; mute.id = 'eg-mute'; mute.setAttribute('aria-label', 'Mute');
    var pbtn = document.createElement('button'); pbtn.className = 'eg-btn'; pbtn.id = 'eg-pause'; pbtn.setAttribute('aria-label', 'Pause'); pbtn.textContent = '❚❚';
    var ov = document.createElement('div'); ov.id = 'eg-ov'; ov.setAttribute('role', 'status'); ov.setAttribute('aria-live', 'polite');
    var area = document.createElement('div'); area.id = 'eg-area'; wrap.appendChild(area);
    area.appendChild(mute); area.appendChild(pbtn); area.appendChild(ov); document.body.appendChild(wrap);
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', def.title + ': ' + (def.howto || ''));
    // milestones: a game may route them to the host's XP API (def.onMilestone returns true when handled), else postMessage
    function milestone(kind, data) { if (!def.onMilestone) return false; try { return !!def.onMilestone(g, kind, data); } catch (e) { return false; } }
    var ctx = cv.getContext('2d');
    if (AK && AK.games) PACK = AK.games[def.id] || (def.packAlias && AK.games[def.packAlias]) || null;
    if (AK && AK.unlock) try { AK.unlock(); } catch (e) {}
    var bridge = new Bridge(def.id);
    var bestKey = 'eagle-best-' + def.id, best = 0;
    try { best = +localStorage.getItem(bestKey) || 0; } catch (e) {}

    var g = W.__eagle = {
      id: def.id, W: VW, H: VH, ctx: ctx, t: 0, score: 0, level: 1, best: best, state: 'title', // title|play|over
      paused: false, hostPaused: false, hidden: false, muted: false, themeName: 'dark', theme: THEMES.dark,
      // bottom-safe rule: host bars + device safe area. Nothing important may be drawn below g.safeBottom (logical y).
      insets: { top: 0, bottom: 80 }, safeTop: 0, safeBottom: VH,
      safeY: function (y, h) { return Math.min(y, g.safeBottom - 6 - (h || 0)); },
      shakeAmt: 0, shake: function (a) { g.shakeAmt = Math.max(g.shakeAmt, a); },
      reducedMotion: !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches),
      vibrate: function (ms) { if (!g.reducedMotion && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} },
      player: null, held: false, data: {}, runs: 0, likePrompted: false, achieved: {},
      rand: function (a, b) { return a + Math.random() * (b - a); },
      // g.sfx(packName, arg, fallbackGeneric): per-game pack (Harper) first, then generic kit sfx
      sfx: function (n, arg, fb) { if (!AK || g.muted) return; try {
        if (PACK && PACK.sfx && PACK.sfx[n]) PACK.sfx[n](arg); else { var k = fb || n; if (AK.sfx && AK.sfx[k]) AK.sfx[k](); } } catch (e) {} },
      note: function (f, dur) { if (AK && !g.muted) try { AK.tone({ type: 'triangle', f0: f, f1: f, dur: dur || 0.25, gain: 0.25 }); } catch (e) {} },
      addScore: function (n) {
        g.score += n; g.scorePulse = 1; bridge.send('score', g);
        if (def.levelEvery && Math.floor(g.score / def.levelEvery) + 1 > g.level) { g.level = Math.floor(g.score / def.levelEvery) + 1; g.sfx('powerUp'); if (!milestone('levelup', {})) bridge.send('levelup', g); }
        (def.achievements || []).forEach(function (a) { if (!g.achieved[a.id] && g.score >= a.score) { g.achieved[a.id] = 1; if (!milestone('achievement', { id: a.id, name: a.name, xp: a.xp })) bridge.send('achievement', g, { id: a.id, name: a.name }); g.toast = { text: '★ ' + a.name, t: 2 }; } });
      },
      gameOver: function (reason) {
        if (g.state !== 'play') return;
        g.state = 'over'; g.overReason = reason || ''; g.runs++; g.sfx(def.overSfx || 'gameOver', null, 'gameOver'); music && music.stop();
        g.newBest = g.score > g.best && g.score > 0; g.overAt = performance.now(); if (g.score > g.best) { g.best = g.score; try { localStorage.setItem(bestKey, g.best); } catch (e) {} }
        bridge.send('gameover', g, { reason: reason || '' });
        if (!g.likePrompted && (g.runs >= 3 || (g.score >= (def.likeScore || 20)))) { g.likePrompted = true; bridge.send('like-prompt', g); }
        overlay();
      },
      // swappable art: assets/<name>.png if present, else null -> draw placeholder
      art: {},
      // draw sprite centred at x,y with size w,h; falls back to placeholder fn if file missing
      // frame from a strip/grid sheet: cols x rows equal cells, left-to-right, no gaps
      frame: function (n, col, row, cols, rows, x, y, w, h, fb, rot, flip) {
        var im = g.art[n]; if (!im) { if (fb) fb(ctx, x, y, w, h); return; }
        var fw = im.width / cols, fh = im.height / rows; ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
        ctx.drawImage(im, (col % cols) * fw, (row % rows) * fh, fw, fh, -w / 2, -h / 2, w, h); ctx.restore();
      },
      // bg is pre-scaled once to device pixels (and theme wash baked in) so each frame is a 1:1 blit
      bg: function () { var im = g.art.bg; if (!im) return false;
        var bw = Math.max(1, Math.round(VW * view.k)), bh = Math.max(1, Math.round(VH * view.k));
        if (!bgCache || bgCache.w !== bw || bgCache.h !== bh || bgCache.th !== g.themeName) {
          var oc = document.createElement('canvas'); oc.width = bw; oc.height = bh; var o = oc.getContext('2d');
          o.drawImage(im, 0, 0, oc.width, oc.height); if (g.themeName === 'light') { o.fillStyle = 'rgba(255,255,255,.35)'; o.fillRect(0, 0, oc.width, oc.height); }
          bgCache = { c: oc, w: bw, h: bh, th: g.themeName }; }
        ctx.drawImage(bgCache.c, 0, 0, VW, VH); return true; },
      sprite: function (n, x, y, w, h, fb, rot, flip) {
        var im = g.art[n];
        if (im) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
        else if (fb) fb(ctx, x, y, w, h);
      }
    };
    g.json = {}; (def.json || []).forEach(function (n) { try { fetch('assets/' + n + '.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) g.json[n] = j; }).catch(function () {}); } catch (e) {} });
    (def.art || []).concat(['bg']).forEach(function (n) { var im = new Image(); im.onload = function () { g.art[n] = im; }; im.onerror = function () {}; im.src = (def.artPaths && def.artPaths[n]) || 'assets/' + n + '.png'; });

    var music = AK && AK.Player ? new AK.Player() : null;
    g.music = music; g.pack = PACK; if (def.audioReady) try { def.audioReady(g); } catch (e) {}
    // Audio pause/mute is delegated to AudioKit (it also self-handles hidden tabs); the bridge only tells it the combined state.
    var akPaused = false;
    function musicOn() {
      if (!music) return;
      var p = isPaused(); if (p !== akPaused) { akPaused = p; try { p ? AK.pause() : AK.resume(); } catch (e) {} }
      if (g.state === 'play') { if (!music.playing) try { music.play((PACK && PACK.loop) || AK.loops[def.music || 'meadowRun']); } catch (e) {} }
      else if (music.playing) music.stop();
    }
    function isPaused() { return g.paused || g.hostPaused || g.hidden; }
    function setMute(m) { g.muted = m; if (AK) AK.setMuted(m); mute.textContent = m ? '🔇' : '🔊'; musicOn(); }
    function setTheme(n) { g.themeName = THEMES[n] ? n : 'dark'; g.theme = THEMES[g.themeName]; document.body.style.background = g.theme.bg; ov.style.color = g.theme.fg; overlay(); }

    function overlay() {
      var th = g.theme;
      ov.style.background = th.panel;
      if (g.state === 'play' && !isPaused()) { ov.className = 'hide'; return; }
      ov.className = '';
      var who = g.player ? '<p>' + esc(g.player.name) + ' · Lv ' + (g.player.level | 0) + '</p>' : '';
      if (isPaused() && g.state === 'play') ov.innerHTML = '<h1>Paused</h1>' + who + '<p class="big">Tap to resume</p>';
      else if (g.state === 'title') ov.innerHTML = '<h1>' + esc(def.title) + '</h1><p>' + esc(def.howto) + '</p>' + who + '<p>Best ' + g.best + '</p><p class="big">Tap to start</p>';
      else ov.innerHTML = '<h1>' + (g.newBest ? '🎉 New best!' : 'Game over') + '</h1>' + (g.overReason ? '<p>' + esc(g.overReason.charAt(0).toUpperCase() + g.overReason.slice(1)) + '</p>' : '') + '<p>Score ' + g.score + ' · Best ' + g.best + '</p>' + who + '<p class="big">Tap to retry</p>';
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

    function start() {
      g.state = 'play'; g.score = 0; g.level = 1; g.t = 0; g.achieved = {}; g.data = {}; g.held = false; g.paused = false;
      def.init(g); g.newBest = false; bridge.send('start', g); overlay(); musicOn();
    }
    function pause(src) { if (src === 'host') g.hostPaused = true; else g.paused = true; g.held = false; overlay(); musicOn(); }
    function resume(src) { if (src === 'host') g.hostPaused = false; else g.paused = false; last = performance.now(); overlay(); musicOn(); }

    // input: one touch, pointer events
    var downAt = 0;
    cv.addEventListener('pointerdown', handleDown); ov.addEventListener('pointerdown', handleDown);
    function handleDown(e) {
      e.preventDefault(); if (AK) AK.unlock && getAudio();
      if (g.state !== 'play') { if (g.state === 'over' && performance.now() - (g.overAt || 0) < 600) return; start(); return; }
      if (isPaused()) { g.paused = false; g.hostPaused = false; resume(); return; }
      tapXY(e); g.held = true; downAt = performance.now(); def.down && def.down(g);
    }
    W.addEventListener('pointerup', function () { if (g.held) { g.held = false; def.up && def.up(g, performance.now() - downAt); } });
    W.addEventListener('pointercancel', function () { g.held = false; });
    W.addEventListener('keydown', function (e) { if (e.code === 'Space' && !e.repeat) handleDown(e); });
    W.addEventListener('keyup', function (e) { if (e.code === 'Space' && g.held) { g.held = false; def.up && def.up(g, performance.now() - downAt); } });
    // tap position in logical play-area coords (undefined for keyboard): lets a game read which side was tapped
    function tapXY(e) { var c = view.css; if (e && typeof e.clientX === 'number' && c.w) { g.tapX = (e.clientX - c.x) / c.w * VW; g.tapY = (e.clientY - c.y) / c.h * VH; } else { g.tapX = g.tapY = undefined; } }
    function getAudio() { try { AK.getContext(); } catch (e) {} }
    mute.addEventListener('pointerdown', function (e) { e.stopPropagation(); setMute(!g.muted); });
    pbtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (g.state === 'play') isPaused() ? (g.hostPaused = false, resume()) : pause(); });

    // host -> game
    bridge.on('pause', function () { pause('host'); });
    bridge.on('resume', function () { resume('host'); });
    bridge.on('mute', function () { setMute(true); });
    bridge.on('unmute', function () { setMute(false); });
    bridge.on('restart', function () { start(); });
    bridge.on('set-theme', function (d) { setTheme(d.theme); });
    bridge.on('player-info', function (d) { g.player = { name: String(d.name || 'Player').slice(0, 24), xp: d.xp | 0, level: d.level | 0 }; overlay(); });
    bridge.on('set-insets', function (d) { g.insets = { top: Math.max(0, +d.top || 0), bottom: Math.max(0, d.bottom == null ? 80 : +d.bottom || 0) }; applyInsets(); });
    bridge.on('set-motion', function (d) { g.reducedMotion = !!d.reduced; });
    bridge.on('set-best', function (d) { var b = d.best | 0; if (b >= 0) { g.best = b; try { localStorage.setItem(bestKey, b); } catch (e) {} overlay(); } });

    // auto-pause: tab hidden or iframe scrolled out of view
    var visTab = !document.hidden, visIO = true;
    function vis() { var h = !(visTab && visIO); if (h !== g.hidden) { g.hidden = h; if (!h) last = performance.now(); overlay(); musicOn(); } }
    document.addEventListener('visibilitychange', function () { visTab = !document.hidden; vis(); });
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { visIO = es[es.length - 1].intersectionRatio >= 0.5; vis(); }, { threshold: [0, 0.5, 1] }).observe(wrap);

    // device safe-area insets (CSS px), read via a probe using env()
    var probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)'; document.body.appendChild(probe);
    function applyInsets() {
      var cs = getComputedStyle(probe), st = parseFloat(cs.paddingTop) || 0, sb = parseFloat(cs.paddingBottom) || 0;
      var r = area.getBoundingClientRect(), vh = W.innerHeight || r.bottom, k = VH / (r.height || VH);
      var coverB = Math.max(0, r.bottom - (vh - (g.insets.bottom + sb))), coverT = Math.max(0, (g.insets.top + st) - r.top);
      g.safeBottom = VH - coverB * k; g.safeTop = coverT * k;
      mute.style.top = pbtn.style.top = (8 + Math.max(0, g.insets.top + st - r.top)) + 'px';
      ov.style.paddingBottom = (24 + coverB) + 'px';
    }
    // view: play-area placement in device px (k = scale, ox/oy = offset) and CSS px (css); recomputed on every viewport change
    var view = g.view = { k: 1, ox: 0, oy: 0, css: { x: 0, y: 0, w: VW, h: VH } };
    function resize() {
      var vw = W.innerWidth || document.documentElement.clientWidth, vh = W.innerHeight || document.documentElement.clientHeight; // layout viewport: tracks Chrome's dynamic toolbar
      // a hidden/collapsing iframe (theme overlay or FULL toggle mid-transition) can report 0x0: keep the last good size instead of a 0-px canvas (black), re-measure shortly
      if (!(vw >= 2 && vh >= 2)) { setTimeout(onResize, 250); return; }
      edgeTick = 0; wrap.style.height = Math.round(vh) + 'px'; wrap.style.width = Math.round(vw) + 'px';
      var dpr = Math.min(W.devicePixelRatio || 1, 2), kc = Math.min(vw / VW, vh / VH), aw = VW * kc, ah = VH * kc, ax = Math.round((vw - aw) / 2), ay = Math.round((vh - ah) / 2);
      // the canvas covers only the 9:16 play area (cheap); the leftover viewport is filled by CSS bands (see fillEdges)
      cv.width = Math.round(aw * dpr); cv.height = Math.round(ah * dpr); cv.style.cssText = 'left:' + ax + 'px;top:' + ay + 'px;width:' + aw + 'px;height:' + ah + 'px';
      view.css = { x: ax, y: ay, w: aw, h: ah, vw: vw, vh: vh }; view.k = cv.width / VW; view.ox = 0; view.oy = 0;
      area.style.cssText = 'left:' + ax + 'px;top:' + ay + 'px;width:' + aw + 'px;height:' + ah + 'px';
    }
    function onResize() { resize(); applyInsets(); requestAnimationFrame(function () { resize(); applyInsets(); }); } // re-measure after the toolbar animation settles
    W.addEventListener('resize', onResize); W.addEventListener('orientationchange', onResize);
    if (W.visualViewport) W.visualViewport.addEventListener('resize', onResize);
    // fill the letterbox around the play area with CSS gradient bands built from the canvas's outer rows/columns
    // (12 averaged samples each), re-sampled ~1x/s and on resize. No per-frame cost; no empty bar on tall/wide screens.
    // Declared fills (preferred): def.fill = { top: '#sky', bottom: '#ground' | { tile: 'beach', size: 64, originY: 430, tint: 'rgba(..)' } }
    // -> two CSS bands under the canvas, laid out once per resize; tiles continue the in-game tile grid, so no seam.
    var bandT = null, bandB = null;
    function layoutFill() {
      var f = def.fill, c = view.css; if (!f || !c.vw) return false;
      if (!bandT) { bandT = document.createElement('div'); bandB = document.createElement('div'); bandT.className = bandB.className = 'eg-band'; wrap.insertBefore(bandB, cv); wrap.insertBefore(bandT, cv); }
      var k = c.w / VW, side = 'linear-gradient(' + (f.top || g.theme.bg) + ',' + (typeof f.bottom === 'string' ? f.bottom : (f.bottomColor || g.theme.bg)) + ')';
      wrap.style.background = c.x > 0 ? side : (f.top || g.theme.bg);
      bandT.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:' + (c.y + 1) + 'px;background:' + (f.top || g.theme.bg);
      var bs = 'position:absolute;left:0;top:' + (c.y + c.h - 1) + 'px;width:100%;bottom:0;';
      if (f.bottom && typeof f.bottom === 'object') { var t = f.bottom, sz = (t.size || 64) * k, oy = (((t.originY || 0) - VH) * k) % sz;
        bs += 'background-color:' + (t.color || '#000') + ';background-image:' + (t.tint ? 'linear-gradient(' + t.tint + ',' + t.tint + '),' : '') + 'url(assets/' + t.tile + '.png);' +
          'background-size:' + (t.tint ? '100% 100%,' : '') + sz + 'px ' + sz + 'px;background-repeat:' + (t.tint ? 'no-repeat,' : '') + 'repeat;' +
          'background-position:' + (t.tint ? '0 0,' : '') + (c.x % sz) + 'px ' + (oy + 1) + 'px'; }
      else bs += 'background:' + (f.bottom || g.theme.bg);
      bandB.style.cssText = bs; return true;
    }
    function fillEdges() {
      if (edgeTick++ % 60) return; var c = view.css; if (!c.vw) return;
      if (def.fill) { if (edgeTick === 1) layoutFill(); return; }
      var sx = c.x > 0, sy = c.y > 0; if (!sx && !sy) { wrap.style.background = ''; return; }
      try {
        var e = edgeCv || (edgeCv = document.createElement('canvas')); e.width = 12; e.height = 4; var ec = e.getContext('2d', { willReadFrequently: true });
        var t = Math.max(1, Math.round(4 * view.k)); ec.clearRect(0, 0, 12, 4);
        ec.drawImage(cv, 0, 0, cv.width, t, 0, 0, 12, 1); ec.drawImage(cv, 0, cv.height - t, cv.width, t, 0, 1, 12, 1);
        ec.drawImage(cv, 0, 0, t, cv.height, 0, 2, 12, 1); ec.drawImage(cv, cv.width - t, 0, t, cv.height, 0, 3, 12, 1);
        var d = ec.getImageData(0, 0, 12, 4).data;
        var grad = function (row, dir) { var st = []; for (var i = 0; i < 12; i++) { var o = (row * 12 + i) * 4; st.push('rgb(' + d[o] + ',' + d[o + 1] + ',' + d[o + 2] + ') ' + Math.round(i / 11 * 100) + '%'); }
          return 'linear-gradient(' + dir + ',' + st.join(',') + ')'; };
        var bg = [];
        if (sy) { bg.push(grad(0, 'to right') + ' left top/100% ' + (c.y + 1) + 'px no-repeat', grad(1, 'to right') + ' left bottom/100% ' + (c.vh - c.y - c.h + 1) + 'px no-repeat'); }
        if (sx) { bg.push(grad(2, 'to bottom') + ' left top/' + (c.x + 1) + 'px 100% no-repeat', grad(3, 'to bottom') + ' right top/' + (c.vw - c.x - c.w + 1) + 'px 100% no-repeat'); }
        wrap.style.background = bg.join(',') + ',' + g.theme.bg;
      } catch (err) {}
    }
    var last = performance.now();
    function hud() {
      var th = g.theme; ctx.fillStyle = th.fg; ctx.textAlign = 'center'; var pz = g.reducedMotion ? 0 : (g.scorePulse || 0); g.scorePulse = Math.max(0, (g.scorePulse || 0) - 0.08);
      ctx.font = 'bold ' + Math.round(44 * (1 + pz * 0.25)) + 'px system-ui,sans-serif';
      if (g.state !== 'title') ctx.fillText(g.score, VW / 2, 70);
      ctx.font = '13px system-ui,sans-serif'; ctx.fillStyle = th.dim; ctx.fillText('BEST ' + g.best + ' · LV ' + g.level, VW / 2, 92);
      if (g.player) { ctx.textAlign = 'left'; ctx.fillStyle = th.fg; ctx.font = 'bold 13px system-ui,sans-serif'; ctx.fillText(g.player.name, 12, 24);
        ctx.fillStyle = th.dim; ctx.font = '11px system-ui,sans-serif'; ctx.fillText('Lv ' + g.player.level + ' · ' + g.player.xp + ' XP', 12, 40); }
      if (g.toast && g.toast.t > 0) { ctx.textAlign = 'center'; ctx.fillStyle = th.accent; ctx.font = 'bold 18px system-ui,sans-serif'; ctx.fillText(g.toast.text, VW / 2, 130); }
    }
    // render-loop robustness (mobile blank-canvas fix): the next frame is always scheduled first, so an exception in a game's
    // update/draw can't stop the redraw for good; dt is finite and >= 0 (rAF stamps can precede a resume()'s performance.now()).
    var loopErr = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      try { frameBody(now); loopErr = 0; } catch (err) { if (loopErr++ < 3 && W.console) console.warn('[eagle] frame error', err && err.message); try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; } catch (e2) {} }
      checkCtx(now);
    }
    // 2D context loss (iOS WebKit drops canvas backing stores under memory pressure / after backgrounding): ask for a restore,
    // re-size on restore, and if the context stays lost >1.5 s swap in a fresh canvas element.
    var lostAt = 0;
    cv.addEventListener('contextlost', function (e) { e.preventDefault(); lostAt = performance.now(); g.ctxLost = (g.ctxLost || 0) + 1; });
    cv.addEventListener('contextrestored', function () { lostAt = 0; onResize(); });
    function checkCtx(now) {
      var lost = ctx.isContextLost ? ctx.isContextLost() : false; if (!lost) { lostAt = 0; return; }
      if (!lostAt) lostAt = now; if (now - lostAt < 1500) return;
      var n = document.createElement('canvas'); n.setAttribute('role', 'img'); n.setAttribute('aria-label', cv.getAttribute('aria-label'));
      n.addEventListener('pointerdown', handleDown); cv.parentNode.replaceChild(n, cv); cv = n; ctx = cv.getContext('2d'); lostAt = 0; g.ctxRebuilt = (g.ctxRebuilt || 0) + 1; onResize();
    }
    function frameBody(now) {
      var dt = (now - last) / 1000; dt = dt > 0 && dt < 1e6 ? Math.min(0.05, dt) : 0; last = now;
      if (g.state === 'play' && !isPaused()) { g.t += dt; def.update(g, dt); if (g.toast) g.toast.t -= dt; }
      var s = view.k, sx = 0, sy = 0;
      if (g.shakeAmt > 0.2 && !g.reducedMotion && !isPaused()) { sx = (Math.random() - 0.5) * g.shakeAmt; sy = (Math.random() - 0.5) * g.shakeAmt; }
      g.shakeAmt *= Math.pow(0.002, dt);
      ctx.setTransform(s, 0, 0, s, view.ox + Math.round(sx * s), view.oy + Math.round(sy * s)); /* integer device px keeps the bg blit cheap */
      ctx.fillStyle = g.theme.bg; ctx.fillRect(-10, -10, VW + 20, VH + 20);
      def.draw(g, ctx); ctx.setTransform(s, 0, 0, s, view.ox, view.oy); if (def.drawOver) def.drawOver(g, ctx); hud(); fillEdges();
    }
    resize(); applyInsets(); setTheme('dark'); setMute(false); def.init(g); overlay();
    requestAnimationFrame(frame);
    bridge.send('ready', g, { title: def.title });
    g._api = { start: start, pause: pause, resume: resume };
    return g;
  }
  W.EagleGame = { run: run, THEMES: THEMES, VW: VW, VH: VH };
})(window);
