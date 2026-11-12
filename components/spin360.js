/**
 * spin360 — drag-to-rotate controller shared by RoofScene and SheetStory.
 *
 *   const spin = createSpin(element);
 *   spin.setEnabled(true);            // turn 360° mode on / off
 *   // every frame:
 *   spin.update(dt);
 *   object.rotation.y = base + spin.yaw;
 *   object.rotation.x = base + spin.pitch;
 *
 * - Full 360° turn left / right, limited tilt up / down.
 * - Throw it and it keeps spinning, then slows down.
 * - Left alone for a few seconds, it turns slowly on its own.
 * - Turned off, it eases back to the original angle the short way round.
 * - While on, touch-action is off on the element so a finger drag rotates
 *   instead of scrolling the page. While off, the page scrolls normally.
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = (a) => a - TAU * Math.round(a / TAU);

export function createSpin(
  target,
  { maxPitch = 0.6, sensitivity = 0.008, autoSpeed = 0.35, autoDelay = 2.5 } = {}
) {
  const s = { yaw: 0, pitch: 0, mix: 0, enabled: false };
  let vy = 0;
  let vp = 0;
  let dragging = false;
  let id = null;
  let lx = 0;
  let ly = 0;
  let lt = 0;
  let idle = 0;

  const down = (e) => {
    if (!s.enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragging = true;
    id = e.pointerId;
    lx = e.clientX;
    ly = e.clientY;
    lt = e.timeStamp;
    vy = vp = 0;
    idle = 0;
    target.setPointerCapture?.(id);
    target.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const move = (e) => {
    if (!dragging || e.pointerId !== id) return;
    const dx = (e.clientX - lx) * sensitivity;
    const dy = (e.clientY - ly) * sensitivity;
    const dt = Math.max((e.timeStamp - lt) / 1000, 1 / 240);
    lx = e.clientX;
    ly = e.clientY;
    lt = e.timeStamp;
    s.yaw += dx;
    s.pitch = clamp(s.pitch + dy, -maxPitch, maxPitch);
    vy = vy * 0.6 + (dx / dt) * 0.4;
    vp = vp * 0.6 + (dy / dt) * 0.4;
  };

  const up = (e) => {
    if (e.pointerId !== id) return;
    // held still before letting go: no throw
    if (e.timeStamp - lt > 80) vy = vp = 0;
    dragging = false;
    id = null;
    idle = 0;
    if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
    target.style.cursor = s.enabled ? 'grab' : '';
  };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);

  s.update = (dt) => {
    s.mix += ((s.enabled ? 1 : 0) - s.mix) * (1 - Math.exp(-dt * 6));
    if (s.enabled) {
      if (dragging) return;
      idle += dt;
      s.yaw += vy * dt;
      s.pitch = clamp(s.pitch + vp * dt, -maxPitch, maxPitch);
      const k = Math.exp(-dt * 3.2);
      vy *= k;
      vp *= k;
      if (autoSpeed && idle > autoDelay) s.yaw += autoSpeed * dt * Math.min(1, idle - autoDelay);
    } else {
      vy = vp = 0;
      s.yaw = wrap(s.yaw);
      const k = 1 - Math.exp(-dt * 4);
      s.yaw -= s.yaw * k;
      s.pitch -= s.pitch * k;
    }
  };

  s.setEnabled = (on) => {
    s.enabled = on;
    dragging = false;
    id = null;
    idle = 0;
    target.style.touchAction = on ? 'none' : '';
    target.style.cursor = on ? 'grab' : '';
    target.style.pointerEvents = on ? 'auto' : '';
  };

  s.dispose = () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', up);
    target.style.touchAction = '';
    target.style.cursor = '';
    target.style.pointerEvents = '';
  };

  return s;
}