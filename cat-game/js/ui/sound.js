// Sound effects. The cat's meow, hiss and purr are recordings (the mp3s in js/sound/, packed
// into js/sound/samples.js by tools/embed-sounds.py so they also load when the page is opened
// straight from disk). Until they are decoded, the old synthesised versions step in.
// Crunching, bird chirps, the collar bell and the camera are synthesised in the browser.
(function (G) {
  'use strict';

  let ctx = null;
  let master = null;
  let muted = false;
  let purrNode = null;

  // How loud to play each recording (they were recorded quietly) and how much silence to
  // skip at the start.
  const SAMPLES = {
    meow: { gain: 2.5, skip: 0.1 },
    hiss: { gain: 3.5, skip: 0.03 },
    purr: { gain: 1.4, skip: 0.1 },
  };
  const buffers = {};

  function ac() {
    if (muted) return null;
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      loadSamples(ctx);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function bytesOf(dataUrl) {
    const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  // Decode the recordings once there is an audio context (browsers only allow one after a tap).
  function loadSamples(c) {
    const data = G.SoundData || {};
    for (const name of Object.keys(SAMPLES)) {
      if (!data[name]) continue;
      Promise.resolve()
        .then(() => c.decodeAudioData(bytesOf(data[name])))
        .then((buf) => {
          buffers[name] = buf;
        })
        .catch(() => {
          /* the synthesised sound is used instead */
        });
    }
  }

  // Play part of a recording through the master volume; returns the gain node and source.
  function playSample(name, opts) {
    const buf = buffers[name];
    if (!buf) return null;
    const sm = SAMPLES[name];
    const c = ctx;
    const o = opts || {};
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate || 1;
    const g = c.createGain();
    g.gain.value = sm.gain * (o.gain || 1);
    src.connect(g).connect(master);
    src.start(t, o.offset === undefined ? sm.skip : o.offset);
    if (o.maxSecs) {
      // cut short with a quick fade so it doesn't click
      g.gain.setValueAtTime(g.gain.value, t + o.maxSecs - 0.08);
      g.gain.linearRampToValueAtTime(0.0001, t + o.maxSecs);
      src.stop(t + o.maxSecs + 0.02);
    }
    return { src, gain: g };
  }

  function noiseBuffer(c, secs) {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function meowSynth(kind) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    o.type = 'sawtooth';
    const base = 480 + Math.random() * 160;
    const len = kind === 'short' ? 0.28 : 0.55 + Math.random() * 0.2;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.6, t + len * 0.35);
    o.frequency.linearRampToValueAtTime(base * 0.85, t + len);
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(1800, t + len * 0.4);
    f.frequency.linearRampToValueAtTime(700, t + len);
    env(g, t, 0.05, 0.35, len);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + len + 0.1);
  }

  function purrSynth(secs) {
    const c = ac();
    if (!c) return;
    stopPurr();
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 2);
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const g = c.createGain();
    g.gain.value = 0;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 24;
    lfoGain.gain.value = 0.35;
    lfo.connect(lfoGain).connect(g.gain);
    const out = c.createGain();
    const dur = secs || 2.2;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.9, t + 0.3);
    out.gain.setValueAtTime(0.9, t + dur - 0.5);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(g).connect(out).connect(master);
    src.start(t);
    lfo.start(t);
    src.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
    purrNode = { src, lfo };
  }

  function stopPurr() {
    if (!purrNode) return;
    const n = purrNode;
    purrNode = null;
    try {
      if (n.out && ctx) {
        // recording: fade out rather than cut
        const now = ctx.currentTime;
        n.out.gain.cancelScheduledValues(now);
        n.out.gain.setValueAtTime(n.out.gain.value, now);
        n.out.gain.linearRampToValueAtTime(0.0001, now + 0.12);
        n.src.stop(now + 0.15);
      } else {
        n.src.stop();
        n.lfo.stop();
      }
    } catch {
      /* already stopped */
    }
  }

  // ---- The cat's voice: recordings first, synthesis as the fallback ---------------------

  function meow(kind) {
    if (!ac()) return;
    const v = kind === 'short' ? { rate: 1.25 + Math.random() * 0.15, maxSecs: 0.5 } : { rate: 0.93 + Math.random() * 0.14 };
    if (!playSample('meow', v)) meowSynth(kind);
  }

  function hiss() {
    if (!ac()) return;
    if (!playSample('hiss', { rate: 0.96 + Math.random() * 0.08 })) hissSynth();
  }

  // A purr lasts `secs`. Asking again while one is playing keeps it going instead of restarting it.
  function purr(secs) {
    const c = ac();
    if (!c) return;
    const buf = buffers.purr;
    if (!buf) return purrSynth(secs);
    const dur = secs || 2.2;
    const now = c.currentTime;
    const fade = 0.6;
    const hold = (g, from, end) => {
      g.gain.cancelScheduledValues(from);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), from);
      g.gain.linearRampToValueAtTime(1, from + 0.15);
      g.gain.setValueAtTime(1, Math.max(from + 0.15, end - fade));
      g.gain.linearRampToValueAtTime(0.0001, end);
    };
    if (purrNode && purrNode.out && now < purrNode.end - 0.2) {
      purrNode.end = now + dur;
      hold(purrNode.out, now, purrNode.end);
      purrNode.src.stop(purrNode.end + 0.05);
      return;
    }
    stopPurr();
    const sm = SAMPLES.purr;
    const src = c.createBufferSource();
    src.buffer = buf;
    // loop the steady middle, starting somewhere different each time
    const a = 0.4;
    const b = buf.duration - 0.4;
    src.loop = true;
    src.loopStart = a;
    src.loopEnd = b;
    const out = c.createGain();
    out.gain.value = 0.0001;
    const level = c.createGain();
    level.gain.value = sm.gain;
    src.connect(out).connect(level).connect(master);
    src.start(now, a + Math.random() * (b - a - 0.5));
    const end = now + dur;
    hold(out, now, end);
    src.stop(end + 0.05);
    purrNode = { src, out, end };
  }

  function burst(c, t, len, freq, peak) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, len + 0.02);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = c.createGain();
    env(g, t, 0.004, peak, len);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  function crunch() {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    for (let i = 0; i < 5; i++) burst(c, t + i * 0.13 + Math.random() * 0.04, 0.06, 1800 + Math.random() * 1500, 0.5);
  }

  function hissSynth() {
    const c = ac();
    if (!c) return;
    burst(c, c.currentTime, 0.35, 5000, 0.25);
  }

  // Sifting litter: a few soft rustles.
  function scoop() {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    for (let i = 0; i < 6; i++) burst(c, t + i * 0.09 + Math.random() * 0.03, 0.08, 900 + Math.random() * 700, 0.35);
  }

  function tone(freq, start, len, type, peak) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    env(g, t, 0.01, peak || 0.2, len);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + len + 0.05);
    return o;
  }

  function chirp() {
    const c = ac();
    if (!c) return;
    for (let i = 0; i < 2; i++) {
      const o = tone(2600, i * 0.14, 0.08, 'sine', 0.08);
      if (o) o.frequency.exponentialRampToValueAtTime(3600, c.currentTime + i * 0.14 + 0.07);
    }
  }

  function bell() {
    tone(2100, 0, 0.5, 'sine', 0.08);
    tone(3150, 0, 0.35, 'sine', 0.05);
    tone(2100, 0.12, 0.4, 'sine', 0.05);
  }

  function pop() {
    tone(660, 0, 0.08, 'triangle', 0.12);
    tone(990, 0.05, 0.08, 'triangle', 0.08);
  }

  // The TV changing channel: a click and a burst of static.
  function tvClick() {
    const c = ac();
    if (!c) return;
    tone(180, 0, 0.04, 'square', 0.05);
    burst(c, c.currentTime + 0.02, 0.18, 4500, 0.09);
  }

  // ---- The gachapon machine -------------------------------------------------------

  // A quick pitch drop, for thunks and bounces.
  function thunk(start, from, to, len, peak) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + len);
    env(g, t, 0.005, peak, len);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  // The coin: a bright clink, a little rattle down the slot, a soft landing.
  function coin() {
    tone(2350, 0, 0.14, 'triangle', 0.12);
    tone(3520, 0.015, 0.2, 'sine', 0.07);
    tone(2600, 0.17, 0.08, 'triangle', 0.06);
    tone(2900, 0.25, 0.06, 'triangle', 0.04);
    thunk(0.36, 260, 120, 0.09, 0.14);
  }

  // Turning the crank: a ratchet of clicks, and the capsules rattling round the dome.
  function crank() {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    for (let i = 0; i < 9; i++) {
      burst(c, t + i * 0.085, 0.022, 2600, 0.28);
      tone(150, i * 0.085, 0.03, 'square', 0.025);
    }
    for (let i = 0; i < 12; i++) tone(520 + Math.random() * 520, 0.08 + i * 0.06 + Math.random() * 0.02, 0.05, 'triangle', 0.045);
  }

  // The capsule drops out of the chute and bounces: thunk, bonk, bonk.
  function capsule() {
    thunk(0, 320, 110, 0.13, 0.22);
    thunk(0.3, 360, 160, 0.09, 0.12);
    thunk(0.46, 380, 200, 0.06, 0.06);
  }

  // The reveal: a pop, then a little fanfare. Rarer prizes get a longer, brighter one.
  function reveal(rarity) {
    thunk(0, 500, 1100, 0.07, 0.14);
    const notes = rarity === 'legendary' ? [523, 659, 784, 1047, 1319, 1568] : rarity === 'rare' ? [659, 784, 988, 1319] : [784, 988, 1175];
    notes.forEach((f, i) => tone(f, 0.1 + i * 0.075, 0.32, 'triangle', 0.11));
    const end = 0.1 + notes.length * 0.075;
    if (rarity !== 'common') for (let i = 0; i < (rarity === 'legendary' ? 8 : 4); i++) tone(2400 + Math.random() * 1600, end + i * 0.06, 0.18, 'sine', 0.035);
  }

  function chime() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.12));
  }

  function shutter() {
    const c = ac();
    if (!c) return;
    burst(c, c.currentTime, 0.05, 3000, 0.4);
    burst(c, c.currentTime + 0.08, 0.04, 2000, 0.3);
  }

  function setMuted(m) {
    muted = !!m;
    if (muted) stopPurr();
  }

  // Call once from a tap/click so browsers allow audio.
  function unlock() {
    ac();
  }

  G.Sound = { meow, purr, stopPurr, crunch, hiss, scoop, chirp, bell, pop, chime, shutter, tvClick, coin, crank, capsule, reveal, setMuted, unlock };
})(globalThis.CatGame = globalThis.CatGame || {});
