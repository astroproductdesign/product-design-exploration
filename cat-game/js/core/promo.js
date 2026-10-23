// Promo codes: a code we hand out that pays coins, free gachapon spins or a shop look.
// Codes are checked right here (there is no server), so a code works once per device.
// No drawing here; the screens are in app.js.
//
// To add a code: add a line to CODES with the code's hash (run `CatGame.Promo.hash('MY-CODE')` in the
// browser console, or see the README), its dates (real calendar days, 'YYYY-MM-DD') and its rewards.
// Codes are kept as hashes so they can't just be read out of the file.
(function (G) {
  'use strict';

  const MAX_WRONG = 5; // wrong tries in a row before a short break
  const LOCK_MS = 5 * 60 * 1000;
  const MAX_LEN = 24;

  // rewards: { coins: n } | { spins: n } | { look: 'piece:style' } (a shop look, e.g. 'rug:flower')
  const CODES = [
    // WELCOME-PURR: a sample. Replace it with your own codes.
    { h: '62d190f7bea47', from: '2026-01-01', to: '2099-12-31', rewards: [{ coins: 20 }, { spins: 1 }] },
    // TEST-1COIN: for trying the flow. 1 coin, once per device.
    { h: 'f9e0ba33599ca', from: '2026-01-01', to: '2026-12-31', rewards: [{ coins: 1 }] },
  ];

  // Capitals only; spaces, dashes and anything else are ignored, so "spring-24" and " SPRING 24 " match.
  function normalize(text) {
    return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_LEN);
  }

  // A 53-bit string hash (cyrb53), in hex. Not secret; it just keeps codes out of plain sight.
  function hash(text) {
    const str = normalize(text);
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  const dayKey = (ms) => {
    const d = new Date(ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  // The per-device record: which codes are used, and the wrong-try count. Kept apart from the save
  // so that "Start over" can't be used to claim a code again.
  function blank() {
    return { used: {}, wrong: 0, lockUntil: 0 };
  }

  // What a code gives, in words, for the "Code accepted" page. Items you already own pay coins instead.
  function plan(s, code) {
    const out = [];
    for (const r of code.rewards) {
      if (r.coins) out.push({ kind: 'coins', coins: r.coins });
      else if (r.spins) out.push({ kind: 'spins', spins: r.spins });
      else if (r.look) {
        const [piece, style] = r.look.split(':');
        const f = G.Shop.find(piece, style);
        if (!f) continue;
        if (G.Shop.owns(s, piece, style)) out.push({ kind: 'owned', coins: f.price, name: f.style.name, piece, style });
        else out.push({ kind: 'look', name: f.style.name, pieceName: f.piece.name, piece, style });
      }
    }
    return out;
  }

  function apply(s, rewards) {
    for (const r of rewards) {
      if (r.kind === 'coins' || r.kind === 'owned') s.coins = (s.coins || 0) + r.coins;
      else if (r.kind === 'spins') {
        if (!s.gacha) s.gacha = { owned: [], spins: 0 };
        s.gacha.freeSpins = (s.gacha.freeSpins || 0) + r.spins;
      } else if (r.kind === 'look') {
        s.shop.owned.push(r.piece + ':' + r.style);
      }
    }
  }

  // Try a code.
  //   s: the save   rec: the per-device record   now: the real clock (ms)
  //   persist(): saves both and returns true, or false when the browser has no room; if it fails
  //   nothing is paid and the code is not used up.
  // Returns { ok:true, rewards } or { ok:false, why, ... }.
  function redeem(s, rec, input, now, persist, codes) {
    const list = codes || CODES;
    const norm = normalize(input);
    if (!norm) return { ok: false, why: 'empty' };

    if (rec.lockUntil && now >= rec.lockUntil) {
      rec.lockUntil = 0;
      rec.wrong = 0;
    }
    if (rec.lockUntil > now) return { ok: false, why: 'locked', until: rec.lockUntil };

    const h = hash(norm);
    const code = list.find((c) => c.h === h);
    if (!code) {
      rec.wrong += 1;
      const locked = rec.wrong >= MAX_WRONG;
      if (locked) rec.lockUntil = now + LOCK_MS;
      persist(true); // best effort: the count matters more than the reward
      return { ok: false, why: 'unknown', left: Math.max(0, MAX_WRONG - rec.wrong), locked, until: rec.lockUntil };
    }

    const today = dayKey(now);
    if (code.from && today < code.from) return { ok: false, why: 'early', from: code.from };
    if (code.to && today > code.to) return { ok: false, why: 'ended', to: code.to };
    if (rec.used[h]) return { ok: false, why: 'used', at: rec.used[h] };

    // Pay out and mark used in one step; undo both if the save fails.
    const rewards = plan(s, code);
    const before = JSON.stringify({ coins: s.coins, gacha: s.gacha, shop: s.shop });
    const recBefore = JSON.stringify(rec);
    apply(s, rewards);
    rec.used[h] = now;
    rec.wrong = 0;
    rec.lockUntil = 0;
    if (!persist(false)) {
      const b = JSON.parse(before);
      s.coins = b.coins;
      s.gacha = b.gacha;
      s.shop = b.shop;
      Object.assign(rec, JSON.parse(recBefore));
      return { ok: false, why: 'save' };
    }
    return { ok: true, rewards };
  }

  G.Promo = { CODES, MAX_WRONG, LOCK_MS, MAX_LEN, normalize, hash, blank, plan, redeem, dayKey };
})(globalThis.CatGame = globalThis.CatGame || {});
