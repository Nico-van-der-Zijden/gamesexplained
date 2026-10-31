# North & South — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum: the Play tab is the whole game, the eight parts' 606 routines
ported to JavaScript and held in lockstep with the game's code
(`port/`, `test_play.js`), on a Silver run of 100 % coverage over the eight parts (258,485 bytes), a sample of
65 comments checked and corrected, every feature confirmed, traced, live
or open, and the minisite built with a player for each of the three tunes
and the 31 sound effects.

The sample found 6 wrong in 65 (9.2 %, weighted by stratum 9.9 %), over
the mark of 2 in 60. An audit of every comment by another proven model is
recommended before the listing is relied on
(`kit/skills/core/60-verify`), then a new sample.

## For Gold

- A human edit pass over How it works, Discoveries and Maps / levels,
  section by section (`kit/style.md`).
- Every Discoveries section is traced in the code, not seen in play. Try
  them in VICE: a duck under a guard's knife; the Confederacy choosing a
  cannon while the Union has one in reserve; a strategic game with a
  corporal against a captain; a unit on the canyon's bottom rows.

## For Diamond

- Gold, above: the page's curation by a person. The Play tab is Platinum
  already.

## The Play tab

- The page plays at the game's pace to within a few per cent, by a model
  fitted on the game's timings (`port/cost.json`, `port/test/t-pace.js`);
  it does not count the game's cycles. A battle whose redraws are set off
  by a byte the interrupt writes can draw on different passes from the
  game. Counting each routine's cycles from the instructions it would run
  would make the pace exact.

## Article ideas

- The computer's turn, step by step: score every territory for one army
  with the game's own `ai_base`, `ai_occupied`, `ai_distance` and
  `ai_plan_scores` (map part), and show where it steps.
- The houses and trees `field_scenery` puts on the open field and the
  river, drawn on the battlefield widget.
- The ending's four messages, composed with a rank and a number of
  months, as the scroll shows them.
