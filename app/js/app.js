/* Boot */
(function () {
  function boot() {
    S.Store.ensureFestival();
    S.Router.init();

    // keep the phone frame honest on mobile browsers with dynamic toolbars
    function vh() { document.documentElement.style.setProperty('--vh', window.innerHeight + 'px'); }
    vh();
    window.addEventListener('resize', vh);

    // stop double-tap zoom inside the games
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

    if (S.Store.isMemoryOnly()) {
      setTimeout(function () { S.U.toast('Storage is blocked here — progress will not survive a reload'); }, 800);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
