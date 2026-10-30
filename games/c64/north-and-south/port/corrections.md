# What the port found in the listing

Porting a routine means reading every instruction of it, and the checks
against the game's code show where that reading was wrong
(`kit/skills/core/70-minisite/play.md`, "What the port finds in the
listing"). Each comment the port showed wrong is corrected in the part's
`symbols.json`, and the listing rebuilt; the count goes in `game.json`'s
`play` row.

| Part | Address | The comment said | The code does | How it showed |
|---|---|---|---|---|
| map | `$23CF` | the `$14` just loaded into X goes unused, so save_window takes picture 8 | save_bytes (`$3330`) reads X: the bytes under a flag place are saved at picture 20's size, a flag place's | `port/test/t-map.js`, `map_save_flag_bg`, written first with picture 8 |
| map | `$2422` | the `$15` loaded into X goes unused, so save_window takes picture 8 | the same for an army place, picture 21 | `map_save_army_bg` |
| map | `$3EE4` | a score moved at random by up to an eighth or a half of a number below it | when the amount rounds down to 0 it returns that 0 in A (`beq` at `$3EFF`), and the score becomes 0 | the port, written from the comment, kept the score; `port/test/t-map.js`, `map_noise` |
| battle | `$A5D3` | each ball marked landed: a crater and the objects near it fall | the bullets are marked landed too and never cleared; after a bridge hit X comes back as `$FF` and the loop lands every spent bullet | the routine traced as ported; seen on the game's code (`work/bridge.js`, Discoveries) |
| battle | `$A6A5` | (the bridge's damage drawn) | drawn through `bat_picture` with the picture in X, which comes back as `$FF` in place of the shot's number | the same |
| battle | `$A3FD` | counts the side's riders drawn on the field | counts them with X, and leaves X two below the side's first rider | the battle in lockstep, `cp-bat-hu62-005` |
| battle | `$9FD2` | each rider moved in turn | after an edge that starts a turn the loop goes on from the X `$A3FD` leaves: the other side's riders, or bytes below the tables | the same |
| fort | `$91C7` | at 0 the raster interrupt off | the enable register gets A, still the timer's `$64`: the raster interrupt off, the sprites' collision interrupt on | ported from the instructions |
| train | `$9338` | the same as the fort's | the same | the same |
