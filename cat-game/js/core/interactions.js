// What happens when you do something. Each function updates the save and
// returns a "reaction" the screen layer acts out:
//   { say, eyes, mouth, sound, hearts, anim, toast, ok }
// Mostly things go up. Grabbing the tail or paws, or interrupting the
// litter box, makes the cat angry: a hiss, a small bond and happiness dip and
// a minute of sulking (see angry()). It never costs a bond level or an unlock.
(function (G) {
  'use strict';

  const R = G.Random;
  const clamp = (v, lo, hi) => G.Sim.clamp(v, lo, hi);

  function rngFor(s, t, tag) {
    return R.rng(R.hash(s.seed, tag, t, Math.random()));
  }

  function moodOf(s) {
    const { fullness, energy, happiness } = s.stats;
    if (fullness < 20) return 'hungry';
    if (happiness < 30) return 'grumpy';
    if (energy < 22) return 'sleepy';
    if (happiness > 75) return 'happy';
    return 'content';
  }

  const MOOD_LABEL = {
    hungry: 'Peckish & a bit grumpy',
    grumpy: 'A little grumpy',
    sleepy: 'Sleepy',
    happy: 'Very happy',
    content: 'Content',
  };

  function joy(s, n) {
    s.stats.happiness = clamp(s.stats.happiness + n, 12, 100);
  }

  function withBond(reaction, res) {
    if (res && res.levelUp) reaction.levelUp = res.levelUp;
    if (res && res.unlocked && res.unlocked.length) reaction.unlocked = res.unlocked;
    return reaction;
  }

  // ---- Feed -----------------------------------------------------------------

  function feed(s, t, foodId) {
    const food = G.Catalog.FOODS[foodId];
    if (!food || !G.Progression.isUnlocked(s, 'food:' + foodId)) return { ok: false, toast: 'Not unlocked yet.' };
    s.bowl = { food: foodId, portions: food.portions };
    G.Progression.bump(s, 'foods', foodId);
    G.State.log(s, { t, type: 'fed', food: foodId, live: true });
    const res = G.Progression.addBond(s, 2, t, 'feed');
    const full = s.stats.fullness;
    const asleep = G.Sim.isSleeping(s);
    const r = rngFor(s, t, 'feed');

    if (asleep && full >= 35) {
      return withBond({ ok: true, say: '…', anim: 'earTwitch', toast: '{name} twitched an ear at the sound of the bowl. Food can wait — naps first.' }, res);
    }
    if (full < 35) {
      G.Sim.setActivity(s, t, 'eat', 'bowl', { byYou: true });
      return withBond({ ok: true, say: R.pick(r, ['MRROW!', 'FOOD!', 'Mrrp mrrp!']), sound: 'meow', toast: '{name} rushed over and dove straight in!' }, res);
    }
    if (full < 75 || foodId !== 'kibble') {
      G.Sim.setActivity(s, t, 'eat', 'bowl', { byYou: true });
      return withBond({ ok: true, say: 'Mrrp?', toast: foodId === 'kibble' ? '{name} trotted over for a few bites.' : `{name} heard the ${food.name.toLowerCase()} and came running.` }, res);
    }
    return withBond({ ok: true, say: '*sniff*', toast: '{name} sniffed the bowl and walked away. They will eat it later.' }, res);
  }

  // ---- Treats ---------------------------------------------------------------

  function treat(s, t) {
    G.State.ensureDay(s, t);
    const r = rngFor(s, t, 'treat');
    s.daily.treats += 1;
    G.State.log(s, { t, type: 'treat', live: true });
    G.Sim.setActivity(s, t, 'beg', 'front');
    if (s.daily.treats > 5) {
      return { ok: true, say: '…', eyes: 'half', toast: '{name} ate it, then gave you a look that said "that\'s a lot of treats today".' };
    }
    joy(s, 6);
    s.stats.fullness = clamp(s.stats.fullness + 3);
    const res = G.Progression.addBond(s, 1, t, 'feed');
    return withBond({ ok: true, say: R.pick(r, ['Crunch crunch', 'Nom!', 'Mrrp ♥']), eyes: 'happy', sound: 'crunch', hearts: 2, toast: R.pick(r, ['{name} woke right up for that. Crunch crunch.', 'Treat accepted. {name} would like another.', '{name} did a happy little tail flick.']) }, res);
  }

  // ---- Petting --------------------------------------------------------------

  // An upset cat: angry face and hiss, a small dip in happiness and bond, then
  // it turns its back and sulks for a minute. `cost` is bond points lost.
  function angry(s, t, cause, cost, line, toast) {
    G.Progression.loseBond(s, cost);
    joy(s, -(cost * 2 + 1));
    G.State.log(s, { t, type: 'angry', cause, live: true });
    G.Sim.setActivity(s, t, 'sulk', 'wall', { facing: s.activity.facing });
    return { ok: true, say: line, eyes: 'angry', mouth: 'hiss', anim: 'swat', sound: 'hiss', toast, angry: true };
  }

  // zone: 'head' | 'chin' | 'ears' | 'back' | 'belly' | 'tail' | 'paws'
  function pet(s, t, zone, petsRecently) {
    const r = rngFor(s, t, 'pet');
    const a = s.activity;

    // Nobody wants an audience in the litter box.
    if (a.id === 'litter') {
      return { ok: true, say: 'HSS! Privacy!', eyes: 'angry', mouth: 'hiss', anim: 'swat', sound: 'hiss', toast: '{name} would like some privacy, please.', angry: true };
    }
    // Already sulking: a hiss, nothing worse.
    if (a.id === 'sulk') {
      joy(s, -1);
      return { ok: true, say: r() < 0.5 ? 'HSS!' : 'Hmph.', eyes: 'angry', mouth: 'hiss', anim: 'swat', sound: 'hiss', toast: '{name} is still sulking. Give them a minute.', angry: true };
    }

    if (G.Sim.isSleeping(s)) {
      if (zone === 'tail' || zone === 'paws') {
        return angry(s, t, 'woken', 2, 'HSSS!', '{name} was fast asleep and did NOT appreciate that.');
      }
      if (r() < 0.65) {
        joy(s, 2);
        const res = G.Progression.addBond(s, 1, t, 'pet');
        G.State.log(s, { t, type: 'pet', zone, live: true });
        return withBond({ ok: true, say: 'prrr…', sound: 'purr', hearts: 1, toast: '{name} purred in their sleep.' }, res);
      }
      const sp = G.Sim.spotInfo(s, a.spot);
      G.Sim.setActivity(s, t, sp && sp.tags.includes('loaf') ? 'loaf' : 'sit', sp ? a.spot : 'rug', { facing: a.facing });
      return { ok: true, say: 'Mrrp…?', eyes: 'half', toast: '{name} slowly woke up and blinked at you.' };
    }

    // Tail: the classic. Cats that really trust you sometimes let it go.
    if (zone === 'tail') {
      if (G.Progression.level(s) >= 6 && r() < 0.3) {
        return { ok: true, say: 'Mrrow.', eyes: 'half', anim: 'tailFlick', toast: '{name} flicked their tail out of your hand. A warning, this time.' };
      }
      return angry(s, t, 'tail', 2, 'HSSS!', R.pick(r, ['You touched the tail. {name} hissed and stormed off.', '{name} whipped round and hissed. Not the tail!']));
    }

    // Paws: half the time just a quick pull away, half the time a warning swat.
    if (zone === 'paws') {
      if (r() < 0.5) {
        return { ok: true, say: 'Mrp!', eyes: 'wide', anim: 'recoil', toast: '{name} pulled their paw away. Not a paw person.' };
      }
      return angry(s, t, 'paws', 1, 'Hsst!', '{name} did not like that. A warning swat, then a sulk.');
    }

    if (s.stats.fullness < 20 && r() < 0.5) {
      joy(s, -1);
      return { ok: true, say: 'Mrrrow.', eyes: 'angry', mouth: 'frown', anim: 'tailFlick', toast: '{name} flicked their tail. Food first, then cuddles.' };
    }

    // Over-stimulated: lots of pets in a short time can end in a swat.
    if (petsRecently > 9 && r() < 0.45) {
      G.Sim.setActivity(s, t, 'groom', 'floorL');
      return { ok: true, say: 'HSS!', eyes: 'angry', mouth: 'hiss', anim: 'swat', sound: 'hiss', angry: true, toast: '{name} decided that was enough petting and went to groom elsewhere.' };
    }

    G.Progression.bump(s, 'pets', zone);
    G.Progression.bump(s, 'spots', a.key, 0.3);
    G.State.log(s, { t, type: 'pet', zone, live: true });

    if (zone === 'ears') {
      joy(s, 3);
      const res = G.Progression.addBond(s, 1, t, 'pet');
      return withBond({ ok: true, say: 'prrr', eyes: 'closed', sound: 'purr', hearts: 1, anim: 'earTwitch', toast: R.pick(r, ['An ear scratch! {name} leaned right into your fingers.', '{name} closed their eyes and flicked an ear. More, please.']) }, res);
    }
    if (zone === 'belly') {
      if (r() < 0.35 + G.Progression.level(s) * 0.02) {
        joy(s, 5);
        const res = G.Progression.addBond(s, 3, t, 'pet');
        return withBond({ ok: true, say: 'prrrrr ♥', eyes: 'happy', sound: 'purr', hearts: 3, toast: 'Belly rubs allowed! {name} must really trust you.' }, res);
      }
      G.State.log(s, { t, type: 'trap', live: true });
      return { ok: true, say: 'MRAH!', eyes: 'angry', mouth: 'hiss', anim: 'kick', sound: 'hiss', toast: 'IT WAS A TRAP. {name} grabbed your hand and bunny-kicked it.' };
    }
    if (zone === 'chin') {
      joy(s, 4);
      const res = G.Progression.addBond(s, 1, t, 'pet');
      return withBond({ ok: true, say: 'prrrrrr', eyes: 'closed', sound: 'purr', hearts: 2, anim: 'chinUp', toast: R.pick(r, ['Chin scratches! {name} tilted their head up for more.', '{name} purred like a tiny motorbike.']) }, res);
    }
    if (zone === 'head') {
      joy(s, 3);
      const res = G.Progression.addBond(s, 1, t, 'pet');
      return withBond({ ok: true, say: R.pick(r, ['prrr', 'mrrp ♥', 'prrrr']), eyes: 'happy', sound: 'purr', hearts: 1, anim: 'headbutt', toast: R.pick(r, ['{name} pushed their head into your hand.', '{name} slow-blinked at you. That means "I love you" in cat.']) }, res);
    }
    joy(s, 2);
    const res = G.Progression.addBond(s, 1, t, 'pet');
    return withBond({ ok: true, say: 'prrr', eyes: 'happy', sound: 'purr', hearts: 1, anim: 'buttUp', toast: '{name} arched their back into the pets.' }, res);
  }

  // ---- Litter box -----------------------------------------------------------

  // Scoop the box (and mop up any accident).
  function scoop(s, t) {
    const L = s.room.litter;
    if (!L.clumps.length && !L.mess) return { ok: true, say: '', toast: 'The litter box is already spotless.', sound: 'pop' };
    const wasDirty = G.Sim.isDirty(s);
    L.clumps = [];
    L.mess = 0;
    G.State.log(s, { t, type: 'scoop', live: true });
    let res = null;
    if (wasDirty) {
      joy(s, 4);
      res = G.Progression.addBond(s, 1, t, 'care');
    }
    return withBond({ ok: true, say: '', sound: 'scoop', hearts: wasDirty ? 1 : 0, toast: wasDirty ? '{name} approves of the fresh litter. Much better.' : 'Scooped. Fresh and tidy.' }, res);
  }

  // ---- Play -----------------------------------------------------------------

  // Returns whether the cat joins in.
  function startPlay(s, t, toyId) {
    if (!G.Progression.isUnlocked(s, 'toy:' + toyId)) return { ok: false, toast: 'Not unlocked yet.' };
    const r = rngFor(s, t, 'play');
    const ph = G.Clock.phaseAt(t);
    if (G.Sim.isSleeping(s) && !(ph === 'evening' && r() < 0.5)) {
      return { ok: true, joined: false, eyes: 'half', toast: '{name} opened one eye, looked at the toy, and closed it again. Maybe wiggle it a bit more…' };
    }
    if (s.stats.energy < 12) {
      return { ok: true, joined: false, toast: '{name} watched the toy, but is too sleepy to chase it.' };
    }
    G.Sim.setActivity(s, t, 'play', 'rug');
    return { ok: true, joined: true, eyes: 'wide', say: '!', toast: ph === 'evening' ? 'Evening hunting mode: ON.' : '{name} spotted the toy!' };
  }

  // A sleeping cat may wake up if you keep wiggling the toy.
  function tempt(s, t) {
    const r = rngFor(s, t, 'tempt');
    if (s.stats.energy < 12 || r() > 0.12) return false;
    G.Sim.setActivity(s, t, 'play', 'rug');
    return true;
  }

  function pounce(s, t, toyId, caught) {
    s.stats.energy = clamp(s.stats.energy - 2);
    joy(s, caught ? 3 : 1.5);
    const res = G.Progression.addBond(s, caught ? 1 : 0.5, t, 'play');
    return withBond({ ok: true }, res);
  }

  function endPlay(s, t, toyId, stats) {
    if (stats.pounces > 0) {
      G.Progression.bump(s, 'toys', toyId, 1 + stats.catches);
      G.State.log(s, { t, type: 'played', toy: toyId, catches: stats.catches, pounces: stats.pounces, live: true });
    }
    if (s.activity.id === 'play') G.Sim.setActivity(s, t, s.stats.energy < 25 ? 'loaf' : 'groom', 'rug');
    const tired = s.stats.energy < 25;
    return { ok: true, toast: stats.pounces === 0 ? '' : tired ? '{name} flopped over, completely worn out. Good hunt!' : '{name} sat down and started grooming like nothing happened.' };
  }

  // ---- Call by name -----------------------------------------------------------

  function call(s, t) {
    const r = rngFor(s, t, 'call');
    const lv = G.Progression.level(s);
    const asleep = G.Sim.isSleeping(s);
    let result;
    if (asleep) result = r() < 0.15 ? 'blink' : 'ear';
    else {
      const x = r();
      const come = 0.22 + lv * 0.05 + (s.stats.happiness - 50) / 250;
      if (x < come) result = 'come';
      else if (x < come + 0.2) result = 'blink';
      else if (x < come + 0.42) result = 'meowBack';
      else result = 'ignore';
    }
    G.State.log(s, { t, type: 'called', result, live: true });
    switch (result) {
      case 'come': {
        G.Sim.setActivity(s, t, 'come', 'front');
        const res = G.Progression.addBond(s, 1, t, 'pet');
        return withBond({ ok: true, say: 'Mrrp!', sound: 'meow', hearts: 1, toast: '{name} came trotting over!' }, res);
      }
      case 'blink':
        return { ok: true, eyes: 'happy', anim: 'slowBlink', toast: '{name} looked at you and did a slow blink. (Cat for "I heard you, I love you, I am not getting up".)' };
      case 'meowBack':
        return { ok: true, say: 'Mrow?', sound: 'meow', toast: '{name} meowed back… but stayed exactly where they were.' };
      case 'ear':
        return { ok: true, anim: 'earTwitch', toast: 'One ear swivelled toward you. The rest of {name} kept sleeping.' };
      default:
        return { ok: true, toast: R.pick(r, ['{name} heard you. {name} has chosen to ignore you.', 'Nothing. Not even an ear. Very cat.', '{name} looked the other way on purpose.']) };
    }
  }

  // ---- Naming -----------------------------------------------------------------

  function validateName(raw) {
    const name = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!name) return { ok: false, error: 'Your cat needs a name!' };
    if ([...name].length > 20) return { ok: false, error: 'Keep it to 20 characters or less.' };
    return { ok: true, name };
  }

  function rename(s, t, raw) {
    const v = validateName(raw);
    if (!v.ok) return v;
    const old = s.cat.name;
    s.named = true;
    if (v.name === old) return { ok: true, same: true };
    s.cat.name = v.name;
    s.cat.nameHistory.push({ name: v.name, from: t });
    G.State.log(s, { t, type: 'rename', from: old, to: v.name, live: true });
    const r = rngFor(s, t, 'rename');
    const x = r();
    if (x < 0.4) return { ok: true, anim: 'tilt', say: '?', toast: `{name} tilted their head. "${v.name}?"` };
    if (x < 0.75) return { ok: true, eyes: 'happy', anim: 'slowBlink', toast: '{name} gave you a slow blink. The new name is approved.' };
    return { ok: true, toast: '{name} ignored you completely. They will answer to whatever they want anyway.' };
  }

  // ---- Little bits ------------------------------------------------------------

  function pickUpCup(s) {
    if (!s.room.cupOnFloor) return null;
    s.room.cupOnFloor = false;
    return { ok: true, toast: 'You put the cup back on the table. {name} watched. {name} will remember where it is.' };
  }

  function collectGift(s, t, index) {
    const g = s.room.gifts[index];
    if (!g) return null;
    s.room.gifts.splice(index, 1);
    s.treasures[g.id] = (s.treasures[g.id] || 0) + 1;
    const info = G.Catalog.GIFTS[g.id];
    const res = G.Progression.addBond(s, info.rarity === 'legendary' ? 10 : info.rarity === 'rare' ? 4 : 2, t);
    G.State.log(s, { t, type: 'collected', item: g.id, live: true });
    const tag = info.rarity === 'common' ? '' : info.rarity === 'rare' ? ' ✨ Rare!' : ' 🌟 Super rare!';
    return withBond({ ok: true, rarity: info.rarity, toast: `You got ${info.name} from {name}.${tag} Added to your treasures.` }, res);
  }

  G.Interactions = { moodOf, MOOD_LABEL, feed, treat, pet, scoop, startPlay, tempt, pounce, endPlay, call, validateName, rename, pickUpCup, collectGift };
})(globalThis.CatGame = globalThis.CatGame || {});
