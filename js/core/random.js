// Seeded randomness. The cat's choices are seeded by (save seed, timestamp),
// so replaying the same stretch of time always gives the same story — the
// "while you were away" catch-up is deterministic, not re-rolled on reload.
(function (G) {
  'use strict';

  function hash(...parts) {
    const s = parts.join('|');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // mulberry32
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(r, arr) {
    return arr[Math.floor(r() * arr.length)];
  }

  // entries: [[value, weight], ...]
  function weighted(r, entries) {
    const live = entries.filter(([, w]) => w > 0);
    if (!live.length) return null;
    let total = 0;
    for (const [, w] of live) total += w;
    let x = r() * total;
    for (const [v, w] of live) {
      x -= w;
      if (x <= 0) return v;
    }
    return live[live.length - 1][0];
  }

  function between(r, lo, hi) {
    return lo + r() * (hi - lo);
  }

  G.Random = { hash, rng, pick, weighted, between };
})(globalThis.CatGame = globalThis.CatGame || {});
