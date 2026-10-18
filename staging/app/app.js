(function () {
  var G = self.PRECACHE.games, BASE = self.ARCADE_BASE, grid = document.getElementById('grid'), player = document.getElementById('player'),
    dl = document.getElementById('dl'), note = document.getElementById('note'), cards = {};
  window.__eagleEvents = [];
  Object.keys(G).forEach(function (slug) {
    var b = document.createElement('button'); b.className = 'card'; b.type = 'button'; b.dataset.slug = slug;
    var img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = BASE + G[slug].thumb;
    var t = document.createElement('span'); t.textContent = G[slug].title; var i = document.createElement('i'); i.textContent = 'Offline';
    b.appendChild(img); b.appendChild(t); b.appendChild(i); b.addEventListener('click', function () { open(slug); });
    grid.appendChild(b); cards[slug] = b;
  });
  function sw() { return navigator.serviceWorker && navigator.serviceWorker.controller; }
  function open(slug, noPush) {
    // inside the worker's scope when it controls the page (works offline); otherwise straight to the live copy
    // a fresh iframe per game: changing an existing iframe's src would add joint-history entries and break Back
    var old = document.getElementById('frame'); if (old) old.remove();
    var frame = document.createElement('iframe'); frame.id = 'frame'; frame.title = G[slug].title; frame.allow = 'autoplay; fullscreen';
    frame.src = sw() ? 'play/' + slug + '/' : BASE + slug + '/'; player.insertBefore(frame, player.firstChild);
    player.classList.add('open'); document.body.style.overflow = 'hidden';
    if (sw()) sw().postMessage({ type: 'download-game', slug: slug });
    if (!noPush) history.pushState({ slug: slug }, '', '#' + slug);
    setTimeout(function () { try { frame.focus(); } catch (e) {} }, 50);
  }
  function close() { player.classList.remove('open'); var f = document.getElementById('frame'); if (f) f.remove(); document.body.style.overflow = ''; askStatus(); }
  document.getElementById('back').addEventListener('click', function () { if (history.state && history.state.slug) history.back(); else close(); });
  window.addEventListener('popstate', function (e) { if (e.state && e.state.slug) open(e.state.slug, true); else close(); });
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return; var d = e.data;
    if (d && d.type === 'eagle-game') window.__eagleEvents.push({ game: d.game, event: d.event, t: Date.now() });
  });
  function askStatus() { if (sw()) sw().postMessage({ type: 'status' }); }
  function setStatus(s) { var n = 0; Object.keys(s).forEach(function (k) { if (cards[k]) cards[k].classList.toggle('offline', !!s[k]); if (s[k]) n++; });
    if (n === Object.keys(G).length) { dl.textContent = 'All games downloaded'; dl.disabled = true; } }
  dl.addEventListener('click', function () {
    if (!sw()) { note.textContent = 'Offline mode is getting ready. Try again in a moment.'; return; }
    dl.disabled = true; dl.textContent = 'Downloading\u2026'; sw().postMessage({ type: 'download-all' });
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'status') setStatus(d.games);
      if (d.type === 'progress') { dl.textContent = 'Downloading\u2026 ' + Math.round(100 * d.done / d.total) + '%'; }
      if (d.type === 'game-cached') askStatus();
      if (d.type === 'download-done') { setStatus(d.games); window.__downloadResult = d.result;
        if (d.result.failed) { dl.disabled = false; dl.textContent = 'Download all for offline'; note.textContent = d.result.failed + ' files could not be downloaded. Try again when online.'; }
        else note.textContent = 'All 20 games are ready to play offline (' + Math.round(self.PRECACHE.bytes / 1e6) + ' MB).'; }
    });
    navigator.serviceWorker.addEventListener('controllerchange', askStatus);
    navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(askStatus).catch(function () {});
  }
  if (location.hash.length > 1 && G[location.hash.slice(1)]) { history.replaceState(null, '', location.pathname); }
})();
