// Deterministic screenshot staging for ?shot=start|farm|kitchen|end (and caught) with &seed=N.
// Stages real world entities and advances real fixed simulation steps so every screenshot reads
// clearly at a glance and reproduces identically on every run.
import { FIELD, PLAYER, STAGES, STEP } from './config.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import {
  COVER_HAYSTACK,
  OBS_COUNTER,
  OBS_FENCE,
  OBS_OVEN,
} from './world.js';

/** Stage a deterministic screenshot scene and return { screen, best }. */
export function stageShot(name, world) {
  world.reset();
  const s = world.state;
  const p = s.player;

  if (name === 'farm') {
    // Stage 1: Farmyard Dawn — farmer chasing close behind, turkey mid-leap over fence, haystack ahead
    s.stage = STAGES[0];
    s.stageBannerTimer = 0;
    s.distance = 168;
    s.score = 145;
    s.cornCount = 9;
    s.lives = 3;
    s.farmer.gap = 24;
    s.farmer.state = 'chasing';
    s.farmer.stridePhase = 1.1;

    p.x = 435;
    p.y = FIELD.groundY - PLAYER.standHeight - 115;
    p.vy = -120;
    p.grounded = false;
    p.stamina = 76;
    p.runPhase = 2.4;

    s.obstacles = [
      {
        id: 1,
        kind: OBS_FENCE,
        x: 452,
        y: FIELD.groundY - 78,
        width: 56,
        height: 78,
        hit: false,
        nearMissed: false,
      },
    ];
    s.covers = [
      {
        id: 2,
        kind: COVER_HAYSTACK,
        x: 820,
        y: FIELD.groundY - 118,
        width: 164,
        height: 118,
      },
    ];
    s.corns = [
      { id: 3, x: 525, y: FIELD.groundY - 210, width: 30, height: 44, collected: false, bobPhase: 0.4 },
      { id: 4, x: 585, y: FIELD.groundY - 190, width: 30, height: 44, collected: false, bobPhase: 1.1 },
      { id: 5, x: 740, y: FIELD.groundY - 122, width: 30, height: 44, collected: false, bobPhase: 1.8 },
    ];
    s.knives = [];
    s.particles = [
      { x: 405, y: FIELD.groundY - 14, vx: 0, vy: 0, size: 7, color: '#d9b589', life: 0.3, maxLife: 0.4, kind: 'dust' },
      { x: 428, y: FIELD.groundY - 22, vx: 0, vy: 0, size: 6, color: '#d9b589', life: 0.3, maxLife: 0.4, kind: 'dust' },
      { x: 670, y: 210, vx: 0, vy: 0, size: 9, color: '#d94e28', life: 2.0, maxLife: 3.0, kind: 'leaf' },
      { x: 1090, y: 175, vx: 0, vy: 0, size: 8, color: '#e8952e', life: 2.0, maxLife: 3.0, kind: 'leaf' },
    ];
    s.popups = [];
    return { screen: SCREEN_PLAY, best: 320 };
  }

  if (name === 'kitchen') {
    // Stage 3: Kitchen Chaos — oven blasting flame, telegraphing oven, falling knife, counter, SPOTTED!
    s.stage = STAGES[2];
    s.stageBannerTimer = 0;
    s.distance = 1035;
    s.score = 485;
    s.cornCount = 24;
    s.nearMissCount = 5;
    s.lives = 2;
    s.farmer.gap = 22;
    s.farmer.state = 'spotted';
    s.farmer.spottedTimer = 1.0;
    s.farmer.stridePhase = 0.7;

    p.x = 420;
    p.y = FIELD.groundY - PLAYER.standHeight;
    p.grounded = true;
    p.dashing = true;
    p.stamina = 62;
    p.runPhase = 1.6;

    s.covers = [];
    s.obstacles = [
      {
        id: 10,
        kind: OBS_OVEN,
        x: 610,
        y: FIELD.groundY - 128,
        width: 118,
        height: 128,
        ovenPhase: 'blast',
        ovenTimer: 0.55,
        flameLength: 145,
        hit: false,
        nearMissed: false,
      },
      {
        id: 11,
        kind: OBS_COUNTER,
        x: 865,
        y: FIELD.groundY - 84,
        width: 106,
        height: 84,
        hit: false,
        nearMissed: false,
      },
      {
        id: 12,
        kind: OBS_OVEN,
        x: 1055,
        y: FIELD.groundY - 128,
        width: 118,
        height: 128,
        ovenPhase: 'warn',
        ovenTimer: 0.45,
        flameLength: 145,
        hit: false,
        nearMissed: false,
      },
    ];
    s.knives = [
      {
        id: 20,
        x: 332,
        y: 256,
        width: 34,
        height: 108,
        vy: 640,
        warnTimer: 0,
        stuckTimer: 0,
        hit: false,
        nearMissed: true,
      },
      {
        id: 21,
        x: 785,
        y: -40,
        width: 34,
        height: 108,
        vy: 640,
        warnTimer: 0.25,
        stuckTimer: 0,
        hit: false,
        nearMissed: false,
      },
    ];
    s.corns = [
      { id: 30, x: 902, y: FIELD.groundY - 160, width: 30, height: 44, collected: false, bobPhase: 0.2 },
    ];
    s.popups = [
      { text: 'NEAR MISS +5', x: 356, y: 392, vy: -20, life: 0.85, maxLife: 1.15, color: '#ffd45c', scale: 1.1 },
    ];
    s.particles = [
      { x: 645, y: FIELD.groundY - 220, vx: 0, vy: 0, size: 7, color: '#ffa126', life: 0.3, maxLife: 0.4, kind: 'spark' },
      { x: 695, y: FIELD.groundY - 255, vx: 0, vy: 0, size: 6, color: '#fff2a6', life: 0.3, maxLife: 0.4, kind: 'spark' },
      { x: 668, y: FIELD.groundY - 190, vx: 0, vy: 0, size: 8, color: '#ff4e1a', life: 0.3, maxLife: 0.4, kind: 'spark' },
    ];
    s.elapsed = 12.4;
    return { screen: SCREEN_PLAY, best: 620 };
  }

  if (name === 'end') {
    s.stage = STAGES[2];
    s.distance = 1200;
    s.score = 945;
    s.cornCount = 34;
    s.nearMissCount = 8;
    s.lives = 3;
    s.elapsed = 3.2;
    return { screen: SCREEN_ESCAPED, best: 945 };
  }

  if (name === 'caught') {
    s.stage = STAGES[2];
    s.distance = 964;
    s.score = 410;
    s.cornCount = 19;
    s.nearMissCount = 3;
    s.lives = 0;
    s.farmer.gap = 0;
    s.farmer.state = 'spotted';
    return { screen: SCREEN_CAUGHT, best: 620 };
  }

  // Default: 'start' title cover composition — vibrant Farmyard Dawn with big running turkey & chasing farmer
  for (let i = 0; i < 45; i += 1) {
    world.step(STEP, { direction: 0 }, true);
  }
  p.x = 760;
  p.y = FIELD.groundY - PLAYER.standHeight;
  p.facing = 1;
  s.covers = [];
  s.obstacles = [];
  s.corns = [
    { id: 40, x: 955, y: FIELD.groundY - 115, width: 30, height: 44, collected: false, bobPhase: 0.3 },
    { id: 41, x: 1025, y: FIELD.groundY - 145, width: 30, height: 44, collected: false, bobPhase: 1.0 },
  ];
  s.particles = [
    { x: 540, y: FIELD.groundY - 125, vx: 0, vy: 0, size: 10, color: '#e28426', life: 0.8, maxLife: 1.0, kind: 'feather' },
    { x: 585, y: FIELD.groundY - 95, vx: 0, vy: 0, size: 9, color: '#b8421b', life: 0.8, maxLife: 1.0, kind: 'feather' },
    { x: 495, y: FIELD.groundY - 150, vx: 0, vy: 0, size: 8, color: '#f2be4b', life: 0.8, maxLife: 1.0, kind: 'feather' },
  ];
  return { screen: SCREEN_TITLE, best: 620 };
}
