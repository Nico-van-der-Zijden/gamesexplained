# Lemmings — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `10-orient`: "Compare it with the play snapshot byte for byte": the first stop after the game's load held only `$5000`-`$5FFF` of it, so the hand-over moved to the level briefing, which holds the whole program.
- `40-sweep`: "Relocating loaders can leave a second copy of code or tables in memory": the briefing texts turned out to be kept twice, a template under the I/O area and a filled-in copy, and both are labelled as such.
- `10-orient`: "Read the file's header before trusting its name": the TAP header, and the D64s' sector checksums, are recorded in `orientation.md`.

## What was changed in the kit

Nothing.

## Candidates

- **A string sweep reads mixed-case text one byte late.** The game's text
  is in screen codes of the lower-case set, where capitals are `$41`-`$5A`.
  A sweep that accepts only `$00`-`$3F` (as Rick Dangerous's and this run's
  `work/strings.py` do) ends each run at a capital and starts the next
  after it, so every string that starts with a capital is reported one
  byte late and without its first letter. Caught when the addresses were
  checked by searching for whole strings. A `40-sweep` rule would say:
  when the sweep's runs start with a lower-case word, decode with
  capitals at `$41`-`$5A` as well and take the address of the capital.

## Maintainer asks

- **Add a tape helper to `kit/c64/vice.py`: change tapes, press PLAY and set the position in decimal.** A game on several cassette sides needs its tapes changed at a prompt, and the vice-mcp server has no tape tool. This run did it through VICE's text monitor (`codemap.monitor('attach "<file>" 1')`, `tapectrl 1`, `tapeoffs <offset>`), which reads every number as hexadecimal: an offset typed as 441050 was set to 4,460,624, and two positions were tried before that showed. A `tape(rpc, path, offset=None)` helper beside `autostart()` in `vice.py`, which converts the offset to hex and stops on a held checkpoint as `codemap.monitor` does, with a line in `tool-vice-mcp` under "The sequence that works", would save the next tape game the detour.
- **Add a string sweep script to `kit/cpu/`, beside `census.py`.** `40-sweep` asks for a screen-code and a PETSCII string sweep, but the kit has no script for it, and Mayhem in Monsterland, Rick Dangerous and Lemmings each wrote their own `work/strings.py`. One script, taking a game or part folder and a snapshot like `census.py`, that also decodes the lower-case set's capitals (`$41`-`$5A`) and reports a run at its first letter, would make the sweep the same everywhere and remove the off-by-one above.

## What cost the most time

The cassette release: about an hour went into getting tape 2 to load in
VICE, through a monitor that reads numbers as hex, before the contributor
offered the disk release. A tape helper in `vice.py` (the first ask) would
have shortened the tries; the FILE ERROR itself is unexplained
(`agent-history.md`).

Host: Ubuntu 26.04.1 under WSL2 on Windows 11 (kernel
6.18.54.1-microsoft-standard-WSL2), Intel Core i7-3770. VICE built from
the vice-mcp v3.13.2 source as in the earlier runs here; `check-emulator`
57 of 57. regenerator2000 0.9.20.
