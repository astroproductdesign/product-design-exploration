// Checks the game logic without a browser:  node cat-game/tests/core-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = ['random', 'clock', 'profile', 'coats', 'photoread', 'catalog', 'state', 'storage', 'progression', 'weather', 'sim', 'interactions', 'journal'];
const ctx = vm.createContext({ console, Math, Date, JSON });
for (const f of files) vm.runInContext(readFileSync(path.join(dir, '../js/core', f + '.js'), 'utf8'), ctx, { filename: f });
const G = ctx.CatGame;
const { MIN, HOUR, DAY } = G.Clock;

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ✓ ' + name);
}

const t0 = new Date(2026, 9, 9, 8, 0).getTime(); // 9 Oct 2026, 8am

function fresh(t = t0) {
  const s = G.State.createState(t, 'Mochi');
  s.seed = 12345;
  return s;
}

test('offline catch-up is deterministic', () => {
  const a = fresh();
  const b = fresh();
  G.Sim.advance(a, t0 + 9 * HOUR);
  G.Sim.advance(b, t0 + 3 * HOUR);
  G.Sim.advance(b, t0 + 9 * HOUR);
  assert.deepEqual(a.log.map((e) => e.type + e.t), b.log.map((e) => e.type + e.t));
  assert.deepEqual(a.stats, b.stats);
});

test('stats stay in range, cat never "dies", even after 3 weeks away', () => {
  const s = fresh();
  s.bowl.portions = 0;
  G.Sim.advance(s, t0 + 21 * DAY);
  const st = s.stats;
  for (const k of ['fullness', 'energy', 'happiness']) assert.ok(st[k] >= 0 && st[k] <= 100, k + '=' + st[k]);
  assert.ok(st.happiness >= 12, 'happiness has a floor');
  assert.ok(st.bond > 0, 'bond grew passively while away');
});

test('bond only goes up when you are kind (head, chin, back, belly, ears)', () => {
  const s = fresh();
  let last = 0;
  for (let i = 0; i < 300; i++) {
    const t = t0 + i * 7 * MIN;
    G.Sim.advance(s, t, { live: true });
    const r = i % 5;
    if (r === 0) G.Interactions.pet(s, t, ['head', 'chin', 'back', 'belly', 'ears'][i % 5], i % 13);
    if (r === 1) G.Interactions.call(s, t);
    if (r === 2) G.Interactions.treat(s, t);
    if (r === 3) G.Interactions.feed(s, t, 'kibble');
    assert.ok(s.stats.bond >= last);
    last = s.stats.bond;
  }
});

test('pet zones: tail and paws upset the cat, ears are loved', () => {
  const s = fresh();
  s.stats.bond = 40; // level 2: starts at 30
  s.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + HOUR, facing: 1 };
  const r = G.Interactions.pet(s, t0, 'tail', 0);
  assert.ok(r.angry && r.eyes === 'angry' && r.mouth === 'hiss', 'the tail gets a hiss and an angry face');
  assert.equal(s.activity.id, 'sulk', 'then it sulks');
  assert.ok(s.stats.bond < 40, 'a little bond is lost');
  const hit = G.Interactions.pet(s, t0 + 1000, 'head', 0);
  assert.ok(hit.angry, 'petting a sulking cat gets another hiss');
  // Bond never drops below the start of the level, so nothing unlocked can be lost.
  s.stats.bond = 30;
  s.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + HOUR, facing: 1 };
  G.Interactions.pet(s, t0 + 2000, 'tail', 0);
  assert.equal(s.stats.bond, 30, 'no loss below the level floor');
  assert.equal(G.Progression.level(s), 2);

  // Paws: either a polite pull-away or a warning swat.
  let pulled = 0;
  let swatted = 0;
  for (let i = 0; i < 60; i++) {
    const c = fresh();
    c.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + HOUR, facing: 1 };
    const res = G.Interactions.pet(c, t0 + i, 'paws', 0);
    if (res.angry) swatted++;
    else if (res.anim === 'recoil') pulled++;
  }
  assert.ok(pulled > 10 && swatted > 10, `paws: ${pulled} pulled away, ${swatted} swats`);

  const e = fresh();
  e.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + HOUR, facing: 1 };
  const ear = G.Interactions.pet(e, t0, 'ears', 0);
  assert.ok(!ear.angry && ear.eyes === 'closed' && e.stats.bond === 1);

  // Grabbing a sleeping cat's tail, or petting in the litter box, is not welcome.
  const z = fresh();
  z.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + HOUR, facing: 1 };
  assert.ok(G.Interactions.pet(z, t0, 'tail', 0).angry);
  const lb = fresh();
  lb.activity = { id: 'litter', spot: 'litter', key: 'litter', pose: 'squat', start: t0, end: t0 + MIN, facing: 1, kind: 'pee' };
  const priv = G.Interactions.pet(lb, t0, 'head', 0);
  assert.ok(priv.angry && lb.activity.id === 'litter', 'privacy: a hiss, with no penalty');
  assert.equal(lb.stats.bond, 0);
});

test('litter box: the need builds, visits leave clumps, a dirty box is scooped', () => {
  const s = fresh();
  assert.ok(G.Sim.BEHAVIORS.litter && G.Sim.BEHAVIORS.sulk);
  const start = JSON.stringify(s.room.litter);
  assert.equal(start, JSON.stringify({ clumps: [], mess: 0 }));
  // A day and a half with nobody scooping: the cat visits several times.
  G.Sim.advance(s, t0 + 36 * HOUR, { live: false });
  const visits = s.log.filter((e) => e.type === 'litter');
  assert.ok(visits.length >= 3, `visits: ${visits.length}`);
  assert.ok(s.room.litter.clumps.length <= 6 && s.room.litter.mess <= 2, 'the mess is capped');
  assert.ok(s.room.litter.clumps.length >= 1);
  assert.ok(s.stats.litter >= 0 && s.stats.litter <= 100);
  // A dirty box makes the cat a little grumpier than usual, never miserable.
  assert.ok(s.stats.happiness >= 12);

  s.room.litter = { clumps: ['pee', 'poop', 'pee', 'poop'], mess: 1 };
  assert.ok(G.Sim.isDirty(s));
  const before = s.stats.bond;
  const r = G.Interactions.scoop(s, t0 + 36 * HOUR);
  assert.equal(s.room.litter.clumps.length, 0);
  assert.equal(s.room.litter.mess, 0);
  assert.ok(s.stats.bond > before && r.sound === 'scoop');
  assert.ok(G.Interactions.scoop(s, t0 + 37 * HOUR).toast.includes('already'), 'nothing to scoop');
  // Old saves get an empty box.
  delete s.room.litter;
  delete s.stats.litter;
  const m = G.State.migrate(s);
  assert.equal(JSON.stringify(m.room.litter), start);
  assert.ok(m.stats.litter >= 0);
});

test('inviting the cat to an item: it decides by mood', () => {
  const run = (setup, spot, n = 200) => {
    const out = {};
    for (let i = 0; i < n; i++) {
      const s = fresh();
      s.room.slots = ['scratcher', 'cushion', 'box'];
      s.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + 99 * HOUR, facing: 1 };
      setup(s);
      G.Interactions.invite(s, t0 + i * 7919, spot);
      const e = s.log.filter((x) => x.type === 'invited').pop();
      const k = e ? e.result : s.activity.id;
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  };
  const happy = run((s) => { s.stats.happiness = 85; s.stats.energy = 60; s.stats.fullness = 70; }, 'slot2');
  const grumpy = run((s) => { s.stats.happiness = 20; s.stats.energy = 50; s.stats.fullness = 70; }, 'slot2');
  assert.ok(happy.accepted > 90 && happy.declined > 10, JSON.stringify(happy)); // usually, not always
  assert.ok((grumpy.accepted || 0) < happy.accepted, 'a grumpy cat says yes less');
  const hungry = run((s) => { s.stats.fullness = 8; }, 'slot2', 100);
  assert.ok(hungry.hungry > 60, JSON.stringify(hungry));
  const asleep = run((s) => { s.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + 99 * HOUR, facing: 1 }; s.stats.energy = 40; }, 'slot1');
  assert.ok(asleep.asleep > 150, JSON.stringify(asleep));
  const sulk = run((s) => { s.activity = { id: 'sulk', spot: 'wall', key: 'wall', pose: 'back', start: t0, end: t0 + 99 * HOUR, facing: 1 }; }, 'slot1', 30);
  assert.equal(sulk.sulk, 30);
  // Saying yes sends the cat to that very spot, with a small capped bond reward.
  const s = fresh();
  s.room.slots = ['scratcher', 'cushion', 'box'];
  s.stats.happiness = 95;
  let moved = false;
  for (let i = 0; i < 30 && !moved; i++) {
    s.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + 99 * HOUR, facing: 1 };
    G.Interactions.invite(s, t0 + i * 999, 'slot2');
    moved = s.activity.spot === 'slot2';
  }
  assert.ok(moved && s.activity.byYou);
  assert.ok(s.daily.invite <= G.Progression.CAPS.invite, 'bond from invites is capped per day');
  // Unknown spots do nothing.
  assert.equal(G.Interactions.invite(s, t0, 'slot9').ok, false);
});

test('lights: off is saved, naps more, and old saves default to on', () => {
  const s = fresh();
  assert.equal(s.settings.lights, 'on');
  const r = G.Interactions.setLights(s, t0, true);
  assert.equal(s.settings.lights, 'off');
  assert.ok(r.toast.includes('Lights off'));
  G.Interactions.setLights(s, t0, false);
  assert.equal(s.settings.lights, 'on');
  // In the dark the cat naps more (same cat, same two days).
  const napMins = (lights) => {
    const x = fresh();
    x.settings.lights = lights;
    x.settings.lightsAt = t0;
    x.bowl.portions = 99;
    G.Sim.advance(x, t0 + 2 * DAY);
    return x.log.filter((e) => e.type === 'nap').reduce((n, e) => n + e.mins, 0);
  };
  assert.ok(napMins('off') > napMins('on'), 'naps ' + napMins('off') + ' vs ' + napMins('on'));
  delete s.settings.lights;
  assert.equal(G.State.migrate(s).settings.lights, 'on');
});

test('lights left off overnight come back on at dawn, and the cat sleeps well', () => {
  const s = fresh(new Date(2026, 9, 9, 20, 0).getTime());
  G.Interactions.setLights(s, s.lastSimAt, true);
  const e0 = (s.stats.energy = 40);
  // still dark mid-evening, then dawn passes
  G.Sim.advance(s, new Date(2026, 9, 9, 23, 0).getTime(), { live: false });
  assert.equal(s.settings.lights, 'off', 'still off before dawn');
  G.Sim.advance(s, new Date(2026, 9, 10, 9, 0).getTime(), { live: false });
  assert.equal(s.settings.lights, 'on', 'back on after dawn');
  const ev = s.log.find((e) => e.type === 'dawnLights');
  assert.ok(ev && ev.rested);
  // a quick flick in the daytime is left alone
  const d = fresh(new Date(2026, 9, 9, 13, 0).getTime());
  G.Interactions.setLights(d, d.lastSimAt, true);
  G.Sim.advance(d, new Date(2026, 9, 9, 17, 0).getTime(), { live: false });
  assert.equal(d.settings.lights, 'off');
});

test('a cat that says no shows what it would rather do', () => {
  const s = fresh();
  s.room.slots = ['scratcher', 'cushion', 'box'];
  s.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + 99 * HOUR, facing: 1 };
  s.stats.energy = 40;
  let r;
  for (let i = 0; i < 30; i++) {
    // (reset each time: a yes would move the cat)
    s.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + 99 * HOUR, facing: 1 };
    r = G.Interactions.invite(s, t0 + i * 1000, 'slot0');
    if (r.thought) break;
  }
  assert.ok(r.thought, 'a thought bubble when it stays put');
  // the TV: quiet when it says no (no toast spam), loud when it comes
  const q = G.Interactions.invite(s, t0, 'desk', { quiet: true, prefer: 'supervise' });
  assert.ok(!q.toast || q.say);
  assert.equal(typeof G.Sim.wouldRather(s, t0), 'string');
});

test('rest recovers energy quickly, and the litter box is visited often (more after food)', () => {
  // a 3 hour nap away from the game fully restores a tired cat
  const a = fresh();
  a.stats.energy = 20;
  a.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + 3 * HOUR, facing: 1 };
  G.Sim.advance(a, t0 + 3 * HOUR, { live: false });
  assert.ok(a.stats.energy >= 60, 'after 3h of sleep: ' + a.stats.energy);
  // while you watch, a short nap is a visible boost
  const b = fresh();
  b.stats.energy = 20;
  b.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + 4 * MIN, facing: 1, live: true };
  G.Sim.advance(b, t0 + 4 * MIN, { live: true });
  assert.ok(b.stats.energy >= 28, 'after 4 min of live sleep: ' + b.stats.energy);
  // lights off: a little faster still
  const c = fresh();
  c.settings.lights = 'off';
  c.stats.energy = 20;
  c.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + 3 * HOUR, facing: 1 };
  G.Sim.advance(c, t0 + 3 * HOUR, { live: false });
  assert.ok(c.stats.energy > a.stats.energy - 0.001);
  // litter box: many visits in a day
  const d = fresh();
  d.bowl.portions = 99;
  G.Sim.advance(d, t0 + 24 * HOUR, { live: false });
  const visits = d.log.filter((e) => e.type === 'litter').length;
  assert.ok(visits >= 6, 'visits in a day: ' + visits);
  // after eating, a visit follows soon (live)
  const e = fresh();
  e.stats.fullness = 30;
  e.stats.litter = 20;
  e.bowl.portions = 3;
  e.activity = { id: 'eat', spot: 'bowl', key: 'bowl', pose: 'crouch', start: t0, end: t0 + 15000, facing: 1, live: true };
  G.Sim.advance(e, t0 + 6 * MIN, { live: true });
  assert.ok(e.log.some((x) => x.type === 'litter'), 'went to the litter box soon after eating');
  // treats nudge it too
  const f = fresh();
  const before = f.stats.litter;
  G.Interactions.treat(f, t0);
  assert.ok(f.stats.litter > before);
});

test('TV off: the cat does not supervise a dark screen; old saves have the TV on', () => {
  const s = fresh();
  assert.equal(s.settings.tv, 'on');
  s.settings.tv = 'off';
  for (let i = 0; i < 40; i++) assert.notEqual(G.Sim.chooseNext(s, t0 + i * 997 * 1000, true).id, 'supervise');
  delete s.settings.tv;
  assert.equal(G.State.migrate(s).settings.tv, 'on');
});

test('daily routine follows the clock (naps at night, sunbathing only in the day)', () => {
  const s = fresh();
  s.bowl.portions = 99;
  G.Sim.advance(s, t0 + 14 * DAY);
  const at = (e) => new Date(e.t).getHours();
  const naps = s.log.filter((e) => e.type === 'nap');
  const nightNapMins = naps.filter((e) => at(e) >= 22 || at(e) < 5).reduce((n, e) => n + e.mins, 0);
  const dayNapMins = naps.filter((e) => at(e) >= 7 && at(e) < 12).reduce((n, e) => n + e.mins, 0);
  assert.ok(nightNapMins > dayNapMins, `night ${nightNapMins} vs morning ${dayNapMins}`);
  for (const e of s.log.filter((e) => e.type === 'sunbathe')) assert.ok(at(e) >= 7 && at(e) < 17, 'sunbathe at ' + at(e));
});

test('cat eats from the bowl while you are away', () => {
  const s = fresh();
  s.stats.fullness = 30;
  s.bowl = { food: 'kibble', portions: 3 };
  G.Sim.advance(s, t0 + 20 * HOUR);
  assert.ok(s.bowl.portions < 3);
  assert.ok(s.log.some((e) => e.type === 'eat'));
});

test('away summary reads like a story', () => {
  const s = fresh();
  G.Sim.advance(s, t0 + 7 * HOUR);
  const sum = G.Journal.awaySummary(s, t0, t0 + 7 * HOUR);
  assert.ok(sum && sum.lines.length >= 2);
  console.log('      e.g. ' + sum.lines.map((l) => l.icon + ' ' + l.text).join(' / '));
});

test('names: validation and history', () => {
  const s = fresh();
  assert.equal(G.Interactions.validateName('   ').ok, false);
  assert.equal(G.Interactions.validateName('x'.repeat(21)).ok, false);
  assert.equal(G.Interactions.validateName('  Kopi   O  ').name, 'Kopi O');
  G.Sim.advance(s, t0 + 2 * DAY);
  G.Journal.finalize(s, t0 + 2 * DAY);
  const before = s.journal.length;
  assert.ok(before >= 1, 'diary entries written for past days');
  const res = G.Interactions.rename(s, t0 + 2 * DAY, 'Kopi');
  assert.ok(res.ok);
  assert.equal(s.cat.name, 'Kopi');
  assert.equal(s.journal[0].name, 'Mochi', 'old entries keep the old name');
  assert.equal(G.Journal.todayEntry(s, t0 + 2 * DAY).name, 'Kopi');
});

test('unlocks arrive with bond levels', () => {
  const s = fresh();
  assert.ok(!G.Progression.isUnlocked(s, 'toy:laser'));
  const res = G.Progression.addBond(s, 100, t0);
  assert.equal(res.levelUp, 3);
  assert.ok(G.Progression.isUnlocked(s, 'toy:laser'));
  assert.ok(G.Progression.isUnlocked(s, 'item:cushion'));
});

test('3am chaos happens', () => {
  const s = fresh();
  s.stats.energy = 90;
  G.Sim.advance(s, t0 + 20 * DAY);
  assert.ok(s.journal.length > 0 || s.log.length > 0);
  // Count chaos-hour events in the remaining 3-day log window.
  const chaos = s.log.filter((e) => e.chaos);
  assert.ok(chaos.length > 0, 'some 3am activity');
});

test('seasons', () => {
  assert.deepEqual([...G.Clock.seasonsAt(new Date(2026, 11, 20).getTime())], ['christmas']);
  assert.ok(G.Clock.seasonsAt(new Date(2027, 1, 8).getTime()).includes('cny'));
  assert.ok(G.Clock.seasonsAt(new Date(2026, 2, 25).getTime()).includes('raya'));
  assert.equal(G.Clock.seasonsAt(t0).length, 0);
});

test('coats: presets, old saves and photo matching', () => {
  const s = fresh();
  assert.equal(s.cat.coat.preset, 'mochi');
  delete s.cat.coat;
  assert.equal(G.State.migrate(s).cat.coat.preset, 'mochi', 'old saves get the default coat');
  delete s.cat.accessory;
  assert.equal(JSON.stringify(G.State.migrate(s).cat.accessory), JSON.stringify({ collar: 'mint', extra: 'bell' }), 'old saves keep the mint collar and bell');
  assert.equal(G.Coats.normalizeAccessory({ collar: 'rainbow', extra: 'hat' }).extra, 'bell', 'bad accessories fall back');
  assert.equal(G.Coats.normalize({ base: '#123456', pattern: 'zebra' }).pattern, 'stripes', 'bad values fall back');
  for (const p of G.Coats.PRESETS) assert.ok(G.Coats.describe(G.Coats.fromPreset(p.id)).length > 0);
});

test('tails: breed defaults, bad values and old saves', () => {
  const K = G.Coats;
  const j = (x) => JSON.stringify(x);
  assert.equal(j(K.tailFor(K.fromPreset('mochi'))), j({ length: 'medium', fur: 'smooth' }), 'the starter cat keeps the tail it always had');
  assert.equal(j(K.tailFor(K.fromPreset('siamese'))), j({ length: 'long', fur: 'smooth' }));
  assert.equal(j(K.tailFor(K.fromPreset('ragdoll'))), j({ length: 'long', fur: 'floofy' }));
  assert.equal(j(K.tailFor(K.fromPreset('bobtail'))), j({ length: 'bunny', fur: 'floofy' }));
  assert.equal(j(K.tailFor({ preset: null })), j(K.DEFAULT_TAIL), 'a hand-made coat starts medium & smooth');
  for (const p of K.PRESETS) {
    const t = K.tailFor(K.fromPreset(p.id));
    assert.ok(K.TAILS.some((x) => x.id === t.length) && K.FURS.some((x) => x.id === t.fur), p.id);
  }
  assert.equal(j(K.normalizeTail({ length: 'tiny', fur: 'fluffy' }, K.fromPreset('ragdoll'))), j({ length: 'long', fur: 'floofy' }), 'bad values fall back to the breed');
  assert.equal(j(K.normalizeTail({ length: 'short' }, K.fromPreset('ragdoll'))), j({ length: 'short', fur: 'floofy' }), 'a partial tail keeps the rest from the breed');
  assert.ok(K.describeTail({ length: 'bunny', fur: 'floofy' }).includes('bunny'));
  // Saves from before tails existed get their breed's usual tail.
  const s = G.State.createState(1000, 'Mochi');
  assert.equal(j(s.cat.tail), j({ length: 'medium', fur: 'smooth' }));
  delete s.cat.tail;
  s.cat.coat = K.fromPreset('ragdoll');
  assert.equal(j(G.State.migrate(s).cat.tail), j({ length: 'long', fur: 'floofy' }));
  s.cat.tail = { length: 'short', fur: 'smooth' };
  assert.equal(j(G.State.migrate(s).cat.tail), j({ length: 'short', fur: 'smooth' }), 'a saved tail is kept');
});

// Tiny painted "photos": a cat (head + body ellipses) with soft lighting and noise on a background.
function photo(fn, w = 96, h = 72) {
  const d = new Uint8ClampedArray(w * h * 4);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = 1.08 - ((x + y) / (w + h)) * 0.35;
      const n = rnd() * 14;
      d.set([...fn(x, y).map((v) => v * k + n), 255], (y * w + x) * 4);
    }
  return d;
}
const inE = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const isCat = (x, y) => inE(x, y, 34, 24, 15, 13) || inE(x, y, 52, 46, 26, 18);

test('photo reading: background, lighting and pattern', () => {
  const read = (img, taps) => G.PhotoRead.analyze(img, 96, 72, taps).coat;
  // Ginger tabby on a blue sofa, tapped: dark-ginger stripes are stripes, not tortie patches.
  const ginger = read(photo((x, y) => (!isCat(x, y) ? [96, 110, 128] : x % 8 < 3 ? [150, 80, 30] : [214, 128, 58])), [{ x: 55, y: 44 }]);
  assert.equal(ginger.base, '#e8a35a');
  assert.equal(ginger.pattern, 'stripes');
  // Black cat with a white chest on a beige rug, no taps: the rug is ignored.
  const black = read(photo((x, y) => (!isCat(x, y) ? [190, 160, 120] : inE(x, y, 50, 52, 9, 10) ? [235, 232, 228] : [34, 30, 30])));
  assert.deepEqual([black.base, black.pattern, black.white], ['#3a3330', 'plain', 'chest']);
  // Siamese on grass: cream stays cream (not white), dark head = colour-point.
  const siamese = read(photo((x, y) => (!isCat(x, y) ? [110, 140, 80] : inE(x, y, 34, 24, 15, 13) || x > 72 ? [92, 62, 44] : [238, 226, 200])));
  assert.equal(siamese.preset, 'siamese');
  // A white cat in shade isn't read as silver.
  assert.equal(read(photo((x, y) => (!isCat(x, y) ? [70, 52, 40] : [195, 196, 201]))).base, '#fcfcfc');
  // "All one colour" overrides any second colour.
  assert.equal(G.PhotoRead.analyze(photo((x, y) => (!isCat(x, y) ? [96, 110, 128] : x % 8 < 3 ? [150, 80, 30] : [214, 128, 58])), 96, 72, [{ x: 55, y: 44 }], { oneColour: true }).coat.pattern, 'plain');
});


test('weather: codes, readings and old saves', () => {
  const W = G.Weather;
  assert.equal(W.kindFor(0), 'clear');
  assert.equal(W.kindFor(2), 'partly');
  assert.equal(W.kindFor(3), 'overcast');
  assert.equal(W.kindFor(45), 'fog');
  assert.equal(W.kindFor(53), 'rain');
  assert.equal(W.kindFor(81), 'rain');
  assert.equal(W.kindFor(73), 'snow');
  assert.equal(W.kindFor(95), 'storm');
  const w = W.parse({ current: { weather_code: 61, temperature_2m: 27.6 }, daily: { sunrise: ['2026-10-12T07:06'], sunset: ['2026-10-12T19:12'] } }, 5);
  assert.equal(w.kind, 'rain');
  assert.equal(w.temp, 28);
  assert.ok(Math.abs(w.rise - 7.1) < 0.01 && Math.abs(w.set - 19.2) < 0.01);
  assert.equal(W.parse({}), null);
  // an old save has no weather: nothing shows, and nothing breaks
  const s = G.State.migrate({ ...fresh(), settings: { muted: false } });
  assert.equal(W.current(s), null);
  assert.equal(W.sunFor(s), null);
  s.settings.weather.place = { lat: 3.14, lon: 101.69 };
  assert.ok(W.stale(s, t0), 'a place with no reading yet needs one');
  s.settings.weather.last = w;
  w.at = t0;
  assert.equal(W.current(s), 'rain');
  assert.equal(W.stale(s, t0 + 5 * MIN), false);
  assert.equal(W.stale(s, t0 + 25 * MIN), true);
  s.settings.weather.preview = 'storm';
  assert.equal(W.current(s), 'storm', 'a test preview wins');
});

test('the sun follows the real sunrise and sunset', () => {
  const at = (h, sun) => G.Clock.lightingAt(new Date(2026, 9, 12, Math.floor(h), Math.round((h % 1) * 60)).getTime(), sun);
  const sun = { rise: 7.1, set: 19.2 };
  // Without a place, the old fixed times.
  assert.equal(at(6.5).isDay, true);
  // With one, the sun comes up at the real sunrise, is highest at midday between, and sets at sunset.
  assert.equal(at(6.5, sun).isDay, false, 'still dark before the real sunrise');
  assert.equal(at(7.2, sun).isDay, true);
  assert.ok(Math.abs(at(7.1, sun).sunP) < 0.02, 'sunrise: sun at the start of its arc');
  assert.ok(Math.abs(at(13.15, sun).sunP - 0.5) < 0.02, 'solar noon: top of the arc');
  assert.equal(at(19.0, sun).isDay, true);
  assert.equal(at(19.4, sun).isDay, false, 'dark after the real sunset');
  // A stretched clock must still be continuous around midnight and give sane values.
  for (let h = 0; h < 24; h += 0.25) {
    const L = at(h, sun);
    assert.ok(L.alpha >= 0 && L.alpha <= 1 && L.sunP === L.sunP && L.moonP === L.moonP);
  }
  // Nonsense sun times are ignored.
  assert.equal(G.Clock.sunHour(10, { rise: 9, set: 5 }), 10);
});

console.log(`\n${passed} checks passed`);
