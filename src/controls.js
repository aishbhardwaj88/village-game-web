const MOUSE_SENSITIVITY = 0.0022;
const TOUCH_LOOK_SENSITIVITY = 0.0055;
const JOYSTICK_MAX_RADIUS = 55; // px, matches #joystick-base half-width minus knob margin

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.touch = isTouchDevice();

    this.moveX = 0; // strafe, -1..1
    this.moveZ = 0; // forward, -1..1 (negative = forward)
    this.yawDelta = 0;
    this.pitchDelta = 0;
    this._interactPressed = false; // edge-triggered, consumed via consumeInteract()
    // Bugfix 2/4: trolley attach/detach used to share E/the interact tap target with
    // mount/dismount (a stray keydown-autorepeat frame during a held E could dismount
    // instead of attach, or vice versa — see the keydown guards below). Now a fully
    // separate edge-triggered flag/key: F on desktop, its own tap target on touch
    // (#attach-hint, shown only when main.js says attach/detach is actually possible).
    this._attachPressed = false;

    this._keys = new Set();
    this._pointerLocked = false;

    if (this.touch) {
      this._setupTouch();
    } else {
      this._setupDesktop();
    }
    this._setupInteractButton();
    this._setupAttachButton();
  }

  /** Mount/dismount vehicles: E on desktop, the on-screen button on touch. Returns
   * true once per press (edge-triggered) so callers don't need their own debounce. */
  consumeInteract() {
    const pressed = this._interactPressed;
    this._interactPressed = false;
    return pressed;
  }

  /** Trolley attach/detach (bugfix 2/4): F on desktop, its own #attach-hint tap
   * target on touch (see _setupAttachButton below) — fully separate from
   * consumeInteract()/E, never shared. */
  consumeAttach() {
    const pressed = this._attachPressed;
    this._attachPressed = false;
    return pressed;
  }

  /** The interaction prompt (item 2, index.html #interact-hint) doubles as the large
   * tap target on touch — no separate button. On desktop it's purely a visual badge;
   * E does the work via the keydown listener below. */
  _setupInteractButton() {
    const hint = document.getElementById('interact-hint');
    if (!hint) return;
    if (this.touch) {
      hint.classList.add('touch-target');
      // Mobile pass (task 3): the badge hard-codes "E" in index.html for the desktop
      // keyboard-hint case — showing that on a touchscreen implied a physical E key
      // that doesn't exist there. TAP fits the same badge sizing (already tuned small
      // for short text, not a single letter).
      const badge = document.getElementById('interact-key-badge');
      if (badge) badge.textContent = 'TAP';
      hint.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this._interactPressed = true;
      });
    } else {
      window.addEventListener('keydown', (e) => {
        // Bugfix 2/4: a held key fires repeated keydown events (native OS key-repeat)
        // — without this guard, holding E past the first frame kept re-arming
        // _interactPressed on every repeat event, which tick() (a fresh frame each
        // time) read as a brand new press: mount, then immediately dismount on the
        // very next repeat event, then remount, flickering for as long E stayed held.
        // Same risk for F, guarded the same way even though nothing hit it yet.
        if (e.repeat) return;
        if (e.code === 'KeyE') this._interactPressed = true;
        if (e.code === 'KeyF') this._attachPressed = true;
      });
    }
  }

  /** Trolley attach/detach's own on-screen target (bugfix 2/4) — index.html
   * #attach-hint, a second copy of the same badge+text widget #interact-hint uses,
   * shown/hidden by main.js only when attaching or detaching is actually possible
   * right now (never a permanent second button cluttering the screen). Desktop's F
   * key is wired above in _setupInteractButton; this only wires the touch tap. */
  _setupAttachButton() {
    const hint = document.getElementById('attach-hint');
    if (!hint || !this.touch) return;
    hint.classList.add('touch-target');
    const badge = document.getElementById('attach-key-badge');
    if (badge) badge.textContent = 'TAP';
    hint.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._attachPressed = true;
    });
  }

  get pointerLocked() {
    return this._pointerLocked;
  }

  requestPointerLock() {
    if (!this.touch && document.pointerLockElement !== this.canvas) {
      // May reject (headless contexts, missing user-activation edge cases) — non-fatal.
      const result = this.canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    }
  }

  /** Call once per frame; returns and clears the accumulated look delta. */
  consumeLookDelta() {
    const d = { yaw: this.yawDelta, pitch: this.pitchDelta };
    this.yawDelta = 0;
    this.pitchDelta = 0;
    return d;
  }

  _setupDesktop() {
    window.addEventListener('keydown', (e) => this._keys.add(e.code));
    window.addEventListener('keyup', (e) => this._keys.delete(e.code));

    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this._pointerLocked) return;
      this.yawDelta -= e.movementX * MOUSE_SENSITIVITY;
      this.pitchDelta -= e.movementY * MOUSE_SENSITIVITY;
    });

    this._updateDesktopMove = () => {
      let x = 0;
      let z = 0;
      if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) z -= 1;
      if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) z += 1;
      if (this._keys.has('KeyA') || this._keys.has('ArrowLeft')) x -= 1;
      if (this._keys.has('KeyD') || this._keys.has('ArrowRight')) x += 1;
      const len = Math.hypot(x, z);
      if (len > 1) {
        x /= len;
        z /= len;
      }
      this.moveX = x;
      this.moveZ = z;
    };
  }

  _setupTouch() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const lookZone = document.getElementById('look-zone');

    let joystickPointerId = null;
    let joystickOrigin = { x: 0, y: 0 };

    zone.addEventListener('pointerdown', (e) => {
      if (joystickPointerId !== null) return;
      joystickPointerId = e.pointerId;
      const rect = zone.getBoundingClientRect();
      joystickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      zone.setPointerCapture(e.pointerId);
    });

    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joystickPointerId) return;
      let dx = e.clientX - joystickOrigin.x;
      let dy = e.clientY - joystickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > JOYSTICK_MAX_RADIUS) {
        dx = (dx / len) * JOYSTICK_MAX_RADIUS;
        dy = (dy / len) * JOYSTICK_MAX_RADIUS;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.moveX = dx / JOYSTICK_MAX_RADIUS;
      this.moveZ = dy / JOYSTICK_MAX_RADIUS;
    });

    const releaseJoystick = (e) => {
      if (e.pointerId !== joystickPointerId) return;
      joystickPointerId = null;
      this.moveX = 0;
      this.moveZ = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    };
    zone.addEventListener('pointerup', releaseJoystick);
    zone.addEventListener('pointercancel', releaseJoystick);

    let lookPointerId = null;
    let lastLook = { x: 0, y: 0 };

    lookZone.addEventListener('pointerdown', (e) => {
      if (lookPointerId !== null) return;
      lookPointerId = e.pointerId;
      lastLook = { x: e.clientX, y: e.clientY };
      lookZone.setPointerCapture(e.pointerId);
    });

    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookPointerId) return;
      const dx = e.clientX - lastLook.x;
      const dy = e.clientY - lastLook.y;
      lastLook = { x: e.clientX, y: e.clientY };
      this.yawDelta -= dx * TOUCH_LOOK_SENSITIVITY;
      this.pitchDelta -= dy * TOUCH_LOOK_SENSITIVITY;
    });

    const releaseLook = (e) => {
      if (e.pointerId !== lookPointerId) return;
      lookPointerId = null;
    };
    lookZone.addEventListener('pointerup', releaseLook);
    lookZone.addEventListener('pointercancel', releaseLook);
  }

  /** Must be called once per frame for desktop keyboard state to update moveX/moveZ. */
  update() {
    if (!this.touch && this._updateDesktopMove) this._updateDesktopMove();
  }
}
