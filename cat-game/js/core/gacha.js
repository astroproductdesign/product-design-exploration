// The gachapon machine next to the TV: spend cat coins, get a random capsule with a new
// accessory for the cat, a new toy for the room, or a new colour for a piece of furniture.
// No drawing here (the colours themselves are in RoomArt).
(function (G) {
  'use strict';

  const R = G.Random;
  const COST = 5; // cat coins per spin
  const REFUND = 2; // back for a prize you already had

  // kind: 'item' (a room item, see Catalog.ITEMS), 'extra' or 'collar' (see Coats), or 'skin'
  // (a new colour for a piece of furniture; ref is 'piece:colour').
  const PRIZES = [
    { id: 'mouse', kind: 'item', name: 'Toy mouse', rarity: 'common', line: 'It squeaks. The cat will pretend it is real.' },
    { id: 'ball', kind: 'item', name: 'Jingle ball', rarity: 'common', line: 'Guaranteed to roll under the sofa at 3am.' },
    { id: 'banana', kind: 'item', name: 'Catnip banana', rarity: 'common', line: 'Smells amazing, apparently. Do not ask.' },
    { id: 'duck', kind: 'item', name: 'Rubber duck', rarity: 'common', line: 'A colleague. Possibly a rival.' },
    { id: 'collar:purple', kind: 'collar', ref: 'purple', name: 'Purple collar', rarity: 'common', line: 'Very regal. Very purple.' },
    { id: 'collar:orange', kind: 'collar', ref: 'orange', name: 'Orange collar', rarity: 'common', line: 'Matches exactly nothing. Perfect.' },
    { id: 'donut', kind: 'item', name: 'Donut bed', rarity: 'rare', line: 'A bed shaped like a snack. Naps will be had.' },
    { id: 'tunnel', kind: 'item', name: 'Crinkle tunnel', rarity: 'rare', line: 'It crinkles. Loudly. Forever.' },
    { id: 'extra:partyHat', kind: 'extra', ref: 'partyHat', name: 'Party hat', rarity: 'rare', line: 'Every day is a party if you refuse to take the hat off.' },
    { id: 'extra:headBow', kind: 'extra', ref: 'headBow', name: 'Big bow', rarity: 'rare', line: 'Bigger than strictly necessary.' },
    { id: 'extra:leaf', kind: 'extra', ref: 'leaf', name: 'Leaf hat', rarity: 'rare', line: 'Forest spirit energy.' },
    { id: 'extra:sunnies', kind: 'extra', ref: 'sunnies', name: 'Cool sunglasses', rarity: 'rare', line: 'Too cool to look at you. As usual.' },
    { id: 'extra:crown', kind: 'extra', ref: 'crown', name: 'Tiny crown', rarity: 'legendary', line: 'Finally, the outfit matches the attitude.' },
    { id: 'collar:gold', kind: 'collar', ref: 'gold', name: 'Gold collar', rarity: 'legendary', line: 'Shiny. Expensive-looking. Absolutely deserved.' },
    { id: 'skin:curtains:pink', kind: 'skin', ref: 'curtains:pink', name: 'Pink curtains', rarity: 'common', line: 'Everything looks rosier now. Literally.' },
    { id: 'skin:curtains:sky', kind: 'skin', ref: 'curtains:sky', name: 'Sky blue curtains', rarity: 'common', line: 'For the days the real sky is grey.' },
    { id: 'skin:clock:pink', kind: 'skin', ref: 'clock:pink', name: 'Pink clock', rarity: 'common', line: 'Time flies. Pinkly.' },
    { id: 'skin:clock:mint', kind: 'skin', ref: 'clock:mint', name: 'Mint clock', rarity: 'common', line: 'Fresh minutes, every minute.' },
    { id: 'skin:rug:blue', kind: 'skin', ref: 'rug:blue', name: 'Blue rug', rarity: 'common', line: 'Now the cat can sit in the sea.' },
    { id: 'skin:rug:lavender', kind: 'skin', ref: 'rug:lavender', name: 'Lavender rug', rarity: 'common', line: 'Soft, purple and instantly covered in fur.' },
    { id: 'skin:chair:red', kind: 'skin', ref: 'chair:red', name: 'Red chair cover', rarity: 'common', line: 'Same chair. More drama.' },
    { id: 'skin:chair:navy', kind: 'skin', ref: 'chair:navy', name: 'Navy chair cover', rarity: 'common', line: 'Hides the cat hair. Does not hide the cat.' },
    { id: 'skin:lamp:mint', kind: 'skin', ref: 'lamp:mint', name: 'Mint lamp', rarity: 'common', line: 'A cool glow for a cool cat.' },
    { id: 'skin:lamp:pink', kind: 'skin', ref: 'lamp:pink', name: 'Pink lamp', rarity: 'common', line: 'Mood lighting, for a cat with moods.' },
    { id: 'skin:curtains:polka', kind: 'skin', ref: 'curtains:polka', name: 'Polka-dot curtains', rarity: 'rare', line: 'The cat has counted every dot. Twice.' },
    { id: 'skin:clock:midnight', kind: 'skin', ref: 'clock:midnight', name: 'Midnight clock', rarity: 'rare', line: 'Black and gold. Very serious about 3am zoomies.' },
    { id: 'skin:desk:white', kind: 'skin', ref: 'desk:white', name: 'White TV desk', rarity: 'rare', line: 'Clean, minimal, about to be scratched.' },
    { id: 'skin:desk:pink', kind: 'skin', ref: 'desk:pink', name: 'Pink TV desk', rarity: 'rare', line: 'The TV has never looked so sweet.' },
    { id: 'skin:wall:peach', kind: 'skin', ref: 'wall:peach', name: 'Peach walls', rarity: 'rare', line: 'Warm, cosy, and a bit like living in a fruit.' },
    { id: 'skin:wall:mint', kind: 'skin', ref: 'wall:mint', name: 'Mint walls', rarity: 'rare', line: 'Like living inside an ice cream. Good.' },
    { id: 'skin:wall:lavender', kind: 'skin', ref: 'wall:lavender', name: 'Lavender walls', rarity: 'legendary', line: 'A whole new room. The cat sniffed one wall and approved.' },
  ];
  const BY_ID = {};
  for (const p of PRIZES) BY_ID[p.id] = p;

  const RARITY = [
    ['common', 70],
    ['rare', 25],
    ['legendary', 5],
  ];
  const RARITY_LABEL = { common: 'Common', rare: 'Rare!', legendary: 'Legendary!!' };

  function owned(s, id) {
    return !!(s.gacha && s.gacha.owned.includes(id));
  }

  // Can the cat wear this extra / collar? (Gachapon ones only once won.)
  function canWear(s, kind, ref) {
    const list = kind === 'extra' ? G.Coats.EXTRAS : G.Coats.COLLARS;
    const it = list.find((x) => x.id === ref);
    return !!it && (!it.gacha || owned(s, kind + ':' + ref));
  }

  // The pieces of furniture that can change colour, in the order the Room tray shows them.
  const PIECES = [
    { id: 'wall', name: 'Walls' },
    { id: 'curtains', name: 'Curtains' },
    { id: 'clock', name: 'Clock' },
    { id: 'rug', name: 'Rug' },
    { id: 'chair', name: 'Chair' },
    { id: 'lamp', name: 'Lamp' },
    { id: 'desk', name: 'TV desk' },
  ];

  // The colours won for one piece (not counting its original one).
  function skinsFor(s, piece) {
    return PRIZES.filter((p) => p.kind === 'skin' && p.ref.split(':')[0] === piece && owned(s, p.id)).map((p) => p.ref.split(':')[1]);
  }

  // The colour a piece is showing ('' is its original one).
  function skinOf(s, piece) {
    const v = (s.room && s.room.skins && s.room.skins[piece]) || '';
    return v && owned(s, 'skin:' + piece + ':' + v) ? v : '';
  }

  // Paint a piece in a colour you've won, or back to its original ('' or null).
  function setSkin(s, piece, colour) {
    if (!s.room.skins) s.room.skins = {};
    if (colour && !owned(s, 'skin:' + piece + ':' + colour)) return false;
    if (colour) s.room.skins[piece] = colour;
    else delete s.room.skins[piece];
    return true;
  }

  function give(s, p) {
    s.gacha.owned.push(p.id);
    if (p.kind === 'item' && !s.unlocked.includes('item:' + p.id)) s.unlocked.push('item:' + p.id);
  }

  // One spin. A duplicate gives a couple of coins back. New prizes are a little likelier than repeats.
  function spin(s, t) {
    if (!s.gacha) s.gacha = { owned: [], spins: 0 };
    if ((s.coins || 0) < COST) return { ok: false, need: COST - (s.coins || 0) };
    s.coins -= COST;
    s.gacha.spins += 1;
    const r = R.rng(R.hash(s.seed, 'gacha', s.gacha.spins, t));
    const rarity = R.weighted(r, RARITY);
    let pool = PRIZES.filter((p) => p.rarity === rarity);
    const fresh = pool.filter((p) => !owned(s, p.id));
    if (fresh.length && r() < 0.7) pool = fresh;
    const prize = R.pick(r, pool);
    const dup = owned(s, prize.id);
    if (dup) s.coins += REFUND;
    else give(s, prize);
    G.State.log(s, { t, type: 'gacha', prize: prize.id, rarity: prize.rarity, dup, live: true });
    return { ok: true, prize, dup, refund: dup ? REFUND : 0 };
  }

  G.Gacha = { COST, REFUND, PRIZES, BY_ID, RARITY_LABEL, PIECES, owned, canWear, skinsFor, skinOf, setSkin, spin };
})(globalThis.CatGame = globalThis.CatGame || {});
