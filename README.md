# REBOUND

A brick-breaking arcade game in the style of the early eighties, built in TypeScript with no runtime dependencies. Runs entirely in the browser. A sibling of [Snackman](https://gh.tschieber.de/snackman/) and [Scales](https://github.com/tilman-schieber/scales): same screen, same font, same high score tables.

Break every brick, keep the ball off the floor. In ARCADE the ball takes the colour of what it hits, and two colours in a row mix into a power-up that waits in your pocket until you need it.

## Modes

| Mode | Goal |
| --- | --- |
| ARCADE | Every wall is a pixel picture. Paint the ball, mix the colours, cash in the power-ups. 3 lives, one more at 10000 points. |
| CLASSIC | Breakout as it was: eight rows, one ball, no paint. The ball speeds up after 4 and 12 hits and on reaching the orange and red rows; the paddle halves once you break through to the back wall. |
| TWIN | ARCADE with no ceiling: a paddle at the top and one at the bottom, moving together, and the wall in the middle. |

**Seed:** *Daily* gives everyone the same walls for the day.

## Paint

The ball takes the colour of the last brick it hit. A brick breaks at once if the ball's colour holds the brick's; any other colour cracks it first, and the second hit breaks it.

| Brick | Breaks at once for | Does to the ball |
| --- | --- | --- |
| White | anything | nothing |
| Red, yellow, blue | the same colour, or a mix that holds it | paints it, or mixes it |
| Orange, green, purple | the same colour | paints it |
| Steel | any mix | nothing; it doesn't have to go for the wall to fall |

Hit one primary after another and the ball mixes them. A mixed ball keeps its colour through both its parts and only loses it to the third primary.

| Mix | Power-up |
| --- | --- |
| Red + yellow = orange | **Fireball:** the ball burns through everything, steel too, without bouncing |
| Yellow + blue = green | **Multiball:** every ball in flight splits in three |
| Red + blue = purple | **Magnet:** the paddle catches balls; move to aim, Space to let go |

The pocket holds one power-up, and Space uses it. A mix made while the pocket is full pays points instead. Power-ups wear off sooner on later walls.

## Walls

Fifteen pictures of 8 by 6 pixel bricks, in `src/walls.ts`: ghosts, a mushroom, invaders over steel bunkers, Snackman himself and more. The first wall is always the ghosts; the rest come in an order of their own for every run, sometimes mirrored. From the fourth wall on, some white bricks turn to steel, and once you've been round them all they come back in other colours.

## Music

A chiptune loop over four chords. Every wall gets its own melody and key from its seed; instruments join in and the tempo rises as the wall comes down, and it breaks into a racing arpeggio while a power-up works. MUSIC in the menu turns it on or off, and M mutes it at any time.

## Controls

| Key | Action |
| --- | --- |
| Left / Right, A / D | Move (hold to speed up) |
| Space / Up / W | Launch the ball |
| Space / Shift / X | Use the pocket |
| Enter / Esc | Start / pause |
| Backspace | Quit to menu (while paused) |
| M | Music on/off |
| H | High scores (title screen) |

High scores: the top 10 per mode, kept in the browser's local storage. The world tables from Snackman are wired in but switched off until a score server exists: set `GLOBAL_URL` in `src/scores.ts` to turn them on.

## Development

```sh
npm install
npm run dev
npm run build
```
