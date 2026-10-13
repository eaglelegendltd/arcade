/* water-gl.js: Tidepin WebGL water (visual only). Original implementation for Eagle Legend, written from scratch.
 * Side-view stylised water: a GPU heightfield (wave equation, ping-pong textures) drives the surface line, refraction of
 * the sand, a sky-reflection band, caustics on the sand, and a noise-wobbled ink outline with light posterisation so it
 * sits with Luna's hand-drawn art. Rendered into an offscreen WebGL canvas and composited into the 2D game canvas with
 * drawImage, so HUD/meter/pin layering is unchanged. Gameplay never reads from here.
 *
 * API: WaterGL.create(opts) -> water | null       opts: { sand: Image, sky: '#hex', deep: '#hex', reduceMotion, tier }
 *      water.active (false -> caller draws its 2D water), water.tier ('high'|'med'|'low'), water.render(ctx2d, s),
 *      water.drop(x01, strength, radius01), water.destroy()
 *      s = { surfaceY, groundY, t, dt, tideVel }  (logical px in the 360x640 scene)
 */
(function (W) {
  'use strict';
  var VW = 360, VH = 640;
  var TIERS = {
    high: { sim: [256, 128], scale: 1.0, caustics: true },
    med:  { sim: [128, 64],  scale: 0.75, caustics: true },
    low:  { sim: [64, 32],   scale: 0.5, caustics: false }
  };
  var ORDER = ['high', 'med', 'low'];

  var VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';

  // wave equation step. R = height now, G = height previous. Neighbour average drives the acceleration; small damping.
  var FS_SIM = [
    'precision highp float; varying vec2 v; uniform sampler2D u_s; uniform vec2 u_px; uniform float u_damp; uniform float u_enc;',
    'vec2 rd(vec2 uv){ vec2 x = texture2D(u_s, uv).rg; return u_enc > 0.5 ? (x - 0.5) * 4.0 : x; }',
    'void main(){',
    '  vec2 c = rd(v);',
    '  float n = rd(v + vec2(u_px.x, 0.0)).r + rd(v - vec2(u_px.x, 0.0)).r + rd(v + vec2(0.0, u_px.y)).r + rd(v - vec2(0.0, u_px.y)).r;',
    '  float h = (n * 0.5 - c.g) * u_damp;', // 2*avg - prev, damped
    '  vec2 o = vec2(h, c.r);',
    '  gl_FragColor = vec4(u_enc > 0.5 ? clamp(o * 0.25 + 0.5, 0.0, 1.0) : o, 0.0, 1.0);',
    '}'].join('\n');

  // add a soft drop: a raised cosine bump at u_at (sim uv), signed strength
  var FS_DROP = [
    'precision highp float; varying vec2 v; uniform sampler2D u_s; uniform vec2 u_at; uniform float u_r; uniform float u_k; uniform float u_enc; uniform float u_asp;',
    'vec2 rd(vec2 uv){ vec2 x = texture2D(u_s, uv).rg; return u_enc > 0.5 ? (x - 0.5) * 4.0 : x; }',
    'void main(){ vec2 c = rd(v); vec2 d = (v - u_at) * vec2(u_asp, 1.0); float b = max(0.0, 1.0 - length(d) / u_r);',
    '  c.r += u_k * (0.5 - 0.5 * cos(b * 3.14159265));',
    '  gl_FragColor = vec4(u_enc > 0.5 ? clamp(c * 0.25 + 0.5, 0.0, 1.0) : c, 0.0, 1.0); }'].join('\n');

  // final water pass, in scene space (v.y = 0 bottom .. 1 top; scene y = (1 - v.y) * 640)
  var FS_DRAW = [
    'precision mediump float; varying vec2 v;',
    'uniform sampler2D u_s; uniform sampler2D u_sand; uniform float u_enc; uniform float u_surf; uniform float u_ground; uniform float u_t;',
    'uniform vec3 u_sky; uniform vec3 u_deep; uniform float u_caus; uniform float u_amp;',
    'float hs(vec2 uv){ float x = texture2D(u_s, uv).r; return u_enc > 0.5 ? (x - 0.5) * 4.0 : x; }',
    // cheap value noise for the ink wobble (hash-based, no texture)
    'float hash(float n){ return fract(sin(n) * 43758.5453); }',
    'float vnoise(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }',
    'vec3 post(vec3 c){ return floor(c * 7.0 + 0.5) / 7.0; }',  // slight posterisation (7 levels) for a painted look
    'void main(){',
    '  float sx = v.x * 360.0, sy = (1.0 - v.y) * 640.0;',
    // surface line: sim row through the middle of the field + a slow analytic swell; ink wobble on top
    '  float h = hs(vec2(v.x, 0.5));',
    '  float surf = u_surf - h * u_amp - sin(sx * 0.035 + u_t * 1.7) * 1.6 - sin(sx * 0.09 - u_t * 2.3) * 0.7;',
    '  float wob = (vnoise(sx * 0.11 + u_t * 0.6) - 0.5) * 1.6;',
    '  float d = sy - surf;',                                  // depth below the surface (px)
    '  if (d < -2.5 + wob) { gl_FragColor = vec4(0.0); return; }',
    '  float ink = smoothstep(2.4 + wob, 0.6, abs(d - 0.2));', // outline band around the surface
    '  float hx = hs(vec2(v.x + 1.0 / 128.0, 0.5)) - hs(vec2(v.x - 1.0 / 128.0, 0.5));',
    '  vec3 col; float a;',
    '  if (sy > u_ground) {',                                  // below the ground line: refracted sand + caustics, opaque
    '    vec2 zuv = vec2(v.x, clamp((sy - u_ground) / (640.0 - u_ground), 0.0, 1.0));',
    '    float gx = hs(zuv + vec2(1.0 / 128.0, 0.0)) - hs(zuv - vec2(1.0 / 128.0, 0.0));',
    '    float gy = hs(zuv + vec2(0.0, 1.0 / 64.0)) - hs(zuv - vec2(0.0, 1.0 / 64.0));',
    '    vec2 ruv = vec2(sx, sy - u_ground) / 64.0 + vec2(gx, gy) * 0.35;', // sand tile is 64 logical px
    '    vec3 sand = texture2D(u_sand, fract(ruv)).rgb;',
    '    float c = 0.0;',
    '    if (u_caus > 0.5) { float lap = hs(zuv + vec2(1.0 / 128.0, 0.0)) + hs(zuv - vec2(1.0 / 128.0, 0.0)) + hs(zuv + vec2(0.0, 1.0 / 64.0)) + hs(zuv - vec2(0.0, 1.0 / 64.0)) - 4.0 * hs(zuv);',
    '      c = clamp(-lap * 9.0, 0.0, 1.0); c += 0.18 * pow(max(0.0, sin(sx * 0.13 + sin(sy * 0.07 + u_t) * 2.0 + u_t * 1.3) * sin(sy * 0.11 - u_t * 0.9)), 3.0); }',
    '    float fall = clamp(d / 220.0, 0.0, 1.0);',
    // same 55% tint as the 2D water (keeps the pin and the bottom band matching); the refracted sand is blended into
    // the tint so its texture shifts with the waves, and caustic light is added on top
    '    float lum = dot(sand, vec3(0.3, 0.55, 0.15));',
    '    col = u_deep * (0.72 + 0.5 * lum) + vec3(0.85, 0.95, 1.0) * c * (1.0 - fall) * 0.9;',
    '    a = 0.55;',
    '  } else {',                                              // water over the scene above the ground (pin zone): see-through tint
    '    col = u_deep; a = 0.5 + clamp(d / 160.0, 0.0, 0.2);',
    '  }',
    // sky reflection band just under the surface, brightened on the wave faces facing up-left
    '  float refl = smoothstep(14.0, 0.0, d) * (0.55 + clamp(-hx * 6.0, -0.3, 0.4));',
    '  col = mix(col, u_sky, clamp(refl, 0.0, 1.0) * 0.6);',
    '  col = mix(col, post(col), smoothstep(40.0, 4.0, d));',  // posterise near the surface only (painted rim, no bands below)
    '  col = mix(col, vec3(0.13, 0.2, 0.3), ink * 0.85);',     // ink line, Luna-ish dark navy
    '  a = max(a, ink * 0.9);',
    '  gl_FragColor = vec4(col * a, a);',                      // premultiplied
    '}'].join('\n');

  function hex(c) { c = (c || '#000').replace('#', ''); return [parseInt(c.substr(0, 2), 16) / 255, parseInt(c.substr(2, 2), 16) / 255, parseInt(c.substr(4, 2), 16) / 255]; }

  function create(opts) {
    opts = opts || {};
    if (opts.reduceMotion) return null;
    var cv = document.createElement('canvas'), gl = null, isGL2 = false;
    var attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
    try { gl = cv.getContext('webgl2', attrs); isGL2 = !!gl; if (!gl) gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs); } catch (e) { gl = null; }
    if (!gl) return null;

    var self = { active: false, tier: null, canvas: cv, gl: gl, encoded: false, texType: null, stats: { frames: 0, avgMs: 0, downgrades: 0 }, lost: false };
    var progSim, progDrop, progDraw, buf, sandTex, simTex = [], fbo = [], cur = 0, simW = 0, simH = 0, pendingDrops = [];

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    function prog(fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); p.u = {}; return p; }
    function U(p, n) { return p.u[n] !== undefined ? p.u[n] : (p.u[n] = gl.getUniformLocation(p, n)); }

    // pick a renderable texture format: float -> half float -> 8-bit encoded
    function pickFormat() {
      var cands = [];
      if (isGL2) { if (gl.getExtension('EXT_color_buffer_float')) cands.push({ ifmt: gl.RGBA16F, fmt: gl.RGBA, type: gl.HALF_FLOAT, enc: false, name: 'rgba16f' }); }
      else {
        var hf = gl.getExtension('OES_texture_half_float'); gl.getExtension('EXT_color_buffer_half_float');
        var fl = gl.getExtension('OES_texture_float'); gl.getExtension('WEBGL_color_buffer_float');
        if (fl) cands.push({ ifmt: gl.RGBA, fmt: gl.RGBA, type: gl.FLOAT, enc: false, name: 'float' });
        if (hf) cands.push({ ifmt: gl.RGBA, fmt: gl.RGBA, type: hf.HALF_FLOAT_OES, enc: false, name: 'half' });
      }
      cands.push({ ifmt: gl.RGBA, fmt: gl.RGBA, type: gl.UNSIGNED_BYTE, enc: true, name: 'rgba8-encoded' });
      for (var i = 0; i < cands.length; i++) { var f = cands[i], t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, f.ifmt, 4, 4, 0, f.fmt, f.type, null); var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); gl.deleteTexture(t);
        if (ok) return f; }
      return null;
    }

    function makeSim(w, h) {
      simTex.forEach(function (t) { gl.deleteTexture(t); }); fbo.forEach(function (f) { gl.deleteFramebuffer(f); }); simTex = []; fbo = [];
      var f = self.format, init = null;
      if (f.enc) { init = new Uint8Array(w * h * 4); for (var i = 0; i < init.length; i += 4) { init[i] = init[i + 1] = 128; init[i + 3] = 255; } }
      for (var k = 0; k < 2; k++) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f.enc ? gl.NEAREST : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f.enc ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, f.ifmt, w, h, 0, f.fmt, f.type, init);
        var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        if (!init) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
        simTex.push(t); fbo.push(fb); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); simW = w; simH = h; cur = 0;
    }

    function setTier(name) {
      var T = TIERS[name]; self.tier = name; self.caustics = T.caustics; self.scale = T.scale; makeSim(T.sim[0], T.sim[1]);
      self.stats.frames = 0; self.stats.avgMs = 0;
    }

    function init() {
      self.format = pickFormat(); if (!self.format) throw new Error('no renderable texture format');
      self.encoded = self.format.enc;
      progSim = prog(FS_SIM); progDrop = prog(FS_DROP); progDraw = prog(FS_DRAW);
      buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      sandTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, sandTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (opts.sand && opts.sand.complete && opts.sand.naturalWidth) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, opts.sand);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([229, 200, 137, 255]));
      // initial tier from device caps; refined by measured frame time
      var t = opts.tier || 'high', dpr = W.devicePixelRatio || 1, info = '';
      try { var dbg = gl.getExtension('WEBGL_debug_renderer_info'); info = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) {}
      self.renderer = info;
      if (!opts.tier) { if (/SwiftShader|llvmpipe|Software|Mali-[34]|Adreno \(TM\) [3-5]\d\d\b|PowerVR SGX/i.test(info) || gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) t = 'low';
        else if (dpr > 2.5 || self.encoded || /Mali-G[57]|Adreno \(TM\) 6[0-3]/i.test(info)) t = 'med'; }
      setTier(t); self.active = true;
    }

    function pass(p, target, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); gl.useProgram(p); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

    function step(n) {
      for (var i = 0; i < n; i++) {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, simTex[cur]); gl.useProgram(progSim);
        gl.uniform1i(U(progSim, 'u_s'), 0); gl.uniform2f(U(progSim, 'u_px'), 1 / simW, 1 / simH); gl.uniform1f(U(progSim, 'u_damp'), 0.985); gl.uniform1f(U(progSim, 'u_enc'), self.encoded ? 1 : 0);
        pass(progSim, fbo[1 - cur], simW, simH); cur = 1 - cur;
      }
    }
    function applyDrops() {
      while (pendingDrops.length) { var d = pendingDrops.shift();
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, simTex[cur]); gl.useProgram(progDrop);
        gl.uniform1i(U(progDrop, 'u_s'), 0); gl.uniform2f(U(progDrop, 'u_at'), d.x, d.z); gl.uniform1f(U(progDrop, 'u_r'), d.r); gl.uniform1f(U(progDrop, 'u_k'), d.k);
        gl.uniform1f(U(progDrop, 'u_enc'), self.encoded ? 1 : 0); gl.uniform1f(U(progDrop, 'u_asp'), simW / simH);
        pass(progDrop, fbo[1 - cur], simW, simH); cur = 1 - cur; }
    }

    self.drop = function (x01, strength, r01, z01) { if (self.active) pendingDrops.push({ x: x01, z: z01 == null ? 0.5 : z01, k: strength, r: r01 || 0.05 }); if (pendingDrops.length > 12) pendingDrops.shift(); };

    var lastTide = null, accum = 0;
    self.render = function (ctx, s) {
      if (!self.active) return false;
      var t0 = performance.now();
      try {
        // canvas size follows the 2D canvas' device size times the tier scale
        var dw = Math.max(64, Math.round(ctx.canvas.width * self.scale)), dh = Math.max(114, Math.round(ctx.canvas.height * self.scale));
        if (cv.width !== dw || cv.height !== dh) { cv.width = dw; cv.height = dh; }
        // incoming/outgoing tide pushes the field from the left edge; strength follows tide speed
        if (lastTide !== null) { var v = (s.surfaceY - lastTide); if (Math.abs(v) > 0.05) self.drop(0.02, Math.max(-0.6, Math.min(0.6, -v * 0.25)), 0.06, Math.random()); }
        lastTide = s.surfaceY;
        accum += Math.min(0.05, s.dt || 0.016); var n = 0; while (accum >= 1 / 60 && n < 3) { accum -= 1 / 60; n++; }
        applyDrops(); step(Math.max(1, n));
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(progDraw);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, simTex[cur]); gl.uniform1i(U(progDraw, 'u_s'), 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sandTex); gl.uniform1i(U(progDraw, 'u_sand'), 1);
        gl.uniform1f(U(progDraw, 'u_enc'), self.encoded ? 1 : 0); gl.uniform1f(U(progDraw, 'u_surf'), s.surfaceY); gl.uniform1f(U(progDraw, 'u_ground'), s.groundY);
        gl.uniform1f(U(progDraw, 'u_t'), s.t); gl.uniform1f(U(progDraw, 'u_caus'), self.caustics ? 1 : 0); gl.uniform1f(U(progDraw, 'u_amp'), 9.0);
        gl.uniform3fv(U(progDraw, 'u_sky'), hex(opts.sky || '#d8f0fb')); gl.uniform3fv(U(progDraw, 'u_deep'), hex(opts.deep || '#3482d2'));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (gl.isContextLost()) { self.active = false; return false; }
        ctx.drawImage(cv, 0, 0, VW, VH);
      } catch (e) { self.active = false; self.error = String(e); return false; }
      // measured frame cost -> auto-downgrade (high -> med -> low -> off)
      var ms = performance.now() - t0, st = self.stats; st.frames++; st.avgMs = st.avgMs ? st.avgMs * 0.95 + ms * 0.05 : ms;
      if (opts.frameMs) { st.frameAvg = st.frameAvg ? st.frameAvg * 0.95 + opts.frameMs() * 0.05 : opts.frameMs(); }
      if (st.frames > 90 && !opts.lockTier) {
        var slow = st.avgMs > 6 || (st.frameAvg && st.frameAvg > 21);
        if (slow) { var i = ORDER.indexOf(self.tier); st.downgrades++; st.frames = 0; st.frameAvg = 0; st.avgMs = 0;
          if (i < ORDER.length - 1) setTier(ORDER[i + 1]); else { self.active = false; self.reason = 'too slow'; } }
      }
      return true;
    };

    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.active = false; self.lost = true; self.reason = 'context lost'; }, false);
    cv.addEventListener('webglcontextrestored', function () { try { self.lost = false; init(); self.reason = 'restored'; } catch (e) { self.active = false; } }, false);
    self.destroy = function () { self.active = false; var l = gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); };

    try { init(); } catch (e) { self.error = String(e); return null; }
    return self;
  }

  W.WaterGL = { create: create, TIERS: TIERS };
})(window);
