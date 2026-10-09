// "My Purrfriend": the logo (a tabby peeking out of a cardboard box with the
// name on the box front), a text-only wordmark for the intro screen, and the
// app icon. All drawn in the game's style (docs/art-style.md).
(function (G) {
  'use strict';

  const INK = '#1b1714';
  const HEAD =
    'M 0 30 C -30 30 -50 22 -50 0 C -50 -10 -49 -16 -48 -22 L -46 -43 Q -45 -50 -39 -46 L -22 -34 Q 0 -38 22 -34 L 39 -46 Q 45 -50 46 -43 L 48 -22 C 49 -16 50 -10 50 0 C 50 22 30 30 0 30 Z';
  const TYPE = `font-family="'M PLUS Rounded 1c', Nunito, sans-serif" font-weight="900" text-anchor="middle" stroke="${INK}" stroke-linejoin="round" paint-order="stroke"`;
  const heart = (x, y, s) =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M 0 6 C -14 -4 -10 -16 0 -9 C 10 -16 14 -4 0 6 Z" fill="#f28ba0" stroke="${INK}" stroke-width="${2.6 / s}" stroke-linejoin="round"/>`;

  // The brand cat: tabby & white.
  function cat(uid) {
    return (
      `<clipPath id="${uid}-h"><path d="${HEAD}"/></clipPath>` +
      `<path d="${HEAD}" fill="#fcfcfc"/>` +
      `<g clip-path="url(#${uid}-h)"><path d="M -70 -70 L 70 -70 L 70 8 C 52 6 36 2 24 -2 C 14 -5 8 -12 0 -12 C -8 -12 -14 -5 -24 -2 C -36 2 -52 6 -70 8 Z" fill="#a8957c"/>` +
      `<path d="M -8 -36 L -7 -27 M 8 -36 L 7 -27" stroke="#6b5a4a" stroke-width="6.5" stroke-linecap="round"/></g>` +
      `<path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
      `<circle cx="-22" cy="2" r="5.6" fill="${INK}"/><circle cx="22" cy="2" r="5.6" fill="${INK}"/>` +
      `<ellipse cx="0" cy="7" rx="5.4" ry="4" fill="${INK}"/>` +
      `<path d="M 0 10 L 0 11.5 M -10 12.5 Q -5 18.5 0 11.5 Q 5 18.5 10 12.5" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  // Full logo, viewBox 0 0 520 340.
  function full(uid) {
    uid = uid || 'logo';
    return (
      `<svg viewBox="0 0 520 340" role="img" aria-label="My Purrfriend">` +
      `<path d="M 110 176 L 150 134 L 370 134 L 410 176 Z" fill="#a9763f" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="M 110 176 L 52 146 L 92 108 L 150 134 Z M 410 176 L 468 146 L 428 108 L 370 134 Z" fill="#e8bf86" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>` +
      `<g transform="translate(260 138) scale(1.32)">${cat(uid)}</g>` +
      `<rect x="100" y="176" width="320" height="140" rx="12" fill="#dcaa6c" stroke="${INK}" stroke-width="7"/>` +
      `<ellipse cx="218" cy="178" rx="15" ry="10" fill="#fcfcfc" stroke="${INK}" stroke-width="6"/>` +
      `<ellipse cx="302" cy="178" rx="15" ry="10" fill="#fcfcfc" stroke="${INK}" stroke-width="6"/>` +
      `<g ${TYPE}><text x="260" y="238" font-size="40" fill="#e8a35a" stroke-width="9">My</text>` +
      `<text x="260" y="292" font-size="46" fill="#fcf4ec" stroke-width="10">Purrfriend</text></g>` +
      heart(306, 222, 1.1) +
      `</svg>`
    );
  }

  // Name only, for the intro (the real cat and box are right below it).
  function wordmark() {
    return (
      `<svg viewBox="0 0 460 150" role="img" aria-label="My Purrfriend">` +
      `<g ${TYPE}><text x="230" y="50" font-size="40" fill="#e8a35a" stroke-width="10">My</text>` +
      `<text x="230" y="128" font-size="72" fill="#fcf4ec" stroke-width="14">Purrfriend</text></g>` +
      heart(280, 34, 1.3) +
      `</svg>`
    );
  }

  // App icon, viewBox 0 0 120 120.
  function icon(uid) {
    uid = uid || 'icon';
    return (
      `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="3" y="3" width="114" height="114" rx="26" fill="#f8e9b4" stroke="${INK}" stroke-width="5"/>` +
      `<path d="M 26 64 L 36 52 L 84 52 L 94 64 Z" fill="#a9763f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
      `<g transform="translate(60 50) scale(.6)">${cat(uid)}</g>` +
      `<rect x="26" y="64" width="68" height="38" rx="5" fill="#dcaa6c" stroke="${INK}" stroke-width="4"/>` +
      `<ellipse cx="48" cy="65" rx="7" ry="5" fill="#fcfcfc" stroke="${INK}" stroke-width="3.5"/>` +
      `<ellipse cx="72" cy="65" rx="7" ry="5" fill="#fcfcfc" stroke="${INK}" stroke-width="3.5"/>` +
      `</svg>`
    );
  }

  G.Logo = { full, wordmark, icon };
})(globalThis.CatGame = globalThis.CatGame || {});
