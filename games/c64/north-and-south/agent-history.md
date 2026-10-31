# North & South — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 29 and 30 October 2026, claude-opus-5-5

- Four tape images, fourteen files, eight parts: the resident loader and
  script, the title, the menu, the map (three files), the battle, the fort,
  the train and the ending. Every part was listed from a hand-over the
  game's own loader made. No train came up in an hour of the computer
  playing both sides, so its file was asked for at the fort's prompt by
  setting the loader's file number (`orientation.md`).
- The train is the fort's code rebuilt at other addresses. Its comments
  were carried from the fort's where the instructions match (`work/pair.py`,
  `work/carry.py`), and checked against the train's own bytes. Labels the
  two share by design stay the same; the rest were renamed where they
  clashed with another part's (`work/clash.py`).
- The VICE MCP server would not connect from this session (ECONNREFUSED);
  everything ran through `kit/scripts/tools.py` and `kit/c64/vice.py`
  instead, which worked.
- The sample (seed 20261029, 65 comments, checker on claude-fable-5-1)
  found six wrong in a detail. One overturned a finding the run had meant
  to publish: the computer's plan 3 was thought to wrap a large army's
  score to 0, where the loop leaves it unchanged, and no army is that large.
  The checker ran the routine in the simulator; reading it had not shown
  the 257 times.
- Writing the levels table for the page turned up a contradiction with the
  run's own notes, which said a low level was the handicap everywhere.
  Reading whose level each routine indexes showed the arcade parts and
  the strategic odds count the level opposite ways. The page and the facts
  were corrected before publishing.
- The map widget runs the map's own routines. Its test against the
  emulator's picture first differed by 576 pixels: the month band, which
  three other routines draw. With them, 184 pixels differ, all under the
  cursor sprite.
- Screenshots of a page with a SID player on screen timed out in the
  Chrome extension (the Barbarian page did the same); the players were
  checked through the page's state instead, and by `test_music.js`.
- The loader's text at `$F2CC` is in none of the listings: it lies in
  memory none of the menu's files cover, and the map's files load over it.

## 30 October 2026, claude-opus-5-5: the Play port

- The contributor asked for Platinum after the Silver pull request. The
  port went on a branch of its own, `game/c64/north-and-south-play`, one
  part at a time: the resident's script and the title, the menu, the map,
  the battle, the fort, the train and the ending, 606 routines in
  `port/src/`. The tapes' fourteen files, read from the contributor's
  tapes by `work/tapdecode.py`, stand in for the loader; a load is the
  file put where its header says, as a good load leaves it.
- The train is the fort's code at other addresses, so its fighters were
  made from the fort's port by a script (`work/make-trn2.js`, not
  committed) that maps the fort's labels and operands to the train's, and
  the routines the train does its own way (no walls, dog or barrel, the
  ground beside the track, the guard kept in place as the view moves)
  were written again. Its checks passed at the first run.
- A train moment never came up in three wars the computer played, so the
  moments were made with the train loaded where the map asks for the
  fort (`NS_TRAIN=1`, `port/scripts/gen-states.js`).
- The checker had no way to tell a routine that ends its caller's pass
  (two `pla`) from one that returns. It now puts a caller's return under
  the routine's and compares whether the stack came back two bytes high
  (`port/test/check.js`). That found the fort's handlers missing for the
  beaten and the stroke states, and a guard's stroke that has to end
  `guard_stand`.
- Most of what the lockstep found was the race the skill describes: a
  byte the interrupt writes, read by the main program in the middle of a
  stretch. Each had to be read through `irqByte` exactly as often as the
  game reads it, or the values the lockstep hands over fall out of step:
  the guard's place (the high byte first, as `guard_stand` skips the low
  byte when it is set), the dog's, the screen cells the bottom interrupt
  redraws under the fighters' feet, and the battle's and the map's random
  numbers, which their frame interrupts draw from too.
- The parts' exits read `$D011` to blank the screen, and differed only by
  which half of the frame the port's clock stood in. A checkpoint at each
  exit's own instruction made them agree, as the clock meets the game's
  at every checkpoint.
- Four bugs in the game came out of the port: a second war started
  without a click on the calendar asks for file 156 and waits for ever;
  the map's random nudge zeroes the computer's scores; a ball on a bridge
  lands every spent bullet; and the cavalry's turn at the edge leaves the
  rider loop's X two lower, so the step moves the other side's riders or
  bytes of other tables. Each was run on the game's own code
  (`work/noise.js`, `work/bridge.js`, `work/cav.js`) before it went on the
  Discoveries page.
- The page's machine first stalled at the menu: the menu's interrupt
  waits for a raster line inside itself, and the page's clock did not
  move during a handler. Inside a handler the beam now moves on by what
  the handler has spent.
- Run in node without drawing, the video memory compared all 64 KB at
  every raster line, and a test of 60,000 frames took hours; the page
  draws every frame, which narrows the comparison to what the picture
  reads, and the tests now draw now and then.
- The page's pace was fitted per part on the game's stretches, with a
  rate for the work the port counts as it goes (`P.spend`). The fort,
  the train and the battle then ran far too fast on the page, though the
  fit was close: the port's checkpoints hand that count over as they
  yield, and the page charged only what had been taken before them. The
  page now charges the checkpoint's own count too. Measured against the
  game over 500 frames from each moment, the median difference in steps
  of the main loop is 0.0 % on the map and the ending, -0.7 % on the
  train, -2.6 % on the battle and -4.2 % on the fort. The battle's mean is
  larger: its redraws are set off by a byte the interrupt writes, and a
  few cycles either way move one by a pass, after which the two runs
  draw on different passes.
- One map moment of 79, a person against the computer, fell out of step
  in the computer's turn. Every routine agreed with the game's code on
  the port's memory, and the computer's random numbers parted at one
  draw. The lockstep had handed the port that value from a copy of the
  machine made at the turn's start, before the stick moved. The fix is in
  `kit/c64/lockstep.js` (`kit-feedback.md`).
- The battle's picture check drew a place the battle had given no address,
  so the copy went over the processor port; such a place is now left out.
- The routine check of `bat_pick_lane` hung at 800 cases. Its setup meant to leave the side one free lane, but drew a new random number for each lane, so some cases left none, and the game's search for a free lane never ends. The setup now frees one lane chosen once, and the check passes 800 of 800 in under a second.

## Pictures, the Mexican and the cheats (31 October 2026)

- The contributor asked whether the discoveries were real, for more graphics, and about cheats. The Discoveries page now leads with the bugs shown on the game's own code. The level reading, the guards' knives and the map's one soldier per side are relabelled oddities that may be meant, and ducking is a tip.
- The canyon's bottom rows were a claim read from the table and never tried. `work/canyon.js` runs `hazards` ($A113) on a soldier in the canyon's column: he falls with his top in rows 14 to 19 and crosses in rows 20 and 21, which units reach because they walk down to y $AA.
- The contributor asked about a sleeping figure at the map's bottom left. The listing called sprite frames $A6-$B6 the bomb and $B9 the explosion. Drawn in order along the path at $C0BF/$C0E0/$C102, the frames are the Mexican: asleep, waking, walking out and throwing. $B9 is his bomb, which flies 18 frames from his hand ($18A1), and $F8-$FC are its explosion. The labels `bomb_*` became `mexican_*` and `burst_*` became `bomb_*`, the comments were corrected in `parts/map/symbols.json`, and the port's names followed.
- The How it works page gained viewers drawn from the game's data: the map panel's scenes, the battle units' pictures from their tables, the fort fighter posed by `fighter_pictures` ($8CA0) run on the kit's 6502, the fort's other sprites, the Mexican, and the ending's two screens with the scrolling message.
- The cheats were tried on the kit's machine from saved moments (`work/cheats.js`, `work/cheats2.js`). Holding the knives at 4 gave the computer's attacker 6 knives in a fort and 9 or 10 on a train, against 4 or fewer without the poke. Holding the train's clock at its start turned a lost train into a won one.
- Asked for more hidden figures, every comment marking something unused was listed and the spare sprite images drawn (`work/unused.js`). The fort's "soldier with a rifle" ($C5, $C6) and "longer knives" ($DD, $DE) are byte for byte the train's driver and locomotive rods, since the two files share one set of sprite images; their comments were wrong and are corrected. Two map frames no routine reaches ($B7, $B8) are piles of cannon balls, the manual's sign of an army's size. The one `lda #$B8` in the map's code is the high byte of the save buffer at $B8D0, not a sprite pointer.
