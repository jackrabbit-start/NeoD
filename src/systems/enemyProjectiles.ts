export interface Point {
  x: number
  y: number
}

export interface Bounds {
  width: number
  height: number
}

export interface PlayerHitTarget extends Point {
  radius: number
}

export interface EnemyProjectileSpawnSpec {
  direction: Point
  speed: number
  damage: number
  radius: number
  lifetimeMs: number
  tint: number
  textureKey: string
}

export interface EnemyProjectileState extends EnemyProjectileSpawnSpec {
  x: number
  y: number
  remainingLifetimeMs: number
}

export interface EnemyProjectileStep {
  projectile: EnemyProjectileState
  didAdvance: boolean
  expired: boolean
  outOfBounds: boolean
  hitPlayer: boolean
  destroyed: boolean
}

export type ProjectileOwner = 'enemy' | 'player'
export type ProjectileTarget = 'enemy' | 'player'

export function canProjectileDamageTarget(
  owner: ProjectileOwner,
  target: ProjectileTarget,
): boolean {
  return owner !== target
}

export function createEnemyProjectileState(
  origin: Point,
  spec: EnemyProjectileSpawnSpec,
): EnemyProjectileState {
  return {
    ...spec,
    x: origin.x,
    y: origin.y,
    remainingLifetimeMs: spec.lifetimeMs,
  }
}

export function isEnemyProjectileOutOfBounds(
  projectile: Pick<EnemyProjectileState, 'x' | 'y' | 'radius'>,
  bounds: Bounds,
): boolean {
  return (
    projectile.x < -projectile.radius ||
    projectile.x > bounds.width + projectile.radius ||
    projectile.y < -projectile.radius ||
    projectile.y > bounds.height + projectile.radius
  )
}

export function isEnemyProjectileHittingPlayer(
  projectile: Pick<EnemyProjectileState, 'x' | 'y' | 'radius'>,
  player: PlayerHitTarget,
): boolean {
  const distanceToPlayer = Math.hypot(projectile.x - player.x, projectile.y - player.y)
  return distanceToPlayer <= projectile.radius + player.radius
}

export function advanceEnemyProjectileState(
  projectile: EnemyProjectileState,
  deltaMs: number,
  bounds: Bounds,
  player: PlayerHitTarget,
  isPaused = false,
): EnemyProjectileStep {
  if (isPaused) {
    return {
      projectile,
      didAdvance: false,
      expired: false,
      outOfBounds: false,
      hitPlayer: false,
      destroyed: false,
    }
  }

  const deltaSeconds = Math.max(0, deltaMs) / 1000
  const nextProjectile = {
    ...projectile,
    x: projectile.x + projectile.direction.x * projectile.speed * deltaSeconds,
    y: projectile.y + projectile.direction.y * projectile.speed * deltaSeconds,
    remainingLifetimeMs: Math.max(0, projectile.remainingLifetimeMs - Math.max(0, deltaMs)),
  }
  const expired = nextProjectile.remainingLifetimeMs <= 0
  const outOfBounds = isEnemyProjectileOutOfBounds(nextProjectile, bounds)
  const hitPlayer =
    canProjectileDamageTarget('enemy', 'player') &&
    isEnemyProjectileHittingPlayer(nextProjectile, player)

  return {
    projectile: nextProjectile,
    didAdvance: deltaSeconds > 0,
    expired,
    outOfBounds,
    hitPlayer,
    destroyed: expired || outOfBounds || hitPlayer,
  }
}
