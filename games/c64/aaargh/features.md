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
| Two monsters, the ogre and the lizard (the manual's dragon); the title shows a best score for each | live | title `$AF38`, best scores `$B332`, `$B340` |
| Joystick in port 2 only | differs: fire on port 2 starts the lizard and port 2 steers it; fire on port 1 starts the ogre and port 1 steers it (`lda $DC00,x` at `$8A43`). Live: both | `$B187`, `$89E0` |
| One player only on the C64 (Wikipedia: the ports were one player; the arcade had two) | differs: two players play at once. With a game on, fire on the other port brings the other monster in (`$8A94`, once a game). Live: the ogre joined a game of the lizard's (`reference/play-two-players.png`) | `$89E0`, `$8368`, `$83B2` |
| Up moves into the screen, down out of it, left and right along it | live (up and left from `work/play-city1.vsf`); walkable cells are characters from `$95` up and the city's floor character | `$8ACD`, `$8B34`, `$8BA4`, `$8C30` |
| Fire with the stick central breathes flame, in the way the monster faces | live (the score rose by 10); traced: a flame burns a building a point every second pass, hurts the other monster within three columns and a row, burns a hornet, the white flyer or the cannon | `$8D07`, `$914D` |
| Fire with a direction punches: up high, forward mid, down low or picks up an object | differs: a punch with any direction hits the building that way (above, below, left or right) and knocks a hole in it for 10 points, while the monster has punching power; before any punch or flame the monster eats a person in reach or takes a pickup under it (`$914E`). Live: forward scored 60 | `$8D07`, `$914E` |
| No flame in the head-to-head battles | confirmed: in the cave fire with a direction punches and up ducks; there is no flame | `$ACA1` |
| Twelve cities and the volcano last (Wikipedia says ten) | differs: eight city types, a cave and the volcano. Each round is three cities and the volcano: the first is type 1 or 6, the second 2 or 5, the third 8, 3 or 7, the fourth always type 4, the volcano; then the round starts again (live, `work/rounds.py`) | `$8444`, `$842F`, cities `$2E78`-`$6316` |
| Buildings are punched down or set on fire; a Roc's egg is hidden in most cities but not all | confirmed: six buildings a city; punches and flames bring each down in stages (`$93F0`, `$94FF`) until it falls (`$95D9`), and the rubble may hold a pickup or the egg; the sixth to fall holds the egg if none has, and the volcano has none in its rubble. Live: the egg and the pickups (`reference/pickups.png`) | `$93F0`, `$94FF`, `$95D9` |
| Hornets fly across the screen and sting | confirmed: two hornets fly in at the monsters' height and sting the monster higher on the screen, hurting it twice; a flame burns them for 5 points | `$A446` |
| The humans bring weapons to bear, which have to be destroyed | confirmed: a cannon rolls along the ground and fires shells; flames take its health of 14 down, and below 7 it breaks up | `$A9B4` |
| Hamburgers and people can be eaten for health | confirmed: a person in reach is eaten (6 passes, 1 point); the hamburger pickup ($86) adds a cell of health. Live: the pickups' pictures | `$914E`, `$91C4` |
| Lightning increases fire power, the damage the flames do | differs: the lightning pickup ($82) refills the second bar, the punching power, which every punch spends and without which a punch does nothing; flames need no power | `$91C4`, `$92D6` |
| Every hit lowers health; at zero the monster dies | live: a monster that is hurt loses a cell of its first bar, and with the bar empty it dies (`work/whokills.py`) | `$931E`, `$938D` |
| A captured egg is taken back to the treasure cave, where the other monster has to be fought for it | live: taking the egg ends the city in the cave, where the monsters fight to five hits; the computer plays a monster nobody steers (`work/cave.py`, `reference/cave-fight.png`) | `$ABB7`, `$ACA1`, `$AE01` |
| Five eggs take the monster to the volcano and the final, golden egg | differs: no count of eggs is kept; the volcano is every fourth city, and its golden egg, in sight from the start, leads to the cave like any other; the game has no ending and goes round again | `$800D`, `$87A1`, `$91DB` |
| A score of seven digits at the top of the screen, with two bars beside it | confirmed: the first bar is health, the second punching power; points are added a pass at a time, 10 on the screen each | `$93AE`, `$938D` |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| A hidden list of names on the title: bands, clubs and people (WINDOWPAINS, FLOODLANDS, NEW ORDER, MACHESTER, HACIENDA, THE VENUE, SUICIDE, RENTBOYS, ... PERFECT WAY THE THE) copied 11 characters at a time to the top left of the screen every 32 passes of the title loop, which waits two frames a pass, in black on black | live | text `$9D9F`, copy `$B13E` |
| Holding 1, ←, CTRL and 2 together on the title shows the list in white and renames the monsters MYRTLE (the lizard) and DILL (the ogre) | live (`work/egg.py`) | `$B161`, names `$B347` and `$B34D` |
| A message in the program, never shown: "I'M AT PAINS TO SEE...SEE THROUGH THOSE WINDOWPAINS...SEE RENTBOYS AND GOTO 16384." | confirmed: no instruction reads it; 16384 is `$4000`, inside city type 3's characters | `$B37D` |
| Three animated characters show a wrong frame one pass in four: the animation reads its table backwards from 24 times the phase, and for phase 0 the index wraps below the table | live (`work/animtest.py`); where those characters show is open | `$B463` |
| The cave fight's computer opponent | confirmed: with one player, the computer walks the other monster towards or away, punches and ducks at random | `$AE01` |

## Open questions

- Where characters `$93`-`$95` show, and so whether the wrong frame of the
  animation can be seen.
- Whether the routine at `$9595`, which a call one byte short of it switched
  off, drew something a player would miss.
