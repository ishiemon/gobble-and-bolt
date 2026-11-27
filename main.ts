// Gobble and Bolt! — the hand-in program for turkey-run-game-01 (Node 22, standard library only).
// The game itself lives in this directory's game/ folder: plain static files a desktop browser
// loads fully offline, an original side-scrolling escape in which a turkey sprints 1,200 metres
// through a farmyard, a cornfield road and a kitchen while the farmer chases it from the left.
// This program copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
// The four screenshots in screenshots/ are real renders of the game: the title cover, a
// farmyard run with the farmer closing in, the kitchen at full chaos, and the forest ending.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The dossier is built under the scorer's own caps: text_max_bytes shapes the bytes, and the
// remaining limits refuse anything the scorer would refuse anyway — at most 4 screenshots of
// 256 KiB each, at most 993 files and 48 MiB under game/, and no game path over 1000 bytes.
// Gobble and Bolt! sits far inside all of them: nine small game files and four JPEG screenshots.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
