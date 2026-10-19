# Lemmings — TODO

Tier: **Bronze**. Coverage 18.8 % (menu 16.1 %, game 24.1 %, from
`parts.py`, 19 October 2026).

## For Silver

- Coverage to 100 % in both parts: the play engine `$0700`-`$35FF`, the
  loader `$CC00`-`$CFFF`, the menu `$3600`-`$B3FF` and `$E000`-`$F9FF`.
  `listing.py` lists the stretches the ledger does not yet count.
- Say what the RAM under the I/O chips holds (`$D000`-`$DFFF` in the game
  part: the text templates from `$D535` and more), in game.json or by
  labels.
- Unpack the disk's files with the game's unpacker (`$CC3B`) and map them
  onto memory, so `orientation.md`'s file table says where each lands.
- Watch the menu's load to confirm its ranges, which come from a
  comparison of the title with play.
- A hand-over for the game part stopped on one instruction, rather than
  the briefing screen.
- Every **open** row in `features.md`: the skills, the keys, the release
  rate, pause and nuke, the bomber's count, the scroll, the samples, the
  music and its ten tunes, the maximum number of lemmings.
- Where the code sheet's number at `$A092` comes from.
- `facts.md`, verify (`60-verify`), the minisite (`70-minisite`) with a
  player for every tune.

## Questions for the contributor

- Does the printed manual survive? The code sheet asks for numbers from
  it, and its page with the lemming would make a good picture.
- Is `lemmings0.tap` tape 1 side B, and do the other files load on a real
  cassette deck or another emulator?

## Article ideas

- The play area drawn with sprites, re-used every 21 lines, while the
  lemmings are characters: the reverse of how most C64 games work.
- One level per file on four disk sides, and a loader that knows which
  side each file is on.
- The title scroller's disclaimer and greetings.
