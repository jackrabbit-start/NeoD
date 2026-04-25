export const PLAYER_DASH_SPEED = 720
export const PLAYER_DASH_DURATION_MS = 180
export const PLAYER_DASH_INVULNERABLE_MS = 220
export const PLAYER_DASH_COOLDOWN_MS = 700

export interface PlayerDashState {
  activeUntilMs: number
  invulnerableUntilMs: number
  cooldownUntilMs: number
}

export interface DashVector {
  x: number
  y: number
}

export function createReadyPlayerDashState(): PlayerDashState {
  return {
    activeUntilMs: 0,
    invulnerableUntilMs: 0,
    cooldownUntilMs: 0,
  }
}

export function canStartPlayerDash(
  nowMs: number,
  dashState: PlayerDashState,
  isInteractionBlocked: boolean,
): boolean {
  return !isInteractionBlocked && nowMs >= dashState.cooldownUntilMs
}

export function startPlayerDash(nowMs: number): PlayerDashState {
  return {
    activeUntilMs: nowMs + PLAYER_DASH_DURATION_MS,
    invulnerableUntilMs: nowMs + PLAYER_DASH_INVULNERABLE_MS,
    cooldownUntilMs: nowMs + PLAYER_DASH_COOLDOWN_MS,
  }
}

export function isPlayerDashActive(nowMs: number, dashState: PlayerDashState): boolean {
  return nowMs < dashState.activeUntilMs
}

export function isPlayerDashInvulnerable(nowMs: number, dashState: PlayerDashState): boolean {
  return nowMs < dashState.invulnerableUntilMs
}

export function resolvePlayerDashDirection(input: DashVector, fallback: DashVector): DashVector {
  const inputLength = Math.hypot(input.x, input.y)
  if (inputLength > 0) {
    return {
      x: input.x / inputLength,
      y: input.y / inputLength,
    }
  }

  const fallbackLength = Math.hypot(fallback.x, fallback.y)
  if (fallbackLength > 0) {
    return {
      x: fallback.x / fallbackLength,
      y: fallback.y / fallbackLength,
    }
  }

  return { x: 1, y: 0 }
}
