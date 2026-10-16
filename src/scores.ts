// High scores, one table per mode, in this browser and worldwide (a Val Town val:
// tilmanschieber/rebound-scores). The tables themselves are arcade-kit's.
import { createScores } from 'arcade-kit/scores';
import { MODES, ModeId } from './modes';

export { load, save } from 'arcade-kit/storage';

export interface ScoreEntry {
  name: string;
  score: number;
  /** Level reached. */
  level: number;
  /** Colours mixed into power-ups. */
  mixes: number;
  speed: number;
}

export type Tables = Record<ModeId, ScoreEntry[]>;

/** Empty switches the world tables off: scores then stay in the browser only. */
export const GLOBAL_URL = 'https://tilmanschieber--01a107c10e6c7512914391d20a4946d1.web.val.run';

export const { MAX_SCORES, loadTables, saveTables, rankFor, fetchGlobal, submitGlobal, flushPending } = createScores<
  ModeId,
  ScoreEntry
>({
  game: 'rebound',
  tables: MODES.map((m) => m.id),
  url: GLOBAL_URL,
  normalize: (e) => ({
    name: e.name,
    score: e.score,
    level: Number(e.level) || 0,
    mixes: Number(e.mixes) || 0,
    speed: Number(e.speed) || 3,
  }),
});
