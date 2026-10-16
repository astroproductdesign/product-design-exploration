// The shop: spend cat coins on new looks for the furniture that can't be moved. Every piece keeps
// its place and its job (the cat still naps on the chair, sits on the table); only the look
// changes. Each piece has three looks to buy and its original one, which is always free.
// The drawings are in js/ui/shopArt.js. No drawing here.
(function (G) {
  'use strict';

  // Price by size of piece: the cheapest look first. Easy to tune.
  const TIERS = { L: [12, 18, 24], S: [8, 12, 16] };

  // tag: how the look feels (Cute, Pretty, Cool, Modern). Looks run cheapest to dearest.
  const PIECES = [
    { id: 'chair', name: 'Chair', base: 'Camping chair', size: 'L', styles: [
      { id: 'garden', name: 'Garden chair', tag: 'Pretty' },
      { id: 'sofa', name: '1-seater sofa', tag: 'Cute' },
      { id: 'egg', name: 'Egg pod chair', tag: 'Modern' },
    ] },
    { id: 'table', name: 'Dining table', base: 'Wooden table', size: 'L', styles: [
      { id: 'picnic', name: 'Picnic table', tag: 'Cute' },
      { id: 'hairpin', name: 'Hairpin table', tag: 'Modern' },
      { id: 'industrial', name: 'Industrial table', tag: 'Cool' },
    ] },
    { id: 'laptop', name: 'Laptop', base: 'Silver laptop', size: 'S', styles: [
      { id: 'slim', name: 'Slim laptop', tag: 'Modern' },
      { id: 'kitty', name: 'Kitty laptop', tag: 'Cute' },
      { id: 'gaming', name: 'Gaming laptop', tag: 'Cool' },
    ] },
    { id: 'desk', name: 'TV desk', base: 'Wooden dresser', size: 'L', styles: [
      { id: 'cabinet', name: 'Pastel cabinet', tag: 'Cute' },
      { id: 'shelf', name: 'Shelf unit', tag: 'Modern' },
      { id: 'retro', name: 'Retro console', tag: 'Cool' },
    ] },
    { id: 'rug', name: 'Rug', base: 'Round red rug', size: 'L', styles: [
      { id: 'paw', name: 'Paw-print rug', tag: 'Cute' },
      { id: 'flower', name: 'Flower rug', tag: 'Pretty' },
      { id: 'zigzag', name: 'Zigzag rug', tag: 'Modern' },
    ] },
    { id: 'litter', name: 'Litter box', base: 'Mint tray', size: 'S', styles: [
      { id: 'crate', name: 'Wooden crate', tag: 'Pretty' },
      { id: 'kitty', name: 'Kitty tray', tag: 'Cute' },
      { id: 'modern', name: 'Slim modern box', tag: 'Modern' },
    ] },
    { id: 'lamp', name: 'Lamp', base: 'Yellow shade', size: 'S', styles: [
      { id: 'globe', name: 'Globe lamp', tag: 'Modern' },
      { id: 'kitty', name: 'Kitty lamp', tag: 'Cute' },
      { id: 'flower', name: 'Flower lamp', tag: 'Pretty' },
    ] },
    { id: 'curtains', name: 'Curtains', base: 'Cream curtains', size: 'L', styles: [
      { id: 'paws', name: 'Paw-print curtains', tag: 'Cute' },
      { id: 'garden', name: 'Garden curtains', tag: 'Pretty' },
      { id: 'starry', name: 'Starry curtains', tag: 'Cool' },
    ] },
    { id: 'clock', name: 'Clock', base: 'Cat-ear clock', size: 'S', styles: [
      { id: 'minimal', name: 'Minimal clock', tag: 'Modern' },
      { id: 'bow', name: 'Bow clock', tag: 'Cute' },
      { id: 'sunflower', name: 'Sunflower clock', tag: 'Pretty' },
    ] },
    { id: 'bowls', name: 'Food and water bowls', base: 'Red and blue bowls', size: 'S', styles: [
      { id: 'stand', name: 'Wooden stand', tag: 'Pretty' },
      { id: 'kitty', name: 'Kitty bowls', tag: 'Cute' },
      { id: 'fountain', name: 'Steel and fountain', tag: 'Modern' },
    ] },
  ];

  const BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p]));

  function find(piece, style) {
    const p = BY_ID[piece];
    if (!p) return null;
    const i = p.styles.findIndex((x) => x.id === style);
    return i < 0 ? null : { piece: p, style: p.styles[i], price: TIERS[p.size][i] };
  }

  const key = (piece, style) => piece + ':' + style;
  const shop = (s) => s.shop || (s.shop = { owned: [], using: {} });
  const owns = (s, piece, style) => shop(s).owned.includes(key(piece, style));

  // The look a piece wears ('' for its original one).
  function styleOf(s, piece) {
    const v = (s.shop && s.shop.using && s.shop.using[piece]) || '';
    return v && owns(s, piece, v) ? v : '';
  }

  // Buy a look (and put it on). Costs coins; you keep it for good.
  function buy(s, piece, style) {
    const f = find(piece, style);
    if (!f) return { ok: false };
    if (owns(s, piece, style)) return { ok: false, owned: true };
    if ((s.coins || 0) < f.price) return { ok: false, need: f.price - (s.coins || 0) };
    s.coins -= f.price;
    shop(s).owned.push(key(piece, style));
    shop(s).using[piece] = style;
    return { ok: true, price: f.price, name: f.style.name };
  }

  // Put on a look you own, or '' for the original.
  function use(s, piece, style) {
    if (!BY_ID[piece]) return false;
    if (style && !owns(s, piece, style)) return false;
    if (style) shop(s).using[piece] = style;
    else delete shop(s).using[piece];
    return true;
  }

  const countOwned = (s) => shop(s).owned.length;
  const total = () => PIECES.reduce((n, p) => n + p.styles.length, 0);

  G.Shop = { TIERS, PIECES, BY_ID, find, owns, styleOf, buy, use, countOwned, total };
})(globalThis.CatGame = globalThis.CatGame || {});
