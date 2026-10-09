// Everything the cat can eat, play with, sit in, or bring you.
(function (G) {
  'use strict';

  // Bond levels: points needed to reach each level (index = level - 1).
  const LEVELS = [0, 30, 80, 150, 250, 380, 550, 760, 1000, 1300];

  const FOODS = {
    kibble: { name: 'Crunchy kibble', fill: 35, portions: 3, joy: 2, level: 1, color: '#c98b4e' },
    wet: { name: 'Chicken wet food', fill: 45, portions: 1, joy: 8, level: 1, color: '#d9a07a' },
    tuna: { name: 'Fancy tuna', fill: 50, portions: 1, joy: 14, level: 3, color: '#e7a2a0' },
    salmon: { name: 'Salmon sashimi', fill: 55, portions: 1, joy: 20, level: 6, color: '#f39a6b' },
  };

  const TOYS = {
    feather: { name: 'Feather wand', level: 1 },
    laser: { name: 'Laser pointer', level: 3 },
  };

  // Things you can place in the room. `tags` say what the cat may do there.
  const ITEMS = {
    scratcher: { name: 'Round scratcher bed', label: 'the round scratcher bed', at: 'in the round scratcher bed', tags: ['nap', 'scratch', 'knead', 'loaf'], level: 1 },
    box: { name: 'Cardboard box', label: 'the cardboard box', at: 'in the cardboard box', tags: ['hide', 'nap'], level: 1 },
    cushion: { name: 'Red cushion', label: 'the red cushion', at: 'on the red cushion', tags: ['nap', 'knead', 'loaf', 'sit', 'roll'], level: 2 },
    yarn: { name: 'Ball of yarn', label: 'the ball of yarn', at: 'with the ball of yarn', tags: ['toy'], level: 2 },
    bag: { name: 'Paper bag', label: 'the paper bag', at: 'in the paper bag', tags: ['hide'], level: 4 },
    tower: { name: 'Cat tower', label: 'the cat tower', at: 'on top of the cat tower', tags: ['nap', 'watch', 'sit', 'scratch'], level: 5 },
    fishToy: { name: 'Fish kicker', label: 'the fish kicker', at: 'with the fish kicker', tags: ['toy'], level: 6 },
    tent: { name: 'Cat tent', label: 'the cat tent', at: 'in the cat tent', tags: ['hide', 'nap'], level: 7 },
  };

  // Not placed in a slot — it upgrades the windowsill into a nap spot.
  const PERCH = { name: 'Window hammock', level: 8 };

  // Fixed spots in the room.
  const SPOTS = {
    sill: { label: 'the windowsill', at: 'on the windowsill', tags: ['sun', 'watch', 'sit'] },
    chair: { label: 'the camping chair', at: 'on the camping chair', tags: ['nap', 'loaf', 'groom', 'knead', 'sit'] },
    table: { label: 'the dining table', at: 'on the dining table', tags: ['loaf', 'knock', 'sit', 'groom'] },
    laptop: { label: 'your laptop', at: 'on your laptop', tags: ['laptop'] },
    desk: { label: 'the TV desk', at: 'on the TV desk', tags: ['tv', 'sit', 'loaf'] },
    rug: { label: 'the rug', at: 'on the rug', tags: ['nap', 'roll', 'groom', 'knead', 'sit', 'loaf', 'floor', 'sun'] },
    bowl: { label: 'the food bowl', at: 'by the food bowl', tags: ['bowl'] },
    floorL: { label: 'the floor', at: 'on the floor', tags: ['floor', 'sit', 'groom'] },
    floorR: { label: 'the floor', at: 'on the floor', tags: ['floor', 'sit', 'groom'] },
    wall: { label: 'the wall', at: 'by the wall', tags: ['wall'] },
    front: { label: 'right in front of you', at: 'right in front of you', tags: ['front'] },
  };

  const SLOT_COUNT = 3;

  // Gifts the cat brings you. Rarer ones get likelier as your bond grows.
  const GIFTS = {
    leaf: { name: 'a crunchy leaf', rarity: 'common' },
    bottleCap: { name: 'a bottle cap', rarity: 'common' },
    hairTie: { name: 'one of your hair ties', rarity: 'common' },
    sock: { name: 'a single sock', rarity: 'common' },
    receipt: { name: 'a crumpled receipt', rarity: 'common' },
    feather: { name: 'a fluffy feather', rarity: 'rare' },
    button: { name: 'a shiny button', rarity: 'rare' },
    geckoTail: { name: "a cicak's tail (eww)", rarity: 'rare' },
    coin: { name: 'a 50 sen coin', rarity: 'rare' },
    goldBell: { name: 'a tiny golden bell', rarity: 'legendary' },
  };

  function levelFor(points) {
    let lv = 1;
    for (let i = 0; i < LEVELS.length; i++) if (points >= LEVELS[i]) lv = i + 1;
    return lv;
  }

  // Every unlockable id, tagged by kind, so the save can list them flatly.
  function unlocksAt(level) {
    const out = [];
    for (const [id, f] of Object.entries(FOODS)) if (f.level === level) out.push('food:' + id);
    for (const [id, t] of Object.entries(TOYS)) if (t.level === level) out.push('toy:' + id);
    for (const [id, it] of Object.entries(ITEMS)) if (it.level === level) out.push('item:' + id);
    if (PERCH.level === level) out.push('item:perch');
    return out;
  }

  function unlockName(key) {
    const [kind, id] = key.split(':');
    if (kind === 'food') return FOODS[id].name;
    if (kind === 'toy') return TOYS[id].name;
    if (id === 'perch') return PERCH.name;
    return ITEMS[id].name;
  }

  G.Catalog = { LEVELS, FOODS, TOYS, ITEMS, PERCH, SPOTS, SLOT_COUNT, GIFTS, levelFor, unlocksAt, unlockName };
})(globalThis.CatGame = globalThis.CatGame || {});
