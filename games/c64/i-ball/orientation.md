# I, Ball — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The emulator

VICE v3.13.2, the release `v3.13.2-linux-x86_64-gui.zip` from
github.com/barryw/vice-mcp, in a cloud container with no display. Its
libraries were unpacked into `tools/vice-libs`. `check-emulator` passed 57
of 57 on 26 October 2026; no check failed.

## The image

One program file, `I_Ball.prg`, 64,750 bytes (MD5
`ab57fa0a25cfa9ab7b411317f9a305ca`). Its load address is `$0314`, and it
runs to `$FFFF`: the whole of memory from the KERNAL's RAM vectors up,
with the RAM under the BASIC and KERNAL ROMs and under the I/O area. That
is a memory image of the game, saved whole, not the original tape's
loader and files. Which release it was saved from (the original, or a
crack) is unknown: no group's name or trainer appears in its text, and no
second copy was to hand to compare.

Its first two bytes put the IRQ vector at `$0314` on a hook at `$033C`,
and everything else in `$0316`-`$0333` is the KERNAL's defaults, except
`$0326`, where the file has `$E6B5` for the output vector (the hook
restores all of them anyway).

## From power-on to play

The file cannot be started by loading it with the KERNAL, in VICE or on
a machine. After the first two bytes arrive the IRQ vector points at
`$033C`, and the next interrupt runs the hook before it has loaded; and
`$D000`-`$D3FF`, which holds game data, would go to the video chip, not
to the RAM beneath. VICE's autostart of the file (a disk image, true
drive emulation) shows it: the log says it left the ROM for `$033C`, and
the machine came back to `READY.` with `$6D1D` empty. So the run places
the file in RAM itself (`work/scripts/inject.py`, `session.py`):

1. Hard reset; wait three seconds for `READY.`; stop the machine.
2. Write `$34` to `$01` (RAM everywhere), write the file's bytes for
   `$0316`-`$FFFF`, read them back from the RAM bank (they matched), and
   put `$01` back as it was (`$37`).
3. Write the file's first two bytes to `$0314` last, and let the machine
   run: the next KERNAL interrupt goes to the hook.
4. The hook clears colour RAM and the border, copies the KERNAL's default
   vectors back to `$0314`-`$0333`, waits 25 frames, calls `IOINIT`
   (`$FDA3`), sets `$01` to `$36` and jumps to `$6D1D`, the game's first
   instruction.
5. `work/entry.vsf`: saved at a stopping checkpoint on `$6D1D` (A `$36`,
   X and Y `$FF`, SP `$FB`, `$01` `$36`). Its RAM is the file's, byte for
   byte from `$0316` up, except the two vector bytes the hook restored.
6. About six seconds later the title screen: "FIREBIRD SOFTWARE PRESENTS
   IBALL", "COMMODORE VERSION BY ANDREW BETTS", the four friends to
   rescue, "PRESS FIRE TO PLAY", "1 MUSIC ON 2 FX ON". `work/title.vsf`.
7. Fire on the joystick in port 2 (`$DC00`) starts level 1; fire in port
   1 left the title screen as it was. `work/play.vsf` was saved about
   eight seconds into level 1, with the timer reading 48, at a moment
   looked at in a screenshot.

The listing is built from `work/entry.vsf`: it holds the file as it
loaded, while play has overwritten about 7 KB below `$2000` with what it
builds at run time.

## Steady state

In play `$01` is `$35`: RAM everywhere but the I/O chips, so the game
runs on the hardware vectors at `$FFFA`-`$FFFF`, not the KERNAL's. One
frame of play (`frame.py capture`, `work/frame-play.json`) shows four IRQ
handlers chained through `$FFFE`, each setting the next:

| Vector written at line | Handler named |
|---|---|
| 0 | `$4506` |
| 54 | `$456D` (low byte only) |
| 146 | `$4672` |
| 249 | `$4432` |

On the title screen `$FFFE` held `$6DD7`. Nothing is loaded after the
start: the whole game is in memory.

## The loader, in a paragraph

There is none in the image. Whoever saved the file put a 75-byte hook in
the cassette buffer at `$033C`, which undoes the KERNAL state a load
leaves behind and starts the game at `$6D1D`. The original tape's loader
is not in the file.
