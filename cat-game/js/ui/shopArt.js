// The shop's furniture: three new looks for each upgradeable piece, drawn in the room's own style
// (one ink line, flat fills). Every look sits in exactly the same place and footprint as the
// original, so nothing moves and the cat's spots still line up.
//
// A look that can be recoloured from the gachapon takes the piece's colour palette `p` (see
// RoomArt.SKINS) and paints its main surfaces with it; with no colour chosen (`p` is null) it
// uses its own colours. Coordinates are the room's own, before each piece is slid sideways.
(function (G) {
  'use strict';

  const { K, S, R, E, L, mix } = G.RoomArt.draw;
  const col = (p, key, def) => (p && p[key]) || def;
  const dot = (x, y, r, fill, sw) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${K.line}" stroke-width="${sw || 1.5}"/>`;
  const CREAM = '#fffdf6';

  // ---- Chair (x 566–714, y 290–486; the cat sits at about y 404) ---------------------------

  const chair = {
    // A white-painted wooden garden armchair with a slatted back and a flowery cushion.
    garden(p) {
      const cush = col(p, 'canvas', '#f4accc');
      return (
        S('M 596 398 L 596 314 Q 596 292 640 292 Q 684 292 684 314 L 684 398 Z', CREAM, 3) +
        L('M 614 304 L 614 392 M 632 297 L 632 392 M 650 297 L 650 392 M 668 304 L 668 392', '#dcc7a2', 2.5) +
        R(580, 372, 10, 112, CREAM, 3, 2.5) +
        R(692, 372, 10, 112, CREAM, 3, 2.5) +
        R(566, 362, 44, 10, CREAM, 4, 2.5) +
        R(672, 362, 44, 10, CREAM, 4, 2.5) +
        R(588, 452, 106, 7, CREAM, 2, 2.5) +
        R(578, 396, 126, 12, CREAM, 4, 3) +
        R(586, 382, 110, 18, cush, 9, 3) +
        [604, 626, 648, 670].map((x, i) => dot(x + (i % 2) * 4, 391, 2.6, CREAM, 1.2)).join('')
      );
    },
    // A round pink 1-seater sofa with a heart-patched cushion.
    sofa(p) {
      const a = col(p, 'canvas', '#f4accc');
      const b = col(p, 'seam', '#ee8fb8');
      const c = mix(a, '#ffffff', 0.4);
      return (
        R(588, 306, 104, 100, a, 24, 3) +
        R(566, 346, 36, 84, b, 17, 3) +
        R(678, 346, 36, 84, b, 17, 3) +
        R(592, 380, 96, 34, c, 14, 3) +
        R(572, 408, 136, 36, b, 12, 3) +
        R(582, 442, 11, 44, K.woodDark, 3, 2.5) +
        R(687, 442, 11, 44, K.woodDark, 3, 2.5) +
        [[618, 338], [640, 330], [662, 338]].map(([x, y]) => dot(x, y, 3.2, b, 1.5)).join('') +
        `<g transform="rotate(-12 612 366)">${R(598, 350, 30, 30, CREAM, 7, 2.5)}` +
        S('M 613 372 C 603 366 604 358 609 358 C 612 358 613 361 613 361 C 613 361 614 358 617 358 C 622 358 623 366 613 372 Z', '#ff6f91', 1.6) +
        `</g>`
      );
    },
    // A modern egg pod on a steel stand, with a snug cushion inside.
    egg(p) {
      const cush = col(p, 'canvas', K.mint);
      return (
        R(634, 436, 12, 48, '#8a8780', 3, 2.5) +
        E(640, 486, 48, 8, '#d8d4cc', 3) +
        S('M 640 290 Q 702 290 706 374 Q 708 444 640 448 Q 572 444 574 374 Q 578 290 640 290 Z', '#e6e2da', 3) +
        S('M 640 306 Q 690 306 692 376 Q 694 428 640 432 Q 586 428 588 376 Q 590 306 640 306 Z', '#fcf4ec', 2.5) +
        E(640, 406, 46, 14, cush, 3) +
        E(668, 380, 12, 12, mix(cush, '#ffffff', 0.35), 2.5)
      );
    },
  };

  // ---- Dining table (x 742–950, top at y 344, legs down to 494; the litter box sits between) --

  const table = {
    // A picnic table in a pink gingham cloth with scalloped edges and cream legs.
    picnic() {
      let cloth = 'M 744 358 L 948 358 L 948 372';
      for (let k = 0; k < 10; k++) cloth += ` Q ${(948 - k * 20.4 - 10.2).toFixed(1)} 387 ${(948 - (k + 1) * 20.4).toFixed(1)} 372`;
      cloth += ' Z';
      let checks = '';
      for (let k = 0; k < 10; k += 2) checks += `<rect x="${(744 + k * 20.4).toFixed(1)}" y="358" width="20.4" height="26" fill="#fff" opacity=".55"/>`;
      return (
        R(764, 372, 10, 122, CREAM, 4, 2.5) +
        R(918, 372, 10, 122, CREAM, 4, 2.5) +
        R(764, 482, 10, 12, '#f4accc', 3, 2.5) +
        R(918, 482, 10, 12, '#f4accc', 3, 2.5) +
        `<clipPath id="cloth-clip"><path d="${cloth}"/></clipPath>` +
        S(cloth, '#f4accc', 3) +
        `<g clip-path="url(#cloth-clip)">${checks}</g>` +
        R(742, 344, 208, 16, '#fad3df', 5, 3)
      );
    },
    // Black steel pipes under a chunky wooden top.
    industrial() {
      return (
        R(762, 360, 9, 134, '#2b2f3a', 2, 2.5) +
        R(921, 360, 9, 134, '#2b2f3a', 2, 2.5) +
        R(770, 364, 152, 8, '#2b2f3a', 2, 2.5) +
        R(770, 462, 152, 7, '#2b2f3a', 2, 2.5) +
        R(754, 490, 26, 6, '#2b2f3a', 2, 2.5) +
        R(912, 490, 26, 6, '#2b2f3a', 2, 2.5) +
        R(742, 344, 208, 20, '#c98b4e', 3, 3) +
        L('M 744 354 L 948 354', K.woodDark, 2) +
        L('M 786 346 L 786 362 M 846 346 L 846 362 M 904 346 L 904 362', K.woodDark, 1.8)
      );
    },
    // A slim white top on gold hairpin legs.
    hairpin() {
      const leg = (x1, x2) => L(`M ${x1} 358 L ${x2} 494`, K.line, 9) + L(`M ${x1} 358 L ${x2} 494`, '#ecbc44', 4.5);
      return (
        leg(772, 758) + leg(772, 786) + leg(920, 906) + leg(920, 934) +
        R(742, 344, 208, 14, '#fbf8f2', 7, 3) +
        L('M 752 351 L 940 351', '#e3dccd', 2)
      );
    },
  };

  // ---- Laptop (x 838–906, y 292–342) --------------------------------------------------------

  const laptop = {
    // A pastel laptop with a cat-face sticker on the lid.
    kitty() {
      return (
        S('M 840 342 L 900 342 L 906 336 L 846 336 Z', '#f4accc', 2.5) +
        S('M 846 336 L 838 292 L 892 292 L 900 336 Z', '#ffd9e2', 2.5) +
        S('M 860 309 L 861 298 L 868 304 Z', CREAM, 1.8) +
        S('M 878 309 L 877 298 L 870 304 Z', CREAM, 1.8) +
        E(869, 314, 10, 8.5, CREAM, 1.8) +
        `<circle cx="865" cy="313" r="1.3" fill="${K.line}"/><circle cx="873" cy="313" r="1.3" fill="${K.line}"/>` +
        S('M 867.5 316 L 870.5 316 L 869 318 Z', '#ff6f91', 1)
      );
    },
    // A dark gaming laptop with a light strip and a sharp logo.
    gaming() {
      return (
        S('M 840 342 L 900 342 L 906 336 L 846 336 Z', '#2b2f3a', 2.5) +
        S('M 846 336 L 838 292 L 892 292 L 900 336 Z', '#3a3f4d', 2.5) +
        L('M 844 328 L 850 328', '#ff4f86', 3.4) +
        L('M 850 328 L 870 328', '#ecbc44', 3.4) +
        L('M 870 328 L 896 328', K.mint, 3.4) +
        S('M 862 318 L 869 303 L 876 318 L 869 313 Z', '#ff4f86', 2)
      );
    },
    // A thin silver laptop with one small ring for a logo.
    slim() {
      return (
        S('M 840 342 L 900 342 L 904 338 L 844 338 Z', '#c9c5bc', 2.5) +
        S('M 844 338 L 838 292 L 893 292 L 900 338 Z', '#efece5', 2.5) +
        E(869, 314, 5.5, 5.5, 'none', 2) +
        L('M 855 332 L 883 332', '#d3cfc6', 2)
      );
    },
  };

  // ---- TV desk (x 40–236, y 324–462; the TV sits on top and is drawn by the room) -------------

  const desk = {
    // A mid-century walnut console on splayed legs, with sliding doors and brass handles.
    retro(p) {
      const top = col(p, 'top', '#8a5636');
      const body = col(p, 'body', '#b8743e');
      const feet = col(p, 'feet', '#ecbc44');
      return (
        S('M 62 410 L 80 410 L 90 462 L 76 462 Z', K.woodDark, 2.5) +
        S('M 216 410 L 198 410 L 188 462 L 202 462 Z', K.woodDark, 2.5) +
        R(70, 456, 24, 7, feet, 2, 2.5) +
        R(184, 456, 24, 7, feet, 2, 2.5) +
        R(48, 338, 180, 76, body, 3, 3) +
        R(40, 324, 196, 16, top, 4, 3) +
        R(56, 346, 82, 60, mix(body, '#ffffff', 0.18), 3, 2.5) +
        R(142, 346, 78, 60, mix(body, '#ffffff', 0.18), 3, 2.5) +
        L('M 72 350 L 72 402 M 88 350 L 88 402 M 104 350 L 104 402 M 120 350 L 120 402 M 158 350 L 158 402 M 174 350 L 174 402 M 190 350 L 190 402 M 206 350 L 206 402', mix(body, K.line, 0.25), 2) +
        dot(132, 376, 3.5, '#ecbc44') + dot(148, 376, 3.5, '#ecbc44')
      );
    },
    // A pastel cabinet with round doors, bun feet, and little cat ears on one corner.
    cabinet(p) {
      const top = col(p, 'top', '#fad3df');
      const body = col(p, 'body', '#bfe8df');
      const feet = col(p, 'feet', '#f4accc');
      return (
        S('M 204 326 L 208 304 L 220 326 Z', top, 2.5) +
        S('M 218 326 L 226 304 L 234 326 Z', top, 2.5) +
        R(48, 338, 180, 112, body, 8, 3) +
        R(40, 324, 196, 16, top, 8, 3) +
        R(58, 350, 76, 88, mix(body, '#ffffff', 0.4), 8, 2.5) +
        R(142, 350, 76, 88, mix(body, '#ffffff', 0.4), 8, 2.5) +
        dot(122, 394, 4.5, feet, 2) + dot(154, 394, 4.5, feet, 2) +
        S('M 96 376 C 86 369 87 361 92 361 C 95 361 96 364 96 364 C 96 364 97 361 100 361 C 105 361 106 369 96 376 Z', '#ff6f91', 1.5) +
        E(68, 454, 12, 9, feet, 2.5) +
        E(208, 454, 12, 9, feet, 2.5)
      );
    },
    // A slim dark top over white open shelves and drawers, on thin black legs.
    shelf(p) {
      const top = col(p, 'top', '#2b2f3a');
      const body = col(p, 'body', '#fbf8f2');
      const feet = col(p, 'feet', '#2b2f3a');
      return (
        L('M 62 430 L 54 462 M 214 430 L 222 462', K.line, 8) +
        L('M 62 430 L 54 462 M 214 430 L 222 462', feet, 4) +
        R(48, 334, 180, 98, body, 3, 3) +
        R(40, 324, 196, 12, top, 3, 3) +
        R(56, 344, 74, 80, mix(body, K.line, 0.1), 2, 2.5) +
        R(62, 380, 14, 40, '#f4accc', 1.5, 2) + R(78, 384, 12, 36, K.mint, 1.5, 2) + R(92, 376, 16, 44, '#ecbc44', 1.5, 2) + R(110, 386, 14, 34, '#ee8fb8', 1.5, 2) +
        R(136, 344, 84, 36, body, 2, 2.5) +
        R(136, 386, 84, 38, body, 2, 2.5) +
        L('M 160 362 L 196 362 M 160 405 L 196 405', K.line, 2.2)
      );
    },
  };

  // ---- Rug (centre 470, 546; about 336 wide) ---------------------------------------------------

  const rug = {
    // A pink oval with one big white paw print.
    paw(p) {
      const base = col(p, 'fill', '#f4accc');
      const pad = col(p, 'ring', CREAM);
      return (
        E(470, 546, 168, 40, base, 3) +
        `<ellipse cx="470" cy="546" rx="146" ry="30" fill="none" stroke="${pad}" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/>` +
        E(470, 554, 34, 15, pad, 2.5) +
        E(418, 538, 12, 9, pad, 2.2) + E(444, 527, 12, 9, pad, 2.2) + E(496, 527, 12, 9, pad, 2.2) + E(522, 538, 12, 9, pad, 2.2)
      );
    },
    // A scalloped flower rug: a ring of petals around a yellow middle.
    flower(p) {
      const petal = col(p, 'fill', '#f4accc');
      const mid = col(p, 'ring', '#ecbc44');
      let petals = '';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        petals += E((470 + Math.cos(a) * 140).toFixed(1), (546 + Math.sin(a) * 27).toFixed(1), 30, 15, petal, 3);
      }
      return petals + E(470, 546, 140, 27, petal, 0) + E(470, 546, 58, 18, mid, 3) + [[446, 546], [470, 538], [494, 546], [470, 554]].map(([x, y]) => dot(x, y, 2.4, petal, 1.2)).join('');
    },
    // A rounded rectangle with a bold zigzag.
    zigzag(p) {
      const base = col(p, 'fill', K.mint);
      const line = col(p, 'ring', CREAM);
      let z = 'M 322 548';
      for (let k = 0; k < 14; k++) z += ` l 11.7 ${k % 2 ? 16 : -16}`;
      return R(304, 508, 332, 76, base, 16, 3) + L(`M 322 520 L 618 520 M 322 572 L 618 572`, line, 3) + L(z, line, 5, 'stroke-linejoin="round"');
    },
  };

  // ---- Litter box (around x, y; 112 wide, rim at y−52) -------------------------------------------
  // Each look gives the back wall and front wall. The sand and the clumps are the room's own.

  const litter = {
    // A wooden crate with a sprig of flowers on the front.
    crate(x, y) {
      return {
        back:
          S(`M ${x - 56} ${y - 36} L ${x - 52} ${y - 52} L ${x + 52} ${y - 52} L ${x + 56} ${y - 36} Z`, '#a46f3a', 3) +
          L(`M ${x - 54} ${y - 44} L ${x + 54} ${y - 44}`, K.woodDark, 2),
        front:
          R(x - 56, y - 36, 112, 36, '#d39a64', 4, 3) +
          R(x - 56, y - 36, 112, 8, '#e8b883', 4, 3) +
          L(`M ${x - 56} ${y - 18} L ${x + 56} ${y - 18}`, K.woodDark, 2) +
          L(`M ${x - 12} ${y - 4} Q ${x} ${y - 20} ${x + 12} ${y - 4}`, K.oliveDark, 2.4) +
          dot(x - 12, y - 8, 3.4, '#f4accc') + dot(x, y - 14, 3.4, '#ecbc44') + dot(x + 12, y - 8, 3.4, '#f4accc'),
      };
    },
    // A pink tray with cat ears at the back and a heart on the front.
    kitty(x, y) {
      return {
        back:
          S(`M ${x - 50} ${y - 50} L ${x - 44} ${y - 76} L ${x - 24} ${y - 52} Z`, '#ee8fb8', 3) +
          S(`M ${x + 50} ${y - 50} L ${x + 44} ${y - 76} L ${x + 24} ${y - 52} Z`, '#ee8fb8', 3) +
          S(`M ${x - 56} ${y - 36} L ${x - 50} ${y - 52} L ${x + 50} ${y - 52} L ${x + 56} ${y - 36} Z`, '#ee8fb8', 3),
        front:
          R(x - 56, y - 36, 112, 36, '#f4accc', 6, 3) +
          R(x - 56, y - 36, 112, 9, '#fad3df', 5, 3) +
          S(`M ${x} ${y - 5} C ${x - 14} ${y - 13} ${x - 12} ${y - 24} ${x - 6} ${y - 24} C ${x - 2} ${y - 24} ${x} ${y - 20} ${x} ${y - 20} C ${x} ${y - 20} ${x + 2} ${y - 24} ${x + 6} ${y - 24} C ${x + 12} ${y - 24} ${x + 14} ${y - 13} ${x} ${y - 5} Z`, '#ff6f91', 2),
      };
    },
    // A white box with a high curved back, a dark rim, and a small light.
    modern(x, y) {
      return {
        back:
          S(`M ${x - 56} ${y - 36} L ${x - 56} ${y - 62} Q ${x} ${y - 88} ${x + 56} ${y - 62} L ${x + 56} ${y - 36} Z`, '#fcf4ec', 3) +
          L(`M ${x - 40} ${y - 70} Q ${x} ${y - 84} ${x + 40} ${y - 70}`, '#e3dccd', 2.4),
        front:
          R(x - 56, y - 36, 112, 36, '#fcf4ec', 6, 3) +
          R(x - 56, y - 36, 112, 9, '#2b2f3a', 5, 3) +
          dot(x + 42, y - 14, 3, '#6fd16f', 1.2) +
          L(`M ${x - 36} ${y - 14} L ${x + 24} ${y - 14}`, '#d3cfc6', 2.4),
      };
    },
  };

  // ---- Lamp (the shade hangs from y 96 to 132 around x 850) -----------------------------------------

  const lamp = {
    // A flower: petals fan out as the shade.
    flower(p) {
      const a = col(p, 'shade', '#f4accc');
      const b = col(p, 'rim', '#e07fa8');
      return (
        S('M 818 132 Q 812 108 828 100 Q 838 90 850 98 Q 862 90 872 100 Q 888 108 882 132 Z', a, 3) +
        L('M 836 128 Q 832 112 840 102 M 850 130 L 850 104 M 864 128 Q 868 112 860 102', b, 2.2) +
        R(814, 129, 72, 7, b, 3, 2.5)
      );
    },
    // A cat's head: round dome, two ears, and a sleepy face.
    kitty(p) {
      const a = col(p, 'shade', CREAM);
      const b = col(p, 'rim', '#f4accc');
      return (
        S('M 820 112 L 818 88 L 840 102 Z', a, 3) +
        S('M 880 112 L 882 88 L 860 102 Z', a, 3) +
        S('M 818 132 Q 818 98 850 98 Q 882 98 882 132 Z', a, 3) +
        L('M 832 116 Q 836 119 840 116 M 860 116 Q 864 119 868 116', K.line, 2.2) +
        S('M 847 121 L 853 121 L 850 124 Z', '#ff6f91', 1.4) +
        L('M 826 122 L 814 120 M 826 126 L 814 128 M 874 122 L 886 120 M 874 126 L 886 128', K.line, 1.6) +
        R(814, 129, 72, 7, b, 3, 2.5)
      );
    },
    // A round opal globe on a dark cap.
    globe(p) {
      const a = col(p, 'shade', '#fcf4ec');
      const b = col(p, 'rim', '#2b2f3a');
      return E(850, 116, 26, 26, a, 3) + L('M 836 106 Q 840 99 848 98', '#fff', 3) + R(840, 92, 20, 10, b, 3, 2.5);
    },
  };

  // ---- Curtains (the room draws the panels and rod; a look supplies colours and trimmings) ----------

  const pawAt = (x, y, c) =>
    E(x, y + 2, 4, 3.2, c, 0) + [[-4.5, -2.5], [-1.5, -5], [1.5, -5], [4.5, -2.5]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="1.7" fill="${c}"/>`).join('');
  const starAt = (x, y, r, c) =>
    `<path d="M ${x} ${y - r} L ${x + r * 0.28} ${y - r * 0.28} L ${x + r} ${y} L ${x + r * 0.28} ${y + r * 0.28} L ${x} ${y + r} L ${x - r * 0.28} ${y + r * 0.28} L ${x - r} ${y} L ${x - r * 0.28} ${y - r * 0.28} Z" fill="${c}"/>`;

  const curtains = {
    // Soft pink with little paw prints; cat-head curtain rod ends.
    paws(p) {
      const c = p ? p.dots || p.fold : '#f4accc';
      return {
        fill: col(p, 'fill', '#fff0f4'),
        fold: col(p, 'fold', '#f4c6d6'),
        deco: (x, m) => {
          let s = '';
          for (let r = 0; r < 9; r++) s += pawAt(x + (16 + (r % 2) * 32) * m, 76 + r * 38, c);
          return s;
        },
        rod: '#f4accc',
        finial: (cx) => E(cx, 42, 10, 9, '#f4accc', 3.5) + S(`M ${cx - 9} 38 L ${cx - 8} 28 L ${cx - 2} 35 Z`, '#f4accc', 2.5) + S(`M ${cx + 9} 38 L ${cx + 8} 28 L ${cx + 2} 35 Z`, '#f4accc', 2.5),
      };
    },
    // Cream-green with a vine of pink flowers; a gold rod.
    garden(p) {
      const leaf = p ? p.fold : '#8cac64';
      const bloom = p ? p.dots || p.fold : '#f4accc';
      return {
        fill: col(p, 'fill', '#f1f7e6'),
        fold: col(p, 'fold', '#d3e3b8'),
        deco: (x, m) => {
          let s = L(`M ${x + 33 * m} 62 Q ${x + 14 * m} 150 ${x + 33 * m} 230 Q ${x + 52 * m} 300 ${x + 33 * m} 380`, leaf, 3);
          for (let r = 0; r < 6; r++) {
            const y = 90 + r * 54;
            const px = x + (r % 2 ? 22 : 44) * m;
            s += E(px - 7 * m, y + 8, 6, 3, leaf, 0, `transform="rotate(${r % 2 ? -30 : 30} ${px - 7 * m} ${y + 8})"`);
            s += dot(px, y, 5, bloom, 1.4) + `<circle cx="${px}" cy="${y}" r="1.6" fill="#ecbc44"/>`;
          }
          return s;
        },
        rod: '#d9a43a',
        finial: (cx) => dot(cx, 42, 8, '#ecbc44', 3.5),
      };
    },
    // Deep blue night with a crescent moon and little gold stars; a dark rod.
    starry(p) {
      const c = p ? p.dots || mix(p.fold, '#ffffff', 0.5) : '#ecbc44';
      return {
        fill: col(p, 'fill', '#4a5c8e'),
        fold: col(p, 'fold', '#34446f'),
        deco: (x, m) => {
          const pts = [[18, 84, 6], [50, 112, 4], [28, 150, 5], [56, 196, 6], [16, 236, 4], [44, 278, 6], [24, 318, 5], [54, 352, 4], [32, 52, 3]];
          let s = pts.map(([dx, y, r]) => starAt(x + dx * m, y + 18, r, c)).join('');
          s += `<path d="M ${x + 40 * m} 200 A 14 14 0 1 0 ${x + 40 * m} 228 A 11 11 0 1 1 ${x + 40 * m} 200 Z" fill="${c}"/>`;
          return s;
        },
        rod: '#2b2f3a',
        finial: (cx) => starAt(cx, 42, 11, '#ecbc44').replace('<path ', `<path stroke="${K.line}" stroke-width="3" stroke-linejoin="round" `),
      };
    },
  };

  // ---- Clock (a face at 0, 0, radius 34; the hands carry the ids the room turns) --------------------

  function hands(p, icon, tick) {
    return (
      (tick || [0, 90, 180, 270]).map((a) => `<rect x="-1.5" y="-25" width="3" height="${tick && tick.length > 4 ? 4 : 6}" fill="${p.hands}" transform="rotate(${a})"/>`).join('') +
      `<g ${icon ? 'transform="rotate(300)"' : 'id="clock-h"'}>${L('M 0 2 L 0 -14', p.hands, 4)}</g>` +
      `<g ${icon ? 'transform="rotate(60)"' : 'id="clock-m"'}>${L('M 0 3 L 0 -21', p.hands, 2.6)}</g>` +
      `<circle r="3" fill="${p.ring}"/>`
    );
  }

  const clock = {
    // A cat-ear clock wearing a big bow.
    bow(p, icon) {
      const q = p || { face: '#ffe8ef', ring: '#ff6f91', ears: '#ffc7d6', hands: K.line };
      return (
        S('M -24 -24 L -26 -44 L -10 -32 Z', q.ears, 3) +
        S('M 24 -24 L 26 -44 L 10 -32 Z', q.ears, 3) +
        E(0, 0, 34, 34, q.face, 3.5) +
        `<circle r="28" fill="none" stroke="${q.ring}" stroke-width="3"/>` +
        hands(q, icon) +
        S('M 0 -36 L -16 -48 L -16 -30 Z', q.ring, 2.6) +
        S('M 0 -36 L 16 -48 L 16 -30 Z', q.ring, 2.6) +
        dot(0, -37, 4.5, q.ears, 2.4)
      );
    },
    // Sunny petals all the way round.
    sunflower(p, icon) {
      const q = p || { face: '#fff3c4', ring: '#a46f3a', ears: '#ecbc44', hands: K.line };
      let petals = '';
      for (let i = 0; i < 12; i++) petals += `<ellipse cx="0" cy="-41" rx="8" ry="11" fill="${q.ears}" stroke="${K.line}" stroke-width="2.6" transform="rotate(${i * 30})"/>`;
      return petals + E(0, 0, 33, 33, q.face, 3.5) + `<circle r="27" fill="none" stroke="${q.ring}" stroke-width="3"/>` + hands(q, icon);
    },
    // A plain round face with a bold ring and every hour marked.
    minimal(p, icon) {
      const q = p || { face: '#fcf4ec', ring: '#2b2f3a', ears: '#2b2f3a', hands: '#2b2f3a' };
      const ticks = [...Array(12).keys()].map((i) => i * 30);
      return E(0, 0, 36, 36, q.face, 3.5) + `<circle r="31" fill="none" stroke="${q.ring}" stroke-width="5"/>` + hands(q, icon, ticks) + (icon ? '' : '') ;
    },
  };

  // ---- Food and water bowls (the food bowl at 284, 532; the water bowl at 334, 536) --------------------
  // Each look gives the pieces that change: a mat/stand under, the two bowls, and anything on top.

  const bowls = {
    // Pink mat, cream bowls with cat ears and a heart.
    kitty() {
      const ear = (x, y) => S(`M ${x - 17} ${y - 3} L ${x - 14} ${y - 17} L ${x - 5} ${y - 5} Z`, CREAM, 2.2) + S(`M ${x + 17} ${y - 3} L ${x + 14} ${y - 17} L ${x + 5} ${y - 5} Z`, CREAM, 2.2);
      return {
        mat: R(256, 532, 104, 22, '#f6c9cf', 8, 2.5),
        underFood: ear(284, 532),
        underWater: ear(334, 536),
        food: S('M 262 532 Q 264 548 284 548 Q 304 548 306 532 Z', CREAM, 2.6),
        water: S('M 314 536 Q 316 550 334 550 Q 352 550 354 536 Z', '#bfe2f5', 2.6),
        waterTop: '#7fb4d9',
        foodMark: S('M 284 546 C 276 541 277 535 280 535 C 282 535 284 537 284 537 C 284 537 286 535 288 535 C 291 535 292 541 284 546 Z', '#ff6f91', 1.2),
      };
    },
    // A wooden stand under cream flowery bowls.
    stand() {
      return {
        mat:
          R(254, 546, 106, 9, '#d39a64', 3, 2.5) +
          R(262, 554, 9, 10, K.woodDark, 2, 2.2) +
          R(343, 554, 9, 10, K.woodDark, 2, 2.2),
        underFood: '',
        underWater: '',
        food: S('M 262 532 Q 264 548 284 548 Q 304 548 306 532 Z', CREAM, 2.6),
        water: S('M 314 536 Q 316 550 334 550 Q 352 550 354 536 Z', CREAM, 2.6),
        waterTop: '#9fd3ea',
        foodMark: dot(279, 542, 2, '#f4accc', 1) + dot(284, 545, 2, '#ecbc44', 1) + dot(289, 542, 2, '#f4accc', 1),
      };
    },
    // Dark mat, steel bowls, and a water fountain that bubbles up in the middle.
    fountain() {
      return {
        mat: R(256, 532, 104, 22, '#4a4f5c', 8, 2.5),
        underFood: '',
        underWater: '',
        food: S('M 262 532 Q 264 548 284 548 Q 304 548 306 532 Z', '#d8d4cc', 2.6),
        water: S('M 314 536 Q 316 550 334 550 Q 352 550 354 536 Z', '#bcb8ae', 2.6),
        waterTop: '#bfe2f5',
        foodMark: L('M 272 541 Q 276 538 280 539', '#fff', 2),
        top: S('M 327 536 Q 334 514 341 536 Z', '#e8f6fc', 2.2) + L('M 334 520 Q 328 524 326 532 M 334 520 Q 340 524 342 532', '#7fb4d9', 1.8),
      };
    },
  };

  G.ShopArt = { chair, table, laptop, desk, rug, litter, lamp, curtains, clock, bowls };
})(globalThis.CatGame = globalThis.CatGame || {});
