// Tuning constants, stage definitions, and unified autumn palette for Gobble and Bolt!
// The logical playfield is fixed at 1280x720; the renderer scales it cleanly to any viewport.

export const FIELD = {
  width: 1280,
  height: 720,
  groundY: 604,
};

/** Fixed simulation step (60 Hz). */
export const STEP = 1 / 60;

/** Total escape distance in meters and pixel-to-meter conversion. */
export const GOAL_DISTANCE = 1200;
export const PIXELS_PER_METER = 18;

/** Three progressive stages from the farmyard dawn to the kitchen escape. */
export const STAGES = [
  {
    id: 1,
    name: 'Farmyard Dawn',
    shortName: '1 · FARMYARD DAWN',
    startM: 0,
    endM: 400,
    baseSpeed: 340,
    clearBonus: 0,
  },
  {
    id: 2,
    name: 'Cornfield Road',
    shortName: '2 · CORNFIELD ROAD',
    startM: 400,
    endM: 800,
    baseSpeed: 395,
    clearBonus: 50,
  },
  {
    id: 3,
    name: 'Kitchen Chaos',
    shortName: '3 · KITCHEN CHAOS',
    startM: 800,
    endM: 1200,
    baseSpeed: 445,
    clearBonus: 100,
  },
];

export const PLAYER = {
  minX: 200,
  maxX: 980,
  homeX: 430,
  drawHeight: 184,
  standWidth: 76,
  standHeight: 124,
  crouchWidth: 84,
  crouchHeight: 68,
  moveSpeed: 390,
  jumpVelocity: -760,
  gravity: 1950,
  flutterGravity: 680,
  maxFlutterFall: 175,
  coyoteTime: 0.1,
  jumpBuffer: 0.11,
  invulnerable: 1.85,
  stumbleDuration: 0.36,
  dashSpeedMult: 1.46,
  hideEnterMargin: 16,
  hideExitMargin: -12,
  hideGraceDuration: 0.28,
};

export const LIVES = 3;

export const FARMER = {
  startGap: 72,
  maxGap: 100,
  visibleGap: 84,
  rechargeGap: 72,
  baseDrain: 2.6,
  stageDrainBonus: 0.85,
  dashGain: 7.5,
  hideGain: 28,
  hitPenalty: 8,
  hitMinGap: 15,
  spottedPenalty: 4,
  spottedPenaltyCooldown: 2.5,
  spottedDuration: 1.25,
};

export const SHOTGUN = {
  aimDurationStage2: 0.95,
  aimDurationStage3: 0.90,
  pelletSpeed: 1050,
  pelletCount: 3,
  pelletRadius: 6,
  lowAimY: FIELD.groundY - 44,
  highAimY: FIELD.groundY - 102,
  stage2Interval: [2.5, 3.5],
  stage3Interval: [3.3, 4.5],
};

export const SCORING = {
  cornPoints: 10,
  nearMissPoints: 5,
  nearMissMargin: 48,
  stealthBonus: 15,
  escapeBonus: 250,
  lifeBonus: 50,
  heartFullBonus: 40,
  heartFullGauge: 18,
};

export const PALETTE = {
  backdrop: '#18100c',
  ink: '#1a0f0a',
  // Stage 1: Farmyard Dawn
  dawnTop: '#4c2638',
  dawnMid: '#b94d32',
  dawnLow: '#f09d46',
  sun: '#ffe399',
  farmHillFar: '#703d34',
  farmHillNear: '#532d22',
  barnRed: '#9d3124',
  barnTrim: '#f2e4c9',
  silo: '#9c8a79',
  farmGround: '#6b4423',
  farmGrass: '#b8762d',
  straw: '#e6b84d',
  strawDark: '#b38228',
  // Stage 2: Cornfield Road
  cornSkyTop: '#2d3b54',
  cornSkyMid: '#b5562c',
  cornSkyLow: '#f2af4a',
  cornStalk: '#7c8733',
  cornStalkDark: '#4f5a22',
  cornRoad: '#5a3a22',
  cornDust: '#9f6d3b',
  // Stage 3: Kitchen Chaos (low-contrast tiles to prevent flicker)
  kitchenWallTop: '#5c3326',
  kitchenWallTileA: '#7a5443',
  kitchenWallTileB: '#6e4a3a',
  kitchenWallMortar: 'rgba(42, 23, 15, 0.28)',
  kitchenWood: '#4a2819',
  kitchenCounter: '#2d5c69',
  kitchenCounterTop: '#d7edf0',
  kitchenFloorA: '#3b261d',
  kitchenFloorB: '#462e23',
  copper: '#c86e37',
  // High-contrast distinct obstacle colors
  fenceWhite: '#f4eee2',
  fenceShade: '#cfc3ae',
  fenceTip: '#d93829',
  barrelBlue: '#3b6a8c',
  barrelBlueLight: '#5a8eb3',
  barrelBlueDark: '#26465e',
  barrelBand: '#e8b948',
  counterTeal: '#2d5c69',
  counterTealDark: '#1f424d',
  counterTop: '#d7edf0',
  counterTopShade: '#a4c4c9',
  ovenBody: '#252c38',
  ovenHighlight: '#475569',
  ovenTrim: '#94a8bc',
  ovenDoor: '#161b24',
  ovenGlow: '#ff6e24',
  flameOuter: '#ff4e1a',
  flameMid: '#ffa126',
  flameCore: '#fff2a6',
  // Forest Dawn (Escaped)
  forestTop: '#2b4752',
  forestMid: '#d4743b',
  forestLow: '#ffd17a',
  pineDark: '#233b2e',
  pineMid: '#31543d',
  autumnLeafA: '#d94e28',
  autumnLeafB: '#e8952e',
  autumnLeafC: '#f2c249',
  // Characters
  turkeyBody: '#6e3b1e',
  turkeyBelly: '#8d522c',
  turkeyWing: '#4f2812',
  turkeyTail: ['#5e2a14', '#b8421b', '#e28426', '#f2be4b'],
  turkeyHead: '#5486a8',
  turkeyBeak: '#f2b134',
  turkeyWattle: '#d62e2e',
  farmerSkin: '#f2be96',
  farmerShirt: '#bd3426',
  farmerShirtDark: '#7a1f17',
  farmerDenim: '#304e73',
  farmerApron: '#efe4d0',
  farmerHat: '#e0b251',
  farmerHair: '#5e3c24',
  gunWood: '#734022',
  gunSteel: '#475569',
  gunSteelLight: '#94a3b8',
  shotgunTelegraph: '#ff3b30',
  shotgunPellet: '#ffe066',
  knifeBlade: '#dce3eb',
  knifeEdge: '#ffffff',
  knifeHandle: '#5c311b',
  cornCob: '#f5cb42',
  cornHusk: '#6a8a35',
  // HUD & Panels
  hudBg: 'rgba(28, 17, 12, 0.88)',
  hudBorder: '#d99b38',
  panelBg: 'rgba(30, 18, 13, 0.92)',
  text: '#fff6e6',
  muted: '#d1bca1',
  gold: '#f5bf42',
  danger: '#eb4438',
  safe: '#68b849',
  warn: '#f08a24',
  dash: '#5cc8e6',
  heart: '#e33b3b',
  heartEmpty: '#4d362d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'gobble-and-bolt.best';
