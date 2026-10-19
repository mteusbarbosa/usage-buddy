import type { Activity, Skin } from '../types'
import { CLAWD_FRAMES } from './clawd-sprites'

// Clawd's body shades in the extracted sprites, mapped to pumpkin shades.
const PUMPKIN: Record<string, string> = {
  '#d97757': '#f28c1b',
  '#d87656': '#f08a19',
  '#be684d': '#c4600c',
}

const HAT_BRIM = '#5b3480'
const HAT_BAND = '#b866f0'
const HAT_BUCKLE = '#f5c542'

// Witch-hat rows above the head, bottom up: [dy, dx from head centre, width, colour]. The tip bends right.
const HAT: [number, number, number, string][] = [
  [-1, -10, 20, HAT_BRIM],
  [-2, -6, 12, HAT_BAND],
  [-2, -1, 2, HAT_BUCKLE],
  [-3, -5, 10, HAT_BRIM],
  [-4, -4, 8, HAT_BRIM],
  [-5, -3, 6, HAT_BRIM],
  [-6, -2, 4, HAT_BRIM],
  [-7, -1, 3, HAT_BRIM],
  [-8, 1, 2, HAT_BRIM],
  [-9, 3, 2, HAT_BRIM],
]

// Most clips draw the body in #d97757; a few (running) use #d87656.
const BODY_PATH = /<path fill="#d(?:97757|87656)" d="([^"]*)"\/>/
const RUN = /M(-?\d+) (-?\d+)h(\d+)/g

// The hat sits on the topmost row of body pixels in each frame, so it follows Clawd as it sways and dances.
const hatFor = (frame: string) => {
  const body = BODY_PATH.exec(frame)?.[1]
  if (!body) return ''
  let top = Infinity
  let left = Infinity
  let right = -Infinity
  for (const [, x, y, len] of body.matchAll(RUN)) {
    const [rx, ry, rl] = [Number(x), Number(y), Number(len)]
    if (ry < top) {
      top = ry
      left = rx
      right = rx + rl
    } else if (ry === top) {
      left = Math.min(left, rx)
      right = Math.max(right, rx + rl)
    }
  }
  if (top === Infinity) return ''
  const cx = Math.round((left + right) / 2)
  return HAT.map(([dy, dx, w, fill]) => `<path fill="${fill}" d="M${cx + dx} ${top + dy}h${w}v1h-${w}z"/>`).join('')
}

// The hat is placed before the recolour, since it finds the head by Clawd's own body colour.
const halloween = (frames: string) =>
  frames
    // Each frame is a `<g>` holding paths; the hat goes last so it draws over the head.
    .replace(/(<g visibility="hidden"><animate [^>]*\/>)(.*?)(<\/g>)/g, (_m, open: string, paths: string, close: string) => `${open}${paths}${hatFor(paths)}${close}`)
    .replace(/fill="(#[0-9a-f]{6})"/g, (m, c: string) => (PUMPKIN[c] ? `fill="${PUMPKIN[c]}"` : m))

const HALLOWEEN_FRAMES = Object.fromEntries(
  Object.entries(CLAWD_FRAMES).map(([activity, frames]) => [activity, halloween(frames)]),
) as Record<Activity, string>

export const SKINS: Record<Skin, Record<Activity, string>> = { clawd: CLAWD_FRAMES, halloween: HALLOWEEN_FRAMES }
