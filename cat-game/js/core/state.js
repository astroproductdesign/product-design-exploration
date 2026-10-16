// The save file: one plain object, so it can live in localStorage today and
// in an app's storage later without changes.
(function (G) {
  'use strict';

  const VERSION = 1;

  function createState(t, name) {
    const C = G.Catalog;
    const today = G.Clock.dayKey(t);
    return {
      version: VERSION,
      seed: (Math.random() * 4294967296) >>> 0,
      createdAt: t,
      lastSimAt: t, // game time the simulation has reached
      lastSeenAt: t, // last time you were looking at the game
      lastVisitDay: today,
      named: false,
      cat: { name, nameHistory: [{ name, from: t }], coat: Object.assign({}, G.Coats.DEFAULT), accessory: Object.assign({}, G.Coats.DEFAULT_ACCESSORY), tail: G.Coats.tailFor(G.Coats.DEFAULT) },
      stats: { fullness: 75, energy: 70, happiness: 65, bond: 0, litter: 40 }, // litter: how badly the cat needs the toilet (0-100)
      activity: { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t, end: t + 20000, facing: 1 },
      bowl: { food: 'kibble', portions: 2 },
      daily: { day: today, pet: 0, play: 0, feed: 0, treats: 0, care: 0, invite: 0 },
      room: { slots: ['scratcher', null, null, 'box'], perch: false, cupOnFloor: false, gifts: [], litter: { clumps: [], mess: 0 }, grass: 1, vomit: [], skins: {} },
      unlocked: C.unlocksAt(1),
      unseenUnlocks: [],
      favorites: { spots: {}, toys: {}, foods: {}, pets: {} },
      flags: { breakfastDay: null, bondDay: today, litterTip: false, bowlTip: false, inviteTip: false, litterAt: 0, noteSeen: null, vomitAt: 0, vomitTip: false, streak: 0, bestStreak: 0, learned: {}, skinsSeen: 0, updatesSeen: 0 },
      log: [],
      journal: [],
      notes: [],
      counts: {}, // how many times things have happened (see achievements.js)
      coins: 5, // cat coins for the gachapon (enough for one spin to start with)
      gacha: { owned: [], spins: 0 },
      shop: { owned: [], using: {} }, // furniture looks bought with coins (see shop.js)
      checkin: { stamps: [], last: '', cards: 0, total: 0 }, // the daily check-in stamp card (see progression.js)
      achievements: {}, // id -> when it was unlocked
      achQueue: [], // unlocked but not yet announced
      achClaimed: {}, // id -> when the reward was collected (unlocked ones not in here are waiting)
      treasures: {},
      settings: { muted: false, timeOffset: 0, seasonPreview: null, lights: 'on', lightsAt: 0, tv: 'on', weather: { place: null, asked: false, preview: null, last: null } },
    };
  }

  // Fill in anything an older save is missing.
  function migrate(s) {
    if (!s || typeof s !== 'object') return null;
    const fresh = createState(s.createdAt || Date.now(), (s.cat && s.cat.name) || G.Profile.defaultName);
    // Before rewards had to be claimed they were paid on unlock, so everything already announced is claimed.
    if (s.achClaimed === undefined && s.achievements) {
      const waiting = new Set(s.achQueue || []);
      s.achClaimed = {};
      for (const [id, at] of Object.entries(s.achievements)) if (!waiting.has(id)) s.achClaimed[id] = at;
    }
    for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
    for (const k of ['stats', 'room', 'favorites', 'flags', 'settings', 'daily', 'bowl']) {
      for (const kk of Object.keys(fresh[k])) if (s[k][kk] === undefined) s[k][kk] = fresh[k][kk];
    }
    // Older saves had three spots; the new one is second from the left, so the others move up one.
    if (Array.isArray(s.room.slots) && s.room.slots.length === 3) {
      s.room.slots.splice(1, 0, null);
      const m = s.activity && /^slot(\d)$/.exec(s.activity.spot || '');
      if (m && Number(m[1]) >= 1) s.activity.spot = 'slot' + (Number(m[1]) + 1);
    }
    // Toys added since the save was made are there for anyone whose bond is already high enough.
    if (G.Progression && G.Catalog) {
      const lv = G.Progression.level(s);
      for (const [id, t] of Object.entries(G.Catalog.TOYS)) {
        const key = 'toy:' + id;
        if (t.level <= lv && !s.unlocked.includes(key)) {
          s.unlocked.push(key);
          if (!s.unseenUnlocks.includes(key)) s.unseenUnlocks.push(key);
        }
      }
    }
    s.cat.coat = G.Coats.normalize(s.cat.coat);
    s.cat.accessory = G.Coats.normalizeAccessory(s.cat.accessory);
    s.cat.tail = G.Coats.normalizeTail(s.cat.tail, s.cat.coat); // old saves get their breed's usual tail
    s.version = VERSION;
    return s;
  }

  // Resets the per-day counters (treat limit, daily bond caps).
  function ensureDay(s, t) {
    const k = G.Clock.dayKey(t);
    if (s.daily.day !== k) s.daily = { day: k, pet: 0, play: 0, feed: 0, treats: 0, care: 0, invite: 0 };
  }

  function nameAt(s, t) {
    let name = s.cat.nameHistory[0].name;
    for (const h of s.cat.nameHistory) if (h.from <= t) name = h.name;
    return name;
  }

  function log(s, entry) {
    s.log.push(entry);
    if (s.log.length > 900) s.log.splice(0, s.log.length - 900);
    if (G.Achievements) G.Achievements.onEvent(s, entry);
  }

  G.State = { VERSION, createState, migrate, ensureDay, nameAt, log };
})(globalThis.CatGame = globalThis.CatGame || {});
