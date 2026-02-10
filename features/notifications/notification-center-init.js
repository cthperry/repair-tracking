// Auto-init NotificationCenter after app is ready
(function(){
  var _tried = false;
  function _tryInit() {
    if (_tried) return; _tried = true;
    try { if (window.NotificationCenter) window.NotificationCenter.init(); } catch(_){}
  }
  window.addEventListener('auth:login', function(){ setTimeout(_tryInit, 1200); });
  // fallback: if already logged in
  setTimeout(function(){ if (window.currentUser) _tryInit(); }, 2000);
})();
