# gobble-and-bolt

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/ishiemon/gobble-and-bolt/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/ishiemon/gobble-and-bolt/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Gobble and Bolt! is an original side-scrolling turkey escape game that plays
offline in a desktop browser. You are the turkey, and Thanksgiving dinner is
the one place you refuse to be. Sprint 1,200 metres through three stages —
Farmyard Dawn, Cornfield Road and Kitchen Chaos — while the farmer chases,
searches and corners you from the left of the screen. Jump fences and
counters, duck into hay bales, barrels and corn rows to break his line of
sight, dodge falling carving knives and a telegraphed oven blast, grab corn
for score and stamina, and reach the forest at sunrise. The HUD always shows
score, distance with a progress bar, the stage name, a Farmer Gap meter,
stamina and three hearts. All art and sound are made in code: no image,
sound or font files, no network requests.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Keys: Arrows / WASD move, `Space` jumps (hold to flap and fall slower),
`Down` crouches and hides in a hiding spot, `Shift` dashes, `P` pauses,
`M` mutes, `Enter` / `R` starts and restarts.
Mouse: click to jump, hold the right button to crouch, and the turkey
leans toward the pointer.

To hand the game in (what the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `main.ts` — copies `game/` and `screenshots/` to the output folder and
  writes `dossier.json` with the vendored make.fun library.
- `game/` — the playable game, plain static files, no build step.
  - `game/src/config.js` — stages, tuning numbers and the autumn palette
  - `game/src/world.js` — simulation, farmer chase and search AI, hazards
  - `game/src/render.js` — every drawing: stages, turkey, farmer, HUD, screens
  - `game/src/audio.js` — WebAudio synthesis: gobbles, alarms, jingles
  - `game/src/input.js` — keyboard and mouse
  - `game/src/shots.js` — deterministic scenes used for the screenshots
- `screenshots/` — real renders of the game in a browser.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
