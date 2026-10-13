// Achievements: a long list of very silly things to do. Everything the cat or the player does
// goes through State.log (see onEvent) or is counted by the screen layer (bump), so the list can
// be as random as we like without touching the actions themselves. No drawing here.
(function (G) {
  'use strict';

  const DAY = G.Clock.DAY;

  // key: the counter to read (state.counts[key]); calc: something worked out instead.
  // secret: shown as "???" until it's unlocked.
  const DEFS = [
    // ---- Housekeeping
    { id: 'scoop10', icon: '🧹', name: 'Poop Scooper Pro', desc: 'Scoop the litter box 10 times.', key: 'scoop', goal: 10 },
    { id: 'scoop50', icon: '🏅', name: 'Clump Whisperer', desc: 'Scoop the litter box 50 times. Nobody asked you to love it this much.', key: 'scoop', goal: 50 },
    { id: 'litterWatch', icon: '🚽', name: 'Bathroom Attendant', desc: 'Watch the cat use the litter box 20 times.', key: 'litterUse', goal: 20 },
    { id: 'accident', icon: '💧', name: 'Passive-Aggressive Pee', desc: 'Let the litter box get so bad the cat makes a statement next to it.', key: 'accident', goal: 1, secret: true },
    { id: 'clean3', icon: '🧽', name: 'Puddle Patrol', desc: 'Clean up after the cat grass comes back up 3 times.', key: 'clean', goal: 3 },
    { id: 'clean10', icon: '🪣', name: 'Mop Star', desc: 'Clean up 10 puddles. You were born for this.', key: 'clean', goal: 10 },
    { id: 'vomit3', icon: '🤢', name: 'Regurgitation Nation', desc: 'Watch the cat bring the grass back up 3 times.', key: 'vomit', goal: 3 },
    { id: 'grass5', icon: '🌱', name: 'Salad Bar Regular', desc: 'See the cat nibble the cat grass 5 times.', key: 'grass', goal: 5 },
    { id: 'cupBack5', icon: '🥛', name: 'Cup Custodian', desc: 'Put the cup back on the table 5 times. It will fall again.', key: 'cupBack', goal: 5 },
    { id: 'knock5', icon: '🌍', name: 'Gravity Is Real', desc: 'Watch the cat knock a cup off the table 5 times. Science.', key: 'knock', goal: 5 },

    // ---- Feeding
    { id: 'feed10', icon: '🥣', name: 'Bowl Filler', desc: 'Fill the food bowl 10 times.', key: 'feed', goal: 10 },
    { id: 'feed50', icon: '👨‍🍳', name: 'Michelin-Starred Kibble', desc: 'Fill the food bowl 50 times. The kibble has never looked so good.', key: 'feed', goal: 50 },
    { id: 'treat10', icon: '🍬', name: 'Treat Dealer', desc: 'Hand out 10 treats. The cat is keeping count.', key: 'treat', goal: 10 },
    { id: 'treat6', icon: '🍩', name: 'Bribery Is A Love Language', desc: 'Give 6 treats in one day. The cat gave you a look.', calc: (s) => s.daily.treats, goal: 6, secret: true },

    // ---- Pets, hisses and other relationship milestones
    { id: 'pet50', icon: '🤚', name: 'Fur Therapist', desc: 'Pet the cat 50 times.', key: 'pet', goal: 50 },
    { id: 'pet200', icon: '⚡', name: 'Static Electricity Champion', desc: 'Pet the cat 200 times. You are now 40% fur.', key: 'pet', goal: 200 },
    { id: 'ears10', icon: '👂', name: 'Ear Whisperer', desc: 'Scratch behind the ears 10 times.', key: 'ears', goal: 10 },
    { id: 'trap1', icon: '🪤', name: 'It Was A Trap', desc: 'Fall for the belly-rub trap.', key: 'trap', goal: 1 },
    { id: 'trap5', icon: '🤕', name: 'Slow Learner', desc: 'Fall for the belly-rub trap 5 times. It is always a trap.', key: 'trap', goal: 5 },
    { id: 'belly3', icon: '📜', name: 'Licensed To Rub', desc: 'Get 3 belly rubs the cat actually approves of.', calc: (s) => Math.max(0, count(s, 'bellyTry') - count(s, 'trap')), goal: 3 },
    { id: 'hiss5', icon: '😾', name: 'Hiss-terical', desc: 'Get hissed at 5 times.', key: 'hiss', goal: 5 },
    { id: 'tail1', icon: '🐍', name: 'Never Touch The Tail', desc: 'Touch the tail. We all have to learn.', key: 'tail', goal: 1, secret: true },
    { id: 'callCome5', icon: '📣', name: 'Pspspsps Champion', desc: 'Call the cat 5 times and have it actually come.', key: 'callCome', goal: 5 },
    { id: 'callIgnored5', icon: '🙄', name: 'Left On Read', desc: 'Be ignored by the cat when you call 5 times.', key: 'callIgnored', goal: 5 },
    { id: 'invite10', icon: '👉', name: 'Professional Pointer', desc: 'Point at furniture 10 times and say "go on, sit there".', key: 'invite', goal: 10 },
    { id: 'inviteNo5', icon: '💔', name: "It's Not You, It's The Bed", desc: 'Get turned down by the cat 5 times.', key: 'inviteNo', goal: 5 },
    { id: 'inviteYes10', icon: '🛏️', name: 'Interior Persuader', desc: 'Get the cat to say yes to an invite 10 times.', key: 'inviteYes', goal: 10 },
    { id: 'play5', icon: '🪶', name: 'Feather Duster', desc: 'Play with the toys 5 times.', key: 'play', goal: 5 },
    { id: 'rename3', icon: '🎭', name: 'Identity Crisis', desc: "Change the cat's name 3 times. It will answer to none of them.", key: 'rename', goal: 3 },

    // ---- Gifts
    { id: 'gift5', icon: '🎁', name: 'Gift Shop Owner', desc: 'Collect 5 gifts from the cat.', key: 'gift', goal: 5 },
    { id: 'gift20', icon: '🗑️', name: "Hoarders Anonymous", desc: 'Collect 20 gifts from the cat. You have a drawer for this now.', key: 'gift', goal: 20 },
    { id: 'sock3', icon: '🧦', name: 'Odd Sock Collector', desc: 'Collect 3 socks the cat dragged in.', key: 'gift:sock', goal: 3 },
    { id: 'hairTie3', icon: '🎀', name: 'Hair Tie Heist', desc: 'Collect 3 of your own hair ties from the cat.', key: 'gift:hairTie', goal: 3 },
    { id: 'goldBell', icon: '🔔', name: 'Jingle All The Way', desc: 'Collect the tiny golden bell.', key: 'gift:goldBell', goal: 1 },

    // ---- Things that happen in the room
    { id: 'lamp10', icon: '💡', name: 'Mood Lighting Manager', desc: 'Switch the lamp on or off 10 times.', key: 'lamp', goal: 10 },
    { id: 'darkNight', icon: '🌙', name: 'Beauty Sleep', desc: 'Leave the lights off all night so the cat sleeps well.', key: 'darkNight', goal: 1 },
    { id: 'tvFlip15', icon: '📺', name: 'Channel Surfer', desc: 'Change the TV channel 15 times. There is never anything on.', key: 'tvFlip', goal: 15 },
    { id: 'tvOff', icon: '🔌', name: 'Off Switch Appreciator', desc: 'Turn the TV off completely.', key: 'tvOff', goal: 1 },
    { id: 'window5', icon: '🪟', name: 'Window Shopper', desc: 'Tap the window 5 times. Nothing is for sale.', key: 'windowTap', goal: 5 },
    { id: 'arrange10', icon: '🧘', name: 'Feng Shui Master', desc: 'Rearrange the furniture 10 times.', key: 'arrange', goal: 10 },
    { id: 'restyle5', icon: '🎨', name: 'Pink Is A Personality', desc: 'Change the colour of the furniture 5 times. The cat did not notice.', key: 'restyle', goal: 5 },
    { id: 'curtain1', icon: '🧗', name: 'Curtain Cowboy', desc: 'Watch the cat climb the curtains out of boredom.', key: 'curtain', goal: 1 },
    { id: 'curtain5', icon: '🪟', name: 'Free Solo', desc: 'Watch the curtain climb 5 times. The curtains are fine. Probably.', key: 'curtain', goal: 5 },
    { id: 'topple1', icon: '🐦', name: 'Gravity Is A Suggestion', desc: 'See the cat fall off the windowsill. It meant to do that.', key: 'topple', goal: 1 },
    { id: 'pounce1', icon: '🦋', name: 'Butt Wiggle Engineer', desc: 'See the cat wiggle, pounce and miss completely.', key: 'pounce', goal: 1 },
    { id: 'pounce5', icon: '🎯', name: 'Zero For Five', desc: 'Watch the cat miss 5 pounces. Practice makes nothing.', key: 'pounce', goal: 5 },
    { id: 'drink1', icon: '💧', name: 'Splish Splash', desc: 'See the cat dip a paw in the water bowl and judge it.', key: 'drink', goal: 1 },
    { id: 'drink5', icon: '🌊', name: 'Hydration Disaster', desc: 'See the paw-in-the-water thing 5 times. Still wet.', key: 'drink', goal: 5 },
    { id: 'clearSpot', icon: '🧺', name: 'Marie Kondo', desc: 'Clear a spot entirely. Does it spark joy? No.', key: 'clearSpot', goal: 1 },
    { id: 'photo5', icon: '📷', name: 'Shutterbug', desc: 'Take 5 photos of the cat.', key: 'photo', goal: 5 },
    { id: 'photo25', icon: '🤳', name: 'Paparazzi', desc: 'Take 25 photos of the cat. It is not impressed.', key: 'photo', goal: 25 },
    { id: 'flash', icon: '⚡', name: 'Flash Dance', desc: 'Take a photo in the dark.', key: 'photoFlash', goal: 1 },
    { id: 'diary10', icon: '🔍', name: 'Nosy Human', desc: "Read the cat's diary 10 times. It's private.", key: 'diaryOpen', goal: 10 },
    { id: 'shoo3', icon: '🛡️', name: 'Diary Defender', desc: 'Shoo the cat off your diary 3 times.', key: 'shoo', goal: 3 },
    { id: 'note7', icon: '📝', name: 'Bookworm', desc: "Read the cat's note on the wall on 7 different days.", key: 'noteDays', goal: 7 },
    { id: 'bondCard', icon: '🔎', name: 'Reads The Terms', desc: 'Open the bond level card to see what is coming.', key: 'bondCard', goal: 1 },
    { id: 'mute5', icon: '🔇', name: 'Do Not Disturb', desc: 'Switch the sound on and off 5 times.', key: 'muteToggle', goal: 5 },

    // ---- Real life gets involved
    { id: 'weatherOn', icon: '🌦️', name: 'Meteorologist', desc: 'Let the window show the real weather.', key: 'weatherSet', goal: 1 },
    { id: 'rain', icon: '☔', name: 'Umbrella Required', desc: 'See it rain in the window.', key: 'wx:rain', goal: 1 },
    { id: 'storm', icon: '⛈️', name: 'Thunder Buddy', desc: 'See a thunderstorm in the window.', key: 'wx:storm', goal: 1 },
    { id: 'fog', icon: '🌫️', name: "Can't See Anything", desc: 'See fog in the window.', key: 'wx:fog', goal: 1 },
    { id: 'nightOwl', icon: '🦉', name: 'Night Owl', desc: 'Have the game open after midnight on 3 different days.', key: 'nightDays', goal: 3 },
    { id: 'earlyBird', icon: '🐦', name: 'Early Bird', desc: 'Have the game open around sunrise on 3 different days.', key: 'earlyDays', goal: 3 },
    { id: 'festive', icon: '🎉', name: 'Festive Feline', desc: 'See the room in its festive decorations.', key: 'seasonSeen', goal: 1 },

    // ---- Things the cat does on its own
    { id: 'chaos', icon: '🌀', name: '3am Club', desc: 'Be there for the 3am zoomies.', key: 'chaosZoomies', goal: 1, secret: true },
    { id: 'bellyNap', icon: '😛', name: 'Tummy Out, Tongue Out', desc: 'Catch a rare belly-up nap.', key: 'bellyNap', goal: 1, secret: true },
    { id: 'sun10', icon: '☀️', name: 'Solar Panel', desc: 'See the cat sunbathe 10 times.', key: 'sunbathe', goal: 10 },
    { id: 'birds10', icon: '🐦', name: 'Bird TV Subscriber', desc: 'See the cat watch the birds 10 times.', key: 'birds', goal: 10 },
    { id: 'hide10', icon: '📦', name: 'If It Fits, It Sits', desc: 'See the cat hide in a box (or bag, or tent) 10 times.', key: 'hide', goal: 10 },

    // ---- Time together
    { id: 'bond3', icon: '💛', name: 'Out Of The Friend Zone', desc: 'Reach bond level 3.', calc: (s) => G.Progression.level(s), goal: 3 },
    { id: 'bond5', icon: '💞', name: 'Practically Family', desc: 'Reach bond level 5.', calc: (s) => G.Progression.level(s), goal: 5 },
    { id: 'bond10', icon: '👑', name: 'Best Friends Forever', desc: 'Reach the top bond level. The cat will deny it.', calc: (s) => G.Progression.level(s), goal: 10 },
    { id: 'days7', icon: '🏠', name: 'Roommates', desc: 'Live together for 7 days.', calc: (s, t) => Math.floor((t - s.createdAt) / DAY), goal: 7 },
    { id: 'days30', icon: '🎂', name: 'Cat-versary', desc: 'Live together for 30 days.', calc: (s, t) => Math.floor((t - s.createdAt) / DAY), goal: 30 },

    // ---- Coming back, and the gachapon
    { id: 'streak3', icon: '🔥', name: 'Clingy', desc: 'Visit 3 days in a row.', calc: (s) => s.flags.bestStreak || 0, goal: 3 },
    { id: 'streak7', icon: '🫶', name: 'Emotionally Dependent', desc: 'Visit 7 days in a row. The cat noticed. It will not say so.', calc: (s) => s.flags.bestStreak || 0, goal: 7 },
    { id: 'gacha1', icon: '🎰', name: 'Gambling Is A Strong Word', desc: 'Spend cat coins on the gachapon.', key: 'gacha', goal: 1 },
    { id: 'gacha10', icon: '🥚', name: 'Capsule Hoarder', desc: 'Spin the gachapon 10 times.', key: 'gacha', goal: 10 },
    { id: 'gachaDup', icon: '🔁', name: 'Not Again', desc: 'Get something from the gachapon you already had.', key: 'gachaDup', goal: 1 },
    { id: 'gachaCrown', icon: '👑', name: 'Royalty', desc: 'Win the tiny crown.', key: 'prize:extra:crown', goal: 1, secret: true },
    { id: 'gachaLavender', icon: '💜', name: 'Lavender Haze', desc: 'Win the lavender walls.', key: 'prize:skin:wall:lavender', goal: 1, secret: true },
    { id: 'gachaAll', icon: '🧺', name: 'Gotta Catch Them All (Legally Distinct)', desc: 'Collect every prize in the gachapon.', calc: (s) => (s.gacha ? s.gacha.owned.length : 0), goal: 31 },

    // ---- Meta
    { id: 'meta5', icon: '🏆', name: 'Trophy Hoarder', desc: 'Unlock 5 achievements. Look at you go.', calc: (s) => unlockedCount(s, 'meta5'), goal: 5 },
    { id: 'meta20', icon: '🥇', name: 'Achievement Hunter', desc: 'Unlock 20 achievements. This is what you do now.', calc: (s) => unlockedCount(s, 'meta20'), goal: 20 },
    { id: 'metaAll', icon: '🌈', name: 'Touch Grass', desc: 'Unlock every other achievement. Go outside.', calc: (s) => unlockedCount(s, 'metaAll'), goal: 0 },
  ];

  // The last one needs every other achievement.
  DEFS[DEFS.length - 1].goal = DEFS.length - 1;

  const BY_ID = {};
  for (const d of DEFS) BY_ID[d.id] = d;

  function count(s, key) {
    return (s.counts && s.counts[key]) || 0;
  }

  function unlockedCount(s, exceptId) {
    return Object.keys(s.achievements || {}).filter((id) => id !== exceptId).length;
  }

  function progress(s, t, d) {
    return d.calc ? d.calc(s, t) : count(s, d.key);
  }

  // Unlock whatever is now done. Returns the ones unlocked just now.
  function evaluate(s, t) {
    if (!s.achievements) s.achievements = {};
    if (!s.achQueue) s.achQueue = [];
    const when = t || Date.now();
    const fresh = [];
    let again = true;
    while (again) {
      again = false;
      for (const d of DEFS) {
        if (s.achievements[d.id]) continue;
        if (progress(s, when, d) >= d.goal) {
          s.achievements[d.id] = when;
          s.achQueue.push(d.id);
          s.achUnseen = (s.achUnseen || 0) + 1;
          fresh.push(d);
          again = true; // the "unlock N achievements" ones may now be done
        }
      }
    }
    return fresh;
  }

  // Count something that happened.
  function bump(s, key, n, t) {
    if (!s.counts) s.counts = {};
    s.counts[key] = (s.counts[key] || 0) + (n === undefined ? 1 : n);
    return evaluate(s, t);
  }

  // For things that are either true or not (seen rain, seen the festive decor).
  function mark(s, key, t) {
    return count(s, key) ? [] : bump(s, key, 1, t);
  }

  // Everything logged by the cat and by the actions.
  function onEvent(s, e) {
    const c = (key, n) => {
      if (!s.counts) s.counts = {};
      s.counts[key] = (s.counts[key] || 0) + (n === undefined ? 1 : n);
    };
    switch (e.type) {
      case 'fed': c('feed'); break;
      case 'treat': c('treat'); break;
      case 'pet': c('pet'); if (e.zone === 'ears') c('ears'); if (e.zone === 'belly') c('bellyTry'); break;
      case 'trap': c('trap'); break;
      case 'angry': c('hiss'); if (e.cause === 'tail') c('tail'); break;
      case 'scoop': c('scoop'); break;
      case 'cleaned': c('clean'); break;
      case 'vomit': c('vomit'); break;
      case 'grass': c('grass'); break;
      case 'invited': c('invite'); c(e.result === 'accepted' ? 'inviteYes' : 'inviteNo'); break;
      case 'lights': c('lamp'); break;
      case 'dawnLights': if (e.rested) c('darkNight'); break;
      case 'called': c(e.result === 'come' ? 'callCome' : 'callIgnored'); break;
      case 'collected': c('gift'); c('gift:' + e.item); break;
      case 'rename': c('rename'); break;
      case 'knock': c('knock'); break;
      case 'litter': c(e.accident ? 'accident' : 'litterUse'); break;
      case 'zoomies': if (e.chaos) c('chaosZoomies'); break;
      case 'nap': if (e.rare) c('bellyNap'); break;
      case 'sunbathe': c('sunbathe'); break;
      case 'birds': c('birds'); break;
      case 'curtain': c('curtain'); break;
      case 'topple': c('topple'); break;
      case 'pounce': c('pounce'); break;
      case 'drink': c('drink'); break;
      case 'hide': c('hide'); break;
      case 'played': c('play'); break;
      case 'gacha': c('gacha'); c('prize:' + e.prize); if (e.dup) c('gachaDup'); break;
      case 'levelup': // the bond-level and streak ones are worked out below
      case 'visit':
        break;
      default:
        return;
    }
    evaluate(s, e.t);
  }

  // The unlocked ones the player hasn't been told about yet.
  function take(s) {
    const q = s.achQueue || [];
    s.achQueue = [];
    return q.map((id) => BY_ID[id]).filter(Boolean);
  }

  // What an achievement is worth: a little bond and a cat coin (more for the big "meta" ones).
  const rewardOf = (d) => (d.id.startsWith('meta') ? { bond: 5, coins: 3 } : { bond: 2, coins: 1 });

  // Announce-and-reward: takes the unlocked ones, adds their bond and coins. Returns the list and
  // anything the bond did (a level-up, unlocks), so the screen can celebrate it.
  function claim(s, t) {
    const list = [];
    const out = { list, bond: 0, coins: 0, levelUp: null, unlocked: [] };
    let guard = 0;
    while ((s.achQueue || []).length && guard++ < 20) {
      for (const d of take(s)) {
        const rw = rewardOf(d);
        list.push(d);
        out.bond += rw.bond;
        out.coins += G.Progression.addCoins(s, rw.coins);
        const res = G.Progression.addBond(s, rw.bond, t); // may unlock more (bond levels)
        if (res.levelUp) out.levelUp = res.levelUp;
        if (res.unlocked) out.unlocked.push(...res.unlocked);
        if (res.coins) out.coins += res.coins;
      }
    }
    return out;
  }

  // For the Trophies page: everything with how far along it is.
  function list(s, t) {
    return DEFS.map((d) => {
      const at = (s.achievements || {})[d.id] || 0;
      const cur = Math.min(d.goal, progress(s, t, d));
      return { def: d, cur, goal: d.goal, done: !!at, at };
    });
  }

  function summary(s) {
    return { done: Object.keys(s.achievements || {}).length, total: DEFS.length };
  }

  G.Achievements = { DEFS, BY_ID, count, bump, mark, onEvent, evaluate, take, claim, rewardOf, list, summary };
})(globalThis.CatGame = globalThis.CatGame || {});
