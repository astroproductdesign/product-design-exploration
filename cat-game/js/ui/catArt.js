// Draws the cat as SVG in the "yard sketch" style (see docs/art-style.md):
// one thick ink outline, flat fills, a big one-piece head on a round body,
// short nub legs, a tiny face (ink dot eyes, ink oval nose, ω mouth) and a
// thin mint collar peeking out under the chin.
// The coat comes from the save (see js/core/coats.js): a base colour, a
// pattern (solid, tabby stripes, patches or colour-point) and how much white.
// Markings are flat shapes clipped to each part and never outlined.
//
// Every pose is drawn with the feet at (0,0), facing right. The scene flips
// it for facing left. All variants of eyes/mouth are drawn; the scene shows
// one via the `display` attribute (so photos capture exactly what you see).
(function (G) {
  'use strict';

  const C = {
    line: '#1b1714',
    white: '#fcfcfc',
    whiteFar: '#e9e4da',
    tongue: '#e98f94',
    collar: '#8fd3c6',
    bell: '#ecbc44',
    // Coat roles, filled in by setCoat():
    tabby: '', // base coat
    tabbyFar: '',
    stripe: '',
    patch: '',
    point: '',
    belly: '', // bib / chest / tummy
    paw: '', // front paws and raised arms
    pawFar: '',
    leg: '', // back legs and haunches
    legFar: '',
    eye: '', // '' = plain ink dots; a colour = coloured eye with an ink pupil
    feature: '', // nose, mouth and closed-eye lines
  };
  let PAT = 'stripes';
  let WH = 'face';

  function setCoat(coat) {
    const c = G.Coats.normalize(coat);
    const k = G.Coats.colors(c);
    PAT = c.pattern;
    WH = c.white;
    const points = PAT === 'points';
    Object.assign(C, { tabby: k.base, tabbyFar: k.far, stripe: k.stripe, patch: k.patch, point: k.point });
    C.belly = WH === 'none' ? k.base : C.white;
    C.paw = WH !== 'none' ? C.white : points ? k.point : k.base;
    C.pawFar = WH !== 'none' ? C.whiteFar : points ? k.point : k.far;
    C.leg = points ? k.point : k.base;
    C.legFar = points ? k.point : k.far;
    // Ink features vanish on a dark face: dark cats get gold eyes and light
    // lines, colour-points get blue eyes (like a Siamese).
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(k.base.slice(i, i + 2), 16));
    const darkFace = WH !== 'face' && (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.3;
    C.eye = points ? '#8cc4ec' : darkFace ? '#e8c94a' : '';
    C.feature = darkFace ? '#e9e1d8' : C.line;
  }

  // Draw with another coat (menu previews) without touching the cat's own.
  function withCoat(coat, fn) {
    const keep = [Object.assign({}, C), PAT, WH];
    setCoat(coat);
    try {
      return fn();
    } finally {
      Object.assign(C, keep[0]);
      PAT = keep[1];
      WH = keep[2];
    }
  }
  const LW = 5; // body outline
  const LIMB_LW = 4; // legs, paws and tails are a touch lighter

  // ---- tiny helpers ---------------------------------------------------------

  const fillPath = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
  const line = (d, w, color) => `<path d="${d}" fill="none" stroke="${color || C.line}" stroke-width="${w || 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shape = (d, fill, w) => `<path d="${d}" fill="${fill}" stroke="${C.line}" stroke-width="${w || LW}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const bars = (list, w) => list.map((d) => line(d, w || 7, C.stripe)).join('');
  // Body markings for the current pattern. `list` holds the stripe positions;
  // patches reuse every other one as the centre of a blob.
  function marks(list, w) {
    if (PAT === 'stripes') return bars(list, w);
    if (PAT !== 'patches') return '';
    return list
      .filter((d, i) => i % 2 === 0)
      .map((d) => {
        const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
        return `<ellipse cx="${(n[0] + n[2]) / 2}" cy="${(n[1] + n[3]) / 2}" rx="16" ry="12" fill="${C.patch}"/>`;
      })
      .join('');
  }

  // A coat region: base fill, unoutlined markings clipped to it, then the outline once.
  function part(uid, name, d, fill, inner) {
    const id = `${uid}-${name}`;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath>${fillPath(d, fill)}<g clip-path="url(#${id})">${inner || ''}</g>${line(d, LW)}`;
  }

  // Constant-width tube (tails, raised legs): ink stroke under a colour stroke.
  function tube(d, w, color, inner) {
    return (
      `<path d="${d}" fill="none" stroke="${C.line}" stroke-width="${w + LIMB_LW * 2}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
      (inner || '')
    );
  }

  // Tabby: two flat bands and a dark tip. Patches: a coloured tip. Points: all dark.
  function tail(d, w) {
    w = w || 10;
    if (PAT === 'points') return tube(d, w, C.point);
    const tip = (c) => `<path d="${d}" pathLength="100" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 82 18 0"/>`;
    if (PAT === 'patches') return tube(d, w, C.tabby, tip(C.patch));
    if (PAT !== 'stripes') return tube(d, w, C.tabby);
    return tube(d, w, C.tabby, `<path d="${d}" pathLength="100" fill="none" stroke="${C.stripe}" stroke-width="${w}" stroke-dasharray="0 34 12 20 12 100"/>` + tip(C.stripe));
  }

  // Wrap content so a CSS animation on `cls` pivots around (x, y).
  function pivot(x, y, cls, inner) {
    return `<g transform="translate(${x} ${y})"><g class="${cls}"><g transform="translate(${-x} ${-y})">${inner}</g></g></g>`;
  }

  // A small paw: an outlined oval, no toes.
  function nub(cx, cy, rx, ry, color) {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx || 7.5}" ry="${ry || 5}" fill="${color || C.paw}" stroke="${C.line}" stroke-width="${LIMB_LW}"/>`;
  }

  // A short standing leg with a rounded foot.
  function stubLeg(x, color) {
    return shape(`M ${x - 5} -14 L ${x - 5} -4 Q ${x - 5} 0 ${x - 1} 0 L ${x + 1} 0 Q ${x + 5} 0 ${x + 5} -4 L ${x + 5} -14`, color, LIMB_LW + 0.4);
  }

  // ---- head (front view, centre 0,0, ~100 wide) --------------------------------

  // Head and ears are one silhouette, so there's no line where the ears join.
  const HEAD =
    'M 0 30 C -30 30 -50 22 -50 0 C -50 -10 -49 -16 -48 -22 L -46 -43 Q -45 -50 -39 -46 L -22 -34 Q 0 -38 22 -34 L 39 -46 Q 45 -50 46 -43 L 48 -22 C 49 -16 50 -10 50 0 C 50 22 30 30 0 30 Z';
  // Coat on top; white lower face with a soft rise in the middle (the blaze).
  const COAT_TOP = 'M -70 -70 L 70 -70 L 70 8 C 52 6 36 2 24 -2 C 14 -5 8 -12 0 -12 C -8 -12 -14 -5 -24 -2 C -36 2 -52 6 -70 8 Z';
  const FOREHEAD = ['M -8 -36 L -7 -27', 'M 8 -36 L 7 -27'];

  // Thin mint band under the chin, drawn before the head so the head hides its ends.
  const COLLAR = 'M -23 23 Q 0 44 23 23';
  const collar = () =>
    `<g class="collar">${line(COLLAR, 11)}${line(COLLAR, 5.5, C.collar)}` +
    `<g class="bell"><circle cx="0" cy="40.5" r="4" fill="${C.bell}" stroke="${C.line}" stroke-width="2.4"/></g></g>`;

  function eyeSet(x) {
    const y = 2;
    // Ink dot, or a coloured eye with an ink outline and pupil on dark/pointed faces.
    const dot = (r) =>
      C.eye
        ? `<circle cx="${x}" cy="${y}" r="${r + 0.6}" fill="${C.eye}" stroke="${C.line}" stroke-width="2.4"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="${C.line}"/>`
        : `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.line}"/>`;
    return {
      open: dot(5.6),
      wide: dot(7),
      half: `<path d="M ${x - 6.4} ${y} A 6.4 6.4 0 0 0 ${x + 6.4} ${y} Z" fill="${C.eye || C.line}" stroke="${C.line}" stroke-width="${C.eye ? 2.4 : 0}"/>` + line(`M ${x - 8} ${y} L ${x + 8} ${y}`, 4, C.feature),
      closed: line(`M ${x - 6.5} ${y} Q ${x} ${y + 6} ${x + 6.5} ${y}`, 4, C.feature),
      happy: line(`M ${x - 6.5} ${y + 3.5} Q ${x} ${y - 4} ${x + 6.5} ${y + 3.5}`, 4, C.feature),
    };
  }

  const OMEGA = 'M -10 12.5 Q -5 18.5 0 11.5 Q 5 18.5 10 12.5';
  const nose = () => `<ellipse cx="0" cy="7" rx="5.4" ry="4" fill="${C.feature}"/>` + line('M 0 10 L 0 11.5', 3, C.feature);

  // Head markings for the current pattern (the face markings sit under the eyes).
  function headMarks(back) {
    if (PAT === 'stripes') return bars(back ? FOREHEAD.concat(['M -22 -30 L -20 -18', 'M 22 -30 L 20 -18']) : FOREHEAD, 6.5);
    if (PAT === 'patches') return `<ellipse cx="${back ? 30 : -30}" cy="-28" rx="25" ry="21" fill="${C.patch}"/>`;
    if (PAT === 'points') {
      const ears = `<ellipse cx="-42" cy="-42" rx="15" ry="13" fill="${C.point}"/><ellipse cx="42" cy="-42" rx="15" ry="13" fill="${C.point}"/>`;
      return back ? ears : ears + `<ellipse cx="0" cy="12" rx="30" ry="22" fill="${C.point}"/>`;
    }
    return '';
  }

  function head(uid, o) {
    o = o || {};
    const band = o.noCollar ? '' : collar();
    if (o.back) {
      return `<g class="cat-head">${band}${part(uid, 'head', HEAD, C.tabby, headMarks(true))}</g>`;
    }
    const L = eyeSet(-22);
    const R = eyeSet(22);
    const eyes = ['open', 'wide', 'half', 'closed', 'happy']
      .map((k) => `<g class="eyes eyes-${k}"${k === 'open' ? '' : ' display="none"'}>${L[k]}${R[k]}</g>`)
      .join('');
    const mouths =
      `<g class="mouth mouth-normal">${line(OMEGA, 3.4, C.feature)}</g>` +
      `<g class="mouth mouth-open" display="none">${shape(`${OMEGA} Q 8.5 24 0 24 Q -8.5 24 -10 12.5 Z`, C.tongue, 3.4)}</g>` +
      `<g class="mouth mouth-tongue" display="none">${shape('M -3.6 14 Q 0 22.5 3.6 14 Z', C.tongue, 2.4)}${line(OMEGA, 3.4, C.feature)}</g>`;
    // "Face" white: coat on top, white lower face. Otherwise the head is all coat.
    const faceWhite = WH === 'face';
    const coat = (faceWhite ? fillPath(COAT_TOP, C.tabby) : '') + headMarks(false);
    return `<g class="cat-head">${band}${part(uid, 'head', HEAD, faceWhite ? C.white : C.tabby, coat)}${eyes}${mouths}${nose()}</g>`;
  }

  function placeHead(uid, x, y, o) {
    o = o || {};
    return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${o.scale || 1})"><g class="head-wrap">${head(uid, o)}</g></g>`;
  }

  // ---- poses ------------------------------------------------------------------

  // A round "rice ball" body; the white bib runs down to two small paws.
  const SIT_BODY = 'M -22 0 C -38 0 -42 -22 -36 -38 C -30 -54 -16 -60 0 -60 C 16 -60 30 -54 36 -38 C 42 -22 38 0 22 0 Z';
  const SIT_SIDES = ['M -40 -32 L -30 -30', 'M 40 -32 L 30 -30'];

  function sitBody(uid, o) {
    o = o || {};
    if (o.back) {
      return (
        part(uid, 'body', SIT_BODY, C.tabby, marks(SIT_SIDES.concat(['M -9 -54 L -10 -42', 'M 9 -54 L 10 -42']))) +
        pivot(10, -4, 'tail-wag', tail('M 10 -4 C 30 2 48 0 52 -14'))
      );
    }
    return (
      pivot(26, -6, 'tail-wag', tail('M 26 -6 C 48 -4 52 -26 44 -44')) +
      part(uid, 'body', SIT_BODY, C.tabby, marks(SIT_SIDES) + `<ellipse cx="0" cy="-30" rx="16" ry="26" fill="${C.belly}"/>`) +
      nub(-8, -3) +
      (o.raised ? '' : nub(8, -3))
    );
  }

  const POSES = {
    sit(uid) {
      return `<g class="breathe">${sitBody(uid)}${placeHead(uid, 0, -86)}</g>`;
    },

    // Back view: watching birds, staring at the wall.
    back(uid) {
      return `<g class="breathe">${sitBody(uid, { back: true })}${placeHead(uid, 0, -86, { back: true })}</g>`;
    },

    groom(uid) {
      const arm = pivot(8, -26, 'lick', tube('M 8 -26 Q 16 -44 10 -58', 7, C.paw) + nub(10, -61, 6.5, 5.5));
      return `<g class="breathe">${sitBody(uid, { raised: true })}${placeHead(uid, -2, -86, { rot: -10 })}${arm}</g>`;
    },

    // Batting at the cup.
    swipe(uid) {
      const arm = pivot(8, -30, 'swat', tube('M 8 -30 Q 26 -44 40 -40', 7, C.paw) + nub(43, -40, 6.5, 5.5));
      return `<g class="breathe">${sitBody(uid, { raised: true })}${placeHead(uid, 2, -86, { rot: 6 })}${arm}</g>`;
    },

    loaf(uid, o) {
      o = o || {};
      const body = 'M -40 0 C -56 0 -58 -20 -50 -32 C -40 -46 -22 -50 -2 -50 C 22 -50 42 -42 48 -24 C 52 -8 44 0 34 0 Z';
      const inner = marks(['M -30 -50 L -32 -36', 'M -12 -52 L -14 -38']) + `<ellipse cx="30" cy="-18" rx="16" ry="20" fill="${C.belly}"/>`;
      const paws = o.knead ? pivot(34, -3, 'knead-a', nub(34, -3, 7, 4.2)) + pivot(45, -3, 'knead-b', nub(45, -3, 7, 4.2)) : '';
      return (
        `<g class="breathe">` +
        part(uid, 'body', body, C.tabby, inner) +
        pivot(-44, -4, 'tail-wag slow', tail('M -44 -4 C -36 3 -12 4 6 0', 9)) +
        paws +
        placeHead(uid, 28, -46, { scale: 0.9 }) +
        `</g>`
      );
    },

    lie(uid) {
      const body = 'M -56 0 C -62 -18 -46 -36 -14 -36 C 14 -36 32 -28 34 -12 C 35 -4 30 0 22 0 Z';
      const inner = marks(['M -40 -38 L -42 -24', 'M -24 -40 L -26 -26']) + `<ellipse cx="14" cy="-6" rx="24" ry="10" fill="${C.belly}"/>`;
      return (
        `<g class="breathe">` +
        pivot(-54, -6, 'tail-wag slow', tail('M -54 -6 C -70 -8 -80 -4 -86 -1', 9)) +
        part(uid, 'body', body, C.tabby, inner) +
        nub(-46, -3, 7.5, 4.5, C.leg) +
        tube('M 12 -3 L 30 -2', 7, C.pawFar) +
        nub(34, -2.5, 6.5, 4.2, C.pawFar) +
        tube('M 16 -7 L 36 -6', 7, C.paw) +
        nub(40, -6, 6.5, 4.5) +
        placeHead(uid, 30, -40, { rot: -6, scale: 0.86 }) +
        `</g>`
      );
    },

    // Curled up asleep, like in the round scratcher bed.
    curl(uid) {
      const body = 'M -44 -24 C -46 -46 -20 -56 4 -56 C 30 -56 48 -42 48 -24 C 48 -6 30 0 2 0 C -26 0 -44 -6 -44 -24 Z';
      return (
        `<g class="breathe">` +
        part(uid, 'body', body, C.tabby, marks(['M -24 -60 L -28 -40', 'M -6 -62 L -8 -42'])) +
        tail('M -40 -8 C -34 3 -14 5 2 2', 9) +
        placeHead(uid, 22, -26, { rot: -10, scale: 0.8 }) +
        `</g>`
      );
    },

    walk(uid) {
      const body = 'M -38 -28 C -38 -48 -18 -54 4 -54 C 26 -54 40 -46 40 -28 C 40 -12 26 -8 0 -8 C -24 -8 -38 -12 -38 -28 Z';
      const leg = (x, cls, color) => pivot(x, -14, cls, stubLeg(x, color));
      return (
        `<g class="breathe">` +
        leg(28, 'leg leg-b', C.pawFar) +
        leg(-18, 'leg leg-a', C.legFar) +
        pivot(-34, -36, 'tail-wag', tail('M -34 -36 C -50 -44 -50 -68 -42 -80')) +
        part(uid, 'body', body, C.tabby, marks(['M -22 -56 L -24 -40', 'M -4 -58 L -6 -42']) + `<ellipse cx="22" cy="-14" rx="22" ry="12" fill="${C.belly}"/>`) +
        leg(18, 'leg leg-a', C.paw) +
        leg(-28, 'leg leg-b', C.leg) +
        placeHead(uid, 32, -58, { scale: 0.86 }) +
        `</g>`
      );
    },

    stretch(uid) {
      const body = 'M -46 -38 C -48 -54 -32 -58 -18 -50 C 0 -40 18 -26 32 -20 C 44 -14 42 -4 32 -4 C 12 -2 -10 -8 -26 -18 C -38 -26 -46 -28 -46 -38 Z';
      return (
        `<g class="breathe">` +
        pivot(-44, -46, 'tail-wag', tail('M -44 -46 C -56 -58 -52 -78 -42 -86')) +
        shape('M -38 -34 L -39 -4 Q -39 0 -35 0 L -33 0 Q -29 0 -29 -4 L -28 -28', C.leg, LIMB_LW + 0.4) +
        part(uid, 'body', body, C.tabby, marks(['M -30 -58 L -34 -42']) + `<ellipse cx="22" cy="-8" rx="22" ry="9" fill="${C.belly}"/>`) +
        nub(48, -3, 8, 4.6) +
        nub(58, -3, 8, 4.6) +
        placeHead(uid, 40, -24, { scale: 0.8 }) +
        `</g>`
      );
    },

    // On its back. The belly is a trap.
    belly(uid) {
      const body = 'M -46 -18 C -46 -40 -26 -46 -2 -46 C 22 -46 38 -36 38 -18 C 38 -4 24 0 -4 0 C -32 0 -46 -4 -46 -18 Z';
      return (
        `<g class="breathe">` +
        pivot(-44, -10, 'tail-wag slow', tail('M -44 -10 Q -64 -8 -74 0', 9)) +
        pivot(-32, -40, 'paddle-a', tube('M -32 -40 L -35 -53', 8, C.leg)) +
        pivot(-16, -44, 'paddle-b', tube('M -16 -44 L -16 -57', 8, C.leg)) +
        part(uid, 'body', body, C.tabby, marks(['M -30 -10 L -26 -2']) + `<ellipse cx="-4" cy="-36" rx="30" ry="12" fill="${C.belly}"/>`) +
        placeHead(uid, 56, -28, { rot: 14, scale: 0.8 }) +
        pivot(10, -44, 'paddle-b', nub(10, -50, 6, 5)) +
        pivot(24, -40, 'paddle-a', nub(24, -46, 6, 5)) +
        `</g>`
      );
    },

    // Low and ready: hunting, eating, playing.
    crouch(uid, o) {
      o = o || {};
      const body = 'M -44 -6 C -48 -28 -30 -38 -4 -38 C 20 -38 34 -30 34 -14 C 34 -4 24 0 0 0 C -28 0 -44 0 -44 -6 Z';
      const inner = marks(['M -26 -40 L -28 -26', 'M -10 -42 L -12 -28']) + `<ellipse cx="22" cy="-12" rx="18" ry="12" fill="${C.belly}"/>`;
      return (
        `<g class="breathe">` +
        pivot(-42, -14, 'tail-wag fast', tail('M -42 -14 C -60 -16 -74 -10 -86 -6', 9)) +
        part(uid, 'body', body, C.tabby, inner) +
        nub(-36, -3, 8, 4.5, C.leg) +
        nub(28, -3, 6.5, 4.2) +
        nub(38, -3, 6.5, 4.2) +
        (o.eat ? placeHead(uid, 44, -20, { rot: 18, scale: 0.86 }) : placeHead(uid, 40, -34, { scale: 0.86 })) +
        `</g>`
      );
    },
  };

  // Where each pose's head sits (for petting zones, speech bubbles, hearts).
  const HEAD_AT = {
    sit: [0, -86], back: [0, -86], groom: [-2, -86], swipe: [2, -86], loaf: [28, -46], lie: [30, -40],
    curl: [22, -26], walk: [32, -58], stretch: [40, -24], belly: [56, -28], crouch: [40, -34],
  };

  // Rough height of each pose (for bubbles above the head).
  const TOP = { sit: -136, back: -136, groom: -136, swipe: -136, loaf: -90, lie: -82, curl: -66, walk: -100, stretch: -64, belly: -68, crouch: -76 };

  function render(pose, uid, opts) {
    const fn = POSES[pose] || POSES.sit;
    return fn(uid || 'cat', opts || {});
  }

  // Just the face, for the mood badge and menus.
  function renderHead(uid, eyes, mouth) {
    let h = head(uid || 'face', { noCollar: true });
    h = h.replace(/<g class="eyes eyes-(\w+)"( display="none")?>/g, (m, k) => `<g class="eyes eyes-${k}"${k === (eyes || 'open') ? '' : ' display="none"'}>`);
    h = h.replace(/<g class="mouth mouth-(\w+)"( display="none")?>/g, (m, k) => `<g class="mouth mouth-${k}"${k === (mouth || 'normal') ? '' : ' display="none"'}>`);
    return h;
  }

  setCoat(G.Coats.DEFAULT);

  G.CatArt = { render, renderHead, setCoat, withCoat, HEAD_AT, TOP, COLORS: C, POSES: Object.keys(POSES) };
})(globalThis.CatGame = globalThis.CatGame || {});
