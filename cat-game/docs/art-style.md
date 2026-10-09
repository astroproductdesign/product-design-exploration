# Art Style Guide: "Yard Sketch" (Neko Atsume–inspired)

This guide sets the look of the cat, the room and the UI. Every new drawing in `js/ui/catArt.js`, `js/ui/roomArt.js` and `styles.css` should follow it. If a drawing breaks a rule here, either change the drawing or change this guide on purpose. Don't let them drift apart.

> **Status:** approved and implemented in `js/ui/catArt.js`, `js/ui/roomArt.js` and `styles.css`. `docs/style-samples.html` is the reference sheet.

---

## 0. Where this comes from, and what we must not copy

The reference is *Neko Atsume: Kitty Collector* (Hit-Point Co., Ltd.). We studied the official site, nekoatsume.com/en: the home banner, plus the in-game screenshots for Catbook, Album, Shop and Remodel. We also used the two images supplied with the brief: the large "Haiku"-style calico portrait and a sheet of small in-game cat sprites.

We borrow the **style**: how things are drawn. We do **not** borrow the **content**:

- Don't trace, copy or ship any Hit-Point image, sprite, logo or font.
- Don't recreate named Neko Atsume cats (Snowball, Haiku, Tubbs and so on) or their exact goodies (the cream-puff house, Mister Dragonfly and so on).
- Our cat is still **our cat**: a brown mackerel tabby and white, with a mint collar. It's just drawn in this style.

---

## 1. What the style is, in one paragraph

Neko Atsume draws everything like a **children's picture book made with one black felt-tip pen and flat poster paint**. Every shape has the same thick, rounded, near-black outline. Colours are flat, warm and a little muted. There is no shading, no gradient and no highlight. Cats are **soft blobs**: a big, wide "mochi" head sitting on a small bean body, with stubby legs and a tube tail. The face is tiny and sits low: two small dot eyes set wide apart, and an "ω" mouth. Markings are flat colour patches **with no outline of their own**. The world uses the same pen but is calmer and less saturated than the cats, so the cats always stand out.

---

## 2. Linework

| Rule | Value | Notes |
| --- | --- | --- |
| Line colour | `--ink: #1b1714` (near-black) | The source is effectively pure black (#040404 sampled). We soften it a hair so it isn't harsh on screen. **One ink colour for everything**, cats and room alike. |
| Line weight (cat) | **5 units** at the cat's native scale (head ≈ 92 units wide), so ≈ 5–6 % of head width | Thick and **uniform**: no tapering, no thick-thin variation. |
| Line weight (room) | **4 units** in the 960 × 600 scene | A little lighter than the cat, so the cat reads as the subject. |
| Line weight (small detail) | 3 units | Mouth, closed eyes, wood grain, plank lines and other small inside marks. |
| Caps and joins | `round` / `round`, always | No sharp corners anywhere. Ear tips and table corners are rounded too. |
| Where the outline goes | **Only around the silhouette** and around overlapping parts (a leg in front of the body, a head over the body, an ear behind the head) | **Never** between colour patches *inside* a shape. A tabby patch or white muzzle is just a change of fill. |
| Wobble | Slight hand-drawn irregularity is welcome, built into the path points | No SVG noise or turbulence filters (too slow, and they blur the line). |

**Interior detail lines** are used sparingly, and only where they explain form: the split between two front legs, a closed eye, the "ω", a fold of a cushion. If removing a line still lets you read the shape, remove it.

---

## 3. Colour

### 3.1 Principles

1. **Flat fills only.** No gradients, inner shadows or highlights, including eye shine, on cats, furniture or UI art.
2. **Warm, slightly muted mid-tones.** Colours read like gouache or poster paint, not neon. Saturation sits at about 35–65 %.
3. **White really is white** on cats (#fcfcfc). The world's "whites" are creams (#fcf4ec), so a white cat still pops.
4. **No cast shadows** under cats or objects. If something truly needs grounding, such as a toy that would otherwise look like it's floating, use a flat ellipse in `--ground-shade` at 25 % opacity. Never a blur.
5. **Shade a far-side limb by colour, not by gradient.** A leg on the far side gets the `*-far` swatch, about 8 % darker.

### 3.2 Reference palette (sampled from official art)

Sampled from the home banner and the Album yard screenshot. These are quantised averages, not exact brand values.

| Swatch | Hex | Where it shows up |
| --- | --- | --- |
| Ink | `#040404` | All outlines |
| Paper white | `#fcfcfc` | White cats, sky, signs |
| Cream | `#fcf4ec` | Walls, cards, UI panels |
| Grass green | `#8cac64` | Hedges, lawn, mats |
| Deep green | `#4c8444` | Leaves, plant shadows |
| Roof red | `#d44c34` | Roofs, red goodies, rugs |
| Brick / dark red | `#843424` | Wood trim, furniture |
| Sky blue | `#6ca4e4` | Awnings, blue goodies |
| Mustard | `#ecbc44` | Logo orange-yellow, calico orange |
| Dirt / floor | `#dcbc84` | Yard ground, floorboards |
| Warm wood | `#bc7c4c` | Decking, tables |
| Terracotta | `#cc6c3c` | Plant pots |
| Concrete grey | `#bcb4ac` | Paving, poles |
| Stone grey | `#9c8c7c` | Darker paving, grey cats |
| Petal pink | `#f4accc` | Food bowls, toys, the Catbook UI |

### 3.3 Our tokens

These are the values the code should use. They are adapted from the reference, tuned for an indoor room and for our cat.

**Ink and neutrals**

```
--ink:          #1b1714   outlines, eyes (option B), mouth
--paper:        #fcfcfc   cat white
--cream:        #fcf4ec   walls, cards
--cream-deep:   #f2e4cc   wainscot, card insets
--ground-shade: #1b1714   (only at 25% opacity, rare)
```

**Our cat** (brown mackerel tabby and white)

```
--coat:         #a8957c   tabby base: warm grey-brown, flat
--coat-far:     #978670   far-side legs
--stripe:       #6b5a4a   tabby bars: flat blobs, never outlined
(eyes and nose use --ink)
--collar:       #8fd3c6   mint band, ink outlined
--bell:         #ecbc44   tiny bell
--tongue:       #e98f94   only visible in "mrrp" / yawn
```

**Room**

```
--wall:         #fcf4ec
--wainscot:     #f2e4cc
--floor:        #dcbc84
--floor-line:   #c8a26a
--wood:         #bc7c4c
--wood-dark:    #8a5636
--rug:          #d44c34
--rug-light:    #e8806a
--chair:        #8cac64   (camping chair, was olive)
--chair-dark:   #4c8444
--sky:          #bfe0f4   (window, daytime; flat)
--pot:          #cc6c3c
--leaf:         #8cac64 / #4c8444
--box:          #dcaa6c   (cardboard)
```

**UI**

```
--ui-bg-pink:   #f9d6de   paw-pattern backgrounds (one per menu)
--ui-bg-mint:   #d6f0d8
--ui-bg-butter: #f8e7a8
--ui-card:      #fcf4ec
--ui-border:    #1b1714
--ui-accent:    #ecbc44   menu buttons, page numbers
```

---

## 4. Cat construction

### 4.1 Proportions (sitting, front view)

```
          /\              /\         ← small ears, rounded tips, at the head's outer corners
        /    ‾‾‾‾‾‾‾‾‾‾‾‾‾  \
       |   ●            ●    |       ← head: ~1.3 : 1 wide-to-tall, flat-ish top, full cheeks
       |        ▾ω            |      ← face sits in the LOWER half
        \________________ __/
           |  (  ___  )  |           ← body: small bean, narrower than the head
           |   |  |  |   |  ~~       ← stubby legs, tube tail
           ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
```

| Measure | Rule |
| --- | --- |
| Head height : total sitting height | **≈ 1 : 2** (the head is about half the cat) |
| Head width : body width | **≈ 1.3 : 1** (the head overhangs the body) |
| Body | **Round and soft**: a "rice ball" when sitting, a fat bean when walking or lying. No straight sides, no corners. |
| Head shape | Wide rounded rectangle or "mochi": flat top, slightly wider jowls at the bottom |
| Head + ears | **One silhouette.** The ears are small rounded bumps on the head's top corners (about 20 % of head width), drawn in the same path as the head, so there's no outline where they meet the head. **No pink inner ear.** |
| Eyes | **Solid ink dots** (decided), radius ≈ 5.5 % of head width (diameter ≈ 11 %). No iris, pupil, ring or shine. Set **wide**, about 42 % of head width apart, just below the vertical centre of the head |
| Nose + mouth | A **solid ink oval nose** (≈ 11 × 8 % of head width) centred just below the eye line, joined by a short stem to an "ω" (≈ 20 % of head width), so the two read as one mark. (Chosen face: E1 dots + N4 ink oval + M1 ω, no blush.) |
| Legs and paws | **Small.** Sitting paws are two oval nubs (≈ 15 × 10 % of head width) peeking out under the body. Standing legs are short stubs (≈ 10 % of head width wide, ~14 units tall). Raised arms are thin tubes (7 wide). Limbs use a slightly lighter 4-unit outline. No toes or joints. |
| Tail | Constant-width tube (≈ 11 units) with a rounded end |
| Whiskers | **None.** The style leaves them out. |

### 4.2 Face and expression kit

Faces carry all the emotion, so they have to stay legible at small size (≈ 40 px tall in the room).

| Expression | Eyes | Mouth |
| --- | --- | --- |
| Neutral | dots | ω |
| Happy / purring | `^ ^` arcs | ω |
| Sleeping / slow blink | `‿ ‿` downward arcs | ω, or a small flat line |
| Surprised / pounce | slightly larger dots | small "o" |
| Grumpy / A Look | dots with a flat lid line across the top half | flat line |
| Meowing / mrrp | dots or `^ ^` | open ω with a tongue-pink fill |

**Eye colour (decided):** solid ink dots. The olive iris option was dropped.

### 4.3 Markings: how to draw a tabby in this style

Our cat should be recognisable from **two colours and a handful of marks**. That's the whole budget:

| Area | v2 rule |
| --- | --- |
| Head | Coat colour on top, white lower face. **One soft, wavy boundary** at eye level with a small rise in the middle (the hint of a blaze). **Two** short forehead bars. No cheek stripes. |
| Body | Coat on the sides and back, white chest and front legs. **One or two** bars per visible side. |
| Tail | Plain tube with **two bands plus a dark tip**. |
| Legs | Stubs in one flat colour each: coat at the back, white at the front. No garters, toes or beans. |

- **No outlines on any marking.** Clip the markings to the part's silhouette, then draw the silhouette outline once on top. The `part()` helper in `catArt.js` already works this way.
- **Minimal collar:** a thin mint band (ink outline ≈ 11, mint ≈ 5.5 in head units) that only **peeks out under the chin**, plus a tiny mustard bell. Draw it in the head's coordinate space *before* the head, so the head hides the band's ends in every pose.
- When in doubt, **remove a mark**. If the cat still reads as "brown tabby and white" at 35 % size, the mark wasn't needed.

### 4.4 Poses

Every pose keeps the head at the **same size and front-facing angle** where it can. Neko Atsume rarely turns heads into true profile, and that sameness is part of the charm. Bodies do the posing.

| Pose (existing id) | How it reads in this style |
| --- | --- |
| `sit` | Front view: round body with a white bib, **two small paw nubs** at the bottom, tail curling up at one side |
| `loaf` | A wide rounded rectangle with the head at the front end. No legs visible; the tail lies along the base |
| `curl` | An almost round body, head tucked low at the front, sleeping eyes, tail wrapped along the bottom |
| `belly` | On its back: oval body, white belly, four stubs pointing up, head rolled to the side |
| `walk` | Round side body on four short stubs, head still front-facing, tail up |
| `stretch`, `crouch`, `groom`, `swipe`, `lie`, `back` | Same rules: change body and limbs, keep the head consistent |

### 4.4b Other coats (player's choice)

New players choose their cat's look (`js/core/coats.js`). Every option stays inside this guide: a base colour from a fixed set of 8 swatches, one pattern, and one level of white. Stripe, patch and point colours are **derived** from the base, so nobody can pick an off-palette colour.

| Pattern | How it's drawn |
| --- | --- |
| Solid | No markings. |
| Tabby stripes | The bar budget in §4.3. |
| Patches | One flat blob on the head (over an ear) and one or two on the body, in ginger or black. The tail tip matches. |
| Colour-point | Dark ears, a face mask, legs and tail in the point colour. **Blue eyes** (coloured eye + ink pupil). |

**Dark faces** (black or near-black with no white face): ink features would vanish, so the eyes become gold with an ink pupil, and the nose, mouth and closed-eye lines turn light (`#e9e1d8`). This is the only other exception to ink-dot eyes.

### 4.5 Animation

The flat style needs **simple, springy motion**, not realistic motion:

- Breathing: ±2 % vertical scale on the body only.
- Tail sway: rotate around the base.
- Blinks: swap eye variants (already supported).
- Squash on landing: 6–10 % squash for 120 ms.
- Keep the 1–2 frame "pop" changes between poses. The reference swaps sprites with little in-betweening, so a quick crossfade (≤ 120 ms) is enough.

---

## 5. Environment (the room)

Neko Atsume's yard is a **calm stage** for the cats. Use the same rules indoors.

1. **Viewpoint:** a straight-on wall with a floor seen from slightly above, in simple oblique projection. Don't fuss over vanishing points. Furniture edges can be parallel.
2. **Same ink, slightly thinner line** (4 vs the cat's 5).
3. **Lower contrast and saturation than the cat.** Walls and floor are creams and sandy tones. Strong colours (the red rug, blue goodies, green chair) come in small doses.
4. **Texture by a few marks, never patterns:** 2–3 grain lines on wood, plank seams on the floor, 3 dots on a cushion. No repeating fills, hatching or noise.
5. **No sheer or translucent materials.** The current sheer curtains become flat cream curtains with 2–3 fold lines. The only exception is the window glass: a flat lighter tint, no reflections.
6. **Plants and props are chunky icons:** a pot is a trapezoid with a rim band, and leaves are 3–5 rounded blades.
7. **Objects sit on the floor with no shadow.** An object's bottom outline is its "contact".
8. **Room furniture keeps our real-cat quirks:** the round scratcher bed, the green camping chair, the wooden table with a laptop, the TV desk, the window sill. They're just redrawn in this style.

### 5.1 Time of day and seasons

Neko Atsume has seasonal sets but no real-time lighting. We keep our clock, but express it **flatly**:

- Day phases change **flat tokens**: window sky colour, plus a full-scene overlay of one flat colour at low opacity (`mix-blend-mode: multiply`). Example: dusk is `#f2b27a` at 18 %, night is `#3a4a7a` at 35 %.
- **No radial light gradients.** The lamp at night gets a flat pale-yellow cone shape at 25 % opacity.
- Seasonal decor (lanterns, ketupat, pelita, Christmas) follows the same prop rules: flat, inked and chunky.

---

## 6. UI (secondary, but it has to match)

From the Catbook, Album, Shop and Remodel screens:

- **Cards** are cream (`--ui-card`) with a 3 px ink border, 10–12 px rounded corners, and a slightly hand-drawn edge where possible.
- **Screen backgrounds** are a pastel colour with a faint **paw-print pattern**. Each menu has its own colour: Diary is pink, Shop/Room is mint, Album is butter.
- **Buttons** are square-ish tiles in mustard or cream with an ink border and an icon above a tiny label, like the menu "paw" button.
- **Headings** use a chunky rounded font with a white fill, an ink outline and a slight drop. Suggested free font: **"M PLUS Rounded 1c" (800)**. Body text uses a plain rounded sans.
- **Text fields** are white with ink-coloured ruled lines, like the notepad in the Shop screen.

---

## 7. Do / Don't checklist

**Do**
- ☐ Use one ink colour and a uniform, round-capped line.
- ☐ Fill everything flat.
- ☐ Give the cat a big wide head, small body and tiny low face.
- ☐ Draw markings as unoutlined flat shapes clipped to the part.
- ☐ Keep the room calmer than the cat.
- ☐ Keep every curve rounded.

**Don't**
- ☐ No gradients, highlights, eye shine or blur shadows.
- ☐ No whiskers, eyelashes, eye colour, pink inner ears, toe beans, blush or fine fur stripes.
- ☐ No outline between two colour patches on one body part.
- ☐ No translucent, sheer or reflective materials.
- ☐ No Hit-Point assets, characters or fonts.

---

## 8. Mapping to the code (for implementation)

| File | Change |
| --- | --- |
| `js/ui/catArt.js` | Replace the `C` palette with the tokens in §3.3. `LW` goes from 3 to 5. Redraw `HEAD` as one head-plus-ears silhouette, which removes `ear()`. Remove whiskers and eye liner. Make the nose an ink oval joined to the ω; enlarge the eyes and mouth to the §4.1 sizes. Replace `collar()` with the thin under-chin band (§4.3), drawn as part of the head. Redo `eyeSet()` with ink dot / `^` / `‿` variants. Cut the markings down to the v2 budget (§4.3). Merge the sit body and front legs into one shape. Keep `HEAD_AT` / `TOP` up to date with the new proportions. |
| `js/ui/roomArt.js` | Replace the `K` palette. Line becomes `--ink` at 4. Flatten the curtains, sky and lamp light. Remove gradients from `applyLighting()` and switch to the flat multiply overlay. Redraw furniture as chunky icons. |
| `styles.css` | UI tokens, card and button styles, paw-pattern backgrounds, heading font. |
| `scene.js` | Possibly the cat's scale. The bigger head changes where speech bubbles, hearts and the petting zones sit (driven by `HEAD_AT` / `TOP`). |

The game logic in `js/core` is unaffected.

---

## 9. Decisions log

| # | Decision | Status |
| --- | --- | --- |
| 1 | Environment style (§5) | ✅ Approved |
| 2 | Eyes: solid ink dots | ✅ Decided |
| 3 | Cat v3: one-piece head, minimal markings, rounder body, smaller legs and paws | ✅ Approved and implemented |
| 3b | Face: E1 dots + N4 ink oval nose + M1 ω, no blush | ✅ Chosen |
| 4 | Collar: minimal mint band under the chin with a tiny bell | ✅ Chosen |
| 5 | UI restyle (ink borders, cream cards, paw-print backdrop, M PLUS Rounded 1c) | ✅ Implemented |
| 6 | Line colour: near-black `#1b1714` | ✅ Used in approved environment |
