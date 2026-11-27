// Pure code-drawn 2D canvas renderer for Gobble and Bolt!
// Renders all 3 stages (Farmyard Dawn, Cornfield Road, Kitchen Chaos), Forest Sunrise escape,
// expressive turkey with foot hitbox marker & overhead hearts, aproned farmer with shotgun,
// distinct high-contrast hazards, independent exclamation badges, peeking cover effects, and DANGER HUD.
import { FARMER, FIELD, FONT, GOAL_DISTANCE, LIVES, PALETTE, PLAYER, SHOTGUN } from './config.js';
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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

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

function drawHeartShape(ctx, cx, cy, size) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.85);
  ctx.bezierCurveTo(cx - s * 1.25, cy + s * 0.15, cx - s * 1.15, cy - s * 0.85, cx - s * 0.45, cy - s * 0.85);
  ctx.bezierCurveTo(cx - s * 0.12, cy - s * 0.85, cx, cy - s * 0.55, cx, cy - s * 0.42);
  ctx.bezierCurveTo(cx, cy - s * 0.55, cx + s * 0.12, cy - s * 0.85, cx + s * 0.45, cy - s * 0.85);
  ctx.bezierCurveTo(cx + s * 1.15, cy - s * 0.85, cx + s * 1.25, cy + s * 0.15, cx, cy + s * 0.85);
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

  /** Standalone emoji-style exclamation badge placed near faces, ovens, muzzles, and knife lanes. */
  function drawExclamationBadge(cx, cy, radius, elapsed, urgent = false) {
    const pulse = urgent ? 1 + Math.sin(elapsed * 18) * 0.06 : 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    if (urgent) {
      ctx.strokeStyle = '#fff2a6';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i += 1) {
        const ang = -Math.PI * 0.8 + i * 0.55;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (radius + 4), Math.sin(ang) * (radius + 4));
        ctx.lineTo(Math.cos(ang) * (radius + 10), Math.sin(ang) * (radius + 10));
        ctx.stroke();
      }
    }

    const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.15, 0, 0, radius);
    grad.addColorStop(0, '#ff7847');
    grad.addColorStop(0.55, '#eb3a2d');
    grad.addColorStop(1, '#b81d18');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff2c2';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Gloss highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.32, -radius * 0.36, radius * 0.32, radius * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Bold exclamation glyph
    ctx.fillStyle = '#fff8eb';
    const stemW = Math.max(4.4, radius * 0.28);
    const stemTop = -radius * 0.56;
    const stemH = radius * 0.66;
    roundRectPath(ctx, -stemW / 2, stemTop, stemW, stemH, stemW / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, radius * 0.42, stemW * 0.56, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPumpkin(cx, cy, r) {
    ctx.save();
    ctx.fillStyle = '#536e24';
    ctx.fillRect(cx - 2.5, cy - r - 4, 5, 7);
    ctx.fillStyle = '#c45b1c';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#de7426';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.62, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 15, 10, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  /** Warm carved wood panel with subtle grain, inner bevel, and corner brass rivets. */
  function drawWoodPanel(x, y, w, h, r, borderColor = PALETTE.hudBorder, borderW = 3.5) {
    ctx.save();
    ctx.fillStyle = 'rgba(12, 6, 3, 0.42)';
    roundRectPath(ctx, x + 4, y + 6, w, h, r);
    ctx.fill();

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#3a2216');
    grad.addColorStop(0.5, '#27150d');
    grad.addColorStop(1, '#1b0e08');
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 210, 150, 0.05)';
    ctx.lineWidth = 1.5;
    for (let gy = y + 14; gy < y + h - 8; gy += 16) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.quadraticCurveTo(x + w * 0.5, gy + (gy % 32 === 14 ? 3 : -3), x + w, gy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 232, 185, 0.08)';
    ctx.fillRect(x, y, w, Math.min(26, h * 0.25));
    ctx.restore();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderW;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 238, 196, 0.22)';
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, x + 5, y + 5, w - 10, h - 10, Math.max(4, r - 4));
    ctx.stroke();

    const inset = Math.min(18, Math.max(12, r * 0.72));
    for (const [rx, ry] of [
      [x + inset, y + inset],
      [x + w - inset, y + inset],
      [x + inset, y + h - inset],
      [x + w - inset, y + h - inset],
    ]) {
      ctx.fillStyle = '#d99b38';
      ctx.beginPath();
      ctx.arc(rx, ry, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#241208';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#fff2c2';
      ctx.beginPath();
      ctx.arc(rx - 1.2, ry - 1.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Glossy beveled game badge pill with soft shadow and upper sheen. */
  function drawStyledPill(x, y, w, h, r, bgTop, bgBot, borderColor) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 8, 4, 0.45)';
    roundRectPath(ctx, x + 2, y + 4, w, h, r);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, bgTop);
    grad.addColorStop(1, bgBot);
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    roundRectPath(ctx, x + 3, y + 2, w - 6, h * 0.44, Math.max(3, r - 2));
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.6;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  function drawAutumnLeaf(cx, cy, size, angle, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.8, -size * 0.25, 0, size);
    ctx.quadraticCurveTo(-size * 0.8, -size * 0.25, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2b140a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 240, 195, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.72);
    ctx.lineTo(0, size * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  /** Subtle foreground framing silhouettes & cinematic edge vignette (never occludes play lane). */
  function drawForegroundFraming(stageId, dist, elapsed, screen) {
    ctx.save();
    if (screen === SCREEN_ESCAPED) {
      ctx.fillStyle = 'rgba(22, 38, 22, 0.78)';
      for (const [fx, dir] of [
        [28, 1],
        [1252, -1],
      ]) {
        for (let i = 0; i < 4; i += 1) {
          ctx.beginPath();
          ctx.ellipse(fx + dir * (16 + i * 24), FIELD.height - 14 - i * 8, 36, 12, dir * (-0.35 - i * 0.18), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (screen !== SCREEN_TITLE && (stageId === 1 || stageId === 2)) {
      const fgStride = 190;
      const fgOff = (dist * 30) % fgStride;
      ctx.fillStyle = 'rgba(28, 15, 8, 0.52)';
      for (let x = -fgOff - fgStride; x < FIELD.width + fgStride; x += fgStride) {
        const sway = Math.sin(elapsed * 4 + x * 0.02) * 4;
        ctx.beginPath();
        ctx.moveTo(x, FIELD.height);
        ctx.quadraticCurveTo(x + 10 + sway, FIELD.height - 34, x + 24 + sway, FIELD.height - 42);
        ctx.quadraticCurveTo(x + 22, FIELD.height - 16, x + 36, FIELD.height);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 24, FIELD.height);
        ctx.quadraticCurveTo(x + 42 - sway, FIELD.height - 26, x + 58 - sway, FIELD.height - 30);
        ctx.quadraticCurveTo(x + 46, FIELD.height - 10, x + 64, FIELD.height);
        ctx.closePath();
        ctx.fill();
      }
    } else if (screen !== SCREEN_TITLE && stageId === 3) {
      const floorSheen = ctx.createLinearGradient(0, FIELD.height - 46, 0, FIELD.height);
      floorSheen.addColorStop(0, 'rgba(255, 165, 80, 0)');
      floorSheen.addColorStop(1, 'rgba(20, 10, 5, 0.34)');
      ctx.fillStyle = floorSheen;
      ctx.fillRect(0, FIELD.height - 46, FIELD.width, 46);
    }

    const vig = ctx.createRadialGradient(
      FIELD.width * 0.5,
      FIELD.height * 0.5,
      FIELD.width * 0.36,
      FIELD.width * 0.5,
      FIELD.height * 0.5,
      FIELD.width * 0.72,
    );
    vig.addColorStop(0, 'rgba(18, 9, 5, 0)');
    vig.addColorStop(1, 'rgba(18, 9, 5, 0.24)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
  }

  function drawSunAndRays(x, y, radius, rayColor) {
    ctx.save();
    ctx.translate(x, y);
    const rayGrad = ctx.createRadialGradient(0, 0, radius * 0.6, 0, 0, 920);
    rayGrad.addColorStop(0, rayColor);
    rayGrad.addColorStop(0.55, rayColor);
    rayGrad.addColorStop(1, 'rgba(255, 224, 145, 0)');
    ctx.fillStyle = rayGrad;
    for (let i = 0; i < 12; i += 1) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 6);
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(22, 0);
      ctx.lineTo(130, -920);
      ctx.lineTo(-130, -920);
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

    // Soft dawn clouds & distant birds
    const cloudOff = (dist * 1.8) % 640;
    for (let cx = -cloudOff - 200; cx < FIELD.width + 300; cx += 640) {
      ctx.fillStyle = 'rgba(255, 214, 156, 0.14)';
      ctx.beginPath();
      ctx.ellipse(cx + 150, 128, 125, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 220, 118, 82, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 460, 178, 105, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(64, 28, 34, 0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const bx = ((880 - dist * 3 + i * 38) % (FIELD.width + 120) + (FIELD.width + 120)) % (FIELD.width + 120) - 60;
      const by = 148 + (i % 2) * 18 + Math.sin(dist * 0.25 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + 3);
      ctx.quadraticCurveTo(bx - 4, by - 4, bx, by + 2);
      ctx.quadraticCurveTo(bx + 4, by - 4, bx + 10, by + 3);
      ctx.stroke();
    }

    drawSunAndRays(980, 290, 62, 'rgba(255, 224, 145, 0.09)');

    // Far hills + distant windmill silhouette
    const hillShift = (dist * 4) % FIELD.width;
    ctx.fillStyle = PALETTE.farmHillFar;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = -200; x <= FIELD.width + 200; x += 120) {
      const wx = x - hillShift * 0.3;
      const y = FIELD.groundY - 146 - Math.sin(wx * 0.0045) * 40 - Math.cos(wx * 0.008) * 16;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(FIELD.width, FIELD.groundY);
    ctx.closePath();
    ctx.fill();

    // Distant windmill on far ridge
    const millX = ((780 - (dist * 3.5)) % 920 + 920) % 920 + 180;
    const millBaseY = FIELD.groundY - 150;
    ctx.strokeStyle = 'rgba(78, 40, 32, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(millX - 11, millBaseY + 26);
    ctx.lineTo(millX - 3, millBaseY - 34);
    ctx.lineTo(millX + 3, millBaseY - 34);
    ctx.lineTo(millX + 11, millBaseY + 26);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = dist * 0.08 + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(millX, millBaseY - 36);
      ctx.lineTo(millX + Math.cos(a) * 17, millBaseY - 36 + Math.sin(a) * 17);
      ctx.stroke();
    }

    // Near plowed hillside with subtle furrow arcs
    ctx.fillStyle = PALETTE.farmHillNear;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = -160; x <= FIELD.width + 160; x += 120) {
      const wx = x - hillShift * 0.6;
      const y = FIELD.groundY - 94 - Math.sin(wx * 0.006 + 1.1) * 24;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(FIELD.width, FIELD.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(130, 74, 46, 0.32)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row += 1) {
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 80) {
        const wx = x - hillShift * 0.6;
        const y = FIELD.groundY - 68 + row * 20 - Math.sin(wx * 0.006 + 1.1) * 16;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Warm dawn atmospheric haze separating distant hills from midground farmyard
    const haze = ctx.createLinearGradient(0, FIELD.groundY - 210, 0, FIELD.groundY);
    haze.addColorStop(0, 'rgba(248, 178, 102, 0)');
    haze.addColorStop(0.65, 'rgba(248, 178, 102, 0.16)');
    haze.addColorStop(1, 'rgba(240, 157, 70, 0.24)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, FIELD.groundY - 210, FIELD.width, 210);

    // Parallax detailed gambrel barns, silos, multi-crown autumn trees, and scarecrows
    const stride = 760;
    const offset = (dist * 10) % stride;
    for (let base = -offset - stride; base < FIELD.width + stride; base += stride) {
      // Silo with cylindrical shading, bands, ladder & cap
      const siloX = base + 324;
      const siloGrad = ctx.createLinearGradient(siloX, 0, siloX + 54, 0);
      siloGrad.addColorStop(0, '#b8a998');
      siloGrad.addColorStop(0.55, PALETTE.silo);
      siloGrad.addColorStop(1, '#6f6155');
      ctx.fillStyle = siloGrad;
      ctx.fillRect(siloX, FIELD.groundY - 240, 54, 240);
      ctx.strokeStyle = 'rgba(26, 15, 10, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(siloX, FIELD.groundY - 240, 54, 240);
      ctx.fillStyle = '#c4b5a5';
      ctx.beginPath();
      ctx.arc(siloX + 27, FIELD.groundY - 240, 27, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      // Silo vent cap + metallic hoops + chute ladder
      ctx.fillStyle = '#7c6f63';
      ctx.fillRect(siloX + 21, FIELD.groundY - 275, 12, 9);
      ctx.strokeStyle = 'rgba(42, 28, 20, 0.42)';
      ctx.lineWidth = 2;
      for (let hy = FIELD.groundY - 205; hy < FIELD.groundY - 20; hy += 44) {
        ctx.beginPath();
        ctx.moveTo(siloX, hy);
        ctx.lineTo(siloX + 54, hy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(65, 48, 38, 0.32)';
      ctx.fillRect(siloX + 35, FIELD.groundY - 224, 10, 224);

      // Detailed Red Barn with gambrel roof, cupola, plank lines, loft window & stone foundation
      const bx = base + 132;
      const bw = 192;
      const bh = 186;
      const barnGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      barnGrad.addColorStop(0, '#ae382a');
      barnGrad.addColorStop(1, '#792319');
      ctx.fillStyle = barnGrad;
      ctx.fillRect(bx, FIELD.groundY - bh, bw, bh);

      // Vertical plank texture
      ctx.strokeStyle = 'rgba(60, 14, 10, 0.22)';
      ctx.lineWidth = 1.5;
      for (let px = bx + 16; px < bx + bw; px += 16) {
        ctx.beginPath();
        ctx.moveTo(px, FIELD.groundY - bh);
        ctx.lineTo(px, FIELD.groundY - 12);
        ctx.stroke();
      }
      // Stone foundation
      ctx.fillStyle = '#6c5f57';
      ctx.fillRect(bx - 2, FIELD.groundY - 14, bw + 4, 14);

      // Gambrel 2-slope roof
      ctx.fillStyle = '#641d15';
      ctx.beginPath();
      ctx.moveTo(bx - 16, FIELD.groundY - bh + 2);
      ctx.lineTo(bx + 26, FIELD.groundY - bh - 54);
      ctx.lineTo(bx + bw / 2, FIELD.groundY - bh - 86);
      ctx.lineTo(bx + bw - 26, FIELD.groundY - bh - 54);
      ctx.lineTo(bx + bw + 16, FIELD.groundY - bh + 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 15, 10, 0.38)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Roof trim & cupola with tiny weathervane
      ctx.fillStyle = '#8b291e';
      ctx.fillRect(bx + bw / 2 - 14, FIELD.groundY - bh - 106, 28, 22);
      ctx.fillStyle = '#571812';
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2 - 18, FIELD.groundY - bh - 106);
      ctx.lineTo(bx + bw / 2, FIELD.groundY - bh - 122);
      ctx.lineTo(bx + bw / 2 + 18, FIELD.groundY - bh - 106);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(42, 22, 16, 0.65)';
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, FIELD.groundY - bh - 122);
      ctx.lineTo(bx + bw / 2, FIELD.groundY - bh - 135);
      ctx.moveTo(bx + bw / 2 - 9, FIELD.groundY - bh - 131);
      ctx.lineTo(bx + bw / 2 + 9, FIELD.groundY - bh - 131);
      ctx.stroke();

      // Loft hay window & warm glow
      ctx.fillStyle = '#471a12';
      ctx.fillRect(bx + bw / 2 - 18, FIELD.groundY - bh + 18, 36, 36);
      ctx.strokeStyle = PALETTE.barnTrim;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + bw / 2 - 18, FIELD.groundY - bh + 18, 36, 36);

      // Double barn doors
      ctx.fillStyle = '#6c1f16';
      ctx.fillRect(bx + 54, FIELD.groundY - 102, 84, 88);
      ctx.strokeStyle = PALETTE.barnTrim;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(bx + 54, FIELD.groundY - 102, 84, 88);
      ctx.beginPath();
      ctx.moveTo(bx + 54, FIELD.groundY - 102);
      ctx.lineTo(bx + 138, FIELD.groundY - 14);
      ctx.moveTo(bx + 138, FIELD.groundY - 102);
      ctx.lineTo(bx + 54, FIELD.groundY - 14);
      ctx.stroke();

      // Layered autumn tree with branched trunk
      const tx = base + 526;
      ctx.fillStyle = '#4a2919';
      ctx.fillRect(tx - 11, FIELD.groundY - 138, 22, 138);
      ctx.strokeStyle = '#4a2919';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, FIELD.groundY - 112);
      ctx.lineTo(tx - 24, FIELD.groundY - 145);
      ctx.moveTo(tx, FIELD.groundY - 120);
      ctx.lineTo(tx + 24, FIELD.groundY - 148);
      ctx.stroke();

      ctx.fillStyle = '#b4421a';
      ctx.beginPath();
      ctx.arc(tx, FIELD.groundY - 165, 56, 0, Math.PI * 2);
      ctx.arc(tx - 38, FIELD.groundY - 142, 38, 0, Math.PI * 2);
      ctx.arc(tx + 38, FIELD.groundY - 140, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc7c26';
      ctx.beginPath();
      ctx.arc(tx - 24, FIELD.groundY - 154, 34, 0, Math.PI * 2);
      ctx.arc(tx + 22, FIELD.groundY - 152, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eda83e';
      ctx.beginPath();
      ctx.arc(tx - 4, FIELD.groundY - 178, 28, 0, Math.PI * 2);
      ctx.fill();

      // Detailed Scarecrow with straw tufts, patched shirt, tilted hat & perched crow
      const sx = base + 660;
      ctx.strokeStyle = '#47281a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sx, FIELD.groundY);
      ctx.lineTo(sx, FIELD.groundY - 126);
      ctx.moveTo(sx - 38, FIELD.groundY - 92);
      ctx.lineTo(sx + 38, FIELD.groundY - 92);
      ctx.stroke();
      // Straw cuffs at sleeves and waist
      ctx.strokeStyle = '#e2b54a';
      ctx.lineWidth = 2.2;
      for (const dir of [-1, 1]) {
        for (let k = -1; k <= 1; k += 1) {
          ctx.beginPath();
          ctx.moveTo(sx + dir * 32, FIELD.groundY - 92);
          ctx.lineTo(sx + dir * 44, FIELD.groundY - 92 + k * 5);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#a84522';
      ctx.fillRect(sx - 16, FIELD.groundY - 98, 32, 46);
      ctx.fillStyle = '#6c7a38';
      ctx.fillRect(sx - 11, FIELD.groundY - 84, 11, 12);
      // Burlap sack head + tilted straw hat
      ctx.fillStyle = '#d4aa62';
      ctx.beginPath();
      ctx.arc(sx, FIELD.groundY - 122, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c49638';
      ctx.beginPath();
      ctx.ellipse(sx, FIELD.groundY - 134, 25, 5, -0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(sx - 11, FIELD.groundY - 148, 22, 14);
      // Perched crow silhouette on right arm
      ctx.fillStyle = '#241818';
      ctx.beginPath();
      ctx.ellipse(sx + 28, FIELD.groundY - 99, 7, 5, -0.2, 0, Math.PI * 2);
      ctx.arc(sx + 33, FIELD.groundY - 104, 4, 0, Math.PI * 2);
      ctx.fill();

      // Rustic wagon wheel leaning against barn + pumpkins along fence
      ctx.strokeStyle = '#4f2b16';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx + 24, FIELD.groundY - 22, 20, 0, Math.PI * 2);
      ctx.stroke();
      for (let s = 0; s < 4; s += 1) {
        const a = (s * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(bx + 24 - Math.cos(a) * 19, FIELD.groundY - 22 - Math.sin(a) * 19);
        ctx.lineTo(bx + 24 + Math.cos(a) * 19, FIELD.groundY - 22 + Math.sin(a) * 19);
        ctx.stroke();
      }
      drawPumpkin(base + 432, FIELD.groundY - 10, 12);
      drawPumpkin(base + 454, FIELD.groundY - 8, 9);
    }

    // Background wooden fence line with rail shadows
    const fenceOff = (dist * 18) % 88;
    ctx.fillStyle = '#5c331c';
    ctx.fillRect(0, FIELD.groundY - 56, FIELD.width, 8);
    ctx.fillRect(0, FIELD.groundY - 28, FIELD.width, 8);
    for (let x = -fenceOff; x < FIELD.width + 88; x += 88) {
      ctx.fillRect(x, FIELD.groundY - 70, 12, 70);
    }

    // Ground with layered turf tufts and earth strata
    const gGrad = ctx.createLinearGradient(0, FIELD.groundY, 0, FIELD.height);
    gGrad.addColorStop(0, PALETTE.farmGround);
    gGrad.addColorStop(1, '#472c16');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = PALETTE.farmGrass;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 16);
    const tuftOff = (dist * 18) % 64;
    ctx.fillStyle = '#9e6222';
    for (let x = -tuftOff; x < FIELD.width + 64; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, FIELD.groundY);
      ctx.lineTo(x + 5, FIELD.groundY - 7);
      ctx.lineTo(x + 10, FIELD.groundY);
      ctx.lineTo(x + 15, FIELD.groundY - 5);
      ctx.lineTo(x + 20, FIELD.groundY);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(26, 15, 10, 0.35)';
    ctx.fillRect(0, FIELD.groundY + 14, FIELD.width, 4);
  }

  function drawCornfieldBackground(dist, elapsed) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.cornSkyTop);
    sky.addColorStop(0.5, PALETTE.cornSkyMid);
    sky.addColorStop(1, PALETTE.cornSkyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);

    // Autumn clouds
    const cOff = (dist * 2) % 700;
    for (let cx = -cOff - 200; cx < FIELD.width + 300; cx += 700) {
      ctx.fillStyle = 'rgba(255, 218, 166, 0.13)';
      ctx.beginPath();
      ctx.ellipse(cx + 210, 108, 130, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 520, 155, 95, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawSunAndRays(280, 215, 50, 'rgba(255, 224, 145, 0.08)');

    // Far rolling hill + distant barn silhouette
    const hillShift = (dist * 3.8) % FIELD.width;
    ctx.fillStyle = '#5e3929';
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = -180; x <= FIELD.width + 180; x += 120) {
      const wx = x - hillShift * 0.4;
      ctx.lineTo(x, FIELD.groundY - 175 - Math.sin(wx * 0.005) * 28);
    }
    ctx.lineTo(FIELD.width, FIELD.groundY);
    ctx.closePath();
    ctx.fill();

    // Far dense corn wall silhouette for depth
    ctx.fillStyle = '#3f471c';
    ctx.fillRect(0, FIELD.groundY - 155, FIELD.width, 155);
    const farOff = (dist * 8) % 34;
    for (let x = -farOff; x < FIELD.width + 34; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, FIELD.groundY - 155);
      ctx.lineTo(x + 12, FIELD.groundY - 176 - ((Math.round(x + dist * 8) * 13) % 18));
      ctx.lineTo(x + 24, FIELD.groundY - 155);
      ctx.fill();
    }

    // Golden afternoon atmospheric haze over distant stalks
    const cornHaze = ctx.createLinearGradient(0, FIELD.groundY - 220, 0, FIELD.groundY);
    cornHaze.addColorStop(0, 'rgba(244, 174, 88, 0)');
    cornHaze.addColorStop(1, 'rgba(244, 174, 88, 0.22)');
    ctx.fillStyle = cornHaze;
    ctx.fillRect(0, FIELD.groundY - 220, FIELD.width, 220);

    // Midground wooden utility/fence posts, hay bales & pumpkins
    const postStride = 420;
    const postOff = (dist * 12) % postStride;
    ctx.strokeStyle = 'rgba(42, 26, 16, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = -postOff - postStride; px < FIELD.width + postStride; px += postStride) {
      ctx.moveTo(px + 90, FIELD.groundY - 245);
      ctx.quadraticCurveTo(px + 90 + postStride * 0.5, FIELD.groundY - 220, px + 90 + postStride, FIELD.groundY - 245);
    }
    ctx.stroke();

    for (let px = -postOff - postStride; px < FIELD.width + postStride; px += postStride) {
      ctx.fillStyle = '#472a18';
      ctx.fillRect(px + 85, FIELD.groundY - 255, 10, 255);
      ctx.fillRect(px + 67, FIELD.groundY - 246, 46, 7);

      // Rolled straw bale & roadside pumpkins
      ctx.fillStyle = '#b9882f';
      ctx.beginPath();
      ctx.arc(px + 255, FIELD.groundY - 28, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c5617';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + 255, FIELD.groundY - 28, 17, 0, Math.PI * 2);
      ctx.stroke();
      drawPumpkin(px + 305, FIELD.groundY - 10, 11);
      drawPumpkin(px + 326, FIELD.groundY - 8, 9);
    }

    // Swaying back rows of tall corn stalks with tassels and ears
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

      // Top corn tassel
      ctx.strokeStyle = '#c49d44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + sway, FIELD.groundY - h);
      ctx.lineTo(x + sway - 8, FIELD.groundY - h - 16);
      ctx.moveTo(x + sway, FIELD.groundY - h);
      ctx.lineTo(x + sway + 7, FIELD.groundY - h - 18);
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

    // Dirt road ground with wheel ruts, grassy shoulder & passing pebbles
    const roadGrad = ctx.createLinearGradient(0, FIELD.groundY, 0, FIELD.height);
    roadGrad.addColorStop(0, PALETTE.cornRoad);
    roadGrad.addColorStop(1, '#3b2414');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = '#7e7d34';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 8);
    ctx.fillStyle = PALETTE.cornDust;
    ctx.fillRect(0, FIELD.groundY + 8, FIELD.width, 9);
    ctx.fillStyle = '#472c18';
    ctx.fillRect(0, FIELD.groundY + 42, FIELD.width, 14);
    ctx.fillRect(0, FIELD.groundY + 76, FIELD.width, 10);
    const pebOff = (dist * 18) % 90;
    ctx.fillStyle = 'rgba(205, 160, 110, 0.25)';
    for (let x = -pebOff; x < FIELD.width + 90; x += 90) {
      ctx.fillRect(x + 12, FIELD.groundY + 28, 9, 4);
      ctx.fillRect(x + 54, FIELD.groundY + 62, 12, 4);
    }
  }

  function drawKitchenBackground(dist) {
    // Warm rustic kitchen wall with low-contrast backsplash tiles (no harsh flicker)
    const wallGrad = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    wallGrad.addColorStop(0, PALETTE.kitchenWallTop);
    wallGrad.addColorStop(1, '#4a291e');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);

    const tile = 64;
    const tileOff = (dist * 14) % (tile * 2);
    for (let row = 0; row < 5; row += 1) {
      for (let col = -2; col < FIELD.width / tile + 3; col += 1) {
        const tx = col * tile - tileOff;
        const ty = FIELD.groundY - 340 + row * tile;
        ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.kitchenWallTileA : PALETTE.kitchenWallTileB;
        ctx.fillRect(tx, ty, tile, tile);
        ctx.fillStyle = 'rgba(255, 224, 195, 0.05)';
        ctx.fillRect(tx + 2, ty + 2, tile - 4, 3);
        ctx.strokeStyle = PALETTE.kitchenWallMortar;
        ctx.lineWidth = 2;
        ctx.strokeRect(tx, ty, tile, tile);
      }
    }
    // Subtle wainscoting rail & baseboard
    ctx.fillStyle = PALETTE.kitchenWood;
    ctx.fillRect(0, FIELD.groundY - 348, FIELD.width, 10);
    ctx.fillStyle = '#3b1f13';
    ctx.fillRect(0, FIELD.groundY - 14, FIELD.width, 14);

    // Repeating rustic arched window + wooden shelf with kitchen props (muted contrast so hazards pop)
    const bayStride = 680;
    const bayOff = (dist * 14) % bayStride;
    for (let bx = -bayOff - bayStride; bx < FIELD.width + bayStride; bx += bayStride) {
      // Muted evening window looking onto autumn dusk
      const wx = bx + 430;
      const wy = FIELD.groundY - 318;
      ctx.fillStyle = '#3a1e13';
      roundRectPath(ctx, wx - 6, wy - 6, 112, 132, 14);
      ctx.fill();
      const winGrad = ctx.createLinearGradient(0, wy, 0, wy + 120);
      winGrad.addColorStop(0, '#364d63');
      winGrad.addColorStop(1, '#c97c42');
      ctx.fillStyle = winGrad;
      roundRectPath(ctx, wx, wy, 100, 120, 10);
      ctx.fill();
      ctx.strokeStyle = '#4a2819';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(wx + 50, wy);
      ctx.lineTo(wx + 50, wy + 120);
      ctx.moveTo(wx, wy + 60);
      ctx.lineTo(wx + 100, wy + 60);
      ctx.stroke();

      // Wooden wall shelf with spice jars, ceramic pitcher & cooling pie
      const shX = bx + 110;
      const shY = FIELD.groundY - 235;
      ctx.fillStyle = '#4a2819';
      ctx.fillRect(shX, shY, 210, 11);
      ctx.fillRect(shX + 20, shY + 11, 10, 14);
      ctx.fillRect(shX + 180, shY + 11, 10, 14);
      // Spice jars
      for (let j = 0; j < 3; j += 1) {
        ctx.fillStyle = j === 1 ? '#a84a2a' : '#8e7748';
        roundRectPath(ctx, shX + 18 + j * 26, shY - 26, 18, 26, 4);
        ctx.fill();
        ctx.fillStyle = '#523424';
        ctx.fillRect(shX + 20 + j * 26, shY - 30, 14, 5);
      }
      // Stacked ceramic plates
      ctx.fillStyle = '#bfa992';
      ctx.fillRect(shX + 104, shY - 7, 36, 7);
      ctx.fillRect(shX + 107, shY - 14, 30, 7);
      // Cooling pie in tin
      ctx.fillStyle = '#8b949e';
      ctx.fillRect(shX + 150, shY - 8, 44, 8);
      ctx.fillStyle = '#c47b35';
      ctx.beginPath();
      ctx.ellipse(shX + 172, shY - 8, 20, 7, 0, Math.PI, 0);
      ctx.fill();
    }

    // Overhead beam & hanging copper pans/utensils
    ctx.fillStyle = PALETTE.kitchenWood;
    ctx.fillRect(0, 128, FIELD.width, 20);
    ctx.fillStyle = 'rgba(255, 224, 175, 0.14)';
    ctx.fillRect(0, 128, FIELD.width, 3);
    const panOff = (dist * 16) % 340;
    for (let x = -panOff; x < FIELD.width + 340; x += 340) {
      // Soft warm additive pendant lamp light cone
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const coneGrad = ctx.createLinearGradient(x + 170, 95, x + 170, 445);
      coneGrad.addColorStop(0, 'rgba(255, 206, 110, 0.2)');
      coneGrad.addColorStop(0.55, 'rgba(255, 180, 82, 0.08)');
      coneGrad.addColorStop(1, 'rgba(255, 180, 82, 0)');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(x + 148, 96);
      ctx.lineTo(x + 192, 96);
      ctx.lineTo(x + 295, 445);
      ctx.lineTo(x + 45, 445);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#2d1c14';
      ctx.fillRect(x + 168, 0, 4, 85);
      ctx.fillStyle = PALETTE.copper;
      ctx.beginPath();
      ctx.arc(x + 170, 98, 28, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 232, 190, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + 160, 84, 8, 3.5, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Hanging copper pan with handle, metallic rim & specular arc
      ctx.fillStyle = '#382c28';
      ctx.fillRect(x + 66, 148, 6, 48);
      ctx.fillStyle = PALETTE.copper;
      ctx.beginPath();
      ctx.arc(x + 69, 218, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#783b1c';
      ctx.beginPath();
      ctx.arc(x + 69, 218, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 228, 185, 0.42)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 69, 218, 20, -Math.PI * 0.85, -Math.PI * 0.3);
      ctx.stroke();

      // Hanging copper pot with lid, knob, and side handles
      ctx.fillStyle = '#382c28';
      ctx.fillRect(x + 272, 148, 4, 30);
      ctx.fillStyle = '#b56332';
      roundRectPath(ctx, x + 253, 184, 40, 28, 6);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#d17b43';
      ctx.beginPath();
      ctx.ellipse(x + 273, 184, 21, 5, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8b948';
      ctx.beginPath();
      ctx.arc(x + 273, 177, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 252, 195, 5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 294, 195, 5, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    }

    // Open back door to forest freedom as the turkey nears 1200m
    if (dist > 1020) {
      const doorX = FIELD.width - 190 - (1200 - dist) * 1.2;
      if (doorX < FIELD.width + 60) {
        ctx.fillStyle = '#472414';
        ctx.fillRect(doorX - 14, FIELD.groundY - 268, 168, 268);
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(doorX - 14, FIELD.groundY - 268, 168, 268);
        const exitSky = ctx.createLinearGradient(0, FIELD.groundY - 252, 0, FIELD.groundY);
        exitSky.addColorStop(0, '#41696b');
        exitSky.addColorStop(1, '#ffd17a');
        ctx.fillStyle = exitSky;
        ctx.fillRect(doorX, FIELD.groundY - 252, 140, 252);
        // Layered pine silhouettes outside
        ctx.fillStyle = PALETTE.pineMid;
        ctx.beginPath();
        ctx.moveTo(doorX + 20, FIELD.groundY - 30);
        ctx.lineTo(doorX + 52, FIELD.groundY - 155);
        ctx.lineTo(doorX + 86, FIELD.groundY - 30);
        ctx.fill();
        ctx.fillStyle = PALETTE.pineDark;
        ctx.beginPath();
        ctx.moveTo(doorX + 54, FIELD.groundY - 20);
        ctx.lineTo(doorX + 90, FIELD.groundY - 196);
        ctx.lineTo(doorX + 126, FIELD.groundY - 20);
        ctx.fill();
        // Swung-open wooden door leaf on left edge
        ctx.fillStyle = '#63331c';
        ctx.fillRect(doorX - 24, FIELD.groundY - 252, 20, 252);
        ctx.strokeRect(doorX - 24, FIELD.groundY - 252, 20, 252);
        drawText('EXIT', clamp(doorX + 70, 56, FIELD.width - 56), FIELD.groundY - 278, 24, PALETTE.gold, 'center', 'bold', true);
      }
    }

    // Low-contrast checkered kitchen floor
    const floorTile = 72;
    const floorOff = (dist * 18) % (floorTile * 2);
    ctx.fillStyle = PALETTE.kitchenFloorA;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = PALETTE.kitchenFloorB;
    for (let col = -2; col < FIELD.width / floorTile + 3; col += 2) {
      ctx.fillRect(col * floorTile - floorOff, FIELD.groundY, floorTile, 54);
      ctx.fillRect((col + 1) * floorTile - floorOff, FIELD.groundY + 54, floorTile, 64);
    }
    ctx.fillStyle = 'rgba(255, 232, 200, 0.12)';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 3);
  }

  function drawForestEscapeBackground(elapsed) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.forestTop);
    sky.addColorStop(0.55, PALETTE.forestMid);
    sky.addColorStop(1, PALETTE.forestLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);

    // Misty morning ridge
    ctx.fillStyle = 'rgba(55, 72, 68, 0.36)';
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 120) {
      ctx.lineTo(x, FIELD.groundY - 195 - Math.sin(x * 0.004) * 42);
    }
    ctx.lineTo(FIELD.width, FIELD.groundY);
    ctx.closePath();
    ctx.fill();

    drawSunAndRays(930, 320, 74, 'rgba(255, 232, 150, 0.14)');

    // Morning mist haze between distant ridge and trees
    const mist = ctx.createLinearGradient(0, FIELD.groundY - 220, 0, FIELD.groundY);
    mist.addColorStop(0, 'rgba(255, 216, 148, 0)');
    mist.addColorStop(1, 'rgba(255, 216, 148, 0.24)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, FIELD.groundY - 220, FIELD.width, 220);

    // 3-tier pine silhouettes instead of flat single triangles
    for (let i = 0; i < 11; i += 1) {
      const tx = 60 + i * 124;
      const th = 225 + (i % 3) * 55;
      ctx.fillStyle = '#3b2418';
      ctx.fillRect(tx - 7, FIELD.groundY - 46, 14, 46);
      ctx.fillStyle = i % 2 === 0 ? PALETTE.pineDark : PALETTE.pineMid;
      for (let tier = 0; tier < 3; tier += 1) {
        const tierTop = FIELD.groundY - th + tier * (th * 0.24);
        const tierBottom = FIELD.groundY - 26 - (2 - tier) * (th * 0.22);
        const halfW = 36 + tier * 17;
        ctx.beginPath();
        ctx.moveTo(tx, tierTop);
        ctx.lineTo(tx - halfW, tierBottom);
        ctx.lineTo(tx + halfW, tierBottom);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Foreground autumn trees with branches & multi-puff canopies
    const autumns = [
      { x: 160, h: 170, c: PALETTE.autumnLeafA, hi: '#ee7538' },
      { x: 1120, h: 195, c: PALETTE.autumnLeafB, hi: '#f7b94a' },
      { x: 1215, h: 150, c: PALETTE.autumnLeafC, hi: '#ffe07d' },
    ];
    for (const t of autumns) {
      ctx.fillStyle = '#47281a';
      ctx.fillRect(t.x - 10, FIELD.groundY - t.h, 20, t.h);
      ctx.fillStyle = t.c;
      ctx.beginPath();
      ctx.arc(t.x, FIELD.groundY - t.h - 15, 56, 0, Math.PI * 2);
      ctx.arc(t.x - 32, FIELD.groundY - t.h + 4, 34, 0, Math.PI * 2);
      ctx.arc(t.x + 32, FIELD.groundY - t.h + 2, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.hi;
      ctx.beginPath();
      ctx.arc(t.x - 8, FIELD.groundY - t.h - 24, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    // Meadow ground with ferns and small mushrooms
    ctx.fillStyle = '#4d612d';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = '#7c8f3b';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 18);
    for (const fx of [780, 1050, 1175]) {
      ctx.fillStyle = '#385727';
      ctx.beginPath();
      ctx.ellipse(fx - 10, FIELD.groundY - 4, 16, 6, -0.45, 0, Math.PI * 2);
      ctx.ellipse(fx + 10, FIELD.groundY - 4, 16, 6, 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

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
    if (x + width < 24 || x > FIELD.width - 24) return;
    const cx = clamp(x + width / 2, 62, FIELD.width - 62);
    drawStyledPill(cx - 56, y - 48, 112, 36, 13, '#23421a', '#101f0c', '#9cf07a');
    drawText('HIDE ↓', cx, y - 23, 19, '#b0ff92', 'center', '800', true);
  }

  function drawCover(cover, layer, elapsed = 0, isActiveHidden = false) {
    const wobbleX = isActiveHidden ? Math.sin(elapsed * 12) * 1.8 : 0;
    const x = cover.x + wobbleX;
    const { y, width, height, kind } = cover;
    if (layer === 'back') {
      // Safe hide-zone ground strip so players immediately distinguish cover from hazards
      ctx.save();
      ctx.fillStyle = 'rgba(104, 184, 73, 0.24)';
      ctx.fillRect(x + 6, FIELD.groundY - 6, width - 12, 12);
      ctx.strokeStyle = 'rgba(156, 240, 122, 0.72)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + 12, FIELD.groundY + 2);
      ctx.lineTo(x + width - 12, FIELD.groundY + 2);
      ctx.stroke();
      ctx.restore();
    }

    if (kind === COVER_HAYSTACK) {
      ctx.save();
      if (layer === 'back') {
        // Fluffy back hay mounds with warm ochre depth and protruding wisps
        const backGrad = ctx.createLinearGradient(x, y - 14, x, FIELD.groundY);
        backGrad.addColorStop(0, '#cf9932');
        backGrad.addColorStop(1, '#855816');
        ctx.fillStyle = backGrad;
        ctx.beginPath();
        ctx.moveTo(x - 10, FIELD.groundY);
        ctx.quadraticCurveTo(x - 8, y + 34, x + width * 0.24, y + 14);
        ctx.quadraticCurveTo(x + width * 0.44, y - 18, x + width * 0.62, y + 2);
        ctx.quadraticCurveTo(x + width * 0.86, y + 8, x + width + 10, FIELD.groundY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.6;
        ctx.stroke();

        ctx.strokeStyle = '#e0ae42';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        const wisps = [
          [x + width * 0.16, y + 22, -14, -9],
          [x + width * 0.38, y - 3, -9, -14],
          [x + width * 0.56, y - 6, 8, -15],
          [x + width * 0.8, y + 12, 15, -10],
        ];
        for (const [wx, wy, dx, dy] of wisps) {
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + dx, wy + dy);
          ctx.stroke();
        }
      } else {
        // Multi-tiered fluffy hay bed (soft overlapping bundles, crossed straw wisps, warm gold highlights)
        const hayGrad = ctx.createLinearGradient(x, y + 14, x, FIELD.groundY);
        hayGrad.addColorStop(0, '#ffe885');
        hayGrad.addColorStop(0.45, '#f2c249');
        hayGrad.addColorStop(1, '#b87f20');
        ctx.fillStyle = hayGrad;
        ctx.beginPath();
        ctx.moveTo(x - 8, FIELD.groundY);
        ctx.bezierCurveTo(x - 14, y + 66, x + 6, y + 36, x + width * 0.22, y + 36);
        ctx.bezierCurveTo(x + width * 0.3, y + 14, x + width * 0.52, y + 10, x + width * 0.62, y + 26);
        ctx.bezierCurveTo(x + width * 0.78, y + 18, x + width * 0.96, y + 42, x + width + 8, FIELD.groundY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.8;
        ctx.stroke();

        // Soft upper pillow puffs
        ctx.fillStyle = 'rgba(255, 248, 198, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x + width * 0.36, y + 36, width * 0.18, 13, -0.15, 0, Math.PI * 2);
        ctx.ellipse(x + width * 0.66, y + 40, width * 0.16, 12, 0.14, 0, Math.PI * 2);
        ctx.fill();

        // Cross-hatched organic straw tufts (no parallel ribs)
        ctx.lineCap = 'round';
        const tufts = [
          [0.14, 0.78, 28, -14, '#8f5e16', 2.6],
          [0.2, 0.55, 32, -8, '#fff2b2', 2.2],
          [0.32, 0.85, 36, -10, '#a36c1b', 2.5],
          [0.36, 0.44, 28, 10, '#fff2b2', 2.1],
          [0.48, 0.72, -30, -14, '#8f5e16', 2.5],
          [0.54, 0.38, 26, -6, '#fff4bf', 2.2],
          [0.64, 0.82, -26, -12, '#a36c1b', 2.5],
          [0.72, 0.54, -30, -8, '#fff2b2', 2.1],
          [0.82, 0.78, -28, -15, '#8f5e16', 2.5],
          [0.24, 0.68, 24, 8, '#d99e2e', 2.2],
          [0.58, 0.62, 26, 9, '#d99e2e', 2.2],
          [0.78, 0.66, -24, 9, '#d99e2e', 2.2],
        ];
        for (const [fx, fy, dx, dy, col, lw] of tufts) {
          const sx = x + width * fx;
          const sy = y + height * fy;
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + dx * 0.5, sy + dy * 0.35 - 4, sx + dx, sy + dy);
          ctx.stroke();
        }

        // Fluffy loose straw sprigs along the outer contour and ground
        ctx.strokeStyle = '#f5cf5e';
        ctx.lineWidth = 2.4;
        const sprigs = [
          [x + 2, FIELD.groundY - 22, -16, -7],
          [x + 8, FIELD.groundY - 38, -14, -12],
          [x + 22, y + 40, -13, -12],
          [x + width * 0.46, y + 18, -5, -14],
          [x + width * 0.56, y + 20, 8, -13],
          [x + width - 18, y + 40, 14, -11],
          [x + width - 2, FIELD.groundY - 24, 16, -7],
          [x + 14, FIELD.groundY - 1, -15, 3],
          [x + width - 14, FIELD.groundY - 1, 16, 2],
        ];
        for (const [sx, sy, dx, dy] of sprigs) {
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + dx, sy + dy);
          ctx.stroke();
        }
        if (!isActiveHidden) drawHideBadge(x, y, width);
      }
      ctx.restore();
      return;
    }

    if (kind === COVER_BARREL) {
      ctx.save();
      if (layer === 'back') {
        ctx.fillStyle = '#4e2816';
        roundRectPath(ctx, x, y, width, height, 22);
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.fillStyle = '#29140a';
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + 18, width * 0.4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const barGrad = ctx.createLinearGradient(x, 0, x + width, 0);
        barGrad.addColorStop(0, '#a65d33');
        barGrad.addColorStop(0.48, '#804424');
        barGrad.addColorStop(1, '#542912');
        ctx.fillStyle = barGrad;
        roundRectPath(ctx, x + 4, y + 22, width - 8, height - 22, 18);
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.8;
        ctx.stroke();

        // Stave seams
        ctx.strokeStyle = 'rgba(32, 15, 6, 0.42)';
        ctx.lineWidth = 2;
        for (const frac of [0.28, 0.5, 0.72]) {
          ctx.beginPath();
          ctx.moveTo(x + width * frac, y + 24);
          ctx.lineTo(x + width * frac, y + height - 3);
          ctx.stroke();
        }
        // Iron hoops with rivets
        for (const hy of [y + 36, y + height - 26]) {
          ctx.fillStyle = '#3b3330';
          ctx.fillRect(x + 4, hy, width - 8, 10);
          ctx.strokeStyle = PALETTE.ink;
          ctx.lineWidth = 1.8;
          ctx.strokeRect(x + 4, hy, width - 8, 10);
          ctx.fillStyle = '#8b7e78';
          for (const rx of [x + 16, x + width * 0.5, x + width - 16]) {
            ctx.beginPath();
            ctx.arc(rx, hy + 5, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (!isActiveHidden) drawHideBadge(x, y, width);
      }
      ctx.restore();
      return;
    }

    if (kind === COVER_CORN_PATCH) {
      ctx.save();
      const stalkColor = layer === 'back' ? PALETTE.cornStalkDark : PALETTE.cornStalk;
      const sway = Math.sin(elapsed * 3.1 + cover.id) * 5;
      const count = 6;
      for (let i = 0; i < count; i += 1) {
        const sx = x + 16 + (i * (width - 32)) / (count - 1);
        const topY = layer === 'back' ? y : y + 34;
        const topX = sx + (i % 2 === 0 ? 5 : -5) + sway * (layer === 'back' ? 0.6 : 1);
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, FIELD.groundY);
        ctx.quadraticCurveTo(sx + sway * 0.4, (FIELD.groundY + topY) * 0.5, topX, topY);
        ctx.stroke();
        ctx.strokeStyle = stalkColor;
        ctx.lineWidth = 8;
        ctx.stroke();

        // Corn tassel at tip
        ctx.strokeStyle = '#d4aa48';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(topX - 7, topY - 13);
        ctx.moveTo(topX, topY);
        ctx.lineTo(topX + 7, topY - 14);
        ctx.stroke();

        ctx.fillStyle = layer === 'back' ? '#627029' : '#9ab33f';
        ctx.beginPath();
        ctx.ellipse(topX + 14, topY + 26, 22, 7, 0.5, 0, Math.PI * 2);
        ctx.ellipse(topX - 14, topY + 42, 22, 7, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        if (layer === 'front' && i % 2 === 1) {
          ctx.fillStyle = PALETTE.cornCob;
          ctx.beginPath();
          ctx.ellipse(topX + 4, topY + 54, 6, 12, 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      if (layer === 'front' && !isActiveHidden) drawHideBadge(x, y, width);
      ctx.restore();
      return;
    }

    // COVER_FLOUR_SACK
    ctx.save();
    if (layer === 'back') {
      ctx.fillStyle = '#bfa98d';
      roundRectPath(ctx, x, y + 12, width, height - 12, 26);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    } else {
      // Soft flour dust puff on floor
      ctx.fillStyle = 'rgba(247, 239, 225, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + width * 0.5, FIELD.groundY + 2, width * 0.52, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const sackGrad = ctx.createLinearGradient(x, y + 26, x + width, FIELD.groundY);
      sackGrad.addColorStop(0, '#fbf4e8');
      sackGrad.addColorStop(0.65, '#ead9c1');
      sackGrad.addColorStop(1, '#cfb898');
      ctx.fillStyle = sackGrad;
      // Gathered tied top + plump sack body
      ctx.beginPath();
      ctx.moveTo(x + 14, FIELD.groundY);
      ctx.quadraticCurveTo(x + 2, y + 62, x + 16, y + 34);
      ctx.quadraticCurveTo(x + 28, y + 20, x + 46, y + 28);
      ctx.lineTo(x + width - 46, y + 28);
      ctx.quadraticCurveTo(x + width - 28, y + 20, x + width - 16, y + 34);
      ctx.quadraticCurveTo(x + width - 2, y + 62, x + width - 14, FIELD.groundY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Twine tie & vintage red stripe
      ctx.fillStyle = '#9c6e3b';
      ctx.fillRect(x + 38, y + 28, width - 76, 7);
      ctx.strokeRect(x + 38, y + 28, width - 76, 7);
      ctx.fillStyle = '#c44230';
      ctx.fillRect(x + 20, y + 48, width - 40, 6);
      drawText('FLOUR', x + width / 2, y + height - 22, 22, '#7d4d31', 'center', '800');
      if (!isActiveHidden) drawHideBadge(x, y, width);
    }
    ctx.restore();
  }

  /**
   * Draw comic rustle lines and big stylized peeking eyes inside the active cover
   * so hiding behind hay, barrels, corn, or flour sacks reads unmistakably at a glance.
   */
  function drawHidingPeekEffect(cover, player, farmer, elapsed) {
    const wobbleX = Math.sin(elapsed * 12) * 1.8;
    const covX = cover.x + wobbleX;
    const cx = clamp(player.x + player.width * 0.5, covX + 36, covX + cover.width - 36);
    const peekY =
      cover.kind === COVER_CORN_PATCH
        ? cover.y + 72
        : cover.kind === COVER_HAYSTACK
          ? cover.y + 68
          : cover.y + 62;

    ctx.save();
    // Comic rustle arcs outside cover edges
    ctx.strokeStyle = 'rgba(255, 244, 200, 0.72)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const arcPulse = Math.sin(elapsed * 14) * 2;
    ctx.beginPath();
    ctx.arc(covX - 8 - arcPulse, peekY, 13, Math.PI * 0.72, Math.PI * 1.28);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(covX + cover.width + 8 + arcPulse, peekY, 13, -Math.PI * 0.28, Math.PI * 0.28);
    ctx.stroke();

    // Dark shadow parting slit inside the cover where the turkey peeks out
    ctx.fillStyle = '#24140b';
    ctx.beginPath();
    ctx.ellipse(cx, peekY, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Stylized peeking eyes looking cautiously left toward the searching farmer
    const blink = (elapsed * 1.3) % 3.2 > 3.02;
    const lookX = Math.sin(elapsed * 2.8) > 0.35 ? 1.5 : -2.5;
    for (const dx of [-10, 10]) {
      if (blink) {
        ctx.strokeStyle = '#fff8eb';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx + dx - 6, peekY);
        ctx.lineTo(cx + dx + 6, peekY);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx + dx, peekY, 7.2, 8.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#18100c';
        ctx.beginPath();
        ctx.arc(cx + dx + lookX, peekY, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + dx + lookX - 1.2, peekY - 1.5, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tiny nervous sweat drop while farmer is searching
    if (farmer.state === 'searching') {
      const dropY = peekY - 12 + Math.sin(elapsed * 8) * 1.5;
      ctx.fillStyle = '#7cd8ff';
      ctx.beginPath();
      ctx.moveTo(cx + 28, dropY - 7);
      ctx.quadraticCurveTo(cx + 34, dropY + 1, cx + 28, dropY + 5);
      ctx.quadraticCurveTo(cx + 22, dropY + 1, cx + 28, dropY - 7);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawObstacle(obs, elapsed) {
    const { x, y, width, height, kind } = obs;
    // Soft grounded contact shadow shared by all ground hazards
    ctx.fillStyle = 'rgba(18, 9, 4, 0.34)';
    ctx.beginPath();
    ctx.ellipse(x + width * 0.5, FIELD.groundY + 3, width * 0.56, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (kind === OBS_FENCE) {
      // High-contrast whitewashed ranch fence with nail heads & glossy red hazard tips
      for (const px of [x + 4, x + width - 18]) {
        const postGrad = ctx.createLinearGradient(px, 0, px + 14, 0);
        postGrad.addColorStop(0, '#ffffff');
        postGrad.addColorStop(0.55, PALETTE.fenceWhite);
        postGrad.addColorStop(1, PALETTE.fenceShade);
        ctx.fillStyle = postGrad;
        ctx.fillRect(px, y, 14, height);
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 3;
        ctx.strokeRect(px, y, 14, height);

        const capGrad = ctx.createLinearGradient(px, y - 9, px, y + 2);
        capGrad.addColorStop(0, '#f25141');
        capGrad.addColorStop(1, '#b8251a');
        ctx.fillStyle = capGrad;
        ctx.fillRect(px - 1, y - 9, 16, 11);
        ctx.strokeRect(px - 1, y - 9, 16, 11);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(px + 1, y - 7, 12, 3);
      }

      for (const ry of [y + 12, y + 40]) {
        const railGrad = ctx.createLinearGradient(0, ry, 0, ry + 14);
        railGrad.addColorStop(0, '#ffffff');
        railGrad.addColorStop(0.7, PALETTE.fenceWhite);
        railGrad.addColorStop(1, PALETTE.fenceShade);
        ctx.fillStyle = railGrad;
        ctx.fillRect(x, ry, width, 14);
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, ry, width, 14);
        ctx.fillStyle = '#6c6258';
        ctx.beginPath();
        ctx.arc(x + 11, ry + 7, 2, 0, Math.PI * 2);
        ctx.arc(x + width - 11, ry + 7, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (kind === OBS_BARREL) {
      // Steel-blue barrel with metallic sheen, stave seams & riveted gold hoops
      const bGrad = ctx.createLinearGradient(x, 0, x + width, 0);
      bGrad.addColorStop(0, '#72a8cf');
      bGrad.addColorStop(0.28, PALETTE.barrelBlueLight);
      bGrad.addColorStop(0.65, PALETTE.barrelBlue);
      bGrad.addColorStop(1, PALETTE.barrelBlueDark);
      ctx.fillStyle = bGrad;
      roundRectPath(ctx, x, y, width, height, 15);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      roundRectPath(ctx, x + 9, y + 6, 10, height - 12, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 38, 54, 0.35)';
      ctx.lineWidth = 1.6;
      for (const fx of [0.35, 0.65]) {
        ctx.beginPath();
        ctx.moveTo(x + width * fx, y + 3);
        ctx.lineTo(x + width * fx, y + height - 3);
        ctx.stroke();
      }

      for (const hy of [y + 13, y + height - 22]) {
        const hGrad = ctx.createLinearGradient(0, hy, 0, hy + 9);
        hGrad.addColorStop(0, '#ffe388');
        hGrad.addColorStop(1, '#c48f24');
        ctx.fillStyle = hGrad;
        ctx.fillRect(x + 1, hy, width - 2, 9);
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.2;
        ctx.strokeRect(x + 1, hy, width - 2, 9);
        ctx.fillStyle = '#5c3c0e';
        ctx.beginPath();
        ctx.arc(x + 12, hy + 4.5, 1.8, 0, Math.PI * 2);
        ctx.arc(x + width - 12, hy + 4.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (kind === OBS_COUNTER) {
      // Cool teal cabinet + polished stainless top + brass drawer handle
      const cabGrad = ctx.createLinearGradient(x, 0, x + width, 0);
      cabGrad.addColorStop(0, '#3a7585');
      cabGrad.addColorStop(0.5, PALETTE.counterTeal);
      cabGrad.addColorStop(1, PALETTE.counterTealDark);
      ctx.fillStyle = cabGrad;
      ctx.fillRect(x + 4, y + 14, width - 8, height - 14);
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3.2;
      ctx.strokeRect(x + 4, y + 14, width - 8, height - 14);

      ctx.fillStyle = '#18333b';
      ctx.fillRect(x + 14, y + 28, width - 28, height - 38);
      ctx.strokeStyle = '#5ca0b0';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 14, y + 28, width - 28, height - 38);
      ctx.fillStyle = '#f2be4b';
      roundRectPath(ctx, x + width * 0.5 - 12, y + 36, 24, 5, 2.5);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      const topGrad = ctx.createLinearGradient(0, y, 0, y + 18);
      topGrad.addColorStop(0, '#ffffff');
      topGrad.addColorStop(0.55, PALETTE.counterTop);
      topGrad.addColorStop(1, PALETTE.counterTopShade);
      ctx.fillStyle = topGrad;
      roundRectPath(ctx, x, y, width, 18, 6);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 2);
      ctx.lineTo(x + 34, y + 2);
      ctx.lineTo(x + 24, y + 15);
      ctx.lineTo(x + 4, y + 15);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // OBS_OVEN: dark slate cast-iron body with steel handle, window rack & additive flame glow
    const shake = obs.ovenPhase === 'warn' ? Math.sin(elapsed * 55) * 4 : 0;
    const ox = x + shake;
    const ovenGrad = ctx.createLinearGradient(ox, 0, ox + width, 0);
    ovenGrad.addColorStop(0, '#5a6b82');
    ovenGrad.addColorStop(0.3, PALETTE.ovenBody);
    ovenGrad.addColorStop(1, '#141922');
    ctx.fillStyle = ovenGrad;
    roundRectPath(ctx, ox, y, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3.4;
    ctx.stroke();

    ctx.fillStyle = PALETTE.ovenTrim;
    ctx.fillRect(ox + 6, y + 4, width - 12, 4);
    ctx.fillStyle = PALETTE.gold;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(ox + 20 + i * 26, y + 17, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    ctx.fillStyle = '#cbd5e1';
    roundRectPath(ctx, ox + 22, y + 32, width - 44, 6, 3);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const glowColor =
      obs.ovenPhase === 'blast'
        ? '#ff8424'
        : obs.ovenPhase === 'warn'
          ? Math.floor(elapsed * 14) % 2 === 0
            ? '#ff451a'
            : '#ffa52e'
          : '#38221d';
    ctx.fillStyle = PALETTE.ovenDoor;
    roundRectPath(ctx, ox + 14, y + 42, width - 28, height - 56, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ovenTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = glowColor;
    roundRectPath(ctx, ox + 24, y + 50, width - 48, height - 74, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 15, 10, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 26, y + 76);
    ctx.lineTo(ox + width - 26, y + 76);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo(ox + 30, y + 52);
    ctx.lineTo(ox + 48, y + 52);
    ctx.lineTo(ox + 32, y + height - 28);
    ctx.lineTo(ox + 26, y + height - 28);
    ctx.closePath();
    ctx.fill();

    if (obs.ovenPhase === 'warn' && ox + width > 16 && ox < FIELD.width - 16) {
      const badgeCx = clamp(ox + width / 2, 64, FIELD.width - 64);
      drawStyledPill(badgeCx - 56, y - 54, 112, 40, 12, '#ff6333', '#cc2614', '#fff2c2');
      drawText('OVEN', badgeCx, y - 26, 23, '#fff6e6', 'center', '900', true);
      drawExclamationBadge(clamp(ox + width - 4, 24, FIELD.width - 24), y - 6, 18, elapsed, true);
    } else if (obs.ovenPhase === 'blast') {
      const flameH = obs.flameLength + Math.sin(elapsed * 42) * 12;
      const cx = ox + width / 2;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const heatGlow = ctx.createRadialGradient(cx, y - flameH * 0.45, 16, cx, y - flameH * 0.45, flameH * 0.95);
      heatGlow.addColorStop(0, 'rgba(255, 160, 48, 0.45)');
      heatGlow.addColorStop(0.55, 'rgba(255, 86, 24, 0.2)');
      heatGlow.addColorStop(1, 'rgba(255, 70, 20, 0)');
      ctx.fillStyle = heatGlow;
      ctx.beginPath();
      ctx.arc(cx, y - flameH * 0.45, flameH * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 110, 36, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, FIELD.groundY + 4, width * 0.78, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      const sway = Math.sin(elapsed * 26) * 6;
      ctx.fillStyle = PALETTE.flameOuter;
      ctx.beginPath();
      ctx.moveTo(ox + 12, y);
      ctx.quadraticCurveTo(ox + 2 + sway, y - flameH * 0.65, cx + sway * 0.6, y - flameH);
      ctx.quadraticCurveTo(ox + width - 2 + sway, y - flameH * 0.65, ox + width - 12, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8c1d0c';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = PALETTE.flameMid;
      ctx.beginPath();
      ctx.moveTo(ox + 26, y);
      ctx.quadraticCurveTo(cx - 24 + sway * 0.5, y - flameH * 0.5, cx + sway * 0.4, y - flameH * 0.8);
      ctx.quadraticCurveTo(cx + 24 + sway * 0.5, y - flameH * 0.5, ox + width - 26, y);
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

  function drawKnife(k, elapsed = 0) {
    const cx = clamp(k.x + k.width / 2, 28, FIELD.width - 28);
    if (k.warnTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 92, 64, 0.76)';
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, 74);
      ctx.lineTo(cx, FIELD.groundY);
      ctx.stroke();
      ctx.setLineDash([]);
      drawExclamationBadge(cx, 105, 20, elapsed, true);
      ctx.restore();
      return;
    }

    const drawCx = k.x + k.width / 2;
    ctx.save();
    if (k.stuckTimer <= 0) {
      ctx.strokeStyle = 'rgba(255, 245, 230, 0.32)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drawCx - 10, k.y - 24);
      ctx.lineTo(drawCx - 10, k.y + 18);
      ctx.moveTo(drawCx + 10, k.y - 18);
      ctx.lineTo(drawCx + 10, k.y + 14);
      ctx.stroke();
    }

    ctx.fillStyle = PALETTE.knifeHandle;
    roundRectPath(ctx, drawCx - 7, k.y, 14, 34, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = '#e8c47a';
    ctx.beginPath();
    ctx.arc(drawCx, k.y + 10, 2, 0, Math.PI * 2);
    ctx.arc(drawCx, k.y + 22, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d9b578';
    ctx.fillRect(drawCx - 12, k.y + 30, 24, 6);
    ctx.strokeRect(drawCx - 12, k.y + 30, 24, 6);

    const bladeGrad = ctx.createLinearGradient(drawCx - 13, 0, drawCx + 13, 0);
    bladeGrad.addColorStop(0, '#9fb0c4');
    bladeGrad.addColorStop(0.55, PALETTE.knifeBlade);
    bladeGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(drawCx - 13, k.y + 36);
    ctx.lineTo(drawCx + 13, k.y + 36);
    ctx.lineTo(drawCx + 10, k.y + k.height - 26);
    ctx.lineTo(drawCx, k.y + k.height);
    ctx.lineTo(drawCx - 12, k.y + k.height - 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = PALETTE.knifeEdge;
    ctx.beginPath();
    ctx.moveTo(drawCx + 7, k.y + 36);
    ctx.lineTo(drawCx + 13, k.y + 36);
    ctx.lineTo(drawCx, k.y + k.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCorn(corn) {
    const cx = corn.x + corn.width / 2;
    const cy = corn.y + corn.height / 2 + Math.sin(corn.bobPhase) * 4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
    glow.addColorStop(0, 'rgba(255, 224, 102, 0.42)');
    glow.addColorStop(1, 'rgba(255, 210, 70, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.cornCob;
    ctx.beginPath();
    ctx.ellipse(0, -2, 10, 18, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#d49a1e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.lineTo(-2, 10);
    ctx.moveTo(3, -15);
    ctx.lineTo(5, 9);
    ctx.stroke();
    ctx.fillStyle = PALETTE.cornHusk;
    ctx.beginPath();
    ctx.ellipse(-7, 10, 6, 13, -0.45, 0, Math.PI * 2);
    ctx.ellipse(7, 10, 6, 13, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  function drawHeartPickup(heart) {
    const cx = heart.x + heart.width / 2;
    const cy = heart.y + heart.height / 2 + Math.sin(heart.bobPhase) * 5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
    hGlow.addColorStop(0, 'rgba(255, 102, 128, 0.45)');
    hGlow.addColorStop(1, 'rgba(255, 86, 108, 0)');
    ctx.fillStyle = hGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const hGrad = ctx.createLinearGradient(0, -14, 0, 14);
    hGrad.addColorStop(0, '#ff7a8a');
    hGrad.addColorStop(1, '#c91e32');
    ctx.fillStyle = hGrad;
    drawHeartShape(ctx, 0, 2, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.beginPath();
    ctx.ellipse(-5, -5, 4, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw the expressive turkey at >= 1/4 viewport height (PLAYER.drawHeight = 184px),
   * grounded foot hitbox marker, and compact overhead life hearts during play.
   */
  function drawTurkey(player, elapsed, poseOverride = null, lives = LIVES, showPlayIndicators = false) {
    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0;
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

    // Grounded hitbox marker so player always sees exact collision center and width
    if (showPlayIndicators) {
      const markerColor =
        player.hidden || player.inCoverZone
          ? PALETTE.safe
          : player.dashing
            ? PALETTE.dash
            : PALETTE.gold;
      const halfW = player.width * 0.5;
      ctx.save();
      ctx.globalAlpha = player.grounded ? 0.92 : 0.62;
      ctx.fillStyle =
        player.hidden || player.inCoverZone
          ? 'rgba(104, 184, 73, 0.22)'
          : 'rgba(245, 191, 66, 0.16)';
      ctx.beginPath();
      ctx.ellipse(footX, FIELD.groundY + 2, halfW, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Left/right hitbox bracket ticks and center anchor
      ctx.beginPath();
      ctx.moveTo(footX - halfW, FIELD.groundY - 7);
      ctx.lineTo(footX - halfW, FIELD.groundY + 7);
      ctx.moveTo(footX + halfW, FIELD.groundY - 7);
      ctx.lineTo(footX + halfW, FIELD.groundY + 7);
      ctx.stroke();

      ctx.fillStyle = markerColor;
      ctx.beginPath();
      ctx.arc(footX, FIELD.groundY + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!blink || poseOverride) {
      const scale = PLAYER.drawHeight / 184;

      ctx.save();
      ctx.translate(footX, player.hidden ? footY + 6 : footY);
      ctx.scale(scale * (player.facing < 0 ? -1 : 1), scale);

      if (player.grounded) {
        ctx.fillStyle = 'rgba(20, 10, 5, 0.36)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 42, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pose === 'crouch') {
        ctx.scale(player.hidden ? 0.84 : 1.06, player.hidden ? 0.5 : 0.64);
      } else if (pose === 'stumble') {
        ctx.rotate(-0.32);
        ctx.translate(-8, 6);
      } else if (pose === 'dash') {
        ctx.rotate(0.14);
      }

      const stride = pose === 'crouch' || pose === 'escaped' ? 0 : Math.sin(player.runPhase);
      const bob = pose === 'run' || pose === 'dash' ? Math.abs(Math.cos(player.runPhase)) * -4 : 0;

      // Legs & feet with dark ink outline (tucked away when hidden inside cover)
      ctx.lineCap = 'round';
      if (!player.hidden) {
        const leftAngle = pose === 'jump' ? -0.55 : stride * 0.55;
        const rightAngle = pose === 'jump' ? 0.4 : -stride * 0.55;
        for (const [ox, ang] of [
          [-9, leftAngle],
          [9, rightAngle],
        ]) {
          ctx.save();
          ctx.translate(ox, -36);
          ctx.rotate(ang);
          ctx.strokeStyle = PALETTE.ink;
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 32);
          ctx.lineTo(13, 36);
          ctx.moveTo(0, 32);
          ctx.lineTo(-8, 36);
          ctx.stroke();
          ctx.strokeStyle = PALETTE.turkeyBeak;
          ctx.lineWidth = 5;
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.translate(0, bob);

      // Compact 9-feather fan tail with feather shafts and warm cream tips
      ctx.save();
      ctx.translate(-20, -80);
      for (let i = 0; i < 9; i += 1) {
        const a = -1.72 + (i / 8) * 1.6;
        ctx.save();
        ctx.rotate(a);
        const fGrad = ctx.createLinearGradient(0, -90, 0, 0);
        fGrad.addColorStop(0, '#f7d586');
        fGrad.addColorStop(0.32, PALETTE.turkeyTail[i % PALETTE.turkeyTail.length]);
        fGrad.addColorStop(1, '#3b180a');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.ellipse(0, -48, 12, 46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 232, 178, 0.35)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, -76);
        ctx.stroke();
        ctx.fillStyle = '#fff0c2';
        ctx.beginPath();
        ctx.ellipse(0, -82, 7.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5c2610';
        ctx.beginPath();
        ctx.ellipse(0, -74, 5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Plump shaded turkey body with chest feather scallops & sunny rim light
      const bodyGrad = ctx.createRadialGradient(8, -76, 8, -2, -70, 48);
      bodyGrad.addColorStop(0, PALETTE.turkeyBelly);
      bodyGrad.addColorStop(0.65, PALETTE.turkeyBody);
      bodyGrad.addColorStop(1, '#46210e');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(-2, -70, 42, 35, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 224, 152, 0.48)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(-2, -70, 39, 32, -0.06, -Math.PI * 0.45, Math.PI * 0.12);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(-2, -70, 42, 35, -0.06, 0, Math.PI * 2);
      ctx.stroke();
      // Chest feather arcs
      ctx.strokeStyle = 'rgba(42, 18, 8, 0.35)';
      ctx.lineWidth = 2;
      for (let fy = -82; fy <= -56; fy += 13) {
        ctx.beginPath();
        ctx.arc(24, fy, 7, Math.PI * 0.65, Math.PI * 1.35);
        ctx.stroke();
      }

      // Flapping wing with primary feather tips
      ctx.save();
      ctx.translate(-4, -74);
      const wingRot =
        pose === 'jump'
          ? Math.sin(elapsed * 26) * 0.55 - 0.55
          : pose === 'stumble'
            ? -0.95
            : pose === 'escaped'
              ? -0.95 + Math.sin(elapsed * 12) * 0.16
              : Math.sin(player.runPhase) * 0.16;
      ctx.rotate(wingRot);
      const wingGrad = ctx.createLinearGradient(-20, -10, 18, 18);
      wingGrad.addColorStop(0, '#6b381b');
      wingGrad.addColorStop(1, PALETTE.turkeyWing);
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(-5, 6, 27, 16, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 210, 145, 0.28)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-8, 5, 16, Math.PI * 0.85, Math.PI * 1.65);
      ctx.stroke();
      ctx.restore();

      // S-curved neck (dark outline then brown fill)
      const headX = pose === 'dash' ? 38 : 30;
      const headY = pose === 'crouch' ? -114 : -138;
      ctx.lineCap = 'round';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 27;
      ctx.beginPath();
      ctx.moveTo(20, -88);
      ctx.quadraticCurveTo(35, -112, headX, headY + 12);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.turkeyBody;
      ctx.lineWidth = 21;
      ctx.stroke();

      // Blue head with shading
      const headGrad = ctx.createRadialGradient(headX - 5, headY - 6, 3, headX, headY, 22);
      headGrad.addColorStop(0, '#74a8cc');
      headGrad.addColorStop(1, PALETTE.turkeyHead);
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(headX, headY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Beak drawn cleanly from front edge of head (x >= headX + 18)
      ctx.fillStyle = PALETTE.turkeyBeak;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.1;
      if (pose === 'jump' || player.fluttering) {
        ctx.beginPath();
        ctx.moveTo(headX + 18, headY - 6);
        ctx.lineTo(headX + 39, headY - 2);
        ctx.lineTo(headX + 18, headY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(headX + 18, headY + 2);
        ctx.lineTo(headX + 36, headY + 8);
        ctx.lineTo(headX + 18, headY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(headX + 18, headY - 5);
        ctx.lineTo(headX + 38, headY + 1);
        ctx.lineTo(headX + 18, headY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Throat wattle hanging cleanly outside the chin/throat perimeter (never overlapping face)
      const wattleSwing = Math.sin(elapsed * 14 + player.runPhase) * 2.2;
      ctx.fillStyle = PALETTE.turkeyWattle;
      ctx.beginPath();
      ctx.moveTo(headX + 12, headY + 14);
      ctx.bezierCurveTo(
        headX + 20 + wattleSwing,
        headY + 18,
        headX + 22 + wattleSwing,
        headY + 31,
        headX + 15 + wattleSwing * 0.8,
        headY + 32,
      );
      ctx.bezierCurveTo(
        headX + 9 + wattleSwing * 0.4,
        headY + 32,
        headX + 8,
        headY + 21,
        headX + 12,
        headY + 14,
      );
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Snood draping forward from forehead/beak bridge and hanging cleanly beside/over upper beak
      ctx.fillStyle = PALETTE.turkeyWattle;
      ctx.beginPath();
      ctx.moveTo(headX + 18, headY - 6);
      ctx.bezierCurveTo(headX + 27, headY - 12, headX + 33, headY - 4, headX + 30, headY + 4);
      ctx.quadraticCurveTo(headX + 25, headY + 6, headX + 24, headY - 1);
      ctx.quadraticCurveTo(headX + 21, headY - 4, headX + 18, headY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle glossy highlight on wattle & snood
      ctx.fillStyle = 'rgba(255, 196, 196, 0.45)';
      ctx.beginPath();
      ctx.ellipse(headX + 14 + wattleSwing * 0.4, headY + 23, 2, 4.5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Expressive eye + comic emotion details (brow, blush, sweat drops, sparkles)
      if (pose === 'stumble') {
        ctx.strokeStyle = '#1d120c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(headX + 1, headY - 7);
        ctx.lineTo(headX + 9, headY - 2);
        ctx.lineTo(headX + 1, headY + 3);
        ctx.stroke();

        ctx.fillStyle = PALETTE.gold;
        for (let i = 0; i < 3; i += 1) {
          const ang = elapsed * 6 + (i * Math.PI * 2) / 3;
          const sx = headX + Math.cos(ang) * 24;
          const sy = headY - 28 + Math.sin(ang) * 7;
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pose === 'escaped') {
        ctx.fillStyle = 'rgba(255, 130, 145, 0.52)';
        ctx.beginPath();
        ctx.ellipse(headX + 3, headY + 6, 6, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d120c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(headX + 5, headY - 2, 6, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffe588';
        for (const [sx, sy] of [
          [headX - 18, headY - 26],
          [headX + 26, headY - 28],
        ]) {
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(headX + 5, headY - 4, 7.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#1a110b';
        const lookBack = pose === 'crouch' ? -2.2 : -1;
        ctx.beginPath();
        ctx.arc(headX + 5 + lookBack, headY - 4, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(headX + 6.2 + lookBack, headY - 5.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
        // Determined panicked brow
        ctx.strokeStyle = '#1a110b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(headX - 2, headY - 12);
        ctx.lineTo(headX + 12, headY - 14);
        ctx.stroke();
        // Flying sweat drop when dashing or leaping
        if (pose === 'dash' || pose === 'jump') {
          ctx.fillStyle = '#8be2ff';
          ctx.beginPath();
          ctx.moveTo(headX - 22, headY - 16);
          ctx.quadraticCurveTo(headX - 29, headY - 11, headX - 24, headY - 6);
          ctx.quadraticCurveTo(headX - 19, headY - 9, headX - 22, headY - 16);
          ctx.fill();
          ctx.strokeStyle = PALETTE.ink;
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      }

      if (pose === 'dash') {
        // Cartoon running wheel blur under feet + crisp speed streaks
        ctx.strokeStyle = 'rgba(255, 224, 145, 0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -18, 22, 0.35, Math.PI - 0.2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 224, 145, 0.78)';
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-72 - i * 12, -104 + i * 24);
          ctx.lineTo(-108 - i * 14, -104 + i * 24);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Overhead lives hearts pill directly above turkey's head
    if (showPlayIndicators) {
      const hudCenterX = clamp(footX, 70, FIELD.width - 70);
      const rawTopY = pose === 'crouch' ? footY - 120 : footY - 184;
      const hudTopY = Math.max(96, rawTopY);

      ctx.save();
      if (lives > 0) {
        ctx.fillStyle = 'rgba(22, 12, 8, 0.84)';
        roundRectPath(ctx, hudCenterX - 46, hudTopY - 13, 92, 26, 13);
        ctx.fill();
        ctx.strokeStyle = 'rgba(217, 155, 56, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        for (let i = 0; i < LIVES; i += 1) {
          const hx = hudCenterX - 24 + i * 24;
          const hy = hudTopY;
          ctx.fillStyle = i < lives ? PALETTE.heart : PALETTE.heartEmpty;
          drawHeartShape(ctx, hx, hy, 8.5);
          ctx.fill();
          ctx.strokeStyle = PALETTE.ink;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(180, 34, 28, 0.92)';
        roundRectPath(ctx, hudCenterX - 58, hudTopY - 13, 116, 26, 13);
        ctx.fill();
        ctx.strokeStyle = '#fff2c2';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        drawText('LAST CHANCE!', hudCenterX, hudTopY + 5, 12, '#fff6e6', 'center');
      }

      if (player.hidden) {
        drawStyledPill(hudCenterX - 53, hudTopY - 52, 106, 32, 12, '#23421a', '#101f0c', '#9cf07a');
        drawText('HIDDEN', hudCenterX, hudTopY - 30, 17, '#b0ff92', 'center', '800', true);
      }
      ctx.restore();
    }
  }

  /** Draw the chasing farmer on the left edge with clear apron and shotgun. */
  function drawFarmer(farmer, stageId, elapsed, forcedX = null) {
    const shotgunAiming = farmer.shotgun && farmer.shotgun.phase === 'aim';
    const shotgunFlashing = farmer.shotgun && farmer.shotgun.fireFlash > 0;
    const shotgunActive = shotgunAiming || shotgunFlashing;
    if (forcedX === null && !shotgunActive && farmer.gap > FARMER.visibleGap) return;

    let x = forcedX !== null ? forcedX : 168 - (farmer.gap / FARMER.visibleGap) * 220;
    if (forcedX === null && shotgunActive) x = Math.max(58, x);
    const y = FIELD.groundY;
    const stride = Math.sin(farmer.stridePhase);

    ctx.save();
    ctx.translate(x, y);

    // Ground shadow
    ctx.fillStyle = 'rgba(20, 10, 5, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 50, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helper for side-profile running legs & right-facing leather boots
    function drawSideLeg(hipX, hipY, footDx, footLift, denimColor, bootColor) {
      const fx = hipX + footDx;
      const fy = -8 - footLift;
      const kx = (hipX + fx) * 0.5 + 9;
      const ky = (hipY + fy) * 0.5 - 2;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(kx, ky, fx, fy);
      ctx.stroke();
      ctx.strokeStyle = denimColor;
      ctx.lineWidth = 16;
      ctx.stroke();

      // Right-facing leather boot (heel at left, rounded toe pointing right)
      ctx.fillStyle = bootColor;
      ctx.beginPath();
      ctx.moveTo(fx - 8, fy - 10);
      ctx.lineTo(fx + 7, fy - 10);
      ctx.quadraticCurveTo(fx + 10, fy - 2, fx + 18, fy + 1);
      ctx.quadraticCurveTo(fx + 22, fy + 8, fx + 15, fy + 9);
      ctx.lineTo(fx - 9, fy + 9);
      ctx.quadraticCurveTo(fx - 12, fy, fx - 8, fy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    function drawShotgunBody(flashing) {
      ctx.fillStyle = PALETTE.gunWood;
      ctx.beginPath();
      ctx.moveTo(4, -2);
      ctx.lineTo(34, -4);
      ctx.lineTo(34, 6);
      ctx.lineTo(4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = PALETTE.gunSteel;
      ctx.fillRect(32, -6, 18, 11);
      ctx.strokeRect(32, -6, 18, 11);
      ctx.fillStyle = PALETTE.gunSteelLight;
      ctx.fillRect(50, -5, 44, 4);
      ctx.strokeRect(50, -5, 44, 4);
      ctx.fillStyle = PALETTE.gunSteel;
      ctx.fillRect(50, -1, 44, 4);
      ctx.strokeRect(50, -1, 44, 4);

      ctx.fillStyle = PALETTE.gunWood;
      roundRectPath(ctx, 52, 2, 22, 6, 2);
      ctx.fill();
      ctx.stroke();

      // Right (far) hand supporting forend & left (near) hand gripping stock
      ctx.fillStyle = PALETTE.farmerSkin;
      ctx.beginPath();
      ctx.arc(62, 5, 5, 0, Math.PI * 2);
      ctx.arc(28, 4, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (flashing) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const fGlow = ctx.createRadialGradient(104, 0, 4, 104, 0, 38);
        fGlow.addColorStop(0, 'rgba(255, 240, 165, 0.72)');
        fGlow.addColorStop(1, 'rgba(255, 110, 36, 0)');
        ctx.fillStyle = fGlow;
        ctx.beginPath();
        ctx.arc(104, 0, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#fff5b8';
        ctx.beginPath();
        ctx.moveTo(94, -1);
        ctx.lineTo(126, -15);
        ctx.lineTo(114, -3);
        ctx.lineTo(132, 0);
        ctx.lineTo(114, 5);
        ctx.lineTo(124, 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ff6e24';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    const lean = farmer.state === 'searching' ? 0.02 : 0.09;
    const farDx = stride * 24;
    const nearDx = -stride * 24;
    const farLift = Math.max(0, -stride * 7);
    const nearLift = Math.max(0, stride * 7);

    // 1. Far leg behind torso
    drawSideLeg(-2, -68, farDx, farLift, '#223854', '#2b180e');

    // 2. Far arm (extending behind chest to support shotgun forend)
    const gunPivotX = 16;
    const gunPivotY = -136;
    const gunAngle = farmer.state === 'searching' ? -0.08 : Math.sin(elapsed * 9) * 0.07 - 0.16;
    if (shotgunActive) {
      const localAimY = farmer.shotgun.aimY - y;
      ctx.lineCap = 'round';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(12, -138);
      ctx.quadraticCurveTo(38, (-138 + localAimY) * 0.5 + 6, 62, localAimY + 5);
      ctx.stroke();
      ctx.strokeStyle = '#8c2117';
      ctx.lineWidth = 10;
      ctx.stroke();
    } else {
      const forendX = gunPivotX + Math.cos(gunAngle) * 62 - Math.sin(gunAngle) * 5;
      const forendY = gunPivotY + Math.sin(gunAngle) * 62 + Math.cos(gunAngle) * 5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(12, -138);
      ctx.quadraticCurveTo(38, -124, forendX, forendY);
      ctx.stroke();
      ctx.strokeStyle = '#8c2117';
      ctx.lineWidth = 10;
      ctx.stroke();
    }

    // 3. Near leg (side stride in front of far leg, tucked cleanly under apron hem)
    drawSideLeg(-2, -68, nearDx, nearLift, PALETTE.farmerDenim, '#3d2415');

    // 4. Side-profile leaning torso, overalls, side-facing apron & head
    ctx.save();
    ctx.translate(0, -48);
    ctx.rotate(lean);
    ctx.translate(0, 48);

    // Side-profile red plaid shirt torso (curved back on left, chest/belly on right)
    const shirtGrad = ctx.createLinearGradient(-26, 0, 26, 0);
    shirtGrad.addColorStop(0, '#962318');
    shirtGrad.addColorStop(0.5, '#cc3829');
    shirtGrad.addColorStop(1, '#e24c3b');
    ctx.fillStyle = shirtGrad;
    ctx.beginPath();
    ctx.moveTo(-18, -160);
    ctx.quadraticCurveTo(0, -165, 19, -158);
    ctx.quadraticCurveTo(28, -128, 25, -94);
    ctx.lineTo(22, -68);
    ctx.lineTo(-22, -68);
    ctx.quadraticCurveTo(-28, -118, -18, -160);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Subtle plaid lines across side of torso
    ctx.fillStyle = PALETTE.farmerShirtDark;
    ctx.fillRect(-23, -138, 47, 8);
    ctx.fillRect(-4, -159, 8, 86);

    // Side-profile denim overalls (bib on right chest, shoulder strap angling from back)
    ctx.fillStyle = PALETTE.farmerDenim;
    ctx.beginPath();
    ctx.moveTo(-22, -112);
    ctx.lineTo(23, -112);
    ctx.lineTo(22, -66);
    ctx.quadraticCurveTo(0, -61, -22, -66);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Single visible side overall strap & brass button
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-12, -159);
    ctx.lineTo(6, -112);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.farmerDenim;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(6, -112, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Side-profile white apron draped along front (right side) & tied behind back (left side)
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-6, -158);
    ctx.quadraticCurveTo(10, -156, 16, -142);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.farmerApron;
    ctx.lineWidth = 3.6;
    ctx.stroke();

    // Fluttering waist-tie ribbon ends behind back (left side)
    ctx.fillStyle = '#ddd0ba';
    ctx.beginPath();
    ctx.moveTo(-23, -112);
    ctx.lineTo(-46, -104);
    ctx.lineTo(-41, -95);
    ctx.lineTo(-22, -106);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();

    const apronGrad = ctx.createLinearGradient(0, -144, 30, -50);
    apronGrad.addColorStop(0, '#fff9ee');
    apronGrad.addColorStop(1, '#d8c9b0');
    ctx.fillStyle = apronGrad;
    ctx.beginPath();
    ctx.moveTo(6, -144);
    ctx.lineTo(22, -142);
    ctx.quadraticCurveTo(27, -124, 26, -112);
    ctx.quadraticCurveTo(32, -80, 29, -52);
    ctx.quadraticCurveTo(14, -46, -4, -52);
    ctx.quadraticCurveTo(-2, -84, 2, -112);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Side-wrapping apron waistband + side pocket
    ctx.fillStyle = '#d4c3a7';
    ctx.fillRect(-24, -116, 51, 7);
    ctx.strokeRect(-24, -116, 51, 7);
    ctx.fillStyle = '#e5d6bd';
    roundRectPath(ctx, 7, -98, 17, 19, 4);
    ctx.fill();
    ctx.strokeStyle = '#9c8a70';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Cartoon head with ear, protruding nose, rosy cheek, twirled mustache & angry eyes
    ctx.fillStyle = '#e2a67a';
    ctx.beginPath();
    ctx.arc(-20, -187, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const headGrad = ctx.createRadialGradient(-2, -194, 4, 4, -188, 30);
    headGrad.addColorStop(0, '#ffd8ba');
    headGrad.addColorStop(1, PALETTE.farmerSkin);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(4, -188, 27, 29, -0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Rosy cheek & shouting mouth
    ctx.fillStyle = 'rgba(224, 92, 74, 0.36)';
    ctx.beginPath();
    ctx.ellipse(8, -182, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c1814';
    ctx.beginPath();
    ctx.ellipse(17, -172, 6, farmer.state === 'spotted' ? 5.5 : 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Expressive eye + big twirled mustache + nose + bushy furrowed brow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(16, -194, 5.8, 6.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#1b110c';
    ctx.beginPath();
    ctx.arc(17.5, -194, 2.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.farmerHair;
    ctx.beginPath();
    ctx.moveTo(4, -179);
    ctx.quadraticCurveTo(15, -184, 29, -177);
    ctx.quadraticCurveTo(34, -174, 31, -181);
    ctx.quadraticCurveTo(22, -173, 4, -173);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Protruding cartoon nose
    ctx.fillStyle = '#eaa87e';
    ctx.beginPath();
    ctx.ellipse(29, -187, 6.5, 5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = PALETTE.farmerHair;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8, -204);
    ctx.lineTo(25, -198);
    ctx.stroke();

    // Bouncing straw hat (Farm/Cornfield) or pleated Chef toque (Kitchen)
    const hatBounce = farmer.state === 'searching' ? 0 : Math.abs(Math.sin(farmer.stridePhase)) * -4;
    ctx.save();
    ctx.translate(0, hatBounce);
    if (stageId >= 3) {
      ctx.fillStyle = '#faf6f0';
      roundRectPath(ctx, -22, -238, 52, 34, 8);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-8, -244, 18, 0, Math.PI * 2);
      ctx.arc(10, -248, 20, 0, Math.PI * 2);
      ctx.arc(24, -240, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(130, 118, 108, 0.45)';
      ctx.lineWidth = 1.6;
      for (const px of [-6, 6, 18]) {
        ctx.beginPath();
        ctx.moveTo(px, -236);
        ctx.lineTo(px, -214);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = PALETTE.farmerHat;
      ctx.beginPath();
      ctx.ellipse(2, -210, 44, 9, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      roundRectPath(ctx, -22, -236, 48, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a83324';
      ctx.fillRect(-21, -218, 46, 6);
    }
    ctx.restore();
    ctx.restore();

    // 5. Shotgun & near (left) arm drawn outside torso lean so muzzle stays exact at localX=94 & aimY
    const shoulderX = -4 + Math.sin(lean) * 90;
    const shoulderY = -138;
    if (shotgunActive) {
      const localAimY = farmer.shotgun.aimY - y;
      ctx.save();
      ctx.translate(0, localAimY + (shotgunFlashing ? -4 : 0));
      if (shotgunFlashing) ctx.rotate(-0.06);
      drawShotgunBody(shotgunFlashing);
      ctx.restore();

      // Near arm reaching from side shoulder to shotgun grip
      ctx.lineCap = 'round';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(shoulderX - 8, (shoulderY + localAimY) * 0.5 + 8, 27, localAimY + 4);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.farmerShirt;
      ctx.lineWidth = 12;
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(gunPivotX, gunPivotY);
      ctx.rotate(gunAngle);
      drawShotgunBody(false);
      ctx.restore();

      const gripX = gunPivotX + Math.cos(gunAngle) * 26 - Math.sin(gunAngle) * 4;
      const gripY = gunPivotY + Math.sin(gunAngle) * 26 + Math.cos(gunAngle) * 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(shoulderX + 6, shoulderY + 20, gripX, gripY);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.farmerShirt;
      ctx.lineWidth = 12;
      ctx.stroke();
    }

    // Farmer AI state indicator
    if (farmer.state === 'searching') {
      const qLeft = clamp(-24, 14 - x, FIELD.width - x - 66);
      drawStyledPill(qLeft, -294, 54, 42, 13, '#382216', '#1e100a', PALETTE.gold);
      drawText('?', qLeft + 27, -264, 28, PALETTE.gold, 'center', '900', true);
    } else if (farmer.state === 'spotted') {
      const bubbleLeft = clamp(-26, 16 - x, FIELD.width - x - 166);
      drawStyledPill(bubbleLeft, -304, 148, 44, 13, '#ff594a', '#bd1e16', '#fff2c2');
      drawText('SPOTTED', bubbleLeft + 74, -274, 24, '#fff6e6', 'center', '900', true);

      // Standalone emoji-style '!' badge placed right next to the farmer's face
      const badgeLocalX = clamp(50, 26 - x, FIELD.width - x - 26);
      drawExclamationBadge(badgeLocalX, -206, 19, elapsed, true);
    }

    ctx.restore();
  }

  function drawShotgunTelegraph(farmer, elapsed) {
    if (!farmer.shotgun || farmer.shotgun.phase !== 'aim') return;
    const farmerX = Math.max(58, 168 - (farmer.gap / FARMER.visibleGap) * 220);
    const muzzleX = farmerX + 94;
    const aimY = farmer.shotgun.aimY;
    const urgent = farmer.shotgun.timer < 0.3;
    const pulse = urgent ? (Math.floor(elapsed * 22) % 2 === 0 ? 0.95 : 0.45) : 0.72;

    ctx.save();
    // Translucent danger corridor + soft additive laser glow from muzzle across screen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 68, 48, ${urgent ? 0.24 : 0.14})`;
    ctx.fillRect(muzzleX, aimY - 13, FIELD.width - muzzleX, 26);
    ctx.restore();

    // Horizontal dashed laser sight line
    ctx.strokeStyle = urgent && Math.floor(elapsed * 20) % 2 === 0 ? '#fff2a6' : PALETTE.shotgunTelegraph;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = urgent ? 4 : 3;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.moveTo(muzzleX, aimY);
    ctx.lineTo(FIELD.width, aimY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Standalone '!' near muzzle + large clear JUMP / DUCK action badge further down sight line
    const bangX = clamp(muzzleX + 28, 124, FIELD.width - 175);
    const bangY = clamp(aimY - 2, 98, FIELD.groundY - 30);
    drawExclamationBadge(bangX, bangY, 16, elapsed, urgent);

    const label = farmer.shotgun.aimKind === 'low' ? 'JUMP ▲' : 'DUCK ▼';
    const badgeX = clamp(muzzleX + 132, 224, FIELD.width - 80);
    const badgeY = clamp(aimY - 36, 100, FIELD.groundY - 40);
    drawStyledPill(badgeX - 63, badgeY - 19, 126, 38, 12, '#f23c2e', '#ad1912', '#fff2c2');
    drawText(label, badgeX, badgeY + 7, 20, '#fff6e6', 'center', '900', true);
    ctx.restore();
  }

  function drawPellet(pel) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 168, 48, 0.78)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pel.x - 28, pel.y - pel.vy * 0.02);
    ctx.lineTo(pel.x, pel.y);
    ctx.stroke();

    ctx.fillStyle = PALETTE.shotgunPellet;
    ctx.beginPath();
    ctx.arc(pel.x, pel.y, pel.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawHud(state, muted) {
    // Carved walnut HUD bar with subtle grain, double brass trim & corner rivets
    const hudGrad = ctx.createLinearGradient(0, 0, 0, 72);
    hudGrad.addColorStop(0, '#341e13');
    hudGrad.addColorStop(0.55, '#24130b');
    hudGrad.addColorStop(1, '#1a0d07');
    ctx.fillStyle = hudGrad;
    ctx.fillRect(0, 0, FIELD.width, 72);
    ctx.strokeStyle = 'rgba(255, 215, 160, 0.05)';
    ctx.lineWidth = 1.4;
    for (const gy of [18, 38, 56]) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(FIELD.width, gy);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.hudBorder;
    ctx.fillRect(0, 70, FIELD.width, 3);
    ctx.fillStyle = 'rgba(255, 232, 180, 0.25)';
    ctx.fillRect(0, 68, FIELD.width, 1.5);
    for (const rx of [10, FIELD.width - 10]) {
      ctx.fillStyle = '#d99b38';
      ctx.beginPath();
      ctx.arc(rx, 36, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Score & Distance
    drawText('SCORE', 24, 24, 13, PALETTE.muted, 'left');
    drawText(String(state.score), 24, 54, 28, PALETTE.gold, 'left', 'bold', true);

    drawText('DISTANCE', 156, 24, 13, PALETTE.muted, 'left');
    drawText(`${Math.floor(state.distance)} / ${GOAL_DISTANCE} m`, 156, 54, 24, PALETTE.text, 'left', 'bold', true);

    // Stage badge + 3-stage progress bar in center
    drawText(state.stage.shortName, 520, 25, 16, PALETTE.gold, 'center', 'bold', true);
    const barX = 365;
    const barY = 38;
    const barW = 310;
    const barH = 14;
    ctx.fillStyle = '#180e08';
    roundRectPath(ctx, barX, barY, barW, barH, 7);
    ctx.fill();
    const prog = Math.min(1, state.distance / GOAL_DISTANCE);
    const progW = Math.max(8, barW * prog);
    const progGrad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    progGrad.addColorStop(0, '#ffe07a');
    progGrad.addColorStop(1, '#d98f24');
    ctx.fillStyle = progGrad;
    roundRectPath(ctx, barX, barY, progW, barH, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    roundRectPath(ctx, barX + 2, barY + 1.5, Math.max(4, progW - 4), 4, 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudBg;
    ctx.fillRect(barX + barW / 3, barY, 2, barH);
    ctx.fillRect(barX + (barW * 2) / 3, barY, 2, barH);
    ctx.fillStyle = '#fff5cc';
    ctx.beginPath();
    ctx.arc(barX + progW - 3, barY + barH / 2, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Unified DANGER meter: fills up as danger rises; hitting 100% spends 1 life & resets (or ends run at 0 lives)
    const dangerX = 730;
    const dangerW = 420;
    const dangerVal = clamp(FARMER.maxGap - state.farmer.gap, 0, FARMER.maxGap);
    const dangerPct = dangerVal / FARMER.maxGap;
    const dangerColor =
      dangerVal >= 72
        ? PALETTE.danger
        : dangerVal >= 48
          ? PALETTE.warn
          : PALETTE.safe;
    drawText('DANGER', dangerX, 24, 14, PALETTE.muted, 'left');
    const gaugeStatus =
      state.lives > 0 ? `${Math.round(dangerVal)}%` : `${Math.round(dangerVal)}% · LAST LIFE`;
    drawText(gaugeStatus, dangerX + dangerW, 24, 14, dangerColor, 'right', 'bold', true);

    if (dangerVal >= 72) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 76, 54, ${0.32 + Math.sin(state.elapsed * 12) * 0.14})`;
      ctx.lineWidth = 6;
      roundRectPath(ctx, dangerX - 2, 32, dangerW + 4, 24, 11);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#180e08';
    roundRectPath(ctx, dangerX, 34, dangerW, 20, 9);
    ctx.fill();
    if (dangerPct > 0.01) {
      const fillW = Math.max(10, dangerW * dangerPct);
      ctx.save();
      roundRectPath(ctx, dangerX, 34, fillW, 20, 9);
      ctx.clip();
      const dGrad = ctx.createLinearGradient(0, 34, 0, 54);
      dGrad.addColorStop(
        0,
        dangerVal >= 72 ? '#ff7466' : dangerVal >= 48 ? '#ffb34d' : '#8ce063',
      );
      dGrad.addColorStop(1, dangerColor);
      ctx.fillStyle = dGrad;
      ctx.fillRect(dangerX, 34, fillW, 20);
      // Subtle diagonal hazard stripes
      ctx.fillStyle = 'rgba(26, 12, 8, 0.16)';
      for (let sx = dangerX - 20; sx < dangerX + fillW + 20; sx += 18) {
        ctx.beginPath();
        ctx.moveTo(sx, 54);
        ctx.lineTo(sx + 8, 54);
        ctx.lineTo(sx + 18, 34);
        ctx.lineTo(sx + 10, 34);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(dangerX, 35, fillW, 6);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255, 246, 230, 0.18)';
    ctx.fillRect(dangerX + dangerW * 0.5, 35, 2, 18);
    ctx.fillRect(dangerX + dangerW * 0.75, 35, 2, 18);
    ctx.strokeStyle = dangerVal >= 72 ? '#ff8b78' : 'rgba(217, 155, 56, 0.52)';
    ctx.lineWidth = dangerVal >= 72 ? 2.4 : 1.6;
    roundRectPath(ctx, dangerX, 34, dangerW, 20, 9);
    ctx.stroke();

    // Brass-framed SFX / MUTE pill
    drawStyledPill(
      1182,
      20,
      78,
      34,
      10,
      muted ? '#2a1c15' : '#4a2d18',
      muted ? '#1a100c' : '#2a180d',
      muted ? '#7a6554' : PALETTE.hudBorder,
    );
    drawText(muted ? 'MUTE' : 'SFX', 1221, 42, 14, muted ? PALETTE.muted : PALETTE.gold, 'center', '800');
  }

  function drawStageBanner(state) {
    if (state.stageBannerTimer <= 0) return;
    const alpha = Math.min(1, state.stageBannerTimer * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawWoodPanel(FIELD.width / 2 - 220, 94, 440, 60, 14, PALETTE.hudBorder, 2.5);
    drawText(`STAGE ${state.stage.id}: ${state.stage.name.toUpperCase()}`, FIELD.width / 2, 132, 24, PALETTE.gold, 'center', '900', true);
    ctx.restore();
  }

  function drawTitleOverlay(best) {
    // Package-art wooden title signboard with autumn leaf clusters & swallowtail ribbon banner
    drawWoodPanel(188, 22, 904, 146, 24, PALETTE.hudBorder, 4);

    // Decorative autumn leaf clusters flanking the sign corners
    drawAutumnLeaf(216, 48, 21, -0.7, '#d94e28');
    drawAutumnLeaf(242, 36, 15, 0.25, '#f2be4b');
    drawAutumnLeaf(206, 72, 14, -1.1, '#e88b2e');
    drawAutumnLeaf(1064, 48, 21, 0.7, '#d94e28');
    drawAutumnLeaf(1038, 36, 15, -0.25, '#f2be4b');
    drawAutumnLeaf(1074, 72, 14, 1.1, '#e88b2e');

    // Extruded 3D title logo: drop shadow -> thick espresso outline -> golden gradient fill
    ctx.save();
    setFont(64, '900');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const titleY = 100;
    ctx.fillStyle = '#140804';
    ctx.fillText('GOBBLE AND BOLT!', FIELD.width / 2, titleY + 6);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#240f06';
    ctx.lineWidth = 10;
    ctx.strokeText('GOBBLE AND BOLT!', FIELD.width / 2, titleY);
    const titleGrad = ctx.createLinearGradient(0, titleY - 52, 0, titleY + 4);
    titleGrad.addColorStop(0, '#fff7c4');
    titleGrad.addColorStop(0.5, '#f8c644');
    titleGrad.addColorStop(1, '#e67824');
    ctx.fillStyle = titleGrad;
    ctx.fillText('GOBBLE AND BOLT!', FIELD.width / 2, titleY);
    ctx.restore();

    // Burgundy swallowtail ribbon banner across lower edge of signboard
    const rx = 250;
    const ry = 122;
    const rw = 780;
    const rh = 34;
    ctx.save();
    const ribGrad = ctx.createLinearGradient(0, ry, 0, ry + rh);
    ribGrad.addColorStop(0, '#b53426');
    ribGrad.addColorStop(1, '#781b12');
    ctx.fillStyle = ribGrad;
    ctx.beginPath();
    ctx.moveTo(rx - 18, ry);
    ctx.lineTo(rx + rw + 18, ry);
    ctx.lineTo(rx + rw + 4, ry + rh / 2);
    ctx.lineTo(rx + rw + 18, ry + rh);
    ctx.lineTo(rx - 18, ry + rh);
    ctx.lineTo(rx - 4, ry + rh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f5bf42';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(
      'OUTRUN THE FARMER · HIDE IN COVER · DODGE SHOTGUN, KNIVES & OVENS',
      FIELD.width / 2,
      ry + 23,
      16,
      '#fff5e0',
      'center',
      '800',
      true,
    );
    ctx.restore();

    // Bottom carved wood controls bar + beveled gold CTA button & best score badge
    drawWoodPanel(96, 610, 1088, 96, 18, PALETTE.hudBorder, 3.2);
    drawText(
      'Move: ← → / A D / Mouse   Jump & Flutter: Space / ↑ / Click   Hide: ↓ / S / Right-Click   Dash: Shift   P: Pause · M: Mute',
      FIELD.width / 2,
      642,
      15,
      PALETTE.muted,
      'center',
    );

    const hasBest = best > 0;
    const ctaX = hasBest ? 268 : 370;
    const ctaW = 540;
    const ctaY = 654;
    const ctaH = 40;
    ctx.save();
    ctx.fillStyle = '#73420a';
    roundRectPath(ctx, ctaX, ctaY + 4, ctaW, ctaH, 12);
    ctx.fill();
    const btnGrad = ctx.createLinearGradient(0, ctaY, 0, ctaY + ctaH);
    btnGrad.addColorStop(0, '#ffe37a');
    btnGrad.addColorStop(1, '#e69b28');
    ctx.fillStyle = btnGrad;
    roundRectPath(ctx, ctaX, ctaY, ctaW, ctaH, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    roundRectPath(ctx, ctaX + 4, ctaY + 2, ctaW - 8, 16, 8);
    ctx.fill();
    ctx.strokeStyle = '#fff5cc';
    ctx.lineWidth = 2;
    roundRectPath(ctx, ctaX, ctaY, ctaW, ctaH, 12);
    ctx.stroke();
    drawText('PRESS ENTER, SPACE OR CLICK TO ESCAPE!', ctaX + ctaW / 2, ctaY + 27, 21, '#22120a', 'center', '900');

    if (hasBest) {
      drawStyledPill(834, ctaY, 178, ctaH, 12, '#3d2a16', '#21140a', PALETTE.gold);
      drawText(`BEST: ${best}`, 923, ctaY + 27, 20, PALETTE.gold, 'center', '900', true);
    }
    ctx.restore();
  }

  function drawEndOverlay(state, screen, best) {
    const escaped = screen === SCREEN_ESCAPED;
    if (!escaped) {
      ctx.fillStyle = 'rgba(18, 10, 6, 0.5)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    const panelX = escaped ? 84 : 290;
    const panelY = 128;
    const panelW = 660;
    const panelH = 446;

    drawWoodPanel(panelX, panelY, panelW, panelH, 24, escaped ? PALETTE.gold : PALETTE.danger, 4);

    const cx = panelX + panelW / 2;
    drawText(
      escaped ? 'ESCAPED TO THE FOREST!' : 'CAUGHT FOR DINNER!',
      cx,
      panelY + 74,
      44,
      escaped ? PALETTE.gold : '#ff6b57',
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

    ctx.fillStyle = 'rgba(14, 7, 4, 0.55)';
    roundRectPath(ctx, panelX + 46, panelY + 144, panelW - 92, 178, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 155, 56, 0.32)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    drawText('FINAL SCORE', cx, panelY + 184, 18, PALETTE.muted, 'center');
    drawText(String(state.score), cx, panelY + 236, 52, PALETTE.gold, 'center', '900', true);
    drawText(
      `Distance: ${Math.floor(state.distance)} / ${GOAL_DISTANCE} m   ·   Corn: ${state.cornCount}   ·   Near Misses: ${state.nearMissCount}`,
      cx,
      panelY + 276,
      18,
      PALETTE.text,
      'center',
    );
    drawText(`Best Score: ${Math.max(best, state.score)}`, cx, panelY + 306, 18, '#9cf07a', 'center');

    const btnX = cx - 190;
    const btnY = panelY + 350;
    const btnW = 380;
    const btnH = 60;
    ctx.fillStyle = escaped ? '#804c0a' : '#75290d';
    roundRectPath(ctx, btnX, btnY + 5, btnW, btnH, 14);
    ctx.fill();
    const endBtnGrad = ctx.createLinearGradient(0, btnY, 0, btnY + btnH);
    endBtnGrad.addColorStop(0, escaped ? '#ffe57f' : '#ffab5e');
    endBtnGrad.addColorStop(1, escaped ? '#e39624' : '#d65d1e');
    ctx.fillStyle = endBtnGrad;
    roundRectPath(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    roundRectPath(ctx, btnX + 6, btnY + 3, btnW - 12, 22, 10);
    ctx.fill();
    ctx.strokeStyle = '#fff5cc';
    ctx.lineWidth = 2;
    roundRectPath(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.stroke();
    drawText('PLAY AGAIN  (ENTER / CLICK)', cx, btnY + 39, 23, '#22120a', 'center', '900');
  }

  function drawPausedOverlay() {
    ctx.fillStyle = 'rgba(18, 10, 6, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawWoodPanel(360, 230, 560, 250, 22, PALETTE.hudBorder, 3.5);
    drawText('PAUSED', FIELD.width / 2, 315, 50, PALETTE.gold, 'center', '900', true);
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
      drawTurkey(celebrationTurkey, state.elapsed, 'escaped', state.lives, false);
      drawForegroundFraming(state.stage.id, state.distance, state.elapsed, screen);
      return;
    }

    if (state.stage.id === 1) drawFarmBackground(state.distance);
    else if (state.stage.id === 2) drawCornfieldBackground(state.distance, state.elapsed);
    else drawKitchenBackground(state.distance);

    let hidingCover = null;
    if (state.player.hidden) {
      const pCenterX = state.player.x + state.player.width * 0.5;
      hidingCover =
        state.covers.find((c) => c.id === state.player.activeCoverId) ||
        state.covers.find((c) => pCenterX >= c.x && pCenterX <= c.x + c.width) ||
        null;
    }

    for (let i = 0; i < state.covers.length; i += 1) {
      const cov = state.covers[i];
      drawCover(cov, 'back', state.elapsed, hidingCover !== null && cov.id === hidingCover.id);
    }
    for (let i = 0; i < state.obstacles.length; i += 1) drawObstacle(state.obstacles[i], state.elapsed);
    for (let i = 0; i < state.corns.length; i += 1) drawCorn(state.corns[i]);
    if (state.hearts) {
      for (let i = 0; i < state.hearts.length; i += 1) drawHeartPickup(state.hearts[i]);
    }

    const titleFarmerX = screen === SCREEN_TITLE ? 275 : null;
    drawFarmer(state.farmer, state.stage.id, state.elapsed, titleFarmerX);
    if (screen !== SCREEN_TITLE) drawShotgunTelegraph(state.farmer, state.elapsed);

    const showPlayIndicators = screen === SCREEN_PLAY || screen === SCREEN_PAUSED;
    drawTurkey(
      state.player,
      state.elapsed,
      screen === SCREEN_TITLE ? 'dash' : null,
      state.lives,
      showPlayIndicators,
    );

    // Front layer of cover overlaps the crouched turkey, plus peeking-eyes effect when actively hiding
    for (let i = 0; i < state.covers.length; i += 1) {
      const cov = state.covers[i];
      const isHidingHere = hidingCover !== null && cov.id === hidingCover.id;
      drawCover(cov, 'front', state.elapsed, isHidingHere);
      if (isHidingHere) drawHidingPeekEffect(cov, state.player, state.farmer, state.elapsed);
    }
    for (let i = 0; i < state.knives.length; i += 1) drawKnife(state.knives[i], state.elapsed);
    if (state.pellets) {
      for (let i = 0; i < state.pellets.length; i += 1) drawPellet(state.pellets[i]);
    }

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

    // Floating feedback popups (clamped inside horizontal bounds)
    for (let i = 0; i < state.popups.length; i += 1) {
      const pop = state.popups[i];
      const px = clamp(pop.x, 90, FIELD.width - 90);
      const py = Math.max(96, pop.y);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (pop.life / pop.maxLife) * 1.6);
      drawText(pop.text, px, py, Math.round(23 * pop.scale), pop.color, 'center', '800', true);
      ctx.restore();
    }

    drawForegroundFraming(state.stage.id, state.distance, state.elapsed, screen);
  }

  /** Paint one complete frame at 1280x720 scaled and clipped cleanly inside the playfield. */
  function draw(state, screen, best, muted = false) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();

    drawPlayfield(state, screen);

    if (screen === SCREEN_TITLE) {
      drawTitleOverlay(best);
      ctx.restore();
      return;
    }

    if (screen === SCREEN_ESCAPED) {
      drawEndOverlay(state, screen, best);
      ctx.restore();
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
    ctx.restore();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toLogicalPoint };
}
