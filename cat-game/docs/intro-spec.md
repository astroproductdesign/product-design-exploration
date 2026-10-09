# Intro & Adoption Flow: Spec

> **Status:** implemented. Title: **My Purrfriend**. The logo is in `js/ui/logo.js` and shown in `docs/logo-options.html`.
> All art follows `docs/art-style.md`.

## 1. Intro screen

- The **first thing players see** when they open the game.
- **Scene:** a close-up of the cat in the room's real cardboard box, curled up with its head raised. It's a continuous shot of the room, not a separate picture.
- **Idle loop:** licks a paw, washes its face, flicks an ear, slowly curls its tail. Every so often it pauses to look at the player.
- **Eyes follow the pointer:** the dots shift up to about 3 px towards it. On touch screens they follow taps and glance around on their own. They don't move while the cat blinks or sleeps.
- **Layout:** the logo above the cat, the button below.
  - New player: **Start adoption**
  - Returning player (a save exists): **Continue** only. Starting over stays in Me → Start a new game.
- **Atmosphere:** soft lighting that follows the real time of day (gentler than in the room), and a calm background.
- **When it shows:**
  - Shown when the game opens in a **new browser session** (the browser was fully closed and reopened).
  - Not shown again while the browser stays open, including reloads and other tabs.
  - Implemented with a session cookie. Caveat: browsers set to "restore previous session" keep session cookies, so the intro may be skipped after a restart there.
- **Sound:** browsers only allow audio after the first tap, so the purr starts when the player presses the button.
- **Reduced motion:** when the system setting is on, the camera zoom becomes a crossfade and the eyes don't follow the pointer.

## 2. Start → customisation

- Pressing **Start adoption** does **not** cut to a new screen. The camera zooms out and pans from the box close-up, and the same cat stays on screen the whole time.
- A **customisation panel** slides in from the right on desktop, or up from the bottom on mobile.
  - On mobile the sheet covers about half the screen, and the camera keeps the cat in the visible top half.
  - The photo step needs room to tap the photo, so the sheet expands to full height for that step only.
- **Every change updates the cat in the box live.**
- **Panel order:**
  1. **Name** (first step).
  2. **Look:** Breeds / Mix your own / From a photo (the same options as today).
  3. **Collar & accessory** (optional, see §3).
  4. **Adopt!** The panel slides away, the cat hops out of the box into the room, the camera settles on the room, and the HUD and toolbar fade in.
- **Returning players:** Continue zooms straight out to the room. The "While you were away" summary appears **after** this, not on top of the intro.

## 3. Collar & accessory

Only head and neck items, so they work in all 11 poses without new drawings.

| Option | Choices |
| --- | --- |
| Collar | None · Mint · Red · Yellow · Blue · Pink · Black |
| Extra (one at a time) | None · Bell · Bow tie · Bandana · Flower behind the ear |

- Saved separately from the coat (`cat.accessory`). Older saves default to the mint collar with a bell, which is today's look.
- The photo reader never picks accessories.

## 4. Other entry points

- **Me → Change look** opens the same panel over the room, and the camera eases in on the cat.
- **Me → Start a new game** confirms, wipes the save, and returns to the intro as a new player.

## 5. Decisions

- **Title:** My Purrfriend, with the cat-in-a-box logo (the intro uses the wordmark only, since the real cat and box sit right below it).
- **Returning players:** Continue only.
- **Naming:** the first step in the panel. The name is written on the box as you type.
