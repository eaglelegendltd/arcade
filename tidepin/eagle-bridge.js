/* Eagle Legend game bridge + tiny one-touch runtime. No deps, no network.
   Protocol: see PROTOCOL.md. Usage: EagleGame.run({ id, title, init, update, draw, down, up, music }) */
(function (W) {
  'use strict';
  var VW = 360, VH = 640; // logical 9:16 space
  var THEMES = {
    dark:  { bg: '#10141f', fg: '#f2f4f8', dim: '#7c869c', accent: '#ffb547', good: '#5ee08a', bad: '#ff5a6a', panel: 'rgba(0,0,0,.55)' },
    light: { bg: '#f4f1ea', fg: '#1d2230', dim: '#8a8f9c', accent: '#e07a00', good: '#1f9d55', bad: '#d6283c', panel: 'rgba(255,255,255,.75)' }
  };
  var AK = W.AudioKit || null, PACK = null, bgCache = null;

  function Bridge(gameId) {
    this.game = gameId; this.handlers = {};
    var self = this;
    W.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || d.type !== 'eagle-host' || typeof d.action !== 'string') return;
      if (d.game && d.game !== self.game) return;
      var h = self.handlers[d.action]; if (h) h(d);
    });
  }
  Bridge.prototype.on = function (a, fn) { this.handlers[a] = fn; };
  Bridge.prototype.send = function (event, g, extra) {
    var msg = { type: 'eagle-game', game: this.game, event: event, score: g.score | 0, level: g.level | 0, best: g.best | 0 };
    if (extra) for (var k in extra) msg[k] = extra[k];
    W.__eagleLog = W.__eagleLog || []; W.__eagleLog.push(msg);
    if (W.parent && W.parent !== W) W.parent.postMessage(msg, '*');
  };

  function css() {
    var s = document.createElement('style');
    s.textContent = 'html,body{margin:0;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      'body{display:flex;align-items:center;justify-content:center;transition:background .3s}' +
      '#eg-wrap{position:relative;aspect-ratio:9/16;height:100%;max-width:100%;max-height:calc(100vw*16/9)}' +
      '#eg-wrap canvas{width:100%;height:100%;display:block}' +
      '.eg-btn{position:absolute;top:8px;right:8px;width:40px;height:40px;border-radius:20px;border:0;font-size:20px;cursor:pointer;z-index:5;background:rgba(0,0,0,.35);color:#fff}' +
      '#eg-pause{right:54px}' +
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
    wrap.appendChild(mute); wrap.appendChild(pbtn); wrap.appendChild(ov); document.body.appendChild(wrap);
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', def.title + ': ' + (def.howto || ''));
    var ctx = cv.getContext('2d');
    if (AK && AK.games) PACK = AK.games[def.id] || (def.packAlias && AK.games[def.packAlias]) || null;
    if (AK && AK.unlock) try { AK.unlock(); } catch (e) {}
    var bridge = new Bridge(def.id);
    var bestKey = 'eagle-best-' + def.id, best = 0;
    try { best = +localStorage.getItem(bestKey) || 0; } catch (e) {}

    var g = W.__eagle = {
      id: def.id, W: VW, H: VH, ctx: ctx, t: 0, score: 0, level: 1, best: best, state: 'title', // title|play|over
      paused: false, hostPaused: false, hidden: false, muted: false, themeName: 'dark', theme: THEMES.dark,
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
        if (def.levelEvery && Math.floor(g.score / def.levelEvery) + 1 > g.level) { g.level = Math.floor(g.score / def.levelEvery) + 1; g.sfx('powerUp'); bridge.send('levelup', g); }
        (def.achievements || []).forEach(function (a) { if (!g.achieved[a.id] && g.score >= a.score) { g.achieved[a.id] = 1; bridge.send('achievement', g, { id: a.id, name: a.name }); g.toast = { text: '★ ' + a.name, t: 2 }; } });
      },
      gameOver: function (reason) {
        if (g.state !== 'play') return;
        g.state = 'over'; g.runs++; g.sfx(def.overSfx || 'gameOver', null, 'gameOver'); music && music.stop();
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
        if (!bgCache || bgCache.w !== cv.width || bgCache.h !== cv.height || bgCache.th !== g.themeName) {
          var oc = document.createElement('canvas'); oc.width = cv.width; oc.height = cv.height; var o = oc.getContext('2d');
          o.drawImage(im, 0, 0, oc.width, oc.height); if (g.themeName === 'light') { o.fillStyle = 'rgba(255,255,255,.35)'; o.fillRect(0, 0, oc.width, oc.height); }
          bgCache = { c: oc, w: cv.width, h: cv.height, th: g.themeName }; }
        ctx.drawImage(bgCache.c, 0, 0, VW, VH); return true; },
      sprite: function (n, x, y, w, h, fb, rot, flip) {
        var im = g.art[n];
        if (im) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
        else if (fb) fb(ctx, x, y, w, h);
      }
    };
    g.json = {}; (def.json || []).forEach(function (n) { try { fetch('assets/' + n + '.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) g.json[n] = j; }).catch(function () {}); } catch (e) {} });
    (def.art || []).concat(['bg']).forEach(function (n) { var im = new Image(); im.onload = function () { g.art[n] = im; }; im.onerror = function () {}; im.src = 'assets/' + n + '.png'; });

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
      else ov.innerHTML = '<h1>' + (g.newBest ? '🎉 New best!' : 'Game over') + '</h1><p>Score ' + g.score + ' · Best ' + g.best + '</p>' + who + '<p class="big">Tap to retry</p>';
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
      g.held = true; downAt = performance.now(); def.down && def.down(g);
    }
    W.addEventListener('pointerup', function () { if (g.held) { g.held = false; def.up && def.up(g, performance.now() - downAt); } });
    W.addEventListener('pointercancel', function () { g.held = false; });
    W.addEventListener('keydown', function (e) { if (e.code === 'Space' && !e.repeat) handleDown(e); });
    W.addEventListener('keyup', function (e) { if (e.code === 'Space' && g.held) { g.held = false; def.up && def.up(g, performance.now() - downAt); } });
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
    bridge.on('set-motion', function (d) { g.reducedMotion = !!d.reduced; });
    bridge.on('set-best', function (d) { var b = d.best | 0; if (b >= 0) { g.best = b; try { localStorage.setItem(bestKey, b); } catch (e) {} overlay(); } });

    // auto-pause: tab hidden or iframe scrolled out of view
    var visTab = !document.hidden, visIO = true;
    function vis() { var h = !(visTab && visIO); if (h !== g.hidden) { g.hidden = h; if (!h) last = performance.now(); overlay(); musicOn(); } }
    document.addEventListener('visibilitychange', function () { visTab = !document.hidden; vis(); });
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { visIO = es[es.length - 1].intersectionRatio >= 0.5; vis(); }, { threshold: [0, 0.5, 1] }).observe(wrap);

    function resize() { var r = wrap.getBoundingClientRect(), dpr = Math.min(W.devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    W.addEventListener('resize', resize);

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
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (g.state === 'play' && !isPaused()) { g.t += dt; def.update(g, dt); if (g.toast) g.toast.t -= dt; }
      var s = cv.width / VW, sx = 0, sy = 0;
      if (g.shakeAmt > 0.2 && !g.reducedMotion && !isPaused()) { sx = (Math.random() - 0.5) * g.shakeAmt; sy = (Math.random() - 0.5) * g.shakeAmt; }
      g.shakeAmt *= Math.pow(0.002, dt);
      ctx.setTransform(s, 0, 0, cv.height / VH, Math.round(sx * s), Math.round(sy * s)); /* integer device px keeps the bg blit cheap */
      ctx.fillStyle = g.theme.bg; ctx.fillRect(-10, -10, VW + 20, VH + 20);
      def.draw(g, ctx); ctx.setTransform(s, 0, 0, cv.height / VH, 0, 0); if (def.drawOver) def.drawOver(g, ctx); hud();
      requestAnimationFrame(frame);
    }
    resize(); setTheme('dark'); setMute(false); def.init(g); overlay();
    requestAnimationFrame(frame);
    bridge.send('ready', g, { title: def.title });
    g._api = { start: start, pause: pause, resume: resume };
    return g;
  }
  W.EagleGame = { run: run, THEMES: THEMES, VW: VW, VH: VH };
})(window);
