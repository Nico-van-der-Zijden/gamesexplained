# Rick Dangerous — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 12 October 2026, Bronze run (claude-opus-5-5)

The first boot ran into a dead emulator (EmulatorDown on connect); it had
exited since the last session. `tools.py vice` and `check-emulator`
(57 of 57) brought it back.

The second boot autostarted the TAP and sampled every twenty seconds. The
samples showed `WarpMode` 0 from the first one, so the turbo part loaded
at real speed for about four minutes, until warp was turned on by hand.
The game came up on the Hall of Fame; the title screen showed only after a
fire. The later boots turned warp on eight seconds after the autostart
and checked it on every pass.

The hand-over took two boots. The first logged every store to `$FFFE` and
`$0314`. It showed the turbo loader's interrupt at `$E1E2`, two stores
from `$083A` while `$01` was still `$24`, stores from zero page, and then
the start-up's own stores at `$083C`-`$0847`. The second
armed an execute checkpoint on `$0800`-`$0FFF` after the first store from
zero page, and stopped on `$0810`, a `SEI` and a stack reset.

The string sweep's screen-code pass found nothing readable; the text is
ASCII with `@` as padding, which the second pass and a search for words
at any constant offset found. The Hall of Fame names did not show as
strings because they are stored column by column.

The cheat code was read before it was understood: `$0A71` tests bit 3 of
`$DC01`, which looked like joystick port 1 right. The census showed the
game never writes `$DC00`; a live read gave `$7F`, so the same bit is the
2 key. Testing ← and ↑ from the same snapshot showed ← ends the game,
where the manual says ↑.

The first draft of the page said the name was typed; the name-entry code
at `$208A` shows it is picked letter by letter with the joystick, and the
page was corrected before the commit.
