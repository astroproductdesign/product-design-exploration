/* Hash router with a short slide/fade between screens */
(function () {
  var viewport = null, current = null, currentHash = '';

  var ROUTES = [
    { re: /^#\/onboarding$/,        make: function () { return S.Screens.onboarding(); } },
    { re: /^#\/home$/,              make: function () { return S.Screens.home(); } },
    { re: /^#\/leaderboard$/,       make: function () { return S.Screens.leaderboard(); } },
    { re: /^#\/rewards$/,           make: function () { return S.Screens.rewards(); } },
    { re: /^#\/profile$/,           make: function () { return S.Screens.profile(); } },
    { re: /^#\/game\/smile$/,       make: function () { return S.Screens.game_smile(); } },
    { re: /^#\/game\/gathering$/,   make: function () { return S.Screens.game_gathering(); } },
    { re: /^#\/game\/fresh$/,       make: function () { return S.Screens.game_fresh(); } },
    { re: /^#\/share\/(\w+)$/,      make: function (m) { return S.Screens.share({ game: m[1] }); } }
  ];
  var ORDER = ['#/home', '#/leaderboard', '#/rewards', '#/profile'];

  function resolve(hash) {
    for (var i = 0; i < ROUTES.length; i++) {
      var m = hash.match(ROUTES[i].re);
      if (m) return ROUTES[i].make(m);
    }
    return null;
  }

  function mount(hash, back) {
    var screen = resolve(hash);
    if (!screen) { location.hash = '#/home'; return; }

    var prev = current;
    current = screen;
    currentHash = hash;

    screen.el.classList.add(back ? 'is-enter-back' : 'is-enter');
    viewport.appendChild(screen.el);
    // force layout so the transition runs
    void screen.el.offsetWidth;
    screen.el.classList.remove('is-enter', 'is-enter-back');

    if (prev) {
      prev.el.classList.add(back ? 'is-exit-back' : 'is-exit');
      setTimeout(function () {
        if (prev.destroy) try { prev.destroy(); } catch (e) {}
        if (prev.el.parentNode) prev.el.parentNode.removeChild(prev.el);
      }, 260);
    }
    S.U.renderTabs(screen.tab);
    document.getElementById('tabbar').hidden = !screen.tab;
  }

  function onHash() {
    var hash = location.hash || '#/home';
    if (hash === currentHash) return;
    var st = S.Store.get();
    if (!st.onboarded && hash !== '#/onboarding') { location.replace('#/onboarding'); return; }
    if (st.onboarded && hash === '#/onboarding') { location.replace('#/home'); return; }
    var back = ORDER.indexOf(hash) >= 0 && ORDER.indexOf(currentHash) >= 0 && ORDER.indexOf(hash) < ORDER.indexOf(currentHash);
    mount(hash, back);
  }

  S.Router = {
    init: function () {
      viewport = document.getElementById('viewport');
      window.addEventListener('hashchange', onHash);
      var st = S.Store.get();
      var start = location.hash || (st.onboarded ? '#/home' : '#/onboarding');
      if (!st.onboarded) start = '#/onboarding';
      currentHash = '';
      location.hash = start;
      onHash();
      if (!current) mount(start, false);
    },
    go: function (hash, opts) {
      opts = opts || {};
      if (opts.force && location.hash === hash) { currentHash = ''; mount(hash, false); return; }
      if (location.hash === hash) { S.Router.refresh(); return; }
      location.hash = hash;
    },
    refresh: function () { var h = currentHash; currentHash = ''; mount(h, false); },
    current: function () { return currentHash; }
  };
})();
