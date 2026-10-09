// Soft sound effects, synthesised in the browser (no audio files needed).
// Purring, meows, crunching, bird chirps, the collar bell, the camera.
(function (G) {
  'use strict';

  let ctx = null;
  let master = null;
  let muted = false;
  let purrNode = null;

  function ac() {
    if (muted) return null;
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
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

  function meow(kind) {
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

  function purr(secs) {
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
    try {
      purrNode.src.stop();
      purrNode.lfo.stop();
    } catch {
      /* already stopped */
    }
    purrNode = null;
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

  function hiss() {
    const c = ac();
    if (!c) return;
    burst(c, c.currentTime, 0.35, 5000, 0.25);
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

  G.Sound = { meow, purr, stopPurr, crunch, hiss, chirp, bell, pop, chime, shutter, setMuted, unlock };
})(globalThis.CatGame = globalThis.CatGame || {});
