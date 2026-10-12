# My Purrfriend 🐾

A cosy, real-time cat game based on a real brown-tabby-and-white cat. The cat lives on its own schedule using your device's clock. Check in, feed, pet and play whenever you like. The game never punishes you for being away.

## Play it

- **On your computer:** double-click `index.html`. It opens in your browser, with nothing to install.
- **Put it online (optional):** drag this whole `cat-game` folder onto <https://app.netlify.com/drop>. Vercel or any other static host works the same way.

Your save stays in the browser on that device, so there's no login and no server.

## How to play

The game opens on your cat waiting in a cardboard box out in the garden, paws over the rim, grooming and watching your pointer. New players press **Start adoption**: the camera pulls back and a panel slides in where you name your cat, choose how it looks, set its tail (long, medium, short or a bunny bob, smooth or floofy, starting from what suits its breed) and pick a collar and extra (bell, bow tie, bandana or flower). Every change shows on the cat in the box. When you adopt, the garden fades into your living room around the cat and it hops out. Returning players see the garden once per browser session, then press **Continue**.

When choosing a look, pick a breed (Tabby & white, Calico, Tuxedo, Siamese, Ragdoll, Japanese Bobtail…), mix your own colour, pattern and white markings, or upload a photo, tap your cat's fur (and a stripe or patch, if it has one), and the game reads the coat for you. The photo is read on your device and isn't saved. Then you name your cat.

| Do this | What happens |
| --- | --- |
| Tap / stroke the cat | Petting, and where you touch matters. Head, chin and **ears** get purrs. The belly is a gamble (bunny kicks!). Grab the **tail** or a **paw** and the cat may hiss, swat and sulk with its back to you for a minute, which costs a little bond. Too much petting may earn a swat, and nobody wants to be petted in the litter box. |
| Drag the room (phone) | When the room doesn't fit the screen, drag it sideways to look around. A **Follow** button brings the camera back to the cat. |
| Tap the **litter box** | Scoops it. The cat uses it now and then and leaves clumps. If it's left dirty (4 or more) the cat gets a bit grumpier and may go beside it, and a puddle appears (tap to mop up). Nothing is ever harmful, and it never builds up past a small cap while you're away. |
| Tap the **food bowl** | Opens a small menu right above it. Pick a food to fill the bowl (the cat reacts based on how hungry it is, and eats from the bowl by itself while you're away), or give a **Treat**: a small happiness boost, and after 5 a day you'll get A Look. An empty bowl or a dirty litter box gets a pulsing dashed ring. |
| Hover (or press) something | Anything you can tap, plus the cat, glows warmly under the pointer: the food bowl, toy basket, diary, portrait, litter box, TV, gifts and a knocked-over cup. |
| Tap the **toy basket** | Pick the feather wand or the laser, then drag it around (or move your mouse). Wiggle it fast to make the cat pounce. |
| **Call** | Sometimes the cat comes. Sometimes it slow-blinks. Sometimes it ignores you. |
| **Room** | Arrange the room. The camera pulls back to show everything, with three numbered spots. Tap a spot, then tap an item in the tray below (or drag an item onto a spot, between spots to swap, or back onto the tray to put it away). Locked items show the bond level they need. The cat may or may not use what you place. |
| Tap a **bed, box, scratcher, tower, tent, the chair, the window or the window hammock** | Invites the cat over. It decides for itself: a happy, rested cat usually goes (more often to a favourite spot), a grumpy one often won't, a sleeping cat only twitches an ear, a hungry cat looks at the bowl instead, and a sulking cat ignores you. What it does there depends on the item and the time of day. When it says no, a thought bubble shows what it would rather be doing. A yes earns a little bond (capped at 3 a day). |
| Tap the **lamp** | Lights off: the room dims (a morning room only dims a little, the sun still shines in; at night it goes properly dark and the TV glows) and the cat naps more and recovers energy a bit faster. Tap again for lights on, back to normal. It's remembered, and lights left off through the night come back on at dawn by themselves (the cat sleeps well and says so in its diary). |
| Tap the **TV** | Flips to a random channel; a quick double tap, or the little power button on its bottom-left corner, switches it off completely (tap an off TV to switch it on). The cat won't watch a dark screen (and the cat may come and watch, more keenly for fish, birds and mice): fish, birds, a cooking show, the weather, space, football, a cartoon mouse, or your own cat. It also changes channel by itself now and then, and your cat may perk up at the fish, birds and mice. |
| **Photo** | Snaps the cat into your album (it's in the Diary). Photos look like polaroids, and **Save to device** saves a polaroid card with the picture, what the cat was doing and when. In the dark the camera uses a flash (switchable on the Snap card). With more than one photo in the album, use the arrows (or ← → keys, or swipe) to flip through them. |
| The **window** | Shows the real weather where you are, with something different going on out there for each kind: sun with birds and a butterfly, drifting clouds and a kite, blowing leaves and a walker, rain with puddle ripples and an umbrella, lightning and a thrashing tree, fog around a glowing street lamp, snow. The sun rises and sets at the real times for your place, and the room dims on grey days. A little after the game starts it asks once to use your location (the browser's own prompt); you can pick a city instead, or turn it off, in **Me → Weather**. Only the place's latitude and longitude go to Open-Meteo, a free weather service, and it's re-checked every 20 minutes. With no place, the window works as before. **Me → Testing tools** can preview each kind of weather. |
| Tap the **diary** on the wall shelf | The cat's own diary, your photo album, treasures (gifts) and unlocks. A pulsing ring shows when something new has unlocked. |
| Tap the **framed portrait** (or the name) | Profile, favourites, rename, **change look**, sound, **start a new game**, and testing tools. |

Gifts and knocked-over cups show up on the floor; tap them. Bond mostly goes up and it unlocks new food, toys and furniture. A grumpy cat can take a little back, but never below the start of your current level, so nothing you've unlocked is lost.

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
    clock.js            real-time clock, day phases, lighting (follows the real sunrise and sunset), seasons
    weather.js          real weather lookup (Open-Meteo): kinds, readings, location and city search
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
    gardenArt.js        the garden outside, for the intro
    scene.js            movement, idle animations, toys, bubbles, photos
    sound.js            sounds: recorded meow, hiss and purr, the rest synthesised
  sound/                the recordings (mp3) and samples.js, which packs them so they load from disk
  (after changing an mp3, run  python3 tools/embed-sounds.py)
    app.js              start-up, intro, adoption panel, live loop, menus, input
    logo.js             the My Purrfriend logo, wordmark and app icon
  tests/core-check.mjs
```

### Time system

- Game time is the device's local time (plus an optional test offset).
- The cat always has one **activity** (nap, groom, knock the cup…) with a start and end time. When it ends, the brain picks the next one. The choice is weighted by time of day (dawn, morning, afternoon, evening, night, plus 3am chaos), by needs (hunger, energy), mood, quirks and favourites.
- **Offline catch-up:** when you return, the same brain replays every activity from your last visit until now, using long "away" durations. Each choice is seeded by its timestamp, so the replay is the same every time. Stats drift along the way. The cat eats from the bowl, brings gifts and knocks things over. Then the summary is built from that replay.
- While you're watching, activities are shorter (seconds to a few minutes), so the cat feels alive.

### Data model (the save)

`stats` (fullness, energy, happiness, bond, litter need) · `activity` · `bowl` · `room` (slots, hammock, cup, gifts, litter box) · `unlocked` · `favorites` · `log` (last 3 days of events) · `journal` (diary entries, each keeping the name used at the time) · `treasures` · `cat.nameHistory` · `settings`. Photos are stored separately.

### Low-maintenance rules

- Stats drift slowly. Fullness takes about 20 hours to run low, and the cat feeds itself from the bowl.
- Nothing can die, get sick or run away. Happiness has a floor; worst case is a grumpy cat.
- Bond only drops by a point or two when you upset the cat (tail, paws, waking it), and never below the start of the current level. It also grows a little every day, even on days you don't visit.
