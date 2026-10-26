# Into the Eagle's Nest — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The run

One agent, on `claude-opus-5`, over 26 October 2026, from a tape the
contributor owns. The contributor asked for Silver and said the game
could be looked up online.

## What went smoothly

The tape boots in VICE with nothing special: autostart, warp on, and 220
seconds later the game's own code runs. An execute checkpoint over
`$0E00`-`$CFFF`, armed once the loader had started, stopped on the first
instruction of the game, `$1014`, and that image is what the listing is
built from.

The structure came out of three cheap measurements rather than out of
reading code. A power-cycled machine with nothing loaded, saved beside the
hand-over, said exactly which bytes the tape wrote. VICE's execute record
through a play session said which of them run. The frame recorder said how
the screen is put together. After that the regions were known before a
single routine had been read.

## Two wrong turns worth knowing about

**The character set looked as though it had no letters.** The panel's
cells read `$2E $2F $74 $2D` for KEYS, and those glyphs, printed as text
art from the snapshot, looked like dithered wall tiles. A long detour went
into doubting the screen address and the video bank before the real
problem showed itself: the letters are drawn as holes in a solid cell, and
at 8 by 8 characters of text art they read inside out. Rendering the
character set to a PNG and looking at it settled it in one pass, and
`work/charsheet.py` and `work/screenpng.py` do that for the next run.

**The panel's ammunition was misread off a screenshot three times.** The
emulator's 384-pixel picture draws this font's 9 with a flat top, and it
reads as a 5 at that size. The value in memory, `$99`, with both panel
cells holding `$F9`, is what settled it. A number on a screen is worth
reading out of memory.

## What the sample found

The sample of 60 comments came back with 13 carrying a wrong detail,
21.7 %, well over the mark. Two were serious: the two hand-overs the main
loop makes, the lift and a prisoner brought home, had been written as each
other's job, and a whole range of tile codes had been read as soldiers
when it is the chests. Both mistakes had been copied into several
comments, which is the usual shape of a wrong comment and the reason the
skill asks for every repetition to be corrected together. `facts.md`
records the measurement and `TODO.md` asks for the audit.

The chests turned out to hold the best thing in the game. Shooting a
closed one is a one-in-four chance of anything at all, and on that chance
an even split between 4000 points and the explosion that ends the game.
No source had written that down, and it came out of correcting a wrong
comment.

## The port that was a tick late

The music driver, ported to JavaScript for the page, agreed with the
game's own code for 1,802 calls and then drifted by exactly one tick. The
game's end-of-tune routine does not return: it sets the counters and jumps
back to the top of the same call, so the first notes of the repeat are
played in the call that found the end mark. The test caught it; reading
the two side by side had not.

The sound effects went the other way. A port of the nine of them, read off
the code by hand, disagreed with the game on almost every frame, so the
page runs the game's own code for them on the kit's 6502 instead. That is
both more faithful and less work, and the test then checks what the page
adds: the memory it hands over and the entry points it calls.

## Not done

A Play tab, a recorded route through a mission, and the questions in
`TODO.md` that need somebody to play the game further than this run did.
