# Rick Dangerous — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

A Bronze run: orient, features, sweep, the symbol map and listing, a
cut-down page, and this retrospective. Run on 12 October 2026 with kit
0.0.155, on Windows 11 with the tools in WSL2 (Ubuntu 26.04.1), one agent.

## Skill text that changed what I did

- `40-sweep`: "Decode the whole image as screen codes (and again as the system's text encoding)": the screen-code pass found nothing; the second pass found the five story screens, the Hall of Fame's word list and its cheat words, all in ASCII.
- `40-sweep`: "Registers *never* touched are as informative as those hammered": the census showed the game never reads `$D01E` or `$D01F`, which is recorded as collisions in software rather than left out.
- `10-orient`: "Save the hand-over too": the stores to `$FFFE` during a second boot found the start-up at `$0810`, and `entry.vsf` showed nothing authored is lost by the time play starts.
- `20-features`: "Test each control from a moment you have looked at, with nothing in motion": the cheat and quit keys were tested from the same standing snapshot, with and without the flag, which is how the manual's ↑ turned out to be ←.

## What was changed in the kit

- `kit/skills/c64/tool-vice-mcp/workarounds.md`, "A slow host": the sentence that autostart leaves warp on now says it depends on the image (a TAP had it off twenty seconds in) and to read `WarpMode` after an autostart. A correction of a platform note in place; the failure shows itself as a slow load, so no skill rule.

## Candidates

A game that never writes `$DC00` scans whatever keyboard row the loader
left selected, and a bit test on `$DC01` then names a key only through that
row. Here the main loop's tests at `$0A71`, `$0A87`, and `$0A95` read like
joystick-port-1 tests (right, down) and are also the 2, C=, and ← keys,
because `$DC00` reads `$7F`. Reading the bit against the matrix with an
assumed row gives a confident wrong key. It was caught by reading `$DC00`
live and pressing the keys. `c64-reference` would say: before naming the
key behind a `$DC01` test, read what `$DC00` holds at that moment, live,
since the row may be the loader's.

## Maintainer asks

None.

## What cost the most time

The tape loading at real speed after autostart had switched warp off: a note in `tool-vice-mcp` that a TAP's autostart can end with warp off (made on this branch) would have saved about five minutes.
