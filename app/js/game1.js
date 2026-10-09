/* Game 1 — Smile Swipe.
   Two rows of individual teeth. Every tooth starts stained; 8 of them hide a CNY
   food item that has to be revealed and then brushed away as well. A Systema
   toothbrush follows the finger as the brushing tool. */
(function () {
  var U = S.U;

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  S.Screens.game_smile = function () {
    var CFG = S.SMILE;
    var DURATION = S.CFG.SMILE_MS;
    var layout = CFG.ROW_LAYOUT;
    var perRow = layout.length;

    /* ---------- build the mouth ---------- */
    var teeth = [];
    for (var r = 0; r < 2; r++) {
      for (var i = 0; i < perRow; i++) {
        var type = layout[i];
        teeth.push({
          row: r, idx: i, type: type,
          stainMax: CFG.STAIN[type], stain: CFG.STAIN[type],
          item: null, itemMax: 0, itemLeft: 0,
          revealed: false, done: false
        });
      }
    }
    // one food item per tooth, no repeats, random placement every playthrough
    var foods = shuffled(S.ART.foodKeys()).slice(0, CFG.HIDDEN_ITEMS);
    shuffled(teeth.map(function (_, n) { return n; })).slice(0, foods.length).forEach(function (n, k) {
      teeth[n].item = foods[k];
      teeth[n].itemMax = CFG.ITEM_CLEAR;
      teeth[n].itemLeft = CFG.ITEM_CLEAR;
    });

    var TOTAL = teeth.reduce(function (sum, t) { return sum + t.stainMax + t.itemMax; }, 0);
    var trayOrder = teeth.filter(function (t) { return t.item; }).map(function (t) { return t.item; });

    var state = {
      cleared: 0, combo: 0, bestCombo: 0, lastCleanAt: 0,
      found: [], start: 0, endAt: 0, finished: false, reached: null,
      dragging: false, lastTooth: -1, lastX: 0, timer: null
    };

    function toothHtml(t, n) {
      return '<div class="tooth" data-n="' + n + '" style="flex:' + CFG.WIDTH[t.type] + '">' +
        '<div class="food">' + (t.item ? S.ART.food(t.item, 26) : '') + '</div>' +
        '<i class="stain"></i></div>';
    }
    function rowHtml(row) {
      return '<div class="teethrow ' + (row === 0 ? 'up' : 'down') + '" data-row="' + row + '">' +
        teeth.map(function (t, n) { return t.row === row ? toothHtml(t, n) : ''; }).join('') + '</div>';
    }

    var el = U.node(
      '<section class="screen" style="background:linear-gradient(180deg,#FBF3E4,#FFFFFF 42%)">' +
        '<div class="gamewrap">' +
          '<div class="g-top">' +
            '<button class="iconbtn" data-act="quit" aria-label="Quit game">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" stroke="#666" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<div class="timepill">' + U.ring(1) + '<span id="clock">1:00</span></div>' +
            '<div class="chip teal" style="font-size:12px;padding:7px 13px" id="pct">0%</div>' +
          '</div>' +
          '<div class="g-hint">Brush every tooth — some are hiding something</div>' +
          '<div class="g1-stage" id="stage">' +
            '<div class="mouth">' +
              S.ART.lip('upper') + rowHtml(0) +
              '<div class="mouthgap"></div>' +
              rowHtml(1) + S.ART.lip('lower') +
              '<div class="brushcursor" id="brush">' + S.ART.brushCursor() + '</div>' +
            '</div>' +
            '<div class="statline">' +
              '<div class="pctbig" id="big">0%</div>' +
              '<div class="combo" id="combo">' + S.ART.star(15) + '<span>Combo x0</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="tray">' +
            '<div class="trayhead"><span class="eyebrow">Discoveries</span><span class="tiny" id="trayCount">0 / ' + foods.length + '</span></div>' +
            '<div class="trayslots" id="tray">' +
              trayOrder.map(function (k, n) { return '<div class="slot" data-slot="' + n + '"></div>'; }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>');

    var stage = el.querySelector('#stage');
    var mouth = el.querySelector('.mouth');
    var brush = el.querySelector('#brush');
    var clock = el.querySelector('#clock');
    var ringEl = el.querySelector('.timepill .ring');
    var pctEl = el.querySelector('#pct');
    var bigEl = el.querySelector('#big');
    var comboEl = el.querySelector('#combo');
    var trayEl = el.querySelector('#tray');
    var trayCount = el.querySelector('#trayCount');
    var toothEls = el.querySelectorAll('.tooth');

    teeth.forEach(function (t, n) { t.el = toothEls[n]; t.stainEl = toothEls[n].querySelector('.stain'); t.foodEl = toothEls[n].querySelector('.food'); });

    function readouts() {
      var pct = Math.min(100, Math.round((state.cleared / TOTAL) * 100));
      pctEl.textContent = pct + '%';
      bigEl.textContent = pct + '%';
      comboEl.lastElementChild.textContent = 'Combo x' + state.combo;
      return pct;
    }

    function sparkle(t) {
      var mb = mouth.getBoundingClientRect(), tb = t.el.getBoundingClientRect();
      var host = document.createElement('div');
      host.className = 'sparkles';
      host.style.left = (tb.left - mb.left + tb.width / 2) + 'px';
      host.style.top = (tb.top - mb.top + tb.height / 2) + 'px';
      for (var i = 0; i < 8; i++) {
        var a = (Math.PI * 2 * i) / 8 + Math.random() * .5;
        var d = 22 + Math.random() * 26;
        var s2 = document.createElement('span');
        s2.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
        s2.style.setProperty('--dy', (Math.sin(a) * d).toFixed(0) + 'px');
        s2.innerHTML = S.ART.star(9 + Math.random() * 7);
        host.appendChild(s2);
      }
      mouth.appendChild(host);
      setTimeout(function () { if (host.parentNode) host.remove(); }, 820);
    }

    function markDone(t) {
      t.done = true;
      t.el.classList.add('clean');
      var now = performance.now();
      state.combo = (now - state.lastCleanAt < CFG.COMBO_WINDOW) ? state.combo + 1 : 1;
      state.lastCleanAt = now;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      comboEl.classList.add('pop');
      setTimeout(function () { comboEl.classList.remove('pop'); }, 180);
    }

    function reveal(t) {
      t.revealed = true;
      t.el.classList.add('revealed');
      t.foodEl.classList.add('show');
      state.found.push(t.item);
      var slot = trayEl.children[state.found.length - 1];
      if (slot) { slot.innerHTML = S.ART.food(t.item, 26); slot.classList.add('filled'); }
      trayCount.textContent = state.found.length + ' / ' + foods.length;
      sparkle(t);
    }

    /** one brush pass over a tooth */
    function swipeTooth(n) {
      var t = teeth[n];
      if (state.finished || t.done) return;
      if (t.stain > 0) {
        var used = Math.min(1, t.stain);
        t.stain -= used;
        state.cleared += used;
        t.stainEl.style.opacity = (t.stain / t.stainMax).toFixed(3);
        if (t.stain <= 0) {
          t.stainEl.style.opacity = 0;
          if (t.item) reveal(t); else markDone(t);
        }
      } else if (t.itemLeft > 0) {
        var u2 = Math.min(1, t.itemLeft);
        t.itemLeft -= u2;
        state.cleared += u2;
        t.foodEl.style.opacity = Math.max(0, t.itemLeft / t.itemMax).toFixed(2);
        t.foodEl.style.transform = 'scale(' + (0.72 + 0.28 * (t.itemLeft / t.itemMax)).toFixed(2) + ')';
        if (t.itemLeft <= 0) { t.foodEl.classList.remove('show'); markDone(t); }
      }
      var pct = readouts();
      if (pct >= 100 && !state.reached) { state.reached = performance.now() - state.start; finish(); }
    }

    /* ---------- gestures ---------- */
    function toothAt(x, y) {
      for (var n = 0; n < toothEls.length; n++) {
        var b = toothEls[n].getBoundingClientRect();
        if (x >= b.left && x <= b.right && y >= b.top - 8 && y <= b.bottom + 8) return n;
      }
      return -1;
    }
    function moveBrush(x, y) {
      var mb = mouth.getBoundingClientRect();
      var dx = x - state.lastX; state.lastX = x;
      var tilt = Math.max(-14, Math.min(14, dx * 1.6));
      brush.style.transform = 'translate(' + (x - mb.left) + 'px,' + (y - mb.top) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
    }
    function down(e) {
      state.dragging = true;
      brush.classList.add('on');
      var p = e.touches ? e.touches[0] : e;
      state.lastX = p.clientX;
      move(e);
    }
    function move(e) {
      if (!state.dragging || state.finished) return;
      var p = e.touches ? e.touches[0] : e;
      moveBrush(p.clientX, p.clientY);
      var n = toothAt(p.clientX, p.clientY);
      if (n >= 0 && n !== state.lastTooth) { swipeTooth(n); state.lastTooth = n; }
      if (n < 0) state.lastTooth = -1;          // leaving the arch re-arms the last tooth
      if (e.cancelable) e.preventDefault();
    }
    function up() { state.dragging = false; state.lastTooth = -1; brush.classList.remove('on'); }

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    stage.addEventListener('touchstart', down, { passive: false });
    stage.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);

    /* ---------- clock ---------- */
    function tick() {
      if (state.finished) return;
      var left = Math.max(0, state.endAt - performance.now());
      clock.textContent = U.fmtTime(left);
      var c = ringEl.querySelectorAll('circle')[1];
      var len = parseFloat(c.getAttribute('stroke-dasharray'));
      c.setAttribute('stroke-dashoffset', (len * (1 - left / DURATION)).toFixed(1));
      if (left <= 0) finish();
    }

    function finish() {
      if (state.finished) return;
      state.finished = true;
      if (state.timer) state.timer.stop();
      var cleanliness = Math.min(100, Math.round((state.cleared / TOTAL) * 100));
      var timeMs = state.reached != null ? Math.round(state.reached) : null;
      var candidates = cleanliness >= 100 ? ['perfectShine'] : [];

      var res = S.Store.recordSession({
        game: 'smile',
        timeMs: timeMs,
        cleanliness: cleanliness,
        combo: state.bestCombo,
        discoveries: state.found.slice(),
        badge: cleanliness >= 100 ? 'Perfect Shine' : null,
        badgeCandidates: candidates
      });

      var revealBadge = res.newBadges.length ? S.badgeById(res.newBadges[0]) : null;
      var next = revealBadge ? U.coupletReveal(stage, revealBadge) : Promise.resolve();
      next.then(function () { payoff(cleanliness, timeMs, res); });
    }

    function payoff(cleanliness, timeMs, res) {
      var done = cleanliness >= 100;
      var scene = U.node(
        '<div class="reveal" style="background:rgba(255,255,255,.97)">' +
          '<svg viewBox="0 0 260 150" style="width:100%;max-width:280px" aria-hidden="true">' +
            '<rect width="260" height="150" rx="14" fill="#E9EDF6"/><rect y="112" width="260" height="38" fill="#DDE2EE"/>' +
            '<g><rect x="18" y="18" width="18" height="62" rx="3" fill="#C8102E"/><rect x="42" y="18" width="18" height="62" rx="3" fill="#C8102E"/>' +
            '<g fill="#D4A017"><rect x="24" y="28" width="6" height="6" rx="1"/><rect x="24" y="42" width="6" height="6" rx="1"/><rect x="24" y="56" width="6" height="6" rx="1"/>' +
            '<rect x="48" y="28" width="6" height="6" rx="1"/><rect x="48" y="42" width="6" height="6" rx="1"/><rect x="48" y="56" width="6" height="6" rx="1"/></g></g>' +
            '<g transform="translate(112,52)"><circle r="20" fill="#001689"/><path d="M-9,5 q9,8 18,0" stroke="#EFC463" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
            '<path d="M0,20 q-28,7 -28,58 h56 q0,-51 -28,-58 Z" fill="#001689"/></g>' +
            '<g transform="translate(180,62)" opacity=".92"><circle r="17" fill="#334073"/><path d="M0,17 q-24,6 -24,50 h48 q0,-44 -24,-50 Z" fill="#334073"/></g>' +
            '<g fill="#D4A017"><path d="M150,26 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 Z"/><path d="M96,20 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 Z"/></g>' +
          '</svg>' +
          '<div class="eyebrow" style="color:var(--gold);margin-top:6px">' + (done ? 'Camera-ready' : 'Time’s up') + '</div>' +
          '<h2 style="font-size:22px;color:var(--blue);max-width:15ch">' + (done ? 'That smile can greet anyone.' : 'Not quite every surface.') + '</h2>' +
          '<p class="muted" style="max-width:26ch">' + (done
            ? 'Cleared in ' + U.fmtTime(timeMs, true) + ', best combo x' + res.entry.combo + ', ' + state.found.length + ' treats found.'
            : 'You reached ' + cleanliness + '% and found ' + state.found.length + ' of ' + foods.length + ' treats.') + '</p>' +
          '<button class="btn" data-act="next" style="margin-top:8px">See your result</button>' +
          '<button class="btn solid2" data-act="retry">Play again</button>' +
        '</div>');
      stage.appendChild(scene);
      U.on(scene, '[data-act]', 'click', function (e, b) {
        if (b.dataset.act === 'retry') S.Router.go('#/game/smile', { force: true });
        else S.Router.go('#/share/smile');
      });
    }

    U.on(el, '[data-act="quit"]', 'click', function () {
      state.finished = true; if (state.timer) state.timer.stop(); S.Router.go('#/home');
    });

    setTimeout(function () {
      S.Store.bumpAttempt('smile');
      state.start = performance.now();
      state.endAt = state.start + DURATION;
      state.timer = U.ticker(tick);
    }, 260);

    return {
      el: el, tab: null,
      destroy: function () {
        state.finished = true;
        if (state.timer) state.timer.stop();
        window.removeEventListener('pointerup', up);
        window.removeEventListener('touchend', up);
      }
    };
  };
})();
