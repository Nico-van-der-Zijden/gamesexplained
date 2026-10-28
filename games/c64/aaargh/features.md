# Aaargh! — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's manual, the contributor's scan (`work/manual.pdf`, Melbourne
  House, one booklet for every machine), read 28 October 2026. Its C64
  section says only "Joystick only" and "Joystick controls as for Spectrum
  version"; the controls below are the booklet's general ones.
- Wikipedia, "Aaargh!", https://en.wikipedia.org/wiki/Aaargh!, read 28
  October 2026: the arcade original (1987, Mastertronic's Arcadia
  Systems, Amiga hardware), the ports of 1988-1989, the review in Zzap!64
  issue 42 (the 87 % it lists is the Amiga version's).
- CSDb, a search for "aaargh", https://csdb.dk/search/?seinsel=all&search=aaargh,
  read 28 October 2026: 36 releases, among them C64 cracks from July and
  August 1989 (X-Ray's "Aaargh! +" of July 1989 among them).
- The game's own title screen, in the emulator: "WRITTEN BY VICIOUS FISH",
  "WITH ART BY ERIC CASEY AND THE PICTURELEMENT", "AND SOUND BY WALLY
  BEBEN", "A BINARY DESIGN GAME FOR MELBOURNE HOUSE", "COPYRIGHT 1989".
- C64-Wiki has no page for the game at `/wiki/Aaargh!` or `/wiki/Aaargh`
  (both 404 on 28 October 2026). Lemon64 refused the fetch (403).

## Features

| Feature | Status | Where |
|---|---|---|
| Two monsters, the ogre and the lizard (the manual's dragon); the title shows a best score for each | live (the title; a game started with one fire press is the lizard's) | title screen, rows 10-14 |
| Joystick in port 2 | live | |
| Up moves into the screen, down out of it, left and right along it | live (up and left from `work/play-city1.vsf`) | |
| Fire with the stick central breathes flame, which starts when the stick is released | live (fire held 0.6 s from standing: the score went from 0 to 10) | |
| Fire with a direction punches: up high, forward mid, down low or picks up an object; facing into or out of the screen, up punches and down picks up | open (forward scored 60 from standing; high and low scored nothing there) | |
| No flame in the head-to-head battles | open | |
| Twelve cities, each a different style (straw huts, a wild west fort, a Chinese pagoda, an Indian temple), and the volcano last (Wikipedia says ten) | open (the first is a village of straw huts, live) | |
| Buildings are punched down or set on fire; a Roc's egg is hidden in most cities but not all | open | |
| Hornets fly across the screen and sting | open (a hornet seen flying across the top, live) | |
| The humans bring weapons to bear, which have to be destroyed | open | |
| Hamburgers and people can be eaten for health | open | |
| Lightning increases fire power, the damage the flames do | open | |
| Every hit lowers health; at zero the monster dies | open | |
| A captured egg is taken back to the treasure cave, where the other monster has to be fought for it | open | |
| Five eggs take the monster to the volcano and the final, golden egg | open | |
| A score of seven digits at the top of the screen, with two bars beside it | live (the bars' meaning open) | top band |
| One player only on the C64 (Wikipedia: the ports were one player; the arcade had two) | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions

- Which monster the player gets, and whether the title lets them choose
  one: one press of fire gave the lizard.
- What the two bars at the top are (health and fire power, by the manual's
  list, is a guess until the code says).
- Whether all twelve cities and the volcano are in the one load
  (`orientation.md`): the Spectrum version loaded each level separately.
