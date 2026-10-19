/* Eagle bridge adapter for a DOM game. eagle-bridge.js is loaded for protocol parity, but its EagleGame.run()
   is a canvas runtime, so this file speaks the same wire protocol (PROTOCOL.md) directly:
   game -> parent {type:'eagle-game', game, event, score, level, best, ...extra}; also pushed to window.__eagleLog.
   parent -> game {type:'eagle-host', action:'pause'|'resume'|'mute'|'unmute'|'restart'|'set-theme'|'set-motion'}. */
(function (W) {
  'use strict';
  var GAME = 'kettle-hours', handlers = {};
  function send(event, s, extra) {
    s = s || {};
    var msg = { type: 'eagle-game', game: GAME, event: event, score: s.score | 0, level: s.level | 0, best: s.best | 0 };
    if (extra) for (var k in extra) msg[k] = extra[k];
    (W.__eagleLog = W.__eagleLog || []).push(msg);
    if (W.parent && W.parent !== W) W.parent.postMessage(msg, '*');
  }
  W.addEventListener('message', function (e) {
    var d = e.data;
    if (d && (d.type === 'el-command' || d.type === 'el-host') && typeof (d.action || d.command) === 'string') d = { type: 'eagle-host', action: d.action || d.command, game: d.game };
    if (!d || d.type !== 'eagle-host' || typeof d.action !== 'string') return;
    if (d.game && d.game !== GAME) return;
    var h = handlers[d.action]; if (h) h(d);
  });
  W.KHBridge = { send: send, on: function (a, fn) { handlers[a] = fn; }, game: GAME };
})(window);
