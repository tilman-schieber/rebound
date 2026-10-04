// Tiny Web Audio chiptune synth: SFX, and music that swells as the wall comes down: a groove whose
// melody is made up afresh for every wall.
import { makeRng } from './rng';

let ctx: AudioContext | null = null;
let master: GainNode;
let noiseBuf: AudioBuffer;

export function unlockAudio() {
  // iOS: play through the silent switch like a media app (Safari 16.4+).
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  if (session && session.type !== 'playback') session.type = 'playback';
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slideTo?: number) {
  if (!ctx) return;
  const t = at || ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

function noise(dur: number, vol: number, cutoff: number, at = 0, type: BiquadFilterType = 'lowpass') {
  if (!ctx) return;
  const t = at || ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur);
}

function arp(notes: number[], step: number, vol = 0.25, type: OscillatorType = 'square') {
  if (!ctx) return;
  const t = ctx.currentTime;
  notes.forEach((n, i) => n && tone(midiHz(n), step, type, vol, t + i * step));
}

/** Each brick in a run without the paddle rings a step higher. */
const RUN_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export const sfx = {
  move: () => tone(1400, 0.02, 'square', 0.12),
  select: () => tone(988, 0.04, 'square', 0.18),
  start: () => arp([67, 72, 76, 79, 0, 76, 79, 84, 0, 83, 86, 91], 0.07, 0.2),
  pause: () => arp([84, 79], 0.06, 0.18),
  launch: () => tone(440, 0.08, 'square', 0.2, 0, 880),
  paddle: () => tone(midiHz(57), 0.06, 'square', 0.22),
  wall: () => tone(midiHz(45), 0.04, 'triangle', 0.3),
  /** A brick broken, the `run`-th since the ball last touched a paddle. */
  brick: (run: number) => tone(midiHz(72 + RUN_SCALE[Math.min(run, RUN_SCALE.length - 1)]), 0.07, 'square', 0.16),
  crack: () => {
    noise(0.06, 0.3, 2500);
    tone(midiHz(60), 0.04, 'triangle', 0.3);
  },
  clink: () => {
    tone(2200, 0.05, 'square', 0.1);
    noise(0.05, 0.2, 8000, 0, 'highpass');
  },
  /** Two primaries made a mix. */
  mix: () => arp([72, 79, 76, 84, 0, 88, 91], 0.045, 0.22, 'triangle'),
  fire: () => {
    noise(0.6, 0.35, 1200);
    tone(120, 0.5, 'sawtooth', 0.15, 0, 600);
  },
  multi: () => arp([72, 76, 79, 84, 88, 91, 96], 0.03, 0.2),
  magnet: () => {
    tone(300, 0.4, 'sine', 0.3, 0, 900);
    tone(450, 0.4, 'sine', 0.2, 0, 1350);
  },
  catch: () => tone(160, 0.06, 'triangle', 0.35, 0, 90),
  powerEnd: () => tone(600, 0.15, 'triangle', 0.25, 0, 300),
  ballLost: () => tone(400, 0.35, 'triangle', 0.35, 0, 80),
  die: () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let k = 0; k < 7; k++) tone(600 - k * 60, 0.1, 'square', 0.18, t + k * 0.09, 450 - k * 50);
    noise(0.6, 0.4, 900, t + 0.6);
  },
  oneUp: () => arp([76, 79, 88, 84, 86, 91], 0.07, 0.22),
  cleared: () => arp([72, 76, 79, 84, 79, 84, 88, 91], 0.07, 0.22),
  over: () => arp([67, 63, 60, 55, 51, 48], 0.12, 0.22),
};

// ---------- music ----------
// Each tune is a loop of time units. Intensity 0-5 comes from how much of the wall is gone:
// instruments join as it falls.

interface Tune {
  name: string;
  /** Seconds per unit at tempo 1. */
  unit: number;
  length: number;
  /** Schedule whatever sounds at unit i (already wrapped into the loop). */
  play(i: number, t: number, lv: number, tr: number, unitSec: number): void;
}

const perc = {
  snare: (t: number, vol: number) => noise(0.05, vol, 7000, t, 'highpass'),
  hat: (t: number, vol: number) => noise(0.03, vol, 9000, t, 'highpass'),
  kick: (t: number, vol: number) => {
    tone(120, 0.12, 'sine', vol, t, 40);
    noise(0.04, vol * 0.4, 300, t);
  },
};

// --- Groove: four bars of sixteenths over Am F C G. The melody comes from the wall's seed.
const CHORDS = [
  [45, 0, 3, 7],
  [41, 0, 4, 7],
  [48, 0, 4, 7],
  [43, 0, 4, 7],
];
const PENTATONIC = [0, 3, 5, 7, 10, 12, 15, 17];
/** Midi note per unit, 0 for a rest. */
let melody: number[] = [];
let power = false;

function compose(seed: number) {
  const rng = makeRng(seed);
  const bar = () => {
    const out: number[] = [];
    let d = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < 8; k++) {
      d = Math.max(0, Math.min(PENTATONIC.length - 1, d + [-2, -1, -1, 0, 1, 1, 2][Math.floor(rng() * 7)]));
      // Eighth notes, with a rest now and then; the downbeat always sounds.
      out.push(k === 0 || rng() < 0.72 ? 69 + PENTATONIC[d] : 0, 0);
    }
    return out;
  };
  const a = bar(), b = bar(), c = bar();
  melody = [...a, ...b, ...a, ...c];
}
compose(1);

const GROOVE: Tune = {
  name: 'GROOVE',
  unit: 60 / 116 / 4,
  length: 64,
  play(i, t, lv, tr, u) {
    const [root, ...triad] = CHORDS[i >> 4];
    const s = i % 16;
    if (s % 2 === 0) tone(midiHz(root + tr + (s % 4 === 2 ? 12 : 0)), u * 1.7, 'triangle', 0.3, t);
    if (lv >= 1 && s % 8 === 0) perc.kick(t, 0.45);
    if (lv >= 2 && s % 8 === 4) perc.snare(t, 0.11);
    if (lv >= 3 && s % 2 === 1) perc.hat(t, 0.045);
    if (lv >= 4 && (s === 10 || s === 14)) perc.kick(t, 0.3);
    if (power) {
      // A power-up is working: the tune gives way to a racing arpeggio.
      tone(midiHz(root + 24 + tr + triad[i % 3] + 12 * ((i >> 1) % 2)), u * 0.9, 'square', 0.07, t);
      return;
    }
    if (lv >= 2) tone(midiHz(root + 12 + tr + triad[(i >> 1) % 3]), u * 0.8, 'square', 0.025 + lv * 0.004, t);
    const m = melody[i];
    if (m) {
      tone(midiHz(m + tr), u * 1.8, lv >= 3 ? 'square' : 'triangle', lv >= 3 ? 0.08 : 0.26, t);
      if (lv >= 3) tone(midiHz(m + tr), u * 1.5, 'triangle', 0.14, t + u * 3);
      if (lv >= 5) tone(midiHz(m + tr + 12), u * 1.5, 'square', 0.03, t);
    }
  },
};

export const TUNES = [GROOVE];
export const TUNE = { GROOVE: 0 } as const;

let musicOn = true;
let playing = false;
let tune = 0;
let unit = 0;
let nextTime = 0;
let timer: number | undefined;
let transpose = 0;
let intensity = 0;
let tempo = 1;

function schedule() {
  if (!ctx) return;
  const tn = TUNES[tune];
  while (nextTime < ctx.currentTime + 0.12) {
    const u = tn.unit / tempo;
    tn.play(unit % tn.length, nextTime, intensity, transpose, u);
    unit++;
    nextTime += u;
  }
}

export const music = {
  /** Start (or keep playing) a tune; switching tunes starts it from the top. */
  play(which = tune, restart = false) {
    if (which !== tune || restart) {
      this.halt();
      tune = which;
      unit = 0;
    }
    playing = true;
    if (!ctx || !musicOn || timer !== undefined) return;
    nextTime = ctx.currentTime + 0.05;
    timer = window.setInterval(schedule, 25);
  },
  resume() {
    if (playing) this.play();
  },
  stop() {
    playing = false;
    this.halt();
  },
  halt() {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  },
  /** Semitones up or down from A minor, kept within a tritone. */
  setKey(semis: number) {
    transpose = ((semis + 18) % 12) - 6;
  },
  setIntensity(lv: number) {
    intensity = lv;
  },
  /** Tempo multiplier. */
  setTempo(mult: number) {
    tempo = mult;
  },
  /** The groove's melody for this wall. */
  setMelody(seed: number) {
    compose(seed);
  },
  /** While a power-up works the tune races. */
  setPower(on: boolean) {
    power = on;
  },
  toggle() {
    musicOn = !musicOn;
    if (!musicOn) this.halt();
    else if (playing) this.play();
    return musicOn;
  },
  set enabled(on: boolean) {
    if (on !== musicOn) this.toggle();
  },
  get enabled() {
    return musicOn;
  },
  get running() {
    return timer !== undefined;
  },
  get tune() {
    return tune;
  },
};
