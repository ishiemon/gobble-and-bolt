// Pure code-drawn 2D canvas renderer for Gobble and Bolt!
// Renders all 3 stages (Farmyard Dawn, Cornfield Road, Kitchen Chaos), Forest Sunrise escape,
// expressive turkey (>25% viewport height) with distinct poses, farmer pursuer, hazards, and HUD.
import { FARMER, FIELD, FONT, GOAL_DISTANCE, LIVES, PALETTE, PLAYER, STAGES } from './config.js';
import {
  COVER_BARREL,
  COVER_CORN_PATCH,
  COVER_FLOUR_SACK,
  COVER_HAYSTACK,
  OBS_BARREL,
  OBS_COUNTER,
  OBS_FENCE,
  OBS_OVEN,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Create the 1280x720 scaled renderer and coordinate converter. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, dpr: 1 };
  const fontCache = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(window.innerWidth * ratio));
    const height = Math.max(1, Math.round(window.innerHeight * ratio));
    canvas.width = width;
    canvas.height = height;
    view.dpr = ratio;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function toLogicalPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const px = (clientX - rect.left) * view.dpr;
    const py = (clientY - rect.top) * view.dpr;
    return {
      x: (px - view.x) / view.scale,
      y: (py - view.y) / view.scale,
    };
  }

  function setFont(size, weight = 'bold') {
    const key = `${weight}:${size}`;
    if (!fontCache.has(key)) fontCache.set(key, `${weight} ${size}px ${FONT}`);
    ctx.font = fontCache.get(key);
  }

  function drawText(str, x, y, size, color, align = 'left', weight = 'bold', shadow = false) {
    setFont(size, weight);
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if (shadow) {
      ctx.fillStyle = 'rgba(18, 9, 5, 0.72)';
      ctx.fillText(str, x + 2, y + 3);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function drawSunAndRays(x, y, radius, rayColor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = rayColor;
    for (let i = 0; i < 12; i += 1) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 6);
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(22, 0);
      ctx.lineTo(75, -520);
      ctx.lineTo(-75, -520);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.9);
    grad.addColorStop(0, PALETTE.sun);
    grad.addColorStop(0.55, 'rgba(255, 210, 118, 0.55)');
    grad.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFarmBackground(dist) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.dawnTop);
    sky.addColorStop(0.45, PALETTE.dawnMid);
    sky.addColorStop(1, PALETTE.dawnLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);

    drawSunAndRays(980, 290, 62, 'rgba(255, 224, 145, 0.09)');

    // Far hills
    const hillShift = (dist * 4) % FIELD.width;
    ctx.fillStyle = PALETTE.farmHillFar;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = -200; x <= FIELD.width + 200; x += 120) {
      const wx = x - hillShift * 0.3;
      const y = FIELD.groundY - 140 - Math.sin(wx * 0.0045) * 42 - Math.cos(wx * 0.008) * 18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(FIELD.width, FIELD.groundY);
    ctx.closePath();
    ctx.fill();

    // Parallax red barns, silos, autumn trees, and scarecrows
    const stride = 760;
    const offset = (dist * 10) % stride;
    for (let base = -offset - stride; base < FIELD.width + stride; base += stride) {
      // Silo
      ctx.fillStyle = PALETTE.silo;
      ctx.fillRect(base + 320, FIELD.groundY - 235, 52, 235);
      ctx.fillStyle = '#b8a998';
      ctx.beginPath();
      ctx.arc(base + 346, FIELD.groundY - 235, 26, Math.PI, 0);
      ctx.fill();

      // Red Barn
      ctx.fillStyle = PALETTE.barnRed;
      ctx.fillRect(base + 140, FIELD.groundY - 190, 185, 190);
      ctx.beginPath();
      ctx.moveTo(base + 125, FIELD.groundY - 190);
      ctx.lineTo(base + 232, FIELD.groundY - 270);
      ctx.lineTo(base + 340, FIELD.groundY - 190);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.barnTrim;
      ctx.lineWidth = 4;
      ctx.strokeRect(base + 190, FIELD.groundY - 102, 84, 102);
      ctx.beginPath();
      ctx.moveTo(base + 190, FIELD.groundY - 102);
      ctx.lineTo(base + 274, FIELD.groundY);
      ctx.moveTo(base + 274, FIELD.groundY - 102);
      ctx.lineTo(base + 190, FIELD.groundY);
      ctx.stroke();

      // Autumn tree
      ctx.fillStyle = '#4f2c1b';
      ctx.fillRect(base + 515, FIELD.groundY - 130, 22, 130);
      ctx.fillStyle = '#d45a26';
      ctx.beginPath();
      ctx.arc(base + 526, FIELD.groundY - 160, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ec9832';
      ctx.beginPath();
      ctx.arc(base + 494, FIELD.groundY - 135, 42, 0, Math.PI * 2);
      ctx.arc(base + 558, FIELD.groundY - 135, 42, 0, Math.PI * 2);
      ctx.fill();

      // Scarecrow silhouette
      ctx.strokeStyle = '#47281a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(base + 660, FIELD.groundY);
      ctx.lineTo(base + 660, FIELD.groundY - 125);
      ctx.moveTo(base + 622, FIELD.groundY - 92);
      ctx.lineTo(base + 698, FIELD.groundY - 92);
      ctx.stroke();
      ctx.fillStyle = '#b34c24';
      ctx.fillRect(base + 644, FIELD.groundY - 98, 32, 46);
      ctx.fillStyle = '#e0b251';
      ctx.beginPath();
      ctx.arc(base + 660, FIELD.groundY - 125, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Background wooden fence line
    const fenceOff = (dist * 18) % 88;
    ctx.fillStyle = '#683b21';
    ctx.fillRect(0, FIELD.groundY - 56, FIELD.width, 8);
    ctx.fillRect(0, FIELD.groundY - 28, FIELD.width, 8);
    for (let x = -fenceOff; x < FIELD.width + 88; x += 88) {
      ctx.fillRect(x, FIELD.groundY - 70, 12, 70);
    }

    // Ground
    ctx.fillStyle = PALETTE.farmGround;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = PALETTE.farmGrass;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 16);
  }

  function drawCornfieldBackground(dist, elapsed) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.cornSkyTop);
    sky.addColorStop(0.5, PALETTE.cornSkyMid);
    sky.addColorStop(1, PALETTE.cornSkyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);

    drawSunAndRays(280, 215, 50, 'rgba(255, 224, 145, 0.08)');

    // Swaying back rows of tall corn stalks
    const sway = Math.sin(elapsed * 2.2) * 8;
    const stalkStride = 56;
    const offset = (dist * 18) % stalkStride;
    for (let x = -offset - stalkStride; x < FIELD.width + stalkStride; x += stalkStride) {
      const h = 195 + ((Math.round(x + dist * 18) * 17) % 55);
      ctx.strokeStyle = PALETTE.cornStalkDark;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x, FIELD.groundY);
      ctx.quadraticCurveTo(x + sway * 0.5, FIELD.groundY - h * 0.5, x + sway, FIELD.groundY - h);
      ctx.stroke();

      ctx.fillStyle = PALETTE.cornStalk;
      ctx.beginPath();
      ctx.ellipse(x + sway * 0.6 + 14, FIELD.groundY - h * 0.55, 22, 7, 0.45, 0, Math.PI * 2);
      ctx.ellipse(x + sway * 0.6 - 14, FIELD.groundY - h * 0.72, 22, 7, -0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.cornCob;
      ctx.beginPath();
      ctx.ellipse(x + sway * 0.75, FIELD.groundY - h * 0.66, 7, 15, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dirt road ground with wheel ruts
    ctx.fillStyle = PALETTE.cornRoad;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = PALETTE.cornDust;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 14);
    ctx.fillStyle = '#472c18';
    ctx.fillRect(0, FIELD.groundY + 42, FIELD.width, 14);
    ctx.fillRect(0, FIELD.groundY + 76, FIELD.width, 10);
  }

  function drawKitchenBackground(dist) {
    // Warm rustic kitchen wall
    ctx.fillStyle = PALETTE.kitchenWallTop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);

    // Checkered terracotta tile backsplash
    const tile = 64;
    const tileOff = (dist * 14) % (tile * 2);
    for (let row = 0; row < 5; row += 1) {
      for (let col = -2; col < FIELD.width / tile + 3; col += 1) {
        const tx = col * tile - tileOff;
        const ty = FIELD.groundY - 340 + row * tile;
        ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.kitchenWallTileA : PALETTE.kitchenWallTileB;
        ctx.fillRect(tx, ty, tile - 2, tile - 2);
      }
    }

    // Overhead beam & hanging copper pans
    ctx.fillStyle = PALETTE.kitchenWood;
    ctx.fillRect(0, 128, FIELD.width, 20);
    const panOff = (dist * 16) % 340;
    for (let x = -panOff; x < FIELD.width + 340; x += 340) {
      // Pendant lamp glow
      ctx.fillStyle = 'rgba(255, 200, 90, 0.16)';
      ctx.beginPath();
      ctx.moveTo(x + 170, 95);
      ctx.lineTo(x + 280, 420);
      ctx.lineTo(x + 60, 420);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2d1c14';
      ctx.fillRect(x + 168, 0, 4, 85);
      ctx.fillStyle = PALETTE.copper;
      ctx.beginPath();
      ctx.arc(x + 170, 98, 28, Math.PI, 0);
      ctx.fill();

      // Hanging pan
      ctx.fillStyle = '#382c28';
      ctx.fillRect(x + 66, 148, 6, 48);
      ctx.fillStyle = PALETTE.copper;
      ctx.beginPath();
      ctx.arc(x + 69, 218, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#783b1c';
      ctx.beginPath();
      ctx.arc(x + 69, 218, 17, 0, Math.PI * 2);
      ctx.fill();
    }

    // Open back door to forest freedom as the turkey nears 1200m
    if (dist > 1020) {
      const doorX = FIELD.width - 190 - (1200 - dist) * 1.2;
      if (doorX < FIELD.width + 60) {
        ctx.fillStyle = '#5c311b';
        ctx.fillRect(doorX - 14, FIELD.groundY - 268, 168, 268);
        const exitSky = ctx.createLinearGradient(0, FIELD.groundY - 252, 0, FIELD.groundY);
        exitSky.addColorStop(0, '#41696b');
        exitSky.addColorStop(1, '#ffd17a');
        ctx.fillStyle = exitSky;
        ctx.fillRect(doorX, FIELD.groundY - 252, 140, 252);
        ctx.fillStyle = PALETTE.pineDark;
        ctx.beginPath();
        ctx.moveTo(doorX + 36, FIELD.groundY - 40);
        ctx.lineTo(doorX + 68, FIELD.groundY - 190);
        ctx.lineTo(doorX + 102, FIELD.groundY - 40);
        ctx.fill();
        drawText('EXIT', doorX + 70, FIELD.groundY - 278, 24, PALETTE.gold, 'center', 'bold', true);
      }
    }

    // Checkered kitchen floor
    const floorTile = 72;
    const floorOff = (dist * 18) % (floorTile * 2);
    ctx.fillStyle = PALETTE.kitchenFloorA;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = PALETTE.kitchenFloorB;
    for (let col = -2; col < FIELD.width / floorTile + 3; col += 2) {
      ctx.fillRect(col * floorTile - floorOff, FIELD.groundY, floorTile, 54);
      ctx.fillRect((col + 1) * floorTile - floorOff, FIELD.groundY + 54, floorTile, 64);
    }
  }

  function drawForestEscapeBackground(elapsed) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.forestTop);
    sky.addColorStop(0.55, PALETTE.forestMid);
    sky.addColorStop(1, PALETTE.forestLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);

    drawSunAndRays(930, 320, 74, 'rgba(255, 232, 150, 0.14)');

    // Pine & autumn tree silhouettes
    for (let i = 0; i < 11; i += 1) {
      const tx = 60 + i * 124;
      const th = 220 + (i % 3) * 55;
      ctx.fillStyle = i % 2 === 0 ? PALETTE.pineDark : PALETTE.pineMid;
      ctx.beginPath();
      ctx.moveTo(tx, FIELD.groundY - th);
      ctx.lineTo(tx - 64, FIELD.groundY);
      ctx.lineTo(tx + 64, FIELD.groundY);
      ctx.closePath();
      ctx.fill();
    }

    // Foreground autumn trees
    const autumns = [
      { x: 160, h: 170, c: PALETTE.autumnLeafA },
      { x: 1120, h: 195, c: PALETTE.autumnLeafB },
      { x: 1210, h: 150, c: PALETTE.autumnLeafC },
    ];
    for (const t of autumns) {
      ctx.fillStyle = '#47281a';
      ctx.fillRect(t.x - 10, FIELD.groundY - t.h, 20, t.h);
      ctx.fillStyle = t.c;
      ctx.beginPath();
      ctx.arc(t.x, FIELD.groundY - t.h - 15, 58, 0, Math.PI * 2);
      ctx.fill();
    }

    // Meadow ground
    ctx.fillStyle = '#4d612d';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = '#7c8f3b';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 18);

    // Gentle drifting leaves
    for (let i = 0; i < 12; i += 1) {
      const lx = ((i * 137 + elapsed * 38) % (FIELD.width + 60)) - 30;
      const ly = 90 + ((i * 89 + elapsed * 24) % 420);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(elapsed + i);
      ctx.fillStyle = i % 2 === 0 ? PALETTE.autumnLeafB : PALETTE.autumnLeafC;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHideBadge(x, y, width) {
    const cx = x + width / 2;
    ctx.fillStyle = 'rgba(28, 17, 12, 0.82)';
    roundRectPath(ctx, cx - 38, y - 34, 76, 24, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.safe;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawText('HIDE ↓', cx, y - 17, 13, PALETTE.safe, 'center');
  }

  function drawCover(cover, layer) {
    const { x, y, width, height, kind } = cover;
    if (kind === COVER_HAYSTACK) {
      ctx.save();
      if (layer === 'front') {
        // Front lip slightly shorter so the turkey's eyes peek over it
        ctx.fillStyle = PALETTE.straw;
        ctx.beginPath();
        ctx.moveTo(x, FIELD.groundY);
        ctx.quadraticCurveTo(x + width * 0.5, y + 26, x + width, FIELD.groundY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PALETTE.strawDark;
        ctx.lineWidth = 3;
        for (let i = 1; i <= 5; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x + (width * i) / 6, FIELD.groundY - 10);
          ctx.lineTo(x + (width * i) / 6 - 10, FIELD.groundY - 46);
          ctx.stroke();
        }
        drawHideBadge(x, y, width);
      } else {
        ctx.fillStyle = PALETTE.strawDark;
        ctx.beginPath();
        ctx.moveTo(x - 6, FIELD.groundY);
        ctx.quadraticCurveTo(x + width * 0.5, y - 16, x + width + 6, FIELD.groundY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (kind === COVER_BARREL) {
      if (layer === 'back') {
        ctx.fillStyle = '#5c311b';
        roundRectPath(ctx, x, y, width, height, 18);
        ctx.fill();
      } else {
        ctx.fillStyle = '#7c4223';
        roundRectPath(ctx, x + 4, y + 22, width - 8, height - 22, 14);
        ctx.fill();
        ctx.fillStyle = '#3b3330';
        ctx.fillRect(x + 4, y + 36, width - 8, 10);
        ctx.fillRect(x + 4, y + height - 24, width - 8, 10);
        drawHideBadge(x, y, width);
      }
      return;
    }

    if (kind === COVER_CORN_PATCH) {
      const stalkColor = layer === 'back' ? PALETTE.cornStalkDark : PALETTE.cornStalk;
      const count = 6;
      for (let i = 0; i < count; i += 1) {
        const sx = x + 16 + (i * (width - 32)) / (count - 1);
        const topY = layer === 'back' ? y : y + 38;
        ctx.strokeStyle = stalkColor;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(sx, FIELD.groundY);
        ctx.lineTo(sx + (i % 2 === 0 ? 5 : -5), topY);
        ctx.stroke();
        ctx.fillStyle = layer === 'back' ? '#627029' : '#8ea33b';
        ctx.beginPath();
        ctx.ellipse(sx + 14, topY + 26, 22, 7, 0.5, 0, Math.PI * 2);
        ctx.ellipse(sx - 14, topY + 42, 22, 7, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (layer === 'front') drawHideBadge(x, y, width);
      return;
    }

    // COVER_FLOUR_SACK
    if (layer === 'back') {
      ctx.fillStyle = '#c4b197';
      roundRectPath(ctx, x, y + 12, width, height - 12, 26);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ede0cc';
      roundRectPath(ctx, x + 6, y + 30, width - 12, height - 30, 22);
      ctx.fill();
      drawText('FLOUR', x + width / 2, y + height - 26, 22, '#9e6240', 'center');
      drawHideBadge(x, y, width);
    }
  }

  function drawObstacle(obs, elapsed) {
    const { x, y, width, height, kind } = obs;
    if (kind === OBS_FENCE) {
      ctx.fillStyle = '#754120';
      ctx.fillRect(x + 4, y, 14, height);
      ctx.fillRect(x + width - 18, y, 14, height);
      ctx.fillStyle = '#a86232';
      ctx.fillRect(x, y + 12, width, 14);
      ctx.fillRect(x, y + 40, width, 14);
      ctx.fillStyle = '#e09a4b';
      ctx.fillRect(x + 4, y - 6, 14, 8);
      ctx.fillRect(x + width - 18, y - 6, 14, 8);
      return;
    }

    if (kind === OBS_BARREL) {
      ctx.fillStyle = '#854623';
      roundRectPath(ctx, x, y, width, height, 16);
      ctx.fill();
      ctx.strokeStyle = '#472210';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#3a3432';
      ctx.fillRect(x, y + 14, width, 9);
      ctx.fillRect(x, y + height - 22, width, 9);
      return;
    }

    if (kind === OBS_COUNTER) {
      ctx.fillStyle = PALETTE.kitchenCounter;
      ctx.fillRect(x + 4, y + 14, width - 8, height - 14);
      ctx.fillStyle = '#69361b';
      ctx.fillRect(x + 14, y + 26, width - 28, height - 36);
      ctx.fillStyle = PALETTE.kitchenCounterTop;
      roundRectPath(ctx, x, y, width, 18, 6);
      ctx.fill();
      return;
    }

    // OBS_OVEN with telegraphing door & vertical flame eruption
    const shake = obs.ovenPhase === 'warn' ? Math.sin(elapsed * 55) * 4 : 0;
    const ox = x + shake;
    ctx.fillStyle = PALETTE.ovenBody;
    roundRectPath(ctx, ox, y, width, height, 10);
    ctx.fill();

    // Control knobs
    ctx.fillStyle = PALETTE.gold;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(ox + 20 + i * 26, y + 16, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Oven door window
    const glowColor =
      obs.ovenPhase === 'blast'
        ? '#ff8424'
        : obs.ovenPhase === 'warn'
          ? Math.floor(elapsed * 14) % 2 === 0
            ? '#ff451a'
            : '#ffa52e'
          : '#38221d';
    ctx.fillStyle = PALETTE.ovenDoor;
    roundRectPath(ctx, ox + 14, y + 32, width - 28, height - 48, 8);
    ctx.fill();
    ctx.fillStyle = glowColor;
    roundRectPath(ctx, ox + 24, y + 44, width - 48, height - 74, 5);
    ctx.fill();

    if (obs.ovenPhase === 'warn') {
      // Clear visual telegraph warning badge
      ctx.fillStyle = '#ff4b24';
      roundRectPath(ctx, ox + width / 2 - 48, y - 46, 96, 32, 10);
      ctx.fill();
      ctx.strokeStyle = '#fff2c2';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawText('! OVEN !', ox + width / 2, y - 24, 17, '#fff6e6', 'center');
    } else if (obs.ovenPhase === 'blast') {
      // Floor glow + open top vent + roaring flame plume
      ctx.fillStyle = 'rgba(255, 110, 36, 0.25)';
      ctx.beginPath();
      ctx.ellipse(ox + width / 2, FIELD.groundY + 4, width * 0.72, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      const flameH = obs.flameLength + Math.sin(elapsed * 42) * 12;
      const cx = ox + width / 2;
      ctx.fillStyle = PALETTE.flameOuter;
      ctx.beginPath();
      ctx.moveTo(ox + 12, y);
      ctx.quadraticCurveTo(ox + 4, y - flameH * 0.65, cx, y - flameH);
      ctx.quadraticCurveTo(ox + width - 4, y - flameH * 0.65, ox + width - 12, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = PALETTE.flameMid;
      ctx.beginPath();
      ctx.moveTo(ox + 26, y);
      ctx.quadraticCurveTo(cx - 24, y - flameH * 0.5, cx, y - flameH * 0.8);
      ctx.quadraticCurveTo(cx + 24, y - flameH * 0.5, ox + width - 26, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = PALETTE.flameCore;
      ctx.beginPath();
      ctx.moveTo(ox + 40, y);
      ctx.quadraticCurveTo(cx - 10, y - flameH * 0.35, cx, y - flameH * 0.55);
      ctx.quadraticCurveTo(cx + 10, y - flameH * 0.35, ox + width - 40, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawKnife(k) {
    const cx = k.x + k.width / 2;
    if (k.warnTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 92, 64, 0.72)';
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, 74);
      ctx.lineTo(cx, FIELD.groundY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#eb4438';
      ctx.beginPath();
      ctx.arc(cx, 96, 18, 0, Math.PI * 2);
      ctx.fill();
      drawText('!', cx, 104, 22, '#fff6e6', 'center');
      ctx.restore();
      return;
    }

    ctx.save();
    // Wooden handle
    ctx.fillStyle = PALETTE.knifeHandle;
    roundRectPath(ctx, cx - 7, k.y, 14, 34, 4);
    ctx.fill();
    ctx.fillStyle = '#c9a66b';
    ctx.fillRect(cx - 12, k.y + 30, 24, 6);
    // Steel carving blade
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(cx - 13, k.y + 36);
    ctx.lineTo(cx + 13, k.y + 36);
    ctx.lineTo(cx + 10, k.y + k.height - 26);
    ctx.lineTo(cx, k.y + k.height);
    ctx.lineTo(cx - 12, k.y + k.height - 22);
    ctx.closePath();
    ctx.fill();
    // Edge highlight
    ctx.fillStyle = PALETTE.knifeEdge;
    ctx.beginPath();
    ctx.moveTo(cx + 7, k.y + 36);
    ctx.lineTo(cx + 13, k.y + 36);
    ctx.lineTo(cx, k.y + k.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCorn(corn) {
    const cx = corn.x + corn.width / 2;
    const cy = corn.y + corn.height / 2 + Math.sin(corn.bobPhase) * 4;
    ctx.save();
    ctx.translate(cx, cy);
    // Glow halo
    ctx.fillStyle = 'rgba(245, 203, 66, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    // Corn cob
    ctx.fillStyle = PALETTE.cornCob;
    ctx.beginPath();
    ctx.ellipse(0, -2, 10, 18, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Kernel lines
    ctx.strokeStyle = '#d49a1e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.lineTo(-2, 10);
    ctx.moveTo(3, -15);
    ctx.lineTo(5, 9);
    ctx.stroke();
    // Green husk leaves
    ctx.fillStyle = PALETTE.cornHusk;
    ctx.beginPath();
    ctx.ellipse(-7, 10, 6, 13, -0.45, 0, Math.PI * 2);
    ctx.ellipse(7, 10, 6, 13, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw the expressive turkey at >= 1/4 viewport height (PLAYER.drawHeight = 196px).
   * Poses (run, jump/flutter, stumble, crouch/hide, escaped) are unmistakable at a glance.
   */
  function drawTurkey(player, elapsed, poseOverride = null) {
    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0;
    if (blink && !poseOverride) return;

    const pose =
      poseOverride ||
      (player.stumbleTimer > 0
        ? 'stumble'
        : !player.grounded
          ? 'jump'
          : player.crouching || player.hidden
            ? 'crouch'
            : player.dashing
              ? 'dash'
              : 'run');

    const footX = player.x + player.width * 0.5;
    const footY = player.y + player.height;
    const scale = PLAYER.drawHeight / 196;

    ctx.save();
    ctx.translate(footX, footY);
    ctx.scale(scale * (player.facing < 0 ? -1 : 1), scale);

    // Ground shadow
    if (player.grounded) {
      ctx.fillStyle = 'rgba(20, 10, 5, 0.34)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 48, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pose transforms (keep feet grounded at local y = 0)
    if (pose === 'crouch') {
      ctx.scale(1.08, 0.64);
    } else if (pose === 'stumble') {
      ctx.rotate(-0.34);
      ctx.translate(-8, 6);
    } else if (pose === 'dash') {
      ctx.rotate(0.14);
    }

    const stride = pose === 'crouch' || pose === 'escaped' ? 0 : Math.sin(player.runPhase);
    const bob = pose === 'run' || pose === 'dash' ? Math.abs(Math.cos(player.runPhase)) * -5 : 0;

    // Legs & feet
    ctx.strokeStyle = PALETTE.turkeyBeak;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const leftAngle = pose === 'jump' ? -0.55 : stride * 0.55;
    const rightAngle = pose === 'jump' ? 0.4 : -stride * 0.55;
    for (const [ox, ang] of [
      [-10, leftAngle],
      [10, rightAngle],
    ]) {
      ctx.save();
      ctx.translate(ox, -38);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 34);
      ctx.lineTo(14, 38);
      ctx.moveTo(0, 34);
      ctx.lineTo(-8, 38);
      ctx.stroke();
      ctx.restore();
    }

    ctx.translate(0, bob);

    // 9-feather fan tail arcing up and back (drawn behind body)
    ctx.save();
    ctx.translate(-22, -88);
    for (let i = 0; i < 9; i += 1) {
      const a = -1.75 + (i / 8) * 1.65;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = PALETTE.turkeyTail[i % PALETTE.turkeyTail.length];
      ctx.beginPath();
      ctx.ellipse(0, -56, 14, 54, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#241208';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#fff0c2';
      ctx.beginPath();
      ctx.ellipse(0, -96, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Plump turkey body
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath();
    ctx.ellipse(-2, -74, 46, 39, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241208';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.turkeyBelly;
    ctx.beginPath();
    ctx.ellipse(6, -68, 34, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flapping wing
    ctx.save();
    ctx.translate(-4, -78);
    const wingRot =
      pose === 'jump'
        ? Math.sin(elapsed * 26) * 0.55 - 0.55
        : pose === 'stumble'
          ? -0.95
          : pose === 'escaped'
            ? -0.8
            : Math.sin(player.runPhase) * 0.16;
    ctx.rotate(wingRot);
    ctx.fillStyle = PALETTE.turkeyWing;
    ctx.beginPath();
    ctx.ellipse(-6, 6, 30, 18, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241208';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // S-curved neck + blue head
    const headX = pose === 'dash' ? 44 : 34;
    const headY = pose === 'crouch' ? -120 : -148;
    ctx.strokeStyle = PALETTE.turkeyBody;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(22, -92);
    ctx.quadraticCurveTo(38, -118, headX, headY + 12);
    ctx.stroke();

    ctx.fillStyle = PALETTE.turkeyHead;
    ctx.beginPath();
    ctx.arc(headX, headY, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241208';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Red snood & swinging wattle
    const wattleSwing = Math.sin(elapsed * 14 + player.runPhase) * 4;
    ctx.fillStyle = PALETTE.turkeyWattle;
    ctx.beginPath();
    ctx.ellipse(headX + 14, headY + 18, 7, 13, wattleSwing * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + 15, headY - 6, 5, 11, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Beak (open when jumping/fluttering)
    ctx.fillStyle = PALETTE.turkeyBeak;
    if (pose === 'jump' || player.fluttering) {
      ctx.beginPath();
      ctx.moveTo(headX + 16, headY - 7);
      ctx.lineTo(headX + 38, headY - 3);
      ctx.lineTo(headX + 16, headY + 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(headX + 16, headY + 2);
      ctx.lineTo(headX + 35, headY + 8);
      ctx.lineTo(headX + 16, headY + 10);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(headX + 16, headY - 5);
      ctx.lineTo(headX + 37, headY + 1);
      ctx.lineTo(headX + 16, headY + 8);
      ctx.closePath();
      ctx.fill();
    }

    // Expressive eye + stumble stars
    if (pose === 'stumble') {
      ctx.strokeStyle = '#1d120c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(headX + 2, headY - 8);
      ctx.lineTo(headX + 10, headY - 3);
      ctx.lineTo(headX + 2, headY + 2);
      ctx.stroke();

      ctx.fillStyle = PALETTE.gold;
      for (let i = 0; i < 3; i += 1) {
        const ang = elapsed * 6 + (i * Math.PI * 2) / 3;
        const sx = headX + Math.cos(ang) * 26;
        const sy = headY - 30 + Math.sin(ang) * 8;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pose === 'escaped') {
      ctx.strokeStyle = '#1d120c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(headX + 6, headY - 2, 6, Math.PI, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(headX + 6, headY - 4, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a110b';
      const lookBack = pose === 'crouch' ? -2 : -1;
      ctx.beginPath();
      ctx.arc(headX + 6 + lookBack, headY - 4, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dash speed streaks
    if (pose === 'dash') {
      ctx.strokeStyle = 'rgba(255, 224, 145, 0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-78 - i * 12, -110 + i * 26);
        ctx.lineTo(-116 - i * 16, -110 + i * 26);
        ctx.stroke();
      }
    }

    ctx.restore();

    if (player.hidden) {
      ctx.fillStyle = 'rgba(28, 17, 12, 0.85)';
      roundRectPath(ctx, footX - 42, footY - 134, 84, 24, 10);
      ctx.fill();
      ctx.strokeStyle = PALETTE.safe;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawText('HIDDEN', footX, footY - 117, 13, PALETTE.safe, 'center');
    }
  }

  /** Draw the chasing farmer on the left edge whenever farmer.gap < visibleGap. */
  function drawFarmer(farmer, stageId, elapsed, forcedX = null) {
    if (forcedX === null && farmer.gap > FARMER.visibleGap) return;
    const x =
      forcedX !== null
        ? forcedX
        : 168 - (farmer.gap / FARMER.visibleGap) * 220;
    const y = FIELD.groundY;
    const stride = Math.sin(farmer.stridePhase);

    ctx.save();
    ctx.translate(x, y);

    // Ground shadow
    ctx.fillStyle = 'rgba(20, 10, 5, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 54, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots & legs
    ctx.strokeStyle = '#3a2214';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -72);
    ctx.lineTo(-14 + stride * 18, -8);
    ctx.moveTo(16, -72);
    ctx.lineTo(16 - stride * 18, -8);
    ctx.stroke();

    // Torso: plaid red shirt + denim overalls + white apron
    ctx.fillStyle = PALETTE.farmerShirt;
    roundRectPath(ctx, -38, -162, 76, 94, 18);
    ctx.fill();
    ctx.strokeStyle = '#241208';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.farmerShirtDark;
    ctx.fillRect(-36, -138, 72, 10);
    ctx.fillRect(-14, -160, 10, 90);

    ctx.fillStyle = PALETTE.farmerDenim;
    roundRectPath(ctx, -34, -124, 68, 58, 10);
    ctx.fill();

    ctx.fillStyle = PALETTE.farmerApron;
    ctx.fillRect(-24, -118, 48, 66);

    // Raised arm holding carving knife
    ctx.save();
    ctx.translate(28, -142);
    ctx.rotate(farmer.state === 'searching' ? -0.2 : Math.sin(elapsed * 9) * 0.18 - 0.55);
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(36, -12);
    ctx.stroke();
    // Knife in hand
    ctx.fillStyle = PALETTE.knifeHandle;
    ctx.fillRect(34, -22, 14, 10);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(46, -24);
    ctx.lineTo(96, -18);
    ctx.lineTo(46, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head + mustache + bushy brows
    ctx.fillStyle = PALETTE.farmerSkin;
    ctx.beginPath();
    ctx.arc(4, -188, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241208';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.farmerHair;
    ctx.beginPath();
    ctx.ellipse(14, -178, 15, 7, 0.1, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#1b110c';
    ctx.beginPath();
    ctx.arc(16, -193, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.farmerHair;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(8, -203);
    ctx.lineTo(24, -198);
    ctx.stroke();

    // Straw hat (Farm/Cornfield) or tall Chef toque (Kitchen)
    if (stageId >= 3) {
      ctx.fillStyle = '#f8f3eb';
      roundRectPath(ctx, -22, -238, 52, 34, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-8, -244, 18, 0, Math.PI * 2);
      ctx.arc(10, -248, 20, 0, Math.PI * 2);
      ctx.arc(24, -240, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b9a894';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = PALETTE.farmerHat;
      ctx.beginPath();
      ctx.ellipse(2, -210, 44, 9, -0.05, 0, Math.PI * 2);
      ctx.fill();
      roundRectPath(ctx, -22, -236, 48, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#a83324';
      ctx.fillRect(-22, -218, 48, 6);
    }

    // Farmer AI state indicator: ? when searching, ! SPOTTED! when turkey emerges
    if (farmer.state === 'searching') {
      ctx.fillStyle = PALETTE.hudBg;
      roundRectPath(ctx, -18, -288, 46, 36, 12);
      ctx.fill();
      drawText('?', 5, -262, 26, PALETTE.gold, 'center');
    } else if (farmer.state === 'spotted') {
      const bubbleLeft = Math.max(16 - x, -20);
      ctx.fillStyle = PALETTE.danger;
      roundRectPath(ctx, bubbleLeft, -296, 152, 40, 12);
      ctx.fill();
      ctx.strokeStyle = '#fff2c2';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      drawText('! SPOTTED!', bubbleLeft + 76, -269, 21, '#fff6e6', 'center');
    }

    ctx.restore();
  }

  function drawHud(state, muted) {
    // Top translucent walnut bar
    ctx.fillStyle = PALETTE.hudBg;
    ctx.fillRect(0, 0, FIELD.width, 72);
    ctx.fillStyle = PALETTE.hudBorder;
    ctx.fillRect(0, 70, FIELD.width, 3);

    // Score & Distance
    drawText('SCORE', 24, 24, 13, PALETTE.muted, 'left');
    drawText(String(state.score), 24, 54, 28, PALETTE.gold, 'left');

    drawText('DISTANCE', 150, 24, 13, PALETTE.muted, 'left');
    drawText(`${Math.floor(state.distance)} / ${GOAL_DISTANCE} m`, 150, 54, 24, PALETTE.text, 'left');

    // Stage badge + 3-stage progress bar in center
    drawText(state.stage.shortName, 540, 25, 16, PALETTE.gold, 'center');
    const barX = 400;
    const barY = 38;
    const barW = 280;
    const barH = 14;
    ctx.fillStyle = '#332018';
    roundRectPath(ctx, barX, barY, barW, barH, 7);
    ctx.fill();
    const prog = Math.min(1, state.distance / GOAL_DISTANCE);
    ctx.fillStyle = PALETTE.gold;
    roundRectPath(ctx, barX, barY, Math.max(8, barW * prog), barH, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudBg;
    ctx.fillRect(barX + barW / 3, barY, 2, barH);
    ctx.fillRect(barX + (barW * 2) / 3, barY, 2, barH);

    // Farmer gap meter
    const gapX = 720;
    const gapW = 196;
    const gapPct = Math.max(0, Math.min(1, state.farmer.gap / FARMER.maxGap));
    const gapColor =
      state.farmer.gap <= 28
        ? PALETTE.danger
        : state.farmer.gap <= 52
          ? PALETTE.warn
          : PALETTE.safe;
    drawText('FARMER GAP', gapX, 24, 13, PALETTE.muted, 'left');
    drawText(`${Math.round(state.farmer.gap)}%`, gapX + gapW, 24, 13, gapColor, 'right');
    ctx.fillStyle = '#332018';
    roundRectPath(ctx, gapX, 34, gapW, 18, 8);
    ctx.fill();
    ctx.fillStyle = gapColor;
    roundRectPath(ctx, gapX, 34, Math.max(6, gapW * gapPct), 18, 8);
    ctx.fill();

    // Stamina bar
    const stamX = 944;
    const stamW = 136;
    const stamPct = state.player.stamina / PLAYER.staminaMax;
    drawText('STAMINA', stamX, 24, 13, PALETTE.muted, 'left');
    ctx.fillStyle = '#332018';
    roundRectPath(ctx, stamX, 36, stamW, 14, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.stamina;
    roundRectPath(ctx, stamX, 36, Math.max(4, stamW * stamPct), 14, 6);
    ctx.fill();

    // Lives (3 hearts) + Mute icon
    for (let i = 0; i < LIVES; i += 1) {
      const hx = 1108 + i * 36;
      const hy = 34;
      ctx.fillStyle = i < state.lives ? PALETTE.heart : PALETTE.heartEmpty;
      ctx.beginPath();
      ctx.arc(hx - 6, hy - 3, 7, 0, Math.PI * 2);
      ctx.arc(hx + 6, hy - 3, 7, 0, Math.PI * 2);
      ctx.moveTo(hx - 13, hy - 1);
      ctx.lineTo(hx, hy + 13);
      ctx.lineTo(hx + 13, hy - 1);
      ctx.fill();
    }
    drawText(muted ? 'MUTE' : 'SFX', 1244, 44, 14, muted ? PALETTE.muted : PALETTE.gold, 'center');
  }

  function drawStageBanner(state) {
    if (state.stageBannerTimer <= 0) return;
    const alpha = Math.min(1, state.stageBannerTimer * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.hudBg;
    roundRectPath(ctx, FIELD.width / 2 - 210, 96, 420, 56, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(`STAGE ${state.stage.id}: ${state.stage.name.toUpperCase()}`, FIELD.width / 2, 132, 24, PALETTE.gold, 'center');
    ctx.restore();
  }

  function drawTitleOverlay(best) {
    // Top ornate logo banner leaving center chase fully visible
    ctx.fillStyle = 'rgba(26, 14, 10, 0.84)';
    roundRectPath(ctx, 210, 26, 860, 144, 22);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 4;
    ctx.stroke();

    drawText('GOBBLE AND BOLT!', FIELD.width / 2, 100, 62, PALETTE.gold, 'center', '900', true);
    drawText(
      'OUTRUN THE FARMER · HIDE IN COVER · DODGE KNIVES & OVENS TO THE FOREST',
      FIELD.width / 2,
      142,
      19,
      PALETTE.text,
      'center',
    );

    // Bottom controls + CTA bar below groundY=604 so characters' feet stay clear
    ctx.fillStyle = 'rgba(26, 14, 10, 0.88)';
    roundRectPath(ctx, 110, 614, 1060, 92, 18);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 3;
    ctx.stroke();

    drawText(
      'Move: ← → / A D / Mouse   Jump & Flutter: Space / ↑ / Click   Hide: ↓ / S / Right-Click   Dash: Shift   P: Pause · M: Mute',
      FIELD.width / 2,
      647,
      16,
      PALETTE.muted,
      'center',
    );
    drawText(
      `PRESS ENTER, SPACE OR CLICK TO ESCAPE!${best > 0 ? `   ·   BEST: ${best}` : ''}`,
      FIELD.width / 2,
      688,
      25,
      PALETTE.gold,
      'center',
      '800',
    );
  }

  function drawEndOverlay(state, screen, best) {
    const escaped = screen === SCREEN_ESCAPED;
    if (!escaped) {
      ctx.fillStyle = 'rgba(18, 10, 6, 0.48)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    const panelX = escaped ? 84 : 290;
    const panelY = 128;
    const panelW = 660;
    const panelH = 446;

    ctx.fillStyle = PALETTE.panelBg;
    roundRectPath(ctx, panelX, panelY, panelW, panelH, 22);
    ctx.fill();
    ctx.strokeStyle = escaped ? PALETTE.gold : PALETTE.danger;
    ctx.lineWidth = 4;
    ctx.stroke();

    const cx = panelX + panelW / 2;
    drawText(
      escaped ? 'ESCAPED TO THE FOREST!' : 'CAUGHT FOR DINNER!',
      cx,
      panelY + 72,
      44,
      escaped ? PALETTE.gold : PALETTE.danger,
      'center',
      '900',
      true,
    );
    drawText(
      escaped
        ? 'No gravy tonight! The turkey made it out alive at dawn.'
        : `The farmer cornered you at ${Math.floor(state.distance)} m in ${state.stage.name}.`,
      cx,
      panelY + 114,
      20,
      PALETTE.text,
      'center',
    );

    // Score & run breakdown box
    ctx.fillStyle = 'rgba(255, 240, 210, 0.06)';
    roundRectPath(ctx, panelX + 46, panelY + 144, panelW - 92, 178, 14);
    ctx.fill();

    drawText('FINAL SCORE', cx, panelY + 184, 18, PALETTE.muted, 'center');
    drawText(String(state.score), cx, panelY + 236, 52, PALETTE.gold, 'center', '900');
    drawText(
      `Distance: ${Math.floor(state.distance)} / ${GOAL_DISTANCE} m   ·   Corn: ${state.cornCount}   ·   Near Misses: ${state.nearMissCount}`,
      cx,
      panelY + 276,
      18,
      PALETTE.text,
      'center',
    );
    drawText(`Best Score: ${Math.max(best, state.score)}`, cx, panelY + 306, 18, PALETTE.safe, 'center');

    // Play again button
    ctx.fillStyle = escaped ? PALETTE.gold : '#e87d2e';
    roundRectPath(ctx, cx - 190, panelY + 350, 380, 60, 14);
    ctx.fill();
    drawText('PLAY AGAIN  (ENTER / CLICK)', cx, panelY + 389, 23, '#22120a', 'center', '800');
  }

  function drawPausedOverlay() {
    ctx.fillStyle = 'rgba(18, 10, 6, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panelBg;
    roundRectPath(ctx, 360, 230, 560, 250, 20);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawText('PAUSED', FIELD.width / 2, 315, 50, PALETTE.gold, 'center', '900');
    drawText('The farmer is catching his breath.', FIELD.width / 2, 366, 22, PALETTE.text, 'center');
    drawText('Press P, Space, or Click to resume', FIELD.width / 2, 424, 22, PALETTE.gold, 'center');
  }

  function drawPlayfield(state, screen) {
    if (screen === SCREEN_ESCAPED) {
      drawForestEscapeBackground(state.elapsed);
      const celebrationTurkey = {
        ...state.player,
        x: 910,
        y: FIELD.groundY - PLAYER.standHeight,
        width: PLAYER.standWidth,
        height: PLAYER.standHeight,
        grounded: true,
        invulnerable: 0,
        facing: 1,
      };
      drawTurkey(celebrationTurkey, state.elapsed, 'escaped');
      return;
    }

    if (state.stage.id === 1) drawFarmBackground(state.distance);
    else if (state.stage.id === 2) drawCornfieldBackground(state.distance, state.elapsed);
    else drawKitchenBackground(state.distance);

    for (let i = 0; i < state.covers.length; i += 1) drawCover(state.covers[i], 'back');
    for (let i = 0; i < state.obstacles.length; i += 1) drawObstacle(state.obstacles[i], state.elapsed);
    for (let i = 0; i < state.corns.length; i += 1) drawCorn(state.corns[i]);

    const titleFarmerX = screen === SCREEN_TITLE ? 275 : null;
    drawFarmer(state.farmer, state.stage.id, state.elapsed, titleFarmerX);
    drawTurkey(state.player, state.elapsed, screen === SCREEN_TITLE ? 'run' : null);

    // Front layer of cover overlaps the crouched turkey so hiding reads visually
    for (let i = 0; i < state.covers.length; i += 1) drawCover(state.covers[i], 'front');
    for (let i = 0; i < state.knives.length; i += 1) drawKnife(state.knives[i]);

    // Particles
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.kind === 'feather' || p.kind === 'leaf') {
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.45, p.life * 6, 0, Math.PI * 2);
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    // Floating feedback popups
    for (let i = 0; i < state.popups.length; i += 1) {
      const pop = state.popups[i];
      ctx.save();
      ctx.globalAlpha = Math.min(1, (pop.life / pop.maxLife) * 1.6);
      drawText(pop.text, pop.x, pop.y, Math.round(23 * pop.scale), pop.color, 'center', '800', true);
      ctx.restore();
    }
  }

  /** Paint one complete frame at 1280x720 scaled cleanly into the viewport. */
  function draw(state, screen, best, muted = false) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawPlayfield(state, screen);

    if (screen === SCREEN_TITLE) {
      drawTitleOverlay(best);
      return;
    }

    if (screen === SCREEN_ESCAPED) {
      drawEndOverlay(state, screen, best);
      return;
    }

    drawHud(state, muted);
    if (screen === SCREEN_PLAY) {
      drawStageBanner(state);
    } else if (screen === SCREEN_PAUSED) {
      drawPausedOverlay();
    } else if (screen === SCREEN_CAUGHT) {
      drawEndOverlay(state, screen, best);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toLogicalPoint };
}
