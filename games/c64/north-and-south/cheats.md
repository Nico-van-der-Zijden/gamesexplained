# North & South — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and how it was tested. "Tested" means run on the game's
own code on the kit's machine (`kit/c64/machine.js`), from moments saved in
play (`port/scripts/gen-states.js`), with the poke written before every frame,
beside the same moment run without it. Untested pokes are labelled as
candidates.

No cheat of the game's own was found: no word typed and no keys held do
anything beyond the controls in `facts.md`, "Controls".

| Effect | Poke | Status |
|---|---|---|
| The fort's attacker keeps four knives | fort `$8115` (`knives_left`) held at 4 | tested: from `cp-frt-cc61-001` the computer's attacker threw 6 knives, against 4 without it |
| The train's attacker keeps four knives | train `$8112` (`knives_left`) held at 4 | tested: from `cp-trn-tr64-001` and `-002`, 10 and 9 knives, against 2 and 1 |
| The train's clock stands still | train `$8102`/`$8103`, the clock sprite's x, held at its start `$0024` (`train_clock`, `$8ADE`) | tested: from `cp-trn-tr64-001` the time ran out at frame 1,818 and the attacker lost; with the poke it never ran out, and he reached the locomotive at frame 3,010 |
| The fort's clock stands still | fort `$8105`/`$8106`, held at `$0024` (`fort_clock`, `$8945`) | candidate: the same code as the train's; in none of the saved forts did the time run out, so the poke changed nothing there |
| A side's level, as the menu sets it | resident `$0380` (the Union), `$0381` (the Confederacy): 0 to 2 | candidate; the menu writes the same bytes (menu `$1193`) |
| No Mexican and no Indians | resident `$0384` set to 0 | candidate; the menu's option writes the same byte (menu `$1204`), and the map reads it before each of their routines (`mexican`, `$178B`; `indians`, `$2678`) |
