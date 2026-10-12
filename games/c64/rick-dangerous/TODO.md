# Rick Dangerous — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Bronze, at 10.5 % coverage of the 20,741 bytes the ledger tracks
(12 October 2026).

## Missing for Silver

- Coverage to 100 % (`50-coverage`): the rooms and their data, Rick's
  movement and the joystick combinations, the traps and enemies, the
  bullets, dynamite and stick, the panel, the sprites, the music and
  sound effects (`$4990`-`$56xx`), the attract and title screens.
- Mark the stretches the ledger reports as loaded and untracked
  (`$CB86`-`$CFD0` and 51 more, 8,393 bytes): label them, or list them in
  `game.json` under `coverage`.
- The three untyped gaps `listing.py` reports between code blocks
  (`$091D`-`$0923`, `$0AA0`-`$0AA9`, `$2A0F`-`$2A16`).
- Verify (`60-verify`) and `facts.md` completed.
- The full minisite (`70-minisite`), with a player for every tune.
- Decode the tape's blocks and map them onto memory (`10-orient`, step 7).

## Open

- What the flag `$37` set by FLUFOMATIC does.
- Why DANGERSTU and JELLY in the Hall of Fame table draw as DANGERSIU and IELLY: the font may draw T and J like I.
- Whether points earn more lives.
- Where a second game gets its six lives back: `$2D34` is written at
  `$08C0`, which runs once before the title loop, at `$0A80` (the cheat)
  and at `$0AE9`.
- Run/Stop as pause, from the manual: not tested.
- The C64-Wiki's 80 rooms, 74 traps and enemies.

## Article ideas

- The name entry: spell BBOOIINNGG with the joystick and watch the cheat
  work, in a Play tab.
- The Hall of Fame stored column by column, drawn from the bytes.
- The raster list behind the interrupt at `$3A0D`.
