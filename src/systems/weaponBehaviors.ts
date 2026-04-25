import type {
  WeaponBoomerangDefinition,
  WeaponBurstFireBehavior,
  WeaponChainBehavior,
  WeaponComboMeleeBehavior,
  WeaponDeployTurretBehavior,
  WeaponDistanceScalingDefinition,
  WeaponDefinition,
  WeaponExecuteDefinition,
  WeaponImpactAoeBehavior,
  WeaponImpactBurstBehavior,
  WeaponKnockbackDefinition,
  WeaponMeleeCleaveBehavior,
  WeaponPierceBehavior,
  WeaponRicochetDefinition,
  WeaponSplitShotBehavior,
  WeaponSprayHazardBehavior,
  WeaponSummonOnKillDefinition,
  WeaponTurretDefinition,
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
  mode?: 'damage-zone' | 'trigger-trap'
  armingDelayMs?: number
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

export interface TurretDeploySpec extends WeaponTurretDefinition {
  tint: number
  visualPowerTier?: number
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
  distanceScaling?: WeaponDistanceScalingDefinition
  execute?: WeaponExecuteDefinition
  boomerang?: WeaponBoomerangDefinition
  ricochet?: WeaponRicochetDefinition
  summonOnKill?: WeaponSummonOnKillDefinition
  deployTurret?: TurretDeploySpec
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
  hitShape?: 'arc' | 'box'
  boxWidth?: number
  visualDurationMs: number
  maxTargets: number
  knockback: WeaponKnockbackDefinition
  execute?: WeaponExecuteDefinition
  healOnHit?: number
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
  | 'distance-shot'
  | 'return-shot'
  | 'multi-volley'
  | 'burst-rhythm'
  | 'line-pierce'
  | 'chain-hit'
  | 'wide-cleave'
  | 'narrow-cleave'
  | 'combo-melee'
  | 'hazard-zone'
  | 'deployable-node'
  | 'ricochet-shot'
  | 'execute-sweep'
export type WeaponSpecialEffectProfile =
  | 'none'
  | 'hazard-linger'
  | 'impact-splash'
  | 'high-knockback'
  | 'chain-bounce'
  | 'distance-ramp'
  | 'return-pass'
  | 'summon-ally'
  | 'deploy-turret'
  | 'life-steal'
  | 'ricochet'
  | 'execute-finisher'

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
  mode: behavior.kind === 'zone-control' && behavior.zoneTriggerMode === 'trigger-explode'
    ? 'trigger-trap'
    : 'damage-zone',
  armingDelayMs: behavior.kind === 'zone-control' ? behavior.armingDelayMs : undefined,
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
      execute: behavior.execute,
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
      execute: behavior.execute,
    })
  })
}

const createRicochetProjectiles = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  lifetimeMs: number,
  ricochet: WeaponRicochetDefinition,
  execute?: WeaponExecuteDefinition,
  summonOnKill?: WeaponSummonOnKillDefinition,
): ProjectileSpawnSpec[] => {
  const projectileCount = Math.max(1, ricochet.projectileCount ?? 1)
  const centerIndex = (projectileCount - 1) / 2
  const spreadDegrees = ricochet.spreadDegrees ?? 0
  const speedVariance = ricochet.speedVariance ?? 0

  return Array.from({ length: projectileCount }, (_, index) => {
    const offset = spreadDegrees > 0 ? (index - centerIndex) * spreadDegrees : 0
    const rotatedDirection = normalize(rotate(direction, offset))
    const varianceRatio = centerIndex === 0 ? 0 : (index - centerIndex) / Math.max(centerIndex, 1)
    const speed = Math.max(1, Math.round(weapon.projectileSpeed * (1 + speedVariance * varianceRatio)))

    return createBaseProjectile(weapon, origin, rotatedDirection, lifetimeMs, {
      speed,
      ricochet,
      execute,
      summonOnKill,
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
      distanceScaling: behavior.distanceScaling,
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
      execute: behavior.execute,
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
    distanceScaling: behavior.distanceScaling,
    execute: behavior.execute,
    boomerang: behavior.boomerang,
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
    distanceScaling: behavior.distanceScaling,
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
    boomerang: behavior.boomerang,
  })
}

const createDeployTurretProjectile = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponDeployTurretBehavior,
): ProjectileSpawnSpec =>
  createBaseProjectile(weapon, origin, direction, behavior.projectileLifetimeMs, {
    damage: Math.max(1, behavior.impactDamage ?? weapon.damage),
    speed: Math.max(1, Math.round(weapon.projectileSpeed * (behavior.speedMultiplier ?? 1))),
    deployTurret: {
      ...behavior.deploy,
      tint: weapon.projectileTint,
      visualPowerTier: weapon.visualPowerTier,
    },
  })

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
  execute: behavior.execute,
  healOnHit: behavior.healOnHit,
  visualPowerTier: weapon.visualPowerTier,
})

const createComboMeleeSwings = (
  weapon: WeaponDefinition,
  origin: Point,
  direction: Point,
  behavior: WeaponComboMeleeBehavior,
): MeleeSwingSpec[] =>
  behavior.steps.map((step, index) => ({
    delayMs: index * behavior.stepIntervalMs,
    origin,
    direction,
    damage: Math.max(1, Math.round(weapon.damage * step.damageMultiplier)),
    tint: weapon.projectileTint,
    range: step.range,
    arcDegrees: step.arcDegrees,
    hitShape: step.hitShape ?? 'arc',
    boxWidth: step.boxWidth,
    visualDurationMs: step.visualDurationMs,
    maxTargets: step.maxTargets,
    knockback: {
      force: Math.max(1, Math.round(weapon.knockback.force * (step.knockbackMultiplier ?? 1))),
      durationMs: Math.max(40, Math.round(weapon.knockback.durationMs * (step.knockbackMultiplier ?? 1))),
    },
    execute: step.execute,
    healOnHit: step.healOnHit,
    visualPowerTier: weapon.visualPowerTier,
  }))

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
        projectiles: weapon.attackBehavior.ricochet
          ? createRicochetProjectiles(
              weapon,
              origin,
              direction,
              weapon.attackBehavior.projectileLifetimeMs,
              weapon.attackBehavior.ricochet,
              weapon.attackBehavior.execute,
              weapon.attackBehavior.summonOnKill,
            )
          : [
              createBaseProjectile(weapon, origin, direction, weapon.attackBehavior.projectileLifetimeMs, {
                distanceScaling: weapon.attackBehavior.distanceScaling,
                execute: weapon.attackBehavior.execute,
                boomerang: weapon.attackBehavior.boomerang,
                ricochet: weapon.attackBehavior.ricochet,
                summonOnKill: weapon.attackBehavior.summonOnKill,
              }),
            ],
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
    case 'deploy-turret':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [createDeployTurretProjectile(weapon, origin, direction, weapon.attackBehavior)],
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
    case 'combo-melee':
      return {
        cooldownMs: weapon.fireRateMs,
        projectiles: [],
        meleeSwings: createComboMeleeSwings(weapon, origin, direction, weapon.attackBehavior),
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

  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.ricochet) {
    return '연쇄 리바운드'
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.summonOnKill) {
    return '처치 재기동'
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.boomerang) {
    return '귀환 사격'
  }
  if (
    (weapon.attackBehavior.kind === 'single' || weapon.attackBehavior.kind === 'pierce') &&
    weapon.attackBehavior.distanceScaling
  ) {
    return '거리 압축'
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
    case 'deploy-turret':
      return '감시 노드'
    case 'melee-cleave':
      return weapon.attackBehavior.healOnHit ? '흡혈 참격' : '전방 참격'
    case 'combo-melee':
      return '격투 콤보'
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponIdentityLabel')
  }
}

export function getWeaponAttackRange(weapon: WeaponDefinition): number {
  if (weapon.attackBehavior.kind === 'melee-cleave') {
    return weapon.attackBehavior.range
  }
  if (weapon.attackBehavior.kind === 'combo-melee') {
    return Math.max(...weapon.attackBehavior.steps.map((step) => step.range))
  }
  if (weapon.attackBehavior.kind === 'deploy-turret') {
    return typeof weapon.range === 'number' ? weapon.range : weapon.attackBehavior.deploy.range
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
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.ricochet) {
    return 'ricochet-shot'
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.boomerang) {
    return 'return-shot'
  }
  if (
    (weapon.attackBehavior.kind === 'single' || weapon.attackBehavior.kind === 'pierce') &&
    weapon.attackBehavior.distanceScaling
  ) {
    return 'distance-shot'
  }
  if (weapon.attackBehavior.kind === 'burst-fire') {
    return 'burst-rhythm'
  }
  if (weapon.attackBehavior.kind === 'melee-cleave' && weapon.attackBehavior.execute) {
    return 'execute-sweep'
  }

  switch (weapon.attackBehavior.kind) {
    case 'single':
    case 'impact-burst':
    case 'impact-aoe':
      return 'single-shot'
    case 'spray-hazard':
    case 'zone-control':
      return 'hazard-zone'
    case 'split-shot':
    case 'volley':
      return 'multi-volley'
    case 'pierce':
      return 'line-pierce'
    case 'chain':
      return 'chain-hit'
    case 'deploy-turret':
      return 'deployable-node'
    case 'melee-cleave':
      return weapon.attackBehavior.arcDegrees >= 90 ? 'wide-cleave' : 'narrow-cleave'
    case 'combo-melee':
      return 'combo-melee'
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponOutputGeometry')
  }
}

export function getWeaponSpecialEffectProfile(weapon: WeaponDefinition): WeaponSpecialEffectProfile {
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.ricochet) {
    return 'ricochet'
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.summonOnKill) {
    return 'summon-ally'
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.boomerang) {
    return 'return-pass'
  }
  if (
    (weapon.attackBehavior.kind === 'single' ||
      weapon.attackBehavior.kind === 'pierce' ||
      weapon.attackBehavior.kind === 'burst-fire' ||
      weapon.attackBehavior.kind === 'impact-aoe') &&
    weapon.attackBehavior.distanceScaling
  ) {
    return 'distance-ramp'
  }
  if (
    (weapon.attackBehavior.kind === 'spray-hazard' ||
      weapon.attackBehavior.kind === 'volley' ||
      weapon.attackBehavior.kind === 'split-shot' ||
      weapon.attackBehavior.kind === 'melee-cleave' ||
      weapon.attackBehavior.kind === 'pierce') &&
    weapon.attackBehavior.execute
  ) {
    return 'execute-finisher'
  }

  switch (weapon.attackBehavior.kind) {
    case 'spray-hazard':
    case 'zone-control':
      return weapon.attackBehavior.kind === 'zone-control' && weapon.attackBehavior.zoneTriggerMode === 'trigger-explode'
        ? 'impact-splash'
        : 'hazard-linger'
    case 'chain':
      return 'chain-bounce'
    case 'deploy-turret':
      return 'deploy-turret'
    case 'impact-burst':
    case 'impact-aoe':
      return 'impact-splash'
    case 'melee-cleave':
      if (weapon.attackBehavior.healOnHit) {
        return 'life-steal'
      }
      return weapon.knockback.force >= 110 ? 'high-knockback' : 'none'
    case 'combo-melee':
      return 'high-knockback'
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

  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.ricochet) {
    return `피해 ${weapon.damage} · 공 ${weapon.attackBehavior.ricochet.projectileCount ?? 1}개 · ${weapon.attackBehavior.ricochet.maxBounces}연쇄 튕김 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.summonOnKill) {
    return `피해 ${weapon.damage} · 처치 시 아군화 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.boomerang) {
    return `피해 ${weapon.damage} · 귀환 재타격 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.distanceScaling) {
    return `피해 ${weapon.damage} · 멀수록 증폭 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
  }

  switch (weapon.attackBehavior.kind) {
    case 'single':
      return `피해 ${weapon.damage} · 단발 견제 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'split-shot':
      return `${weapon.attackBehavior.execute ? '마무리' : '갈래당'} ${Math.max(1, Math.round(weapon.damage * (weapon.attackBehavior.damageMultiplier ?? 1)))} · ${weapon.attackBehavior.projectileCount}갈래 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'burst-fire':
      return `탄당 ${Math.max(1, Math.round(weapon.damage * (weapon.attackBehavior.damageMultiplier ?? 1)))} · ${weapon.attackBehavior.shotsPerBurst}박자 · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'spray-hazard':
      return `피해 ${weapon.damage} · ${weapon.attackBehavior.execute ? '빈사 처형' : '장판 압박'} · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
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
      return weapon.attackBehavior.zoneTriggerMode === 'trigger-explode'
        ? `직격 ${weapon.damage} · 폭발 ${weapon.attackBehavior.zoneDamage} · 함정 ${weapon.attackBehavior.zoneRadius} · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
        : `직격 ${weapon.damage} · 틱 ${weapon.attackBehavior.zoneDamage} · 지대 ${weapon.attackBehavior.zoneRadius} · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'deploy-turret':
      return `배치 ${weapon.attackBehavior.deploy.maxTurrets}기 · 포탑당 ${weapon.attackBehavior.deploy.projectileDamage} · 사거리 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'melee-cleave':
      return `피해 ${weapon.damage} · ${weapon.attackBehavior.healOnHit ? `흡혈 ${weapon.attackBehavior.healOnHit}` : weapon.attackBehavior.execute ? '빈사 수확' : `전방 ${weapon.attackBehavior.arcDegrees}°`} · 범위 ${range} · ${getWeaponIdentityLabel(weapon)}`
    case 'combo-melee':
      return `탄당 ${weapon.damage} · ${weapon.attackBehavior.steps.length}연 콤보 · 범위 ${range} · ${getWeaponIdentityLabel(weapon)}`
    default:
      return assertNever(weapon.attackBehavior, 'Unhandled weapon attack behavior in getWeaponSummary')
  }
}

export function getWeaponAttackContract(weapon: WeaponDefinition): WeaponAttackContract {
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.ricochet) {
    return {
      family: 'ricochet-single',
      geometry: `bounce:${weapon.attackBehavior.ricochet.maxBounces}:count:${weapon.attackBehavior.ricochet.projectileCount ?? 1}:range:${weapon.attackBehavior.ricochet.bounceRange}`,
      cadence: `cooldown:${weapon.fireRateMs}`,
      followUp: 'target-hop',
    }
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.summonOnKill) {
    return {
      family: 'summon-on-kill',
      geometry: `single-line:minions:${weapon.attackBehavior.summonOnKill.maxMinions}`,
      cadence: `cooldown:${weapon.fireRateMs}`,
      followUp: 'corpse-ally',
    }
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.boomerang) {
    return {
      family: 'boomerang-single',
      geometry: `return:${weapon.attackBehavior.boomerang.outboundDistance}`,
      cadence: `cooldown:${weapon.fireRateMs}`,
      followUp: 'return-pass',
    }
  }
  if (weapon.attackBehavior.kind === 'single' && weapon.attackBehavior.distanceScaling) {
    return {
      family: 'distance-single',
      geometry: `ramp:${weapon.attackBehavior.distanceScaling.nearMultiplier}:${weapon.attackBehavior.distanceScaling.farMultiplier}`,
      cadence: `cooldown:${weapon.fireRateMs}`,
      followUp: 'far-pressure',
    }
  }

  switch (weapon.attackBehavior.kind) {
    case 'split-shot':
      return {
        family: weapon.attackBehavior.execute ? 'execute-split' : 'split-shot',
        geometry: `${weapon.attackBehavior.projectileCount}-way:${weapon.attackBehavior.spreadDegrees}`,
        cadence: `cooldown:${weapon.fireRateMs}:delay:${weapon.attackBehavior.shotDelayMs ?? 0}`,
        followUp: weapon.attackBehavior.execute
          ? 'cleanup-burst'
          : (weapon.attackBehavior.shotDelayMs ?? 0) > 0
            ? 'delayed-second-pass'
            : 'none',
      }
    case 'burst-fire':
      return {
        family: 'burst-fire',
        geometry: `line-burst:${weapon.attackBehavior.shotsPerBurst}:${weapon.attackBehavior.spreadDegrees ?? 0}`,
        cadence: `cooldown:${weapon.fireRateMs}:interval:${weapon.attackBehavior.shotIntervalMs}`,
        followUp: weapon.attackBehavior.distanceScaling ? 'tempo-ramp' : 'burst-sequence',
      }
    case 'spray-hazard':
      return {
        family: weapon.attackBehavior.execute ? 'execute-spray' : 'spray-hazard',
        geometry: `spread:${weapon.attackBehavior.projectileCount}:${weapon.attackBehavior.spreadDegrees}:radius:${weapon.attackBehavior.hazardRadius}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: weapon.attackBehavior.execute ? 'low-health-melt' : 'puddle-hazard',
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
        family: weapon.attackBehavior.distanceScaling ? 'distance-impact' : 'impact-aoe',
        geometry: `single-shell:radius:${weapon.attackBehavior.explosionRadius}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: weapon.attackBehavior.distanceScaling ? 'far-shell' : 'impact-explosion',
      }
    case 'zone-control':
      return {
        family: weapon.attackBehavior.zoneTriggerMode === 'trigger-explode'
          ? 'trigger-trap'
          : weapon.attackBehavior.boomerang ? 'anchor-zone' : 'zone-control',
        geometry: `single-zone:${weapon.attackBehavior.zoneRadius}:${weapon.attackBehavior.zoneDurationMs}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: weapon.attackBehavior.zoneTriggerMode === 'trigger-explode'
          ? 'armed-detonation'
          : weapon.attackBehavior.boomerang ? 'return-anchor' : 'linger-zone',
      }
    case 'deploy-turret':
      return {
        family: 'deploy-turret',
        geometry: `deploy:${weapon.attackBehavior.deploy.maxTurrets}:range:${weapon.attackBehavior.deploy.range}`,
        cadence: `cooldown:${weapon.fireRateMs}:turret:${weapon.attackBehavior.deploy.fireRateMs}`,
        followUp: 'autonomous-fire',
      }
    case 'melee-cleave':
      return {
        family: weapon.attackBehavior.healOnHit ? 'lifesteal-cleave' : weapon.attackBehavior.execute ? 'execute-cleave' : 'melee-cleave',
        geometry: `arc:${weapon.attackBehavior.arcDegrees}:range:${weapon.attackBehavior.range}`,
        cadence: `cooldown:${weapon.fireRateMs}`,
        followUp: weapon.attackBehavior.healOnHit ? 'sustain-hit' : weapon.attackBehavior.execute ? 'finisher-window' : 'none',
      }
    case 'combo-melee':
      return {
        family: 'combo-melee',
        geometry: `steps:${weapon.attackBehavior.steps.length}:range:${getWeaponAttackRange(weapon)}`,
        cadence: `cooldown:${weapon.fireRateMs}:interval:${weapon.attackBehavior.stepIntervalMs}`,
        followUp: 'combo-finisher',
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

export function collectTargetsInBox(
  source: Point,
  direction: Point,
  range: number,
  width: number,
  targets: CircularTarget[],
  maxTargets: number = Number.POSITIVE_INFINITY,
): number[] {
  const normalizedDirection = normalize(direction)
  if (normalizedDirection.x === 0 && normalizedDirection.y === 0) {
    return []
  }

  const perpendicular = {
    x: -normalizedDirection.y,
    y: normalizedDirection.x,
  }
  const halfWidth = Math.max(1, width) / 2

  return targets
    .map((target) => {
      const offset = {
        x: target.x - source.x,
        y: target.y - source.y,
      }
      const forward = offset.x * normalizedDirection.x + offset.y * normalizedDirection.y
      const lateral = Math.abs(offset.x * perpendicular.x + offset.y * perpendicular.y)
      const centerDistance = Math.hypot(offset.x, offset.y)

      return {
        id: target.id,
        centerDistance,
        inForwardBand: forward >= -target.radius && forward <= range + target.radius,
        inWidthBand: lateral <= halfWidth + target.radius,
      }
    })
    .filter((target) => target.inForwardBand && target.inWidthBand)
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
