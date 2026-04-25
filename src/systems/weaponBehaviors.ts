import type {
  WeaponChainBehavior,
  WeaponDefinition,
  WeaponKnockbackDefinition,
  WeaponMeleeCleaveBehavior,
  WeaponPierceBehavior,
  WeaponSprayHazardBehavior,
} from '../domain/types.js'

export interface Point {
  x: number
  y: number
}

export interface HazardSpawnSpec {
  radius: number
  durationMs: number
  tickEveryMs: number
  damage: number
  tint: number
}

export interface ChainSpec {
  maxChains: number
  range: number
  falloff: number
}

export interface ProjectileSpawnSpec {
  direction: Point
  speed: number
  damage: number
  tint: number
  radius: number
  lifetimeMs: number
  maxHits: number
  knockback: WeaponKnockbackDefinition
  chain?: ChainSpec
  hazardOnHit?: HazardSpawnSpec
  hazardOnExpire?: HazardSpawnSpec
}

export interface MeleeSwingSpec {
  direction: Point
  damage: number
  tint: number
  range: number
  arcDegrees: number
  visualDurationMs: number
  maxTargets: number
  knockback: WeaponKnockbackDefinition
}

export interface AttackPlan {
  cooldownMs: number
  projectiles: ProjectileSpawnSpec[]
  meleeSwings: MeleeSwingSpec[]
}

export interface ChainCandidate {
  id: number
  x: number
  y: number
}

export interface CircularTarget {
  id: number
  x: number
  y: number
  radius: number
}

export interface RepeatingTimerStep {
  ticks: number
  remainingMs: number
}

export interface HazardStep {
  ticks: number
  tickCountdownMs: number
  remainingLifetimeMs: number
  expired: boolean
}

export interface ProjectileHitStep {
  remainingHits: number
  hitEnemyIds: Set<number>
  applied: boolean
  destroyed: boolean
}

const BASE_PROJECTILE_RADIUS = 5

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

const rotate = (vector: Point, degrees: number): Point => {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  }
}

const createHazardSpec = (
  weapon: WeaponDefinition,
  behavior: WeaponSprayHazardBehavior,
): HazardSpawnSpec => ({
  radius: behavior.hazardRadius,
  durationMs: behavior.hazardDurationMs,
  tickEveryMs: behavior.hazardTickMs,
  damage: behavior.hazardDamage,
  tint: weapon.projectileTint,
})

const createBaseProjectile = (
  weapon: WeaponDefinition,
  direction: Point,
  lifetimeMs: number,
  overrides: Partial<ProjectileSpawnSpec> = {},
): ProjectileSpawnSpec => ({
  direction,
  speed: weapon.projectileSpeed,
  damage: weapon.damage,
  tint: weapon.projectileTint,
  radius: BASE_PROJECTILE_RADIUS,
  lifetimeMs,
  maxHits: 1,
  knockback: weapon.knockback,
  ...overrides,
})

const createSprayProjectiles = (
  weapon: WeaponDefinition,
  direction: Point,
  behavior: WeaponSprayHazardBehavior,
): ProjectileSpawnSpec[] => {
  const hazard = createHazardSpec(weapon, behavior)
  const damage = Math.max(1, Math.round(weapon.damage * 0.7))
  const centerIndex = (behavior.projectileCount - 1) / 2

  return Array.from({ length: behavior.projectileCount }, (_, index) => {
    const offset = (index - centerIndex) * behavior.spreadDegrees
    const spreadDirection = normalize(rotate(direction, offset))

    return createBaseProjectile(weapon, spreadDirection, behavior.projectileLifetimeMs, {
      damage,
      speed: Math.round(weapon.projectileSpeed * 0.78),
      hazardOnHit: hazard,
      hazardOnExpire: hazard,
    })
  })
}

const createPierceProjectile = (
  weapon: WeaponDefinition,
  direction: Point,
  behavior: WeaponPierceBehavior,
): ProjectileSpawnSpec =>
  createBaseProjectile(weapon, direction, behavior.projectileLifetimeMs, {
    maxHits: behavior.maxHits,
  })

const createChainProjectile = (
  weapon: WeaponDefinition,
  direction: Point,
  behavior: WeaponChainBehavior,
): ProjectileSpawnSpec =>
  createBaseProjectile(weapon, direction, behavior.projectileLifetimeMs, {
    chain: {
      maxChains: behavior.maxChains,
      range: behavior.chainRange,
      falloff: behavior.chainFalloff,
    },
  })

const createMeleeSwing = (
  weapon: WeaponDefinition,
  direction: Point,
  behavior: WeaponMeleeCleaveBehavior,
): MeleeSwingSpec => ({
  direction,
  damage: weapon.damage,
  tint: weapon.projectileTint,
  range: behavior.range,
  arcDegrees: behavior.arcDegrees,
  visualDurationMs: behavior.visualDurationMs,
  maxTargets: behavior.maxTargets,
  knockback: weapon.knockback,
})

export function buildAttackPlan(
  weapon: WeaponDefinition,
  origin: Point,
  target: Point,
): AttackPlan {
  const direction = normalize({
    x: target.x - origin.x,
    y: target.y - origin.y,
  })

  if (direction.x === 0 && direction.y === 0) {
    return {
      cooldownMs: weapon.fireRateMs,
      projectiles: [],
      meleeSwings: [],
    }
  }

  switch (weapon.attackBehavior.kind) {
    case 'spray-hazard':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: createSprayProjectiles(weapon, direction, weapon.attackBehavior),
        meleeSwings: [],
      }
    case 'pierce':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createPierceProjectile(weapon, direction, weapon.attackBehavior)],
        meleeSwings: [],
      }
    case 'chain':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createChainProjectile(weapon, direction, weapon.attackBehavior)],
        meleeSwings: [],
      }
    case 'melee-cleave':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [],
        meleeSwings: [createMeleeSwing(weapon, direction, weapon.attackBehavior)],
      }
    case 'single':
    default:
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createBaseProjectile(weapon, direction, weapon.attackBehavior.projectileLifetimeMs)],
        meleeSwings: [],
      }
  }
}

export function isAttackPlanActionable(attackPlan: AttackPlan): boolean {
  return attackPlan.projectiles.length > 0 || attackPlan.meleeSwings.length > 0
}

export function getWeaponIdentityLabel(weapon: WeaponDefinition): string {
  if (weapon.identityLabel) {
    return weapon.identityLabel
  }

  switch (weapon.attackBehavior.kind) {
    case 'spray-hazard':
      return '산성 분사'
    case 'pierce':
      return '관통 사격'
    case 'chain':
      return '연쇄 번개'
    case 'melee-cleave':
      return '전방 참격'
    case 'single':
    default:
      return '기본 사격'
  }
}

export function getWeaponSummary(weapon: WeaponDefinition): string {
  if (weapon.attackBehavior.kind === 'melee-cleave') {
    return `피해 ${weapon.damage} · 초당 ${Math.round(1000 / weapon.fireRateMs)}회 · 범위 ${weapon.attackBehavior.range} · ${getWeaponIdentityLabel(weapon)}`
  }

  return `피해 ${weapon.damage} · 초당 ${Math.round(1000 / weapon.fireRateMs)}발 · ${getWeaponIdentityLabel(weapon)}`
}

export function getChainDamage(baseDamage: number, chainIndex: number, falloff: number): number {
  return Math.max(1, Math.round(baseDamage * falloff ** chainIndex))
}

export function selectChainTargets(
  impact: Point,
  candidates: ChainCandidate[],
  range: number,
  maxChains: number,
): number[] {
  return [...candidates]
    .map((candidate) => ({
      id: candidate.id,
      distance: Math.hypot(candidate.x - impact.x, candidate.y - impact.y),
    }))
    .filter((candidate) => candidate.distance <= range)
    .sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance
      }

      return left.id - right.id
    })
    .slice(0, maxChains)
    .map((candidate) => candidate.id)
}

export function isPointWithinRadius(source: Point, target: Point, radius: number): boolean {
  return Math.hypot(target.x - source.x, target.y - source.y) <= radius
}

export function collectTargetsInRadius(
  source: Point,
  radius: number,
  targets: CircularTarget[],
): number[] {
  return targets
    .filter((target) => isPointWithinRadius(source, target, radius + target.radius))
    .map((target) => target.id)
}

export function collectTargetsInCleave(
  source: Point,
  direction: Point,
  range: number,
  arcDegrees: number,
  targets: CircularTarget[],
  maxTargets: number = Number.POSITIVE_INFINITY,
): number[] {
  const normalizedDirection = normalize(direction)
  if (normalizedDirection.x === 0 && normalizedDirection.y === 0) {
    return []
  }

  const halfArcRadians = (Math.max(0, Math.min(360, arcDegrees)) * Math.PI) / 360
  const minimumDot = Math.cos(halfArcRadians)

  return targets
    .map((target) => {
      const offset = {
        x: target.x - source.x,
        y: target.y - source.y,
      }
      const centerDistance = Math.hypot(offset.x, offset.y)
      const targetDirection = normalize(offset)
      const dot = targetDirection.x * normalizedDirection.x + targetDirection.y * normalizedDirection.y

      return {
        id: target.id,
        centerDistance,
        inRange: centerDistance <= range + target.radius,
        inArc: centerDistance === 0 || dot >= minimumDot,
      }
    })
    .filter((target) => target.inRange && target.inArc)
    .sort((left, right) => {
      if (left.centerDistance !== right.centerDistance) {
        return left.centerDistance - right.centerDistance
      }

      return left.id - right.id
    })
    .slice(0, maxTargets)
    .map((target) => target.id)
}

export function canProjectileHitEnemy(hitEnemyIds: Set<number>, enemyId: number): boolean {
  return !hitEnemyIds.has(enemyId)
}

export function applyProjectileHitState(
  hitEnemyIds: Set<number>,
  enemyId: number,
  remainingHits: number,
): ProjectileHitStep {
  if (!canProjectileHitEnemy(hitEnemyIds, enemyId)) {
    return {
      remainingHits,
      hitEnemyIds,
      applied: false,
      destroyed: remainingHits <= 0,
    }
  }

  const nextHitEnemyIds = new Set(hitEnemyIds)
  nextHitEnemyIds.add(enemyId)
  const nextRemainingHits = remainingHits - 1

  return {
    remainingHits: nextRemainingHits,
    hitEnemyIds: nextHitEnemyIds,
    applied: true,
    destroyed: nextRemainingHits <= 0,
  }
}

export function isProjectileOutOfBounds(position: Point, width: number, height: number): boolean {
  return position.x < 0 || position.x > width || position.y < 0 || position.y > height
}

export function shouldWeaponFire(
  isInteractionBlocked: boolean,
  hasTarget: boolean,
  time: number,
  nextFireAt: number,
): boolean {
  return !isInteractionBlocked && hasTarget && time >= nextFireAt
}

export function advanceRepeatingTimer(
  remainingMs: number,
  deltaMs: number,
  intervalMs: number,
): RepeatingTimerStep {
  let nextRemaining = remainingMs - deltaMs
  let ticks = 0

  while (nextRemaining <= 0) {
    ticks += 1
    nextRemaining += intervalMs
  }

  return {
    ticks,
    remainingMs: nextRemaining,
  }
}

export function advanceHazardState(
  remainingLifetimeMs: number,
  tickCountdownMs: number,
  deltaMs: number,
  tickEveryMs: number,
): HazardStep {
  const effectiveDelta = Math.min(deltaMs, remainingLifetimeMs)
  const timerStep = advanceRepeatingTimer(tickCountdownMs, effectiveDelta, tickEveryMs)
  const nextRemainingLifetime = Math.max(0, remainingLifetimeMs - deltaMs)

  return {
    ticks: timerStep.ticks,
    tickCountdownMs: timerStep.remainingMs,
    remainingLifetimeMs: nextRemainingLifetime,
    expired: nextRemainingLifetime <= 0,
  }
}
