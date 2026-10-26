## next · 2026-10-26 · Into the Eagle's Nest (C64) · Vai with Claude

- **An inverted character set read as a text dump looks like no letters
  at all.** The status panel plainly says KEYS, AMMO and HITS, and the
  cells behind those words index a character set that, printed as 8×8
  cells of `#` and `.`, holds nothing but blocks of dither. An hour went
  into doubting the screen address, the video bank and the snapshot's
  alignment, and into a pixel-perfect redraw of the frame that proved all
  three right. The letters are stored as holes in a solid cell, so the
  text dump drew the field and left the letter as the gap. Rendering the
  set to a PNG and looking at it settled it in one pass. Where a screen
  shows text its character set seems not to have, the set is inverted
  until a picture says otherwise.
- **A port can agree for seventeen hundred calls and still be wrong.**
  The music driver, ported for the page, matched the game's own code
  write for write for 1,802 calls and then drifted by exactly one tick,
  and stayed a tick out from there. The game's end-of-tune routine does
  not return: it resets the counters and jumps back to the top of the
  same call, so the repeat's first notes are played in the call that
  found the end mark, where the port played them in the next one. Only a
  test that ran past the end of the tune could find it. A port of a
  looping driver is tested over more than one time round the loop.
- **A port read off the code by hand is worth less than the code.** Nine
  sound effects were ported by reading each one's set-up out of the
  listing. The test against the game disagreed on almost every frame: the
  writes were in the wrong order and some were missing. Running the
  game's own two routines on the kit's 6502, with the page handing them
  the pieces of memory they read, matched exactly and took a tenth of the
  work. The test is then worth keeping, because what it checks is what
  the page adds: the memory handed over and the entry points called.
- **Correcting a wrong comment is where the discoveries are.** The sample
  found a range of tile codes described as soldiers. They are the chests,
  and reading what they really do turned up the best mechanic in the
  game: shooting a closed chest gives nothing three times in four, and on
  the fourth an even split between 4000 points and an explosion that ends
  the game. A page section and a widget came out of a comment that had to
  be fixed anyway.
