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
state"): on the title `$B1CE` (line 0) and `$B224` (line 120), in play
`$8810` (line 0) and `$88A2` (line 192). `$B6E9` installs the first,
`$B714` ends each handler.

## Mechanics

## Data tables

## Sound

## The register census

From every instruction the recorded play ran (`codemap.json`, 10,489
bytes), with `kit/cpu/census.py` on 28 October 2026: 121 instructions
name 40 registers. To be run again once the trace has found the code the
play did not reach.

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
game's.

## The listing's error rate

## Live tests

- The easter egg on the title (`work/egg.py`): holding 1, ←, CTRL and 2
  shows THE VENUE in white at the top left and MYRTLE and DILL beside the
  monsters (`reference/title-easter-egg.png`).
- Fire on port 1 at the title (`work/p1.py`): play starts with the ogre,
  its score and bars on the right (`reference/play-village-ogre.png`).
