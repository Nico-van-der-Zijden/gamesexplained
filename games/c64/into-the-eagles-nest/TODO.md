# Into the Eagle's Nest — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## For the next tier

Silver is met except for the one thing an unattended run on an unproven
model cannot give itself: **a maintainer's check**. The run was made on
`claude-opus-5`, which `kit/models.json` has not declared proven, so
`tier` stays `bronze` until a maintainer samples the listing on a proven
model and, if that sample is over the mark, audits it (`kit/CHECKING.md`).
Everything else Silver asks for is in place: 100 % coverage, `facts.md`,
one sample checked and recorded, every feature settled or explicitly open,
`symbols.json` and `listing.json`, and the minisite with a player for the
tune.

**An audit of the listing is the first thing to do.** The run's own sample
found 13 of 60 comments with a wrong detail, which is 21.7 %, well over
the mark of 2 in 60. All 13 were corrected, and so was every other comment
that said the same thing, but the sample's rate holds across the rest, so
roughly one comment in five of the 659 is probably still wrong in some
detail. A full audit, followed by a fresh sample on a model that took no
part in it, is what would let the page call the listing checked.

## Questions only a player can answer

- What tile `$E4` is on the screen. `$5F27` tests for it to decide a
  mission is over, and it is the only tile of its code on the basement
  floor: a run of nineteen along the map's last row. Standing the player
  on it with every charge armed did not make the check fire.
- Whether the second castle the manual promises exists. Nothing reads a
  second set of floor descriptions; the 999 bytes of tile-shaped data at
  `$8C00`, which no instruction reaches, are the only candidate.
- How the demolition mission ends in play. The path through the code is
  traced; nobody has seen it.
- Who "Mirai" is, whom C64-Wiki credits with the music.

## Ideas for a later run

- **A Play tab.** The engine is small and regular: a map built from
  blocks, a player that moves a tile every four frames, guards that step
  into empty tiles, two bullets. A port checked in lockstep against
  `kit/c64/machine.js` would reach Platinum.
- **A route through a mission**, recorded with `kit/skills/core/65-inputs`
  and replayed on the page, which would also settle the two questions
  above.
- **The guards' own rule.** The run explains how a guard moves and how it
  turns, but not how it chooses where to go. A stepper that let the reader
  watch a floor's 116 guards take their turns would show whether they
  patrol or wander.
- **The screens the run never saw**: the end-of-mission screen, the
  castle's own destruction, and the name entry with a real high score.
