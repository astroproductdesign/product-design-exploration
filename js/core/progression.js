// Bond (affection) and unlocks. Bond only ever goes up.
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
  const CAPS = { pet: 15, play: 15, feed: 6 };

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
    if (after > before) res.levelUp = after;
    return res;
  }

  // +5 the first time you check in each day.
  function dailyVisit(s, t) {
    const k = G.Clock.dayKey(t);
    if (s.lastVisitDay === k) return null;
    s.lastVisitDay = k;
    G.State.log(s, { t, type: 'visit' });
    return addBond(s, 5, t);
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

  G.Progression = { level, progress, addBond, dailyVisit, passiveDay, isUnlocked, bump, favorite, CAPS };
})(globalThis.CatGame = globalThis.CatGame || {});
