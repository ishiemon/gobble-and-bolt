// Keyboard and mouse input for Gobble and Bolt!
// Supports Arrow/WASD movement, Space/W/Up/Left-Click jump + air flutter, Down/S/Right-Click crouch/hide,
// Shift dash, P/Esc pause, M mute, and Enter/R start/restart.

export const ACTION_CONFIRM = 1;
export const ACTION_JUMP = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const CROUCH_KEYS = new Set(['ArrowDown', 'KeyS']);
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'KeyX']);
const CONFIRM_KEYS = new Set(['Enter']);
const RESTART_KEYS = new Set(['KeyR']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const MUTE_KEYS = new Set(['KeyM']);

/** Bind keyboard and pointer controls to the canvas and return a per-frame state reader. */
export function createInput(canvas, toLogicalPoint) {
  let left = false;
  let right = false;
  let jumpHeldKey = false;
  let crouchHeldKey = false;
  let dashHeldKey = false;
  let pointerDownLeft = false;
  let pointerDownRight = false;
  let pointerTargetX = null;
  let actions = 0;

  function clearHeld() {
    left = false;
    right = false;
    jumpHeldKey = false;
    crouchHeldKey = false;
    dashHeldKey = false;
    pointerDownLeft = false;
    pointerDownRight = false;
    pointerTargetX = null;
  }

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (LEFT_KEYS.has(code)) {
      left = true;
      pointerTargetX = null;
    } else if (RIGHT_KEYS.has(code)) {
      right = true;
      pointerTargetX = null;
    } else if (JUMP_KEYS.has(code)) {
      jumpHeldKey = true;
      if (!event.repeat) {
        actions |= ACTION_JUMP;
        if (code === 'Space') actions |= ACTION_CONFIRM;
      }
    } else if (CROUCH_KEYS.has(code)) {
      crouchHeldKey = true;
    } else if (DASH_KEYS.has(code)) {
      dashHeldKey = true;
    } else if (CONFIRM_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (RESTART_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (PAUSE_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE_KEYS.has(code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    const code = event.code;
    if (LEFT_KEYS.has(code)) left = false;
    else if (RIGHT_KEYS.has(code)) right = false;
    else if (JUMP_KEYS.has(code)) jumpHeldKey = false;
    else if (CROUCH_KEYS.has(code)) crouchHeldKey = false;
    else if (DASH_KEYS.has(code)) dashHeldKey = false;
  });

  window.addEventListener('blur', clearHeld);

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.buttons > 0) {
      const pt = toLogicalPoint(event.clientX, event.clientY);
      if (pt) pointerTargetX = pt.x;
    }
  });

  canvas.addEventListener('pointerleave', () => {
    pointerTargetX = null;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const pt = toLogicalPoint(event.clientX, event.clientY);
    if (pt) pointerTargetX = pt.x;
    if (event.button === 2) {
      pointerDownRight = true;
    } else {
      pointerDownLeft = true;
      actions |= ACTION_CONFIRM | ACTION_JUMP;
    }
  });

  window.addEventListener('pointerup', (event) => {
    if (event.button === 2) pointerDownRight = false;
    else pointerDownLeft = false;
  });

  return {
    /** Read continuous movement/stance controls for this simulation step. */
    readControls(playerCenterX) {
      let dir = (right ? 1 : 0) - (left ? 1 : 0);
      if (dir === 0 && pointerTargetX !== null) {
        const diff = pointerTargetX - playerCenterX;
        if (Math.abs(diff) > 14) dir = diff > 0 ? 1 : -1;
      }
      return {
        direction: dir,
        jumpHeld: jumpHeldKey || pointerDownLeft,
        crouch: crouchHeldKey || pointerDownRight,
        dash: dashHeldKey,
      };
    },
    /** Consume one-shot button/key triggers since the previous frame. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
