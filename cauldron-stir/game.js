// Cauldron Stir: stir round the cauldron in time with the 96 BPM beat. Every half turn of your finger is one stir
// (a tap also counts), judged against the music clock from Harper's pack. On-beat stirs keep the brew bubbling.
var CS_X = 180, CS_Y = 350, CS_BEAT = 60 / 96;
function csPack() { var A = window.AudioKit; return A && A.games && A.games['cauldron-stir']; }
// seconds from the nearest beat (negative = early) and that beat's index; audio clock when music runs, else the game clock
function csClock(g) { var P = csPack(); try { if (P && P.beatOffset && g.state === 'play' && g.music && g.music.playing) { /* never touch the audio clock before a gesture starts the music */ var k = P.currentBeat(), off = P.beatOffset(); if (k && off != null && isFinite(off)) return { off: off, beat: Math.round((k.now - k.t0) / k.beatDur), phase: k.phase }; } } catch (e) {}
  var r = g.t / CS_BEAT, nb = Math.round(r); return { off: (r - nb) * CS_BEAT, beat: nb, phase: r - Math.floor(r) }; }
function csStir(g) { var D = g.data, k = csClock(g), a = Math.abs(k.off), tol = Math.max(0.07, 0.13 - g.level * 0.006);
  if (k.beat === D.lastBeat) { a = 1; } // a second stir on the same beat is a miss
  D.lastBeat = k.beat; D.spoon += 1;
  if (a <= tol * 0.55) { D.q = 'Perfect!'; D.combo++; D.meter = Math.min(1, D.meter + 0.12); g.addScore(3 + Math.min(3, Math.floor(D.combo / 8))); g.sfx('stirGood', null, 'coin'); D.good++; }
  else if (a <= tol) { D.q = k.off < 0 ? 'Good (early)' : 'Good (late)'; D.combo++; D.meter = Math.min(1, D.meter + 0.07); g.addScore(1); g.sfx('stir', 0.6, 'coin'); D.good++; }
  else { D.q = 'Off beat'; D.combo = 0; D.meter -= 0.1; g.sfx('stirMiss', null, 'hit'); D.wob = 0.3; }
  D.qt = 0.7; D.ring = 0.3;
  if (D.good >= 8) { D.good = 0; D.drops.push({ k: Math.floor(hwRand() * 5), y: 120, t: 0 }); }
  if (D.meter <= 0) { D.meter = 0; g.gameOver('the brew went cold'); } }
EagleGame.run({ id: 'cauldron-stir', title: HW_NAMES['cauldron-stir'], howto: 'Drag your finger round the cauldron in circles, in time with the beat: every half turn is one stir (a tap counts too). Stir right on the beat when the ring flashes to keep the brew bubbling. Off-beat stirs and skipped beats cool the brew; if the meter empties, the brew is ruined. Every 8 good stirs adds a new ingredient. Keys: Space / Enter to stir on the beat.',
  art: ['cauldron_topdown_sheet', 'beat_ring_sheet', 'spoon_stir_sheet', 'ingredients_sheet', 'splash_sheet'], levelEvery: 40, likeScore: 60, fill: { top: '#543841', bottom: { tile: 'band_bottom', size: 180, originY: 640, color: '#3b2630' } },
  achievements: [{ id: 'c30', score: 30, name: 'Apprentice Brewer' }, { id: 'c150', score: 150, name: 'Master of the Brew' }],
  audioReady: function (g) { var P = csPack(); if (P && P.bindPlayer && g.music) P.bindPlayer(g.music); },
  init: function (g) { hwSeed(); g.data = { meter: 0.6, combo: 0, good: 0, lastBeat: -99, spoon: 0, ang: null, acc: 0, q: '', qt: 0, ring: 0, wob: 0, drops: [], splash: [], idleBeats: 0, seenBeat: -1 }; },
  down: function (g) { var D = g.data; if (g.tapX === undefined) { csStir(g); return; } D.ang = Math.atan2(g.tapY - CS_Y, g.tapX - CS_X); D.acc = 0; D.tapped = true; },
  up: function (g) { var D = g.data; if (D.tapped) csStir(g); D.ang = null; },
  update: function (g, dt) { var D = g.data, k = csClock(g);
    D.meter -= dt * Math.min(0.09, 0.035 + g.level * 0.004); if (D.meter <= 0) { D.meter = 0; g.gameOver('the brew went cold'); return; }
    if (k.beat !== D.seenBeat && k.off > 0.18) { D.seenBeat = k.beat; if (D.lastBeat !== k.beat) { D.idleBeats++; if (D.idleBeats >= 2) { D.combo = 0; D.meter -= 0.03; } } else D.idleBeats = 0; }
    if (D.qt > 0) D.qt -= dt; if (D.ring > 0) D.ring -= dt; if (D.wob > 0) D.wob -= dt;
    D.drops.forEach(function (d) { d.t += dt; d.y += dt * 420; if (d.y >= CS_Y && !d.done) { d.done = 1; D.splash.push({ t: 0 }); g.sfx('brewDone', null, 'powerUp'); g.sfx('splash'); g.addScore(5); } });
    D.drops = D.drops.filter(function (d) { return !d.done; }); D.splash.forEach(function (s) { s.t += dt; }); D.splash = D.splash.filter(function (s) { return s.t < 0.5; });
    if (g.music && g.music.playing && (!navigator.userActivation || navigator.userActivation.hasBeenActive) && Math.random() < dt * 1.5) g.sfx('bubble', Math.random()); },
  draw: function (g, c) { var D = g.data, th = g.theme, k = csClock(g); if (!g.bg()) hwSky(c, '#150f2c', '#2b1a40');
    var near = Math.abs(k.off) < 0.09, pulse = Math.max(0, 1 - Math.abs(k.off) / 0.25);
    if (!hwFrame(g, 'beat_ring_sheet', near ? 5 : Math.min(4, pulse * 5), 6, 1, CS_X, CS_Y, 270 + pulse * 20, 270 + pulse * 20)) { c.strokeStyle = near ? '#fff3b0' : 'rgba(255,255,255,.3)'; c.lineWidth = 4 + pulse * 6; c.beginPath(); c.arc(CS_X, CS_Y, 128 + pulse * 10, 0, 7); c.stroke(); }
    var wob = D.wob > 0 ? Math.sin(g.t * 60) * 3 : 0;
    if (!hwFrame(g, 'cauldron_topdown_sheet', (g.t * 6) % 4, 4, 1, CS_X + wob, CS_Y, 220, 220)) { c.fillStyle = '#222'; c.beginPath(); c.arc(CS_X, CS_Y, 100, 0, 7); c.fill(); c.fillStyle = '#5fd36b'; c.beginPath(); c.arc(CS_X, CS_Y, 82, 0, 7); c.fill(); }
    var sa = D.ang != null ? D.ang : g.t * 0.6, sx = CS_X + Math.cos(sa) * 55, sy = CS_Y + Math.sin(sa) * 55;
    if (!hwFrame(g, 'spoon_stir_sheet', D.spoon % 8, 8, 1, sx, sy, 90, 90)) { c.strokeStyle = '#c89a5a'; c.lineWidth = 8; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 20, sy - 50); c.stroke(); }
    D.drops.forEach(function (d) { if (!hwFrame(g, 'ingredients_sheet', d.k, 5, 1, CS_X, d.y, 50, 50)) { c.fillStyle = '#ff5fa2'; c.beginPath(); c.arc(CS_X, d.y, 14, 0, 7); c.fill(); } });
    D.splash.forEach(function (s) { hwFrame(g, 'splash_sheet', s.t / 0.5 * 4.99, 5, 1, CS_X, CS_Y - 20, 140, 140); });
    var HB = 184; c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(56, HB - 2, 248, 12); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(58, HB, 244, 8); c.fillStyle = D.meter < 0.25 ? th.bad : '#7cf0a0'; c.fillRect(58, HB, 244 * D.meter, 8);
    c.textAlign = 'center'; c.fillStyle = th.dim; c.font = '12px system-ui'; c.fillText('brew heat', 180, HB + 24);
    if (D.qt > 0) { c.globalAlpha = Math.min(1, D.qt * 2); c.fillStyle = D.q === 'Off beat' ? th.bad : th.accent; c.font = 'bold 24px system-ui'; c.fillText(D.q, 180, 230); c.globalAlpha = 1; }
    c.fillStyle = th.dim; c.font = '13px system-ui'; c.fillText('stir in circles on the beat' + (D.combo > 1 ? ' · combo ' + D.combo : '') + ' · level ' + g.level, 180, g.safeY(CS_Y + 138)); }
});
// drag tracking: every half turn round the cauldron while the finger is down counts as one stir
document.addEventListener('pointermove', function (e) { var g = window.__eagle; if (!g || !hwLive() || !g.held || g.data.ang == null) return; var v = g.view.css; if (!v.w) return;
  var x = (e.clientX - v.x) / v.w * 360, y = (e.clientY - v.y) / v.h * 640, D = g.data, a = Math.atan2(y - CS_Y, x - CS_X), d = a - D.ang;
  if (Math.hypot(x - CS_X, y - CS_Y) < 20) return; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; D.ang = a; D.acc += Math.abs(d);
  if (Math.abs(D.acc) > 0.3) D.tapped = false; if (D.acc >= Math.PI * 0.85) { D.acc -= Math.PI * 0.85; csStir(g); } });
