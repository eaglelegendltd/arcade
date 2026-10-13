// shared helpers included by each game (copied in by build.sh)
function egLives(g, ctx) { for (var i = 0; i < 3; i++) { ctx.fillStyle = i < g.data.lives ? g.theme.bad : g.theme.dim; ctx.beginPath(); ctx.arc(150 + i * 30, 115, 7, 0, 7); ctx.fill(); } }
function egLoseLife(g, why, quiet) { g.data.lives--; if (!quiet) g.sfx('hit'); g.data.flash = 0.25; if (g.data.lives <= 0) g.gameOver(why); }
function egFlash(g, ctx) { if (g.data.flash > 0) { ctx.fillStyle = 'rgba(255,60,80,' + g.data.flash + ')'; ctx.fillRect(0, 0, 360, 640); } }
