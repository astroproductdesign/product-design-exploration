/**
 * Match: a tray of 49 cut gems in five cuts (cube, hex column, octahedron,
 * brilliant, pyramid), a match-three board told apart by shape, not colour.
 * The pointer picks a gem. If a swap with a neighbour makes a line, the gem
 * lifts and slides toward that neighbour, the neighbour slides back toward it,
 * and the line it would complete rises with the bright edge, staggered out
 * from the pointer. A gem with no swap only takes the bright edge. At rest the
 * hint gem leans toward its four-line. The slider is the slide, in cells.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, hull, open, poly, prism, proj, rings, ringAt, rrect, run, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 7, G = 16, B = G / 2 + 3, LIFT = 20, RISE = 12, STEP = 40, HINT = [3, 4];
const BOARD = ["CCOBPCH", "BPCHOBO", "HOBPCHP", "BOOCOHC", "PBPOHPB", "CHOBPCH", "BOCHOBP"];

const ringOf = (pts) => pts.map(([u, v]) => { const l = Math.hypot(u, v) || 1; return { u, v, nu: u / l, nv: v / l }; });
const hexR = (R) => ringOf(fillet([0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos(k * Math.PI / 3), R * Math.sin(k * Math.PI / 3)]), Array(6).fill(1.1), 3));
const sq = (h, r) => rrect(-h, -h, h, h, r);
const pin = circ(0.5, 8), girdle = ringOf(fillet([[6.4, 0], [0, 6.4], [-6.4, 0], [0, -6.4]], [1, 1, 1, 1], 3));
// Each cut: its rings from the foot up, as [ring, height], and its one crease, [ring, height]; the pyramid's is a ridge.
const CUT = {
  C: { name: "cube", layers: [[sq(5, 1.6), 0], [sq(5, 1.6), 8]], crease: [sq(4, 0.8), 8] },
  H: { name: "hex", layers: [[hexR(6), 0], [hexR(6), 10.5]], crease: [hexR(5), 10.5] },
  O: { name: "octa", layers: [[pin, 0], [girdle, 6.5], [pin, 13]], crease: [girdle, 6.5] },
  B: { name: "brilliant", layers: [[circ(1.2, 12), 0], [circ(6.4, 32), 3.6], [circ(3.8, 24), 6.8]], crease: [circ(6.4, 32), 3.6] },
  P: { name: "pyramid", layers: [[sq(5.6, 1.2), 0], [pin, 10.5]], crease: null },
};

const kindAt = (g, i, j) => (i < 0 || j < 0 || i >= N || j >= N ? null : g(i, j));
/** The cells of the longer of the two runs through (i, j). */
function runAt(g, i, j) {
  const k = g(i, j); let best = [];
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const cells = [[i, j]];
    for (const s of [1, -1]) for (let a = 1; kindAt(g, i + dx * a * s, j + dy * a * s) === k; a++) cells.push([i + dx * a * s, j + dy * a * s]);
    if (cells.length > best.length) best = cells;
  }
  return best;
}
/** The best swap for the gem at (i, j): the neighbour it goes to and the line it makes, or null. */
function swapFor(i, j) {
  const base = (x, y) => BOARD[y][x];
  let best = null;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const bi = i + dx, bj = j + dy;
    if (bi < 0 || bj < 0 || bi >= N || bj >= N) continue;
    const g = (x, y) => (x === i && y === j ? base(bi, bj) : x === bi && y === bj ? base(i, j) : base(x, y));
    for (const [pi, pj] of [[bi, bj], [i, j]]) {
      const cells = runAt(g, pi, pj);
      if (cells.length >= 3 && (!best || cells.length > best.cells.length)) best = { to: [bi, bj], cells };
    }
  }
  return best;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let slide = value;

  const C = Cam(45, 0.5, 1.64), E = (N - 1) * G;
  fit(C, [[-B, -B, -7], [E + B, E + B, -7], [E + B, -B, -7], [-B, E + B, -7], [-B, -B, 13 + LIFT], [E + B, -B, 13 + LIFT], [-B, E + B, 13 + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  for (const c of Object.values(CUT)) if (c.crease) c.fr = run(c.crease[0], front);

  const g = mk("g", {}, svg);
  const [tr, ti] = rings(-B, -B, E + B, E + B, 6, 2);
  put(solid(g), prism(P, front, tr, ti, -7, 0));
  // the sockets, one dim rounded square per cell: they show when a gem leaves its place
  let sockets = "";
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) sockets += poly(ringAt(P, rrect(i * G - 7, j * G - 7, i * G + 7, j * G + 7, 2.5), 0));
  mk("path", { d: sockets, class: "nf lo" }, g);

  const gems = [], byCell = new Map();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const gem = { i, j, cut: CUT[BOARD[j][i]], el: solid(g), ox: tween(0), oy: tween(0), oz: tween(0), drawn: "" };
    gems.push(gem); byCell.set(i + "," + j, gem);
  }
  const cellGem = (i, j) => byCell.get(i + "," + j);

  function shape(c, x, y, z) {
    const at = (ring, h) => ring.map((q) => P(q.u + x, q.v + y, z + h));
    return {
      sil: poly(hull(c.layers.flatMap(([r, h]) => at(r, h)))),
      crease: c.crease ? open(at(c.fr, c.crease[1])) : seg(P(x, y, z + 10.5), P(x + 5.2, y + 5.2, z)),
    };
  }

  const Bk = register(stage, (_dt, now) => {
    let moving = false;
    for (const m of gems) {
      const x = m.i * G + tval(m.ox, now), y = m.j * G + tval(m.oy, now), z = tval(m.oz, now), key = x + " " + y + " " + z;
      if (key !== m.drawn) { m.drawn = key; put(m.el, shape(m.cut, x, y, z)); }
      if (!tdone(m.ox, now) || !tdone(m.oy, now) || !tdone(m.oz, now)) moving = true;
    }
    return moving;
  });
  bag.add(Bk.unregister);

  /** The cell under the pointer, on the plane through the gems' rest middles, which never moves; null off the board. */
  function hit(p) {
    const [x, y] = unproj(C, p[0], p[1], 4), i = Math.round(x / G), j = Math.round(y / G);
    return i < 0 || j < 0 || i >= N || j >= N ? null : [i, j];
  }

  let act = "", from = HINT;
  /** Sets the pose for the cell picked (null is rest). The stagger spreads from the cell picked, or the one let go. */
  function apply(cell, delayed) {
    const now = performance.now(), o = cell || from, rest = !cell, [ci, cj] = cell || HINT;
    from = cell || from;
    const sw = swapFor(ci, cj), a = cellGem(ci, cj), pose = new Map(), bright = new Set();
    if (rest) { pose.set(a, [(sw.to[0] - ci) * G * 0.15, (sw.to[1] - cj) * G * 0.15, 0]); bright.add(a); }
    else if (sw) {
      const b = cellGem(sw.to[0], sw.to[1]), dx = (b.i - a.i) * G * slide, dy = (b.j - a.j) * G * slide;
      // the line's cells, with the two swapped gems standing in each other's place
      const line = sw.cells.map(([x, y]) => (x === b.i && y === b.j ? a : x === a.i && y === a.j ? b : cellGem(x, y)));
      for (const m of line) { pose.set(m, [0, 0, RISE]); bright.add(m); }
      pose.set(a, [dx, dy, LIFT]); pose.set(b, [-dx, -dy, 0]); bright.add(a);
    } else bright.add(a);
    for (const m of gems) {
      const [x, y, z] = pose.get(m) || [0, 0, 0], delay = delayed ? (Math.abs(m.i - o[0]) + Math.abs(m.j - o[1])) * STEP : 0;
      tset(m.ox, x, now, delay); tset(m.oy, y, now, delay); tset(m.oz, z, now, delay);
      m.el.sil.classList.toggle("hi", bright.has(m));
      m.depth = m.i + m.j + (x + y) / G + (z > RISE ? 0.6 : 0);
    }
    // a gem lifted over its neighbour is painted after it
    gems.slice().sort((p, q) => p.depth - q.depth).forEach((m) => g.appendChild(m.el.g));
    read.textContent = rest ? "rest" : `${a.cut.name} · ${sw ? "line " + sw.cells.length : "no line"}`;
    Bk.wake();
  }
  const pick = (cell) => { const k = cell ? cell.join(",") : ""; if (k !== act) { act = k; apply(cell, true); } };

  apply(null, false);
  bag.add(pointer(stage, { move: (p) => pick(hit(p)), leave: () => pick(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { slide = clamp(v, 0, 0.6); apply(act ? act.split(",").map(Number) : null, false); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "match",
  means: "A tray of cut gems: the gem under the pointer slides toward its swap, and the line it would make rises.",
  rules: [1, 2, 4, 10],
  range: [0.2, 0.4, 0.6],
  tour: [[181, 188], [237, 142], [200, 216], null],
  mount,
});
