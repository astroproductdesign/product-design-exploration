// The gachapon machine next to the TV: spend cat coins, get a random capsule with a new
// accessory for the cat or a new toy for the room. No drawing here.
(function (G) {
  'use strict';

  const R = G.Random;
  const COST = 5; // cat coins per spin
  const REFUND = 2; // back for a prize you already had

  // kind: 'item' (a room item, see Catalog.ITEMS), 'extra' or 'collar' (see Coats).
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

  G.Gacha = { COST, REFUND, PRIZES, BY_ID, RARITY_LABEL, owned, canWear, spin };
})(globalThis.CatGame = globalThis.CatGame || {});
