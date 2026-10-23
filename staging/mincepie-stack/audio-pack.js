window.XM_AUDIO_GAME = 'mincepie-stack'; window.XM_AUDIO_BED = 'fireside';
/* Christmas per-game audio map (placeholder until Harper's per-game packs land). Requires xmas-audio.js (Harper's winter kit).
   Maps the bridge's sfx names onto the kit's original procedural sounds. Generated per game by xm-build.py: XM_AUDIO_GAME / XM_AUDIO_BED. */
(function (K) { if (!K || !K.christmas) return; var S = K.christmas.sfx, id = window.XM_AUDIO_GAME, bed = window.XM_AUDIO_BED || 'fireside';
  var lim = {}, gate = function (n, ms) { var t = Date.now(); if (lim[n] && t - lim[n] < ms) return false; lim[n] = t; return true; };
  var bellNote = 0, map = {
    start: function () { S.uiSoft(); }, coin: function () { gate('pop', 45) && S.pop(); }, pop: function () { gate('pop', 45) && S.pop(); },
    // rising pentatonic bells for streaks: arg = streak count
    good: function (n) { if (!gate('good', 60)) return; S.bell(((n == null ? bellNote++ : n) % 4)); }, perfect: function () { gate('perf', 120) && S.jingleSuccess(); },
    soft: function () { gate('soft', 150) && S.uiSoft(); }, miss: function () { gate('miss', 150) && S.paperTear(); }, hit: function () { gate('miss', 150) && S.paperTear(); },
    step: function () { gate('step', 60) && S.snowStep(); }, drop: function () { gate('drop', 120) && S.paperRustle(); }, land: function () { gate('land', 60) && S.pop(); },
    powerUp: function () { gate('lvl', 400) && S.jingleSuccess(); }, gameOver: function () { gate('over', 600) && S.bell(0); }, win: function () { gate('win', 1500) && S.jingleWin(); }
  };
  K.games = K.games || {}; K.games[id] = { loop: bed, sfx: map };
})(window.AudioKit);
