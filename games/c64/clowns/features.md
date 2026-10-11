# Clowns — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Commodore, *Clowns* instruction leaflet for the C-64 (©1983 Commodore
  Electronics Ltd.), scan at https://www.mocagh.org/forsale/clowns-manual.pdf,
  read from its OCR text layer on 11 October 2026. Cited as "manual".
- C64-Wiki, "Clowns", https://www.c64-wiki.com/wiki/Clowns, read
  11 October 2026. Cited as "wiki". Its screenshots, two animations and
  the box cover are saved in `reference/c64wiki-*`.
- Wikipedia, "Clowns (video game)",
  https://en.wikipedia.org/wiki/Clowns_(video_game), read 11 October 2026:
  the arcade original (Midway, 1978); nothing specific to the C64 cartridge.
- The game's own screens, in VICE, 11 October 2026 (`reference/title.png`,
  `title-players.png`, `player1-start.png`, `play.png`).

Release year: the title screen says ©1982 (Bally/Midway and Commodore);
the manual's copyright is 1983; the wiki gives 1982.

## Features

| Feature | Status | Where |
|---|---|---|
| Played with paddles in control port 1 (manual: "Plug paddle into Port 1"; wiki: the cartridge works only with paddles) | open | ROM reads `$D419,Y` at `$F18F`; the joystick moved nothing in play (orientation) |
| The see-saw follows the paddle's turn (wiki) | live | in play, the value the game computes at `$F18D`-`$F196` (`$C8` minus the paddle reading, floored at 0) set to 0, 100 and 200 for 30 passes each put the see-saw's two sprites (1 and 2, 24 pixels apart, y = 234) at x = 41, 146 and 271 |
| F1 starts a one-player game, F3 a two-player game (manual, wiki) | live | F1 on the title brings up `F1 FOR 1 PLAYER, F3 FOR 2 PLAYERS.`; F1 again starts player 1 |
| Two players take turns (wiki) | open | |
| Two clowns: one bounces the other up off the see-saw (manual) | open | |
| A clown starts from one of the two platforms on each side (wiki) | open | platforms visible left and right in `reference/play.png` |
| The falling clown must land on the free (raised) end of the see-saw, or it falls (wiki) | open | |
| A fall costs a jump; the top line shows `JUMPS` (screens). The wiki says the game ends after 3 falls | open | `JUMPS 5` at the start of play, `JUMPS 3` after two falls with no input (`reference/play.png`) |
| Three rows of balloons: blue on top, green, yellow at the bottom (screens) | live | title and play screens |
| Yellow balloon 20 points, green 50, dark blue 100 (manual, wiki) | open | |
| Each bounce 10 points (manual, wiki) | open | |
| Clearing all yellow: 200 bonus; all green: 500; all dark blue: 1000 and one bonus jumper (manual, wiki) | open | |
| High score shown on the title screen (screens) | live | `HIGH SCORE 0` |
| Player 1 and player 2 scores in the top line (screens) | live | |
| Sounds: bounce and balloon pop; short tunes when a row is cleared, when a game starts and on a fall; no background music (wiki) | open | |
| The clown "bounces his partner to the top of the center ring" (manual) | open | no ring seen on screen yet |
| An attract mode: the clowns play on their own on the title screen (screens) | live | `reference/title.png` |

## Beyond the documentation

Found in the code, not in the manual.

- No interrupts: the IRQ and NMI vectors point at a lone `RTI` (`$F765`).
- The routine at `$F4A6` that reads F1 and F3 also reads the two fire
  lines of control port 1 (`$DC01` bits 2 and 3 with `$DC00` = `$FF`):
  what the paddle buttons do is open.

## Open questions

- Which paddle (port 1, X or Y) each player uses, and what the paddle
  buttons do.
- What the "center ring" of the manual is in this version.
- Whether the balloon rows refill, and whether anything speeds up.
- The wiki's POKEs (`POKE 3566,255`, `POKE 23789,255`, and `$0221` = `$FF`
  for 255 lives) are for other versions or untested: `$0221` lies in RAM
  this cartridge uses and is checked in `cheats.md`.
