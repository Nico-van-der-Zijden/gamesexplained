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
