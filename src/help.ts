// In-game help pages. Text uses only characters the pixel font has.

export interface HelpPage {
  title: string;
  /** Paragraphs, word-wrapped when drawn; '' adds a blank line. */
  text: string[];
}

export const HELP_PAGES: HelpPage[] = [
  {
    title: 'REBOUND',
    text: [
      'BREAK EVERY BRICK IN THE WALL. DO NOT LET THE BALL PAST THE PADDLE.',
      '',
      'WHERE THE BALL MEETS THE PADDLE SETS ITS ANGLE: THE ENDS SEND IT WIDE.',
      '',
      'EVERY WALL IS A PICTURE. YOU HAVE 3 LIVES, AND WIN ONE MORE AT 10000 POINTS.',
      '',
      'THE BALL SPEEDS UP AS THE RALLY GOES ON, AND EVERY WALL IS FASTER THAN THE LAST.',
    ],
  },
  {
    title: 'MODES',
    text: [
      'ARCADE: A NEW PICTURE EVERY LEVEL. THE BALL TAKES THE COLOUR OF WHAT IT HITS.',
      '',
      'CLASSIC: EIGHT ROWS, ONE BALL, NO PAINT. THE PADDLE HALVES WHEN YOU BREAK THROUGH.',
      '',
      'TWIN: ARCADE WITH A PADDLE AT EACH END AND THE WALL IN THE MIDDLE.',
      '',
      'SEED DAILY: THE SAME WALLS FOR EVERYONE, ALL DAY.',
    ],
  },
  {
    title: 'PAINT',
    text: [
      'THE BALL TAKES THE COLOUR OF THE LAST BRICK IT HIT.',
      '',
      'A BRICK OF THE BALL\'S OWN COLOUR BREAKS AT ONCE. ANY OTHER COLOUR CRACKS FIRST.',
      '',
      'WHITE BRICKS ALWAYS BREAK AND LEAVE THE COLOUR AS IT IS.',
      '',
      'STEEL ONLY BREAKS FOR A MIXED COLOUR. IT DOES NOT HAVE TO GO FOR THE WALL TO FALL.',
    ],
  },
  {
    title: 'MIXING',
    text: [
      'HIT ONE PRIMARY AFTER ANOTHER AND THE BALL MIXES THEM:',
      '',
      'RED + YELLOW = ORANGE',
      'YELLOW + BLUE = GREEN',
      'RED + BLUE = PURPLE',
      '',
      'A MIXED BALL BREAKS BOTH ITS PARTS AT ONCE, AND STEEL. IT KEEPS ITS COLOUR UNTIL IT HITS THE THIRD PRIMARY.',
      '',
      'EVERY MIX PUTS A POWER-UP IN YOUR POCKET.',
    ],
  },
  {
    title: 'POWER-UPS',
    text: [
      'THE POCKET HOLDS ONE. PRESS SPACE TO USE IT. A MIX WITH THE POCKET FULL PAYS POINTS INSTEAD.',
      '',
      'ORANGE - FIREBALL: THE BALL BURNS THROUGH EVERYTHING, STEEL TOO.',
      '',
      'GREEN - MULTIBALL: EVERY BALL SPLITS IN THREE.',
      '',
      'PURPLE - MAGNET: THE PADDLE CATCHES THE BALL. MOVE TO AIM, SPACE TO LET GO.',
    ],
  },
  {
    title: 'SCORING',
    text: [
      'WHITE BRICK: 10',
      'RED, YELLOW, BLUE: 20',
      'ORANGE, GREEN, PURPLE: 30',
      'STEEL: 50',
      'MIX: 100, OR 300 WITH THE POCKET FULL',
      'WALL CLEARED: 1000',
      'CLASSIC: 10 TO 70 BY ROW',
      '',
      'A RUN OF BRICKS WITHOUT THE PADDLE PAYS DOUBLE AFTER 6, UP TO X4.',
      '',
      'SPEED: CALM X0.5 TO FRANTIC X2.',
    ],
  },
  {
    title: 'CONTROLS',
    text: [
      'LEFT RIGHT OR A D: MOVE',
      'SPACE OR UP: LAUNCH THE BALL',
      'SPACE, SHIFT OR X: USE THE POCKET',
      'ENTER OR ESC: PAUSE',
      'BACKSPACE: QUIT WHEN PAUSED',
      'M: MUSIC ON OR OFF',
      'H: HIGH SCORES - TITLE SCREEN',
      '',
      'HOLD A DIRECTION AND THE PADDLE PICKS UP SPEED. TAP FOR SMALL STEPS.',
      '',
      'GAMEPAD: STICK OR PAD MOVE, A LAUNCH OR USE THE POCKET, START PAUSE, SELECT QUIT.',
    ],
  },
];

/** Splits paragraphs into lines of at most `width` characters. */
export function wrapText(paragraphs: string[], width: number) {
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return lines;
}
