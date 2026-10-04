// The walls: pixel pictures made of bricks, and the eight rows of CLASSIC.
import type { Mode } from './modes';
import type { Rng } from './rng';

/** Brick colours are sets of primaries: red 1, yellow 2, blue 4. White is none, a mix is two. */
export const WHITE = 0;
export const RED = 1;
export const YELLOW = 2;
export const ORANGE = 3;
export const BLUE = 4;
export const PURPLE = 5;
export const GREEN = 6;
/** Steel only breaks for a mixed colour. */
export const STEEL = 7;

export const COLS = 28;
export const ROWS = 14;

export const isPrimary = (c: number) => c === RED || c === YELLOW || c === BLUE;
export const isMix = (c: number) => c === ORANGE || c === PURPLE || c === GREEN;

const CODES: Record<string, number> = { w: WHITE, r: RED, y: YELLOW, o: ORANGE, b: BLUE, p: PURPLE, g: GREEN, s: STEEL };

export interface Picture {
  name: string;
  /** Up to ROWS rows of up to COLS bricks; '.' is a gap. */
  rows: string[];
}

export interface BrickPlan {
  col: number;
  row: number;
  /** Width in columns. */
  w: number;
  color: number;
  /** CLASSIC pays by row instead of by colour. */
  points?: number;
}

export interface Wall {
  name: string;
  bricks: BrickPlan[];
  rows: number;
}

// prettier-ignore
export const PICTURES: Picture[] = [
  {
    name: 'GHOSTS',
    rows: [
      '..rrr......yyy......bbb..',
      '.rrrrr....yyyyy....bbbbb.',
      'rwwrwwr..ywwywwy..bwwbwwb',
      'rwbrwbr..ywbywby..bwpbwpb',
      'rrrrrrr..yyyyyyy..bbbbbbb',
      'rrrrrrr..yyyyyyy..bbbbbbb',
      'rr.r.rr..yy.y.yy..bb.b.bb',
      '',
      'w.w.w.w.w.w.w.w.w.w.w.w.w',
    ],
  },
  {
    name: 'MUSHROOM',
    rows: [
      '.....rrrrrrr.....',
      '...rrrwwwrrrrr...',
      '..rrrwwwwwrrwwr..',
      '.rrrrwwwwwrwwwwr.',
      '.rwwrrwwwrrrwwrr.',
      'rwwwwrrrrrrrrrrrr',
      'rwwwwrrrrrwwwrrrr',
      'rrwwrrrrrwwwwwrrr',
      '.rrrrrrrrrwwwrrr.',
      '....wwwwwwwww....',
      '...wwwbwwwbwww...',
      '...wwwbwwwbwww...',
      '...wwwwwwwwwww...',
      '....wwwwwwwww....',
    ],
  },
  {
    name: 'INVADERS',
    rows: [
      '..g.....g........p.....p..',
      '...g...g..........p...p...',
      '..ggggggg........ppppppp..',
      '.gg.ggg.gg......pp.ppp.pp.',
      'ggggggggggg....ppppppppppp',
      'g.ggggggg.g....p.ppppppp.p',
      'g.g.....g.g....p.p.....p.p',
      '...gg.gg..........pp.pp...',
      '',
      '',
      ' .sss...sss...sss...sss.  ',
      ' sssss.sssss.sssss.sssss  ',
      ' s...s.s...s.s...s.s...s  ',
    ],
  },
  {
    name: 'HEART',
    rows: [
      '..ppp.....ppp..',
      '.prrrp...prrrp.',
      'prwwrrp.prrrrrp',
      'prwrrrrprrrrrrp',
      'prrrrrrrrrrrrrp',
      'prrrrrrrrrrrrrp',
      '.prrrrrrrrrrrp.',
      '..prrrrrrrrrp..',
      '...prrrrrrrp...',
      '....prrrrrp....',
      '.....prrrp.....',
      '......prp......',
      '.......p.......',
    ],
  },
  {
    name: 'RAINBOW',
    rows: [
      '........rrrrrrrrrr........',
      '.....rrrooooooooooorrr....',
      '...rrooooyyyyyyyyyooorr...',
      '..rooyyyyggggggggggyyoor..',
      '.rooyygggbbbbbbbbbbgggyoor',
      '.royggbbbppppppppppbbbgyor',
      'roygbbpp..........ppbbgyor',
      'roygbpp............ppbgyor',
      'roygbp..............pbgyor',
      'wwwwwww............wwwwwww',
      '.wwwww..............wwwww.',
    ],
  },
  {
    name: 'SNACKMAN',
    rows: [
      '.....yyyyyy.........',
      '...yyyyyyyyyy.......',
      '..yyyyyyyyyyyy......',
      '.yyyyyyyybbyyy......',
      '.yyyyyyyybbyy.......',
      'yyyyyyyyyyy.........',
      'yyyyyyyyy....w..w..w',
      'yyyyyyyyy....w..w..w',
      'yyyyyyyyyyy.........',
      '.yyyyyyyyyyyy.......',
      '.yyyyyyyyyyyyy......',
      '..yyyyyyyyyyyy......',
      '...yyyyyyyyyy.......',
      '.....yyyyyy.........',
    ],
  },
  {
    name: 'ROCKET',
    rows: [
      '.........w.........',
      '........www........',
      '.......wwrww.......',
      '.......wwwww.......',
      '......wwbbbww......',
      '......wbbwbbw......',
      '......wbbbbbw......',
      '......wwbbbww......',
      '.....rwwwwwwwr.....',
      '....rrwwwwwwwrr....',
      '...rrrwwrrrwwrrr...',
      '...rr.wwwwwww.rr...',
      '.......yoyoy.......',
      '........oyo........',
    ],
  },
  {
    name: 'FLOWER',
    rows: [
      '.....ppp.....',
      '...ppppppp...',
      '.ppp.ppp.ppp.',
      'ppppppyppppp.',
      'pppppyyyppppp',
      '.ppppyyypppp.',
      'ppppppyppppp.',
      '.ppp.ppp.ppp.',
      '...ppppppp...',
      '.....ppp.....',
      '......g..gg..',
      '.gg...g.ggg..',
      '..ggg.ggg....',
      '....ggg......',
    ],
  },
  {
    name: 'WATERMELON',
    rows: [
      'gggggggggggggggggggggggg',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      '.rrrrrrrrrrrrrrrrrrrrrr.',
      '.rrrr.rrrrr.rrrrr.rrrrr.',
      '..rrrrrrrrrrrrrrrrrrrr..',
      '...rrrrr.rrrrrr.rrrrr...',
      '....rrrrrrrrrrrrrrrr....',
      '.....rrrrr.rrrr.rrr.....',
      '.......rrrrrrrrrr.......',
      '.........rrrrrr.........',
    ],
  },
  {
    name: 'FISH',
    rows: [
      '.......ooooo..........',
      '.....ooooooooo.....oo.',
      '...ooowoooooyoo...ooo.',
      '..oowbwoooooyooo.oooo.',
      '.ooowwooooooyoooooooo.',
      'ooooooooooooyooooooo..',
      '.oooooooooooyoooooooo.',
      '..oooooooooyooooo.ooo.',
      '....oooooooooo.....oo.',
      '......ooooooo.........',
      '',
      '..b.....bb.......b....',
      'bbbbbbbbbbbbbbbbbbbbbb',
      '.bbbbbbbbbbbbbbbbbbbb.',
    ],
  },
  {
    name: 'CASTLE',
    rows: [
      '..r.........r.........r..',
      '..rr........rr........rr.',
      '..s.........s.........s..',
      '.sss.......sss.......sss.',
      's.s.s.....s.s.s.....s.s.s',
      'sssss.....sssss.....sssss',
      'sssssyyyyysssssyyyyysssss',
      'ssbsyyyyyyysbsyyyyyyysbss',
      'sssyyyyyyyysssyyyyyyyysss',
      'sssyyyyyyyyyyyyyyyyyyysss',
      'sssyyyyyyy.....yyyyyyysss',
      'sssyyyyyy.......yyyyyysss',
      'sssyyyyyy.......yyyyyysss',
    ],
  },
  {
    name: 'SUN',
    rows: [
      '.......o...o...o......',
      '........o..o..o.......',
      '...o.....yyyyy.....o..',
      '....o..yyyyyyyyy..o...',
      '......yyyyyyyyyyy.....',
      '.....yyybyyyyybyyy....',
      'oo...yyyyyyyyyyyyy..oo',
      '.....yyyryyyyyryyy....',
      '......yyyrrrrryyy.....',
      '....o..yyyyyyyyy..o...',
      '...o.....yyyyy.....o..',
      '........o..o..o.......',
      '.......o...o...o......',
    ],
  },
  {
    name: 'GEM',
    rows: [
      '....wwwwwwwwwwwww....',
      '...wbbbbwbbbbbwbbw...',
      '..wbbbbwbbbbbbbwbbw..',
      '.wbbbbwbbbbbbbbbwbbw.',
      'wwwwwwwwwwwwwwwwwwwww',
      '.pbbbbpbbbbbbbbbpbbp.',
      '..pbbbbpbbbbbbbpbbp..',
      '...pbbbbpbbbbbpbbp...',
      '....pbbbbpbbbpbbp....',
      '.....pbbbbpbpbbp.....',
      '......pbbbbpbbp......',
      '.......pbbbbbp.......',
      '........pbbbp........',
      '.........ppp.........',
    ],
  },
  {
    name: 'TREE',
    rows: [
      '..........gg..........',
      '........gggggg........',
      '......gggggrgggg......',
      '.....ggrgggggggggg....',
      '....ggggggggggrgggg...',
      '...gggggrgggggggggggg.',
      '..ggggggggggggrggggggg',
      '...ggggrggggggggggrgg.',
      '.....gggggggggggggg...',
      '.......gggggggggg.....',
      '..........oooo........',
      '..........oooo........',
      '.........oooooo.......',
      'yyyyyyyyyyyyyyyyyyyyyy',
    ],
  },
  {
    name: 'DUCK',
    rows: [
      '......yyyy..............',
      '....yyyyyyy.............',
      '....yyybyyy.............',
      '..ooyyyyyyy.............',
      '.oooyyyyyy..............',
      '.....yyyyy..........yy..',
      '....yyyyyyyyyyyyyyyyyy..',
      '...yyyyyyyyyyyyyyyyyyy..',
      '...yyyyyyywwwwwyyyyyy...',
      '...yyyyyyyywwwyyyyyyy...',
      '....yyyyyyyyyyyyyyyy....',
      '..bb.bbbbbbbbbbbbbbb.bb.',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      '.bbbb.bbbbbbbbbbb.bbbb..',
    ],
  },
];

/** The bricks of a picture, centred. `swap` recolours the primaries (and so the mixes). */
function fromPicture(p: Picture, mirror: boolean, swap: number[], steel: (c: number) => boolean): Wall {
  const width = Math.max(...p.rows.map((r) => r.length));
  const left = Math.floor((COLS - width) / 2);
  const bricks: BrickPlan[] = [];
  p.rows.forEach((line, row) => {
    const padded = line.padEnd(width, '.');
    for (let i = 0; i < width; i++) {
      const ch = padded[mirror ? width - 1 - i : i];
      if (!(ch in CODES)) continue;
      let color = CODES[ch];
      if (color !== STEEL) color = (color & RED ? swap[0] : 0) | (color & YELLOW ? swap[1] : 0) | (color & BLUE ? swap[2] : 0);
      if (color === WHITE && steel(row * COLS + i)) color = STEEL;
      bricks.push({ col: left + i, row, w: 1, color });
    }
  });
  return { name: p.name, bricks, rows: p.rows.length };
}

/** Breakout as it was: two rows each of red, orange, green and yellow, two columns to a brick. */
function classicWall(): Wall {
  const rows = [RED, RED, ORANGE, ORANGE, GREEN, GREEN, YELLOW, YELLOW];
  const bricks: BrickPlan[] = [];
  rows.forEach((color, row) => {
    for (let col = 0; col < COLS; col += 2) bricks.push({ col, row: row + 2, w: 2, color, points: [70, 50, 30, 10][row >> 1] });
  });
  return { name: 'THE WALL', bricks, rows: 10 };
}

/** The first picture is always the same; the rest come in an order of their own for every run. */
export function wallFor(mode: Mode, level: number, rng: Rng, runRng: Rng): Wall {
  if (!mode.paint) return classicWall();
  const order = PICTURES.slice(1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(runRng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.unshift(PICTURES[0]);
  const lap = Math.floor((level - 1) / order.length);
  const pic = order[(level - 1) % order.length];
  // Once round the pictures they come back in other colours, with steel among the white.
  const swap = [RED, YELLOW, BLUE];
  if (lap > 0)
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [swap[i], swap[j]] = [swap[j], swap[i]];
    }
  const steelChance = Math.min(0.5, lap * 0.2 + (level > 3 ? 0.08 : 0));
  return fromPicture(pic, rng() < 0.5, swap, () => rng() < steelChance);
}
