# Aaargh! — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| End the city now | `POKE 32818,20` (`$8032` = `$14`: the count to the end of the city, which the main loop ends the city at) | live (`work/rounds.py`): the next city comes up |
| The fight in the cave now | `POKE 38535,2` then `POKE 32818,20` (`$9687` = 2, the egg taken) | live (`work/cave.py`): the cave comes up and the monsters fight |
| A second player joins | fire on the other joystick port during a game | live: the game's own feature, not a poke |

The game's own secret on the title, holding 1, ←, CTRL, and 2 to show the
hidden list of names and rename the monsters, is on the Discoveries tab.
