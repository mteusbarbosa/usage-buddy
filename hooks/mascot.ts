import type { Activity } from '../types'
import { CLAWD_FRAMES, CLAWD_WINDOW } from './clawd-sprites'

// One CSS pixel per sprite pixel keeps the mascot about one text line tall, so the band stays thin.
const P = 1

export const MASCOT_WIDTH = CLAWD_WINDOW.width * P
export const MASCOT_HEIGHT = CLAWD_WINDOW.height * P

// The frames toggle with SMIL, which only plays when the Svg is drawn with `isInteractive`.
export const mascotSvg = (activity: Activity, title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${MASCOT_WIDTH}" height="${MASCOT_HEIGHT}" viewBox="0 0 ${CLAWD_WINDOW.width} ${CLAWD_WINDOW.height}" shape-rendering="crispEdges"><title>${title}</title>${CLAWD_FRAMES[activity]}</svg>`

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
