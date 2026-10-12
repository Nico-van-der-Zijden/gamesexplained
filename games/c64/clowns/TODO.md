# Clowns — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

Tier: **Silver**, 12 October 2026. Coverage 100 % of the 8,192-byte ROM.

For Gold: a human's pass through `index.html`, section by section, with
`copy` in `game.json` set to what it was.

Open questions:

- Which language and compiler produced `$E000`-`$EFFF` (`facts.md`, "Build").
- Where the character ROM shows the video chip in the Ultimax configuration
  (not measured; the game never uses it).

Ideas for follow-ups:

- A Play tab: the physics, the see-saw zones and the collision test are
  ported or tabled already; a paddle on the mouse would make it playable.
- A Sound section with the bounce, the pop and the falling whistle, ported
  from `sound_tick` (`$F36B`) and played through the site's SID model.
- A stepper for one jump: the launch speeds by zone and level, with the
  random parts and the growth, drawn as an arc.
- Compare the 1983 disk version (the C64-Wiki says it takes a joystick)
  with this cartridge.
