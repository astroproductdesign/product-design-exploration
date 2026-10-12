// The cat's brain: picks what to do next based on the time of day, mood and
// needs, and plays time forward — live while you watch, or in one go when
// you come back (offline catch-up). Pure logic: no drawing in here.
(function (G) {
  'use strict';

  const { MIN, DAY } = G.Clock;
  const R = G.Random;
  const HOUR_MS = 60 * 60 * 1000;

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
    supervise: { need: (s) => s.settings.tv !== 'off', tags: ['tv'], w: { dawn: 0.2, morning: 0.8, afternoon: 0.8, evening: 1.4, night: 0.3 }, dur: [10, 30], live: [40, 90] },
    gift: { tags: ['front'], w: { dawn: 0.25, morning: 0.12, afternoon: 0.1, evening: 0.2, night: 0.2 }, dur: [2, 3], live: [10, 14], need: (s) => s.room.gifts.length < 3 },
    meow: { tags: ['front'], w: { dawn: 0.6, morning: 0.4, afternoon: 0.3, evening: 0.6, night: 0.4 }, dur: [1, 3], live: [6, 10] },
    sit: { tags: ['sit'], w: { dawn: 0.8, morning: 1, afternoon: 1, evening: 1, night: 0.6 }, dur: [5, 20], live: [20, 50] },
    toy: { tags: ['toy'], w: { dawn: 0.5, morning: 0.6, afternoon: 0.6, evening: 2, night: 0.8 }, dur: [5, 15], live: [20, 40], active: true, joy: 0.08 },
    scratch: { tags: ['scratch'], w: { dawn: 0.8, morning: 0.7, afternoon: 0.5, evening: 0.9, night: 0.3 }, dur: [3, 8], live: [10, 20], joy: 0.03 },
    // Nibbles the cat grass on the windowsill (only while there is some left to eat).
    grass: { need: (s) => s.room.grass >= GRASS_MIN, tags: ['grass'], w: { dawn: 0.5, morning: 1.2, afternoon: 0.8, evening: 0.7, night: 0.1 }, dur: [2, 5], live: [16, 26], joy: 0.05 },
    // Need-driven (picked by rules, not by weight).
    eat: { tags: ['bowl'], dur: [4, 8], live: [14, 20] },
    askFood: { tags: ['bowl'], dur: [10, 30], live: [30, 60] },
    // Started by you.
    come: { tags: ['front'], dur: [1, 2], live: [25, 40] },
    beg: { tags: ['front'], dur: [1, 2], live: [10, 16] },
    play: { tags: ['floor'], dur: [5, 10], live: [600, 600], active: true },
    // Needs the litter box when the need builds up (see chooseNext), or after an upset.
    litter: { tags: ['litter'], dur: [2, 4], live: [14, 14] },
    sulk: { tags: ['wall'], dur: [1, 1], live: [60, 60] },
    // Sometimes the grass comes back up a little while after eating it (see chooseNext).
    vomit: { tags: ['floor'], dur: [1, 2], live: [10, 14] },
  };

  // Cat grass: eating it takes some, and it grows back over a few hours. About two in five times
  // the cat is sick on the floor a little later, and that stays until you clean it up.
  const GRASS_MIN = 0.3;
  const GRASS_EATEN = 0.3;
  const GRASS_REGROW = 0.0015; // per minute
  const VOMIT_CHANCE = 0.4;
  const MAX_VOMIT = 2;

  // How full the box can get before the cat stops using it properly.
  const DIRTY_AT = 5;
  const MAX_CLUMPS = 6;
  const MAX_MESS = 2;
  const isDirty = (s) => s.room.litter.clumps.length >= DIRTY_AT || s.room.litter.mess > 0;

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
    litter: '{name} is using the litter box. Give them some privacy.',
    sulk: '{name} is sulking with their back to you.',
    grass: '{name} is nibbling the cat grass.',
    vomit: 'Uh oh. {name} is making worrying noises…',
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
      case 'litter':
        return 'squat';
      case 'sulk':
        return 'back';
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
      case 'grass':
      case 'vomit':
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
    // Too much grass, and it comes back up: on the rug or the floor, where it stays until cleaned.
    if (s.flags.vomitAt && t >= s.flags.vomitAt) {
      s.flags.vomitAt = 0;
      if (s.room.vomit.length < MAX_VOMIT) {
        const pickId = R.pick(r, ['rug', 'floorL', 'floorR']);
        const where = spots.find((sp) => sp.id === pickId);
        return make(s, t, 'vomit', where, r, live);
      }
    }
    // Nature calls. A dirty box puts the cat off: sometimes it goes beside the box instead.
    // It also goes soon after a meal or a treat (litterAt is set when it eats).
    const urge = !!s.flags.litterAt && t >= s.flags.litterAt;
    if (urge) s.flags.litterAt = 0;
    if ((urge && st.litter >= 15) || (st.litter >= 55 && r() < Math.min(0.9, 0.35 + (st.litter - 55) / 55))) {
      const kind = r() < 0.6 ? 'pee' : 'poop';
      const accident = isDirty(s) && s.room.litter.mess < MAX_MESS && r() < 0.3;
      const where = spots.find((sp) => sp.id === (accident ? 'litterOut' : 'litter'));
      return make(s, t, 'litter', where, r, live, { kind, accident });
    }

    let entries = [];
    for (const [id, b] of Object.entries(BEHAVIORS)) {
      if (!b.w) continue;
      let w = b.w[ph];
      if (!w) continue;
      if (b.need && !b.need(s)) continue;
      if (!spots.some((sp) => b.tags.some((tag) => sp.tags.includes(tag)))) continue;
      if (b.sleep) w *= st.energy < 35 ? 2.2 : st.energy > 85 ? 0.35 : 1;
      if (b.active) w *= Math.max(0.15, st.energy / 60);
      // Lights off: cosy, so more napping and less racing about.
      if (s.settings.lights === 'off') w *= b.sleep ? 2.2 : b.active ? 0.6 : 1;
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


  // What the cat would do at one particular spot right now (when you tap an item to invite it
  // over). Weighted by the time of day and how it feels, like chooseNext, but only for what
  // that spot is good for. Returns a behaviour id, or null if nothing fits right now.
  function behaviorAt(s, t, spotId, prefer) {
    const spot = spotInfo(s, spotId);
    if (!spot) return null;
    const r = R.rng(R.hash(s.seed, 'at', t, spotId));
    const ph = G.Clock.phaseAt(t);
    const st = s.stats;
    const entries = [];
    for (const [id, b] of Object.entries(BEHAVIORS)) {
      if (!b.w || b.w[ph] === 0) continue;
      if (!b.tags.some((tag) => spot.tags.includes(tag))) continue;
      if (b.need && !b.need(s)) continue;
      let w = Math.max(b.w[ph], 0.3);
      if (b.sleep) w *= st.energy < 35 ? 2.2 : st.energy > 85 ? 0.35 : 1;
      if (b.active) w *= Math.max(0.15, st.energy / 60);
      if (s.settings.lights === 'off') w *= b.sleep ? 2.2 : b.active ? 0.6 : 1;
      w *= quirkMul('behaviors', id);
      entries.push([id, w]);
    }
    if (prefer && entries.some(([id]) => id === prefer)) return prefer;
    return R.weighted(r, entries) || null;
  }

  // What the cat would rather be doing right now (for a thought bubble when it says no).
  // Works on a throwaway copy so asking never changes the real cat.
  function wouldRather(s, t) {
    const copy = Object.assign({}, s, { flags: Object.assign({}, s.flags) });
    return chooseNext(copy, t, true).id;
  }

  // Lights left off through the night come back on at dawn by themselves, and the cat slept
  // well. Called wherever time moves on (live and while you're away).
  function autoDawn(s, t) {
    if (s.settings.lights !== 'off') return false;
    const d = new Date(t);
    d.setHours(7, 0, 0, 0);
    const dawn = d.getTime();
    const since = s.settings.lightsAt || 0;
    if (t < dawn || since > dawn - HOUR_MS) return false;
    const rested = t - since >= 6 * HOUR_MS;
    s.settings.lights = 'on';
    if (rested) {
      s.stats.energy = clamp(s.stats.energy + 8);
      s.stats.happiness = clamp(s.stats.happiness + 3, 12, 100);
    }
    G.State.log(s, { t, type: 'dawnLights', rested });
    return true;
  }

  // ---- Playing time forward -------------------------------------------------

  // Energy points gained (or lost) per minute for an activity.
  function energyRate(s, a, live) {
    const b = BEHAVIORS[a.id] || {};
    let d = b.sleep ? 0.5 : b.drowsy ? 0.14 : b.active ? -0.25 : -0.07;
    if (live && b.sleep) d = 2.4;
    else if (live && b.drowsy) d = 0.7;
    if (d > 0 && s.settings.lights === 'off') d *= 1.3;
    return d;
  }

  function drift(s, a, mins, live) {
    if (mins <= 0) return;
    const st = s.stats;
    const b = BEHAVIORS[a.id] || {};
    st.fullness = clamp(st.fullness - (b.sleep ? 0.045 : 0.07) * mins);
    // Rest recovers energy quickly. While you're watching, naps are short, so they recover much
    // faster per minute (a few minutes of sleep is a visible boost). Dark and cosy helps a little.
    st.energy = clamp(st.energy + energyRate(s, a, live) * mins);
    // Happiness eases back toward a calm middle. Hungry = a little grumpy,
    // never miserable.
    // A dirty litter box makes a cat a bit grumpy too.
    const baseline = st.fullness < 20 ? 28 : isDirty(s) || s.room.vomit.length ? 40 : 50;
    st.litter = clamp(st.litter + 0.4 * mins);
    s.room.grass = Math.min(1, s.room.grass + GRASS_REGROW * mins);
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
          st.litter = clamp(st.litter + 14);
          // Soon after a meal it needs the toilet: about half a minute when you're watching, up to an hour and a half away.
          const rr = R.rng(R.hash(s.seed, 'poo', a.end));
          s.flags.litterAt = a.end + (a.live ? R.between(rr, 20, 50) * 1000 : R.between(rr, 20, 90) * MIN);
          st.happiness = clamp(st.happiness + f.joy, 12, 100);
          G.State.log(s, Object.assign(base, { food: s.bowl.food, byYou: !!a.byYou, yell: !!a.yell }));
        }
        break;
      }
      case 'litter': {
        const L = s.room.litter;
        if (a.accident) L.mess = Math.min(MAX_MESS, L.mess + 1);
        else L.clumps.push(a.kind);
        if (L.clumps.length > MAX_CLUMPS) L.clumps.length = MAX_CLUMPS;
        st.litter = 4;
        st.happiness = clamp(st.happiness + 2, 12, 100);
        G.State.log(s, Object.assign(base, { kind: a.kind, accident: !!a.accident }));
        break;
      }
      case 'grass': {
        s.room.grass = Math.max(0, s.room.grass - GRASS_EATEN);
        st.fullness = clamp(st.fullness + 3);
        st.happiness = clamp(st.happiness + 2, 12, 100);
        // Maybe it comes back up in a little while: half a minute when you're watching, up to an hour away.
        const rr = R.rng(R.hash(s.seed, 'vomit', a.end));
        const sick = rr() < VOMIT_CHANCE && s.room.vomit.length < MAX_VOMIT;
        if (sick) s.flags.vomitAt = a.end + (a.live ? R.between(rr, 25, 60) * 1000 : R.between(rr, 10, 60) * MIN);
        G.State.log(s, base);
        break;
      }
      case 'vomit': {
        const rr = R.rng(R.hash(s.seed, 'puddle', a.end));
        if (s.room.vomit.length < MAX_VOMIT) s.room.vomit.push({ spot: a.spot, dx: Math.round(R.between(rr, -22, 22)) });
        G.State.log(s, base);
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
        drift(s, a, (segEnd - s.lastSimAt) / MIN, live);
        s.lastSimAt = segEnd;
      }
      if (a.end > to) break;
      complete(s, a);
      G.Progression.passiveDay(s, a.end);
      autoDawn(s, a.end);
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

  G.Sim = { BEHAVIORS, MAX_VOMIT, GRASS_MIN, isDirty, spotsOf, spotInfo, chooseNext, behaviorAt, wouldRather, autoDawn, advance, clampToLive, setActivity, isSleeping, describe, drift, energyRate, clamp };
})(globalThis.CatGame = globalThis.CatGame || {});
