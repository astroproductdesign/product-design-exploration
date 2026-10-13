// The note pinned to the wall: a new one every day, in the cat's voice. Some are facts about
// cats in general, some are about your own cat, and some are what the cat wants to tell you.
// A day's note is written the first time it's needed and kept, so it never changes under you
// and the earlier ones can be read again. No drawing here.
(function (G) {
  'use strict';

  const R = G.Random;
  const DAY = G.Clock.DAY;
  const KEEP = 60; // how many days of notes to remember

  // ---- Facts about cats in general ----------------------------------------------------------

  const FACTS = [
    "Cats sleep 12 to 16 hours a day, and kittens and older cats sleep even more. I'm not lazy, I'm in training.",
    "A cat's purr is a low rumble of roughly 25 to 150 vibrations a second. Cats purr when they're happy, but sometimes to calm themselves down too.",
    "Cats have a third eyelid in the inner corner of each eye. If it's showing a lot, it can mean a cat is sleepy or not feeling well.",
    "A cat's whiskers are about as wide as its body, so it can tell whether it will fit through a gap. Please never trim them.",
    "Each of a cat's ears has around 30 muscles and can swivel almost all the way round. I can hear the treat bag from the next room.",
    "Every cat's nose has its own pattern of bumps and ridges, a bit like a human fingerprint.",
    "Adult cats mostly meow at people, not at other cats. All my meows are for you.",
    'A slow blink from a cat is a friendly signal, a bit like a smile. Try blinking slowly at me and see what happens.',
    'Cats have an extra scent organ in the roof of the mouth. That open-mouthed, funny-looking sniff is called the flehmen response.',
    "Kneading is left over from kittenhood, when it helped the milk flow. When a cat kneads you, it's feeling very safe.",
    "A cat's tongue is covered in tiny backwards-pointing hooks. They work like a built-in comb, and they're why a lick feels like sandpaper.",
    "A cat can jump about five or six times its own height in a single leap.",
    "Cats can't taste sweetness, so your cake is safe from me. Your tuna is not.",
    'A group of cats is called a clowder, and a group of kittens is called a kindle.',
    "A cat has around 230 bones, which is more than a person's 206.",
    "A cat's collarbones aren't attached to the rest of its skeleton, which is part of why cats can squeeze through such small gaps.",
    'Cats need much less light than people do to see. Roughly six times less, so the dark is not very dark to me.',
    'Cat eyes glow in the dark because of a mirror-like layer at the back of the eye that bounces light around to help them see at night.',
    "A falling cat can twist in mid-air to land on its feet. It's called the righting reflex. I'd rather not test it.",
    "Cats are most active at dawn and dusk. That's the real reason I ask for breakfast so early.",
    "A cat's heart beats around 140 to 220 times a minute, about twice as fast as yours.",
    'Calico and tortoiseshell cats are almost always female, because of where their colour genes sit. Orange cats are more often male.',
    'A rough rule for cat years: the first year is about 15 human years, the second about 9 more, then roughly 4 for every year after that.',
    "Ancient Egyptians honoured cats, and even had a cat goddess called Bastet. I'm only claiming what's mine.",
    "A cat laps water by curling the tip of its tongue back and flicking it about four times a second, pulling up a tiny column of water.",
    "When a cat rubs its head on you, it leaves scent from glands on its cheeks and forehead. It's a way of saying 'this one is mine'.",
    'A cat holding its tail straight up is saying hello. A little curl at the tip makes it a friendly question mark.',
    "That chattering cats do at birds is a bit of a mystery. Scientists think it might be excitement, or frustration at not being able to pounce.",
    'Studies suggest many male cats favour their left paw, and many female cats their right.',
    'Cats usually have 18 toes: five on each front paw and four on each back paw.',
    "A cat's sense of smell is many times better than a person's, and it's one of the main ways cats decide who and what to trust.",
    "A hiss usually means 'back off, I'd rather not fight'. Most cats would much rather avoid an argument than start one.",
    'Cats can hear much higher notes than people can, up to around 64,000 Hz compared with a human\'s 20,000. Yes, I can hear that gadget whining.',
    "In bright light a cat's pupils shrink to thin slits, and in the dark they open wide. That's how they see so well at any time of day.",
    'In places like the UK and Japan, black cats are thought to bring good luck.',
    'Grooming is not only about being clean: licking spreads natural oils through the fur and helps a cat keep cool.',
    'Cats place their back paws almost exactly where their front paws just stepped, which keeps them quiet and steady on tricky ground.',
    "Cats sweat a little through their paw pads, so a nervous cat can leave damp paw prints.",
    'Domestic cats share about 95% of their genes with tigers. I am a very small tiger.',
  ];

  // ---- About your cat (only the ones the cat knows enough for) -------------------------------

  const PETS = { chin: 'chin scratches', head: 'head pats', back: 'back pets', belly: 'belly rubs', ears: 'ear scratches' };

  function facts(s, t) {
    const C = G.Catalog;
    const fav = (kind, f) => {
      const k = G.Progression.favorite(s, kind);
      return k ? f(k) : null;
    };
    const days = Math.max(1, Math.round((t - s.createdAt) / DAY));
    const bond = G.Progression.level(s);
    const treasures = Object.values(s.treasures || {}).reduce((a, b) => a + b, 0);
    return {
      days,
      bond,
      treasures,
      nap: fav('spots', (k) => (C.ITEMS[k] || C.SPOTS[k] || { label: k }).label),
      toy: fav('toys', (k) => (C.TOYS[k] || { name: null }).name),
      food: fav('foods', (k) => (C.FOODS[k] || { name: null }).name),
      pet: fav('pets', (k) => PETS[k] || null),
    };
  }

  const ABOUT_ME = [
    { text: 'Day {days} of living with you. Still the best human I have trained.' },
    { when: (f) => f.nap, text: 'My favourite place to nap is {nap}. Please do not rearrange it.' },
    { when: (f) => f.toy, text: 'My favourite toy is the {toy}. I pretend not to be interested until you leave the room.' },
    { when: (f) => f.food, text: 'If you asked me to pick a food, it would be {food}. Every time. Not that I am asking you for any.' },
    { when: (f) => f.pet, text: 'I like {pet} best. Yes, I keep track.' },
    { when: (f) => f.bond >= 2, text: "We're at bond level {bond}. I won't say I'm proud of us, but I'm not not proud." },
    { when: (f) => f.treasures > 0, text: 'I have brought you {treasures} gift{s} so far. You are welcome. Please act surprised.' },
    { text: 'I answer to {name}, but only when I feel like it.' },
    { text: 'I sleep for around fourteen hours a day. The other ten, I supervise you.' },
    { text: 'I have decided you may stay. Do not make it weird.' },
    { when: (f, s) => G.Profile.quirks.some((q) => q.on), text: 'From my file: "{quirk}" It is accurate, and I stand by it.' },
    { text: 'I have a very important schedule: nap, snack, window, nap. Please do not book anything over it.' },
    { text: "I'm told I'm fluffy. I prefer 'aerodynamic and well insulated'." },
    { text: 'I keep a list of everything I have knocked over. It is a long list. It is getting longer.' },
    { text: "I've been watching you. Mostly because you hold the treats." },
    { text: 'The experts would call me an indoor cat with outdoor opinions.' },
    { text: 'My favourite sound is the treat bag. My second favourite is you saying my name.' },
    { text: 'I am available for photos whenever I am in the mood. That is rarely.' },
    { when: (f) => f.bond >= 4, text: 'I used to be cautious around new things. With you, not so much.' },
  ];

  // ---- What the cat wants to tell you ---------------------------------------------------------

  // Tied to how things are right now; used first when one of them applies.
  const WISH_NEED = [
    { when: (s) => s.stats.fullness < 45 && s.bowl.portions === 0, text: "The bowl is empty. I'm not saying I'm starving. I'm saying look at the bowl." },
    { when: (s) => G.Sim.isDirty(s), text: 'A little hint: the litter box needs scooping. A cat has standards.' },
    { when: (s) => s.stats.energy < 30, text: 'I am very sleepy. I would like a nap, followed by a nap.' },
    { when: (s) => s.stats.happiness < 35, text: "I'd like a little attention today, please. Chin scratches are a good place to start." },
    { when: (s) => ['rain', 'storm'].includes(G.Weather.current(s)), text: "It's wet outside, so I'll be supervising the weather from the window." },
    { when: (s) => G.Weather.current(s) === 'storm', text: "Thunder is just the sky rearranging its furniture. I am fine. I am completely fine." },
    { when: (s) => G.Weather.current(s) === 'clear', text: 'The sun is out. I have booked the sunny patch for lunch.' },
    { when: (s) => G.Weather.current(s) === 'fog', text: "I can't see the neighbourhood birds in this fog. Rude." },
    { when: (s) => G.Weather.current(s) === 'snow', text: 'Snow! Out there! I will be admiring it from in here, thank you.' },
  ];

  const WISH = [
    "I would like the green chair. Yes, the one you're sitting in.",
    'Please open the window. Not to go out. Just so I have the option.',
    "A slow blink from you would make my day. I'll blink back. Probably.",
    "If you're not using that cardboard box, I will be.",
    'I did not knock that cup off the table on purpose. (I did.)',
    "Thank you for the pets. I won't say it twice.",
    'Tonight I may run laps of the living room at 3am. Nothing personal.',
    'I would like exactly one more treat. Maybe two. Let us not count.',
    'Please keep the sunny spot free around lunchtime. I have a meeting with it.',
    "You may sit down now. I'll be along in a moment to sit on you.",
    'Could the laptop please be less interesting than me, just for today?',
    "I'd be grateful if you were home a bit more. I'd never say it out loud, though.",
    'Please wake me for dinner, and not a minute before.',
    'Whoever puts the laser dot on the wall: I have questions, and I would like to be introduced.',
    'Could you say my name in the nice voice? Just once. For the record.',
    "Please don't close that door. In about four minutes I'll want to be on the other side of it.",
    "I'll be needing the window seat. The birds won't watch themselves.",
    'Today I would like to be brushed, then ignored, then brushed again.',
    "I'm available for lap duty after six.",
    'If you listen very carefully, you can hear me asking for dinner. I started an hour ago.',
    'Warm laundry, please. Fresh from the dryer, ideally with me already on it.',
    'I would like a new box. Not a new box. The same box, moved somewhere interesting.',
    "I'll pretend I didn't hear you the first time you called. It's called playing hard to get.",
  ];

  // ---- Picking a day's note --------------------------------------------------------------------

  function dayNumber(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / DAY);
  }

  // A fixed shuffle of 0..n-1 for this cat, so every item comes round once before any repeats.
  function shuffled(n, seed) {
    const r = R.rng(seed);
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const KINDS = ['fact', 'me', 'wish'];
  const HEAD = { fact: 'Did you know?', me: 'A little about me', wish: '{name} would like to say' };

  // `keepName` leaves {name} in the text: a stored note has to follow the cat when it is renamed.
  function fill(text, s, f, keepName) {
    const quirks = G.Profile.quirks.filter((q) => q.on);
    const quirk = quirks.length ? quirks[R.hash(s.seed, 'quirk', f.days) % quirks.length].text : '';
    const vars = { name: keepName ? '{name}' : s.cat.name, days: f.days, bond: f.bond, treasures: f.treasures, s: f.treasures === 1 ? '' : 's', nap: f.nap, toy: f.toy, food: f.food, pet: f.pet, quirk };
    return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));
  }

  function write(s, key, t) {
    const n = dayNumber(key);
    const kind = KINDS[(n + (R.hash(s.seed, 'notes') % KINDS.length)) % KINDS.length];
    const occ = Math.floor(n / KINDS.length); // how many times this kind has had a turn
    const f = facts(s, t);
    let text;
    if (kind === 'fact') {
      text = FACTS[shuffled(FACTS.length, R.hash(s.seed, 'facts'))[occ % FACTS.length]];
    } else if (kind === 'me') {
      const order = shuffled(ABOUT_ME.length, R.hash(s.seed, 'me'));
      for (let i = 0; i < order.length && !text; i++) {
        const e = ABOUT_ME[order[(occ + i) % order.length]];
        if (!e.when || e.when(f, s)) text = e.text;
      }
    } else {
      const now = WISH_NEED.filter((w) => w.when(s));
      if (now.length) text = now[R.hash(s.seed, 'wish', key) % now.length].text;
      else text = WISH[shuffled(WISH.length, R.hash(s.seed, 'wishes'))[occ % WISH.length]];
    }
    return { day: key, kind, tpl: true, head: fill(HEAD[kind], s, f, true), text: fill(text, s, f, true) };
  }

  // A note as it reads now: today's name for the cat, even if it was renamed after the note was
  // written. (Notes saved before this kept the old name written into them, so swap those back.)
  function view(s, n) {
    const name = s.cat.name;
    let { head, text } = n;
    if (n.tpl) {
      head = head.split('{name}').join(name);
      text = text.split('{name}').join(name);
    } else {
      for (const h of s.cat.nameHistory || []) {
        if (!h.name || h.name === name) continue;
        const re = new RegExp('(^|[^\\p{L}\\p{N}])' + h.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'gu');
        head = head.replace(re, (m, pre) => pre + name);
        text = text.replace(re, (m, pre) => pre + name);
      }
    }
    return { day: n.day, kind: n.kind, head, text };
  }

  // Today's note as stored (written now if it's the first time it's been asked for).
  function stored(s, t) {
    if (!Array.isArray(s.notes)) s.notes = [];
    const key = G.Clock.dayKey(t);
    let n = s.notes.find((x) => x.day === key);
    if (!n) {
      n = write(s, key, t);
      s.notes.push(n);
      s.notes.sort((a, b) => (a.day < b.day ? -1 : 1));
      if (s.notes.length > KEEP) s.notes.splice(0, s.notes.length - KEEP);
    }
    return n;
  }

  function today(s, t) {
    return view(s, stored(s, t));
  }

  // Past notes, newest first (not counting today's).
  function earlier(s, t, max) {
    const key = G.Clock.dayKey(t);
    return (s.notes || []).filter((x) => x.day < key).slice(-(max || 14)).reverse().map((n) => view(s, n));
  }

  // Reading today's note for the first time: marks it read and earns a bond point.
  function read(s, t) {
    const was = fresh(s, t);
    stored(s, t);
    s.flags.noteSeen = G.Clock.dayKey(t);
    return { fresh: was, res: was ? G.Progression.addBond(s, 1, t) : null };
  }

  // Unread until the player has opened today's note.
  function fresh(s, t) {
    return !s.flags || s.flags.noteSeen !== G.Clock.dayKey(t);
  }

  G.Notes = { FACTS, ABOUT_ME, WISH, WISH_NEED, KINDS, today, earlier, fresh, read, write };
})(globalThis.CatGame = globalThis.CatGame || {});
