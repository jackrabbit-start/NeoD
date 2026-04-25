import type {
  EnemyAttackBehavior,
  EnemyDefinition,
  EnemyLineBeamAttackBehavior,
  EnemyMovementBehavior,
  EnemyRadialBurstAttackBehavior,
  EnemySpreadBurstAttackBehavior,
} from '../domain/types.js'
import type { EnemyProjectileSpawnSpec } from './enemyProjectiles.js'

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

export interface EnemyLineBeamSpec {
  start: Point
  end: Point
  width: number
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

const rotate = (vector: Point, degrees: number): Point => {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  }
}

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

export function shouldEnemyStartSpreadBurst(
  attackBehavior: EnemyAttackBehavior,
  distanceToPlayer: number,
  cooldownRemainingMs: number,
): boolean {
  return (
    attackBehavior.kind === 'spread-burst' &&
    cooldownRemainingMs <= 0 &&
    distanceToPlayer <= attackBehavior.range
  )
}

export function shouldEnemyStartLineBeam(
  attackBehavior: EnemyAttackBehavior,
  distanceToPlayer: number,
  cooldownRemainingMs: number,
): boolean {
  return (
    attackBehavior.kind === 'line-beam' &&
    cooldownRemainingMs <= 0 &&
    distanceToPlayer <= attackBehavior.range
  )
}

export function shouldEnemyStartRadialBurst(
  attackBehavior: EnemyAttackBehavior,
  distanceToPlayer: number,
  cooldownRemainingMs: number,
): boolean {
  return (
    attackBehavior.kind === 'radial-burst' &&
    cooldownRemainingMs <= 0 &&
    distanceToPlayer <= attackBehavior.range
  )
}


export function createEnemyAttackTarget(
  playerPosition: Point,
  jitterRadius = 0,
  random: () => number = Math.random,
): Point {
  const radius = Math.max(0, jitterRadius)
  if (radius <= 0) {
    return playerPosition
  }

  const angle = Math.max(0, Math.min(0.999999, random())) * Math.PI * 2
  const distance = Math.sqrt(Math.max(0, Math.min(0.999999, random()))) * radius
  return {
    x: playerPosition.x + Math.cos(angle) * distance,
    y: playerPosition.y + Math.sin(angle) * distance,
  }
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

export function createEnemySpreadBurstProjectiles(
  enemyPosition: Point,
  playerPosition: Point,
  attackBehavior: EnemySpreadBurstAttackBehavior,
): EnemyProjectileSpawnSpec[] {
  const baseDirection = normalize({
    x: playerPosition.x - enemyPosition.x,
    y: playerPosition.y - enemyPosition.y,
  })

  if (baseDirection.x === 0 && baseDirection.y === 0) {
    return []
  }

  const projectileCount = Math.max(0, Math.floor(attackBehavior.projectileCount))
  const centerIndex = (projectileCount - 1) / 2

  return Array.from({ length: projectileCount }, (_, index) => {
    const offsetDegrees = (index - centerIndex) * attackBehavior.spreadDegrees
    const direction = normalize(rotate(baseDirection, offsetDegrees))

    return {
      direction,
      speed: attackBehavior.projectileSpeed,
      damage: attackBehavior.damage,
      radius: attackBehavior.projectileRadius,
      lifetimeMs: attackBehavior.projectileLifetimeMs,
      tint: attackBehavior.tint,
      textureKey: attackBehavior.projectileTextureKey,
    }
  })
}

export function isPointInsideCircle(point: Point, center: Point, radius: number): boolean {
  return getDistanceBetween(point, center) <= radius
}

export function getEnemyBehaviorSummary(enemy: EnemyDefinition): string {
  return enemy.behaviorSummary
}


export function createEnemyLineBeam(
  enemyPosition: Point,
  playerPosition: Point,
  attackBehavior: EnemyLineBeamAttackBehavior,
): EnemyLineBeamSpec | undefined {
  const direction = normalize({
    x: playerPosition.x - enemyPosition.x,
    y: playerPosition.y - enemyPosition.y,
  })

  if (direction.x === 0 && direction.y === 0) {
    return undefined
  }

  return {
    start: enemyPosition,
    end: add(enemyPosition, scale(direction, attackBehavior.range)),
    width: attackBehavior.width,
    damage: attackBehavior.damage,
    durationMs: attackBehavior.windupMs,
    tint: attackBehavior.tint,
  }
}

export function isPointInsideLineBeam(
  point: Point,
  beam: Pick<EnemyLineBeamSpec, 'start' | 'end' | 'width'>,
): boolean {
  const segmentX = beam.end.x - beam.start.x
  const segmentY = beam.end.y - beam.start.y
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY
  if (segmentLengthSq <= 0) {
    return getDistanceBetween(point, beam.start) <= beam.width / 2
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - beam.start.x) * segmentX + (point.y - beam.start.y) * segmentY) / segmentLengthSq,
    ),
  )
  const closest = {
    x: beam.start.x + segmentX * projection,
    y: beam.start.y + segmentY * projection,
  }
  return getDistanceBetween(point, closest) <= beam.width / 2
}

export function createEnemyRadialBurstProjectiles(
  attackBehavior: EnemyRadialBurstAttackBehavior,
): EnemyProjectileSpawnSpec[] {
  const projectileCount = Math.max(0, Math.floor(attackBehavior.projectileCount))
  if (projectileCount <= 0) {
    return []
  }

  return Array.from({ length: projectileCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / projectileCount
    return {
      direction: { x: Math.cos(angle), y: Math.sin(angle) },
      speed: attackBehavior.projectileSpeed,
      damage: attackBehavior.damage,
      radius: attackBehavior.projectileRadius,
      lifetimeMs: attackBehavior.projectileLifetimeMs,
      tint: attackBehavior.tint,
      textureKey: attackBehavior.projectileTextureKey,
    }
  })
}
