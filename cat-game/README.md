# Cat Companion 🐾

A cosy, real-time cat game based on a real brown-tabby-and-white cat. The cat lives on its own schedule using your device's clock. Check in, feed, pet and play whenever you like. The game never punishes you for being away.

## Play it

- **On your computer:** double-click `index.html`. It opens in your browser, with nothing to install.
- **Put it online (optional):** drag this whole `cat-game` folder onto <https://app.netlify.com/drop>. Vercel or any other static host works the same way.

Your save stays in the browser on that device, so there's no login and no server.

## How to play

When a new game starts you choose how your cat looks: pick a breed (Tabby & white, Calico, Tuxedo, Siamese, Ragdoll…), mix your own colour, pattern and white markings, or upload a photo, tap your cat's fur (and a stripe or patch, if it has one), and the game reads the coat for you. The photo is read on your device and isn't saved. Then you name your cat.

| Do this | What happens |
| --- | --- |
| Tap / stroke the cat | Petting. Head and chin get purrs. The belly is a gamble (bunny kicks!). Too much petting may earn a swat. |
| **Feed** | Fills the bowl. The cat reacts based on how hungry it is, and eats from the bowl by itself while you're away. |
| **Treat** | A small happiness boost. After 5 a day you'll get A Look. |
| **Play** | Pick the feather wand or the laser, then drag it around (or move your mouse). Wiggle it fast to make the cat pounce. |
| **Call** | Sometimes the cat comes. Sometimes it slow-blinks. Sometimes it ignores you. |
| **Room** | Place a box, beds and toys. The cat may or may not use them. |
| **Photo** | Snaps the cat into your album (it's in the Diary). |
| **Diary** | The cat's own diary, your photo album, treasures (gifts) and unlocks. |
| **Me** (or tap the name) | Profile, favourites, rename, **change look**, sound, **start a new game**, and testing tools. |

Gifts and knocked-over cups show up on the floor; tap them. Bond only ever goes up, and it unlocks new food, toys and furniture.

### Testing without waiting

Open **Me → Testing tools**:

- **+1 hour / +6 hours / +1 day** pretends time passed, so you see the "While you were away…" summary straight away.
- **Seasonal decor preview** shows the Chinese New Year, Hari Raya or Christmas decorations at any time of year.

To check the game logic without a browser: `node cat-game/tests/core-check.mjs`.

## Make it your cat

Edit `js/core/profile.js`: the default name, the description, and the quirks. Breed presets and coat colours live in `js/core/coats.js`. The quirks are picked from the photos: the round scratcher bed, loafing on the table, supervising the TV, the camping chair, and yelling for breakfast. Turn any of them off, or make them stronger.

---

## How it's built

Plain HTML/CSS/JavaScript with no build step. The art style (Neko Atsume–inspired: thick ink lines, flat colours, round cats) is defined in `docs/art-style.md`; follow it when drawing anything new. The **game logic** (`js/core`) never touches the screen, so it can be reused as-is in a phone app later. Only `js/ui` would change.

```
cat-game/
  index.html, styles.css
  js/core/            ← game rules (no drawing)
    profile.js          your cat: default name, quirks
    coats.js            cat looks: breed presets, colours, patterns
    photoread.js        reading a coat from a photo (background, lighting, pattern)
    clock.js            real-time clock, day phases, lighting, seasons
    random.js           seeded randomness (same story every time it's replayed)
    catalog.js          foods, toys, items, spots, gifts, bond levels
    state.js            the save file (data model)
    storage.js          save/load (localStorage)
    sim.js              the cat's brain + offline catch-up
    interactions.js     feed, pet, play, treats, call, rename
    progression.js      bond, unlocks, favourites
    journal.js          cat diary + "while you were away" summary
  js/ui/              ← the screen
    catArt.js           the cat, drawn as SVG (all poses)
    roomArt.js          the room, furniture, items, decor, lighting
    scene.js            movement, idle animations, toys, bubbles, photos
    sound.js            synthesised sounds (no audio files)
    app.js              start-up, live loop, menus, input
  tests/core-check.mjs
```

### Time system

- Game time is the device's local time (plus an optional test offset).
- The cat always has one **activity** (nap, groom, knock the cup…) with a start and end time. When it ends, the brain picks the next one. The choice is weighted by time of day (dawn, morning, afternoon, evening, night, plus 3am chaos), by needs (hunger, energy), mood, quirks and favourites.
- **Offline catch-up:** when you return, the same brain replays every activity from your last visit until now, using long "away" durations. Each choice is seeded by its timestamp, so the replay is the same every time. Stats drift along the way. The cat eats from the bowl, brings gifts and knocks things over. Then the summary is built from that replay.
- While you're watching, activities are shorter (seconds to a few minutes), so the cat feels alive.

### Data model (the save)

`stats` (fullness, energy, happiness, bond) · `activity` · `bowl` · `room` (slots, hammock, cup, gifts) · `unlocked` · `favorites` · `log` (last 3 days of events) · `journal` (diary entries, each keeping the name used at the time) · `treasures` · `cat.nameHistory` · `settings`. Photos are stored separately.

### Low-maintenance rules

- Stats drift slowly. Fullness takes about 20 hours to run low, and the cat feeds itself from the bowl.
- Nothing can die, get sick or run away. Happiness has a floor; worst case is a grumpy cat.
- Bond never goes down. It also grows a little every day, even on days you don't visit.
