export type UsageSnapshot = {
  limits: { kind: string; percentUsed: number; resetsAt?: string }[]
  contextPercent?: number
  costUsd?: number
  /** When `limits` are carried over from an earlier session: the time they were measured, in `$.clock.now()` ms. */
  limitsSeenAt?: number
}

export type Activity =
  | 'idle'
  | 'thinking'
  | 'building'
  | 'exploring'
  | 'running'
  | 'done'
  | 'greeting'
  | 'planning'
  | 'oops'
  | 'disappointed'
  | 'party'
  | 'resting'
  | 'dizzy'

/** The mascot's look; the `skin` option's `auto` picks `halloween` through October. */
export type Skin = 'clawd' | 'halloween'

declare module 'claude-code' {
  interface PluginState {
    'usage-buddy': { snapshot: UsageSnapshot | null; isHidden: boolean; activity: Activity }
  }
}
