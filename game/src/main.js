// Bootstraps the game loop, sound synthesis, input handling, screen transitions,
// accessibility announcements, and deterministic ?shot= staging for screenshots.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_JUMP,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import {
  createRenderer,
  SCREEN_CAUGHT,
  SCREEN_ESCAPED,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
} from './render.js';
import {
  createWorld,
  EVENT_CAUGHT,
  EVENT_CORN,
  EVENT_ESCAPED,
  EVENT_FLUTTER,
  EVENT_HEART,
  EVENT_HIDE,
  EVENT_HIT,
  EVENT_JUMP,
  EVENT_NEAR_MISS,
  EVENT_OVEN_BLAST,
  EVENT_OVEN_WARN,
  EVENT_RECHARGE,
  EVENT_SHOTGUN_AIM,
  EVENT_SHOTGUN_FIRE,
  EVENT_SPOTTED,
  EVENT_STAGE_UP,
} from './world.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage may be disabled in private browsing; ignore safely.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toLogicalPoint);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pendingJump = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    pendingJump = false;
    screen = SCREEN_PLAY;
    audio.playGobble();
    announce(`Run started. ${LIVES} lives. Stage 1: Farmyard Dawn.`);
  }

  function finishGame(nextScreen) {
    screen = nextScreen;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (nextScreen === SCREEN_ESCAPED) {
      audio.playEscape();
      announce(`Escaped to the forest! Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.playCaught();
      announce(`Caught for dinner at ${Math.floor(world.state.distance)} meters. Score ${world.state.score}.`);
    }
  }

  function handleEvents(events) {
    if (events & EVENT_JUMP) audio.playJump();
    if (events & EVENT_FLUTTER) audio.playFlutter();
    if (events & EVENT_CORN) audio.playCorn();
    if (events & EVENT_HEART) {
      audio.playHeart();
      announce(`Heart recovered! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_NEAR_MISS) audio.playNearMiss();
    if (events & EVENT_HIDE) audio.playHide();
    if (events & EVENT_SPOTTED) audio.playSpotted();
    if (events & EVENT_OVEN_WARN) audio.playOvenWarn();
    if (events & EVENT_OVEN_BLAST) audio.playOvenBlast();
    if (events & EVENT_SHOTGUN_AIM) audio.playShotgunAim();
    if (events & EVENT_SHOTGUN_FIRE) audio.playShotgunFire();
    if (events & EVENT_RECHARGE) {
      audio.playRecharge();
      announce(`Broke free! Danger reset. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_STAGE_UP) {
      audio.playStageClear();
      announce(`Stage ${world.state.stage.id}: ${world.state.stage.name}.`);
    }
    if (events & EVENT_HIT) {
      audio.playHit();
      announce(`Hit! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_CAUGHT) {
      finishGame(SCREEN_CAUGHT);
    } else if (events & EVENT_ESCAPED) {
      finishGame(SCREEN_ESCAPED);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.unlock();
      const muted = audio.toggleMute();
      announce(muted ? 'Audio muted.' : 'Audio unmuted.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Resumed.');
      return;
    }
    if (actions & ACTION_JUMP && screen === SCREEN_PLAY) {
      audio.unlock();
      pendingJump = true;
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { direction: 0 }, true);
      return;
    }
    const playerCenterX = world.state.player.x + world.state.player.width / 2;
    const controls = input.readControls(playerCenterX);
    controls.jumpPressed = pendingJump;
    pendingJump = false;
    const events = world.step(STEP, controls, false);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.isMuted());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble and Bolt! Press Enter, Space, or click to escape.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
