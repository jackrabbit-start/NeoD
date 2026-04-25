import type {
  WeaponBurstFireBehavior,
  WeaponChainBehavior,
  WeaponDefinition,
  WeaponImpactAoeBehavior,
  WeaponImpactBurstBehavior,
  WeaponKnockbackDefinition,
  WeaponMeleeCleaveBehavior,
  WeaponPierceBehavior,
  WeaponSplitShotBehavior,
  WeaponSprayHazardBehavior,
  WeaponVolleyBehavior,
  WeaponZoneControlBehavior,
} from '../domain/types.js'

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface HazardSpawnSpec {
  radius: number
  durationMs: number
  tickEveryMs: number
  damage: number
  tint: number
  visualPowerTier?: number
}

export interface ChainSpec {
  maxChains: number
  range: number
  falloff: number
  visualPowerTier?: number
}

export interface ImpactBurstSpec {
  radius: number
  damage: number
  baseDamage: number
  tint: number
  knockbackMultiplier: number
}

export interface ProjectileSpawnSpec {
  delayMs?: number
  origin?: Point
  direction: Point
  speed: number
  damage: number
  tint: number
  radius: number
  lifetimeMs: number
  maxTravelDistance: number
  maxHits: number
  knockback: WeaponKnockbackDefinition
  chain?: ChainSpec
  explosionOnHit?: HazardSpawnSpec
  explosionOnExpire?: HazardSpawnSpec
  hazardOnHit?: HazardSpawnSpec
  hazardOnExpire?: HazardSpawnSpec
  impactBurstOnHit?: ImpactBurstSpec
  visualPowerTier?: number
}

export interface MeleeSwingSpec {
  delayMs?: number
  origin?: Point
  direction: Point
  damage: number
  tint: number
  range: number
  arcDegrees: number
  visualDurationMs: number
  maxTargets: number
  knockback: WeaponKnockbackDefinition
  visualPowerTier?: number
}

export interface AttackPlan {
  cooldownMs: number
  projectiles: ProjectileSpawnSpec[]
  meleeSwings: MeleeSwingSpec[]
}

export interface WeaponAttackContract {
  family: string
  geometry: string
  cadence: string
  followUp: string
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

export interface ProjectileRangeStep {
  point: Point
  distanceFromOrigin: number
  expired: boolean
}

export type WeaponRangeBand = 'close' | 'mid' | 'long'
export type WeaponOutputGeometry =
  | 'single-shot'
  | 'multi-volley'
  | 'line-pierce'
  | 'chain-hit'
  | 'wide-cleave'
  | 'narrow-cleave'
  | 'hazard-zone'
export type WeaponSpecialEffectProfile =
  | 'none'
  | 'hazard-linger'
  | 'impact-splash'
  | 'high-knockback'
  | 'chain-bounce'

const BASE_PROJECTILE_RADIUS = 5

function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`)
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
  behavior: WeaponSprayHazardBehavior | WeaponZoneControlBehavior,
): HazardSpawnSpec => ({
  radius: behavior.kind === 'zone-control' ? behavior.zoneRadius : behavior.hazardRadius,
  durationMs: behavior.kind === 'zone-control' ? behavior.zoneDurationMs : behavior.hazardDurationMs,
  tickEveryMs: behavior.kind === 'zone-control' ? behavior.zoneTickMs : behavior.hazardTickMs,
  damage: behavior.kind === 'zone-control' ? behavior.zoneDamage : behavior.hazardDamage,
  tint: weapon.projectileTint,
  visualPowerTier: weapon.visualPowerTier,
})

const createBaseProjectile = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  lifetimeMs: number,
  overrides: Partial<ProjectileSpawnSpec> = {},
): ProjectileSpawnSpec => ({
  origin,
  direction,
  speed: weapon.projectileSpeed,
  damage: weapon.damage,
  tint: weapon.projectileTint,
  radius: BASE_PROJECTILE_RADIUS + Math.max(0, weapon.visualPowerTier ?? 0),
  lifetimeMs,
  maxTravelDistance: getWeaponAttackRange(weapon),
  maxHits: 1,
  knockback: weapon.knockback,
  visualPowerTier: weapon.visualPowerTier,
  ...overrides,
})

const createSprayProjectiles = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponSprayHazardBehavior,
): ProjectileSpawnSpec[] => {
  const hazard = createHazardSpec(weapon, behavior)
  const damage = Math.max(1, Math.round(weapon.damage * 0.7))
  const centerIndex = (behavior.projectileCount - 1) / 2

  return Array.from({ length: behavior.projectileCount }, (_, index) => {
    const offset = (index - centerIndex) * behavior.spreadDegrees
    const spreadDirection = normalize(rotate(direction, offset))

    return createBaseProjectile(weapon, origin, spreadDirection, behavior.projectileLifetimeMs, {
      damage,
      speed: Math.round(weapon.projectileSpeed * 0.78),
      hazardOnHit: hazard,
      hazardOnExpire: hazard,
    })
  })
}

const createSplitProjectiles = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponSplitShotBehavior,
): ProjectileSpawnSpec[] => {
  const centerIndex = (behavior.projectileCount - 1) / 2
  const damage = Math.max(1, Math.round(weapon.damage * (behavior.damageMultiplier ?? 1)))
  const speed = Math.max(1, Math.round(weapon.projectileSpeed * (behavior.speedMultiplier ?? 1)))
  const delayStep = Math.max(0, behavior.shotDelayMs ?? 0)

  return Array.from({ length: behavior.projectileCount }, (_, index) => {
    const offset = (index - centerIndex) * behavior.spreadDegrees
    const splitDirection = normalize(rotate(direction, offset))

    return createBaseProjectile(weapon, origin, splitDirection, behavior.projectileLifetimeMs, {
      delayMs: delayStep > 0 ? delayStep * index : 0,
      damage,
      speed,
      maxHits: behavior.maxHits ?? 1,
    })
  })
}

const createBurstProjectiles = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponBurstFireBehavior,
): ProjectileSpawnSpec[] => {
  const damage = Math.max(1, Math.round(weapon.damage * (behavior.damageMultiplier ?? 1)))
  const speed = Math.max(1, Math.round(weapon.projectileSpeed * (behavior.speedMultiplier ?? 1)))

  return Array.from({ length: behavior.shotsPerBurst }, (_, index) => {
    const offsetDegrees =
      behavior.spreadDegrees != null && behavior.spreadDegrees > 0
        ? (index - (behavior.shotsPerBurst - 1) / 2) * behavior.spreadDegrees
        : 0
    const burstDirection = normalize(rotate(direction, offsetDegrees))

    return createBaseProjectile(weapon, origin, burstDirection, behavior.projectileLifetimeMs, {
      delayMs: index * behavior.shotIntervalMs,
      damage,
      speed,
    })
  })
}

const createVolleyProjectiles = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponVolleyBehavior,
): ProjectileSpawnSpec[] => {
  const centerIndex = (behavior.projectileCount - 1) / 2
  const volleyDamage = Math.max(1, Math.round(weapon.damage * behavior.damageMultiplier))
  const speed = Math.max(1, Math.round(weapon.projectileSpeed * behavior.speedMultiplier))

  return Array.from({ length: behavior.projectileCount }, (_, index) => {
    const offset = (index - centerIndex) * behavior.spreadDegrees
    const spreadDirection = normalize(rotate(direction, offset))

    return createBaseProjectile(weapon, origin, spreadDirection, behavior.projectileLifetimeMs, {
      damage: volleyDamage,
      speed,
      maxHits: behavior.maxHits,
    })
  })
}

const createPierceProjectile = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponPierceBehavior,
): ProjectileSpawnSpec =>
  createBaseProjectile(weapon, origin, direction, behavior.projectileLifetimeMs, {
    maxHits: behavior.maxHits,
  })

const createChainProjectile = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponChainBehavior,
): ProjectileSpawnSpec =>
  createBaseProjectile(weapon, origin, direction, behavior.projectileLifetimeMs, {
    chain: {
      maxChains: behavior.maxChains,
      range: behavior.chainRange,
      falloff: behavior.chainFalloff,
      visualPowerTier: weapon.visualPowerTier,
    },
  })

const createImpactExplosionSpec = (
  weapon: WeaponDefinition,
  behavior: WeaponImpactAoeBehavior,
): HazardSpawnSpec => ({
  radius: behavior.explosionRadius,
  durationMs: 1,
  tickEveryMs: 1,
  damage: behavior.explosionDamage,
  tint: weapon.projectileTint,
})

const createImpactProjectile = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponImpactAoeBehavior,
): ProjectileSpawnSpec => {
  const explosion = createImpactExplosionSpec(weapon, behavior)
  return createBaseProjectile(weapon, origin, direction, behavior.projectileLifetimeMs, {
    explosionOnHit: explosion,
    explosionOnExpire: explosion,
  })
}

const createImpactBurstProjectile = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponImpactBurstBehavior,
): ProjectileSpawnSpec => {
  const splashDamage = Math.max(1, Math.round(weapon.damage * behavior.splashDamageMultiplier))

  return createBaseProjectile(weapon, origin, direction, behavior.projectileLifetimeMs, {
    impactBurstOnHit: {
      radius: behavior.splashRadius,
      damage: splashDamage,
      baseDamage: splashDamage,
      tint: weapon.projectileTint,
      knockbackMultiplier: behavior.splashKnockbackMultiplier,
    },
  })
}

const createZoneControlProjectile = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponZoneControlBehavior,
): ProjectileSpawnSpec => {
  const zone = createHazardSpec(weapon, behavior)
  return createBaseProjectile(weapon, origin, direction, behavior.projectileLifetimeMs, {
    speed: Math.max(1, Math.round(weapon.projectileSpeed * (behavior.speedMultiplier ?? 1))),
    hazardOnHit: zone,
    hazardOnExpire: zone,
  })
}

const createMeleeSwing = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponMeleeCleaveBehavior,
): MeleeSwingSpec => ({
  origin,
  direction,
  damage: weapon.damage,
  tint: weapon.projectileTint,
  range: behavior.range,
  arcDegrees: behavior.arcDegrees,
  visualDurationMs: behavior.visualDurationMs,
  maxTargets: behavior.maxTargets,
  knockback: weapon.knockback,
  visualPowerTier: weapon.visualPowerTier,
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
    case 'single':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createBaseProjectile(weapon, origin, direction, weapon.attackBehavior.projectileLifetimeMs)],
        meleeSwings: [],
      }
    case 'spray-hazard':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: createSprayProjectiles(weapon, origin, direction, weapon.attackBehavior),
        meleeSwings: [],
      }
    case 'split-shot':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: createSplitProjectiles(weapon, origin, direction, weapon.attackBehavior),
        meleeSwings: [],
      }
    case 'burst-fire':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: createBurstProjectiles(weapon, origin, direction, weapon.attackBehavior),
        meleeSwings: [],
      }
    case 'volley':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: createVolleyProjectiles(weapon, origin, direction, weapon.attackBehavior),
        meleeSwings: [],
      }
    case 'pierce':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createPierceProjectile(weapon, origin, direction, weapon.attackBehavior)],
        meleeSwings: [],
      }
    case 'chain':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createChainProjectile(weapon, origin, direction, weapon.attackBehavior)],
        meleeSwings: [],
      }
    case 'impact-aoe':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createImpactProjectile(weapon, origin, direction, weapon.attackBehavior)],
        meleeSwings: [],
      }
    case 'zone-control':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createZoneControlProjectile(weapon, origin, direction, weapon.attackBehavior)],
        meleeSwings: [],
      }
    case 'impact-burst':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createImpactBurstProjectile(weapon, origin, direction, weapon.attackBehavior)],
        meleeSwings: [],
      }
    case 'melee-cleave':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [],
        meleeSwings: [createMeleeSwing(weapon, origin, direction, weapon.attackBehavior)],
      }
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in buildAttackPlan')
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
    case 'single':
      return '기본 사격'
    case 'spray-hazard':
      return '산성 분사'
    case 'split-shot':
      return '분기 사격'
    case 'burst-fire':
      return '연속 점사'
    case 'volley':
      return '연속 발사'
    case 'pierce':
      return '관통 사격'
    case 'chain':
      return '연쇄 번개'
    case 'impact-burst':
    case 'impact-aoe':
      return '충격 폭발'
    case 'zone-control':
      return '제어 지대'
    case 'melee-cleave':
      return '전방 참격'
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponIdentityLabel')
  }
}

export function getWeaponAttackRange(weapon: WeaponDefinition): number {
  if (weapon.attackBehavior.kind === 'melee-cleave') {
    return weapon.attackBehavior.range
  }

  if (typeof weapon.range === 'number') {
    return weapon.range
  }

  throw new Error(`Ranged weapon ${weapon.id} is missing an explicit range`)
}

export function getWeaponRangeBand(weapon: WeaponDefinition): WeaponRangeBand {
  const range = getWeaponAttackRange(weapon)
  if (range <= 180) {
    return 'close'
  }
  if (range <= 360) {
    return 'mid'
  }
  return 'long'
}

export function getWeaponOutputGeometry(weapon: WeaponDefinition): WeaponOutputGeometry {
  switch (weapon.attackBehavior.kind) {
    case 'single':
    case 'impact-burst':
    case 'impact-aoe':
      return 'single-shot'
    case 'spray-hazard':
    case 'zone-control':
      return 'hazard-zone'
    case 'split-shot':
    case 'burst-fire':
    case 'volley':
      return 'multi-volley'
    case 'pierce':
      return 'line-pierce'
    case 'chain':
      return 'chain-hit'
    case 'melee-cleave':
      return weapon.attackBehavior.arcDegrees >= 90 ? 'wide-cleave' : 'narrow-cleave'
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponOutputGeometry')
  }
}

export function getWeaponSpecialEffectProfile(weapon: WeaponDefinition): WeaponSpecialEffectProfile {
  switch (weapon.attackBehavior.kind) {
    case 'spray-hazard':
    case 'zone-control':
      return 'hazard-linger'
    case 'chain':
      return 'chain-bounce'
    case 'impact-burst':
    case 'impact-aoe':
      return 'impact-splash'
    case 'melee-cleave':
      return weapon.knockback.force >= 110 ? 'high-knockback' : 'none'
    case 'split-shot':
    case 'burst-fire':
    case 'volley':
      return weapon.knockback.force >= 80 ? 'high-knockback' : 'none'
    case 'single':
    case 'pierce':
      return weapon.knockback.force >= 120 ? 'high-knockback' : 'none'
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponSpecialEffectProfile')
  }
}

export function getWeaponSummary(weapon: WeaponDefinition): string {
  const range = getWeaponAttackRange(weapon)

  switch (weapon.attackBehavior.kind) {
    case 'single':
      return `피해 ${weapon.damage} · 단발 견제 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'split-shot':
      return `갈래당 ${Math.max(1, Math.round(weapon.damage * (weapon.attackBehavior.damageMultiplier ?? 1)))} · ${weapon.attackBehavior.projectileCount}갈래 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'burst-fire':
      return `탄당 ${Math.max(1, Math.round(weapon.damage * (weapon.attackBehavior.damageMultiplier ?? 1)))} · ${weapon.attackBehavior.shotsPerBurst}점사 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'spray-hazard':
      return `피해 ${weapon.damage} · 장판 압박 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'volley':
      return `피해 ${weapon.damage} · ${weapon.attackBehavior.projectileCount}연발 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'pierce':
      return `피해 ${weapon.damage} · 관통 ${weapon.attackBehavior.maxHits}회 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'chain':
      return `피해 ${weapon.damage} · 연쇄 ${weapon.attackBehavior.maxChains}회 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'impact-burst':
      return `피해 ${weapon.damage} · 착탄 폭발 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'impact-aoe':
      return `직격 ${weapon.damage} · 폭발 ${weapon.attackBehavior.explosionDamage} · 반경 ${weapon.attackBehavior.explosionRadius} · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'zone-control':
      return `직격 ${weapon.damage} · 틱 ${weapon.attackBehavior.zoneDamage} · 지대 ${weapon.attackBehavior.zoneRadius} · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'melee-cleave':
      return `피해 ${weapon.damage} · 전방 ${weapon.attackBehavior.arcDegrees}° · 범위 ${range} · ${getWeaponIdentityLabel(weapon)}`
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponSummary')
  }
}

export function getWeaponAttackContract(weapon: WeaponDefinition): WeaponAttackContract {
  switch (weapon.attackBehavior.kind) {
    case 'split-shot':
      return {
        family: 'split-shot',
        geometry: `${weapon.attackBehavior.projectileCount}-way:${weapon.attackBehavior.spreadDegrees}`,
        cadence: `cooldown:${weapon.fireRateMs}:delay:${weapon.attackBehavior.shotDelayMs ?? 0}`,
        followUp: (weapon.attackBehavior.shotDelayMs ?? 0) > 0 ? 'delayed-second-pass' : 'none',
      }
    case 'burst-fire':
      return {
        family: 'burst-fire',
        geometry: `line-burst:${weapon.attackBehavior.shotsPerBurst}:${weapon.attackBehavior.spreadDegrees ?? 0}`,
        cadence: `cooldown:${weapon.fireRateMs}:interval:${weapon.attackBehavior.shotIntervalMs}`,
        followUp: 'burst-sequence',
      }
    case 'spray-hazard':
      return {
        family: 'spray-hazard',
        geometry: `spread:${weapon.attackBehavior.projectileCount}:${weapon.attackBehavior.spreadDegrees}:radius:${weapon.attackBehavior.hazardRadius}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'puddle-hazard',
      }
    case 'volley':
      return {
        family: 'volley',
        geometry: `fan:${weapon.attackBehavior.projectileCount}:${weapon.attackBehavior.spreadDegrees}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'instant-volley',
      }
    case 'pierce':
      return {
        family: 'pierce',
        geometry: `line:maxHits:${weapon.attackBehavior.maxHits}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'multi-hit-pierce',
      }
    case 'chain':
      return {
        family: 'chain',
        geometry: `single-line:range:${weapon.attackBehavior.chainRange}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: `chain:${weapon.attackBehavior.maxChains}`,
      }
    case 'impact-burst':
      return {
        family: 'impact-burst',
        geometry: `single-shell:radius:${weapon.attackBehavior.splashRadius}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'impact-splash',
      }
    case 'impact-aoe':
      return {
        family: 'impact-aoe',
        geometry: `single-shell:radius:${weapon.attackBehavior.explosionRadius}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'impact-explosion',
      }
    case 'zone-control':
      return {
        family: 'zone-control',
        geometry: `single-zone:${weapon.attackBehavior.zoneRadius}:${weapon.attackBehavior.zoneDurationMs}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'linger-zone',
      }
    case 'melee-cleave':
      return {
        family: 'melee-cleave',
        geometry: `arc:${weapon.attackBehavior.arcDegrees}:range:${weapon.attackBehavior.range}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'none',
      }
    case 'single':
      return {
        family: 'single',
        geometry: 'single-line',
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: 'none',
      }
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponAttackContract')
  }
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

export function resolveProjectileRangeStep(
  origin: Point,
  current: Point,
  maxTravelDistance: number,
): ProjectileRangeStep {
  const offset = {
    x: current.x - origin.x,
    y: current.y - origin.y,
  }
  const distanceFromOrigin = Math.hypot(offset.x, offset.y)
  const clampedMaxTravelDistance = Math.max(0, maxTravelDistance)

  if (distanceFromOrigin < clampedMaxTravelDistance) {
    return {
      point: current,
      distanceFromOrigin,
      expired: false,
    }
  }

  if (distanceFromOrigin === 0) {
    return {
      point: origin,
      distanceFromOrigin: 0,
      expired: true,
    }
  }

  const travelRatio = clampedMaxTravelDistance / distanceFromOrigin

  return {
    point: {
      x: origin.x + offset.x * travelRatio,
      y: origin.y + offset.y * travelRatio,
    },
    distanceFromOrigin: clampedMaxTravelDistance,
    expired: true,
  }
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

export function isProjectileOutOfBounds(
  position: Point,
  boundsOrWidth: Bounds | number,
  height?: number,
): boolean {
  const bounds = typeof boundsOrWidth === 'number'
    ? { x: 0, y: 0, width: boundsOrWidth, height: height ?? boundsOrWidth }
    : boundsOrWidth

  return (
    position.x < bounds.x
    || position.x > bounds.x + bounds.width
    || position.y < bounds.y
    || position.y > bounds.y + bounds.height
  )
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
