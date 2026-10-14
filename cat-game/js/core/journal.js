// The cat's diary (written in the cat's voice) and the "while you were away"
// summary. Both are built from the event log.
(function (G) {
  'use strict';

  const R = G.Random;
  const MIN = G.Clock.MIN;

  function spotAt(key) {
    const C = G.Catalog;
    const sp = C.SPOTS[key] || C.ITEMS[key];
    return sp ? sp.at : 'somewhere cosy';
  }

  function tally(events) {
    const c = {
      napMins: 0, napSpots: {}, ateBowl: 0, fed: [], treats: 0, pets: {}, trap: 0, played: [], knock: 0,
      gifts: [], birds: 0, zoomies: 0, chaosZoomies: 0, stare: 0, yell: 0, askFood: 0, renames: [], rare: 0,
      levelups: 0, came: 0, ignored: 0, hide: {}, laptop: 0, sunbathe: 0, supervise: 0, groom: 0, hunt: 0,
      knead: 0, roll: 0, toy: 0, scratch: 0, litter: 0, accidents: 0, scoops: 0, angry: {}, invited: 0, snubbed: 0, lightsOff: 0, lightsOn: 0, darkNight: 0, grass: 0, vomit: 0, cleaned: 0, curtain: 0, pounce: 0, topple: 0, drink: 0,
    };
    for (const e of events) {
      switch (e.type) {
        case 'nap':
          c.napMins += e.mins || 0;
          c.napSpots[e.spot] = (c.napSpots[e.spot] || 0) + (e.mins || 0);
          if (e.rare) c.rare++;
          break;
        case 'eat':
          if (!e.byYou) c.ateBowl++;
          if (e.yell) c.yell++;
          break;
        case 'askFood':
          c.askFood++;
          if (e.yell) c.yell++;
          break;
        case 'fed': c.fed.push(e.food); break;
        case 'treat': c.treats++; break;
        case 'pet': c.pets[e.zone] = (c.pets[e.zone] || 0) + 1; break;
        case 'trap': c.trap++; break;
        case 'played': c.played.push(e); break;
        case 'knock': c.knock++; break;
        case 'gift': c.gifts.push(e.item); break;
        case 'birds': c.birds++; break;
        case 'zoomies': if (e.chaos) c.chaosZoomies++; else c.zoomies++; break;
        case 'stare': c.stare++; break;
        case 'rename': c.renames.push(e); break;
        case 'levelup': c.levelups++; break;
        case 'called': if (e.result === 'come') c.came++; else c.ignored++; break;
        case 'hide': c.hide[e.spot] = (c.hide[e.spot] || 0) + 1; break;
        case 'laptop': c.laptop++; break;
        case 'sunbathe': c.sunbathe++; break;
        case 'supervise': c.supervise++; break;
        case 'groom': c.groom++; break;
        case 'hunt': c.hunt++; break;
        case 'knead': c.knead++; break;
        case 'roll': c.roll++; break;
        case 'toy': c.toy++; break;
        case 'scratch': c.scratch++; break;
        case 'litter': if (e.accident) c.accidents++; else c.litter++; break;
        case 'scoop': c.scoops++; break;
        case 'grass': c.grass++; break;
        case 'vomit': c.vomit++; break;
        case 'curtain': c.curtain++; break;
        case 'pounce': c.pounce++; break;
        case 'topple': c.topple++; break;
        case 'drink': c.drink++; break;
        case 'cleaned': c.cleaned++; break;
        case 'invited': if (e.result === 'accepted') c.invited++; else if (e.result === 'declined') c.snubbed++; break;
        case 'dawnLights': if (e.rested) c.darkNight++; break;
        case 'lights': if (e.off) c.lightsOff++; else c.lightsOn++; break;
        case 'angry': c.angry[e.cause] = (c.angry[e.cause] || 0) + 1; break;
        default:
      }
    }
    return c;
  }

  function top(map) {
    let best = null;
    let n = -1;
    for (const [k, v] of Object.entries(map)) if (v > n) { best = k; n = v; }
    return best;
  }

  function hours(mins) {
    return G.Clock.formatDuration(mins * MIN);
  }

  // ---- Diary ------------------------------------------------------------------

  const OPEN = [
    'Dear diary,',
    'Diary. It is me again.',
    'Important cat business to report today.',
    'Another day of being extremely cute.',
    'Dear diary, the human was here. So was I. Mostly asleep.',
  ];
  const CLOSE = ['Purrs, {name}', '— {name} (the cat)', 'Love, {name} 🐾', 'Signed with one paw, {name}'];

  function diaryLines(events, r) {
    const c = tally(events);
    const L = [];
    const add = (p, text) => L.push([p, text]);
    const pk = (arr) => R.pick(r, arr);

    if (c.rare) add(10, 'Today I slept belly-up with my tongue out. Very dignified. Do not tell anyone.');
    for (const e of c.renames) add(9, `The human started calling me "${e.to}". I will think about it.`);
    if (c.gifts.length) {
      const g = G.Catalog.GIFTS[c.gifts[0]];
      add(8, c.gifts.length > 1 ? `I brought the human ${c.gifts.length} presents. Including ${g.name}. You're welcome.` : `I brought the human ${g.name}. They did not say thank you properly.`);
    }
    if (c.levelups) add(8, 'I think I like the human a little more now. Do not tell them.');
    if (c.trap) add(7, 'The human touched the belly. It was a trap. I won.');
    if (c.angry.tail) add(8, 'The human touched my tail. We do not speak of it.');
    if (c.angry.paws) add(6, 'The human grabbed my paw. I have noted it in my files.');
    if (c.angry.woken) add(6, 'I was asleep. The human poked a sensitive area. I remember.');
    if (c.accidents) add(7, 'The litter box was not up to standard, so I made a statement next to it.');
    if (c.scoops) add(5, 'The human scooped my litter box. About time.');
    if (c.vomit) add(7, pk(['I ate the grass from the windowsill. Then I gave it back. On the floor. Art.', 'The windowsill grass and I had a disagreement. It lost. Then I did.']));
    else if (c.grass) add(4, pk(['I ate some of the grass on the windowsill. It is called cat grass. It is MY grass.', 'The green stuff on the windowsill is delicious. I will say no more.']));
    if (c.cleaned) add(6, 'The human cleaned up my masterpiece. Rude, but appreciated.');
    if (c.curtain) add(7, pk(['I got bored, so I climbed the curtains. They are still up. I am a little disappointed.', 'Curtain climbing: 10 out of 10, would do it again. Do not look at the bottom edge.']));
    if (c.topple) add(7, pk(['I leaned out to see the bird. The windowsill ended. I meant to do that.', 'I was NOT on the windowsill when it happened. Nobody saw anything.']));
    if (c.pounce) add(6, pk(['I spotted a moth. I wiggled. I pounced. I missed by a mile. The moth knows what it did.', 'The wiggle was perfect. The pounce was perfect. The moth was not there. Typical.']));
    if (c.drink) add(5, pk(['I put my paw in the water bowl. The water was wet. I am filing a complaint.', 'I tested the water with my paw. It is, in fact, wet. Nobody warned me.']));
    if (c.invited) add(5, 'The human kept pointing at things. One of them was a good idea. I decided it was mine.');
    if (c.snubbed) add(4, 'The human pointed at furniture. I looked at it. I stayed exactly where I was.');
    if (c.darkNight) add(6, 'The lights stayed off all night. Best sleep of my whole life. Please do this more.');
    if (c.lightsOff) add(5, 'The human turned the lights off. Finally, some respect for the dark.');
    if (c.lightsOn) add(3, 'The lights came back on. My eyes. My poor eyes.');
    if (c.knock) add(7, pk(['There was a cup on the table. Then there was not. I do not know what happened.', 'Gravity check: the cup still falls. Science.']));
    if (c.chaosZoomies) add(7, 'At 3am I ran across the entire house. For reasons.');
    if (c.yell) add(6, 'Woke up early and announced breakfast. Loudly. Someone has to.');
    if (c.played.length) {
      const catches = c.played.reduce((n, e) => n + (e.catches || 0), 0);
      const toy = G.Catalog.TOYS[c.played[0].toy];
      add(6, catches ? `Hunted the ${toy.name.toLowerCase()}. Caught it ${catches} time${catches === 1 ? '' : 's'}. I am a fierce predator.` : `Chased the ${toy.name.toLowerCase()}. It cheated.`);
    }
    if (c.fed.length) {
      const f = c.fed[c.fed.length - 1];
      const name = G.Catalog.FOODS[f].name.toLowerCase();
      add(6, f === 'kibble' ? `The human gave me ${name}. Acceptable.` : `The human gave me ${name}. I have forgiven them for everything.`);
    }
    const petTotal = Object.values(c.pets).reduce((a, b) => a + b, 0);
    if (petTotal) {
      const z = top(c.pets);
      const what = { chin: 'chin scratches', head: 'head pats', back: 'back pets', belly: 'belly rubs', ears: 'ear scratches' }[z] || 'pets';
      add(5, `The human did ${what}. I allowed it ${petTotal} time${petTotal === 1 ? '' : 's'}.`);
    }
    if (c.treats) add(5, `Treats today: ${c.treats}. Not enough. Never enough.`);
    if (c.napMins >= 30) add(5, `Napped for ${hours(c.napMins)} in total. Mostly ${spotAt(top(c.napSpots))}. Ten out of ten.`);
    if (c.birds) add(4, pk(['Birds outside the window again. One day, bird. One day.', 'Chattered at a bird. It did not come inside. Rude.']));
    if (c.stare) add(4, 'Stared at the wall for a while. Something was there. Trust me.');
    if (c.came) add(3, 'The human called my name. I came. Do not get used to it.');
    else if (c.ignored) add(3, 'The human called my name. I was busy.');
    const hid = top(c.hide);
    if (hid) add(3, `Sat ${spotAt(hid)} for a long time. If it fits, I sits.`);
    if (c.laptop) add(3, 'Sat on the warm laptop. The human needed a break anyway.');
    if (c.sunbathe) add(3, 'Found a sunbeam. Became a puddle.');
    if (c.supervise) add(2, 'Supervised the TV. Not enough birds on it.');
    if (c.ateBowl) add(2, `Visited the food bowl ${c.ateBowl} time${c.ateBowl === 1 ? '' : 's'}. Nobody saw. I am a mystery.`);
    if (c.zoomies) add(2, 'Did zoomies. Felt great.');
    if (c.knead) add(2, 'Made biscuits. Nobody can eat them. That is not the point.');
    if (c.litter) add(1, c.litter > 3 ? 'Used the litter box several times. Private business. Do not look.' : 'Used the litter box. Private business. Do not look.');
    if (c.groom) add(1, 'Washed every single paw. Twice.');
    if (c.askFood && !c.yell) add(1, 'Waited by the bowl. Patiently. Mostly.');

    L.sort((a, b) => b[0] - a[0]);
    const out = L.slice(0, 6).map(([, t]) => t);
    if (!out.length) out.push('Quiet day. Napped. Thought about birds.');
    return out;
  }

  function buildEntry(s, day, events) {
    const r = R.rng(R.hash(s.seed, 'diary', day));
    return {
      day,
      name: G.State.nameAt(s, G.Clock.endOfDayKey(day)),
      open: R.pick(r, OPEN),
      lines: diaryLines(events, r),
      close: R.pick(r, CLOSE),
    };
  }

  // The first day still in 'this week': today and the six days before it.
  const WEEK_DAYS = 7;
  function weekStart(t) {
    return G.Clock.dayKey(t - (WEEK_DAYS - 1) * G.Clock.DAY);
  }

  // Keep (or let go of) one finished day's page. Today's page is still being written, so it can't be saved yet.
  function toggleSave(s, day) {
    const e = s.journal.find((x) => x.day === day);
    if (!e) return false;
    e.saved = !e.saved;
    return e.saved;
  }

  // Write entries for finished days, then trim old log entries.
  function finalize(s, t) {
    const today = G.Clock.dayKey(t);
    const byDay = {};
    for (const e of s.log) {
      const d = G.Clock.dayKey(e.t);
      if (d < today) (byDay[d] = byDay[d] || []).push(e);
    }
    const written = new Set(s.journal.map((j) => j.day));
    for (const d of Object.keys(byDay).sort()) {
      if (!written.has(d)) s.journal.push(buildEntry(s, d, byDay[d]));
    }
    s.journal.sort((a, b) => (a.day < b.day ? -1 : 1));
    // The diary keeps the last week; older pages are tucked away unless you saved them.
    const from = weekStart(t);
    s.journal = s.journal.filter((e) => e.saved || e.day >= from);
    // Keep 3 days of raw events (enough for any summary), drop the rest.
    const cutoff = t - 3 * G.Clock.DAY;
    s.log = s.log.filter((e) => e.t >= cutoff);
  }

  function todayEntry(s, t) {
    const day = G.Clock.dayKey(t);
    const events = s.log.filter((e) => G.Clock.dayKey(e.t) === day);
    const e = buildEntry(s, day, events);
    e.name = s.cat.name;
    e.today = true;
    return e;
  }

  // ---- While you were away ------------------------------------------------------

  // Lines use {name}, filled in with the current name when shown.
  function awaySummary(s, from, to) {
    const events = s.log.filter((e) => e.t >= from && e.t < to && !e.live);
    if (!events.length) return null;
    const c = tally(events);
    const L = [];
    const add = (p, icon, text) => L.push([p, icon, text]);

    if (c.rare) add(10, '✨', 'slept belly-up with a tiny tongue out (rare!)');
    for (const g of c.gifts) add(9, '🎁', `brought you a gift: ${G.Catalog.GIFTS[g].name}`);
    if (c.knock) add(8, '☕', c.knock > 1 ? `knocked the cup off the table (${c.knock} times?!)` : 'knocked a cup off the table');
    if (c.chaosZoomies) add(8, '💨', 'had the 3am zoomies');
    if (c.napMins >= 20) add(7, '😴', `napped for ${hours(c.napMins)}, mostly ${spotAt(top(c.napSpots))}`);
    if (c.yell) add(7, '📣', 'yelled for breakfast at dawn');
    if (c.ateBowl) add(6, '🍽️', `ate from the bowl ${c.ateBowl === 1 ? 'once' : c.ateBowl + ' times'}`);
    if (c.birds) add(6, '🐦', 'stared at a bird out the window');
    if (c.stare) add(5, '🧱', 'stared at the wall for no clear reason');
    if (c.hunt) add(5, '👀', 'chased something invisible');
    if (c.curtain) add(6, '🧗', 'climbed the curtains out of boredom');
    if (c.topple) add(6, '🐦', 'fell off the windowsill (and meant to)');
    if (c.pounce) add(5, '🦋', 'wiggled, pounced and missed');
    if (c.drink) add(4, '💧', 'dipped a paw in the water bowl');
    const hid = top(c.hide);
    if (hid) add(5, '📦', `sat ${spotAt(hid)}`);
    if (c.laptop) add(5, '💻', 'sat on your laptop');
    if (c.sunbathe) add(4, '☀️', 'sunbathed by the window');
    if (c.zoomies) add(4, '💨', 'did a few zoomies');
    if (c.askFood && !c.yell) add(4, '🥣', 'waited by the empty bowl for a bit');
    if (c.supervise) add(3, '📺', 'supervised the TV');
    if (c.knead) add(3, '🍞', 'made biscuits');
    if (c.roll) add(3, '🙃', 'rolled around on the rug');
    if (c.toy) add(3, '🧶', 'played with a toy by themselves');
    if (c.scratch) add(2, '🪵', 'sharpened their claws');
    if (c.groom) add(2, '🛁', 'had a good long wash');
    if (c.levelups) add(9, '💛', 'grew a little fonder of you');
    if (c.accidents) add(8, '💧', 'had an accident next to the litter box');
    if (c.vomit) add(7, '🤢', 'was sick after eating cat grass');
    else if (c.grass) add(3, '🌱', 'nibbled the cat grass');
    if (s.room.vomit.length) add(7, '🧽', 'left a puddle that needs cleaning up');
    if (c.litter) add(2, '🧻', c.litter > 1 ? `used the litter box ${c.litter} times` : 'used the litter box');
    if (G.Sim.isDirty(s)) add(7, '🧹', 'left the litter box needing a scoop');

    L.sort((a, b) => b[0] - a[0]);
    return { duration: to - from, lines: L.slice(0, 7).map(([, icon, text]) => ({ icon, text })) };
  }

  G.Journal = { WEEK_DAYS, weekStart, toggleSave, finalize, todayEntry, awaySummary, tally };
})(globalThis.CatGame = globalThis.CatGame || {});
