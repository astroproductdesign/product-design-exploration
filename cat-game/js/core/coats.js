// Cat looks: breed presets, the mix-your-own options, and matching a coat
// from a photo. A coat is tiny on purpose:
//   { preset, base, pattern, white }
//   base:    one of SWATCHES (hex)
//   pattern: 'plain' | 'stripes' | 'patches' | 'points'
//   white:   'none' | 'chest' | 'face'
// Stripe, patch and point colours are derived from the base, so every
// combination stays in the game's palette (docs/art-style.md).
(function (G) {
  'use strict';

  const SWATCHES = [
    { id: 'cream', name: 'Cream', hex: '#f3e6cc' },
    { id: 'white', name: 'White', hex: '#fcfcfc' },
    { id: 'ginger', name: 'Ginger', hex: '#e8a35a' },
    { id: 'brown', name: 'Brown', hex: '#a8957c' },
    { id: 'grey', name: 'Silver', hex: '#b9b4ad' },
    { id: 'blue', name: 'Blue-grey', hex: '#8f98a3' },
    { id: 'choc', name: 'Chocolate', hex: '#8a6448' },
    { id: 'black', name: 'Black', hex: '#3a3330' },
  ];
  const HEX = Object.fromEntries(SWATCHES.map((s) => [s.id, s.hex]));

  const PATTERNS = [
    { id: 'plain', name: 'Solid' },
    { id: 'stripes', name: 'Tabby stripes' },
    { id: 'patches', name: 'Patches' },
    { id: 'points', name: 'Colour-point' },
  ];
  const WHITES = [
    { id: 'none', name: 'None' },
    { id: 'chest', name: 'Chest & paws' },
    { id: 'face', name: 'Face & chest' },
  ];

  const coat = (base, pattern, white) => ({ base: HEX[base], pattern, white });
  const PRESETS = [
    { id: 'mochi', name: 'Tabby & white', coat: coat('brown', 'stripes', 'face') },
    { id: 'orange', name: 'Orange tabby', coat: coat('ginger', 'stripes', 'chest') },
    { id: 'calico', name: 'Calico', coat: coat('ginger', 'patches', 'face') },
    { id: 'tortie', name: 'Tortoiseshell', coat: coat('black', 'patches', 'none') },
    { id: 'tuxedo', name: 'Tuxedo', coat: coat('black', 'plain', 'face') },
    { id: 'black', name: 'Black cat', coat: coat('black', 'plain', 'none') },
    { id: 'white', name: 'White cat', coat: coat('white', 'plain', 'none') },
    { id: 'american', name: 'American Shorthair', coat: coat('grey', 'stripes', 'chest') },
    { id: 'british', name: 'British Shorthair', coat: coat('blue', 'plain', 'none') },
    { id: 'siamese', name: 'Siamese', coat: coat('cream', 'points', 'none') },
    { id: 'ragdoll', name: 'Ragdoll', coat: coat('cream', 'points', 'chest') },
  ];

  const DEFAULT = Object.assign({ preset: 'mochi' }, PRESETS[0].coat);

  // ---- colour maths ------------------------------------------------------------------

  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, f) => {
    const A = rgb(a);
    const B = rgb(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * f));
  };
  const lum = (hex) => {
    const [r, g, b] = rgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };
  const INK = '#1b1714';

  // Every colour the drawing needs, from the tiny coat record.
  function colors(c) {
    c = normalize(c);
    const base = c.base;
    const dark = lum(base) < 0.3;
    const stripe = dark ? mix(base, '#ffffff', 0.2) : mix(base, INK, lum(base) > 0.85 ? 0.22 : 0.4);
    const patch = base === HEX.ginger ? HEX.black : HEX.ginger;
    const point = lum(base) > 0.8 ? '#6b4a36' : mix(base, INK, 0.5);
    return { base, far: mix(base, INK, 0.09), stripe, patch, point };
  }

  function normalize(c) {
    c = c || {};
    const out = Object.assign({}, DEFAULT, c);
    if (!SWATCHES.some((s) => s.hex === out.base)) out.base = DEFAULT.base;
    if (!PATTERNS.some((p) => p.id === out.pattern)) out.pattern = DEFAULT.pattern;
    if (!WHITES.some((w) => w.id === out.white)) out.white = DEFAULT.white;
    if (out.preset && !PRESETS.some((p) => p.id === out.preset)) out.preset = null;
    return out;
  }

  function fromPreset(id) {
    const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
    return Object.assign({ preset: p.id }, p.coat);
  }

  // If a hand-made coat happens to equal a preset, call it by that name.
  function matchPreset(c) {
    const p = PRESETS.find((x) => x.coat.base === c.base && x.coat.pattern === c.pattern && x.coat.white === c.white);
    return p ? p.id : null;
  }

  function describe(c) {
    c = normalize(c);
    const p = c.preset && PRESETS.find((x) => x.id === c.preset);
    if (p) return p.name;
    const sw = SWATCHES.find((s) => s.hex === c.base);
    const pat = { plain: 'solid', stripes: 'tabby', patches: 'patched', points: 'colour-point' }[c.pattern];
    const wh = { none: '', chest: ' · white chest & paws', face: ' · white face, chest & paws' }[c.white];
    return `${sw ? sw.name : 'Custom'} ${pat}${wh}`;
  }

  // ---- matching a photo ---------------------------------------------------------------

  // See photoread.js. `taps` (optional): [main fur point, stripe/patch point].
  function fromPhoto(data, w, h, taps, opts) {
    return G.PhotoRead.analyze(data, w, h, taps, opts).coat;
  }

  G.Coats = { SWATCHES, PATTERNS, WHITES, PRESETS, DEFAULT, colors, normalize, fromPreset, matchPreset, describe, fromPhoto };
})(globalThis.CatGame = globalThis.CatGame || {});
