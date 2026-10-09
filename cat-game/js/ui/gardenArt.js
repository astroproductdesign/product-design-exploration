// The garden outside, where the cat waits in its cardboard box to be adopted
// (intro and adoption panel). Same style as the room (docs/art-style.md):
// one ink line, flat fills, calmer than the cat.
// Drawn around the box: (0,0) is the middle of the box floor, in the cat's
// own units (the scene scales the whole thing to the cat's size).
(function (G) {
  'use strict';

  const K = {
    line: '#1b1714',
    sky: '#bfe6f5',
    fence: '#fcf4ec',
    rail: '#e6d8c0',
    grass: '#bcd98e',
    grassLine: '#98bd6c',
    bush: '#86b45e',
    stone: '#ece4d4',
    shadow: '#a5c97c',
    pink: '#f4accc',
    yellow: '#ecbc44',
    white: '#fcfcfc',
  };
  const X0 = -1800;
  const X1 = 1800;

  const S = (d, fill, w) => `<path d="${d}" fill="${fill}" stroke="${K.line}" stroke-width="${w || 4}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const L = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w || 3}" stroke-linecap="round" stroke-linejoin="round"/>`;

  // A row of round bumps (tree line, bushes) along `base`, filled down to `bottom`.
  function bumps(x0, x1, base, w, bottom) {
    let d = `M ${x0} ${bottom} L ${x0} ${base}`;
    let x = x0;
    let i = 0;
    while (x < x1) {
      const cw = Math.min(x1 - x, w * (0.8 + ((i++ * 37) % 10) / 22));
      d += ` A ${(cw * 0.56).toFixed(1)} ${(cw * 0.56).toFixed(1)} 0 0 1 ${(x + cw).toFixed(1)} ${base}`;
      x += cw;
    }
    return d + ` L ${x1} ${bottom} Z`;
  }

  // A tiny five-dot flower.
  function flower(x, y, c, r) {
    r = r || 3.2;
    let s = '';
    for (let a = 0; a < 5; a++) {
      const t = (a / 5) * Math.PI * 2 - Math.PI / 2;
      s += `<circle cx="${(x + Math.cos(t) * r * 1.25).toFixed(1)}" cy="${(y + Math.sin(t) * r * 1.25).toFixed(1)}" r="${r}" fill="${c}" stroke="${K.line}" stroke-width="2"/>`;
    }
    return s + `<circle cx="${x}" cy="${y}" r="${(r * 0.8).toFixed(1)}" fill="${K.yellow}" stroke="${K.line}" stroke-width="1.8"/>`;
  }

  const tuft = (x, y, s) => L(`M ${x - 7 * s} ${y} L ${x - 4 * s} ${y - 9 * s} M ${x} ${y} L ${x} ${y - 12 * s} M ${x + 7 * s} ${y} L ${x + 4 * s} ${y - 9 * s}`, K.grassLine, 3);

  // Everything behind the box. Kept low and simple so the sky above stays
  // clear for the title.
  function back() {
    let s = '';
    // sky (the scene recolours it with the time of day)
    s += `<rect id="garden-sky" x="${X0}" y="-3000" width="${X1 - X0}" height="2900" fill="${K.sky}"/>`;
    // a low picket fence
    s += `<rect x="${X0}" y="-142" width="${X1 - X0}" height="8" fill="${K.rail}" stroke="${K.line}" stroke-width="3.5"/>`;
    s += `<rect x="${X0}" y="-126" width="${X1 - X0}" height="8" fill="${K.rail}" stroke="${K.line}" stroke-width="3.5"/>`;
    for (let x = X0 + 13; x < X1; x += 28) s += S(`M ${x - 9} -112 L ${x - 9} -144 L ${x} -154 L ${x + 9} -144 L ${x + 9} -112 Z`, K.fence, 3.5);
    // lawn
    s += `<rect x="${X0}" y="-118" width="${X1 - X0}" height="3200" fill="${K.grass}"/>`;
    s += L(`M ${X0} -118 L ${X1} -118`, K.line, 4);
    // bushes either side of the box
    s += S(bumps(-360, -128, -118, 50, -96), K.bush, 4);
    s += S(bumps(134, 380, -118, 52, -96), K.bush, 4);
    s += flower(-292, -116, K.pink) + flower(-214, -126, K.white) + flower(-160, -110, K.pink);
    s += flower(186, -112, K.white) + flower(258, -128, K.pink) + flower(332, -110, K.white);
    // stepping stones up to the box, flowers and tufts in the grass
    for (const [x, y, rx] of [[-6, 70, 30], [26, 124, 34], [-14, 186, 38], [22, 258, 42], [-10, 340, 46]]) s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${(rx * 0.36).toFixed(1)}" fill="${K.stone}" stroke="${K.line}" stroke-width="3.5"/>`;
    s += flower(-170, -28, K.pink) + flower(-150, -14, K.white) + flower(186, -40, K.yellow) + flower(-240, 70, K.white) + flower(232, 60, K.pink) + flower(-110, 150, K.yellow) + flower(140, 200, K.white);
    for (const [x, y] of [[-120, -70], [130, -84], [-260, -30], [270, -20], [-80, 110], [96, 90], [-200, 210], [200, 300], [-330, 140], [340, 160]]) s += tuft(x, y, 1);
    // soft shadow under the box
    s += `<ellipse cx="0" cy="6" rx="96" ry="13" fill="${K.shadow}"/>`;
    // a butterfly drifting over the lawn
    s += `<g class="butterfly"><g class="flap">${S('M 0 0 Q -12 -12 -11 -2 Q -10 6 0 0 Z M 0 0 Q 12 -12 11 -2 Q 10 6 0 0 Z', K.pink, 2.4)}</g></g>`;
    return s;
  }

  // In front of the box: a few tufts and flowers in the foreground.
  function front() {
    return tuft(-104, 22, 1.2) + tuft(112, 26, 1.1) + flower(-124, 30, K.white, 3.6) + flower(132, 34, K.pink, 3.6);
  }

  // Flat sky colour for the time of day (the room's dark tint covers the rest).
  function applyLighting(root, light, mix) {
    const sky = root.querySelector('#garden-sky');
    if (sky) sky.setAttribute('fill', mix(light.skyTop, light.skyBot, 0.55));
  }

  G.GardenArt = { back, front, applyLighting };
})(globalThis.CatGame = globalThis.CatGame || {});
