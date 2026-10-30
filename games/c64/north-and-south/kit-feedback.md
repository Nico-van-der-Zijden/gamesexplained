# North & South — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": settling the checker's verdict on the computer's plan 3 against the code removed a discovery the page was about to publish, that a large army's score wraps to 0.
- `15-parts`: "Never assemble an image from the disk's files: the listing must show bytes and a machine that existed together": each of the eight parts is listed from a hand-over the game's own loader made, the train's included, which was asked for through the loader's own file number rather than put together from the tape.
- `70-minisite`: "Draw from the memory the game draws from": the fort's and the train's characters, tiles and maps were compared between the hand-over and a play snapshot before the Maps / levels tab drew them; only the train's wheel characters (43 bytes) and one patched fort tile differ, and the page applies the patch.
- `c64/steps`: "Make the test's `createDriver` from its source text alone": `test_music.js` builds the driver with `vm.runInNewContext`, as the worklet does.

## What was changed in the kit

- `kit/skills/core/70-minisite/play.md`, "Read what the interrupt writes
  through one function": read each such byte as many times as the game
  does, on the same paths, a random number generator the interrupt also
  calls and a screen cell it redraws among them; and a new rule, a
  checkpoint where an exit reads the raster. It would also have mattered
  in `games/c64/green-beret`, whose main loop's frame flag is read as the
  game's loop first read it, and from memory after
  (`games/c64/green-beret/port/src/g-main.js`), found the same way. The
  lesson is `kit/lessons/2026-10-30-north-and-south-irqbyte-count.md`.

## Candidates

- **One setting read in opposite senses by different parts.** The run's
  notes said a low level was the handicap everywhere, and the page's first
  draft said so, from reading each routine's comparisons alone. Asking for
  each read whose level it indexes (the side itself, the defender, the
  firing side) showed the arcade parts and the strategic odds count the
  level opposite ways. It was caught only because a table on the page put
  the rows side by side. A skill would say: when a setting is read in more
  than one place, tabulate every read with the side or object it indexes
  and the direction of its effect before writing what the setting does.
  No other game folder could be named for it.
- **A loop count of 0 read as "nothing happens" or as "wraps".** The
  annotation said a multiplier loop entered with a count of 0 makes the
  score 0; the loop adds 256 more times and leaves the byte unchanged.
  The checker found it by running the routine in the simulator. A skill
  would say: a claim about a counted loop entered with 0 is run in the
  simulator before it is written. No other game folder could be named.

## Maintainer asks

None.

## What cost the most time

Screenshots in the Chrome extension timed out whenever a page with a SID
player was on screen (Barbarian's as well as this game's), so those
sections were checked through the page's own state. The failure shows
itself, so it is written here and in `agent-history.md` for the next agent
to find rather than in a skill: scroll the player out of view, wait, and
screenshot again, and read a player's state (its buttons' `aria-pressed`,
its seek bar's length) from the page.

## The Play port (30 October 2026)

Skill text that changed what I did:

- `70-minisite/play.md`, "Read what the interrupt writes through one
  function": every difference the lockstep found after the routine checks
  passed was a byte an interrupt writes, read in the main program without
  `irqByte` (the guard's and the dog's places, the screen cells under the
  fighters' feet, two parts' random numbers).
- `70-minisite/play.md`, "Run the page's runtime in node from the cold
  start before opening a browser": the page stalled at the menu in node,
  where a profile showed why (below), before any browser was opened.
- `70-minisite/play.md`, "When a difference survives, hook the machine at
  the addresses involved": `work/dbg-ls.js` logs the game's reads and the
  port's `irqByte` reads of one address side by side; each race above
  was found with it in one run.

What was changed in the kit: the first entry under that heading above.

Candidates, not made:

- **A routine that ends its caller's pass.** The kit's routine checks
  (`cpu.call`) cannot tell a routine whose two `pla` end its caller's pass
  from one that returns, and the port's `{ up: true }` went unchecked
  until `port/test/check.js` put a caller's return under the routine's and
  compared the stack's height. A helper in `kit/c64/lockstep.js` or
  `kit/cpu` could do the same for every game; only this game's checker has
  it, so it is not made here.
- **A raster wait inside an interrupt handler.** The menu's handler waits
  for a line, and a page clock that stands still in a handler hangs there
  for good. This page moves the beam by the handler's own spent cycles;
  other games' runtimes would hang the same way.

## System and tools

Windows 11 Pro on x86_64 with the kit in WSL2 (Ubuntu 26.04.1 LTS);
node 24.21.0 from `tools/`; VICE v3.13.2 (barryw/vice-mcp build) through
`kit/c64/vice.py`; the VICE MCP server did not connect from the session
(ECONNREFUSED), which the kit's own scripts made no matter.
