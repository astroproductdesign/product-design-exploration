/* localStorage persistence. Everything the app remembers lives under one key. */
(function () {
  var KEY = S.CFG.STORE_KEY;
  var memory = null;            // fallback when storage is unavailable (private mode, file:// lockdown)
  var usingMemory = false;

  function blank() {
    return {
      version: 1,
      onboarded: false,
      profile: { nickname: '', avatar: 'lantern', lang: 'EN', notifications: true, createdAt: null },
      festival: null,                       // {start:'YYYY-MM-DD', end:'YYYY-MM-DD'}
      best: {},                             // per game: {score fields}
      history: [],                          // [{id, game, date, ...}]
      badges: {},                           // id -> ISO date unlocked
      badgesSeen: [],
      vouchers: [],                         // [{code, label, date}]
      attempts: {}                          // per game attempt counter
    };
  }

  function read() {
    if (usingMemory) return memory;
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return blank();
      var data = JSON.parse(raw);
      var base = blank();
      for (var k in base) if (!(k in data)) data[k] = base[k];
      return data;
    } catch (e) {
      usingMemory = true;
      memory = memory || blank();
      return memory;
    }
  }

  function write(data) {
    if (usingMemory) { memory = data; return data; }
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { usingMemory = true; memory = data; }
    return data;
  }

  function update(fn) { var d = read(); fn(d); write(d); return d; }

  /* ---------- dates ---------- */
  function iso(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(isoStr, n) {
    var p = isoStr.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function daysBetween(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    var da = new Date(+pa[0], +pa[1] - 1, +pa[2]), db = new Date(+pb[0], +pb[1] - 1, +pb[2]);
    return Math.round((db - da) / 86400000);
  }

  var Store = {
    get: read,
    save: write,
    update: update,
    isMemoryOnly: function () { return usingMemory; },
    today: function () { return iso(); },
    addDays: addDays,
    daysBetween: daysBetween,

    /* ---------- lifecycle ---------- */
    ensureFestival: function () {
      return update(function (d) {
        if (S.CFG.FESTIVAL_FIXED) { d.festival = S.CFG.FESTIVAL_FIXED; return; }
        if (!d.festival) {
          var start = iso();
          d.festival = { start: start, end: addDays(start, S.CFG.FESTIVAL_DAYS - 1) };
        }
      }).festival;
    },
    festivalStatus: function () {
      var d = read(); var f = d.festival || Store.ensureFestival(); var t = iso();
      var leftInclusive = daysBetween(t, f.end) + 1;
      var dayNo = daysBetween(f.start, t) + 1;
      if (daysBetween(t, f.start) > 0) return { state: 'before', days: daysBetween(t, f.start), label: 'CNY starts in ' + daysBetween(t, f.start) + ' days' };
      if (leftInclusive <= 0) return { state: 'after', days: 0, label: 'Festival period ended' };
      return { state: 'live', days: leftInclusive, dayNo: dayNo, label: leftInclusive + (leftInclusive === 1 ? ' day' : ' days') + ' left in CNY' };
    },

    completeOnboarding: function (nickname, avatar) {
      return update(function (d) {
        d.onboarded = true;
        d.profile.nickname = nickname;
        d.profile.avatar = avatar;
        d.profile.createdAt = d.profile.createdAt || iso();
      });
    },
    setProfile: function (patch) {
      return update(function (d) { for (var k in patch) d.profile[k] = patch[k]; });
    },

    /* ---------- play history ---------- */
    playDates: function () {
      var seen = {}, out = [];
      read().history.forEach(function (h) { if (!seen[h.date]) { seen[h.date] = 1; out.push(h.date); } });
      return out.sort();
    },
    streak: function () {
      var dates = Store.playDates();
      if (!dates.length) return 0;
      var t = iso();
      var last = dates[dates.length - 1];
      var gap = daysBetween(last, t);
      if (gap > 1) return 0;                       // streak broken
      var streak = 1, cursor = last;
      for (var i = dates.length - 2; i >= 0; i--) {
        if (daysBetween(dates[i], cursor) === 1) { streak++; cursor = dates[i]; }
        else if (daysBetween(dates[i], cursor) === 0) { continue; }
        else break;
      }
      return streak;
    },
    weekGrid: function () {
      // Monday-first 7-day grid for the current week
      var now = new Date();
      var dow = (now.getDay() + 6) % 7;            // 0 = Monday
      var monday = new Date(now); monday.setDate(now.getDate() - dow);
      var played = {}; Store.playDates().forEach(function (d) { played[d] = 1; });
      var out = [];
      for (var i = 0; i < 7; i++) {
        var d = new Date(monday); d.setDate(monday.getDate() + i);
        var key = iso(d);
        out.push({ date: key, letter: ['M','T','W','T','F','S','S'][i], played: !!played[key], isToday: key === iso(), future: daysBetween(iso(), key) > 0 });
      }
      return out;
    },

    /* ---------- results ---------- */
    bumpAttempt: function (game) {
      var n = 0;
      update(function (d) { d.attempts[game] = (d.attempts[game] || 0) + 1; n = d.attempts[game]; });
      return n;
    },
    attempts: function (game) { return read().attempts[game] || 0; },

    /** result: {game, ...stats}. Returns {entry, newBadges, isBest} */
    recordSession: function (result) {
      var newBadges = [];
      var isBest = false;
      update(function (d) {
        var entry = {
          id: 'h' + Date.now() + Math.floor(Math.random() * 1000),
          game: result.game,
          date: iso(),
          ts: Date.now()
        };
        for (var k in result) if (k !== 'game') entry[k] = result[k];
        d.history.unshift(entry);
        if (d.history.length > 60) d.history.length = 60;

        var prev = d.best[result.game];
        var better = false;
        if (!prev) better = true;
        else if (result.game === 'gathering') better = (result.cleanliness || 0) > (prev.cleanliness || 0);
        else if (result.game === 'smile') {
          var a = result.timeMs || Infinity, b = prev.timeMs || Infinity;
          better = (result.whiteness || 0) > (prev.whiteness || 0) || ((result.whiteness || 0) === (prev.whiteness || 0) && a < b);
        } else if (result.game === 'fresh') {
          better = (result.passes || 0) > (prev.passes || 0) || ((result.passes || 0) === (prev.passes || 0) && (result.timeMs || Infinity) < (prev.timeMs || Infinity));
        }
        if (better) { d.best[result.game] = JSON.parse(JSON.stringify(entry)); isBest = true; }
        result._entry = entry;
      });

      // badge evaluation runs after the entry is stored so streak/allGames see it
      (result.badgeCandidates || []).forEach(function (id) { if (Store.unlockBadge(id)) newBadges.push(id); });
      if (Store.streak() >= 3 && Store.unlockBadge('streakKeeper')) newBadges.push('streakKeeper');
      var played = Store.gamesPlayed();
      if (played.smile && played.gathering && played.fresh && Store.unlockBadge('cnyChampion')) newBadges.push('cnyChampion');

      return { entry: result._entry, newBadges: newBadges, isBest: isBest };
    },
    gamesPlayed: function () {
      var out = {};
      read().history.forEach(function (h) { out[h.game] = true; });
      return out;
    },
    best: function (game) { return read().best[game] || null; },
    history: function (game) {
      var h = read().history;
      return game ? h.filter(function (x) { return x.game === game; }) : h;
    },
    historyById: function (id) {
      return read().history.filter(function (h) { return h.id === id; })[0] || null;
    },

    /* ---------- badges ---------- */
    unlockBadge: function (id) {
      var fresh = false;
      update(function (d) {
        if (!d.badges[id]) { d.badges[id] = iso(); fresh = true; }
      });
      return fresh;
    },
    badges: function () { return read().badges; },
    badgeCount: function () { return Object.keys(read().badges).length; },
    unseenBadges: function () {
      var d = read();
      return Object.keys(d.badges).filter(function (id) { return d.badgesSeen.indexOf(id) < 0; });
    },
    markBadgesSeen: function () {
      update(function (d) { d.badgesSeen = Object.keys(d.badges); });
    },

    /* ---------- vouchers ---------- */
    tierState: function () {
      var count = Store.badgeCount();
      var tiers = S.CFG.VOUCHER_TIERS;
      var unlocked = tiers.filter(function (t) { return count >= t.badges; });
      var next = tiers.filter(function (t) { return count < t.badges; })[0] || null;
      var current = unlocked[unlocked.length - 1] || null;
      var floor = unlocked.length ? unlocked[unlocked.length - 1].badges : 0;
      var pct = next ? Math.round(((count - floor) / (next.badges - floor)) * 100) : 100;
      return { count: count, current: current, next: next, pct: Math.max(0, Math.min(100, pct)) };
    },
    redeem: function (code, label) {
      var already = read().vouchers.some(function (v) { return v.code === code; });
      if (already) return false;
      update(function (d) { d.vouchers.unshift({ code: code, label: label, date: iso() }); });
      return true;
    },
    vouchers: function () { return read().vouchers; },

    reset: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      memory = null; usingMemory = false;
    },

    /* demo seed so leaderboard/streak/badges have something to show */
    seedDemo: function () {
      var t = iso();
      update(function (d) {
        d.onboarded = true;
        d.profile = { nickname: 'AhBoy88', avatar: 'lantern', lang: 'EN', notifications: true, createdAt: addDays(t, -2) };
        d.festival = { start: addDays(t, -2), end: addDays(t, S.CFG.FESTIVAL_DAYS - 3) };
        d.history = [
          { id:'seed1', game:'smile', date:addDays(t,-2), ts:Date.now()-172800000, timeMs:52400, whiteness:100, combo:6 },
          { id:'seed2', game:'gathering', date:addDays(t,-1), ts:Date.now()-86400000, cleanliness:88, sugar:12, durationMs:180000 }
        ];
        d.best = {
          smile: d.history[0],
          gathering: d.history[1]
        };
        d.badges = { perfectShine: addDays(t,-2), zeroSugar: addDays(t,-1) };
        d.badgesSeen = ['perfectShine'];
        d.attempts = { smile:1, gathering:1 };
      });
    }
  };

  S.Store = Store;
})();
