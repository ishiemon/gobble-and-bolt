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
  drawHeight: 206,
  standWidth: 72,
  standHeight: 112,
  crouchWidth: 80,
  crouchHeight: 62,
  moveSpeed: 390,
  jumpVelocity: -760,
  gravity: 1950,
  flutterGravity: 680,
  maxFlutterFall: 175,
  coyoteTime: 0.1,
  jumpBuffer: 0.11,
  invulnerable: 1.5,
  stumbleDuration: 0.45,
  staminaMax: 100,
  dashDrain: 42,
  staminaRegen: 13,
  dashMinStamina: 12,
  dashSpeedMult: 1.48,
};

export const LIVES = 3;

export const FARMER = {
  startGap: 68,
  maxGap: 100,
  visibleGap: 82,
  baseDrain: 2.8,
  stageDrainBonus: 0.9,
  dashGain: 15,
  hideGain: 26,
  hitPenalty: 26,
  spottedPenalty: 8,
  spottedDuration: 1.35,
};

export const SCORING = {
  cornPoints: 10,
  cornStamina: 35,
  nearMissPoints: 5,
  nearMissMargin: 48,
  stealthBonus: 15,
  escapeBonus: 250,
  lifeBonus: 50,
};

export const PALETTE = {
  backdrop: '#18100c',
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
  // Stage 3: Kitchen Chaos
  kitchenWallTop: '#6b3324',
  kitchenWallTileA: '#d9b589',
  kitchenWallTileB: '#b96945',
  kitchenWood: '#522c1a',
  kitchenCounter: '#8c4c2b',
  kitchenCounterTop: '#ebd5b8',
  kitchenFloorA: '#3d251b',
  kitchenFloorB: '#5c3828',
  copper: '#c86e37',
  ovenBody: '#38302e',
  ovenDoor: '#241e1d',
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
  knifeBlade: '#dce3eb',
  knifeEdge: '#ffffff',
  knifeHandle: '#5c311b',
  cornCob: '#f5cb42',
  cornHusk: '#6a8a35',
  // HUD & Panels
  hudBg: 'rgba(28, 17, 12, 0.84)',
  hudBorder: '#d99b38',
  panelBg: 'rgba(30, 18, 13, 0.92)',
  text: '#fff6e6',
  muted: '#d1bca1',
  gold: '#f5bf42',
  danger: '#eb4438',
  safe: '#68b849',
  warn: '#f08a24',
  stamina: '#49b6d6',
  heart: '#e33b3b',
  heartEmpty: '#4d362d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'gobble-and-bolt.best';
