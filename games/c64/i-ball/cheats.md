# I-Ball — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| More lives | `POKE 59,9` (`lives`, `$3B`): nine lives left; the panel's lives sprite shows only 0 to 3 and stays as it was above 3 (`show_lives`) | live: from `play.vsf`, two deaths took it from 9 to 7 and play went on |
| Laser never overheats | `POKE 16844,1` (`cooler_on`, `$41CC`), as the Lazer Cooler does | live: fire held for 900 frames, the heat stayed at 0 and no overheat |
| More time | `POKE 71,9: POKE 72,9` (`timer_units` `$47`, `timer_tens` `$48`): the timer at 99; the panel's digits are $8A plus each | live: the timer read 98 a second of logic later, its digit sprites `$93` and `$92` |
| Every wall kills | `POKE 16839,1` (`faulty_disc`, `$41C7`), as the Faulty Disc does, until a life is lost or the level ends | live: used to cause the deaths in the first row |
| Start on another level | `POKE 40,n-2` (`level`, `$28`) on a level-complete screen: `next_level` adds one and starts level n | candidate: traced in `next_level`, not tried |

The game is a memory image with no BASIC of its own running, so these are
pokes for an emulator's monitor or a cartridge, not for a BASIC prompt.
