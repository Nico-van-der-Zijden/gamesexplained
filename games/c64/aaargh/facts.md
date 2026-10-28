# Aaargh! — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The image is the game as a Trilogic Expert freezer saved it, restarted at
its own entry, `$8009` (`orientation.md`). `$8000`-`$8008` hold the text
`CBM80000`.

## Memory layout

| Thing | Where |
|---|---|
| Entry, as `SYS 32777` reaches it | `$8009` |
| Screen | `$C800` (video bank 3, `$D018` = `$21`) |
| Character set | `$C000`-`$C7FF` |
| Sprite pointers | `$CBF8`-`$CBFF` |
| The title's hidden list of names, ASCII with `@` for a space | `$9D9F` |
| The monsters' hidden names, MYRTLE and DILL | `$B347`, `$B34D` |
| A message no routine has been found to show | `$B37D` |

## Timing

`$B728` waits for the frame to start again: it waits for bit 7 of `$D011`
to be set, then clear.

## Controls

- Fire on port 2 at the title starts the lizard, fire on port 1 the ogre
  (`$B187`: port 1 is read through `$DC01` bit 4, port 2 through `$DC00`
  bit 4, and the one pressed adds to `$80EB` or `$80EC`). *Live.*
- Holding 1, ←, CTRL and 2 on the title (`$DC01` = `$F0` with keyboard row
  7 driven, as the KERNAL left `$DC00` = `$7F`; the game never writes
  `$DC00`) colours the top row white, so the hidden list of names shows,
  and writes MYRTLE and DILL over LIZARD and OGRE (`$B161`). *Live.*

## Graphics

### The alphabet

The character set at `$C000` holds its own letters and digits:

| Code | Character |
|---|---|
| `$00` | space |
| `$01`-`$1A` | A to Z |
| `$1B`-`$24` | 0 to 9 |
| `$F0`-`$F9` | 0 to 9, a heavier face |

So text stored as screen codes reads normally for the letters, and a
digit is `$1B` plus its value. The title's credits at `$B26D` are stored
this way. The hidden list at `$9D9F` is ASCII, and the routine that copies
it (`$B13E`) keeps the low six bits, which turns ASCII capitals into these
codes and `@` into a space.

### Interrupts

Raster interrupts through `$0314`, chained (`orientation.md`, "Steady
state"): on the title `$B1CE` (line 0, the logo and the music) and `$B224`
(line 120, the monsters); in play `$8810` (line 0, the first band of
sprites and the music or the sound effects) and `$88A2`, on the line in
`$889E`, which `$9B4F` sets each pass to the higher of the monsters' upper
sprites less `$1A`. `$B6E9` installs the first handler, `$B714` ends each.

### Sixteen sprites

Each band has eight sprites. The first (`$8810`): the two hornets, the
white flyer and a fourth, from `$80B5`-`$80BC` with pointers from
`$80C6`. The second (`$88A2`, whose operands `$9B4F` writes): each
monster's lower and upper body and its punching arm, three sprites each,
and the cannon as two sprites side by side, 21 pixels apart. When the ogre
stands lower on the screen than the lizard, `$9AF8` swaps the two
monsters' sprites, so the nearer one has the lower numbers and is drawn in
front.

A monster's lower sprite is built every pass (`$9772`): its frame is
copied from the shapes at `$0BB8` (64 bytes a frame, 98 frames) into
`$9D12`, and `$9811` clears the pixels where a cell around the monster
holds a character below `$A0`, so the monster seems to walk behind walls
and buildings. The upper sprite and the arm point straight at shapes in
video bank 3, most of them in the RAM under the I/O area and the KERNAL
(`$CDC0`-`$F0FF`).

### Characters

The city's own characters (`$C000`-`$C3FF`) come from its data, 62
shared ones (`$C590`-`$C77F`, codes `$B2`-`$EF`) from a window at
`$6317`-`$68F6` or `$BD5F`-`$C13E`; the rest of `$C400`-`$C7FF` came with
the load and is never rewritten except for the animated and built
characters: `$93`-`$95`, `$97`-`$9A` and `$A9`-`$AE` (`$B463`), the person
`$96` (`$86DF`), the falling things `$9E` and `$9F` (`$A80E`, `$AAE5`). The
pickups are characters `$82` (lightning), `$86` (a hamburger), `$8A` (a
box that hurts) and `$8E` (the egg), four each, two by two (*live*,
`reference/pickups.png`). `$AF` is a mark left on a cell for one pass,
which `$8970` puts back from the city's copy of the screen at `$7918`.

## Mechanics

- **The rounds.** The city count `$803E` runs 1 to 4 and round again
  (`$803A`). `$8444` picks the city type from `$842F` at four times the
  count plus a random number from 1 to 4: types 1 or 6 for the first city,
  2 or 5 for the second, 8, 3 or 7 for the third, and always type 4, the
  volcano, for the fourth (*live*, `work/rounds.py`). No count of eggs is
  kept, and nothing ends the game but both monsters dying.
- **The end of a city.** `$8032` counts from 1 once six buildings have
  fallen (`$9704`, not in the volcano) or the egg has been taken
  (`$91EE`), a step a pass (`$8942`); at `$14` the main loop ends the city.
  If the egg was taken (`$9687` = 2) the fight in the cave follows
  (`$ABB7`).
- **The egg.** `$9687` is 0 until a fallen building leaves the egg in its
  rubble (the sixth to fall holds it if none has), 1 while it is out and 2
  once a monster has taken it. The volcano starts at 1, with its golden egg
  drawn on the screen from the start (`$87A1`).
- **The cave.** The monsters walk, punch and duck, and the first to take
  five hits (`$AF1D`) loses; the winner scores 50 (500 on the screen) if a
  person plays it. A monster nobody steers is played by the computer
  (`$AE01`) (*live*, `work/cave.py`: with no input, the computer's ogre hit
  the lizard five times).
- **Two players.** Each monster reads its own port: `lda $DC00,x` at
  `$8A43`, port 2 for the lizard (X = 0) and port 1 for the ogre. With a
  game on, fire on the other port brings the other monster in, once a game
  (`$8366`, `$8367`) (*live*, `work/join.py`).
- **Moving.** A monster moves a cell every second pass, half-steps in
  `$80A9`/`$80AD`; the cells under its feet must hold characters from `$A0`
  up, and the cell ahead one from `$95` up or the city's floor character
  (`$A9A3`). It cannot walk into the other monster (within three columns
  and a row).
- **Fire.** With a direction, a punch at the building that way: a hole
  (`$B44A`) and 10 points while the monster has punching power (`$80ED`),
  and a cell of the second bar spent (`$92D6`). With the stick in the
  middle, a flame the way the monster faces: it burns a building a point
  every second pass, and hurts the other monster, the hornets, the white
  flyer and the cannon. First, though, the monster eats a person in reach
  or takes a pickup under it (`$914E`).
- **Health.** The first bar, five cells from `$FE` (full) down to `$FA`,
  is the health: each hurt (`$931E`) takes one step off, and an empty bar
  starts the death (`$80E9` counts down from `$1F`). The hamburger adds to
  it, the lightning to the second bar. A box (`$8A`) hurts eight times.
- **Score.** Points owed (`$80E7`, `$80E8`) are added a pass at a time
  (`$93AE`), each 10 on the screen; the best scores on the title are
  updated at a monster's death (`$B3CF`).
- **Random numbers.** A 32-bit shift register (`$B7B0`, stepped by `$B794`,
  bits 3 and 6 of the top byte exclusive-ored in) feeds `$B75E`, a number
  from 0 to A-1. Most choices read the table at `$9C12` instead, at the
  place `$A91E` (the operand of `ldx #` at `$A91D`), which each pass of
  play counts on and refills with a number from 1 to 4 (`$89CC`).

## Data tables

| Table | Where | What |
|---|---|---|
| City data | `$82CF`/`$82D9` | the address of each type's colours, characters and packed screen, `$2E78` to `$5CDB`; type 9, the cave, uses type 3's |
| City colours | `$B5D7`, `$B5E1`, `$B5EB`, `$B6D7` | background, two multicolours, border |
| Buildings | `$B5F5`, `$B626`, `$B657` | column, row and type, six a city, read backwards from entry 6 × type |
| Building pictures | `$A209`/`$A22F`, `$A255`, `$A27B` | address, width and height by type, 37 pictures at `$9EA7`-`$A207` |
| Start places | `$B69A`-`$B6C5` | each monster's column and row by city type |
| Shared characters | `$B688`/`$B691` | each type's window of 62 |
| Animation | `$80EF`, `$8133`, `$8177`, `$81BB` | the monsters' upper pointers and lower frames, 68 entries each |

## Sound

The music driver at `$68F8` plays two tunes (`$7015`): tune 1 on the title
and tune 2 in the cave. Three voices, each reading an order list of
patterns (`$7121`), 32 instruments of eight bytes (`$7021`), three drums
(`$7431`), arpeggios, slides and vibrato. In play the interrupt runs the
sound effects instead (`$756A`, 26 effects of 16 bytes at `$7778`).

## The register census

From every instruction in the listing, with `kit/cpu/census.py` on 29
October 2026: 159 instructions name 57 registers.

- The video chip: sprite positions (`$D000`-`$D010`, written with an index
  from `$D000`), the raster and interrupt registers, the memory pointers,
  sprite enable, priority, multicolour and expansion, the border and three
  background colours, two sprite multicolours and five sprite colours. The
  sprite collision registers `$D01E` and `$D01F` are named by no
  instruction, so the game does its own collision tests.
- The SID: every access is through voice 1's registers with an index
  (`sta $D400,y` and the like), which reaches all three voices, plus the
  filter resonance (`$D417`) and the volume (`$D418`). `$D41B`, the third
  voice's output, is named by no instruction.
- CIA 1: port A (`$DC00`, the joystick in port 2) and port B (`$DC01`, port
  1 and the keyboard columns), and the interrupt and timer registers when
  the game turns the timer interrupt off (`$B702`). CIA 2: port A, the
  video bank (`$8303`).
- The processor port `$01`, set to `$36` once, at the entry (`$800B`).

## Strings

From `kit/cpu/strings.py` on the hand-over: the title's credits
(`$B26D`-`$B32A`), the hidden list of names (`$9D9F`-`$9EA0`), the
message at `$B37D`, and "OUND FX" at `$68B7`. The rest of what it found
in the game's range is graphics that happen to read as letters. "ALL DATA
READ" at `$0400` is the screen as the Expert's restart left it, and "ALL
DATA READ" and "WAITING FOR DATA" at `$0A62` are in the code the tape's
loader left at `$0A00` (it calls `$FFD2` at `$0A4A`); neither is the
game's. "SOUND FX" at `$68B6` is in the last of the cities' shared
characters, just below the music driver.

## The listing's error rate

## Live tests

- The easter egg on the title (`work/egg.py`): holding 1, ←, CTRL and 2
  shows THE VENUE in white at the top left and MYRTLE and DILL beside the
  monsters (`reference/title-easter-egg.png`).
- Fire on port 1 at the title (`work/p1.py`): play starts with the ogre,
  its score and bars on the right (`reference/play-village-ogre.png`).
- A second player (`work/join.py`): from a game of the lizard's, fire on
  port 1 set `$80EA` from 0 to `$20`, and the ogre walked in from the
  right while the lizard played on (`reference/play-two-players.png`).
- Who kills the lizard (`work/whokills.py`): a store checkpoint on
  `$80E9` in random play stopped at `$9354`, the death in `$931E`, after
  50 seconds; both monsters die from their first bar emptying.
- The animation (`work/animtest.py`): characters `$93`-`$95` take the
  table at `$B4BF` + 1, + 25 and + 49 in phases 1 to 3, and in phase 0 the
  bytes `$B5A8`-`$B5BE` and `$B4BF`, the wrapped read.
- The pickups (`work/pickups.py`): the four drawn on the screen in their
  colours (`reference/pickups.png`).
- The rounds (`work/rounds.py`): ending each city by setting `$8032` to
  `$14`, the counts ran 1 to 4 and back to 1, the fourth city each time
  type 4, the volcano (`reference/play-volcano.png`).
- The cave (`work/cave.py`): with `$9687` = 2 and `$8032` = `$14`, the
  cave came up (city type 9) and the computer's ogre beat the lizard,
  which nobody steered, five hits to none (`reference/cave-fight.png`).
