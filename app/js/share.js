/* Shareable result screen — always regenerated from the player's CURRENT best. */
(function () {
  var U = S.U;

  function earnedBadgeFor(game) {
    var owned = S.Store.badges();
    var list = S.BADGES.filter(function (b) { return (b.game === game || b.game === 'all') && owned[b.id]; });
    if (list.length) return { badge: list[list.length - 1], earned: true };
    var fallback = S.BADGES.filter(function (b) { return b.game === game; })[0];
    return { badge: fallback, earned: false };
  }

  function primaryStat(game) {
    var best = S.Store.best(game);
    if (!best) return { value: '—', sub: 'Not played yet' };
    if (game === 'gathering') {
      return { value: (best.cleanliness || 0) + '%', sub: 'Cleanliness · best of 3 rounds' };
    }
    if (game === 'fresh') {
      return { value: U.fmtTime(best.timeMs, true), sub: (best.passes || 0) + ' of 3 rounds passed' };
    }
    return { value: U.fmtTime(best.timeMs, true), sub: (best.whiteness || 0) + '% shine · combo x' + (best.combo || 0) };
  }

  function cardBg() {
    return '<div class="bg">' +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#FBEFDA,#F7EEDD 55%,#F3E6CE)"></div>' +
      '<div style="position:absolute;inset:0;background-image:' + S.ART.waveBg('#C9A24A', .22) + '"></div>' +
      '<svg viewBox="0 0 330 46" preserveAspectRatio="none" style="position:absolute;top:0;left:0;width:100%;height:46px" aria-hidden="true">' +
        '<path d="M0,0 H330 V16 C305,44 280,44 248,17 C218,44 192,44 165,17 C138,44 112,44 82,17 C50,44 25,44 0,16 Z" fill="#C8102E"/>' +
        '<path d="M0,16 C25,44 50,44 82,17 C112,44 138,44 165,17 C192,44 218,44 248,17 C280,44 305,44 330,16" fill="none" stroke="#E8C879" stroke-width="1.8"/>' +
      '</svg>' +
      '<div style="position:absolute;top:24px;left:6px">' + S.ART.lantern(54) + '</div>' +
      '<div style="position:absolute;top:18px;right:6px">' + S.ART.lantern(46, true) + '</div>' +
      '<svg viewBox="0 0 90 120" style="position:absolute;bottom:-4px;left:-8px;width:88px;opacity:.85" aria-hidden="true">' +
        '<path d="M4,120 C26,86 18,54 46,26" stroke="#2E2A26" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M26,78 C42,68 50,54 54,40" stroke="#2E2A26" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '<g fill="#E2708C">' +
          '<circle cx="46" cy="26" r="5"/><circle cx="56" cy="38" r="4"/><circle cx="28" cy="72" r="4.4"/><circle cx="14" cy="98" r="3.6"/>' +
        '</g></svg>' +
      '<svg viewBox="0 0 90 120" style="position:absolute;bottom:-4px;right:-8px;width:88px;opacity:.85;transform:scaleX(-1)" aria-hidden="true">' +
        '<path d="M4,120 C26,86 18,54 46,26" stroke="#2E2A26" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<g fill="#E2708C"><circle cx="46" cy="26" r="5"/><circle cx="28" cy="72" r="4.4"/><circle cx="14" cy="98" r="3.6"/></g></svg>' +
    '</div>';
  }

  /** The card itself — reused on the share screen and (scaled) anywhere else. */
  S.Share = {
    card: function (game) {
      var g = S.GAMES[game];
      var eb = earnedBadgeFor(game);
      var stat = primaryStat(game);
      var greet = S.GREETINGS[game];
      var who = S.Store.get().profile.nickname || 'Player';
      return '<div class="sharecard">' + cardBg() +
        '<div class="inner">' +
          '<div class="sc-kicker">Systema · ' + U.esc(g.name) + '</div>' +
          '<div style="margin-top:.6em">' + S.ART.coupletTag(eb.badge, { w: 104, h: 124, glyph: 38 }) + '</div>' +
          '<div class="cjk" style="font-size:1.05em;letter-spacing:.1em;color:#8E1B20;margin-top:.5em">' + eb.badge.phrase + '</div>' +
          '<div class="sc-mean">' + U.esc(eb.badge.meaning) + '</div>' +
          '<div class="sc-earn">' + (eb.earned ? U.esc(eb.badge.name) + ' unlocked' : 'Next up: ' + U.esc(eb.badge.name)) + '</div>' +
          '<div class="sc-score">' + S.ART.star(20) + '<span>' + stat.value + '</span></div>' +
          '<div class="sc-sub">' + U.esc(stat.sub) + '</div>' +
          '<div class="sc-greet">' +
            '<div class="zh cjk">' + greet.zh + '</div>' +
            '<div class="en">' + U.esc(greet.en) + ' Beat ' + U.esc(who) + '’s score and claim your own couplet.</div>' +
          '</div>' +
          '<div class="sc-plate">' + S.ART.logo() +
            '<div style="width:1px;align-self:stretch;background:#E6E6E6"></div>' +
            '<div class="cta"><b>Play now</b>Scan · <span class="cjk">扫码一起玩</span></div>' + S.ART.qr(40) +
          '</div>' +
          '<div class="sc-tag">Expert Care, Every Day · ' + U.esc(U.fmtDate(S.Store.today())) + '</div>' +
        '</div></div>';
    },

    shareText: function (game) {
      var g = S.GAMES[game];
      var eb = earnedBadgeFor(game);
      var stat = primaryStat(game);
      var who = S.Store.get().profile.nickname || 'I';
      return who + ' scored ' + stat.value + ' on ' + g.name + ' — ' + eb.badge.phrase + ' (' + eb.badge.meaning + '). ' +
        'Systema CNY Challenge · Expert Care, Every Day.';
    },

    doShare: function (game) {
      var text = S.Share.shareText(game);
      var url = location.href.split('#')[0];
      if (navigator.share) {
        navigator.share({ title: 'Systema CNY Challenge', text: text, url: url })
          .catch(function () { /* user cancelled */ });
        return;
      }
      var payload = text + '\n' + url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload)
          .then(function () { U.toast('Result copied — paste it into any chat'); })
          .catch(function () { U.toast('Could not copy on this browser'); });
      } else {
        U.toast('Sharing is not available in this browser');
      }
    }
  };

  /* ---------- the screen ---------- */
  S.Screens = S.Screens || {};
  S.Screens.share = function (params) {
    var game = params.game;
    if (!S.GAMES[game]) game = 'smile';
    var el = U.node(
      '<section class="screen" style="background:linear-gradient(180deg,#FBF3E4,#FFFFFF 46%)">' +
        '<div class="topbar">' +
          '<button class="iconbtn" data-act="back" aria-label="Back">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" stroke="#666" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
          '<div><div class="eyebrow">Share your result</div>' +
          '<div style="font-size:16px;font-weight:800;color:var(--blue)">' + U.esc(S.GAMES[game].name) + '</div></div>' +
        '</div>' +
        '<div class="pad" style="padding-top:10px">' + S.Share.card(game) + '</div>' +
        '<div class="pad" style="padding-top:0;display:grid;gap:9px">' +
          '<button class="btn block" data-act="share">Share now</button>' +
          '<button class="btn ghost block" data-act="again">Play ' + U.esc(S.GAMES[game].name) + ' again</button>' +
          '<button class="btn ghost block" data-act="home">Back to home</button>' +
          '<p class="tiny" style="text-align:center;margin-top:2px">Always shows your current personal best — reopen it any time from Profile.</p>' +
        '</div>' +
      '</section>');

    U.on(el, '[data-act]', 'click', function (e, b) {
      var a = b.dataset.act;
      if (a === 'share') S.Share.doShare(game);
      if (a === 'again') S.Router.go(S.GAMES[game].route);
      if (a === 'home' || a === 'back') S.Router.go('#/home');
    });
    return { el: el, tab: null };
  };
})();
