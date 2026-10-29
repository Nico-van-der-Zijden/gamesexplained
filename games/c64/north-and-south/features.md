# North & South — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The manual, `Instructions.pdf` in the contributor's archive folder
  (27 scanned pages; English on pages 3 to 16), read 29 October 2026.
- C64-Wiki (German), https://www.c64-wiki.de/wiki/North_%26_South, read
  29 October 2026: credits, release, and a list of differences from the
  Amiga original.
- Wikipedia, https://en.wikipedia.org/wiki/North_%26_South_(video_game),
  read 29 October 2026: the original's release (Amiga and Atari ST,
  September 1989), the writers, Jeroen Tel for the C64's music.
- The English C64-Wiki has no page for the game (404 on 29 October 2026);
  Lemon64 and MobyGames refused the fetch (HTTP 403).

## Features

The part each feature lives in is the tape side the game loads it from:
**main** (tape 1 side 1: the menu), **map** (tape 1 side 2: the strategic
map), **battle** (tape 2 side 1), **fort** (tape 2 side 2).

| Feature | Status | Where |
|---|---|---|
| Menu: one or two players, by clicking the flag behind each side's character; a computer appears when the computer plays that side, and both can be computers | live | main: menu.vsf, menu-1864-cc.vsf |
| Menu: difficulty by clicking the character's head (corporal hardest, sergeant, captain easiest; Union Blutch, Chesterfield, Stark; Confederacy Mathias, Cancrelat, Philip) | open | main |
| Menu: start year 1861 to 1864 by clicking the calendar; each year has its own armies and territories | live (the calendar steps 1861 to 1864; the map shows each year's text) | main, map |
| Menu: three disasters to turn on: Indians (with the Mexican), storms, European reinforcements | open | main, map |
| Menu: arcade or strategic mode; in strategic mode a battle, a train or a fort is decided by chance weighted by the two sides' strength | open | main, map |
| Menu: keyboard or joystick for one player against the computer, by clicking the joystick panel; the panel goes when no person plays | live (the panel goes) | main |
| Menu: GO starts with the defaults: captain level, Stark against a computer corporal, 1861, no disasters, North first | live | main |
| Cursor on the map moved by joystick or P L Z X; space or fire clicks | live (joystick, space) | map |
| H pauses; the Commodore key ends the computer's control (computer against computer) | open | map |
| Turns: each player moves some or all armies to a neighbouring territory; clicking the month and year band ends the turn | open | map |
| Moving: the territories an army may enter flash; clicking a territory that does not flash cancels the move | live | map |
| Conquering a territory: six cases (unowned; enemy's and empty; enemy army: battle; own; town with enemy army: battle then fort; town without army: fort) | open | map |
| Fusing armies, up to 18 infantry, 9 cavalry and 3 cannon | open | map |
| Attacking with several armies at once | open | map |
| Retreat: E (joystick or keyboard player 1) or the quote key (joystick 2 player); the retreating army loses a cannon | open | battle |
| Supply: gold for each territory owned, if two of the player's towns are joined by a railway through the player's own territory; the train carries it to the bank | open | map |
| A new army (6 infantry, 3 cavalry, 1 cannon) for five bags of gold, placed on a flashing territory on the player's own railway | open | map |
| Taking the enemy's taxes: cutting the railway between two enemy towns; once only the enemy train tries to get through, and that is the train sequence | open | map, fort? |
| Indians attack armies in neighbouring territories after smoke signals; the Mexican bombs Texas | open | map |
| A storm cloud travels above the map; an army under it cannot move | open | map |
| European reinforcements: whoever owns South Virginia gets a ship with 1 cannon, 3 cavalry, 6 infantry | open | map |
| Surrounding: enemy territories with no army and no town, surrounded by the player's armies, change sides | open | map |
| The army's soldier on the map has more or fewer cannon balls at its feet by the size of the army | open | map |
| Battle: each player picks the unit to move or fire (player 1 RUN/STOP, player 2 F5); the unit's symbol shows top left (Union) or top right (Confederacy) | open | battle |
| Battle: artillery moves only up and down; holding fire fills a gauge for the range; nine cannon balls, then it leaves the field | open | battle |
| Battle: cavalry starts facing the enemy, cannot move back; fire charges, further presses slash; reaching the far edge it goes round and back; turning against the charge changes formation | open | battle |
| Battle: infantry move in any direction; first press takes the firing position, further presses fire; turning against the march changes formation | open | battle |
| Battle field: a river with a bridge (the cannon can destroy bridges, says Wikipedia), houses | live (battle-play.vsf) | battle |
| Train: climb onto the passing wagons (P or up), move along the roof (Z X or left right), jump wagon to wagon (P or up); knives (limited by difficulty) or punches in hand to hand combat; reach the locomotive before the clock, shown by a boot; pushed off, climb back before the train leaves | open | fort? |
| Train, two players: the defender sends men onto the roof (up or down) and fires | open | fort? |
| Fort: run through the fort to the enemy flag at its far end before the clock; ladders, guard dogs, boxes of explosives that stun | open | fort |
| Fort, two players: the defender brings soldiers in at ground level (down) or on the ramparts (up) | open | fort |
| Winning: eliminating all the enemy's armies | open | map |
| Year texts between turns ("The Southern States have opened hostilities by taking Fort Sumter...") | live | map |
| C64-Wiki: no language choice or national anthems on the C64; Indian and Mexican attacks scripted rather than random; the train takes about twice as long a trip; no bodies or cannon wrecks left on the field | open | map, battle |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions

- Which side holds the train sequence: the manual names three arcade
  sequences and the tapes have two arcade sides.
