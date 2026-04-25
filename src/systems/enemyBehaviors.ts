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

export function resolveEnemyVelocity(
  enemyPosition: Point,
  playerPosition: Point,
  speed: number,
  movementBehavior: EnemyMovementBehavior,
): Point {
  const toPlayer = normalize({
    x: playerPosition.x - enemyPosition.x,
    y: playerPosition.y - enemyPosition.y,
  })

  if (toPlayer.x === 0 && toPlayer.y === 0) {
    return { x: 0, y: 0 }
  }

  if (movementBehavior.kind === 'direct-chase') {
    return scale(toPlayer, speed)
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

  return scale(
    normalize(
      add(scale(toPlayer, radialWeight), tangent),
    ),
    speed,
  )
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
