# Lemmings — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`: the menu
part's at `parts/menu/work/entry.vsf`, the game part's at
`parts/game/work/entry.vsf` (the level 1 briefing).

## Build

The Psygnosis disk release, three disks (`orientation.md`). No version
string was found. The title scroller says "Copyright 1993 Psygnosis"; the
disks are printed 1994.

## Memory layout

| Thing | Where |
|---|---|
| Play engine: the play interrupt, the main loop, input, sound | `$0700`-`$35FF`, the same at the title and in play |
| Loader and unpacker | `$CC00`-`$CFFF`, jump table at `$CC20` |
| Briefing and end-of-level texts, as templates | from `$D535`, in the RAM under the I/O chips |
| The same texts, filled in for the level | from `$5444`, in play |
| Menu: intro, code sheet, title | `$3600`-`$B3FF` and `$E000`-`$F9FF` while the title runs (menu part) |
| Menu entry | `$9150` |
| Screen in play | `$4000`, video bank 1; sprite pointers `$43F8`-`$43FF` |

## Timing

The main loop of play at `$0E5F` waits for bit 7 of `$0400`, which marks
a new frame, and clears it after its pass (`$0E6F`). *Live:* the frame at
`parts/game/work/frame-play.json` is split by raster interrupts every 21
lines down the play area.

## Controls

The code sheet reads keys with the KERNAL's GETIN (`$A135`): RETURN checks
the code, DEL takes back a digit, 0 to 9 adds one, five at most
(`$A128`-`$A169`, menu part).

| Register | Part | What reads it |
|---|---|---|
| `$DC00`, `$DC01`, `$DC02`, `$DC03` | game | a keyboard scan from `$0A5A` (it sets both data directions, `$0A68` and `$0A6D`); `$DC00` is also read at `$0B3C` and `$17C1`, which of them is the joystick is open |
| `$D419`, `$D41A` | game | `$1704`, `$1718`: the paddle registers, where a 1351 mouse reports its movement |
| `$DC00`, `$D419`, `$D41A` | menu | `$A27B`-`$A287` |

## Graphics

*Live*, from one recorded frame of level 1: the play area is drawn with
eight sprites in two groups of four. Every 21 lines one group's Y
positions (`$D001`-`$D007` or `$D009`-`$D00F`) move below the other's and
its pointers advance by one. At line 218 `$D018` changes from `$05` to
`$0D`, and from line 220 the sprites are set for the skill panel. CIA 2
selects video bank 1.

## Mechanics

None traced yet.

## Data tables

| Table | Where | Contents |
|---|---|---|
| Decimal weights for the code sheet | `$A095` (low bytes), `$A09A` (high bytes), menu part | 1, 10, 100, 1000, 10000 |
| File kinds | `$CDDE`, game part | the first letters of file names: F, T, X, M, P, I, C, S |
| Disk side of each kind | `$CDE6`, game part | 2, 3, 4, 5, 0, 0, 0, `$FF` |
| Rating names | `$9D64`, menu part | FUN, TRICKY, TAXING, MAYHEM, padded to six characters |

## The code sheet

The menu part's code sheet turns the five typed digits at `$9E9F` into a
16-bit number at `$A090` (`$A0A0`): each digit is added that many times
times its decimal weight. `$A1AC` compares it with the word at `$A092` and
returns A = 0 when they match, `$80` otherwise. *Live:* typing the value
found at `$A092` passed the code sheet on every boot tried; it was 16966,
44608 and 23222 on three boots, so the question changes from boot to boot.
Where `$A092` is set is open.

## Register census

From `kit/cpu/census.py` on each part's hand-over, over the code the
disassembler had traced on 19 October 2026: what is not yet traced as
code is not in it.

Game part, 46 instructions name 37 registers:

| Register | Instructions | First at | What for |
|---|---|---|---|
| `$D000`, `$D001`, `$D010` | `sta,y`, `sta` | `$0BBC`, `$0B9E`, `$0BD9` | sprite positions |
| `$D012`, `$D019` | `sta` | `$09AA`, `$09BB` | the next raster interrupt's line, and its acknowledgement |
| `$D015`, `$D016`, `$D017`, `$D018`, `$D01B`, `$D01C`, `$D01D` | `sta` | `$0F81`, `$0F44`, `$0B75`, `$0F77`, `$0F87`, `$0F84`, `$0B78` | sprite and screen set-up |
| `$D021`, `$D022`, `$D023`, `$D025`, `$D026`, `$D027` | `sta` | `$0F97` onwards | colours |
| `$D400`-`$D406`, `$D40B`, `$D412`, `$D416`, `$D418` | `sta,y`, `sta` | `$30E5`-`$3156` | sound: voice 1 by index, the other voices' control, the filter and volume |
| `$D419`, `$D41A` | `lda` | `$1704`, `$1718` | mouse |
| `$DC00`-`$DC03` | `sta`, `lda`, `stx`, `ldx`, `sty` | `$0A5A`-`$17C1` | keyboard and joystick |
| `$DC0D` | `lda` | `$09BE` | acknowledges CIA 1's interrupt |
| `$DD00` | `sta` | `$0F7C` | video bank |

Menu part, 39 instructions name 22 registers: `$0001` (`$9158`), the
video chip's registers (`$D000`-`$D021` from `$9152`, `$94B3`-`$94CA` and
`$A1E7`-`$A20A`), `$D419` and `$D41A` (`$A284`), `$DC00` (`$A27B`),
`$DC0E` (`$916B`) and `$DD00` (`$94B3`). No SID register is named by the
menu's traced code: the title music's driver is open.

## Strings

The game's text is in screen codes of the lower-case character set:
codes 1 to 26 are lower-case letters and `$41` to `$5A` capitals.
A sweep for runs of upper-case screen codes misses the first letter of
each word that starts with a capital.

| Where | Part | Text |
|---|---|---|
| `$5A49` | menu | the title scroller: credits, a greeting list, hints, a disclaimer |
| `$9DF5` | menu | "Enter the access code", "Incorrect Code", "Code for Level", "Rating" |
| `$9E55` | menu | "Please enter the xxxx number on the page featuring the lemming", "Incorrect code !", "Check your manual and try again !" |
| `$A184` | menu | "HACKING AT THE END OF THE LEMNIVERSE", in PETSCII capitals |
| `$D535` | game | the briefing's lines and the end-of-level messages, from "Your time is up!" (`$D7B3`) to "You may consider yourself an ... player!" (`$DB3D`), with "Your access code for level XX" at `$DA59` and "Please insert disk 1 side" at `$DA94` |

## Sound

The game part writes the SID from `$30E5`-`$3156`. Nothing more is known.

## The listing's error rate

Not measured: a Bronze run takes no sample.

## Live tests

| Test | Result |
|---|---|
| The code sheet, answered from `$A092` | accepted on every boot tried, on tape and on disk |
| 1 at the title menu | the prompt for disk 2 side A |
| Fire at the briefing | play starts, ten lemmings walk out |
