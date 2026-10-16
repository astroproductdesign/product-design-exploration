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

  // Cat coins (spent in the gachapon and the shop): a coin for each daily check-in (ten for a full
  // stamp card), three for every bond level, and some for achievements (achievements.js).
  const LEVEL_COINS = 3;

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

  // The first visit each day: just keeps count of days in a row (for the streak trophies). The
  // reward for showing up is the stamp card, which you collect from the laptop (see checkIn).
  function dailyVisit(s, t) {
    const k = G.Clock.dayKey(t);
    if (s.lastVisitDay === k) return null;
    const yesterday = G.Clock.dayKey(t - 24 * 60 * 60 * 1000);
    s.flags.streak = s.lastVisitDay === yesterday ? (s.flags.streak || 1) + 1 : 1;
    s.flags.bestStreak = Math.max(s.flags.bestStreak || 0, s.flags.streak);
    s.lastVisitDay = k;
    G.State.log(s, { t, type: 'visit', streak: s.flags.streak });
    return { streak: s.flags.streak };
  }

  // ---- The daily check-in: a stamp card on the laptop -------------------------------------------
  // Check in on any five days (in a row or not) to fill a card; the fifth stamp pays a bonus.
  // A finished card stays on show until your next check-in, then a fresh one starts.
  const CARD_SIZE = 5;
  const STAMP_COINS = 1;
  const CARD_COINS = 10;
  const STAMP_BOND = 5;

  const checkin = (s) => s.checkin || (s.checkin = { stamps: [], last: '', cards: 0, total: 0 });

  function canCheckIn(s, t) {
    return checkin(s).last !== G.Clock.dayKey(t);
  }

  // What the card shows right now: the day keys stamped on it, and whether today's is done.
  function checkinView(s, t) {
    const c = checkin(s);
    const done = c.last === G.Clock.dayKey(t);
    const fresh = !done && c.stamps.length >= CARD_SIZE; // yesterday's full card is replaced
    return { stamps: fresh ? [] : c.stamps.slice(), done, cards: c.cards, total: c.total, size: CARD_SIZE };
  }

  // Check in for today (once a day): stamp the card, pay the coins and some bond.
  function checkIn(s, t) {
    if (!canCheckIn(s, t)) return null;
    const c = checkin(s);
    const day = G.Clock.dayKey(t);
    if (c.stamps.length >= CARD_SIZE) c.stamps = [];
    c.stamps.push(day);
    c.last = day;
    c.total += 1;
    const n = c.stamps.length;
    const full = n === CARD_SIZE;
    if (full) c.cards += 1;
    const coins = addCoins(s, full ? CARD_COINS : STAMP_COINS);
    const res = addBond(s, STAMP_BOND, t); // may level up
    G.State.log(s, { t, type: 'checkin', n, full });
    return { n, full, day, coins, bond: STAMP_BOND, levelUp: res.levelUp, unlocked: res.unlocked, levelCoins: res.coins || 0 };
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

  G.Progression = { level, progress, addBond, addCoins, loseBond, dailyVisit, canCheckIn, checkinView, checkIn, CARD_SIZE, STAMP_COINS, CARD_COINS, STAMP_BOND, dailyGoals, payDailyGoals, CARE_COINS, LEVEL_COINS, passiveDay, isUnlocked, bump, favorite, CAPS };
})(globalThis.CatGame = globalThis.CatGame || {});
