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
