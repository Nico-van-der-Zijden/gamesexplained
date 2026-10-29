# Aaargh! — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/c64/c64-reference`: "Read the stack the resume returns with.": the tape is a freezer backup, and the return addresses above the frozen PC led to the game's own entry, `$8009`, where the run restarts it rather than analysing the freeze.
- `kit/skills/core/50-coverage`: "Resolve every pointer table before excluding a region": `$9EA5`-`$A208` had no instruction reading it and looked like scraps; the tables at `$A209`/`$A22F` pointed into it, and it held the 37 building pictures.
- `kit/skills/core/60-verify`: "Any claim that can be tested in the emulator in under a few minutes gets tested": a store checkpoint on the lizard's state stopped in code I had written up as unreachable, and showed that the "immortal lizard" was two variables kept in the operands of the branch's own loads.
- `kit/skills/core/50-coverage`: "Is the picture loaded or drawn?": the character set looked like runtime state, but `$C400`-`$C497`, `$C500`-`$C547` and `$C780`-`$C7FF` are never rewritten, and they hold the pickups and the score digits the pages draw.
- `kit/skills/c64/tool-regen2000`: "`address` is for interleaved pointers, `lo_hi_address` for split tables.": three pointer tables typed as split tables had minted stray symbols across the music's patterns; retyped, the symbols landed on each pattern's start.

## What was changed in the kit

None. The VICE setting below is a maintainer's call, and `kit/c64/INSTALL.md`'s paragraph on sound is also changed by the Eagle's Nest branch, so this branch leaves it alone.

## What went wrong, and where it is written

- **VICE stalled with sound on.** With `Sound=1` the emulator, under WSLg's PulseAudio, logged 620 "Sync is ... behind" warnings and spent 40 seconds in the power-on memory test. `SoundDeviceName="dummy"` beside `Sound=1` in `tools/vice-home/config/vice/vicerc` keeps the SID emulated (so `$D41B` gives noise and snapshots restore the chip) and ran without one warning. Asked of the maintainers below.
- **A variable in an operand, read as a constant.** I wrote up the lizard as unable to die, because its branch of `$931E` loads `#$00` where the ogre's loads two variables. The two bytes were those variables: the operands of the lizard's own loads. `50-coverage` already says to search for writes to an immediate operand's byte before calling it fixed; I did not, and the live test caught it.
- **Writer lists from my own cross-reference.** The 39 colour RAM comments listed only the stores that name an address, and missed the indexed ones; the sample found five. `50-coverage` says to take callers and readers from the references search, and my script was not it. All 39 now name no list.
- **The export refused to shrink.** After deleting stray symbols, `symbols_export.py` refused to write, saying the session held less than the file, and an earlier `tail -1` had hidden the refusal. `--force` is the answer the message gives; it cost a pass of confusion.
- **Chrome's screenshots timed out** on every page, though the pages ran (their canvases drew and the console had no errors), so the pages were checked through their scripts and drawn offline in node.

## Candidates

- **A table read backwards from an index that names the run's end wraps for index 0.** `$B463` copies each animation frame by counting an index down from size times phase, so phase 0 reads the bytes below the table (after the index wraps) and shows another table's bytes one pass in four; the building tables at `$B5F5` are read the same way, which is why their entry 0 is never used. It was caught by a live test of the bytes the characters took. A `50-coverage` rule would say: when a loop copies with an index counted down from a product, check the product's smallest value; at 0 the first byte read is the table's own and the rest wrap past `$FF`.
- **A call aimed one byte short of a routine switches it off.** `jsr $9594` at `$9541` reaches an `rts` just before the roof routine at `$9595`, which nothing else reaches. It was caught by reading the unreached code next to the call. `50-coverage`'s "Unused data is often a feature switched off" would take the case of code: a call to the byte before an unreached routine.

## Maintainer asks

- **Recommend VICE's sound on through the dummy device in kit/c64/INSTALL.md.** `kit/c64/INSTALL.md` recommends `Sound=0` for speed, but with sound off VICE answers `$D41B` with its cycle counter and a snapshot saved that way logs "Cannot initialize SID engine" when loaded with sound on; with `Sound=1` through PulseAudio under WSLg the emulator stalled (620 sync warnings, 40 seconds in the memory test) on 28 October 2026. `Sound=1` with `SoundDeviceName="dummy"` emulated the SID and ran without a stall for the rest of the run. The suggestion: recommend that pair in the install notes, and have `tools.py` write it when it creates `vicerc`.

## What cost the most time

A note in `kit/c64/INSTALL.md` that VICE's sound can stay on without stalling through `SoundDeviceName="dummy"` would have saved the restarts and the slow boots.
