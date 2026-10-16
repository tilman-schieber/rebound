import { Game, MENU, MUSIC_NAMES, NAME_LEN, INTRO_FRAMES } from './game';
import { World, Ball, Brick, FW, FH, BRICK_W, BRICK_H, PADDLE_H, POWER_COLOR, PowerKind } from './world';
import { WHITE as W_, RED as R_, YELLOW as Y_, ORANGE as O_, BLUE as B_, PURPLE as P_, GREEN as G_, STEEL } from './walls';
import { MODES, SPEED_NAMES, SPEED_POINTS } from './modes';
import { MAX_SCORES, GLOBAL_URL } from './scores';
import { HELP_PAGES, wrapText } from './help';
import { drawText, drawTextCentered, textWidth } from 'arcade-kit/font';
import { Ctx, WHITE, RED, GREY, LIGHT, DARK, YELLOW, mix, drawBox, pad } from 'arcade-kit/draw';

export const W = 256;
export const H = 224;

/** Field origin on screen: the HUD takes the top 24 pixels. */
const BX = 16;
const BY = 28;

/** By colour code: white, red, yellow, orange, blue, purple, green, steel. */
export const PAINT = ['#fcfcfc', '#f83800', '#f8d838', '#fca044', '#0078f8', '#a858f8', '#58d854', '#7c7c7c'];
const LIGHTER = PAINT.map((c) => mix(c, '#ffffff', 0.45));
const DARKER = PAINT.map((c) => mix(c, '#000000', 0.45));
DARKER[W_] = '#a4a4a4';
LIGHTER[STEEL] = '#bcbcbc';
DARKER[STEEL] = '#484848';
const FRAME = '#7c7c7c';
const POWER_NAMES: Record<PowerKind, string> = { fire: 'FIREBALL', multi: 'MULTIBALL', magnet: 'MAGNET' };

// ---------- the field ----------

function drawBrick(ctx: Ctx, w: World, k: Brick, frame: number) {
  const x = BX + w.brickX(k), y = BY + w.brickY(k);
  const bw = k.w * BRICK_W - 1;
  const c = k.color;
  if (k.flash > 0 && (k.flash >> 1) % 2 === 0) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(x, y, bw, BRICK_H - 1);
    return;
  }
  ctx.fillStyle = PAINT[c];
  ctx.fillRect(x, y, bw, BRICK_H - 1);
  ctx.fillStyle = LIGHTER[c];
  ctx.fillRect(x, y, bw, 1);
  ctx.fillRect(x, y, 1, BRICK_H - 1);
  ctx.fillStyle = DARKER[c];
  ctx.fillRect(x + 1, y + BRICK_H - 2, bw - 1, 1);
  if (c === STEEL) {
    // A rivet, and a glint that runs along the steel now and then.
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + (bw >> 1), y + 2, 1, 1);
    if ((frame + k.col * 3 + k.row * 5) % 180 < 2) ctx.fillRect(x + 1, y + 1, bw - 2, 1);
  }
  if (k.cracked) {
    ctx.fillStyle = '#000';
    for (const [dx, dy] of [[2, 1], [3, 2], [4, 2], [5, 3], [3, 3]]) ctx.fillRect(x + Math.min(dx, bw - 1), y + dy, 1, 1);
  }
}

function drawPaddle(ctx: Ctx, w: World, y: number, frame: number) {
  const x0 = Math.round(BX + w.px - w.pw), x1 = Math.round(BX + w.px + w.pw);
  const py = BY + y;
  const len = x1 - x0;
  // Silver in the middle, red caps; purple while the magnet works.
  const magnet = w.magnet > 0;
  const ending = magnet && w.magnet < 90 && (frame >> 2) % 2 === 0;
  const body = magnet && !ending ? PAINT[P_] : LIGHT;
  ctx.fillStyle = body;
  ctx.fillRect(x0 + 3, py, len - 6, PADDLE_H);
  ctx.fillStyle = WHITE;
  ctx.fillRect(x0 + 3, py, len - 6, 1);
  ctx.fillStyle = magnet ? mix(PAINT[P_], '#000000', 0.4) : GREY;
  ctx.fillRect(x0 + 3, py + PADDLE_H - 1, len - 6, 1);
  ctx.fillStyle = '#d82800';
  ctx.fillRect(x0 + 1, py, 2, PADDLE_H);
  ctx.fillRect(x1 - 3, py, 2, PADDLE_H);
  ctx.fillRect(x0, py + 1, 1, PADDLE_H - 2);
  ctx.fillRect(x1 - 1, py + 1, 1, PADDLE_H - 2);
  ctx.fillStyle = '#fc7460';
  ctx.fillRect(x0 + 1, py, 2, 1);
  ctx.fillRect(x1 - 3, py, 2, 1);
}

function ballColor(w: World, b: Ball, frame: number) {
  if (w.fire > 0) return (frame >> 1) % 2 ? PAINT[O_] : PAINT[Y_];
  return PAINT[b.color];
}

function drawBall(ctx: Ctx, w: World, b: Ball, frame: number) {
  const color = ballColor(w, b, frame);
  // A trail in the ball's colour; on fire, flames.
  b.trail.forEach((t, i) => {
    if (i % 2 && w.fire === 0) return;
    ctx.fillStyle = mix(w.fire > 0 ? (i < 2 ? PAINT[Y_] : PAINT[R_]) : PAINT[b.color], '#000000', 0.35 + i * 0.1);
    const s = w.fire > 0 ? Math.max(1, 3 - (i >> 1)) : 2;
    ctx.fillRect(Math.round(BX + t.x - s / 2), Math.round(BY + t.y - s / 2), s, s);
  });
  const x = Math.round(BX + b.x), y = Math.round(BY + b.y);
  ctx.fillStyle = color;
  ctx.fillRect(x - 2, y - 1, 4, 2);
  ctx.fillRect(x - 1, y - 2, 2, 4);
  ctx.fillStyle = mix(color, '#ffffff', 0.6);
  ctx.fillRect(x - 1, y - 1, 1, 1);
  // Where a waiting ball will go.
  if (b.stuck >= 0) {
    const rel = Math.max(-1, Math.min(1, b.offset / w.pw));
    if (Math.abs(rel) < 0.15) return;
    const a = rel * 1.05, dy = w.paddles[b.stuck] < FH / 2 ? 1 : -1;
    ctx.fillStyle = mix(color, '#000000', 0.4);
    for (let k = 2; k < 6; k++) if ((k + (frame >> 3)) % 2) ctx.fillRect(Math.round(x + Math.sin(a) * k * 5), Math.round(y + Math.cos(a) * k * 5 * dy), 1, 1);
  }
}

function drawFrame(ctx: Ctx, w: World) {
  ctx.fillStyle = FRAME;
  ctx.fillRect(BX - 4, BY - (w.twin ? 0 : 4), 4, FH + (w.twin ? 0 : 4));
  ctx.fillRect(BX + FW, BY - (w.twin ? 0 : 4), 4, FH + (w.twin ? 0 : 4));
  ctx.fillStyle = LIGHT;
  ctx.fillRect(BX - 2, BY - (w.twin ? 0 : 2), 1, FH + (w.twin ? 0 : 2));
  ctx.fillRect(BX + FW + 1, BY - (w.twin ? 0 : 2), 1, FH + (w.twin ? 0 : 2));
  if (!w.twin) {
    ctx.fillStyle = FRAME;
    ctx.fillRect(BX - 4, BY - 4, FW + 8, 4);
    ctx.fillStyle = LIGHT;
    ctx.fillRect(BX - 2, BY - 2, FW + 4, 1);
  }
  // Rivets along the frame.
  ctx.fillStyle = DARK;
  for (let y = BY + 4; y < BY + FH; y += 16) {
    ctx.fillRect(BX - 3, y, 1, 1);
    ctx.fillRect(BX + FW + 2, y, 1, 1);
  }
}

export function drawBoard(ctx: Ctx, w: World, frame: number) {
  drawFrame(ctx, w);
  ctx.save();
  ctx.beginPath();
  ctx.rect(BX, BY, FW, FH);
  ctx.clip();
  for (const k of w.bricks) if (k.alive) drawBrick(ctx, w, k, frame);
  const playing = w.state === 'play';
  if (playing || (w.state === 'cleared' && w.stateTimer < 30)) for (const y of w.paddles) drawPaddle(ctx, w, y, frame);
  if (playing) for (const b of w.balls) drawBall(ctx, w, b, frame);
  for (const p of w.particles) {
    ctx.fillStyle = PAINT[p.color];
    ctx.fillRect(Math.round(BX + p.x), Math.round(BY + p.y), p.size, p.size);
  }
  ctx.restore();
  for (const p of w.popups) {
    if (p.life < 15 && (frame >> 1) % 2) continue;
    const tw = textWidth(p.text);
    const x = Math.max(BX + 2, Math.min(BX + FW - tw - 2, Math.round(BX + p.x - tw / 2)));
    const y = Math.max(BY + 2, Math.round(BY + p.y - 10));
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, tw + 2, 9);
    drawText(ctx, p.text, x, y, p.color);
  }
}

// ---------- in play ----------

export function render(ctx: Ctx, game: Game, frame: number) {
  ctx.save();
  const shake = game.world?.shake ?? 0;
  if (shake > 0 && game.phase === 'play') ctx.translate(frame % 2 ? 1 : -1, Math.min(2, shake >> 2) * (frame % 4 < 2 ? 1 : -1));
  switch (game.phase) {
    case 'title':
      renderTitle(ctx, game, frame);
      break;
    case 'entry':
    case 'scores':
      renderScores(ctx, game, frame);
      break;
    case 'help':
      renderHelp(ctx, game, frame);
      break;
    default:
      renderPlay(ctx, game, frame);
  }
  ctx.restore();
}

/** Text on a black strip, in the open space under the wall. */
function banner(ctx: Ctx, w: World, lines: [string, string][]) {
  const y0 = BY + (w.twin ? w.paddles[0] - 34 : 128);
  lines.forEach(([text, color], i) => {
    const y = y0 + i * 11;
    ctx.fillStyle = '#000';
    ctx.fillRect(BX + FW / 2 - textWidth(text) / 2 - 3, y - 2, textWidth(text) + 6, 11);
    drawTextCentered(ctx, text, BX + FW / 2, y, color);
  });
}

function renderPlay(ctx: Ctx, game: Game, frame: number) {
  const w = game.world!;
  ctx.fillStyle = '#000';
  ctx.fillRect(-2, -2, W + 4, H + 4);
  drawBoard(ctx, w, frame);
  drawHud(ctx, game, w, frame);

  if (game.phase === 'intro') drawIntro(ctx, game, w);
  else if (game.phase === 'play' && game.paused) drawPause(ctx, game, w);
  else if (game.phase === 'play' && w.state === 'play' && !w.launched)
    banner(ctx, w, (frame >> 5) % 2 ? [['READY!', YELLOW], ['SPACE LAUNCHES', LIGHT]] : [['READY!', YELLOW]]);
  if (game.phase === 'curtain' || game.phase === 'over') drawCurtain(ctx, game, w, frame);
}

/** A lives icon: a tiny paddle. */
function drawLife(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = LIGHT;
  ctx.fillRect(x + 2, y, 4, 3);
  ctx.fillStyle = '#d82800';
  ctx.fillRect(x, y, 2, 3);
  ctx.fillRect(x + 6, y, 2, 3);
}

function drawHud(ctx: Ctx, game: Game, w: World, frame: number) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, 23);
  drawText(ctx, 'SC', 4, 3, GREY);
  drawText(ctx, pad(game.score, 7), 18, 3);
  const best = Math.max(game.best()?.score ?? 0, game.score);
  drawText(ctx, 'HI', 98, 3, GREY);
  drawText(ctx, pad(best, 7), 112, 3, LIGHT);

  const value = pad(w.opt.level, 2);
  drawText(ctx, 'LV', 252 - textWidth(`LV ${value}`), 3, GREY);
  drawText(ctx, value, 252 - textWidth(value), 3);
  const lives = Math.max(0, game.lives - (w.state === 'dead' ? 1 : 0));
  if (lives > 4) {
    drawLife(ctx, 220, 15);
    drawText(ctx, `X${lives}`, 232, 13);
  } else for (let i = 0; i < lives; i++) drawLife(ctx, 244 - i * 10, 15);

  if (w.paint) {
    // The pocket: what the last mix made, waiting for Space.
    drawText(ctx, 'POCKET', 4, 13, GREY);
    if (w.pocket) {
      const c = PAINT[POWER_COLOR[w.pocket]];
      drawText(ctx, POWER_NAMES[w.pocket], 44, 13, c);
      if ((frame >> 4) % 2 === 0) drawText(ctx, 'SPACE', 44 + textWidth(POWER_NAMES[w.pocket]) + 6, 13, YELLOW);
    } else drawText(ctx, '-', 44, 13, DARK);
  } else {
    const left = String(w.bricksLeft);
    drawText(ctx, 'BRICKS', 4, 13, GREY);
    drawText(ctx, left, 44, 13, YELLOW);
  }

  // A power at work, running down.
  const active: [number, number, number][] = [];
  if (w.fire > 0) active.push([w.fire, w.fireTotal, O_]);
  if (w.magnet > 0) active.push([w.magnet, w.magnetTotal, P_]);
  active.forEach(([t, total, c], i) => {
    const x = 150, y = 14 + i * 4 - (active.length - 1) * 2, len = 50;
    const left = t / total;
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y, len, 3);
    ctx.fillStyle = left < 0.25 && (frame >> 2) % 2 ? WHITE : PAINT[c];
    ctx.fillRect(x, y, Math.ceil(len * left), 3);
  });
}

const GOALS: Record<string, string[]> = {
  arcade: ['BREAK THE WALL', 'MIX COLOURS - SPACE USES THEM'],
  classic: ['BREAK THE WALL', 'ONE BALL. NO HELP.'],
  twin: ['BREAK THE WALL', 'GUARD BOTH ENDS'],
};

function drawIntro(ctx: Ctx, game: Game, w: World) {
  const goals = GOALS[game.mode.id];
  const h = 70 + goals.length * 10;
  const y0 = BY + Math.round((FH - h) / 2);
  drawBox(ctx, 28, y0, 200, h);
  drawTextCentered(ctx, `${game.mode.name} - LEVEL ${w.opt.level}`, 128, y0 + 10, GREY);
  drawTextCentered(ctx, w.opt.wall.name, 128, y0 + 22, YELLOW);
  goals.forEach((t, i) => drawTextCentered(ctx, t, 128, y0 + 38 + i * 10, i ? LIGHT : WHITE));
  // A bar that runs down until play starts.
  const left = 1 - Math.min(1, game.timer / INTRO_FRAMES);
  ctx.fillStyle = DARK;
  ctx.fillRect(56, y0 + h - 14, 144, 3);
  ctx.fillStyle = PAINT[B_];
  ctx.fillRect(56, y0 + h - 14, Math.round(144 * left), 3);
}

function drawPause(ctx: Ctx, game: Game, w: World) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 23, W, H - 23);
  drawBox(ctx, 52, 72, 152, 80);
  drawTextCentered(ctx, 'PAUSED', 128, 82, YELLOW);
  drawTextCentered(ctx, `${game.mode.name} - ${w.opt.wall.name}`, 128, 96);
  drawTextCentered(ctx, `LIVES ${game.lives}   BRICKS ${w.bricksLeft}`, 128, 108, GREY);
  drawTextCentered(ctx, 'ENTER RESUME', 128, 124, LIGHT);
  drawTextCentered(ctx, 'BKSP QUIT', 128, 136, GREY);
}

const CURTAIN = [R_, O_, Y_, G_, B_, P_];

function drawCurtain(ctx: Ctx, game: Game, w: World, frame: number) {
  // A wall of bricks goes up, row by row.
  const rows = Math.min(34, game.curtainRow * 1.3);
  for (let r = 0; r < rows; r++) {
    const y = 23 + r * 6;
    const c = CURTAIN[Math.floor(r / 2) % CURTAIN.length];
    for (let x = -(r % 2) * 8; x < W; x += 16) {
      ctx.fillStyle = PAINT[c];
      ctx.fillRect(x, y, 15, 5);
      ctx.fillStyle = LIGHTER[c];
      ctx.fillRect(x, y, 15, 1);
      ctx.fillStyle = DARKER[c];
      ctx.fillRect(x + 1, y + 4, 14, 1);
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y + 5, W, 1);
  }
  if (game.phase !== 'over') return;
  drawBox(ctx, 52, 64, 152, 96);
  drawTextCentered(ctx, 'GAME OVER', 128, 74, RED);
  const stats: [string, string][] = [
    ['SCORE', String(game.score)],
    ['LEVEL', String(game.level)],
  ];
  if (w.paint) stats.push(['MIXES', String(game.mixes)]);
  stats.forEach(([k, v], i) => {
    drawText(ctx, k, 66, 92 + i * 12, GREY);
    drawText(ctx, v, 190 - textWidth(v), 92 + i * 12);
  });
  if (game.timer > 30 && (frame >> 5) % 2 === 0) drawTextCentered(ctx, 'PRESS ENTER', 128, 144, LIGHT);
}

// ---------- title ----------

const LOGO = [
  ['###', '#.#', '##.', '#.#', '#.#'],
  ['###', '#..', '###', '#..', '###'],
  ['##.', '#.#', '##.', '#.#', '##.'],
  ['###', '#.#', '#.#', '#.#', '###'],
  ['#.#', '#.#', '#.#', '#.#', '###'],
  ['#..#', '##.#', '#.##', '#..#', '#..#'],
  ['##.', '#.#', '#.#', '#.#', '##.'],
];
const LOGO_COLORS = [R_, O_, Y_, G_, B_, P_, W_];
const LOGO_W = 7;
const LOGO_H = 5;
const LOGO_COLS = LOGO.reduce((n, l) => n + l[0].length + 1, -1);
const LOGO_X = Math.round((W - LOGO_COLS * LOGO_W) / 2);

/** Under the logo a ball hops along a row of bricks and takes each colour it lands on. */
function drawHopper(ctx: Ctx, frame: number, y: number) {
  const x0 = 36, len = 184, hop = 23;
  const seq = [R_, Y_, B_, R_, O_, B_, Y_, G_, P_];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y - 12, len, 18);
  ctx.clip();
  for (let i = 0; i * hop < len; i++) {
    const c = seq[i % seq.length];
    const bx = x0 + i * hop + 4;
    ctx.fillStyle = PAINT[c];
    ctx.fillRect(bx, y, 15, 3);
    ctx.fillStyle = LIGHTER[c];
    ctx.fillRect(bx, y, 15, 1);
  }
  const t = (frame * 0.8) % len;
  const i = Math.floor(t / hop);
  const phase = (t % hop) / hop;
  const bx = x0 + t + 11.5;
  const by = y - 3 - Math.sin(phase * Math.PI) * 9;
  const color = PAINT[seq[i % seq.length]];
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 1, 4, 2);
  ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 2, 4);
  ctx.restore();
}

/** The demo wall behind a menu, dimmed. */
function backdrop(ctx: Ctx, game: Game, frame: number) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  drawBoard(ctx, game.titleWorld(), frame);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
}

function renderTitle(ctx: Ctx, game: Game, frame: number) {
  const s = game.settings;
  backdrop(ctx, game, frame);

  drawBox(ctx, 24, 6, 208, 56);
  let col = 0;
  LOGO.forEach((letter, li) => {
    const c = LOGO_COLORS[li];
    letter.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== '#') return;
        const px = LOGO_X + (col + x) * LOGO_W, py = 13 + y * LOGO_H;
        // A shine runs across the letters.
        const wave = (col + x + y - (frame >> 2) + 4000) % 46 < 2;
        ctx.fillStyle = wave ? WHITE : PAINT[c];
        ctx.fillRect(px, py, LOGO_W - 1, LOGO_H - 1);
        ctx.fillStyle = wave ? WHITE : LIGHTER[c];
        ctx.fillRect(px, py, LOGO_W - 1, 1);
        ctx.fillStyle = wave ? LIGHT : DARKER[c];
        ctx.fillRect(px + 1, py + LOGO_H - 2, LOGO_W - 2, 1);
      }),
    );
    col += letter[0].length + 1;
  });
  drawHopper(ctx, frame, 50);

  drawBox(ctx, 16, 68, 224, 76);
  const mode = game.mode;
  const values: Record<(typeof MENU)[number], string> = {
    MODE: mode.name,
    SPEED: `${s.speed + 1} ${SPEED_NAMES[s.speed]} X${SPEED_POINTS[s.speed]}`,
    SEED: mode.usesSeed ? (s.daily ? 'DAILY' : 'RANDOM') : '--',
    MUSIC: MUSIC_NAMES[s.music],
    HELP: 'HOW TO PLAY',
  };
  MENU.forEach((row, i) => {
    const y = 77 + i * 12;
    const on = i === game.menuRow;
    const enabled = game.rowEnabled(row);
    if (on) drawText(ctx, '>', 26, y, YELLOW);
    drawText(ctx, row, 36, y, on ? YELLOW : enabled ? WHITE : '#585858');
    const v = values[row];
    drawText(ctx, v, 90, y, !enabled ? '#585858' : on ? WHITE : LIGHT);
    if (on && enabled && row !== 'HELP') {
      drawText(ctx, '<', 82, y, GREY);
      drawText(ctx, '>', 92 + textWidth(v), y, GREY);
    }
  });

  drawBox(ctx, 8, 150, 240, 70);
  drawTextCentered(ctx, mode.blurb, 128, 159, YELLOW);
  const best = game.best();
  drawTextCentered(ctx, best ? `TOP ${pad(best.score, 7)} ${best.name}` : 'NO RECORD YET', 128, 173, RED);
  if ((frame >> 5) % 2 === 0) drawTextCentered(ctx, 'ENTER START   H SCORES   M MUSIC', 128, 189);
  drawTextCentered(ctx, mode.paint ? 'ARROWS MOVE   SPACE LAUNCH AND USE' : 'ARROWS MOVE   SPACE LAUNCH', 128, 203, GREY);
}

// ---------- high scores ----------

function renderScores(ctx: Ctx, game: Game, frame: number) {
  const entering = game.phase === 'entry';
  const mode = MODES[game.scoresView];
  backdrop(ctx, game, frame);

  drawBox(ctx, 24, 12, 208, 176);
  // The name is typed into your own table; afterwards the world table shows by default.
  const world = game.scoresGlobal && !entering;
  const title = entering ? 'NEW RECORD!' : world ? 'WORLD SCORES' : GLOBAL_URL ? 'LOCAL SCORES' : 'HIGH SCORES';
  drawTextCentered(ctx, title, 128, 20, entering ? YELLOW : WHITE);
  drawTextCentered(ctx, entering ? mode.name : `< ${mode.name} >`, 128, 32, LIGHT);
  const cols: [string, number][] = [['NAME', 50], ['SCORE', 94], ['LV', 146], [mode.paint ? 'MX' : '', 170], ['S', 200]];
  for (const [label, x] of cols) drawText(ctx, label, x, 44, GREY);
  ctx.fillStyle = '#585858';
  ctx.fillRect(34, 53, 188, 1);

  const blink = (frame >> 4) % 2 === 0;
  if (world && !game.global) {
    drawTextCentered(ctx, game.globalState === 'loading' ? 'LOADING...' : 'OFFLINE', 128, 110, game.globalState === 'loading' ? LIGHT : RED);
  }
  const list = world ? (game.global?.[mode.id] ?? []) : game.tables[mode.id];
  const myRow = world ? game.globalRank : game.entryRank;
  for (let i = 0; i < MAX_SCORES && (!world || game.global); i++) {
    const y = 58 + i * 12;
    const e = list[i];
    const mine = i === myRow && game.scoresView === game.settings.mode;
    const color = mine ? (entering || blink ? YELLOW : WHITE) : i < 3 ? WHITE : LIGHT;
    const n = String(i + 1);
    drawText(ctx, n, 45 - textWidth(n), y, mine ? color : GREY);
    if (!e) {
      drawText(ctx, '------', 50, y, DARK);
      continue;
    }
    if (mine && entering) {
      drawText(ctx, game.entryName.join(''), 50, y, color);
      if (blink) {
        ctx.fillStyle = WHITE;
        ctx.fillRect(50 + game.entryCursor * 6, y + 8, 5, 1);
      }
    } else drawText(ctx, e.name.slice(0, NAME_LEN), 50, y, color);
    drawText(ctx, pad(e.score, 7), 94, y, color);
    drawText(ctx, pad(e.level, 2), 146, y, color);
    if (mode.paint) drawText(ctx, pad(e.mixes, 3), 170, y, color);
    drawText(ctx, String(e.speed), 200, y, GREY);
  }

  drawBox(ctx, 24, 194, 208, 24);
  if (entering) drawTextCentered(ctx, 'TYPE NAME  THEN ENTER', 128, 202);
  else if (GLOBAL_URL) drawTextCentered(ctx, `< > MODE   UP ${world ? 'LOCAL' : 'WORLD'}   ENTER`, 128, 202, blink ? WHITE : LIGHT);
  else drawTextCentered(ctx, '< > MODE   ENTER BACK', 128, 202, blink ? WHITE : LIGHT);
}

// ---------- help ----------

function renderHelp(ctx: Ctx, game: Game, frame: number) {
  const page = HELP_PAGES[game.helpPage];
  backdrop(ctx, game, frame);
  drawBox(ctx, 16, 8, 224, 182);
  drawTextCentered(ctx, `< ${page.title} >`, 128, 16, YELLOW);
  ctx.fillStyle = '#585858';
  ctx.fillRect(26, 27, 204, 1);
  wrapText(page.text, 34).forEach((line, i) => drawText(ctx, line, 26, 34 + i * 10));
  drawBox(ctx, 16, 194, 224, 24);
  const blink = (frame >> 4) % 2 === 0;
  drawTextCentered(ctx, `< > PAGE ${game.helpPage + 1}/${HELP_PAGES.length}    ENTER BACK`, 128, 202, blink ? WHITE : LIGHT);
}
