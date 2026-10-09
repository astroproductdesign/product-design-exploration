/* Main screens: onboarding, home, leaderboard, rewards, profile */
(function () {
  var U = S.U;
  S.Screens = S.Screens || {};

  /* =======================================================  ONBOARDING  */
  S.Screens.onboarding = function () {
    var form = U.identityForm(S.Store.get().profile);
    var el = U.node(
      '<section class="screen">' +
        '<div class="pad" style="padding-top:30px;display:flex;flex-direction:column;flex:1">' +
          '<div class="ob-head">' +
            '<div class="mark wordmark">SYSTEMA</div>' +
            '<div class="sub">Expert Care, Every Day</div>' +
          '</div>' +
          '<h1 style="font-size:22px;margin-top:28px;line-height:1.3">What should we call you?</h1>' +
          '<p class="tiny" style="margin-top:6px">This shows on the leaderboard. Saved on this device only.</p>' +
          '<div style="margin-top:16px">' + form.html + '</div>' +
          '<div class="grow"></div>' +
          '<button class="btn block" data-act="go" style="margin-top:20px">Let’s go</button>' +
        '</div>' +
      '</section>');

    var validate = form.wire(el);
    U.on(el, '[data-act="go"]', 'click', function () {
      var v = validate();
      if (!v) return;
      S.Store.completeOnboarding(v.nickname, v.avatar);
      S.Store.ensureFestival();
      S.Router.go('#/home');
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') el.querySelector('[data-act="go"]').click(); });
    return { el: el, tab: null };
  };

  /* =======================================================  HOME  */
  function gameThumb(id) {
    if (id === 'smile') return '<div class="thumb" style="background:#E7F3F3">' + S.ART.brush() + '</div>';
    if (id === 'gathering') return '<div class="thumb" style="background:#FBF3E4">' + S.ART.tray() + '</div>';
    return '<div class="thumb" style="background:#FDF1E3">' + S.ART.lantern(48) + '</div>';
  }
  function bestChip(id) {
    var b = S.Store.best(id);
    if (!b) return '<span class="chip grey">Not played yet</span>';
    if (id === 'gathering') return '<span class="chip teal">Best: ' + b.cleanliness + '% clean</span>';
    if (id === 'fresh') return '<span class="chip teal">Best: ' + U.fmtTime(b.timeMs, true) + '</span>';
    return '<span class="chip teal">Best: ' + U.fmtTime(b.timeMs, true) + '</span>';
  }
  function todaysChallenge() {
    // rotates by day-of-festival so it feels scheduled, not random
    var f = S.Store.festivalStatus();
    var idx = Math.abs((f.dayNo || 1) - 1) % S.GAME_ORDER.length;
    return S.GAMES[S.GAME_ORDER[idx]];
  }

  S.Screens.home = function () {
    var st = S.Store.get();
    var streak = S.Store.streak();
    var fest = S.Store.festivalStatus();
    var today = todaysChallenge();
    var badgeCount = S.Store.badgeCount();

    var el = U.node(
      '<section class="screen">' +
        '<div class="home-head">' +
          '<div class="lanterns">' +
            '<div style="position:absolute;left:10px;top:-6px">' + S.ART.lantern(88) + '</div>' +
            '<div style="position:absolute;right:8px;top:-2px">' + S.ART.lantern(72, true) + '</div>' +
          '</div>' +
          '<div class="brand wordmark">SYSTEMA</div>' +
          '<div class="rule"></div>' +
          '<div class="status-strip">' +
            '<span class="flame">' + (streak > 0 ? 'Day ' + streak + ' streak' : 'Start your streak') + '</span><span>·</span>' +
            '<span>' + U.esc(fest.label) + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="banner" data-route="' + today.route + '">' +
          '<div class="bg" style="background-image:' + S.ART.waveBg('#FFFFFF', .16) + '"></div>' +
          '<div class="rel"><div class="lbl">Today’s challenge</div><div class="name">' + U.esc(today.name) + '</div></div>' +
          '<span class="btn sm rel" style="background:#fff;color:#C8102E">Play</span>' +
        '</div>' +

        '<div class="pad" style="padding-top:16px;display:grid;gap:11px">' +
          S.GAME_ORDER.map(function (id) {
            var g = S.GAMES[id];
            return '<div class="gamecard" data-route="' + g.route + '">' + gameThumb(id) +
              '<div style="flex:1;min-width:0">' +
                '<div class="nm">' + U.esc(g.name) + '</div>' +
                '<div class="hk">' + U.esc(g.hook) + '</div>' +
                '<div style="margin-top:5px">' + bestChip(id) + '</div>' +
              '</div>' +
              '<span class="btn sm">Play</span></div>';
          }).join('') +
        '</div>' +

        '<div class="pad" style="padding-top:4px">' +
          '<div class="nudge" data-route="#/rewards">' +
            '<span style="font-size:12.5px;font-weight:800">' + (badgeCount ? badgeCount + ' badge' + (badgeCount === 1 ? '' : 's') + ' unlocked — view collection' : 'Win your first <span class=\'cjk\'>春联</span> badge') + '</span>' +
            '<span style="color:var(--gold);font-weight:800">›</span>' +
          '</div>' +
        '</div>' +
        '<div class="grow"></div>' +
        '<p class="tiny" style="text-align:center;padding:14px 20px 12px">Expert Care, Every Day · Systema Oral Care</p>' +
      '</section>');

    U.on(el, '[data-route]', 'click', function (e, t) { S.Router.go(t.dataset.route); });
    return { el: el, tab: 'home' };
  };

  /* =======================================================  LEADERBOARD  */
  var lbState = { game: 'smile', mode: 'daily' };

  /* shared with the results screen */
  S.Board = {
    fmt: function (game, v) { return S.LEADER_META[game].unit === 'time' ? U.fmtTime(v, true) : v + '%'; },
    playerScore: function (game) {
      var b = S.Store.best(game);
      if (!b) return null;
      if (game === 'gathering') return b.cleanliness;
      if (b.cleanliness != null && b.cleanliness < 100) return null;  // only a completed run ranks on a time board
      return b.timeMs;
    },
    rows: function (game, mode) {
      var rows = S.LEADERS[game][mode].map(function (r) { return { name: r[0], score: r[1], me: false }; });
      var mine = S.Board.playerScore(game);
      var me = S.Store.get().profile.nickname || 'You';
      if (mine != null) rows.push({ name: me + ' (you)', score: mine, me: true });
      var lower = S.LEADER_META[game].better === 'lower';
      rows.sort(function (a, b) { return lower ? a.score - b.score : b.score - a.score; });
      rows.forEach(function (r, i) { r.rank = i + 1; });
      return rows;
    },
    rowHtml: function (game, r) {
      var cls = r.me ? 'me' : (r.rank === 1 ? 'rank1' : r.rank === 2 ? 'rank2' : r.rank === 3 ? 'rank3' : '');
      var rk = r.rank <= 3 ? '<div class="rk">' + r.rank + '</div>' : '<div class="rk plain">' + r.rank + '</div>';
      return '<div class="lrow ' + cls + '">' + rk + '<div class="nm">' + U.esc(r.name) + '</div>' +
        '<div class="sc">' + S.Board.fmt(game, r.score) + '</div></div>';
    }
  };
  var fmtScore = S.Board.fmt, buildBoard = S.Board.rows;

  S.Screens.leaderboard = function () {
    var el = U.node('<section class="screen"><div class="pad" style="display:flex;flex-direction:column;flex:1"></div></section>');
    var wrap = el.querySelector('.pad');

    function paint() {
      var rows = buildBoard(lbState.game, lbState.mode);
      var visible = rows.slice(0, 8);
      var mineRow = rows.filter(function (r) { return r.me; })[0];
      var mineVisible = visible.some(function (r) { return r.me; });

      wrap.innerHTML =
        '<h1 class="h-title">Leaderboard</h1>' +
        '<div class="segwrap" style="margin-top:14px">' +
          S.GAME_ORDER.map(function (id) {
            return '<button data-game="' + id + '" class="' + (lbState.game === id ? 'on' : '') + '">' +
              U.esc(id === 'gathering' ? 'Gathering' : S.GAMES[id].name) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="pills">' +
          '<button data-mode="daily" class="' + (lbState.mode === 'daily' ? 'on' : '') + '">Daily</button>' +
          '<button data-mode="festival" class="' + (lbState.mode === 'festival' ? 'on' : '') + '">Festival Period</button>' +
        '</div>' +
        '<div style="margin-top:14px;display:grid;gap:6px">' +
          visible.map(function (r) { return S.Board.rowHtml(lbState.game, r); }).join('') +
        '</div>' +
        '<div class="grow"></div>' +
        (mineRow && !mineVisible
          ? '<div class="pinned"><div class="lrow me"><div class="rk plain">' + mineRow.rank + '</div><div class="nm">' + U.esc(mineRow.name) + '</div>' +
            '<div class="sc">' + fmtScore(lbState.game, mineRow.score) + '</div></div></div>'
          : (!mineRow ? '<div class="pinned"><div class="lrow" style="background:#F7F7F8"><div class="rk plain">–</div>' +
              '<div class="nm" style="color:var(--grey-m)">Play ' + U.esc(S.GAMES[lbState.game].name) + ' to take a place</div></div></div>' : '')) +
        '<p class="tiny" style="text-align:center;margin-top:10px">Other players are sample data for this prototype — your score is live from this device.</p>';
    }

    U.on(wrap, '[data-game]', 'click', function (e, b) { lbState.game = b.dataset.game; paint(); });
    U.on(wrap, '[data-mode]', 'click', function (e, b) { lbState.mode = b.dataset.mode; paint(); });
    paint();
    return { el: el, tab: 'leaderboard' };
  };

  /* =======================================================  REWARDS  */
  S.Screens.rewards = function () {
    var owned = S.Store.badges();
    var unseen = S.Store.unseenBadges();
    var tier = S.Store.tierState();
    var played = S.Store.gamesPlayed();
    var vouchers = S.Store.vouchers();

    var el = U.node(
      '<section class="screen"><div class="pad" style="display:flex;flex-direction:column;flex:1">' +
        '<h1 class="h-title">Rewards</h1>' +
        '<p class="muted" style="margin-top:3px"><span class="cjk">春联</span> badges from all three games, one collection</p>' +
        '<div class="badgewall" style="margin-top:16px">' +
          S.BADGES.map(function (b) {
            var has = !!owned[b.id];
            return '<button class="badgecell ' + (has ? '' : 'locked') + '" data-badge="' + b.id + '">' +
              (b.bonus ? '<span class="flag">All 3 games</span>' : '') +
              S.ART.coupletTag(b, { locked: !has, w: 92, h: 108, glyph: 32 }) +
              (unseen.indexOf(b.id) >= 0 ? '<span class="new"></span>' : '') +
              '<span class="nm">' + U.esc(b.name) + '</span></button>';
          }).join('') +
        '</div>' +

        '<div class="divider"></div>' +

        '<div style="display:flex;align-items:baseline;justify-content:space-between">' +
          '<h2 style="font-size:15px">Redeem</h2>' +
          '<span class="tiny">' + tier.count + ' of ' + S.BADGES.length + ' badges</span>' +
        '</div>' +
        '<p class="muted" style="margin-top:3px">' +
          (tier.next ? (tier.next.badges - tier.count) + ' more badge' + ((tier.next.badges - tier.count) === 1 ? '' : 's') + ' for ' + U.esc(tier.next.label)
                     : 'Every tier unlocked — nice work') +
        '</p>' +
        '<div class="meter" style="margin-top:8px"><i style="width:' + tier.pct + '%"></i></div>' +

        (tier.current
          ? '<div class="vouch" style="margin-top:14px">' +
              '<div><div class="tiny" style="font-weight:700">Your voucher — ' + U.esc(tier.current.label) + '</div>' +
              '<div class="code">' + U.esc(tier.current.code) + '</div></div>' +
              '<button class="btn sm" data-copy="' + U.esc(tier.current.code) + '" data-label="' + U.esc(tier.current.label) + '">Copy</button>' +
            '</div>'
          : '<div class="vouch" style="margin-top:14px;border-style:solid;border-color:var(--grey-l);background:var(--surface)">' +
              '<div><div class="tiny" style="font-weight:700">First voucher at 3 badges</div>' +
              '<div class="code" style="color:var(--grey-m)">— — — — —</div></div>' +
              '<button class="btn sm" disabled>Copy</button></div>') +

        '<button class="rowbtn" data-act="hist" style="margin-top:12px;background:none;padding:10px 2px">' +
          '<span class="tiny" style="font-weight:700">' + vouchers.length + ' voucher' + (vouchers.length === 1 ? '' : 's') + ' redeemed</span>' +
          '<span style="color:var(--grey-m)">›</span></button>' +
        '<div id="vhist" hidden style="display:grid;gap:6px;margin-top:2px">' +
          (vouchers.length ? vouchers.map(function (v) {
            return '<div class="rowbtn" style="cursor:default"><span><b style="font-size:12px">' + U.esc(v.code) + '</b>' +
              '<span class="tiny" style="display:block">' + U.esc(v.label) + '</span></span>' +
              '<span class="tiny">' + U.esc(U.fmtDate(v.date)) + '</span></div>';
          }).join('') : '<p class="tiny">Nothing redeemed yet.</p>') +
        '</div>' +

        '<div class="grow"></div>' +
        '<p class="tiny" style="text-align:center;margin-top:12px">' +
          (played.smile && played.gathering && played.fresh ? 'All three games played — CNY Champion is yours.' : 'Play all three games to unlock the CNY Champion bonus badge.') +
        '</p>' +
      '</div></section>');

    U.on(el, '[data-badge]', 'click', function (e, b) {
      var badge = S.badgeById(b.dataset.badge);
      var has = !!S.Store.badges()[badge.id];
      U.sheet(
        '<div style="text-align:center">' +
          '<div style="display:flex;justify-content:center">' + S.ART.coupletTag(badge, { locked: !has, w: 116, h: 138, glyph: 42 }) + '</div>' +
          '<div class="cjk" style="font-size:24px;letter-spacing:.14em;color:var(--red-d);margin-top:12px">' + badge.phrase + '</div>' +
          '<div class="tiny" style="margin-top:2px">' + U.esc(badge.pinyin) + '</div>' +
          '<div style="font-weight:800;margin-top:8px">' + U.esc(badge.meaning) + '</div>' +
          '<div class="eyebrow" style="margin-top:10px;color:var(--gold)">' + U.esc(badge.name) + '</div>' +
          '<p class="muted" style="margin-top:6px">' + U.esc(badge.how) + '</p>' +
          '<p class="tiny" style="margin-top:10px">' + (has ? 'Unlocked ' + U.esc(U.fmtDate(S.Store.badges()[badge.id])) : 'Still locked') + '</p>' +
          '<button class="btn block" data-act="close" style="margin-top:16px">Close</button>' +
        '</div>');
      U.on(document.getElementById('overlayRoot'), '[data-act="close"]', 'click', function (ev, btn) {
        var m = btn.closest('.modal'); if (m) m.remove();
      });
    });

    U.on(el, '[data-copy]', 'click', function (e, b) {
      var code = b.dataset.copy;
      function done() {
        S.Store.redeem(code, b.dataset.label);
        U.toast('Voucher code copied');
        S.Router.refresh();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(function () {
          var ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta);
          ta.select(); try { document.execCommand('copy'); } catch (err) {}
          document.body.removeChild(ta); done();
        });
      } else { done(); }
    });
    U.on(el, '[data-act="hist"]', 'click', function () {
      var h = el.querySelector('#vhist'); h.hidden = !h.hidden;
    });

    S.Store.markBadgesSeen();
    setTimeout(function () { U.renderTabs('rewards'); }, 400);
    return { el: el, tab: 'rewards' };
  };

  /* =======================================================  PROFILE  */
  S.Screens.profile = function () {
    var st = S.Store.get();
    var p = st.profile;
    var week = S.Store.weekGrid();
    var streak = S.Store.streak();

    function historyBlock(game) {
      var rows = S.Store.history(game);
      if (!rows.length) return '';
      var g = S.GAMES[game];
      return '<div class="eyebrow" style="margin-top:14px;color:' + g.accent + '">' + U.esc(g.name) + '</div>' +
        rows.slice(0, 4).map(function (h) {
          var main = game === 'gathering' ? h.cleanliness + '% clean'
                   : game === 'fresh' ? (h.passes || 0) + '/3 passed · ' + U.fmtTime(h.timeMs, true)
                   : U.fmtTime(h.timeMs, true) + ' · ' + (h.cleanliness || 0) + '% clean';
          return '<button class="rowbtn" data-entry="' + h.id + '" data-game="' + game + '" style="margin-top:6px">' +
            '<span><b style="font-size:12.5px">' + U.esc(main) + '</b>' +
            '<span class="tiny" style="display:block">' + U.esc(U.fmtDate(h.date)) + (h.badge ? ' · ' + U.esc(h.badge) : '') + '</span></span>' +
            '<span style="color:var(--grey-m)">›</span></button>';
        }).join('');
    }

    var anyHistory = S.Store.history().length > 0;

    var el = U.node(
      '<section class="screen"><div class="pad" style="display:flex;flex-direction:column;flex:1">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<div style="width:56px;height:56px;border-radius:999px;background:var(--paper);border:2.5px solid var(--gold);display:flex;align-items:center;justify-content:center;flex:none">' +
            S.ART.avatar(p.avatar, 30) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:17px;font-weight:800">' + U.esc(p.nickname || 'Player') + '</div>' +
            '<div class="tiny">' + (p.createdAt ? 'Playing since ' + U.esc(U.fmtDate(p.createdAt)) : 'New player') + '</div>' +
          '</div>' +
          '<button class="iconbtn" data-act="edit" aria-label="Edit profile">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L4.8 16.2 L16 5 L19 8 L7.8 19.2 Z" stroke="#666" stroke-width="1.8" fill="none" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</div>' +

        '<div style="margin-top:20px">' +
          '<div style="font-size:13px;font-weight:800">Streak — ' + streak + ' day' + (streak === 1 ? '' : 's') + '</div>' +
          '<div class="weekgrid">' +
            week.map(function (d) {
              return '<div class="d"><span>' + d.letter + '</span>' +
                '<div class="cell ' + (d.played ? 'on' : '') + ' ' + (d.isToday ? 'today' : '') + '"></div></div>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div style="margin-top:20px">' +
          '<div style="font-size:13px;font-weight:800">Score history</div>' +
          (anyHistory ? S.GAME_ORDER.map(historyBlock).join('')
                      : '<p class="muted" style="margin-top:8px">No sessions yet — play a game and it will show up here.</p>') +
          (anyHistory ? '<p class="tiny" style="margin-top:10px">Tap any session to reopen its share card — always regenerated with your current best.</p>' : '') +
        '</div>' +

        '<div class="divider" style="margin-top:20px"></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<span style="font-size:12.5px;font-weight:700">Notifications</span>' +
          '<button class="switch ' + (p.notifications ? 'on' : '') + '" data-act="notif" aria-pressed="' + !!p.notifications + '" aria-label="Notifications"><i></i></button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">' +
          '<span style="font-size:12.5px;font-weight:700">Language</span>' +
          '<div style="display:flex;gap:5px">' +
            ['EN','BM','中文'].map(function (l) {
              return '<button class="langbtn ' + (p.lang === l ? 'on' : '') + '" data-lang="' + l + '">' + l + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<p class="tiny" style="margin-top:12px;line-height:1.5">Your profile and progress are saved on this device only.' +
          (S.Store.isMemoryOnly() ? ' <b style="color:var(--red)">Storage is blocked in this browser — progress will not survive a reload.</b>' : '') + '</p>' +

        '<div class="grow"></div>' +
        '<button class="btn ghost block" data-act="reset" style="margin-top:16px;color:var(--red);border-color:rgba(200,16,46,.35)">Reset demo data</button>' +
        '<p class="tiny" style="text-align:center;margin-top:6px">Dev tool — clears everything and replays onboarding.</p>' +
      '</div></section>');

    U.on(el, '[data-act="notif"]', 'click', function (e, b) {
      var on = !S.Store.get().profile.notifications;
      S.Store.setProfile({ notifications: on });
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    });
    U.on(el, '[data-lang]', 'click', function (e, b) {
      S.Store.setProfile({ lang: b.dataset.lang });
      el.querySelectorAll('[data-lang]').forEach(function (x) { x.classList.toggle('on', x === b); });
      U.toast('Language preference saved (' + b.dataset.lang + ')');
    });
    U.on(el, '[data-entry]', 'click', function (e, b) { S.Router.go('#/share/' + b.dataset.game); });
    U.on(el, '[data-act="edit"]', 'click', function () {
      var form = U.identityForm(S.Store.get().profile);
      var sheet = U.sheet('<h2 style="font-size:17px;margin-bottom:12px">Edit your profile</h2>' + form.html +
        '<button class="btn block" data-act="save" style="margin-top:16px">Save</button>');
      var validate = form.wire(sheet.el);
      U.on(sheet.el, '[data-act="save"]', 'click', function () {
        var v = validate(); if (!v) return;
        S.Store.setProfile(v); sheet.close(); S.Router.refresh(); U.toast('Profile updated');
      });
    });
    U.on(el, '[data-act="reset"]', 'click', function () {
      var sheet = U.sheet(
        '<h2 style="font-size:17px">Reset demo data?</h2>' +
        '<p class="muted" style="margin-top:6px">Clears your nickname, scores, badges, streak and vouchers on this device, then replays onboarding.</p>' +
        '<div style="display:grid;gap:8px;margin-top:16px">' +
          '<button class="btn block" data-act="seed" style="background:var(--teal)">Reset and seed demo scores</button>' +
          '<button class="btn block" data-act="wipe" style="background:var(--red)">Reset to a clean first launch</button>' +
          '<button class="btn ghost block" data-act="cancel">Cancel</button>' +
        '</div>');
      U.on(sheet.el, '[data-act]', 'click', function (e, b) {
        var a = b.dataset.act;
        if (a === 'cancel') return sheet.close();
        S.Store.reset();
        if (a === 'seed') { S.Store.seedDemo(); sheet.close(); S.Router.go('#/home'); U.toast('Demo data seeded'); }
        else { sheet.close(); S.Router.go('#/onboarding'); }
      });
    });

    return { el: el, tab: 'profile' };
  };
})();
