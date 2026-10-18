// Where the live games live, relative to this app folder. Auto: /arcade/staging/app/ -> '../../', /arcade/app/ -> '../'.
// Override by setting window.ARCADE_BASE before this file loads.
(function (W) {
  var p = W.location ? W.location.pathname : (self.registration ? new URL(self.registration.scope).pathname : '');
  W.ARCADE_BASE = W.ARCADE_BASE || (/\/staging\/app\/?/.test(p) ? '../../' : '../');
})(self);
