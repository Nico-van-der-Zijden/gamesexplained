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
| Program and data, as the tape loads them | `$0800`-`$80FF`, `$8600`-`$86FF`, `$8C00`-`$8FE7` (the title picture's screen colours), `$A000`-`$BF3F` (its bitmap), `$D000`-`$F3FF` (`orientation.md`, "The loader") |
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

**Two modes, chosen cell by cell.** One frame of play writes the video
chip four times: `$D018` = `$1B` and `$D016` = `$C4` on line 228, then
`$D018` = `$19` and `$D016` = `$D0` on line 253 (`work/frame-play.json`).
So the play area and the panel are text from the character set at
`$2000` with multicolour on, and lines 228 to 253 are text from the set
at `$2800` with multicolour off: that band is the message line.

With multicolour on, the video chip still draws a cell in hires when the
cell's colour is below 8, and the game uses that on purpose. Every play
area cell's colour is the entry for its tile in the table at `$8600`
(all 588 cells of the recorded frame match), and the table gives 67 of
the 256 tiles a colour below 8 and the other 189 one of 8 to 15. The
walls are colour 3, so they are hires cyan on black, while the floors and
the objects are multicolour, with `$D021` black, `$D022` dark grey (`$0B`)
and `$D023` grey (`$0C`) shared and the cell's own colour less 8 as the
fourth. The panel is colour 7 almost throughout, so it is hires yellow.
The message line's two rows have colour 8 and 7 in colour RAM; with
multicolour off those are simply orange and yellow, so each big letter is
orange on its top row of cells and yellow on its bottom one.

**Sprites.** All eight are on in play (`$D015` = `$FF`), none expanded.

- 0 to 3 are the player, two across and two down, 24 pixels apart across
  and 21 down. They are multicolour (`$D01C` = `$0F`): yellow as their own
  colour, black (`$D025`) and green (`$D026`) shared. He has twelve poses
  of four shapes each. Walking, `$4BB8` takes the first shape for the
  direction from `$4BD8` (`$C0` up, `$C4` down, `$C8` left, `$CC` right)
  and adds `$10` on every other step, from bit 1 of `$02DA`. Firing,
  `$46A5` takes it from `$46A1` (`$E0`, `$E4`, `$E8`, `$EC`), and the pose
  is held until fire is let go (`$429F` clears `$02E3`). `$02B0` holds the
  direction: 1 up, 2 down, 3 left, 4 right.
- 4 is the flash at the barrel. `$46A5` gives it the shape `$F3` plus the
  direction less one and places it beside the player from the tables at
  `$46F2` and `$46F6`, orange; the interrupt counts `$46F1` down from 4,
  turns it yellow at 2 and parks it at (0,0) at 0. Until the first shot
  its pointer is `$EF`, left there by the screen clear at `$41D6`, which
  fills the whole of `$0400` to `$07FF` with `$EF`, pointers included.
- 5 to 7 are the castle drawn on the panel, hires and black, pointers
  `$F0` to `$F2`, set once at `$40D9` to `$4102`: the castle at (286,168)
  and the hill under it in two halves at (274,189) and (298,189).

**The shot itself is never drawn.** Its place is kept in `$02DB` and
`$02DC` (the second shot's in `$02DD` and `$02DE`), and every frame
`$5212` looks up the map tile there; nothing writes it to the screen or
to a sprite. Seen in the game (`work/t_shot.py`, `work/t_shot2.py`):
fired to the right, sprite 4 stayed at (160,183) for four frames, orange
for three and yellow for one, and was then parked, while the shot went on
from x 152 to x 224 and hit the wall, 8 pixels on two frames of every
three; a screenshot at the eighth frame differs from the one before the
shot only in the panel's ammunition digit and the player's pose.

## The two alphabets

The game writes text in two different ways, and neither uses the
machine's own screen codes.

**The status panel**, from the character set at `$2000`. Only the ten
letters the panel needs exist, scattered among the wall tiles. The panel's
cells are colour 7, so they are drawn hires: the set bits are yellow and
the letter is made of the clear bits, which show the black background, so
each letter is black on a yellow cell:

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

**The castle is built from blocks.** A floor is a kilobyte of
description in the RAM under the I/O area, at `$D000` plus `$400` for
each floor: 32 rows of 32 bytes, and every byte names one of the blocks
at `$7000`, which are four tiles across and four down. `$6A4B` banks
every ROM out, reads the description and expands it into a map at
`$9000` that is 128 tiles to a row and 128 rows deep, one byte a tile.
Sixteen kilobytes of map from a kilobyte of description, which is why
the map lies over the title picture at `$A000`.

Certain bytes of a description mean more than a block. `$30` to `$37`
are the four kinds of figure, two codes each, and every one found is
added to the list of figures in `$8100` to `$8500`; `$62` marks this
floor's dynamite charge, whose place is kept in `$02EA`; `$63` marks the
prisoner, whose place is kept in `$02ED`.

**The player moves a tile at a time.** `$4297` counts frames 0 to 3 in
`$02BA` and acts only on the fourth, so a step is 8 pixels every 4
frames. A move is allowed only when the four tiles the player would
cover all read below `$2D`: `$2D` or more is a wall, a door, furniture, a
figure or a pickup. At a room's edge the move asks for the next room
instead, and the picture then scrolls a row or a column at a time
(`$43D6`, `$4480`, `$4528`), carrying any shot in the air with it so a
bullet keeps its place in the room rather than on the screen.

**The player is in the map as well as in front of it.** He is drawn as
four sprites, and `$5B1B` also stamps tile `$55` over the sixteen tiles
he covers, keeps what was there in four buffers, runs the figures and the
prisoner, and puts the sixteen tiles back. The figures only test whether
the tile ahead of them is empty, so the stamp is how walking into the
player is noticed at all.

**Shots.** The player can have two in the air at once, the second once
the first has travelled 8 pixels (`$463F`); each has its own direction
and position, and each costs a round. `$463F` sets a range of five, but a
shot fired across open floor flew ten tiles to the wall (`work/t_shot.py`),
so what the five counts is open. A shot flies
through tiles `$3E`, `$3F` and anything below `$08`, and stops on
anything else; `$529B` then decides what was hit, by tile code. The
figures are `$76` to `$C0`, the chests `$5E` to `$6D`, the two halves of a
steel door `$49` and `$4A`, a wooden door `$47` and `$48`, furniture
`$4C` to `$4F`, a mirror `$43` to `$46`, and the pickups are found by
looking at the nine places listed at `$5374` in the grid around the shot,
because an object is drawn from several tiles and only its first names
it.

**Chests.** A chest is a block of four tiles, two by two, in one of four
states: closed (`$5E` to `$61`), open and empty (`$62` to `$65`), open on
jewels (`$66` to `$69`) and open on explosives (`$6A` to `$6D`). A shot
that hits any of the sixteen goes to `$5528`, which finds the chest's
corner from whichever tile was hit and reads its state there.

- **Shooting a closed chest only opens it.** `$5598` takes a number from
  the table of random numbers. Below `$C0`, three times in four, it says
  `EMPTY!` and redraws the chest open and empty. Otherwise it takes a
  second number and redraws the chest open on jewels when that is `$80` or
  more and on explosives when it is less, so one shot in eight shows
  jewels and one in eight explosives. Nothing else happens on that shot.
- **Jewels are collected by walking into them.** `$5CB9`, run every frame
  of play, looks at the two tiles ahead of the player in the direction the
  stick is pushed, and on `$66` to `$69` goes to `$5DA6`: `YOU HAVE FOUND
  SOME JEWELS.`, 40 points queued in `$02C5`, which is 4000 on the panel,
  and the chest left empty.
- **Shooting the jewels wastes them.** `$55F0` says `YOU HAVE SHOT SOME
  JEWELS.` and leaves the chest empty, with no points.
- **Explosives go off only when shot.** `$55D5` says `FOOL!....EXPLOSIVES.`,
  asks for sound 7, the only place that sound is asked for, and sets
  `$02D3` to 1, which is the explosion that ends the game. Walking into
  them does nothing: `$5CB9` looks only for jewels, and every tile from
  `$2D` up is solid.

All four were seen in the game with an open chest put into the map just
ahead of the player (`work/t_chest.py`): the messages, `$02C5` paying out
the 40, and `$02D3` reaching `$FF` a second and a half after the shot.

**The explosion** at `$5BDD` is the explosives in a chest going off, not the
castle. It walks the border and the background through the seventeen
colours at `$5C11`, eighteen steps a round and five rounds, and then sets
`$02D3` to `$FF`, which the main loop reads as the end of the game. The
eighteenth step reads the byte after the table, which is the first byte of
the tile grid at `$5C22`.

**Damage.** `$639F` is the only routine that adds to the hit count, and
its only four callers are the four branches of the figures' movement
where the tile a figure would step into holds the player's stamp. **No
figure in this game ever fires a shot**: the whole of the game's damage
is a figure walking into the player, one hit at a time. The hits are
binary-coded decimal, and `$5BC8` compares them with `$50`: at fifty the
mission is over and the player is dead.

**Scoring.** Points wait in `$02C5` and the ticker at `$5AA0` takes one a
frame, adding 1 to the score's middle pair of digits in decimal mode.
One waiting point is therefore a hundred on the panel, and nothing ever
writes the bottom pair, so every score in the game ends in two zeros. A
soldier is worth 100, a vase 1500, a painting 2500, and a pendant and a
pile of jewels 4000 each.

**Supplies.** Cold food takes `$10` off the hits and first aid clears
them altogether. A box of ammunition fills the count back towards `$99`,
and when there is no room the game says "ANY MORE AMMO WOULD BE
WASTED !". A mission starts with `$99`, that is 99 rounds.

**How a mission ends.** The main loop watches four things. `$02C8` = 2
means the player has stepped onto the lift with a pass, and `$48D4` takes
him to the floor select; `$02E9` = 1 that a prisoner has been brought
home, and `$49EC` saves the score, puts the ammunition back to 99 and
starts the next mission; `$02E9` = 2 that the castle has been destroyed,
and `$4A5C` shows the end-of-mission screen; `$02D3` = `$FF` that the
player is dead, and `$48F0` shows "YOU ARE DEAD". The last three all end
at the high score check.

**Between missions.** `$4946` puts the KERNAL's own interrupt back so
the mission screens have a keyboard, and keeps the keys, the ammunition,
the hits and the three digits of the score in `$4009` to `$400E` while
they are up. The mission chosen is 1 to 4 in `$0836`, and `$4010` is the
floor its prisoner is on - the basement for 1, the first floor for 2, the
second for 3 - or `$FF` for the demolition mission, which has no
prisoner.

**The cheat.** `$6F3B` compares the ten characters of the name last
typed on the high score screen with the word at `$6F31`, which reads
`%MAGGOTS!&`, and a match sets `$603F`. While that is set the player
takes no hits, keeps a door key in hand and has the ammunition filled
back to 99 every frame. `cheats.md` has it in full.

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

## Hardware registers

The census over every decoded instruction (`kit/cpu/census.py`, from
`symbols.json` with the code seeded from what ran) found 401 instructions
naming 70 registers. The counts are of instructions, not of writes at run
time.

What the game never names is as telling as what it hammers. **No
instruction reads `$D01E` or `$D01F`**, the video chip's sprite collision
registers, so every collision in the game is worked out in software. It
also never touches the sprite priority register `$D01B`, the light pen,
the paddles, the voices' pulse-width low bytes, or voice 3's envelope
output; it does read voice 3's oscillator output `$D41B`, at `$673D`.
Of CIA 2 only port A and its direction register are used, for the video
bank; of CIA 1, port A and B, the interrupt register and timer A's
control.

| Register | Name | How the game reaches it | First |
|---|---|---|---|
| `$0001` | `cpu_port` | `sta` ×16, `lda` ×5 | `$0B91`, `$0BCA` |
| `$D000` | `vic_sprite0_x` | `sta,x` ×1, `sta` ×2 | `$40BD`, `$410E` |
| `$D001` | `vic_sprite0_y` | `sta` ×2 | `$4123` |
| `$D002` | `vic_sprite1_x` | `sta` ×2 | `$4117` |
| `$D003` | `vic_sprite1_y` | `sta` ×2 | `$4126` |
| `$D004` | `vic_sprite2_x` | `sta` ×2 | `$4111` |
| `$D005` | `vic_sprite2_y` | `sta` ×2 | `$412C` |
| `$D006` | `vic_sprite3_x` | `sta` ×2 | `$411A` |
| `$D007` | `vic_sprite3_y` | `sta` ×2 | `$412F` |
| `$D008` | `vic_sprite4_x` | `sta` ×2 | `$46D6` |
| `$D009` | `vic_sprite4_y` | `sta` ×2 | `$46E3` |
| `$D00A` | `vic_sprite5_x` | `sta` ×1 | `$40DE` |
| `$D00B` | `vic_sprite5_y` | `sta` ×1 | `$40E3` |
| `$D00C` | `vic_sprite6_x` | `sta` ×1 | `$40E8` |
| `$D00D` | `vic_sprite6_y` | `sta` ×1 | `$40ED` |
| `$D00E` | `vic_sprite7_x` | `sta` ×1 | `$40F2` |
| `$D00F` | `vic_sprite7_y` | `sta` ×1 | `$40F7` |
| `$D010` | `vic_sprite_x_msb` | `sta` ×1 | `$40D9` |
| `$D011` | `vic_control1` | `sta` ×27 | `$08A7` |
| `$D012` | `vic_raster` | `sta` ×12, `lda` ×1 | `$0851`, `$1C92` |
| `$D015` | `vic_sprite_enable` | `sta` ×5 | `$423E` |
| `$D016` | `vic_control2` | `sta` ×16, `lda` ×2 | `$08B1`, `$0929` |
| `$D017` | `vic_sprite_expand_y` | `sta` ×1 | `$40A9` |
| `$D018` | `vic_memory` | `sta` ×15 | `$08B6` |
| `$D019` | `vic_irq_status` | `sta` ×3 | `$085C` |
| `$D01A` | `vic_irq_enable` | `sta` ×9, `lda` ×2 | `$0842`, `$0E60` |
| `$D01C` | `vic_sprite_multicolour` | `sta` ×1 | `$40C5` |
| `$D01D` | `vic_sprite_expand_x` | `sta` ×1 | `$40A6` |
| `$D020` | `vic_border` | `sta` ×8 | `$0BEF` |
| `$D021` | `vic_background0` | `sta` ×12 | `$08AC` |
| `$D022` | `vic_background1` | `sta` ×3 | `$11C0` |
| `$D023` | `vic_background2` | `sta` ×3 | `$11C5` |
| `$D025` | `vic_sprite_mc0` | `sta` ×1 | `$4260` |
| `$D026` | `vic_sprite_mc1` | `sta` ×1 | `$4265` |
| `$D027` | `vic_sprite0_colour` | `sta` ×1 | `$424D` |
| `$D028` | `vic_sprite1_colour` | `sta` ×1 | `$4250` |
| `$D029` | `vic_sprite2_colour` | `sta` ×1 | `$4253` |
| `$D02A` | `vic_sprite3_colour` | `sta` ×1 | `$4256` |
| `$D02B` | `vic_sprite4_colour` | `sta` ×3 | `$40AE` |
| `$D02C` | `vic_sprite5_colour` | `sta` ×1 | `$40FC` |
| `$D02D` | `vic_sprite6_colour` | `sta` ×1 | `$40FF` |
| `$D02E` | `vic_sprite7_colour` | `sta` ×1 | `$4102` |
| `$D400` | `sid_v1_freq_lo` | `sta,x` ×6, `sta,y` ×2, `sta` ×10 | `$15C5`, `$19CF`, `$6466` |
| `$D401` | `sid_v1_freq_hi` | `sta,y` ×2, `sta` ×12 | `$19D2`, `$6457` |
| `$D403` | `sid_v1_pulse_hi` | `sta` ×6 | `$1907` |
| `$D404` | `sid_v1_control` | `sta,y` ×2, `sta` ×35 | `$19C3`, `$4905` |
| `$D405` | `sid_v1_attack_decay` | `sta` ×10 | `$18E9` |
| `$D406` | `sid_v1_sustain_release` | `sta` ×10 | `$18F8` |
| `$D407` | `sid_v2_freq_lo` | `sta` ×1 | `$6798` |
| `$D408` | `sid_v2_freq_hi` | `sta` ×2 | `$67B1` |
| `$D40A` | `sid_v2_pulse_hi` | `sta` ×1 | `$190C` |
| `$D40B` | `sid_v2_control` | `sta` ×6 | `$4908` |
| `$D40C` | `sid_v2_attack_decay` | `sta` ×2 | `$18EE` |
| `$D40D` | `sid_v2_sustain_release` | `sta` ×2 | `$18FD` |
| `$D40E` | `sid_v3_freq_lo` | `sta` ×8 | `$6495` |
| `$D40F` | `sid_v3_freq_hi` | `sta` ×10 | `$649A` |
| `$D411` | `sid_v3_pulse_hi` | `sta` ×1 | `$1911` |
| `$D412` | `sid_v3_control` | `sta` ×11 | `$490B` |
| `$D413` | `sid_v3_attack_decay` | `sta` ×3 | `$18F3` |
| `$D414` | `sid_v3_sustain_release` | `sta` ×3 | `$1902` |
| `$D416` | `sid_filter_cutoff_hi` | `sta` ×1 | `$63DA` |
| `$D417` | `sid_filter_resonance` | `sta` ×1 | `$63DF` |
| `$D418` | `sid_filter_mode_volume` | `sta` ×3 | `$192C` |
| `$D41B` | `sid_v3_oscillator` | `lda` ×2 | `$673D` |
| `$DC00` | `cia1_port_a` | `lda` ×27, `sta` ×1 | `$0A13`, `$5FCD` |
| `$DC01` | `cia1_port_b` | `lda` ×1 | `$5FD0` |
| `$DC0D` | `cia1_interrupt` | `lda` ×1 | `$15B0` |
| `$DC0E` | `cia1_control_a` | `sta` ×9 | `$083D` |
| `$DD00` | `cia2_port_a` | `lda` ×7, `sta` ×7 | `$08C1`, `$08C6` |
| `$DD02` | `cia2_ddr_a` | `lda` ×7, `sta` ×7 | `$08B9`, `$08BE` |

Registers an indexed access could still reach, which the table above
does not list because no instruction names them outright: `$D013`-`$D014`,
`$D01B`, `$D01E`-`$D01F`, `$D024`, `$D402`, `$D409`, `$D410`, `$D415`,
`$D419`-`$D41A` and `$D41C`.

## Sound

The attract loop writes the sound chip about 58 times a second (173
writes in three seconds); play with nothing pressed writes it not at all,
and a shot produced 11 writes (*live*, `work/sidwrites.py`).

## The listing's error rate

A sample of 60 of the listing's 659 comments was drawn at random with
seed 20261026 (`work/verify/sample.json`) and given to a checker that
wrote none of them, on claude-opus-5. The checker marked 3 wrong and 10
wrong in a detail, and every one of the 13 was read against the code
again here and held: 13 of 60, which is 21.7 % and well over the mark of
2 in 60. All 13 were corrected, and so was every other comment that said
the same thing: the two hand-overs the main loop makes, which were
swapped, carried the same mistake in four comments, and the chests that
were taken for soldiers in three. The run recommends a full audit of the
listing, which it did not do.

What the checker found, in kind: two routines described as each other's
job (the lift and the prisoner brought home); a range of tile codes taken
for soldiers when it is the chests; counts off by a few (ten steps of a
scroll, not thirteen; eighteen steps of the explosion, not seventeen;
forty cells of a colour band when two of the four are four hundred); a
test read the wrong way round (a counter that runs while fire is *not*
held); and a set of tiles described as one per direction when they are
the four rows of one block.

The rate is the checker's, and a checker misses some, so 21.7 % is a
lower bound on what a full audit would find.

After the sample, 21 more comments were corrected on claude-opus-5-5
when the contributor questioned the chest odds and the chests, the shot
and the tape were checked in the game running and against the tape image:
the chests' contents and what a shot does to them (five), the explosion
taken for a crate of dynamite (five), the charge taken for the lift, a
figure's distance given in blocks instead of tiles, the ammunition box
taken for an open chest, the flash at the barrel taken for the bullet
(seven), and the title picture's screen colours at
`$8C00` taken for spare tiles. Five of the 21 were among the sample's 60.
The checker passed two of them, `$46A5` and `$46F1`, which call the flash
the bullet, so at least 15 of the 60 were wrong, 25 %, and 21.7 % above
is the checker's count. It marked the other three (`$5528`, `$5BBA` and
`$5CB9`) wrong for another detail, and the corrections made then left
these mistakes in them.

## Live tests

- Controls, one at a time, from the play snapshot (`work/controls.py`,
  `work/fire.py`): each direction moves the player 8 pixels every 4
  frames, and fire puts the flash sprite at the player's barrel and spends a
  round.
- SPACE pauses and resumes, judged by the counter at `$02B4`
  (`work/pause4.py`), and the paused game shows "...PAUSING..." on the
  message line (`work/t_hits.py`).
- RESTORE returns to the attract loop (`work/restore.py`).
- The mission select's digit counts the other way from the mission the
  game keeps: stepping it to 1 left `$0836` at 4 and the briefing read
  "MISSION 1 / BLOW UP THE CASTLE" (`work/t_mission2.py`).
- Chests (`work/t_chest.py`): with an open chest put into the map just
  ahead of the player, walking into jewels said "YOU HAVE FOUND SOME
  JEWELS." and `$02C5` paid out 40; shooting jewels said "YOU HAVE SHOT
  SOME JEWELS." and paid nothing; shooting explosives said
  "FOOL!....EXPLOSIVES." and `$02D3` reached `$FF` a second and a half
  later; walking into explosives did nothing.
- A shot is not drawn (`work/t_shot.py`, `work/t_shot2.py`): see
  Graphics, "The shot itself is never drawn".
- The loader, stopped part way through the tape (`work/loadpeek.py`,
  `work/loading.vsf`): the processor in the `$02E8` loop, `$FFFE` pointing
  at `$0100`, and the block header at `$FA` to `$FE` reading `$B6B2`,
  `$16B3` bytes to go and flag 1, which ends at `$A000`: the title picture,
  loading from its top end down.
- The hits kill at fifty: poked to `$49` the game played on, poked to
  `$50` it set `$02D3` to `$FF`, which the main loop reads as the end
  (`work/t_death.py`).
- The ammunition starts at 99: `$02BD` reads `$99` and the panel's two
  cells both hold `$F9` (`work/t_ammo.py`).
- The cheat word turns the cheat on: with `%MAGGOTS!&` in the name
  buffer at `$081F` a mission starts with `$603F` = 1 and a key in hand,
  and without it `$603F` is 0 and there is no key (`work/cheattest.py`).
- Nothing but a figure's step hurts the player: with a counting
  checkpoint on `$639F` and a control on the interrupt, 170 seconds of
  play and of standing still left `$639F` unrun and the hits at zero
  while the control counted 12,078 interrupts (`work/t_hits.py`,
  `work/t_contact.py`). The references search over every opcode and index
  confirms that the only writes to the hit count are the mission's
  restore, cold food, first aid and `$639F` itself.
- Nothing executes in `$0100`-`$03FF` during 40 seconds of play, so the
  game is one load (`work/noload.py`).
- One frame of play redrawn from memory matches the emulator's own
  picture, 104,448 pixels of 104,448 (`kit/c64/frame.py compare`).

Tried and not settled: the end of the demolition mission. Arming all four
charges and standing the player on the run of `$E4` tiles that `$5F27`
tests for did not make the check fire (`work/t_explode3.py`), so what
that tile is on the screen is open; the path through the code is traced
but not observed.
