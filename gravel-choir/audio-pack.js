/* Gravel Choir - original SFX + loop with chord-following helpers. Requires audio-kit.js. */
(function (K) {
  var T = K.tone, n = function () { return K.getContext().currentTime; };
  // Progression: 8 beats each of C, Am, F, G (loop = 32 beats at 2 steps/beat = 64 steps)
  var PROG = [
    { name: 'C',  tones: ['C', 'E', 'G'] },
    { name: 'Am', tones: ['A', 'C', 'E'] },
    { name: 'F',  tones: ['F', 'A', 'C'] },
    { name: 'G',  tones: ['G', 'B', 'D'] }
  ];
  var BEATS_PER_CHORD = 8, SPB = 2, STEPS_PER_CHORD = BEATS_PER_CHORD * SPB;
  var PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  var bound = null, manual = 0;

  function toFreq(x) { return typeof x === 'number' ? x : K.noteFreq(x); }
  function chordByIndex(i) { var c = PROG[((i % 4) + 4) % 4]; return { index: ((i % 4) + 4) % 4, name: c.name, tones: c.tones.slice() }; }
  // Current chord: synced to the bound Player's audible step; else the manually set chord.
  function currentChord() {
    var st = bound ? bound.currentStep() : -1;
    if (st < 0) { var c = chordByIndex(manual); c.beat = 0; return c; }
    var c2 = chordByIndex(Math.floor(st / STEPS_PER_CHORD));
    c2.beat = Math.floor((st % STEPS_PER_CHORD) / SPB); c2.beatsLeft = BEATS_PER_CHORD - c2.beat;
    return c2;
  }
  // Snap any frequency/note to the nearest tone of a chord (default: current), keeping octave region.
  function nearestChordTone(x, chord) {
    var f = toFreq(x), ch = chord || currentChord(), midi = 69 + 12 * Math.log2(f / 440), best = null, bd = 1e9;
    for (var m = Math.floor(midi) - 6; m <= Math.ceil(midi) + 6; m++) {
      var pc = ((m % 12) + 12) % 12;
      if (ch.tones.some(function (t) { return PC[t] === pc; })) { var d = Math.abs(m - midi); if (d < bd) { bd = d; best = m; } }
    }
    return 440 * Math.pow(2, (best - 69) / 12);
  }
  function isChordTone(x, chord) { return Math.abs(nearestChordTone(x, chord) - toFreq(x)) < 0.5; }
  function chordFreqs(octave, chord) { var ch = chord || currentChord(); return ch.tones.map(function (t) { return K.noteFreq(t + (octave || 4)); }); }

  K.games = K.games || {};
  K.games['gravel-choir'] = {
    // Bind the music Player so currentChord() follows the loop; or call setChord(i or name) manually.
    bindPlayer: function (p) { bound = p; },
    setChord: function (c) { manual = typeof c === 'number' ? c : Math.max(0, PROG.map(function (x) { return x.name; }).indexOf(c)); },
    currentChord: currentChord, nearestChordTone: nearestChordTone, isChordTone: isChordTone, chordFreqs: chordFreqs,
    progression: PROG.map(function (c) { return c.name; }), beatsPerChord: BEATS_PER_CHORD,
    sfx: {
      // hum(note, {follow:true}) : row hum; with follow, pitch snaps to the current chord
      hum: function (note, o) { var f = toFreq(note || 'C4'); if (o && o.follow) f = nearestChordTone(f); T({ type: 'triangle', f0: f, dur: 0.5, gain: 0.2 }); T({ type: 'triangle', f0: f * 2.003, dur: 0.4, gain: 0.06 }); },
      pebbleFall: function () { T({ type: 'noise', dur: 0.03, gain: 0.12 }); },
      // catchGood(note?) : root snapped to current chord, plus the chord's next tone above it
      catchGood: function (note) {
        var ch = currentChord(), f = note ? nearestChordTone(note, ch) : K.noteFreq(ch.tones[0] + '4'), t = n();
        var up = chordFreqs(5, ch).concat(chordFreqs(6, ch)).filter(function (x) { return x > f * 1.05; })[0] || f * 1.5;
        T({ type: 'noise', dur: 0.03, gain: 0.2, t: t }); T({ type: 'square', f0: f, dur: 0.35, gain: 0.16, t: t }); T({ type: 'triangle', f0: up, dur: 0.35, gain: 0.15, t: t + 0.03 });
      },
      catchBad: function () { var t = n(); T({ type: 'square', f0: 233, dur: 0.25, gain: 0.18, t: t }); T({ type: 'square', f0: 247, dur: 0.25, gain: 0.18, t: t }); },
      // chordChange(): arpeggiates the (new) current chord
      chordChange: function () { var t = n(); chordFreqs(5).forEach(function (f, i) { T({ type: 'triangle', f0: f, dur: 0.12, gain: 0.14, t: t + i * 0.05 }); }); },
      collapse: function () { var t = n(); for (var i = 0; i < 8; i++) T({ type: 'noise', dur: 0.06, gain: 0.25 - i * 0.02, t: t + i * 0.07 }); T({ type: 'triangle', f0: 262, f1: 65, dur: 1.0, gain: 0.3, t: t }); }
    },
    loop: { bpm: 90, stepsPerBeat: SPB,
      // C (16 steps) | Am | F | G
      square: ('E5 . G5 . . E5 D5 . C5 . . . E5 . G5 . ' + 'A4 . C5 . E5 . . C5 B4 . A4 . . . C5 . ' +
               'F5 . . E5 C5 . A4 . . . C5 . F5 . A5 . ' + 'G5 . . F5 D5 . B4 . D5 . . . G4 . . .').trim().split(' '),
      triangle: ('C3 . . . G2 . . . C3 . . . G2 . . . ' + 'A2 . . . E2 . . . A2 . . . E2 . . . ' +
                 'F2 . . . C3 . . . F2 . . . C3 . . . ' + 'G2 . . . D3 . . . G2 . . . B2 . D3 .').trim().split(' '),
      noise: ('o . . . x . . . o . . . x . o . ').repeat(3).concat('o . . . x . . . o . o . x o x o').trim().split(' ') }
  };
})(window.AudioKit);
