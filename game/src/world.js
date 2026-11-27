// Simulation state, physics, farmer chase AI, shotgun telegraphing, 3-stage progression,
// obstacles, knives, ovens, cover zones, collectibles, and popups for Gobble and Bolt!
import { FARMER, FIELD, GOAL_DISTANCE, LIVES, PIXELS_PER_METER, PLAYER, SCORING, SHOTGUN, STAGES } from './config.js';
import { randomInt, randomPick, randomRange } from './random.js';

export const OBS_FENCE = 'fence';
export const OBS_BARREL = 'barrel';
export const OBS_COUNTER = 'counter';
export const OBS_OVEN = 'oven';

export const COVER_HAYSTACK = 'haystack';
export const COVER_BARREL = 'cover_barrel';
export const COVER_CORN_PATCH = 'corn_patch';
export const COVER_FLOUR_SACK = 'flour_sack';

export const EVENT_JUMP = 1 << 0;
export const EVENT_FLUTTER = 1 << 1;
export const EVENT_CORN = 1 << 2;
export const EVENT_NEAR_MISS = 1 << 3;
export const EVENT_HIDE = 1 << 4;
export const EVENT_SPOTTED = 1 << 5;
export const EVENT_HIT = 1 << 6;
export const EVENT_OVEN_WARN = 1 << 7;
export const EVENT_OVEN_BLAST = 1 << 8;
export const EVENT_STAGE_UP = 1 << 9;
export const EVENT_CAUGHT = 1 << 10;
export const EVENT_ESCAPED = 1 << 11;
export const EVENT_HEART = 1 << 12;
export const EVENT_RECHARGE = 1 << 13;
export const EVENT_SHOTGUN_AIM = 1 << 14;
export const EVENT_SHOTGUN_FIRE = 1 << 15;

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function stageForDistance(distance) {
  if (distance >= STAGES[2].startM) return STAGES[2];
  if (distance >= STAGES[1].startM) return STAGES[1];
  return STAGES[0];
}

/** Create the deterministic world simulation driven by fixed dt steps. */
export function createWorld(random) {
  const player = {
    x: PLAYER.homeX,
    y: FIELD.groundY - PLAYER.standHeight,
    vy: 0,
    width: PLAYER.standWidth,
    height: PLAYER.standHeight,
    grounded: true,
    coyoteTimer: 0,
    jumpBuffer: 0,
    crouching: false,
    hidden: false,
    inCoverZone: false,
    activeCoverId: -1,
    hideGraceTimer: 0,
    dashing: false,
    fluttering: false,
    invulnerable: 0,
    stumbleTimer: 0,
    runPhase: 0,
    facing: 1,
  };

  const farmer = {
    gap: FARMER.startGap,
    state: 'chasing', // 'chasing' | 'searching' | 'spotted'
    spottedTimer: 0,
    spottedPenaltyCooldown: 0,
    searchTimer: 0,
    stridePhase: 0,
    stealthedThisCover: false,
    shotgun: {
      phase: 'idle', // 'idle' | 'aim'
      timer: 0,
      maxTimer: 1,
      aimY: SHOTGUN.lowAimY,
      aimKind: 'low',
      fireFlash: 0,
    },
  };

  const state = {
    player,
    farmer,
    stage: STAGES[0],
    stageBannerTimer: 0,
    distance: 0,
    scrollSpeed: STAGES[0].baseSpeed,
    score: 0,
    cornCount: 0,
    nearMissCount: 0,
    hideCount: 0,
    lives: LIVES,
    elapsed: 0,
    obstacles: [],
    covers: [],
    knives: [],
    pellets: [],
    corns: [],
    hearts: [],
    particles: [],
    popups: [],
    spawnCursorX: 920,
    knifeTimer: 1.8,
    shotgunTimer: 2.2,
    heartCooldownDist: 170,
    flutterSfxCooldown: 0,
    lastCoverId: -1,
    nextId: 1,
  };

  function addPopup(text, x, y, color, scale = 1) {
    if (state.popups.length > 24) state.popups.shift();
    state.popups.push({ text, x, y, vy: -52, life: 1.15, maxLife: 1.15, color, scale });
  }

  function addParticle(x, y, vx, vy, size, color, life, kind = 'dust') {
    if (state.particles.length > 140) state.particles.shift();
    state.particles.push({ x, y, vx, vy, size, color, life, maxLife: life, kind });
  }

  function spawnFeatherBurst(x, y, count) {
    const colors = ['#b8421b', '#e28426', '#f2be4b', '#6e3b1e'];
    for (let i = 0; i < count; i += 1) {
      addParticle(
        x + randomRange(random, -24, 24),
        y + randomRange(random, -36, 12),
        randomRange(random, -190, 140),
        randomRange(random, -280, -70),
        randomRange(random, 6, 12),
        randomPick(random, colors),
        randomRange(random, 0.55, 0.95),
        'feather',
      );
    }
  }

  function spawnCornArc(startX, peakY, count, spacing = 54) {
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const arc = 4 * t * (1 - t);
      state.corns.push({
        id: state.nextId++,
        x: startX + i * spacing,
        y: FIELD.groundY - 58 - arc * peakY,
        width: 30,
        height: 44,
        collected: false,
        bobPhase: i * 0.7,
      });
    }
  }

  function spawnHeartPickup(x, y) {
    state.hearts.push({
      id: state.nextId++,
      x,
      y,
      width: 36,
      height: 36,
      collected: false,
      bobPhase: randomRange(random, 0, Math.PI * 2),
    });
  }

  function spawnObstacleSegment(cursorX, distM) {
    const stageId = stageForDistance(distM).id;
    let widthUsed = 0;

    if (stageId === 1) {
      const roll = random();
      if (roll < 0.34) {
        // Wooden fence to jump over with corn arc above
        const w = 52;
        const h = 74;
        state.obstacles.push({
          id: state.nextId++,
          kind: OBS_FENCE,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
          hit: false,
          nearMissed: false,
        });
        spawnCornArc(cursorX - 24, 118, 3, 48);
        widthUsed = 280;
      } else if (roll < 0.62) {
        // Rolling/stacked wooden barrel hazard
        const w = 64;
        const h = 68;
        state.obstacles.push({
          id: state.nextId++,
          kind: OBS_BARREL,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
          hit: false,
          nearMissed: false,
        });
        spawnCornArc(cursorX + 95, 42, 2, 52);
        widthUsed = 270;
      } else {
        // Haystack or tall barrel cover zone to crouch and lose the farmer
        const isHay = random() < 0.68;
        const w = isHay ? 156 : 112;
        const h = isHay ? 114 : 118;
        state.covers.push({
          id: state.nextId++,
          kind: isHay ? COVER_HAYSTACK : COVER_BARREL,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
        });
        spawnCornArc(cursorX + w + 55, 22, 2, 48);
        widthUsed = w + 250;
      }
    } else if (stageId === 2) {
      const roll = random();
      if (roll < 0.34) {
        // Dense swaying corn patch cover
        const w = 176;
        const h = 148;
        state.covers.push({
          id: state.nextId++,
          kind: COVER_CORN_PATCH,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
        });
        spawnCornArc(cursorX + w + 48, 35, 3, 46);
        widthUsed = w + 240;
      } else if (roll < 0.7) {
        // Fence or double barrel
        const isBarrel = random() < 0.55;
        const w = isBarrel ? 70 : 54;
        const h = isBarrel ? 74 : 78;
        state.obstacles.push({
          id: state.nextId++,
          kind: isBarrel ? OBS_BARREL : OBS_FENCE,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
          hit: false,
          nearMissed: false,
        });
        spawnCornArc(cursorX - 20, 128, 3, 46);
        widthUsed = 265;
      } else {
        // Haystack cover + barrel combo
        const w = 144;
        const h = 112;
        state.covers.push({
          id: state.nextId++,
          kind: COVER_HAYSTACK,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
        });
        state.obstacles.push({
          id: state.nextId++,
          kind: OBS_FENCE,
          x: cursorX + w + 150,
          y: FIELD.groundY - 74,
          width: 52,
          height: 74,
          hit: false,
          nearMissed: false,
        });
        spawnCornArc(cursorX + w + 126, 125, 3, 46);
        widthUsed = w + 360;
      }
    } else {
      // Stage 3: Kitchen Chaos — counters, flour sack cover, and telegraphing ovens
      const roll = random();
      if (roll < 0.38) {
        const w = 118;
        const h = 128;
        state.obstacles.push({
          id: state.nextId++,
          kind: OBS_OVEN,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
          ovenPhase: 'idle', // 'idle' | 'warn' | 'blast' | 'cool'
          ovenTimer: randomRange(random, 0.25, 0.85),
          flameLength: 138,
          hit: false,
          nearMissed: false,
        });
        spawnCornArc(cursorX + 12, 162, 3, 44);
        widthUsed = 310;
      } else if (roll < 0.72) {
        const w = 104;
        const h = 84;
        state.obstacles.push({
          id: state.nextId++,
          kind: OBS_COUNTER,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
          hit: false,
          nearMissed: false,
        });
        spawnCornArc(cursorX + 4, 134, 3, 46);
        widthUsed = 280;
      } else {
        // Flour sack cover inside the kitchen
        const w = 146;
        const h = 112;
        state.covers.push({
          id: state.nextId++,
          kind: COVER_FLOUR_SACK,
          x: cursorX,
          y: FIELD.groundY - h,
          width: w,
          height: h,
        });
        spawnCornArc(cursorX + w + 48, 30, 2, 48);
        widthUsed = w + 240;
      }
    }

    if (distM >= state.heartCooldownDist && distM < GOAL_DISTANCE - 70) {
      spawnHeartPickup(cursorX + widthUsed * 0.55, FIELD.groundY - 122);
      state.heartCooldownDist = distM + randomRange(random, 210, 290);
    }

    return cursorX + widthUsed + randomRange(random, 75, 165);
  }

  function spawnFallingKnife() {
    const stageId = state.stage.id;
    const leadX = state.scrollSpeed * 0.55;
    const targetX = Math.max(
      220,
      Math.min(FIELD.width - 120, player.x + leadX * 0.45 + randomRange(random, -140, 220)),
    );
    state.knives.push({
      id: state.nextId++,
      x: targetX,
      y: -118,
      width: 34,
      height: 108,
      vy: stageId >= 3 ? randomRange(random, 600, 740) : randomRange(random, 510, 630),
      warnTimer: stageId >= 3 ? 0.38 : 0.48,
      stuckTimer: 0,
      hit: false,
      nearMissed: false,
    });
  }

  function populateAhead() {
    while (state.spawnCursorX < FIELD.width + 520) {
      const approxMeters = state.distance + (state.spawnCursorX - player.x) / PIXELS_PER_METER;
      if (approxMeters >= GOAL_DISTANCE - 35) {
        state.spawnCursorX += 400;
        break;
      }
      state.spawnCursorX = spawnObstacleSegment(state.spawnCursorX, approxMeters);
    }
  }

  function reset() {
    player.x = PLAYER.homeX;
    player.y = FIELD.groundY - PLAYER.standHeight;
    player.vy = 0;
    player.width = PLAYER.standWidth;
    player.height = PLAYER.standHeight;
    player.grounded = true;
    player.coyoteTimer = 0;
    player.jumpBuffer = 0;
    player.crouching = false;
    player.hidden = false;
    player.inCoverZone = false;
    player.activeCoverId = -1;
    player.hideGraceTimer = 0;
    player.dashing = false;
    player.fluttering = false;
    player.invulnerable = 0;
    player.stumbleTimer = 0;
    player.runPhase = 0;
    player.facing = 1;

    farmer.gap = FARMER.startGap;
    farmer.state = 'chasing';
    farmer.spottedTimer = 0;
    farmer.spottedPenaltyCooldown = 0;
    farmer.searchTimer = 0;
    farmer.stridePhase = 0;
    farmer.stealthedThisCover = false;
    farmer.shotgun.phase = 'idle';
    farmer.shotgun.timer = 0;
    farmer.shotgun.maxTimer = 1;
    farmer.shotgun.aimY = SHOTGUN.lowAimY;
    farmer.shotgun.aimKind = 'low';
    farmer.shotgun.fireFlash = 0;

    state.stage = STAGES[0];
    state.stageBannerTimer = 2.0;
    state.distance = 0;
    state.scrollSpeed = STAGES[0].baseSpeed;
    state.score = 0;
    state.cornCount = 0;
    state.nearMissCount = 0;
    state.hideCount = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    state.obstacles = [];
    state.covers = [];
    state.knives = [];
    state.pellets = [];
    state.corns = [];
    state.hearts = [];
    state.particles = [];
    state.popups = [];
    state.spawnCursorX = 920;
    state.knifeTimer = 1.6;
    state.shotgunTimer = 2.2;
    state.heartCooldownDist = 170;
    state.flutterSfxCooldown = 0;
    state.lastCoverId = -1;
    state.nextId = 1;

    populateAhead();
  }

  function hurtPlayer(events, reasonText) {
    if (player.invulnerable > 0) return events;
    if (state.lives <= 0) {
      farmer.gap = 0;
      spawnFeatherBurst(player.x + player.width / 2, player.y + player.height * 0.45, 13);
      addPopup('CAUGHT!', player.x + player.width / 2, player.y - 24, '#ff6847', 1.15);
      return events | EVENT_HIT | EVENT_CAUGHT;
    }
    state.lives = Math.max(0, state.lives - 1);
    player.invulnerable = PLAYER.invulnerable;
    player.stumbleTimer = PLAYER.stumbleDuration;
    player.dashing = false;
    farmer.gap = Math.max(FARMER.hitMinGap, farmer.gap - FARMER.hitPenalty);
    farmer.state = 'spotted';
    farmer.spottedTimer = FARMER.spottedDuration;
    spawnFeatherBurst(player.x + player.width / 2, player.y + player.height * 0.45, 11);
    addPopup(reasonText, player.x + player.width / 2, player.y - 24, '#ff6847', 1.12);
    return events | EVENT_HIT;
  }

  function updateParticlesAndPopups(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'feather') p.vy += 320 * dt;
      else if (p.kind === 'spark') p.vy -= 120 * dt;
    }

    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const pop = state.popups[i];
      pop.life -= dt;
      if (pop.life <= 0) {
        state.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= 0.94;
    }
  }

  /**
   * Advance the simulation by one fixed step.
   * controls: { direction: -1|0|1, jumpPressed: bool, jumpHeld: bool, crouch: bool, dash: bool }
   */
  function step(dt, controls, harmless = false) {
    let events = 0;
    state.elapsed += dt;
    if (state.stageBannerTimer > 0) state.stageBannerTimer = Math.max(0, state.stageBannerTimer - dt);
    if (state.flutterSfxCooldown > 0) state.flutterSfxCooldown = Math.max(0, state.flutterSfxCooldown - dt);

    if (harmless) {
      // Title backdrop animation: lively chase preview with gentle leaves/dust
      player.runPhase += dt * 11;
      farmer.stridePhase += dt * 10.5;
      state.distance = (state.distance + dt * 14) % 380;
      if (random() < dt * 2.5) {
        addParticle(
          FIELD.width + 20,
          randomRange(random, 100, 420),
          randomRange(random, -160, -80),
          randomRange(random, 25, 70),
          randomRange(random, 6, 10),
          randomPick(random, ['#d94e28', '#e8952e', '#f2c249']),
          3.4,
          'leaf',
        );
      }
      updateParticlesAndPopups(dt);
      return events;
    }

    const dir = controls.direction || 0;
    const jumpPressed = Boolean(controls.jumpPressed);
    const jumpHeld = Boolean(controls.jumpHeld);
    const wantsCrouch = Boolean(controls.crouch);
    const wantsDash = Boolean(controls.dash);

    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.stumbleTimer > 0) player.stumbleTimer = Math.max(0, player.stumbleTimer - dt);
    if (farmer.spottedPenaltyCooldown > 0) {
      farmer.spottedPenaltyCooldown = Math.max(0, farmer.spottedPenaltyCooldown - dt);
    }
    if (farmer.shotgun.fireFlash > 0) {
      farmer.shotgun.fireFlash = Math.max(0, farmer.shotgun.fireFlash - dt);
    }

    // Determine dash state (unlimited stamina; risk/reward speed burst)
    player.dashing = wantsDash && !wantsCrouch && player.stumbleTimer === 0;
    if (player.dashing && random() < 0.55) {
      addParticle(
        player.x - 10,
        FIELD.groundY - randomRange(random, 4, 18),
        randomRange(random, -180, -90),
        randomRange(random, -45, -10),
        randomRange(random, 5, 10),
        '#d8b07a',
        0.35,
        'dust',
      );
    }

    // Crouch / stand hitbox transition
    player.crouching = wantsCrouch && player.grounded && player.stumbleTimer === 0;
    const targetH = player.crouching ? PLAYER.crouchHeight : PLAYER.standHeight;
    const targetW = player.crouching ? PLAYER.crouchWidth : PLAYER.standWidth;
    player.width = targetW;
    if (player.grounded) {
      player.height = targetH;
      player.y = FIELD.groundY - player.height;
    } else {
      player.height = PLAYER.standHeight;
    }

    // Coyote time + buffered jump (single jump only, plus gentle air flutter)
    if (player.grounded) player.coyoteTimer = PLAYER.coyoteTime;
    else player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);

    if (jumpPressed) player.jumpBuffer = PLAYER.jumpBuffer;
    else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    if (player.jumpBuffer > 0 && player.coyoteTimer > 0 && player.stumbleTimer === 0) {
      player.grounded = false;
      player.coyoteTimer = 0;
      player.jumpBuffer = 0;
      player.crouching = false;
      player.height = PLAYER.standHeight;
      player.y = FIELD.groundY - player.height;
      player.vy = PLAYER.jumpVelocity;
      events |= EVENT_JUMP;
      for (let i = 0; i < 5; i += 1) {
        addParticle(
          player.x + player.width / 2 + randomRange(random, -18, 18),
          FIELD.groundY - 4,
          randomRange(random, -110, 40),
          randomRange(random, -70, -15),
          randomRange(random, 5, 9),
          '#d9b589',
          0.36,
          'dust',
        );
      }
    }

    // Horizontal positioning within screen bounds
    if (dir !== 0) player.facing = dir > 0 ? 1 : -1;
    const moveMult = player.stumbleTimer > 0 ? 0.45 : player.crouching ? 0.55 : player.dashing ? 1.2 : 1;
    player.x = Math.max(PLAYER.minX, Math.min(PLAYER.maxX, player.x + dir * PLAYER.moveSpeed * moveMult * dt));

    // Vertical physics + air flutter
    player.fluttering = false;
    if (!player.grounded) {
      const isFlutter = jumpHeld && player.vy > 0;
      player.fluttering = isFlutter;
      const g = isFlutter ? PLAYER.flutterGravity : PLAYER.gravity;
      player.vy += g * dt;
      if (isFlutter && player.vy > PLAYER.maxFlutterFall) {
        player.vy = PLAYER.maxFlutterFall;
      }
      if (isFlutter && state.flutterSfxCooldown === 0) {
        state.flutterSfxCooldown = 0.22;
        events |= EVENT_FLUTTER;
      }
      player.y += player.vy * dt;
      if (player.y >= FIELD.groundY - player.height) {
        player.y = FIELD.groundY - player.height;
        player.vy = 0;
        player.grounded = true;
        player.fluttering = false;
      }
    }

    // Cover check with boundary hysteresis & crouch grace period (prevents S-spam / edge flicker death)
    let enterCover = null;
    const pCenterX = player.x + player.width / 2;
    for (let i = 0; i < state.covers.length; i += 1) {
      const c = state.covers[i];
      if (pCenterX >= c.x + PLAYER.hideEnterMargin && pCenterX <= c.x + c.width - PLAYER.hideEnterMargin) {
        enterCover = c;
        break;
      }
    }
    player.inCoverZone = Boolean(enterCover);

    const wasHidden = player.hidden;
    let activeCover = enterCover;
    let stoodUpEarly = false;

    if (wasHidden) {
      if (!player.grounded || player.stumbleTimer > 0) {
        player.hidden = false;
        player.activeCoverId = -1;
        player.hideGraceTimer = 0;
        stoodUpEarly = true;
      } else {
        const heldCover = state.covers.find((c) => c.id === player.activeCoverId) || null;
        const stillInsideHeld =
          heldCover !== null &&
          pCenterX >= heldCover.x + PLAYER.hideExitMargin &&
          pCenterX <= heldCover.x + heldCover.width - PLAYER.hideExitMargin;

        if (stillInsideHeld) {
          activeCover = heldCover;
          if (player.crouching) {
            player.hideGraceTimer = PLAYER.hideGraceDuration;
            player.hidden = true;
          } else {
            player.hideGraceTimer -= dt;
            if (player.hideGraceTimer > 0) {
              player.hidden = true;
            } else {
              player.hidden = false;
              player.activeCoverId = -1;
              player.hideGraceTimer = 0;
              stoodUpEarly = true;
            }
          }
        } else if (enterCover && player.crouching) {
          activeCover = enterCover;
          player.activeCoverId = enterCover.id;
          player.hideGraceTimer = PLAYER.hideGraceDuration;
          player.hidden = true;
        } else {
          player.hideGraceTimer -= dt;
          if (player.hideGraceTimer > 0 && heldCover) {
            player.hidden = true;
            activeCover = heldCover;
          } else {
            player.hidden = false;
            player.activeCoverId = -1;
            player.hideGraceTimer = 0;
            // Only penalize if player exited early inside a zone rather than the cover scrolling away
            stoodUpEarly = Boolean(enterCover);
          }
        }
      }
    } else if (enterCover && player.crouching && player.grounded && player.stumbleTimer === 0) {
      player.hidden = true;
      player.activeCoverId = enterCover.id;
      player.hideGraceTimer = PLAYER.hideGraceDuration;
    }

    if (player.hidden && !wasHidden) {
      events |= EVENT_HIDE;
      farmer.state = 'searching';
      farmer.searchTimer = 0;
      if (farmer.shotgun.phase === 'aim') {
        farmer.shotgun.phase = 'idle';
        farmer.shotgun.timer = 0;
      }
      if (activeCover && activeCover.id !== state.lastCoverId) {
        state.lastCoverId = activeCover.id;
        farmer.stealthedThisCover = false;
        state.hideCount += 1;
      }
      addPopup('HIDDEN!', player.x + player.width / 2, player.y - 24, '#92e372', 1.0);
    } else if (!player.hidden && wasHidden) {
      if (stoodUpEarly) {
        farmer.state = 'spotted';
        farmer.spottedTimer = FARMER.spottedDuration;
        if (farmer.spottedPenaltyCooldown === 0) {
          farmer.gap = Math.max(1, farmer.gap - FARMER.spottedPenalty);
          farmer.spottedPenaltyCooldown = FARMER.spottedPenaltyCooldown;
          events |= EVENT_SPOTTED;
          addPopup('SPOTTED!', player.x + player.width / 2, player.y - 26, '#ff6847', 1.15);
        }
      } else {
        farmer.state = 'chasing';
      }
    }

    // World scroll speed depends on stage, dash, stumble, and stealth
    const currentStage = stageForDistance(state.distance);
    let speed = currentStage.baseSpeed;
    if (player.hidden) speed *= 0.42;
    else if (player.stumbleTimer > 0) speed *= 0.46;
    else if (player.crouching) speed *= 0.72;
    else if (player.dashing) speed *= PLAYER.dashSpeedMult;
    state.scrollSpeed = speed;

    // Advance distance & stage transitions
    const prevStageId = state.stage.id;
    state.distance = Math.min(GOAL_DISTANCE, state.distance + (speed * dt) / PIXELS_PER_METER);
    state.stage = stageForDistance(state.distance);
    if (state.stage.id !== prevStageId) {
      state.score += state.stage.clearBonus;
      state.stageBannerTimer = 2.4;
      state.knifeTimer = Math.max(state.knifeTimer, 1.0);
      events |= EVENT_STAGE_UP;
      addPopup(`${state.stage.name}! +${state.stage.clearBonus}`, FIELD.width / 2, 165, '#ffd45c', 1.25);
    }

    // Update farmer gap & AI state
    if (farmer.spottedTimer > 0) {
      farmer.spottedTimer = Math.max(0, farmer.spottedTimer - dt);
      if (farmer.spottedTimer === 0 && !player.hidden) farmer.state = 'chasing';
    }

    if (player.hidden) {
      farmer.state = 'searching';
      farmer.searchTimer += dt;
      farmer.gap = Math.min(FARMER.maxGap, farmer.gap + FARMER.hideGain * dt);
      if (activeCover && random() < dt * 3.5) {
        const rustleColor =
          activeCover.kind === COVER_CORN_PATCH
            ? '#88a836'
            : activeCover.kind === COVER_FLOUR_SACK
              ? '#f7efe1'
              : activeCover.kind === COVER_BARREL
                ? '#c78c52'
                : '#f5d26b';
        addParticle(
          player.x + player.width * 0.5 + randomRange(random, -28, 28),
          FIELD.groundY - randomRange(random, 26, 68),
          randomRange(random, -45, 45),
          randomRange(random, -85, -35),
          randomRange(random, 4, 7),
          rustleColor,
          0.42,
          activeCover.kind === COVER_FLOUR_SACK ? 'dust' : 'leaf',
        );
      }
      if (!farmer.stealthedThisCover && farmer.searchTimer >= 0.75) {
        farmer.stealthedThisCover = true;
        state.score += SCORING.stealthBonus;
        addPopup(`SLIPPED AWAY +${SCORING.stealthBonus}`, player.x + player.width / 2, player.y - 46, '#92e372', 1.0);
      }
    } else {
      const stageDrain = FARMER.baseDrain + (state.stage.id - 1) * FARMER.stageDrainBonus;
      if (player.dashing) {
        farmer.gap = Math.min(FARMER.maxGap, farmer.gap + FARMER.dashGain * dt);
      } else {
        farmer.gap = Math.max(0, farmer.gap - stageDrain * dt);
      }
    }

    player.runPhase += dt * (player.dashing ? 16 : player.hidden ? 0 : 10.5);
    farmer.stridePhase += dt * (farmer.state === 'searching' ? 3 : 11.5);

    // Scroll covers
    for (let i = state.covers.length - 1; i >= 0; i -= 1) {
      const c = state.covers[i];
      c.x -= speed * dt;
      if (c.x + c.width < -140) state.covers.splice(i, 1);
    }

    // Scroll obstacles, run oven state machines, and test collisions
    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const obs = state.obstacles[i];
      obs.x -= speed * dt;
      if (obs.x + obs.width < -200) {
        state.obstacles.splice(i, 1);
        continue;
      }

      if (obs.kind === OBS_OVEN) {
        obs.ovenTimer -= dt;
        if (obs.ovenPhase === 'idle' && obs.ovenTimer <= 0 && obs.x < FIELD.width + 80) {
          obs.ovenPhase = 'warn';
          obs.ovenTimer = 1.05;
          events |= EVENT_OVEN_WARN;
        } else if (obs.ovenPhase === 'warn' && obs.ovenTimer <= 0) {
          obs.ovenPhase = 'blast';
          obs.ovenTimer = 0.95;
          events |= EVENT_OVEN_BLAST;
        } else if (obs.ovenPhase === 'blast') {
          if (random() < 0.75) {
            addParticle(
              obs.x + randomRange(random, 24, obs.width - 24),
              obs.y - randomRange(random, 20, obs.flameLength),
              randomRange(random, -65, 65),
              randomRange(random, -150, -55),
              randomRange(random, 4, 8),
              randomPick(random, ['#ff4e1a', '#ffa126', '#fff2a6']),
              0.38,
              'spark',
            );
          }
          if (obs.ovenTimer <= 0) {
            obs.ovenPhase = 'cool';
            obs.ovenTimer = 1.6;
          }
        } else if (obs.ovenPhase === 'cool' && obs.ovenTimer <= 0) {
          obs.ovenPhase = 'idle';
          obs.ovenTimer = 0.7;
        }
      }

      // Collision with obstacle body (small forgiving inset)
      const hitBody = rectsOverlap(
        player.x + 8,
        player.y + 8,
        player.width - 16,
        player.height - 10,
        obs.x + 6,
        obs.y + 6,
        obs.width - 12,
        obs.height - 6,
      );

      // Collision with oven flame plume when blasting
      const hitFlame =
        obs.kind === OBS_OVEN &&
        obs.ovenPhase === 'blast' &&
        rectsOverlap(
          player.x + 10,
          player.y + 6,
          player.width - 20,
          player.height - 10,
          obs.x + 14,
          obs.y - obs.flameLength,
          obs.width - 28,
          obs.flameLength,
        );

      if ((hitBody || hitFlame) && !obs.hit) {
        obs.hit = true;
        events = hurtPlayer(events, hitFlame ? 'SINGED!' : 'TRIPPED!');
      } else if (
        obs.kind === OBS_OVEN &&
        obs.ovenPhase === 'blast' &&
        !obs.hit &&
        !obs.nearMissed &&
        obs.x + obs.width < player.x
      ) {
        obs.nearMissed = true;
        state.score += SCORING.nearMissPoints;
        state.nearMissCount += 1;
        events |= EVENT_NEAR_MISS;
        addPopup(`NEAR MISS +${SCORING.nearMissPoints}`, player.x + player.width / 2, player.y - 24, '#ffd45c', 1.05);
      }
    }

    // Spawn and update falling carving knives in Stage 3 (Kitchen Chaos) only
    if (state.stage.id >= 3 && state.distance < GOAL_DISTANCE - 25) {
      state.knifeTimer -= dt;
      if (state.knifeTimer <= 0) {
        spawnFallingKnife();
        state.knifeTimer = randomRange(random, 1.3, 2.1);
      }
    }

    for (let i = state.knives.length - 1; i >= 0; i -= 1) {
      const k = state.knives[i];
      k.x -= speed * 0.25 * dt;
      if (k.warnTimer > 0) {
        k.warnTimer = Math.max(0, k.warnTimer - dt);
        continue;
      }
      if (k.stuckTimer > 0) {
        k.stuckTimer -= dt;
        k.x -= speed * 0.75 * dt;
        if (k.stuckTimer <= 0 || k.x + k.width < -80) state.knives.splice(i, 1);
        continue;
      }

      k.y += k.vy * dt;
      if (
        !k.hit &&
        rectsOverlap(
          player.x + 8,
          player.y + 8,
          player.width - 16,
          player.height - 12,
          k.x + 6,
          k.y + 24,
          k.width - 12,
          k.height - 24,
        )
      ) {
        k.hit = true;
        events = hurtPlayer(events, 'CARVED!');
        state.knives.splice(i, 1);
        continue;
      }

      // Near miss check when a falling knife passes closely without hitting
      if (!k.hit && !k.nearMissed && k.y + k.height >= player.y && k.y <= player.y + player.height) {
        const dx = Math.abs(k.x + k.width / 2 - (player.x + player.width / 2));
        if (dx <= player.width / 2 + k.width / 2 + SCORING.nearMissMargin) {
          k.nearMissed = true;
          state.score += SCORING.nearMissPoints;
          state.nearMissCount += 1;
          events |= EVENT_NEAR_MISS;
          addPopup(`NEAR MISS +${SCORING.nearMissPoints}`, player.x + player.width / 2, player.y - 26, '#ffd45c', 1.05);
        }
      }

      if (k.y + k.height >= FIELD.groundY) {
        k.y = FIELD.groundY - k.height;
        k.stuckTimer = 0.55;
      }
    }

    // Farmer telegraphed horizontal shotgun attack from Stage 2 onward
    if (state.stage.id >= 2 && state.distance < GOAL_DISTANCE - 35) {
      if (farmer.shotgun.phase === 'idle') {
        if (!player.hidden) {
          state.shotgunTimer -= dt;
          if (state.shotgunTimer <= 0) {
            const nearbyObstacle = state.obstacles.some(
              (obs) => obs.x > player.x - 40 && obs.x < player.x + 260,
            );
            const aimKind = nearbyObstacle ? 'low' : random() < 0.5 ? 'low' : 'high';
            const aimDur = state.stage.id >= 3 ? SHOTGUN.aimDurationStage3 : SHOTGUN.aimDurationStage2;
            farmer.shotgun.phase = 'aim';
            farmer.shotgun.timer = aimDur;
            farmer.shotgun.maxTimer = aimDur;
            farmer.shotgun.aimKind = aimKind;
            farmer.shotgun.aimY = aimKind === 'low' ? SHOTGUN.lowAimY : SHOTGUN.highAimY;
            events |= EVENT_SHOTGUN_AIM;
          }
        }
      } else if (farmer.shotgun.phase === 'aim') {
        if (player.hidden) {
          farmer.shotgun.phase = 'idle';
          farmer.shotgun.timer = 0;
          state.shotgunTimer = 1.4;
        } else {
          farmer.shotgun.timer -= dt;
          if (farmer.shotgun.timer <= 0) {
            const farmerDrawX = Math.max(58, 168 - (farmer.gap / FARMER.visibleGap) * 220);
            const muzzleX = farmerDrawX + 94;
            const aimY = farmer.shotgun.aimY;
            const volley = { hit: false, nearMissed: false };
            const offsets = [-5, 0, 5];
            for (let i = 0; i < offsets.length; i += 1) {
              state.pellets.push({
                id: state.nextId++,
                x: muzzleX,
                y: aimY + offsets[i],
                vx: SHOTGUN.pelletSpeed,
                vy: offsets[i] * 2.2,
                r: SHOTGUN.pelletRadius,
                volley,
              });
            }
            for (let i = 0; i < 6; i += 1) {
              addParticle(
                muzzleX,
                aimY,
                randomRange(random, 80, 220),
                randomRange(random, -60, 60),
                randomRange(random, 5, 10),
                randomPick(random, ['#ffe066', '#ffa126', '#d9d4ce']),
                0.28,
                'dust',
              );
            }
            farmer.shotgun.phase = 'idle';
            farmer.shotgun.fireFlash = 0.22;
            state.shotgunTimer =
              state.stage.id >= 3
                ? randomRange(random, SHOTGUN.stage3Interval[0], SHOTGUN.stage3Interval[1])
                : randomRange(random, SHOTGUN.stage2Interval[0], SHOTGUN.stage2Interval[1]);
            events |= EVENT_SHOTGUN_FIRE;
          }
        }
      }
    } else if (farmer.shotgun.phase === 'aim') {
      farmer.shotgun.phase = 'idle';
      farmer.shotgun.timer = 0;
    }

    // Update shotgun pellets
    for (let i = state.pellets.length - 1; i >= 0; i -= 1) {
      const pel = state.pellets[i];
      pel.x += pel.vx * dt;
      pel.y += pel.vy * dt;
      if (pel.x > FIELD.width + 60) {
        state.pellets.splice(i, 1);
        continue;
      }
      if (
        !pel.volley.hit &&
        rectsOverlap(
          player.x + 10,
          player.y + 8,
          player.width - 20,
          player.height - 12,
          pel.x - pel.r,
          pel.y - pel.r,
          pel.r * 2,
          pel.r * 2,
        )
      ) {
        pel.volley.hit = true;
        events = hurtPlayer(events, 'PEPPERED!');
        state.pellets.splice(i, 1);
        continue;
      }
      if (!pel.volley.hit && !pel.volley.nearMissed && pel.x >= player.x + player.width / 2) {
        const pyCenter = player.y + player.height / 2;
        if (Math.abs(pel.y - pyCenter) <= 78) {
          pel.volley.nearMissed = true;
          state.score += SCORING.nearMissPoints;
          state.nearMissCount += 1;
          events |= EVENT_NEAR_MISS;
          addPopup(`NEAR MISS +${SCORING.nearMissPoints}`, player.x + player.width / 2, player.y - 26, '#ffd45c', 1.05);
        }
      }
    }

    // Scroll and collect corn cobs
    for (let i = state.corns.length - 1; i >= 0; i -= 1) {
      const c = state.corns[i];
      c.x -= speed * dt;
      c.bobPhase += dt * 4.5;
      if (c.x + c.width < -80) {
        state.corns.splice(i, 1);
        continue;
      }
      if (
        !c.collected &&
        rectsOverlap(player.x - 4, player.y - 4, player.width + 8, player.height + 8, c.x, c.y, c.width, c.height)
      ) {
        c.collected = true;
        state.score += SCORING.cornPoints;
        state.cornCount += 1;
        events |= EVENT_CORN;
        addPopup(`+${SCORING.cornPoints}`, c.x + c.width / 2, c.y - 10, '#f5cb42', 0.95);
        for (let j = 0; j < 6; j += 1) {
          addParticle(
            c.x + c.width / 2,
            c.y + c.height / 2,
            randomRange(random, -90, 90),
            randomRange(random, -120, 20),
            randomRange(random, 4, 7),
            '#ffe380',
            0.42,
            'spark',
          );
        }
        state.corns.splice(i, 1);
      }
    }

    // Scroll and collect heart pickups
    for (let i = state.hearts.length - 1; i >= 0; i -= 1) {
      const h = state.hearts[i];
      h.x -= speed * dt;
      h.bobPhase += dt * 4.2;
      if (h.x + h.width < -80) {
        state.hearts.splice(i, 1);
        continue;
      }
      if (
        !h.collected &&
        rectsOverlap(player.x - 4, player.y - 4, player.width + 8, player.height + 8, h.x, h.y, h.width, h.height)
      ) {
        h.collected = true;
        events |= EVENT_HEART;
        if (state.lives < LIVES) {
          state.lives += 1;
          addPopup('HEART +1', h.x + h.width / 2, h.y - 12, '#ff6b81', 1.08);
        } else {
          state.score += SCORING.heartFullBonus;
          farmer.gap = Math.min(FARMER.maxGap, farmer.gap + SCORING.heartFullGauge);
          addPopup(`FULL +${SCORING.heartFullBonus}`, h.x + h.width / 2, h.y - 12, '#ffd45c', 1.05);
        }
        for (let j = 0; j < 7; j += 1) {
          addParticle(
            h.x + h.width / 2,
            h.y + h.height / 2,
            randomRange(random, -100, 100),
            randomRange(random, -140, 10),
            randomRange(random, 4, 7),
            '#ff7a8a',
            0.45,
            'spark',
          );
        }
        state.hearts.splice(i, 1);
      }
    }

    state.spawnCursorX -= speed * dt;
    populateAhead();
    updateParticlesAndPopups(dt);

    // Check DANGER 100% (gap <= 0) recharge (spend 1 life & reset position) or win/loss termination
    if (!(events & EVENT_CAUGHT) && farmer.gap <= 0) {
      if (state.lives > 0) {
        state.lives -= 1;
        farmer.gap = FARMER.rechargeGap;
        farmer.state = 'chasing';
        farmer.spottedTimer = 0;
        farmer.searchTimer = 0;
        farmer.shotgun.phase = 'idle';
        farmer.shotgun.timer = 0;
        state.pellets = [];

        player.x = PLAYER.homeX;
        player.y = FIELD.groundY - PLAYER.standHeight;
        player.vy = 0;
        player.width = PLAYER.standWidth;
        player.height = PLAYER.standHeight;
        player.grounded = true;
        player.crouching = false;
        player.hidden = false;
        player.activeCoverId = -1;
        player.hideGraceTimer = 0;
        player.dashing = false;
        player.fluttering = false;
        player.stumbleTimer = 0;
        player.invulnerable = 2.0;

        spawnFeatherBurst(player.x + player.width / 2, player.y + player.height * 0.5, 14);
        addPopup(
          state.lives === 0 ? 'LAST CHANCE! -1 LIFE' : 'BROKE FREE! -1 LIFE',
          player.x + player.width / 2,
          player.y - 32,
          '#ffd45c',
          1.15,
        );
        events |= EVENT_RECHARGE;
      } else {
        farmer.gap = 0;
        events |= EVENT_CAUGHT;
      }
    }

    if (!(events & EVENT_CAUGHT) && state.distance >= GOAL_DISTANCE) {
      state.distance = GOAL_DISTANCE;
      state.score += SCORING.escapeBonus + state.lives * SCORING.lifeBonus;
      events |= EVENT_ESCAPED;
    }

    return events;
  }

  reset();
  return { state, reset, step, addPopup, spawnFeatherBurst };
}
