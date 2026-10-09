// The living room on screen: draws the room, moves the cat between spots,
// idle animations (breathing, tail, ears, blinking), hearts, Zzz, speech
// bubbles, toys during play, and the camera for narrow (phone) screens.
(function (G) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const A = G.RoomArt;

  const SLEEP_EYES = new Set(['nap']);
  const DROWSY = new Set(['loaf', 'sunbathe', 'laptop', 'hide', 'knead']);
  const WIDE = new Set(['hunt', 'zoomies', 'play', 'toy']);
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
    svg.append(this.back, this.mid, this.garden, this.fx, this.over, this.top);

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
    const sig = JSON.stringify([s.room, s.bowl, seasons]);
    if (!force && sig === this.roomSig) return;
    // The background holds the framed photo of the cat, so a new look redraws it too.
    const coatSig = JSON.stringify(s.cat.coat || null);
    const seasonChanged = seasons.join() !== this.seasons.join() || !this.back.childNodes.length || coatSig !== this.coatSig;
    this.roomSig = sig;
    this.seasons = seasons;
    this.coatSig = coatSig;
    if (seasonChanged) {
      this.back.innerHTML = A.background() + A.decorBack(seasons);
      this.lastLightMin = -1;
    }
    this.mid.innerHTML = '';
    const items = A.midLayer(s, seasons).sort((a, b) => a.z - b.z);
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
  };

  Scene.prototype.updateLighting = function (t, force) {
    const m = Math.floor(t / 60000);
    if (!force && m === this.lastLightMin) return;
    this.lastLightMin = m;
    A.applyLighting(this.svg, G.Clock.lightingAt(t));
    A.updateClock(this.svg, t);
    const light = G.Clock.lightingAt(t);
    G.GardenArt.applyLighting(this.svg, light, A.mixHex);
    this.svg.closest('.stage').style.setProperty('--letterbox', light.isDay ? '#efe0bd' : '#6c6a7c');
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
    if (this.cv.moving) return this.cv.zoom ? 'wide' : 'open';
    if (SLEEP_EYES.has(a.id)) return 'closed';
    if (a.id === 'groom') return 'closed';
    if (DROWSY.has(a.id)) return a.id === 'knead' ? 'happy' : 'half';
    if (WIDE.has(a.id)) return 'wide';
    if (HAPPY.has(a.id)) return 'happy';
    return 'open';
  };

  Scene.prototype.baseMouth = function () {
    if (this.inGarden) return 'normal';
    const a = this.getState().activity;
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
    if (a.id === 'eat') opts.eat = true;
    if (a.id === 'knead') opts.knead = true;
    return [pose, opts];
  };

  Scene.prototype.teleport = function (a) {
    if (this.inGarden) return; // the cat stays in its box until the intro ends
    const p = this.posFor(a);
    this.cv = { x: p.x, y: p.y, z: p.z, fy: p.floor.y, high: p.high, facing: p.face || a.facing, path: [], moving: false, act: a.id + a.start };
    this.setArt(...this.artFor(a));
    this.placeCatInZ();
    this.cam.x = Math.max(0, Math.min(A.W - this.cam.w, p.x - this.cam.w / 2));
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
    this.applyFace(true);
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
    this.catBody.classList.remove('zoom');
    this.applyFace(true);
  };

  // ---- TV ---------------------------------------------------------------------------
  // A random channel on every visit; tap the TV (or wait a minute or two) to flip.

  Scene.prototype.paintTv = function (number) {
    const host = this.mid.querySelector('#tv-show');
    if (!host) return;
    if (!this.tv) this.tv = { ch: Math.floor(Math.random() * A.TV.CHANNELS.length), next: performance.now() + 60000 + Math.random() * 60000 };
    host.innerHTML = this.tv.static ? A.TV.static() : A.TV.show(A.TV.CHANNELS[this.tv.ch], number);
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

  // ---- Per-frame update -------------------------------------------------------------

  Scene.prototype.frame = function (dt, nowMs) {
    const cv = this.cv;
    if (!cv) return;
    if (this.tv && nowMs > this.tv.next) this.changeChannel();
    if (this.intro) this.introIdle(nowMs);
    else if (this.play) this.updatePlay(dt, nowMs);
    else if (cv.moving) this.stepPath(dt);
    else this.idle(nowMs);

    const s = A.scaleAt(cv.fy);
    this.catG.setAttribute('transform', `translate(${cv.x.toFixed(1)} ${cv.y.toFixed(1)}) scale(${s.toFixed(3)})`);
    this.catFlip.setAttribute('transform', `scale(${cv.facing < 0 ? -1 : 1} 1)`);
    this.catHop.setAttribute('transform', `translate(0 ${(-(cv.hopY || 0)).toFixed(1)})`);
    this.catShadow.setAttribute('opacity', this.inGarden ? 0 : cv.hopY ? 0.06 : 0.12);
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
      const show = a.id === 'birds' && G.Clock.lightingAt(G.Clock.now(st)).isDay;
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

  Scene.prototype.say = function (text, ms) {
    if (!text) return;
    const len = Math.max(2, [...text].length);
    const w = Math.min(220, 22 + len * 10.5);
    this.bubble.innerHTML =
      `<rect x="${-w / 2}" y="-40" width="${w}" height="34" rx="14" fill="#fcfcfc" stroke="#1b1714" stroke-width="3"/>` +
      `<path d="M -6 -7 L 0 4 L 7 -7 Z" fill="#fcfcfc" stroke="#1b1714" stroke-width="3" stroke-linejoin="round"/>` +
      `<rect x="-8" y="-10" width="16" height="5" fill="#fcfcfc"/>` +
      `<text x="0" y="-17" text-anchor="middle" font-size="17" font-weight="800" fill="#1b1714" font-family="'M PLUS Rounded 1c', Nunito, system-ui, sans-serif">${text.replace(/[<&]/g, '')}</text>`;
    this.bubble.setAttribute('display', 'inline');
    this.bubbleUntil = performance.now() + (ms || 2200);
    this.overrides.mouth = 'open';
    this.overrides.mouthUntil = performance.now() + 600;
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
      this.overrides.eyesUntil = now + (r.anim === 'slowBlink' ? 1600 : 1800);
    }
    if (r.say) this.say(r.say);
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
        this.overrides.eyes = 'wide';
        this.overrides.eyesUntil = now + 900;
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

  // ---- Petting zones ------------------------------------------------------------------

  Scene.prototype.toScene = function (clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = this.svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
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

  Scene.prototype.startPlay = function (toy, joined) {
    this.play = { toy, joined, x: 480, y: 470, px: 480, py: 470, speed: 0, lastMove: performance.now(), cool: 0, pounce: null };
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
  };

  Scene.prototype.moveToy = function (p) {
    const pl = this.play;
    if (!pl) return;
    const now = performance.now();
    const dt = Math.max(16, now - pl.lastMove) / 1000;
    const d = Math.hypot(p.x - pl.x, p.y - pl.y);
    pl.speed = pl.speed * 0.6 + (d / dt) * 0.4;
    pl.x = Math.max(10, Math.min(A.W - 10, p.x));
    pl.y = Math.max(10, Math.min(A.H - 6, p.y));
    pl.lastMove = now;
    this.drawToy();
  };

  Scene.prototype.drawToy = function () {
    const pl = this.play;
    if (pl.toy === 'laser') {
      this.toyG.innerHTML = `<circle cx="${pl.x}" cy="${pl.y}" r="16" fill="#ff3b3b" opacity=".25"/><circle cx="${pl.x}" cy="${pl.y}" r="6" fill="#ff2a2a"/><circle cx="${pl.x}" cy="${pl.y}" r="2.5" fill="#fff"/>`;
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

  Scene.prototype.updatePlay = function (dt, now) {
    const pl = this.play;
    const cv = this.cv;
    pl.speed *= Math.pow(0.1, dt);
    if (!pl.joined) {
      if (cv.moving) this.stepPath(dt);
      if (pl.speed > 200 && this.hooks.tempt) this.hooks.tempt();
      return;
    }
    if (cv.high && !cv.moving) {
      this.planTo(this.posFor({ spot: 'rug' }), 300);
      cv.moving = true;
    }
    if (cv.moving) return this.stepPath(dt);

    const tx = Math.max(40, Math.min(A.W - 40, pl.x));
    const ty = Math.max(452, Math.min(594, pl.y + 20));
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
        const near = Math.hypot(pl.x - cv.x, pl.y + 20 - cv.y) < 70;
        const caught = pl.toy === 'feather' && near && Math.random() < 0.65;
        if (this.hooks.pounce) this.hooks.pounce(caught);
        if (caught) {
          this.say(Math.random() < 0.5 ? 'GOT IT!' : 'Mrah!', 1200);
          this.hearts(1);
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
    if (dist > 95 || (dist > 30 && pl.speed < 60)) {
      const sp = 280 * dt;
      cv.x += (dx / dist) * Math.min(sp, dist);
      cv.y += (dy / dist) * Math.min(sp, dist);
      cv.fy = cv.y;
      if (cv.pose !== 'walk') {
        this.setArt('walk');
        this.catBody.classList.add('zoom');
      }
    } else {
      if (cv.pose !== 'crouch') {
        this.setArt('crouch');
        this.catBody.classList.remove('zoom');
      }
      if (pl.speed > 140 && now > pl.cool) {
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
    const aspect = r.width / r.height;
    const w = Math.max(340, Math.min(A.W, A.H * aspect));
    const focus = this.play && this.play.joined ? (this.cv.x + this.play.x) / 2 : this.cv.x;
    const x = w >= A.W - 1 ? 0 : Math.max(0, Math.min(A.W - w, focus - w / 2));
    return { x, y: 0, w, h: A.H };
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
      c.x += (t.x - c.x) * f;
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

  const INTRO_SPOT = { x: 470, y: 548 };
  const introAt = () => Object.assign({ s: A.scaleAt(INTRO_SPOT.y) }, INTRO_SPOT);

  // safe: the screen fractions left free by the logo/buttons ({ l, t, r, b }).
  Scene.prototype.startIntro = function (safe) {
    const box = introAt();
    clearTimeout(this.introTimer);
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
  Scene.prototype.snapshot = function (caption) {
    const clone = this.svg.cloneNode(true);
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
    clone.querySelectorAll('#toy, .float').forEach((n) => n.remove());
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
