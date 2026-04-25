import type {
  EnemyAttackBehavior,
  EnemyDefinition,
  EnemyMovementBehavior,
} from '../domain/types.js'

export interface Point {
  x: number
  y: number
}

export interface TargetCandidate extends Point {
  id: number
}

export interface EnemyTelegraphSpec {
  x: number
  y: number
  radius: number
  damage: number
  durationMs: number
  tint: number
}

export interface EnemyDashRuntimeState {
  lockedVelocity: Point | null
  chargeUntilMs: number
  cooldownUntilMs: number
}

export interface EnemyRuntimeState {
  dash?: EnemyDashRuntimeState
}

export type EnemyMovementMode = 'direct-chase' | 'orbit' | 'dash-charge' | 'dash-recover'

export interface EnemyVelocityStep {
  velocity: Point
  runtimeState: EnemyRuntimeState
  mode: EnemyMovementMode
}

const normalize = (vector: Point): Point => {
  const length = Math.hypot(vector.x, vector.y)
  if (length === 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

const scale = (vector: Point, multiplier: number): Point => ({
  x: vector.x * multiplier,
  y: vector.y * multiplier,
})

const add = (left: Point, right: Point): Point => ({
  x: left.x + right.x,
  y: left.y + right.y,
})

const seekVelocity = (source: Point, target: Point, speed: number): Point =>
  scale(
    normalize({
      x: target.x - source.x,
      y: target.y - source.y,
    }),
    speed,
  )

const createDashRuntimeState = (): EnemyDashRuntimeState => ({
  lockedVelocity: null,
  chargeUntilMs: 0,
  cooldownUntilMs: 0,
})

export function getDistanceBetween(source: Point, target: Point): number {
  return Math.hypot(target.x - source.x, target.y - source.y)
}

export function advanceEnemyCooldown(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - deltaMs)
}

export function selectAutoFireTarget(
  origin: Point,
  targets: TargetCandidate[],
): TargetCandidate | undefined {
  return [...targets].sort((left, right) => {
    const leftDistance = getDistanceBetween(origin, left)
    const rightDistance = getDistanceBetween(origin, right)

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance
    }

    return left.id - right.id
  })[0]
}

export function createEnemyRuntimeState(
  movementBehavior: EnemyMovementBehavior,
): EnemyRuntimeState {
  if (movementBehavior.kind === 'dash') {
    return {
      dash: createDashRuntimeState(),
    }
  }

  return {}
}

export function resolveEnemyVelocity(
  enemyPosition: Point,
  playerPosition: Point,
  speed: number,
  movementBehavior: EnemyMovementBehavior,
): Point {
  return resolveEnemyVelocityStep(
    enemyPosition,
    playerPosition,
    speed,
    movementBehavior,
    {},
    0,
  ).velocity
}

export function resolveEnemyVelocityStep(
  enemyPosition: Point,
  playerPosition: Point,
  speed: number,
  movementBehavior: EnemyMovementBehavior,
  runtimeState: EnemyRuntimeState = {},
  nowMs = 0,
): EnemyVelocityStep {
  const toPlayer = normalize({
    x: playerPosition.x - enemyPosition.x,
    y: playerPosition.y - enemyPosition.y,
  })

  if (toPlayer.x === 0 && toPlayer.y === 0) {
    return {
      velocity: { x: 0, y: 0 },
      runtimeState,
      mode: movementBehavior.kind === 'orbit' ? 'orbit' : 'direct-chase',
    }
  }

  if (movementBehavior.kind === 'direct-chase') {
    return {
      velocity: scale(toPlayer, speed),
      runtimeState,
      mode: 'direct-chase',
    }
  }

  if (movementBehavior.kind === 'dash') {
    const dashState = runtimeState.dash ?? createDashRuntimeState()

    if (dashState.lockedVelocity && nowMs < dashState.chargeUntilMs) {
      return {
        velocity: dashState.lockedVelocity,
        runtimeState: {
          ...runtimeState,
          dash: dashState,
        },
        mode: 'dash-charge',
      }
    }

    const distanceToPlayer = getDistanceBetween(enemyPosition, playerPosition)
    if (distanceToPlayer <= movementBehavior.triggerRange && nowMs >= dashState.cooldownUntilMs) {
      const lockedVelocity = seekVelocity(enemyPosition, playerPosition, movementBehavior.chargeSpeed)
      return {
        velocity: lockedVelocity,
        runtimeState: {
          ...runtimeState,
          dash: {
            lockedVelocity,
            chargeUntilMs: nowMs + movementBehavior.chargeDurationMs,
            cooldownUntilMs:
              nowMs + movementBehavior.chargeDurationMs + movementBehavior.cooldownMs,
          },
        },
        mode: 'dash-charge',
      }
    }

    return {
      velocity: scale(toPlayer, speed),
      runtimeState: {
        ...runtimeState,
        dash: {
          ...dashState,
          lockedVelocity: null,
        },
      },
      mode: 'dash-recover',
    }
  }

  const distance = getDistanceBetween(enemyPosition, playerPosition)
  const tangent = {
    x: -toPlayer.y * movementBehavior.orbitDirection,
    y: toPlayer.x * movementBehavior.orbitDirection,
  }

  let radialWeight = 0.2
  if (distance < movementBehavior.preferredDistance - movementBehavior.distanceTolerance) {
    radialWeight = -1
  } else if (distance > movementBehavior.preferredDistance + movementBehavior.distanceTolerance) {
    radialWeight = 1
  }

  return {
    velocity: scale(
      normalize(
        add(scale(toPlayer, radialWeight), tangent),
      ),
      speed,
    ),
    runtimeState,
    mode: 'orbit',
  }
}

export function shouldEnemyStartTelegraph(
  attackBehavior: EnemyAttackBehavior,
  distanceToPlayer: number,
  cooldownRemainingMs: number,
): boolean {
  return (
    attackBehavior.kind === 'telegraphed-aoe' &&
    cooldownRemainingMs <= 0 &&
    distanceToPlayer <= attackBehavior.range
  )
}

export function createEnemyTelegraph(
  enemyPosition: Point,
  playerPosition: Point,
  attackBehavior: EnemyAttackBehavior,
): EnemyTelegraphSpec | undefined {
  if (attackBehavior.kind !== 'telegraphed-aoe') {
    return undefined
  }

  const anchor = attackBehavior.anchor === 'player' ? playerPosition : enemyPosition
  return {
    x: anchor.x,
    y: anchor.y,
    radius: attackBehavior.radius,
    damage: attackBehavior.damage,
    durationMs: attackBehavior.telegraphMs,
    tint: attackBehavior.tint,
  }
}

export function isPointInsideCircle(point: Point, center: Point, radius: number): boolean {
  return getDistanceBetween(point, center) <= radius
}

export function getEnemyBehaviorSummary(enemy: EnemyDefinition): string {
  return enemy.behaviorSummary
}
