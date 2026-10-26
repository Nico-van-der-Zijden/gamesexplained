# Into the Eagle's Nest — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay the game came with, scanned by the contributor
  (`work/inlay.jpg`), read 26 October 2026. It carries the controls, the
  briefing and the objectives, and credits "Written by: ANDREW CHALLIS &
  ROBIN CHAPMAN. Produced by: RICHARD PAUL JONES", © 1986 Pandora, on a
  Commodore 64/128 cassette. Its four screenshots are labelled "AMSTRAD
  SCREENS", so they are not this machine's.
- The Mindscape manual for the American release, 8 scanned pages with no
  text layer, also the contributor's (`work/manual.pdf`, pages pulled out
  as JPEGs by `work/pdfjpg.py`), read 26 October 2026. It is the disk
  release's book: "Documentation copyright © 1987 Mindscape, Inc.
  Software copyright © 1987 Pandora. V-Max! copyright © 1987 Harald
  Seeley." Where it disagrees with the tape in front of us, the tape
  wins, and the row says so.
- C64-Wiki, `https://www.c64-wiki.com/wiki/Into_the_Eagle's_Nest`, read
  26 October 2026. It credits the music to "Mirai", calls the alternate
  title "Castle Maze", and says the soldiers never fire back.
- The game's own screens, read in the emulator on 26 October 2026: the
  attract loop's four screens and the status panel (`reference/`).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in control port 2 steers the player: up, down, left, right | **live** | Held on `work/play-mission1.vsf` with nothing else moving: each direction moves the player's sprites 8 pixels every 4 frames (`work/controls.py`) |
| The player is drawn as four sprites in a 2×2 block | **live** | Sprites 0-3 at (120,158), (144,158), (120,179), (144,179) in the start room, and they move together |
| Fire shoots in the direction of travel | **live** | Fire alone put a bullet at (147,158), to the player's right; left and fire together put it at (112,167), at the player's left edge. The bullet is sprite 4, parked at (0,0) when there is none (`work/fire.py`) |
| A shot costs one round of ammunition | **live** | The panel's ammunition digit went from 9 to 8 on the frame the bullet appeared |
| SPACE pauses, and pauses again to resume | **live** | A tap stops the counter at `$02B4`; the next tap starts it again (`work/pause4.py`). Judge this by that counter, not by whether the player moves: the player also stands still when a wall is in the way |
| RESTORE abandons the game and restarts it | **live** | `vice_keyboard_restore` in play put the machine in the attract loop's high score screen at `$10B2` within two seconds (`work/restore.py`) |
| Four missions in a castle: rescue each of three captives, then blow the castle up | open | Manual, page 4; the inlay's objectives. "SELECT MISSION" offers 1 to 4 |
| A second castle, harder, after the first is destroyed | open | Manual, page 4: "You will enter a second castle with four new missions once you successfully destroy the first castle". C64-Wiki counts eight levels in all |
| Four floors to a castle, reached by elevator | open | The inlay: "detonating the hidden explosive on all four floors" |
| An elevator pass is needed to work the elevators | open | Manual, page 5 |
| Four detonators, one per floor, for the demolition mission | open | Manual, page 4 |
| Keys open steel doors; a key is spent on each | open | Manual, page 6: "Steel Door: Locked and impenetrable without a key" |
| Wooden doors are opened by shooting them | open | Manual, page 6 |
| Doors that were opened are locked again while the player is on another floor | open | Manual, page 6, tip 3 |
| Nazi soldiers take two shots each to kill | open | Manual, page 4 |
| The soldiers shoot back and do great damage | open | Manual, page 4. C64-Wiki says the opposite — "they never fire at the player" — so this is the row to settle in the code |
| 50 hits kill the player, and the player flashes as the limit nears | open | Manual, page 4 |
| First aid and cold food heal hits | open | Manual, page 5; the attract loop's supplies screen names both |
| Drunken officers are harmless, and worth points when shot | open | Manual, page 5; C64-Wiki calls the points for shooting sleeping officers questionable |
| Chests are shot open; shooting an open chest can destroy what is in it | open | Manual, page 5 |
| Some chests hold explosives, which are fatal when shot | open | Manual, page 5; C64-Wiki: "shooting them is fatal" |
| Art treasures (paintings, vases, pendants, gemstones) score points | open | The attract loop's valuables screen; manual, page 5 |
| Ammunition boxes hold 7 rounds each | open | Manual, page 6 |
| The player carries at most 99 rounds | open | Manual, page 6 says 99; C64-Wiki says "the maximum is 100 shots". The tape starts a mission with 59 showing, not 99 (`reference/mission1-start.png`), so the number to find is the code's |
| Captives are escorted back to the starting point, and move more slowly than the player | open | Manual, page 6: "their fatigue makes them travel more slowly than you do" |
| A dazed captive is moved on by firing a warning shot in his direction | open | Manual, page 6 |
| A high score table, "TODAYS REAL HEROES", ten entries | **live** | The attract loop shows it, filled with ten PANDORA entries from 10000 down to 1000 (`reference/attract-hiscores.png`) |
| Music or sound in the attract loop | **live** | 173 writes to `$D400`-`$D418` in three seconds of the attract loop, and none in three seconds of play with nothing pressed (`work/sidwrites.py`) |
| A sound for the player's shot | **live** | 11 writes to the sound chip in the three seconds after a shot |

## Beyond the documentation

Found in the code, not in the manual.

- The mission is chosen before play: "SELECT MISSION" with a number from
  1 to 4, stepped by pushing the stick up or down and taken with fire.
  Neither the inlay nor the manual mentions choosing one, and the manual
  says the game starts on the first mission.

## Open questions

- Which of the two is right about the soldiers shooting: the manual, or
  C64-Wiki.
- How much ammunition a mission starts with, and what the ceiling is.
- Whether the "second castle" is a second set of room data or the same
  rooms rearranged.
- Whether the attract loop's sound is a tune or a run of effects, and
  whether there is anything to credit "Mirai" with.
- Whether the game has a two-player mode. No source mentions one.
