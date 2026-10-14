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
  let gesture = null; // a touch that began on the room (a tap, or a drag to look around)
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
  const COIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ecbc44" stroke="#1b1714" stroke-width="2.2"/><circle cx="12" cy="12" r="7" fill="none" stroke="#c99a2c" stroke-width="1.4"/><ellipse cx="12" cy="14" rx="2.6" ry="2.1" fill="#8a5a1a"/><circle cx="8.8" cy="10.6" r="1.2" fill="#8a5a1a"/><circle cx="10.9" cy="8.9" r="1.2" fill="#8a5a1a"/><circle cx="13.1" cy="8.9" r="1.2" fill="#8a5a1a"/><circle cx="15.2" cy="10.6" r="1.2" fill="#8a5a1a"/></svg>';
  const ICONS = {
    coin: COIN_SVG,
    close: I('<path d="M6 6l12 12M18 6L6 18" stroke-width="3"/>'),
    feed: I('<path d="M2.5 11h19a9.5 7 0 0 1-19 0z" fill="#f2a28f"/><path d="M7 8.6c1.2-1.4 2.6-1.4 3.8 0M12.6 7.6c1.2-1.4 2.6-1.4 3.8 0"/>'),
    treat: I('<path d="M2.5 12c3-5.5 9.5-6.5 13.5-2l4.5-3.5v11L16 14c-4 4.5-10.5 3.5-13.5-2z" fill="#f3c66b"/><circle cx="7" cy="11.2" r=".9" fill="currentColor"/>'),
    mouse: I('<path d="M3 20c6 1 12-1 15-6" fill="none"/><path d="M6 17c-1-5 2-8 6-8s7 3 6 7c-3 3-9 3-12 1z" fill="#b8b4ad"/><circle cx="9" cy="8" r="2.4" fill="#f4accc"/><circle cx="17.5" cy="15" r=".9" fill="currentColor"/>'),
    launcher: I('<rect x="3" y="10" width="11" height="7" rx="2.5" fill="#ff6f91"/><path d="M13 11.5l7-3.5v9.5l-7-3z" fill="#ffd7e0"/><circle cx="7" cy="19.5" r="2.2" fill="#fffdf6"/><circle cx="11.5" cy="19.5" r="1.6" fill="#fffdf6"/>'),
    bubbles: I('<circle cx="9" cy="14.5" r="6" fill="#e8f6fc"/><circle cx="17.5" cy="6.5" r="3.2" fill="#e8f6fc"/><path d="M6.5 13a3 3 0 0 1 2.4-2.2"/>'),
    play: I('<path d="M3 21 14 10"/><path d="M14 10c1-5 7-7 7-7s-1 6-6 7.5" fill="#7fb4d9"/><path d="M14 10c-1 4 1 7 1 7" fill="none"/>'),
    paw: I('<ellipse cx="12" cy="16" rx="5" ry="4" fill="#fffdf6"/><circle cx="5.5" cy="10.5" r="2" fill="#fffdf6"/><circle cx="9.5" cy="6.5" r="2" fill="#fffdf6"/><circle cx="14.5" cy="6.5" r="2" fill="#fffdf6"/><circle cx="18.5" cy="10.5" r="2" fill="#fffdf6"/>'),
    call: I('<path d="M3.5 4.5h17v11H10l-5 4v-4H3.5z" fill="#fffdf6"/><path d="M8.5 10h.01M12 10h.01M15.5 10h.01" stroke-width="2.8"/>'),
    room: I('<path d="M4 20v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6" fill="#e2b078"/><path d="M2.5 15.5h3v4.5M21.5 15.5h-3v4.5M6.5 11V8a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3"/>'),
    photo: I('<rect x="2.5" y="7" width="19" height="13.5" rx="3" fill="#9fd9cf"/><path d="M8 7l1.8-3h4.4L16 7"/><circle cx="12" cy="13.6" r="3.6" fill="#fffdf6"/>'),
    updates: I('<path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z" fill="#ecbc44"/><path d="M19 3.5v3M17.5 5h3" stroke-width="1.8"/>'),
    palette: I('<path d="M12 3a9 9 0 1 0 0 18c1.6 0 2-1.2 1.4-2.2-.7-1.2 0-2.6 1.5-2.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" fill="#fffdf6"/><circle cx="7.5" cy="11" r="1.2" fill="#d44c34"/><circle cx="10" cy="7.2" r="1.2" fill="#ecbc44"/><circle cx="14.5" cy="7.2" r="1.2" fill="#8cac64"/>'),
    ball: I('<circle cx="12" cy="12" r="9" fill="#fffdf6"/><path d="M4 8.5c4 1 12 1 16 0M4 15.5c4-1 12-1 16 0"/>'),
    smile: I('<circle cx="12" cy="12" r="9" fill="#fffdf6"/><path d="M8.5 14.5c1.9 2 5.1 2 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.8"/>'),
    trophy: I('<path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#ecbc44"/><path d="M7 6H4c0 3 1.2 4.5 3 4.8M17 6h3c0 3-1.2 4.5-3 4.8M12 14v4M8 20h8"/>'),
    cloud: I('<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.6 4.2 4.2 0 0 1 17.5 18z" fill="#fffdf6"/>'),
    note: I('<path d="M5 4h14v11l-5 5H5z" fill="#fff3c4"/><path d="M14 20v-5h5M8.5 9h7M8.5 12.5h4"/>'),
    sound: I('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fffdf6"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
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
    G.CatArt.setTail(state.cat.tail);
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
      // ball launcher: the cat decides what to do about each shot, by how it feels
      launch: () => {
        const o = G.Interactions.launchDecision(state, now());
        ach('launch');
        if (o.kind === 'ignore') ach('launchIgnore');
        return o;
      },
      fetched: (kept) => {
        ach('fetch');
        if (kept) ach('fetchKept');
      },
      bubble: () => ach('bubblePop'),
      mouseCatch: () => ach('mouseCatch'),
    });
    scene.renderRoom(true, t);
    scene.teleport(state.activity);
    lastDay = G.Clock.dayKey(t);

    buildToolbar();
    bindInput();
    bindDecor();
    updateHUD();

    // A brand-new adoption has nothing to catch up on; everyone else sees the newest updates once.
    if (!state.named) G.Updates.markSeen(state);
    const welcomeBack = () => {
      showAway(awayFrom, t);
      visitReward(res);
      if (G.Updates.pending(state)) showUpdates(true);
    };
    if (withIntro) showIntro(!state.named, welcomeBack);
    else welcomeBack();
    // First paint without transitions, so the intro doesn't animate the HUD folding away.
    setTimeout(() => document.body.classList.remove('no-anim'), 60);
    state.lastSeenAt = t;
    save(true);

    checkWeather();
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
    const lightsBefore = state.settings.lights;
    G.Sim.advance(state, t, { live: true });
    if (state.activity !== before) onActivityChanged(before);
    if (state.settings.lights !== lightsBefore) {
      // lights left off overnight come back on at dawn
      scene.updateLighting(t, true);
      toast(nm('The sun came up and the lights came back on.'));
    }

    if (play && play.joined && state.stats.energy < 8) finishPlay(true);

    const day = G.Clock.dayKey(t);
    if (day !== lastDay) {
      lastDay = day;
      G.Journal.finalize(state, t);
      visitReward(G.Progression.dailyVisit(state, t));
    }
    // Feeding lives on the bowl now: say so once, when nothing else is going on.
    if (!state.flags.bowlTip && state.named && !introActive && !panel && !modalOpen && performance.now() > 8000) {
      state.flags.bowlTip = true;
      toast(nm('Tap things in the room: the food bowl to feed {name}, the toy basket to play, the diary on the shelf.'), 7000);
    } else if (state.flags.bowlTip && !state.flags.inviteTip && state.named && !introActive && !panel && !modalOpen && !decor && performance.now() > 24000) {
      state.flags.inviteTip = true;
      toast(nm('Tap a bed, box or the chair to invite {name} over (they decide). Tap the lamp to switch the lights.'), 7000);
    }
    G.Notes.today(state, t); // the day's note goes up, read or not
    trackWorld(t);
    flushAchievements();
    checkWeather();
    if (state.named && !introActive && !panel && !modalOpen && !decor && !play && !wcfg().asked && !wcfg().place && performance.now() > 12000) openWeatherAsk();
    scene.renderRoom(false, t);
    scene.updateLighting(t);
    updateHUD();
    save();
  }

  function frame(ts) {
    const dt = lastFrame ? Math.min(0.1, (ts - lastFrame) / 1000) : 0;
    lastFrame = ts;
    if (scene && !document.hidden) scene.frame(dt, ts);
    if (menuOpen) positionMenu();
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
    if (a.id === 'litter' && !state.flags.litterTip) {
      state.flags.litterTip = true;
      toast(nm('{name} is using the litter box. Tap the box to scoop it afterwards.'), 6500);
    }
    if (prev && prev.id === 'litter') setTimeout(() => scene.react({ say: 'Mrrp.', eyes: 'happy' }), 600);
    if (prev && prev.id === 'vomit') {
      scene.renderRoom(true, now());
      if (!state.flags.vomitTip) {
        state.flags.vomitTip = true;
        toast(nm('{name} was sick after the cat grass (it happens). Tap the puddle to clean it up.'), 7000);
      }
    }
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
      case 'grass':
        setTimeout(() => sound('crunch'), 1800);
        break;
      case 'vomit':
        setTimeout(() => scene.say('hrk… hrk…', 1800), 700);
        break;
      case 'knock':
        setTimeout(() => scene.say('…', 1500), 1200);
        break;
      default:
    }
    if (prev && prev.id === 'nap' && a.id !== 'nap' && Math.random() < 0.4) setTimeout(() => scene.say('*yawn*', 1500), 400);
  }

  // ---- HUD --------------------------------------------------------------------------------

  const MOOD_FACE = { happy: ['happy', 'normal'], content: ['open', 'normal'], sleepy: ['half', 'normal'], grumpy: ['angry', 'frown'], hungry: ['open', 'open'] };
  let lastMood = '';

  // What the caption says while you are playing.
  function playCaption() {
    if (play.toy === 'launcher') return play.joined ? 'Drag to aim, let go to launch the ball. Will {name} fetch?' : 'Launch a ball and see what {name} thinks…';
    if (play.toy === 'bubbles') return play.joined ? 'Wave the wand! {name} is eyeing the bubbles.' : 'Wave the wand to tempt {name}…';
    if (play.toy === 'mouse') return play.joined ? '{name} is stalking the mouse. Hold still, then yank it!' : 'Skitter the mouse to tempt {name}…';
    return play.joined ? '{name} is in hunting mode! Wiggle the toy.' : 'Wiggle the toy to tempt {name}…';
  }

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
    $('bondRow').title = p.max ? 'Bond: best friends! See what you unlocked' : `Bond Lv ${p.level}: ${Math.floor(p.into)}/${p.need} to the next level. See what you can unlock`;
    $('clockTime').textContent = G.Clock.formatTime(t);
    const seasons = scene ? scene.seasons : [];
    const wk = G.Weather.current(state);
    const last = wcfg().last;
    $('clockPhase').textContent = G.Clock.PHASE_LABEL[G.Clock.phaseAt(t)] + (wk ? ' · ' + G.Weather.LABEL[wk] : '') + (seasons.length ? ' · ' + seasons.map((x) => G.Clock.SEASON_LABEL[x]).join(' & ') : '');
    $('clockPhase').title = wk && last && !wcfg().preview && last.temp !== null ? `${last.temp}°C outside` : '';
    setCaption(play ? nm(playCaption()) : nm(G.Sim.describe(state)));
    const b = state.stats.bond;
    if (shownBond !== null && b - shownBond >= 0.5) floatUp($('bondRow'), `+${half(b - shownBond)} ♥`, 'bond');
    shownBond = b;
    const c = state.coins || 0;
    if (shownCoins !== null && c !== shownCoins) floatUp($('coinRow'), `${c > shownCoins ? '+' : ''}${c - shownCoins} 🪙`, c > shownCoins ? 'coin' : 'spent');
    shownCoins = c;
    $('coinCount').textContent = c;
    $('coinRow').setAttribute('aria-label', `${c} cat coin${c === 1 ? '' : 's'}: open the gachapon`);
    $('muteBtn').innerHTML = state.settings.muted ? ICONS.soundOff : ICONS.soundOn;
    $('muteBtn').setAttribute('aria-label', state.settings.muted ? 'Sound off' : 'Sound on');
    if (tipId) $('meterTip').innerHTML = meterTipHtml(tipId);
    updateFollowBtn();
  }

  // The line under the room always says what the cat is doing.
  function setCaption(text) {
    const el = $('status');
    if (el.textContent !== text) el.textContent = text;
  }

  // Hover (or tap) a meter to read its exact level. Energy also says how long until it is full.
  const METERS = {
    mFull: { name: 'Tummy', get: (st) => st.fullness },
    mEnergy: { name: 'Energy', get: (st) => st.energy },
    mHappy: { name: 'Happiness', get: (st) => st.happiness },
  };
  let tipId = null;
  let tipTimer = 0;

  function minutesText(m) {
    m = Math.max(1, Math.round(m));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }

  function meterTipHtml(id) {
    const st = state.stats;
    const v = Math.round(METERS[id].get(st));
    let more = '';
    if (id === 'mEnergy') {
      if (st.energy >= 99.5) more = 'Fully rested';
      else {
        const rate = G.Sim.energyRate(state, state.activity, true);
        const left = 100 - st.energy;
        if (rate > 0) more = `Full in about ${minutesText(left / rate)}`;
        else {
          // Awake: it only fills while napping, so say how long a nap would take.
          const nap = G.Sim.energyRate(state, { id: 'nap' }, true);
          more = `Fills while napping: about ${minutesText(left / nap)} of sleep`;
        }
      }
    }
    return `${METERS[id].name} ${v}%${more ? `<small>${more}</small>` : ''}`;
  }

  function positionMeterTip() {
    const tip = $('meterTip');
    const meter = $(tipId).closest('.meter');
    const host = tip.offsetParent || tip.parentElement;
    const hr = host.getBoundingClientRect();
    const mr = meter.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const x = Math.max(half + 4, Math.min(hr.width - half - 4, mr.left - hr.left + mr.width / 2));
    tip.style.left = x + 'px';
  }

  function showMeterTip(id, ms) {
    tipId = id;
    const tip = $('meterTip');
    tip.innerHTML = meterTipHtml(id);
    tip.hidden = false;
    positionMeterTip();
    clearTimeout(tipTimer);
    tipTimer = ms ? setTimeout(hideMeterTip, ms) : 0;
  }

  function hideMeterTip() {
    clearTimeout(tipTimer);
    tipTimer = 0;
    tipId = null;
    $('meterTip').hidden = true;
  }

  function bindMeterTips() {
    for (const id of Object.keys(METERS)) {
      const m = $(id).closest('.meter');
      m.tabIndex = 0;
      m.addEventListener('mouseenter', () => {
        if (!matchMedia('(hover: none)').matches) showMeterTip(id);
      });
      m.addEventListener('mouseleave', hideMeterTip);
      m.addEventListener('focus', () => showMeterTip(id));
      m.addEventListener('blur', hideMeterTip);
      // No hover on a touch screen: a tap shows it for a few seconds.
      m.addEventListener('click', () => (tipId === id && !tipTimer ? null : showMeterTip(id, 3500)));
    }
  }

  function setMeter(id, v) {
    const b = $(id);
    b.style.width = Math.round(v) + '%';
    b.classList.toggle('low', v < 25);
  }

  // ---- Feedback ------------------------------------------------------------------------------

  function sound(name, arg) {
    if (state.settings.muted) return;
    const S = G.Sound;
    if (name === 'purr') S.purr(2.4);
    else if (S[name]) S[name](arg);
  }

  function toast(text, ms) {
    if (!text) return;
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || Math.max(3000, text.length * 55));
  }

  // ---- Achievements ----------------------------------------------------------------------

  // Count something the player did (the cat's own doings are counted from the log).
  function ach(key, n) {
    G.Achievements.bump(state, key, n, now());
  }

  // Announce the achievements that have just unlocked, a little after whatever caused them.
  let achBusy = false;
  function flushAchievements() {
    if (achBusy || !state.achQueue || !state.achQueue.length) return;
    const got = G.Achievements.claim(state, now());
    const list = got.list;
    if (!list.length) return;
    achBusy = true;
    if (got.levelUp) setTimeout(() => celebrate(got), 2400 + list.length * 4600);
    list.forEach((d, i) =>
      setTimeout(() => {
        const rw = G.Achievements.rewardOf(d);
        toast(`${d.icon} Achievement unlocked: ${d.name}  (+${rw.bond} ♥, +${rw.coins} coin${rw.coins > 1 ? 's' : ''})`, 4200);
        sound('chime');
        scene.renderRoom(true, now()); // the diary shelf starts glowing
        if (i === list.length - 1) setTimeout(() => (achBusy = false), 4400);
      }, 2400 + i * 4600)
    );
    save(true);
  }

  // Things that depend on the time, the weather and the season rather than on an action.
  function trackWorld(t) {
    const d = new Date(t);
    const h = d.getHours() + d.getMinutes() / 60;
    const day = G.Clock.dayKey(t);
    const f = state.flags;
    if (h < 4 && f.nightDay !== day) {
      f.nightDay = day;
      ach('nightDays');
    }
    const rise = (G.Weather.sunFor(state) || { rise: 6.2 }).rise;
    if (h >= rise - 0.75 && h < rise + 0.5 && f.earlyDay !== day) {
      f.earlyDay = day;
      ach('earlyDays');
    }
    if (scene.seasons && scene.seasons.length) G.Achievements.mark(state, 'seasonSeen', t);
    const w = wcfg();
    if (w.place && w.last && !w.preview && ['rain', 'storm', 'fog'].includes(w.last.kind)) G.Achievements.mark(state, 'wx:' + w.last.kind, t);
    G.Achievements.evaluate(state, t); // time together, bond level
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

  // The first check-in of the day: bond and a coin, more for a streak of days in a row.
  function visitReward(res) {
    if (!res) return;
    const bond = 5 + (res.streakBonus || 0);
    const coins = res.coins || 0;
    setTimeout(() => toast(res.streak > 1 ? `🔥 ${res.streak} days in a row! +${bond} ♥ and +${coins} cat coin${coins > 1 ? 's' : ''}` : `Welcome back! +${bond} ♥ and +${coins} cat coin${coins > 1 ? 's' : ''}`, 5000), 1200);
    celebrate(res);
  }

  // A little "+1 ♥" (or "+2" coins) that floats up from the HUD when it changes.
  function floatUp(host, text, cls) {
    if (!host) return;
    const f = document.createElement('span');
    f.className = 'hud-float ' + (cls || '');
    f.textContent = text;
    host.append(f);
    setTimeout(() => f.remove(), 1400);
  }
  const half = (n) => String(Math.round(n * 2) / 2);

  let shownBond = null;
  let shownCoins = null;

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
       <p class="small">+${G.Progression.LEVEL_COINS} cat coins for the gachapon by the TV.</p>
       <button class="btn primary" data-close>Yay!</button></div>`
    );
  }

  // ---- Toolbar & input ---------------------------------------------------------------------

  function buildToolbar() {
    const btns = [
      ['call', 'Call', callCat],
      ['room', 'Room', openRoom],
      ['photo', 'Photo', takePhoto],
      ['updates', 'Updates', () => showUpdates(false)],
    ];
    const tb = $('toolbar');
    tb.innerHTML =
      `<div class="fab-list">${btns
        .map(([icon, label]) => `<button class="fab-opt" data-tool="${icon}"><span>${label}</span><i>${ICONS[icon]}</i></button>`)
        .join('')}</div>` +
      `<button class="fab-main" id="fabMain" aria-expanded="false" aria-label="Actions">${ICONS.paw}${ICONS.close}</button>`;
    $('fabMain').addEventListener('click', () => {
      G.Sound.unlock();
      sound('pop');
      toggleFab();
    });
    for (const [icon, , fn] of btns) tb.querySelector(`[data-tool="${icon}"]`).addEventListener('click', () => {
      G.Sound.unlock();
      closeFab();
      if (icon !== 'photo') sound('pop');
      fn();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeFab();
    });
    $('mFullIco').innerHTML = ICONS.tummy;
    $('mEnergyIco').innerHTML = ICONS.energy;
    $('mHappyIco').innerHTML = ICONS.happy;
    $('bondIco').innerHTML = ICONS.heart;
    bindMeterTips();
    $('muteBtn').addEventListener('click', () => {
      state.settings.muted = !state.settings.muted;
      ach('muteToggle');
      G.Sound.setMuted(state.settings.muted);
      if (!state.settings.muted) {
        G.Sound.unlock();
        sound('pop');
      }
      updateHUD();
      save(true);
    });
    $('nameBtn').addEventListener('click', openSettings);
    const bondRow = $('bondRow');
    const showBond = (e) => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      closeFab();
      sound('pop');
      openBond();
    };
    bondRow.addEventListener('click', showBond);
    bondRow.addEventListener('keydown', showBond);
    // The coins under it open the gachapon.
    $('coinIco').innerHTML = ICONS.coin;
    const showGacha = (e) => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      G.Sound.unlock();
      closeFab();
      sound('pop');
      learn('gacha');
      openGacha();
    };
    $('coinRow').addEventListener('click', showGacha);
    $('coinRow').addEventListener('keydown', showGacha);
    $('doneBtn').addEventListener('click', () => finishPlay(false));
  }

  function toggleFab() {
    const open = !$('toolbar').classList.contains('open');
    $('toolbar').classList.toggle('open', open);
    $('fabMain').setAttribute('aria-expanded', String(open));
  }

  function closeFab() {
    $('toolbar').classList.remove('open');
    $('fabMain').setAttribute('aria-expanded', 'false');
  }

  let lastTvTap = 0;

  // Switch the TV off or on. Off: the screen goes dark, the cat stops "supervising" it.
  function toggleTv() {
    const off = state.settings.tv !== 'off';
    state.settings.tv = off ? 'off' : 'on';
    if (off) ach('tvOff');
    sound('tvClick');
    if (off && state.activity.id === 'supervise') {
      G.Sim.setActivity(state, now(), 'sit', 'desk');
      scene.onActivity(state.activity);
    }
    scene.paintTv();
    scene.updateLighting(now(), true);
    toast(off ? 'TV off.' : 'TV on.', 1400);
    updateHUD();
    save(true);
  }

  // Tap the TV: new channel. Fish, birds and mice make a watching cat keener to come and sit by it.
  function flipTv() {
    ach('tvFlip');
    const ch = scene.changeChannel();
    sound('tvClick');
    const interesting = ['fish', 'birds', 'mouse'].includes(ch);
    const prev = state.activity;
    const r = G.Interactions.invite(state, now(), 'desk', { quiet: true, prefer: 'supervise', boost: interesting ? 0.25 : 0 });
    apply(r, prev);
    if (interesting && state.activity.spot !== 'desk' && !G.Sim.isSleeping(state) && !r.thought && Math.random() < 0.6) {
      setTimeout(() => scene.react({ say: ch === 'birds' ? 'Ek ek ek!' : '!', eyes: 'wide' }), 450);
    }
  }

  function bindInput() {
    const svg = $('scene');
    svg.addEventListener('pointerdown', (e) => {
      G.Sound.unlock();
      if (decor) return; // arranging the room has its own handler
      const hadMenu = closeMenu();
      if (e.pointerType !== 'mouse') setHot(e.target);
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
      if (e.target.closest('#cat')) {
        petting = { x: e.clientX, y: e.clientY, dist: 0, last: 0 };
        svg.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      // Anywhere else: a tap uses what's under it (gift, cup, TV, litter box), and
      // a drag looks around the room when it doesn't all fit on screen.
      gesture = { x: e.clientX, y: e.clientY, lastX: e.clientX, moved: false, target: e.target, hadMenu };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (decor) return;
      if (introActive) return scene.lookAtPoint(scene.toScene(e.clientX, e.clientY));
      if (play) {
        if (e.pointerType === 'mouse' || e.buttons) scene.moveToy(scene.toScene(e.clientX, e.clientY));
        return;
      }
      if (gesture) {
        if (!gesture.moved && Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 8) {
          gesture.moved = true;
          scene.dragging = true;
        }
        if (gesture.moved) {
          scene.panBy((e.clientX - gesture.lastX) * (scene.cam.w / svg.getBoundingClientRect().width));
          updateFollowBtn();
        }
        gesture.lastX = e.clientX;
        return;
      }
      if (!petting) {
        if (e.pointerType === 'mouse') setHot(e.target);
        svg.style.cursor = e.target.closest('#cat') ? 'grab' : e.target.closest('.act') ? 'pointer' : '';
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
        doPet(scene.toScene(e.clientX, e.clientY), e.clientX, e.clientY);
      }
    });
    const end = (e) => {
      if (play) scene.releaseToy();
      if (petting && !petting.stroked && petting.dist < 14) doPet(scene.toScene(e.clientX, e.clientY), e.clientX, e.clientY);
      petting = null;
      if (gesture) {
        const g = gesture;
        gesture = null;
        scene.dragging = false;
        if (!g.moved) tapRoom(g.target, g.hadMenu);
      }
      if (e.pointerType !== 'mouse') setTimeout(() => setHot(null), 280);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !petting && !gesture) setHot(null);
    });
    // Keyboard: the bowl, toy basket, diary and portrait are the way in, so they take Tab and Enter.
    svg.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.act[tabindex]')) {
        e.preventDefault();
        tapRoom(e.target, false);
      }
    });
    const touching = (on) => document.body.classList.toggle('touching', on);
    svg.addEventListener('pointerdown', () => touching(true));
    document.addEventListener('pointerup', () => touching(false));
    document.addEventListener('pointercancel', () => touching(false));
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#thingMenu') && !e.target.closest('#scene')) closeMenu();
    });
    svg.addEventListener('pointercancel', () => {
      petting = null;
      gesture = null;
      scene.dragging = false;
    });
    $('followBtn').addEventListener('click', () => {
      scene.followCat();
      updateFollowBtn();
    });
    $('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && closeMenu()) return;
      if (e.key === 'Escape' && decor && $('modal').hidden) return endDecorate();
      if (e.key === 'Escape' && !$('modal').hidden && state.named) closeModal();
      if (photoView >= 0 && !$('modal').hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        openPhoto(photoView + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });
  }

  // Once you've used something, its dotted guide ring stops showing.
  function learn(key) {
    const L = state.flags.learned || (state.flags.learned = {});
    if (L[key]) return;
    L[key] = true;
    save(true);
    scene.renderRoom(true, now());
  }

  // A tap (not a drag) on something in the room.
  function tapRoom(target, hadMenu) {
    closeFab();
    if (target.closest('.bowl')) {
      learn('bowl');
      if (!hadMenu) openFeedMenu();
      return;
    }
    if (target.closest('.toys')) {
      if (!hadMenu) openPlayMenu();
      return;
    }
    if (target.closest('[data-act="window"]')) ach('windowTap');
    const item = target.closest('.item');
    if (item) {
      const prev = state.activity;
      apply(G.Interactions.invite(state, now(), item.getAttribute('data-spot')), prev);
      return;
    }
    if (target.closest('.lamp')) {
      apply(G.Interactions.setLights(state, now(), state.settings.lights !== 'off'));
      scene.updateLighting(now(), true);
      return;
    }
    if (target.closest('.gacha')) return void (sound('pop'), learn('gacha'), openGacha());
    if (target.closest('.note')) return void (sound('pop'), learn('note'), openNote());
    if (target.closest('.diary')) return void (sound('pop'), learn('diary'), ach('diaryOpen'), openBook('diary'));
    if (target.closest('.portrait')) return void (sound('pop'), openSettings());
    const gift = target.closest('.gift');
    if (gift) return collectGift(Number(gift.getAttribute('data-gift')));
    if (target.closest('.cup')) {
      if (state.room.cupOnFloor) ach('cupBack');
      apply(G.Interactions.pickUpCup(state, now()));
      scene.renderRoom(true, now());
      return;
    }
    if (target.closest('.tv-power')) return toggleTv();
    if (target.closest('.tv')) {
      // tap: next channel (or switch on); a quick double tap switches it off
      const ms = performance.now();
      const dbl = ms - lastTvTap < 380;
      lastTvTap = ms;
      if (state.settings.tv === 'off' || dbl) return toggleTv();
      return flipTv();
    }
    const puddle = target.closest('.vomit');
    if (puddle) {
      learn('vomit');
      apply(G.Interactions.cleanVomit(state, now(), Number(puddle.getAttribute('data-vomit'))));
      scene.renderRoom(true, now());
      return;
    }
    if (target.closest('.litter')) {
      learn('litter');
      apply(G.Interactions.scoop(state, now()));
      scene.renderRoom(true, now());
    }
  }

  // The "Follow cat" button shows while the player has dragged the camera away.
  function updateFollowBtn() {
    const b = $('followBtn');
    if (!b) return;
    b.hidden = scene.userPan == null || introActive || !!play || !!decor;
    b.querySelector('span').textContent = `Follow ${state.cat.name}`;
  }

  function doPet(p, clientX, clientY) {
    const t = now();
    const ms = performance.now();
    while (petTimes.length && ms - petTimes[0] > 30000) petTimes.shift();
    petTimes.push(ms);
    // Tail, paws and ears are parts of the drawing; the rest is worked out from where on the body.
    const zone = scene.zoneAtClient(clientX, clientY) || scene.zoneAt(p);
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

  function callCat() {
    const prev = state.activity;
    toast(`"${state.cat.name}!"`, 1200);
    setTimeout(() => apply(G.Interactions.call(state, now()), prev), 700);
  }

  // ---- Things you can tap in the room ------------------------------------------------------
  // Whatever is under the pointer glows. A tap on the food bowl opens a small menu right
  // above it: the foods, and a quick treat.

  let hotKey = null;
  function setHot(target) {
    const svg = $('scene');
    const node = target && target.closest ? target.closest('.act, #cat') : null;
    const key = node ? (node.id === 'cat' ? 'cat' : node.getAttribute('data-act')) : null;
    if (introActive || play || decor) return setHot.clear();
    if (key === hotKey && (key === null || node.classList.contains('hot'))) return;
    setHot.clear();
    hotKey = key;
    if (!key) return;
    if (key === 'cat') node.classList.add('hot');
    else svg.querySelectorAll(`[data-act="${key}"]`).forEach((n) => n.classList.add('hot'));
  }
  setHot.clear = () => {
    hotKey = null;
    $('scene').querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'));
  };

  let menuOpen = false;
  let menuAnchor = '.bowl'; // what the open menu points at

  function closeMenu() {
    if (!menuOpen) return false;
    menuOpen = false;
    $('thingMenu').hidden = true;
    return true;
  }

  function openFeedMenu() {
    if (introActive || play || panel || decor) return;
    const C = G.Catalog;
    const menu = $('thingMenu');
    const b = state.bowl;
    const left = b.portions > 0 ? `${C.FOODS[b.food].name} in the bowl, ${b.portions} meal${b.portions > 1 ? 's' : ''} left.` : 'The bowl is empty.';
    const foods = Object.entries(C.FOODS)
      .map(([id, f]) => {
        const ok = G.Progression.isUnlocked(state, 'food:' + id);
        return `<button class="bm-item ${ok ? '' : 'locked'}" data-food="${id}" ${ok ? '' : 'disabled'}>
          <span class="swatch" style="background:${f.color}"></span>
          <span class="bm-txt"><b>${esc(f.name)}</b><small>${ok ? (f.portions > 1 ? `Fills it (${f.portions} meals)` : 'One tasty meal') : `Bond Lv ${f.level}`}</small></span></button>`;
      })
      .join('');
    menu.innerHTML =
      `<div class="bm-head"><b>Feed ${esc(state.cat.name)}</b><small>${esc(left)}</small></div>` +
      `<div class="bm-list">${foods}<button class="bm-item treat" data-treat><span class="bm-ico">${ICONS.treat}</span><span class="bm-txt"><b>Treat</b><small>A quick snack</small></span></button></div>` +
      `<i class="bm-arrow"></i>`;
    menu.hidden = false;
    menuOpen = true;
    menuAnchor = '.bowl';
    sound('pop');
    menu.querySelectorAll('[data-food]').forEach((el) =>
      el.addEventListener('click', () => {
        closeMenu();
        const prev = state.activity;
        sound('bell');
        apply(G.Interactions.feed(state, now(), el.getAttribute('data-food')), prev);
        scene.renderRoom(true, now());
      })
    );
    menu.querySelector('[data-treat]').addEventListener('click', () => {
      closeMenu();
      const prev = state.activity;
      apply(G.Interactions.treat(state, now()), prev);
    });
    positionMenu();
    const first = menu.querySelector('.bm-item:not([disabled])');
    if (first && document.activeElement && document.activeElement.closest && document.activeElement.closest('.bowl')) first.focus();
  }

  // Keep the menu on its object (bowl or toy basket) while the camera moves; close it if that scrolls out of view.
  function positionMenu() {
    if (!menuOpen) return;
    const menu = $('thingMenu');
    const bowl = $('scene').querySelector(menuAnchor);
    if (!bowl) return void closeMenu();
    const st = $('stage').getBoundingClientRect();
    const r = bowl.getBoundingClientRect();
    const cx = r.left + r.width / 2 - st.left;
    if (cx < 12 || cx > st.width - 12) return void closeMenu();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const x = Math.max(8, Math.min(st.width - w - 8, cx - w / 2));
    const above = r.top - st.top - h - 12;
    const below = r.bottom - st.top + 12;
    const up = above >= 8 || below + h > st.height;
    menu.style.left = `${x.toFixed(1)}px`;
    menu.style.top = `${Math.max(8, up ? above : below).toFixed(1)}px`;
    menu.classList.toggle('below', !up);
    menu.style.setProperty('--arrow', `${Math.max(16, Math.min(w - 16, cx - x)).toFixed(1)}px`);
  }

  const TOY_BLURB = {
    feather: 'Drag it around. Pounce!',
    mouse: 'Skitter it along the floor. Stalk, wiggle, pounce.',
    laser: 'Impossible to catch. Chaos.',
    launcher: 'Aim and fire. Will they fetch? Depends on the mood.',
    bubbles: 'Wave it about. Pop pop pop.',
  };

  // Tap the toy basket: pick a toy, then play with it.
  function openPlayMenu() {
    if (introActive || play || panel || decor) return;
    const menu = $('thingMenu');
    const items = Object.entries(G.Catalog.TOYS)
      .map(([id, toy]) => {
        const ok = G.Progression.isUnlocked(state, 'toy:' + id);
        return `<button class="bm-item ${ok ? '' : 'locked'}" data-toy="${id}" ${ok ? '' : 'disabled'}>
          <span class="bm-ico">${ICONS[id] || ICONS.play}</span>
          <span class="bm-txt"><b>${esc(toy.name)}</b><small>${ok ? TOY_BLURB[id] || 'Drag it around. Pounce!' : `Bond Lv ${toy.level}`}</small></span></button>`;
      })
      .join('');
    menu.innerHTML =
      `<div class="bm-head"><b>Play with ${esc(state.cat.name)}</b><small>Pick a toy and play with ${esc(state.cat.name)}. How ${esc(state.cat.name)} feels decides how keen they are.</small></div>` +
      `<div class="bm-list">${items}</div><i class="bm-arrow"></i>`;
    menu.hidden = false;
    menuOpen = true;
    menuAnchor = '.toys';
    sound('pop');
    menu.querySelectorAll('[data-toy]').forEach((el) =>
      el.addEventListener('click', () => {
        closeMenu();
        startPlay(el.getAttribute('data-toy'));
      })
    );
    positionMenu();
    const first = menu.querySelector('.bm-item:not([disabled])');
    if (first && document.activeElement && document.activeElement.closest && document.activeElement.closest('.toys')) first.focus();
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
    document.body.classList.add('playing');
    $('playbar').hidden = false;
    $('playHint').textContent = { laser: 'Move the red dot around!', mouse: 'Skitter the mouse along the floor!', bubbles: 'Wave the wand around!', launcher: 'Drag to aim, let go to launch!' }[toy] || 'Drag the feather around!';
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
    document.body.classList.remove('playing');
    $('playbar').hidden = true;
    scene.onActivity(state.activity);
    const caught = p.stats.catches ? `Caught it ${p.stats.catches} time${p.stats.catches > 1 ? 's' : ''}! ` : '';
    const msg = tired ? '{name} flopped over, completely worn out. Good hunt!' : r.toast;
    if (msg) toast(nm(caught + msg));
    updateHUD();
    save(true);
  }

  // ---- Room -----------------------------------------------------------------------------

  // ---- Arranging the room -------------------------------------------------------------------
  // The camera pulls back to the whole room. Tap a numbered spot, then tap an item below to put
  // it there, or drag an item from the tray (or from one spot) onto a spot. Dropping a placed
  // item back on the tray puts it away.

  const SPOT_NAMES = ['Left corner', 'By the bowls', 'By the chair', 'By the table'];
  let decor = null; // {sel: the spot being filled, tab: 'items' | 'colours', piece: the piece open in Colours}
  let drag = null;

  // `opts` (optional): { tab: 'colours' } to open on the colours, { flash: 'clock' } to point at a piece.
  function openRoom(opts) {
    if (decor || introActive || play || panel) return;
    const o = opts && opts.tab ? opts : {};
    closeMenu();
    setHot.clear();
    const slots = state.room.slots;
    const empty = slots.findIndex((x) => !x);
    decor = { sel: empty >= 0 ? empty : 0, tab: o.tab || 'items', piece: o.flash || null };
    document.body.classList.add('decorating');
    $('toolbar').hidden = true;
    $('decorbar').hidden = false;
    scene.setDecorate(true);
    drawDecor();
    if (o.flash) scene.flashPiece(o.flash);
    updateFollowBtn();
  }

  function endDecorate() {
    if (!decor) return;
    decor = null;
    cancelDrag();
    document.body.classList.remove('decorating');
    $('toolbar').hidden = false;
    $('decorbar').hidden = true;
    scene.setDecorate(false);
    updateFollowBtn();
  }

  function wonSkins() {
    return state.gacha ? state.gacha.owned.filter((id) => id.startsWith('skin:')).length : 0;
  }

  function drawTabs() {
    for (const b of $('decorTabs').querySelectorAll('button')) b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === decor.tab));
    $('coloursDot').hidden = !(wonSkins() > ((state.flags && state.flags.skinsSeen) || 0)) || decor.tab === 'colours';
  }

  // The Colours tab has two steps, so it keeps working as the list of colours grows:
  // first the pieces of furniture (each says how many of its colours you've won), then
  // tapping one shows that piece's colours as a wrapping grid, with a "?" for each still to find.
  function drawColours() {
    state.flags.skinsSeen = wonSkins(); // looked at them
    const G2 = G.Gacha;
    const allOf = (piece) => G2.PRIZES.filter((p) => p.kind === 'skin' && p.ref.split(':')[0] === piece).map((p) => p.ref.split(':')[1]);
    const total = G2.PRIZES.filter((p) => p.kind === 'skin').length;
    const tray = $('decorTray');
    const keep = tray.scrollLeft;
    const piece = decor.piece && G2.PIECES.find((x) => x.id === decor.piece);
    tray.classList.toggle('wrap', !!piece);
    if (!piece) {
      decor.piece = null;
      $('decorHint').innerHTML = wonSkins()
        ? `<b>Colours</b> (${wonSkins()} of ${total} won). Pick a piece of furniture to repaint it. New colours come out of the gachapon by the TV.`
        : `<b>Colours.</b> You haven't won any yet. Spin the gachapon by the TV, then pick a piece here to repaint it.`;
      tray.innerHTML = G2.PIECES.map((pc) => {
        const all = allOf(pc.id);
        const won = G2.skinsFor(state, pc.id);
        const cur = G2.skinOf(state, pc.id);
        const dots = [''].concat(won).slice(0, 6).map((c) => `<i class="pdot ${c === cur ? 'on' : ''}" style="--c:${G.RoomArt.skinSwatch(pc.id, c)}"></i>`).join('');
        return `<button class="pcard ${won.length ? '' : 'empty'}" data-pick="${pc.id}" aria-label="${esc(pc.name)}: ${won.length} of ${all.length} colours won"><span class="dcard-ico">${G.RoomArt.skinIcon(pc.id, cur)}</span><b>${esc(pc.name)}</b><span class="pdots">${dots}</span><small>${won.length} of ${all.length} colours</small></button>`;
      }).join('');
    } else {
      const all = allOf(piece.id);
      const won = G2.skinsFor(state, piece.id);
      const cur = G2.skinOf(state, piece.id);
      $('decorHint').innerHTML = `<b>${esc(piece.name)}</b> is ${esc(skinName(piece.id, cur).toLowerCase())}. Tap a colour to repaint it${won.length < all.length ? '; the <b>?</b> ones come out of the gachapon' : ''}.`;
      const card = (colour) =>
        `<button class="colcard ${colour === cur ? 'on' : ''}" data-piece="${piece.id}" data-colour="${colour}" aria-pressed="${colour === cur}"><i class="swatch" style="--c:${G.RoomArt.skinSwatch(piece.id, colour)}"></i><b>${esc(skinName(piece.id, colour))}</b></button>`;
      const locked = all.filter((c) => !won.includes(c)).map(() => `<button class="colcard locked" data-locked="1" aria-label="${esc(piece.name)}: a colour still to win from the gachapon"><i class="swatch locked">?</i><b>Gachapon</b></button>`);
      tray.innerHTML =
        `<button class="colcard back" data-back="1" aria-label="Back to all furniture"><i class="swatch back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></i><b>All pieces</b></button>` +
        [''].concat(won).map(card).join('') +
        locked.join('');
    }
    tray.scrollLeft = keep;
    scene.clearSpots();
  }

  function drawDecor() {
    if (!decor) return;
    drawTabs();
    if (decor.tab === 'colours') return drawColours();
    const C = G.Catalog;
    const slots = state.room.slots;
    const sel = decor.sel;
    const cur = slots[sel];
    $('decorHint').innerHTML = cur
      ? `<b>${sel + 1} · ${SPOT_NAMES[sel]}</b> has ${esc(C.ITEMS[cur].label)}. Pick another item to swap it, or drag it somewhere else.`
      : `<b>${sel + 1} · ${SPOT_NAMES[sel]}</b> is empty. Tap an item below, or drag one onto a spot.`;
    const cards = [];
    cards.push(
      `<button class="dcard clear" data-clear ${cur ? '' : 'disabled'} aria-label="Take away what is in spot ${sel + 1}"><span class="dcard-ico"><svg viewBox="-30 -30 60 60"><circle r="20" fill="none" stroke="#1b1714" stroke-width="3.5" stroke-dasharray="6 6"/><path d="M-8-8L8 8M8-8L-8 8" stroke="#1b1714" stroke-width="4" stroke-linecap="round"/></svg></span><b>Clear</b><small>Spot ${sel + 1}</small></button>`
    );
    for (const [id, it] of Object.entries(C.ITEMS)) {
      const ok = G.Progression.isUnlocked(state, 'item:' + id);
      const at = slots.indexOf(id);
      cards.push(
        `<button class="dcard ${at >= 0 ? 'placed' : ''} ${ok ? '' : 'locked'}" data-item="${id}" ${ok ? '' : 'aria-disabled="true"'}>${at >= 0 ? `<i class="dcard-badge">${at + 1}</i>` : ''}<span class="dcard-ico">${G.RoomArt.itemIcon(id)}</span><b>${esc(it.name)}</b><small>${ok ? (at >= 0 ? `In spot ${at + 1}` : 'Tap or drag') : it.gacha ? 'Gachapon' : `Bond Lv ${it.level}`}</small></button>`
      );
    }
    const perchOk = G.Progression.isUnlocked(state, 'item:perch');
    cards.push(
      `<button class="dcard ${state.room.perch ? 'placed' : ''} ${perchOk ? '' : 'locked'}" data-perch ${perchOk ? '' : 'aria-disabled="true"'}><span class="dcard-ico">${G.RoomArt.itemIcon('perch')}</span><b>Window hammock</b><small>${perchOk ? (state.room.perch ? 'On: tap to remove' : 'Tap to add') : `Bond Lv ${C.PERCH.level}`}</small></button>`
    );
    const tray = $('decorTray');
    const keep = tray.scrollLeft;
    tray.classList.remove('wrap');
    tray.innerHTML = cards.join('');
    tray.scrollLeft = keep;
    scene.drawSpots(sel);
  }

  // Which numbered spot is under this screen point, if any.
  function spotAt(x, y) {
    for (const n of document.elementsFromPoint(x, y)) if (n.classList && n.classList.contains('spot-hit')) return Number(n.getAttribute('data-spot'));
    return null;
  }

  function putItem(id, i) {
    const slots = state.room.slots;
    const from = slots.indexOf(id);
    if (from === i) return;
    const prev = slots[i];
    if (from >= 0) {
      // moving between spots swaps whatever was in the way
      if (state.activity.spot === 'slot' + from) G.Sim.setActivity(state, now(), 'sit', 'rug');
      slots[from] = prev || null;
    }
    setSlot(i, id, true);
    ach('arrange');
    sound('pop');
    const next = slots.findIndex((x) => !x);
    decor.sel = next >= 0 ? next : i;
    drawDecor();
  }

  function clearSpot(i) {
    if (!state.room.slots[i]) return;
    setSlot(i, null, true);
    ach('clearSpot');
    sound('pop');
    drawDecor();
  }

  // 'Pink' for a colour won from the gachapon, 'Original' for the piece's own.
  function skinName(piece, colour) {
    if (!colour) return 'Original';
    const p = G.Gacha.BY_ID['skin:' + piece + ':' + colour];
    const piName = G.Gacha.PIECES.find((x) => x.id === piece).name.toLowerCase();
    return p ? p.name.replace(new RegExp('\\s*(' + piName + '|' + piece + '|chair cover)$', 'i'), '') : colour;
  }

  // Paint a piece in a colour you've won (or back to its original) and redraw the room.
  function useSkin(piece, colour) {
    if (G.Gacha.skinOf(state, piece) === (colour || '')) return; // already wearing it
    if (!G.Gacha.setSkin(state, piece, colour)) return;
    ach('restyle');
    sound('pop');
    refreshRoom();
    save(true);
  }

  // A colour chip in the Colours tab: paint the piece and point at it.
  function chooseSkin(piece, colour) {
    useSkin(piece, colour);
    drawDecor();
    scene.flashPiece(piece);
  }

  function togglePerch() {
    if (!G.Progression.isUnlocked(state, 'item:perch')) return toast(`The window hammock unlocks at bond level ${G.Catalog.PERCH.level}.`);
    state.room.perch = !state.room.perch;
    if (!state.room.perch && state.activity.spot === 'sill' && state.activity.id === 'nap') G.Sim.setActivity(state, now(), 'sit', 'rug');
    sound('pop');
    refreshRoom();
    drawDecor();
  }

  // One pointer-down on a tray card or a spot: a tap acts at once on release, a drag carries the item.
  function beginDecorPress(e, press) {
    if (e.button > 0) return;
    drag = { ...press, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, over: null };
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('pointercancel', cancelDrag);
  }

  function onDragMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      if (!drag.item || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return;
      drag.moved = true;
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'drag-ghost';
      drag.ghost.innerHTML = G.RoomArt.itemIcon(drag.item);
      document.body.append(drag.ghost);
      document.body.classList.add('dragging-item');
    }
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';
    const over = spotAt(e.clientX, e.clientY);
    if (over !== drag.over) {
      drag.over = over;
      scene.dropOn(over);
    }
    $('decorbar').classList.toggle('drop-away', drag.from != null && !!document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.id === 'decorbar'));
  }

  function onDragEnd(e) {
    const d = drag;
    if (!d) return;
    cancelDrag();
    if (!decor) return;
    if (!d.moved) {
      // a tap
      if (d.spot != null) {
        decor.sel = d.spot;
        sound('pop');
        drawDecor();
      } else if (d.item) {
        if (!G.Progression.isUnlocked(state, 'item:' + d.item)) return toast(G.Catalog.ITEMS[d.item].gacha ? `The ${G.Catalog.ITEMS[d.item].name.toLowerCase()} comes out of the gachapon machine by the TV.` : `${G.Catalog.ITEMS[d.item].name} unlocks at bond level ${G.Catalog.ITEMS[d.item].level}.`);
        putItem(d.item, decor.sel);
      } else if (d.clear) clearSpot(decor.sel);
      else if (d.perch) togglePerch();
      return;
    }
    const to = spotAt(e.clientX, e.clientY);
    if (to != null) {
      decor.sel = to;
      putItem(d.item, to);
    } else if (d.from != null && document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.id === 'decorbar')) {
      clearSpot(d.from);
    }
  }

  function cancelDrag() {
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('pointercancel', cancelDrag);
    if (drag && drag.ghost) drag.ghost.remove();
    drag = null;
    document.body.classList.remove('dragging-item');
    if (scene) scene.dropOn(null);
    const bar = $('decorbar');
    if (bar) bar.classList.remove('drop-away');
  }

  function bindDecor() {
    $('decorDone').addEventListener('click', endDecorate);
    $('decorTabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]');
      if (!b || !decor || b.getAttribute('data-tab') === decor.tab) return;
      G.Sound.unlock();
      sound('pop');
      decor.tab = b.getAttribute('data-tab');
      cancelDrag();
      drawDecor();
      if (decor.tab === 'colours') save(true);
    });
    $('decorTray').addEventListener('click', (e) => {
      const c = e.target.closest('.pcard, .colcard');
      if (!c || !decor || decor.tab !== 'colours') return;
      G.Sound.unlock();
      if (c.hasAttribute('data-pick')) {
        sound('pop');
        decor.piece = c.getAttribute('data-pick');
        $('decorTray').scrollLeft = 0;
        drawDecor();
        return scene.flashPiece(decor.piece);
      }
      if (c.hasAttribute('data-back')) {
        sound('pop');
        decor.piece = null;
        return drawDecor();
      }
      if (c.hasAttribute('data-locked')) return toast('You win new colours from the gachapon machine by the TV.');
      chooseSkin(c.getAttribute('data-piece'), c.getAttribute('data-colour'));
    });
    $('decorTray').addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.dcard');
      if (!c || !decor) return;
      G.Sound.unlock();
      if (c.hasAttribute('data-clear')) beginDecorPress(e, { clear: true });
      else if (c.hasAttribute('data-perch')) beginDecorPress(e, { perch: true });
      else beginDecorPress(e, { item: c.getAttribute('data-item') });
    });
    $('scene').addEventListener('pointerdown', (e) => {
      if (!decor) return;
      const hit = e.target.closest('.spot-hit');
      if (!hit) return;
      const i = Number(hit.getAttribute('data-spot'));
      const item = state.room.slots[i];
      beginDecorPress(e, item ? { spot: i, item, from: i } : { spot: i });
    });
  }

  function setSlot(i, id, quiet) {
    const prevItem = state.room.slots[i];
    state.room.slots[i] = id;
    if (id) G.Progression.bump(state, 'spots', id, 0.5);
    if (state.activity.spot === 'slot' + i && prevItem !== id) G.Sim.setActivity(state, now(), 'sit', 'rug');
    refreshRoom();
    if (id && !quiet && Math.random() < 0.45 && !G.Sim.isSleeping(state)) {
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
    // In the dark the camera uses its flash (you can turn it off for a moody one).
    const dark = scene.isDark();
    ach('photo');
    if (dark) ach('photoFlash');
    let useFlash = dark;
    scene
      .snapshot('', { flash: useFlash })
      .then((url) => {
        const photo = { id: 'p' + t, t, url, caption, name: state.cat.name };
        openModal(
          `<h2>Snap!</h2>${polaroidHtml(photo)}
           <div class="row"><button class="btn primary" id="keepBtn">Keep in album</button><button class="btn" id="saveBtn">Save to device</button>${dark ? '<button class="btn" id="flashBtn" aria-pressed="true">⚡ Flash: on</button>' : ''}</div>`,
          (box) => {
            box.querySelector('#saveBtn').addEventListener('click', (e) => saveToDevice(photo, e.currentTarget));
            const fb = box.querySelector('#flashBtn');
            if (fb)
              fb.addEventListener('click', () => {
                useFlash = !useFlash;
                fb.textContent = useFlash ? '⚡ Flash: on' : '⚡ Flash: off';
                fb.setAttribute('aria-pressed', String(useFlash));
                scene.snapshot('', { flash: useFlash }).then((u) => {
                  photo.url = u;
                  box.querySelector('.photo-big img').src = u;
                });
              });
            box.querySelector('#keepBtn').addEventListener('click', () => {
              album.unshift(photo);
              while (album.length && !G.Storage.saveAlbum(album)) album.pop();
              closeModal();
              toast(album.includes(photo) ? 'Saved to the album (in your Diary).' : 'The album is full — delete some photos first.');
            });
          }
        );
      })
      .catch(() => toast('Could not take the photo on this browser, sorry!'));
  }

  const photoDate = (p) => new Date(p.t).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  // A photo as a polaroid on screen: picture, then what the cat was doing and when.
  function polaroidHtml(p) {
    return `<figure class="photo-big"><img src="${p.url}" alt=""><figcaption>${esc(nm(p.caption))}<small>${esc(photoDate(p))}</small></figcaption></figure>`;
  }

  // Wrap text to at most `max` lines of `width` pixels.
  function wrapLines(g, text, width, max) {
    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (g.measureText(test).width > width && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    if (lines.length > max) {
      lines.length = max;
      lines[max - 1] = lines[max - 1].replace(/\s*\S*$/, '') + '…';
    }
    return lines;
  }

  // Draw a photo onto a polaroid card (picture, caption, date and name) and return it as a PNG.
  function polaroidBlob(p) {
    const face = "'M PLUS Rounded 1c', Nunito, system-ui, sans-serif";
    const loadFont = document.fonts && document.fonts.load ? Promise.all([document.fonts.load(`800 34px ${face}`), document.fonts.load(`700 24px ${face}`)]).catch(() => {}) : Promise.resolve();
    const img = new Image();
    const loaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src = p.url;
    return Promise.all([loaded, loadFont]).then(
      () =>
        new Promise((resolve, reject) => {
          const margin = 56; // backdrop around the card
          const pad = 40; // card border around the picture
          const pw = 680;
          const ph = Math.round(pw * (img.naturalHeight / img.naturalWidth));
          const footer = 230;
          const cw = pw + pad * 2;
          const ch = pad + ph + footer;
          const c = document.createElement('canvas');
          c.width = cw + margin * 2;
          c.height = ch + margin * 2;
          const g = c.getContext('2d');
          g.fillStyle = '#f8e9b4';
          g.fillRect(0, 0, c.width, c.height);
          // card with a soft drop shadow
          g.save();
          g.shadowColor = 'rgba(60, 40, 28, 0.32)';
          g.shadowBlur = 30;
          g.shadowOffsetY = 12;
          g.fillStyle = '#fffdf6';
          g.fillRect(margin, margin, cw, ch);
          g.restore();
          g.strokeStyle = '#1b1714';
          g.lineWidth = 5;
          g.strokeRect(margin, margin, cw, ch);
          // the picture, with an ink edge like the game's own art
          g.drawImage(img, margin + pad, margin + pad, pw, ph);
          g.lineWidth = 4;
          g.strokeRect(margin + pad, margin + pad, pw, ph);
          // caption, date and name
          g.fillStyle = '#1b1714';
          g.textAlign = 'center';
          g.textBaseline = 'alphabetic';
          g.font = `800 36px ${face}`;
          const lines = wrapLines(g, nm(p.caption), pw, 2);
          const mid = margin + cw / 2;
          let y = margin + pad + ph + 62;
          for (const line of lines) {
            g.fillText(line, mid, y);
            y += 44;
          }
          g.fillStyle = '#7d6e62';
          g.font = `700 24px ${face}`;
          g.fillText(`${photoDate(p)}  ·  ${p.name || state.cat.name}`, mid, margin + ch - 34);
          c.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png');
        })
    );
  }

  function saveToDevice(p, btn) {
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Developing…';
    polaroidBlob(p)
      .then((blob) => {
        const a = document.createElement('a');
        a.download = `${p.name || state.cat.name}-${G.Clock.dayKey(p.t)}.png`;
        a.href = URL.createObjectURL(blob);
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('Saved as a polaroid.');
      })
      .catch(() => toast('Could not save the photo on this browser, sorry!'))
      .finally(() => {
        btn.disabled = false;
        btn.textContent = label;
      });
  }

  // ---- Diary / album / treasures ------------------------------------------------------------

  function diaryCard(e) {
    const renamed = e.name !== state.cat.name ? ` <span class="note">(now called ${esc(state.cat.name)})</span>` : '';
    const close = esc(e.close.split('{name}').join(e.name));
    return `<article class="diary"><h3>${e.today ? 'Today (so far)' : esc(G.Clock.formatDay(e.day))}</h3><p>${esc(e.open)}</p>${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}<p class="sign">${close}${renamed}</p></article>`;
  }

  // The trophy page: unlocked first, then what's closest, then the secrets.
  function trophiesHtml() {
    const t = now();
    const all = G.Achievements.list(state, t);
    const sum = G.Achievements.summary(state);
    const done = all.filter((x) => x.done).sort((a, b) => b.at - a.at);
    const todo = all.filter((x) => !x.done && !x.def.secret).sort((a, b) => b.cur / b.goal - a.cur / a.goal);
    const secret = all.filter((x) => !x.done && x.def.secret);
    const card = (x) => {
      if (!x.done && x.def.secret) return `<div class="trophy secret"><span class="ti">❓</span><div><b>???</b><p>A secret. Keep being a weird human.</p></div></div>`;
      const pct = Math.round((x.cur / x.goal) * 100);
      const foot = x.done ? `<small>Unlocked ${esc(G.Clock.formatDay(G.Clock.dayKey(x.at)))}</small>` : `<span class="tbar"><i style="width:${pct}%"></i></span><small>${x.cur} / ${x.goal}</small>`;
      return `<div class="trophy ${x.done ? 'done' : ''}"><span class="ti">${x.def.icon}</span><div><b>${esc(x.def.name)}</b><p>${esc(x.def.desc)}</p>${foot}</div></div>`;
    };
    return `<p class="small"><b>${sum.done}</b> of ${sum.total} unlocked. Nobody asked for any of these, and yet.</p>
      <span class="tbar big"><i style="width:${Math.round((sum.done / sum.total) * 100)}%"></i></span>
      <div class="trophies">${[...done, ...todo, ...secret].map(card).join('')}</div>`;
  }

  // The diary has two shelves: "This week" (the last seven days, written automatically) and "Saved"
  // (pages you chose to keep for good). Each is a list of days; tapping one opens that day's page.
  let diaryView = { shelf: 'week', day: null };

  const BOOKMARK = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.5L5.5 21V4.5a1 1 0 0 1 1-1z" fill="${on ? '#ff4f86' : 'none'}" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

  function diaryList(shelf, entries) {
    const days = entries.slice().sort((a, b) => (a.day < b.day ? 1 : -1));
    const row = (e) => {
      const [y, m, d] = e.day.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const wd = dt.toLocaleDateString([], { weekday: 'short' });
      const mon = dt.toLocaleDateString([], { month: 'short' });
      const full = e.today ? 'Today' : G.Clock.formatDay(e.day);
      const peek = (e.lines && e.lines[0]) || e.open;
      return `<li><button class="d-row ${e.today ? 'now' : ''}" data-day="${e.day}"><span class="d-tile"><small>${esc(wd)}</small><b>${d}</b><small>${esc(mon)}</small></span><span class="d-text"><b>${esc(full)}</b><span>${esc(peek)}</span></span>${e.saved ? `<span class="d-mark" aria-label="Saved">${BOOKMARK(true)}</span>` : ''}<svg class="d-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></li>`;
    };
    if (!days.length)
      return `<p class="empty">${shelf === 'saved' ? `Nothing saved yet. Open a page and tap <b>Save</b> to keep it for good. Pages you don't save are tucked away after a week.` : 'No pages yet.'}</p>`;
    return `<ul class="d-rows">${days.map(row).join('')}</ul>`;
  }

  // One day's page, with the button to keep it (or let it go).
  function diaryPage(e) {
    const back = diaryView.shelf === 'saved' ? 'Saved' : 'This week';
    const save = e.today
      ? `<span class="d-later">Today's page can be saved tomorrow.</span>`
      : `<button class="d-save ${e.saved ? 'on' : ''}" id="dSave" aria-pressed="${!!e.saved}">${BOOKMARK(!!e.saved)}<span>${e.saved ? 'Saved' : 'Save this page'}</span></button>`;
    return `<div class="d-bar"><button class="d-back" id="dBack"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>${back}</button>${save}</div>${diaryCard(e)}`;
  }

  // keepView: re-drawn from the diary's own controls, so stay on the day being read.
  function openBook(tab, keepView) {
    photoView = -1;
    if (tab === 'diary' && !keepView) diaryView = { shelf: 'week', day: null };
    const tabs = [
      ['diary', 'Diary'],
      ['album', 'Album'],
      ['treasures', 'Treasures'],
      ['unlocks', 'Unlocks'],
      ['trophies', 'Trophies'],
    ];
    let body = '';
    if (tab === 'diary') {
      const todayE = G.Journal.todayEntry(state, now());
      const week = [todayE, ...state.journal.filter((e) => e.day >= G.Journal.weekStart(now()))];
      const saved = state.journal.filter((e) => e.saved);
      const open = diaryView.day && [...week, ...saved].find((e) => e.day === diaryView.day);
      if (diaryView.day && !open) diaryView.day = null; // that page has been tucked away
      if (open) body = diaryPage(open);
      else {
        const shelves = [['week', 'This week', week.length], ['saved', 'Saved', saved.length]];
        body =
          `<p class="small">Written by ${esc(state.cat.name)}, in paw.</p>` +
          `<div class="d-shelves" role="tablist">${shelves.map(([k, l, n]) => `<button role="tab" aria-selected="${diaryView.shelf === k}" data-shelf="${k}">${l}<i>${n}</i></button>`).join('')}</div>` +
          (diaryView.shelf === 'saved'
            ? diaryList('saved', saved)
            : `<p class="small muted d-note">The last ${G.Journal.WEEK_DAYS} days. Save the pages you love to keep them for good.</p>` + diaryList('week', week));
      }
    } else if (tab === 'album') {
      body = album.length
        ? `<div class="album">${album.map((p, i) => `<figure data-photo="${i}"><img src="${p.url}" alt=""><figcaption>${esc(nm(p.caption))}<small>${esc(photoDate(p))}</small></figcaption></figure>`).join('')}</div>`
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
    } else if (tab === 'trophies') {
      body = trophiesHtml();
      if (state.achUnseen) {
        state.achUnseen = 0;
        save(true);
        scene.renderRoom(true, now());
      }
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
      `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}${k === 'trophies' && state.achUnseen ? ' <i class="tab-dot"></i>' : ''}</button>`).join('')}</div>
       <div class="book">${body}</div>
       ${sitter ? `<button class="sitter" id="sitter" aria-label="Shoo the cat off the diary"><svg viewBox="-80 -120 170 130">${G.CatArt.render('loaf', 'sitter')}</svg><span>${esc(state.cat.name)} is sitting on your diary. Tap to shoo.</span></button>` : ''}`,
      (box) => {
        box.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => openBook(b.getAttribute('data-tab'))));
        box.querySelectorAll('[data-shelf]').forEach((b) =>
          b.addEventListener('click', () => {
            sound('pop');
            diaryView.shelf = b.getAttribute('data-shelf');
            openBook('diary', true);
          })
        );
        box.querySelectorAll('.d-row').forEach((b) =>
          b.addEventListener('click', () => {
            sound('pop');
            diaryView.day = b.getAttribute('data-day');
            openBook('diary', true);
          })
        );
        const dBack = box.querySelector('#dBack');
        if (dBack)
          dBack.addEventListener('click', () => {
            diaryView.day = null;
            openBook('diary', true);
          });
        const dSave = box.querySelector('#dSave');
        if (dSave)
          dSave.addEventListener('click', () => {
            const on = G.Journal.toggleSave(state, diaryView.day);
            sound(on ? 'chime' : 'pop');
            save(true);
            openBook('diary', true);
          });
        box.querySelectorAll('[data-photo]').forEach((f) => f.addEventListener('click', () => openPhoto(Number(f.getAttribute('data-photo')))));
        const s = box.querySelector('#sitter');
        if (s) {
          s.querySelectorAll('.eyes').forEach((g) => g.setAttribute('display', g.classList.contains('eyes-half') ? 'inline' : 'none'));
          s.addEventListener('click', () => {
            if (!s.classList.contains('leave')) ach('shoo');
            s.classList.add('leave');
            sound('meow');
            setTimeout(() => s.remove(), 500);
          });
        }
      },
      true
    );
  }

  // One photo, big. With more than one in the album, the arrows (or ← →, or a swipe) cycle through them.
  let photoView = -1;
  function openPhoto(i) {
    const n = album.length;
    if (!n) return openBook('album');
    i = ((i % n) + n) % n;
    const arrow = (dir) => `<button class="photo-arrow ${dir}" data-step="${dir === 'prev' ? -1 : 1}" aria-label="${dir === 'prev' ? 'Previous' : 'Next'} photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    openModal(
      `<div class="photo-view ${n > 1 ? 'many' : ''}">${n > 1 ? arrow('prev') : ''}${polaroidHtml(album[i])}${n > 1 ? arrow('next') : ''}</div>
       ${n > 1 ? `<p class="photo-count">${i + 1} of ${n}</p>` : ''}
       <div class="row"><button class="btn primary" id="saveBtn">Save to device</button><button class="btn" id="delBtn">Delete</button><button class="btn" id="backBtn">Back to album</button></div>`,
      (box) => {
        photoView = i;
        box.querySelector('#backBtn').addEventListener('click', () => openBook('album'));
        box.querySelector('#saveBtn').addEventListener('click', (e) => saveToDevice(album[i], e.currentTarget));
        box.querySelector('#delBtn').addEventListener('click', () => {
          album.splice(i, 1);
          G.Storage.saveAlbum(album);
          if (album.length) openPhoto(Math.min(i, album.length - 1));
          else openBook('album');
        });
        box.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => openPhoto(i + Number(b.getAttribute('data-step')))));
        // swipe left / right
        const view = box.querySelector('.photo-view');
        let x0 = null;
        view.addEventListener('pointerdown', (e) => (x0 = e.clientX));
        view.addEventListener('pointerup', (e) => {
          if (x0 != null && n > 1 && Math.abs(e.clientX - x0) > 45) openPhoto(i + (e.clientX < x0 ? 1 : -1));
          x0 = null;
        });
      },
      true
    );
  }

  // ---- Settings / profile / naming ---------------------------------------------------------

  // ---- The gachapon machine -----------------------------------------------------------------
  // Put in two cat coins, turn the crank, a capsule rolls out and pops open.

  const CAPSULE = { common: '#7fb4d9', rare: '#a98bd9', legendary: '#ecbc44' };
  const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function gachaSvg() {
    const ink = '#1b1714';
    const caps = [[-34, 104, '#7fb4d9'], [-6, 116, '#f4accc'], [24, 108, '#ecbc44'], [40, 82, '#8fd3c6'], [-38, 72, '#a98bd9'], [-12, 86, '#e0735f'], [14, 72, '#fff'], [-20, 54, '#ecbc44'], [12, 46, '#7fb4d9'], [28, 128, '#a98bd9'], [-24, 130, '#8fd3c6']];
    const cap = ([dx, cy, col]) => `<g><circle cx="${100 + dx}" cy="${cy}" r="14" fill="#fff" stroke="${ink}" stroke-width="2.6"/><path d="M ${86 + dx} ${cy} A 14 14 0 0 1 ${114 + dx} ${cy} Z" fill="${col}" stroke="${ink}" stroke-width="2.6"/></g>`;
    const paw = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#8a5a1a"><ellipse cx="0" cy="2" rx="3.2" ry="2.6"/><circle cx="-3.8" cy="-2" r="1.4"/><circle cx="-1.3" cy="-4" r="1.4"/><circle cx="1.3" cy="-4" r="1.4"/><circle cx="3.8" cy="-2" r="1.4"/></g>`;
    return `<svg class="g-svg" viewBox="0 0 200 300" aria-hidden="true">
      <ellipse cx="100" cy="290" rx="82" ry="8" fill="#000" opacity=".1"/>
      <rect x="38" y="262" width="124" height="20" rx="7" fill="#c9506d" stroke="${ink}" stroke-width="3.4"/>
      <path d="M 44 152 L 156 152 L 160 264 L 40 264 Z" fill="#ff6f91" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>
      <circle cx="100" cy="92" r="62" fill="#e8f6fb" stroke="${ink}" stroke-width="3.4"/>
      <g class="g-caps">${caps.map(cap).join('')}</g>
      <path d="M 58 72 Q 64 46 86 38" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/>
      <rect x="62" y="22" width="76" height="16" rx="6" fill="#ff6f91" stroke="${ink}" stroke-width="3"/>
      <rect x="52" y="146" width="96" height="12" rx="5" fill="#e05a7c" stroke="${ink}" stroke-width="3"/>
      <rect x="114" y="168" width="32" height="24" rx="6" fill="#ffd7e0" stroke="${ink}" stroke-width="2.6"/>
      <path d="M 122 180 L 138 180" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>
      <g class="g-crank"><circle cx="76" cy="200" r="18" fill="#fff" stroke="${ink}" stroke-width="3"/><rect x="60" y="196" width="32" height="9" rx="4.5" fill="#ecbc44" stroke="${ink}" stroke-width="2.4"/></g>
      <rect x="80" y="226" width="40" height="28" rx="9" fill="#5a3040" stroke="${ink}" stroke-width="3"/>
      <g class="g-coin"><circle cx="130" cy="146" r="10" fill="#ecbc44" stroke="${ink}" stroke-width="2.4"/>${paw(130, 147, 1)}</g>
      <g class="g-out">
        <g class="g-bot"><path d="M 84 262 A 16 16 0 0 0 116 262 Z" fill="#fff" stroke="${ink}" stroke-width="2.8"/></g>
        <g class="g-top"><path id="gTopHalf" d="M 84 262 A 16 16 0 0 1 116 262 Z" fill="#7fb4d9" stroke="${ink}" stroke-width="2.8"/><circle cx="94" cy="254" r="2.6" fill="#fff" opacity=".8"/></g>
      </g>
    </svg>`;
  }

  // The prize's picture: the room item, the piece of furniture in its new colour, or the cat's
  // own face wearing the new accessory.
  function prizeIcon(p, uid) {
    if (p.kind === 'item') return G.RoomArt.itemIcon(p.id);
    if (p.kind === 'skin') return G.RoomArt.skinIcon(...p.ref.split(':'));
    const acc = Object.assign({}, state.cat.accessory, p.kind === 'collar' ? { collar: p.ref } : { extra: p.ref });
    if (p.kind === 'collar') acc.extra = 'none'; // show off the collar on its own
    return `<svg viewBox="-64 -100 128 162">${G.CatArt.withCoat(state.cat.coat, () => G.CatArt.renderHead(uid, 'happy', 'normal', true), acc)}</svg>`;
  }

  function gachaListHtml() {
    const P = G.Gacha.PRIZES;
    const have = P.filter((p) => G.Gacha.owned(state, p.id)).length;
    return `<summary>What's inside (${have} of ${P.length} collected)</summary><div class="g-grid">${P.map((p, i) => {
      const got = G.Gacha.owned(state, p.id);
      return `<div class="g-cell ${p.rarity} ${got ? 'got' : ''}"><span>${got ? prizeIcon(p, 'gl' + i) : '?'}</span><b>${got ? esc(p.name) : '???'}</b><small>${G.Gacha.RARITY_LABEL[p.rarity].replace(/!+$/, '')}</small></div>`;
    }).join('')}</div>`;
  }

  function openGacha() {
    const cost = G.Gacha.COST;
    openModal(
      `<div class="gacha"><h2>Gachapon</h2>
        <div class="g-stage" id="gStage">${gachaSvg()}<div class="g-prize" id="gPrize"></div></div>
        <div class="g-result" id="gResult"><p class="small">Every capsule holds something new for ${esc(state.cat.name)}: an accessory to wear, a toy for the room, or a new colour for the furniture.</p></div>
        <div class="g-bar"><span class="g-coins">${ICONS.coin}<b id="gCoins">${state.coins || 0}</b> cat coins</span><button class="btn primary" id="gSpin">Spin for ${cost} ${ICONS.coin}</button></div>
        <p class="small muted">Earn more coins by visiting every day (streaks pay extra), unlocking achievements and levelling up your bond.</p>
        <details class="g-list" id="gList">${gachaListHtml()}</details></div>`,
      (box) => {
        const stage = box.querySelector('#gStage');
        const btn = box.querySelector('#gSpin');
        const result = box.querySelector('#gResult');
        let busy = false;
        btn.addEventListener('click', () => {
          if (busy) return;
          G.Sound.unlock();
          const r = G.Gacha.spin(state, now());
          if (!r.ok) {
            btn.classList.remove('nope');
            void btn.offsetWidth;
            btn.classList.add('nope');
            result.innerHTML = `<p class="small">You need ${r.need} more cat coin${r.need > 1 ? 's' : ''}. Come back tomorrow, keep a streak going, or chase an achievement.</p>`;
            return;
          }
          busy = true;
          btn.disabled = true;
          save(true);
          updateHUD();
          box.querySelector('#gCoins').textContent = state.coins;
          const p = r.prize;
          stage.querySelector('#gTopHalf').setAttribute('fill', CAPSULE[p.rarity]);
          box.querySelector('#gPrize').innerHTML = `<div class="g-burst ${p.rarity}"></div><div class="g-icon">${prizeIcon(p, 'gp' + state.gacha.spins)}</div>`;
          result.innerHTML = '';
          stage.className = 'g-stage';
          void stage.offsetWidth;
          const quick = reduceMotion();
          const at = quick ? [0, 0, 0, 0] : [0, 650, 1550, 2550];
          setTimeout(() => (stage.classList.add('s1'), sound('coin')), at[0]);
          setTimeout(() => (stage.classList.add('s2'), sound('crank')), at[1]);
          setTimeout(() => (stage.classList.add('s3'), sound('capsule')), at[2]);
          setTimeout(() => {
            stage.classList.add('s4');
            sound('reveal', p.rarity);
            if (p.rarity === 'legendary') setTimeout(() => sound('bell'), 600);
            const wear = p.kind === 'extra' || p.kind === 'collar';
            const [piece, colour] = p.kind === 'skin' ? p.ref.split(':') : [];
            const painted = p.kind === 'skin' && G.Gacha.skinOf(state, piece) === colour;
            const action = wear
              ? `<button class="btn" id="gWear">Put it on ${esc(state.cat.name)}</button>`
              : p.kind === 'skin'
                ? `<button class="btn" id="gPaint">${painted ? 'Show me in the room' : 'Use it in the room'}</button>`
                : `<button class="btn" id="gPlace">Put it in the room</button>`;
            result.innerHTML =
              `<div class="g-card ${p.rarity}"><small>${G.Gacha.RARITY_LABEL[p.rarity]}${r.dup ? '' : ' · New!'}</small><b>${esc(p.name)}</b><p>${esc(p.line)}</p>` +
              (r.dup ? `<p class="small">You already had this one, so here are ${r.refund} coins back.</p>` : '') +
              `<div class="row center">${action}</div>` +
              (p.kind === 'skin' ? `<p class="small muted">Switch colours any time: Room, then Colours.</p>` : '') +
              `</div>`;
            const pt = result.querySelector('#gPaint');
            if (pt)
              pt.addEventListener('click', () => {
                useSkin(piece, colour);
                closeModal();
                openRoom({ tab: 'colours', flash: piece }); // so you can see it change
              });
            const w = result.querySelector('#gWear');
            if (w)
              w.addEventListener('click', () => {
                applyCoat(state.cat.coat, Object.assign({}, state.cat.accessory, p.kind === 'collar' ? { collar: p.ref } : { extra: p.ref }), state.cat.tail);
                save(true);
                w.textContent = 'Looking good!';
                w.disabled = true;
              });
            const pl = result.querySelector('#gPlace');
            if (pl)
              pl.addEventListener('click', () => {
                closeModal();
                openRoom();
              });
            box.querySelector('#gCoins').textContent = state.coins;
            const list = box.querySelector('#gList');
            const open = list.open;
            list.innerHTML = gachaListHtml();
            list.open = open;
            updateHUD();
            btn.disabled = false;
            busy = false;
          }, at[3]);
        });
      }
    );
  }

  // The note on the wall: just today's. A new one goes up every day.
  function openNote() {
    const t = now();
    const today = G.Notes.today(state, t);
    const { fresh: wasFresh, res: noteBond } = G.Notes.read(state, t); // +1 bond the first time each day
    if (wasFresh) ach('noteDays');
    if (noteBond && noteBond.levelUp) setTimeout(() => celebrate(noteBond), 600);
    save(true);
    if (wasFresh) scene.renderRoom(true, t); // the ring goes away
    openModal(
      `<div class="note-card"><div class="paper"><small>${esc(today.head)}</small><p class="note-text">${esc(today.text)}</p><p class="sign">${esc(state.cat.name)}</p></div>
       <p class="small muted">A new note goes up every day.</p></div>`
    );
  }

  // Bond level card: how far along, and what each level up brings.
  function openBond() {
    ach('bondCard');
    const C = G.Catalog;
    const p = G.Progression.progress(state);
    const KIND = { food: 'Food', toy: 'Toy', item: 'Furniture' };
    const chips = (lv) =>
      C.unlocksAt(lv)
        .map((k) => `<span class="chip-un">${esc(C.unlockName(k))}<small>${KIND[k.split(':')[0]]}</small></span>`)
        .join('');
    const rows = [];
    for (let lv = 2; lv <= C.LEVELS.length; lv++) {
      const what = chips(lv) || '<em>No new things, just a cat who trusts you more.</em>';
      const cls = lv <= p.level ? 'done' : lv === p.level + 1 ? 'next' : '';
      const need = lv <= p.level ? 'Unlocked' : `${C.LEVELS[lv - 1] - state.stats.bond} more bond`;
      rows.push(`<li class="${cls}"><span class="lv"><small>Lv</small>${lv}</span><span class="what">${what}<span class="need">${need}</span></span></li>`);
    }
    const pct = p.max ? 100 : Math.round((p.into / p.need) * 100);
    openModal(
      `<div class="bond-now"><h2>Bond Lv ${p.level}</h2>
        <span class="bond-track"><i style="width:${pct}%"></i></span>
        <p class="small">${p.max ? esc(nm('You and {name} are best friends!')) : `${Math.floor(p.into)} / ${p.need} to Lv ${p.level + 1}`}</p>
        <p class="small muted">Bond grows when you pet, play with and feed ${esc(state.cat.name)}, and when you visit each day.</p></div>
       <h3>What you can unlock</h3>
       <ul class="bond-lvls">${rows.join('')}</ul>`
    );
  }

  // ---- Weather outside the window --------------------------------------------------------
  // With a place (from the browser's location prompt, or a city search) the window shows the
  // real weather there, and the sun rises and sets when it really does.

  const wcfg = () => state.settings.weather;
  let wxTried = 0;
  let wxBusy = false;

  // Ask the weather service about a place. Resolves true if the window now has a reading.
  function loadWeather(place) {
    const c = wcfg();
    wxBusy = true;
    wxTried = Date.now();
    return G.Weather.fetchNow(place)
      .then((w) => {
        if (c.place !== place) return false; // they moved on in the meantime
        c.last = w;
        ach('weatherSet');
        save(true);
        scene.updateLighting(now(), true);
        updateHUD();
        return true;
      })
      .catch(() => false)
      .then((ok) => {
        wxBusy = false;
        return ok;
      });
  }

  // Keep the reading fresh (every 20 minutes; after a failure, try again in two).
  function checkWeather() {
    const c = wcfg();
    if (!c.place || wxBusy || Date.now() - wxTried < 2 * 60 * 1000) return;
    if (G.Weather.stale(state, Date.now())) loadWeather(c.place);
  }

  function weatherNowHtml() {
    const c = wcfg();
    if (!c.place || !c.last) return '';
    const sun = c.last.rise >= 0 ? `Sun ${hhmm(c.last.rise)} to ${hhmm(c.last.set)}` : '';
    return `<div class="wx-now"><span>${esc(G.Weather.LABEL[c.last.kind])}${c.last.temp !== null ? `, ${c.last.temp}°C` : ''}</span><small>${esc(c.place.name || 'your place')}${sun ? ' · ' + sun : ''}</small></div>`;
  }

  const hhmm = (h) => {
    const m = Math.round(h * 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  function weatherCardHtml(intro) {
    const has = !!wcfg().place;
    return `<div class="wx-card">
      ${weatherNowHtml()}
      <p class="small">${intro}</p>
      <div class="wx-actions">
        <button class="btn primary" id="wxLocate">${has ? 'Use my location again' : 'Use my location'}</button>
        <button class="btn" id="wxCityBtn">Pick a city</button>
        ${has ? '<button class="btn" id="wxOff">Stop using weather</button>' : ''}
      </div>
      <form class="wx-city" id="wxCity" hidden><input id="wxCityIn" maxlength="60" autocomplete="off" placeholder="City, e.g. Kuala Lumpur" aria-label="City"><button class="btn" type="submit">Search</button></form>
      <div class="wx-results" id="wxResults"></div>
      <p class="wx-msg" id="wxMsg" role="status"></p>
    </div>`;
  }

  // done() runs once the window has a real reading.
  function bindWeatherCard(box, done) {
    const msg = (text, err) => {
      const m = box.querySelector('#wxMsg');
      m.textContent = text;
      m.classList.toggle('err', !!err);
    };
    const showCity = () => {
      box.querySelector('#wxCity').hidden = false;
      box.querySelector('#wxCityIn').focus();
    };
    const choose = (place) => {
      wcfg().place = place;
      wcfg().last = null;
      msg('Looking outside…');
      loadWeather(place).then((ok) => {
        if (ok) done();
        else msg("Couldn't reach the weather service. Check your connection and try again.", true);
      });
    };
    box.querySelector('#wxLocate').addEventListener('click', () => {
      msg('Waiting for your browser to ask…');
      G.Weather.locate().then(
        (p) => choose({ lat: p.lat, lon: p.lon, name: 'Your location' }),
        () => {
          msg("Couldn't get your location. You can pick a city instead.", true);
          showCity();
        }
      );
    });
    box.querySelector('#wxCityBtn').addEventListener('click', showCity);
    box.querySelector('#wxCity').addEventListener('submit', (e) => {
      e.preventDefault();
      msg('Searching…');
      G.Weather.search(box.querySelector('#wxCityIn').value).then(
        (list) => {
          box.querySelector('#wxResults').innerHTML = list.map((x, i) => `<button type="button" data-i="${i}">${esc(x.name)}<small>${esc(x.region)}</small></button>`).join('');
          msg(list.length ? '' : 'No city found with that name.', !list.length);
          box.querySelectorAll('#wxResults [data-i]').forEach((b) => b.addEventListener('click', () => choose({ lat: list[+b.dataset.i].lat, lon: list[+b.dataset.i].lon, name: list[+b.dataset.i].name })));
        },
        () => msg("Couldn't search right now. Check your connection.", true)
      );
    });
    const off = box.querySelector('#wxOff');
    if (off)
      off.addEventListener('click', () => {
        wcfg().place = null;
        wcfg().last = null;
        scene.updateLighting(now(), true);
        updateHUD();
        save(true);
        openSettings();
      });
  }

  const WX_INTRO = "The window can show the weather where you are, and the sun will rise and set at the real times. Your place stays on this device; it's only sent to Open-Meteo, a free weather service, to ask about the weather.";

  // Asked once, a little after the game starts.
  function openWeatherAsk() {
    wcfg().asked = true;
    save(true);
    openModal(
      `<h2>Show the real weather outside?</h2>${weatherCardHtml(WX_INTRO)}<div class="row center"><button class="btn link" data-close>Not now</button></div>`,
      (box) =>
        bindWeatherCard(box, () => {
          closeModal();
          toast(nm('{name} can see the real sky now.'));
        })
    );
  }

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
    const favPet = fav('pets', (k) => ({ chin: 'chin scratches', head: 'head pats', back: 'back pets', belly: 'belly rubs (!)', ears: 'ear scratches' })[k]);
    const quirks = G.Profile.quirks.filter((q) => q.on).map((q) => `<li>${esc(q.text)}</li>`).join('');
    openModal(
      `<div class="profile"><div class="portrait"><svg viewBox="-80 -150 160 156">${G.CatArt.render('sit', 'profile')}</svg></div>
        <div><h2>${esc(state.cat.name)}</h2><p class="small">Together for ${days} day${days > 1 ? 's' : ''} · Bond Lv ${p.level}</p><p class="small muted">${esc(looksText())}</p><button class="btn small-btn" id="lookBtn">Change look</button></div></div>
       <form class="rename" id="renameForm"><label for="renameInput">Name</label><div class="row"><input id="renameInput" maxlength="40" autocomplete="off" value="${esc(state.cat.name)}"><button class="btn primary" type="submit">Rename</button></div><p class="error" id="renameErr"></p></form>
       <h3>Favourites</h3><ul class="favs"><li><b>Nap spot:</b> ${favSpot}</li><li><b>Toy:</b> ${favToy}</li><li><b>Food:</b> ${favFood}</li><li><b>Pets:</b> ${favPet}</li></ul>
       <h3>Quirks</h3><ul class="quirks">${quirks}</ul>
       <h3>Weather</h3>${weatherCardHtml(wcfg().place ? 'The window shows the real weather and the real sunrise and sunset there.' : WX_INTRO)}
       <h3>Sound</h3><button class="btn" id="soundBtn">${state.settings.muted ? 'Sound is off — turn on' : 'Sound is on — turn off'}</button>
       <h3>Start over</h3><p class="small">Erase everything and adopt a new cat.</p><button class="btn danger" id="resetBtn">Start a new game</button>
       <details class="testing"><summary>Testing tools</summary>
         <p class="small">Pretend time has passed (to see the "while you were away" summary without waiting):</p>
         <div class="row"><button class="btn" data-skip="1">+1 hour</button><button class="btn" data-skip="6">+6 hours</button><button class="btn" data-skip="24">+1 day</button><button class="btn" id="realTime" ${state.settings.timeOffset ? '' : 'disabled'}>Back to real time</button></div>
         <p class="small">Weather preview (the window only):</p>
         <div class="row">${[['', 'Auto'], ...G.Weather.KINDS.map((k) => [k, G.Weather.LABEL[k]])].map(([k, l]) => `<button class="chip ${String(wcfg().preview || '') === k ? 'on' : ''}" data-wx="${k}">${l}</button>`).join('')}</div>
         <p class="small">Seasonal decor preview:</p>
         <div class="row">${[['', 'Auto'], ['none', 'None'], ['cny', 'CNY'], ['raya', 'Raya'], ['christmas', 'Christmas']].map(([k, l]) => `<button class="chip ${String(state.settings.seasonPreview || '') === k ? 'on' : ''}" data-season="${k}">${l}</button>`).join('')}</div>
       </details>`,
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
        bindWeatherCard(box, () => openSettings());
        box.querySelectorAll('[data-wx]').forEach((b) =>
          b.addEventListener('click', () => {
            wcfg().preview = b.getAttribute('data-wx') || null;
            scene.updateLighting(now(), true);
            updateHUD();
            save(true);
            openSettings();
          })
        );
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
  function applyCoat(coat, accessory, tail) {
    state.cat.coat = G.Coats.normalize(coat);
    if (accessory) state.cat.accessory = G.Coats.normalizeAccessory(accessory);
    state.cat.tail = G.Coats.normalizeTail(tail || state.cat.tail, state.cat.coat);
    G.CatArt.setCoat(state.cat.coat);
    G.CatArt.setAccessory(state.cat.accessory);
    G.CatArt.setTail(state.cat.tail);
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
  const STEP_LABEL = { name: 'Name', look: 'Look', tail: 'Tail', extras: 'Collar' };

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
      tail: G.Coats.normalizeTail(state.cat.tail, state.cat.coat),
      preset: state.cat.coat.preset || null, // the breed the tail was last matched to
      tailTouched: false, // once the player picks a tail, a new breed leaves it alone
    };
    const steps = mode === 'adopt' ? ['name', 'look', 'tail', 'extras'] : ['look', 'tail', 'extras'];
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
      G.CatArt.setTail(draft.tail);
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
        applyCoat(draft.coat, draft.accessory, draft.tail);
        close();
        leaveIntro(() => {
          sound('meow');
          scene.react({ say: 'Mrrp!', eyes: 'happy', hearts: 2 });
          toast(`Welcome home, ${v.name}! Tap ${v.name} to pet them — try the head, chin… and the belly, if you dare.`, 7000);
        });
      } else {
        applyCoat(draft.coat, draft.accessory, draft.tail);
        close();
        scene.focus = null;
        scene.react({ say: 'Mrrp?', eyes: 'happy', hearts: 1 });
      }
    }
    function cancel() {
      G.CatArt.setCoat(state.cat.coat);
      G.CatArt.setAccessory(state.cat.accessory);
      G.CatArt.setTail(state.cat.tail);
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
      } else if (k === 'tail') {
        const K = G.Coats;
        const T = draft.tail;
        const usual = draft.coat.preset ? K.tailFor(draft.coat) : null;
        const breed = usual && K.PRESETS.find((x) => x.id === draft.coat.preset).name;
        const differs = usual && (usual.length !== T.length || usual.fur !== T.fur);
        const chip = (attr, id, name, on) => `<button type="button" class="chip ${on ? 'on' : ''}" data-${attr}="${id}">${esc(name)}</button>`;
        body =
          `<h2>Tail</h2><p class="small muted">${breed ? `Set to suit ${esc(breed)} to begin with. ` : ''}Change it any way you like.</p>` +
          `<div class="tail-preview"><svg id="tailPreview" viewBox="-90 -150 180 160" aria-hidden="true"></svg></div>` +
          `<p class="look-label">Length</p><div class="row center">${K.TAILS.map((x) => chip('tail-length', x.id, x.name, T.length === x.id)).join('')}</div>` +
          `<p class="look-label">Fur</p><div class="row center">${K.FURS.map((x) => chip('tail-fur', x.id, x.name, T.fur === x.id)).join('')}</div>` +
          (differs ? `<div class="row center"><button type="button" class="chip" id="tailReset">Back to ${esc(breed)}’s usual tail</button></div>` : '');
      } else {
        const A = draft.accessory;
        body =
          `<h2>Collar &amp; extras</h2><p class="small muted">Optional, and you can change them later.</p>` +
          `<p class="look-label">Collar</p><div class="swatches">${G.Coats.COLLARS.filter((c) => G.Gacha.canWear(state, 'collar', c.id)).map((c) => `<button type="button" class="sw ${c.hex ? '' : 'sw-none'} ${A.collar === c.id ? 'on' : ''}" data-collar="${c.id}" style="--c:${c.hex || '#fcfcfc'}" title="${c.name}" aria-label="${c.name}"></button>`).join('')}</div>` +
          `<p class="look-label">Extra</p><div class="row center">${G.Coats.EXTRAS.filter((x) => G.Gacha.canWear(state, 'extra', x.id)).map((x) => `<button type="button" class="chip ${A.extra === x.id ? 'on' : ''}" data-extra="${x.id}">${esc(x.name)}</button>`).join('')}</div>`;
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
        lookPicker(el, draft.coat, (c) => {
          draft.coat = c;
          // Picking a breed sets its usual tail, unless the player has chosen one themselves.
          if (c.preset && c.preset !== draft.preset && !draft.tailTouched) draft.tail = G.Coats.tailFor(c);
          if (c.preset) draft.preset = c.preset;
          live();
        }, {
          onTab: (tab) => {
            el.classList.toggle('tall', tab === 'photo');
            refocus();
          },
        });
      } else if (k === 'tail') {
        const pv = el.querySelector('#tailPreview');
        pv.innerHTML = G.CatArt.withCoat(draft.coat, () => G.CatArt.render('sit', 'tp' + pickN++), draft.accessory, draft.tail);
        const pick = (patch) => {
          draft.tail = Object.assign({}, draft.tail, patch);
          draft.tailTouched = true;
          live();
          render();
        };
        el.querySelectorAll('[data-tail-length]').forEach((b) => b.addEventListener('click', () => pick({ length: b.dataset.tailLength })));
        el.querySelectorAll('[data-tail-fur]').forEach((b) => b.addEventListener('click', () => pick({ fur: b.dataset.tailFur })));
        const rs = el.querySelector('#tailReset');
        if (rs)
          rs.addEventListener('click', () => {
            draft.tail = G.Coats.tailFor(draft.coat);
            draft.tailTouched = false;
            live();
            render();
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

  // What's new. The Updates page is a list of releases (date, name, one-line summary); tapping
  // one opens its full breakdown. The one-time pop-up on login goes straight to the newest.
  function showUpdates(auto) {
    if (auto) showRelease(G.Updates.latest(), true, false);
    else showUpdatesList(false);
    if (G.Updates.pending(state)) {
      G.Updates.markSeen(state);
      save(true);
    }
  }

  function showUpdatesList(replace) {
    const U = G.Updates;
    openModal(
      `<div class="updates"><span class="upd-pill">Updates</span>
       <h2>What's new</h2>
       <p class="small muted">Everything that has been added to the game. Tap one to see what changed.</p>
       <ul class="upd-rows">${U.RELEASES.map(
         (r, i) =>
           `<li><button class="upd-row" data-rel="${i}"><span class="upd-when">${esc(r.date)}</span><b>${esc(r.name)}</b><span class="upd-sum">${esc(r.summary)}</span><small>${r.items.length} updates</small><svg class="upd-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></li>`
       ).join('')}</ul>
       <button class="btn primary" data-close>Close</button></div>`,
      (box) =>
        box.querySelectorAll('[data-rel]').forEach((b) =>
          b.addEventListener('click', () => {
            sound('pop');
            showRelease(U.RELEASES[Number(b.getAttribute('data-rel'))], false, true);
          })
        ),
      replace
    );
  }

  // One release in full. auto: the login pop-up (offers the list); otherwise a page you came to from the list.
  function showRelease(r, auto, replace) {
    const U = G.Updates;
    const items = r.items
      .map((it) => `<li><i class="upd-ico tone-${it.tone}">${ICONS[it.icon] || ICONS.paw}</i><div><b>${esc(it.title)}</b><span>${esc(it.text)}</span></div></li>`)
      .join('');
    const sub = auto ? `Here's what's new since ${esc(r.since || r.date)}.` : esc(r.summary);
    openModal(
      `<div class="updates"><span class="upd-pill">${auto ? 'New updates' : esc(r.date)}</span>
       <h2>${esc(r.title)}</h2>
       <p class="small muted">${sub}</p>
       <ul class="upd-list">${items}</ul>
       ${r.also ? `<p class="upd-also">${esc(r.also)}</p>` : ''}
       ${
         auto
           ? `<button class="btn primary" data-close>Got it, let's play</button><button class="upd-link" id="updAll">See all updates</button>`
           : `<div class="row"><button class="btn" id="updBack">All updates</button><button class="btn primary" data-close>Close</button></div>`
       }</div>`,
      (box) => {
        const go = box.querySelector('#updAll, #updBack');
        if (go) go.addEventListener('click', () => (sound('pop'), showUpdatesList(true)));
      },
      replace
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
    // Every card closes with the X in its top right corner (not the naming card, which must be filled in).
    box.innerHTML = (locked ? '' : `<button class="modal-x" data-close aria-label="Close">${ICONS.close}</button>`) + html;
    $('modal').hidden = false;
    if (onOpen) onOpen(box);
  }

  function closeModal() {
    // The naming card stays open until the cat has a name.
    if (modalLocked && !(state && state.named)) return;
    modalLocked = false;
    modalOpen = false;
    photoView = -1;
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
