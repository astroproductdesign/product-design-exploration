// What's new: the list behind the "New updates" pop-up and the Updates page.
// To announce something: add a release at the top of RELEASES and raise VERSION by one.
// Each release has a date, a short name and one-line summary (for the list), a title (for its page) and its items.
// Everyone whose save has seen a lower version gets the pop-up once more.
(function (G) {
  'use strict';

  const VERSION = 4;

  // icon: a key into the icons in app.js; tone: the tile colour (a CSS colour variable name)
  const RELEASES = [
    {
      v: 4,
      date: '16 Oct',
      since: '15 Oct',
      name: 'Daily check-in stamp card',
      title: 'Stamp your card',
      summary: 'Check in on the laptop and your cat stamps a paw print on your card.',
      items: [
        { icon: 'paw', tone: 'pink', title: 'Daily check-in', text: "Tap the laptop on the table to open the stamp card. Tap today's circle and your cat's paw pops up and stamps it, with the date under the print." },
        { icon: 'coin', tone: 'gold', title: 'Five stamps, one bonus', text: 'Any 5 check-ins fill a card, in a row or not. Each stamp pays 1 coin, and the fifth pays 10.' },
        { icon: 'smile', tone: 'mint', title: 'Your cat, your paw', text: "The paw matches your cat's own colours." },
      ],
      also: 'Also new: missed days never cost you a stamp, and the old automatic login reward is now the stamp card.',
    },
    {
      v: 3,
      date: '15–16 Oct',
      since: '14 Oct',
      name: 'Furniture shop and trophy rewards',
      title: 'The shop is open',
      summary: 'A furniture shop, more ways to earn coins, claimable trophy rewards, and a tidier diary.',
      items: [
        { icon: 'shop', tone: 'pink', title: 'Furniture shop', text: 'Buy new looks for the chair, dining table, laptop, TV desk, rug, litter box, lamp, curtains, clock, and bowls. Open it from the paw menu.' },
        { icon: 'palette', tone: 'mint', title: 'Colours repaint every look', text: 'A colour you win in the gachapon repaints whichever look a piece is wearing.' },
        { icon: 'coin', tone: 'gold', title: 'More ways to earn coins', text: 'New treasures from your cat pay coins, the 50 sen coin pays every time, and feeding, playing with, and tidying up in one day earns a daily care bonus.' },
        { icon: 'trophy', tone: 'gold', title: 'Claim your trophy rewards', text: 'Rewards now wait for you on the Trophies page. Tap Claim, or Claim all, to collect the coins and hearts.' },
        { icon: 'trophy', tone: 'sage', title: 'Trophy filters and ticks', text: 'Filter by All, In progress, or Completed. Finished trophies get a tick.' },
        { icon: 'book', tone: 'paper', title: 'A tidier diary', text: "Today's page opens first with earlier days listed below. The diary keeps the last 7 days, and you can save the pages you love." },
      ],
      also: "Also new: the wall note shows only today's note, and Updates now lists every release.",
    },
    {
      v: 2,
      date: '12–14 Oct',
      since: '12 Oct',
      name: 'Gachapon, colours, and new toys',
      title: 'Your purrfriend has been busy',
      summary: 'The gachapon machine, furniture colours, three new toys, four silly cat moments, and trophies.',
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
      name: 'Weather, wall note, and cat sounds',
      title: 'Where it all started',
      summary: 'Real weather outside the window, a daily wall note, a wider room, and recorded cat sounds.',
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
