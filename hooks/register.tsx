import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage, Timer, TurnCompleteReason } from 'claude-code'

import type { Activity, Skin, UsageSnapshot } from '../types'
import { ACTIVITY_LABELS, MASCOT_SCALES, mascotBox, mascotSvg } from './mascot'
import type { MascotSize } from './mascot'

const snapshot = atom({ plugin: 'usage-buddy', key: 'snapshot' } as const, null)
const isHidden = atom({ plugin: 'usage-buddy', key: 'isHidden' } as const, false)
const activity = atom({ plugin: 'usage-buddy', key: 'activity' } as const, 'idle')

const TOOL_ACTIVITIES: Record<string, Activity> = {
  Edit: 'building', Write: 'building', NotebookEdit: 'building',
  Read: 'exploring', Grep: 'exploring', Glob: 'exploring', WebFetch: 'exploring', WebSearch: 'exploring',
  Bash: 'running',
  Agent: 'planning', Task: 'planning', TodoWrite: 'planning', Skill: 'planning', EnterPlanMode: 'planning',
  ExitPlanMode: 'planning',
}

const GREETING_MS = 2_400
const OOPS_MS = 2_800
const LONG_TURN_MS = 120_000
const REST_AFTER_MS = 120_000
const RESTFUL: ReadonlySet<Activity> = new Set(['idle', 'done', 'party', 'resting', 'disappointed'])

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'week', spend_limit: 'spend' }
const TEXT_BAR_WIDTH = 8
const SVG_BAR_WIDTH = 64
const TERMINAL_MASCOT = '▝▜█████▛▘'

const toSnapshot = (u: Pick<SessionUsage, 'rateLimits' | 'context' | 'cost'>): UsageSnapshot => ({
  limits: u.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
  contextPercent: u.context.percent,
  costUsd: u.cost?.usd,
})

const BAR_HEX = { success: '#4EBA65', warning: '#E5A33B', error: '#E5534B' } as const

const colorFor = (percent: number): keyof typeof BAR_HEX => {
  if (percent >= 90) return 'error'
  if (percent >= 70) return 'warning'
  return 'success'
}

const textBar = (percent: number) => {
  const filled = Math.min(TEXT_BAR_WIDTH, Math.round((percent / 100) * TEXT_BAR_WIDTH))
  return '█'.repeat(filled) + '░'.repeat(TEXT_BAR_WIDTH - filled)
}

const barSvg = (percent: number) => {
  const filled = Math.min(SVG_BAR_WIDTH, Math.round((percent / 100) * SVG_BAR_WIDTH))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_BAR_WIDTH}" height="6" viewBox="0 0 ${SVG_BAR_WIDTH} 6"><rect width="${SVG_BAR_WIDTH}" height="6" rx="3" fill="#8884"/><rect width="${filled}" height="6" rx="3" fill="${BAR_HEX[colorFor(percent)]}"/></svg>`
}

const resetsIn = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  if (Date.parse(iso) <= now) return ' · reset since'
  const minutes = Math.max(0, Math.round((Date.parse(iso) - now) / 60_000))
  if (minutes < 60) return ` · resets in ${minutes}m`
  if (minutes < 48 * 60) return ` · resets in ${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
  return ` · resets in ${Math.round(minutes / 1440)}d`
}

const mood = (top: number) => {
  if (top >= 90) return 'phew, nearly out of juice!'
  if (top >= 70) return 'getting warm in here…'
  return 'plenty left — let’s build!'
}

const LAST_LIMITS_KEY = 'lastLimits'

type StoredLimits = { limits: UsageSnapshot['limits']; seenAt: number }

const isStoredLimits = (v: unknown): v is StoredLimits => {
  if (typeof v !== 'object' || v === null || !('limits' in v) || !('seenAt' in v)) return false
  return (
    typeof v.seenAt === 'number' &&
    Array.isArray(v.limits) &&
    v.limits.every(
      (l: unknown) =>
        typeof l === 'object' &&
        l !== null &&
        'kind' in l &&
        typeof l.kind === 'string' &&
        'percentUsed' in l &&
        typeof l.percentUsed === 'number',
    )
  )
}

const OCTOBER = 9

const skinFor = (option: unknown, now: number): Skin => {
  if (option === 'clawd' || option === 'halloween') return option
  return new Date(now).getMonth() === OCTOBER ? 'halloween' : 'clawd'
}

const isMascotSize = (v: unknown): v is MascotSize => typeof v === 'string' && v in MASCOT_SCALES

const ago = (ms: number) => {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

let pending: Timer | undefined

// Shows an activity now and, given `then`, moves on to another once `afterMs` passes with nothing newer shown.
async function show($: EngineInterface, next: Activity, then?: { activity: Activity; afterMs: number }) {
  pending?.cancel()
  pending = undefined
  await update($, activity, () => next)
  if (then) {
    pending = $.clock.after(then.afterMs, () => void update($, activity, () => then.activity))
  }
}

const endingFor = (reason: TurnCompleteReason, elapsedMs: number): Activity => {
  if (reason !== 'answer') return 'disappointed'
  return elapsedMs > LONG_TURN_MS ? 'party' : 'done'
}

export const register: Register = (on, options) => {
  const size: MascotSize = isMascotSize(options.mascotSize) ? options.mascotSize : 'large'
  const box = mascotBox(size)

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'usage-band', description: 'Show or hide the Claude usage band' })
    await show($, 'greeting', { activity: 'idle', afterMs: GREETING_MS })
    const usage = await $.session.usage()
    const fresh = toSnapshot(usage)
    // Rate limits only arrive with the first response; until then show the last ones any session saw.
    const stored = fresh.limits.length === 0 ? await $.store.get(LAST_LIMITS_KEY) : undefined
    await update($, snapshot, () =>
      isStoredLimits(stored) ? { ...fresh, limits: stored.limits, limitsSeenAt: stored.seenAt } : fresh,
    )
    return result
  })

  on('session.measure', async ($, e, next) => {
    const fresh = toSnapshot(e)
    if (fresh.limits.length > 0) {
      await update($, snapshot, () => fresh)
      await $.store.set(LAST_LIMITS_KEY, { limits: fresh.limits, seenAt: await $.clock.now() })
    } else {
      await update($, snapshot, prev => ({ ...fresh, limits: prev?.limits ?? [], limitsSeenAt: prev?.limitsSeenAt }))
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await show($, 'thinking')
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const toolActivity = TOOL_ACTIVITIES[e.tool]
    if (toolActivity) await show($, toolActivity)
    const result = await next(e)
    if (result.deny === undefined && result.isError) {
      await show($, 'oops', { activity: 'thinking', afterMs: OOPS_MS })
    }
    return result
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    // A subagent's turn ending is not the main turn ending; the mascot keeps working.
    if (e.agentId === undefined) {
      await show($, endingFor(e.reason, e.durationMs), { activity: 'resting', afterMs: REST_AFTER_MS })
    }
    return next(e)
  })

  on('command.run', { command: 'usage-band' }, async ($, e) => {
    const hidden = await update($, isHidden, v => !v)
    return { text: hidden ? 'Usage band hidden' : 'Usage band shown' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const snap = await read($, snapshot)
    if (e.props.hasSurvey || snap === null || (await read($, isHidden))) {
      return next(e)
    }

    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    // The terminal's table answers `Svg` too but paints it blank, so only remote surfaces get pixels.
    const Svg = e.surface === 'terminal' || !('Svg' in elements) ? undefined : elements.Svg
    const now = await $.clock.now()
    const top = Math.max(0, ...snap.limits.map(l => l.percentUsed))
    const current = await read($, activity)
    const doing = top >= 90 && RESTFUL.has(current) ? 'dizzy' : current
    const extras = [
      snap.contextPercent === undefined ? '' : `ctx ${snap.contextPercent}%`,
      snap.costUsd === undefined ? '' : `$${snap.costUsd.toFixed(2)}`,
    ].filter(Boolean)

    return (
      <Box flexDirection="row" gap={2} alignItems="center" flexWrap="wrap">
        {Svg ? (
          <Svg
            source={mascotSvg(
              skinFor(options.skin, now),
              size,
              doing,
              `${ACTIVITY_LABELS[doing]} · ${snap.limits.length === 0 ? 'no plan usage reported yet' : mood(top)}`,
            )}
            alt="Claude mascot"
            width={box.width}
            height={box.height}
            isInteractive
          />
        ) : (
          <Text>
            <Text color="claude">{TERMINAL_MASCOT}</Text>
            <Text dimColor> {ACTIVITY_LABELS[doing]}</Text>
          </Text>
        )}
        {snap.limits.map(l => (
          <Box key={`limit-${l.kind}`} flexDirection="row" gap={1} alignItems="center">
            <Text dimColor>{LABELS[l.kind] ?? l.kind}</Text>
            {Svg ? (
              <Svg source={barSvg(l.percentUsed)} alt={`${l.percentUsed}% used`} width={SVG_BAR_WIDTH} height={6} />
            ) : (
              <Text color={colorFor(l.percentUsed)}>{textBar(l.percentUsed)}</Text>
            )}
            <Text>
              {l.percentUsed}%<Text dimColor>{resetsIn(l.resetsAt, now)}</Text>
            </Text>
          </Box>
        ))}
        {snap.limitsSeenAt !== undefined && (
          <Text dimColor italic>
            last seen {ago(now - snap.limitsSeenAt)} ago
          </Text>
        )}
        {extras.length > 0 && <Text dimColor>{extras.join(' · ')}</Text>}
      </Box>
    )
  })
}
