// The daily check-in: tap the laptop on the table and a laptop window opens with a stamp card in
// the middle. Tap today's circle and the cat's paw pops up from below and stamps it, leaving a
// rough, slanted paw print with the date underneath. Five stamps (on any days) fill a card, and
// the fifth pays a coin bonus. The rules live in Progression (checkIn); this file is the screen.
// The window can't be closed until you have checked in.
(function (G) {
  'use strict';

  const INK = '#1b1714';
  const TILT = [-17, 15, -22, 13, -15]; // each print sits at its own slant
  let api = null;
  let busy = false;
  let doneToday = false;
  let pending = null; // what the last stamp did (a level-up to celebrate once the window closes)

  // ---- art ---------------------------------------------------------------------------------

  const PAW = '<path d="M32 30c-8 0-16 8-16 16 0 6 6 10 16 6 10 4 16 0 16-6 0-8-8-16-16-16z"/><ellipse cx="13" cy="27" rx="6" ry="8" transform="rotate(-22 13 27)"/><ellipse cx="26" cy="15" rx="6" ry="8.5" transform="rotate(-6 26 15)"/><ellipse cx="38" cy="15" rx="6" ry="8.5" transform="rotate(6 38 15)"/><ellipse cx="51" cy="27" rx="6" ry="8" transform="rotate(22 51 27)"/>';
  // the stamped print: pink ink, rough and speckled (the filter is defined once, in ensureDefs)
  const PRINT = `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="#ff5c86" filter="url(#ckInk)">${PAW}</g></svg>`;
  const GHOST = `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="${INK}">${PAW}</g></svg>`;
  const GIFT =
    `<svg class="ck-gift" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="50" rx="22" ry="7" fill="#c99a2c" stroke="${INK}" stroke-width="3"/><circle cx="22" cy="40" r="11" fill="#ecbc44" stroke="${INK}" stroke-width="3"/><circle cx="42" cy="40" r="11" fill="#ecbc44" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="28" r="12" fill="#f6d55c" stroke="${INK}" stroke-width="3"/><path d="M26 28h12M32 22v12" stroke="#c99a2c" stroke-width="3" stroke-linecap="round"/></svg>`;
  const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6z" fill="#f6d55c" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;

  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };

  // The paw's colours come from the cat's own coat: fur, white mittens (or dark "points"), and marks.
  function pawCoat(coat) {
    const C = G.Coats.colors(coat);
    const mitten = coat.white === 'chest';
    return {
      fur: C.base,
      tip: mitten ? '#fcfcfc' : coat.pattern === 'points' ? C.point : C.base,
      mark: C.stripe,
      mark2: C.patch,
      kind: coat.pattern === 'stripes' ? 'stripes' : coat.pattern === 'patches' ? 'patches' : 'none',
      pad: '#f4accc',
      dark: lum(C.base) < 0.35,
    };
  }

  // A wide, fat, stubby paw seen palm-on: rounded top, four toe beans, a big pad, a cuff mark, and a
  // long arm so it can reach up from below. The pad sits at (48, 90): that is what lands on the circle.
  function pawSvg(c) {
    const body = 'M4 520V56Q4 6 48 6Q92 6 92 56V520Z';
    let marks = '';
    if (c.kind === 'stripes') marks = `<path d="M4 176Q48 190 92 176M4 212Q48 226 92 212M4 248Q48 262 92 248M4 284Q48 298 92 284" fill="none" stroke="${c.mark}" stroke-width="7" stroke-linecap="round"/>`;
    if (c.kind === 'patches') marks = `<ellipse cx="74" cy="214" rx="30" ry="38" fill="${c.mark2}"/><ellipse cx="14" cy="290" rx="30" ry="40" fill="${c.mark}"/>`;
    const beans = [[22, 54, -22], [38, 31, -8], [58, 31, 8], [74, 54, 22]]
      .map((t) => `<ellipse cx="${t[0]}" cy="${t[1]}" rx="7.4" ry="9.6" transform="rotate(${t[2]} ${t[0]} ${t[1]})" fill="${c.pad}"/>`)
      .join('');
    const tick = c.dark ? '#cfcfd6' : INK;
    return (
      `<svg viewBox="0 0 96 200" aria-hidden="true"><defs><clipPath id="ckPawClip"><path d="${body}"/></clipPath></defs>` +
      `<path d="${body}" fill="${c.fur}"/>` +
      `<g clip-path="url(#ckPawClip)"><path d="M0 0H96V134Q84 144 72 134Q60 144 48 134Q36 144 24 134Q12 144 0 134Z" fill="${c.tip}"/>${marks}</g>` +
      `<path d="${body}" fill="none" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round"/>` +
      beans +
      `<path d="M48 66C31 66 21 79 21 92C21 106 33 110 48 105C63 110 75 106 75 92C75 79 65 66 48 66Z" fill="${c.pad}"/>` +
      `<path d="M39 130H57" stroke="${tick}" stroke-width="3" stroke-linecap="round"/></svg>`
    );
  }

  // The rough, speckled ink filter, added to the page once.
  function ensureDefs() {
    if (document.getElementById('ckDefs')) return;
    const d = document.createElement('div');
    d.id = 'ckDefs';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML =
      '<svg width="0" height="0" style="position:absolute" focusable="false"><defs>' +
      '<filter id="ckInk" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="warp"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="warp" scale="4" xChannelSelector="R" yChannelSelector="G" result="rough"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="9" result="grain"/>' +
      '<feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  4.2 0 0 0 -1.2" result="mask"/>' +
      '<feComposite in="rough" in2="mask" operator="in"/></filter></defs></svg>' +
      '<div id="ckfx"></div>';
    document.body.append(d);
  }

  // ---- the window ---------------------------------------------------------------------------

  const dayParts = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return { wk: dt.toLocaleDateString([], { weekday: 'short' }), dm: dt.toLocaleDateString([], { day: 'numeric', month: 'short' }) };
  };

  function portrait(happy) {
    return `<svg viewBox="-56 -56 112 92" aria-hidden="true">${G.CatArt.renderHead('ck', happy ? 'happy' : 'open')}</svg>`;
  }

  function slotsHtml(view, fresh) {
    const n = view.stamps.length;
    let html = '';
    for (let i = 1; i <= view.size; i++) {
      const done = i <= n;
      const today = !view.done && i === n + 1;
      const big = i === view.size;
      let inner = '';
      if (done) {
        inner = `<span class="ck-print${fresh === i ? ' fresh' : ''}" style="--rot:${TILT[i - 1]}deg">${PRINT}</span>`;
        if (big) inner = GIFT + inner;
      } else if (big) {
        inner = GIFT;
      } else {
        inner = `<span>${i}</span>`;
        if (today) inner += `<span class="ck-ghost">${GHOST}</span>`;
      }
      if (today) inner += '<span class="ck-tap">Tap</span>';
      const p = done ? dayParts(view.stamps[i - 1]) : null;
      const label = `Check-in ${i}${done ? `, stamped ${p.wk} ${p.dm}` : today ? ", today. Tap to stamp your card" : ', not yet'}`;
      const cls = `ck-slot ${done ? 'done' : today ? 'today' : 'future'}${big ? ' big' : ''}`;
      const open = today ? `<button type="button" class="${cls}" id="ckToday" aria-label="${label}">` : `<div class="${cls}" role="img" aria-label="${label}">`;
      const close = today ? '</button>' : '</div>';
      const under = done
        ? `<span class="ck-lab dt${fresh === i ? ' fresh' : ''}"><b>${p.wk}</b><span>${p.dm}</span></span>`
        : `<span class="ck-lab">${today ? 'Today' : 'Day ' + i}</span>`;
      html += `<div class="ck-col">${open}${inner}${close}${under}</div>`;
    }
    return html;
  }

  function texts(view) {
    const name = api.state().cat.name;
    const n = view.stamps.length;
    const left = view.size - n;
    return {
      sub: view.done ? 'Stamped for today. See you next time!' : `Check-in ${n + 1} of ${view.size} on this card. ${name} has a paw ready.`,
      status: !view.done
        ? `Tap today's circle and <b>${api.esc(name)}</b> will stamp your card.`
        : left === 0
          ? 'Card complete! Your <b>gold coin bonus</b> is on its way. A fresh card starts at your next check-in.'
          : `Stamped! <b>${left} more check-in${left === 1 ? '' : 's'}</b> to the gold coin bonus.`,
    };
  }

  function keysHtml() {
    return [14, 13, 12].map((n, r) => `<div class="ck-keyrow" style="padding:0 ${r * 9}px">${'<i></i>'.repeat(n)}</div>`).join('');
  }

  function windowHtml(view) {
    const t = texts(view);
    const name = api.esc(api.state().cat.name);
    return (
      `<div class="ck-laptop"><div class="ck-lid"><div class="ck-bezel"><i class="ck-cam"></i><div class="ck-screen"><div class="ck-app">` +
      `<div class="ck-titlebar"><span class="ck-dots"><i></i><i></i><i></i></span><span>Daily check-in</span><span>purrfriend</span></div>` +
      `<div class="ck-body"><div class="ck-head"><div class="ck-portrait" id="ckPortrait">${portrait(view.done)}</div><div><h2>Check in with ${name}</h2><p id="ckSub">${t.sub}</p></div></div>` +
      `<div class="ck-card" id="ckCard"><div class="ck-cardtitle"><span>My Purrfriend stamp card</span><b id="ckNo">Card ${cardNo(view)}</b></div><div class="ck-slots" id="ckSlots">${slotsHtml(view, 0)}</div></div>` +
      `<p class="ck-status" id="ckStatus" aria-live="polite">${t.status}</p>` +
      `<button class="btn primary ck-done" id="ckDone" ${view.done ? '' : 'hidden'}>Done</button>` +
      `</div></div></div></div></div><div class="ck-hinge"></div><div class="ck-base" aria-hidden="true"><div class="ck-keys">${keysHtml()}</div></div></div>`
    );
  }

  const cardNo = (view) => {
    const c = api.state().checkin;
    return view.done && view.stamps.length === view.size ? c.cards : c.cards + 1;
  };

  // ---- the stamp ----------------------------------------------------------------------------

  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const calm = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function flyCoins(from, n) {
    const fx = document.getElementById('ckfx');
    const target = document.getElementById('coinIco');
    if (!fx || !target) return setTimeout(api.updateHUD, 200);
    const to = centre(target);
    let landed = 0;
    for (let k = 0; k < n; k++) {
      const c = document.createElement('div');
      c.className = 'ck-flycoin';
      c.innerHTML = api.coinSvg;
      c.style.left = from.x - 13 + 'px';
      c.style.top = from.y - 13 + 'px';
      fx.append(c);
      const ang = (k / n) * Math.PI * 2 + Math.random() * 0.6;
      const burst = n > 1 ? 46 + Math.random() * 30 : 0;
      const bx = Math.cos(ang) * burst;
      const by = Math.sin(ang) * burst - (n > 1 ? 24 : 18);
      const finish = () => {
        c.remove();
        landed++;
        if (landed === 1 || landed === n) api.sound('coin');
        if (landed === n) api.updateHUD();
      };
      if (calm() || !c.animate) {
        setTimeout(finish, 200);
        continue;
      }
      c.animate(
        [
          { transform: 'translate(0,0) scale(.4)', opacity: 0 },
          { transform: `translate(${bx}px,${by}px) scale(1.15)`, opacity: 1, offset: 0.35 },
          { transform: `translate(${to.x - from.x}px,${to.y - from.y}px) scale(.7)`, opacity: 1 },
        ],
        { duration: n > 1 ? 880 : 760, delay: n > 1 ? 420 + k * 70 : 240, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' }
      ).onfinish = finish;
    }
  }

  function sparkle(at) {
    if (calm()) return;
    const fx = document.getElementById('ckfx');
    for (let k = 0; k < 12; k++) {
      const s = document.createElement('div');
      s.className = 'ck-spark';
      s.innerHTML = STAR;
      s.style.left = at.x - 7 + 'px';
      s.style.top = at.y - 7 + 'px';
      fx.append(s);
      const a = (k / 12) * Math.PI * 2;
      const d = 54 + Math.random() * 36;
      s.animate(
        [
          { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(1.2) rotate(120deg)`, opacity: 0 },
        ],
        { duration: 780, easing: 'ease-out', fill: 'forwards' }
      ).onfinish = () => s.remove();
    }
  }

  // Redraw the card after the stamp lands.
  function showResult(view, fresh) {
    const t = texts(view);
    document.getElementById('ckSlots').innerHTML = slotsHtml(view, fresh);
    document.getElementById('ckPortrait').innerHTML = portrait(view.done);
    document.getElementById('ckSub').textContent = t.sub;
    document.getElementById('ckStatus').innerHTML = t.status;
    document.getElementById('ckNo').textContent = 'Card ' + cardNo(view);
  }

  function stamp() {
    const slot = document.getElementById('ckToday');
    if (busy || doneToday || !slot) return;
    busy = true;
    const at = centre(slot);

    const land = () => {
      const st = api.state();
      const t = api.now();
      const res = G.Progression.checkIn(st, t);
      doneToday = true;
      if (res) pending = res;
      const view = G.Progression.checkinView(st, t);
      showResult(view, res ? res.n : 0);
      document.getElementById('ckDone').hidden = false;
      const card = document.getElementById('ckCard');
      card.classList.remove('ck-shake');
      void card.offsetWidth;
      card.classList.add('ck-shake');
      if (res) {
        flyCoins(centre(document.querySelectorAll('.ck-slot')[res.n - 1]), res.coins);
        if (res.full) {
          sparkle(at);
          api.sound('chime');
        }
        api.renderRoom(); // the laptop stops pulsing
        api.save(true);
      }
    };

    api.sound('pop');
    if (calm() || !slot.animate) {
      land();
      busy = false;
      return;
    }

    // the paw pops up from below the window, presses the circle, then slips back down
    const fx = document.getElementById('ckfx');
    const arm = document.createElement('div');
    arm.className = 'ck-arm';
    arm.innerHTML = pawSvg(pawCoat(api.state().cat.coat));
    arm.style.left = at.x - 48 + 'px';
    arm.style.top = at.y - 90 + 'px';
    arm.style.transformOrigin = '48px 90px';
    fx.append(arm);
    slot.style.animation = 'none';
    const below = window.innerHeight - (at.y - 90) + 40;
    const anim = arm.animate(
      [
        { transform: `translateY(${below}px) scale(1)`, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: 'translateY(16px) scale(1)', offset: 0.36, easing: 'ease-in' },
        { transform: 'translateY(0) scale(.92)', offset: 0.46 },
        { transform: 'translateY(0) scale(.92)', offset: 0.6, easing: 'cubic-bezier(.5,0,.8,.3)' },
        { transform: `translateY(${below + 20}px) scale(1)` },
      ],
      { duration: 1600, fill: 'forwards' }
    );
    setTimeout(land, 740);
    anim.onfinish = () => {
      arm.remove();
      busy = false;
    };
  }

  // ---- opening ------------------------------------------------------------------------------

  function open() {
    const st = api.state();
    const t = api.now();
    const view = G.Progression.checkinView(st, t);
    doneToday = view.done;
    busy = false;
    pending = null;
    api.openModal(
      windowHtml(view),
      (box) => {
        // (these elements are new each time the window opens, so nothing piles up)
        box.querySelector('#ckSlots').addEventListener('click', (e) => {
          if (e.target.closest('#ckToday')) stamp();
        });
        box.querySelector('#ckDone').addEventListener('click', () => {
          if (!doneToday || busy) return;
          const res = pending;
          api.closeModal();
          if (res && res.levelUp) setTimeout(() => api.celebrate(res), 300);
        });
      },
      false,
      false,
      { cls: 'ck-modal', guard: () => !doneToday || busy } // no way out until you have checked in
    );
  }

  function init(a) {
    api = a;
    ensureDefs();
  }

  G.CheckIn = { init, open, pawSvg, pawCoat };
})(globalThis.CatGame = globalThis.CatGame || {});
