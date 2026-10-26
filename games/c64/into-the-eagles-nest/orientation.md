# Into the Eagle's Nest — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Into_the_Eagles_Nest.tap`, 472,663 bytes, SHA-1
`a109f574918f004f786559456e07334188fa9856`. The header reads
`C64-TAPE-RAW`, version 1: a raw recording of the cassette's pulses. The
file came from the contributor's copy of the Ultimate Tape Archive, in a
folder named for the 1987 Pandora release.

It is an original tape, not a crack. No intro, trainer or menu appears.
The title picture credits "WRITTEN BY ANDREW CHALLIS. GRAPHICS BY ROBIN
CHAPMAN." and carries the Pandora logo
(`reference/title.png`), and the loading screen reads "NOW LOADING
EAGLES NEST".

The tape's own blocks were not decoded, so which block holds what is
open. What the load leaves in memory is measured instead, below.

## From power-on to play

1. Power-cycle the emulator (`reset(rpc, "hard")` in `kit/c64/vice.py`)
   and autostart the TAP with `autostart()`. VICE presses PLAY and types
   the load.
2. The KERNAL's `FOUND` message appears, then the game's own loading
   screen: a border-striped picture of the castle with "NOW LOADING
   EAGLES NEST" in a box, and "PLEASE WAIT" below. The title picture
   replaces it a few seconds later and stays up, with loading stripes in
   the border, while the rest of the tape is read.
3. Turn warp on (`warp(rpc, True)`) once the load has been typed, or the
   tape plays at real speed. With warp on from ten seconds after the
   autostart, the game's own code first ran 220 seconds later on
   26 October 2026. At real speed the title picture alone took about 50
   seconds.
4. The game starts in its attract loop, which shows four screens for
   about six seconds each: the credits, the high score table "TODAYS REAL
   HEROES" (ten PANDORA entries, 10000 down to 1000), the supplies the
   player can pick up, and the valuables to be stolen
   (`reference/`). Turn warp off here.
5. Fire on control port 2 (held half a second) leaves the attract loop
   for "SELECT MISSION", with a number under it. Pushing the stick down
   steps the number down, up steps it up; it runs 1 to 4. Fire starts
   the chosen mission. A press shorter than about a tenth of a second is
   missed.
6. Mission 1 starts at once, with the player in the room at the
   bottom-left of the castle and the status panel on the right reading
   KEYS 00, AMMO 59, HITS 00 and a score of 000000
   (`reference/mission1-start.png`).
7. Snapshots in `work/`, all saved without ROMs:
   - `entry.vsf`: the hand-over, stopped on `$1014`, the game's first
     instruction, by an execute checkpoint on `$0E00`-`$CFFF` armed ten
     seconds after the autostart. `work/handover.py` does it all, from
     power-on. The disassembler and the listing are built from this one.
   - `play-mission1.vsf`: mission 1, a few seconds in, nothing moving in
     the room but the two guards.
   - `poweron.vsf`: a machine power-cycled with nothing loaded. It is not
     the game; it is the reference that tells bytes the load wrote from
     untouched RAM (`work/loaded.py`).

The emulator was an own build of github.com/barryw/vice-mcp, release
v3.13.2, commit 1e83aab134, PAL, which passed all 57 of `check-emulator`'s
checks on 26 October 2026. None failed.

## Steady state

The game is one load. Nothing executed in the loader's pages
`$0100`-`$03FF` during 40 seconds of play, with a stopping checkpoint
over them (`work/noload.py`), and the four missions are all chosen from
the same image.

What the load wrote, measured against `poweron.vsf` (41,627 bytes in
all):

| Range | Bytes | What it holds |
|---|---|---|
| `$0008`-`$0202`, `$0286`-`$0517`, `$0590`-`$05B7` | 1,205 | zero page, the loader and its work space |
| `$0806`-`$80FF` | 30,970 | the program |
| `$8600`-`$86FF` | 256 | |
| `$8C00`-`$8FE6` | 999 | |
| `$A000`-`$BF3D` | 7,998 | the title picture's bitmap, which the game overwrites with its own tables once it runs |
| `$D000`-`$F3FF` | 9,216 | data under the I/O area and the KERNAL |
| `$FFFE`-`$FFFF` | 2 | |

Everything else is untouched RAM at the hand-over: `$8100`-`$85FF`,
`$8700`-`$8BFF`, `$8FE7`-`$9FFF` and `$C000`-`$CFFF` are filled in by the
game as it runs.

`$01` reads `$26` in play: RAM at `$A000`-`$BFFF`, I/O at `$D000` and the
KERNAL in at `$E000`. It reads `$27` at the hand-over, with BASIC still
in. The game keeps the KERNAL's interrupt path: `$FFFE` is the KERNAL's
`$FF48`, and the game's handler is in `$0314`, at `$4AA7`. `$0318` holds
the KERNAL's own NMI handler, `$FE47`. A `CBM80` signature sits at
`$8004`, with cold start `$8000` = `$8010` and warm start `$8002` =
`$8031`, so a reset or RESTORE restarts the game rather than dropping to
BASIC.

CIA 2 selects video bank 0, `$0000`-`$3FFF`. `$D018` = `$19` puts the
screen at `$0400` and the character set at `$2000`, and `$D016` = `$D0`
is multicolour text mode. All eight sprites are enabled (`$D015` =
`$FF`), and a raster interrupt is armed (`$D01A` bit 0).

One frame of play, recorded with `kit/c64/frame.py capture`
(`work/frame-play.json`), has four writes and no write to an interrupt
vector, so the chain is the one handler at `$4AA7`: `$D018` = `$1B` and
`$D016` = `$C4` on line 228, then `$D018` = `$19` and `$D016` = `$D0` on
line 253. The band between them uses the character set at `$2800` without
multicolour.

## The loader, in a paragraph

The tape's first block is loaded by the KERNAL in the ordinary way, and
from then on the game reads its own tape. The code that does it sits in
`$0286`-`$0517` and on the stack page: sampled during the load, the
processor was almost always in a `JMP $02E8` loop at `$02E8`, and
occasionally in `$0100`-`$018F`, which is where the reading is done.
`$02EB` onwards, which the spin loop sits in front of, sets `$01` to
`$37`, clears the border colour and reads `$DC0D`. The loading screen and
then the title picture are shown while the rest of the tape is read, so
the picture at `$A000` is loaded before the program that overwrites it.
The loader's last act is to enter the game at `$1014`. It is not
annotated further, by policy.
