# Rick Dangerous — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Rick Dangerous", https://www.c64-wiki.com/wiki/Rick_Dangerous, read 12 October 2026
- Wikipedia, "Rick Dangerous", https://en.wikipedia.org/wiki/Rick_Dangerous, read 12 October 2026 (covers every version; its level list and story are not checked against the C64 game)
- The manual, one sheet for every machine, MicroProse Software 1989: a scan served by RegVault at https://api.regvault.org/api/v1/game/c64/e0cb9e399fed0aecee772be39481c5ea/manual, read 12 October 2026 (the PDF holds two page images and no text; read as pictures)
- The game's own screens, observed in VICE on 12 October 2026: the tape's loading screen, the Hall of Fame, the title screen and the story screen before level one

Credits from the sources: game © Core Design Ltd (manual, loading screen);
published by Firebird (loading screen, C64-Wiki), a label of MicroProse
Software, whose copyright the manual carries; C64 programming Stuart Gregg
and music Dave Pridmore (C64-Wiki); design Simon Phipps (Wikipedia, for the
series); manual design and graphics Artistix (manual).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2 (C64-Wiki) | live | fire on port 2 leaves the Hall of Fame, the title and the story screen |
| Stick left/right walks; up jumps; up-left/up-right jumps that way (manual) | open | |
| Stick down ducks; down-left/down-right crawls (manual) | open | |
| Fire + left/right jabs with the stick, to press buttons or stun enemies (manual) | open | |
| Fire + up fires the gun the way Rick faces (manual) | open | |
| Fire + down lights and drops a stick of dynamite (manual) | open | |
| The gun holds a limited number of bullets, six to a magazine (manual; C64-Wiki gives six) | confirmed | `$2D32`, set to 6 at `$09F6` at every level start and after every life lost; six bullets in the panel at the start of level one |
| Dynamite: six sticks at the start (C64-Wiki) | confirmed | `$2D33`, set to 6 at `$09F6` with the bullets; six sticks in the panel at the start of level one |
| A killed enemy may leave a bonus that refills the bullets (manual) | open | |
| Dynamite triggers traps, blows away walls and enemies, and kills Rick if he stays near it (manual) | open | |
| The gun often triggers a trap rather than just killing (manual) | open | |
| Run/Stop toggles pause (manual, C64-Wiki) | open | |
| Up-arrow key quits to the start (manual, C64-Wiki) | differs | ← ends the game (`$0A95`, keyboard row 7 bit 1), live on 12 October 2026; ↑ did nothing in play |
| Four levels, 80 rooms, 74 traps and enemies (C64-Wiki) | open | |
| Levels: Amazon cave and the Goolu tribe, Egyptian pyramid, Schwarzendumpf castle, missile base (Wikipedia; the manual names an Aztec temple, an Egyptian tomb and an enemy fortress) | open | the story texts at `$AD00` name South America and the Goolu tribe, the pyramids of Egypt, Schwarzendumpf Castle and a secret missile base, in that order; the rooms themselves not read |
| A story screen before each level | confirmed | five texts at `$AD00`-`$B253`, four levels and the ending; level one's and level two's seen live (`reference/story-south-america.png`) |
| The first room: a boulder rolls after Rick (Wikipedia, the manual's drawing) | open | |
| Lives shown as hats in the panel | confirmed | `$2D34`, six, set at `$08C0` and taken one at a time at `$0AE9`; six hats at the start of level one |
| Hall of Fame of eight scores, 1000 to 8000 | live | `reference/hall-of-fame.png` |
| Music by Dave Pridmore (C64-Wiki; HVSC MUSICIANS/P/Pridmore_Dave/Rick_Dangerous.sid) | open | |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| A cheat: the Hall of Fame name BBOOIINNGG sets `$53`; then 2 refills bullets, dynamite and lives to six and C= skips to the next level | live | `$2155`, `$0A6D`, `$0A87`; the keys tested with `$53` poked, the name not typed |
| The Hall of Fame name FLUFOMATIC sets `$37` | open | `$2146`; what `$37` changes is not known |
| A rude name is replaced by SNIGGER | traced | `$2103`, eleven words at `$2181`; not typed in |
| At power-on, NOBBY or JEZEBEL may replace a Hall of Fame name, chosen by the raster line | traced | `$226A` |
| Joystick port 1 right and down act as the 2 and ← keys | live (right) | the keyboard row 7 shares `$DC01` with port 1 |
| Collisions are worked out in software | traced | the code never reads `$D01E` or `$D01F` |

## Open questions

- Whether points earn more lives.
- Why DANGERSTU and JELLY in the Hall of Fame table read DANGERSIU and IELLY on screen.
- What the flag `$37` set by FLUFOMATIC does.
