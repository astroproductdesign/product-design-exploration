/**
 * Liberties: a thick 9 × 9 goban on four gardenia feet, a game in the middle.
 * The pointer picks a stone; its whole group lifts off the board, staggered
 * outwards from the stone picked, and the group's liberties, the empty points
 * beside it, appear as dots on the board. At rest a white pair in atari sits
 * half lifted, and its one liberty is the bright mark. Black stones take the
 * silhouette stroke, white the dim one and the grain of clamshell. The
 * slider is the lift, in world units.
 */
const {
  Cam, circ, facing, fit, hull, poly, prism, proj, rings, ringAt, seg, unproj,
  tween, tset, tval, tdone, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const N = 9, G = 16, M = 11, T = 18, F = 13, R = 7.2, SH = 5.6, STEP = 45, REST = 0.4, LMAX = 28;
const E = (N - 1) * G, X0 = -M, X1 = E + M;
const BLACK = [[2, 5], [3, 5], [4, 5], [4, 4], [4, 3], [5, 4], [5, 2], [6, 2], [7, 3], [7, 7]];
const WHITE = [[5, 3], [6, 3], [3, 2], [3, 3], [2, 3], [5, 6], [6, 6], [6, 5]];
const HOSHI = [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
// Turned profiles, as [radius share, height share] from the foot up.
const LENS = [[0.72, 0], [1, 0.42], [0.62, 1]], GARDENIA = [[0.7, 0], [1, 0.55], [0.78, 1]];

const disc = (cx, cy, r) => circ(r, 24).map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));
/** A turned solid: the hull of its rings is the silhouette; its top ring comes back for the crease. */
function turned(P, cx, cy, r, h, prof, z0) {
  const rs = prof.map(([s, z]) => ringAt(P, disc(cx, cy, r * s), z0 + z * h));
  return { sil: poly(hull(rs.flat())), top: rs[rs.length - 1] };
}

/** Stones joined into groups by flood fill, each group with its liberties. */
function position() {
  const at = new Map(), key = (i, j) => i + "," + j, nb = (i, j) => [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]];
  const stones = [];
  BLACK.forEach(([i, j]) => stones.push({ i, j, black: true }));
  WHITE.forEach(([i, j]) => stones.push({ i, j, black: false }));
  stones.forEach((s) => at.set(key(s.i, s.j), s));
  const groups = [];
  for (const s of stones) {
    if (s.g !== undefined) continue;
    const grp = { stones: [], libs: new Map(), black: s.black }, todo = [s];
    s.g = groups.length;
    while (todo.length) {
      const t = todo.pop();
      grp.stones.push(t);
      for (const [a, b] of nb(t.i, t.j)) {
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const o = at.get(key(a, b));
        if (!o) grp.libs.set(key(a, b), [a, b]);
        else if (o.black === t.black && o.g === undefined) { o.g = s.g; todo.push(o); }
      }
    }
    groups.push(grp);
  }
  return { stones, groups };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;

  const C = Cam(45, 0.5, 1.36);
  const { stones, groups } = position();
  fit(C, [[X0, X0, -T - F], [X1, X1, -T - F], [X1, X0, -T - F], [X0, X1, -T - F],
    ...stones.map((s) => [s.i * G, s.j * G, LMAX + SH])], 200, 166);
  const P = proj(C), front = facing(C);
  const ATARI = groups.findIndex((g) => g.libs.size === 1);
  const mark = [...groups[ATARI].libs.values()][0];

  const g = mk("g", {}, svg);
  // Feet first, then the slab over them, then its grid and star points, then the stones back to front.
  for (const [fx, fy] of [[X0 + 15, X0 + 15], [X1 - 15, X0 + 15], [X0 + 15, X1 - 15], [X1 - 15, X1 - 15]]) {
    const el = solid(g);
    el.sil.setAttribute("d", turned(P, fx, fy, 11, F, GARDENIA, -T - F).sil);
  }
  const [br, bi] = rings(X0, X0, X1, X1, 5, 1.8);
  put(solid(g), prism(P, front, br, bi, -T, 0));
  let lines = "";
  for (let k = 0; k < N; k++) lines += seg(P(k * G, 0, 0), P(k * G, E, 0)) + seg(P(0, k * G, 0), P(E, k * G, 0));
  mk("path", { d: lines, class: "nf lo" }, g);
  for (const [i, j] of HOSHI) place(flatDot(g, C, 1, "dot off"), P(i * G, j * G, 0));
  const libs = mk("g", {}, g);

  stones.sort((a, b) => a.i + a.j - (b.i + b.j));
  for (const s of stones) {
    s.x = s.i * G; s.y = s.j * G;
    s.el = solid(g);
    if (!s.black) { s.el.sil.setAttribute("class", "lo"); s.grain = mk("path", { class: "nf lo" }, s.el.g); }
    s.tw = tween(s.g === ATARI ? lift * REST : 0);
    s.drawn = NaN;
  }

  function drawStone(s, z) {
    const t = turned(P, s.x, s.y, R, SH, LENS, z);
    s.el.sil.setAttribute("d", t.sil);
    s.el.cr.setAttribute("d", poly(t.top));
    if (s.grain) s.grain.setAttribute("d", [-2, 0, 2].map((o) => seg(P(s.x - 3.4 + Math.abs(o) * 0.5, s.y + o, z + SH), P(s.x + 3.4 - Math.abs(o) * 0.5, s.y + o, z + SH))).join(""));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const s of stones) {
      const z = tval(s.tw, now);
      if (z !== s.drawn) { s.drawn = z; drawStone(s, z); }
      if (!tdone(s.tw, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  /** The stone nearest the pointer on the plane through the stones' rest middles, which never moves. */
  function hit(p) {
    const [x, y] = unproj(C, p[0], p[1], SH / 2);
    let best = null, bd = G * 0.6;
    for (const s of stones) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  function dots(pts, cls) {
    libs.replaceChildren();
    for (const [i, j] of pts) place(flatDot(libs, C, 1.5, cls), P(i * G, j * G, 0));
  }

  let act = -1, origin = null;
  /** Lifts the group of stone s (null sets the rest pose). The stagger spreads from the stone picked, or the one let go. */
  function apply(s, delayed) {
    const a = s ? s.g : -1, o = s || origin, now = performance.now();
    act = a; origin = s;
    for (const st of stones) {
      const to = st.g === a ? lift : a < 0 && st.g === ATARI ? lift * REST : 0;
      const delay = delayed && o ? (Math.abs(st.i - o.i) + Math.abs(st.j - o.j)) * STEP : 0;
      tset(st.tw, to, now, delay);
      // White stones carry the dim stroke; it gives way to the bright one, since .lo is declared after .hi.
      st.el.sil.setAttribute("class", st.g === a ? "hi" : st.black ? "sil" : "lo");
    }
    if (a < 0) { dots([mark], "dot"); read.textContent = "rest"; }
    else {
      const grp = groups[a];
      dots([...grp.libs.values()], "dot m");
      read.textContent = `${grp.black ? "black" : "white"} ×${grp.stones.length} · ${grp.libs.size} lib`;
    }
    B.wake();
  }
  const pick = (s) => { if ((s ? s.g : -1) !== act) apply(s, true); };

  apply(null, false);
  bag.add(pointer(stage, { move: (p) => pick(hit(p)), leave: () => pick(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lift = v; apply(origin, false); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "liberties",
  means: "A game of Go: the group under the pointer lifts off the board, and its liberties appear as dots.",
  rules: [1, 2, 4, 5],
  range: [10, 18, 28],
  tour: [[200, 136], [246, 144], [200, 183], null],
  mount,
});
