/* Game 3 — Say It Fresh: camera-style viewfinder, hold-to-speak, 3 rounds.
   Prototype scoring is volume-and-duration only — no speech recognition. */
(function () {
  var U = S.U;
  var THRESHOLD = 0.055;   // RMS above this counts as speaking

  S.Screens.game_fresh = function () {
    var st = {
      round: 0, passes: 0, startedAt: 0, holdStart: 0, spoken: 0,
      stream: null, ctx: null, analyser: null, data: null, holdTicker: null, holdLast: 0,
      facing: 'user', soundOn: true, micOk: false, finished: false, holding: false
    };

    var el = U.node(
      '<section class="screen"><div class="g3">' +
        '<video id="cam" playsinline muted autoplay></video>' +
        '<div class="blob" id="blob"></div>' +
        '<div class="veil"></div>' +
        '<div class="guide"></div>' +
        '<div class="ui">' +
          '<div style="display:flex;align-items:center;justify-content:space-between">' +
            '<button class="iconbtn dark" data-act="quit" aria-label="Close">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
            '<div class="dots" id="dots"><i class="on"></i><i></i><i></i></div>' +
            '<div class="iconbtn dark" aria-hidden="true">' +
              '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M17 7 L21 4 V20 L17 17 M3 7 H15 A2 2 0 0 1 17 9 V15 A2 2 0 0 1 15 17 H3 A2 2 0 0 1 1 15 V9 A2 2 0 0 1 3 7 Z" stroke="#fff" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg></div>' +
          '</div>' +
          '<div style="font-size:10px;font-weight:800;color:rgba(255,255,255,.65);letter-spacing:.06em;margin-top:10px;text-align:center" id="rd">SYSTEMA · ROUND 1 OF 3</div>' +
          '<div class="phrasecard" id="card"></div>' +
          '<div class="rail">' +
            '<button class="iconbtn dark" data-act="flip" aria-label="Flip camera">' +
              '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M17 7 H20 M20 7 V10 M20 7 L16 11 M7 17 H4 M4 17 V14 M4 17 L8 13" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="12" cy="12" r="6" stroke="#fff" stroke-width="1.6" fill="none"/></svg></button>' +
            '<button class="iconbtn dark" data-act="sound" aria-label="Toggle sound cue">' +
              '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 9 V15 H7 L12 19 V5 L7 9 Z" fill="#fff"/><path d="M16 8 Q19 12 16 16" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg></button>' +
            '<button class="iconbtn dark" data-act="retry" aria-label="Retry round">' +
              '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 12 A8 8 0 1 1 7 18" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M4 8 V12 H8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '</div>' +
          '<div style="margin-top:auto;display:flex;flex-direction:column;align-items:center">' +
            '<div style="font-size:11px;color:rgba(255,255,255,.7);margin-bottom:14px" id="status">Hold the button and say it out loud</div>' +
            '<button class="recbtn" id="rec"><i></i></button>' +
            '<div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:10px">Systema CNY Challenge · Say It Fresh</div>' +
          '</div>' +
        '</div>' +
        '<div class="sparkles" id="spark" style="top:44%;left:50%"></div>' +
      '</div></section>');

    var video = el.querySelector('#cam');
    var card = el.querySelector('#card');
    var dots = el.querySelector('#dots');
    var rd = el.querySelector('#rd');
    var rec = el.querySelector('#rec');
    var status = el.querySelector('#status');
    var blob = el.querySelector('#blob');

    function paintPhrase() {
      var p = S.PHRASES[st.round];
      card.innerHTML = '<div class="zh cjk">' + p.zh + '</div><div class="py">' + p.py + '</div>' +
        '<div class="en">' + U.esc(p.en) + ' · ' + U.esc(p.ms) + '</div>';
      rd.textContent = 'SYSTEMA · ROUND ' + (st.round + 1) + ' OF 3';
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i <= st.round); });
    }

    /* ---------- media ---------- */
    function startMedia() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fallback('Camera not available — hold the button for the full phrase instead.');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: st.facing }, audio: true })
        .then(function (s) {
          st.stream = s;
          video.srcObject = s;
          blob.style.display = 'none';
          try {
            var AC = window.AudioContext || window.webkitAudioContext;
            st.ctx = new AC();
            var src = st.ctx.createMediaStreamSource(s);
            st.analyser = st.ctx.createAnalyser();
            st.analyser.fftSize = 512;
            src.connect(st.analyser);
            st.data = new Uint8Array(st.analyser.fftSize);
            st.micOk = true;
          } catch (e) { st.micOk = false; }
        })
        .catch(function () { fallback('Camera off — hold the button for the full phrase instead.'); });
    }
    function fallback(msg) {
      video.style.display = 'none';
      blob.style.display = '';
      status.textContent = msg;
    }
    function level() {
      if (!st.micOk) return 0;
      st.analyser.getByteTimeDomainData(st.data);
      var sum = 0;
      for (var i = 0; i < st.data.length; i++) { var v = (st.data[i] - 128) / 128; sum += v * v; }
      return Math.sqrt(sum / st.data.length);
    }

    /* ---------- hold to speak ---------- */
    function holdStep() {
      if (!st.holding) return;
      var now = performance.now();
      var dt = Math.min(0.12, (now - st.holdLast) / 1000);
      st.holdLast = now;
      var lv = level();
      // with no mic, holding the button for the phrase duration is enough
      if (!st.micOk || lv > THRESHOLD) st.spoken += dt;
      var need = S.PHRASES[st.round].hold;
      rec.style.boxShadow = '0 0 0 ' + Math.min(18, lv * 160).toFixed(0) + 'px rgba(255,255,255,.12)';
      status.textContent = st.spoken >= need ? 'Nice — let go' : 'Keep going… ' + Math.max(0, need - st.spoken).toFixed(1) + 's';
    }
    function holdStart(e) {
      if (st.finished || st.holding) return;
      if (e && e.preventDefault) e.preventDefault();
      st.holding = true; st.spoken = 0; st.holdLast = performance.now();
      rec.classList.add('hold');
      if (st.ctx && st.ctx.state === 'suspended') st.ctx.resume();
      if (st.holdTicker) st.holdTicker.stop();
      st.holdTicker = U.ticker(holdStep);
    }
    function holdEnd() {
      if (!st.holding) return;
      st.holding = false;
      rec.classList.remove('hold');
      rec.style.boxShadow = '';
      if (st.holdTicker) { st.holdTicker.stop(); st.holdTicker = null; }
      var need = S.PHRASES[st.round].hold;
      if (st.spoken >= need) pass(); else fail();
    }
    rec.addEventListener('pointerdown', holdStart);
    window.addEventListener('pointerup', holdEnd);
    rec.addEventListener('touchstart', holdStart, { passive: false });
    window.addEventListener('touchend', holdEnd);

    function sparkle() {
      var host = el.querySelector('#spark');
      host.innerHTML = '';
      for (var i = 0; i < 10; i++) {
        var s2 = document.createElement('span');
        var a = (Math.PI * 2 * i) / 10 + Math.random();
        var d = 40 + Math.random() * 46;
        s2.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
        s2.style.setProperty('--dy', (Math.sin(a) * d).toFixed(0) + 'px');
        s2.innerHTML = S.ART.star(14 + Math.random() * 8);
        host.appendChild(s2);
      }
      setTimeout(function () { host.innerHTML = ''; }, 800);
    }

    function pass() {
      st.passes++;
      sparkle();
      status.textContent = 'Clear and bright.';
      if (st.round === 2) return setTimeout(finish, 700);
      setTimeout(function () { st.round++; paintPhrase(); status.textContent = 'Hold the button and say it out loud'; }, 700);
    }
    function fail() {
      status.textContent = 'Too quiet — hold and say the whole phrase.';
      rec.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 });
    }

    function finish() {
      if (st.finished) return;
      st.finished = true;
      var attempt = S.Store.attempts('fresh');
      var candidates = [];
      if (st.passes === 3) candidates.push('sayItFresh');
      if (st.passes === 3 && attempt === 1) candidates.push('firstTake');

      var res = S.Store.recordSession({
        game: 'fresh',
        passes: st.passes,
        timeMs: Math.round(performance.now() - st.startedAt),
        badge: candidates.length ? S.badgeById(candidates[0]).name : null,
        badgeCandidates: candidates
      });

      var revealBadge = res.newBadges.length ? S.badgeById(res.newBadges[0]) : null;
      var host = el.querySelector('.g3');
      var next = revealBadge ? U.coupletReveal(host, revealBadge) : Promise.resolve();
      next.then(function () {
        var done = U.node('<div class="reveal" style="background:rgba(23,19,15,.95)">' +
          '<div class="eyebrow" style="color:var(--gold)">3 of 3 rounds</div>' +
          '<h2 style="font-size:24px;color:#fff;text-align:center;max-width:14ch">Said it fresh.</h2>' +
          '<p style="color:rgba(255,255,255,.72);font-size:13px;text-align:center;max-width:26ch">' +
            'Finished in ' + U.fmtTime(res.entry.timeMs, true) + '. Greeting practised, smile ready.</p>' +
          '<button class="btn" data-act="next" style="margin-top:10px">See your share card</button>' +
          '<button class="btn ghost" data-act="retry2" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)">Play again</button>' +
        '</div>');
        host.appendChild(done);
        U.on(done, '[data-act]', 'click', function (e, b) {
          if (b.dataset.act === 'retry2') S.Router.go('#/game/fresh', { force: true });
          else S.Router.go('#/share/fresh');
        });
      });
    }

    U.on(el, '[data-act]', 'click', function (e, b) {
      var a = b.dataset.act;
      if (a === 'quit') S.Router.go('#/home');
      if (a === 'retry') { st.spoken = 0; status.textContent = 'Hold the button and say it out loud'; }
      if (a === 'sound') { st.soundOn = !st.soundOn; b.style.opacity = st.soundOn ? 1 : .5; U.toast(st.soundOn ? 'Sound cues on' : 'Sound cues off'); }
      if (a === 'flip') {
        st.facing = st.facing === 'user' ? 'environment' : 'user';
        if (st.stream) st.stream.getTracks().forEach(function (t) { t.stop(); });
        startMedia();
        video.style.transform = st.facing === 'user' ? 'scaleX(-1)' : 'none';
      }
    });

    paintPhrase();
    setTimeout(function () {
      S.Store.bumpAttempt('fresh');
      st.startedAt = performance.now();
      startMedia();
    }, 240);

    return {
      el: el, tab: null,
      destroy: function () {
        st.finished = true; if (st.holdTicker) st.holdTicker.stop();
        if (st.stream) st.stream.getTracks().forEach(function (t) { t.stop(); });
        if (st.ctx && st.ctx.close) try { st.ctx.close(); } catch (e) {}
        window.removeEventListener('pointerup', holdEnd);
        window.removeEventListener('touchend', holdEnd);
      }
    };
  };
})();
