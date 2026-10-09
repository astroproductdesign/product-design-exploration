// ✏️  YOUR CAT — edit this file to tune the game to your real cat.
//
// The default name is only a suggestion: the game asks for a name on first
// launch, and you can rename the cat any time from Settings.
//
// Quirks nudge how often the cat picks certain spots/activities. They were
// picked from the photos (the round scratcher bed, loafing on the dining
// table, sitting by the TV, the green camping chair). Set any to false, or
// change the multipliers, to match your cat better.
(function (G) {
  'use strict';

  G.Profile = {
    defaultName: 'Mochi',

    // Shown on the profile card.
    looks: 'Brown tabby & white · white blaze and muzzle · olive-green eyes · pink nose and toe beans · mint collar with a little bell',

    quirks: [
      {
        id: 'roundBed',
        on: true,
        text: 'Loves the round cardboard scratcher bed — naps there whenever it can.',
        spots: { scratcher: 2.6 },
      },
      {
        id: 'tableLoaf',
        on: true,
        text: 'Loafs on the dining table like it owns the place.',
        spots: { table: 2.2, laptop: 1.5 },
      },
      {
        id: 'tvSupervisor',
        on: true,
        text: 'Sits beside the TV to supervise whatever you are watching.',
        behaviors: { supervise: 1.8 },
      },
      {
        id: 'chairThief',
        on: true,
        text: 'Has claimed the green camping chair. It is not your chair anymore.',
        spots: { chair: 2 },
      },
      {
        id: 'breakfastAlarm',
        on: true,
        text: 'An alarm clock with fur: asks VERY loudly for breakfast at dawn.',
        breakfastAlarm: true,
      },
    ],
  };
})(globalThis.CatGame = globalThis.CatGame || {});
