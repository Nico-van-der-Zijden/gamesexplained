# Lemmings — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 19 October 2026, Bronze run (claude-opus-5-5)

The contributor first gave the cassette release, `lemmings.tap`. It booted
with warp on through a loading picture to a code sheet ("Please enter the
6th number on the page featuring the lemming"). The code sheet's routine
compares the typed number with the word at `$A092`, so the run typed that
value and reached the title menu. Pressing 1 asked for "tape 2 side A".

The rest of that file gave FILE ERROR. The contributor then pointed at five
more TAP files, `lemmings0.tap` to `lemmings4.tap`. The game counts sides
in order (tape 1 A, 1 B, 2 A, ...; `$5298` turns the number into the
prompt's digit and letter), which suggests 0 is tape 1 side B and 1 to 4
are tapes 2 and 3. Attached at the prompt, each gave FILE ERROR after
reading a fixed stretch: `lemmings1.tap` stopped at tape offset 42,649
whether it started at 0 or at 112,060, and the other four near 100,570.
A fresh boot from power-on, with the tape swapped at the prompt, did the
same, so the snapshot was not the cause. The tape loader (`$CC00`-`$CFFF`,
KERNAL LOAD through the `$0330` vector) skips a header whose name does not
match and reports FILE ERROR only on a failed read, so the stops were read
errors. Why was not found. The run was about to log every header the
loader compared when the contributor pointed at the disk release instead.

Two things worth knowing for a tape game with several sides: VICE's text
monitor, reached through `codemap.monitor()` in `kit/c64/codemap.py`,
changes tapes (`attach "<file>" 1`), presses PLAY (`tapectrl 1`) and sets
the position (`tapeoffs`), and it reads every number as hexadecimal: an
offset typed as 441050 was set to 4,460,624. A snapshot load does not
move the tape.

The disk set booted to the same code sheet in 40 seconds. Its first stop
after pressing 1 at the title, an execute checkpoint on `$3600`-`$8FFF`,
was `$5006`, the loader's failed-load call. Comparing that state with play
showed only `$5000`-`$5FFF` of the game's load in place, so the hand-over
became the level briefing, saved on screen after all the loading.

The string sweep, a copy of Rick Dangerous's `work/strings.py`, reported
each string one byte late: the game's text is in mixed-case screen codes,
and a capital (`$41`-`$5A`) ends a run of the sweep's letters. The
addresses in `features.md` and `facts.md` were corrected by searching for
each whole string with its capital (`work/mixed.py`).
