// One wall in play: paddles, balls, bricks, paint and power-ups. Coordinates are field pixels.
import type { Mode } from './modes';
import type { Rng } from './rng';
import { sfx } from './audio';
import { Wall, COLS, ROWS, WHITE, RED, ORANGE, PURPLE, GREEN, STEEL, isMix } from './walls';

export const FW = COLS * 8;
export const FH = 194;
export const BRICK_W = 8;
export const BRICK_H = 6;
/** The ball is a 4x4 square, centred. */
export const R = 2;
export const PADDLE_H = 4;
/** Where the wall starts in a one-paddle game. */
const WALL_TOP = 22;

export type PowerKind = 'fire' | 'multi' | 'magnet';
/** What each mix puts in your pocket. */
export const POWER_OF: Record<number, PowerKind> = { [ORANGE]: 'fire', [GREEN]: 'multi', [PURPLE]: 'magnet' };
export const POWER_COLOR: Record<PowerKind, number> = { fire: ORANGE, multi: GREEN, magnet: PURPLE };
export const COLOR_NAMES = ['WHITE', 'RED', 'YELLOW', 'ORANGE', 'BLUE', 'PURPLE', 'GREEN', 'STEEL'];

export interface Brick {
  col: number;
  row: number;
  w: number;
  color: number;
  points?: number;
  cracked: boolean;
  alive: boolean;
  /** Frames left of a flash after a hit that didn't break it. */
  flash: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  /** Index of the paddle it sits on, or -1 in flight. */
  stuck: number;
  /** Offset from the paddle's centre while it sits there. */
  offset: number;
  /** Frames it has sat on the paddle. */
  held: number;
  trail: { x: number; y: number }[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
  size: number;
}

export interface Popup {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export interface WorldOptions {
  rng: Rng;
  level: number;
  /** Base ball speed, pixels per frame. */
  speed: number;
  /** Score multiplier. */
  points: number;
  mode: Mode;
  wall: Wall;
  /** The title screen plays itself, quietly. */
  demo?: boolean;
}

export interface Controls {
  move: -1 | 0 | 1;
  /** Launch the ball (Up, Space). */
  launch: boolean;
  /** Use the pocket (Space, Shift, X); launches first if a ball is waiting. */
  use: boolean;
}

export type WorldState = 'play' | 'dying' | 'dead' | 'cleared' | 'done';

const PADDLE_MAX_V = 4.2;
const PADDLE_ACCEL = 0.4;
const PADDLE_START_V = 1.6;
const MAX_BALLS = 12;

export class World {
  bricks: Brick[] = [];
  /** Brick index per cell, -1 for none. */
  grid = new Int16Array(COLS * ROWS).fill(-1);
  wallTop: number;
  balls: Ball[] = [];
  /** Paddle centre; all paddles move together. */
  px = FW / 2;
  private pv = 0;
  /** Half the paddle's width. */
  pw: number;
  paddles: number[];
  state: WorldState = 'play';
  stateTimer = 0;
  /** A ball has left the paddle this life. */
  launched = false;

  pocket: PowerKind | null = null;
  fire = 0;
  fireTotal = 1;
  magnet = 0;
  magnetTotal = 1;

  /** Bricks broken since a ball last touched a paddle. */
  run = 0;
  /** Paddle hits this life: the ball speeds up with them. */
  private hits = 0;
  private hitOrange = false;
  private hitRed = false;
  private shrunk = false;
  bricksLeft = 0;
  bricksTotal = 0;
  /** Points and mixes since the game last collected them. */
  gained = 0;
  mixesMade = 0;
  particles: Particle[] = [];
  popups: Popup[] = [];
  shake = 0;
  /** The demo paddle's aim, relative to its centre. */
  private demoAim = 0;

  constructor(public opt: WorldOptions) {
    const { wall, mode } = opt;
    this.wallTop = mode.twin ? Math.round((FH - wall.rows * BRICK_H) / 2) : WALL_TOP;
    this.paddles = mode.twin ? [FH - 14, 10] : [FH - 14];
    this.pw = this.fullWidth;
    for (const p of wall.bricks) {
      const i = this.bricks.length;
      this.bricks.push({ ...p, cracked: false, alive: true, flash: 0 });
      for (let k = 0; k < p.w; k++) this.grid[p.row * COLS + p.col + k] = i;
      if (p.color !== STEEL) this.bricksLeft++;
    }
    this.bricksTotal = this.bricksLeft;
    this.serve();
  }

  get twin() {
    return this.opt.mode.twin;
  }

  get paint() {
    return this.opt.mode.paint;
  }

  private get fullWidth() {
    if (!this.paint) return 14;
    if (this.twin) return 14;
    return 16 - Math.min(4, Math.floor((this.opt.level - 1) / 3));
  }

  brickX(b: Brick) {
    return b.col * BRICK_W;
  }

  brickY(b: Brick) {
    return this.wallTop + b.row * BRICK_H;
  }

  /** Current ball speed: it rises with the level and with every paddle hit. */
  get speed() {
    let s = this.opt.speed * (1 + Math.min(0.4, (this.opt.level - 1) * 0.04));
    if (!this.paint) {
      // Breakout's own steps: after 4 and 12 hits, and on first reaching the orange and red rows.
      let k = 1;
      if (this.hits >= 4) k = 1.12;
      if (this.hits >= 12) k = 1.25;
      if (this.hitOrange) k = Math.max(k, 1.38);
      if (this.hitRed) k = 1.5;
      return s * k;
    }
    s *= 1 + Math.min(0.3, this.hits * 0.004);
    return this.twin ? s * 0.9 : s;
  }

  /** A fresh ball on the bottom paddle. */
  private serve() {
    this.balls = [this.newBall(0, (this.opt.rng() - 0.5) * this.pw)];
    this.launched = false;
  }

  private newBall(paddle: number, offset: number): Ball {
    const b: Ball = { x: 0, y: 0, vx: 0, vy: 0, color: WHITE, stuck: paddle, offset, held: 0, trail: [] };
    this.sit(b);
    return b;
  }

  /** Puts a stuck ball where its paddle is. */
  private sit(b: Ball) {
    b.x = this.px + b.offset;
    const top = this.paddles[b.stuck] < FH / 2;
    b.y = top ? this.paddles[b.stuck] + PADDLE_H + R : this.paddles[b.stuck] - R;
  }

  respawn() {
    this.state = 'play';
    this.stateTimer = 0;
    this.run = 0;
    this.hits = 0;
    this.fire = 0;
    this.magnet = 0;
    this.shrunk = false;
    this.pw = this.fullWidth;
    this.px = FW / 2;
    this.pv = 0;
    this.serve();
  }

  private sound(play: () => void) {
    if (!this.opt.demo) play();
  }

  popup(text: string, x: number, y: number, color: string) {
    this.popups.push({ text, x, y, life: 60, color });
  }

  private burst(x: number, y: number, color: number, n: number, force = 1) {
    const rng = this.opt.rng;
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, v = (0.4 + rng() * 1.4) * force;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 20 + rng() * 25, color, size: rng() < 0.3 ? 2 : 1 });
    }
  }

  private score(points: number) {
    this.gained += Math.round(points * this.opt.points);
  }

  // ---------- a frame ----------

  update(c: Controls) {
    this.stateTimer++;
    if (this.shake > 0) this.shake--;
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.life--;
      p.y -= 0.3;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    for (const b of this.bricks) if (b.flash > 0) b.flash--;

    switch (this.state) {
      case 'dying':
        if (this.stateTimer > 90) this.state = 'dead';
        return;
      case 'cleared':
        return this.stepCleared();
      case 'play':
        return this.stepPlay(this.opt.demo ? this.autopilot() : c);
    }
  }

  private stepPlay(c: Controls) {
    this.movePaddle(c.move);
    const waiting = this.balls.filter((b) => b.stuck >= 0);
    if (waiting.length && (c.launch || c.use)) waiting.forEach((b) => this.launch(b));
    else if (c.use && this.pocket) this.usePower();
    for (const b of this.balls) {
      if (b.stuck < 0) continue;
      this.sit(b);
      // A ball doesn't wait forever: the first serve of a life longest.
      if (++b.held > (this.launched ? 150 : 300)) this.launch(b);
    }

    if (this.fire > 0 && --this.fire === 0) this.sound(sfx.powerEnd);
    if (this.magnet > 0 && --this.magnet === 0) {
      this.sound(sfx.powerEnd);
      this.balls.forEach((b) => b.stuck >= 0 && this.launch(b));
    }

    for (const b of this.balls) if (b.stuck < 0) this.moveBall(b);
    const before = this.balls.length;
    this.balls = this.balls.filter((b) => b.y < FH + 6 && b.y > -6);
    if (this.balls.length < before) {
      if (!this.balls.length) return this.die();
      this.sound(sfx.ballLost);
    }
    if (this.bricksLeft === 0) {
      this.state = 'cleared';
      this.stateTimer = 0;
      this.score(1000);
      this.popup(`CLEARED +${Math.round(1000 * this.opt.points)}`, FW / 2, this.wallTop + 30, '#fcfcfc');
      this.sound(sfx.cleared);
    }
  }

  /** Steel that's left shatters, one brick after another. */
  private stepCleared() {
    if (this.stateTimer % 4 === 0) {
      const b = this.bricks.find((k) => k.alive);
      if (b) {
        this.breakBrick(b, false);
        this.shake = 4;
      }
    }
    if (this.stateTimer > 120 && !this.bricks.some((k) => k.alive)) this.state = 'done';
  }

  private die() {
    this.state = 'dying';
    this.stateTimer = 0;
    this.fire = 0;
    this.magnet = 0;
    this.shake = 12;
    for (const y of this.paddles) this.burst(this.px, y + 2, WHITE, 24, 1.5);
    this.sound(sfx.die);
  }

  private movePaddle(move: number) {
    if (!move) this.pv = 0;
    else if (Math.sign(this.pv) === move) this.pv = move * Math.min(PADDLE_MAX_V, Math.abs(this.pv) + PADDLE_ACCEL);
    else this.pv = move * PADDLE_START_V;
    this.px = Math.max(this.pw, Math.min(FW - this.pw, this.px + this.pv));
  }

  private launch(b: Ball) {
    const rng = this.opt.rng;
    let rel = b.offset / this.pw;
    // Never straight up, or it could bounce up and down for ever.
    if (Math.abs(rel) < 0.15) rel = (rng() < 0.5 ? -1 : 1) * (0.15 + rng() * 0.2);
    this.aim(b, rel, this.paddles[b.stuck] < FH / 2 ? 1 : -1);
    b.stuck = -1;
    this.launched = true;
    this.sound(sfx.launch);
  }

  /** Sends a ball off a paddle: `rel` -1..1 across it, `dy` the way it goes. */
  private aim(b: Ball, rel: number, dy: number) {
    const a = Math.max(-1, Math.min(1, rel)) * 1.05;
    const s = this.speed;
    b.vx = Math.sin(a) * s;
    b.vy = Math.cos(a) * s * dy;
  }

  // ---------- the ball ----------

  private moveBall(b: Ball) {
    const s = this.speed;
    const len = Math.hypot(b.vx, b.vy) || 1;
    b.vx = (b.vx / len) * s;
    b.vy = (b.vy / len) * s;
    // Not too flat, or a rally could take for ever.
    const minVy = s * 0.28;
    if (Math.abs(b.vy) < minVy) {
      b.vy = (b.vy < 0 ? -1 : 1) * minVy;
      b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(s * s - minVy * minVy);
    }
    b.trail.unshift({ x: b.x, y: b.y });
    if (b.trail.length > 6) b.trail.length = 6;

    const n = Math.ceil(s / 0.7);
    for (let k = 0; k < n; k++) {
      const dx = b.vx / n;
      b.x += dx;
      if (b.x < R || b.x > FW - R) {
        b.x = Math.max(R, Math.min(FW - R, b.x));
        b.vx = -b.vx;
        this.sound(sfx.wall);
      }
      if (this.hitBricks(b)) {
        b.x -= dx;
        b.vx = -b.vx;
      }
      const dy = b.vy / n;
      b.y += dy;
      if (!this.twin && b.y < R) {
        b.y = R;
        b.vy = Math.abs(b.vy);
        this.sound(sfx.wall);
        // CLASSIC: the paddle halves once the ball breaks through to the back wall.
        if (!this.paint && !this.shrunk && this.bricksLeft < this.bricksTotal) {
          this.shrunk = true;
          this.pw = Math.round(this.pw / 2);
        }
      }
      if (this.hitBricks(b)) {
        b.y -= dy;
        b.vy = -b.vy;
      }
      if (this.hitPaddles(b)) return;
    }
  }

  /** Strikes what the ball touches; true when it should bounce. */
  private hitBricks(b: Ball) {
    const c0 = Math.floor((b.x - R) / BRICK_W), c1 = Math.floor((b.x + R - 0.01) / BRICK_W);
    const r0 = Math.floor((b.y - R - this.wallTop) / BRICK_H), r1 = Math.floor((b.y + R - 0.01 - this.wallTop) / BRICK_H);
    let best: Brick | null = null;
    let bestD = Infinity;
    for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++)
      for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
        const i = this.grid[r * COLS + c];
        if (i < 0) continue;
        const k = this.bricks[i];
        // On fire it burns through everything it touches.
        if (this.fire > 0) {
          this.breakBrick(k, true);
          continue;
        }
        const d = Math.hypot(this.brickX(k) + (k.w * BRICK_W) / 2 - b.x, this.brickY(k) + BRICK_H / 2 - b.y);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
    if (!best) return false;
    this.strike(best, b);
    return true;
  }

  private strike(k: Brick, b: Ball) {
    if (!this.paint) {
      this.breakBrick(k, true);
      if (k.color === ORANGE) this.hitOrange = true;
      if (k.color === RED) this.hitRed = true;
      return;
    }
    const ball = b.color;
    if (k.color === STEEL) {
      if (isMix(ball)) return this.breakBrick(k, true);
      k.flash = 8;
      return this.sound(sfx.clink);
    }
    // One hit if the ball's colour holds the brick's; two otherwise.
    const one = k.color === WHITE || k.cracked || (ball !== WHITE && (ball & k.color) === k.color);
    if (one) this.breakBrick(k, true);
    else {
      k.cracked = true;
      k.flash = 6;
      this.sound(sfx.crack);
    }
    this.paintBall(b, k.color);
  }

  /** The ball takes the colour it hits; two primaries in a row make a mix. */
  private paintBall(b: Ball, c: number) {
    const ball = b.color;
    if (c === WHITE || c === STEEL || ball === c) return;
    if (isMix(c) || ball === WHITE) {
      b.color = c;
      return;
    }
    // c is a primary from here on.
    if (isMix(ball)) {
      // A mix keeps through its own parts.
      if (!(ball & c)) b.color = c;
      return;
    }
    b.color = ball | c;
    this.mixed(b);
  }

  private mixed(b: Ball) {
    this.mixesMade++;
    const kind = POWER_OF[b.color];
    this.burst(b.x, b.y, b.color, 16, 1.2);
    if (!this.pocket) {
      this.pocket = kind;
      this.score(100);
      this.popup(COLOR_NAMES[b.color], b.x, b.y, '#fcfcfc');
    } else {
      this.score(300);
      this.popup(`${COLOR_NAMES[b.color]} +${Math.round(300 * this.opt.points)}`, b.x, b.y, '#fcfcfc');
    }
    this.sound(sfx.mix);
  }

  private breakBrick(k: Brick, byBall: boolean) {
    k.alive = false;
    for (let i = 0; i < k.w; i++) this.grid[k.row * COLS + k.col + i] = -1;
    if (k.color !== STEEL) this.bricksLeft--;
    const base = k.points ?? (k.color === STEEL ? 50 : k.color === WHITE ? 10 : isMix(k.color) ? 30 : 20);
    let mult = 1;
    if (byBall) {
      this.run++;
      // A long run without the paddle pays more, in CLASSIC too.
      mult = Math.min(4, 1 + Math.floor((this.run - 1) / 6));
      if (this.paint && this.run > 1 && this.run <= 19 && (this.run - 1) % 6 === 0) this.popup(`RUN X${mult}`, this.brickX(k) + 4, this.brickY(k), '#f8d838');
      this.sound(() => sfx.brick(this.run));
    }
    this.score(base * (this.paint ? mult : 1));
    this.burst(this.brickX(k) + (k.w * BRICK_W) / 2, this.brickY(k) + BRICK_H / 2, k.color, 5 + k.w * 2);
  }

  private hitPaddles(b: Ball) {
    for (let i = 0; i < this.paddles.length; i++) {
      const y = this.paddles[i];
      const top = y < FH / 2;
      const toward = top ? b.vy < 0 : b.vy > 0;
      if (!toward || Math.abs(b.x - this.px) > this.pw + R) continue;
      if (b.y + R < y || b.y - R > y + PADDLE_H) continue;
      this.run = 0;
      this.hits++;
      const rel = (b.x - this.px) / this.pw;
      if (this.magnet > 0) {
        b.stuck = i;
        b.offset = Math.max(-this.pw, Math.min(this.pw, b.x - this.px));
        b.held = 0;
        this.sit(b);
        this.sound(sfx.catch);
      } else {
        this.aim(b, rel, top ? 1 : -1);
        b.y = top ? y + PADDLE_H + R : y - R;
        this.sound(sfx.paddle);
      }
      this.demoAim = (this.opt.rng() - 0.5) * this.pw * 1.4;
      return true;
    }
    return false;
  }

  // ---------- power-ups ----------

  private usePower() {
    const kind = this.pocket!;
    this.pocket = null;
    const lv = this.opt.level;
    if (kind === 'fire') {
      this.fire = this.fireTotal = Math.max(200, 420 - lv * 12);
      this.sound(sfx.fire);
    } else if (kind === 'magnet') {
      this.magnet = this.magnetTotal = Math.max(360, 720 - lv * 18);
      this.sound(sfx.magnet);
    } else {
      // Every ball in flight splits in three.
      for (const b of [...this.balls]) {
        if (b.stuck >= 0) continue;
        for (const a of [-0.45, 0.45]) {
          if (this.balls.length >= MAX_BALLS) break;
          const cos = Math.cos(a), sin = Math.sin(a);
          this.balls.push({ ...b, vx: b.vx * cos - b.vy * sin, vy: b.vx * sin + b.vy * cos, trail: [] });
        }
      }
      this.sound(sfx.multi);
    }
    const label = { fire: 'FIREBALL', multi: 'MULTIBALL', magnet: 'MAGNET' }[kind];
    this.popup(label, this.px, this.paddles[0] - 10, '#fcfcfc');
  }

  // ---------- the title screen's player ----------

  private autopilot(): Controls {
    // Follow the ball that will reach a paddle first.
    let target = FW / 2;
    let soonest = Infinity;
    for (const b of this.balls) {
      if (b.stuck >= 0) continue;
      for (const y of this.paddles) {
        const t = (y - b.y) / b.vy;
        if (t > 0 && t < soonest) {
          soonest = t;
          target = b.x;
        }
      }
    }
    const want = target - this.demoAim;
    const move = Math.abs(want - this.px) < 3 ? 0 : want > this.px ? 1 : -1;
    const busy = this.balls.some((b) => b.stuck >= 0);
    return { move, launch: busy && this.stateTimer % 60 === 59, use: !busy && !!this.pocket };
  }
}
