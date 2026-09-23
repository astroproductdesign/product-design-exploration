/* Game 2 — Gathering Readiness: 3 × 60s rounds, speed rises each round.
   Sugar starts full (the treats are already eaten); meters carry across all 3 rounds. */
(function () {
  var U = S.U;

  var BASE_FALL = 120;          // px per second at ×1
  var BASE_SPAWN = 980;         // ms between spawns at ×1

  var SNACKS = [
    { key:'tart',    art:'tart',    label:'Pineapple tart',      sugar:6,  big:false },
    { key:'letters', art:'letters', label:'Love letter',         sugar:6,  big:false },
    { key:'bangkit', art:'bangkit', label:'Kuih bangkit',        sugar:6,  big:false },
    { key:'tray',    art:'tray',    label:'Tray of togetherness',sugar:14, big:true }
  ];
  var PRODUCTS = [
    { key:'brush', art:'brush', label:'Systema toothbrush', sugar:-8 },
    { key:'tube',  art:'tube',  label:'Systema toothpaste', sugar:-8 }
  ];

  S.Screens.game_gathering = function () {
    var ROUND_MS = S.CFG.ROUND_MS, SPEEDS = S.CFG.ROUND_SPEEDS;
    var st = {
      round: 0, sugar: 100, items: [], bowlX: 0, bowlW: 124,
      lastTs: 0, spawnAcc: 0, roundEnd: 0, raf: 0, running: false, finished: false,
      snacksThisRound: 0, perfectRounds: 0, startedAt: 0
    };

    var el = U.node(
      '<section class="screen" style="background:linear-gradient(180deg,#FBF3E4,#FFFFFF 38%)">' +
        '<div class="gamewrap">' +
          '<div class="g-top">' +
            '<button class="iconbtn" data-act="quit" aria-label="Quit game">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" stroke="#666" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<div style="text-align:center;line-height:1.2">' +
              '<div style="font-size:12.5px;font-weight:800" id="rlabel">Round 1 of 3</div>' +
              '<div style="font-size:10.5px;font-weight:800;color:var(--red)" id="slabel">Speed ×1</div>' +
            '</div>' +
            '<div class="timepill">' + U.ring(1) + '<span id="clock">1:00</span></div>' +
          '</div>' +
          '<div class="meters2">' +
            '<div class="m"><div class="lab" style="color:var(--red-d)"><span>Sugar</span><span id="sv">100%</span></div>' +
              '<div class="bar"><i id="sbar" style="width:100%;background:linear-gradient(90deg,#F08A4B,#E8642A)"></i></div></div>' +
            '<div class="m"><div class="lab" style="color:var(--teal)"><span>Cleanliness</span><span id="cv">0%</span></div>' +
              '<div class="bar"><i id="cbar" style="width:0%;background:var(--teal)"></i></div></div>' +
          '</div>' +
          '<div class="g2-field" id="field">' +
            '<div class="bowl" id="bowl">' + S.ART.bowl() + '</div>' +
          '</div>' +
          '<div class="g-hint" style="padding-bottom:12px">Drag the bowl — catch Systema, dodge the snacks</div>' +
        '</div>' +
      '</section>');

    var field = el.querySelector('#field');
    var bowl = el.querySelector('#bowl');
    var clock = el.querySelector('#clock');
    var ringC = el.querySelector('.timepill .ring').querySelectorAll('circle')[1];
    var sv = el.querySelector('#sv'), cv = el.querySelector('#cv');
    var sbar = el.querySelector('#sbar'), cbar = el.querySelector('#cbar');
    var rlabel = el.querySelector('#rlabel'), slabel = el.querySelector('#slabel');

    function meters() {
      var clean = 100 - st.sugar;
      sv.textContent = Math.round(st.sugar) + '%';
      cv.textContent = Math.round(clean) + '%';
      sbar.style.width = st.sugar + '%';
      cbar.style.width = clean + '%';
    }

    /* ---------- bowl dragging ---------- */
    function setBowl(px) {
      var w = field.clientWidth;
      st.bowlX = Math.max(0, Math.min(w - st.bowlW, px - st.bowlW / 2));
      bowl.style.transform = 'translateX(' + st.bowlX + 'px)';
    }
    var dragging = false;
    function dstart(e) { dragging = true; dmove(e); }
    function dmove(e) {
      if (!dragging) return;
      var p = e.touches ? e.touches[0] : e;
      setBowl(p.clientX - field.getBoundingClientRect().left);
      e.preventDefault();
    }
    function dend() { dragging = false; }
    field.addEventListener('pointerdown', dstart);
    field.addEventListener('pointermove', dmove);
    window.addEventListener('pointerup', dend);
    field.addEventListener('touchstart', dstart, { passive: false });
    field.addEventListener('touchmove', dmove, { passive: false });
    window.addEventListener('touchend', dend);

    /* ---------- spawning ---------- */
    function spawn() {
      var isSnack = Math.random() < 0.62;
      var def = isSnack ? SNACKS[Math.floor(Math.random() * SNACKS.length)]
                        : PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      var node = document.createElement('div');
      node.className = 'faller' + (def.big ? ' big' : '');
      node.innerHTML = S.ART[def.art]();
      var w = def.big ? 62 : 46;
      var x = Math.random() * Math.max(10, field.clientWidth - w);
      var item = { def: def, snack: isSnack, x: x, y: -70, w: w, rot: (Math.random() * 30 - 15), spin: (Math.random() * 40 - 20), node: node };
      node.style.transform = 'translate(' + x + 'px,-70px)';
      field.appendChild(node);
      st.items.push(item);
    }

    function catchItem(item) {
      st.sugar = Math.max(0, Math.min(100, st.sugar + item.def.sugar));
      if (item.snack) st.snacksThisRound++;
      meters();
      var pop = document.createElement('div');
      pop.className = 'tiny';
      pop.style.cssText = 'position:absolute;left:' + item.x + 'px;bottom:70px;font-weight:800;pointer-events:none;' +
        'color:' + (item.snack ? '#C8102E' : '#3d9da1') + ';transition:transform .6s,opacity .6s';
      pop.textContent = (item.def.sugar > 0 ? '+' : '') + item.def.sugar + ' sugar';
      field.appendChild(pop);
      setTimeout(function () { pop.style.transform = 'translateY(-26px)'; pop.style.opacity = 0; }, 16);
      setTimeout(function () { if (pop.parentNode) pop.remove(); }, 620);
    }

    function clearItems() {
      st.items.forEach(function (i) { if (i.node.parentNode) i.node.remove(); });
      st.items = [];
    }

    /* ---------- loop ---------- */
    function loop(ts) {
      if (!st.running) return;
      if (!st.lastTs) st.lastTs = ts;
      var dt = Math.min(48, ts - st.lastTs) / 1000;
      st.lastTs = ts;

      var mult = SPEEDS[st.round];
      var h = field.clientHeight;
      var bowlTop = h - 58;

      st.spawnAcc += dt * 1000;
      if (st.spawnAcc > BASE_SPAWN / mult) { st.spawnAcc = 0; spawn(); }

      for (var i = st.items.length - 1; i >= 0; i--) {
        var it = st.items[i];
        it.y += BASE_FALL * mult * dt;
        it.rot += it.spin * dt;
        it.node.style.transform = 'translate(' + it.x + 'px,' + it.y + 'px) rotate(' + it.rot.toFixed(1) + 'deg)';
        var cx = it.x + it.w / 2;
        if (it.y + it.w * 0.72 >= bowlTop && it.y < h - 10 &&
            cx > st.bowlX + 12 && cx < st.bowlX + st.bowlW - 12) {
          catchItem(it); it.node.remove(); st.items.splice(i, 1); continue;
        }
        if (it.y > h + 20) { it.node.remove(); st.items.splice(i, 1); }
      }

      var left = Math.max(0, st.roundEnd - ts);
      clock.textContent = U.fmtTime(left);
      var len = parseFloat(ringC.getAttribute('stroke-dasharray'));
      ringC.setAttribute('stroke-dashoffset', (len * (1 - left / ROUND_MS)).toFixed(1));
      if (left <= 0) endRound();
    }

    function startRound(n) {
      st.round = n;
      st.snacksThisRound = 0;
      rlabel.textContent = 'Round ' + (n + 1) + ' of 3';
      slabel.textContent = 'Speed ×' + SPEEDS[n];
      var flash = U.node('<div class="roundflash"><div class="eyebrow">Round ' + (n + 1) + ' of 3</div>' +
        '<div class="big">Speed ×' + SPEEDS[n] + '</div>' +
        '<p class="muted" style="text-align:center;max-width:24ch">' +
        (n === 0 ? 'Sugar starts full — you have already enjoyed the treats. Now defend.'
                 : 'They fall faster and thicker. Keep catching Systema.') + '</p></div>');
      field.appendChild(flash);
      setTimeout(function () {
        if (flash.parentNode) flash.remove();
        setBowl(field.clientWidth / 2);
        st.lastTs = 0; st.spawnAcc = 0;
        st.roundEnd = performance.now() + ROUND_MS;
        st.running = true;
        st.ticker = U.ticker(loop);
      }, 1500);
    }

    function endRound() {
      st.running = false;
      if (st.ticker) st.ticker.stop();
      clearItems();
      if (st.snacksThisRound === 0) st.perfectRounds++;
      if (st.round < 2) startRound(st.round + 1);
      else finish();
    }

    function finish() {
      if (st.finished) return;
      st.finished = true;
      var clean = Math.round(100 - st.sugar);
      var candidates = [];
      if (st.sugar <= 20) candidates.push('zeroSugar');
      if (st.perfectRounds > 0) candidates.push('perfectDodge');

      var res = S.Store.recordSession({
        game: 'gathering',
        cleanliness: clean,
        sugar: Math.round(st.sugar),
        durationMs: performance.now() - st.startedAt,
        badge: candidates.length ? S.badgeById(candidates[0]).name : null,
        badgeCandidates: candidates
      });

      var revealBadge = res.newBadges.length ? S.badgeById(res.newBadges[0]) : null;
      var next = revealBadge ? U.coupletReveal(field, revealBadge) : Promise.resolve();
      next.then(function () {
        var scene = U.node(
          '<div class="roundflash" style="background:rgba(255,255,255,.97);padding:22px">' +
            '<svg viewBox="0 0 260 140" style="width:100%;max-width:280px" aria-hidden="true">' +
              '<rect width="260" height="140" rx="14" fill="#E9EDF6"/><rect y="104" width="260" height="36" fill="#DDE2EE"/>' +
              '<g fill="#334073"><circle cx="108" cy="52" r="15"/><path d="M108,69 q-20,5 -20,34 h40 q0,-29 -20,-34 Z"/>' +
              '<circle cx="152" cy="48" r="15"/><path d="M152,65 q-20,5 -20,38 h40 q0,-33 -20,-38 Z"/></g>' +
              '<ellipse cx="130" cy="100" rx="82" ry="22" fill="#C8102E"/><ellipse cx="130" cy="96" rx="82" ry="22" fill="#D63038"/>' +
              '<g fill="#F4F1EA"><circle cx="98" cy="94" r="9"/><circle cx="130" cy="88" r="10"/><circle cx="162" cy="94" r="9"/></g>' +
              '<g transform="translate(40,58)"><circle r="17" fill="#001689"/><path d="M-8,4 q8,7 16,0" stroke="#EFC463" stroke-width="3" fill="none" stroke-linecap="round"/>' +
              '<path d="M0,17 q-24,6 -24,48 h48 q0,-42 -24,-48 Z" fill="#001689"/></g>' +
            '</svg>' +
            '<div class="eyebrow" style="color:var(--gold);margin-top:8px">Gathering ready</div>' +
            '<h2 style="font-size:22px;color:var(--blue);text-align:center;max-width:16ch">You walked in defended, not deprived.</h2>' +
            '<p class="muted" style="text-align:center;max-width:26ch">Finished at ' + clean + '% cleanliness — after the snacks, not instead of them.</p>' +
            '<button class="btn" data-act="next" style="margin-top:10px">See your share card</button>' +
            '<button class="btn ghost" data-act="retry">Play again</button>' +
          '</div>');
        field.appendChild(scene);
        U.on(scene, '[data-act]', 'click', function (e, b) {
          if (b.dataset.act === 'retry') S.Router.go('#/game/gathering', { force: true });
          else S.Router.go('#/share/gathering');
        });
      });
    }

    U.on(el, '[data-act="quit"]', 'click', function () { st.running = false; st.finished = true; if (st.ticker) st.ticker.stop(); S.Router.go('#/home'); });

    setTimeout(function () {
      S.Store.bumpAttempt('gathering');
      st.startedAt = performance.now();
      st.bowlW = bowl.offsetWidth || 124;
      setBowl(field.clientWidth / 2);
      meters();
      startRound(0);
    }, 240);

    return {
      el: el, tab: null,
      destroy: function () {
        st.running = false; st.finished = true; if (st.ticker) st.ticker.stop();
        window.removeEventListener('pointerup', dend); window.removeEventListener('touchend', dend);
      }
    };
  };
})();
