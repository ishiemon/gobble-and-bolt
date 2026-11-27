// Deterministic screenshot staging for ?shot=start|farm|kitchen|end (and cornfield/caught) with &seed=N.
// Stages real world entities and advances real fixed simulation steps so every screenshot reads
// clearly at a glance and reproduces identically on every run.
import { FIELD, PLAYER, SHOTGUN, STAGES, STEP } from './config.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import {
  COVER_CORN_PATCH,
  COVER_HAYSTACK,
  OBS_BARREL,
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
    // Stage 1: Farmyard Dawn — aproned farmer with shotgun chasing, turkey leaping white/red fence, heart & haystack ahead
    s.stage = STAGES[0];
    s.stageBannerTimer = 0;
    s.distance = 168;
    s.score = 145;
    s.cornCount = 9;
    s.lives = 3;
    s.farmer.gap = 30;
    s.farmer.state = 'chasing';
    s.farmer.stridePhase = 1.1;

    p.x = 435;
    p.y = FIELD.groundY - PLAYER.standHeight - 110;
    p.vy = -120;
    p.grounded = false;
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
    ];
    s.hearts = [
      { id: 6, x: 742, y: FIELD.groundY - 126, width: 36, height: 36, collected: false, bobPhase: 0.8 },
    ];
    s.knives = [];
    s.pellets = [];
    s.particles = [
      { x: 405, y: FIELD.groundY - 14, vx: 0, vy: 0, size: 7, color: '#d9b589', life: 0.3, maxLife: 0.4, kind: 'dust' },
      { x: 428, y: FIELD.groundY - 22, vx: 0, vy: 0, size: 6, color: '#d9b589', life: 0.3, maxLife: 0.4, kind: 'dust' },
      { x: 670, y: 210, vx: 0, vy: 0, size: 9, color: '#d94e28', life: 2.0, maxLife: 3.0, kind: 'leaf' },
      { x: 1090, y: 175, vx: 0, vy: 0, size: 8, color: '#e8952e', life: 2.0, maxLife: 3.0, kind: 'leaf' },
    ];
    s.popups = [];
    return { screen: SCREEN_PLAY, best: 320 };
  }

  if (name === 'hide') {
    // Verification scene: turkey hiding inside fluffy haystack with peeking eyes while farmer searches
    s.stage = STAGES[0];
    s.stageBannerTimer = 0;
    s.distance = 225;
    s.score = 190;
    s.cornCount = 11;
    s.lives = 3;
    s.farmer.gap = 52;
    s.farmer.state = 'searching';
    s.farmer.searchTimer = 0.6;
    s.farmer.stridePhase = 0.4;

    p.x = 510;
    p.y = FIELD.groundY - PLAYER.crouchHeight;
    p.width = PLAYER.crouchWidth;
    p.height = PLAYER.crouchHeight;
    p.grounded = true;
    p.crouching = true;
    p.hidden = true;
    p.inCoverZone = true;
    p.activeCoverId = 2;
    p.runPhase = 0;

    s.obstacles = [
      { id: 1, kind: OBS_FENCE, x: 960, y: FIELD.groundY - 78, width: 56, height: 78, hit: false, nearMissed: false },
    ];
    s.covers = [
      { id: 2, kind: COVER_HAYSTACK, x: 470, y: FIELD.groundY - 118, width: 164, height: 118 },
    ];
    s.corns = [
      { id: 3, x: 740, y: FIELD.groundY - 82, width: 30, height: 44, collected: false, bobPhase: 0.6 },
    ];
    s.hearts = [];
    s.knives = [];
    s.pellets = [];
    s.particles = [];
    s.popups = [];
    s.elapsed = 2.1;
    return { screen: SCREEN_PLAY, best: 320 };
  }

  if (name === 'cornfield') {
    // Stage 2: Cornfield Road — no falling knives, farmer telegraphing low shotgun shot (JUMP!), corn patch & blue barrel
    s.stage = STAGES[1];
    s.stageBannerTimer = 0;
    s.distance = 560;
    s.score = 310;
    s.cornCount = 17;
    s.lives = 2;
    s.farmer.gap = 42;
    s.farmer.state = 'chasing';
    s.farmer.stridePhase = 0.8;
    s.farmer.shotgun = {
      phase: 'aim',
      timer: 0.45,
      maxTimer: SHOTGUN.aimDurationStage2,
      aimY: SHOTGUN.lowAimY,
      aimKind: 'low',
      fireFlash: 0,
    };

    p.x = 460;
    p.y = FIELD.groundY - PLAYER.standHeight - 92;
    p.grounded = false;
    p.runPhase = 1.9;

    s.covers = [
      { id: 50, kind: COVER_CORN_PATCH, x: 740, y: FIELD.groundY - 148, width: 176, height: 148 },
    ];
    s.obstacles = [
      { id: 51, kind: OBS_BARREL, x: 1010, y: FIELD.groundY - 74, width: 70, height: 74, hit: false, nearMissed: false },
    ];
    s.knives = [];
    s.pellets = [];
    s.corns = [
      { id: 52, x: 640, y: FIELD.groundY - 145, width: 30, height: 44, collected: false, bobPhase: 0.4 },
    ];
    s.hearts = [];
    s.elapsed = 7.2;
    return { screen: SCREEN_PLAY, best: 620 };
  }

  if (name === 'kitchen') {
    // Stage 3: Kitchen Chaos — low-contrast tile wall, shotgun telegraph, teal counter, oven blast & warn, falling knife
    s.stage = STAGES[2];
    s.stageBannerTimer = 0;
    s.distance = 1035;
    s.score = 485;
    s.cornCount = 24;
    s.nearMissCount = 5;
    s.lives = 2;
    s.farmer.gap = 26;
    s.farmer.state = 'spotted';
    s.farmer.spottedTimer = 1.0;
    s.farmer.stridePhase = 0.7;
    s.farmer.shotgun = {
      phase: 'aim',
      timer: 0.42,
      maxTimer: SHOTGUN.aimDurationStage3,
      aimY: SHOTGUN.highAimY,
      aimKind: 'high',
      fireFlash: 0,
    };

    p.x = 415;
    p.y = FIELD.groundY - PLAYER.crouchHeight;
    p.width = PLAYER.crouchWidth;
    p.height = PLAYER.crouchHeight;
    p.grounded = true;
    p.crouching = true;
    p.dashing = false;
    p.runPhase = 1.6;

    s.covers = [];
    s.obstacles = [
      {
        id: 10,
        kind: OBS_OVEN,
        x: 615,
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
    s.pellets = [];
    s.corns = [
      { id: 30, x: 902, y: FIELD.groundY - 160, width: 30, height: 44, collected: false, bobPhase: 0.2 },
    ];
    s.hearts = [];
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

  // Default: 'start' title cover composition — vibrant Farmyard Dawn with big running turkey & aproned shotgun farmer
  for (let i = 0; i < 45; i += 1) {
    world.step(STEP, { direction: 0 }, true);
  }
  p.x = 760;
  p.y = FIELD.groundY - PLAYER.standHeight;
  p.facing = 1;
  s.covers = [];
  s.obstacles = [];
  s.hearts = [];
  s.pellets = [];
  s.corns = [
    { id: 40, x: 955, y: FIELD.groundY - 115, width: 30, height: 44, collected: false, bobPhase: 0.3 },
    { id: 41, x: 1025, y: FIELD.groundY - 145, width: 30, height: 44, collected: false, bobPhase: 1.0 },
  ];
  s.particles = [
    { x: 540, y: FIELD.groundY - 125, vx: 0, vy: 0, size: 10, color: '#e28426', life: 0.8, maxLife: 1.0, kind: 'feather' },
    { x: 585, y: FIELD.groundY - 95, vx: 0, vy: 0, size: 9, color: '#b8421b', life: 0.8, maxLife: 1.0, kind: 'feather' },
    { x: 495, y: FIELD.groundY - 150, vx: 0, vy: 0, size: 8, color: '#f2be4b', life: 0.8, maxLife: 1.0, kind: 'feather' },
    { x: 640, y: FIELD.groundY - 165, vx: 0, vy: 0, size: 9, color: '#d94e28', life: 0.85, maxLife: 1.0, kind: 'leaf' },
    { x: 1090, y: FIELD.groundY - 210, vx: 0, vy: 0, size: 10, color: '#f2c249', life: 0.85, maxLife: 1.0, kind: 'leaf' },
    { x: 705, y: FIELD.groundY - 12, vx: 0, vy: 0, size: 9, color: '#d9b589', life: 0.55, maxLife: 1.0, kind: 'dust' },
    { x: 675, y: FIELD.groundY - 20, vx: 0, vy: 0, size: 7, color: '#d9b589', life: 0.45, maxLife: 1.0, kind: 'dust' },
  ];
  return { screen: SCREEN_TITLE, best: 620 };
}
