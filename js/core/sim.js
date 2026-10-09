// The cat's brain: picks what to do next based on the time of day, mood and
// needs, and plays time forward — live while you watch, or in one go when
// you come back (offline catch-up). Pure logic: no drawing in here.
(function (G) {
  'use strict';

  const { MIN, DAY } = G.Clock;
  const R = G.Random;

  // w: how likely at each time of day. dur: minutes when you're away.
  // live: seconds when you're watching (so the cat feels busy on screen).
  const BEHAVIORS = {
    nap: { tags: ['nap'], w: { dawn: 0.3, morning: 1.4, afternoon: 5, evening: 0.9, night: 7 }, dur: [45, 150], live: [150, 360], sleep: true },
    loaf: { tags: ['loaf'], w: { dawn: 0.6, morning: 1.6, afternoon: 2, evening: 1.2, night: 1.2 }, dur: [20, 60], live: [60, 150], drowsy: true },
    groom: { tags: ['groom'], w: { dawn: 1, morning: 2.5, afternoon: 1.2, evening: 1.2, night: 0.4 }, dur: [8, 20], live: [25, 60] },
    stretch: { tags: ['floor'], w: { dawn: 1.5, morning: 1, afternoon: 0.8, evening: 0.8, night: 0.2 }, dur: [1, 3], live: [6, 9] },
    sunbathe: { tags: ['sun'], w: { dawn: 0, morning: 3.5, afternoon: 1.2, evening: 0, night: 0 }, dur: [30, 90], live: [90, 200], drowsy: true, joy: 0.04 },
    birds: { tags: ['watch'], w: { dawn: 1, morning: 2.2, afternoon: 1.5, evening: 1, night: 0 }, dur: [10, 40], live: [40, 100], joy: 0.03 },
    knock: { tags: ['knock'], w: { dawn: 0.6, morning: 0.4, afternoon: 0.3, evening: 0.8, night: 0.7 }, dur: [2, 4], live: [7, 10] },
    hide: { tags: ['hide'], w: { dawn: 0.4, morning: 1, afternoon: 1.6, evening: 1.2, night: 0.8 }, dur: [20, 60], live: [60, 150], joy: 0.03 },
    hunt: { tags: ['floor'], w: { dawn: 0.8, morning: 0.4, afternoon: 0.3, evening: 2.6, night: 1 }, dur: [3, 10], live: [12, 25], active: true },
    zoomies: { tags: ['floor'], w: { dawn: 2.4, morning: 0.2, afternoon: 0.1, evening: 1.4, night: 0.6 }, dur: [2, 5], live: [8, 14], active: true },
    stare: { tags: ['wall'], w: { dawn: 0.3, morning: 0.4, afternoon: 0.5, evening: 0.6, night: 0.8 }, dur: [5, 15], live: [20, 45] },
    knead: { tags: ['knead'], w: { dawn: 0.3, morning: 0.6, afternoon: 0.8, evening: 1, night: 0.6 }, dur: [5, 12], live: [20, 40], joy: 0.04 },
    roll: { tags: ['roll'], w: { dawn: 0.3, morning: 1, afternoon: 1, evening: 1.4, night: 0.2 }, dur: [3, 8], live: [14, 28], joy: 0.04 },
    laptop: { tags: ['laptop'], w: { dawn: 0.2, morning: 1, afternoon: 1, evening: 1.2, night: 0.3 }, dur: [15, 40], live: [40, 100], drowsy: true },
    supervise: { tags: ['tv'], w: { dawn: 0.2, morning: 0.8, afternoon: 0.8, evening: 1.4, night: 0.3 }, dur: [10, 30], live: [40, 90] },
    gift: { tags: ['front'], w: { dawn: 0.25, morning: 0.12, afternoon: 0.1, evening: 0.2, night: 0.2 }, dur: [2, 3], live: [10, 14], need: (s) => s.room.gifts.length < 3 },
    meow: { tags: ['front'], w: { dawn: 0.6, morning: 0.4, afternoon: 0.3, evening: 0.6, night: 0.4 }, dur: [1, 3], live: [6, 10] },
    sit: { tags: ['sit'], w: { dawn: 0.8, morning: 1, afternoon: 1, evening: 1, night: 0.6 }, dur: [5, 20], live: [20, 50] },
    toy: { tags: ['toy'], w: { dawn: 0.5, morning: 0.6, afternoon: 0.6, evening: 2, night: 0.8 }, dur: [5, 15], live: [20, 40], active: true, joy: 0.08 },
    scratch: { tags: ['scratch'], w: { dawn: 0.8, morning: 0.7, afternoon: 0.5, evening: 0.9, night: 0.3 }, dur: [3, 8], live: [10, 20], joy: 0.03 },
    // Need-driven (picked by rules, not by weight).
    eat: { tags: ['bowl'], dur: [4, 8], live: [14, 20] },
    askFood: { tags: ['bowl'], dur: [10, 30], live: [30, 60] },
    // Started by you.
    come: { tags: ['front'], dur: [1, 2], live: [25, 40] },
    beg: { tags: ['front'], dur: [1, 2], live: [10, 16] },
    play: { tags: ['floor'], dur: [5, 10], live: [600, 600], active: true },
  };

  // At ~3am, chaos.
  const CHAOS = { zoomies: 6, hunt: 3, knock: 3, meow: 2, stare: 2, nap: 0.5 };

  const STATUS = {
    nap: '{name} is napping {at}.',
    loaf: '{name} is loafing {at}.',
    groom: '{name} is having a very thorough wash.',
    stretch: '{name} is doing a big stretch.',
    sunbathe: '{name} is sunbathing {at}.',
    birds: '{name} is watching birds. Chatter chatter.',
    knock: '{name} is eyeing the cup on the table…',
    hide: '{name} is sitting {at}. If it fits, it sits.',
    hunt: '{name} is hunting something invisible.',
    zoomies: 'ZOOMIES! {name} is racing around the room.',
    stare: '{name} is staring at the wall. What is there?',
    knead: '{name} is kneading {at}. Making biscuits.',
    roll: '{name} is rolling around {at}.',
    laptop: '{name} is sitting on your laptop. Work is cancelled.',
    supervise: '{name} is supervising the TV.',
    gift: '{name} is bringing you something…',
    meow: '{name} has something to say.',
    sit: '{name} is sitting {at}, thinking cat thoughts.',
    toy: '{name} is playing {at}.',
    scratch: '{name} is scratching {at}. Very satisfying.',
    eat: '{name} is eating. Crunch crunch.',
    askFood: '{name} is waiting by the bowl, very politely (loudly).',
    come: '{name} came when you called!',
    beg: '{name} is hoping for another treat.',
    play: '{name} is in hunting mode!',
  };

  function clamp(v, lo, hi) {
    return Math.max(lo === undefined ? 0 : lo, Math.min(hi === undefined ? 100 : hi, v));
  }

  // ---- Spots ----------------------------------------------------------------

  function spotsOf(s) {
    const out = [];
    for (const [id, sp] of Object.entries(G.Catalog.SPOTS)) {
      let tags = sp.tags;
      if (id === 'sill' && s.room.perch) tags = tags.concat('nap');
      if (id === 'table' && s.room.cupOnFloor) tags = tags.filter((t) => t !== 'knock');
      out.push({ id, key: id, label: sp.label, at: sp.at, tags });
    }
    s.room.slots.forEach((item, i) => {
      const it = item && G.Catalog.ITEMS[item];
      if (it) out.push({ id: 'slot' + i, key: item, item, label: it.label, at: it.at, tags: it.tags });
    });
    return out;
  }

  function spotInfo(s, id) {
    return spotsOf(s).find((sp) => sp.id === id) || null;
  }

  function quirkMul(kind, key) {
    let m = 1;
    for (const q of G.Profile.quirks) if (q.on && q[kind] && q[kind][key]) m *= q[kind][key];
    return m;
  }

  function hasQuirk(prop) {
    return G.Profile.quirks.some((q) => q.on && q[prop]);
  }

  // ---- Picking --------------------------------------------------------------

  function poseFor(id, spot, r, extra) {
    if (extra && extra.rare === 'bellyNap') return 'belly';
    switch (id) {
      case 'nap':
        return ['chair', 'rug', 'cushion'].includes(spot.key) && r() < 0.5 ? 'lie' : 'curl';
      case 'loaf':
      case 'laptop':
      case 'hide':
      case 'knead':
        return 'loaf';
      case 'groom':
        return 'groom';
      case 'stretch':
      case 'scratch':
        return 'stretch';
      case 'sunbathe':
        return spot.key === 'sill' ? 'loaf' : 'lie';
      case 'birds':
      case 'stare':
        return 'back';
      case 'hunt':
      case 'eat':
      case 'toy':
      case 'play':
        return 'crouch';
      case 'zoomies':
        return 'walk';
      case 'roll':
        return 'belly';
      case 'knock':
        return 'swipe';
      default:
        return 'sit';
    }
  }

  function make(s, t, id, spot, r, live, extra) {
    const b = BEHAVIORS[id];
    const range = live ? b.live : b.dur;
    const ms = R.between(r, range[0], range[1]) * (live ? 1000 : MIN);
    return Object.assign(
      {
        id,
        spot: spot.id,
        key: spot.key,
        pose: poseFor(id, spot, r, extra),
        start: t,
        end: t + Math.max(4000, Math.round(ms)),
        facing: r() < 0.5 ? -1 : 1,
        live: !!live,
      },
      extra || {}
    );
  }

  function pickGift(s, r) {
    const lv = G.Progression.level(s);
    const x = r();
    const rarity = x < 0.01 + lv * 0.004 ? 'legendary' : x < 0.13 + lv * 0.02 ? 'rare' : 'common';
    const pool = Object.keys(G.Catalog.GIFTS).filter((k) => G.Catalog.GIFTS[k].rarity === rarity);
    return R.pick(r, pool);
  }

  function chooseNext(s, t, live) {
    const r = R.rng(R.hash(s.seed, t));
    const ph = G.Clock.phaseAt(t);
    const chaos = G.Clock.isChaosHour(t);
    const st = s.stats;
    const spots = spotsOf(s);
    const bowl = spots.find((sp) => sp.id === 'bowl');

    // Needs come first.
    if (st.fullness < 50 && s.bowl.portions > 0 && r() < 0.85) return make(s, t, 'eat', bowl, r, live);
    const today = G.Clock.dayKey(t);
    if (ph === 'dawn' && hasQuirk('breakfastAlarm') && st.fullness < 80 && s.flags.breakfastDay !== today) {
      s.flags.breakfastDay = today;
      return make(s, t, s.bowl.portions > 0 ? 'eat' : 'askFood', bowl, r, live, { yell: true });
    }
    if (st.fullness < 22 && r() < 0.45) return make(s, t, 'askFood', bowl, r, live);

    let entries = [];
    for (const [id, b] of Object.entries(BEHAVIORS)) {
      if (!b.w) continue;
      let w = b.w[ph];
      if (!w) continue;
      if (b.need && !b.need(s)) continue;
      if (!spots.some((sp) => b.tags.some((tag) => sp.tags.includes(tag)))) continue;
      if (b.sleep) w *= st.energy < 35 ? 2.2 : st.energy > 85 ? 0.35 : 1;
      if (b.active) w *= Math.max(0.15, st.energy / 60);
      if (b.sleep && live && ph !== 'night') w *= 0.55;
      if (chaos && CHAOS[id]) w *= CHAOS[id];
      if (st.fullness < 20 && (id === 'stare' || id === 'meow')) w *= 2;
      if (st.happiness > 75 && (id === 'roll' || id === 'knead')) w *= 1.6;
      w *= quirkMul('behaviors', id);
      entries.push([id, w]);
    }
    if (st.energy < 15) {
      const sleepy = entries.filter(([id]) => BEHAVIORS[id].sleep || BEHAVIORS[id].drowsy);
      if (sleepy.length) entries = sleepy;
    }
    const id = R.weighted(r, entries) || 'sit';
    const b = BEHAVIORS[id];

    const favSpot = G.Progression.favorite(s, 'spots');
    const favToy = G.Progression.favorite(s, 'toys');
    const cands = spots.filter((sp) => b.tags.some((tag) => sp.tags.includes(tag)));
    const spot = R.weighted(
      r,
      cands.map((sp) => {
        let w = quirkMul('spots', sp.key);
        if (sp.key === favSpot) w *= 1.6;
        if (sp.key === favToy) w *= 1.6;
        if (sp.item) w *= 1.3; // new things are interesting
        return [sp, w];
      })
    );

    const extra = {};
    if (id === 'nap' && ['rug', 'chair', 'cushion'].includes(spot.key) && r() < 0.05) extra.rare = 'bellyNap';
    if (id === 'gift') extra.gift = pickGift(s, r);
    if (chaos) extra.chaos = true;
    return make(s, t, id, spot, r, live, extra);
  }

  // ---- Playing time forward -------------------------------------------------

  function drift(s, a, mins) {
    if (mins <= 0) return;
    const st = s.stats;
    const b = BEHAVIORS[a.id] || {};
    st.fullness = clamp(st.fullness - (b.sleep ? 0.045 : 0.07) * mins);
    const dEnergy = b.sleep ? 0.35 : b.drowsy ? 0.08 : b.active ? -0.25 : -0.07;
    st.energy = clamp(st.energy + dEnergy * mins);
    // Happiness eases back toward a calm middle. Hungry = a little grumpy,
    // never miserable.
    const baseline = st.fullness < 20 ? 28 : 50;
    st.happiness += (b.joy || 0) * mins;
    st.happiness = baseline + (st.happiness - baseline) * Math.exp(-0.0012 * mins);
    st.happiness = clamp(st.happiness, 12, 100);
  }

  function begin(s, a) {
    if (a.id === 'knock') s.room.cupOnFloor = true;
  }

  function complete(s, a) {
    const st = s.stats;
    const mins = Math.round(((a.end - a.start) / MIN) * 10) / 10;
    const base = { t: a.start, type: a.id, spot: a.key, mins, live: !!a.live };
    if (a.chaos) base.chaos = true;
    switch (a.id) {
      case 'eat': {
        if (s.bowl.portions > 0) {
          const f = G.Catalog.FOODS[s.bowl.food];
          s.bowl.portions -= 1;
          st.fullness = clamp(st.fullness + f.fill);
          st.happiness = clamp(st.happiness + f.joy, 12, 100);
          G.State.log(s, Object.assign(base, { food: s.bowl.food, byYou: !!a.byYou, yell: !!a.yell }));
        }
        break;
      }
      case 'gift':
        if (s.room.gifts.length < 3) s.room.gifts.push({ id: a.gift, t: a.end });
        G.State.log(s, Object.assign(base, { item: a.gift }));
        break;
      case 'nap':
        G.Progression.bump(s, 'spots', a.key, mins / 45);
        G.State.log(s, Object.assign(base, a.rare ? { rare: a.rare } : {}));
        break;
      case 'askFood':
        G.State.log(s, Object.assign(base, { yell: !!a.yell }));
        break;
      case 'play':
        break; // logged by the play session itself
      default:
        G.State.log(s, base);
    }
  }

  // Run the simulation from where it left off up to time `to`.
  function advance(s, to, opts) {
    const live = !!(opts && opts.live);
    if (!(to > s.lastSimAt)) return;
    // Very long absences: skip the oldest part (stats just settle).
    const MAXGAP = 10 * DAY;
    if (to - s.lastSimAt > MAXGAP) {
      const skipTo = to - MAXGAP;
      drift(s, { id: 'loaf' }, (skipTo - s.lastSimAt) / MIN);
      s.lastSimAt = skipTo;
      s.activity = chooseNext(s, skipTo, false);
    }
    let guard = 0;
    while (guard++ < 50000) {
      const a = s.activity;
      const segEnd = Math.min(a.end, to);
      if (segEnd > s.lastSimAt) {
        drift(s, a, (segEnd - s.lastSimAt) / MIN);
        s.lastSimAt = segEnd;
      }
      if (a.end > to) break;
      complete(s, a);
      G.Progression.passiveDay(s, a.end);
      const next = chooseNext(s, a.end, live);
      begin(s, next);
      s.activity = next;
    }
    s.lastSimAt = Math.max(s.lastSimAt, to);
  }

  // After a catch-up, the current activity may have hours left (a long nap).
  // While you're watching, trim it so the cat stays lively.
  function clampToLive(s, t) {
    const a = s.activity;
    const b = BEHAVIORS[a.id];
    if (!b || !b.live) return;
    if (a.end - t > b.live[1] * 1000) {
      const r = R.rng(R.hash(s.seed, 'clamp', t));
      a.end = t + Math.round(R.between(r, b.live[0], b.live[1]) * 1000);
      a.live = true;
    }
  }

  // Start an activity right now (used by interactions).
  function setActivity(s, t, id, spotId, extra) {
    const sp = spotInfo(s, spotId) || spotInfo(s, 'rug');
    const r = R.rng(R.hash(s.seed, 'set', t, id));
    const a = make(s, t, id, sp, r, true, extra);
    if (extra && extra.facing) a.facing = extra.facing;
    begin(s, a);
    s.activity = a;
    return a;
  }

  function isSleeping(s) {
    const b = BEHAVIORS[s.activity.id];
    return !!(b && b.sleep);
  }

  function describe(s) {
    const a = s.activity;
    const sp = spotInfo(s, a.spot);
    const at = sp ? sp.at : 'on the floor';
    if (a.rare === 'bellyNap') return '✨ {name} is sleeping belly-up with a tiny tongue out. Rare!';
    if (a.id === 'askFood' && a.yell) return '{name} is announcing that it is BREAKFAST TIME.';
    return (STATUS[a.id] || '{name} is being a cat.').replace('{at}', at);
  }

  G.Sim = { BEHAVIORS, spotsOf, spotInfo, chooseNext, advance, clampToLive, setActivity, isSleeping, describe, drift, clamp };
})(globalThis.CatGame = globalThis.CatGame || {});
