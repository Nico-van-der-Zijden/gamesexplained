# Lemmings — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The analysed image is the Psygnosis disk release: five D64 files, sides of
three disks, from an archive by Mark Knibbs dated 1997 whose notes copy the
printing on the disks ("© PSYGNOSIS 1994 · COMMODORE C64 · DISK 1 · LOAD
"LEMMINGS",8,1"). Each file is a plain sector image (174,848 bytes, no
error bytes); `kit/c64/disk.py` read every sector of each with no bad
checksum.

| File | Disk | SHA-1 |
|---|---|---|
| `Disk 1 - LEMMINGS.d64` | 1, boot disk, id `PS` | `a63e3d23f82dc3b9652306b640c67aeb1f096d32` |
| `Disk 2 Side A - FUN.d64` | 2 side A, the Fun levels | `80f2b50737170da7c0cf41c8732cc35a7be28770` |
| `Disk 2 Side B - TRICKY.d64` | 2 side B, the Tricky levels | `b7949a1c3852ec79d26139637f152e58b859986d` |
| `Disk 3 Side A - TAXING.d64` | 3 side A, the Taxing levels | `698f1f378dabc9392208e1e133a3b6c2818c217b` |
| `Disk 3 Side B - MAYHEM.d64` | 3 side B, the Mayhem levels | `bc36a0cd999c5191b571ea10f52370caeaceaea1` |

Disk 1 holds `LEMMINGS` and `THE SHORTCUT` (both load at `$0326`, 6,897
and 6,900 bytes), then `ID`, `IE`, `IA`, `IB`, `CC`, `CB`, `CA`, `PA`,
`PB` and `IC`, and four `DEL` entries that spell "(C) 1994 BY PSYGNOSIS".
Each level side holds 25 level files named by its rating's letter (`FA`
to `FY`, `TA` to `TY`, `XA` to `XY`, `MA` to `MY`) and the same nine small
files `SA` to `SI`.

The same archive carries `Disk 1 - LEMMINGS patched.d64`, which differs
from the original in two bytes (offsets 144,234 and 144,235) and, by the
archive's notes, skips the code sheet. It is a crack and was not used.

The contributor also has the cassette release, six TAP files (C64-TAPE-RAW
version 1): `lemmings.tap` (SHA-1 `196cfde618e7b64f546b5057da9710392f324af4`)
and `lemmings0.tap` to `lemmings4.tap`. The first boots to the same code
sheet and title menu, but starting a game asks for "tape 2 side A", and
none of the other five files got past a FILE ERROR in VICE (what was tried
is in `agent-history.md`). The run uses the disks.

## From power-on to play

1. Power-cycle (`reset(rpc, "hard")` in `kit/c64/vice.py`) and autostart
   `Disk 1 - LEMMINGS.d64`; VICE loads the first file, `LEMMINGS`. With
   warp on, the code sheet was up 40 seconds later on 19 October 2026.
2. Two intro pictures pass during the load: a balloon over mountains
   (`reference/intro-balloon.png`) and lemmings on a hill
   (`reference/intro-hill.png`).
3. The code sheet asks for "the 6th number on the page featuring the
   lemming" (`reference/code-sheet.png`; which number and which page
   change from boot to boot). It wants a five-digit decimal number, which
   is the 16-bit word at `$A092`, low byte first, while the prompt is up.
   Type it and RETURN (`work/dboot.py` reads and types it). The boot on
   19 October 2026 wanted 23222.
4. The title menu follows (`reference/title.png`). Press 1 (1 Player).
   The screen asks for disk 2 side A (`reference/insert-disk-2a.png`).
   Attach `Disk 2 Side A - FUN.d64` to drive 8 and press fire on port 2.
5. Level 1's briefing appears ("Level 1 Just dig!",
   `reference/briefing-fun1.png`). Fire starts play
   (`reference/play-fun1.png`).

Snapshots, saved without ROMs, in each part's `work/`:

- `parts/menu/work/entry.vsf`: stopped on `$9150`, the menu's first
  instruction, by an execute checkpoint on `$9000`-`$A2FF` armed from
  power-on (`work/menuentry.py`).
- `parts/menu/work/code-sheet.vsf`, `title.vsf`: the code sheet and the
  title menu.
- `parts/game/work/prompt-disk2.vsf`: stopped on `$5006`, the first
  instruction run in `$3600`-`$8FFF` after pressing 1, called by the loader
  at `$CDD6` on a failed load. Only `$5000`-`$5FFF` of the game's load is in
  by then.
- `parts/game/work/entry.vsf`: level 1's briefing screen, all loading done.
  It was saved on the screen rather than stopped on one instruction. It
  differs from play only in the screen buffers at `$4000`-`$47FF` and
  `$6000`-`$6FFF`, the pages `$5000`, `$5800` and `$7E00`-`$7FFF`, and
  variables. The disassembler and the listing are built from it.
- `parts/game/work/play-fun1.vsf`: thirty seconds into level 1, ten
  lemmings walking.

The emulator was an own build of github.com/barryw/vice-mcp, release
v3.13.2, commit 1e83aab134, PAL, which passed all 57 of `check-emulator`'s
checks on 19 October 2026. None failed.

## The parts

| Part | Folder | What it is | Route |
|---|---|---|---|
| 1 | `parts/menu` | the intro, the code sheet and the title menu: `$3600`-`$B3FF` and `$E000`-`$F9FF` while the title runs | steps 1-4 above |
| 2 | `parts/game` | everything else, and those ranges as play has them: the level briefing, play and the end-of-level screens | steps 4-5 above |

The title and play agree byte for byte at `$0700`-`$35FF`, `$B400`-`$DFFF`
and `$FA00`-`$FFFF`, so that code is in memory from the boot on: the play
engine (its interrupt at `$09C7` and main loop at `$0E5C`) and the loader at
`$CC00`. The menu's ranges come from that page-by-page comparison, not from
watching its load; the listing reports six code bytes of the game part, in
zero page, that differ at the menu's hand-over. Each level file is loaded
into the game part's memory per level, and is data, not a part.

| File | Load address | Size | Lands |
|---|---|---|---|
| `LEMMINGS` | `$0326` | 6,895 | 3,778 bytes equal at `$C54A` in the menu's hand-over: the loader. The rest is not found |
| `THE SHORTCUT` | `$0326` | 6,898 | the same place, 3,777 bytes equal; what it does differently is open |
| `IA` `IB` `IC` `ID` `IE` `CA` `CB` `CC` `PA` `PB` | various | 888 to 43,783 | found nowhere: every one is packed |
| `FA`-`FY`, `SA`-`SI` (disk 2A) | `$E102`-`$E4D9`, `$3778`-`$3794` | 806 to 7,493 | found nowhere: packed |

Searched in 16-byte pieces (`work/filemap.py`) in both parts' hand-overs and
in play. Unpacking the files to map them is open.

## Steady state

In play `$01` reads `$35`: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`, I/O
at `$D000`. The game owns the hardware vectors: NMI `$FFFA` = `$0B56` (an
`RTI`, so RESTORE does nothing), IRQ `$FFFE` = `$09C7`. CIA 2 selects video
bank 1 (`$4000`-`$7FFF`).

One frame of play, recorded with `kit/c64/frame.py capture`
(`parts/game/work/frame-play.json`), shows the play area drawn with
sprites. Eight sprites in two groups of four (0-3 and 4-7) leapfrog down
the screen: every 21 lines one group's Y positions move below the other's
and its pointers at `$43F8`-`$43FB` or `$43FC`-`$43FF` advance. At line 218
`$D018` changes from `$05` to `$0D` for the skill panel, whose sprites are
set from line 220; at line 300 the frame's first rows are set up again.

During the title, `$01` reads `$3E` and the KERNAL's vector at `$0314`
points at `$9273`.

## The loader, in a paragraph

`LEMMINGS` loads at `$0326`, over the KERNAL's vectors, so the load starts
it. It puts a loader at `$CC00`, whose jump table at `$CC20` the game calls
by number. The routine at `$CD96` takes a code byte from a table at `$0400`:
its low five bits are the file name's second letter, and its top three bits
pick the first letter (F, T, X, M, P, I, C or S, from `$CDDE`) and the disk
side the file is on (`$CDE6`). When that side is not the one the loader
last asked for (`$CB60`), it calls the game's disk prompt at `$5009`; when
the load fails, it calls `$5006` and tries again. The unpacker reads an
eight-byte header at `$9000` (`$CC3B`). The KERNAL's own SETNAM is called
only during the first seconds of the boot. Not annotated further, by
policy.
