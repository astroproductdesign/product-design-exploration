// The living room on screen: draws the room, moves the cat between spots,
// idle animations (breathing, tail, ears, blinking), hearts, Zzz, speech
// bubbles, toys during play, and the camera for narrow (phone) screens.
(function (G) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const A = G.RoomArt;
  const ROOM_ZOOM_OUT = 1.22; // >1 leaves breathing room above and below the room

  const SLEEP_EYES = new Set(['nap']);
  const DROWSY = new Set(['loaf', 'sunbathe', 'laptop', 'hide', 'knead']);
  const WIDE = new Set(['hunt', 'zoomies', 'play', 'toy', 'curtain', 'pounce']);
  const HAPPY = new Set(['eat', 'roll', 'scratch', 'come', 'beg']);

  // With "reduce motion" on, the camera cuts instead of zooming and the eyes stay put.
  const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, html) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    return e;
  }

  function Scene(svg, getState, hooks) {
    this.svg = svg;
    this.getState = getState;
    this.hooks = hooks || {};
    this.cv = null; // cat view
    this.cam = { x: 0, y: 0, w: A.W, h: A.H };
    this.focus = null; // camera framing a point (intro, change look)
    this.userPan = null; // x the player dragged the camera to (null: follow the cat)
    this.dragging = false;
    this.intro = null; // the cat-in-the-box opening
    this.inGarden = false; // the cat is drawn in the garden layer (intro, and while it fades)
    this.overrides = {}; // temporary eyes/mouth/pose from reactions
    this.roomSig = '';
    this.seasons = [];
    this.play = null;
    this.uidN = 0;
    this.nextBlink = 0;
    this.nextZ = 0;
    this.nextChirp = 0;
    this.nextHuntHop = 0;
    this.build();
  }

  Scene.prototype.build = function () {
    const svg = this.svg;
    svg.setAttribute('viewBox', `0 0 ${A.W} ${A.H}`);
    svg.innerHTML = '';
    this.back = el('g', { id: 'back' });
    this.mid = el('g', { id: 'mid' });
    this.fx = el('g', { id: 'fx' });
    this.garden = el('g', { id: 'garden' }); // the intro's garden, drawn over the room
    this.over = el('g', { id: 'over' }, A.overlay());
    this.top = el('g', { id: 'top' });
    // Warm halo for whatever the pointer is over (the .hot class, see styles.css).
    const defs = el('defs', {}, `<filter id="hot-glow" x="-30%" y="-30%" width="160%" height="160%"><feMorphology in="SourceAlpha" operator="dilate" radius="3" result="fat"/><feGaussianBlur in="fat" stdDeviation="4.5" result="soft"/><feFlood flood-color="#ffd23f" flood-opacity=".95"/><feComposite in2="soft" operator="in" result="halo"/><feMerge><feMergeNode in="halo"/><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    this.edit = el('g', { id: 'edit' }); // spots shown while arranging the room
    svg.append(defs, this.back, this.mid, this.garden, this.fx, this.over, this.edit, this.top);

    this.catG = el('g', { id: 'cat' });
    this.catShadow = el('ellipse', { cx: 0, cy: 2, rx: 46, ry: 8, fill: '#000', opacity: 0.12 });
    this.catFlip = el('g', {});
    this.catHop = el('g', {});
    this.catBody = el('g', { class: 'cat' });
    this.catHop.append(this.catBody);
    this.catFlip.append(this.catHop);
    this.catG.append(this.catShadow, this.catFlip);
    this.bubble = el('g', { id: 'bubble', display: 'none', 'pointer-events': 'none' });
    this.toyG = el('g', { id: 'toy', display: 'none', 'pointer-events': 'none' });
    this.top.append(this.bubble, this.toyG);
  };

  // ---- Room ------------------------------------------------------------------------

  Scene.prototype.seasonList = function (t) {
    const s = this.getState();
    if (s.settings.seasonPreview) return s.settings.seasonPreview === 'none' ? [] : [s.settings.seasonPreview];
    return G.Clock.seasonsAt(t);
  };

  Scene.prototype.renderRoom = function (force, t) {
    const s = this.getState();
    const seasons = this.seasonList(t);
    const noteFresh = G.Notes.fresh(s, t);
    const noteText = G.Notes.today(s, t).text; // the sticky note shows its first words
    const canSpin = (s.coins || 0) >= G.Gacha.COST;
    const sig = JSON.stringify([s.room, s.bowl, seasons, (s.unseenUnlocks || []).length > 0, (s.achUnseen || 0) > 0, noteFresh, noteText, canSpin, s.flags.learned || null]);
    if (!force && sig === this.roomSig) return;
    // The background holds the framed photo of the cat and the wall, rug, curtains, clock and
    // lamp, so a new look or a new colour from the gachapon redraws it too.
    const coatSig = JSON.stringify([s.cat.coat || null, s.room.skins || null]);
    const seasonChanged = seasons.join() !== this.seasons.join() || !this.back.childNodes.length || coatSig !== this.coatSig;
    this.roomSig = sig;
    this.seasons = seasons;
    this.coatSig = coatSig;
    if (seasonChanged) {
      this.back.innerHTML = A.background(s) + A.decorBack(seasons);
      this.wxKey = null; // the window was redrawn empty
      this.lastLightMin = -1;
    }
    this.mid.innerHTML = '';
    const items = A.midLayer(s, seasons, { noteFresh, noteText, canSpin }).sort((a, b) => a.z - b.z);
    // The intro's box, left on the rug for a moment after the cat hops out.
    const tb = this.tempBox;
    if (tb) {
      const [back, front] = G.CatArt.introBox('tempbox');
      const wrap = (inner) => `<g class="${tb.fading ? 'temp-box fading' : 'temp-box'}" transform="translate(${tb.x} ${tb.y}) scale(${tb.s.toFixed(3)})">${inner}</g>`;
      items.push({ z: tb.y - 1, svg: wrap(back) }, { z: tb.y + 1, svg: wrap(front) });
      items.sort((a, b) => a.z - b.z);
    }
    for (const it of items) this.mid.append(el('g', { 'data-z': it.z }, it.svg));
    this.paintTv();
    this.placeCatInZ();
    this.updateLighting(t, true);
    this.syncPlayful(); // the items were just redrawn
  };

  // How each kind of weather changes the light: how much it greys the sky, how much darker the
  // room is by day, whether the sun / moon / stars are hidden, and how much sunbeam gets in.
  const WX_LIGHT = {
    clear: { grey: 0, dim: 0, covered: false, beam: 1 },
    partly: { grey: 0.15, dim: 0.02, covered: false, beam: 0.5, stars: 0.55 },
    overcast: { grey: 0.75, dim: 0.05, covered: true, beam: 0 },
    rain: { grey: 0.85, dim: 0.09, covered: true, beam: 0 },
    storm: { grey: 0.92, dim: 0.16, covered: true, beam: 0 },
    fog: { grey: 0.85, dim: 0.06, covered: true, beam: 0 },
    snow: { grey: 0.8, dim: 0.04, covered: true, beam: 0 },
  };
  const WX_SKY_DAY = { partly: '#b4c8d6', overcast: '#b7bdc6', rain: '#98a4b1', storm: '#566078', fog: '#d0d6d9', snow: '#d2d9e2' };
  const WX_SKY_NIGHT = '#232843';

  function weatherLight(light, kind) {
    const w = WX_LIGHT[kind];
    if (!w) return light;
    const mix = A.mixHex;
    const night = Math.max(0, Math.min(1, light.lamp)); // 0 in daylight, 1 in the dark
    const day = 1 - night;
    const grey = (c) => mix(mix(c, WX_SKY_DAY[kind] || '#b7bdc6', w.grey * day), WX_SKY_NIGHT, w.grey * 0.7 * night);
    return Object.assign({}, light, {
      skyTop: grey(light.skyTop),
      skyBot: grey(light.skyBot),
      tint: w.dim ? mix(light.tint, '#7d8aa8', 0.35 * day * Math.min(1, w.dim * 8)) : light.tint,
      alpha: light.alpha + w.dim * day,
      lamp: Math.min(1, light.lamp + w.dim * 2.5 * day),
      beam: light.beam * w.beam,
      skyCovered: w.covered,
      starVis: w.stars,
    });
  }

  // Redraw what is going on outside the window when the weather (or day / night) changes.
  Scene.prototype.setWeather = function (kind, night) {
    const key = (kind || 'none') + (night ? ':n' : ':d');
    if (key === this.wxKey) return;
    this.wxKey = key;
    const art = kind ? A.weatherArt(kind, night) : { back: '', front: '' };
    const back = this.svg.querySelector('#wx-back');
    const front = this.svg.querySelector('#wx-front');
    if (back) back.innerHTML = art.back;
    if (front) front.innerHTML = art.front;
    const tree = this.svg.querySelector('#wx-tree');
    if (tree) tree.setAttribute('class', 'wx-tree wxfx' + (kind === 'storm' ? ' storm' : ''));
  };

  Scene.prototype.updateLighting = function (t, force) {
    const m = Math.floor(t / 60000);
    if (!force && m === this.lastLightMin) return;
    this.lastLightMin = m;
    const st = this.getState();
    // The sun follows the real sunrise and sunset where the player is, when known; the weather
    // outside greys the sky and dims the room.
    let light = G.Clock.lightingAt(t, G.Weather.sunFor(st));
    const wx = G.Weather.current(st);
    light = weatherLight(light, wx);
    this.setWeather(wx, light.lamp > 0.55);
    // Lights off (tap the lamp): the room goes dark whatever the time of day.
    const off = st.settings.lights === 'off' && !this.intro && !this.inGarden;
    // How dark depends on the time: a morning room just dims, a night room goes properly dark.
    // (The sun still shines through the window by day, so the sunbeam stays.)
    if (off) {
      const night = Math.max(0, Math.min(1, light.lamp));
      light = Object.assign({}, light, { tint: A.mixHex('#2c3768', '#0c1236', night), alpha: Math.max(light.alpha, 0.2 + 0.46 * night), lightsOff: true });
    }
    light.tvOff = st.settings.tv === 'off';
    A.applyLighting(this.svg, light);
    A.updateClock(this.svg, t);
    G.GardenArt.applyLighting(this.svg, light, A.mixHex);
    this.svg.closest('.stage').style.setProperty('--letterbox', light.isDay && !off ? '#efe0bd' : '#6c6a7c');
  };

  Scene.prototype.placeCatInZ = function () {
    if (this.inGarden) return this.garden.insertBefore(this.catG, this.garden.querySelector('.garden-front'));
    const z = this.cv ? this.cv.z : 0;
    let before = null;
    for (const c of this.mid.children) {
      if (c === this.catG) continue;
      if (Number(c.getAttribute('data-z')) > z) {
        before = c;
        break;
      }
    }
    this.mid.insertBefore(this.catG, before);
  };

  // ---- Cat look --------------------------------------------------------------------

  Scene.prototype.setArt = function (pose, opts) {
    const key = pose + JSON.stringify(opts || {});
    if (this.cv.artKey === key) return;
    this.cv.artKey = key;
    this.cv.pose = pose;
    this.catBody.innerHTML = G.CatArt.render(pose, 'c' + this.uidN++, opts);
    this.catBody.setAttribute('class', 'cat pose-' + pose);
    this.applyFace(true);
  };

  Scene.prototype.baseEyes = function () {
    if (this.inGarden) return 'open'; // awake in the box, whatever the simulation says
    const a = this.getState().activity;
    if (a.id === 'litter') return 'half'; // concentrating
    if (this.cv.moving) return this.cv.zoom ? 'wide' : 'open';
    if (SLEEP_EYES.has(a.id)) return 'closed';
    if (a.id === 'groom') return 'closed';
    if (DROWSY.has(a.id)) return a.id === 'knead' ? 'happy' : 'half';
    if (WIDE.has(a.id)) return 'wide';
    if (HAPPY.has(a.id)) return 'happy';
    return 'open';
  };

  // The toys the cat bats about with its paws, and which of them roll rather than slide.
  const BAT_TOYS = new Set(['mouse', 'ball', 'yarn', 'fishToy']);
  const ROLL_TOYS = new Set(['ball', 'yarn']);
  // How far each toy sits from where it was put when the cat is knocking it about, so it lands just
  // beyond the front paws instead of behind the cat's chin (scene units).
  const BAT_OFFSET = { mouse: 57, ball: 54, yarn: 52, fishToy: 63 };
  const CHEW_MS = 900; // one round of bites; the head bob in the stylesheet runs on the same beat

  // Switch on the extra movement for what the cat is doing where it stands: chewing at the bowl,
  // or knocking a toy back and forth between its front paws. (The CSS does the moving; this only
  // sets the classes, and has to run again whenever the cat's art or the room is redrawn.)
  // The toy the cat is playing with, if it is one it bats about.
  Scene.prototype.batToy = function (a) {
    const m = /^slot(\d)$/.exec(a.spot || '');
    const toy = m ? this.getState().room.slots[Number(m[1])] : null;
    return toy && BAT_TOYS.has(toy) ? toy : null;
  };

  Scene.prototype.syncPlayful = function () {
    const cv = this.cv;
    if (!cv) return;
    const st = this.getState();
    const a = st.activity;
    const still = !cv.moving && !this.play && !this.inGarden;
    const eating = still && (a.id === 'eat' || a.id === 'grass');
    const toy = still && a.id === 'toy' ? this.batToy(a) : null;
    const batting = !!toy;
    if (eating && !this.catBody.classList.contains('eating')) this.eatT0 = performance.now();
    this.catBody.classList.toggle('eating', eating);
    this.catBody.classList.toggle('batting', batting);
    for (const n of this.svg.querySelectorAll('.item.dribble')) {
      n.classList.remove('dribble', 'round');
      n.style.removeProperty('--off');
    }
    if (batting)
      for (const n of this.svg.querySelectorAll(`.item[data-spot="${a.spot}"]`)) {
        n.classList.add('dribble', ...(ROLL_TOYS.has(toy) ? ['round'] : []));
        n.style.setProperty('--off', BAT_OFFSET[toy] + 'px');
      }
    this.applyFace(true);
  };

  Scene.prototype.baseMouth = function () {
    if (this.inGarden) return 'normal';
    const a = this.getState().activity;
    if (this.catBody.classList.contains('lapping')) return Math.floor(performance.now() / 300) % 2 ? 'tongue' : 'normal';
    if (this.catBody.classList.contains('eating')) {
      // open as the head goes down, shut on the bite, then a second smaller nibble
      const ph = ((performance.now() - (this.eatT0 || 0)) % CHEW_MS) / CHEW_MS;
      return ph < 0.37 || (ph >= 0.55 && ph < 0.78) ? 'open' : 'normal';
    }
    if (a.rare || a.id === 'groom') return 'tongue';
    return 'normal';
  };

  Scene.prototype.applyFace = function (force) {
    const now = performance.now();
    const o = this.overrides;
    let eyes = o.eyes && o.eyesUntil > now ? o.eyes : this.baseEyes();
    if (this.blinkUntil > now && (eyes === 'open' || eyes === 'wide' || eyes === 'half')) eyes = 'closed';
    const mouth = o.mouth && o.mouthUntil > now ? o.mouth : this.baseMouth();
    if (!force && eyes === this.cv.eyes && mouth === this.cv.mouth) return;
    this.cv.eyes = eyes;
    this.cv.mouth = mouth;
    for (const g of this.catBody.querySelectorAll('.eyes')) g.setAttribute('display', g.classList.contains('eyes-' + eyes) ? 'inline' : 'none');
    for (const g of this.catBody.querySelectorAll('.mouth')) g.setAttribute('display', g.classList.contains('mouth-' + mouth) ? 'inline' : 'none');
    this.catBody.classList.toggle('angry', eyes === 'angry');
  };

  Scene.prototype.flash = function (cls, ms) {
    const b = this.catBody;
    b.classList.remove(cls);
    void b.getBoundingClientRect();
    b.classList.add(cls);
    clearTimeout(this['_t' + cls]);
    this['_t' + cls] = setTimeout(() => b.classList.remove(cls), ms || 800);
  };

  Scene.prototype.ears = function () {
    for (const e of this.catBody.querySelectorAll('.ear')) {
      e.classList.remove('twitch');
      void e.getBoundingClientRect();
      e.classList.add('twitch');
    }
  };

  // ---- Positioning ------------------------------------------------------------------

  Scene.prototype.posFor = function (a) {
    return A.spotPos(this.getState(), a.spot);
  };

  Scene.prototype.artFor = function (a) {
    const pose = a.pose === 'crouch' && a.id === 'eat' ? 'crouch' : a.pose;
    const opts = {};
    if (a.id === 'eat' || a.id === 'grass' || a.id === 'vomit') opts.eat = true;
    if (a.id === 'knead') opts.knead = true;
    if (a.id === 'toy' && this.batToy(a)) opts.bat = true;
    if (a.id === 'drink') Object.assign(opts, { eat: true, bat: true }); // head down at the bowl; the paw is hidden until it goes in
    if (a.id === 'pounce') opts.wiggle = true;
    return [pose, opts];
  };

  Scene.prototype.teleport = function (a) {
    if (this.inGarden) return; // the cat stays in its box until the intro ends
    const p = this.posFor(a);
    this.cv = { x: p.x, y: p.y, z: p.z, fy: p.floor.y, high: p.high, facing: p.face || a.facing, path: [], moving: false, act: a.id + a.start };
    this.setArt(...this.artFor(a));
    this.placeCatInZ();
    this.cam.x = Math.max(0, Math.min(A.W - this.cam.w, p.x - this.cam.w / 2));
    this.syncPlayful();
    this.startScript();
  };

  Scene.prototype.planTo = function (p, speed) {
    const cv = this.cv;
    const path = [];
    if (cv.high) path.push({ x: cv.x, y: cv.fy, hop: true, fy: cv.fy, z: cv.fy });
    if (p.high) {
      path.push({ x: p.floor.x, y: p.floor.y, fy: p.floor.y, z: p.floor.y });
      path.push({ x: p.x, y: p.y, hop: true, fy: p.floor.y, z: p.z, high: true });
    } else {
      path.push({ x: p.x, y: p.y, fy: p.y, z: p.z });
    }
    cv.path = path.filter((seg, i) => seg.hop || Math.hypot(seg.x - (i ? path[i - 1].x : cv.x), seg.y - (i ? path[i - 1].y : cv.y)) > 2);
    cv.speed = speed || 150;
    cv.seg = null;
  };

  // Called whenever the simulation picks a new activity.
  Scene.prototype.onActivity = function (a, opts) {
    if (this.inGarden) return; // picked up when the intro ends
    this.endScript();
    if (!this.cv) return this.teleport(a);
    this.cv.act = a.id + a.start;
    this.cv.zoom = a.id === 'zoomies';
    const p = this.posFor(a);
    const speed = a.id === 'zoomies' ? 420 : a.id === 'play' ? 300 : a.id === 'come' || a.id === 'beg' ? 230 : 150;
    if (opts && opts.instant) return this.teleport(a);
    this.planTo(p, speed);
    this.cv.dest = p;
    this.cv.destAct = a;
    if (!this.cv.path.length) this.arrive();
    else this.startMoving();
    if (a.id === 'knock' && a.live) this.knockLater = performance.now() + 2200 + Math.max(0, this.cv.path.length) * 900;
  };

  Scene.prototype.startMoving = function () {
    this.cv.moving = true;
    this.setArt('walk');
    this.catBody.classList.toggle('zoom', !!this.cv.zoom);
    this.syncPlayful();
  };

  Scene.prototype.arrive = function () {
    const cv = this.cv;
    cv.moving = false;
    const a = this.getState().activity;
    if (a.id === 'zoomies' && a.end > G.Clock.now(this.getState()) + 1500) {
      // keep running laps
      this.planTo({ x: 60 + Math.random() * 840, y: 452 + Math.random() * 138, z: 0, high: false, floor: {} }, 420);
      const last = cv.path[cv.path.length - 1];
      if (last) last.z = last.y;
      if (cv.path.length) return this.startMoving();
    }
    if (this.play && this.play.joined) return;
    const p = cv.dest || this.posFor(a);
    cv.x = p.x;
    cv.y = p.y;
    cv.z = p.z;
    cv.fy = p.floor.y;
    cv.high = p.high;
    cv.facing = p.face || a.facing;
    this.placeCatInZ();
    this.setArt(...this.artFor(a));
    this.catBody.classList.toggle('sleeping', G.Sim.isSleeping(this.getState()));
    this.catBody.classList.toggle('retching', a.id === 'vomit');
    this.catBody.classList.remove('zoom');
    this.syncPlayful();
    this.startScript();
  };

  // ---- TV ---------------------------------------------------------------------------
  // A random channel on every visit; tap the TV (or wait a minute or two) to flip.

  Scene.prototype.paintTv = function (number) {
    const host = this.mid.querySelector('#tv-show');
    if (!host) return;
    if (!this.tv) this.tv = { ch: Math.floor(Math.random() * A.TV.CHANNELS.length), next: performance.now() + 60000 + Math.random() * 60000 };
    const off = this.getState().settings.tv === 'off';
    host.innerHTML = off ? A.TV.off() : this.tv.static ? A.TV.static() : A.TV.show(A.TV.CHANNELS[this.tv.ch], number);
    const led = this.mid.querySelector('#tv-led');
    if (led) led.setAttribute('fill', off ? '#e0553f' : '#6fd16f');
  };

  // Flip to a different random channel. Returns the new channel's id.
  Scene.prototype.changeChannel = function () {
    const n = A.TV.CHANNELS.length;
    const tv = this.tv;
    tv.ch = (tv.ch + 1 + Math.floor(Math.random() * (n - 1))) % n;
    tv.next = performance.now() + 60000 + Math.random() * 60000;
    tv.static = true;
    this.paintTv();
    clearTimeout(tv.timer);
    tv.timer = setTimeout(() => {
      tv.static = false;
      this.paintTv(tv.ch + 1);
    }, 260);
    return A.TV.CHANNELS[tv.ch];
  };

  // ---- Set pieces ---------------------------------------------------------------------
  // A few behaviours are little scenes with a start, a middle and an end: climbing the curtain, a
  // wiggle and a pounce that misses, leaning too far out and falling off the sill, and a paw in
  // the water bowl. The simulation only says that it is happening (and logs it); once the cat has
  // got where it is going, a script plays it out. `steps` run once each at their second;
  // `tick` runs every frame.

  const SCRIPT_CLASSES = ['climbing', 'hanging', 'sliding', 'wiggling', 'lapping', 'dipping', 'flicking'];
  const ease = (f) => f * f * (3 - 2 * f);
  const pickOf = (list) => list[Math.floor(Math.random() * list.length)];
  const CLIMB_H = 150; // how high up the curtain it goes

  // What the cat has on its face for a moment.
  Scene.prototype.face = function (eyes, mouth, ms) {
    const until = performance.now() + (ms || 1200);
    if (eyes) Object.assign(this.overrides, { eyes, eyesUntil: until });
    if (mouth) Object.assign(this.overrides, { mouth, mouthUntil: until });
    this.applyFace(true);
  };

  Scene.prototype.scriptClass = function (...names) {
    const l = this.catBody.classList;
    l.remove(...SCRIPT_CLASSES);
    l.add(...names);
  };

  // A drop of water or two flung from a point: they arc and fall.
  Scene.prototype.drops = function (x, y, vx, n) {
    for (let i = 0; i < n; i++) {
      const d = el('circle', { r: (2 + Math.random() * 2.4).toFixed(1), fill: '#bfe2f5', stroke: '#1b1714', 'stroke-width': 1.4, 'pointer-events': 'none' });
      this.fx.append(d);
      let px = x;
      let py = y;
      let ux = vx * (0.5 + Math.random());
      let uy = -(150 + Math.random() * 130);
      let last = performance.now();
      const step = () => {
        const nowT = performance.now();
        const dt = Math.min(0.05, (nowT - last) / 1000);
        last = nowT;
        ux *= 0.99;
        uy += 640 * dt;
        px += ux * dt;
        py += uy * dt;
        d.setAttribute('cx', px.toFixed(1));
        d.setAttribute('cy', py.toFixed(1));
        if (uy > 0 && py > y + 26 + Math.random() * 6) return d.remove();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  Scene.prototype.ripple = function (x, y) {
    const r = el('ellipse', { cx: x, cy: y, rx: 18, ry: 5, fill: 'none', stroke: '#fff', 'stroke-width': 3, class: 'ripple', 'pointer-events': 'none' });
    this.fx.append(r);
    setTimeout(() => r.remove(), 1000);
  };

  const MOTH =
    `<g class="moth-wings" style="animation: wx-flapx 0.11s linear infinite; transform-box: fill-box; transform-origin: center">` +
    `<ellipse cx="-8" cy="-3" rx="9" ry="6.5" fill="#efe6ff" stroke="#1b1714" stroke-width="2.2" transform="rotate(-20 -8 -3)"/>` +
    `<ellipse cx="8" cy="-3" rx="9" ry="6.5" fill="#efe6ff" stroke="#1b1714" stroke-width="2.2" transform="rotate(20 8 -3)"/></g>` +
    `<ellipse cx="0" cy="2" rx="2.6" ry="6" fill="#8a6a50" stroke="#1b1714" stroke-width="2"/>`;

  const SCRIPTS = {
    // Bored: up the curtain, hang there, slide down, and pretend it never happened.
    curtain: {
      steps: [
        [0, function (sc) {
          this.cv.facing = 1;
          this.cv.groundY = sc.y0;
          this.scriptClass('climbing');
          this.svg.classList.add('curtain-shake');
          this.face('wide', null, 1800);
          if (this.hooks.sound) this.hooks.sound('scoop');
        }],
        [0.9, function () { if (this.hooks.sound) this.hooks.sound('scoop'); }],
        [1.9, function () { this.scriptClass('hanging'); this.say('…', 1900, true); }],
        [3.9, function () { this.say(pickOf(['Not my best idea.', 'Send help.', 'How do I get down?', 'I regret nothing. Mostly.']), 1800); }],
        [5.0, function () { this.scriptClass('sliding'); if (this.hooks.sound) this.hooks.sound('scoop'); }],
        [6.1, function (sc) {
          this.cv.y = sc.y0;
          this.cv.groundY = null;
          this.svg.classList.remove('curtain-shake');
          this.setArt('sit');
          this.scriptClass();
          this.miniHop(14);
          this.face('closed', null, 1500);
          if (this.hooks.sound) this.hooks.sound('pop');
          this.say('Nobody saw that.', 2600, true);
        }],
      ],
      tick(sc, t) {
        const top = sc.y0 - CLIMB_H;
        if (t < 1.9) this.cv.y = sc.y0 - ease(t / 1.9) * CLIMB_H;
        else if (t < 5.0) this.cv.y = top + (t - 1.9) * 2.5;
        else if (t < 6.1) {
          const f = (t - 5.0) / 1.1;
          this.cv.y = top + 7.75 + f * f * (CLIMB_H - 7.75);
        }
      },
      cleanup(sc) {
        this.cv.y = sc.y0;
        this.cv.groundY = null;
        this.svg.classList.remove('curtain-shake');
      },
    },

    // Spots a moth. Wiggles. Pounces. Misses by a mile.
    pounce: {
      init(sc) {
        const cv = this.cv;
        const f = cv.x < A.W / 2 ? 1 : -1; // leap towards the middle of the room, where there is space
        cv.facing = f;
        sc.f = f;
        sc.mx = cv.x + f * 88;
        sc.my = cv.y - 46;
        const g = el('g', { class: 'moth', 'pointer-events': 'none' }, MOTH);
        this.fx.append(g);
        sc.moth = g;
        sc.nodes = [g];
        g.setAttribute('transform', `translate(${sc.mx} ${sc.my})`);
      },
      steps: [
        [0, function () { this.scriptClass('wiggling'); this.face('wide', null, 2500); }],
        [2.4, function () { this.scriptClass(); if (this.hooks.sound) this.hooks.sound('pop'); }],
        [3.0, function (sc) {
          this.cv.hopY = 0;
          this.cv.x = Math.max(40, Math.min(A.W - 40, sc.x0 + sc.f * 200));
          this.setArt('belly');
          this.scriptClass();
          this.floatText('!', '#d44c34');
          this.face('wide', null, 1200);
          if (this.hooks.sound) this.hooks.sound('pop');
        }],
        [4.6, function () {
          this.setArt('sit');
          this.scriptClass();
          this.face('closed', null, 1400);
          this.say('I meant to do that.', 2800, true);
        }],
      ],
      tick(sc, t) {
        const cv = this.cv;
        if (t >= 2.4 && t < 3.0) {
          const k = (t - 2.4) / 0.6;
          cv.x = Math.max(40, Math.min(A.W - 40, sc.x0 + sc.f * 200 * ease(k)));
          cv.hopY = Math.sin(k * Math.PI) * 54;
        }
        // the moth bobs about, then flits up and away just as the cat lands
        if (t < 2.55) sc.moth.setAttribute('transform', `translate(${(sc.mx + Math.sin(t * 3) * 4).toFixed(1)} ${(sc.my + Math.sin(t * 5.5) * 5).toFixed(1)})`);
        else {
          const k = t - 2.55;
          sc.moth.setAttribute('transform', `translate(${(sc.mx - sc.f * k * 130).toFixed(1)} ${(sc.my - k * 190 + Math.sin(k * 12) * 6).toFixed(1)})`);
          if (t > 4) sc.moth.setAttribute('opacity', Math.max(0, 1 - (t - 4) * 2));
        }
      },
    },

    // Leans out to see the bird, leans a little further, and is gone. Grooms as if it meant to.
    topple: {
      init(sc) {
        const st = this.getState();
        const floor = A.spotPos(st, st.activity.spot).floor;
        sc.floor = floor;
        sc.dir = Math.random() < 0.5 ? -1 : 1;
        sc.ok = !!this.cv.high && !!floor;
      },
      steps: [
        [0, function (sc) { if (sc.ok) this.face('wide', null, 3000); }],
        [1.2, function (sc) { if (sc.ok && this.hooks.sound) this.hooks.sound('chirp'); }],
        [2.2, function (sc) { if (sc.ok) this.say('!', 800); }],
        [3.0, function (sc) {
          if (!sc.ok) return;
          this.cv.groundY = sc.floor.y;
          this.cv.z = sc.floor.y + 2;
          this.placeCatInZ();
        }],
        [3.65, function (sc) {
          if (!sc.ok) return;
          const cv = this.cv;
          cv.y = sc.floor.y;
          cv.x = sc.x0 + sc.dir * 34;
          cv.fy = sc.floor.y;
          cv.high = false;
          cv.groundY = null;
          cv.rot = 0;
          sc.fell = true;
          this.setArt('belly');
          this.scriptClass();
          this.miniHop(16);
          this.face('closed', null, 1500);
          this.floatText('💥', '#d44c34');
          if (this.hooks.sound) this.hooks.sound('pop');
        }],
        [5.3, function (sc) {
          if (!sc.ok) return;
          this.setArt('sit');
          this.face('open', null, 1200);
          this.say('I meant to do that.', 2400, true);
        }],
        [7.0, function (sc) { if (sc.ok) { this.setArt('groom'); this.face('closed', null, 3000); } }],
      ],
      tick(sc, t) {
        if (!sc.ok) return;
        const cv = this.cv;
        if (t < 3.0) {
          const k = t / 3.0;
          cv.rot = sc.dir * (k * k * 16 + Math.sin(t * 9) * 1.8 * k);
        } else if (t < 3.65) {
          const k = (t - 3.0) / 0.65;
          cv.y = sc.y0 + (sc.floor.y - sc.y0) * k * k;
          cv.x = sc.x0 + sc.dir * 34 * k;
          cv.rot = sc.dir * (16 + 100 * k);
        }
      },
      cleanup(sc) {
        if (sc.ok && !sc.fell) {
          Object.assign(this.cv, { x: sc.x0, y: sc.y0, groundY: null, rot: 0 });
          this.cv.z = sc.z0;
          this.placeCatInZ();
        }
      },
    },

    // Laps some water, tests it with a paw, flicks it, and is personally offended.
    drink: {
      steps: [
        [0, function () { this.eatT0 = performance.now(); this.scriptClass('lapping'); }],
        [3.4, function () { this.scriptClass('dipping'); this.face('wide', null, 1200); }],
        [3.95, function () {
          const p = this.pawTip();
          this.ripple(474, 537);
          this.drops(p.x, p.y, -this.cv.facing * 40, 3);
          if (this.hooks.sound) this.hooks.sound('pop');
        }],
        [5.5, function () {
          this.scriptClass('flicking');
          const p = this.pawTip();
          this.face('closed', 'frown', 900);
          setTimeout(() => this.drops(p.x, p.y - 8, -this.cv.facing * 110, 7), 120);
          if (this.hooks.sound) this.hooks.sound('pop');
        }],
        [6.6, function () {
          this.face('angry', 'frown', 2200);
          this.say('Wet.', 2400, true);
        }],
        [8.6, function () { this.scriptClass(); this.face('open', 'normal', 1000); }],
      ],
    },
  };

  // Where the front paw is, in the scene (when it is reaching out).
  Scene.prototype.pawTip = function () {
    const cv = this.cv;
    const s = A.scaleAt(cv.fy);
    return { x: cv.x + cv.facing * 84 * s, y: cv.y - 3 * s };
  };

  Scene.prototype.startScript = function () {
    this.endScript();
    const cv = this.cv;
    const a = this.getState().activity;
    const def = SCRIPTS[a.id];
    if (!def || !cv || this.play || this.inGarden || cv.moving) return;
    const sc = { id: a.id, def, t0: performance.now(), next: 0, x0: cv.x, y0: cv.y, z0: cv.z };
    this.script = sc;
    if (def.init) def.init.call(this, sc);
    this.runScript(performance.now()); // the first step now, so nothing flashes up before it
  };

  // Called when the activity changes (or the script has run its course): put everything back.
  Scene.prototype.endScript = function () {
    const sc = this.script;
    if (!sc) return;
    this.script = null;
    if (sc.def.cleanup) sc.def.cleanup.call(this, sc);
    this.catBody.classList.remove(...SCRIPT_CLASSES);
    for (const n of sc.nodes || []) n.remove();
    this.cv.hopY = 0;
    this.cv.rot = 0;
    this.cv.groundY = null;
  };

  Scene.prototype.runScript = function (nowMs) {
    const sc = this.script;
    if (!sc) return;
    const t = (nowMs - sc.t0) / 1000;
    const steps = sc.def.steps;
    while (sc.next < steps.length && t >= steps[sc.next][0]) steps[sc.next++][1].call(this, sc, t);
    if (this.script === sc && sc.def.tick) sc.def.tick.call(this, sc, t);
  };

  // ---- Per-frame update -------------------------------------------------------------

  Scene.prototype.frame = function (dt, nowMs) {
    const cv = this.cv;
    if (!cv) return;
    if (this.tv && nowMs > this.tv.next && this.getState().settings.tv !== 'off') this.changeChannel();
    if (this.intro) this.introIdle(nowMs);
    else if (this.play) this.updatePlay(dt, nowMs);
    else if (cv.moving) this.stepPath(dt);
    else this.idle(nowMs);

    const s = A.scaleAt(cv.fy);
    this.catG.setAttribute('transform', `translate(${cv.x.toFixed(1)} ${cv.y.toFixed(1)}) scale(${s.toFixed(3)})`);
    this.catFlip.setAttribute('transform', `scale(${cv.facing < 0 ? -1 : 1} 1)`);
    this.catHop.setAttribute('transform', `translate(0 ${(-(cv.hopY || 0)).toFixed(1)})${cv.rot ? ` rotate(${cv.rot.toFixed(1)})` : ''}`);
    // while it is up the curtain (or falling) the shadow stays down on the floor
    this.catShadow.setAttribute('cy', (2 + (cv.groundY != null ? (cv.groundY - cv.y) / s : 0)).toFixed(1));
    this.catShadow.setAttribute('opacity', this.inGarden ? 0 : cv.hopY || cv.groundY != null ? 0.06 : 0.12);
    this.catShadow.setAttribute('rx', cv.pose === 'sit' || cv.pose === 'back' || cv.pose === 'groom' || cv.pose === 'swipe' ? 34 : 50);

    // blinking
    if (nowMs > this.nextBlink) {
      this.blinkUntil = nowMs + 140;
      this.nextBlink = nowMs + 2500 + Math.random() * 4000;
      if (Math.random() < 0.25) this.ears();
    }
    this.applyFace();
    this.updateBubble();
    this.updateCamera(dt);
  };

  Scene.prototype.stepPath = function (dt) {
    const cv = this.cv;
    if (!cv.seg) {
      const next = cv.path.shift();
      if (!next) return this.arrive();
      cv.seg = Object.assign({ fx: cv.x, fy0: cv.y, t: 0 }, next);
      const dx = next.x - cv.x;
      cv.seg.len = Math.hypot(dx, next.y - cv.y);
      if (Math.abs(dx) > 2) cv.facing = dx > 0 ? 1 : -1;
      cv.seg.dur = next.hop ? 0.5 : Math.max(0.15, cv.seg.len / cv.speed);
      if (next.hop) {
        this.setArt('crouch');
        this.applyFace(true);
      } else if (cv.pose !== 'walk') this.startMoving();
      cv.z = Math.max(cv.z, next.z || 0);
      if (!next.hop) cv.z = Math.min(cv.y, next.y);
      this.placeCatInZ();
    }
    const g = cv.seg;
    g.t += dt;
    const f = Math.min(1, g.t / g.dur);
    cv.x = g.fx + (g.x - g.fx) * f;
    cv.y = g.fy0 + (g.y - g.fy0) * f;
    if (g.hop) {
      cv.hopY = Math.sin(f * Math.PI) * 40;
    } else {
      cv.fy = cv.y;
      cv.hopY = 0;
      const nz = cv.y;
      if (Math.abs(nz - cv.z) > 6) {
        cv.z = nz;
        this.placeCatInZ();
      }
    }
    if (f >= 1) {
      cv.hopY = 0;
      cv.fy = g.fy;
      cv.high = !!g.high;
      cv.z = g.z;
      this.placeCatInZ();
      cv.seg = null;
      if (!cv.path.length) this.arrive();
    }
  };

  Scene.prototype.idle = function (nowMs) {
    const st = this.getState();
    const a = st.activity;
    if (G.Sim.isSleeping(st) && nowMs > this.nextZ) {
      this.nextZ = nowMs + 2200;
      this.floatText('z', '#7d6bb0');
    }
    if (a.id === 'hunt' && nowMs > this.nextHuntHop) {
      this.nextHuntHop = nowMs + 2500 + Math.random() * 3000;
      this.miniHop(26);
    }
    const bird = this.svg.querySelector('#bird');
    if (bird) {
      const show = (a.id === 'birds' || a.id === 'topple') && G.Clock.lightingAt(G.Clock.now(st), G.Weather.sunFor(st)).isDay;
      bird.setAttribute('display', show ? 'inline' : 'none');
      if (show && nowMs > this.nextChirp) {
        this.nextChirp = nowMs + 4000 + Math.random() * 6000;
        if (this.hooks.sound) this.hooks.sound('chirp');
      }
    }
    if (this.knockLater && nowMs > this.knockLater) {
      this.knockLater = 0;
      this.dropCup();
    }
    this.runScript(nowMs);
  };

  Scene.prototype.miniHop = function (h) {
    const cv = this.cv;
    const t0 = performance.now();
    const step = () => {
      const f = (performance.now() - t0) / 350;
      cv.hopY = f >= 1 ? 0 : Math.sin(f * Math.PI) * h;
      if (f < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // The cup sails off the table.
  Scene.prototype.dropCup = function () {
    const g = el('g', {}, `<g transform="rotate(0)">${'<path d="M -11 0 L -12 -24 L 12 -24 L 11 0 Z" fill="#fffaf2" stroke="#1b1714" stroke-width="2.6"/><rect x="-11.5" y="-17" width="23" height="6" fill="#d9644f"/>'}</g>`);
    this.fx.append(g);
    const t0 = performance.now();
    const step = () => {
      const f = Math.min(1, (performance.now() - t0) / 650);
      const x = 924 + (770 - 924) * f;
      const y = 343 + (590 - 343) * f * f;
      g.setAttribute('transform', `translate(${x} ${y}) rotate(${f * 100})`);
      if (f < 1) requestAnimationFrame(step);
      else {
        g.remove();
        if (this.hooks.sound) this.hooks.sound('pop');
        this.renderRoom(true, G.Clock.now(this.getState()));
      }
    };
    requestAnimationFrame(step);
  };

  // ---- Bubbles, hearts, floating text ------------------------------------------------

  Scene.prototype.headPoint = function () {
    const cv = this.cv;
    const s = A.scaleAt(cv.fy);
    const h = G.CatArt.HEAD_AT[cv.pose] || [0, -90];
    return { x: cv.x + h[0] * s * cv.facing, y: cv.y + h[1] * s - (cv.hopY || 0), s };
  };

  // A speech bubble, or (thought) a round thought bubble with a trail of dots, for what the cat is thinking of.
  Scene.prototype.say = function (text, ms, thought) {
    if (!text) return;
    const len = Math.max(2, [...text].length);
    const w = thought ? 52 : Math.min(220, 22 + len * 10.5);
    const font = `font-family="'M PLUS Rounded 1c', Nunito, system-ui, sans-serif"`;
    this.bubble.innerHTML = thought
      ? `<circle cx="3" cy="-3" r="3.4" fill="#fcfcfc" stroke="#1b1714" stroke-width="2.4"/><circle cx="8" cy="-13" r="5" fill="#fcfcfc" stroke="#1b1714" stroke-width="2.6"/>` +
        `<rect x="${-w / 2 + 6}" y="-52" width="${w}" height="36" rx="18" fill="#fcfcfc" stroke="#1b1714" stroke-width="3"/>` +
        `<text x="6" y="-27" text-anchor="middle" font-size="21" font-weight="800" fill="#1b1714" ${font}>${text.replace(/[<&]/g, '')}</text>`
      : `<rect x="${-w / 2}" y="-40" width="${w}" height="34" rx="14" fill="#fcfcfc" stroke="#1b1714" stroke-width="3"/>` +
        `<path d="M -6 -7 L 0 4 L 7 -7 Z" fill="#fcfcfc" stroke="#1b1714" stroke-width="3" stroke-linejoin="round"/>` +
        `<rect x="-8" y="-10" width="16" height="5" fill="#fcfcfc"/>` +
        `<text x="0" y="-17" text-anchor="middle" font-size="17" font-weight="800" fill="#1b1714" ${font}>${text.replace(/[<&]/g, '')}</text>`;
    this.bubble.setAttribute('display', 'inline');
    this.bubbleUntil = performance.now() + (ms || 2200);
    if (!thought) {
      this.overrides.mouth = 'open';
      this.overrides.mouthUntil = performance.now() + 600;
    }
    this.updateBubble();
  };

  Scene.prototype.updateBubble = function () {
    if (this.bubble.getAttribute('display') === 'none') return;
    if (performance.now() > this.bubbleUntil) {
      this.bubble.setAttribute('display', 'none');
      return;
    }
    const hp = this.headPoint();
    const top = (G.CatArt.TOP[this.cv.pose] || -120) - (G.CatArt.HEAD_AT[this.cv.pose] || [0, -90])[1];
    this.bubble.setAttribute('transform', `translate(${hp.x.toFixed(1)} ${(hp.y + top * hp.s - 6).toFixed(1)})`);
  };

  Scene.prototype.hearts = function (n) {
    const hp = this.headPoint();
    for (let i = 0; i < (n || 1); i++) {
      const g = el(
        'g',
        { class: 'float', transform: `translate(${(hp.x + (Math.random() - 0.5) * 50).toFixed(1)} ${(hp.y - 30 * hp.s).toFixed(1)})`, 'pointer-events': 'none' },
        `<g style="animation-delay:${i * 0.18}s" class="float-inner"><path d="M 0 6 C -14 -4 -10 -16 0 -9 C 10 -16 14 -4 0 6 Z" fill="#f28ba0" stroke="#1b1714" stroke-width="2.4" stroke-linejoin="round"/></g>`
      );
      this.top.append(g);
      setTimeout(() => g.remove(), 1800 + i * 200);
    }
  };

  Scene.prototype.floatText = function (text, color) {
    const hp = this.headPoint();
    const g = el(
      'g',
      { class: 'float', transform: `translate(${(hp.x + 20 * this.cv.facing * hp.s).toFixed(1)} ${(hp.y - 26 * hp.s).toFixed(1)})`, 'pointer-events': 'none' },
      `<g class="float-inner"><text font-size="20" font-weight="800" fill="${color}" stroke="#fff" stroke-width="4" paint-order="stroke" font-family="'M PLUS Rounded 1c', Nunito, system-ui, sans-serif">${text}</text></g>`
    );
    this.top.append(g);
    setTimeout(() => g.remove(), 1800);
  };

  // Act out a reaction from the game logic.
  Scene.prototype.react = function (r) {
    if (!r) return;
    const now = performance.now();
    if (r.eyes) {
      this.overrides.eyes = r.eyes;
      this.overrides.eyesUntil = now + (r.anim === 'slowBlink' ? 1600 : r.eyes === 'angry' ? 3200 : 1800);
    }
    if (r.mouth) {
      this.overrides.mouth = r.mouth;
      this.overrides.mouthUntil = now + (r.eyes === 'angry' ? 3200 : 1800);
    }
    if (r.say) this.say(r.say);
    else if (r.thought) this.say(r.thought, 2800, true);
    if (r.hearts) this.hearts(r.hearts);
    switch (r.anim) {
      case 'earTwitch':
        this.ears();
        break;
      case 'tailFlick':
        this.flash('flick', 700);
        break;
      case 'swat':
      case 'kick':
        this.flash('swatting', 600);
        this.miniHop(14);
        if (!r.eyes) {
          this.overrides.eyes = 'wide';
          this.overrides.eyesUntil = now + 900;
        }
        break;
      case 'recoil':
        this.flash('recoil', 500);
        break;
      case 'tilt':
        this.flash('tilt', 1400);
        break;
      case 'slowBlink':
        this.overrides.eyes = 'closed';
        this.overrides.eyesUntil = now + 900;
        setTimeout(() => {
          this.overrides.eyes = 'happy';
          this.overrides.eyesUntil = performance.now() + 900;
        }, 900);
        break;
      case 'headbutt':
      case 'chinUp':
      case 'buttUp':
        this.flash('nuzzle', 700);
        break;
      default:
    }
    this.applyFace(true);
  };


  // ---- Arranging the room ---------------------------------------------------------------
  // The camera pulls back to show the whole room, and each place an item can go
  // gets a dashed ring with a number (and a + when it's empty).

  Scene.prototype.setDecorate = function (on) {
    this.decorating = on;
    if (on) {
      this.userPan = null;
      this.focus = { cx: A.W / 2, cy: A.H / 2 + 10, spanW: A.W, spanH: A.H - 40, safe: { l: 0, r: 0, t: 0.02, b: 0.02 } };
    } else {
      this.focus = null;
      this.zoomingOut = true;
      this.edit.innerHTML = '';
    }
  };

  // A glowing outline around a piece of furniture (shown in the arranging view, which has the whole
  // room on screen), so you can see what just changed.
  Scene.prototype.flashPiece = function (piece) {
    const b = A.PIECE_BOX[piece];
    if (!b) return;
    for (const n of this.edit.querySelectorAll('.piece-flash')) n.remove();
    const g = el('g', { class: 'piece-flash', 'pointer-events': 'none' });
    g.innerHTML = `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${piece === 'wall' ? 18 : 14}"/>`;
    this.edit.append(g);
    setTimeout(() => g.remove(), 2200);
  };

  Scene.prototype.clearSpots = function () {
    this.edit.innerHTML = '';
  };

  Scene.prototype.drawSpots = function (sel) {
    if (!this.decorating) return;
    const slots = this.getState().room.slots;
    // On a small screen the whole room is tiny, so the markers grow to stay easy to hit.
    const r = this.svg.getBoundingClientRect();
    const k = r.width ? Math.min(r.width / A.W, r.height / (A.H - 40)) : 1;
    const u = Math.max(1, Math.min(1.9, 0.62 / k)).toFixed(2);
    this.edit.innerHTML = A.SLOTS.map(({ x, y }, i) => {
      const has = !!slots[i];
      return (
        `<g class="spot ${has ? 'has' : ''} ${i === sel ? 'sel' : ''}" data-spot="${i}">` +
        `<ellipse class="spot-ring" cx="${x}" cy="${y - 4}" rx="70" ry="20"/>` +
        (has ? '' : `<g class="spot-plus" transform="translate(${x} ${y - 42}) scale(${u})"><circle r="21"/><path d="M -8 0 H 8 M 0 -8 V 8"/></g>`) +
        `<g class="spot-num" transform="translate(${x + 60} ${y - 22}) scale(${u})"><circle r="13"/><text y="5" text-anchor="middle">${i + 1}</text></g>` +
        `<rect class="spot-hit" data-spot="${i}" x="${x - 76}" y="${y - 164}" width="152" height="190"/>` +
        `</g>`
      );
    }).join('');
  };

  // Highlight the spot a dragged item would land on (null for none).
  Scene.prototype.dropOn = function (i) {
    this.edit.querySelectorAll('.spot').forEach((g) => g.classList.toggle('drop', Number(g.getAttribute('data-spot')) === i));
  };

  // ---- Petting zones ------------------------------------------------------------------

  Scene.prototype.toScene = function (clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = this.svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  };

  // What the player touched on the cat: the part under the pointer that
  // declares a pet zone (tail, paws, ears), or null for the plain body.
  Scene.prototype.zoneAtClient = function (x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (!this.catG.contains(el)) continue;
      const z = el.closest('[data-zone]');
      return z ? z.getAttribute('data-zone') : null;
    }
    return null;
  };

  Scene.prototype.zoneAt = function (p) {
    const cv = this.cv;
    const hp = this.headPoint();
    const s = hp.s;
    const dx = (p.x - hp.x) / (46 * s);
    const dy = (p.y - hp.y) / (38 * s);
    if (dx * dx + dy * dy <= 1.25) return p.y - hp.y > 8 * s ? 'chin' : 'head';
    const pose = cv.pose;
    if (pose === 'belly') return 'belly';
    if (pose === 'lie' || pose === 'curl') return p.y > cv.y - 16 * s ? 'belly' : 'back';
    if (pose === 'sit' || pose === 'groom' || pose === 'swipe') return Math.abs(p.x - cv.x) < 15 * s && p.y > cv.y - 52 * s ? 'belly' : 'back';
    return 'back';
  };

  // ---- Play mode ------------------------------------------------------------------------
  // Toys you move about (feather, mouse on a string, laser), a bubble wand the cat jumps at, and a
  // ball launcher the cat may or may not go and fetch from. While playing, `this.play` holds it all.

  const CATCH = { feather: 0.65, mouse: 0.75, laser: 0 }; // how often a pounce gets it
  const FLOOR_MIN = 448; // the floor, front and back
  const FLOOR_MAX = 596;
  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  Scene.prototype.startPlay = function (toy, joined) {
    this.userPan = null;
    const x0 = A.SPOTS.rug.x + 10;
    const pl = (this.play = { toy, joined, x: x0, y: 470, px: x0, py: 470, speed: 0, lastMove: performance.now(), cool: 0, pounce: null });
    if (toy === 'mouse') Object.assign(pl, { y: 520, mx: x0, my: 520, mdir: 1, mspeed: 0, held: 0 });
    if (toy === 'bubbles') pl.bub = { list: [], lastBlow: 0, leap: null, cool: 0 };
    if (toy === 'launcher') {
      const lx = clampN(this.cam.x + this.cam.w * 0.5, 540, A.W - 160); // clear of the bowls, in the middle of what you see
      pl.ln = { x: lx, y: 588, ball: null, aiming: false, cat: null, kick: 0 };
      pl.x = lx + 170; // where the aim starts
      pl.y = 530;
    }
    this.toyG.setAttribute('display', 'inline');
    this.drawToy();
    if (joined) {
      this.cv.path = [];
      this.cv.seg = null;
      if (this.cv.high) {
        const p = this.posFor({ spot: 'rug' });
        this.planTo(p, 300);
      }
    }
  };

  Scene.prototype.joinPlay = function () {
    if (!this.play) return;
    this.play.joined = true;
    this.cv.path = [];
    this.cv.seg = null;
    this.cv.moving = false;
  };

  Scene.prototype.endPlay = function () {
    this.play = null;
    this.toyG.setAttribute('display', 'none');
    this.toyG.innerHTML = '';
    this.catBody.classList.remove('wiggling');
  };

  Scene.prototype.moveToy = function (p) {
    const pl = this.play;
    if (!pl) return;
    const now = performance.now();
    const dt = Math.max(16, now - pl.lastMove) / 1000;
    const d = Math.hypot(p.x - pl.x, p.y - pl.y);
    pl.speed = pl.speed * 0.6 + (d / dt) * 0.4;
    pl.x = clampN(p.x, 10, A.W - 10);
    pl.y = clampN(p.y, 10, A.H - 6);
    if (pl.toy === 'mouse') pl.y = clampN(pl.y, FLOOR_MIN + 4, FLOOR_MAX); // it stays on the floor
    if (pl.toy === 'launcher') {
      pl.y = clampN(pl.y, FLOOR_MIN, FLOOR_MAX); // you aim at a spot on the floor
      pl.ln.aiming = true;
    }
    pl.lastMove = now;
    this.drawToy();
  };

  // Let go of the pointer: the launcher fires at where it was aimed.
  Scene.prototype.releaseToy = function () {
    const pl = this.play;
    if (pl && pl.toy === 'launcher' && pl.ln.aiming) this.fireBall();
  };

  // ---- drawing the toys

  const BALL_PINK = '#f4accc';
  function ballSvg(b, carriedAt) {
    const x = carriedAt ? carriedAt.x : b.x;
    const y = carriedAt ? carriedAt.y : b.y;
    const z = carriedAt ? 0 : b.z;
    const r = 12 * (A.scaleAt(carriedAt ? y + 30 : y) / 0.8);
    const sh = carriedAt ? '' : `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r * (1 - Math.min(0.5, z / 260))).toFixed(1)}" ry="${(r * 0.32).toFixed(1)}" fill="#000" opacity="${Math.max(0.05, 0.16 - z / 900).toFixed(2)}"/>`;
    const cy = carriedAt ? y : y - z - r;
    return (
      sh +
      `<g transform="translate(${x.toFixed(1)} ${cy.toFixed(1)}) rotate(${(b.rot || 0).toFixed(0)})">` +
      `<circle r="${r.toFixed(1)}" fill="${BALL_PINK}" stroke="#1b1714" stroke-width="2.6"/>` +
      `<circle r="${(r * 0.38).toFixed(1)}" fill="#ecbc44" stroke="#1b1714" stroke-width="1.8"/>` +
      `<path d="M ${-r} 0 Q 0 ${(r * 0.5).toFixed(1)} ${r} 0 M 0 ${-r} Q ${(-r * 0.5).toFixed(1)} 0 0 ${r}" fill="none" stroke="#c9677f" stroke-width="2"/></g>`
    );
  }

  // Where the launched ball would be, t seconds in (ground position and height).
  function flight(ln, ball0, target, t) {
    const g = 900;
    const T = flightTime(ln, target);
    const vz = (0.5 * g * T * T - ball0.z) / T;
    return { x: ball0.x + ((target.x - ball0.x) / T) * t, y: ball0.y + ((target.y - ball0.y) / T) * t, z: Math.max(0, ball0.z + vz * t - 0.5 * g * t * t), T, vz };
  }
  function flightTime(ln, target) {
    return clampN(0.45 + Math.hypot(target.x - muzzle(ln, target).x, target.y - muzzle(ln, target).y) / 800, 0.55, 1.3);
  }
  // The end of the barrel: it points at whichever side the target is on.
  function muzzle(ln, target) {
    const dir = target.x >= ln.x ? 1 : -1;
    return { x: ln.x + dir * 42 * A.scaleAt(ln.y), y: ln.y, z: 52, dir };
  }

  function launcherSvg(pl, now) {
    const ln = pl.ln;
    const tgt = { x: clampN(pl.x, 30, A.W - 30), y: clampN(pl.y, FLOOR_MIN, FLOOR_MAX) };
    const m = muzzle(ln, tgt);
    const s = A.scaleAt(ln.y);
    const ink = '#1b1714';
    let out = '';
    // aim: a dotted arc to a ring where the ball will come down
    if (ln.aiming && !(ln.ball && ln.ball.carried)) {
      const b0 = { x: m.x, y: m.y, z: m.z };
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const f = flight(ln, b0, tgt, (flightTime(ln, tgt) * i) / 12);
        pts.push(`${f.x.toFixed(1)} ${(f.y - f.z).toFixed(1)}`);
      }
      const d = 'M ' + pts.join(' L ');
      out += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 15"/><path d="${d}" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="1 15"/>`;
      out += `<ellipse cx="${tgt.x}" cy="${tgt.y}" rx="${(26 * s).toFixed(1)}" ry="${(8 * s).toFixed(1)}" fill="rgba(255,210,63,.35)" stroke="#ff8a00" stroke-width="3.4" stroke-dasharray="7 5"/>`;
    }
    // the launcher: a stubby pink cannon on two wheels
    const kick = ln.kick > 0 ? ln.kick * 14 : 0;
    const ang = -(18 + Math.min(32, Math.hypot(tgt.x - ln.x, tgt.y - ln.y) / 18));
    out +=
      `<g transform="translate(${ln.x} ${ln.y}) scale(${(m.dir * s).toFixed(3)} ${s.toFixed(3)})">` +
      `<ellipse cx="0" cy="2" rx="40" ry="8" fill="#000" opacity=".14"/>` +
      `<g transform="translate(${-kick.toFixed(1)} 0) rotate(${ang.toFixed(1)} 4 -40)"><rect x="4" y="-52" width="46" height="24" rx="8" fill="#ffd7e0" stroke="${ink}" stroke-width="3.2"/><rect x="40" y="-56" width="14" height="32" rx="5" fill="#ff6f91" stroke="${ink}" stroke-width="3.2"/></g>` +
      `<rect x="-30" y="-44" width="44" height="26" rx="9" fill="#ff6f91" stroke="${ink}" stroke-width="3.4"/>` +
      `<circle cx="-14" cy="-10" r="12" fill="#5a3040" stroke="${ink}" stroke-width="3"/><circle cx="-14" cy="-10" r="4" fill="#ffd7e0"/>` +
      `<circle cx="10" cy="-6" r="8" fill="#5a3040" stroke="${ink}" stroke-width="3"/>` +
      `<circle cx="-18" cy="-34" r="3.2" fill="#ecbc44" stroke="${ink}" stroke-width="1.8"/></g>`;
    return out;
  }

  function mouseSvg(pl) {
    const s = A.scaleAt(pl.my) * 1.15;
    const held = pl.held > performance.now();
    const hx = Math.min(A.W - 20, pl.x + 150);
    const hy = Math.max(40, pl.y - 230);
    const ink = '#1b1714';
    return (
      `<path d="M ${hx + 60} ${hy - 50} L ${hx} ${hy}" stroke="${ink}" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M ${hx + 60} ${hy - 50} L ${hx} ${hy}" stroke="#e2b078" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M ${hx} ${hy} Q ${(hx + pl.mx) / 2 + 10} ${(hy + pl.my) / 2 + 40} ${pl.mx} ${pl.my - 14 * s}" fill="none" stroke="${ink}" stroke-width="2"/>` +
      `<ellipse cx="${pl.mx.toFixed(1)}" cy="${pl.my.toFixed(1)}" rx="${(20 * s).toFixed(1)}" ry="${(5 * s).toFixed(1)}" fill="#000" opacity=".13"/>` +
      `<g transform="translate(${pl.mx.toFixed(1)} ${pl.my.toFixed(1)}) scale(${(pl.mdir * s).toFixed(3)} ${(held ? s * 0.7 : s).toFixed(3)})">` +
      `<path d="M -16 -8 Q -30 -4 -36 ${held ? -2 : -16}" fill="none" stroke="#e98aa0" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M -18 -2 Q -16 -22 2 -20 Q 18 -18 17 -4 Q 0 2 -18 -2 Z" fill="#b8b4ad" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<circle cx="6" cy="-21" r="6.5" fill="#f4accc" stroke="${ink}" stroke-width="2.2"/>` +
      `<circle cx="10" cy="-11" r="2" fill="${ink}"/><circle cx="19" cy="-7" r="2.2" fill="#f4accc" stroke="${ink}" stroke-width="1.2"/></g>`
    );
  }

  function bubblesSvg(pl) {
    const ink = '#1b1714';
    let out = '';
    for (const b of pl.bub.list) {
      const fade = b.life - b.t < 0.7 ? Math.max(0.3, (b.life - b.t) / 0.7) : 1;
      out +=
        `<g opacity="${fade.toFixed(2)}"><circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${b.r.toFixed(1)}" fill="#e8f6fc" fill-opacity=".45" stroke="${ink}" stroke-width="2.4"/>` +
        `<path d="M ${(b.x - b.r * 0.55).toFixed(1)} ${(b.y - b.r * 0.1).toFixed(1)} A ${(b.r * 0.6).toFixed(1)} ${(b.r * 0.6).toFixed(1)} 0 0 1 ${(b.x - b.r * 0.05).toFixed(1)} ${(b.y - b.r * 0.58).toFixed(1)}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>`;
    }
    // the wand: a ring on a stick
    out +=
      `<path d="M ${pl.x + 12} ${pl.y + 12} L ${pl.x + 70} ${pl.y + 80}" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M ${pl.x + 12} ${pl.y + 12} L ${pl.x + 70} ${pl.y + 80}" stroke="#8fd3c6" stroke-width="5.4" stroke-linecap="round"/>` +
      `<circle cx="${pl.x}" cy="${pl.y}" r="17" fill="#e8f6fc" fill-opacity=".35" stroke="${ink}" stroke-width="5"/><circle cx="${pl.x}" cy="${pl.y}" r="17" fill="none" stroke="#8fd3c6" stroke-width="2.4"/>`;
    return out;
  }

  Scene.prototype.drawToy = function () {
    const pl = this.play;
    if (!pl) return;
    const now = performance.now();
    if (pl.toy === 'laser') {
      this.toyG.innerHTML = `<circle cx="${pl.x}" cy="${pl.y}" r="16" fill="#ff3b3b" opacity=".25"/><circle cx="${pl.x}" cy="${pl.y}" r="6" fill="#ff2a2a"/><circle cx="${pl.x}" cy="${pl.y}" r="2.5" fill="#fff"/>`;
      return;
    }
    if (pl.toy === 'mouse') {
      this.toyG.innerHTML = mouseSvg(pl);
      return;
    }
    if (pl.toy === 'bubbles') {
      this.toyG.innerHTML = bubblesSvg(pl);
      return;
    }
    if (pl.toy === 'launcher') {
      const ln = pl.ln;
      let ball = '';
      if (ln.ball) {
        if (ln.ball.carried) {
          const hp = this.headPoint();
          ball = ballSvg(ln.ball, { x: hp.x + this.cv.facing * 30 * hp.s, y: hp.y + 14 * hp.s });
        } else ball = ballSvg(ln.ball);
      }
      this.toyG.innerHTML = launcherSvg(pl, now) + ball;
      return;
    }
    const hx = Math.min(A.W - 20, pl.x + 150);
    const hy = Math.max(40, pl.y - 230);
    this.toyG.innerHTML =
      `<path d="M ${hx + 60} ${hy - 50} L ${hx} ${hy}" stroke="#1b1714" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M ${hx + 60} ${hy - 50} L ${hx} ${hy}" stroke="#e2b078" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M ${hx} ${hy} Q ${(hx + pl.x) / 2 + 20} ${(hy + pl.y) / 2 + 40} ${pl.x} ${pl.y - 10}" fill="none" stroke="#1b1714" stroke-width="2"/>` +
      `<g transform="translate(${pl.x} ${pl.y})"><g class="feather">` +
      `<path d="M 0 -10 Q -22 6 -8 30 Q 4 14 0 -10 Z" fill="#7fb4d9" stroke="#1b1714" stroke-width="2.5"/>` +
      `<path d="M 2 -10 Q 22 6 10 30 Q -2 14 2 -10 Z" fill="#f28ba0" stroke="#1b1714" stroke-width="2.5"/>` +
      `<circle cy="-11" r="4" fill="#f3c66b" stroke="#1b1714" stroke-width="2"/></g></g>`;
  };

  // A little ring of pop lines where a bubble was.
  Scene.prototype.burst = function (x, y, r) {
    const g = el('g', { class: 'bubble-burst', 'pointer-events': 'none', transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    let s = '';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      s += `<path d="M ${(Math.cos(a) * r * 0.7).toFixed(1)} ${(Math.sin(a) * r * 0.7).toFixed(1)} L ${(Math.cos(a) * r * 1.35).toFixed(1)} ${(Math.sin(a) * r * 1.35).toFixed(1)}" stroke="#7fb4d9" stroke-width="3" stroke-linecap="round"/>`;
    }
    g.innerHTML = `<g class="burst-in">${s}</g>`;
    this.fx.append(g);
    setTimeout(() => g.remove(), 450);
  };

  // ---- the ball launcher

  Scene.prototype.fireBall = function () {
    const pl = this.play;
    const ln = pl.ln;
    ln.aiming = false;
    const busy = ln.cat && ['carry', 'return', 'keep', 'keeping'].includes(ln.cat.phase);
    if (busy) return; // the cat has the last one
    const tgt = { x: clampN(pl.x, 30, A.W - 30), y: clampN(pl.y, FLOOR_MIN, FLOOR_MAX) };
    const m = muzzle(ln, tgt);
    if (Math.hypot(tgt.x - ln.x, tgt.y - ln.y) < 60) return; // a tiny tap isn't a shot
    const T = flightTime(ln, tgt);
    const g = 900;
    ln.ball = { x: m.x, y: m.y, z: m.z, gx: (tgt.x - m.x) / T, gy: (tgt.y - m.y) / T, vz: (0.5 * g * T * T - m.z) / T, rot: 0, rest: false, carried: false, bounces: 0 };
    ln.kick = 0.25;
    if (this.hooks.sound) this.hooks.sound('pop');
    // the cat decides, by how it feels, and gets going a moment after the bang
    const out = this.hooks.launch ? this.hooks.launch() : { kind: 'watch', say: '…' };
    ln.cat = Object.assign({ phase: 'react', at: performance.now() + 380 }, out);
  };

  Scene.prototype.tickBall = function (dt, now) {
    const pl = this.play;
    const ln = pl.ln;
    ln.kick = Math.max(0, ln.kick - dt);
    if (ln.reloadAt && now > ln.reloadAt) {
      ln.reloadAt = 0;
      ln.ball = null;
    }
    const b = ln.ball;
    if (!b || b.carried || b.rest) return;
    b.vz -= 900 * dt;
    b.z += b.vz * dt;
    b.x += b.gx * dt;
    b.y += b.gy * dt;
    b.rot += b.gx * dt * 0.9;
    if (b.z <= 0) {
      b.z = 0;
      if (Math.abs(b.vz) > 90) {
        b.vz = -b.vz * 0.45;
        b.gx *= 0.72;
        b.gy *= 0.72;
        b.bounces++;
        if (b.bounces <= 2 && this.hooks.sound) this.hooks.sound('pop');
      } else b.vz = 0;
    }
    if (b.z === 0 && b.vz === 0) {
      const f = Math.exp(-dt * 1.7);
      b.gx *= f;
      b.gy *= f;
      if (Math.hypot(b.gx, b.gy) < 9) {
        b.gx = b.gy = 0;
        b.rest = true;
      }
    }
    // walls bounce it back; the back and front of the floor too
    if (b.x < 26) { b.x = 26; b.gx = Math.abs(b.gx) * 0.6; }
    if (b.x > A.W - 26) { b.x = A.W - 26; b.gx = -Math.abs(b.gx) * 0.6; }
    if (b.y < FLOOR_MIN - 4) { b.y = FLOOR_MIN - 4; b.gy = Math.abs(b.gy) * 0.6; }
    if (b.y > FLOOR_MAX) { b.y = FLOOR_MAX; b.gy = -Math.abs(b.gy) * 0.6; }
    pl.x = b.x; // the camera follows the ball
    pl.y = b.y;
  };

  // What the cat does about the ball (see Interactions.launchDecision for why).
  Scene.prototype.launcherCat = function (dt, now) {
    const pl = this.play;
    const ln = pl.ln;
    const cv = this.cv;
    const c = ln.cat;
    const b = ln.ball;
    if (!c || !b || now < c.at) {
      if (!c && cv.pose !== 'crouch' && !cv.moving) {
        this.setArt('crouch');
        this.catBody.classList.remove('zoom');
      }
      return;
    }
    const goto = (tx, ty, speed, run) => {
      const dx = tx - cv.x;
      const dy = ty - cv.y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > 6) cv.facing = dx > 0 ? 1 : -1;
      if (cv.pose !== 'walk') this.setArt('walk');
      this.catBody.classList.toggle('zoom', !!run);
      if (dist > 1) {
        const k = Math.min(speed * dt, dist) / dist;
        cv.x += dx * k;
        cv.y += dy * k;
      }
      cv.fy = cv.y;
      this.syncZ();
      return dist;
    };
    const sit = (eyes) => {
      this.setArt('sit');
      this.catBody.classList.remove('zoom');
      if (eyes) this.face(eyes, null, 1600);
    };
    switch (c.phase) {
      case 'react':
        if (c.kind === 'fetch') {
          this.say(c.say, 900);
          this.face('wide', null, 1500);
          c.phase = 'run';
        } else if (c.kind === 'chase') {
          this.say('!', 800);
          this.face('wide', null, 1200);
          c.until = now + rand(900, 1500);
          c.phase = 'run';
        } else if (c.kind === 'watch') {
          this.flash('tilt', 1400);
          this.face('wide', null, 1600);
          this.say(c.say, 1600, true);
          c.phase = 'done';
        } else {
          // ignores it: turns away, yawns, looks at something more interesting
          cv.facing = b.x > cv.x ? -1 : 1;
          sit('half');
          this.say(c.say, 1800, c.say === '*yawn*' ? false : true);
          c.phase = 'done';
        }
        break;
      case 'run': {
        const near = goto(b.x, b.y, 340, true) < 34;
        if (c.kind === 'chase') {
          if (now > c.until || near) {
            sit('half');
            this.say('Meh.', 1700, true);
            if (this.hooks.pounce) this.hooks.pounce(false);
            c.phase = 'done';
          }
        } else if (near && b.z < 42) {
          // got it
          b.carried = true;
          this.setArt('walk');
          this.catBody.classList.remove('zoom');
          this.miniHop(16);
          if (this.hooks.sound) this.hooks.sound('bell');
          this.say(c.keep ? 'Mine.' : 'GOT IT!', 1100);
          c.phase = c.keep ? 'keep' : 'carry';
        }
        break;
      }
      case 'carry': {
        // trots back to you with it
        const dropX = ln.x + 96 > A.W - 40 ? ln.x - 96 : ln.x + 96;
        if (goto(dropX, 588, 230, false) < 6) {
          b.carried = false;
          b.x = cv.x + cv.facing * 36;
          b.y = cv.y;
          b.z = 0;
          b.rest = true;
          this.setArt('crouch');
          this.hearts(2);
          this.say('Mrrp!', 1400);
          if (this.hooks.sound) this.hooks.sound('chime');
          if (this.hooks.pounce) this.hooks.pounce(true);
          if (this.hooks.fetched) this.hooks.fetched(false);
          ln.reloadAt = now + 1700; // back in the launcher
          c.phase = 'done';
        }
        break;
      }
      case 'keep': {
        // and then does not give it back
        const kx = cv.x < A.W / 2 ? 110 : A.W - 110;
        if (goto(kx, 530, 220, false) < 6) {
          this.setArt('crouch');
          this.say('Mine now.', 2400);
          this.face('closed', null, 1600);
          if (this.hooks.pounce) this.hooks.pounce(true);
          if (this.hooks.fetched) this.hooks.fetched(true);
          c.until = now + 2400;
          c.phase = 'keeping';
        }
        break;
      }
      case 'keeping':
        if (now > c.until) {
          b.carried = false;
          ln.ball = null; // it has been hidden somewhere; a new one is in the launcher
          c.phase = 'done';
        }
        break;
      default:
    }
  };

  // ---- the bubble wand

  Scene.prototype.popBubble = function (b, byCat) {
    const B = this.play.bub;
    const i = B.list.indexOf(b);
    if (i >= 0) B.list.splice(i, 1);
    this.burst(b.x, b.y, b.r);
    if (byCat) {
      if (this.hooks.sound) this.hooks.sound('pop');
      this.face(null, 'open', 350);
      if (Math.random() < 0.5) this.hearts(1);
      if (this.hooks.bubble) this.hooks.bubble();
      if (this.hooks.pounce) this.hooks.pounce(true);
    }
  };

  Scene.prototype.tickBubbles = function (dt, now) {
    const pl = this.play;
    const B = pl.bub;
    // wave the wand and bubbles come off it
    if (pl.speed > 150 && now - B.lastBlow > 340 && B.list.length < 9) {
      B.lastBlow = now;
      for (let i = 0; i < 1; i++) {
        B.list.push({ x: pl.x + rand(-8, 8), y: pl.y + rand(-8, 8), r: rand(8, 18), vx: rand(-26, 26), vy: -rand(10, 34), t: 0, life: rand(7, 11), ph: rand(0, 6) });
      }
    }
    for (const b of B.list.slice()) {
      b.t += dt;
      b.x += (b.vx + Math.sin(b.t * 2 + b.ph) * 18) * dt;
      b.y += b.vy * dt;
      b.vy = Math.min(32, b.vy + 15 * dt); // rises a little off the wand, then drifts slowly down, like real ones
      if (b.x < 20 || b.x > A.W - 20) b.vx = -b.vx;
      if (b.t > b.life || b.y < 60 || b.y > FLOOR_MAX) this.popBubble(b, false);
    }
  };

  Scene.prototype.bubbleCat = function (dt, now) {
    const pl = this.play;
    const B = pl.bub;
    const cv = this.cv;
    const s = A.scaleAt(cv.fy);
    if (B.leap) {
      const L = B.leap;
      L.t += dt;
      const f = Math.min(1, L.t / 0.55);
      cv.hopY = Math.sin(f * Math.PI) * L.peak;
      if (!L.done && f >= 0.5) {
        L.done = true;
        const b = L.b;
        const headY = cv.y - cv.hopY - 62 * s;
        if (B.list.includes(b) && Math.abs(b.x - cv.x) < 54 && Math.abs(b.y - headY) < 66) this.popBubble(b, true);
        else if (this.hooks.pounce) this.hooks.pounce(false);
      }
      if (f >= 1) {
        cv.hopY = 0;
        B.leap = null;
        B.cool = now + 250;
        this.setArt('crouch');
      }
      this.syncZ();
      return;
    }
    // the nearest bubble it can reach
    let best = null;
    let bd = 1e9;
    for (const b of B.list) {
      const h = cv.y - b.y;
      if (h < 10 || h > 165) continue;
      const d = Math.abs(b.x - cv.x);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (!best) {
      if (cv.pose !== 'sit') {
        this.setArt('sit');
        this.catBody.classList.remove('zoom');
      }
      return;
    }
    const dx = best.x - cv.x;
    if (Math.abs(dx) > 20) {
      cv.facing = dx > 0 ? 1 : -1;
      cv.x += Math.sign(dx) * Math.min(270 * dt, Math.abs(dx));
      cv.fy = cv.y;
      if (cv.pose !== 'walk') {
        this.setArt('walk');
        this.catBody.classList.add('zoom');
      }
      this.syncZ();
      return;
    }
    if (cv.pose !== 'crouch') {
      this.setArt('crouch');
      this.catBody.classList.remove('zoom');
    }
    if (now > B.cool) {
      const h = cv.y - best.y;
      B.leap = { t: 0, b: best, peak: clampN(h - 52 * s, 24, 96), done: false };
    }
  };

  // ---- the mouse on a string

  Scene.prototype.tickMouse = function (dt, now) {
    const pl = this.play;
    const k = pl.held > now ? 0 : 1 - Math.exp(-dt * 7); // it trails behind the string, and stays put when caught
    const nx = pl.mx + (pl.x - pl.mx) * k;
    const ny = pl.my + (pl.y - pl.my) * k;
    if (Math.abs(nx - pl.mx) > 0.3) pl.mdir = nx > pl.mx ? 1 : -1;
    pl.mspeed = Math.hypot(nx - pl.mx, ny - pl.my) / Math.max(dt, 0.001);
    pl.mx = nx;
    pl.my = ny;
  };

  Scene.prototype.updatePlay = function (dt, now) {
    const pl = this.play;
    const cv = this.cv;
    pl.speed *= Math.pow(0.1, dt);
    if (pl.toy === 'launcher') this.tickBall(dt, now);
    else if (pl.toy === 'bubbles') this.tickBubbles(dt, now);
    else if (pl.toy === 'mouse') this.tickMouse(dt, now);
    if (pl.toy === 'launcher' || pl.toy === 'bubbles' || pl.toy === 'mouse') this.drawToy();
    if (!pl.joined) {
      if (cv.moving) this.stepPath(dt);
      if (pl.speed > 200 && pl.toy !== 'launcher' && this.hooks.tempt) this.hooks.tempt();
      return;
    }
    if (cv.high && !cv.moving) {
      this.planTo(this.posFor({ spot: 'rug' }), 300);
      cv.moving = true;
    }
    if (cv.moving) return this.stepPath(dt);
    if (pl.toy === 'launcher') return this.launcherCat(dt, now);
    if (pl.toy === 'bubbles') return this.bubbleCat(dt, now);

    // feather, laser and the mouse: stalk it, and pounce when it moves quickly
    const mouse = pl.toy === 'mouse';
    const px = mouse ? pl.mx : pl.x;
    const py = mouse ? pl.my : pl.y;
    const spd = mouse ? pl.mspeed : pl.speed;
    const tx = Math.max(40, Math.min(A.W - 40, px));
    const ty = Math.max(452, Math.min(594, py + (mouse ? 0 : 20)));
    if (pl.pounce) {
      const P = pl.pounce;
      P.t += dt;
      const f = Math.min(1, P.t / 0.38);
      cv.x = P.fx + (P.tx - P.fx) * f;
      cv.y = P.fy + (P.ty - P.fy) * f;
      cv.fy = cv.y;
      cv.hopY = Math.sin(f * Math.PI) * 34;
      if (f >= 1) {
        cv.hopY = 0;
        pl.pounce = null;
        pl.cool = now + 900;
        const near = Math.hypot(px - cv.x, py + (mouse ? 0 : 20) - cv.y) < 70;
        const caught = near && Math.random() < (CATCH[pl.toy] || 0);
        if (this.hooks.pounce) this.hooks.pounce(caught);
        if (caught) {
          this.say(mouse ? 'Squeak!' : Math.random() < 0.5 ? 'GOT IT!' : 'Mrah!', 1200);
          this.hearts(1);
          if (mouse) {
            pl.held = now + 1100; // pinned under a paw for a moment
            if (this.hooks.mouseCatch) this.hooks.mouseCatch();
          }
        }
        this.setArt('crouch');
      }
      this.syncZ();
      return;
    }
    const dx = tx - cv.x;
    const dy = ty - cv.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 6) cv.facing = dx > 0 ? 1 : -1;
    if (dist > 95 || (dist > 30 && spd < 60)) {
      // creeping up on a mouse; racing after a feather
      const sp = (mouse ? 190 : 280) * dt;
      cv.x += (dx / dist) * Math.min(sp, dist);
      cv.y += (dy / dist) * Math.min(sp, dist);
      cv.fy = cv.y;
      if (cv.pose !== 'walk') this.setArt('walk');
      this.catBody.classList.toggle('zoom', !mouse);
      this.catBody.classList.remove('wiggling');
    } else {
      if (cv.pose !== 'crouch') {
        this.setArt('crouch');
        this.catBody.classList.remove('zoom');
      }
      // still close to a mouse that is lying still: the butt wiggle
      this.catBody.classList.toggle('wiggling', mouse && spd < 90 && now > pl.held);
      if (spd > 140 && now > pl.cool && now > pl.held) {
        this.catBody.classList.remove('wiggling');
        pl.pounce = { t: 0, fx: cv.x, fy: cv.y, tx: tx - 36 * Math.sign(dx || 1), ty };
      }
    }
    this.syncZ();
  };

  Scene.prototype.syncZ = function () {
    if (Math.abs(this.cv.y - this.cv.z) > 6) {
      this.cv.z = this.cv.y;
      this.placeCatInZ();
    }
  };

  // ---- Camera ----------------------------------------------------------------------------

  // Where the camera wants to be. Normally the full room height, panning
  // sideways on narrow screens. With a focus, it frames a point so that
  // span W × H fits inside the "safe" part of the screen (the part not
  // covered by the logo, buttons or the customisation panel).
  Scene.prototype.cameraTarget = function (r) {
    const f = this.focus;
    if (f) {
      const cx = f.follow ? this.cv.x : f.cx;
      const cy = f.follow ? this.cv.y - f.lift : f.cy;
      const sf = f.safe;
      const safeW = (1 - sf.l - sf.r) * r.width;
      const safeH = (1 - sf.t - sf.b) * r.height;
      const k = Math.min(safeW / f.spanW, safeH / f.spanH); // px per scene unit
      const w = r.width / k;
      const h = r.height / k;
      return { x: cx - ((sf.l + (1 - sf.l - sf.r) / 2) * r.width) / k, y: cy - ((sf.t + (1 - sf.t - sf.b) / 2) * r.height) / k, w, h };
    }
    // The room is shown a little smaller than the screen is tall, so there is air above
    // (under the HUD) and below (over the caption). The wall and floor carry on past the
    // edge of the room, so that margin is never empty.
    const aspect = r.width / r.height;
    const h = A.H * ROOM_ZOOM_OUT;
    const w = Math.max(340, Math.min(A.W, h * aspect));
    const focus = this.play && this.play.joined ? (this.cv.x + this.play.x) / 2 : this.cv.x;
    // On a narrow screen the player can drag the room around; otherwise follow the cat.
    const at = this.userPan != null && !this.play ? this.userPan : focus - w / 2;
    const x = w >= A.W - 1 ? 0 : Math.max(0, Math.min(A.W - w, at));
    return { x, y: -(h - A.H) * 0.55, w, h };
  };

  // Drag the camera sideways by dx scene units (a drag of the room to the right
  // shows more of the left). Only when the room doesn't fit the screen.
  Scene.prototype.panBy = function (dx) {
    if (this.focus || this.intro || this.play || this.cam.w >= A.W - 1) return false;
    const cur = this.userPan != null ? this.userPan : this.cam.x;
    this.userPan = Math.max(0, Math.min(A.W - this.cam.w, cur - dx));
    return true;
  };

  // Back to following the cat.
  Scene.prototype.followCat = function () {
    this.userPan = null;
  };

  Scene.prototype.updateCamera = function (dt) {
    const r = this.svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const t = this.cameraTarget(r);
    const c = this.cam;
    if (this.camSnap || (reduceMotion() && (this.focus || this.zoomingOut))) {
      Object.assign(c, t);
      this.zoomingOut = false;
      this.camSnap = false;
    } else {
      // Ease towards the target; zoom eases in log space so it feels even.
      const f = 1 - Math.exp(-dt * (this.focus || this.zoomingOut ? 2.6 : 2.5));
      c.x = this.dragging ? t.x : c.x + (t.x - c.x) * f;
      c.y += (t.y - c.y) * f;
      c.w = Math.exp(Math.log(c.w) + (Math.log(t.w) - Math.log(c.w)) * f);
      c.h = Math.exp(Math.log(c.h) + (Math.log(t.h) - Math.log(c.h)) * f);
      if (this.zoomingOut && Math.abs(c.h - t.h) < 1) this.zoomingOut = false;
    }
    this.svg.setAttribute('viewBox', `${c.x.toFixed(1)} ${c.y.toFixed(1)} ${c.w.toFixed(1)} ${c.h.toFixed(1)}`);
  };

  // ---- Intro: the cat in its box, out in the garden -------------------------------
  // The garden is drawn over the room, around a cardboard box standing where
  // the rug is. The cat grooms in a loop, glances at you and follows the
  // pointer with its eyes. At the end the garden fades into the room around
  // the cat, so it's one continuous shot.

  const INTRO_SPOT = { x: A.SPOTS.rug.x, y: 548 }; // on the rug
  const introAt = () => Object.assign({ s: A.scaleAt(INTRO_SPOT.y) }, INTRO_SPOT);

  // safe: the screen fractions left free by the logo/buttons ({ l, t, r, b }).
  Scene.prototype.startIntro = function (safe) {
    const box = introAt();
    clearTimeout(this.introTimer);
    this.userPan = null;
    this.tempBox = null;
    this.intro = { box, t0: performance.now(), look: { x: 0, y: 0, tx: 0, ty: 0, at: 0 }, nextGlance: 0 };
    this.cv = { x: box.x, y: box.y, z: box.y + 0.5, fy: box.y, high: false, facing: 1, path: [], moving: false, act: 'intro' };
    const at = `translate(${box.x} ${box.y}) scale(${box.s.toFixed(3)})`;
    this.garden.innerHTML = `<g class="garden-back" transform="${at}">${G.GardenArt.back()}</g><g class="garden-front" transform="${at}" pointer-events="none">${G.GardenArt.front()}</g>`;
    this.inGarden = true;
    this.lampGlow(false);
    this.renderRoom(true, G.Clock.now(this.getState()));
    this.refreshCat();
    this.placeCatInZ();
    this.setLabel('');
    this.frameBox('close', safe);
    this.camSnap = true;
  };

  // The room's lamp light would shine across the garden.
  Scene.prototype.lampGlow = function (on) {
    const g = this.over.querySelector('#lamp-glow');
    if (g) g.style.display = on ? '' : 'none';
  };

  // 'close': the cat fills the screen; 'custom': pulled back beside the panel.
  Scene.prototype.frameBox = function (shot, safe) {
    const b = this.intro ? this.intro.box : introAt();
    const F = G.CatArt.INTRO.frame;
    const [w, h] = shot === 'close' ? F.close : F.custom;
    this.focus = { cx: b.x, cy: b.y + F.cy * b.s, spanW: w * b.s, spanH: h * b.s, safe: safe || { l: 0.05, r: 0.05, t: 0.05, b: 0.05 } };
  };

  // Redraw the cat in its current pose (after a look change).
  Scene.prototype.refreshCat = function () {
    if (!this.cv) return;
    this.cv.artKey = null;
    if (this.inGarden) this.setArt('boxgroom');
    else if (this.cv.moving) this.setArt('walk');
    else this.setArt(...this.artFor(this.getState().activity));
  };

  // The name written on the box while choosing it.
  Scene.prototype.setLabel = function (text) {
    let lab = this.top.querySelector('#box-label');
    if (!this.intro) {
      if (lab) lab.remove();
      return;
    }
    if (!lab) {
      lab = el('text', { id: 'box-label', 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900, fill: '#1b1714', 'font-family': "'M PLUS Rounded 1c', Nunito, sans-serif", 'pointer-events': 'none' });
      this.top.prepend(lab);
    }
    const b = this.intro.box;
    const [lx, ly] = G.CatArt.INTRO.label;
    lab.setAttribute('x', (b.x + lx * b.s).toFixed(1));
    lab.setAttribute('y', (b.y + ly * b.s).toFixed(1));
    lab.textContent = [...(text || '')].length > 12 ? [...text].slice(0, 11).join('') + '…' : text || '';
  };

  // Pointer position in scene coordinates; the eyes turn towards it.
  Scene.prototype.lookAtPoint = function (p) {
    if (!this.intro || reduceMotion()) return;
    const hp = this.headPoint();
    const dx = p.x - hp.x;
    const dy = p.y - hp.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / (90 * hp.s));
    this.intro.look.tx = (dx / d) * 3.2 * k;
    this.intro.look.ty = (dy / d) * 2.6 * k;
    this.intro.look.at = performance.now();
  };

  // One grooming loop, ~10 s: rest, lick the paw, wash the face, rest and look at you.
  Scene.prototype.introIdle = function (nowMs) {
    const it = this.intro;
    const ph = ((nowMs - it.t0) % 10000) / 10000;
    const lerp = (a, b, f) => a + (b - a) * Math.max(0, Math.min(1, f));
    const ease = (f) => 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, f))) / 2;
    const MOUTH = G.CatArt.INTRO.mouth;
    const CHEEK = G.CatArt.INTRO.cheek;
    let px = 0;
    let py = 0;
    let eyes = null;
    let mouth = null;
    if (ph < 0.18) {
      // resting
    } else if (ph < 0.24) {
      const f = ease((ph - 0.18) / 0.06);
      px = lerp(0, MOUTH[0], f);
      py = lerp(0, MOUTH[1], f);
    } else if (ph < 0.46) {
      px = MOUTH[0];
      py = MOUTH[1] + Math.sin(nowMs / 90) * 2;
      eyes = 'closed';
      mouth = 'tongue';
    } else if (ph < 0.52) {
      const f = ease((ph - 0.46) / 0.06);
      px = lerp(MOUTH[0], CHEEK[0], f);
      py = lerp(MOUTH[1], CHEEK[1], f);
      eyes = 'closed';
    } else if (ph < 0.68) {
      // washing: two strokes up over the ear and back
      const f = ((ph - 0.52) / 0.16) * 2;
      const w = Math.sin((f % 1) * Math.PI);
      px = CHEEK[0] + w * 6;
      py = CHEEK[1] - w * 16;
      eyes = 'closed';
    } else if (ph < 0.74) {
      const f = ease((ph - 0.68) / 0.06);
      px = lerp(CHEEK[0], 0, f);
      py = lerp(CHEEK[1], 0, f);
    } else if (ph > 0.8 && ph < 0.86) {
      eyes = 'wide'; // a little look at you
      it.look.tx = it.look.ty = 0;
    }
    G.CatArt.moveArm(this.catBody, px, py);
    const now = performance.now();
    if (eyes) {
      this.overrides.eyes = eyes;
      this.overrides.eyesUntil = now + 120;
    }
    if (mouth) {
      this.overrides.mouth = mouth;
      this.overrides.mouthUntil = now + 120;
    }

    // Without a pointer for a while, glance around now and then.
    if (!reduceMotion() && now - it.look.at > 4000 && now > it.nextGlance) {
      it.nextGlance = now + 1800 + Math.random() * 2600;
      const a = Math.random() * Math.PI * 2;
      const k = Math.random() < 0.4 ? 0 : 1;
      it.look.tx = Math.cos(a) * 3 * k;
      it.look.ty = Math.sin(a) * 2 * k;
    }
    it.look.x += (it.look.tx - it.look.x) * 0.15;
    it.look.y += (it.look.ty - it.look.y) * 0.15;
    const tf = `translate(${it.look.x.toFixed(2)} ${it.look.y.toFixed(2)})`;
    for (const g of this.catBody.querySelectorAll('.eyes-open, .eyes-wide, .eyes-half')) g.setAttribute('transform', tf);
  };

  // Leave the garden: it fades into the room around the cat while the camera
  // pulls back, then the cat hops out of its box onto the rug.
  Scene.prototype.endIntro = function () {
    if (!this.intro) return;
    const b = this.intro.box;
    this.intro = null;
    this.focus = null;
    this.zoomingOut = true;
    this.overrides = {};
    G.CatArt.moveArm(this.catBody, 0, 0);
    for (const g of this.catBody.querySelectorAll('.eyes')) g.removeAttribute('transform');
    for (const g of this.garden.querySelectorAll('.garden-back, .garden-front')) g.classList.add('fading');
    const lab = this.top.querySelector('#box-label');
    if (lab) lab.classList.add('fading');
    clearTimeout(this.introTimer);
    this.introTimer = setTimeout(
      () => {
        // Swap the cat's own box for an identical empty one on the rug.
        this.inGarden = false;
        this.tempBox = { x: b.x, y: b.y, s: b.s };
        this.renderRoom(true, G.Clock.now(this.getState()));
        this.garden.innerHTML = '';
        this.setLabel('');
        this.lampGlow(true);
        const cv = this.cv;
        cv.high = true; // hop out over the front of the box
        cv.fy = b.y + 10;
        cv.act = null;
        this.onActivity(this.getState().activity);
        this.introTimer = setTimeout(() => {
          if (!this.tempBox) return;
          this.tempBox.fading = true;
          this.renderRoom(true, G.Clock.now(this.getState()));
          this.introTimer = setTimeout(() => {
            this.tempBox = null;
            this.renderRoom(true, G.Clock.now(this.getState()));
          }, 700);
        }, 1800);
      },
      reduceMotion() ? 0 : 900
    );
  };

  // ---- Photo ----------------------------------------------------------------------------

  // Returns a JPEG data URL of what's on screen right now.
  // Dark enough that a photo needs a flash (lights off, or night).
  Scene.prototype.isDark = function () {
    const t = this.svg.querySelector('#tint');
    return !!t && Number(t.getAttribute('opacity')) >= 0.3;
  };

  Scene.prototype.snapshot = function (caption, opts) {
    const flash = !!(opts && opts.flash);
    const clone = this.svg.cloneNode(true);
    // A flash lights the room up: most of the dark tint goes.
    if (flash) {
      const tint = clone.querySelector('#tint');
      if (tint) tint.setAttribute('opacity', Math.min(Number(tint.getAttribute('opacity')), 0.14));
      clone.querySelectorAll('#lamp-glow, #tv-glow').forEach((n) => n.remove());
    }
    // Frame the cat, like a real photo would.
    const hp = this.headPoint();
    const vw = 440;
    const vh = 300;
    const cx = Math.max(vw / 2, Math.min(A.W - vw / 2, hp.x));
    const cy = Math.max(vh / 2, Math.min(A.H - vh / 2, hp.y + 40 * hp.s));
    const vb = [cx - vw / 2, cy - vh / 2, vw, vh];
    clone.setAttribute('viewBox', vb.join(' '));
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('width', vb[2]);
    clone.setAttribute('height', vb[3]);
    clone.querySelectorAll('#toy, .float, .nudge').forEach((n) => n.remove());
    // The weather moves with CSS, which a saved picture doesn't carry: freeze it where it is.
    const live = this.svg.querySelectorAll('.wxfx, .wxfx *');
    const copy = clone.querySelectorAll('.wxfx, .wxfx *');
    live.forEach((n, i) => {
      const c = copy[i];
      if (!c || !n.style || !n.style.animation) return;
      const cs = getComputedStyle(n);
      c.style.animation = 'none';
      c.style.transform = cs.transform;
      c.style.transformOrigin = cs.transformOrigin;
      c.style.transformBox = cs.transformBox;
      c.style.opacity = cs.opacity;
    });
    const tree = this.svg.querySelector('#wx-tree');
    const treeCopy = clone.querySelector('#wx-tree');
    if (tree && treeCopy) {
      const cs = getComputedStyle(tree);
      treeCopy.style.animation = 'none';
      treeCopy.style.transform = cs.transform;
      treeCopy.style.transformOrigin = cs.transformOrigin;
    }
    const xml = new XMLSerializer().serializeToString(clone);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const W = 640;
        const scale = W / vb[2];
        const ph = Math.round(vb[3] * scale);
        const pad = 18;
        const cap = caption ? 58 : pad;
        const c = document.createElement('canvas');
        c.width = W + pad * 2;
        c.height = ph + pad + cap;
        const g = c.getContext('2d');
        g.fillStyle = '#fffdf6';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, pad, pad, W, ph);
        if (flash) {
          // direct flash: a bright middle and dark corners
          g.save();
          g.beginPath();
          g.rect(pad, pad, W, ph);
          g.clip();
          const gr = g.createRadialGradient(pad + W / 2, pad + ph / 2, W * 0.12, pad + W / 2, pad + ph / 2, W * 0.62);
          gr.addColorStop(0, 'rgba(255,252,235,0.16)');
          gr.addColorStop(1, 'rgba(20,16,44,0.5)');
          g.fillStyle = gr;
          g.fillRect(pad, pad, W, ph);
          g.restore();
        }
        g.strokeStyle = '#1b1714';
        g.lineWidth = 3;
        g.strokeRect(pad, pad, W, ph);
        g.fillStyle = '#1b1714';
        g.font = "800 22px 'M PLUS Rounded 1c', Nunito, system-ui, sans-serif";
        g.textAlign = 'center';
        g.fillText(caption || '', c.width / 2, ph + pad + 38, W);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  G.Scene = Scene;
})(globalThis.CatGame = globalThis.CatGame || {});
