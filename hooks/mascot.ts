import type { Activity, Skin } from '../types'
import { CLAWD_WINDOW } from './clawd-sprites'
import { SKINS } from './skins'

// CSS pixels per sprite pixel. The mascot is what sets the band's height: 52px large, 39px medium, 26px small.
export const MASCOT_SCALES = { large: 2, medium: 1.5, small: 1 } as const
export type MascotSize = keyof typeof MASCOT_SCALES

export const mascotBox = (size: MascotSize) => ({
  width: Math.round(CLAWD_WINDOW.width * MASCOT_SCALES[size]),
  height: Math.round(CLAWD_WINDOW.height * MASCOT_SCALES[size]),
})

// The frames toggle with SMIL, which only plays when the Svg is drawn with `isInteractive`.
export const mascotSvg = (skin: Skin, size: MascotSize, activity: Activity, title: string) => {
  const { width, height } = mascotBox(size)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${CLAWD_WINDOW.width} ${CLAWD_WINDOW.height}" shape-rendering="crispEdges"><title>${title}</title>${SKINS[skin][activity]}</svg>`
}

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
