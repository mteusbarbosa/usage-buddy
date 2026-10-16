import type { Activity } from '../types'
import { CLAWD_FRAMES, CLAWD_WINDOW } from './clawd-sprites'

const P = 2
// Most frames leave the top rows empty; only thinking/planning reach above this, and lose that part.
const CROP_TOP = 8
const VISIBLE_HEIGHT = CLAWD_WINDOW.height - CROP_TOP

export const MASCOT_WIDTH = CLAWD_WINDOW.width * P
export const MASCOT_HEIGHT = VISIBLE_HEIGHT * P

// The frames toggle with SMIL, which only plays when the Svg is drawn with `isInteractive`.
export const mascotSvg = (activity: Activity, title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${MASCOT_WIDTH}" height="${MASCOT_HEIGHT}" viewBox="0 ${CROP_TOP} ${CLAWD_WINDOW.width} ${VISIBLE_HEIGHT}" shape-rendering="crispEdges"><title>${title}</title>${CLAWD_FRAMES[activity]}</svg>`

export const ACTIVITY_LABELS: Record<Activity, string> = {
  idle: 'hanging out',
  thinking: 'thinking',
  building: 'building',
  exploring: 'exploring',
  running: 'running commands',
  done: 'done!',
  greeting: 'hi there!',
  planning: 'planning',
  oops: 'oops, that failed',
  disappointed: 'that did not go well',
  party: 'big one done!',
  resting: 'resting',
  dizzy: 'dizzy from all that usage',
}
