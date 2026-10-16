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

  // Furniture colours from the gachapon (see Gacha.PIECES). 'base' is each piece's original look.
  const SKINS = {
    wall: {
      base: { wall: K.wall, top: K.wallTop, wains: K.wains, line: K.wainsLine },
      peach: { wall: '#fff0e6', top: '#fde2d2', wains: '#f8d2bc', line: '#e3a88a' },
      mint: { wall: '#f0f9f2', top: '#e2f2e6', wains: '#cfe8d7', line: '#98c8ab' },
      lavender: { wall: '#f5f0fd', top: '#ebe2f9', wains: '#ddd0f3', line: '#b3a0da' },
    },
    curtains: {
      base: { fill: K.cream, fold: '#e2d6c2' },
      pink: { fill: '#fad3df', fold: '#eba8bd' },
      sky: { fill: '#d2e9f7', fold: '#9cc6e3' },
      polka: { fill: K.cream, fold: '#e2d6c2', dots: K.red },
    },
    clock: {
      base: { face: K.cream, ring: K.red, ears: K.cream, hands: K.line },
      pink: { face: '#ffe8ef', ring: '#ff6f91', ears: '#ffc7d6', hands: K.line },
      mint: { face: '#ecf8f4', ring: '#3fa58f', ears: '#bfe8dc', hands: K.line },
      midnight: { face: '#3a3a40', ring: '#ecbc44', ears: '#3a3a40', hands: '#ecbc44' },
    },
    rug: {
      base: { fill: K.red, ring: '#e8806a' },
      blue: { fill: '#5b8fd4', ring: '#a6c6f0' },
      lavender: { fill: '#a98bd9', ring: '#d8c9f3' },
    },
    chair: {
      base: { canvas: K.olive, seam: K.oliveDark },
      red: { canvas: '#e0735f', seam: '#a8473a' },
      navy: { canvas: '#5574ad', seam: '#2f4a7a' },
    },
    lamp: {
      base: { shade: '#ecbc44', rim: '#d9a43a' },
      mint: { shade: '#8fd3c6', rim: '#5fb3a3' },
      pink: { shade: '#f6b3cf', rim: '#e07fa8' },
    },
    desk: {
      base: { top: K.woodLight, body: K.wood, feet: K.woodDark },
      white: { top: '#fbf8f2', body: '#e9e1d2', feet: '#c4b69e' },
      pink: { top: '#ffd9e2', body: '#f4accc', feet: '#c9708f' },
    },
  };
  // The colour chip for each choice in the Room panel (CSS backgrounds).
  const SWATCH = {
    wall: { base: '#f6ead6', peach: '#f8d2bc', mint: '#cfe8d7', lavender: '#ddd0f3' },
    curtains: { base: '#fcfcfc', pink: '#fad3df', sky: '#d2e9f7', polka: 'radial-gradient(circle at 28% 30%, #d44c34 0 17%, transparent 19%), radial-gradient(circle at 72% 68%, #d44c34 0 17%, transparent 19%), #fcfcfc' },
    clock: { base: '#d44c34', pink: '#ff6f91', mint: '#3fa58f', midnight: '#3a3a40' },
    rug: { base: '#d44c34', blue: '#5b8fd4', lavender: '#a98bd9' },
    chair: { base: '#8cac64', red: '#e0735f', navy: '#5574ad' },
    lamp: { base: '#ecbc44', mint: '#8fd3c6', pink: '#f6b3cf' },
    desk: { base: '#d39a64', white: '#fbf8f2', pink: '#ffd9e2' },
  };
  const skinSwatch = (piece, colour) => (SWATCH[piece] && (SWATCH[piece][colour || 'base'] || SWATCH[piece].base)) || '#ccc';

  // Where each piece is in the room (x, y, width, height), to point at it.
  const PIECE_BOX = {
    wall: { x: 20, y: 44, w: 1208, h: 372 }, // the width of the room, less a margin
    curtains: { x: 414, y: 34, w: 368, h: 388 },
    clock: { x: 922, y: 78, w: 80, h: 90 },
    rug: { x: 462, y: 500, w: 352, h: 94 },
    chair: { x: 798, y: 282, w: 156, h: 214 },
    lamp: { x: 1090, y: 86, w: 86, h: 60 },
    desk: { x: 56, y: 316, w: 212, h: 156 },
    table: { x: 1016, y: 336, w: 224, h: 162 },
    laptop: { x: 1112, y: 284, w: 84, h: 66 },
    litter: { x: 1064, y: 414, w: 126, h: 84 },
    bowls: { x: 386, y: 510, w: 124, h: 52 },
  };

  // The colours a piece is drawn in right now.
  const paint = (state, piece) => {
    const v = state && G.Gacha ? G.Gacha.skinOf(state, piece) : '';
    return SKINS[piece][v] || SKINS[piece].base;
  };

  // Shop looks (see shopArt.js): which one a piece wears, the colour palette it is painted in
  // (null when it still has its original colour), and its drawing (null for the original look).
  const styleOf = (state, piece) => (state && G.Shop ? G.Shop.styleOf(state, piece) : '');
  const skinPal = (state, piece) => {
    const v = state && G.Gacha ? G.Gacha.skinOf(state, piece) : '';
    return v && SKINS[piece] ? SKINS[piece][v] : null;
  };
  const look = (piece, style) => (style && G.ShopArt && G.ShopArt[piece] && G.ShopArt[piece][style]) || null;
  const alt = (state, piece) => {
    const f = look(piece, styleOf(state, piece));
    return f ? f(skinPal(state, piece)) : null;
  };

  // The room is wide, so a wide screen is filled instead of showing empty wall. Each piece of
  // furniture is drawn at its original coordinates and slid sideways (DX) so they stand well
  // apart; the places the cat uses (SPOTS, SLOTS) move by the same amounts.
  const W = 1248; // 30% wider than the original 960
  const H = 600;
  const FLOOR = 420;
  const DX = { tv: 24, basket: 140, mid: 168, chair: 234, clock: 240, note: 252, right: 282 };
  const GACHA_X = 322; // the gachapon machine, between the TV desk and the toy basket
  const at = (dx, svg) => `<g transform="translate(${dx} 0)">${svg}</g>`;
  // The dotted rings that point things out show until you've used that thing once.
  const guide = (state, key) => !(state.flags && state.flags.learned && state.flags.learned[key]);

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
    sill: { x: 430 + DX.mid, y: 291, z: 303, floor: { x: 430 + DX.mid, y: 468 } },
    // On the sill beside the pot of cat grass (left of the cat, so it faces left).
    grass: { x: 446 + DX.mid, y: 291, z: 303, face: -1, floor: { x: 446 + DX.mid, y: 468 } },
    chair: { x: 640 + DX.chair, y: 404, z: 482, floor: { x: 640 + DX.chair, y: 494 } },
    table: { x: 795 + DX.right, y: 350, z: 496, floor: { x: 795 + DX.right, y: 506 } },
    laptop: { x: 868 + DX.right, y: 342, z: 497, floor: { x: 868 + DX.right, y: 506 } },
    desk: { x: 205 + DX.tv, y: 330, z: 462, floor: { x: 205 + DX.tv, y: 474 } },
    rug: { x: 470 + DX.mid, y: 548, z: 548 },
    bowl: { x: 238 + DX.basket, y: 541, z: 542, face: 1 },
    floorL: { x: 526, y: 488, z: 488 },
    floorR: { x: 976, y: 528, z: 528 },
    wall: { x: 545 + DX.mid, y: 446, z: 446, face: 1 },
    // Under the table. The cat steps in from the front and sits low in the tray.
    litter: { x: 845 + DX.right, y: 458, z: 484, floor: { x: 845 + DX.right, y: 500 } },
    litterOut: { x: 724 + DX.right, y: 500, z: 500 },
    front: { x: 520 + DX.mid, y: 590, z: 591 },
    // At the foot of the left curtain, which the cat climbs when it is bored.
    curtain: { x: 466, y: 440, z: 441, face: 1 },
    // Right of the water bowl, facing it, for a drink (and the paw that goes in).
    water: { x: 536, y: 548, z: 549, face: -1 },
  };

  const SLOTS = [
    { x: 105 + DX.tv, y: 568 },
    { x: 296, y: 592 }, // the front of the floor between the TV corner and the bowls
    { x: 668 + DX.chair, y: 584 },
    { x: 868 + DX.right, y: 574 },
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
    mouse: { dx: -48, dy: 0, face: 1 },
    ball: { dx: -44, dy: 0, face: 1 },
    banana: { dx: 0, dy: -10 },
    duck: { dx: -44, dy: 0, face: 1 },
    donut: { dx: 0, dy: -12 },
    tunnel: { dx: 0, dy: -4 },
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
    s += `<g id="wx-back"></g>`;
    // a flat hedge and a round tree, like the yard in the reference
    s += S('M 330 282 L 330 236 Q 352 220 374 234 Q 396 216 420 232 Q 444 218 466 232 L 466 282 Z', '#8cac64', 2.5);
    // (the tree sways in the wind, harder in a storm)
    s += `<g id="wx-tree" class="wx-tree wxfx">`;
    s += L('M 530 236 Q 500 240 470 250', K.line, 9) + L('M 530 236 Q 500 240 470 250', '#8a5636', 5);
    s += `<g fill="#8cac64" stroke="${K.line}" stroke-width="3"><circle cx="500" cy="232" r="13"/><circle cx="532" cy="252" r="15"/><circle cx="522" cy="222" r="18"/></g>`;
    s += L('M 516 214 Q 522 220 528 216 M 496 228 Q 500 232 504 229', '#4c8444', 2.5);
    s += `</g>`;
    s += `<g id="bird" display="none" transform="translate(484 240)"><g class="bird-hop">${S('M -10 0 Q -8 -12 2 -12 Q 10 -12 11 -5 L 16 -4 L 11 -1 Q 8 6 -2 5 Q -8 5 -10 0 Z', '#7fa8d6', 2.2)}<circle cx="5" cy="-7" r="1.4" fill="#2a231f"/>${L('M -4 -4 Q 0 -1 4 -4', '#5b7fa8', 2)}${L('M -2 5 L -2 9 M 2 5 L 2 9', '#c9873a', 1.6)}</g></g>`;
    s += `<g id="wx-front"></g>`;
    s += `</g>`;
    // Frame
    s += `<rect x="330" y="80" width="200" height="200" fill="none" stroke="${K.cream}" stroke-width="12"/>`;
    s += `<rect x="322" y="72" width="216" height="216" fill="none" stroke="${K.line}" stroke-width="4" rx="4"/>`;
    s += `<rect x="336" y="86" width="188" height="188" fill="none" stroke="${K.line}" stroke-width="3.5"/>`;
    s += L('M 430 86 L 430 274', K.line, 12) + L('M 430 86 L 430 274', K.cream, 6) + L('M 336 180 L 524 180', K.line, 12) + L('M 336 180 L 524 180', K.cream, 6);
    s += `<rect x="304" y="286" width="252" height="14" rx="3" fill="${K.woodLight}" stroke="${K.line}" stroke-width="3"/>`;
    return s;
  }

  // ---- Weather outside the window ------------------------------------------------------
  // Each kind of weather has its own things going on out there. Everything is drawn in the
  // window's own 200 x 200 space and moved with CSS (see .wxfx in styles.css); `back` sits
  // behind the hedge and tree, `front` in front of them.

  function wxCloud(x, y, sc, fill, dur, delay) {
    const sh = '<ellipse cx="0" cy="0" rx="28" ry="12"/><circle cx="-12" cy="-7" r="11"/><circle cx="8" cy="-12" r="14"/><circle cx="24" cy="-3" r="9"/>';
    return `<g style="animation:wx-drift ${dur}s linear ${delay}s infinite"><g transform="translate(${x} ${y}) scale(${sc})"><g fill="${K.line}" stroke="${K.line}" stroke-width="5" stroke-linejoin="round">${sh}</g><g fill="${fill}">${sh}</g></g></g>`;
  }

  function wxStreaks(n, len, dur, op, col) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = ((i * 37) % 210) - 5;
      const delay = (-((i * 13) % 10) / 10) * dur;
      const y0 = (i * 53) % 190;
      s += `<line x1="${x}" y1="-20" x2="${x - 3}" y2="${len - 20}" stroke="${col}" stroke-width="1.8" stroke-linecap="round" opacity="${op}" style="--y:${y0}px;animation:wx-fall ${dur}s linear ${delay.toFixed(2)}s infinite"/>`;
    }
    return s;
  }

  function wxWalker(night, umbrella) {
    const top = night ? '#6b7391' : '#e0735f';
    return (
      `<g style="animation:wx-walk 16s linear infinite"><g style="animation:wx-bob .6s ease-in-out infinite">` +
      `<circle cx="0" cy="160" r="4.5" fill="#f2c9a0" stroke="${K.line}" stroke-width="2"/>` +
      `<rect x="-4.5" y="165" width="9" height="14" rx="3" fill="#4d6fa8" stroke="${K.line}" stroke-width="2"/>` +
      (umbrella ? `<path d="M-15 156 Q0 138 15 156 Z" fill="${top}" stroke="${K.line}" stroke-width="2.5" stroke-linejoin="round"/><line x1="0" y1="156" x2="0" y2="166" stroke="${K.line}" stroke-width="2"/>` : '') +
      `</g></g>`
    );
  }

  function wxBird(y, dur, delay) {
    return `<g style="animation:wx-fly ${dur}s linear ${delay}s infinite"><g class="wx-o" style="animation:wx-flap .5s ease-in-out infinite"><path d="M0 ${y} q5 -6 10 0 q5 -6 10 0" fill="none" stroke="${K.line}" stroke-width="2.4" stroke-linecap="round"/></g></g>`;
  }

  function weatherArt(kind, night) {
    const cloudFill = { storm: night ? '#2a2f47' : '#3f465c', rain: night ? '#394057' : '#7d8896', overcast: night ? '#444a63' : '#a4abb5', snow: night ? '#5a6280' : '#d3d9e2' }[kind] || (night ? '#4a5483' : '#ffffff');
    let back = '';
    let front = '';
    if (kind === 'partly') back += wxCloud(40, 40, 1.1, cloudFill, 34, -6) + wxCloud(30, 80, 0.8, cloudFill, 48, -30);
    if (kind === 'overcast' || kind === 'snow') back += wxCloud(20, 34, 1.5, cloudFill, 70, -10) + wxCloud(60, 72, 1.3, cloudFill, 90, -50) + wxCloud(30, 106, 1.2, cloudFill, 80, -25);
    if (kind === 'rain') back += wxCloud(20, 34, 1.6, cloudFill, 80, -10) + wxCloud(70, 72, 1.4, cloudFill, 100, -60);
    if (kind === 'storm') back += wxCloud(24, 34, 1.7, cloudFill, 60, -10) + wxCloud(60, 78, 1.5, cloudFill, 75, -40) + wxCloud(20, 112, 1.3, cloudFill, 66, -20);

    if (kind === 'clear' && !night) {
      front += wxBird(60, 16, 0) + wxBird(76, 22, -9);
      front += `<g style="animation:wx-fly 20s linear -4s infinite"><g style="animation:wx-bob 1.2s ease-in-out infinite"><g class="wx-o" style="animation:wx-flapx .4s ease-in-out infinite"><ellipse cx="-4" cy="120" rx="4.5" ry="3.2" fill="#f4accc" stroke="${K.line}" stroke-width="1.6"/><ellipse cx="4" cy="120" rx="4.5" ry="3.2" fill="#f4accc" stroke="${K.line}" stroke-width="1.6"/></g></g></g>`;
    }
    if (kind === 'clear' && night) {
      for (let f = 0; f < 7; f++) front += `<circle cx="${20 + f * 26}" cy="${148 + ((f * 17) % 28)}" r="2.4" fill="#f6e87a" style="animation:wx-fire ${(2.4 + (f % 3) * 0.8).toFixed(1)}s ease-in-out ${(f * 0.5).toFixed(1)}s infinite"/>`;
    }
    if (kind === 'partly' && !night) {
      front += `<g transform="translate(152 56)"><g style="transform-origin:0 60px;animation:wx-kite 3s ease-in-out infinite"><path d="M0 -14 L10 0 L0 18 L-10 0Z" fill="#e0735f" stroke="${K.line}" stroke-width="2.5" stroke-linejoin="round"/><path d="M0 18 q-6 8 0 14 q6 8 0 14" fill="none" stroke="${K.line}" stroke-width="2"/></g><path d="M0 18 q-10 50 -16 94" fill="none" stroke="${K.line}" stroke-width="1.6" opacity=".6"/></g>`;
    }
    if (kind === 'overcast') {
      for (let l = 0; l < 4; l++) front += `<g style="animation:wx-leaf ${(7 + l * 1.6).toFixed(1)}s linear ${(-l * 2.1).toFixed(1)}s infinite"><ellipse cx="0" cy="${106 + l * 14}" rx="4.5" ry="2.6" fill="${l % 2 ? '#e0a64a' : '#c46a3c'}" stroke="${K.line}" stroke-width="1.6"/></g>`;
      front += wxWalker(night, false);
    }
    if (kind === 'rain') {
      front += wxWalker(night, true);
      for (let r = 0; r < 3; r++) front += `<ellipse class="wx-o" cx="${40 + r * 60}" cy="188" rx="14" ry="3" fill="none" stroke="#e8f2fa" stroke-width="1.6" style="animation:wx-rip 1.8s ease-out ${(r * 0.6).toFixed(1)}s infinite"/>`;
      front += wxStreaks(26, 10, 0.9, 0.75, night ? '#9fb2d6' : '#e9f3fb');
    }
    if (kind === 'storm') {
      front += `<polygon class="wx-o" points="132,60 118,100 128,100 112,146 144,92 132,92 146,60" fill="#fff6a8" stroke="${K.line}" stroke-width="2" style="animation:wx-bolt 5s linear infinite"/>`;
      front += wxStreaks(46, 13, 0.55, 0.8, night ? '#8ea2d0' : '#dbe8f5');
    }
    if (kind === 'snow') {
      for (let n = 0; n < 34; n++) front += `<circle cx="${(n * 41) % 200}" cy="-6" r="${(1.6 + (n % 3) * 0.5).toFixed(1)}" fill="#fff" stroke="${K.line}" stroke-width=".6" style="--y:${(n * 47) % 190}px;animation:wx-snow ${(4 + (n % 4) * 1.2).toFixed(1)}s linear ${(-(n % 9) * 0.6).toFixed(1)}s infinite"/>`;
    }
    if (kind === 'fog') {
      front += `<g style="animation:wx-glow 3s ease-in-out infinite"><circle cx="40" cy="146" r="20" fill="#ffe8a0" opacity=".55"/></g><line x1="40" y1="144" x2="40" y2="186" stroke="${K.line}" stroke-width="3"/><circle cx="40" cy="142" r="5" fill="#ffe08a" stroke="${K.line}" stroke-width="2.4"/>`;
      for (let m = 0; m < 3; m++) front += `<ellipse cx="${60 + m * 40}" cy="${112 + m * 26}" rx="95" ry="14" fill="${night ? '#6c7592' : '#ffffff'}" opacity="${(0.5 + m * 0.1).toFixed(1)}" style="animation:wx-mist ${9 + m * 3}s ease-in-out ${-m * 3}s infinite"/>`;
    }
    // raindrops sliding down the glass, and the flash of the lightning
    if (kind === 'rain' || kind === 'storm') for (let g = 0; g < 5; g++) front += `<circle cx="${26 + g * 38}" cy="${20 + ((g * 31) % 40)}" r="2.6" fill="#fff" opacity=".55" style="animation:wx-slide ${5 + g}s ease-in ${(-g * 1.7).toFixed(1)}s infinite"/>`;
    if (kind === 'storm') front += `<rect width="200" height="200" fill="#fff" opacity="0" style="animation:wx-flash 5s linear infinite"/>`;
    const wrap = (inner) => (inner ? `<g class="wxfx" transform="translate(330 80)">${inner}</g>` : '');
    return { back: wrap(back), front: wrap(front) };
  }

  // Flat cream curtains beside the window: opaque, a few fold lines, no sheer.
  function curtains(p) {
    p = p || SKINS.curtains.base;
    const panel = (x, flip) => {
      const m = flip ? -1 : 1;
      const d = `M ${x} 44 L ${x + 66 * m} 44 L ${x + 66 * m} 404 Q ${x + 50 * m} 414 ${x + 33 * m} 406 Q ${x + 16 * m} 414 ${x} 404 Z`;
      let dots = '';
      if (p.dots)
        for (let r = 0; r < 12; r++)
          for (let c = 0; c < 3; c++) dots += `<circle cx="${x + (11 + c * 22 + (r % 2) * 11) * m}" cy="${66 + r * 28}" r="4.5" fill="${p.dots}"/>`;
      return `<g class="cur ${flip ? 'cur-r' : 'cur-l'}">${S(d, p.fill, 3)}${dots}${p.deco ? p.deco(x, m) : ''}${L(`M ${x + 22 * m} 60 L ${x + 22 * m} 396 M ${x + 44 * m} 60 L ${x + 44 * m} 396`, p.fold, 3)}</g>`;
    };
    return (
      panel(264, false) +
      panel(596, true) +
      `<rect x="250" y="38" width="360" height="9" rx="4.5" fill="${p.rod || K.woodDark}" stroke="${K.line}" stroke-width="3.5"/>` +
      (p.finial
        ? p.finial(250) + p.finial(610)
        : `<circle cx="250" cy="42" r="8" fill="${K.woodDark}" stroke="${K.line}" stroke-width="3.5"/><circle cx="610" cy="42" r="8" fill="${K.woodDark}" stroke="${K.line}" stroke-width="3.5"/>`)
    );
  }

  // The clock face at (0, 0). The room's one has ids so the hands can turn; a menu icon doesn't.
  function clockFace(p, icon, lookFn) {
    if (lookFn) return lookFn(p, icon);
    p = p || SKINS.clock.base;
    return (
      E(0, 0, 34, 34, p.face, 3.5) +
      `<circle r="28" fill="none" stroke="${p.ring}" stroke-width="3"/>` +
      [0, 90, 180, 270].map((a) => `<rect x="-1.5" y="-25" width="3" height="6" fill="${p.hands}" transform="rotate(${a})"/>`).join('') +
      `<g ${icon ? 'transform="rotate(300)"' : 'id="clock-h"'}>${L('M 0 2 L 0 -14', p.hands, 4)}</g>` +
      `<g ${icon ? 'transform="rotate(60)"' : 'id="clock-m"'}>${L('M 0 3 L 0 -21', p.hands, 2.6)}</g>` +
      `<circle r="3" fill="${p.ring}"/>` +
      // little cat ears on top of the clock
      S('M -24 -24 L -26 -44 L -10 -32 Z', p.ears, 3) +
      S('M 24 -24 L 26 -44 L 10 -32 Z', p.ears, 3)
    );
  }

  function wallClock(state) {
    const f = look('clock', styleOf(state, 'clock'));
    return `<g transform="translate(${722 + DX.clock} 128)">${f ? clockFace(skinPal(state, 'clock'), false, f) : clockFace(paint(state, 'clock'))}</g>`;
  }

  function portrait() {
    // A framed photo of the cat on the wall.
    return (
      `<g class="portrait act" data-act="portrait" role="button" tabindex="0" aria-label="Profile and settings" style="cursor:pointer" transform="translate(${118 + DX.tv} 140)">` +
      `<rect x="-40" y="-48" width="80" height="96" rx="4" fill="${K.woodLight}" stroke="${K.line}" stroke-width="3"/>` +
      `<rect x="-30" y="-38" width="60" height="76" fill="#cfe6e0" stroke="${K.line}" stroke-width="2"/>` +
      `<clipPath id="portrait-clip"><rect x="-30" y="-38" width="60" height="76"/></clipPath>` +
      `<g clip-path="url(#portrait-clip)"><g transform="translate(0 38) scale(0.5)">${G.CatArt.render('sit', 'portrait')}</g></g>` +
      `</g>`
    );
  }

  function lamp(p, shade) {
    p = p || SKINS.lamp.base;
    return (
      `<g class="lamp act" data-act="lamp" role="button" tabindex="0" aria-label="Lamp: switch the lights on or off" style="cursor:pointer">` +
      `<rect x="800" y="40" width="100" height="112" rx="10" fill="none" pointer-events="all"/>` +
      L('M 850 0 L 850 96', K.line, 2.5) +
      (shade || S('M 818 132 Q 818 96 850 96 Q 882 96 882 132 Z', p.shade, 3) + R(814, 129, 72, 7, p.rim, 3, 2.5)) +
      `<ellipse id="bulb" cx="850" cy="138" rx="10" ry="5" fill="#fff4c8" opacity=".3"/>` +
      `</g>`
    );
  }

  function rugArt(p, other) {
    p = p || SKINS.rug.base;
    if (other) return other;
    return E(470, 546, 168, 40, p.fill, 3) + `<ellipse cx="470" cy="546" rx="140" ry="29" fill="none" stroke="${p.ring}" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/>`;
  }

  function background(state) {
    const wp = paint(state, 'wall');
    let s = '';
    s += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop id="sky-top" offset="0" stop-color="#8fd0ee"/><stop id="sky-bot" offset="1" stop-color="#e3f4fb"/></linearGradient>`;
    s += `</defs>`;
    // wall
    // Wall and floor run past the edges so wide screens never show bars.
    const X0 = -1500;
    const XW = W + 3000;
    s += `<rect x="${X0}" y="-400" width="${XW}" height="${FLOOR + 400}" fill="${wp.wall}"/>`;
    s += `<rect x="${X0}" y="-400" width="${XW}" height="420" fill="${wp.top}"/>`;
    s += `<rect x="${X0}" y="336" width="${XW}" height="${FLOOR - 336}" fill="${wp.wains}"/>`;
    s += L(`M ${X0} 336 L ${X0 + XW} 336`, K.line, 4);
    for (let x = -1470; x < W + 1500; x += 80) s += L(`M ${x} 346 L ${x} 406`, wp.line, 3);
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
    s += at(DX.mid, rugArt(paint(state, 'rug'), alt(state, 'rug')));
    // morning sunbeam from the window
    s += `<path id="sunbeam" d="M 360 420 L 520 420 L 640 600 L 380 600 Z" fill="#fff6d2" opacity="0" transform="translate(${DX.mid} 0)"/>`;
    s += at(DX.mid, `<g class="item act" data-act="window" data-spot="sill" style="cursor:pointer">${windowArt()}</g>`);
    const curLook = look('curtains', styleOf(state, 'curtains'));
    s += at(DX.mid, curtains(curLook ? curLook(skinPal(state, 'curtains')) : paint(state, 'curtains')));
    s += wallClock(state);
    s += portrait();
    s += at(DX.right, lamp(paint(state, 'lamp'), alt(state, 'lamp')));
    return s;
  }

  // ---- Furniture (sorted with the cat by z) ------------------------------------------

  function deskBody(p) {
    p = p || SKINS.desk.base;
    return (
      R(40, 324, 196, 16, p.top, 4) +
      R(48, 338, 180, 112, p.body, 3) +
      R(60, 352, 74, 40, p.top, 3, 2.5) +
      R(142, 352, 74, 40, p.top, 3, 2.5) +
      R(60, 400, 156, 40, p.top, 3, 2.5) +
      `<circle cx="97" cy="372" r="3" fill="${K.line}"/><circle cx="179" cy="372" r="3" fill="${K.line}"/><circle cx="138" cy="420" r="3" fill="${K.line}"/>` +
      R(52, 448, 12, 14, p.feet, 2, 2.5) +
      R(212, 448, 12, 14, p.feet, 2, 2.5)
    );
  }

  function desk(p, body) {
    return (
      // TV: tap it to change the channel (the scene fills #tv-show).
      `<g class="tv act" data-act="tv" style="cursor:pointer">` +
      `<rect x="96" y="314" width="56" height="10" rx="2" fill="${K.frame}" stroke="${K.line}" stroke-width="2.5"/>` +
      `<rect x="116" y="300" width="16" height="16" fill="${K.frame}"/>` +
      R(56, 206, 136, 98, K.frame, 6, 3) +
      `<clipPath id="tv-clip"><rect x="64" y="214" width="120" height="82" rx="3"/></clipPath>` +
      `<g clip-path="url(#tv-clip)"><rect x="64" y="214" width="120" height="82" fill="#33414d"/><g id="tv-show" transform="translate(64 214)"></g></g>` +
      // power button: tap it to switch the TV off (tap the screen of an off TV to switch it on)
      `<g class="tv-power act" data-act="tvpower" role="button" tabindex="0" aria-label="TV power"><circle cx="72" cy="297" r="17" fill="none" pointer-events="all"/><circle id="tv-led" cx="72" cy="299.5" r="2.8" fill="#6fd16f" stroke="${K.line}" stroke-width="1"/></g>` +
      `</g>` +
      (body || deskBody(p))
    );
  }

  // The green camping chair: black frame, olive canvas, wooden armrests.
  function chair(p, other) {
    p = p || SKINS.chair.base;
    const fr = K.line;
    if (other) return `<g>${other}</g>`;
    return (
      `<g>` +
      L('M 596 300 Q 640 286 686 300', fr, 7) +
      L('M 594 296 L 596 418 M 686 296 L 684 418', fr, 6) +
      S('M 598 308 L 684 308 L 682 370 L 600 370 Z', p.canvas, 3) +
      `<rect x="660" y="318" width="14" height="9" rx="1.5" fill="#b8743e" stroke="${K.line}" stroke-width="1.5"/>` +
      L('M 606 312 L 606 366 M 676 312 L 676 366', p.seam, 2) +
      // seat
      S('M 584 392 Q 640 412 698 392 L 700 404 Q 640 424 582 404 Z', p.canvas, 3) +
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

  // The table's legs and top, and the laptop on it, apart so the shop can change each.
  function tableBody(other) {
    return (
      other ||
      R(762, 360, 12, 134, K.woodDark, 2, 3) + R(918, 360, 12, 134, K.woodDark, 2, 3) + R(776, 360, 140, 18, K.wood, 2, 2.5) + R(742, 344, 208, 18, K.woodLight, 5, 3)
    );
  }

  function laptopArt(other) {
    return (
      other ||
      S('M 840 342 L 900 342 L 906 336 L 846 336 Z', '#c9ced4', 2.5) +
      S('M 846 336 L 838 292 L 892 292 L 900 336 Z', '#dfe3e8', 2.5) +
      `<circle cx="869" cy="314" r="5" fill="#f5f6f8" stroke="#b7bdc4" stroke-width="1.5"/>`
    );
  }

  function table(state) {
    let s = tableBody(alt(state, 'table')) + laptopArt(alt(state, 'laptop'));
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

  // The litter box under the table: a mint tray of sand. Each use leaves a
  // clump (pee: a lump of darker sand, poop: a little brown log). Tap it to scoop.
  const LITTER_X = 845;
  const LITTER_Y = 490;
  const CLUMP_AT = [[-34, -43], [-10, -46], [14, -43], [36, -46], [-22, -39], [24, -40]];
  function litterBox(state) {
    const x = LITTER_X;
    const y = LITTER_Y;
    const L = state.room.litter;
    const SAND = '#f3e3bb';
    const MINT = '#8fd3c6';
    const shop = look('litter', styleOf(state, 'litter'));
    const parts = shop ? shop(x, y) : null;
    let back =
      `<g class="litter act" data-act="litter" style="cursor:pointer">` +
      (parts ? parts.back : S(`M ${x - 56} ${y - 36} L ${x - 50} ${y - 52} L ${x + 50} ${y - 52} L ${x + 56} ${y - 36} Z`, '#6fb8a9', 3)) +
      S(`M ${x - 49} ${y - 38} L ${x - 44} ${y - 49} L ${x + 44} ${y - 49} L ${x + 49} ${y - 38} Z`, SAND, 2.5);
    L.clumps.forEach((kind, i) => {
      const [dx, dy] = CLUMP_AT[i % CLUMP_AT.length];
      back +=
        kind === 'poop'
          ? S(`M ${x + dx - 7} ${y + dy} Q ${x + dx - 8} ${y + dy - 7} ${x + dx} ${y + dy - 7} Q ${x + dx + 8} ${y + dy - 7} ${x + dx + 7} ${y + dy} Z`, '#8a5a3a', 2.4)
          : E(x + dx, y + dy - 3, 8, 5.5, '#cdb27c', 2);
    });
    // Smelly when it needs a scoop.
    if (G.Sim.isDirty(state)) {
      back += [-22, 0, 22].map((dx, i) => `<path class="stink" style="animation-delay:${i * 0.5}s" d="M ${x + dx} ${y - 58} q 6 -8 0 -16 t 0 -16" fill="none" stroke="#9aa83e" stroke-width="3" stroke-linecap="round"/>`).join('');
    }
    if (G.Sim.isDirty(state) && guide(state, 'litter')) back += `<ellipse class="nudge" cx="${x}" cy="${y - 22}" rx="74" ry="40" fill="none" stroke="#ff8a00" stroke-width="4" stroke-dasharray="8 7"/>`;
    back += `</g>`;
    const front =
      `<g class="litter act" data-act="litter" style="cursor:pointer">` +
      (parts
        ? parts.front
        : R(x - 56, y - 36, 112, 36, MINT, 6, 3) +
      `<rect x="${x - 56}" y="${y - 36}" width="112" height="9" rx="5" fill="#b6e6dc" stroke="${K.line}" stroke-width="${ow(3)}"/>` +
      // a little paw print
      `<ellipse cx="${x}" cy="${y - 12}" rx="7" ry="5.5" fill="#fcfcfc" stroke="${K.line}" stroke-width="1.8"/>` +
      [-8, -3, 3, 8].map((dx) => `<circle cx="${x + dx}" cy="${y - 21 + Math.abs(dx) * 0.35}" r="2.4" fill="#fcfcfc" stroke="${K.line}" stroke-width="1.4"/>`).join('')) +
      `</g>`;
    // An accident on the floor next to it.
    let mess = '';
    if (L.mess) {
      const px = 724;
      const py = 502;
      mess =
        `<g class="litter act" data-act="litter" style="cursor:pointer">` +
        E(px, py, 26, 7, '#efe08a', 2.4) +
        (L.mess > 1 ? E(px + 30, py + 5, 15, 4.5, '#efe08a', 2.2) : '') +
        `<path class="stink" d="M ${px - 6} ${py - 12} q 6 -8 0 -16" fill="none" stroke="#9aa83e" stroke-width="3" stroke-linecap="round"/></g>`;
    }
    return [back, front, mess];
  }


  // The toy basket tucked beside the TV desk. Tap it to pick a toy and play.
  function toyBasket() {
    const x = 290;
    const y = 502;
    const WICKER = '#d9a96a';
    let g = `<g class="toys act" data-act="toys" role="button" tabindex="0" aria-label="Toy basket: play" style="cursor:pointer">`;
    g += `<rect x="${x - 40}" y="${y - 96}" width="86" height="104" rx="12" fill="none" pointer-events="all"/>`;
    // feather wand and a laser pen poking out
    g += L(`M ${x + 8} ${y - 30} L ${x + 30} ${y - 82}`, K.line, 6);
    g += L(`M ${x + 8} ${y - 30} L ${x + 30} ${y - 82}`, '#e9c78d', 3);
    g += S(`M ${x + 30} ${y - 82} C ${x + 22} ${y - 98} ${x + 36} ${y - 108} ${x + 46} ${y - 100} C ${x + 52} ${y - 92} ${x + 42} ${y - 80} ${x + 30} ${y - 82} Z`, '#7fb4d9', 2.4);
    g += L(`M ${x + 31} ${y - 84} L ${x + 44} ${y - 98}`, '#4f83b0', 2);
    g += S(`M ${x - 14} ${y - 30} L ${x - 22} ${y - 62} L ${x - 14} ${y - 64} L ${x - 6} ${y - 32} Z`, K.red, 2.2);
    // a yarn ball
    g += E(x - 4, y - 32, 11, 11, '#f4accc', 2.4) + L(`M ${x - 11} ${y - 34} Q ${x - 4} ${y - 28} ${x + 3} ${y - 36}`, K.line, 1.6);
    // basket
    g += S(`M ${x - 32} ${y - 30} L ${x + 32} ${y - 30} L ${x + 26} ${y} Q ${x} ${y + 7} ${x - 26} ${y} Z`, WICKER, 3);
    g += [-14, 0, 14].map((dx) => L(`M ${x + dx} ${y - 28} L ${x + dx * 0.8} ${y + 2}`, '#b98445', 2)).join('');
    g += L(`M ${x - 30} ${y - 14} Q ${x} ${y - 8} ${x + 30} ${y - 14}`, '#b98445', 2);
    g += E(x, y - 30, 33, 6, '#e8c48a', 3);
    return g + `</g>`;
  }

  // The note on the wall: a small yellow sticky note with the start of today's note written on
  // it, cut off with "…" so you have to tap it to read the rest. A pulsing ring says it's unread.
  function stickyLines(text, maxChars, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    let i = 0;
    for (; i < words.length; i++) {
      const w = words[i];
      const next = cur ? cur + ' ' + w : w;
      if (next.length <= maxChars) {
        cur = next;
        continue;
      }
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
      if (lines.length === maxLines) break;
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    const cut = i < words.length || lines.length > maxLines;
    const out = lines.slice(0, maxLines);
    if (cut && out.length) {
      let last = out[out.length - 1];
      if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1);
      out[out.length - 1] = last.replace(/[\s,.;:!?-]+$/, '') + '…';
    }
    return out;
  }

  const xmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function noteBoard(fresh, text) {
    let g = `<g class="note act" data-act="note" role="button" tabindex="0" aria-label="Note of the day" style="cursor:pointer" transform="translate(${676 + DX.note} 236)">`;
    g += `<rect x="-38" y="-38" width="76" height="80" rx="8" fill="none" pointer-events="all"/>`;
    g += `<g transform="rotate(-3)">`;
    g += `<path d="M -26 -25 L 32 -25 L 32 36 L 20 48 L -26 48 Z" fill="#000" opacity=".12" transform="translate(2.5 3)"/>`;
    g += S('M -29 -29 L 29 -29 L 29 28 L 17 40 L -29 40 Z', '#fff2a6', 2);
    g += S('M 29 28 L 17 40 L 17 28 Z', '#e8d070', 1.6);
    g += `<path d="M -29 -29 L 29 -29 L 29 -22 L -29 -22 Z" fill="#f2db6a"/>`;
    g += `<clipPath id="note-clip"><rect x="-27" y="-22" width="54" height="60"/></clipPath>`;
    g += `<g clip-path="url(#note-clip)" font-family="'M PLUS Rounded 1c', 'Nunito', system-ui, sans-serif" font-size="7.6" font-weight="800" fill="#4a3b2d">`;
    stickyLines(text, 10, 4).forEach((ln, i) => {
      g += `<text x="-24" y="${-12 + i * 11}">${xmlEsc(ln)}</text>`;
    });
    g += `</g>`;
    g += `</g>`;
    if (fresh) g += `<ellipse class="nudge" cx="0" cy="2" rx="42" ry="46" fill="none" stroke="#ff8a00" stroke-width="4" stroke-dasharray="8 7"/>`;
    return g + `</g>`;
  }

  // A pot of cat grass on the windowsill. The more is left, the taller and fuller it is; a tap
  // invites the cat to nibble it.
  function catGrass(level) {
    const x = 368;
    const y = 286;
    const n = 4 + Math.round(level * 5);
    let g = `<g class="item act" data-act="grass" data-spot="grass" style="cursor:pointer">`;
    g += `<rect x="${x - 22}" y="${y - 62}" width="44" height="66" rx="8" fill="none" pointer-events="all"/>`;
    for (let i = 0; i < n; i++) {
      const bx = x - 10 + (i * 20) / Math.max(1, n - 1);
      const h = 7 + level * (14 + ((i * 7) % 5) * 3.2);
      const lean = ((i % 3) - 1) * 6 + (i % 2 ? 2 : -2);
      g += S(`M ${bx - 2} ${y - 20} Q ${bx + lean * 0.4} ${y - 20 - h * 0.6} ${bx + lean} ${y - 20 - h} Q ${bx + lean * 0.6 + 2} ${y - 20 - h * 0.45} ${bx + 2} ${y - 20} Z`, i % 2 ? '#86bf5c' : '#6fae4f', 1.5);
    }
    g += S(`M ${x - 12} ${y - 17} L ${x + 12} ${y - 17} L ${x + 9} ${y} L ${x - 9} ${y} Z`, '#d7774f', 2.4);
    g += R(x - 15, y - 22, 30, 7, '#e48e63', 2.5, 2.4);
    g += L(`M ${x - 5} ${y - 11} L ${x - 4} ${y - 4} M ${x + 5} ${y - 11} L ${x + 4} ${y - 4}`, '#b85f3b', 1.8);
    return g + `</g>`;
  }

  // What the cat left behind after the grass came back up. Tap it to clean it up.
  function vomitPuddles(state) {
    return (state.room.vomit || []).map((v, i) => {
      const sp = SPOTS[v.spot] || SPOTS.rug;
      const x = sp.x + (v.dx || 0);
      const y = sp.y + 8;
      const sc = scaleAt(y) * 1.3;
      return {
        z: y + 0.4,
        svg:
          `<g class="vomit act" data-act="vomit${i}" data-vomit="${i}" role="button" tabindex="0" aria-label="Clean up" style="cursor:pointer" transform="translate(${x} ${y}) scale(${sc.toFixed(3)})">` +
          `<ellipse cx="0" cy="0" rx="34" ry="30" fill="none" pointer-events="all"/>` +
          S('M -24 2 Q -26 -8 -12 -9 Q -6 -16 6 -11 Q 20 -13 24 -3 Q 30 4 20 8 Q 8 13 -6 10 Q -20 12 -24 2 Z', '#cfdc8c', 2.4) +
          `<ellipse cx="-6" cy="-1" rx="6" ry="2.6" fill="#b9c96e"/>` +
          [[-12, 3], [9, -2], [14, 5], [-1, 6]].map(([dx, dy]) => `<path d="M ${dx} ${dy} l 5 -2" stroke="#5f8f45" stroke-width="2.2" stroke-linecap="round"/>`).join('') +
          `<path class="stink" d="M 2 -14 q 6 -8 0 -16" fill="none" stroke="#9aa83e" stroke-width="3" stroke-linecap="round"/>` +
          (guide(state, 'vomit') ? `<ellipse class="nudge" cx="0" cy="-1" rx="38" ry="22" fill="none" stroke="#ff8a00" stroke-width="4" stroke-dasharray="8 7"/>` : '') +
          `</g>`,
      };
    });
  }

  // A small wall shelf with your diary on it. Tap it to open the diary.
  function diaryShelf(state) {
    const unread = (state.unseenUnlocks && state.unseenUnlocks.length > 0) || (G.Achievements ? G.Achievements.unclaimed(state).length > 0 : false);
    let g = `<g class="diary act" data-act="diary" role="button" tabindex="0" aria-label="Diary" style="cursor:pointer">`;
    g += `<rect x="744" y="196" width="118" height="68" rx="10" fill="none" pointer-events="all"/>`;
    g += S('M 764 256 L 764 270 L 774 256 Z M 842 256 L 842 270 L 832 256 Z', K.woodDark, 2.4);
    // teal book leaning on the diary
    g += S('M 800 248 L 806 208 L 822 211 L 818 248 Z', '#8fd3c6', 2.6) + L('M 808 220 L 819 222', '#fcfcfc', 2);
    // the diary: pink cover, gold clasp, heart
    g += R(768, 206, 32, 42, '#f4accc', 3, 2.8) + `<rect x="768" y="206" width="6" height="42" fill="#e58db3" stroke="${K.line}" stroke-width="${ow(2)}"/>`;
    g += `<path d="M 787 232 C 780 227 780 220 785 220 C 787 220 787 222 787 222 C 787 222 788 220 790 220 C 795 220 794 227 787 232 Z" fill="#fff" stroke="${K.line}" stroke-width="1.6" stroke-linejoin="round"/>`;
    g += R(796, 223, 6, 10, '#ecbc44', 1.5, 2);
    // a tiny plant
    g += S('M 834 248 L 836 234 L 850 234 L 852 248 Z', K.red, 2.4) + S('M 843 234 Q 836 222 840 214 Q 846 222 843 234 Z M 843 234 Q 851 224 848 216 Q 841 224 843 234 Z', K.olive, 2);
    // the shelf board
    g += R(752, 247, 108, 9, K.woodLight, 3, 2.8);
    if (unread && guide(state, 'diary')) g += `<ellipse class="nudge" cx="806" cy="230" rx="62" ry="36" fill="none" stroke="#ff8a00" stroke-width="4" stroke-dasharray="8 7"/>`;
    return g + `</g>`;
  }

  function bowls(state) {
    const f = G.Catalog.FOODS[state.bowl.food];
    const p = state.bowl.portions;
    const shop = look('bowls', styleOf(state, 'bowls'));
    const v = shop ? shop() : null;
    let s = `<g class="bowl act" data-act="bowl" role="button" tabindex="0" aria-label="Food bowl: feed or give a treat" style="cursor:pointer">`;
    // a generous invisible target around both bowls
    s += `<rect x="246" y="514" width="122" height="46" rx="14" fill="none" pointer-events="all"/>`;
    if (v) s += v.mat + v.underFood + v.underWater;
    else {
      s += `<rect x="256" y="532" width="104" height="22" rx="8" fill="#f6c9cf" stroke="${K.line}" stroke-width="2.5"/>`;
      s += L('M 266 543 L 350 543', '#fff', 2, 'stroke-dasharray="4 6"');
    }
    // food bowl
    if (p > 0) {
      const h = p >= 3 ? 9 : p === 2 ? 7 : 5;
      s += `<ellipse cx="284" cy="532" rx="17" ry="${h}" fill="${f.color}" stroke="${K.line}" stroke-width="2"/>`;
      if (state.bowl.food === 'kibble') s += `<g fill="#a86d36">${[[-8, -2], [-2, -4], [5, -2], [10, 0], [-4, 1], [2, 1]].map(([dx, dy]) => `<circle cx="${284 + dx}" cy="${532 + dy}" r="2"/>`).join('')}</g>`;
    }
    s += v ? v.food : S('M 262 532 Q 264 548 284 548 Q 304 548 306 532 Z', K.red, 2.6);
    s += `<ellipse cx="284" cy="532" rx="22" ry="5" fill="none" stroke="${K.line}" stroke-width="2.6"/>`;
    s += v ? v.foodMark : `<path d="M 278 540 Q 284 544 290 540" stroke="#fff" stroke-width="2" fill="none"/>`;
    // water
    s += v ? v.water : S('M 314 536 Q 316 550 334 550 Q 352 550 354 536 Z', '#7fb4d9', 2.6);
    s += `<ellipse cx="334" cy="536" rx="20" ry="5" fill="${v ? v.waterTop : '#bfe2f5'}" stroke="${K.line}" stroke-width="2.6"/>`;
    if (v && v.top) s += v.top;
    // An empty bowl pulses a little ring: this is where food comes from.
    if (p <= 0 && guide(state, 'bowl')) s += `<ellipse class="nudge" cx="308" cy="540" rx="68" ry="24" fill="none" stroke="#ff8a00" stroke-width="4" stroke-dasharray="8 7"/>`;
    return s + `</g>`;
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
    // ---- from the gachapon
    mouse(x, y) {
      const c =
        L(`M ${x + 14} ${y - 6} Q ${x + 30} ${y - 2} ${x + 32} ${y - 14} Q ${x + 34} ${y - 24} ${x + 44} ${y - 20}`, '#e98aa0', 2.5) +
        S(`M ${x - 18} ${y - 4} Q ${x - 16} ${y - 22} ${x + 2} ${y - 20} Q ${x + 18} ${y - 18} ${x + 16} ${y - 4} Q ${x} ${y + 2} ${x - 18} ${y - 4} Z`, '#b8b4ad', 2.6) +
        E(x - 10, y - 21, 6, 6, '#f4accc', 2.2) +
        `<circle cx="${x - 14}" cy="${y - 10}" r="2" fill="${K.line}"/><circle cx="${x - 20}" cy="${y - 6}" r="2" fill="#e98aa0"/>`;
      return [c, ''];
    },
    ball(x, y) {
      const c =
        E(x, y - 13, 13, 13, '#f4accc', 2.6) +
        `<circle cx="${x}" cy="${y - 13}" r="5" fill="#ecbc44" stroke="${K.line}" stroke-width="1.8"/>` +
        L(`M ${x - 13} ${y - 13} Q ${x} ${y - 6} ${x + 13} ${y - 13} M ${x} ${y - 26} Q ${x - 6} ${y - 13} ${x} ${y}`, '#c9677f', 2);
      return [c, ''];
    },
    banana(x, y) {
      const c =
        S(`M ${x - 38} ${y - 16} Q ${x} ${y + 16} ${x + 38} ${y - 16} Q ${x} ${y - 14} ${x - 38} ${y - 16} Z`, '#f3d55b', 2.6) +
        S(`M ${x - 38} ${y - 16} L ${x - 45} ${y - 20} L ${x - 41} ${y - 12} Z`, '#8a5a3a', 2) +
        `<circle cx="${x - 7}" cy="${y - 8}" r="2" fill="${K.line}"/><circle cx="${x + 7}" cy="${y - 8}" r="2" fill="${K.line}"/>` +
        L(`M ${x - 3.5} ${y - 4} Q ${x} ${y - 1} ${x + 3.5} ${y - 4}`, K.line, 1.8);
      return [c, ''];
    },
    duck(x, y) {
      const c =
        S(`M ${x - 16} ${y - 6} Q ${x - 18} ${y - 20} ${x - 2} ${y - 18} L ${x + 14} ${y - 16} Q ${x + 22} ${y - 8} ${x + 12} ${y} L ${x - 10} ${y} Q ${x - 16} ${y} ${x - 16} ${y - 6} Z`, '#f3d55b', 2.6) +
        E(x - 4, y - 26, 9, 9, '#f3d55b', 2.6) +
        S(`M ${x - 13} ${y - 27} L ${x - 21} ${y - 24} L ${x - 13} ${y - 22} Z`, '#f39a3a', 1.8) +
        `<circle cx="${x - 6}" cy="${y - 28}" r="1.8" fill="${K.line}"/>`;
      return [c, ''];
    },
    donut(x, y) {
      const back = E(x, y - 18, 62, 20, '#d9a46a', 3) + `<ellipse cx="${x}" cy="${y - 18}" rx="34" ry="9" fill="#a8743f"/>`;
      const front =
        S(`M ${x - 62} ${y - 18} Q ${x - 62} ${y + 4} ${x} ${y + 4} Q ${x + 62} ${y + 4} ${x + 62} ${y - 18} Q ${x + 52} ${y - 4} ${x} ${y - 4} Q ${x - 52} ${y - 4} ${x - 62} ${y - 18} Z`, '#f4accc', 3) +
        [[-44, -8, '#7fb4d9'], [-22, -2, '#ecbc44'], [4, -1, '#8fd3c6'], [26, -3, '#fff'], [46, -9, '#ecbc44'], [-34, -1, '#fff']]
          .map(([dx, dy, col]) => `<rect x="${x + dx - 4}" y="${y + dy - 1.5}" width="8" height="3" rx="1.5" fill="${col}" stroke="${K.line}" stroke-width="1" transform="rotate(${dx % 3 ? 25 : -20} ${x + dx} ${y + dy})"/>`)
          .join('');
      return [back, front];
    },
    tunnel(x, y) {
      const back = `<path d="M ${x - 50} ${y + 2} Q ${x - 50} ${y - 74} ${x} ${y - 74} Q ${x + 50} ${y - 74} ${x + 50} ${y + 2} Z" fill="#3c3a52"/>`;
      const front =
        S(`M ${x - 64} ${y + 2} Q ${x - 64} ${y - 88} ${x} ${y - 88} Q ${x + 64} ${y - 88} ${x + 64} ${y + 2} L ${x + 50} ${y + 2} Q ${x + 50} ${y - 74} ${x} ${y - 74} Q ${x - 50} ${y - 74} ${x - 50} ${y + 2} Z`, '#8f7fd0', 3) +
        L(`M ${x - 57} ${y - 30} Q ${x - 50} ${y - 50} ${x - 40} ${y - 66} M ${x + 57} ${y - 30} Q ${x + 50} ${y - 50} ${x + 40} ${y - 66} M ${x - 18} ${y - 80} L ${x + 18} ${y - 80}`, '#b6aae6', 2.5);
      return [back, front];
    },
  };

  // The gachapon machine: a glass dome full of capsules on a pink stand, a coin slot, a crank
  // and the chute the capsule rolls out of. It glows when you have enough coins for a spin.
  function gachaMachine(canSpin) {
    const x = GACHA_X;
    const caps = [[-14, 350, '#7fb4d9'], [6, 344, '#f4accc'], [18, 356, '#ecbc44'], [-4, 362, '#8fd3c6'], [-18, 338, '#a98bd9'], [12, 334, '#e0735f'], [0, 328, '#fff']];
    let g = `<g class="gacha act" data-act="gacha" role="button" tabindex="0" aria-label="Gachapon machine" style="cursor:pointer">`;
    g += `<rect x="${x - 44}" y="296" width="88" height="170" rx="12" fill="none" pointer-events="all"/>`;
    g += R(x - 34, 452, 68, 12, '#c9506d', 3, 2.6);
    g += S(`M ${x - 30} 380 L ${x + 30} 380 L ${x + 32} 452 L ${x - 32} 452 Z`, '#ff6f91', 2.6);
    // dome and capsules
    g += `<circle cx="${x}" cy="346" r="34" fill="#e8f6fb" stroke="${K.line}" stroke-width="${ow(2.6)}"/>`;
    for (const [dx, cy, col] of caps) g += `<g><circle cx="${x + dx}" cy="${cy}" r="8" fill="#fff" stroke="${K.line}" stroke-width="1.6"/><path d="M ${x + dx - 8} ${cy} A 8 8 0 0 1 ${x + dx + 8} ${cy} Z" fill="${col}" stroke="${K.line}" stroke-width="1.6"/></g>`;
    g += `<path d="M ${x - 22} 330 Q ${x - 18} 318 ${x - 6} 316" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>`;
    g += R(x - 18, 306, 36, 10, '#ff6f91', 4, 2.4) + R(x - 26, 376, 52, 8, '#e05a7c', 3, 2.4);
    // coin slot, crank, chute
    g += R(x + 6, 392, 18, 14, '#ffd7e0', 3, 2) + L(`M ${x + 11} 399 L ${x + 19} 399`, K.line, 2.4);
    g += `<circle cx="${x - 12}" cy="410" r="9" fill="#fff" stroke="${K.line}" stroke-width="${ow(2)}"/>` + L(`M ${x - 18} 410 L ${x - 6} 410`, K.line, 3);
    g += R(x - 10, 428, 20, 14, '#5a3040', 4, 2.2);
    if (canSpin) g += `<ellipse class="nudge" cx="${x}" cy="384" rx="52" ry="90" fill="none" stroke="#ff8a00" stroke-width="4" stroke-dasharray="8 7"/>`;
    return g + `</g>`;
  }

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
      s += at(DX.mid, lantern(246, 112) + lantern(616, 112));
      s += at(DX.mid, `<g transform="translate(640 236) rotate(45)"><rect x="-22" y="-22" width="44" height="44" fill="#e04a3a" stroke="${K.line}" stroke-width="3"/></g>`);
      s += at(DX.mid, `<text x="640" y="248" text-anchor="middle" font-size="30" font-weight="700" fill="#f3c66b" font-family="serif">福</text>`);
    }
    if (seasons.includes('raya')) {
      s += at(DX.mid, ketupat(246, 112) + ketupat(616, 112) + ketupat(560, 70));
      let flags = '';
      for (let x = 0; x < W; x += 34) flags += `<path d="M ${x} 18 L ${x + 30} 18 L ${x + 15} 40 Z" fill="${(x / 34) % 2 ? '#f3c66b' : '#7fb35a'}" stroke="${K.line}" stroke-width="1.5"/>`;
      s += L(`M 0 18 L ${W} 18`, K.line, 2) + flags;
      s += at(DX.mid, pelita(318, 286) + pelita(542, 286));
    }
    if (seasons.includes('christmas')) {
      let bulbs = '';
      const cols = ['#e04a3a', '#f3c66b', '#7fb35a', '#7fb4d9'];
      const n = Math.floor(W / 40);
      for (let i = 0; i < n; i++) {
        const x = 20 + i * 40;
        const y = 22 + Math.sin(i * 1.4) * 4 + 8;
        bulbs += `<circle class="twinkle t${i % 3}" cx="${x}" cy="${y}" r="5" fill="${cols[i % 4]}" stroke="${K.line}" stroke-width="1.5"/>`;
      }
      let wire = 'M 0 24';
      for (let x = 0; x < W; x += 240) wire += ` Q ${x + 120} ${x % 480 ? 12 : 40} ${x + 240} 26`;
      s += L(wire, K.line, 2) + bulbs;
      // wreath on the portrait
      s += at(DX.tv, `<circle cx="118" cy="86" r="14" fill="none" stroke="#5f8a45" stroke-width="7"/><circle cx="118" cy="98" r="4" fill="#e04a3a"/>`);
    }
    return s;
  }

  function decorItems(seasons) {
    const out = [];
    if (seasons.includes('christmas')) {
      const x = 300 + DX.basket;
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
      out.push({ z: 497, svg: at(DX.right, [[770, 343], [788, 343], [779, 333]].map(([x, y]) => E(x, y - 8, 10, 9, '#f39a3a', 2.5) + `<path d="M ${x} ${y - 17} q 4 -4 8 -2" stroke="#5f8a45" stroke-width="2.5" fill="none"/>`).join('')) });
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
      const x = 590 + DX.mid + i * 46;
      const y = 586;
      return {
        z: y + 2,
        svg:
          `<g class="gift act" data-act="gift${i}" data-gift="${i}" transform="translate(${x} ${y})" style="cursor:pointer">` +
          `<circle r="22" fill="none" pointer-events="all"/>` +
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
        `<g class="cup act" data-act="cup" style="cursor:pointer" transform="translate(${770 + DX.right} 590)">` +
        `<ellipse cx="18" cy="2" rx="26" ry="6" fill="#bfe2f5" opacity=".8"/>` +
        `<circle r="24" fill="none" pointer-events="all"/>` +
        mug(0, 0, 100) +
        `</g>`,
    };
  }

  // Everything that sorts with the cat, as [{z, svg}].
  function midLayer(state, seasons, opts) {
    const out = [];
    out.push({ z: 299, svg: noteBoard(!!(opts && opts.noteFresh) && guide(state, 'note'), opts && opts.noteText) });
    out.push({ z: 460, svg: at(DX.tv, desk(paint(state, 'desk'), alt(state, 'desk'))) });
    out.push({ z: 463, svg: gachaMachine(!!(opts && opts.canSpin) && guide(state, 'gacha')) });
    out.push({ z: 480, svg: at(DX.chair, `<g class="item act" data-act="chair" data-spot="chair" style="cursor:pointer">${chair(paint(state, 'chair'), alt(state, 'chair'))}</g>`) });
    out.push({ z: 494, svg: at(DX.right, table(state)) });
    out.push({ z: 530, svg: at(DX.basket, bowls(state)) });
    out.push({ z: 500, svg: at(DX.basket, toyBasket()) });
    out.push({ z: 300, svg: at(DX.right, diaryShelf(state)) });
    const [litterBack, litterFront, litterMess] = litterBox(state);
    out.push({ z: 483, svg: at(DX.right, litterBack) }, { z: 485, svg: at(DX.right, litterFront) });
    if (litterMess) out.push({ z: 499, svg: at(DX.right, litterMess) });
    out.push({ z: 302.5, svg: at(DX.mid, catGrass(state.room.grass)) });
    out.push(...vomitPuddles(state));
    if (state.room.perch) out.push({ z: 302, svg: at(DX.mid, `<g class="item act" data-act="perch" data-spot="sill" style="cursor:pointer">${perch()}</g>`) });
    state.room.slots.forEach((id, i) => {
      if (!id || !ITEM_ART[id]) return;
      const { x, y } = SLOTS[i];
      const [back, front] = ITEM_ART[id](x, y);
      // Tap an item to invite the cat over (the cat decides).
      const tap = (art) => `<g class="item act" data-act="item${i}" data-spot="slot${i}" style="cursor:pointer">${art}</g>`;
      out.push({ z: y - (id === 'tower' ? 2 : 1), svg: tap(back) });
      if (front) out.push({ z: y + 1, svg: tap(front) });
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
    const vb = { tower: '-70 -150 140 160', mouse: '-40 -45 95 55', ball: '-35 -40 70 50', duck: '-35 -45 70 55', banana: '-50 -40 100 50', tunnel: '-75 -100 150 110' }[id] || '-75 -90 150 100';
    return `<svg viewBox="${vb}">${b}${f}</svg>`;
  }

  // A piece of furniture in one of its colours ('' or 'base' for the original), for menus.
  function skinIcon(piece, colour) {
    const p = SKINS[piece] && (SKINS[piece][colour] || SKINS[piece].base);
    if (!p) return '';
    switch (piece) {
      case 'wall':
        return (
          `<svg viewBox="0 0 120 100"><rect x="6" y="6" width="108" height="88" rx="8" fill="${p.wall}" stroke="${K.line}" stroke-width="3.5"/>` +
          `<rect x="7.75" y="7.75" width="104.5" height="22" rx="6" fill="${p.top}"/><rect x="7.75" y="62" width="104.5" height="30.25" rx="6" fill="${p.wains}"/>` +
          L('M 7 62 L 113 62', K.line, 3.5) +
          [26, 50, 74, 98].map((x) => L(`M ${x} 70 L ${x} 86`, p.line, 3)).join('') +
          `<rect x="40" y="26" width="40" height="26" rx="3" fill="${K.woodLight}" stroke="${K.line}" stroke-width="3"/><rect x="47" y="32" width="26" height="14" fill="#cfe6e0"/></svg>`
        );
      case 'curtains':
        return `<svg viewBox="236 26 388 400">${curtains(p)}</svg>`;
      case 'clock':
        return `<svg viewBox="-50 -52 100 100">${clockFace(p, true)}</svg>`;
      case 'rug':
        return `<svg viewBox="290 496 360 100">${rugArt(p)}</svg>`;
      case 'chair':
        return `<svg viewBox="556 276 166 214">${chair(p)}</svg>`;
      case 'lamp':
        return `<svg viewBox="806 70 88 76">${lamp(p).replace(' id="bulb"', '')}</svg>`;
      case 'desk':
        return `<svg viewBox="32 316 212 152">${deskBody(p)}</svg>`;
    }
    return '';
  }

  // Any piece in any shop look (style '' is the original) and colour, for the shop's cards.
  const ICON_VB = {
    chair: '556 276 166 216', table: '734 286 224 212', laptop: '830 284 84 66', desk: '32 316 212 152', rug: '290 496 360 100',
    litter: '772 410 146 90', lamp: '806 70 88 76', curtains: '236 26 388 400', clock: '-58 -58 116 116', bowls: '246 506 122 60',
  };
  function styleIcon(piece, style, colour) {
    const pal = colour && SKINS[piece] ? SKINS[piece][colour] || null : null;
    const base = (SKINS[piece] && SKINS[piece].base) || null;
    const f = look(piece, style);
    let body = '';
    switch (piece) {
      case 'chair': body = chair(pal || base, f ? f(pal) : null); break;
      case 'table': body = tableBody(f ? f() : null); break;
      case 'laptop': body = laptopArt(f ? f() : null); break;
      case 'desk': body = f ? f(pal) : deskBody(pal || base); break;
      case 'rug': body = rugArt(pal || base, f ? f(pal) : null); break;
      case 'lamp': body = lamp(pal || base, f ? f(pal) : null).replace(' id="bulb"', ''); break;
      case 'curtains': body = curtains(f ? f(pal) : pal || base); break;
      case 'clock': body = clockFace(f ? pal : pal || base, true, f); break;
      case 'litter': {
        const x = 845;
        const y = 490;
        const parts = f ? f(x, y) : null;
        body =
          (parts ? parts.back : S(`M ${x - 56} ${y - 36} L ${x - 50} ${y - 52} L ${x + 50} ${y - 52} L ${x + 56} ${y - 36} Z`, '#6fb8a9', 3)) +
          S(`M ${x - 49} ${y - 38} L ${x - 44} ${y - 49} L ${x + 44} ${y - 49} L ${x + 49} ${y - 38} Z`, '#f3e3bb', 2.5) +
          (parts ? parts.front : R(x - 56, y - 36, 112, 36, K.mint, 6, 3) + `<rect x="${x - 56}" y="${y - 36}" width="112" height="9" rx="5" fill="#b6e6dc" stroke="${K.line}" stroke-width="${ow(3)}"/>` + E(x, y - 12, 7, 5.5, '#fcfcfc', 1.8));
        break;
      }
      case 'bowls': {
        const v = f ? f() : null;
        body = v
          ? v.mat + v.underFood + v.underWater + v.food + `<ellipse cx="284" cy="532" rx="22" ry="5" fill="none" stroke="${K.line}" stroke-width="2.6"/>` + v.foodMark + v.water + `<ellipse cx="334" cy="536" rx="20" ry="5" fill="${v.waterTop}" stroke="${K.line}" stroke-width="2.6"/>` + (v.top || '')
          : `<rect x="256" y="532" width="104" height="22" rx="8" fill="#f6c9cf" stroke="${K.line}" stroke-width="2.5"/>` + S('M 262 532 Q 264 548 284 548 Q 304 548 306 532 Z', K.red, 2.6) + `<ellipse cx="284" cy="532" rx="22" ry="5" fill="none" stroke="${K.line}" stroke-width="2.6"/>` + S('M 314 536 Q 316 550 334 550 Q 352 550 354 536 Z', '#7fb4d9', 2.6) + `<ellipse cx="334" cy="536" rx="20" ry="5" fill="#bfe2f5" stroke="${K.line}" stroke-width="2.6"/>`;
        break;
      }
      default:
        return '';
    }
    return `<svg viewBox="${ICON_VB[piece]}">${body}</svg>`;
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
    // Lights off (the lamp): no lamp glow or bright bulb, and the TV lights up the dark.
    const lamp = light.lightsOff ? 0 : light.lamp;
    $('lamp-glow').setAttribute('opacity', (lamp * 0.28).toFixed(3));
    $('bulb').setAttribute('opacity', (0.3 + lamp * 0.7).toFixed(3));
    // The TV lights up a dark room (not when it's off, and barely in a bright one).
    const dim = light.lightsOff ? 0.25 + 0.75 * Math.max(0, Math.min(1, light.lamp)) : Math.max(0, Math.min(1, (light.alpha - 0.25) / 0.3));
    $('tv-glow').setAttribute('opacity', (light.tvOff ? 0 : dim).toFixed(3));
    $('sunbeam').setAttribute('opacity', light.beam.toFixed(3));
    // Thick cloud, rain or fog hides the sun, the moon and the stars.
    const covered = !!light.skyCovered;
    $('stars').setAttribute('opacity', covered || light.isDay ? 0 : (Math.min(1, light.lamp) * (light.starVis === undefined ? 1 : light.starVis)).toFixed(2));
    const sun = $('sun');
    const moon = $('moon');
    if (covered) {
      sun.setAttribute('display', 'none');
      moon.setAttribute('display', 'none');
    } else if (light.isDay) {
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
      // light spilling from the TV when the room is dark
      `<g id="tv-glow" opacity="0" pointer-events="none" style="mix-blend-mode:screen" transform="translate(${DX.tv} 0)"><defs><radialGradient id="tvg"><stop offset="0" stop-color="#7aa4ff" stop-opacity=".6"/><stop offset="1" stop-color="#7aa4ff" stop-opacity="0"/></radialGradient></defs><ellipse cx="124" cy="290" rx="230" ry="170" fill="url(#tvg)"/><rect x="64" y="214" width="120" height="82" rx="3" fill="#9cc2ff" opacity=".55"/></g>` +
      `<g id="lamp-glow" opacity="0" pointer-events="none" transform="translate(${DX.right} 0)"><path d="M 818 136 L 882 136 L 990 470 L 710 470 Z" fill="#fff2b0"/></g>`
    );
  }

  // The screen when the TV is switched off: dark glass with a faint reflection.
  function tvOff() {
    return box('#1c2026') + `<path d="M 0 0 L 52 0 L 0 58 Z" fill="#fff" opacity=".07"/><path d="M 78 82 L 120 36 L 120 82 Z" fill="#fff" opacity=".05"/>`;
  }

  const TV = { CHANNELS, show: tvShow, static: tvStatic, off: tvOff };

  G.RoomArt = { W, H, FLOOR, SPOTS, SLOTS, TV, SKINS, skinIcon, styleIcon, skinSwatch, PIECE_BOX, draw: { K, S, R, E, L, mix: mixHex }, mixHex, weatherArt, spotPos, scaleAt, background, midLayer, decorBack, overlay, applyLighting, updateClock, itemIcon, giftIcon };
})(globalThis.CatGame = globalThis.CatGame || {});
