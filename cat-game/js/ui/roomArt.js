// The room: wall, window, furniture from the photos (green camping chair,
// round scratcher bed, wooden table, TV desk, curtains), placeable items,
// seasonal decor and gifts. Scene coordinates: 960 × 600.
// Style (docs/art-style.md §5): one near-black ink line, flat fills, no
// gradients or translucent materials; calmer than the cat.
(function (G) {
  'use strict';

  const K = {
    line: '#1b1714',
    wall: '#fcf4ec',
    wallTop: '#f6ead6',
    wains: '#f2e4cc',
    wainsLine: '#dcc7a2',
    base: '#bc7c4c',
    floor: '#dcbc84',
    floorLine: '#c8a26a',
    wood: '#bc7c4c',
    woodDark: '#8a5636',
    woodLight: '#d39a64',
    red: '#d44c34',
    redDark: '#843424',
    cream: '#fcfcfc',
    olive: '#8cac64',
    oliveDark: '#4c8444',
    frame: '#3a3a40',
    card: '#dcaa6c',
    cardDark: '#c99456',
    mint: '#8fd3c6',
  };

  const W = 960;
  const H = 600;
  const FLOOR = 420;

  // Outlines run ~30% heavier than the widths passed in (room line ≈ 4).
  const ow = (w) => ((w || 3) * 1.3).toFixed(2);
  const S = (d, fill, w, extra) =>
    `<path d="${d}" fill="${fill}" stroke="${K.line}" stroke-width="${ow(w)}" stroke-linejoin="round" stroke-linecap="round" ${extra || ''}/>`;
  const R = (x, y, w, h, fill, rx, sw) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 0}" fill="${fill}" stroke="${K.line}" stroke-width="${ow(sw)}" stroke-linejoin="round"/>`;
  const E = (cx, cy, rx, ry, fill, sw, extra) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${K.line}" stroke-width="${sw === 0 ? 0 : ow(sw)}" ${extra || ''}/>`;
  const L = (d, color, w, extra) => `<path d="${d}" fill="none" stroke="${color || K.line}" stroke-width="${w || 2}" stroke-linecap="round" ${extra || ''}/>`;

  // ---- Where the cat can be ----------------------------------------------------

  const SPOTS = {
    sill: { x: 430, y: 291, z: 303, floor: { x: 430, y: 468 } },
    chair: { x: 640, y: 404, z: 482, floor: { x: 640, y: 494 } },
    table: { x: 795, y: 350, z: 496, floor: { x: 795, y: 506 } },
    laptop: { x: 868, y: 342, z: 497, floor: { x: 868, y: 506 } },
    desk: { x: 205, y: 330, z: 462, floor: { x: 205, y: 474 } },
    rug: { x: 470, y: 548, z: 548 },
    bowl: { x: 238, y: 541, z: 542, face: 1 },
    floorL: { x: 370, y: 488, z: 488 },
    floorR: { x: 742, y: 528, z: 528 },
    wall: { x: 545, y: 446, z: 446, face: 1 },
    front: { x: 520, y: 590, z: 591 },
  };

  const SLOTS = [
    { x: 105, y: 568 },
    { x: 668, y: 584 },
    { x: 868, y: 574 },
  ];

  // Where the cat sits inside/on each item, relative to its slot.
  const ITEM_SEAT = {
    scratcher: { dx: 0, dy: -10 },
    box: { dx: 0, dy: -6 },
    cushion: { dx: 0, dy: -9 },
    yarn: { dx: -50, dy: 0, face: 1 },
    bag: { dx: 0, dy: -4 },
    tower: { dx: 0, dy: -131, high: true },
    fishToy: { dx: -52, dy: 0, face: 1 },
    tent: { dx: 0, dy: -6 },
  };

  function scaleAt(yFloor) {
    return 0.6 + (yFloor - FLOOR) * 0.0017;
  }

  // Resolve a spot id ('rug', 'slot1', ...) to scene coordinates.
  function spotPos(state, spotId) {
    let p;
    if (spotId && spotId.startsWith('slot')) {
      const i = Number(spotId.slice(4));
      const item = state.room.slots[i];
      const slot = SLOTS[i];
      const seat = ITEM_SEAT[item] || { dx: 0, dy: 0 };
      if (!slot) return spotPos(state, 'rug');
      const x = slot.x + seat.dx;
      const y = slot.y + seat.dy;
      p = { x, y, z: slot.y + (seat.high ? 2 : 0.5), face: seat.face, floor: seat.high ? { x, y: slot.y + 6 } : null };
    } else {
      const sp = SPOTS[spotId] || SPOTS.rug;
      p = Object.assign({}, sp);
    }
    const fy = p.floor ? p.floor.y : p.y;
    p.scale = scaleAt(fy);
    p.high = !!p.floor;
    if (!p.floor) p.floor = { x: p.x, y: p.y };
    return p;
  }

  // ---- Background ----------------------------------------------------------------

  function windowArt() {
    let s = '';
    // Sky + outside
    s += `<clipPath id="win-clip"><rect x="330" y="80" width="200" height="200"/></clipPath>`;
    s += `<g clip-path="url(#win-clip)">`;
    s += `<rect x="330" y="80" width="200" height="200" fill="url(#sky)"/>`;
    s += `<g id="stars" opacity="0">${[[350, 100], [372, 130], [410, 96], [455, 120], [500, 98], [515, 140], [390, 150]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff8d0"/>`)
      .join('')}</g>`;
    s += `<g id="sun"><circle r="16" fill="#ffe08a" stroke="${K.line}" stroke-width="3"/></g>`;
    s += `<g id="moon"><circle r="13" fill="#fff6d6" stroke="${K.line}" stroke-width="3"/><circle cx="-4" cy="3" r="2.5" fill="#efe2b3"/><circle cx="3" cy="-3" r="1.6" fill="#efe2b3"/></g>`;
    // a flat hedge and a round tree, like the yard in the reference
    s += S('M 330 282 L 330 236 Q 352 220 374 234 Q 396 216 420 232 Q 444 218 466 232 L 466 282 Z', '#8cac64', 2.5);
    s += L('M 530 236 Q 500 240 470 250', K.line, 9) + L('M 530 236 Q 500 240 470 250', '#8a5636', 5);
    s += `<g fill="#8cac64" stroke="${K.line}" stroke-width="3"><circle cx="500" cy="232" r="13"/><circle cx="532" cy="252" r="15"/><circle cx="522" cy="222" r="18"/></g>`;
    s += L('M 516 214 Q 522 220 528 216 M 496 228 Q 500 232 504 229', '#4c8444', 2.5);
    s += `<g id="bird" display="none" transform="translate(484 240)"><g class="bird-hop">${S('M -10 0 Q -8 -12 2 -12 Q 10 -12 11 -5 L 16 -4 L 11 -1 Q 8 6 -2 5 Q -8 5 -10 0 Z', '#7fa8d6', 2.2)}<circle cx="5" cy="-7" r="1.4" fill="#2a231f"/>${L('M -4 -4 Q 0 -1 4 -4', '#5b7fa8', 2)}${L('M -2 5 L -2 9 M 2 5 L 2 9', '#c9873a', 1.6)}</g></g>`;
    s += `</g>`;
    // Frame
    s += `<rect x="330" y="80" width="200" height="200" fill="none" stroke="${K.cream}" stroke-width="12"/>`;
    s += `<rect x="322" y="72" width="216" height="216" fill="none" stroke="${K.line}" stroke-width="4" rx="4"/>`;
    s += `<rect x="336" y="86" width="188" height="188" fill="none" stroke="${K.line}" stroke-width="3.5"/>`;
    s += L('M 430 86 L 430 274', K.line, 12) + L('M 430 86 L 430 274', K.cream, 6) + L('M 336 180 L 524 180', K.line, 12) + L('M 336 180 L 524 180', K.cream, 6);
    s += `<rect x="304" y="286" width="252" height="14" rx="3" fill="${K.woodLight}" stroke="${K.line}" stroke-width="3"/>`;
    return s;
  }

  // Flat cream curtains beside the window: opaque, a few fold lines, no sheer.
  function curtains() {
    const panel = (x, flip) => {
      const m = flip ? -1 : 1;
      const d = `M ${x} 44 L ${x + 66 * m} 44 L ${x + 66 * m} 404 Q ${x + 50 * m} 414 ${x + 33 * m} 406 Q ${x + 16 * m} 414 ${x} 404 Z`;
      return S(d, K.cream, 3) + L(`M ${x + 22 * m} 60 L ${x + 22 * m} 396 M ${x + 44 * m} 60 L ${x + 44 * m} 396`, '#e2d6c2', 3);
    };
    return (
      panel(264, false) +
      panel(596, true) +
      `<rect x="250" y="38" width="360" height="9" rx="4.5" fill="${K.woodDark}" stroke="${K.line}" stroke-width="3.5"/>` +
      `<circle cx="250" cy="42" r="8" fill="${K.woodDark}" stroke="${K.line}" stroke-width="3.5"/><circle cx="610" cy="42" r="8" fill="${K.woodDark}" stroke="${K.line}" stroke-width="3.5"/>`
    );
  }

  function wallClock() {
    return (
      `<g transform="translate(722 128)">` +
      E(0, 0, 34, 34, K.cream, 3.5) +
      `<circle r="28" fill="none" stroke="${K.red}" stroke-width="3"/>` +
      [0, 90, 180, 270].map((a) => `<rect x="-1.5" y="-25" width="3" height="6" fill="${K.line}" transform="rotate(${a})"/>`).join('') +
      `<g id="clock-h">${L('M 0 2 L 0 -14', K.line, 4)}</g>` +
      `<g id="clock-m">${L('M 0 3 L 0 -21', K.line, 2.6)}</g>` +
      `<circle r="3" fill="${K.red}"/>` +
      // little cat ears on top of the clock
      S('M -24 -24 L -26 -44 L -10 -32 Z', K.cream, 3) +
      S('M 24 -24 L 26 -44 L 10 -32 Z', K.cream, 3) +
      `</g>`
    );
  }

  function portrait() {
    // A framed photo of the cat on the wall.
    return (
      `<g transform="translate(118 140)">` +
      `<rect x="-40" y="-48" width="80" height="96" rx="4" fill="${K.woodLight}" stroke="${K.line}" stroke-width="3"/>` +
      `<rect x="-30" y="-38" width="60" height="76" fill="#cfe6e0" stroke="${K.line}" stroke-width="2"/>` +
      `<clipPath id="portrait-clip"><rect x="-30" y="-38" width="60" height="76"/></clipPath>` +
      `<g clip-path="url(#portrait-clip)"><g transform="translate(0 38) scale(0.5)">${G.CatArt.render('sit', 'portrait')}</g></g>` +
      `</g>`
    );
  }

  function lamp() {
    return (
      `<g>` +
      L('M 850 0 L 850 96', K.line, 2.5) +
      S('M 818 132 Q 818 96 850 96 Q 882 96 882 132 Z', '#ecbc44', 3) +
      R(814, 129, 72, 7, '#d9a43a', 3, 2.5) +
      `<ellipse id="bulb" cx="850" cy="138" rx="10" ry="5" fill="#fff4c8" opacity=".3"/>` +
      `</g>`
    );
  }

  function background() {
    let s = '';
    s += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop id="sky-top" offset="0" stop-color="#8fd0ee"/><stop id="sky-bot" offset="1" stop-color="#e3f4fb"/></linearGradient>`;
    s += `</defs>`;
    // wall
    // Wall and floor run past the edges so wide screens never show bars.
    const X0 = -1500;
    const XW = W + 3000;
    s += `<rect x="${X0}" y="-400" width="${XW}" height="${FLOOR + 400}" fill="${K.wall}"/>`;
    s += `<rect x="${X0}" y="-400" width="${XW}" height="420" fill="${K.wallTop}"/>`;
    s += `<rect x="${X0}" y="336" width="${XW}" height="${FLOOR - 336}" fill="${K.wains}"/>`;
    s += L(`M ${X0} 336 L ${X0 + XW} 336`, K.line, 4);
    for (let x = -1470; x < W + 1500; x += 80) s += L(`M ${x} 346 L ${x} 406`, K.wainsLine, 3);
    // floor
    s += `<rect x="${X0}" y="${FLOOR}" width="${XW}" height="${H - FLOOR + 400}" fill="${K.floor}"/>`;
    const rows = [420, 446, 476, 512, 552, 600];
    for (let i = 1; i < rows.length; i++) s += L(`M ${X0} ${rows[i]} L ${X0 + XW} ${rows[i]}`, K.floorLine, 3);
    for (let i = 0; i < rows.length - 1; i++) {
      const step = 150 + i * 30;
      for (let x = (i % 2) * step * 0.5 + 40 - step * 8; x < W + 1500; x += step) s += L(`M ${x} ${rows[i] + 3} L ${x - 4} ${rows[i + 1] - 3}`, K.floorLine, 3);
    }
    s += `<rect x="${X0}" y="${FLOOR - 8}" width="${XW}" height="10" fill="${K.base}" stroke="${K.line}" stroke-width="4"/>`;
    // rug (terracotta oval, woven rings)
    s += E(470, 546, 168, 40, K.red, 3);
    s += `<ellipse cx="470" cy="546" rx="140" ry="29" fill="none" stroke="#e8806a" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/>`;
    // morning sunbeam from the window
    s += `<path id="sunbeam" d="M 360 420 L 520 420 L 640 600 L 380 600 Z" fill="#fff6d2" opacity="0"/>`;
    s += windowArt();
    s += curtains();
    s += wallClock();
    s += portrait();
    s += lamp();
    return s;
  }

  // ---- Furniture (sorted with the cat by z) ------------------------------------------

  function desk() {
    return (
      // TV: tap it to change the channel (the scene fills #tv-show).
      `<g class="tv" style="cursor:pointer">` +
      `<rect x="96" y="314" width="56" height="10" rx="2" fill="${K.frame}" stroke="${K.line}" stroke-width="2.5"/>` +
      `<rect x="116" y="300" width="16" height="16" fill="${K.frame}"/>` +
      R(56, 206, 136, 98, K.frame, 6, 3) +
      `<clipPath id="tv-clip"><rect x="64" y="214" width="120" height="82" rx="3"/></clipPath>` +
      `<g clip-path="url(#tv-clip)"><rect x="64" y="214" width="120" height="82" fill="#33414d"/><g id="tv-show" transform="translate(64 214)"></g></g>` +
      `</g>` +
      // desk
      R(40, 324, 196, 16, K.woodLight, 4) +
      R(48, 338, 180, 112, K.wood, 3) +
      R(60, 352, 74, 40, K.woodLight, 3, 2.5) +
      R(142, 352, 74, 40, K.woodLight, 3, 2.5) +
      R(60, 400, 156, 40, K.woodLight, 3, 2.5) +
      `<circle cx="97" cy="372" r="3" fill="${K.line}"/><circle cx="179" cy="372" r="3" fill="${K.line}"/><circle cx="138" cy="420" r="3" fill="${K.line}"/>` +
      R(52, 448, 12, 14, K.woodDark, 2, 2.5) +
      R(212, 448, 12, 14, K.woodDark, 2, 2.5)
    );
  }

  // The green camping chair: black frame, olive canvas, wooden armrests.
  function chair() {
    const fr = K.line;
    return (
      `<g>` +
      L('M 596 300 Q 640 286 686 300', fr, 7) +
      L('M 594 296 L 596 418 M 686 296 L 684 418', fr, 6) +
      S('M 598 308 L 684 308 L 682 370 L 600 370 Z', K.olive, 3) +
      `<rect x="660" y="318" width="14" height="9" rx="1.5" fill="#b8743e" stroke="${K.line}" stroke-width="1.5"/>` +
      L('M 606 312 L 606 366 M 676 312 L 676 366', K.oliveDark, 2) +
      // seat
      S('M 584 392 Q 640 412 698 392 L 700 404 Q 640 424 582 404 Z', K.olive, 3) +
      // legs (X-frame)
      L('M 586 404 L 690 482 M 696 404 L 592 482', fr, 6) +
      L('M 586 404 L 586 484 M 696 404 L 696 484', fr, 6) +
      L('M 580 484 L 600 484 M 682 484 L 702 484', fr, 6) +
      // armrests
      R(568, 366, 36, 9, K.wood, 3, 2.5) +
      R(678, 366, 36, 9, K.wood, 3, 2.5) +
      L('M 584 375 L 586 404 M 698 375 L 696 404', fr, 5) +
      `</g>`
    );
  }

  function table(state) {
    let s = '';
    s += R(762, 360, 12, 134, K.woodDark, 2, 3) + R(918, 360, 12, 134, K.woodDark, 2, 3);
    s += R(776, 360, 140, 18, K.wood, 2, 2.5);
    s += R(742, 344, 208, 18, K.woodLight, 5, 3);
    // laptop
    s += S('M 840 342 L 900 342 L 906 336 L 846 336 Z', '#c9ced4', 2.5);
    s += S('M 846 336 L 838 292 L 892 292 L 900 336 Z', '#dfe3e8', 2.5);
    s += `<circle cx="869" cy="314" r="5" fill="#f5f6f8" stroke="#b7bdc4" stroke-width="1.5"/>`;
    if (!state.room.cupOnFloor) s += mug(924, 343, 0);
    return s;
  }

  function mug(x, y, rot) {
    return (
      `<g transform="translate(${x} ${y}) rotate(${rot})">` +
      S('M -11 0 L -12 -24 L 12 -24 L 11 0 Z', '#fffaf2', 2.6) +
      `<rect x="-11.5" y="-17" width="23" height="6" fill="${K.red}"/>` +
      S('M 11 -19 Q 21 -18 20 -11 Q 19 -5 11 -6', 'none', 2.6) +
      `</g>`
    );
  }

  function bowls(state) {
    const f = G.Catalog.FOODS[state.bowl.food];
    const p = state.bowl.portions;
    let s = '';
    s += `<rect x="256" y="532" width="104" height="22" rx="8" fill="#f6c9cf" stroke="${K.line}" stroke-width="2.5"/>`;
    s += L('M 266 543 L 350 543', '#fff', 2, 'stroke-dasharray="4 6"');
    // food bowl
    if (p > 0) {
      const h = p >= 3 ? 9 : p === 2 ? 7 : 5;
      s += `<ellipse cx="284" cy="532" rx="17" ry="${h}" fill="${f.color}" stroke="${K.line}" stroke-width="2"/>`;
      if (state.bowl.food === 'kibble') s += `<g fill="#a86d36">${[[-8, -2], [-2, -4], [5, -2], [10, 0], [-4, 1], [2, 1]].map(([dx, dy]) => `<circle cx="${284 + dx}" cy="${532 + dy}" r="2"/>`).join('')}</g>`;
    }
    s += S('M 262 532 Q 264 548 284 548 Q 304 548 306 532 Z', K.red, 2.6);
    s += `<ellipse cx="284" cy="532" rx="22" ry="5" fill="none" stroke="${K.line}" stroke-width="2.6"/>`;
    s += `<path d="M 278 540 Q 284 544 290 540" stroke="#fff" stroke-width="2" fill="none"/>`;
    // water
    s += S('M 314 536 Q 316 550 334 550 Q 352 550 354 536 Z', '#7fb4d9', 2.6);
    s += `<ellipse cx="334" cy="536" rx="20" ry="5" fill="#bfe2f5" stroke="${K.line}" stroke-width="2.6"/>`;
    return s;
  }

  // ---- TV channels ------------------------------------------------------------------
  // Each show is drawn in screen space (120 × 82) in the same flat, inked
  // style, with small CSS loops (tv-swim, tv-rise, tv-sway, tv-hop, tv-spin,
  // tv-bounce) so the TV feels alive without any video.

  const TW = 120;
  const TH = 82;
  const ink = (d, w) => L(d, K.line, w || 2);
  const box = (fill) => `<rect width="${TW}" height="${TH}" fill="${fill}"/>`;
  const delay = (s) => `style="animation-delay:${s}s"`;

  function fish(color, flip) {
    return (
      `<g transform="scale(${flip ? -1 : 1} 1)">` +
      S('M -18 0 L -26 -7 L -25 7 Z', color, 1.4) +
      E(-6, 0, 13, 8, color, 1.4) +
      `<circle cx="1" cy="-2" r="1.8" fill="${K.line}"/>` +
      ink('M -9 -6 Q -6 0 -9 6', 1.6) +
      `</g>`
    );
  }

  function tvBird(color) {
    return (
      S('M -10 0 Q -8 -12 2 -12 Q 10 -12 11 -5 L 16 -4 L 11 -1 Q 8 6 -2 5 Q -8 5 -10 0 Z', color, 1.5) +
      `<circle cx="5" cy="-7" r="1.6" fill="${K.line}"/>` +
      ink('M -2 5 L -2 10 M 2 5 L 2 10', 1.6)
    );
  }

  const SHOWS = {
    fish: () =>
      box('#6ca4e4') +
      S('M -2 70 Q 30 63 60 70 T 122 67 L 122 84 L -2 84 Z', '#dcbc84', 1.6) +
      `<g class="tv-sway">${L('M 16 72 Q 10 60 16 50 Q 22 40 16 30', K.line, 6)}${L('M 16 72 Q 10 60 16 50 Q 22 40 16 30', '#8cac64', 3)}</g>` +
      `<g class="tv-sway" ${delay(-1.2)}>${L('M 100 70 Q 106 60 100 52 Q 94 44 100 38', K.line, 6)}${L('M 100 70 Q 106 60 100 52 Q 94 44 100 38', '#4c8444', 3)}</g>` +
      `<g class="tv-swim"><g transform="translate(0 30)">${fish('#e8a35a')}</g></g>` +
      `<g class="tv-swim back slow"><g transform="translate(0 52)">${fish('#ecbc44', true)}</g></g>` +
      [[40, 0], [46, -0.8], [43, -1.6]].map(([x, d]) => `<circle class="tv-rise" ${delay(d)} cx="${x}" cy="66" r="2.6" fill="#bfe0f4" stroke="${K.line}" stroke-width="1.2"/>`).join(''),

    birds: () =>
      box('#bfe0f4') +
      E(100, 16, 9, 9, '#ffe08a', 1.4) +
      L('M -4 60 Q 40 52 70 58 T 124 54', K.line, 8) +
      L('M -4 60 Q 40 52 70 58 T 124 54', '#8a5636', 4.5) +
      E(84, 50, 6, 3.5, '#8cac64', 1.2) +
      E(20, 52, 6, 3.5, '#8cac64', 1.2) +
      `<g transform="translate(40 45)"><g class="tv-hop">${tvBird('#7fb4d9')}</g></g>` +
      `<g transform="translate(70 47) scale(-1 1)"><g class="tv-hop" ${delay(-0.9)}>${tvBird('#f4accc')}</g></g>`,

    cooking: () =>
      box('#fcf4ec') +
      L('M 0 20 L 120 20 M 0 40 L 120 40 M 30 0 L 30 60 M 60 0 L 60 60 M 90 0 L 90 60', '#e2d6c2', 1.5) +
      S('M -2 60 L 122 60 L 122 84 L -2 84 Z', '#bc7c4c', 1.6) +
      S('M 30 38 L 66 38 L 64 60 L 32 60 Z', '#d44c34', 1.6) +
      S('M 28 34 Q 48 26 68 34 L 68 38 L 28 38 Z', '#843424', 1.4) +
      ink('M 26 44 L 32 44 M 64 44 L 70 44', 2.4) +
      [36, 48, 60].map((x, i) => `<path class="tv-rise" ${delay(-i * 0.7)} d="M ${x} 24 q -4 -5 0 -10 q 4 -5 0 -10" fill="none" stroke="#c9bfb6" stroke-width="2.5" stroke-linecap="round"/>`).join('') +
      E(94, 58, 18, 5, '#fcfcfc', 1.4) +
      `<g transform="translate(97 53) scale(.55)">${fish('#e8a35a')}</g>`,

    weather: () =>
      box('#8cc4ec') +
      S('M 8 70 Q 4 50 22 46 Q 30 30 52 38 Q 70 30 86 44 Q 110 44 112 64 Q 114 80 90 80 L 20 80 Q 6 80 8 70 Z', '#8cac64', 1.6) +
      `<g transform="translate(34 24)"><g class="tv-spin">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M 0 -15 L 0 -19" transform="rotate(${a})" stroke="${K.line}" stroke-width="2.4" stroke-linecap="round"/>`).join('')}${E(0, 0, 10, 10, '#ffe08a', 1.5)}</g></g>` +
      S('M 66 32 Q 66 22 76 23 Q 80 14 90 18 Q 100 16 100 26 Q 108 28 104 34 Z', '#fcfcfc', 1.5) +
      `<text x="98" y="70" text-anchor="middle" font-size="15" font-weight="900" fill="#fcfcfc" stroke="${K.line}" stroke-width="3" paint-order="stroke" font-family="'M PLUS Rounded 1c', Nunito, sans-serif">31°</text>`,

    space: () =>
      box('#1f2650') +
      [[12, 14], [30, 40], [52, 10], [70, 50], [96, 66], [108, 12], [20, 66], [60, 30]]
        .map(([x, y], i) => `<circle class="twinkle t${i % 3}" cx="${x}" cy="${y}" r="1.5" fill="#fff6c8"/>`)
        .join('') +
      E(86, 30, 13, 13, '#e8a35a', 1.5) +
      `<ellipse cx="86" cy="30" rx="22" ry="5" fill="none" stroke="${K.line}" stroke-width="4" transform="rotate(-15 86 30)"/><ellipse cx="86" cy="30" rx="22" ry="5" fill="none" stroke="#f4accc" stroke-width="2" transform="rotate(-15 86 30)"/>` +
      `<g class="tv-swim slow"><g transform="translate(0 60) rotate(90)">` +
      `<path d="M -3 10 L 0 18 L 3 10 Z" fill="#ecbc44"/>` +
      S('M 0 -12 Q 7 -4 6 10 L -6 10 Q -7 -4 0 -12 Z', '#fcfcfc', 1.4) +
      S('M -6 4 L -10 12 L -6 10 Z M 6 4 L 10 12 L 6 10 Z', '#d44c34', 1.2) +
      `<circle cx="0" cy="-1" r="2.5" fill="#6ca4e4" stroke="${K.line}" stroke-width="1.2"/></g></g>`,

    football: () =>
      box('#8cac64') +
      [0, 40, 80].map((x) => `<rect x="${x}" width="20" height="${TH}" fill="#9cbc74"/>`).join('') +
      L('M 60 0 L 60 82', '#fcfcfc', 2.2) +
      `<circle cx="60" cy="41" r="14" fill="none" stroke="#fcfcfc" stroke-width="2.2"/>` +
      L('M 120 24 L 108 24 L 108 58 L 120 58', '#fcfcfc', 2.2) +
      `<g class="tv-swim fast"><g transform="translate(0 62)"><g class="tv-bounce">${E(0, 0, 6, 6, '#fcfcfc', 1.4)}<circle r="2" fill="${K.line}"/></g></g></g>`,

    mouse: () =>
      box('#f8e7a8') +
      S('M -2 64 L 122 64 L 122 84 L -2 84 Z', '#dcbc84', 1.6) +
      `<path d="M 96 64 L 96 50 Q 104 40 112 50 L 112 64 Z" fill="${K.line}"/>` +
      S('M 78 64 L 90 64 L 90 56 Z', '#ecbc44', 1.3) +
      `<g class="tv-swim fast"><g transform="translate(0 58)">` +
      L('M -12 2 Q -20 -2 -24 4', K.line, 1.8) +
      E(0, 0, 12, 7, '#b9b4ad', 1.4) +
      E(6, -7, 4, 4, '#f4accc', 1.2) +
      `<circle cx="9" cy="-1" r="1.5" fill="${K.line}"/><circle cx="12.5" cy="1" r="1.3" fill="#f4accc"/>` +
      `</g></g>`,

    // Your own cat, in whatever look you chose.
    catshow: () =>
      box('#f9d6de') +
      [[18, 30], [100, 20], [92, 56]].map(([x, y], i) => `<path class="tv-rise" ${delay(-i * 0.8)} d="M ${x} ${y + 4} C ${x - 8} ${y - 2} ${x - 5} ${y - 9} ${x} ${y - 5} C ${x + 5} ${y - 9} ${x + 8} ${y - 2} ${x} ${y + 4} Z" fill="#f28ba0" stroke="${K.line}" stroke-width="1.2"/>`).join('') +
      `<g transform="translate(60 80) scale(.5)"><g class="cat">${G.CatArt.render('sit', 'tvcat')}</g></g>`,
  };
  const CHANNELS = Object.keys(SHOWS);

  function tvShow(id, number) {
    const badge =
      number != null
        ? `<g class="tv-badge"><text x="${TW - 6}" y="14" text-anchor="end" font-size="11" font-weight="900" fill="#fcfcfc" stroke="${K.line}" stroke-width="3" paint-order="stroke" font-family="'M PLUS Rounded 1c', Nunito, sans-serif">CH ${number}</text></g>`
        : '';
    return (SHOWS[id] || SHOWS.fish)() + badge;
  }

  // A flicker of static between channels.
  function tvStatic() {
    let s = box('#5a6070');
    for (let i = 0; i < 70; i++) {
      const v = 120 + Math.floor(Math.random() * 135);
      s += `<rect x="${Math.floor(Math.random() * TW)}" y="${Math.floor(Math.random() * TH)}" width="${2 + Math.floor(Math.random() * 6)}" height="2" fill="rgb(${v},${v},${v})"/>`;
    }
    return `<g class="tv-static">${s}</g>`;
  }

  // ---- Placeable items: [back, front] (front is drawn over the cat) ---------------

  const ITEM_ART = {
    scratcher(x, y) {
      const back =
        E(x, y - 30, 66, 20, '#a07a52', 3) +
        `<ellipse cx="${x}" cy="${y - 27}" rx="52" ry="14" fill="#8a6644"/>` +
        `<ellipse cx="${x}" cy="${y - 26}" rx="40" ry="10" fill="none" stroke="#755636" stroke-width="2" stroke-dasharray="3 3"/>` +
        `<ellipse cx="${x}" cy="${y - 25}" rx="26" ry="6" fill="none" stroke="#755636" stroke-width="2" stroke-dasharray="3 3"/>`;
      const front =
        S(`M ${x - 66} ${y - 30} Q ${x - 64} ${y - 4} ${x} ${y + 2} Q ${x + 64} ${y - 4} ${x + 66} ${y - 30} Q ${x + 62} ${y - 12} ${x} ${y - 10} Q ${x - 62} ${y - 12} ${x - 66} ${y - 30} Z`, '#b48a5e', 3) +
        S(`M ${x - 60} ${y - 14} Q ${x} ${y - 2} ${x + 60} ${y - 14} L ${x + 56} ${y - 6} Q ${x} ${y + 6} ${x - 56} ${y - 6} Z`, K.mint, 2) +
        [-36, -12, 12, 36].map((dx) => `<circle cx="${x + dx}" cy="${y - 5 + Math.abs(dx) * -0.12}" r="3" fill="#fff" stroke="${K.line}" stroke-width="1.2"/>`).join('');
      return [back, front];
    },
    box(x, y) {
      const back =
        S(`M ${x - 46} ${y - 50} L ${x - 38} ${y - 64} L ${x + 38} ${y - 64} L ${x + 46} ${y - 50} Z`, K.cardDark, 3) +
        S(`M ${x - 46} ${y - 50} L ${x - 66} ${y - 72} L ${x - 54} ${y - 78} L ${x - 38} ${y - 64} Z`, K.card, 3) +
        S(`M ${x + 46} ${y - 50} L ${x + 66} ${y - 72} L ${x + 54} ${y - 78} L ${x + 38} ${y - 64} Z`, K.card, 3);
      const front =
        R(x - 48, y - 50, 96, 52, K.card, 3) +
        `<rect x="${x - 7}" y="${y - 50}" width="14" height="52" fill="#e9c48a" opacity=".8"/>` +
        L(`M ${x - 30} ${y - 22} L ${x - 20} ${y - 22} M ${x + 20} ${y - 22} L ${x + 30} ${y - 22}`, K.cardDark, 2.5);
      return [back, front];
    },
    cushion(x, y) {
      const c =
        S(`M ${x - 58} ${y - 2} Q ${x - 62} ${y - 15} ${x - 50} ${y - 19} L ${x + 50} ${y - 19} Q ${x + 62} ${y - 15} ${x + 58} ${y - 2} Q ${x + 54} ${y + 6} ${x + 44} ${y + 6} L ${x - 44} ${y + 6} Q ${x - 54} ${y + 6} ${x - 58} ${y - 2} Z`, K.red, 3) +
        L(`M ${x - 46} ${y - 10} Q ${x} ${y - 4} ${x + 46} ${y - 10}`, '#ef8f78', 2.5) +
        `<circle cx="${x}" cy="${y - 7}" r="3" fill="#f3c66b" stroke="${K.line}" stroke-width="1.5"/>` +
        [[-60, -4], [60, -4]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="4" fill="#f3c66b" stroke="${K.line}" stroke-width="1.5"/>`).join('');
      return [c, ''];
    },
    yarn(x, y) {
      const c =
        L(`M ${x + 12} ${y - 6} Q ${x + 30} ${y + 2} ${x + 40} ${y - 2} Q ${x + 52} ${y - 6} ${x + 56} ${y}`, '#e98aa0', 2.5) +
        E(x, y - 17, 17, 17, '#e98aa0', 3) +
        L(`M ${x - 13} ${y - 26} Q ${x} ${y - 14} ${x + 12} ${y - 30} M ${x - 15} ${y - 14} Q ${x} ${y - 4} ${x + 15} ${y - 18} M ${x - 6} ${y - 32} Q ${x + 6} ${y - 18} ${x + 4} ${y - 2}`, '#c9677f', 2);
      return [c, ''];
    },
    fishToy(x, y) {
      const c =
        S(`M ${x - 30} ${y - 12} Q ${x - 10} ${y - 32} ${x + 18} ${y - 14} L ${x + 34} ${y - 26} L ${x + 32} ${y - 2} L ${x + 18} ${y - 10} Q ${x - 10} ${y + 6} ${x - 30} ${y - 12} Z`, '#7cb7e0', 3) +
        L(`M ${x - 6} ${y - 22} L ${x - 6} ${y - 4} M ${x + 4} ${y - 20} L ${x + 4} ${y - 6}`, '#4f8fbf', 3) +
        `<circle cx="${x - 20}" cy="${y - 14}" r="2.6" fill="${K.line}"/>`;
      return [c, ''];
    },
    bag(x, y) {
      const back = S(`M ${x - 38} ${y - 52} L ${x - 30} ${y - 62} L ${x + 44} ${y - 62} L ${x + 38} ${y - 52} Z`, '#8a6440', 3);
      const front =
        S(`M ${x + 38} ${y - 52} L ${x + 44} ${y - 62} L ${x + 50} ${y - 6} L ${x + 38} ${y + 2} Z`, '#c08e57', 3) +
        S(`M ${x - 38} ${y - 52} L ${x - 33} ${y - 47} L ${x - 27} ${y - 53} L ${x - 21} ${y - 47} L ${x - 15} ${y - 53} L ${x - 9} ${y - 47} L ${x - 3} ${y - 53} L ${x + 3} ${y - 47} L ${x + 9} ${y - 53} L ${x + 15} ${y - 47} L ${x + 21} ${y - 53} L ${x + 27} ${y - 47} L ${x + 33} ${y - 53} L ${x + 38} ${y - 52} L ${x + 38} ${y + 2} L ${x - 38} ${y + 2} Z`, '#d9aa72', 3) +
        L(`M ${x - 20} ${y - 30} L ${x - 14} ${y - 6} M ${x + 14} ${y - 36} L ${x + 22} ${y - 14}`, '#c08e57', 2);
      return [back, front];
    },
    tower(x, y) {
      const c =
        R(x - 52, y - 14, 104, 16, '#e6d3b3', 5) +
        `<rect x="${x - 11}" y="${y - 124}" width="22" height="112" fill="#e8c993" stroke="${K.line}" stroke-width="3"/>` +
        Array.from({ length: 13 }, (_, i) => L(`M ${x - 10} ${y - 118 + i * 8.5} L ${x + 10} ${y - 114 + i * 8.5}`, '#c9a46a', 2)).join('') +
        R(x + 8, y - 72, 52, 12, '#e6d3b3', 5) +
        L(`M ${x + 48} ${y - 60} L ${x + 48} ${y - 36}`, K.line, 2) +
        E(x + 48, y - 32, 6, 6, '#e98aa0', 2.5) +
        R(x - 50, y - 136, 100, 16, '#e6d3b3', 6);
      return [c, ''];
    },
    tent(x, y) {
      const back = `<path d="M ${x - 52} ${y + 2} L ${x} ${y - 100} L ${x + 52} ${y + 2} Z" fill="#2a2320"/>`;
      const front =
        S(`M ${x - 62} ${y + 2} L ${x} ${y - 104} L ${x} ${y - 62} Q ${x - 24} ${y - 40} ${x - 24} ${y + 2} Z`, '#2f2a28', 3) +
        S(`M ${x + 62} ${y + 2} L ${x} ${y - 104} L ${x} ${y - 62} Q ${x + 24} ${y - 40} ${x + 24} ${y + 2} Z`, '#d9573f', 3) +
        L(`M ${x + 18} ${y - 70} q 8 8 4 16 q -4 8 6 14 q 8 6 4 16`, '#f3c66b', 3) +
        `<path d="M ${x - 6} ${y - 92} L ${x + 6} ${y - 92} L ${x} ${y - 104} Z" fill="#f3c66b"/>`;
      return [back, front];
    },
  };

  function perch() {
    return (
      L('M 338 300 L 352 330 M 522 300 L 508 330', K.line, 2.5) +
      S('M 344 318 Q 430 348 516 318 L 516 326 Q 430 358 344 326 Z', '#f0c7a8', 3) +
      L('M 360 326 Q 430 348 500 326', '#e0a27f', 2, 'stroke-dasharray="5 5"')
    );
  }

  // ---- Seasonal decor ---------------------------------------------------------------

  function lantern(x, y) {
    return (
      L(`M ${x} 0 L ${x} ${y - 30}`, K.line, 2) +
      `<rect x="${x - 10}" y="${y - 32}" width="20" height="6" rx="2" fill="#f3c66b" stroke="${K.line}" stroke-width="2"/>` +
      E(x, y, 24, 28, '#e04a3a', 3) +
      L(`M ${x - 12} ${y - 24} Q ${x - 18} ${y} ${x - 12} ${y + 24} M ${x + 12} ${y - 24} Q ${x + 18} ${y} ${x + 12} ${y + 24} M ${x} ${y - 28} L ${x} ${y + 28}`, '#b5322a', 2) +
      `<rect x="${x - 10}" y="${y + 26}" width="20" height="6" rx="2" fill="#f3c66b" stroke="${K.line}" stroke-width="2"/>` +
      L(`M ${x - 5} ${y + 33} L ${x - 5} ${y + 50} M ${x} ${y + 33} L ${x} ${y + 54} M ${x + 5} ${y + 33} L ${x + 5} ${y + 50}`, '#f3c66b', 2.5)
    );
  }

  function ketupat(x, y) {
    return (
      L(`M ${x} 0 L ${x} ${y - 22}`, '#6b8e4e', 2) +
      S(`M ${x} ${y - 22} L ${x + 20} ${y} L ${x} ${y + 22} L ${x - 20} ${y} Z`, '#9cc46a', 3) +
      L(`M ${x - 10} ${y - 11} L ${x + 10} ${y + 11} M ${x + 10} ${y - 11} L ${x - 10} ${y + 11} M ${x - 5} ${y - 16} L ${x + 15} ${y + 5} M ${x - 15} ${y - 5} L ${x + 5} ${y + 16}`, '#6b8e4e', 2) +
      L(`M ${x - 3} ${y + 22} L ${x - 6} ${y + 40} M ${x + 3} ${y + 22} L ${x + 6} ${y + 38}`, '#9cc46a', 3)
    );
  }

  function pelita(x, y) {
    return (
      S(`M ${x - 9} ${y} L ${x - 6} ${y - 12} L ${x + 6} ${y - 12} L ${x + 9} ${y} Z`, '#c98f3a', 2.5) +
      `<path class="flame" d="M ${x} ${y - 30} Q ${x + 7} ${y - 20} ${x} ${y - 13} Q ${x - 7} ${y - 20} ${x} ${y - 30} Z" fill="#ffb347" stroke="#e07b24" stroke-width="1.5"/>`
    );
  }

  function decorBack(seasons) {
    let s = '';
    if (seasons.includes('cny')) {
      s += lantern(246, 112) + lantern(616, 112);
      s += `<g transform="translate(640 236) rotate(45)"><rect x="-22" y="-22" width="44" height="44" fill="#e04a3a" stroke="${K.line}" stroke-width="3"/></g>`;
      s += `<text x="640" y="248" text-anchor="middle" font-size="30" font-weight="700" fill="#f3c66b" font-family="serif">福</text>`;
    }
    if (seasons.includes('raya')) {
      s += ketupat(246, 112) + ketupat(616, 112) + ketupat(560, 70);
      let flags = '';
      for (let x = 0; x < W; x += 34) flags += `<path d="M ${x} 18 L ${x + 30} 18 L ${x + 15} 40 Z" fill="${(x / 34) % 2 ? '#f3c66b' : '#7fb35a'}" stroke="${K.line}" stroke-width="1.5"/>`;
      s += L(`M 0 18 L ${W} 18`, K.line, 2) + flags;
      s += pelita(318, 286) + pelita(542, 286);
    }
    if (seasons.includes('christmas')) {
      let bulbs = '';
      const cols = ['#e04a3a', '#f3c66b', '#7fb35a', '#7fb4d9'];
      for (let i = 0; i < 24; i++) {
        const x = 20 + i * 40;
        const y = 22 + Math.sin(i * 1.4) * 4 + 8;
        bulbs += `<circle class="twinkle t${i % 3}" cx="${x}" cy="${y}" r="5" fill="${cols[i % 4]}" stroke="${K.line}" stroke-width="1.5"/>`;
      }
      s += L(`M 0 24 Q 120 40 240 26 T 480 26 T 720 26 T 960 26`, K.line, 2) + bulbs;
      // wreath on the portrait
      s += `<circle cx="118" cy="86" r="14" fill="none" stroke="#5f8a45" stroke-width="7"/><circle cx="118" cy="98" r="4" fill="#e04a3a"/>`;
    }
    return s;
  }

  function decorItems(seasons) {
    const out = [];
    if (seasons.includes('christmas')) {
      const x = 300;
      const y = 452;
      out.push({
        z: y,
        svg:
          `<rect x="${x - 8}" y="${y - 16}" width="16" height="16" fill="${K.woodDark}" stroke="${K.line}" stroke-width="2.5"/>` +
          S(`M ${x} ${y - 140} L ${x + 30} ${y - 96} L ${x + 18} ${y - 96} L ${x + 42} ${y - 56} L ${x + 26} ${y - 56} L ${x + 52} ${y - 16} L ${x - 52} ${y - 16} L ${x - 26} ${y - 56} L ${x - 42} ${y - 56} L ${x - 18} ${y - 96} L ${x - 30} ${y - 96} Z`, '#5f9a52', 3) +
          [[-14, -100, '#e04a3a'], [12, -78, '#7fb4d9'], [-20, -50, '#f3c66b'], [22, -34, '#e04a3a'], [-4, -30, '#7fb4d9']]
            .map(([dx, dy, c]) => `<circle cx="${x + dx}" cy="${y + dy}" r="5" fill="${c}" stroke="${K.line}" stroke-width="1.5"/>`)
            .join('') +
          `<path d="M ${x} ${y - 156} l 4 9 l 10 1 l -8 6 l 3 10 l -9 -6 l -9 6 l 3 -10 l -8 -6 l 10 -1 Z" fill="#f3c66b" stroke="${K.line}" stroke-width="2"/>`,
      });
    }
    if (seasons.includes('cny')) {
      out.push({ z: 497, svg: [[770, 343], [788, 343], [779, 333]].map(([x, y]) => E(x, y - 8, 10, 9, '#f39a3a', 2.5) + `<path d="M ${x} ${y - 17} q 4 -4 8 -2" stroke="#5f8a45" stroke-width="2.5" fill="none"/>`).join('') });
    }
    return out;
  }

  // ---- Gifts on the floor ---------------------------------------------------------------

  const GIFT_ART = {
    leaf: () => S('M -12 4 Q -10 -10 10 -8 Q 10 6 -12 4 Z', '#d99a3a', 2) + L('M -12 4 L 8 -6', '#a8702a', 1.5),
    bottleCap: () => E(0, 0, 9, 9, '#e04a3a', 2) + `<circle r="5" fill="none" stroke="#fff" stroke-width="1.5"/>`,
    hairTie: () => `<ellipse rx="10" ry="6" fill="none" stroke="${K.line}" stroke-width="6"/><ellipse rx="10" ry="6" fill="none" stroke="#e98aa0" stroke-width="3.5"/>`,
    sock: () => S('M -4 -12 L 4 -12 L 4 2 Q 12 2 12 7 Q 12 11 2 11 L -4 11 Z', '#7fb4d9', 2) + L('M -4 -6 L 4 -6 M -4 -2 L 4 -2', '#fff', 2),
    receipt: () => S('M -9 -10 L 9 -8 L 7 10 L -8 9 Z', '#fffdf6', 2) + L('M -5 -4 L 5 -3 M -5 1 L 4 2 M -5 5 L 2 5', '#b9a993', 1.5),
    feather: () => S('M -12 8 Q -6 -12 12 -12 Q 8 6 -12 8 Z', '#f6f1e6', 2) + L('M -12 8 L 8 -8', '#c9b9a0', 1.5),
    button: () => E(0, 0, 9, 9, '#9fd9cf', 2) + `<circle cx="-3" cy="-2" r="1.5" fill="${K.line}"/><circle cx="3" cy="-2" r="1.5" fill="${K.line}"/><circle cx="-3" cy="3" r="1.5" fill="${K.line}"/><circle cx="3" cy="3" r="1.5" fill="${K.line}"/>`,
    geckoTail: () => L('M -12 2 Q -4 -8 4 0 Q 10 6 14 -2', K.line, 7) + L('M -12 2 Q -4 -8 4 0 Q 10 6 14 -2', '#a9a36a', 4),
    coin: () => E(0, 0, 10, 10, '#d9b45a', 2) + `<text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#8a6a2a" font-family="sans-serif">50</text>`,
    goldBell: () => E(0, 0, 10, 10, '#f6d55c', 2.5) + L('M -10 0 L 10 0', K.line, 2) + `<circle cy="5" r="2" fill="${K.line}"/>`,
  };

  function giftsLayer(state) {
    return state.room.gifts.map((g, i) => {
      const x = 590 + i * 46;
      const y = 586;
      return {
        z: y + 2,
        svg:
          `<g class="gift" data-gift="${i}" transform="translate(${x} ${y})" style="cursor:pointer">` +
          `<circle r="22" fill="#fff" opacity="0"/>` +
          (GIFT_ART[g.id] || GIFT_ART.leaf)() +
          `<g class="sparkle"><path d="M 14 -16 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 Z" fill="#fff6b0" stroke="#e0b84a" stroke-width="1"/></g>` +
          `</g>`,
      };
    });
  }

  function cupOnFloor() {
    return {
      z: 590,
      svg:
        `<g class="cup" style="cursor:pointer" transform="translate(770 590)">` +
        `<ellipse cx="18" cy="2" rx="26" ry="6" fill="#bfe2f5" opacity=".8"/>` +
        `<circle r="24" fill="#fff" opacity="0"/>` +
        mug(0, 0, 100) +
        `</g>`,
    };
  }

  // Everything that sorts with the cat, as [{z, svg}].
  function midLayer(state, seasons) {
    const out = [];
    out.push({ z: 460, svg: desk() });
    out.push({ z: 480, svg: chair() });
    out.push({ z: 494, svg: table(state) });
    out.push({ z: 530, svg: bowls(state) });
    if (state.room.perch) out.push({ z: 302, svg: perch() });
    state.room.slots.forEach((id, i) => {
      if (!id || !ITEM_ART[id]) return;
      const { x, y } = SLOTS[i];
      const [back, front] = ITEM_ART[id](x, y);
      out.push({ z: y - (id === 'tower' ? 2 : 1), svg: back });
      if (front) out.push({ z: y + 1, svg: front });
    });
    for (const d of decorItems(seasons)) out.push(d);
    for (const g of giftsLayer(state)) out.push(g);
    if (state.room.cupOnFloor) out.push(cupOnFloor());
    return out;
  }

  // Small preview of an item for menus.
  function itemIcon(id) {
    if (id === 'perch') return `<svg viewBox="330 290 200 70">${perch()}</svg>`;
    const art = ITEM_ART[id];
    if (!art) return '';
    const [b, f] = art(0, 0);
    const vb = id === 'tower' ? '-70 -150 140 160' : '-75 -90 150 100';
    return `<svg viewBox="${vb}">${b}${f}</svg>`;
  }

  function giftIcon(id) {
    return `<svg viewBox="-20 -20 40 40">${(GIFT_ART[id] || GIFT_ART.leaf)()}</svg>`;
  }

  // ---- Lighting & clock --------------------------------------------------------------

  // Flat sky: one colour between the clock's top and bottom sky tones.
  function mixHex(a, b, f) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - f) + ((pb >> sh) & 255) * f);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  function applyLighting(root, light) {
    const $ = (id) => root.querySelector('#' + id);
    const sky = mixHex(light.skyTop, light.skyBot, 0.55);
    $('sky-top').setAttribute('stop-color', sky);
    $('sky-bot').setAttribute('stop-color', sky);
    $('tint').setAttribute('fill', light.tint);
    $('tint').setAttribute('opacity', light.alpha.toFixed(3));
    $('lamp-glow').setAttribute('opacity', (light.lamp * 0.28).toFixed(3));
    $('bulb').setAttribute('opacity', (0.3 + light.lamp * 0.7).toFixed(3));
    $('sunbeam').setAttribute('opacity', light.beam.toFixed(3));
    $('stars').setAttribute('opacity', light.isDay ? 0 : Math.min(1, light.lamp).toFixed(2));
    const sun = $('sun');
    const moon = $('moon');
    if (light.isDay) {
      const p = light.sunP;
      sun.setAttribute('display', 'inline');
      moon.setAttribute('display', 'none');
      sun.setAttribute('transform', `translate(${345 + p * 170} ${220 - Math.sin(p * Math.PI) * 120})`);
    } else {
      const p = Math.min(1, Math.max(0, light.moonP));
      sun.setAttribute('display', 'none');
      moon.setAttribute('display', 'inline');
      moon.setAttribute('transform', `translate(${345 + p * 170} ${200 - Math.sin(p * Math.PI) * 90})`);
    }
  }

  function updateClock(root, t) {
    const d = new Date(t);
    const m = d.getMinutes();
    const h = (d.getHours() % 12) + m / 60;
    root.querySelector('#clock-h').setAttribute('transform', `rotate(${h * 30})`);
    root.querySelector('#clock-m').setAttribute('transform', `rotate(${m * 6})`);
  }

  function overlay() {
    return (
      `<rect id="tint" x="-1500" y="-400" width="${W + 3000}" height="${H + 800}" fill="#000" opacity="0" pointer-events="none" style="mix-blend-mode:multiply"/>` +
      `<g id="lamp-glow" opacity="0" pointer-events="none"><path d="M 818 136 L 882 136 L 990 470 L 710 470 Z" fill="#fff2b0"/></g>`
    );
  }

  const TV = { CHANNELS, show: tvShow, static: tvStatic };
  // [back, front] art for one placeable item (the intro borrows a box).
  const itemArt = (id, x, y) => ITEM_ART[id](x, y);

  G.RoomArt = { W, H, FLOOR, SPOTS, SLOTS, TV, itemArt, spotPos, scaleAt, background, midLayer, decorBack, overlay, applyLighting, updateClock, itemIcon, giftIcon };
})(globalThis.CatGame = globalThis.CatGame || {});
