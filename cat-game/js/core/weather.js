// Real-world weather for the window: what is happening outside, and when the sun really
// rises and sets, for the player's place. Data comes from Open-Meteo (free, no account);
// the game only sends the place's latitude and longitude. No drawing here.
(function (G) {
  'use strict';

  const MIN = 60 * 1000;
  const REFRESH = 20 * MIN;

  const LABEL = { clear: 'Clear', partly: 'Partly cloudy', overcast: 'Overcast', rain: 'Rain', storm: 'Thunderstorm', fog: 'Fog', snow: 'Snow' };
  const KINDS = Object.keys(LABEL);

  // WMO weather codes, as Open-Meteo reports them.
  function kindFor(code) {
    const c = Number(code);
    if (c === 0 || c === 1) return 'clear';
    if (c === 2) return 'partly';
    if (c === 3) return 'overcast';
    if (c === 45 || c === 48) return 'fog';
    if (c >= 51 && c <= 67) return 'rain';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if (c >= 80 && c <= 82) return 'rain';
    if (c >= 95) return 'storm';
    return 'clear';
  }

  // "2026-10-12T06:58" → 6.97 (local hours at that place)
  function hoursOf(iso) {
    const m = /T(\d{2}):(\d{2})/.exec(String(iso || ''));
    return m ? Number(m[1]) + Number(m[2]) / 60 : NaN;
  }

  // What the weather service sent back, boiled down to what the game uses.
  function parse(json, at) {
    const cur = json && json.current;
    const day = json && json.daily;
    if (!cur || typeof cur.weather_code !== 'number') return null;
    const rise = day && day.sunrise ? hoursOf(day.sunrise[0]) : NaN;
    const set = day && day.sunset ? hoursOf(day.sunset[0]) : NaN;
    const out = { code: cur.weather_code, kind: kindFor(cur.weather_code), temp: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null, at: at || Date.now() };
    if (rise >= 0 && set > rise) {
      out.rise = rise;
      out.set = set;
    }
    return out;
  }

  const round2 = (n) => Math.round(Number(n) * 100) / 100;

  function url(place) {
    return `https://api.open-meteo.com/v1/forecast?latitude=${round2(place.lat)}&longitude=${round2(place.lon)}&current=weather_code,temperature_2m&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
  }

  function fetchNow(place) {
    return fetch(url(place))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather ' + r.status))))
      .then((j) => {
        const w = parse(j);
        if (!w) throw new Error('weather: unexpected reply');
        return w;
      });
  }

  // Cities by name, for people who'd rather not share their location.
  function search(name) {
    const q = String(name || '').trim();
    if (q.length < 2) return Promise.resolve([]);
    return fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('search ' + r.status))))
      .then((j) =>
        (j.results || []).map((x) => ({ name: x.name, region: [x.admin1, x.country].filter(Boolean).join(', '), lat: round2(x.latitude), lon: round2(x.longitude) }))
      );
  }

  // The browser's own "share your location?" prompt.
  function locate() {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return reject(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: round2(p.coords.latitude), lon: round2(p.coords.longitude) }),
        (e) => reject(e),
        { timeout: 12000, maximumAge: 60 * MIN }
      );
    });
  }

  function cfg(s) {
    return (s && s.settings && s.settings.weather) || {};
  }

  // What the window should show now: a test preview, else the latest real reading, else nothing.
  function current(s) {
    const c = cfg(s);
    if (c.preview && LABEL[c.preview]) return c.preview;
    return c.place && c.last ? c.last.kind : null;
  }

  // The real sunrise and sunset ({rise, set}) if known.
  function sunFor(s) {
    const c = cfg(s);
    return c.place && c.last && c.last.rise >= 0 && c.last.set > c.last.rise ? { rise: c.last.rise, set: c.last.set } : null;
  }

  function stale(s, t) {
    const c = cfg(s);
    return !!c.place && (!c.last || t - c.last.at > REFRESH || t < c.last.at);
  }

  G.Weather = { LABEL, KINDS, REFRESH, kindFor, hoursOf, parse, url, fetchNow, search, locate, current, sunFor, stale };
})(globalThis.CatGame = globalThis.CatGame || {});
