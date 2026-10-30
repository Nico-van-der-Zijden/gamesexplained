## next · 2026-10-30 · North & South (C64) · Vai with Claude

- **Read an interrupt's byte as often as the game does.** The lockstep
  hands the port, in turn, every value the game read of a byte in the
  stretch. In North & South every routine passed its checks alone, and the
  battle, the fort, the train and the map then parted from the game for
  one reason each time: the port read such a byte a different number of
  times than the game. `guard_stand` read the guard's x low byte where the
  game tests the high byte first and reads the low one only when it is 0;
  both random-number routines read their seed once where the game loads
  it twice and loads back the sum it has just stored, and the frame
  interrupt draws from the same bytes; a dog's run and the cells under a
  fighter's feet were read straight from memory. Read the same number of
  times on the same paths, all 62 battle moments, 36 fort moments and 19
  train moments ran to their part's end beside the game.
- **Meet the game's clock at an exit that reads the raster.** Each part
  blanks the screen at its end by writing `$D011` back as it stands, and
  the port's estimate of its own time put it on the other side of line
  256 now and then. A checkpoint at the exit's own instruction made every
  exit agree, as the clock meets the game's at each checkpoint, where
  leaving the bytes out of the comparison would have hidden it.
