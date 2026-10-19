import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } } as const

test('draws the mascot and each rate-limit window after a measurement', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({
    context: { window: 200_000, tokens: 50_000, percent: 25 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 42, resetsAt: '2026-10-10T14:30:00Z' },
      { kind: 'seven_day', percentUsed: 91.5 },
    ],
    changed: ['rateLimits'],
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'usage-buddy', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /42%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /resets in 2h30/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /91.5%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /ctx 25%/ })).toBeDefined()
    if (surface === 'desktop') {
      expect(await ui.findAll({ type: 'Svg' })).toHaveLength(3)
      expect(await ui.find({ type: 'Text', text: /█/ })).toBeUndefined()
    } else {
      expect(await ui.find({ type: 'Text', text: /▜█████▛/ })).toBeDefined()
      expect(await ui.findAll({ type: 'Svg' })).toHaveLength(0)
    }
    await ui.unmount()
  }
})

test('the mascot puts on its thinking hat when a prompt is submitted', async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }], changed: ['rateLimits'] })

  const before = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await before.find({ type: 'Text', text: /hanging out/ })).toBeDefined()
  await before.unmount()

  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  const terminal = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await terminal.find({ type: 'Text', text: /thinking/ })).toBeDefined()
  await terminal.unmount()

  const desktop = await $.ui.mount({ plugin: 'usage-buddy', surface: 'desktop', ...BAND })
  const [mascot] = await desktop.findAll({ type: 'Svg' })
  expect(String(mascot?.props.source)).toContain('#699acb')
  await desktop.unmount()
})

test('a long turn ends in a hula, then the mascot meditates', async ($, on) => {
  const clock = mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('turn.complete', () => ({ text: 'ok' }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }], changed: ['rateLimits'] })

  await $.prompt.submit({ text: 'big task', wait: false, origin: { kind: 'composer' } })
  await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 180_000, isAborted: false, turnId: 't1' })
  const party = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await party.find({ type: 'Text', text: /big one done/ })).toBeDefined()
  await party.unmount()

  await clock.advance(121_000)
  const rest = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await rest.find({ type: 'Text', text: /resting/ })).toBeDefined()
  await rest.unmount()
})

test('the mascot gets dizzy when idle past 90% usage', async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 95 }], changed: ['rateLimits'] })
  const ui = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /dizzy/ })).toBeDefined()
  await ui.unmount()
})

test("a subagent finishing does not end the mascot's work", async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('turn.complete', () => ({ text: 'ok' }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }], changed: ['rateLimits'] })
  await $.prompt.submit({ text: 'task', wait: false, origin: { kind: 'composer' } })
  await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 5_000, isAborted: false, turnId: 't2', agentId: 'sub-1' })
  const ui = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /thinking/ })).toBeDefined()
  await ui.unmount()
})

test('a new session shows the last usage another session saw until fresh numbers arrive', async ($, on) => {
  const clock = mock.clock(on, { now: Date.parse('2026-10-11T10:00:00Z') })
  mock.store(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 64, resetsAt: '2026-10-11T11:00:00Z' }], changed: ['rateLimits'] })

  await clock.advance(3 * 60 * 60_000)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const stale = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await stale.find({ type: 'Text', text: /64%/ })).toBeDefined()
  expect(await stale.find({ type: 'Text', text: /reset since/ })).toBeDefined()
  expect(await stale.find({ type: 'Text', text: /last seen 3h ago/ })).toBeDefined()
  await stale.unmount()

  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 5 }], changed: ['rateLimits'] })
  const live = await $.ui.mount({ plugin: 'usage-buddy', surface: 'terminal', ...BAND })
  expect(await live.find({ type: 'Text', text: /5%/ })).toBeDefined()
  expect(await live.find({ type: 'Text', text: /last seen/ })).toBeUndefined()
  await live.unmount()
})

const mascotSource = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'usage-buddy', surface: 'desktop', ...BAND })
  const [mascot] = await ui.findAll({ type: 'Svg' })
  await ui.unmount()
  return mascot
}

test('in October the mascot is a pumpkin in a witch hat', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-31T12:00:00Z') })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }], changed: ['rateLimits'] })
  const source = String((await mascotSource($))?.props.source)
  expect(source).toContain('#f28c1b')
  expect(source).toContain('#5b3480')
  expect(source).not.toContain('#d97757')
})

test('outside October the mascot is plain Clawd', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-11-15T12:00:00Z') })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }], changed: ['rateLimits'] })
  const source = String((await mascotSource($))?.props.source)
  expect(source).toContain('#d97757')
  expect(source).not.toContain('#5b3480')
})

test('the halloween skin applies any month when chosen', { options: { skin: 'halloween' } }, async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-03-01T12:00:00Z') })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }], changed: ['rateLimits'] })
  expect(String((await mascotSource($))?.props.source)).toContain('#5b3480')
})

test('the small size draws the mascot at one CSS pixel per sprite pixel', { options: { mascotSize: 'small' } }, async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 10 }], changed: ['rateLimits'] })
  const mascot = await mascotSource($)
  expect(mascot?.props.height).toBe(26)
  expect(String(mascot?.props.source)).toContain('height="26"')
})
