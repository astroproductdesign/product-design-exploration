// Checks the game logic without a browser:  node cat-game/tests/core-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = ['random', 'clock', 'profile', 'coats', 'photoread', 'catalog', 'state', 'storage', 'progression', 'achievements', 'weather', 'sim', 'interactions', 'gacha', 'shop', 'journal', 'notes', 'updates'];
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
  const L2 = G.Catalog.LEVELS[1]; // where level 2 starts
  s.stats.bond = L2 + 10;
  s.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + HOUR, facing: 1 };
  const r = G.Interactions.pet(s, t0, 'tail', 0);
  assert.ok(r.angry && r.eyes === 'angry' && r.mouth === 'hiss', 'the tail gets a hiss and an angry face');
  assert.equal(s.activity.id, 'sulk', 'then it sulks');
  assert.ok(s.stats.bond < L2 + 10, 'a little bond is lost');
  const hit = G.Interactions.pet(s, t0 + 1000, 'head', 0);
  assert.ok(hit.angry, 'petting a sulking cat gets another hiss');
  // Bond never drops below the start of the level, so nothing unlocked can be lost.
  s.stats.bond = L2;
  s.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t0, end: t0 + HOUR, facing: 1 };
  G.Interactions.pet(s, t0 + 2000, 'tail', 0);
  assert.equal(s.stats.bond, L2, 'no loss below the level floor');
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
  // In the dark the cat naps more (same cats, same two days; several cats so one lucky streak
  // of random picks can't decide it).
  const napMins = (lights) => {
    let total = 0;
    for (let k = 0; k < 6; k++) {
      const x = fresh();
      x.seed = x.seed + k * 7919;
      x.settings.lights = lights;
      x.settings.lightsAt = t0;
      x.bowl.portions = 99;
      G.Sim.advance(x, t0 + 2 * DAY);
      total += x.log.filter((e) => e.type === 'nap').reduce((n, e) => n + e.mins, 0);
    }
    return total;
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

test('diary: keeps the last week, and pages you save are kept for good', () => {
  const s = fresh();
  const days = (n) => {
    for (let i = n; i >= 1; i--) s.journal.push({ day: G.Clock.dayKey(t0 - i * DAY), name: 'Mochi', open: 'o', lines: ['l'], close: 'c' });
  };
  days(20);
  const keepDay = G.Clock.dayKey(t0 - 15 * DAY);
  assert.equal(G.Journal.toggleSave(s, keepDay), true, 'saved');
  G.Journal.finalize(s, t0);
  const kept = s.journal.map((e) => e.day);
  assert.ok(kept.includes(keepDay), 'a saved page from two weeks ago stays');
  assert.equal(kept.filter((d) => d !== keepDay).every((d) => d >= G.Journal.weekStart(t0)), true, 'the rest are only from this week');
  assert.equal(kept.length, 1 + 6, 'six earlier days plus the saved one (today is written separately)');
  assert.equal(G.Journal.toggleSave(s, keepDay), false, 'unsaved again');
  G.Journal.finalize(s, t0);
  assert.ok(!s.journal.some((e) => e.day === keepDay), 'and then it is let go');
  assert.equal(G.Journal.toggleSave(s, '2000-01-01'), false, 'no such page');
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


test('the wall note: a new one each day, kept, and in the cat\'s voice', () => {
  const s = fresh();
  const seen = [];
  for (let d = 0; d < 60; d++) {
    const t = t0 + d * DAY;
    const n = G.Notes.today(s, t);
    assert.ok(n.text.length > 10 && n.head.length > 3, 'has words');
    assert.ok(!/[{}]/.test(n.text + n.head), 'no unfilled blanks: ' + n.text);
    assert.ok(!/\s{2}|\bundefined\b|\bnull\b/.test(n.text), 'tidy: ' + n.text);
    assert.equal(G.Notes.today(s, t + HOUR).text, n.text, 'the same note all day');
    if (d) assert.notEqual(n.text, seen[d - 1], 'a different note from yesterday');
    seen.push(n.text);
  }
  assert.ok(new Set(seen).size >= 52, 'rarely repeats within two months (' + new Set(seen).size + ' of 60)');
  const kinds = new Set(s.notes.map((n) => n.kind));
  assert.deepEqual([...kinds].sort(), ['fact', 'me', 'wish'], 'a mix of facts, things about the cat, and wishes');
  assert.ok(s.notes.length <= 60, 'old notes are trimmed');
  // today's is unread until it has been opened
  assert.equal(G.Notes.fresh(s, t0), true);
  s.flags.noteSeen = G.Clock.dayKey(t0);
  assert.equal(G.Notes.fresh(s, t0), false);
  assert.equal(G.Notes.fresh(s, t0 + DAY), true);
  // earlier notes, newest first, never including today
  const e = G.Notes.earlier(s, t0 + 10 * DAY, 5);
  assert.equal(e.length, 5);
  assert.ok(e[0].day > e[4].day && e.every((x) => x.day < G.Clock.dayKey(t0 + 10 * DAY)));
  // a wish follows how the cat is doing right now
  const hungry = fresh();
  hungry.stats.fullness = 20;
  hungry.bowl.portions = 0;
  let sawBowl = false;
  for (let d = 0; d < 6; d++) if (/bowl/.test(G.Notes.write(hungry, G.Clock.dayKey(t0 + d * DAY), t0 + d * DAY).text)) sawBowl = true;
  assert.ok(sawBowl, 'an empty bowl and a hungry cat gets a mention');
  // an old save without notes still works
  const old = G.State.migrate({ ...fresh(), notes: undefined });
  assert.ok(G.Notes.today(old, t0).text);
});


test('cat grass: eaten, grows back, sometimes comes back up, and is cleaned away', () => {
  let sick = 0;
  let fine = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = fresh();
    s.seed = seed;
    G.Sim.setActivity(s, t0, 'grass', 'grass');
    G.Sim.advance(s, s.activity.end + 1000, { live: true });
    assert.ok(Math.abs(s.room.grass - 0.7) < 0.01, 'it ate a little: ' + s.room.grass);
    assert.ok(s.stats.fullness >= 0 && s.stats.fullness <= 100);
    const willBeSick = s.flags.vomitAt > 0;
    G.Sim.advance(s, s.lastSimAt + 3 * HOUR, { live: false });
    assert.ok(s.room.vomit.length <= G.Sim.MAX_VOMIT);
    if (willBeSick) {
      sick++;
      // (it may have nibbled again in those three hours, so a second puddle is possible)
      assert.ok(s.room.vomit.length >= 1, 'a puddle was left (seed ' + seed + ')');
      assert.ok(s.room.vomit.every((v) => ['rug', 'floorL', 'floorR'].includes(v.spot)));
    } else {
      fine++;
    }
  }
  assert.ok(sick > 5 && fine > 5, `about two in five are sick (${sick} sick, ${fine} fine)`);
  // cleaning it up: gone, a little bond, and the cat is happier
  const s = fresh();
  s.room.vomit.push({ spot: 'rug', dx: 4 });
  const bond = s.stats.bond;
  const r = G.Interactions.cleanVomit(s, t0, 0);
  assert.ok(r.ok && s.room.vomit.length === 0 && s.stats.bond > bond);
  assert.equal(G.Interactions.cleanVomit(s, t0, 0).ok, false, 'nothing left to clean');
  // grass that is nibbled down is not eaten again until it grows back, which takes hours
  s.room.grass = 0;
  assert.equal(G.Sim.behaviorAt(s, t0, 'grass'), null);
  assert.ok(/nibbled right down/.test(G.Interactions.invite(s, t0, 'grass').toast));
  G.Sim.advance(s, t0 + 4 * HOUR, { live: false });
  assert.ok(s.room.grass > 0.2 && s.room.grass < 1, 'growing back: ' + s.room.grass);
  G.Sim.advance(s, t0 + 14 * HOUR, { live: false });
  assert.equal(s.room.grass, 1);
  // a puddle left lying about makes the cat a little less happy than a clean room
  const messy = fresh();
  messy.room.vomit.push({ spot: 'rug', dx: 0 });
  messy.stats.happiness = 90;
  const tidy = fresh();
  tidy.stats.happiness = 90;
  G.Sim.drift(messy, { id: 'sit' }, 600);
  G.Sim.drift(tidy, { id: 'sit' }, 600);
  assert.ok(messy.stats.happiness < tidy.stats.happiness);
  // old saves get a full pot of grass and no puddles
  const old = G.State.migrate({ ...fresh(), room: { slots: ['scratcher', null, 'box'], perch: false, cupOnFloor: false, gifts: [], litter: { clumps: [], mess: 0 } } });
  assert.equal(old.room.grass, 1);
  assert.ok(Array.isArray(old.room.vomit) && old.room.vomit.length === 0);
});


test('achievements: silly goals, counted from what happens, announced once', () => {
  const A = G.Achievements;
  const ids = A.DEFS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  assert.ok(ids.length >= 40, 'a long list');
  for (const d of A.DEFS) assert.ok(d.name && d.desc && d.icon && d.goal > 0, d.id + ' is complete');
  const s = fresh();
  // nothing is unlocked on a brand new cat
  assert.equal(A.summary(s).done, 0);
  // "Scoop the litter box 10 times"
  for (let i = 0; i < 9; i++) {
    s.room.litter.clumps.push('pee');
    G.Interactions.scoop(s, t0 + i * MIN);
  }
  assert.ok(!s.achievements.scoop10, 'nine is not ten');
  s.room.litter.clumps.push('pee');
  G.Interactions.scoop(s, t0 + 10 * MIN);
  assert.ok(s.achievements.scoop10, 'ten scoops: Poop Scooper Pro');
  // announced once
  const told = A.take(s);
  assert.ok(told.some((d) => d.id === 'scoop10'));
  assert.equal(A.take(s).length, 0, 'not announced twice');
  assert.ok(A.unclaimed(s).some((d) => d.id === 'scoop10'), 'still waiting to be claimed after the announcement');
  // other things people do
  G.Interactions.pet(s, t0 + 20 * MIN, 'belly', 0);
  for (let i = 0; i < 12; i++) G.Interactions.treat(s, t0 + (30 + i) * MIN);
  assert.ok(s.achievements.treat10, 'treats are counted');
  assert.ok(s.achievements.treat6, 'six treats in a day is a secret achievement');
  assert.ok(A.BY_ID.treat6.secret);
  // the cat\'s own doings count too, via the log
  G.State.log(s, { t: t0, type: 'zoomies', chaos: true });
  assert.ok(s.achievements.chaos, '3am zoomies');
  G.State.log(s, { t: t0, type: 'collected', item: 'goldBell' });
  assert.ok(s.achievements.goldBell);
  // counted by the screen layer, and "either happened or not" ones are only counted once
  A.bump(s, 'photo', 5, t0);
  assert.ok(s.achievements.photo5);
  A.mark(s, 'wx:rain', t0);
  A.mark(s, 'wx:rain', t0);
  assert.equal(A.count(s, 'wx:rain'), 1);
  assert.ok(s.achievements.rain);
  // time together and bond level are worked out, not counted
  const later = fresh();
  A.evaluate(later, t0 + 8 * DAY);
  assert.ok(later.achievements.days7 && !later.achievements.days30);
  later.stats.bond = 100;
  A.evaluate(later, t0);
  assert.ok(later.achievements.bond3 && !later.achievements.bond5);
  // the trophy page lists everything, with progress that never passes the goal
  for (const x of A.list(s, t0)) assert.ok(x.cur >= 0 && x.cur <= x.goal);
  // the "unlock N achievements" ones follow along; the last needs every other one
  const all = fresh();
  for (const d of A.DEFS.slice(0, -1)) all.achievements[d.id] = t0;
  A.evaluate(all, t0);
  assert.ok(all.achievements.metaAll, 'everything else done: Touch Grass');
  // old saves start with none
  const old = G.State.migrate({ ...fresh(), counts: undefined, achievements: undefined, achQueue: undefined });
  assert.equal(A.summary(old).done, 0);
  assert.ok(Array.isArray(old.achQueue));
});


test('bond: a gentler curve, roomier daily limits, streaks, and coins', () => {
  assert.deepEqual([...G.Catalog.LEVELS], [0, 25, 60, 110, 180, 270, 390, 540, 740, 1000]);
  const C = G.Progression.CAPS;
  assert.ok(C.pet === 20 && C.play === 20 && C.feed === 8 && C.invite === 4);
  // checking in on days in a row: more bond each day (up to +5 extra) and a coin, more at milestones
  const s = fresh();
  const coins0 = s.coins;
  const got = [];
  for (let d = 1; d <= 8; d++) {
    const b = s.stats.bond;
    const r = G.Progression.dailyVisit(s, t0 + d * DAY);
    got.push([r.streak, s.stats.bond - b]);
    assert.equal(G.Progression.dailyVisit(s, t0 + d * DAY + HOUR), null, 'once a day');
  }
  // (the day the cat arrived counts as the first day)
  assert.deepEqual(got.map((g) => g[0]), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(got[0][1] === 6 && got[3][1] === 9 && got[4][1] === 10 && got[7][1] === 10, 'streak bonus, capped at +5: ' + JSON.stringify(got));
  assert.ok(s.coins - coins0 >= 8 + 2 + 4, 'a coin a day, plus streak bonuses (and level-ups): ' + (s.coins - coins0));
  // missing a day starts the streak again
  const r = G.Progression.dailyVisit(s, t0 + 11 * DAY);
  assert.equal(r.streak, 1);
  assert.equal(s.flags.bestStreak, 9);
  // a level-up pays three coins
  const u = fresh();
  const c = u.coins;
  const res = G.Progression.addBond(u, G.Catalog.LEVELS[1], t0);
  assert.equal(res.levelUp, 2);
  assert.equal(u.coins - c, G.Progression.LEVEL_COINS);
  // reading the day's note: +1, once
  const n = fresh();
  const nb = n.stats.bond;
  assert.ok(G.Notes.read(n, t0).fresh);
  assert.equal(n.stats.bond, nb + 1);
  assert.equal(G.Notes.read(n, t0 + HOUR).fresh, false);
  assert.equal(n.stats.bond, nb + 1);
  // the first bit of cleaning each day: +1 extra
  const k = fresh();
  k.room.litter.clumps.push('pee');
  const kb = k.stats.bond;
  G.Interactions.scoop(k, t0);
  assert.equal(k.stats.bond, kb + 1, 'tidy box, first care of the day');
  k.room.litter.clumps.push('pee');
  G.Interactions.scoop(k, t0 + MIN);
  assert.equal(k.stats.bond, kb + 1, 'only the first one');
  // achievements pay bond and coins only when they are claimed
  const a = fresh();
  G.Achievements.bump(a, 'photo', 5, t0);
  const ab = a.stats.bond;
  const ac = a.coins;
  assert.ok(G.Achievements.unclaimed(a).some((d) => d.id === 'photo5'), 'unlocked and waiting');
  assert.equal(a.coins, ac, 'nothing is paid on unlock');
  assert.equal(a.stats.bond, ab);
  assert.ok(G.Achievements.take(a).some((d) => d.id === 'photo5'), 'announced');
  assert.equal(a.coins, ac, 'announcing pays nothing either');
  const cl = G.Achievements.claim(a, t0, ['photo5']);
  assert.deepEqual([...cl.list.map((d) => d.id)], ['photo5']);
  assert.ok(a.stats.bond >= ab + 2 && a.coins >= ac + 1, 'paid when claimed');
  assert.equal(G.Achievements.claim(a, t0, ['photo5']).list.length, 0, 'claimed once');
  assert.ok(!G.Achievements.unclaimed(a).some((d) => d.id === 'photo5'));
  // claiming everything waiting
  const c2 = fresh();
  G.Achievements.bump(c2, 'photo', 5, t0);
  G.Achievements.bump(c2, 'scoop', 10, t0);
  const waiting = G.Achievements.unclaimed(c2).length;
  assert.ok(waiting >= 2);
  const all = G.Achievements.claim(c2, t0);
  assert.equal(all.list.length, waiting);
  assert.equal(G.Achievements.unclaimed(c2).length, 0);
  // saves from before claiming existed: what was already announced counts as claimed
  const old = fresh();
  old.achievements = { photo5: t0, scoop10: t0, treat10: t0 };
  old.achQueue = ['treat10'];
  delete old.achClaimed;
  const m = G.State.migrate(old);
  assert.deepEqual([...Object.keys(m.achClaimed).sort()], ['photo5', 'scoop10']);
  assert.deepEqual([...G.Achievements.unclaimed(m).map((d) => d.id)], ['treat10'], 'the unannounced one is still waiting');
});

test('gachapon: costs coins, gives new things, duplicates pay some back', () => {
  assert.ok(G.Gacha.COST >= 5, 'spins are not cheap');
  const s = fresh();
  assert.equal(s.coins, G.Gacha.COST, 'enough for one spin to start with');
  const first = G.Gacha.spin(s, t0);
  assert.ok(first.ok && first.prize && !first.dup);
  assert.equal(s.coins, 0);
  assert.ok(G.Gacha.owned(s, first.prize.id));
  assert.equal(G.Gacha.spin(s, t0 + 1000).ok, false, 'no coins, no spin');
  if (first.prize.kind === 'item') assert.ok(G.Progression.isUnlocked(s, 'item:' + first.prize.id), 'a toy is ready to place in the room');
  // lots of spins: every prize shows up eventually, rarer ones less often, and repeats refund a coin
  s.coins = 1000;
  const seen = {};
  let dups = 0;
  for (let i = 0; i < 150; i++) {
    const before = s.coins;
    const r = G.Gacha.spin(s, t0 + i * 7000);
    seen[r.prize.rarity] = (seen[r.prize.rarity] || 0) + 1;
    if (r.dup) {
      dups++;
      assert.equal(s.coins, before - G.Gacha.COST + G.Gacha.REFUND);
    }
  }
  assert.equal(s.gacha.owned.length, G.Gacha.PRIZES.length, 'everything collected');
  assert.ok(seen.common > seen.rare && seen.rare > seen.legendary, JSON.stringify(seen));
  assert.ok(dups > 0);
  assert.ok(s.achievements.gacha1 && s.achievements.gacha10 && s.achievements.gachaDup && s.achievements.gachaAll);
  // wearable only once won
  const t = fresh();
  assert.equal(G.Gacha.canWear(t, 'extra', 'crown'), false);
  assert.equal(G.Gacha.canWear(t, 'extra', 'bell'), true, 'the usual extras are always there');
  t.gacha.owned.push('extra:crown');
  assert.equal(G.Gacha.canWear(t, 'extra', 'crown'), true);
  // every prize has its catalogue entry
  for (const p of G.Gacha.PRIZES) {
    if (p.kind === 'item') assert.ok(G.Catalog.ITEMS[p.id] && G.Catalog.ITEMS[p.id].gacha, p.id);
    else if (p.kind === 'skin') assert.ok(G.Gacha.PIECES.some((x) => x.id === p.ref.split(':')[0]), p.id);
    else assert.ok((p.kind === 'extra' ? G.Coats.EXTRAS : G.Coats.COLLARS).some((x) => x.id === p.ref && x.gacha), p.id);
  }
  // old saves get enough for a spin and an empty collection
  const old = G.State.migrate({ ...fresh(), coins: undefined, gacha: undefined });
  assert.equal(old.coins, G.Gacha.COST);
  assert.equal(old.gacha.owned.length, 0);
  assert.equal(G.Achievements.DEFS.find((d) => d.id === 'gachaAll').goal, G.Gacha.PRIZES.length, 'collect-them-all counts every prize');
});

test('set pieces: curtain climbing, missed pounces, toppling off the sill, a paw in the water', () => {
  const where = { curtain: 'curtain', pounce: 'rug', topple: 'sill', drink: 'water' };
  for (const [id, spot] of Object.entries(where)) {
    const s = fresh();
    assert.ok(G.Sim.BEHAVIORS[id] && G.Catalog.SPOTS[spot], id + ' exists');
    G.Sim.setActivity(s, t0, id, spot);
    assert.ok(!/being a cat/.test(G.Sim.describe(s)), id + ' has its own status line');
    assert.ok(G.Interactions.moodOf(s), 'still has a mood');
    G.Sim.advance(s, s.activity.end + 1000);
    assert.ok(s.log.some((e) => e.type === id), id + ' is logged for the diary and achievements');
  }
  // the achievements count them
  const a = fresh();
  G.Sim.setActivity(a, t0, 'curtain', 'curtain');
  G.Sim.advance(a, a.activity.end + 1000);
  assert.ok(a.achievements.curtain1, 'Curtain Cowboy');
  // each only happens where it makes sense
  const s = fresh();
  s.bowl.portions = 9;
  const seen = { curtain: 0, pounce: 0, topple: 0, drink: 0 };
  for (let i = 0; i < 4000; i++) {
    const n = G.Sim.chooseNext(s, t0 + i * 7919 * 1000, true);
    if (n.id in seen) {
      seen[n.id]++;
      if (n.id === 'curtain') assert.equal(n.spot, 'curtain');
      if (n.id === 'drink') assert.equal(n.spot, 'water');
      if (n.id === 'topple') assert.ok(['sill', 'slot0', 'slot1', 'slot2', 'slot3'].includes(n.spot));
      if (n.id === 'pounce') assert.ok(['rug', 'floorL', 'floorR'].includes(n.spot));
    }
  }
  for (const id of Object.keys(seen)) assert.ok(seen[id] > 0, id + ' does come up (' + seen[id] + ')');
  // a bored cat climbs the curtains far more than a happy one
  const climbs = (happy) => {
    const x = fresh();
    x.bowl.portions = 9;
    x.stats.happiness = happy;
    let n = 0;
    for (let i = 0; i < 3000; i++) {
      x.stats.happiness = happy;
      if (G.Sim.chooseNext(x, t0 + i * 7919 * 1000, true).id === 'curtain') n++;
    }
    return n;
  };
  const bored = climbs(15);
  const content = climbs(90);
  assert.ok(bored > content * 3, 'bored ' + bored + ' vs happy ' + content);
});

test('new toys: unlock with bond, and old saves get them; the cat fetches by how it feels', () => {
  assert.deepEqual(['mouse', 'launcher', 'bubbles'].map((id) => G.Catalog.TOYS[id].level), [2, 4, 5]);
  // a new game only has the feather; a save that is already at level 5 gets the rest
  const fresh1 = fresh();
  assert.ok(G.Progression.isUnlocked(fresh1, 'toy:feather') && !G.Progression.isUnlocked(fresh1, 'toy:launcher'));
  const old = fresh();
  old.stats.bond = 200;
  old.unlocked = old.unlocked.filter((k) => !['toy:mouse', 'toy:laser', 'toy:launcher', 'toy:bubbles'].includes(k));
  const m = G.State.migrate(old);
  for (const k of ['toy:mouse', 'toy:laser', 'toy:launcher', 'toy:bubbles']) assert.ok(m.unlocked.includes(k), k);
  assert.ok(m.unseenUnlocks.includes('toy:launcher'), 'and you are told');
  // the ball launcher: the cat decides
  const rate = (setup, hour = 8) => {
    let fetched = 0;
    const n = 500;
    for (let i = 0; i < n; i++) {
      const x = fresh();
      x.seed += i;
      x.stats.bond = 200;
      setup(x);
      const t = new Date(2026, 9, 9, hour, 0).getTime() + i * 997;
      x.activity = { id: 'sit', spot: 'rug', key: 'rug', pose: 'sit', start: t, end: t + HOUR, facing: 1 };
      const d = G.Interactions.launchDecision(x, t);
      assert.ok(['fetch', 'chase', 'watch', 'ignore'].includes(d.kind) && d.say, 'a decision with a line');
      if (d.kind === 'fetch') fetched++;
    }
    return fetched / n;
  };
  const eager = rate((x) => Object.assign(x.stats, { happiness: 92, energy: 85, fullness: 70 }));
  const meh = rate((x) => Object.assign(x.stats, { happiness: 55, energy: 55, fullness: 70 }));
  const grumpy = rate((x) => Object.assign(x.stats, { happiness: 15, energy: 60, fullness: 70 }));
  const hungry = rate((x) => Object.assign(x.stats, { happiness: 80, energy: 70, fullness: 8 }));
  const sleepy = rate((x) => Object.assign(x.stats, { happiness: 80, energy: 8, fullness: 70 }));
  assert.ok(eager > 0.65 && eager > meh && meh > grumpy, `eager ${eager}, meh ${meh}, grumpy ${grumpy}`);
  assert.ok(grumpy < 0.2 && hungry < eager - 0.2 && sleepy === 0, `hungry ${hungry}, sleepy ${sleepy}`);
  // evenings are the cat's time
  const evening = rate((x) => Object.assign(x.stats, { happiness: 55, energy: 55, fullness: 70 }), 19);
  assert.ok(evening > meh, `evening ${evening} vs morning ${meh}`);
  // a sleeping cat does not even look up
  const asleep = fresh();
  asleep.activity = { id: 'nap', spot: 'rug', key: 'rug', pose: 'curl', start: t0, end: t0 + HOUR, facing: 1 };
  for (let i = 0; i < 50; i++) assert.equal(G.Interactions.launchDecision(asleep, t0 + i).kind, 'ignore');
});

test('the wall note follows the cat when it is renamed', () => {
  const s = fresh();
  const oldName = s.cat.name;
  // find a day whose note is a wish ("{name} would like to say")
  let t = t0;
  while (G.Notes.today(s, t).kind !== 'wish') t += DAY;
  assert.equal(G.Notes.today(s, t).head, oldName + ' would like to say');
  assert.ok(G.Interactions.rename(s, t, 'Biscuit').ok);
  const n = G.Notes.today(s, t);
  assert.equal(n.head, 'Biscuit would like to say', 'the heading uses the new name');
  assert.ok(!n.text.includes(oldName) && !n.head.includes(oldName));
  // earlier notes read the same way
  assert.ok(G.Notes.earlier(s, t + 5 * DAY, 3).every((x) => !x.head.includes(oldName)));
  // a note saved by an older version (name already written in) is put right too
  const old = fresh();
  const n0 = { day: G.Clock.dayKey(t), kind: 'wish', head: oldName + ' would like to say', text: oldName + ' wants a snack, not ' + oldName + 'ton.' };
  old.notes = [n0];
  G.Interactions.rename(old, t, 'Biscuit');
  const v = G.Notes.today(old, t);
  assert.equal(v.head, 'Biscuit would like to say');
  assert.equal(v.text, 'Biscuit wants a snack, not ' + oldName + 'ton.', 'only the whole name changes');
});

test('furniture colours: only ones you have won, and back to the original', () => {
  const s = fresh();
  assert.equal(G.Gacha.skinOf(s, 'clock'), '');
  assert.equal(G.Gacha.setSkin(s, 'clock', 'pink'), false, 'not won yet');
  assert.equal(G.Gacha.skinOf(s, 'clock'), '');
  s.gacha.owned.push('skin:clock:pink', 'skin:clock:midnight', 'skin:rug:blue');
  assert.equal(G.Gacha.skinsFor(s, 'clock').join(), 'pink,midnight');
  assert.ok(G.Gacha.setSkin(s, 'clock', 'pink'));
  assert.equal(G.Gacha.skinOf(s, 'clock'), 'pink');
  assert.equal(G.Gacha.skinOf(s, 'rug'), '', 'won but not used');
  G.Gacha.setSkin(s, 'clock', '');
  assert.equal(G.Gacha.skinOf(s, 'clock'), '');
  // changing colours counts toward the achievement
  for (let i = 0; i < 5; i++) G.Achievements.bump(s, 'restyle', 1, t0 + i);
  assert.ok(s.achievements.restyle5);
});

test('room spots: four of them, and older three-spot saves keep their items', () => {
  assert.equal(fresh().room.slots.length, 4);
  const old = fresh();
  old.room.slots = ['scratcher', 'cushion', 'box'];
  old.activity = { id: 'sit', spot: 'slot2', key: 'box', pose: 'sit', start: t0, end: t0 + HOUR, facing: 1 };
  const m = G.State.migrate(old);
  assert.equal(m.room.slots.length, 4);
  assert.equal(m.room.slots[0], 'scratcher');
  assert.equal(m.room.slots[1], null, 'the new spot starts empty');
  assert.equal(m.room.slots[2], 'cushion');
  assert.equal(m.room.slots[3], 'box');
  assert.equal(m.activity.spot, 'slot3', 'the cat stays on the box');
});

test("what's new: shown once to saves that haven't seen it, never to a new adoption's follow-ups", () => {
  const U = G.Updates;
  assert.equal(U.latest().v, U.VERSION, 'newest release matches the version');
  assert.ok(U.RELEASES.every((r) => r.date && r.name && r.title && r.summary && r.items.length > 0 && r.items.every((i) => i.title && i.text && i.icon)), 'every release has what the list and its page need');
  assert.deepEqual(U.RELEASES.map((r) => r.v), U.RELEASES.map((r) => r.v).sort((a, b) => b - a), 'newest first');
  const old = G.State.migrate(JSON.parse(JSON.stringify(fresh())));
  delete old.flags.updatesSeen; // a save from before the pop-up existed
  assert.ok(U.pending(G.State.migrate(old)), 'old saves see it');
  const s = fresh();
  assert.ok(U.pending(s));
  U.markSeen(s);
  assert.ok(!U.pending(s), 'gone once seen');
  s.flags.updatesSeen = U.VERSION - 1;
  assert.ok(U.pending(s), 'a newer release shows it again');
});

test('shop: buy a look with coins, keep it, switch back to the original', () => {
  const Sh = G.Shop;
  const s = fresh();
  s.coins = 30;
  assert.equal(Sh.styleOf(s, 'chair'), '', 'starts with the original');
  const cheap = Sh.find('chair', 'garden');
  assert.equal(cheap.price, Sh.TIERS.L[0]);
  assert.equal(Sh.find('laptop', 'slim').price, Sh.TIERS.S[0], 'small pieces are cheaper');
  const r = Sh.buy(s, 'chair', 'garden');
  assert.ok(r.ok);
  assert.equal(s.coins, 30 - cheap.price);
  assert.equal(Sh.styleOf(s, 'chair'), 'garden', 'bought looks go on straight away');
  assert.equal(Sh.buy(s, 'chair', 'garden').ok, false, 'no buying twice');
  assert.equal(s.coins, 30 - cheap.price, 'and no second charge');
  assert.equal(Sh.use(s, 'chair', ''), true);
  assert.equal(Sh.styleOf(s, 'chair'), '', 'back to the original');
  assert.equal(Sh.use(s, 'chair', 'garden'), true, 'owned looks can be put back on');
  assert.equal(Sh.use(s, 'chair', 'egg'), false, 'but not ones you have not bought');
  const poor = fresh();
  poor.coins = 3;
  const no = Sh.buy(poor, 'chair', 'sofa');
  assert.ok(!no.ok && no.need > 0);
  assert.equal(poor.coins, 3, 'nothing is taken when you cannot afford it');
  assert.equal(Sh.buy(s, 'chair', 'nope').ok, false);
  assert.equal(Sh.buy(s, 'nope', 'garden').ok, false);
  // every piece has three looks, cheapest first
  for (const p of Sh.PIECES) {
    assert.equal(p.styles.length, 3, p.id + ' has three looks');
    assert.ok(p.styles.every((x) => x.id && x.name && x.tag));
  }
  assert.equal(Sh.PIECES.length, 10);
  // old saves have no shop yet and get an empty one
  const old = fresh();
  delete old.shop;
  assert.deepEqual(JSON.parse(JSON.stringify(G.State.migrate(old).shop)), { owned: [], using: {} });
  // looks follow the colour a piece is painted in, so the two never fight: both live in the save
  G.Gacha.setSkin(s, 'chair', ''); // no colour won: still fine
  assert.equal(Sh.styleOf(s, 'chair'), 'garden');
});

test('shop: every look in the catalogue has a drawing', () => {
  const ctx2 = vm.createContext({ console, Math, Date, JSON });
  const nop = () => '';
  ctx2.CatGame = { RoomArt: { draw: { K: {}, S: nop, R: nop, E: nop, L: nop, mix: (a) => a } } };
  vm.runInContext(readFileSync(path.join(dir, '../js/ui/shopArt.js'), 'utf8'), ctx2, { filename: 'shopArt' });
  const A = ctx2.CatGame.ShopArt;
  for (const p of G.Shop.PIECES) for (const x of p.styles) assert.equal(typeof A[p.id][x.id], 'function', p.id + '/' + x.id + ' is drawn');
});

test('more ways to earn coins: new treasures, the real coin, and daily care', () => {
  const s = fresh();
  s.room.gifts = [{ id: 'leaf' }, { id: 'leaf' }, { id: 'goldBell' }, { id: 'coin' }, { id: 'coin' }];
  const c0 = s.coins;
  const a = G.Interactions.collectGift(s, t0, 0);
  assert.equal(a.coins, 1, 'a new common treasure pays a coin');
  const b = G.Interactions.collectGift(s, t0, 0);
  assert.equal(b.coins, 0, 'the same treasure again pays nothing');
  const bell = G.Interactions.collectGift(s, t0, 0);
  assert.equal(bell.coins, 4, 'a legendary one pays more');
  const coin1 = G.Interactions.collectGift(s, t0, 0);
  assert.equal(coin1.coins, 3, 'a new rare treasure (2) plus the coin itself (1)');
  const coin2 = G.Interactions.collectGift(s, t0, 0);
  assert.equal(coin2.coins, 1, 'a 50 sen coin is worth a coin every time');
  assert.equal(s.coins, c0 + 1 + 4 + 3 + 1);
  // daily care: fed, played with, and tidied up, in one day
  const d = fresh();
  assert.equal(G.Progression.payDailyGoals(d, t0), 0, 'nothing done yet');
  G.Interactions.feed(d, t0, 'kibble');
  d.daily.play = 1;
  assert.equal(G.Progression.payDailyGoals(d, t0), 0, 'two of three');
  d.room.litter.clumps.push('pee');
  G.Interactions.scoop(d, t0 + MIN);
  const before = d.coins;
  assert.equal(G.Progression.payDailyGoals(d, t0 + MIN), G.Progression.CARE_COINS, 'all three: the bonus');
  assert.equal(d.coins, before + G.Progression.CARE_COINS);
  assert.equal(G.Progression.payDailyGoals(d, t0 + 2 * MIN), 0, 'once a day');
  assert.equal(G.Progression.payDailyGoals(d, t0 + DAY + MIN), 0, 'a new day starts again from nothing');
});

console.log(`\n${passed} checks passed`);
