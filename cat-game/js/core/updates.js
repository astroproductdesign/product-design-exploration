// What's new: the list behind the "New updates" pop-up and the Updates page.
// To announce something: add a release at the top of RELEASES and raise VERSION by one.
// Everyone whose save has seen a lower version gets the pop-up once more.
(function (G) {
  'use strict';

  const VERSION = 2;

  // icon: a key into the icons in app.js; tone: the tile colour (a CSS colour variable name)
  const RELEASES = [
    {
      v: 2,
      date: '12–14 Oct',
      since: '12 Oct',
      items: [
        { icon: 'coin', tone: 'gold', title: 'Gachapon machine', text: 'Earn cat coins, then win furniture, toys, collars, and new colours.' },
        { icon: 'palette', tone: 'pink', title: 'Furniture colours', text: 'Recolour the clock, curtains, rug, chair, lamp, TV desk, and walls in the new Colours tab.' },
        { icon: 'ball', tone: 'mint', title: 'Three new toys', text: 'Mouse on a string, ball launcher (will your cat fetch?), and a bubble wand. They unlock as your bond grows.' },
        { icon: 'paw', tone: 'sage', title: 'Four silly cat moments', text: 'Climbing the curtains, a pounce that misses, falling off the windowsill, and a paw in the water bowl.' },
        { icon: 'smile', tone: 'paper', title: 'Livelier animations', text: 'Your cat bobs its head and chomps while eating, and dribbles toys side to side.' },
        { icon: 'trophy', tone: 'gold', title: 'Trophies', text: '93 silly achievements to collect, tucked in the diary.' },
      ],
      also: "Also new: a fourth spot for furniture and toys, and the wall note now uses your cat's current name.",
    },
    {
      v: 1,
      date: 'Earlier',
      items: [
        { icon: 'cloud', tone: 'mint', title: 'Real weather', text: 'The window shows the weather where you live, and the sun follows the real sunrise and sunset.' },
        { icon: 'note', tone: 'gold', title: 'Daily wall note', text: 'A new note on the wall every day, with facts, things about your cat, and wishes.' },
        { icon: 'room', tone: 'sage', title: 'A wider room', text: 'Spread-out furniture to explore, plus cat grass on the windowsill.' },
        { icon: 'sound', tone: 'pink', title: 'Real cat sounds', text: 'Recorded meows, hisses, and purrs, and tooltips on the meters.' },
      ],
    },
  ];

  const latest = () => RELEASES[0];

  // True when this save hasn't seen the newest release (a fresh adoption is marked seen as it starts).
  function pending(s) {
    return (s.flags.updatesSeen || 0) < VERSION;
  }

  function markSeen(s) {
    s.flags.updatesSeen = VERSION;
  }

  G.Updates = { VERSION, RELEASES, latest, pending, markSeen };
})(globalThis.CatGame = globalThis.CatGame || {});
