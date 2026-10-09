# Systema CNY Challenge — prototype

A mobile web prototype of the Chinese New Year mini-game campaign for Systema Oral Care (Lion).
Single-page app, client-side routing, no backend. Everything the player does is stored in
`localStorage` on the device.

## Running it

```bash
# from this folder
python3 -m http.server 8777
# then open http://localhost:8777
```

Opening `index.html` directly from the filesystem works for everything except **Game 3's camera** —
`getUserMedia` needs a secure context, so it only runs over `http://localhost` or HTTPS. Without a
camera the game falls back to a dark abstract viewfinder and hold-duration scoring, which is
playable.

Deploying: it is a static folder, so any static host serves it as-is.

## Structure

| File | What it holds |
|---|---|
| `index.html` | Shell — device frame, viewport, tab bar, overlay root |
| `styles.css` | All styling, brand tokens at the top under `:root` |
| `js/config.js` | Brand content: games, badges, avatars, phrases, mock leaderboards, tunables |
| `js/store.js` | The only thing that touches `localStorage`; streaks, bests, badges, vouchers |
| `js/art.js` | Inline SVG art library (same ink-line illustrations as the pitch deck) |
| `js/components.js` | Shared UI: toast, bottom sheet, tab bar, 春联 reveal, identity form, frame ticker |
| `js/share.js` | The share card and the share screen |
| `js/screens.js` | Onboarding, Home, Leaderboard, Rewards, Profile |
| `js/game1.js` | Smile Swipe — per-tooth stains, 8 hidden CNY foods, brush cursor |
| `js/game2.js` | Gathering Readiness |
| `js/game3.js` | Say It Fresh |
| `js/router.js` | Hash router with enter/exit transitions |
| `js/app.js` | Boot |

Plain scripts in dependency order — no modules, no build step.

## Stored data

One key, `systema_cny_v1`:

```jsonc
{
  "onboarded": true,
  "profile":  { "nickname": "", "avatar": "lantern", "lang": "EN", "notifications": true, "createdAt": "YYYY-MM-DD" },
  "festival": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "best":     { "smile": {…}, "gathering": {…}, "fresh": {…} },
  "history":  [ { "id": "", "game": "", "date": "", "ts": 0, … } ],
  "badges":   { "perfectShine": "YYYY-MM-DD" },
  "badgesSeen": [], "vouchers": [], "attempts": {}
}
```

Streak, week grid, leaderboard position, badge state and voucher tiers are all derived from this —
nothing is stored twice.

## Tunables

`js/config.js`:

- `SMILE_MS` — Game 1 session length (60000)
- `S.SMILE` — Game 1 mouth: `ROW_LAYOUT` (tooth types across one row), `STAIN` (swipes each tooth
  type needs), `WIDTH` (relative tooth widths), `ITEM_CLEAR` (extra passes to brush a revealed food
  item away), `HIDDEN_ITEMS` (how many teeth hide one), `COMBO_WINDOW`
- `ROUND_MS` / `ROUND_SPEEDS` — Game 2 round length and per-round speed multipliers
- `FESTIVAL_DAYS` — length of the CNY window
- `FESTIVAL_FIXED` — **set this for production**, e.g. `{ start: '2027-02-06', end: '2027-02-20' }`.
  While it is `null` the window is pinned to first launch so the countdown always reads live in a demo.
- `VOUCHER_TIERS` — badge count → voucher code

`js/game2.js`: `BASE_FALL` (px/s) and `BASE_SPAWN` (ms) set the round-1 feel; the multipliers scale both.

## Dev tools

Profile → **Reset demo data** gives two options:

- *Reset and seed demo scores* — 2 played days, 2 badges, a live streak. Good for screenshots.
- *Reset to a clean first launch* — wipes everything and replays onboarding.

## Prototype boundaries

- No backend, accounts or cross-device sync. Progress is per-device and per-browser.
- Leaderboard opponents are static sample data in `config.js`; the player's own row is inserted
  live at its correct rank from their stored best.
- Game 3 does no speech recognition. A round passes when the mic registers sound above a volume
  threshold for roughly the phrase's duration — or, with no mic, when the button is held that long.
- The voucher code is a static string with a working copy button; nothing is redeemed for real.
- Game 1 stores `cleanliness`, `timeMs`, `combo` and the `discoveries` found that session. The
  results screen always rebuilds from the player's current best, so an old session reopened from
  Profile shows today's numbers, not the historical ones.
