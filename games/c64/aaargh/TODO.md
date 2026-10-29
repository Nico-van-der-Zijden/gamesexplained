# Aaargh! — TODO

Tier: **silver**. Gold needs a person to curate the pages section by
section; Platinum needs a Play tab that is the whole game (`kit/skills/core/70-minisite/play.md`).

## The listing

- Coverage is 100 % (`coverage.py`): every byte the game uses is described,
  and what is not the game's is listed under `coverage.exclude` with its
  reason.
- **An audit is recommended.** The one sample (seed 20261029, 60 comments in
  two strata) found 17 wrong, 28 % of the sample and about 26 % of the listing
  weighted by stratum; all were corrected, with every comment that said the
  same, but the rate holds across the rest. A full audit by fresh checkers,
  given the kinds of error the sample found (`facts.md`, "The listing's error
  rate"), then a new sample, would measure it again.

## Open questions

- Where characters `$93`-`$95` show, and so whether the wrong frame the
  animation gives them one pass in four ($B463) can be seen.
- The cave's set-up asks for sound effect 0 on all three voices ($AC58-$AC5E)
  where `$FF` would ask for none; the cave's interrupt does not play effects,
  so whether a punch sound plays as the next city starts is untested.

## Ideas

- A Play tab: the whole game ported to JavaScript and run in lockstep with the
  game's own code (`kit/skills/core/70-minisite/play.md`), which Platinum
  needs. Two players at once and the cave's computer opponent are the parts a
  reader would most want to try.
- A recorded route through a round, three cities, the volcano and a cave fight
  (`kit/skills/core/65-inputs`).
