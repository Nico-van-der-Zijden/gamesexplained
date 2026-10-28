# Aaargh! — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Aaargh!.tap`, 352,251 bytes, from the contributor's collection (the
Ultimate Tape Archive, entry 2678). Its header reads `C64-TAPE-RAW`,
version 1. The first block on the tape is a standard KERNAL header: type 3
(a program loaded to its own address), `$02A7`-`$0304`, file name
`AARGH!` with two A's (`work/tapheader.py`). The title screen and the
cover spell the game AAARGH!, with three.

**This is not the Melbourne House release.** It is a crack by New Order,
saved with a freezer cartridge and put back on tape:

- The program that the tape's turbo loader leaves at `$0801` is a BASIC
  line, `SYS2075 TRILOGIC V3.1`: the restart routine of Trilogic's Expert
  cartridge, which saves a running machine as one packed file.
- That routine checksums its own BASIC line, unpacks memory with a
  decruncher it copies into zero page, puts back colour RAM from nibbles at
  `$0200`-`$03FF`, the video, sound and CIA registers from tables at
  `$0407`-`$047F`, then zero page, and resumes with an `RTI` built on the
  stack page (`$01E1`). The last stub (`$042F`) sets `$01` = `$36`, the
  stack pointer to `$F2`, the flags to `$21` and `$D011` to `$1B`, and
  jumps to `$B728`: the game was frozen there.
- Row 0 of the screen in the frozen image (`$C800`) reads `NEW ORDER`
  above the game's own title credits. New Order was a cracking group. The
  game's own start-up does not draw it: restarted at its entry (below),
  the title has an empty top row.

Two things follow (`kit/skills/c64/c64-reference`, "Freezer-cartridge
backups"):

- **Nothing was lost.** Compared with a power-on snapshot
  (`work/poweron.vsf`), the only runs of 64 bytes or more still holding
  VICE's power-up fill are in the KERNAL's work area, `$022D`-`$0281`,
  `$02B3`-`$02FF` and `$0334`-`$03FF`.
- **The analysis starts at the game's own entry, not at the freeze.** The
  stack the resume returns with reads, from `$01F3`, `A1 B0 0F 80 46 E1`:
  the call at `$B09F`, the call at `$800D`, then BASIC's `SYS` (`$E146`).
  The game's entry is therefore `$8009` (`SYS 32777`): `$8000`-`$8008`
  hold the text `CBM80000`, and `$8009` sets `$01` = `$36` and calls the
  start-up routines (`$AF23`, `$B728`, `$82E3`, `$82EC`, `$8065`, ...).
  Restarted there with the stack as `SYS` leaves it, the game reaches the
  call at `$B09F` again in under a second, and all of RAM then matches the
  frozen image except 170 bytes of working state (the interrupt vector,
  counters, the sprite pointers and screen at `$C800`-`$CD3F`, and the
  `NEW ORDER` text, which the start-up clears).

A second crack was compared, from the contributor's `AAARGH.D64` (one
file, `AARGH!+4  /X-RAY`, 155 blocks, loading at `$0801`): an intro by
X-Ray of The Fleet, then a trainer screen headed "NOTE: THIS GAME WAS
ALREADY FROZEN !!!" that offers unlimited energy and endless fire for both
players ("CHEAT BY X-RAY GERMANY"). With the trainer declined and the
title on the screen (`work/disk-title.vsf`), its program area
(`$0800`-`$BFFF`) differs from the tape's restarted title in 51 bytes,
and all of them but one are working state that also changes between the
tape's own states. The one is `$2C1B`, a byte of graphics that no
instruction names: `$01` on the disk and `$FC` on the tape, where the
bytes around it repeat `0F C3 FC`. So both cracks come from the same
frozen game, the tape's copy is the cleaner one, and `NEW ORDER` is not
in the disk's memory.

The Melbourne House release itself was not available to compare with, so
a change the crackers made to the code cannot be ruled out. None has been
found; anything that is found is marked as theirs.

## The emulator

VICE, own build of github.com/barryw/vice-mcp, release v3.13.2, commit
1e83aab134: `check-emulator` passed all 57 checks on 28 October 2026, so no
workaround applies.

## From power-on to play

1. VICE (`tools.py vice`) with sound on (`Sound=1` in
   `tools/vice-home/config/vice/vicerc`: with it off, `$D41B` reads the
   cycle counter). Hard reset, then autostart `work/aaargh.tap`, warp on
   for the load.
2. The KERNAL loads the header file, and its turbo loader takes the rest
   (border stripes, about two minutes of warp). Stop on the first
   instruction run in `$0100`-`$01FF` (the decruncher's first stage, at
   `$0100`, all RAM, `$01` = `$00`), then on the first in `$0400`-`$9FFF`
   or `$C000`-`$CFFF`: `$081B`, the Expert's restart. From there, stops
   at `$0490` (the chips put back), `$059E` (zero page), `$042F` (the last
   stub) and `$B728` (the frozen PC). `work/handover2.py` and
   `work/next.py` do it. Save the frozen state as `work/frozen.vsf`.
3. **The hand-over.** Load `work/frozen.vsf`, set SP = `$F6` (so that
   `$01F7`-`$01F8` hold BASIC's `$46 $E1`) and PC = `$8009`, and save
   `work/entry.vsf` (`work/restart.py save`). This is the image the
   listing is built from.
4. Run `entry.vsf`: the title comes up in about two seconds. Fire on
   joystick port 2 starts a game with the lizard in the first city, a
   village of straw huts.
5. `work/play-city1.vsf`: from `entry.vsf`, 10 s on the title, fire for
   half a second, 5 s, right for 1.5 s, 2 s; saved in play with the lizard
   walking on the village street.

## Steady state

`$01` = `$36` in play and on the title (RAM at `$A000`-`$BFFF`, the I/O
and the KERNAL in). The video chip is in bank 3 (`$C000`-`$FFFF`), with
the screen at `$C800` and the sprite pointers at `$CBF8`.

The interrupts are raster interrupts through `$0314`, chained:

| State | Handler | Its line | Chains to |
|---|---|---|---|
| title | `$B1CE` | 0 | `$B224` on line 120 (`$78`) |
| title | `$B224` | 120 | `$B1CE` on line 0 |
| play | `$8810` | 0 | `$88A2` on line 192 (`$C0`) |
| play | `$88A2` | 192 | `$8810` on line 0 |

`$B6E9` installs one (line in A, handler in X and Y), and each handler
ends by jumping to `$B714` with the next, which writes the vector and the
line, acknowledges the interrupt and returns. `$B728` waits for the frame
to start again (bit 7 of `$D011`). `$8810` places the play field's
sprites and builds their pointers; `$88A2` places the sprites of the
bottom band. A frame of play recorded with `frame.py`
(`work/frame-play.json`) has its writes on lines 0 to 6 and 192 to 196,
and the kit's drawing of it matches the emulator's picture in all
104,448 pixels.

Between the hand-over and play, 4,364 bytes change, the largest runs at
`$7919`-`$7CD8`, `$9D12`-`$9D61`, `$A2A1`-`$A3A0` and `$C00F`-`$CCAE` (the
city's screen and sprites).

The game is one load: the tape holds one frozen machine, and nothing in it
reads the tape again. Whether all twelve cities are in that one load is
checked in `features.md`.

## The loader, in a paragraph

The KERNAL loads `AARGH!`, a header of `$02A7`-`$0304` that overwrites
the vectors at `$0300` so that it runs as soon as it has loaded, and that
code reads the rest of the tape with a turbo loader of its own. The
turbo-loaded data is the Expert cartridge's packed file. Its restart
routine is the BASIC line at `$0801`, the code at `$081B` that copies a
decruncher to zero page, and the code at `$0490`-`$04FF` and
`$059E`-`$05B1` that puts the chips and zero page back and returns into the
game. None of it is the game's; it is not annotated further.

The tape's files do not map onto memory: after the 192-byte header file
(`$02A7`-`$0304`, which runs the turbo loader), the rest is the Expert's
packed file, which lands nowhere whole and is unpacked by the restart.
