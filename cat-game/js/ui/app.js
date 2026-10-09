// The app: starts the game, runs the live clock, handles taps/clicks and
// all the menus. Game rules live in js/core; drawing lives in scene/*Art.
(function (G) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const AWAY_MIN = 15 * 60 * 1000;

  let state;
  let scene;
  let album = [];
  let lastSave = 0;
  let lastFrame = 0;
  let lastDay = '';
  let petting = null;
  const petTimes = [];
  let play = null; // { toy, joined, stats }
  const modalQueue = [];
  let toastTimer = 0;
  let resetting = false; // set while wiping the save, so nothing writes it back
  let introActive = false; // the cat-in-the-box opening is on screen

  const nm = (tpl) => String(tpl || '').split('{name}').join(state.cat.name);
  const now = () => G.Clock.now(state);

  // ---- Icons ---------------------------------------------------------------------------

  const I = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONS = {
    feed: I('<path d="M2.5 11h19a9.5 7 0 0 1-19 0z" fill="#f2a28f"/><path d="M7 8.6c1.2-1.4 2.6-1.4 3.8 0M12.6 7.6c1.2-1.4 2.6-1.4 3.8 0"/>'),
    treat: I('<path d="M2.5 12c3-5.5 9.5-6.5 13.5-2l4.5-3.5v11L16 14c-4 4.5-10.5 3.5-13.5-2z" fill="#f3c66b"/><circle cx="7" cy="11.2" r=".9" fill="currentColor"/>'),
    play: I('<path d="M3 21 14 10"/><path d="M14 10c1-5 7-7 7-7s-1 6-6 7.5" fill="#7fb4d9"/><path d="M14 10c-1 4 1 7 1 7" fill="none"/>'),
    call: I('<path d="M3.5 4.5h17v11H10l-5 4v-4H3.5z" fill="#fffdf6"/><path d="M8.5 10h.01M12 10h.01M15.5 10h.01" stroke-width="2.8"/>'),
    room: I('<path d="M4 20v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6" fill="#e2b078"/><path d="M2.5 15.5h3v4.5M21.5 15.5h-3v4.5M6.5 11V8a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3"/>'),
    photo: I('<rect x="2.5" y="7" width="19" height="13.5" rx="3" fill="#9fd9cf"/><path d="M8 7l1.8-3h4.4L16 7"/><circle cx="12" cy="13.6" r="3.6" fill="#fffdf6"/>'),
    book: I('<path d="M3.5 4.5H10a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H3.5z" fill="#f6c9cf"/><path d="M20.5 4.5H14a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6.5z" fill="#fffdf6"/>'),
    settings: I('<circle cx="12" cy="12" r="3.2" fill="#f3c66b"/><path d="M12 2.5v3M12 18.5v3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M2.5 12h3M18.5 12h3M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
    soundOn: I('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fffdf6"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    soundOff: I('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fffdf6"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    tummy: I('<path d="M3 12c3-5 9-6 13-2l4.5-3.5v11L16 14c-4 4.5-10 3.5-13-2z" fill="#f2a28f"/>'),
    energy: I('<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z" fill="#f3c66b"/>'),
    happy: I('<circle cx="12" cy="12" r="9" fill="#9fd9cf"/><path d="M8 14c2 2.5 6 2.5 8 0M9 9.5h.01M15 9.5h.01" stroke-width="2.4"/>'),
    heart: I('<path d="M12 20.5C4 15 2.5 10.5 4.5 7.3 6.4 4.3 10.3 4.6 12 7.5c1.7-2.9 5.6-3.2 7.5-.2 2 3.2.5 7.7-7.5 13.2z" fill="#f28ba0"/>'),
  };

  // ---- Boot -----------------------------------------------------------------------------

  function boot() {
    album = G.Storage.loadAlbum();
    state = G.Storage.load();
    if (!state) state = G.State.createState(Date.now(), G.Profile.defaultName);
    G.CatArt.setCoat(state.cat.coat);
    G.CatArt.setAccessory(state.cat.accessory);
    G.Sound.setMuted(state.settings.muted);
    // The intro shows for new players, and for everyone once per browser session.
    const newSession = isNewSession();
    markSession();
    const withIntro = !state.named || newSession;
    if (withIntro) document.body.classList.add('intro-mode', 'no-anim');

    const t = now();
    const awayFrom = state.lastSeenAt;
    const res = catchUp(t);

    scene = new G.Scene($('scene'), () => state, {
      sound: (n) => sound(n),
      tempt: () => tempt(),
      pounce: (caught) => pounce(caught),
    });
    scene.renderRoom(true, t);
    scene.teleport(state.activity);
    lastDay = G.Clock.dayKey(t);

    buildToolbar();
    bindInput();
    updateHUD();

    const welcomeBack = () => {
      showAway(awayFrom, t);
      if (res) celebrate(res);
    };
    if (withIntro) showIntro(!state.named, welcomeBack);
    else welcomeBack();
    // First paint without transitions, so the intro doesn't animate the HUD folding away.
    setTimeout(() => document.body.classList.remove('no-anim'), 60);
    state.lastSeenAt = t;
    save(true);

    setInterval(tick, 1000);
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => save(true));
  }

  // Play time forward to `t` (offline catch-up), then tidy up.
  function catchUp(t) {
    G.Sim.advance(state, t, { live: false });
    // A play session can't survive a reload — the toy is gone.
    if (state.activity.id === 'play') G.Sim.setActivity(state, t, 'groom', 'rug');
    G.Sim.clampToLive(state, t);
    G.Journal.finalize(state, t);
    return G.Progression.dailyVisit(state, t);
  }

  function onVisibility() {
    if (document.hidden) {
      save(true);
      return;
    }
    const t = now();
    const away = t - state.lastSeenAt;
    if (away > 2 * 60 * 1000) {
      const from = state.lastSeenAt;
      const res = catchUp(t);
      scene.renderRoom(true, t);
      scene.teleport(state.activity);
      if (away > AWAY_MIN) showAway(from, t);
      if (res) celebrate(res);
    }
    state.lastSeenAt = t;
    updateHUD();
  }

  function save(force) {
    if (!state || resetting) return;
    const t = now();
    if (!force && t - lastSave < 15000) return;
    lastSave = t;
    if (!document.hidden) state.lastSeenAt = t;
    G.Storage.save(state);
  }

  // ---- Loops ------------------------------------------------------------------------------

  function tick() {
    if (document.hidden || !state) return;
    const t = now();
    const before = state.activity;
    G.Sim.advance(state, t, { live: true });
    if (state.activity !== before) onActivityChanged(before);

    if (play && play.joined && state.stats.energy < 8) finishPlay(true);

    const day = G.Clock.dayKey(t);
    if (day !== lastDay) {
      lastDay = day;
      G.Journal.finalize(state, t);
      const res = G.Progression.dailyVisit(state, t);
      if (res) celebrate(res);
    }
    scene.renderRoom(false, t);
    scene.updateLighting(t);
    updateHUD();
    save();
  }

  function frame(ts) {
    const dt = lastFrame ? Math.min(0.1, (ts - lastFrame) / 1000) : 0;
    lastFrame = ts;
    if (scene && !document.hidden) scene.frame(dt, ts);
    requestAnimationFrame(frame);
  }

  function onActivityChanged(prev) {
    const a = state.activity;
    if (play && play.joined && a.id !== 'play') {
      play.joined = false;
      scene.play && (scene.play.joined = false);
      toast(nm('{name} got distracted and wandered off. Cats.'));
    }
    if (play && a.id === 'play') return;
    scene.onActivity(a);
    if (a.rare) toast(nm('✨ Rare moment! {name} is sleeping belly-up. Quick — take a photo!'), 6000);
    if (prev && prev.id === 'gift') {
      sound('bell');
      toast(nm('{name} left something on the floor for you! Tap it.'));
    }
    switch (a.id) {
      case 'meow':
        setTimeout(() => {
          scene.say(G.Random.pick(Math.random, ['Mrrp?', 'Meow!', 'Mrow.', 'Mew?']));
          sound('meow');
        }, 1500);
        break;
      case 'askFood':
        setTimeout(() => {
          scene.say(a.yell ? 'MEOW! BREAKFAST!' : 'Mrrrow?', 2600);
          sound('meow');
        }, 2500);
        break;
      case 'eat':
        setTimeout(() => sound('crunch'), 2600);
        break;
      case 'knock':
        setTimeout(() => scene.say('…', 1500), 1200);
        break;
      default:
    }
    if (prev && prev.id === 'nap' && a.id !== 'nap' && Math.random() < 0.4) setTimeout(() => scene.say('*yawn*', 1500), 400);
  }

  // ---- HUD --------------------------------------------------------------------------------

  const MOOD_FACE = { happy: ['happy', 'normal'], content: ['open', 'normal'], sleepy: ['half', 'normal'], grumpy: ['half', 'normal'], hungry: ['open', 'open'] };
  let lastMood = '';

  function updateHUD() {
    const t = now();
    const st = state.stats;
    $('catName').textContent = state.cat.name;
    const mood = G.Interactions.moodOf(state);
    if (mood !== lastMood) {
      lastMood = mood;
      const [eyes, mouth] = MOOD_FACE[mood];
      $('moodFace').innerHTML = `<svg viewBox="-56 -56 112 92">${G.CatArt.renderHead('hud', eyes, mouth)}</svg>`;
    }
    $('moodText').textContent = G.Interactions.MOOD_LABEL[mood];
    setMeter('mFull', st.fullness);
    setMeter('mEnergy', st.energy);
    setMeter('mHappy', st.happiness);
    const p = G.Progression.progress(state);
    $('bondLv').textContent = p.level;
    $('bondFill').style.width = (p.max ? 100 : Math.round((p.into / p.need) * 100)) + '%';
    $('bondNext').textContent = p.max ? 'Best friends!' : `${Math.floor(p.into)}/${p.need}`;
    $('clockTime').textContent = G.Clock.formatTime(t);
    const seasons = scene ? scene.seasons : [];
    $('clockPhase').textContent = G.Clock.PHASE_LABEL[G.Clock.phaseAt(t)] + (seasons.length ? ' · ' + seasons.map((x) => G.Clock.SEASON_LABEL[x]).join(' & ') : '');
    $('status').textContent = play ? (play.joined ? nm('{name} is in hunting mode! Wiggle the toy.') : nm('Wiggle the toy to tempt {name}…')) : nm(G.Sim.describe(state));
    $('muteBtn').innerHTML = state.settings.muted ? ICONS.soundOff : ICONS.soundOn;
    $('muteBtn').setAttribute('aria-label', state.settings.muted ? 'Sound off' : 'Sound on');
    const dot = $('bookDot');
    if (dot) dot.hidden = !state.unseenUnlocks.length;
  }

  function setMeter(id, v) {
    const b = $(id);
    b.style.width = Math.round(v) + '%';
    b.classList.toggle('low', v < 25);
  }

  // ---- Feedback ------------------------------------------------------------------------------

  function sound(name) {
    if (state.settings.muted) return;
    const S = G.Sound;
    if (name === 'purr') S.purr(2.4);
    else if (S[name]) S[name]();
  }

  function toast(text, ms) {
    if (!text) return;
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || Math.max(3000, text.length * 55));
  }

  function apply(r, prevActivity) {
    if (!r) return;
    if (r.toast) toast(nm(r.toast));
    scene.react(r);
    if (r.sound) sound(r.sound);
    if (prevActivity && state.activity !== prevActivity) scene.onActivity(state.activity);
    celebrate(r);
    updateHUD();
    save(true);
  }

  // Level-ups and unlocks get a little celebration card.
  function celebrate(r) {
    if (!r || !r.levelUp) return;
    sound('chime');
    const items = (r.unlocked || []).map((k) => `<li>${esc(G.Catalog.unlockName(k))}</li>`).join('');
    openModal(
      `<div class="celebrate"><div class="big-heart">${ICONS.heart}</div>
       <h2>Bond level ${r.levelUp}!</h2>
       <p>${esc(nm('{name} trusts you a little more.'))}</p>
       ${items ? `<p class="small">New things unlocked:</p><ul class="unlock-list">${items}</ul>` : ''}
       <button class="btn primary" data-close>Yay!</button></div>`
    );
  }

  // ---- Toolbar & input ---------------------------------------------------------------------

  function buildToolbar() {
    const btns = [
      ['feed', 'Feed', openFeed],
      ['treat', 'Treat', giveTreat],
      ['play', 'Play', openPlay],
      ['call', 'Call', callCat],
      ['room', 'Room', openRoom],
      ['photo', 'Photo', takePhoto],
      ['book', 'Diary', () => openBook('diary')],
      ['settings', 'Me', openSettings],
    ];
    const tb = $('toolbar');
    tb.innerHTML = btns
      .map(([icon, label]) => `<button class="tool" data-tool="${icon}">${ICONS[icon]}<span>${label}</span>${icon === 'book' ? '<i class="dot" id="bookDot" hidden></i>' : ''}</button>`)
      .join('');
    for (const [icon, , fn] of btns) tb.querySelector(`[data-tool="${icon}"]`).addEventListener('click', () => {
      G.Sound.unlock();
      if (icon !== 'photo') sound('pop');
      fn();
    });
    $('mFullIco').innerHTML = ICONS.tummy;
    $('mEnergyIco').innerHTML = ICONS.energy;
    $('mHappyIco').innerHTML = ICONS.happy;
    $('bondIco').innerHTML = ICONS.heart;
    $('muteBtn').addEventListener('click', () => {
      state.settings.muted = !state.settings.muted;
      G.Sound.setMuted(state.settings.muted);
      if (!state.settings.muted) {
        G.Sound.unlock();
        sound('pop');
      }
      updateHUD();
      save(true);
    });
    $('nameBtn').addEventListener('click', openSettings);
    $('doneBtn').addEventListener('click', () => finishPlay(false));
  }

  // Tap the TV: new channel. An awake cat perks up at fish, birds and mice.
  function flipTv() {
    const ch = scene.changeChannel();
    sound('tvClick');
    if (['fish', 'birds', 'mouse'].includes(ch) && !G.Sim.isSleeping(state) && Math.random() < 0.6) {
      setTimeout(() => scene.react({ say: ch === 'birds' ? 'Ek ek ek!' : '!', eyes: 'wide' }), 450);
    }
  }

  function bindInput() {
    const svg = $('scene');
    svg.addEventListener('pointerdown', (e) => {
      G.Sound.unlock();
      const p = scene.toScene(e.clientX, e.clientY);
      // In the box: the eyes follow taps, and a tap on the cat gets a purr.
      if (introActive) {
        scene.lookAtPoint(p);
        if (e.target.closest('#cat')) {
          scene.react({ eyes: 'happy', hearts: 1 });
          sound('purr');
        }
        return;
      }
      if (play) {
        scene.moveToy(p);
        svg.setPointerCapture(e.pointerId);
        return;
      }
      const gift = e.target.closest('.gift');
      if (gift) return collectGift(Number(gift.getAttribute('data-gift')));
      if (e.target.closest('.cup')) {
        apply(G.Interactions.pickUpCup(state, now()));
        scene.renderRoom(true, now());
        return;
      }
      if (e.target.closest('.tv')) return flipTv();
      if (e.target.closest('#cat')) {
        petting = { x: e.clientX, y: e.clientY, dist: 0, last: 0 };
        svg.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    svg.addEventListener('pointermove', (e) => {
      if (introActive) return scene.lookAtPoint(scene.toScene(e.clientX, e.clientY));
      if (play) {
        if (e.pointerType === 'mouse' || e.buttons) scene.moveToy(scene.toScene(e.clientX, e.clientY));
        return;
      }
      if (!petting) {
        svg.style.cursor = e.target.closest('#cat') ? 'grab' : e.target.closest('.tv') ? 'pointer' : '';
        return;
      }
      petting.dist += Math.hypot(e.clientX - petting.x, e.clientY - petting.y);
      petting.x = e.clientX;
      petting.y = e.clientY;
      const t = performance.now();
      if (petting.dist > 60 && t - petting.last > 420) {
        petting.dist = 0;
        petting.last = t;
        petting.stroked = true;
        doPet(scene.toScene(e.clientX, e.clientY));
      }
    });
    const end = (e) => {
      if (petting && !petting.stroked && petting.dist < 14) doPet(scene.toScene(e.clientX, e.clientY));
      petting = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', () => (petting = null));
    $('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('modal').hidden && state.named) closeModal();
    });
  }

  function doPet(p) {
    const t = now();
    const ms = performance.now();
    while (petTimes.length && ms - petTimes[0] > 30000) petTimes.shift();
    petTimes.push(ms);
    const zone = scene.zoneAt(p);
    const prev = state.activity;
    apply(G.Interactions.pet(state, t, zone, petTimes.length), prev);
  }

  function collectGift(i) {
    const r = G.Interactions.collectGift(state, now(), i);
    if (!r) return;
    sound(r.rarity === 'common' ? 'bell' : 'chime');
    scene.renderRoom(true, now());
    apply(r);
  }

  // ---- Actions -----------------------------------------------------------------------------

  function giveTreat() {
    const prev = state.activity;
    apply(G.Interactions.treat(state, now()), prev);
  }

  function callCat() {
    const prev = state.activity;
    toast(`"${state.cat.name}!"`, 1200);
    setTimeout(() => apply(G.Interactions.call(state, now()), prev), 700);
  }

  function openFeed() {
    const C = G.Catalog;
    const cards = Object.entries(C.FOODS)
      .map(([id, f]) => {
        const ok = G.Progression.isUnlocked(state, 'food:' + id);
        return `<button class="pick ${ok ? '' : 'locked'}" data-food="${id}" ${ok ? '' : 'disabled'}>
          <span class="swatch" style="background:${f.color}"></span><b>${esc(f.name)}</b>
          <small>${ok ? (f.portions > 1 ? `Fills the bowl (${f.portions} meals)` : 'One tasty meal') : `Bond Lv ${f.level}`}</small></button>`;
      })
      .join('');
    const b = state.bowl;
    const bowlTxt = b.portions > 0 ? `The bowl has ${C.FOODS[b.food].name.toLowerCase()} in it (${b.portions} meal${b.portions > 1 ? 's' : ''} left).` : 'The bowl is empty.';
    openModal(`<h2>Feed ${esc(state.cat.name)}</h2><p class="small">${bowlTxt} ${esc(nm('{name} eats from the bowl by themselves while you are away.'))}</p><div class="grid">${cards}</div><button class="btn" data-close>Close</button>`, (box) => {
      box.querySelectorAll('[data-food]').forEach((el) =>
        el.addEventListener('click', () => {
          closeModal();
          const prev = state.activity;
          sound('bell');
          apply(G.Interactions.feed(state, now(), el.getAttribute('data-food')), prev);
          scene.renderRoom(true, now());
        })
      );
    });
  }

  function openPlay() {
    const cards = Object.entries(G.Catalog.TOYS)
      .map(([id, toy]) => {
        const ok = G.Progression.isUnlocked(state, 'toy:' + id);
        return `<button class="pick ${ok ? '' : 'locked'}" data-toy="${id}" ${ok ? '' : 'disabled'}><b>${esc(toy.name)}</b><small>${ok ? (id === 'laser' ? 'Impossible to catch. Chaos.' : 'Drag it around. Pounce!') : `Bond Lv ${toy.level}`}</small></button>`;
      })
      .join('');
    openModal(`<h2>Play time</h2><p class="small">Pick a toy, then drag it around the room (or move your mouse). Wiggle it fast to make ${esc(state.cat.name)} pounce.</p><div class="grid">${cards}</div><button class="btn" data-close>Close</button>`, (box) => {
      box.querySelectorAll('[data-toy]').forEach((el) => el.addEventListener('click', () => startPlay(el.getAttribute('data-toy'))));
    });
  }

  function startPlay(toy) {
    closeModal();
    const prev = state.activity;
    const r = G.Interactions.startPlay(state, now(), toy);
    if (!r.ok) return toast(r.toast);
    play = { toy, joined: r.joined, stats: { pounces: 0, catches: 0 } };
    if (r.toast) toast(nm(r.toast));
    scene.react(r);
    if (state.activity !== prev) scene.cv.act = state.activity.id + state.activity.start;
    scene.startPlay(toy, r.joined);
    $('toolbar').hidden = true;
    $('playbar').hidden = false;
    $('playHint').textContent = toy === 'laser' ? 'Move the red dot around!' : 'Drag the feather around!';
    updateHUD();
  }

  function tempt() {
    if (!play || play.joined) return;
    if (G.Interactions.tempt(state, now())) {
      play.joined = true;
      scene.joinPlay();
      scene.react({ eyes: 'wide', say: '!' });
      toast(nm('{name} could not resist!'));
    }
  }

  function pounce(caught) {
    if (!play) return;
    play.stats.pounces++;
    if (caught) play.stats.catches++;
    if (caught) sound('bell');
    const r = G.Interactions.pounce(state, now(), play.toy, caught);
    celebrate(r);
    updateHUD();
  }

  function finishPlay(tired) {
    if (!play) return;
    const p = play;
    play = null;
    scene.endPlay();
    const r = G.Interactions.endPlay(state, now(), p.toy, p.stats);
    $('toolbar').hidden = false;
    $('playbar').hidden = true;
    scene.onActivity(state.activity);
    const caught = p.stats.catches ? `Caught it ${p.stats.catches} time${p.stats.catches > 1 ? 's' : ''}! ` : '';
    const msg = tired ? '{name} flopped over, completely worn out. Good hunt!' : r.toast;
    if (msg) toast(nm(caught + msg));
    updateHUD();
    save(true);
  }

  // ---- Room -----------------------------------------------------------------------------

  function openRoom() {
    const C = G.Catalog;
    const owned = Object.keys(C.ITEMS).filter((id) => G.Progression.isUnlocked(state, 'item:' + id));
    const names = ['Left corner', 'By the chair', 'By the table'];
    const slotHtml = state.room.slots
      .map((cur, i) => {
        const opts = ['', ...owned]
          .map((id) => {
            const usedElsewhere = id && state.room.slots.some((x, j) => x === id && j !== i);
            return `<button class="chip ${cur === id || (!cur && !id) ? 'on' : ''}" data-slot="${i}" data-item="${id}" ${usedElsewhere ? 'disabled' : ''}>${id ? `<span class="chip-ico">${G.RoomArt.itemIcon(id)}</span>${esc(C.ITEMS[id].name)}` : 'Empty'}</button>`;
          })
          .join('');
        return `<div class="slot"><h3>${names[i]}</h3><div class="chips">${opts}</div></div>`;
      })
      .join('');
    const perchOk = G.Progression.isUnlocked(state, 'item:perch');
    const fav = G.Progression.favorite(state, 'spots');
    const favTxt = fav ? `Favourite spot so far: ${(C.ITEMS[fav] || C.SPOTS[fav]).label}.` : '';
    openModal(
      `<h2>Arrange the room</h2><p class="small">Place toys and beds. ${esc(nm('{name} may or may not use them. (Probably later, when you are not looking.)'))} ${esc(favTxt)}</p>
       ${slotHtml}
       <div class="slot"><h3>Window</h3><div class="chips"><button class="chip ${state.room.perch ? 'on' : ''}" id="perchBtn" ${perchOk ? '' : 'disabled'}>${perchOk ? (state.room.perch ? 'Window hammock: on' : 'Window hammock: off') : `Window hammock (Bond Lv ${C.PERCH.level})`}</button></div></div>
       <p class="small muted">More things unlock as your bond grows.</p><button class="btn primary" data-close>Done</button>`,
      (box) => {
        box.querySelectorAll('[data-slot]').forEach((el) =>
          el.addEventListener('click', () => {
            const i = Number(el.getAttribute('data-slot'));
            const id = el.getAttribute('data-item') || null;
            setSlot(i, id);
            openRoom();
          })
        );
        const pb = box.querySelector('#perchBtn');
        if (pb)
          pb.addEventListener('click', () => {
            state.room.perch = !state.room.perch;
            if (!state.room.perch && state.activity.spot === 'sill' && state.activity.id === 'nap') G.Sim.setActivity(state, now(), 'sit', 'rug');
            refreshRoom();
            openRoom();
          });
      },
      true
    );
  }

  function setSlot(i, id) {
    const prevItem = state.room.slots[i];
    state.room.slots[i] = id;
    if (id) G.Progression.bump(state, 'spots', id, 0.5);
    if (state.activity.spot === 'slot' + i && prevItem !== id) G.Sim.setActivity(state, now(), 'sit', 'rug');
    refreshRoom();
    if (id && Math.random() < 0.45 && !G.Sim.isSleeping(state)) {
      setTimeout(() => {
        const it = G.Catalog.ITEMS[id];
        const tag = it.tags.includes('hide') ? 'hide' : it.tags.includes('toy') ? 'toy' : it.tags.includes('nap') ? 'loaf' : 'sit';
        const id2 = tag === 'loaf' && !it.tags.includes('loaf') ? 'sit' : tag;
        G.Sim.setActivity(state, now(), id2, 'slot' + i);
        scene.onActivity(state.activity);
        toast(nm(`{name} went straight over to inspect ${it.label}.`));
      }, 1200);
    }
  }

  function refreshRoom() {
    scene.renderRoom(true, now());
    scene.onActivity(state.activity);
    save(true);
  }

  // ---- Photos -------------------------------------------------------------------------------

  function takePhoto() {
    const flash = $('flash');
    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');
    sound('shutter');
    const t = now();
    const caption = G.Sim.describe(state).replace(/\.$/, '');
    scene
      .snapshot('')
      .then((url) => {
        const photo = { id: 'p' + t, t, url, caption, name: state.cat.name };
        openModal(
          `<h2>Snap!</h2><figure class="photo-big"><img src="${url}" alt=""><figcaption>${esc(nm(caption))}</figcaption></figure>
           <div class="row"><button class="btn primary" id="keepBtn">Keep in album</button><a class="btn" download="${esc(state.cat.name)}-${G.Clock.dayKey(t)}.jpg" href="${url}">Save to device</a><button class="btn" data-close>Discard</button></div>`,
          (box) =>
            box.querySelector('#keepBtn').addEventListener('click', () => {
              album.unshift(photo);
              while (album.length && !G.Storage.saveAlbum(album)) album.pop();
              closeModal();
              toast(album.includes(photo) ? 'Saved to the album (in your Diary).' : 'The album is full — delete some photos first.');
            })
        );
      })
      .catch(() => toast('Could not take the photo on this browser, sorry!'));
  }

  // ---- Diary / album / treasures ------------------------------------------------------------

  function diaryCard(e) {
    const renamed = e.name !== state.cat.name ? ` <span class="note">(now called ${esc(state.cat.name)})</span>` : '';
    const close = esc(e.close.split('{name}').join(e.name));
    return `<article class="diary"><h3>${e.today ? 'Today (so far)' : esc(G.Clock.formatDay(e.day))}</h3><p>${esc(e.open)}</p>${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}<p class="sign">${close}${renamed}</p></article>`;
  }

  function openBook(tab) {
    const tabs = [
      ['diary', 'Diary'],
      ['album', 'Album'],
      ['treasures', 'Treasures'],
      ['unlocks', 'Unlocks'],
    ];
    let body = '';
    if (tab === 'diary') {
      const entries = [G.Journal.todayEntry(state, now()), ...state.journal.slice().reverse()];
      body = `<p class="small">Written by ${esc(state.cat.name)}, in paw.</p>` + entries.map(diaryCard).join('');
    } else if (tab === 'album') {
      body = album.length
        ? `<div class="album">${album.map((p, i) => `<figure data-photo="${i}"><img src="${p.url}" alt=""><figcaption>${esc(nm(p.caption))}<small>${esc(new Date(p.t).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</small></figcaption></figure>`).join('')}</div>`
        : `<p class="empty">No photos yet. Tap <b>Photo</b> when ${esc(state.cat.name)} is being cute.</p>`;
    } else if (tab === 'treasures') {
      const G2 = G.Catalog.GIFTS;
      body =
        `<p class="small">Gifts ${esc(state.cat.name)} has brought you. Rarer ones show up as your bond grows.</p><div class="treasures">` +
        Object.entries(G2)
          .map(([id, g]) => {
            const n = state.treasures[id] || 0;
            return `<div class="treasure ${n ? '' : 'unknown'} ${g.rarity}"><span>${G.RoomArt.giftIcon(id)}</span><b>${n ? esc(g.name.replace(/^an? /, '')) : '???'}</b><small>${n ? '×' + n : g.rarity}</small></div>`;
          })
          .join('') +
        `</div>`;
    } else {
      const lv = G.Progression.level(state);
      body = G.Catalog.LEVELS.map((pts, i) => {
        const L = i + 1;
        const keys = G.Catalog.unlocksAt(L);
        const list = keys.length ? keys.map((k) => esc(G.Catalog.unlockName(k))).join(', ') : L === 1 ? '' : 'Rarer gifts & more trust';
        return `<div class="lv ${L <= lv ? 'got' : ''}"><b>Lv ${L}</b><span>${list || 'Kibble, wet food, treats, feather wand, box, round scratcher bed'}</span><small>${pts} ♥</small></div>`;
      }).join('');
      state.unseenUnlocks = [];
      save(true);
    }
    const sitter = tab === 'diary' && !G.Sim.isSleeping(state) && Math.random() < 0.3;
    openModal(
      `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
       <div class="book">${body}</div><button class="btn" data-close>Close</button>
       ${sitter ? `<button class="sitter" id="sitter" aria-label="Shoo the cat off the diary"><svg viewBox="-80 -120 170 130">${G.CatArt.render('loaf', 'sitter')}</svg><span>${esc(state.cat.name)} is sitting on your diary. Tap to shoo.</span></button>` : ''}`,
      (box) => {
        box.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => openBook(b.getAttribute('data-tab'))));
        box.querySelectorAll('[data-photo]').forEach((f) => f.addEventListener('click', () => openPhoto(Number(f.getAttribute('data-photo')))));
        const s = box.querySelector('#sitter');
        if (s) {
          s.querySelectorAll('.eyes').forEach((g) => g.setAttribute('display', g.classList.contains('eyes-half') ? 'inline' : 'none'));
          s.addEventListener('click', () => {
            s.classList.add('leave');
            sound('meow');
            setTimeout(() => s.remove(), 500);
          });
        }
      },
      true
    );
  }

  function openPhoto(i) {
    const p = album[i];
    if (!p) return;
    openModal(
      `<figure class="photo-big"><img src="${p.url}" alt=""><figcaption>${esc(nm(p.caption))}</figcaption></figure>
       <div class="row"><a class="btn primary" download="${esc(state.cat.name)}-${G.Clock.dayKey(p.t)}.jpg" href="${p.url}">Save to device</a><button class="btn" id="delBtn">Delete</button><button class="btn" id="backBtn">Back</button></div>`,
      (box) => {
        box.querySelector('#backBtn').addEventListener('click', () => openBook('album'));
        box.querySelector('#delBtn').addEventListener('click', () => {
          album.splice(i, 1);
          G.Storage.saveAlbum(album);
          openBook('album');
        });
      },
      true
    );
  }

  // ---- Settings / profile / naming ---------------------------------------------------------

  function openSettings() {
    const t = now();
    const C = G.Catalog;
    const p = G.Progression.progress(state);
    const days = Math.max(1, Math.round((t - state.createdAt) / G.Clock.DAY));
    const fav = (kind, map) => {
      const k = G.Progression.favorite(state, kind);
      return k ? esc(map(k)) : '<i>still deciding…</i>';
    };
    const favSpot = fav('spots', (k) => (C.ITEMS[k] || C.SPOTS[k] || { label: k }).label);
    const favToy = fav('toys', (k) => C.TOYS[k].name);
    const favFood = fav('foods', (k) => C.FOODS[k].name);
    const favPet = fav('pets', (k) => ({ chin: 'chin scratches', head: 'head pats', back: 'back pets', belly: 'belly rubs (!)' })[k]);
    const quirks = G.Profile.quirks.filter((q) => q.on).map((q) => `<li>${esc(q.text)}</li>`).join('');
    openModal(
      `<div class="profile"><div class="portrait"><svg viewBox="-80 -150 160 156">${G.CatArt.render('sit', 'profile')}</svg></div>
        <div><h2>${esc(state.cat.name)}</h2><p class="small">Together for ${days} day${days > 1 ? 's' : ''} · Bond Lv ${p.level}</p><p class="small muted">${esc(looksText())}</p><button class="btn small-btn" id="lookBtn">Change look</button></div></div>
       <form class="rename" id="renameForm"><label for="renameInput">Name</label><div class="row"><input id="renameInput" maxlength="40" autocomplete="off" value="${esc(state.cat.name)}"><button class="btn primary" type="submit">Rename</button></div><p class="error" id="renameErr"></p></form>
       <h3>Favourites</h3><ul class="favs"><li><b>Nap spot:</b> ${favSpot}</li><li><b>Toy:</b> ${favToy}</li><li><b>Food:</b> ${favFood}</li><li><b>Pets:</b> ${favPet}</li></ul>
       <h3>Quirks</h3><ul class="quirks">${quirks}</ul>
       <h3>Sound</h3><button class="btn" id="soundBtn">${state.settings.muted ? 'Sound is off — turn on' : 'Sound is on — turn off'}</button>
       <h3>Start over</h3><p class="small">Erase everything and adopt a new cat.</p><button class="btn danger" id="resetBtn">Start a new game</button>
       <details class="testing"><summary>Testing tools</summary>
         <p class="small">Pretend time has passed (to see the "while you were away" summary without waiting):</p>
         <div class="row"><button class="btn" data-skip="1">+1 hour</button><button class="btn" data-skip="6">+6 hours</button><button class="btn" data-skip="24">+1 day</button><button class="btn" id="realTime" ${state.settings.timeOffset ? '' : 'disabled'}>Back to real time</button></div>
         <p class="small">Seasonal decor preview:</p>
         <div class="row">${[['', 'Auto'], ['none', 'None'], ['cny', 'CNY'], ['raya', 'Raya'], ['christmas', 'Christmas']].map(([k, l]) => `<button class="chip ${String(state.settings.seasonPreview || '') === k ? 'on' : ''}" data-season="${k}">${l}</button>`).join('')}</div>
       </details>
       <button class="btn" data-close>Close</button>`,
      (box) => {
        box.querySelector('#renameForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const prev = state.activity;
          const r = G.Interactions.rename(state, now(), box.querySelector('#renameInput').value);
          if (!r.ok) {
            box.querySelector('#renameErr').textContent = r.error;
            return;
          }
          closeModal();
          if (!r.same) apply(r, prev);
        });
        box.querySelector('#soundBtn').addEventListener('click', () => {
          $('muteBtn').click();
          openSettings();
        });
        box.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => timeTravel(Number(b.getAttribute('data-skip')) * G.Clock.HOUR)));
        box.querySelector('#realTime').addEventListener('click', () => {
          // Going backwards isn't possible for the simulation; it simply waits until real time catches up.
          state.settings.timeOffset = 0;
          state.lastSimAt = Math.min(state.lastSimAt, now());
          state.activity.end = Math.min(state.activity.end, now() + 20000);
          state.activity.start = Math.min(state.activity.start, now());
          state.lastSeenAt = now();
          scene.renderRoom(true, now());
          scene.teleport(state.activity);
          closeModal();
          save(true);
          toast('Back to real time.');
        });
        box.querySelectorAll('[data-season]').forEach((b) =>
          b.addEventListener('click', () => {
            state.settings.seasonPreview = b.getAttribute('data-season') || null;
            scene.renderRoom(true, now());
            save(true);
            openSettings();
          })
        );
        box.querySelector('#lookBtn').addEventListener('click', openLookPanel);
        box.querySelector('#resetBtn').addEventListener('click', confirmReset);
      },
      true
    );
  }

  function confirmReset() {
    openModal(
      `<div class="naming"><h2>Start over?</h2>
        <p>${esc(state.cat.name)}'s diary, photos, treasures and bond will be erased. This can't be undone.</p>
        <div class="row center"><button class="btn" id="keepGame">Keep playing</button><button class="btn danger" id="wipeGame">Yes, start over</button></div></div>`,
      (box) => {
        box.querySelector('#keepGame').addEventListener('click', openSettings);
        box.querySelector('#wipeGame').addEventListener('click', () => {
          resetting = true; // the reload fires pagehide, which would otherwise save the old game back
          G.Storage.clear();
          location.reload();
        });
      },
      true
    );
  }

  function timeTravel(ms) {
    closeModal();
    save(true);
    const from = now();
    state.lastSeenAt = from;
    state.settings.timeOffset = (state.settings.timeOffset || 0) + ms;
    if (play) finishPlay(false);
    const t = now();
    const res = catchUp(t);
    scene.renderRoom(true, t);
    scene.teleport(state.activity);
    lastDay = G.Clock.dayKey(t);
    showAway(from, t, true);
    if (res) celebrate(res);
    state.lastSeenAt = t;
    updateHUD();
    save(true);
  }

  // ---- Choosing a look ------------------------------------------------------------------

  // The look picker: breed presets, mix-your-own, or colours matched from a
  // photo. It edits a working copy; `onChange` gets every new coat.
  let pickN = 0;
  function lookPicker(box, start, onChange, opts) {
    opts = opts || {};
    const K = G.Coats;
    let coat = K.normalize(start);
    let tab = 'breeds';
    // The photo being read: a small copy for the analysis, the taps, and what
    // the reader decided was the cat (mask). Kept only while the picker is open.
    let ph = null;
    const preview = () => {
      const svg = box.querySelector('#lookPreview');
      if (svg) svg.innerHTML = G.CatArt.withCoat(coat, () => G.CatArt.render('sit', 'pv' + pickN++));
    };
    const set = (c) => {
      coat = K.normalize(c);
      if (!coat.preset) coat.preset = K.matchPreset(coat);
      onChange(coat);
      draw();
    };
    const chip = (attr, id, name, on) => `<button type="button" class="chip ${on ? 'on' : ''}" data-${attr}="${id}">${esc(name)}</button>`;
    function draw() {
      const host = box.querySelector('#look');
      const pane = {
        breeds: `<div class="breeds">${K.PRESETS.map(
          (p) =>
            `<button type="button" class="breed ${coat.preset === p.id ? 'on' : ''}" data-preset="${p.id}"><svg viewBox="-56 -56 112 92" aria-hidden="true">${G.CatArt.withCoat(p.coat, () => G.CatArt.renderHead('b' + p.id + pickN))}</svg><span>${esc(p.name)}</span></button>`
        ).join('')}</div>`,
        mix:
          `<p class="look-label">Colour</p><div class="swatches">${K.SWATCHES.map((w) => `<button type="button" class="sw ${coat.base === w.hex ? 'on' : ''}" data-base="${w.hex}" style="--c:${w.hex}" title="${w.name}" aria-label="${w.name}"></button>`).join('')}</div>` +
          `<p class="look-label">Pattern</p><div class="row center">${K.PATTERNS.map((x) => chip('pattern', x.id, x.name, coat.pattern === x.id)).join('')}</div>` +
          `<p class="look-label">White markings</p><div class="row center">${K.WHITES.map((x) => chip('white', x.id, x.name, coat.white === x.id)).join('')}</div>`,
        photo: !ph
          ? `<label class="photo-pick"><input type="file" accept="image/*" id="photoIn"><span>📷 Choose a photo of your cat</span></label>
          <p class="small muted">You'll tap your cat's fur to help the game read the colours. The photo stays on your device and isn't saved.</p>`
          : `<p class="photo-step">${
              !ph.taps.length
                ? '<b>1.</b> Tap your cat’s main fur colour. <span class="muted">(White with patches? Tap a patch.)</span>'
                : ph.taps.length === 1 && !ph.oneColour
                  ? '<b>2.</b> Now tap a stripe or patch, if they have one.'
                  : 'Done! Tap the photo again to redo the taps.'
            }</p>
          <canvas id="photoCv" class="photo-cv" aria-label="Your photo. Tap the cat's fur."></canvas>
          <div class="row center">${ph.taps.length === 1 && !ph.oneColour ? '<button type="button" class="chip" id="oneColour">It’s all one colour</button>' : ''}<label class="btn link">Use another photo<input type="file" accept="image/*" id="photoIn" hidden></label></div>
          <p class="small" id="photoMsg">${ph.msg || ''}</p>
          <p class="small muted">The dimmed part is what the game ignores. The photo stays on your device and isn't saved.</p>`,
      }[tab];
      if (opts.onTab) opts.onTab(tab);
      host.innerHTML =
        `<div class="seg">${[['breeds', 'Breeds'], ['mix', 'Mix your own'], ['photo', 'From a photo']].map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>` +
        `<div class="look-pane">${pane}</div><p class="small look-name">${esc(K.describe(coat))}</p>`;
      host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => ((tab = b.dataset.tab), draw())));
      host.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => set(K.fromPreset(b.dataset.preset))));
      host.querySelectorAll('[data-base]').forEach((b) => b.addEventListener('click', () => set(Object.assign({}, coat, { preset: null, base: b.dataset.base }))));
      host.querySelectorAll('[data-pattern]').forEach((b) => b.addEventListener('click', () => set(Object.assign({}, coat, { preset: null, pattern: b.dataset.pattern }))));
      host.querySelectorAll('[data-white]').forEach((b) => b.addEventListener('click', () => set(Object.assign({}, coat, { preset: null, white: b.dataset.white }))));
      const input = host.querySelector('#photoIn');
      if (input) input.addEventListener('change', () => input.files[0] && readPhoto(input.files[0]));
      const one = host.querySelector('#oneColour');
      if (one) one.addEventListener('click', () => ((ph.oneColour = true), runPhoto()));
      const cv = host.querySelector('#photoCv');
      if (cv) {
        paintPhoto(cv);
        cv.addEventListener('pointerdown', (e) => {
          const r = cv.getBoundingClientRect();
          if (ph.taps.length >= 2 || ph.oneColour) ((ph.taps = []), (ph.oneColour = false));
          ph.taps.push({ x: ((e.clientX - r.left) / r.width) * ph.w, y: ((e.clientY - r.top) / r.height) * ph.h });
          runPhoto();
        });
      }
      preview();
    }

    // Read the coat from the photo with the taps so far.
    function runPhoto() {
      const r = G.PhotoRead.analyze(ph.data, ph.w, ph.h, ph.taps, { oneColour: ph.oneColour });
      ph.mask = r.mask;
      ph.maskCv = null;
      const name = `<b>${esc(K.describe(r.coat))}</b>`;
      const done = ph.taps.length >= 2 || ph.oneColour;
      ph.msg =
        (!ph.taps.length ? `First guess: ${name}. Tap the fur for a better match.` : done ? `Matched: ${name}. Not quite right? Fine-tune it under “Mix your own”.` : `Matched: ${name}.`) +
        (r.notes.fallback ? ' <span class="muted">(Your cat was hard to separate from the background, so the area around your tap was used.)</span>' : '');
      set(r.coat);
    }

    // The photo, with the ignored background dimmed and numbered tap markers.
    function paintPhoto(cv) {
      const W = Math.min(300, (cv.parentElement.clientWidth || 300) - 8);
      const H = Math.round((W * ph.h) / ph.w);
      const dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      g.drawImage(ph.img, 0, 0, W, H);
      if (ph.mask) {
        if (!ph.maskCv) {
          ph.maskCv = document.createElement('canvas');
          ph.maskCv.width = ph.w;
          ph.maskCv.height = ph.h;
          const mg = ph.maskCv.getContext('2d');
          const im = mg.createImageData(ph.w, ph.h);
          for (let i = 0; i < ph.mask.length; i++) if (!ph.mask[i]) im.data.set([27, 23, 20, 150], i * 4);
          mg.putImageData(im, 0, 0);
        }
        g.imageSmoothingEnabled = true;
        g.drawImage(ph.maskCv, 0, 0, W, H);
      }
      ph.taps.forEach((t, i) => {
        const x = (t.x / ph.w) * W;
        const y = (t.y / ph.h) * H;
        g.beginPath();
        g.arc(x, y, 11, 0, Math.PI * 2);
        g.fillStyle = i ? '#fcf4ec' : '#ecbc44';
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = '#1b1714';
        g.stroke();
        g.fillStyle = '#1b1714';
        g.font = "900 13px 'M PLUS Rounded 1c', sans-serif";
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(i + 1), x, y + 1);
      });
    }
    function readPhoto(file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // A small copy (96 px on the long side, whole photo) is plenty for colours.
        const k = 96 / Math.max(img.width, img.height);
        const w = Math.max(8, Math.round(img.width * k));
        const h = Math.max(8, Math.round(img.height * k));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        ph = { img, w, h, data: g.getImageData(0, 0, w, h).data, taps: [], oneColour: false };
        runPhoto();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        ph = null;
        draw();
        const m = box.querySelector('.look-name');
        if (m) m.textContent = "Couldn't read that photo. Try another one.";
      };
      img.src = url;
    }
    draw();
  }

  // Use a new look everywhere: the cat, the wall portrait and the HUD face.
  function applyCoat(coat, accessory) {
    state.cat.coat = G.Coats.normalize(coat);
    if (accessory) state.cat.accessory = G.Coats.normalizeAccessory(accessory);
    G.CatArt.setCoat(state.cat.coat);
    G.CatArt.setAccessory(state.cat.accessory);
    scene.renderRoom(true, now());
    scene.refreshCat();
    lastMood = '';
    updateHUD();
    save(true);
  }

  function looksText() {
    const c = state.cat.coat;
    return c.preset === 'mochi' ? G.Profile.looks : G.Coats.describe(c);
  }

  // ---- Intro: the cat in its box -------------------------------------------------------
  // Shown to new players, and once per browser session to returning ones
  // (a session cookie, with sessionStorage as a fallback for file:// pages).

  function isNewSession() {
    let seen = false;
    try {
      seen = sessionStorage.getItem('mp.session') === '1';
    } catch {
      /* storage blocked */
    }
    return !seen && !document.cookie.split('; ').includes('mp_session=1');
  }
  function markSession() {
    try {
      sessionStorage.setItem('mp.session', '1');
    } catch {
      /* storage blocked */
    }
    document.cookie = 'mp_session=1; path=/; SameSite=Lax';
  }

  // The logo sits in the top ~30% and the button in the bottom ~20%.
  const INTRO_SAFE = { l: 0.06, r: 0.06, t: 0.3, b: 0.2 };

  function showIntro(isNew, onContinue) {
    introActive = true;
    document.body.classList.add('intro-mode');
    const ui = document.createElement('div');
    ui.className = 'intro-ui';
    ui.id = 'introUi';
    ui.innerHTML = `<div class="intro-logo">${G.Logo.wordmark()}</div><button class="btn primary big" id="introGo">${isNew ? 'Start adoption' : 'Continue'}</button>`;
    $('stage').append(ui);
    scene.startIntro(INTRO_SAFE);
    ui.querySelector('#introGo').addEventListener(
      'click',
      () => {
        G.Sound.unlock();
        sound('purr');
        ui.classList.add('hide');
        setTimeout(() => ui.remove(), 450);
        if (isNew) openPanel('adopt');
        else leaveIntro(onContinue);
      },
      { once: true }
    );
  }

  // Zoom out to the room; the cat hops out of the box.
  function leaveIntro(after) {
    introActive = false;
    document.body.classList.remove('intro-mode');
    scene.endIntro();
    lastMood = '';
    updateHUD();
    if (after) setTimeout(after, 2000);
  }

  // ---- The customisation panel ------------------------------------------------------------
  // 'adopt': name → look → collar & extras → Adopt! (new players, cat in its box)
  // 'look':  look → collar & extras → Save (Me → Change look, over the room)
  // Every change shows on the real cat straight away.

  let panel = null;
  const STEP_LABEL = { name: 'Name', look: 'Look', extras: 'Collar' };

  // The part of the scene the panel leaves free, for the camera.
  function panelSafe() {
    const sr = $('scene').getBoundingClientRect();
    if (!sr.width || !sr.height) return { l: 0.05, r: 0.05, t: 0.05, b: 0.05 };
    if (window.innerWidth >= 760) {
      const left = window.innerWidth - 16 - 390 - 16;
      return { l: 0.04, r: Math.max(0, (sr.right - left) / sr.width) + 0.03, t: 0.08, b: 0.08 };
    }
    const tall = panel && panel.el.classList.contains('tall');
    const top = window.innerHeight * (1 - (tall ? 0.92 : 0.58));
    return { l: 0.05, r: 0.05, t: 0.05, b: Math.max(0, (sr.bottom - top) / sr.height) + 0.03 };
  }
  function refocus() {
    if (scene.focus) scene.focus.safe = panelSafe();
  }

  function openPanel(mode) {
    const draft = {
      name: mode === 'adopt' ? '' : state.cat.name,
      coat: G.Coats.normalize(state.cat.coat),
      accessory: G.Coats.normalizeAccessory(state.cat.accessory),
    };
    const steps = mode === 'adopt' ? ['name', 'look', 'extras'] : ['look', 'extras'];
    let i = 0;
    const el = document.createElement('aside');
    el.className = 'adopt';
    el.setAttribute('aria-label', mode === 'adopt' ? 'Adopt your cat' : 'Change look');
    document.body.append(el);
    panel = { el, mode };
    if (mode === 'look') {
      document.body.classList.add('look-mode');
      scene.focus = { follow: true, lift: 56, spanW: 220, spanH: 170, safe: { l: 0.05, r: 0.05, t: 0.05, b: 0.05 } };
    } else scene.frameBox('custom');
    requestAnimationFrame(() => {
      el.classList.add('open');
      refocus();
    });
    // The stage grows while the bars fold away, so measure again once it settles.
    setTimeout(refocus, 650);

    // Show the draft on the real cat.
    const live = () => {
      G.CatArt.setCoat(draft.coat);
      G.CatArt.setAccessory(draft.accessory);
      scene.refreshCat();
    };

    function close() {
      el.classList.remove('open');
      setTimeout(() => el.remove(), 450);
      panel = null;
      document.body.classList.remove('look-mode');
      window.removeEventListener('resize', refocus);
    }
    window.addEventListener('resize', refocus);

    function finish() {
      if (mode === 'adopt') {
        const v = G.Interactions.validateName(draft.name);
        // First naming isn't a "rename": the cat has always been called this.
        state.cat.name = v.name;
        state.cat.nameHistory = [{ name: v.name, from: state.createdAt }];
        state.named = true;
        applyCoat(draft.coat, draft.accessory);
        close();
        leaveIntro(() => {
          sound('meow');
          scene.react({ say: 'Mrrp!', eyes: 'happy', hearts: 2 });
          toast(`Welcome home, ${v.name}! Tap ${v.name} to pet them — try the head, chin… and the belly, if you dare.`, 7000);
        });
      } else {
        applyCoat(draft.coat, draft.accessory);
        close();
        scene.focus = null;
        scene.react({ say: 'Mrrp?', eyes: 'happy', hearts: 1 });
      }
    }
    function cancel() {
      G.CatArt.setCoat(state.cat.coat);
      G.CatArt.setAccessory(state.cat.accessory);
      scene.refreshCat();
      close();
      scene.focus = null;
    }

    function render() {
      const k = steps[i];
      const last = i === steps.length - 1;
      const head = `<div class="adopt-steps">${steps.map((s, j) => `<span class="${j === i ? 'on' : j < i ? 'done' : ''}">${j + 1}. ${STEP_LABEL[s]}</span>`).join('')}</div>`;
      let body = '';
      if (k === 'name') {
        body = `<h2>Name your new friend</h2><p class="small muted">It goes on their box. You can rename them any time.</p>
          <input id="adoptName" maxlength="40" autocomplete="off" value="${esc(draft.name)}" placeholder="${esc(G.Profile.defaultName)}" aria-label="Cat name"><p class="error" id="adoptErr"></p>`;
      } else if (k === 'look') {
        body = `<h2>What do they look like?</h2><div id="look"></div>`;
      } else {
        const A = draft.accessory;
        body =
          `<h2>Collar &amp; extras</h2><p class="small muted">Optional, and you can change them later.</p>` +
          `<p class="look-label">Collar</p><div class="swatches">${G.Coats.COLLARS.map((c) => `<button type="button" class="sw ${c.hex ? '' : 'sw-none'} ${A.collar === c.id ? 'on' : ''}" data-collar="${c.id}" style="--c:${c.hex || '#fcfcfc'}" title="${c.name}" aria-label="${c.name}"></button>`).join('')}</div>` +
          `<p class="look-label">Extra</p><div class="row center">${G.Coats.EXTRAS.map((x) => `<button type="button" class="chip ${A.extra === x.id ? 'on' : ''}" data-extra="${x.id}">${esc(x.name)}</button>`).join('')}</div>`;
      }
      const back = i > 0 ? '<button type="button" class="btn" id="pBack">Back</button>' : mode === 'look' ? '<button type="button" class="btn" id="pCancel">Cancel</button>' : '<span></span>';
      const next = last ? `<button type="button" class="btn primary" id="pNext">${mode === 'adopt' ? 'Adopt!' : 'Save look'}</button>` : '<button type="button" class="btn primary" id="pNext">Next</button>';
      el.innerHTML = `${head}<div class="adopt-body">${body}</div><div class="adopt-foot">${back}${next}</div>`;
      el.classList.toggle('tall', false);

      if (k === 'name') {
        const input = el.querySelector('#adoptName');
        input.addEventListener('input', () => {
          draft.name = input.value;
          scene.setLabel(input.value.trim());
        });
        input.addEventListener('keydown', (e) => e.key === 'Enter' && el.querySelector('#pNext').click());
        setTimeout(() => input.focus(), 350);
      } else if (k === 'look') {
        lookPicker(el, draft.coat, (c) => ((draft.coat = c), live()), {
          onTab: (tab) => {
            el.classList.toggle('tall', tab === 'photo');
            refocus();
          },
        });
      } else {
        el.querySelectorAll('[data-collar]').forEach((b) => b.addEventListener('click', () => ((draft.accessory = Object.assign({}, draft.accessory, { collar: b.dataset.collar })), live(), render())));
        el.querySelectorAll('[data-extra]').forEach((b) => b.addEventListener('click', () => ((draft.accessory = Object.assign({}, draft.accessory, { extra: b.dataset.extra })), live(), render())));
      }
      const bb = el.querySelector('#pBack');
      if (bb) bb.addEventListener('click', () => ((i -= 1), render()));
      const cb = el.querySelector('#pCancel');
      if (cb) cb.addEventListener('click', cancel);
      el.querySelector('#pNext').addEventListener('click', () => {
        if (k === 'name') {
          if (!draft.name.trim()) draft.name = G.Profile.defaultName;
          const v = G.Interactions.validateName(draft.name);
          if (!v.ok) {
            el.querySelector('#adoptErr').textContent = v.error;
            return;
          }
          draft.name = v.name;
          scene.setLabel(v.name);
        }
        if (last) return finish();
        i += 1;
        render();
      });
      refocus();
    }
    render();
  }

  function openLookPanel() {
    closeModal();
    openPanel('look');
  }

  function showAway(from, to, force) {
    if (!force && to - from < AWAY_MIN) return;
    const sum = G.Journal.awaySummary(state, from, to);
    if (!sum) return;
    const gifts = state.room.gifts.length;
    const mood = G.Interactions.moodOf(state);
    const moodLine = {
      hungry: '{name} is a little peckish — the food bowl could use a refill.',
      grumpy: '{name} seems a bit grumpy. Some play or treats would help.',
      sleepy: '{name} is pretty sleepy right now.',
      happy: '{name} is in a great mood.',
      content: '{name} seems content.',
    }[mood];
    openModal(
      `<div class="away"><div class="portrait"><svg viewBox="-56 -56 112 92">${G.CatArt.renderHead('away', 'happy')}</svg></div>
       <h2>While you were away…</h2><p class="small">${esc(G.Clock.formatDuration(sum.duration))} · ${esc(state.cat.name)}…</p>
       <ul class="away-list">${sum.lines.map((l) => `<li><span>${l.icon}</span>${esc(nm(l.text))}</li>`).join('')}</ul>
       ${gifts ? `<p class="gift-note">🎁 There ${gifts > 1 ? `are ${gifts} gifts` : 'is a gift'} on the floor. Tap to collect!</p>` : ''}
       <p class="small">${esc(nm(moodLine))}</p>
       <button class="btn primary" data-close>Say hi</button></div>`
    );
  }

  // ---- Modal ----------------------------------------------------------------------------

  let modalOpen = false;
  let modalLocked = false;

  // replace: swap content of the open modal (menus that re-render)
  function openModal(html, onOpen, replace, locked) {
    if (modalOpen && !replace) {
      modalQueue.push([html, onOpen, locked]);
      return;
    }
    modalOpen = true;
    modalLocked = !!locked;
    const box = $('modalBox');
    box.innerHTML = html;
    $('modal').hidden = false;
    if (onOpen) onOpen(box);
  }

  function closeModal() {
    // The naming card stays open until the cat has a name.
    if (modalLocked && !(state && state.named)) return;
    modalLocked = false;
    modalOpen = false;
    $('modal').hidden = true;
    $('modalBox').innerHTML = '';
    const next = modalQueue.shift();
    if (next) openModal(next[0], next[1], false, next[2]);
  }

  G.App = { boot, get state() { return state; }, timeTravel };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(globalThis.CatGame = globalThis.CatGame || {});
