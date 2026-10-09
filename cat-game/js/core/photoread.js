// Reading a cat's coat from a photo, entirely on the device.
//
//   analyze(rgba, w, h, taps, opts) -> { coat, mask, notes }
//
// rgba is a small image (about 96 px on the long side); taps are optional
// points the player tapped: taps[0] = main fur colour, taps[1] = a stripe or
// patch. opts.oneColour = the player said there is no second colour.
//
// Steps:
//  1. Auto-levels + a gentle white balance, so dim or warm photos read right.
//  2. Work in OKLab (lightness + two colour axes), weighting lightness down so
//     shadows on fur don't change the colour.
//  3. Find the background by flooding in from the photo's edges, then keep the
//     region that holds the tapped fur (or the biggest one near the middle).
//  4. Base colour = the tap (or the most common fur colour). Second colour =
//     the second tap (or the next most common, if there's enough of it).
//  5. White: how much fur is white, and whether it reaches the top (face) or
//     stays low (chest).
//  6. Pattern from where the colours are: thin repeated runs = stripes, big
//     blobs = patches, dark at the top of a light cat = colour-point.
(function (G) {
  'use strict';

  // ---- colour ------------------------------------------------------------------------

  const lin = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  function oklab(r, g, b) {
    r = lin(r);
    g = lin(g);
    b = lin(b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720453 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  const hexLab = (hex) => oklab(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  // Colour difference with lightness counted at 60%: shade shouldn't change a colour.
  const dE = (p, q) => Math.sqrt(0.36 * (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
  const chroma = (p) => Math.hypot(p[1], p[2]);

  let SW = null;
  const swatchLabs = () => SW || (SW = G.Coats.SWATCHES.map((s) => ({ id: s.id, hex: s.hex, lab: hexLab(s.hex) })));
  // Nearest coat swatch. Lightness counts a little more here than in dE so
  // black / chocolate / brown stay apart.
  function nearestSwatch(lab, allowWhite) {
    let best = null;
    let bd = Infinity;
    for (const s of swatchLabs()) {
      if (s.id === 'white' && !allowWhite) continue;
      const d = 0.5 * (lab[0] - s.lab[0]) ** 2 + (lab[1] - s.lab[1]) ** 2 + (lab[2] - s.lab[2]) ** 2;
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  function percentile(arr, p) {
    const a = Array.from(arr).sort((x, y) => x - y);
    return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  }

  // ---- 1-2. levels, white balance, OKLab -----------------------------------------------
  // (White balance is deliberately gentle: it only nudges photos whose
  // brightest parts are already nearly neutral.)

  function toLab(data, w, h) {
    const n = w * h;
    const ch = [0, 1, 2].map((c) => {
      const v = new Uint8Array(n);
      for (let i = 0; i < n; i++) v[i] = data[i * 4 + c];
      return percentile(v, 0.98) || 1;
    });
    const top = Math.max(...ch);
    const exposure = Math.min(1.6, Math.max(1, 245 / top));
    // Only balance when the brightest parts are roughly neutral (a white wall,
    // white fur). A ginger cat filling the frame must stay ginger.
    // (Cream fur's highlights are ~18% warm; balancing those would turn it white.)
    const balanced = top / Math.min(...ch) < 1.1;
    const k = ch.map((p) => exposure * (balanced ? Math.min(1.06, Math.max(0.94, top / p)) : 1));
    const L = new Float32Array(n);
    const A = new Float32Array(n);
    const B = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = oklab(Math.min(255, data[i * 4] * k[0]), Math.min(255, data[i * 4 + 1] * k[1]), Math.min(255, data[i * 4 + 2] * k[2]));
      L[i] = o[0];
      A[i] = o[1];
      B[i] = o[2];
    }
    return { L, A, B, at: (i) => [L[i], A[i], B[i]] };
  }

  // Median colour of a small window: one stray pixel can't spoil a tap.
  function sampleAt(px, w, h, x, y, r) {
    const ls = [];
    const as = [];
    const bs = [];
    for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) {
      for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) {
        const i = yy * w + xx;
        ls.push(px.L[i]);
        as.push(px.A[i]);
        bs.push(px.B[i]);
      }
    }
    return [percentile(ls, 0.5), percentile(as, 0.5), percentile(bs, 0.5)];
  }

  // ---- 3. background and the cat region --------------------------------------------------

  function findCat(px, w, h, tap, tapLab) {
    const n = w * h;
    const bg = new Uint8Array(n);
    const origin = new Int32Array(n).fill(-1);
    const queue = [];
    // Seed from the outer ring, skipping edge pixels that look like the tapped fur
    // (the cat may run off the edge of the photo).
    for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) queue.push(y * w + x);
    for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) queue.push(y * w + x);
    let head = 0;
    const seeds = [];
    for (const i of queue) {
      if (bg[i]) continue;
      if (tapLab && dE(px.at(i), tapLab) < 0.08) continue;
      bg[i] = 1;
      origin[i] = i;
      seeds.push(i);
    }
    const q = seeds;
    while (head < q.length) {
      const i = q[head++];
      const x = i % w;
      const y = (i - x) / w;
      const here = px.at(i);
      const from = px.at(origin[i]);
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || bg[j]) continue;
        const p = px.at(j);
        if (tapLab && dE(p, tapLab) < 0.06) continue;
        if (dE(p, here) < 0.045 && dE(p, from) < 0.16) {
          bg[j] = 1;
          origin[j] = origin[i];
          q.push(j);
        }
      }
    }

    // Connected regions of non-background.
    const comp = new Int32Array(n).fill(-1);
    const sizes = [];
    for (let s = 0; s < n; s++) {
      if (bg[s] || comp[s] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      const st = [s];
      comp[s] = id;
      while (st.length) {
        const i = st.pop();
        size++;
        const x = i % w;
        const y = (i - x) / w;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
          if (j >= 0 && !bg[j] && comp[j] < 0) {
            comp[j] = id;
            st.push(j);
          }
        }
      }
      sizes.push(size);
    }

    let pick = -1;
    if (tap) {
      // The region under the tap, or the nearest one within a few pixels.
      let best = Infinity;
      for (let y = Math.max(0, tap.y - 6); y <= Math.min(h - 1, tap.y + 6); y++) {
        for (let x = Math.max(0, tap.x - 6); x <= Math.min(w - 1, tap.x + 6); x++) {
          const c = comp[y * w + x];
          const d = (x - tap.x) ** 2 + (y - tap.y) ** 2;
          if (c >= 0 && d < best) {
            best = d;
            pick = c;
          }
        }
      }
    } else {
      // The biggest region that reaches the middle half of the photo.
      const seen = new Map();
      for (let y = Math.floor(h * 0.25); y < h * 0.75; y++) for (let x = Math.floor(w * 0.25); x < w * 0.75; x++) {
        const c = comp[y * w + x];
        if (c >= 0) seen.set(c, sizes[c]);
      }
      let best = 0;
      for (const [c, size] of seen) if (size > best) ((best = size), (pick = c));
    }

    const mask = new Uint8Array(n);
    let count = 0;
    if (pick >= 0 && sizes[pick] >= n * 0.03) {
      for (let i = 0; i < n; i++) if (comp[i] === pick) ((mask[i] = 1), count++);
    }
    // The cat fills most of the photo: whatever was flooded from the edges was
    // probably fur too (a white chest touching the frame), so read everything.
    if (tap && count > n * 0.55) {
      for (let i = 0; i < n; i++) mask[i] = 1;
      count = n;
    }
    let fallback = false;
    if (!count) {
      // Couldn't separate the cat (busy background): use a box around the tap,
      // or the middle of the photo.
      fallback = true;
      const cx = tap ? tap.x : w / 2;
      const cy = tap ? tap.y : h / 2;
      const rx = w * (tap ? 0.22 : 0.35);
      const ry = h * (tap ? 0.22 : 0.35);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry) ((mask[y * w + x] = 1), count++);
    }
    return { mask, count, fallback };
  }

  // ---- 4-6. colours, white, pattern --------------------------------------------------------

  function analyze(data, w, h, taps, opts) {
    taps = (taps || []).map((t) => ({ x: Math.round(Math.max(0, Math.min(w - 1, t.x))), y: Math.round(Math.max(0, Math.min(h - 1, t.y))) }));
    opts = opts || {};
    const n = w * h;
    const px = toLab(data, w, h);
    const r = Math.max(1, Math.round(Math.min(w, h) / 40));
    const tap1 = taps[0] ? sampleAt(px, w, h, taps[0].x, taps[0].y, r) : null;
    const tap2 = taps[1] ? sampleAt(px, w, h, taps[1].x, taps[1].y, r) : null;
    const { mask, count, fallback } = findCat(px, w, h, taps[0], tap1);

    // Rows the cat covers (for "top" vs "middle").
    let y0 = h;
    let y1 = 0;
    for (let i = 0; i < n; i++) if (mask[i]) ((y0 = Math.min(y0, (i / w) | 0)), (y1 = Math.max(y1, (i / w) | 0)));
    const span = Math.max(1, y1 - y0 + 1);
    const band = (i) => ((((i / w) | 0) - y0) / span);

    // White fur: neutral and close to the brightest part of the cat.
    const lights = [];
    for (let i = 0; i < n; i++) if (mask[i]) lights.push(px.L[i]);
    const lp95 = percentile(lights, 0.95);
    const whiteCut = Math.min(0.86, Math.max(0.72, lp95 - 0.12));
    // (Cream fur has a little warmth, so white has to be really neutral.)
    const isWhite = (p) => lp95 > 0.8 && chroma(p) < 0.028 && p[0] > whiteCut;

    // Base colour: the tap, or the most common non-white fur.
    const tally = (pred) => {
      const t = new Map();
      for (let i = 0; i < n; i++) {
        if (!mask[i]) continue;
        const p = px.at(i);
        if (isWhite(p) || !pred(p)) continue;
        const s = nearestSwatch(p).id;
        const e = t.get(s) || { n: 0, sum: [0, 0, 0] };
        e.n++;
        e.sum[0] += p[0];
        e.sum[1] += p[1];
        e.sum[2] += p[2];
        t.set(s, e);
      }
      return [...t.entries()].sort((a, b) => b[1].n - a[1].n).map(([id, e]) => ({ id, n: e.n, lab: e.sum.map((v) => v / e.n) }));
    };
    let base = tap1;
    let baseIsWhite = tap1 ? isWhite(tap1) || (chroma(tap1) < 0.028 && tap1[0] > 0.86) : false;
    if (!base) {
      const top = tally(() => true)[0];
      base = top ? top.lab : null;
    }
    // A pale, neutral cat whose brightest fur is near white is a white cat in shade.
    if (base && !baseIsWhite && chroma(base) < 0.03 && base[0] > 0.66 && lp95 > 0.86) baseIsWhite = true;
    if (!base) {
      // An all-white cat.
      return { coat: { preset: null, base: '#fcfcfc', pattern: 'plain', white: 'none' }, mask, notes: { fallback, whiteShare: 1 } };
    }

    // Second colour: the second tap, or the next most common fur colour.
    let second = null;
    if (!opts.oneColour) {
      if (tap2) second = isWhite(tap2) ? null : tap2;
      else {
        const nonWhite = tally(() => true).reduce((s, e) => s + e.n, 0);
        const others = tally((p) => dE(p, base) > 0.1);
        if (others[0] && others[0].n > nonWhite * 0.1) second = others[0].lab;
      }
    }

    // Label every cat pixel: white / base / second / other.
    const lab = new Uint8Array(n); // 0 none, 1 white, 2 base, 3 second
    let nWhite = 0;
    let nBase = 0;
    let nSecond = 0;
    let topCat = 0;
    let topWhite = 0;
    let topSecond = 0;
    let midSecond = 0;
    let midCat = 0;
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      const p = px.at(i);
      const top = band(i) < 0.4;
      const mid = band(i) >= 0.45 && band(i) < 0.85;
      if (top) topCat++;
      if (mid) midCat++;
      if (isWhite(p) && !baseIsWhite) {
        lab[i] = 1;
        nWhite++;
        if (top) topWhite++;
        continue;
      }
      const d1 = dE(p, base);
      const d2 = second ? dE(p, second) : Infinity;
      if (d1 <= d2 && d1 < 0.14) {
        lab[i] = 2;
        nBase++;
      } else if (d2 < d1 && d2 < 0.14) {
        lab[i] = 3;
        nSecond++;
        if (top) topSecond++;
        if (mid) midSecond++;
      }
    }

    let baseSw = nearestSwatch(base, true);
    let secondSw = second ? nearestSwatch(second) : null;
    const whiteShare = nWhite / Math.max(1, count);
    let white = 'none';
    if (whiteShare >= 0.05) white = topWhite / Math.max(1, topCat) > 0.07 && whiteShare > 0.12 ? 'face' : 'chest';

    // A white cat with patches: the patch colour becomes the coat, with lots of white.
    if (baseIsWhite || baseSw.id === 'white') {
      if (secondSw) {
        baseSw = secondSw;
        secondSw = null;
        white = 'face';
      } else {
        return { coat: { preset: null, base: '#fcfcfc', pattern: 'plain', white: 'none' }, mask, notes: { fallback, whiteShare } };
      }
    }

    // Pattern.
    let pattern = 'plain';
    let why = 'one main colour';
    const share2 = nSecond / Math.max(1, nBase + nSecond);
    if (secondSw && share2 >= 0.06) {
      const pair = [baseSw.id, secondSw.id].sort().join('+');
      const topRate = topSecond / Math.max(1, topCat);
      const midRate = midSecond / Math.max(1, midCat);
      const light = base[0] > 0.78 && second[0] < base[0] - 0.22;
      // Tortie / calico: ginger with near-black. (Dark ginger stripes on a ginger
      // tabby are the same hue, so they don't count.)
      const blackish = (lab) => lab[0] < 0.4 && chroma(lab) < 0.06;
      if (pair === 'black+ginger' && (blackish(second) || blackish(base))) {
        pattern = 'patches';
        why = 'ginger and black together';
      } else if (light && topRate > 2 * midRate + 0.08) {
        pattern = 'points';
        why = 'darker face and ears on a light coat';
      } else {
        const st = stripiness(lab, w, h);
        if (st.stripes) {
          pattern = 'stripes';
          why = 'thin repeated bands';
        } else {
          pattern = 'patches';
          why = 'large blocks of a second colour';
        }
      }
    }
    if (pattern === 'points' && white === 'face') white = 'chest';

    const coat = { preset: null, base: baseSw.hex, pattern, white };
    coat.preset = G.Coats.matchPreset(coat);
    return { coat, mask, notes: { fallback, whiteShare, why, coverage: count / n } };
  }

  // Stripes are many short runs of the second colour across the fur; patches
  // are a few long ones. Scan rows and columns and take the stripier direction.
  function stripiness(lab, w, h) {
    const scan = (lines, len, at) => {
      let runs = 0;
      let total = 0;
      let used = 0;
      let width = 0;
      for (let a = 0; a < lines; a++) {
        let run = 0;
        let fur = 0;
        for (let b = 0; b < len; b++) {
          const v = lab[at(a, b)];
          if (v === 2 || v === 3) fur++;
          if (v === 3) run++;
          else if (run) {
            runs++;
            total += run;
            run = 0;
          }
        }
        if (run) ((runs++), (total += run));
        if (fur > 4) ((used++), (width += fur));
      }
      const avgWidth = width / Math.max(1, used);
      return { perLine: runs / Math.max(1, used), rel: total / Math.max(1, runs) / Math.max(1, avgWidth) };
    };
    const rows = scan(h, w, (y, x) => y * w + x);
    const cols = scan(w, h, (x, y) => y * w + x);
    const ok = (s) => s.perLine >= 1.2 && s.rel < 0.16;
    return { stripes: ok(rows) || ok(cols), rows, cols };
  }

  G.PhotoRead = { analyze, oklab, nearestSwatch };
})(globalThis.CatGame = globalThis.CatGame || {});
