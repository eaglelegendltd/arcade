/* eagle-license.js: shared B2B licensing for every Eagle Legend game (master copy: /workspace/batch1/eagle-license.js,
 * copied into each game by build.sh). Load order: [licensee.js] -> eagle-bridge.js -> eagle-license.js -> game.js.
 *
 * CLIENT-SIDE DETERRENT ONLY. Anyone holding the files can edit or strip this. Real protection is the signed licence
 * contract (which names the domains/app ids covered), plus hosting controls on our side. See LICENSING.md.
 *
 * Tier -> business-plan tier (/workspace/licensing/tier_mapping.md, DRAFT pending Richie):
 *   STANDARD = A (as-is with credit)   WHITE_LABEL = B (unbranded; optional client logo)   ENTERPRISE_RESKIN = D (reskin)
 *   SOURCE   = C (source licence) and E (exclusive buy-out): unbranded, NO domain/app lock; scope is set by the contract.
 *   [PLACEHOLDER: contract reference / solicitor-drafted terms per buyer]
 *
 * Per-licensee: ship licensee.js in the game folder (build.sh adds it to index.html when present) that sets
 *   window.EAGLE_LICENSEE = { tier, licensee, allowedDomains:[...], allowedAppIds:[...], sprites:{key:path}, clientLogo, clientLink, demoTierSwitch:false }
 * Each game declares which sprite keys a reskin may replace with def.reskinKeys, and where its logo sits with def.logo.
 */
(function (W) {
  var C = W.EAGLE_CONFIG = {
    tier: 'STANDARD',                 // 'STANDARD' | 'WHITE_LABEL' | 'ENTERPRISE_RESKIN' | 'SOURCE'
    licensee: 'Eagle Legend LTD',
    showLogo: true,                   // STANDARD only; forced off on every other tier
    logoUrl: 'https://www.eaglelegend.com',
    logoSrc: 'assets/eagle_legend_logo.png',
    clientLogo: '',                   // WHITE_LABEL only, optional: licensee logo shown in place of ours
    clientLink: '',                   // WHITE_LABEL only, optional: https only, opened _blank with noopener
    // allowed hosts. 'x' = x, www.x and any subdomain (exact '.'+x suffix, never substring). '*.x' = subdomains only.
    // '' = file:// page. Defaults apply to every licensee; allowedDomains adds the licensee's own.
    defaultDomains: ['eaglelegend.com', 'eaglelegendltd.github.io', 'localhost', '127.0.0.1', ''],
    allowedDomains: [],
    // wrapped apps: ids the wrapper may pass via postMessage {type:'app-id', appId} or ?appId=. Runs if the domain
    // check passes OR the id is listed. Once set, non-http(s) pages (file:, capacitor:, ...) must present a listed id.
    allowedAppIds: [],
    appIdWaitMs: 1500,
    sprites: {},                      // ENTERPRISE_RESKIN only: { <reskinKey>: 'path.png' }; keys outside def.reskinKeys are ignored
    // ?tier= demo switch: only on localhost/127.0.0.1, or exactly eaglelegendltd.github.io under /arcade/staging/.
    // MUST be false for production/licensee builds.
    demoTierSwitch: true
  };
  var TIERS = ['STANDARD', 'WHITE_LABEL', 'ENTERPRISE_RESKIN', 'SOURCE'], demoReskin = false, demoActive = false;
  var o = W.EAGLE_LICENSEE; if (o && typeof o === 'object') for (var k in o) C[k] = o[k];
  var L = W.location, h = L.hostname;
  if (C.demoTierSwitch && (h === 'localhost' || h === '127.0.0.1' || (h === 'eaglelegendltd.github.io' && L.pathname.indexOf('/arcade/staging/') === 0))) {
    var m = /[?&]tier=(STANDARD|WHITE_LABEL|ENTERPRISE_RESKIN|SOURCE)\b/i.exec(L.search);
    if (m) { C.tier = m[1].toUpperCase(); C.showLogo = C.tier === 'STANDARD'; if (C.tier === 'ENTERPRISE_RESKIN') demoReskin = true; demoActive = true; }
  }
  if (TIERS.indexOf(C.tier) < 0) C.tier = 'STANDARD';
  if (C.tier !== 'STANDARD') C.showLogo = false;
  if (C.tier !== 'WHITE_LABEL') { C.clientLogo = ''; C.clientLink = ''; }
  if (C.tier !== 'ENTERPRISE_RESKIN') C.sprites = {};

  function hostAllowed(host) {
    host = String(host || '').toLowerCase().replace(/\.$/, '');
    var list = (C.defaultDomains || []).concat(C.allowedDomains || []);
    for (var i = 0; i < list.length; i++) { var d = String(list[i]).toLowerCase();
      if (d.slice(0, 2) === '*.') { d = d.slice(2); if (d && host.slice(-(d.length + 1)) === '.' + d) return true; continue; }
      if (d === '' ? host === '' : (host === d || host.slice(-(d.length + 1)) === '.' + d)) return true; }
    return false;
  }
  function domainOk() {
    if (C.tier === 'SOURCE') return true;
    if ((C.allowedAppIds || []).length && !/^https?:$/.test(L.protocol)) return false;
    return hostAllowed(L.hostname);
  }
  function appIdOk(id) { return !!id && (C.allowedAppIds || []).indexOf(String(id)) >= 0; }

  function blockScreen(title) {
    if (document.getElementById('eg-license')) return;
    document.body.style.cssText = 'margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#10141f;color:#f2f4f8;font-family:system-ui,sans-serif;text-align:center';
    var d = document.createElement('div'); d.id = 'eg-license'; d.setAttribute('role', 'alert'); d.style.cssText = 'max-width:300px;padding:24px';
    var h1 = document.createElement('h1'); h1.style.cssText = 'font-size:24px;margin:0 0 10px'; h1.textContent = title || 'Eagle Legend game';
    d.appendChild(h1);
    d.insertAdjacentHTML('beforeend', '<p style="opacity:.85;line-height:1.4">Sorry, this game isn\u2019t licensed for this site.</p>' +
      '<p style="opacity:.6;font-size:13px">If you run this site, contact the game\u2019s publisher to arrange a licence.</p>');
    document.body.appendChild(d); W.__eagleBlocked = true;
  }
  function gate(title, go) {
    var done = false, timer = 0;
    function ok(how) { if (done) return; done = true; clearTimeout(timer); W.removeEventListener('message', onMsg); W.__eagleLicensedBy = how; go(); }
    function block() { if (done) return; done = true; W.removeEventListener('message', onMsg);
      var f = function () { blockScreen(title); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }
    function onMsg(e) { var d = e.data; if (d && d.type === 'app-id') appIdOk(d.appId) ? ok('app-id-message') : block(); }
    if (domainOk()) return ok('domain');
    if (!(C.allowedAppIds || []).length) return block();
    var q = /[?&]appId=([^&#]+)/.exec(L.search); if (q) return appIdOk(decodeURIComponent(q[1])) ? ok('app-id-param') : block();
    W.addEventListener('message', onMsg); timer = setTimeout(block, C.appIdWaitMs || 1500);
  }

  // logo button. pos = def.logo: { side:'left'|'right', top:<css px from the top of the game frame> }. Kept in the top band
  // so it never covers the bottom 80 px host bar; each game picks a spot clear of its HUD.
  function watermark(pos, src, url, label, fbText) {
    var wrap = document.getElementById('eg-area') || document.getElementById('eg-wrap'); if (!wrap) return;
    pos = pos || {}; var side = pos.side === 'right' ? 'right' : 'left', top = pos.top == null ? 52 : pos.top;
    var a = document.createElement('button'); a.id = 'eg-logo'; a.type = 'button'; a.setAttribute('aria-label', label);
    a.style.cssText = 'position:absolute;' + side + ':calc(8px + env(safe-area-inset-' + side + ', 0px));top:calc(' + top + 'px + env(safe-area-inset-top, 0px));box-sizing:border-box;width:44px;height:44px;padding:4px;border:0;border-radius:12px;z-index:6;cursor:' + (url ? 'pointer' : 'default') + ';' +
      'background:rgba(255,255,255,.28);box-shadow:0 1px 4px rgba(0,0,0,.25);opacity:.6;display:flex;align-items:center;justify-content:center';
    var img = document.createElement('img'); img.alt = ''; img.src = src; img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none';
    img.onerror = function () { if (img.parentNode) a.removeChild(img); if (!fbText) { a.remove(); return; } a.textContent = fbText; a.style.font = 'bold 15px system-ui'; a.style.color = '#4FA62C'; };
    a.appendChild(img);
    // never a game tap: stop pointer/touch/mouse/key events before the canvas/overlay/window handlers see them
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(function (t) { a.addEventListener(t, function (e) { e.stopPropagation(); }, true); });
    a.addEventListener('keydown', function (e) { e.stopPropagation(); }); a.addEventListener('keyup', function (e) { e.stopPropagation(); });
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (url) try { W.open(url, '_blank', 'noopener'); } catch (err) {} });
    wrap.appendChild(a);
  }

  // 'STAGING · <TIER>' badge: only when the demo switch actually applied a ?tier= (localhost or the staging path)
  function stagingBadge() {
    var wrap = document.getElementById('eg-area') || document.getElementById('eg-wrap'); if (!wrap || document.getElementById('eg-staging')) return;
    var b = document.createElement('div'); b.id = 'eg-staging'; b.textContent = 'STAGING \u00b7 ' + C.tier.replace('_', ' ');
    b.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:calc(4px + env(safe-area-inset-top, 0px));z-index:6;pointer-events:none;' +
      'font:bold 10px system-ui,sans-serif;letter-spacing:.06em;color:#fff;background:rgba(214,40,60,.8);padding:2px 8px;border-radius:8px;white-space:nowrap';
    wrap.appendChild(b);
  }
  W.EagleLicense = { config: C, demoActive: demoActive, hostAllowed: hostAllowed, domainOk: domainOk, appIdOk: appIdOk };
  if (!W.EagleGame || !W.EagleGame.run) return;
  var run0 = W.EagleGame.run;
  W.EagleGame.run = function (def) {
    var keys = def.reskinKeys || [], paths = {};
    if (C.tier === 'ENTERPRISE_RESKIN') keys.forEach(function (k) {
      var p = (C.sprites || {})[k] || (demoReskin ? 'assets/demo_reskin/' + k + '.png' : ''); if (p) paths[k] = p; });
    def.artPaths = paths; W.EagleLicense.reskinKeys = keys; W.EagleLicense.artPaths = paths;
    var res; gate(def.title, function () {
      res = run0(def); if (demoActive) stagingBadge();
      if (C.showLogo) watermark(def.logo, C.logoSrc, C.logoUrl, 'Eagle Legend: opens eaglelegend.com in a new tab', 'EL');
      else if (C.tier === 'WHITE_LABEL' && C.clientLogo) { var u = /^https:\/\//i.test(C.clientLink) ? C.clientLink : '';
        watermark(def.logo, C.clientLogo, u, (C.licensee || 'Licensee') + (u ? ': opens in a new tab' : ''), ''); }
    });
    return res;
  };
})(window);
