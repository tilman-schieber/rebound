export type ModeId = 'arcade' | 'classic' | 'twin';

export interface Mode {
  id: ModeId;
  name: string;
  /** Lives at the start. */
  lives: number;
  /** Walls can use the daily seed. */
  usesSeed: boolean;
  /** The ball takes the colour of what it hits, and colours mix into power-ups. */
  paint: boolean;
  /** A second paddle at the top, the wall in the middle. */
  twin: boolean;
  /** One line for the title screen. */
  blurb: string;
}

export const MODES: Mode[] = [
  { id: 'arcade', name: 'ARCADE', lives: 3, usesSeed: true, paint: true, twin: false, blurb: 'PAINT THE BALL. MIX THE COLOURS.' },
  { id: 'classic', name: 'CLASSIC', lives: 3, usesSeed: false, paint: false, twin: false, blurb: 'EIGHT ROWS. ONE BALL. NOTHING ELSE.' },
  { id: 'twin', name: 'TWIN', lives: 3, usesSeed: true, paint: true, twin: true, blurb: 'TWO PADDLES. NO CEILING.' },
];

/** Ball speed in pixels per frame, for SPEED 1-5. */
export const SPEEDS = [1.5, 1.8, 2.1, 2.45, 2.8];
/** Score multiplier for each speed: faster is riskier, so it pays more. */
export const SPEED_POINTS = [0.5, 0.75, 1, 1.5, 2];
export const SPEED_NAMES = ['CALM', 'EASY', 'NORMAL', 'FAST', 'FRANTIC'];
