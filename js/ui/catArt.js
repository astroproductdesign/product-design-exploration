// Draws the cat as SVG, in a chunky-outline, flat-colour style.
// Based on the photos: brown mackerel tabby & white, white blaze up the nose,
// white muzzle/chin/chest/paws, tabby "garters" on the front legs, olive-green
// eyes with dark liner, pink nose and toe beans, ringed tail with a dark tip,
// dark tabby patch on the white shoulder, mint collar with a little bell.
//
// Every pose is drawn with the feet at (0,0), facing right. The scene flips
// it for facing left. All variants of eyes/mouth are drawn; the scene shows
// one via the `display` attribute (so photos capture exactly what you see).
(function (G) {
  'use strict';

  const C = {
    line: '#4a3528',
    tabby: '#a3917b',
    tabbyFar: '#8f7e6a',
    stripe: '#54473d',
    white: '#fdf9f0',
    whiteFar: '#e8e1d4',
    pink: '#f3a9a9',
    nose: '#e88f8c',
    bean: '#f19aa8',
    iris: '#b3ae5d',
    pupil: '#2a231f',
    collar: '#8fd3c6',
    collarDot: '#2f5e57',
    bell: '#f3da8b',
    mouth: '#b9535c',
    whisker: '#7b6656',
  };
  const LW = 3;

  // ---- tiny helpers ---------------------------------------------------------

  const fillPath = (d, fill, extra) => `<path d="${d}" fill="${fill}" ${extra || ''}/>`;
  const outline = (d, w) => `<path d="${d}" fill="none" stroke="${C.line}" stroke-width="${w || LW}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const shape = (d, fill, w) => `<path d="${d}" fill="${fill}" stroke="${C.line}" stroke-width="${w || LW}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const ell = (cx, cy, rx, ry, fill, w) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${C.line}" stroke-width="${w || LW}"/>`;
  const stripes = (list, w) =>
    list.map((d) => `<path d="${d}" fill="none" stroke="${C.stripe}" stroke-width="${w || 4.5}" stroke-linecap="round"/>`).join('');

  // A coat region: base fill, inner layers clipped to it, then the outline.
  function part(uid, name, d, fill, inner) {
    const id = `${uid}-${name}`;
    return (
      `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
      fillPath(d, fill) +
      `<g clip-path="url(#${id})">${inner || ''}</g>` +
      outline(d)
    );
  }

  // Limbs and tails are thick strokes: outline, colour, then rings.
  function limb(d, color, w, bands) {
    let s =
      `<path d="${d}" fill="none" stroke="${C.line}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (bands) s += `<path d="${d}" pathLength="100" fill="none" stroke="${C.stripe}" stroke-width="${w}" stroke-dasharray="${bands}"/>`;
    return s;
  }

  function tail(d, w) {
    w = w || 11;
    return (
      limb(d, C.tabby, w) +
      `<path d="${d}" fill="none" stroke="${C.stripe}" stroke-width="${w}" stroke-dasharray="4 10"/>` +
      `<path d="${d}" pathLength="100" fill="none" stroke="${C.stripe}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 88 12 0"/>`
    );
  }

  // Wrap content so a CSS animation on `cls` pivots around (x, y).
  function pivot(x, y, cls, inner) {
    return `<g transform="translate(${x} ${y})"><g class="${cls}"><g transform="translate(${-x} ${-y})">${inner}</g></g></g>`;
  }

  function paw(cx, cy, rx, ry, color) {
    return ell(cx, cy, rx || 8, ry || 5, color || C.white, 2.6);
  }

  // A sole with pink toe beans, seen from below.
  function sole(cx, cy, rot) {
    return (
      `<g transform="translate(${cx} ${cy}) rotate(${rot || 0})">` +
      ell(0, 0, 8, 7, C.white, 2.6) +
      `<ellipse cx="0" cy="1.5" rx="3.6" ry="2.8" fill="${C.bean}"/>` +
      `<circle cx="-3.6" cy="-3" r="1.6" fill="${C.bean}"/><circle cx="0" cy="-4.3" r="1.6" fill="${C.bean}"/><circle cx="3.6" cy="-3" r="1.6" fill="${C.bean}"/>` +
      `</g>`
    );
  }

  function collar(cx, cy, w) {
    const d = `M ${cx - w} ${cy - 2} Q ${cx} ${cy + 7} ${cx + w} ${cy - 2}`;
    return (
      `<path d="${d}" fill="none" stroke="${C.line}" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${C.collar}" stroke-width="5.5" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${C.collarDot}" stroke-width="2.2" stroke-dasharray="1.5 4.5"/>` +
      `<g class="bell">${ell(cx + 3, cy + 7, 4.2, 4.2, C.bell, 2)}<path d="M ${cx + 3} ${cy + 8} v 3" stroke="${C.line}" stroke-width="1.4"/></g>`
    );
  }

  // ---- head (front view) ------------------------------------------------------

  const HEAD = 'M 0 -30 C 24 -30 39 -18 39 2 C 39 20 24 30 0 30 C -24 30 -39 20 -39 2 C -39 -18 -24 -30 0 -30 Z';

  function ear(side, back) {
    const m = side; // -1 left, 1 right
    const outer = `M ${-33 * m} -10 L ${-35 * m} -46 Q ${-34 * m} -51 ${-29 * m} -47 L ${-7 * m} -26 Z`;
    const inner = `M ${-29 * m} -17 L ${-31 * m} -40 L ${-14 * m} -27 Z`;
    const content = shape(outer, C.tabby) + (back ? stripes([`M ${-30 * m} -16 L ${-30 * m} -36`], 3) : fillPath(inner, C.pink));
    return pivot(-20 * m, -22, `ear ear-${m < 0 ? 'l' : 'r'}`, content);
  }

  function eyeSet(x) {
    const open =
      `<circle cx="${x}" cy="-5" r="8.5" fill="${C.iris}" stroke="${C.line}" stroke-width="2.6"/>` +
      `<ellipse cx="${x + 0.5}" cy="-4.5" rx="4.2" ry="6.3" fill="${C.pupil}"/>` +
      `<circle cx="${x + 2.8}" cy="-8.2" r="2.3" fill="#fff"/><circle cx="${x - 2.2}" cy="-1" r="1.1" fill="#fff" opacity=".85"/>`;
    const wide =
      `<circle cx="${x}" cy="-5" r="9.3" fill="${C.iris}" stroke="${C.line}" stroke-width="2.6"/>` +
      `<circle cx="${x + 0.5}" cy="-4.5" r="6.6" fill="${C.pupil}"/>` +
      `<circle cx="${x + 3}" cy="-8.5" r="2.4" fill="#fff"/><circle cx="${x - 2.6}" cy="-1" r="1.2" fill="#fff"/>`;
    const half =
      `<path d="M ${x - 8.5} -5 A 8.5 8.5 0 0 0 ${x + 8.5} -5 Z" fill="${C.iris}" stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<ellipse cx="${x + 0.5}" cy="-2.2" rx="3.4" ry="3.3" fill="${C.pupil}"/>` +
      `<path d="M ${x - 9.5} -5.5 L ${x + 9.5} -5.5" stroke="${C.line}" stroke-width="3.2" stroke-linecap="round"/>`;
    const closed = `<path d="M ${x - 8} -5 Q ${x} 1 ${x + 8} -5" fill="none" stroke="${C.line}" stroke-width="3" stroke-linecap="round"/>`;
    const happy = `<path d="M ${x - 7.5} -2.5 Q ${x} -11 ${x + 7.5} -2.5" fill="none" stroke="${C.line}" stroke-width="3" stroke-linecap="round"/>`;
    return { open, wide, half, closed, happy };
  }

  function head(uid, o) {
    o = o || {};
    if (o.back) {
      return (
        `<g class="cat-head">` +
        ear(-1, true) +
        ear(1, true) +
        part(uid, 'head', HEAD, C.tabby, stripes(['M 0 -30 L 0 26', 'M -11 -29 L -9 18', 'M 11 -29 L 9 18', 'M -24 -24 L -22 10', 'M 24 -24 L 22 10'], 5)) +
        `</g>`
      );
    }
    const L = eyeSet(-15);
    const Rr = eyeSet(15);
    const eyes = ['open', 'wide', 'half', 'closed', 'happy']
      .map((k) => `<g class="eyes eyes-${k}"${k === 'open' ? '' : ' display="none"'}>${L[k]}${Rr[k]}</g>`)
      .join('');
    const coat =
      stripes(['M -12 -28 L -9 -16', 'M -4 -30 L -3 -19', 'M 4 -30 L 3 -19', 'M 12 -28 L 9 -16', 'M -30 -20 Q -27 -15 -25 -11', 'M 30 -20 Q 27 -15 25 -11']) +
      stripes(['M -40 -1 Q -33 -3 -27 1', 'M -40 8 Q -34 6 -28 10', 'M 40 -1 Q 33 -3 27 1', 'M 40 8 Q 34 6 28 10'], 4) +
      fillPath('M -3 -24 Q 0 -26 3 -24 L 6 -4 Q 20 -2 25 10 Q 24 27 0 31 Q -24 27 -25 10 Q -20 -2 -6 -4 Z', C.white);
    const liner = `<path d="M 23 -5 Q 28 -4 32 -1 M -23 -5 Q -28 -4 -32 -1" fill="none" stroke="${C.stripe}" stroke-width="2.6" stroke-linecap="round"/>`;
    const nose = shape('M -4.5 2 Q 0 0.5 4.5 2 Q 2 6.5 0 7 Q -2 6.5 -4.5 2 Z', C.nose, 2);
    const mouths =
      `<g class="mouth mouth-normal"><path d="M 0 7 L 0 9.5 M -6 9 Q -3 13 0 9.5 Q 3 13 6 9" fill="none" stroke="${C.line}" stroke-width="2" stroke-linecap="round"/></g>` +
      `<g class="mouth mouth-open" display="none"><path d="M 0 7 L 0 9" stroke="${C.line}" stroke-width="2"/>${shape('M -5.5 10 Q 0 8.5 5.5 10 Q 5.5 19 0 19 Q -5.5 19 -5.5 10 Z', C.mouth, 2)}<path d="M -3 16 Q 0 14 3 16" stroke="${C.pink}" stroke-width="2" fill="none"/></g>` +
      `<g class="mouth mouth-tongue" display="none"><path d="M 0 7 L 0 9.5 M -6 9 Q -3 13 0 9.5 Q 3 13 6 9" fill="none" stroke="${C.line}" stroke-width="2" stroke-linecap="round"/>${shape('M -2.6 11 Q 0 18 2.6 11 Z', C.pink, 1.5)}</g>`;
    const whiskers = `<g stroke="${C.whisker}" stroke-width="1.4" stroke-linecap="round" opacity=".75"><path d="M -22 7 L -47 3 M -22 11 L -48 12 M -21 15 L -45 20 M 22 7 L 47 3 M 22 11 L 48 12 M 21 15 L 45 20"/></g>`;
    return `<g class="cat-head">${ear(-1)}${ear(1)}${part(uid, 'head', HEAD, C.tabby, coat)}${liner}${eyes}${nose}${mouths}${whiskers}</g>`;
  }

  function placeHead(uid, x, y, o) {
    o = o || {};
    const rot = o.rot || 0;
    const sc = (o.scale || 1) * 0.9;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><g class="head-wrap">${head(uid, o)}</g></g>`;
  }

  // ---- poses ------------------------------------------------------------------

  const SIT_BODY = 'M -28 -2 C -38 -30 -26 -62 0 -64 C 26 -62 38 -30 28 -2 Z';
  const SIT_STRIPES = [
    'M -34 -44 Q -26 -42 -19 -37', 'M -35 -32 Q -27 -29 -20 -24', 'M -35 -19 Q -28 -16 -21 -11',
    'M 34 -44 Q 26 -42 19 -37', 'M 35 -32 Q 27 -29 20 -24', 'M 35 -19 Q 28 -16 21 -11',
  ];
  const SIT_CHEST = 'M -15 -60 C -21 -40 -18 -14 -11 0 L 11 0 C 18 -14 21 -40 15 -60 Q 0 -66 -15 -60 Z';

  function haunch(m) {
    const d = `M ${36 * m} -2 C ${42 * m} -20 ${30 * m} -36 ${17 * m} -29 C ${11 * m} -19 ${13 * m} -7 ${15 * m} -2 Z`;
    return d;
  }

  function sitBase(uid, o) {
    o = o || {};
    const back = !!o.back;
    let s = '';
    s += part(uid, 'hl', haunch(-1), C.tabby, stripes([`M -40 -14 Q -32 -14 -26 -18`, `M -38 -24 Q -30 -24 -24 -28`]));
    s += part(uid, 'hr', haunch(1), C.tabby, stripes([`M 40 -14 Q 32 -14 26 -18`, `M 38 -24 Q 30 -24 24 -28`]));
    if (back) {
      s += part(uid, 'body', SIT_BODY, C.tabby, stripes(SIT_STRIPES) + stripes(['M 0 -62 L 0 -4'], 6) + stripes(['M -24 -50 Q -12 -46 -4 -50', 'M 24 -50 Q 12 -46 4 -50', 'M -27 -8 Q -14 -4 -4 -8', 'M 27 -8 Q 14 -4 4 -8']));
      s += pivot(14, -4, 'tail-wag', tail('M 14 -4 C 34 2 52 0 56 -14'));
      return s;
    }
    s += paw(-29, -2.5, 8, 4) + paw(29, -2.5, 8, 4);
    s += part(uid, 'body', SIT_BODY, C.tabby, stripes(SIT_STRIPES) + fillPath(SIT_CHEST, C.white) + `<ellipse cx="-17" cy="-46" rx="7" ry="10" fill="${C.tabby}"/>` + stripes(['M -22 -50 L -12 -48', 'M -22 -42 L -12 -40'], 3.5));
    s += pivot(22, -8, 'tail-wag', tail('M 22 -8 C 46 -6 50 4 32 3 C 24 3 19 2 15 1'));
    return s;
  }

  function frontLegs(o) {
    o = o || {};
    let s = '';
    const bands = '0 14 8 6 8 100';
    if (!o.raiseRight) s += limb('M 8 -36 L 8 -6', C.white, 12, bands) + paw(8, -3.5, 8, 5);
    if (!o.raiseLeft) s += limb('M -8 -36 L -8 -6', C.white, 12, bands) + paw(-8, -3.5, 8, 5);
    return s;
  }

  const POSES = {
    sit(uid) {
      return `<g class="breathe">${sitBase(uid)}${frontLegs()}${placeHead(uid, 0, -90)}${collar(0, -61, 17)}</g>`;
    },

    // Back view: watching birds, staring at the wall.
    back(uid) {
      return `<g class="breathe">${sitBase(uid, { back: true })}${placeHead(uid, 0, -90, { back: true })}</g>`;
    },

    groom(uid) {
      const arm = pivot(8, -48, 'lick', limb('M 8 -48 Q 22 -64 9 -77', C.white, 12, '0 30 7 5 7 100') + paw(8, -79, 7.5, 6));
      return `<g class="breathe">${sitBase(uid)}${frontLegs({ raiseRight: true })}${placeHead(uid, -2, -90, { rot: -10 })}${collar(-1, -61, 17)}${arm}</g>`;
    },

    // Batting at the cup.
    swipe(uid) {
      const arm = pivot(8, -46, 'swat', limb('M 8 -46 Q 28 -58 44 -50', C.white, 12, '0 40 7 5 7 100') + paw(46, -50, 7.5, 6));
      return `<g class="breathe">${sitBase(uid)}${frontLegs({ raiseRight: true })}${placeHead(uid, 2, -90, { rot: 6 })}${collar(1, -61, 17)}${arm}</g>`;
    },

    loaf(uid, o) {
      o = o || {};
      const body = 'M -48 -2 C -56 -28 -34 -48 -4 -48 C 26 -48 46 -34 46 -2 Z';
      const inner =
        stripes(['M -30 -46 Q -34 -30 -30 -14', 'M -16 -48 Q -20 -32 -16 -16', 'M -2 -48 Q -6 -34 -2 -20', 'M -44 -32 Q -38 -26 -41 -14', 'M 12 -46 Q 9 -38 11 -30']) +
        fillPath('M 6 -40 C 28 -44 50 -30 46 -2 L 2 -2 C -1 -14 0 -30 6 -40 Z', C.white) +
        fillPath('M -42 -2 Q -10 -11 8 -7 L 8 -2 Z', C.white) +
        `<ellipse cx="17" cy="-17" rx="8" ry="11" fill="${C.tabby}"/>` +
        stripes(['M 11 -22 L 23 -20', 'M 11 -13 L 23 -11'], 3.5);
      const paws = o.knead
        ? pivot(30, -4, 'knead-a', paw(30, -4, 8, 4.5)) + pivot(41, -3, 'knead-b', paw(41, -3, 8, 4.5))
        : paw(30, -3.5, 8, 4.5) + paw(41, -3, 8, 4.5);
      return (
        `<g class="breathe">` +
        pivot(-44, -10, 'tail-wag slow', tail('M -44 -10 C -60 -6 -54 1 -34 1 C -18 1 -4 1 6 -1')) +
        part(uid, 'body', body, C.tabby, inner) +
        paws +
        placeHead(uid, 28, -56) +
        collar(28, -28, 16) +
        `</g>`
      );
    },

    lie(uid) {
      const body = 'M -62 -2 C -66 -24 -44 -38 -10 -38 C 18 -38 34 -28 34 -2 Z';
      const inner =
        stripes(['M -44 -36 Q -48 -22 -44 -10', 'M -30 -38 Q -34 -24 -30 -12', 'M -16 -38 Q -20 -26 -16 -14', 'M -2 -38 Q -5 -28 -2 -18']) +
        fillPath('M -40 -2 Q -10 -16 20 -14 Q 34 -16 34 -2 Z', C.white) +
        fillPath('M 8 -34 C 26 -36 36 -24 34 -2 L 4 -2 Z', C.white);
      const thigh = 'M -54 -6 C -60 -26 -38 -34 -28 -20 C -22 -10 -30 -4 -38 -2 Z';
      return (
        `<g class="breathe">` +
        pivot(-60, -8, 'tail-wag slow', tail('M -60 -8 C -78 -10 -88 -6 -90 -2')) +
        part(uid, 'body', body, C.tabby, inner) +
        part(uid, 'thigh', thigh, C.tabby, stripes(['M -56 -16 L -36 -24', 'M -52 -8 L -32 -14'])) +
        limb('M -46 -5 L -66 -5', C.white, 10) +
        sole(-70, -6, 90) +
        limb('M 14 -8 L 54 -6', C.white, 11, '0 26 7 5 7 100') +
        paw(58, -6, 8, 5) +
        limb('M 10 -3 L 48 -2', C.white, 11) +
        paw(52, -2.5, 8, 4.5) +
        placeHead(uid, 30, -40, { rot: -8 }) +
        `</g>`
      );
    },

    // Curled up asleep, like in the round scratcher bed.
    curl(uid) {
      const body = 'M -54 -26 C -54 -48 -30 -58 -4 -58 C 24 -58 46 -46 46 -24 C 46 -6 26 0 -4 0 C -34 0 -54 -6 -54 -26 Z';
      const inner =
        stripes(['M -42 -50 Q -32 -36 -38 -18', 'M -26 -56 Q -16 -40 -22 -22', 'M -10 -58 Q -2 -42 -8 -26', 'M 6 -57 Q 14 -44 10 -32', 'M 20 -54 Q 28 -44 24 -34']) +
        fillPath('M -36 -2 Q -6 -20 26 -28 Q 46 -26 46 -10 Q 30 2 -4 0 Z', C.white);
      return (
        `<g class="breathe">` +
        part(uid, 'body', body, C.tabby, inner) +
        tail('M -50 -16 C -52 2 4 6 30 -2') +
        sole(10, -12, -30) +
        paw(22, -7, 8, 5) +
        placeHead(uid, 26, -34, { rot: 14, scale: 0.88 }) +
        `</g>`
      );
    },

    walk(uid) {
      const body = 'M -48 -42 C -48 -58 -22 -60 4 -58 C 30 -58 44 -48 42 -34 C 40 -22 22 -20 0 -20 C -26 -20 -48 -24 -48 -42 Z';
      const inner =
        stripes(['M -36 -58 Q -40 -42 -36 -26', 'M -22 -60 Q -26 -44 -22 -24', 'M -8 -60 Q -11 -44 -8 -24', 'M 6 -59 Q 4 -48 6 -36']) +
        fillPath('M 18 -54 C 40 -56 46 -38 38 -24 C 26 -18 4 -18 -16 -20 Q 6 -28 18 -54 Z', C.white);
      const leg = (x, cls, color, bands, footColor) =>
        pivot(x, -34, cls, limb(`M ${x} -34 L ${x} -6`, color, 11, bands) + paw(x + 2, -3.5, 7.5, 4.5, footColor || C.white));
      return (
        `<g class="breathe">` +
        leg(22, 'leg leg-b', C.whiteFar, '0 30 8 5 8 100', C.whiteFar) +
        leg(-32, 'leg leg-a', C.tabbyFar, '0 25 10 10 10 100') +
        pivot(-46, -46, 'tail-wag', tail('M -46 -46 C -62 -56 -66 -84 -54 -98')) +
        part(uid, 'body', body, C.tabby, inner) +
        leg(30, 'leg leg-a', C.white, '0 30 8 5 8 100') +
        leg(-40, 'leg leg-b', C.tabby, '0 25 10 10 10 100') +
        placeHead(uid, 40, -64) +
        collar(40, -36, 15) +
        `</g>`
      );
    },

    stretch(uid) {
      const body = 'M -52 -56 C -54 -72 -30 -70 -14 -58 C 2 -46 22 -32 34 -20 C 30 -8 14 -8 2 -14 C -16 -22 -46 -32 -52 -56 Z';
      const inner =
        stripes(['M -40 -68 Q -44 -54 -38 -40', 'M -26 -66 Q -30 -50 -24 -34', 'M -12 -58 Q -16 -44 -10 -28', 'M 2 -48 Q 0 -38 4 -26']) +
        fillPath('M 6 -40 Q 26 -32 34 -20 C 30 -8 14 -8 2 -14 Q 10 -26 6 -40 Z', C.white);
      return (
        `<g class="breathe">` +
        limb('M -36 -44 L -36 -6', C.tabbyFar, 12, '0 30 10 10 10 100') +
        paw(-34, -3.5, 8, 4.5) +
        pivot(-48, -60, 'tail-wag', tail('M -48 -60 C -62 -78 -50 -98 -38 -102')) +
        part(uid, 'body', body, C.tabby, inner) +
        limb('M -44 -40 L -46 -6', C.tabby, 12, '0 30 10 10 10 100') +
        paw(-44, -3.5, 8, 4.5) +
        limb('M 14 -8 L 60 -6', C.white, 11, '0 30 7 5 7 100') +
        paw(64, -6, 8, 5) +
        limb('M 10 -4 L 54 -2', C.white, 11) +
        paw(58, -2.5, 8, 4.5) +
        placeHead(uid, 42, -28, { rot: 6 }) +
        `</g>`
      );
    },

    // On its back. The belly is a trap.
    belly(uid) {
      const body = 'M -52 -22 C -52 -40 -30 -46 -6 -46 C 20 -46 40 -40 40 -22 C 40 -6 20 0 -6 0 C -32 0 -52 -6 -52 -22 Z';
      const inner =
        stripes(['M -40 -4 Q -36 -14 -40 -24', 'M -26 -2 Q -22 -10 -26 -18', 'M 22 -2 Q 18 -10 22 -18']) +
        `<ellipse cx="-6" cy="-28" rx="34" ry="17" fill="${C.white}"/>`;
      return (
        `<g class="breathe">` +
        pivot(-50, -14, 'tail-wag slow', tail('M -50 -14 C -70 -12 -82 -6 -90 -2')) +
        part(uid, 'body', body, C.tabby, inner) +
        pivot(14, -38, 'paddle-a', limb('M 14 -38 Q 18 -52 26 -58', C.white, 11, '0 28 9 5 9 100') + sole(27, -63, 20)) +
        pivot(2, -42, 'paddle-b', limb('M 2 -42 Q 0 -56 8 -64', C.white, 11) + sole(9, -69, 10)) +
        pivot(-30, -38, 'paddle-b', limb('M -30 -38 Q -34 -52 -28 -60', C.tabby, 12, '0 25 12 8 12 100') + sole(-27, -65, -6)) +
        pivot(-42, -32, 'paddle-a', limb('M -42 -32 Q -52 -44 -48 -54', C.tabby, 12, '0 25 12 8 12 100') + sole(-48, -59, -16)) +
        placeHead(uid, 44, -24, { rot: -24 }) +
        `</g>`
      );
    },

    // Low and ready: hunting, eating, playing.
    crouch(uid, o) {
      o = o || {};
      const body = 'M -46 -12 C -50 -34 -30 -42 -2 -40 C 22 -38 36 -30 36 -12 C 30 -4 -30 -2 -46 -12 Z';
      const inner =
        stripes(['M -34 -40 Q -38 -28 -34 -16', 'M -20 -42 Q -24 -30 -20 -16', 'M -6 -41 Q -9 -30 -6 -18', 'M 8 -40 Q 6 -32 8 -24']) +
        fillPath('M 14 -36 C 32 -36 40 -24 36 -12 C 26 -6 0 -4 -14 -6 Q 8 -14 14 -36 Z', C.white);
      const thigh = 'M -46 -4 C -52 -26 -32 -36 -22 -22 C -18 -12 -26 -4 -32 -2 Z';
      const headY = o.eat ? -18 : -34;
      return (
        `<g class="breathe">` +
        pivot(-46, -20, 'tail-wag fast', tail('M -46 -20 C -66 -22 -82 -16 -96 -10')) +
        part(uid, 'body', body, C.tabby, inner) +
        part(uid, 'thigh', thigh, C.tabby, stripes(['M -50 -14 L -30 -22', 'M -48 -6 L -28 -12'])) +
        paw(-38, -3, 9, 4.5) +
        limb('M 22 -14 L 40 -6', C.white, 11, '0 30 9 6 9 100') +
        paw(44, -4, 8, 4.5) +
        limb('M 16 -10 L 34 -3', C.white, 11) +
        paw(38, -3, 8, 4.5) +
        placeHead(uid, o.eat ? 46 : 42, headY, { rot: o.eat ? 18 : 0 }) +
        (o.eat ? '' : collar(42, -8, 14)) +
        `</g>`
      );
    },
  };

  // Where each pose's head sits (for petting zones, speech bubbles, hearts).
  const HEAD_AT = {
    sit: [0, -90], back: [0, -90], groom: [-2, -90], swipe: [2, -90], loaf: [28, -56], lie: [30, -40],
    curl: [26, -34], walk: [40, -64], stretch: [42, -28], belly: [44, -24], crouch: [42, -34],
  };

  // Rough height of each pose (for bubbles above the head).
  const TOP = { sit: -140, back: -140, groom: -140, swipe: -140, loaf: -108, lie: -92, curl: -84, walk: -114, stretch: -104, belly: -80, crouch: -84 };

  function render(pose, uid, opts) {
    const fn = POSES[pose] || POSES.sit;
    return fn(uid || 'cat', opts || {});
  }

  // Just the face, for the mood badge and menus.
  function renderHead(uid, eyes, mouth) {
    let h = head(uid || 'face');
    h = h.replace(/<g class="eyes eyes-(\w+)"( display="none")?>/g, (m, k) => `<g class="eyes eyes-${k}"${k === (eyes || 'open') ? '' : ' display="none"'}>`);
    h = h.replace(/<g class="mouth mouth-(\w+)"( display="none")?>/g, (m, k) => `<g class="mouth mouth-${k}"${k === (mouth || 'normal') ? '' : ' display="none"'}>`);
    return h;
  }

  G.CatArt = { render, renderHead, HEAD_AT, TOP, COLORS: C, POSES: Object.keys(POSES) };
})(globalThis.CatGame = globalThis.CatGame || {});
