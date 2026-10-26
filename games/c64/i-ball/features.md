# I, Ball — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "I, Ball", https://www.c64-wiki.com/wiki/I,_Ball, read 26 October 2026
- Wikipedia, "I, Ball", https://en.wikipedia.org/wiki/I,_Ball, read 26 October 2026
- The game's own screens and text (title page, level-end screens, the
  extras' names), read from the image on 26 October 2026

C64-Wiki names Andrew Betts as the programmer, Wikipedia Timothy Closs;
the title page says "COMMODORE VERSION BY ANDREW BETTS". C64-Wiki's
version "improved" by REMEMBER (trainer, two extra keys) is not this
image: neither of its keys is read (see the last row).

## Features

| Feature | Status | Where |
|---|---|---|
| Vertically scrolling shoot 'em up, one player | confirmed | `scroll_step`, `draw_playfield` |
| 16 levels; a friend rescued after every fourth (Lover Ball, Eddy Ball, Glow Ball, No Ball) | confirmed | `level_ptr_lo`, `rescue_screens`; *live*: level 4's end showed YOU HAVE RESCUED LOVER BALL |
| 50-second time limit per level; running out costs a life | differs | `timer_tick`, `time_up`: the timer starts at 50 and running out kills, but its seconds are 50 logic passes, so with aliens about the limit lasts longer than 50 seconds (*live*: on a screen with only Iball, 30 timer seconds in 30 real ones; with seven aliens, the logic ran in 695 of 1,350 frames) |
| Four lives | confirmed | `new_game` sets lives to 3 and the game ends only when a death takes them below 0: four tries |
| Plain and electrified obstacles on the track; the goal is the home straight at the top | confirmed | `bounce_iball`, `hit_wall` (characters `$06` and up solid, `$EE` and up kill); the goal is a wall hit at the top of the map |
| Bonus points for the time left at the end of a level | live | `level_end`: 10 a second; *live*: 25 left gave 250 |
| Extra lives only from bonus disks | confirmed | Bonus Ball (`$647A`) is the only increment of `lives` |
| Bonus disks always arrive in the same order; losing a life removes the latest extra; disks can be shot | confirmed | `disc_order`, `disc_rollback` (a death goes back to a checkpoint and removes the extra given there, not always the latest), `alien_shot`; *live*: places 0, 12, 14 and 31 gave Turbo Boost, Faulty Disc, Bonus Ball, Extra Score |
| Extra: Turbo Boost (faster movement) | live | vertical speed limit 3 to 4 (`$63C6`) |
| Extra: Single Laser (fires sideways, the way Iball faces) | confirmed | `laser_fire`, `laser_right`, `laser_left` |
| Extra: Smart Missile (destroys all aliens, once; Space) | confirmed | `smart_key`, `smart_missile`; *live*: fired with SPACE |
| Extra: Bullet Spray (fires up and down at once) | confirmed | `fire` with `spray_on` |
| Extra: Molecule Bomb (no new aliens for a while, once; M) | confirmed | `molecule_key`, `spawn_step`: 255 logic passes |
| Extra: Electro Shield (immune to electric obstacles for a while) | confirmed | `hit_wall`, `shield_meters`: about 441 logic passes |
| Extra: Hyperspace (straight to the goal) | confirmed | `scroll_step`, `draw_playfield` with `hyper_on` |
| Extra: Twin Laser (fires left and right at once) | confirmed | `laser_fire` with the Single Lazer and `twin_laser` |
| Extra: Fuel Injection (faster vertical movement) | confirmed | vertical speed limit 5 (`$6475`) |
| Extra: Hyper Brakes (stronger braking for a while) | confirmed | `$6483`, `shield_meters`: for about 441 logic passes the controls are read every run of `irq_top` instead of every second, so a push against the motion stops Iball twice as fast (and one with it speeds him up as fast); friction is unchanged |
| Extra: Laser Cooling Unit (no overheating) | confirmed | `fire` skips the heat with `cooler_on` |
| Extra: Rainbow Ripple Laser (wide, many-coloured) | confirmed | `ripple_fire`, `ripple_step`: a band seven characters wide, from two columns left of Iball to four right, rows in changing colours |
| Faulty Disk: electrifies every obstacle until a life is lost or the level ends; offered only after Twin Laser | confirmed | `hit_wall`, `faulty_disc`; it also ends once the map pointer is below `$0B00`; first in `disc_order` at place 13, after Twin Laser Set at 9; *live*: given at place 12 |
| Other disk rewards: bonus time, points, extra lives | live | Extended Play (+20), Timer Rewind (+40), Extra Score, Bonus Ball (*live*: a life) |
| The laser overheats with continuous fire | live | `fire`: overheated after 700 frames of fire, LASER OVERHEATED shown |
| Aliens are harmless while they flicker in as they form | confirmed | `alien_touch` skips aliens in `forming` (except discs) |
| Extras' status shown in the top and bottom screen areas | live | `panel_top_colours`, `panel_bottom_colours`: each icon lights when its extra is given |
| Inertia: Iball drifts and bounces | confirmed | `push_up` to `push_right`, `friction`, `move_iball`, `bounce_iball` |
| Joystick moves in all directions; fire shoots | live | port 2 (`read_controls`, `fire`); fire in port 1 did nothing |
| Keys in play: Z left, X right, O up, K down, P fire | live | each is one of a group of keys (`facts.md`, Controls) |
| RUN/STOP pauses and resumes | live | `check_pause`; V, N, comma, / and left SHIFT do too |
| Title screen: 1 music, 2 sound effects | live | `title_irq`, `music_flag` |
| Title screen: I, O, G play the samples "IBALL!", "OH NO!", "GAME OVER!" | differs | *live*: I starts a game, O and G do nothing; X (or its group) says sample 0, Z sample 1, SPACE sample 2 (`title_irq`) |
| Title screen: joystick forward and back raise and lower the samples' pitch | confirmed | `title_irq`, `sample_pitch` from `$5A` to `$FA` |
| Rob Hubbard's music, after Cabaret Voltaire's "Whip Blow" and "I Want You" | traced | `music_play` and its data; the credit is the sources', not the game's |
| Three digitised speech samples (credited to Simon Pick) | confirmed | `say`, `sample_nmi`, three samples at `$A000`; the contributor heard them say "IBALL!", "OH NO!" and "GAME OVER!" (26 October 2026); the credit is C64-Wiki's |
| No high-score table | confirmed | nothing stores the score past `game_over_screen` |
| REMEMBER version only: CLR/HOME abandons the game, Q returns to the last starting point, trainer options | open | not this image: no test reads CLR/HOME alone; Q is only one of the up keys; searched every `$DC00` write in the listing |
| The game's own list of disc rewards, 17 names in screen codes | confirmed | `extra_names` |
| Messages: COMPLETED LEVEL, YOU HAVE RESCUED, THAT WAS INCREDIBALL, GAME OVER | live | `level_end`, `rescue_screens`, `game_over_text` |

## Beyond the documentation

Found in the code, not in the manual.

- The logic runs in passes that skip frames when busy, and the timer
  counts passes (`facts.md`, Timing).
- The Smart Missile scores 10 for each empty sprite slot (*live*: 70
  with no alien on screen).
- Pause also on V, N, comma, / and left SHIFT; the movement keys come in
  groups of up to seven.
- A death sends the disc sequence back to a checkpoint, and the extra
  given there is taken away.
- A speech test program, older versions of routines and a loader's
  remains are left in the image (`facts.md`, Build).

## Open questions

- Which release is this image? It came from the OneLoad64 games
  collection, version 5, and is not REMEMBER's version; whether the code
  is the original release's or another crack's is unknown.
