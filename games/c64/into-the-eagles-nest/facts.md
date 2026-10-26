# Into the Eagle's Nest — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

PAL cassette, Pandora 1986/1987. The inlay is stamped © 1986 and the
Mindscape manual for the American release © 1987.

## Memory layout

| Thing | Where |
|---|---|
| Program and data, as the tape leaves them | `$0806`-`$80FF`, `$8600`-`$86FF`, `$8C00`-`$8FE6`, `$A000`-`$BF3D`, `$D000`-`$F3FF` |
| Title picture's bitmap, overwritten once the game runs | `$A000`-`$BF3D` |
| Screen | `$0400` |
| Character set for the play screen and the status panel | `$2000` |
| Character set for the attract screens and the message line | `$2800` |
| Message line, two rows of the screen | `$0798`-`$07E7` (rows 23 and 24) |
| Message text, as ASCII separated by `@` | `$5609`-`$592A` |
| Message buffer the printer fills | `$8800` onwards |
| High score table, ten entries of 20 bytes | `$0D51`-`$0E18` |
| Floor names, four of 13 bytes | `$1A78`-`$1AAE` |

## Timing

The player moves 8 pixels every 4 frames in each direction, measured on
`work/play-mission1.vsf` with one direction held and nothing else moving
(*live*, `work/controls.py`).

## Controls

Joystick in control port 2. Each direction moves the player; fire shoots
in the direction of travel and spends one round. SPACE toggles a pause,
and RESTORE abandons the game for the attract loop (all *live*;
`features.md` has the measurements).

## Graphics

The player is four sprites in a 2×2 block, sprites 0 to 3; the bullet is
sprite 4, parked at (0,0) when there is none (*live*).

One frame of play writes the video chip four times: `$D018` = `$1B` and
`$D016` = `$C4` on line 228, then `$D018` = `$19` and `$D016` = `$D0` on
line 253 (`work/frame-play.json`). So the play screen and the panel are
multicolour text from the character set at `$2000`, and lines 228 to 253
are single-colour text from the set at `$2800`: that band is the message
line at the bottom.

## The two alphabets

The game writes text in two different ways, and neither uses the
machine's own screen codes.

**The status panel**, from the character set at `$2000`. Only the ten
letters the panel needs exist, scattered among the wall tiles, each drawn
as holes in a solid cell so the letter shows the colour behind it:

| Letter | A | E | H | I | K | M | O | S | T | Y |
|---|---|---|---|---|---|---|---|---|---|---|
| Code | `$01` | `$2F` | `$26` | `$27` | `$2E` | `$24` | `$25` | `$2D` | `$2C` | `$74` |

Digits are `$F0` to `$F9` for 0 to 9, drawn the ordinary way round. The
panel reads KEYS (row 4), AMMO (row 6) and HITS (row 8), each with two
digits at columns 36 and 37, and a six-digit score on row 11. A mission
starts with AMMO at 99 (*live*: `work/screenpng.py` renders those rows
from the snapshot, and the second digit stepped to 8 on the frame a shot
was fired).

**The attract screens and the message line**, from the character set at
`$2800`. Each character is a 2×2 block of cells, so it is 16 pixels wide
and 16 high, and its four cells are consecutive codes: top-left `n`,
bottom-left `n+1`, top-right `n+2`, bottom-right `n+3`. The code is

```
n = (ASCII AND $3F) * 4
```

which puts A at `$04`, Z at `$68`, space at `$80`, and the digits 0 to 9
at `$C0` to `$E4`. The printer at `$5935` does exactly that: it reads the
text, `AND #$3F` for each character, into a buffer at `$8800`, and the
routine at `$5962` shifts each buffered character left twice (`ASL`,
`ASL`) and stores the code at `$07BF` and `$07E7` — the right-hand end of
rows 23 and 24, so the line fills from the right.

Because of that, **the game's stored text is plain ASCII**. Searching for
the letters of a word the game shows, by the differences between them,
found "PANDORA" in the high score table at `$0D51` and the words of the
attract screens at `$1110` on the first pass (`work/diffsearch.py`).

## Mechanics

## Data tables

The messages, each ending with `@`, at `$5609`:

| # | Text |
|---|---|
| 0 | `YOU HAVE FOUND` |
| 1-8 | `AMMO.`, `A PAINTING.`, `A VASE.`, `SOME COLD FOOD.`, `FIRST AID.`, `A PENDANT.`, `A LIFT PASS.`, `A DOOR KEY.` |
| 9 | `DETONATOR ACTIVATED.` |
| 10 | `YOU HAVE SHOT` |
| 11 | `WELCOME TO THE EAGLES NEST.` |
| 12 | `ANY MORE AMMO WOULD BE WASTED !` |
| 13 | `OUT OF AMMO!` |
| 14 | `THIS DOOR IS LOCKED !` |
| 15 | `COME ON ! GET ON WITH IT.....` |
| 16 | `LETS GET DOWN TO SOME SERIOUS DESTRUCTION !` |
| 17 | `SHOOTING A LIFT PASS IS A BIT SILLY !` |
| 18 | `YOU NEED A LIFT PASS !` |
| 19 | `YOU ARE ENTERING THE LIFT.` |
| 20-23 | `IN THE BASEMENT.`, `ON THE GROUND FLOOR.`, `ON THE FIRST FLOOR.`, `ON THE SECOND FLOOR.` |
| 24 | `YOU ARE` |
| 25 | `YOU ARE WAISTING AMMO.` |
| 26 | `EMPTY!` |
| 27 | `FOOL!....EXPLOSIVES.` |
| 28 | `SOME JEWELS.` |
| 29 | `YOUR MISSION IS NOT YET COMPLETE !` |
| 30 | `WELL DONE.....YOU HAVE RESCUED A PRISONER.` |
| 31 | `...PAUSING...` |
| 32 | `THE CASTLE IS NOW DESTROYED.` |

"WAISTING" is the game's own spelling. One more message sits apart, at
`$6C98`: `THE PRISONER IS VERY CLOSE.`

Other text: the four floor names at `$1A78` (`BASEMENT`, `GROUND FLOOR`,
`FIRST FLOOR`, `SECOND FLOOR`, 13 bytes each); `SELECT MISSION` at
`$1D14`; `MISSION` at `$1E06`; `RESCUE THE PRISONER` at `$1E18`;
`BLOW UP THE CASTLE` at `$1E2C`; `WELL DONE !` at `$1F15`;
`YOUR MISSION WAS A` at `$1F21`; `SUCCESS` at `$1F34`; the credits at
`$10C8` (`PROGRAMMING BY`, `ANDREW CHALLIS`, `GRAPHICS BY`,
`ROBIN CHAPMAN`, each ending `$FF`); `VALUABLES` and its four items at
`$1110`, and `SUPPLIES` and its four at `$1177`, each ending `$00`.

## Sound

The attract loop writes the sound chip about 58 times a second (173
writes in three seconds); play with nothing pressed writes it not at all,
and a shot produced 11 writes (*live*, `work/sidwrites.py`).

## The listing's error rate

## Live tests

- Controls, one at a time, from the play snapshot (`work/controls.py`,
  `work/fire.py`).
- SPACE pauses and resumes, judged by the counter at `$02B4`
  (`work/pause4.py`).
- RESTORE returns to the attract loop (`work/restore.py`).
- Nothing executes in `$0100`-`$03FF` during 40 seconds of play, so the
  game is one load (`work/noload.py`).
- One frame of play redrawn from memory matches the emulator's own
  picture, 104,448 pixels of 104,448 (`kit/c64/frame.py compare`).
