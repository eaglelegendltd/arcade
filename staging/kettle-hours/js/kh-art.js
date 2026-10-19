/* Art loader: Luna's files from assets/art/ (listed in assets/art/manifest.json, so missing files are never
   requested and never 404), otherwise warm placeholder SVGs drawn in code. */
(function (W) {
  'use strict';
  var files = {}; // key -> filename
  function load() {
    return fetch('assets/art/manifest.json').then(function (r) { return r.ok ? r.json() : { files: [] }; })
      .catch(function () { return { files: [] }; })
      .then(function (m) { (m.files || []).forEach(function (f) { files[f.replace(/\.(png|webp|jpg|jpeg|svg)$/i, '')] = f; }); return files; });
  }
  function has(key) { return !!(key && files[key]); }
  function url(key) { return 'assets/art/' + files[key]; }
  function esc(s) { return String(s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function svg(w, h, body) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '">' + body + '</svg>'); }

  var SKY = { morning: ['#ffd9a8', '#ffeccc'], afternoon: ['#b9c6cf', '#dfe4e6'], evening: ['#e88a6a', '#5b3d5e'], night: ['#283149', '#3c4a6b'] };
  function cafe(p) {
    var t = p.time || 'morning', s = SKY[t] || SKY.morning, warm = t === 'evening' || t === 'night';
    var b = '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s[0] + '"/><stop offset="1" stop-color="' + s[1] + '"/></linearGradient></defs>' +
      '<rect width="360" height="300" fill="#e9c9a1"/>' +                         // wall
      '<rect x="0" y="0" width="360" height="22" fill="#b98a5e"/>' +
      '<rect x="40" y="46" width="170" height="120" rx="8" fill="url(#s)" stroke="#8a5a3c" stroke-width="8"/>' + // window
      '<line x1="125" y1="46" x2="125" y2="166" stroke="#8a5a3c" stroke-width="5"/>' +
      (t === 'afternoon' ? '<g stroke="#8fa3b3" stroke-width="2">' + [60, 90, 150, 180, 100].map(function (x, i) { return '<line x1="' + x + '" y1="' + (60 + i * 15) + '" x2="' + (x - 4) + '" y2="' + (72 + i * 15) + '"/>'; }).join('') + '</g>' : '') +
      '<rect x="235" y="40" width="95" height="70" rx="6" fill="#4a3a2e"/><text x="282" y="70" font-size="13" fill="#f6e7c8" text-anchor="middle" font-family="Georgia,serif">KETTLE</text><text x="282" y="90" font-size="13" fill="#f6e7c8" text-anchor="middle" font-family="Georgia,serif">HOURS</text>' +
      [70, 180, 290].map(function (x) { return '<line x1="' + x + '" y1="0" x2="' + x + '" y2="28" stroke="#5b4636" stroke-width="2"/><path d="M' + (x - 16) + ' 40 Q' + x + ' 18 ' + (x + 16) + ' 40Z" fill="#c8833f"/>' +
        '<circle cx="' + x + '" cy="44" r="' + (warm ? 9 : 6) + '" fill="#ffe7a3" opacity="' + (warm ? 0.95 : 0.7) + '"/>'; }).join('') +
      '<rect x="0" y="200" width="360" height="100" fill="#9a6440"/><rect x="0" y="194" width="360" height="12" fill="#6e4329"/>' + // counter
      '<g transform="translate(250,160)"><rect x="0" y="10" width="44" height="34" rx="10" fill="#d6563c"/><rect x="40" y="18" width="16" height="8" rx="4" fill="#d6563c"/><rect x="12" y="2" width="20" height="10" rx="4" fill="#3c2a20"/></g>' +
      '<g transform="translate(60,172)"><rect width="22" height="22" rx="4" fill="#f4efe6"/><rect x="30" width="22" height="22" rx="4" fill="#8fb39a"/><rect x="60" width="22" height="22" rx="4" fill="#f2c26b"/></g>' +
      (warm ? '<rect width="360" height="300" fill="#2b1a2e" opacity=".25"/>' : '');
    return svg(360, 300, b);
  }
  function portrait(p, chars) {
    var c = (chars && chars[p.character]) || {}, col = c.color || p.color || '#b07a52', ex = p.expression || 'neutral', props = p.props || [];
    var mouth = { smile: 'M84 118 Q100 132 116 118', sad: 'M86 126 Q100 116 114 126', worried: 'M88 124 Q100 120 112 124', tired: 'M88 122 L112 122', surprised: '', neutral: 'M88 121 Q100 125 112 121' }[ex] || 'M88 121 Q100 125 112 121';
    var brows = { sad: ['M76 84 L92 80', 'M108 80 L124 84'], worried: ['M76 82 L92 78', 'M108 78 L124 82'], surprised: ['M76 76 L92 74', 'M108 74 L124 76'] }[ex] || ['M76 80 L92 80', 'M108 80 L124 80'];
    var b = '<rect width="200" height="260" rx="14" fill="#f3dfc4"/>' +
      '<path d="M30 260 Q30 170 100 165 Q170 170 170 260Z" fill="' + (props.indexOf('jacket') >= 0 ? '#f2c230' : col) + '"/>' +
      (props.indexOf('jacket') >= 0 ? '<path d="M60 200 L140 200 M55 225 L145 225" stroke="#c9c9c9" stroke-width="6"/>' : '') +
      '<rect x="88" y="140" width="24" height="30" fill="#e2b48e"/>' +
      '<ellipse cx="100" cy="100" rx="44" ry="50" fill="#eac39c"/>' +
      '<path d="M56 96 Q58 44 100 46 Q142 44 144 96 Q130 64 100 66 Q70 64 56 96Z" fill="#5a3b2a"/>' +
      '<path d="' + brows[0] + '" stroke="#4a2f22" stroke-width="3" stroke-linecap="round"/><path d="' + brows[1] + '" stroke="#4a2f22" stroke-width="3" stroke-linecap="round"/>' +
      (ex === 'tired' ? '<path d="M78 94 Q85 98 92 94 M108 94 Q115 98 122 94" stroke="#3a2a20" stroke-width="3" fill="none"/><path d="M78 102 Q85 106 92 102 M108 102 Q115 106 122 102" stroke="#b58a8a" stroke-width="2" fill="none"/>'
        : '<circle cx="85" cy="95" r="' + (ex === 'surprised' ? 5 : 4) + '" fill="#2d211b"/><circle cx="115" cy="95" r="' + (ex === 'surprised' ? 5 : 4) + '" fill="#2d211b"/>') +
      (mouth ? '<path d="' + mouth + '" stroke="#8a3d32" stroke-width="3" fill="none" stroke-linecap="round"/>' : '<ellipse cx="100" cy="122" rx="6" ry="8" fill="#8a3d32"/>') +
      '<circle cx="74" cy="112" r="7" fill="#f09a8a" opacity=".35"/><circle cx="126" cy="112" r="7" fill="#f09a8a" opacity=".35"/>' +
      (props.indexOf('lunchbox') >= 0 ? '<rect x="128" y="214" width="46" height="30" rx="6" fill="#5e9e7a"/><rect x="140" y="208" width="22" height="8" rx="3" fill="#3f6e53"/>' : '') +
      (props.indexOf('phone') >= 0 ? '<rect x="134" y="214" width="22" height="36" rx="4" fill="#222"/>' : '') +
      (props.indexOf('scarf') >= 0 ? '<path d="M66 160 Q100 180 134 160 L134 176 Q100 196 66 176Z" fill="#7a4fa0"/>' : '');
    return svg(200, 260, b);
  }
  function object(p) { return svg(200, 200, '<rect width="200" height="200" rx="16" fill="#f3dfc4"/><circle cx="100" cy="100" r="60" fill="' + (p.color || '#c8833f') + '"/><text x="100" y="185" font-size="16" text-anchor="middle" fill="#5a3b2a" font-family="sans-serif">' + esc(p.label || '') + '</text>'); }
  function street(p) { return svg(360, 300, '<rect width="360" height="300" fill="#cfe0e8"/><rect y="200" width="360" height="100" fill="#8b8b8b"/>' + [0, 90, 180, 270].map(function (x, i) { return '<rect x="' + (x + 6) + '" y="' + (60 + i % 2 * 20) + '" width="80" height="' + (140 - i % 2 * 20) + '" fill="' + ['#c0674a', '#e1b16a', '#7f9a7a', '#a77a9a'][i] + '"/>'; }).join('')); }

  // returns {src, alt}; key may be a string or {ref, alt, placeholder}
  function resolve(a, chars, fallbackAlt) {
    if (!a) return null;
    var ref = typeof a === 'string' ? a : a.ref, alt = (typeof a === 'object' && a.alt) || fallbackAlt || '';
    if (ref && has(ref)) return { src: url(ref), alt: alt, real: true };
    var p = (typeof a === 'object' && a.placeholder) || guess(ref, chars);
    var src = p.kind === 'portrait' ? portrait(p, chars) : p.kind === 'street' ? street(p) : p.kind === 'object' ? object(p) : p.kind === 'blank' ? svg(10, 10, '') : cafe(p);
    return { src: src, alt: alt, real: false, kind: p.kind || 'cafe' };
  }
  function guess(ref, chars) {
    ref = ref || ''; var m = ref.split('_');
    if (chars && chars[m[0]]) return { kind: 'portrait', character: m[0], expression: m[1] || 'neutral' };
    if (/^bg_street/.test(ref)) return { kind: 'street' };
    var t = (ref.match(/morning|afternoon|evening|night/) || ['morning'])[0];
    return { kind: 'cafe', time: t };
  }
  function portraitFor(charId, ex, chars) {
    var c = chars[charId] || {}; var key = (c.portrait || charId) + '_' + (ex || 'neutral');
    if (has(key)) return { src: url(key), alt: (c.name || charId) + ', ' + (ex || 'neutral'), real: true };
    return { src: portrait({ character: charId, expression: ex }, chars), alt: (c.name || charId) + ' looks ' + (ex || 'neutral'), real: false };
  }
  W.KHArt = { load: load, has: has, resolve: resolve, portraitFor: portraitFor, files: files };
})(window);
