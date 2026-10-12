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
      room: { slots: ['scratcher', null, 'box'], perch: false, cupOnFloor: false, gifts: [], litter: { clumps: [], mess: 0 } },
      unlocked: C.unlocksAt(1),
      unseenUnlocks: [],
      favorites: { spots: {}, toys: {}, foods: {}, pets: {} },
      flags: { breakfastDay: null, bondDay: today, litterTip: false, bowlTip: false, inviteTip: false },
      log: [],
      journal: [],
      treasures: {},
      settings: { muted: false, timeOffset: 0, seasonPreview: null, lights: 'on', lightsAt: 0 },
    };
  }

  // Fill in anything an older save is missing.
  function migrate(s) {
    if (!s || typeof s !== 'object') return null;
    const fresh = createState(s.createdAt || Date.now(), (s.cat && s.cat.name) || G.Profile.defaultName);
    for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
    for (const k of ['stats', 'room', 'favorites', 'flags', 'settings', 'daily', 'bowl']) {
      for (const kk of Object.keys(fresh[k])) if (s[k][kk] === undefined) s[k][kk] = fresh[k][kk];
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
  }

  G.State = { VERSION, createState, migrate, ensureDay, nameAt, log };
})(globalThis.CatGame = globalThis.CatGame || {});
