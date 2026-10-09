// Real-time clock: time of day, day keys, lighting and seasonal decor.
// Everything follows the device's local time (plus an optional test offset).
(function (G) {
  'use strict';

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  function now(state) {
    const off = (state && state.settings && state.settings.timeOffset) || 0;
    return Date.now() + off;
  }

  function hourOf(t) {
    const d = new Date(t);
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  // dawn 5–7, morning 7–12, afternoon 12–17, evening 17–22, night 22–5
  function phaseAt(t) {
    const h = hourOf(t);
    if (h >= 5 && h < 7) return 'dawn';
    if (h >= 7 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 22) return 'evening';
    return 'night';
  }

  const PHASE_LABEL = {
    dawn: 'Early morning',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
  };

  // The famous 3am chaos window.
  function isChaosHour(t) {
    const h = hourOf(t);
    return h >= 2.5 && h < 4;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function dayKey(t) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function endOfDayKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }

  function formatDuration(ms) {
    const mins = Math.round(ms / MIN);
    if (mins < 1) return 'a moment';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
    const days = Math.floor(mins / (24 * 60));
    if (days >= 2) return `${days} days`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hs = `${h} hour${h === 1 ? '' : 's'}`;
    if (m < 5 || h >= 6) return hs;
    return `${hs} ${m} min`;
  }

  function formatTime(t) {
    return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatDay(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // ---- Lighting -------------------------------------------------------------
  // Keyframes through the day; colours are blended between neighbours.
  const KEYS = [
    { h: 0, top: '#1b2145', bot: '#36426f', tint: '#141a40', a: 0.42, lamp: 1 },
    { h: 4.8, top: '#1f2650', bot: '#3b4675', tint: '#141a40', a: 0.4, lamp: 1 },
    { h: 6, top: '#8494cf', bot: '#f6b98f', tint: '#ff9f7a', a: 0.16, lamp: 0.4 },
    { h: 7.3, top: '#8fd0ee', bot: '#e3f4fb', tint: '#fff3d6', a: 0, lamp: 0 },
    { h: 16.5, top: '#86c9ec', bot: '#eaf4f2', tint: '#ffe9b8', a: 0.05, lamp: 0 },
    { h: 18.2, top: '#e9876a', bot: '#fbd08f', tint: '#ff9455', a: 0.2, lamp: 0.3 },
    { h: 19.4, top: '#4b4d86', bot: '#c77d8f', tint: '#3a3474', a: 0.3, lamp: 1 },
    { h: 21, top: '#1d2347', bot: '#36416f', tint: '#141a40', a: 0.4, lamp: 1 },
    { h: 24, top: '#1b2145', bot: '#36426f', tint: '#141a40', a: 0.42, lamp: 1 },
  ];

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, f) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    const c = A.map((v, i) => Math.round(v + (B[i] - v) * f));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function lightingAt(t) {
    const h = hourOf(t);
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
    const A = KEYS[i];
    const B = KEYS[i + 1];
    const f = Math.min(1, Math.max(0, (h - A.h) / (B.h - A.h)));
    const isDay = h >= 6.2 && h < 18.9;
    // 0 at sunrise → 1 at sunset; moon uses the night span.
    const sunP = (h - 6.2) / (18.9 - 6.2);
    const nightH = h >= 18.9 ? h - 18.9 : h + (24 - 18.9);
    const moonP = nightH / (24 - (18.9 - 6.2));
    // Morning sun pours through the window onto the rug.
    let beam = 0;
    if (h >= 7 && h < 11.5) beam = 0.32;
    else if (h >= 6.3 && h < 7) beam = ((h - 6.3) / 0.7) * 0.32;
    else if (h >= 11.5 && h < 13) beam = (1 - (h - 11.5) / 1.5) * 0.32;
    else if (h >= 16 && h < 18.4) beam = 0.15;
    return {
      skyTop: mix(A.top, B.top, f),
      skyBot: mix(A.bot, B.bot, f),
      tint: mix(A.tint, B.tint, f),
      alpha: A.a + (B.a - A.a) * f,
      lamp: A.lamp + (B.lamp - A.lamp) * f,
      isDay,
      sunP,
      moonP,
      beam,
      hour: h,
    };
  }

  // ---- Seasonal decor -------------------------------------------------------
  // Lunar New Year and Hari Raya Aidilfitri move every year, so they're
  // looked up from a table. Raya dates are the expected Malaysian dates and
  // can shift by a day once the moon is sighted — edit here if needed.
  const CNY = ['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11'];
  const RAYA = ['2025-03-31', '2026-03-20', '2027-03-10', '2028-02-27', '2029-02-15', '2030-02-05', '2031-01-25', '2032-01-14'];

  function nearDate(t, list, before, after) {
    for (const k of list) {
      const [y, m, d] = k.split('-').map(Number);
      const c = new Date(y, m - 1, d).getTime();
      if (t >= c - before * DAY && t <= c + after * DAY) return true;
    }
    return false;
  }

  function seasonsAt(t) {
    const out = [];
    const d = new Date(t);
    if (nearDate(t, CNY, 10, 15)) out.push('cny');
    if (nearDate(t, RAYA, 7, 30)) out.push('raya');
    if (d.getMonth() === 11) out.push('christmas');
    return out;
  }

  const SEASON_LABEL = { cny: 'Chinese New Year', raya: 'Hari Raya', christmas: 'Christmas' };

  G.Clock = {
    MIN, HOUR, DAY,
    now, hourOf, phaseAt, PHASE_LABEL, isChaosHour,
    dayKey, endOfDayKey, formatDuration, formatTime, formatDay,
    lightingAt, seasonsAt, SEASON_LABEL,
  };
})(globalThis.CatGame = globalThis.CatGame || {});
