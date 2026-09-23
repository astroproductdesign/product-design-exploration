/* Game 1 — Smile Swipe: swipe both teeth rows clean inside 60 seconds. */
(function () {
  var U = S.U;
  var SEGS = 12, PER_PASS = 0.34, COMBO_WINDOW = 1600;

  S.Screens.game_smile = function () {
    var DURATION = S.CFG.SMILE_MS;
    var state = {
      rows: [new Array(SEGS).fill(1), new Array(SEGS).fill(1)],  // stain amount per segment
      cleaned: 0, total: SEGS * 2,
      combo: 0, bestCombo: 0, lastCleanAt: 0,
      start: 0, endAt: 0, finished: false, reached: null, raf: 0, dragging: false
    };

    function rowHtml(which) {
      var segs = '';
      for (var i = 0; i < SEGS; i++) segs += '<div class="seg" data-i="' + i + '"><i></i></div>';
      return '<div class="toothrow ' + which + '" data-row="' + (which === 'up' ? 0 : 1) + '">' + segs + '<div class="shine"></div></div>';
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
          '<div class="g-hint">Swipe across both rows to reach 100%</div>' +
          '<div class="g1-stage" id="stage">' +
            S.ART.lip('upper') + rowHtml('up') +
            '<div style="height:6px"></div>' +
            rowHtml('down') + S.ART.lip('lower') +
            '<div class="pctbig" id="big">0%</div>' +
            '<div class="combo" id="combo">' + S.ART.star(15) + '<span>Combo x0</span></div>' +
          '</div>' +
        '</div>' +
      '</section>');

    var stage = el.querySelector('#stage');
    var clock = el.querySelector('#clock');
    var ringEl = el.querySelector('.timepill .ring');
    var pctEl = el.querySelector('#pct');
    var bigEl = el.querySelector('#big');
    var comboEl = el.querySelector('#combo');
    var rowEls = el.querySelectorAll('.toothrow');

    function paintSeg(row, i) {
      rowEls[row].children[i].firstElementChild.style.opacity = state.rows[row][i];
    }
    function updateReadouts() {
      var pct = Math.round((state.cleaned / state.total) * 100);
      pctEl.textContent = pct + '%';
      bigEl.textContent = pct + '%';
      comboEl.lastElementChild.textContent = 'Combo x' + state.combo;
      return pct;
    }

    function hit(row, i) {
      if (state.finished || state.rows[row][i] <= 0) return;
      var before = state.rows[row][i];
      var after = Math.max(0, before - PER_PASS);
      state.rows[row][i] = after;
      state.cleaned += (before - after);
      paintSeg(row, i);
      if (after === 0) {
        var now = performance.now();
        state.combo = (now - state.lastCleanAt < COMBO_WINDOW) ? state.combo + 1 : 1;
        state.lastCleanAt = now;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        comboEl.classList.add('pop');
        setTimeout(function () { comboEl.classList.remove('pop'); }, 180);
      }
      var pct = updateReadouts();
      if (pct >= 100 && !state.reached) { state.reached = performance.now() - state.start; finish(); }
    }

    function pointAt(x, y) {
      for (var r = 0; r < rowEls.length; r++) {
        var rect = rowEls[r].getBoundingClientRect();
        if (y >= rect.top - 6 && y <= rect.bottom + 6 && x >= rect.left && x <= rect.right) {
          var i = Math.floor(((x - rect.left) / rect.width) * SEGS);
          hit(r, Math.max(0, Math.min(SEGS - 1, i)));
          return;
        }
      }
    }

    function down(e) { state.dragging = true; move(e); }
    function move(e) {
      if (!state.dragging || state.finished) return;
      var pts = e.touches ? e.touches : [e];
      for (var k = 0; k < pts.length; k++) pointAt(pts[k].clientX, pts[k].clientY);
      e.preventDefault();
    }
    function up() { state.dragging = false; }

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    stage.addEventListener('touchstart', down, { passive: false });
    stage.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);

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
      var whiteness = Math.round((state.cleaned / state.total) * 100);
      var timeMs = state.reached != null ? Math.round(state.reached) : null;
      var candidates = whiteness >= 100 ? ['perfectShine'] : [];

      var res = S.Store.recordSession({
        game: 'smile',
        timeMs: timeMs,
        whiteness: whiteness,
        combo: state.bestCombo,
        badge: whiteness >= 100 ? 'Perfect Shine' : null,
        badgeCandidates: candidates
      });

      var revealBadge = res.newBadges.length ? S.badgeById(res.newBadges[0]) : null;
      var next = revealBadge ? U.coupletReveal(stage, revealBadge) : Promise.resolve();
      next.then(function () { payoff(whiteness, timeMs, res); });
    }

    function payoff(whiteness, timeMs, res) {
      var done = whiteness >= 100;
      var scene = U.node(
        '<div class="reveal" style="background:rgba(255,255,255,.97)">' +
          '<svg viewBox="0 0 260 150" style="width:100%;max-width:280px" aria-hidden="true">' +
            '<rect width="260" height="150" rx="14" fill="#E9EDF6"/>' +
            '<rect y="112" width="260" height="38" fill="#DDE2EE"/>' +
            '<g><rect x="18" y="18" width="18" height="62" rx="3" fill="#C8102E"/><rect x="42" y="18" width="18" height="62" rx="3" fill="#C8102E"/>' +
            '<g fill="#D4A017"><rect x="24" y="28" width="6" height="6" rx="1"/><rect x="24" y="42" width="6" height="6" rx="1"/><rect x="24" y="56" width="6" height="6" rx="1"/>' +
            '<rect x="48" y="28" width="6" height="6" rx="1"/><rect x="48" y="42" width="6" height="6" rx="1"/><rect x="48" y="56" width="6" height="6" rx="1"/></g></g>' +
            '<g transform="translate(112,52)"><circle r="20" fill="#001689"/><path d="M-9,5 q9,8 18,0" stroke="#EFC463" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
            '<path d="M0,20 q-28,7 -28,58 h56 q0,-51 -28,-58 Z" fill="#001689"/></g>' +
            '<g transform="translate(180,62)" opacity=".92"><circle r="17" fill="#334073"/><path d="M0,17 q-24,6 -24,50 h48 q0,-44 -24,-50 Z" fill="#334073"/></g>' +
            '<g fill="#D4A017"><path d="M150,26 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 Z"/><path d="M96,20 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 Z"/></g>' +
          '</svg>' +
          '<div class="eyebrow" style="color:var(--gold);margin-top:6px">' + (done ? 'Camera-ready' : 'Time’s up') + '</div>' +
          '<h2 style="font-size:22px;color:var(--blue);max-width:15ch">' + (done ? 'That smile can greet anyone.' : 'Not quite the full shine.') + '</h2>' +
          '<p class="muted" style="max-width:26ch">' + (done
            ? 'Cleared in ' + U.fmtTime(timeMs, true) + ' with a best combo of x' + res.entry.combo + '.'
            : 'You reached ' + whiteness + '% — every surface counts, same as the real routine.') + '</p>' +
          '<button class="btn" data-act="next" style="margin-top:8px">See your share card</button>' +
          '<button class="btn ghost" data-act="retry">Play again</button>' +
        '</div>');
      stage.appendChild(scene);
      U.on(scene, '[data-act]', 'click', function (e, b) {
        if (b.dataset.act === 'retry') S.Router.go('#/game/smile', { force: true });
        else S.Router.go('#/share/smile');
      });
    }

    U.on(el, '[data-act="quit"]', 'click', function () { state.finished = true; S.Router.go('#/home'); });

    // start once the screen is mounted
    setTimeout(function () {
      S.Store.bumpAttempt('smile');
      state.start = performance.now();
      state.endAt = state.start + DURATION;
      state.timer = U.ticker(tick);
    }, 260);

    return {
      el: el, tab: null,
      destroy: function () { state.finished = true; if (state.timer) state.timer.stop(); window.removeEventListener('pointerup', up); window.removeEventListener('touchend', up); }
    };
  };
})();
