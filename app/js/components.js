/* Shared helpers and reusable UI pieces */
(function () {
  var U = {};

  U.node = function (html) {
    var t = document.createElement('div');
    t.innerHTML = html.trim();
    return t.firstElementChild;
  };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  };
  U.on = function (root, sel, ev, fn) {
    root.addEventListener(ev, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  };
  U.fmtTime = function (ms, withTenths) {
    if (ms == null || !isFinite(ms)) return '—';
    var total = ms / 1000;
    var m = Math.floor(total / 60);
    var s = total - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + (withTenths ? s.toFixed(1) : Math.floor(s));
  };
  U.fmtDate = function (isoStr) {
    var p = String(isoStr).split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var today = S.Store.today();
    if (isoStr === today) return 'Today';
    if (isoStr === S.Store.addDays(today, -1)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  U.profane = function (name) {
    var n = name.toLowerCase().replace(/[^a-z一-鿿]/g, '');
    return S.PROFANITY.some(function (w) { return n.indexOf(w) >= 0; });
  };

  /* ---------- toast ---------- */
  var toastTimer;
  U.toast = function (msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  };

  /* ---------- bottom sheet modal ---------- */
  U.sheet = function (innerHtml, opts) {
    opts = opts || {};
    var root = document.getElementById('overlayRoot');
    var m = U.node('<div class="modal"><div class="sheet">' + innerHtml + '</div></div>');
    root.appendChild(m);
    function close() {
      m.style.opacity = 0;
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 180);
      if (opts.onClose) opts.onClose();
    }
    m.addEventListener('click', function (e) { if (e.target === m && !opts.sticky) close(); });
    return { el: m, close: close };
  };

  /* ---------- tab bar ---------- */
  var TABS = [
    { id:'home',        label:'Home',        route:'#/home' },
    { id:'leaderboard', label:'Leaderboard', route:'#/leaderboard' },
    { id:'rewards',     label:'Rewards',     route:'#/rewards' },
    { id:'profile',     label:'Profile',     route:'#/profile' }
  ];
  function tabIcon(id, active) {
    var c = active ? '#001689' : '#999999';
    if (id === 'home') return '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 L12 5 L20 11.5" stroke="' + c + '" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5 V19 H10 V14 H14 V19 H18 V10.5" stroke="' + c + '" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (id === 'leaderboard') return '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="13" width="4" height="7" rx="1" fill="' + c + '"/><rect x="10" y="9" width="4" height="11" rx="1" fill="' + c + '"/><rect x="16" y="5" width="4" height="15" rx="1" fill="' + c + '"/></svg>';
    if (id === 'rewards') return '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4 H17 V8 A5 5 0 0 1 7 8 Z" fill="' + c + '"/><path d="M7 5 H4 A1 1 0 0 0 3 6 V7 A3 3 0 0 0 6.5 9.9" stroke="' + c + '" stroke-width="1.5" fill="none"/><path d="M17 5 H20 A1 1 0 0 1 21 6 V7 A3 3 0 0 1 17.5 9.9" stroke="' + c + '" stroke-width="1.5" fill="none"/><rect x="10.5" y="13" width="3" height="4" fill="' + c + '"/><rect x="8" y="17" width="8" height="2" rx="1" fill="' + c + '"/></svg>';
    return '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="' + c + '"/><path d="M4 20 Q4 13 12 13 Q20 13 20 20 Z" fill="' + c + '"/></svg>';
  }
  U.renderTabs = function (active) {
    var bar = document.getElementById('tabbar');
    var showDot = S.Store.unseenBadges().length > 0;
    bar.innerHTML = TABS.map(function (t) {
      var on = t.id === active;
      return '<button data-route="' + t.route + '" class="' + (on ? 'active' : '') + '" aria-current="' + (on ? 'page' : 'false') + '">' +
        '<span class="ico">' + tabIcon(t.id, on) + (t.id === 'rewards' && showDot ? '<span class="dot"></span>' : '') + '</span>' +
        '<span>' + t.label + '</span></button>';
    }).join('');
    bar.hidden = !active;
  };

  /* ---------- 春联 reveal beat ---------- */
  U.coupletReveal = function (parent, badge) {
    return new Promise(function (resolve) {
      var el = U.node(
        '<div class="reveal">' +
          '<div class="eyebrow" style="color:var(--gold)">Badge unlocked</div>' +
          '<div class="tagwrap">' + S.ART.coupletTag(badge, { w: 132, h: 158, glyph: 52 }) + '</div>' +
          '<div class="ph cjk">' + badge.phrase + '</div>' +
          '<div class="mn">' + U.esc(badge.meaning) + '</div>' +
          '<div class="nm">' + U.esc(badge.name) + '</div>' +
        '</div>');
      parent.appendChild(el);
      setTimeout(function () {
        el.style.transition = 'opacity .3s';
        el.style.opacity = 0;
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); resolve(); }, 300);
      }, 2400);
      el.addEventListener('click', function () {
        el.style.transition = 'opacity .2s'; el.style.opacity = 0;
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); resolve(); }, 200);
      });
    });
  };

  /* ---------- nickname + avatar editor (shared by onboarding and profile) ---------- */
  U.identityForm = function (prefill) {
    prefill = prefill || {};
    var chosen = prefill.avatar || 'lantern';
    var html =
      '<label for="nickname" class="eyebrow" style="display:block;margin-bottom:6px">Display name</label>' +
      '<input id="nickname" class="field" type="text" maxlength="16" autocomplete="off" placeholder="e.g. Ah Boy88" value="' + U.esc(prefill.nickname || '') + '">' +
      '<div class="errmsg" id="nickErr"></div>' +
      '<div class="eyebrow" style="margin:6px 0 10px">Pick your icon</div>' +
      '<div class="avgrid" id="avgrid">' +
      S.AVATARS.map(function (a) {
        return '<button type="button" class="avbtn" data-av="' + a.id + '" aria-label="' + a.label + '" aria-pressed="' + (a.id === chosen) + '">' + S.ART.avatar(a.id, 32) + '</button>';
      }).join('') + '</div>';

    function wire(root, onSubmitReady) {
      var input = root.querySelector('#nickname');
      var err = root.querySelector('#nickErr');
      U.on(root, '.avbtn', 'click', function (e, btn) {
        root.querySelectorAll('.avbtn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        chosen = btn.dataset.av;
      });
      input.addEventListener('input', function () { err.textContent = ''; input.classList.remove('err'); });
      return function validate() {
        var name = input.value.trim().replace(/\s+/g, ' ');
        if (name.length < 2) { err.textContent = 'Please enter at least 2 characters.'; input.classList.add('err'); return null; }
        if (name.length > 16) { err.textContent = 'Keep it to 16 characters or fewer.'; input.classList.add('err'); return null; }
        if (U.profane(name)) { err.textContent = 'That name will not fly on a family leaderboard — try another.'; input.classList.add('err'); return null; }
        return { nickname: name, avatar: chosen };
      };
    }
    return { html: html, wire: wire };
  };

  /* Frame ticker. Prefers requestAnimationFrame, but falls back to timers if frames
     stall (background tab, throttled webview) so a running game clock stays honest. */
  U.ticker = function (fn) {
    var alive = true, mode = 'raf', raf = 0, to = 0, lastTick = performance.now();
    function tick(ts) { if (!alive) return; lastTick = performance.now(); fn(ts || lastTick); }
    function rafLoop(ts) { if (!alive || mode !== 'raf') return; tick(ts); raf = requestAnimationFrame(rafLoop); }
    function toLoop() { if (!alive) return; tick(); to = setTimeout(toLoop, 16); }
    raf = requestAnimationFrame(rafLoop);
    var guard = setInterval(function () {
      if (!alive) { clearInterval(guard); return; }
      if (mode === 'raf' && performance.now() - lastTick > 240) { mode = 'timer'; cancelAnimationFrame(raf); toLoop(); }
    }, 240);
    return { stop: function () { alive = false; cancelAnimationFrame(raf); clearTimeout(to); clearInterval(guard); } };
  };

  /* countdown ring */
  U.ring = function (pct, size) {
    size = size || 26;
    var r = (size - 5) / 2, c = 2 * Math.PI * r;
    return '<svg class="ring" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#D4A017" stroke-width="3" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - pct)).toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
  };

  S.U = U;
})();
