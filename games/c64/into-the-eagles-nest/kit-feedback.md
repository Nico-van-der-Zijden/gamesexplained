# Into the Eagle's Nest — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `30-text`: "First rule out an offset": searching for the differences between the letters of a word the game shows found its stored text in one pass, in plain ASCII, after a search for screen codes had found nothing.
- `60-verify`: "When you measure with breakpoints, put one on a routine you know runs": the checkpoint on the interrupt proved the instrument was alive while the one on the damage routine stayed at zero, which is what let "nothing but a guard's step hurts the player" stay a measurement rather than a guess.
- `70-minisite`: "Port the routine, then test the port against the game itself": the test caught the music driver taking the tune's first notes a tick late, after 1,802 calls that matched.
- `60-verify`: "A wrong comment is usually one belief written down more than once": each of the sample's two serious findings was in several comments, and searching for the belief rather than for the comment is what found them.
- `c64-reference`: "Multicolour character mode uses bit 3 of the colour nibble": in the second pass it explained what the contributor saw wrong on the pages, walls and panel letters drawn as multicolour, and gave the rule every drawing on the pages now follows, checked against the recorded frame's colour RAM, where all 588 play-area cells take their colour from the tile table.

## What was changed in the kit

- `kit/skills/core/30-text`: the note on inverted fonts now says to render such a set to a picture and never to a text dump of 8×8 cells, because the dump draws the set pixels and an inverted letter then reads as a block of dither. `games/c64/the-goonies` stores its font inverted too, and `kit/lessons/2026-10-26-into-the-eagles-nest.md` has the case.
- `kit/skills/c64/steps`: the `snapshot` row said the hand-over is "`work/entry.vsf`, which `listing.py` takes by default", which reads as though the snapshot argument could be left out. It cannot: only `--entry` defaults. The row now says which argument defaults and shows the call.
- `kit/skills/core/50-coverage`: a new bullet, "Bytes no instruction reads may still be read", says to check what reaches the video chip's pointers, the loader's writes included, before calling a range unused. This game's 1,000 bytes at `$8C00` were described as spare tiles because no instruction reads them; they are the title picture's screen colours, and the tape itself writes the registers that point the chip at them. `games/c64/fist-ii-the-legend-continues` keeps data at `$D000`-`$DFFF` that only the video chip reads, the same case.
- `kit/scripts/build.py`: the tab bar now always closes with Source code and About. This game's `tabs` listed only three pages, and the build dropped the Source and About tabs from the bar without a word, so the listing and the record of its sample could not be reached; the minisite skill says the bar always closes with them. `test_build_next_tab.py` has the case.

## Candidates

The next run that meets one of these can make the edit; this run could
name only its own game for each.

**Read a number out of memory, not off the emulator's picture.** This
game's font draws a 9 with a flat top, and at the emulator's 384 pixels it
reads as a 5. The ammunition a mission starts with was written down as 59
three times, in `features.md` and in two comments, before the byte at
`$02BD` settled it at `$99`. It was caught by reading the panel's two
cells, which both held the same code, so the two digits could not have
been different. A line in `60-verify` under "Measuring without fooling
yourself" would say that a number a page is going to quote is read from
the variable or the screen's own cells, and that a screenshot is for
seeing which screen it is.

**A helper script must not take a standard library module's name.** A
`dis.py` written into the game's `work/` shadowed Python's own `dis`, and
the failure surfaced in unrelated scripts, through `traceback`'s import,
as an error naming the wrong file. `python3 -I` does not help, since it
also drops the path the kit's own modules are found on. It cost a
confusing ten minutes. A line where the skills first tell an agent to
write helper scripts, in `50-coverage` or in `tool-regen2000`, would say
to keep away from the standard library's names.

**A correction is a new reading, and needs checking as one.** The
sample found that tiles `$5E` to `$6D` were chests, not soldiers, and the
correction was written from the one routine that opens a chest. It gave
the page a one-in-eight chance of an explosion that ends the game, which
the rest of the code rules out: the explosives in a chest go off only when
the open chest is shot again. The contributor noticed, having never once
been blown up. A line in `60-verify`, after "A wrong comment is usually
one belief written down more than once", would say that a correction
reads every routine that touches what it describes, and is seen in the
game when it reaches a page.

**Draw in the mode the chip draws in.** The page's own tile drawing drew
every cell in multicolour, so the walls, which the game draws hires, came
out as stripes, and so did the panel's letters. The machine reference has
the rule (bit 3 of the colour nibble picks the mode per cell), and the
page's rebuilt frame, drawn by the site's renderer, was right all along;
nothing compared the one with the other. A line in `70-minisite` beside
"Draw from the memory the game draws from" would say to take each cell's
mode from the colour memory the chip reads, and to compare one widget's
drawing with the recorded frame.

## Maintainer asks

None. Both gaps this run met are in "Candidates" above, waiting for a
second game to justify the edit.

## What cost the most time

Reading an inverted character set as a text dump instead of as a picture,
which is the change made to `kit/skills/core/30-text` above.

In the second pass, on claude-opus-5-5 after the contributor's review,
putting an open chest in front of the player: the map address the first
attempt used was a guess and landed elsewhere, and the chest was found
only by stopping the machine where the game itself computes the address
of the tiles round the player (`$5C6A`).

## Tools and the operating system

Windows 11 Pro with the repository in a WSL2 Ubuntu clone, as the earlier
C64 games on this machine were done. The emulator is an own build of
vice-mcp v3.13.2, commit 1e83aab134, which passed all 57 of
`check-emulator`'s checks. `kit/c64/INSTALL.md` needed nothing.

Two notes for anyone driving the kit from Windows through `wsl.exe`:

- `wsl.exe -d Ubuntu -- bash -lc "..."` is parsed by the Windows shell
  first, which eats `$VAR`, backticks and even `\$`. Anything with a
  dollar sign, a backtick or a loop in it goes in a script file, run as
  `wsl.exe -d Ubuntu -- bash <path>`.
- The `vice` MCP server is down at the start of such a session, as
  `tool-vice-mcp` says it will be, because the emulator is started later.
  `python3 kit/c64/vice.py` drove the emulator for the whole run instead,
  and did everything this run needed.
