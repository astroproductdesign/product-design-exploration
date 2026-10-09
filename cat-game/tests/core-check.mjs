// Checks the game logic without a browser:  node cat-game/tests/core-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = ['random', 'clock', 'profile', 'coats', 'photoread', 'catalog', 'state', 'storage', 'progression', 'sim', 'interactions', 'journal'];
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

test('bond only goes up', () => {
  const s = fresh();
  let last = 0;
  for (let i = 0; i < 300; i++) {
    const t = t0 + i * 7 * MIN;
    G.Sim.advance(s, t, { live: true });
    const r = i % 5;
    if (r === 0) G.Interactions.pet(s, t, ['head', 'chin', 'back', 'belly'][i % 4], i % 13);
    if (r === 1) G.Interactions.call(s, t);
    if (r === 2) G.Interactions.treat(s, t);
    if (r === 3) G.Interactions.feed(s, t, 'kibble');
    assert.ok(s.stats.bond >= last);
    last = s.stats.bond;
  }
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

console.log(`\n${passed} checks passed`);
