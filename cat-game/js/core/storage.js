// Saving. Everything stays on this device (browser localStorage) — no login,
// no server. The photo album is kept under its own key so a big album can't
// stop the main save from writing.
(function (G) {
  'use strict';

  const KEY = 'catgame.save.v1';
  const ALBUM_KEY = 'catgame.album.v1';
  const PORTRAIT_KEY = 'catgame.portrait.v1'; // the real cat photo for the wall (one small cropped JPEG)
  const PROMO_KEY = 'catgame.promo.v1'; // used promo codes and wrong tries; kept through "Start over" on purpose

  function store() {
    try {
      return globalThis.localStorage || null;
    } catch {
      return null;
    }
  }

  function load() {
    const ls = store();
    if (!ls) return null;
    try {
      const raw = ls.getItem(KEY);
      return raw ? G.State.migrate(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function save(state) {
    const ls = store();
    if (!ls) return false;
    try {
      ls.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function loadAlbum() {
    const ls = store();
    try {
      return (ls && JSON.parse(ls.getItem(ALBUM_KEY) || '[]')) || [];
    } catch {
      return [];
    }
  }

  // Returns false when the browser is out of space.
  function saveAlbum(list) {
    const ls = store();
    if (!ls) return false;
    try {
      ls.setItem(ALBUM_KEY, JSON.stringify(list));
      return true;
    } catch {
      return false;
    }
  }

  function loadPortrait() {
    const ls = store();
    try {
      const v = ls && ls.getItem(PORTRAIT_KEY);
      return v && v.startsWith('data:image/') ? v : null;
    } catch {
      return null;
    }
  }

  // A data URL saves it; null takes it down. Returns false when the browser is out of space.
  function savePortrait(url) {
    const ls = store();
    if (!ls) return false;
    try {
      if (url) ls.setItem(PORTRAIT_KEY, url);
      else ls.removeItem(PORTRAIT_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function loadPromo() {
    const ls = store();
    try {
      const v = ls && JSON.parse(ls.getItem(PROMO_KEY) || 'null');
      if (v && typeof v === 'object') return { used: v.used && typeof v.used === 'object' ? v.used : {}, wrong: Number(v.wrong) || 0, lockUntil: Number(v.lockUntil) || 0 };
    } catch {
      /* fall through */
    }
    return { used: {}, wrong: 0, lockUntil: 0 };
  }

  // Returns false when the browser is out of space.
  function savePromo(rec) {
    const ls = store();
    if (!ls) return false;
    try {
      ls.setItem(PROMO_KEY, JSON.stringify(rec));
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    const ls = store();
    if (!ls) return;
    try {
      ls.removeItem(KEY);
      ls.removeItem(ALBUM_KEY);
      ls.removeItem(PORTRAIT_KEY);
    } catch {
      /* nothing to clear */
    }
  }

  G.Storage = { load, save, loadAlbum, saveAlbum, loadPortrait, savePortrait, loadPromo, savePromo, clear };
})(globalThis.CatGame = globalThis.CatGame || {});
