# Into the Eagle's Nest — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## For the next tier

Silver is met except for the one thing an unattended run on an unproven
model cannot give itself: **a maintainer's check**. The listing was first
written on `claude-opus-5`, which `kit/models.json` has not declared
proven, so `tier` stays `bronze` until a maintainer samples it on a
proven model (`kit/CHECKING.md`). Everything else Silver asks for is in
place: 100 % coverage, `facts.md`, samples checked and recorded, every
feature settled or explicitly open, `symbols.json` and `listing.json`, and
the minisite with a player for the tune.

The listing has been audited, every comment and every claim in
`facts.md`, on `claude-opus-5-5`, and sampled again afterwards (`facts.md`,
"The listing's error rate"). Neither carries a maintainer's login: the
contributor is not a maintainer. The sample after the audit found 5 of 60
wrong, over the mark of 2, so a maintainer's own sample that also comes
out over the mark needs a full audit under their login before the game
can be Silver.

Left open by the audit:

- What the object is that a shot turns into other tiles for 2500 points
  and sound 8 (`$67FD`, reached from `$529B` for tiles `$30` to `$3E`,
  `$C1` to `$CB` and `$E7` to `$EE`). It has not been seen in the game.
- What `$02C9` does: set when explosives go off and by the main loop's
  hand-overs, and read at `$4B5F` to skip the flash and the player's
  sprites.
- How long the explosion takes. A live run saw `$02D3` reach `$FF` about a
  second and a half after the shot; the code gives 90 frames, 1.8 seconds.
- What filter routing `$63B7`'s write of 2 to `$D417` sets, which the C64
  reference does not cover.

## Questions only a player can answer

- What tile `$E4` is on the screen. `$5F27` tests for it to decide a
  mission is over, and it is the only tile of its code on the basement
  floor: a run of nineteen along the map's last row. Standing the player
  on it with every charge armed did not make the check fire.
- Whether the second castle the manual promises exists. Nothing reads a
  second set of floor descriptions, and the tape carries none: every block
  it loads is accounted for (`orientation.md`, "The loader"). The bytes at
  `$8C00` that looked like its tiles are the title picture's colours.
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
- **The chests in order.** The dice restart at every mission (`$4058`
  clears `$02E1`), so within one game the chests should open the same way
  each mission when they are shot in the same order. That is read from the
  code; a recorded route through two missions would show it.
