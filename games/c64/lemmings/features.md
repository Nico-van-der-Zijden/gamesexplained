# Lemmings — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Lemmings", https://www.c64-wiki.com/wiki/Lemmings, read 19 October 2026: credits, the menu and in-game keys, the eight skills, the four ratings, level passwords, two screenshots and the icon bar (saved in `reference/` as `wiki-*`)
- Codetapper's C64 Site, "The Making of Lemmings", parts 1 and 2, https://codetapper.com/c64/diary-of-a-game/lemmings/the-making-of-lemmings-part-1 and https://codetapper.com/c64/diary-of-a-game/lemmings/the-making-of-lemmings-part-2, read 19 October 2026: the programmer's development diary. Read through a page summariser; its quotations were not checked word for word
- A web search on 19 October 2026 whose result summaries quote Commodore Format (an "unobtrusive multiload"; 30 lemmings at most) and 64'er 2/94 (Psygnosis brought the first copies in February 1994). Second-hand: used for plain claims only
- Mark Knibbs's notes with the disk images (`Lemmings.readme`, 1997): the printing on the three disks
- The game's own screens and text, observed in VICE on 19 October 2026: the intro pictures, the code sheet, the title menu and its scroller, the disk prompt, the level 1 briefing and play

Credits, from the title scroller (`$5A49` in the menu part), which the
C64-Wiki and the diary agree with: "Lemmings by DMA Design", "C64 Version
by E&E SOFTWARE", programmed by Thomas Mittelmeyer, graphics by Leon van
Rooy, Alain Janssen and Nikaj Eyk, audio by Jeroen Tel (Maniacs of Noise),
additional graphics by Remi Ebus and Thomas Mittelmeyer, produced by Greg
Duddle, project management by Remi Ebus, "Copyright 1993 Psygnosis". The
disks are printed © Psygnosis 1994.

## Features

| Feature | Status | Where |
|---|---|---|
| Copy protection: a number from the manual (C64-Wiki's readme copy calls it "enter a word") | live | the code sheet asks for "the 6th number on the page featuring the lemming"; five digits read with GETIN at `$A128`, made a number at `$A0A0`, compared with `$A092` at `$A1AC` (menu part). Typed from `$A092` on three boots, accepted each time |
| Title menu: 1 starts the game, 2 the intro, 3 enters a password, 4 switches music and sound effects, cursor up/down the rating (C64-Wiki) | open | 1 is **live**: it leads to the disk prompt. The other keys were not tried. The menu shows five icons: 1 PLAYER, INTRO, NEW LEVEL, a music note and FUN with arrows (`reference/title.png`) |
| Four ratings, Fun, Tricky, Taxing and Mayhem (C64-Wiki) | confirmed | the names at `$9D64` in the menu part; one disk side each, 25 level files a side (`orientation.md`) |
| 100 levels ("100 brain-teasing levels", title scroller) | confirmed | four sides of 25 level files. The diary's 120 is a plan from during development |
| A password for each level (C64-Wiki lists them) | traced | "Your access code for level XX" (`$DA59`, game part) and "Enter the access code" / "Incorrect Code" (`$9DF5`, menu part). Entering one was not tried |
| Each level's briefing: number of lemmings, percentage to save, release rate, time, rating | live | level 1: "Just dig!", 10 lemmings, 10 % to be saved, release rate 50, 5 minutes, Fun (`reference/briefing-fun1.png`) |
| Eight skills with a count each: climber, floater, bomber, blocker, builder, basher, miner, digger (C64-Wiki) | open | the panel shows eight skill icons, the counts for level 1 show only the digger's 10 (`reference/play-fun1.png`) |
| Keys 1-8 pick a skill, + and - change the release rate, fire gives the skill to the lemming under the cursor (C64-Wiki) | open | |
| Shift Lock pauses; Inst/Del twice blows up every lemming; Run/Stop returns to the menu (C64-Wiki) | open | |
| Mouse or joystick (C64-Wiki, the diary) | traced | the game reads the SID's paddle registers `$D419` and `$D41A` at `$1704` and `$1718`, and the menu at `$A284`: how a 1351 mouse is read. No mouse was attached in VICE. The joystick at `$DC00` |
| The panel shows the type under the cursor, lemmings out, saved percentage and time left (C64-Wiki) | live | "out: 10 in: 000% time 4-31" in play (`reference/play-fun1.png`) |
| A five-second count over a bomber before it explodes (C64-Wiki) | open | |
| The play area scrolls left and right when the cursor reaches its edge; levels are two screens wide at most (C64-Wiki; the diary) | open | |
| The scenery is drawn with sprites, the lemmings in characters (the diary) | confirmed | one recorded frame of play: eight sprites in two groups of four, re-pointed every 21 lines (`orientation.md`, "Steady state") |
| Up to about 100 lemmings on screen (the diary), 30 at most (Commodore Format via a search summary) | open | the two sources disagree |
| Digitised "Let's go" and "Oh no" (the diary) | open | |
| Music by Jeroen Tel, "10 pieces of music" (title scroller) | open | the game part writes the SID from `$30E5`-`$3156` |
| A multiload: the levels come from disk or tape as they are played | live | each level is a file on its rating's disk side; starting the game asks for disk 2 side A (`reference/insert-disk-2a.png`) |
| Messages at the end of a level, by how well it went | traced | "Your time is up!", "All lemmings accounted for.", "You rescued XXX%", "You totally stormed that level!", "Better rethink your strategy before you try this level again!" and others from `$D7B3` to `$D9E2` (game part) |
| A message for finishing all 100 levels | traced | "You are one of the very few players who will complete all the levels. You may consider yourself an ... player!" at `$DACA` (game part) |

## Beyond the documentation

Found in the code, not in the manual.

- A line of text in the menu part at `$A184`, between the code sheet's
  routines: "HACKING AT THE END OF THE LEMNIVERSE". Whether anything shows
  it is open.
- The title scroller holds more than the credits: a greeting list
  ("Jasper, Elvin, Aquilo, Paradize, Mega, 0611 and DS4"), skill hints, the
  Star Trek line "The needs of the many outweigh the needs of the few", and
  a disclaimer ("We take no responsibility for 1. Loss of sleep. 2. Loss of
  hair. 3. Loss of sanity. 4. The kindergarten music.").
- The briefing and end-of-level texts are kept twice: a template with "XX"
  where numbers go from `$D535`, and a copy with the numbers filled
  in from `$5444`.
- The disk has a second boot file, `THE SHORTCUT`, three bytes longer than
  `LEMMINGS` and loaded at the same address. What it skips is open.
- The cassette release names its files with three characters, a kind
  letter, a file letter and a digit for the tape side (seen in the tape
  loader at `$CD94`-`$CDF4`); the disk names have two.

## Open questions

- Every **open** row above.
- Why the cassette set's later sides end in a FILE ERROR in VICE
  (`agent-history.md`).
- Where the code sheet's expected number comes from (the store to `$A092`).
- What `THE SHORTCUT` does differently from `LEMMINGS`.
