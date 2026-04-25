import type {
  EnemyKnockbackDefinition,
  WeaponKnockbackDefinition,
} from '../domain/types.js'

export type KnockbackSource = 'direct-projectile' | 'melee-swing' | 'hazard' | 'chain'

export interface Point {
  x: number
  y: number
}

export interface KnockbackState {
  direction: Point
  force: number
  initialForce: number
  remainingDurationMs: number
  totalDurationMs: number
  createdAtMs: number
}

export interface KnockbackHitInput {
  source: KnockbackSource
  direction: Point
  weapon: WeaponKnockbackDefinition
  enemy: EnemyKnockbackDefinition
  activeState?: KnockbackState
  targetIsTelegraphing: boolean
  hitTimeMs: number
  fallbackDirection?: Point
  maxDurationMs?: number
}

export interface KnockbackHitResult {
  state?: KnockbackState
  applied: boolean
  reason:
    | 'applied'
    | 'replaced-stronger'
    | 'replaced-newer-equal'
    | 'weaker-ignored'
    | 'source-disabled'
    | 'telegraph-suppressed'
    | 'no-force'
}

export interface KnockbackStepResult {
  velocity: Point
  state?: KnockbackState
}

export const MAX_KNOCKBACK_DURATION_MS = 140

const ZERO_POINT: Point = { x: 0, y: 0 }
const DEFAULT_FALLBACK_DIRECTION: Point = { x: 1, y: 0 }

const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
)

const getLength = (point: Point): number => Math.hypot(point.x, point.y)

export function normalizeKnockbackDirection(
  direction: Point,
  fallbackDirection: Point = DEFAULT_FALLBACK_DIRECTION,
): Point {
  const length = getLength(direction)
  if (length > 0) {
    return {
      x: direction.x / length,
      y: direction.y / length,
    }
  }

  const fallbackLength = getLength(fallbackDirection)
  if (fallbackLength === 0) {
    return { ...ZERO_POINT }
  }

  return {
    x: fallbackDirection.x / fallbackLength,
    y: fallbackDirection.y / fallbackLength,
  }
}

export function getKnockbackDirection(
  source: Point,
  target: Point,
  fallbackDirection: Point = DEFAULT_FALLBACK_DIRECTION,
): Point {
  return normalizeKnockbackDirection(
    {
      x: target.x - source.x,
      y: target.y - source.y,
    },
    fallbackDirection,
  )
}

export function getEffectiveKnockbackForce(
  weapon: WeaponKnockbackDefinition,
  enemy: EnemyKnockbackDefinition,
): number {
  const resistanceMultiplier = 1 - clamp(enemy.resistance, 0, 1)
  const safeWeight = Math.max(0.1, enemy.weight)

  return Math.max(0, weapon.force * resistanceMultiplier / safeWeight)
}

export function shouldApplyKnockbackSource(source: KnockbackSource): boolean {
  return source === 'direct-projectile' || source === 'melee-swing'
}

export function clearKnockbackForTelegraph(): undefined {
  return undefined
}

export function createKnockbackState(
  direction: Point,
  force: number,
  durationMs: number,
  createdAtMs: number,
  maxDurationMs: number = MAX_KNOCKBACK_DURATION_MS,
  fallbackDirection: Point = DEFAULT_FALLBACK_DIRECTION,
): KnockbackState | undefined {
  const cappedDuration = clamp(durationMs, 0, maxDurationMs)
  if (force <= 0 || cappedDuration <= 0) {
    return undefined
  }

  return {
    direction: normalizeKnockbackDirection(direction, fallbackDirection),
    force,
    initialForce: force,
    remainingDurationMs: cappedDuration,
    totalDurationMs: cappedDuration,
    createdAtMs,
  }
}

export function resolveKnockbackHit(input: KnockbackHitInput): KnockbackHitResult {
  if (input.targetIsTelegraphing) {
    return {
      state: clearKnockbackForTelegraph(),
      applied: false,
      reason: 'telegraph-suppressed',
    }
  }

  if (!shouldApplyKnockbackSource(input.source)) {
    return {
      state: input.activeState,
      applied: false,
      reason: 'source-disabled',
    }
  }

  const force = getEffectiveKnockbackForce(input.weapon, input.enemy)
  const incomingState = createKnockbackState(
    input.direction,
    force,
    input.weapon.durationMs,
    input.hitTimeMs,
    input.maxDurationMs,
    input.fallbackDirection,
  )

  if (!incomingState) {
    return {
      state: input.activeState,
      applied: false,
      reason: 'no-force',
    }
  }

  if (!input.activeState) {
    return {
      state: incomingState,
      applied: true,
      reason: 'applied',
    }
  }

  if (incomingState.force > input.activeState.force) {
    return {
      state: incomingState,
      applied: true,
      reason: 'replaced-stronger',
    }
  }

  if (
    incomingState.force === input.activeState.force &&
    incomingState.createdAtMs > input.activeState.createdAtMs
  ) {
    return {
      state: incomingState,
      applied: true,
      reason: 'replaced-newer-equal',
    }
  }

  return {
    state: input.activeState,
    applied: false,
    reason: 'weaker-ignored',
  }
}

export function advanceKnockbackState(
  state: KnockbackState | undefined,
  deltaMs: number,
): KnockbackStepResult {
  if (!state) {
    return {
      velocity: { ...ZERO_POINT },
      state: undefined,
    }
  }

  const velocity = {
    x: state.direction.x * state.force,
    y: state.direction.y * state.force,
  }

  const remainingDurationMs = Math.max(0, state.remainingDurationMs - deltaMs)
  if (remainingDurationMs <= 0) {
    return {
      velocity,
      state: undefined,
    }
  }

  const remainingRatio = remainingDurationMs / state.totalDurationMs
  return {
    velocity,
    state: {
      ...state,
      force: state.initialForce * remainingRatio,
      remainingDurationMs,
    },
  }
}

export function combineMovementWithKnockback(baseVelocity: Point, knockbackVelocity: Point): Point {
  return {
    x: baseVelocity.x + knockbackVelocity.x,
    y: baseVelocity.y + knockbackVelocity.y,
  }
}
