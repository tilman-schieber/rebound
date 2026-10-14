// On-screen controls for phones and tablets: drag on the game screen to move the paddle, buttons below it.
import type { Action } from './game';

export interface TouchButton {
  id: string;
  label: string;
  a: Action;
  typed?: string;
  wide?: boolean;
}

const ROWS: TouchButton[][] = [
  [
    { id: 'music', label: '♪', a: 'mute' },
    { id: 'up', label: '▲', a: 'up' },
    { id: 'start', label: 'START', a: 'start', typed: 'Enter' },
  ],
  [
    { id: 'left', label: '◀', a: 'left' },
    { id: 'down', label: '▼', a: 'down' },
    { id: 'right', label: '▶', a: 'right' },
  ],
  [{ id: 'use', label: 'LAUNCH / POWER', a: 'use', wide: true }],
];

export interface TouchPanel {
  el: HTMLElement;
  update(musicOn: boolean): void;
}

/** Builds the touch panel on touch devices; returns it, or null elsewhere. */
export function setupTouch(onButton: (b: TouchButton, down: boolean) => void): TouchPanel | null {
  if (!matchMedia('(pointer: coarse)').matches) return null;
  const panel = document.createElement('div');
  panel.id = 'touch';
  let musicEl: HTMLButtonElement | null = null;

  for (const row of ROWS) {
    const r = document.createElement('div');
    r.className = 'row';
    for (const b of row) {
      const el = document.createElement('button');
      el.textContent = b.label;
      if (b.wide) el.classList.add('wide');
      const release = () => {
        el.classList.remove('on');
        onButton(b, false);
      };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add('on');
        onButton(b, true);
      });
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      if (b.id === 'music') musicEl = el;
      r.appendChild(el);
    }
    panel.appendChild(r);
  }
  document.body.appendChild(panel);
  document.body.classList.add('has-touch');

  let last: boolean | null = null;
  return {
    el: panel,
    update(musicOn) {
      if (musicOn === last || !musicEl) return;
      last = musicOn;
      musicEl.textContent = musicOn ? '♪' : '♪ OFF';
      musicEl.classList.toggle('off', !musicOn);
    },
  };
}

/** Relative dragging on `el`: `onMove` gets screen-pixel deltas, `onHold` whether a finger is down. */
export function setupDrag(el: HTMLElement, onMove: (dx: number, dy: number) => void, onHold: (down: boolean) => void) {
  el.style.touchAction = 'none';
  let id = -1, ox = 0, oy = 0;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    id = e.pointerId;
    ox = e.clientX;
    oy = e.clientY;
    el.setPointerCapture(id);
    onHold(true);
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    onMove(e.clientX - ox, e.clientY - oy);
    ox = e.clientX;
    oy = e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel'])
    el.addEventListener(ev, (e) => {
      if ((e as PointerEvent).pointerId !== id) return;
      id = -1;
      onHold(false);
    });
}
