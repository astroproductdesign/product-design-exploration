// Bond (affection) and unlocks. Bond mostly goes up; a grumpy cat can take a
// little back (loseBond), but never enough to drop a level or lose an unlock.
(function (G) {
  'use strict';

  function level(s) {
    return G.Catalog.levelFor(s.stats.bond);
  }

  function progress(s) {
    const L = G.Catalog.LEVELS;
    const lv = level(s);
    const cur = L[lv - 1];
    const next = L[lv];
    if (next === undefined) return { level: lv, into: 1, need: 1, max: true };
    return { level: lv, into: s.stats.bond - cur, need: next - cur, max: false };
  }

  // cap: name of a daily counter ('pet' | 'play' | 'feed') and its daily max,
  // so spamming one button doesn't race through the levels.
  const CAPS = { pet: 20, play: 20, feed: 8, care: 4, invite: 4 };

  // Cat coins (spent on the gachapon): one for each day you check in, a bonus at streak
  // milestones, three for every bond level, and some for achievements (achievements.js).
  const LEVEL_COINS = 3;
  const STREAK_COINS = { 3: 2, 7: 4, 14: 6, 30: 10 };

  function addCoins(s, n) {
    s.coins = (s.coins || 0) + n;
    return n;
  }

  function addBond(s, amount, t, capKey) {
    G.State.ensureDay(s, t);
    if (capKey) {
      const room = Math.max(0, CAPS[capKey] - s.daily[capKey]);
      amount = Math.min(amount, room);
      s.daily[capKey] += amount;
    }
    const res = { gained: 0, levelUp: null, unlocked: [] };
    if (amount <= 0) return res;
    const before = level(s);
    s.stats.bond += amount;
    res.gained = amount;
    const after = level(s);
    for (let lv = before + 1; lv <= after; lv++) {
      for (const key of G.Catalog.unlocksAt(lv)) {
        if (!s.unlocked.includes(key)) {
          s.unlocked.push(key);
          s.unseenUnlocks.push(key);
          res.unlocked.push(key);
        }
      }
      G.State.log(s, { t, type: 'levelup', level: lv });
    }
    if (after > before) {
      res.levelUp = after;
      res.coins = addCoins(s, LEVEL_COINS * (after - before));
    }
    return res;
  }

  // Taking a cat's tail or paw upsets them. Bond drops a little, but never below
  // the start of the current level, so unlocks are safe. Returns what was lost.
  function loseBond(s, amount) {
    const floor = G.Catalog.LEVELS[level(s) - 1];
    const lost = Math.max(0, Math.min(amount, s.stats.bond - floor));
    s.stats.bond -= lost;
    return lost;
  }

  // The first check-in each day: +5 bond, plus 1 more for every day in a row before it (up to
  // +5), and a cat coin (more at streak milestones).
  function dailyVisit(s, t) {
    const k = G.Clock.dayKey(t);
    if (s.lastVisitDay === k) return null;
    const yesterday = G.Clock.dayKey(t - 24 * 60 * 60 * 1000);
    s.flags.streak = s.lastVisitDay === yesterday ? (s.flags.streak || 1) + 1 : 1;
    s.flags.bestStreak = Math.max(s.flags.bestStreak || 0, s.flags.streak);
    s.lastVisitDay = k;
    const extra = Math.min(5, s.flags.streak - 1);
    const res = addBond(s, 5 + extra, t);
    const coins = addCoins(s, 1 + (STREAK_COINS[s.flags.streak] || 0));
    res.coins = (res.coins || 0) + coins;
    res.streak = s.flags.streak;
    res.streakBonus = extra;
    G.State.log(s, { t, type: 'visit', streak: s.flags.streak });
    return res;
  }

  // Another way to earn coins: look after the cat three ways in one day (feed, play, tidy up)
  // and there is a bonus of cat coins. Checked from the screen's clock; paid once a day.
  const CARE_COINS = 2;
  function dailyGoals(s, t) {
    G.State.ensureDay(s, t);
    const d = s.daily;
    const fed = d.feed > 0;
    const played = d.play > 0;
    const tidy = !!d.careBonus;
    return { fed, played, tidy, done: fed && played && tidy, paid: !!d.goalsPaid, coins: CARE_COINS };
  }

  function payDailyGoals(s, t) {
    const g = dailyGoals(s, t);
    if (!g.done || g.paid) return 0;
    s.daily.goalsPaid = true;
    G.State.log(s, { t, type: 'careDone' });
    return addCoins(s, CARE_COINS);
  }

  // +2 for every day you spend together, visited or not. Called by the
  // simulation as it crosses midnight.
  function passiveDay(s, t) {
    const k = G.Clock.dayKey(t);
    if (s.flags.bondDay === k) return;
    s.flags.bondDay = k;
    addBond(s, 2, t);
  }

  function isUnlocked(s, key) {
    return s.unlocked.includes(key);
  }

  function bump(s, kind, key, n) {
    const m = s.favorites[kind];
    m[key] = (m[key] || 0) + (n === undefined ? 1 : n);
  }

  // The favourite is whatever has the most points, once it's clearly ahead.
  function favorite(s, kind, min) {
    const m = s.favorites[kind];
    let best = null;
    let bestN = min === undefined ? 6 : min;
    for (const [k, n] of Object.entries(m)) {
      if (n >= bestN) {
        best = k;
        bestN = n;
      }
    }
    return best;
  }

  G.Progression = { level, progress, addBond, addCoins, loseBond, dailyVisit, dailyGoals, payDailyGoals, CARE_COINS, LEVEL_COINS, STREAK_COINS, passiveDay, isUnlocked, bump, favorite, CAPS };
})(globalThis.CatGame = globalThis.CatGame || {});
