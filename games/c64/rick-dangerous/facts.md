# Rick Dangerous — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

This is a Bronze run: the facts below come from the sweeps and from the
few routines read around them, not from a full reading of the program.

## Build

The Firebird cassette, `Rick Dangerous (1989)(Firebird).tap` (SHA-1 in
`orientation.md`), analysed from `work/play-level1.vsf`. No build or
version string was found in memory.

## Memory layout

| Thing | Where |
|---|---|
| Start-up, the loader's hand-over | `$0810` |
| Title loop | `$087B` |
| Level set-up | `$0924` |
| Main loop | `$0A0A` |
| Losing a life | `$0AAA` |
| Hall of Fame names, column by column | `$2318`-`$2367` |
| Bullets, dynamite, lives | `$2D32`, `$2D33`, `$2D34` |
| Raster interrupt | `$3A0D` |
| Story screens' text, ASCII | `$AD00`-`$B253` |
| Screens | `$C000`, `$C400` |

## Timing

- The main loop at `$0A0A` waits until bit 0 of the frame counter `$07` is
  clear, so a step of play happens every second frame: 25 a second on
  PAL. `$07` is counted by the raster handler through `$39F3`.

## Controls

- Joystick on control port 2: fire leaves the Hall of Fame, the title and
  the story screen (*live*; `$26DA` waits for bit 4 of `$DC00`).
- The game never writes `$DC00`. The start-up makes all of port A outputs
  (`$DC02` = `$FF` at `$081A`), and the port reads `$7F` in play (*live*),
  so the main loop's reads of `$DC01` see keyboard row 7: ← in bit 1, 2 in
  bit 3, C= in bit 5. Joystick port 1 shares those lines: right is bit 3
  and down is bit 1.
- ← ends the game: `$0A95` returns from the main loop when bit 1 of
  `$DC01` is low, and GAME OVER shows (*live*, 12 October 2026). The manual
  and C64-Wiki give ↑ for this; ↑ (row 6, column 6) did nothing in play
  (*live*).

## Graphics

- One frame of play (`work/frame-play.json`) sets `$D018` = `$05` on
  raster line 66 and `$0F` on line 265; the panel at the top uses a
  different character set from the play area.
- The game never reads the sprite collision registers `$D01E` and
  `$D01F` (register census): collisions are worked out in software.

## Mechanics

- Rick has six lives, set at `$08C0` and shown as hats; `$0AE9` takes one
  away, and at zero the game is over (*live*: six hats at the start of
  level one, `$2D34` = 6).
- Bullets and dynamite go back to six at every level start and after
  every life lost: `$09F6` writes 6 to `$2D32` and `$2D33`, and `$0B27`
  returns there after a death.
- **Hall of Fame cheat.** A name entered as BBOOIINNGG (compared at
  `$2155` with the ten bytes at `$21C2`) sets `$53`. With `$53` set, the
  2 key (or joystick port 1 right) fills bullets, dynamite and lives to
  six (`$0A6D`), and C= jumps to the next level's set-up at `$0924`
  (`$0A87`). Both *live* with `$53` poked to `$FF`, 12 October 2026; the
  name itself was not typed in.
- A name entered as FLUFOMATIC (`$2146`, the ten bytes at `$21B8`) sets
  `$37`. What `$37` does is open.
- **Name filter.** `$2103` searches the entered name for any of eleven
  four-letter words in the list at `$2181` (FUCK CUNT PISS SHIT CRAP FART
  WANK BAST BOLL ARSE BROS) and replaces a name that holds one with
  SNIGGER (`$21AE`).
- **Hall of Fame prank.** At power-on, `$226A` takes the raster line
  `$D012` as a random number. When its top bit is set, it copies NOBBY or
  JEZEBEL (`$2368`) over one of the Hall of Fame names, so the table can
  differ from one boot to the next.

## Data tables

- `$2318`-`$2367`: the eight Hall of Fame names, ten letters each, stored
  column by column: byte 8 × i + n is letter i of name n. `@` is a space.
  The top name reads DANGERSTU in memory and "DANGERSIU" on screen
  (`reference/hall-of-fame.png`); why the T draws as an I is open.
- `$AD00`-`$B253`: the five story screens in ASCII, `@` as padding and
  `~` between paragraphs: SOUTH AMERICA 1945, EGYPT, SOMETIME LATER,
  EUROPE, LATER THAT WEEK, EUROPE, EVEN LATER and LONDON, MUCH, MUCH LATER.
  The last is the ending: Rick comes home, "BUT, MEANWHILE, IN SPACE, THE
  MASSED STARSHIPS OF THE BARFIAN EMPIRE ARE POISED TO INVADE THE EARTH."
- `$2763`: GAME OVER, ASCII.

## Sound

Register census: voices 1 and 2 have their frequency, pulse width and
control written at fixed addresses (`$4BDD`-`$4C3D`); voice 3's frequency,
control, attack/decay and sustain/release at `$4F5C`-`$4F6E`; the filter
cutoff at `$4BC0`/`$4BD3` and the volume at `$4998`. The start-up clears
all three voices with indexed writes at `$08F3`-`$08F9`. Envelopes for
voices 1 and 2 must come from an indexed write such as `$4990`; open.

## Register census

From the code blocks the disassembler traced (`work/census.py`), 12
October 2026. An indexed or indirect write elsewhere would not show here.

| Register | Written or read at | What for |
|---|---|---|
| `$D000`-`$D00F`, `$D010` | `$2732`-`$2747`, `$28EC`-`$2903`, `$3734`-`$37F1` | sprite positions: title, attract, play |
| `$D011` | `$08ED`, `$272D`, `$39E0`, `$3A3A` | screen on and off, raster bit 8 |
| `$D012` | `$0861`, `$3A32`; read at `$226A` | next raster line; a random number |
| `$D015` | `$0885`-`$291A` | sprites on |
| `$D016` | `$0880`, `$09A6`, `$1E92` | multicolour, scroll |
| `$D017`, `$D01D` | `$09BF`, `$09C2`, `$0F4E`, `$23B8`, `$274D` | sprite expansion |
| `$D018` | `$09A1`, `$23C0`, `$2454`, `$3A9B` | character set and screen |
| `$D019`, `$D01A` | `$39E5`, `$3A14`, `$39E8` | raster interrupt |
| `$D01C`, `$D025`, `$D026` | `$0926`-`$28E7` | sprite multicolour |
| `$D020`, `$D021`-`$D023` | `$08A3`-`$2610` | border and background colours |
| `$D027`-`$D02E` | `$1DD7`-`$37F7` | sprite colours |
| `$D400`-`$D418` | see Sound | sound |
| `$D800`+ | `$088C`-`$0990` | colour RAM |
| `$DC00` | read only | joystick port 2 |
| `$DC01` | read | keyboard row 7, joystick port 1 |
| `$DC02`, `$DC03`, `$DC0D` | `$081A`, `$081E`, `$39DA` | port directions; CIA 1 interrupts off |
| `$DD00`, `$DD02` | `$0847`-`$0854` | video bank 3 |
| `$D01E`, `$D01F` | never | collisions in software |

## The listing's error rate

Not measured: a Bronze run has no verify step.

## Live tests

All on 12 October 2026, from `work/play-level1.vsf` (`work/cheat.py`,
`work/keys.py`):

| Test | Result |
|---|---|
| `$53` = 0, joystick port 1 right for 10 frames | counters unchanged |
| `$53` = `$FF`, joystick port 1 right | bullets, dynamite, lives all 6 |
| `$53` = `$FF`, key 2 for 25 frames | all 6 |
| `$53` = 0, key 2 | unchanged |
| `$53` = `$FF`, C= | story screen EGYPT, SOMETIME LATER |
| `$53` = 0, C= | nothing |
| `$53` = 0, ← | GAME OVER |
| `$53` = 0, ↑ | nothing |
