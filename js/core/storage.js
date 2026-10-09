// Saving. Everything stays on this device (browser localStorage) — no login,
// no server. The photo album is kept under its own key so a big album can't
// stop the main save from writing.
(function (G) {
  'use strict';

  const KEY = 'catgame.save.v1';
  const ALBUM_KEY = 'catgame.album.v1';

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

  function clear() {
    const ls = store();
    if (!ls) return;
    try {
      ls.removeItem(KEY);
      ls.removeItem(ALBUM_KEY);
    } catch {
      /* nothing to clear */
    }
  }

  G.Storage = { load, save, loadAlbum, saveAlbum, clear };
})(globalThis.CatGame = globalThis.CatGame || {});
