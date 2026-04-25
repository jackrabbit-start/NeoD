import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { InventoryState, WeaponDefinition, WeaponId, WeaponStar } from '../domain/types.js'
import { consumeItems } from './inventory.js'
import { getPlayerLevelCombatStats, type PlayerLevelCombatStats } from './playerScaling.js'

export const TUNING_CAPSULE_ITEM_ID = 'tuning-capsule'
export const STARTER_TUNING_INELIGIBLE_WEAPON_ID: WeaponId = 'starter-blaster'
const MAX_RICOCHET_BOUNCES = 10

export const TUNING_EFFECT_DEFINITIONS = [
  {
    id: 'sharpened-core',
    label: '날카로운 코어',
    damageDelta: 4,
  },
  {
    id: 'quick-loader',
    label: '고속 장전기',
    fireRateMultiplier: 0.9,
  },
  {
    id: 'stabilized-bore',
    label: '안정화 총열',
    projectileSpeedDelta: 70,
    meleeRangeDelta: 18,
  },
] as const

export type TuningEffectId = (typeof TUNING_EFFECT_DEFINITIONS)[number]['id']

export type WeaponTuningState = Partial<Record<WeaponId, TuningEffectId>>

export interface TuningSelectionState {
  inventory: InventoryState
  ownedWeaponIds: WeaponId[]
  tuningState: WeaponTuningState
}

export interface TuningSelectionResult {
  nextInventory: InventoryState
  nextTuningState: WeaponTuningState
  effectId: TuningEffectId
}

export const STAR_DAMAGE_MULTIPLIER_STEP = 0.1
export const STAR_FIRE_RATE_MULTIPLIER_STEP = 0
export const STAR_PROJECTILE_SPEED_MULTIPLIER_STEP = 0
export const STAR_MELEE_RANGE_STEP = 0

export interface EffectiveWeaponStats extends WeaponDefinition {
  tuningEffectId?: TuningEffectId
  tuningLabel?: string
  star?: WeaponStar
  playerLevel?: number
  playerDamageMultiplier?: number
  weaponSpecialTier?: number
}

export type RandomSource = () => number

export function getTuningEffectLabel(effectId: TuningEffectId | undefined): string | null {
  if (!effectId) {
    return null
  }

  return TUNING_EFFECT_DEFINITIONS.find((effect) => effect.id === effectId)?.label ?? null
}

export function getWeaponTuningBlockReason(
  state: TuningSelectionState,
  weaponId: WeaponId,
): string | null {
  if (!state.ownedWeaponIds.includes(weaponId)) {
    return '보유한 무기가 아닙니다.'
  }

  if (weaponId === STARTER_TUNING_INELIGIBLE_WEAPON_ID) {
    return '튜닝하기 전에 무기를 제작하세요.'
  }

  if (state.tuningState[weaponId]) {
    return '이번 런에서 이미 튜닝했습니다.'
  }

  if ((state.inventory[TUNING_CAPSULE_ITEM_ID] ?? 0) <= 0) {
    return '튜닝 캡슐이 필요합니다.'
  }

  return null
}

export function resolveTuningSelection(
  state: TuningSelectionState,
  weaponId: WeaponId,
  random: RandomSource = Math.random,
): TuningSelectionResult | null {
  if (getWeaponTuningBlockReason(state, weaponId)) {
    return null
  }

  const effectId = selectTuningEffect(random)

  return {
    nextInventory: consumeItems(state.inventory, [TUNING_CAPSULE_ITEM_ID]),
    nextTuningState: {
      ...state.tuningState,
      [weaponId]: effectId,
    },
    effectId,
  }
}

export function deriveEffectiveWeaponStats(
  weaponId: WeaponId,
  tuningState: WeaponTuningState,
  star: WeaponStar = 1,
  playerLevel = 1,
): EffectiveWeaponStats {
  const weapon = WEAPON_DEFINITIONS[weaponId]
  const effectId = tuningState[weaponId]
  const effect = TUNING_EFFECT_DEFINITIONS.find((candidate) => candidate.id === effectId)
  const starBonusSteps = Math.max(0, star - 1)
  const playerStats = getPlayerLevelCombatStats(playerLevel)
  const tunedDamage = weapon.damage + (effect && 'damageDelta' in effect ? effect.damageDelta : 0)
  const tunedFireRateMs = Math.round(
    weapon.fireRateMs * (effect && 'fireRateMultiplier' in effect ? effect.fireRateMultiplier : 1),
  )
  const tunedProjectileSpeed = weapon.projectileSpeed + (effect && 'projectileSpeedDelta' in effect ? effect.projectileSpeedDelta : 0)
  const baseAttackBehavior = effect && 'meleeRangeDelta' in effect
    ? weapon.attackBehavior.kind === 'melee-cleave'
      ? {
          ...weapon.attackBehavior,
          range: weapon.attackBehavior.range + effect.meleeRangeDelta,
        }
      : weapon.attackBehavior.kind === 'combo-melee'
        ? {
            ...weapon.attackBehavior,
            steps: weapon.attackBehavior.steps.map((step) => ({
              ...step,
              range: step.range + effect.meleeRangeDelta,
            })),
          }
        : weapon.attackBehavior
    : weapon.attackBehavior
  const attackBehavior = applyPlayerLevelWeaponMilestones(
    applyStarWeaponScaling(baseAttackBehavior, star),
    playerStats,
  )
  const baseRange = typeof weapon.range === 'number'
    ? Math.round(weapon.range * playerStats.weaponRangeMultiplier)
    : weapon.range

  const effectiveWeapon: EffectiveWeaponStats = {
    ...weapon,
    range: baseRange,
    damage: Math.round(
      tunedDamage *
      (1 + STAR_DAMAGE_MULTIPLIER_STEP * starBonusSteps) *
      playerStats.damageMultiplier,
    ),
    fireRateMs: Math.max(70, Math.round(tunedFireRateMs * (1 - STAR_FIRE_RATE_MULTIPLIER_STEP * starBonusSteps))),
    projectileSpeed: Math.round(tunedProjectileSpeed * (1 + STAR_PROJECTILE_SPEED_MULTIPLIER_STEP * starBonusSteps)),
    attackBehavior,
  }

  if (effect) {
    effectiveWeapon.tuningEffectId = effect.id
    effectiveWeapon.tuningLabel = effect.label
  }

  if (star > 1) {
    effectiveWeapon.star = star
  }

  if (playerStats.level > 1) {
    effectiveWeapon.playerLevel = playerStats.level
    effectiveWeapon.playerDamageMultiplier = playerStats.damageMultiplier
  }

  if (playerStats.weaponSpecialTier > 0) {
    effectiveWeapon.weaponSpecialTier = playerStats.weaponSpecialTier
    effectiveWeapon.visualPowerTier = playerStats.weaponSpecialTier
    effectiveWeapon.levelUpgradeLabel = getWeaponLevelUpgradeLabel(weapon, playerStats)
    effectiveWeapon.levelUpgradeDescription = getWeaponLevelUpgradeDescription(weapon, playerStats)
  }

  return effectiveWeapon
}

function applyStarWeaponScaling(
  behavior: WeaponDefinition['attackBehavior'],
  star: WeaponStar,
): WeaponDefinition['attackBehavior'] {
  const normalizedStar = Math.max(1, star)
  const milestoneBonus = Math.floor(normalizedStar / 3)
  const overdriveBonus = normalizedStar >= 6 ? Math.floor((normalizedStar - 6) / 3) + 1 : 0
  if (milestoneBonus <= 0 && overdriveBonus <= 0) {
    return behavior
  }

  switch (behavior.kind) {
    case 'single':
      if (behavior.ricochet) {
        return {
          ...behavior,
          projectileLifetimeMs: behavior.projectileLifetimeMs + 60 * milestoneBonus + 80 * overdriveBonus,
          ricochet: {
            ...behavior.ricochet,
            maxBounces: Math.min(MAX_RICOCHET_BOUNCES, behavior.ricochet.maxBounces + milestoneBonus),
            bounceRange: behavior.ricochet.bounceRange + 24 * milestoneBonus + 28 * overdriveBonus,
            damageMultiplierPerBounce: Math.min(0.9, (behavior.ricochet.damageMultiplierPerBounce ?? 1) + 0.01 * overdriveBonus),
            speedMultiplierPerBounce: Math.min(1, (behavior.ricochet.speedMultiplierPerBounce ?? 1) + 0.01 * overdriveBonus),
            projectileCount: Math.max(1, (behavior.ricochet.projectileCount ?? 1) + milestoneBonus),
            spreadDegrees: Math.min(18, (behavior.ricochet.spreadDegrees ?? 0) + overdriveBonus * 1.5),
            speedVariance: Math.min(0.45, (behavior.ricochet.speedVariance ?? 0) + overdriveBonus * 0.05),
          },
          summonOnKill: behavior.summonOnKill
            ? {
                ...behavior.summonOnKill,
                maxMinions: behavior.summonOnKill.maxMinions + milestoneBonus,
                durationMs: behavior.summonOnKill.durationMs + 500 * milestoneBonus + 700 * overdriveBonus,
                speed: behavior.summonOnKill.speed + 10 * overdriveBonus,
                damage: behavior.summonOnKill.damage + overdriveBonus,
                attackIntervalMs: Math.max(180, behavior.summonOnKill.attackIntervalMs - 25 * overdriveBonus),
              }
            : behavior.summonOnKill,
        }
      }
      if (behavior.summonOnKill) {
        return {
          ...behavior,
          summonOnKill: {
            ...behavior.summonOnKill,
            maxMinions: behavior.summonOnKill.maxMinions + milestoneBonus,
            durationMs: behavior.summonOnKill.durationMs + 500 * milestoneBonus + 700 * overdriveBonus,
            speed: behavior.summonOnKill.speed + 10 * overdriveBonus,
            damage: behavior.summonOnKill.damage + overdriveBonus,
            attackIntervalMs: Math.max(180, behavior.summonOnKill.attackIntervalMs - 25 * overdriveBonus),
          },
        }
      }
      return behavior
    case 'burst-fire':
      return {
        ...behavior,
        shotsPerBurst: behavior.shotsPerBurst + milestoneBonus,
        shotIntervalMs: Math.max(20, behavior.shotIntervalMs - 4 * overdriveBonus),
        spreadDegrees: (behavior.spreadDegrees ?? 0) + overdriveBonus,
      }
    case 'split-shot':
      return {
        ...behavior,
        projectileCount: behavior.projectileCount + milestoneBonus,
        spreadDegrees: behavior.spreadDegrees + overdriveBonus,
        shotDelayMs: behavior.shotDelayMs === undefined ? undefined : Math.max(0, behavior.shotDelayMs - 2 * overdriveBonus),
      }
    case 'spray-hazard':
      return {
        ...behavior,
        projectileCount: behavior.projectileCount + milestoneBonus,
        spreadDegrees: behavior.spreadDegrees + overdriveBonus,
        hazardRadius: behavior.hazardRadius + 8 * milestoneBonus + 10 * overdriveBonus,
        hazardDurationMs: behavior.hazardDurationMs + 180 * milestoneBonus + 220 * overdriveBonus,
      }
    case 'pierce':
      return {
        ...behavior,
        maxHits: behavior.maxHits + milestoneBonus,
      }
    case 'chain':
      return {
        ...behavior,
        maxChains: behavior.maxChains + milestoneBonus,
        chainRange: behavior.chainRange + 16 * milestoneBonus + 20 * overdriveBonus,
        chainFalloff: Math.max(0.35, behavior.chainFalloff - 0.02 * overdriveBonus),
      }
    case 'volley':
      return {
        ...behavior,
        projectileCount: behavior.projectileCount + milestoneBonus,
        spreadDegrees: behavior.spreadDegrees + overdriveBonus,
      }
    case 'impact-burst':
      return {
        ...behavior,
        splashRadius: behavior.splashRadius + 8 * milestoneBonus + 12 * overdriveBonus,
      }
    case 'impact-aoe':
      return {
        ...behavior,
        explosionRadius: behavior.explosionRadius + 10 * milestoneBonus + 14 * overdriveBonus,
      }
    case 'zone-control':
      return {
        ...behavior,
        zoneRadius: behavior.zoneRadius + 8 * milestoneBonus + 12 * overdriveBonus,
        zoneDurationMs: behavior.zoneDurationMs + 220 * milestoneBonus + 320 * overdriveBonus,
        armingDelayMs: behavior.armingDelayMs === undefined ? undefined : Math.max(60, behavior.armingDelayMs - 15 * overdriveBonus),
      }
    case 'deploy-turret':
      return {
        ...behavior,
        deploy: {
          ...behavior.deploy,
          maxTurrets: behavior.deploy.maxTurrets + milestoneBonus,
          durationMs: behavior.deploy.durationMs + 650 * milestoneBonus + 850 * overdriveBonus,
          range: behavior.deploy.range + 20 * milestoneBonus + 28 * overdriveBonus,
          fireRateMs: Math.max(180, behavior.deploy.fireRateMs - 30 * overdriveBonus),
          projectileSpeed: behavior.deploy.projectileSpeed + 25 * overdriveBonus,
          projectileDamage: behavior.deploy.projectileDamage + overdriveBonus,
        },
      }
    case 'melee-cleave':
      return {
        ...behavior,
        range: behavior.range + 10 * milestoneBonus + 12 * overdriveBonus,
        arcDegrees: Math.min(360, behavior.arcDegrees + 18 * overdriveBonus),
        maxTargets: behavior.maxTargets + milestoneBonus,
        healOnHit: behavior.healOnHit === undefined ? undefined : behavior.healOnHit + Math.max(1, overdriveBonus),
      }
    case 'combo-melee':
      return {
        ...behavior,
        stepIntervalMs: Math.max(52, behavior.stepIntervalMs - 6 * milestoneBonus - 10 * overdriveBonus),
        steps: behavior.steps.map((step, index) => ({
          ...step,
          range: step.range + (index === behavior.steps.length - 1 ? 8 : 3) * milestoneBonus + (index === behavior.steps.length - 1 ? 10 : 4) * overdriveBonus,
          maxTargets: step.maxTargets + (index === behavior.steps.length - 1 ? milestoneBonus : 0),
          damageMultiplier: step.damageMultiplier + (index === behavior.steps.length - 1 ? 0.08 * overdriveBonus : 0.03 * overdriveBonus),
        })),
      }
    default:
      return behavior
  }
}

function getWeaponLevelUpgradeLabel(
  weapon: WeaponDefinition,
  playerStats: PlayerLevelCombatStats,
): string {
  const rangeLabel = playerStats.weaponRangeMultiplier > 1
    ? `범위 +${Math.round((playerStats.weaponRangeMultiplier - 1) * 100)}%`
    : '기본 범위'

  switch (weapon.attackBehavior.kind) {
    case 'single':
      return weapon.attackBehavior.boomerang
        ? `Lv.${playerStats.level} 공명 · 귀환 강화 · ${rangeLabel}`
        : weapon.attackBehavior.distanceScaling
          ? `Lv.${playerStats.level} 공명 · 원거리 증폭 · ${rangeLabel}`
          : `Lv.${playerStats.level} 공명 · 기본 강화 · ${rangeLabel}`
    case 'split-shot':
      return `Lv.${playerStats.level} 공명 · 갈래 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'burst-fire':
      return `Lv.${playerStats.level} 공명 · 박자 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'pierce':
      return `Lv.${playerStats.level} 공명 · 관통 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'chain':
      return `Lv.${playerStats.level} 공명 · 연계 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'volley':
      return `Lv.${playerStats.level} 공명 · 연발 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'spray-hazard':
      return `Lv.${playerStats.level} 공명 · 탄막 +${playerStats.weaponSpecialTier} · 장판 강화`
    case 'impact-burst':
      return `Lv.${playerStats.level} 공명 · 폭발 반경 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'impact-aoe':
      return `Lv.${playerStats.level} 공명 · 폭심 확대 · ${rangeLabel}`
    case 'zone-control':
      return weapon.attackBehavior.zoneTriggerMode === 'trigger-explode'
        ? `Lv.${playerStats.level} 공명 · 함정 유지 · 폭발 확대`
        : `Lv.${playerStats.level} 공명 · 포드 지속 · 장판 강화`
    case 'deploy-turret':
      return `Lv.${playerStats.level} 공명 · 포탑 증설 · ${rangeLabel}`
    case 'melee-cleave':
      return `Lv.${playerStats.level} 공명 · 범위/타깃 강화 · ${rangeLabel}`
    case 'combo-melee':
      return `Lv.${playerStats.level} 공명 · 콤보 강화 · ${rangeLabel}`
    default:
      return `Lv.${playerStats.level} 공명 · ${rangeLabel}`
  }
}

function getWeaponLevelUpgradeDescription(
  weapon: WeaponDefinition,
  playerStats: PlayerLevelCombatStats,
): string {
  switch (weapon.attackBehavior.kind) {
    case 'single':
      return weapon.attackBehavior.boomerang
        ? '캐릭터 레벨 공명으로 귀환 속도와 왕복 타격이 함께 강화됐습니다.'
        : weapon.attackBehavior.distanceScaling
          ? '캐릭터 레벨 공명으로 멀리서 맞힐수록 피해가 더 크게 압축됩니다.'
          : `캐릭터 레벨 공명으로 무기 성능이 ${Math.round((playerStats.damageMultiplier - 1) * 100)}%만큼 증폭됐습니다.`
    case 'split-shot':
      return '캐릭터 레벨 공명으로 갈래 수가 늘어나 전방 차단 폭이 넓어졌습니다.'
    case 'burst-fire':
      return '캐릭터 레벨 공명으로 점사 박자가 늘어나 한 번 잡힌 라인을 더 오래 누릅니다.'
    case 'pierce':
      return '캐릭터 레벨 공명으로 관통 한계가 더 넓어졌습니다.'
    case 'chain':
      return '캐릭터 레벨 공명으로 전하가 더 멀리, 더 많이 이어집니다.'
    case 'volley':
      return '캐릭터 레벨 공명으로 연사 수가 늘어나 전방 압박이 더 촘촘해졌습니다.'
    case 'spray-hazard':
      return '캐릭터 레벨 공명으로 탄막 수와 장판 위력이 커졌습니다.'
    case 'impact-burst':
      return '캐릭터 레벨 공명으로 착탄 폭발 반경과 여파가 함께 강화됐습니다.'
    case 'impact-aoe':
      return '캐릭터 레벨 공명으로 폭심지 반경과 폭발 피해가 동시에 커졌습니다.'
    case 'zone-control':
      return weapon.attackBehavior.zoneTriggerMode === 'trigger-explode'
        ? '캐릭터 레벨 공명으로 폭발 문장이 더 오래 남고 터질 때의 반경과 위력이 함께 커졌습니다.'
        : '캐릭터 레벨 공명으로 감시 구역이 더 오래 남고 틱 피해가 더 단단해졌습니다.'
    case 'deploy-turret':
      return '캐릭터 레벨 공명으로 포탑 유지 시간과 자동 사격 화력이 함께 강화됐습니다.'
    case 'melee-cleave':
      return '캐릭터 레벨 공명으로 휘두르는 각도와 타깃 수가 확장됐습니다.'
    case 'combo-melee':
      return '캐릭터 레벨 공명으로 콤보 마지막 피니시 범위와 마무리 화력이 커졌습니다.'
    default:
      return `캐릭터 레벨 공명으로 무기 성능이 ${Math.round((playerStats.damageMultiplier - 1) * 100)}%만큼 증폭됐습니다.`
  }
}

function applyPlayerLevelWeaponMilestones(
  behavior: WeaponDefinition['attackBehavior'],
  playerStats: PlayerLevelCombatStats,
): WeaponDefinition['attackBehavior'] {
  const specialTier = playerStats.weaponSpecialTier

  switch (behavior.kind) {
    case 'single':
      if (behavior.boomerang) {
        return {
          ...behavior,
          boomerang: {
            ...behavior.boomerang,
            outboundDistance: Math.round(behavior.boomerang.outboundDistance * playerStats.weaponRangeMultiplier),
            returnDamageMultiplier: (behavior.boomerang.returnDamageMultiplier ?? 1) + 0.12 * specialTier,
            returnHits: (behavior.boomerang.returnHits ?? 1) + specialTier,
          },
        }
      }
      if (behavior.distanceScaling) {
        return {
          ...behavior,
          distanceScaling: {
            nearMultiplier: behavior.distanceScaling.nearMultiplier + 0.04 * specialTier,
            farMultiplier: behavior.distanceScaling.farMultiplier + 0.18 * specialTier,
          },
        }
      }
      return behavior
    case 'split-shot':
      return {
        ...behavior,
        projectileCount: behavior.projectileCount + specialTier,
      }
    case 'burst-fire':
      return {
        ...behavior,
        shotsPerBurst: behavior.shotsPerBurst + specialTier,
      }
    case 'pierce':
      return {
        ...behavior,
        maxHits: behavior.maxHits + specialTier,
      }
    case 'chain':
      return {
        ...behavior,
        maxChains: behavior.maxChains + specialTier,
        chainRange: Math.round(behavior.chainRange * playerStats.weaponRangeMultiplier),
        chainFalloff: Math.max(0.35, behavior.chainFalloff - 0.03 * specialTier),
      }
    case 'volley':
      return {
        ...behavior,
        projectileCount: behavior.projectileCount + specialTier,
      }
    case 'spray-hazard':
      return {
        ...behavior,
        projectileCount: behavior.projectileCount + specialTier,
        hazardRadius: Math.round(behavior.hazardRadius * playerStats.weaponRangeMultiplier),
        hazardDamage: Math.max(1, Math.round(behavior.hazardDamage * playerStats.damageMultiplier)),
      }
    case 'impact-burst':
      return {
        ...behavior,
        splashRadius: Math.round(behavior.splashRadius * playerStats.weaponRangeMultiplier),
        splashDamageMultiplier: Math.min(0.95, behavior.splashDamageMultiplier + 0.08 * specialTier),
      }
    case 'impact-aoe':
      return {
        ...behavior,
        explosionRadius: Math.round(behavior.explosionRadius * playerStats.weaponRangeMultiplier),
        explosionDamage: Math.max(1, Math.round(behavior.explosionDamage * playerStats.damageMultiplier)),
      }
    case 'zone-control':
      return {
        ...behavior,
        zoneRadius: Math.round(behavior.zoneRadius * playerStats.weaponRangeMultiplier),
        zoneDurationMs: behavior.zoneDurationMs + 220 * specialTier,
        zoneDamage: Math.max(1, Math.round(behavior.zoneDamage * playerStats.damageMultiplier)),
      }
    case 'deploy-turret':
      return {
        ...behavior,
        deploy: {
          ...behavior.deploy,
          maxTurrets: behavior.deploy.maxTurrets + Math.floor((specialTier + 1) / 2),
          durationMs: behavior.deploy.durationMs + 260 * specialTier,
          range: Math.round(behavior.deploy.range * playerStats.weaponRangeMultiplier),
          projectileDamage: Math.max(1, Math.round(behavior.deploy.projectileDamage * playerStats.damageMultiplier)),
        },
      }
    case 'melee-cleave':
      return {
        ...behavior,
        range: Math.round(behavior.range * playerStats.weaponRangeMultiplier),
        arcDegrees: Math.min(160, behavior.arcDegrees + 6 * specialTier),
        maxTargets: behavior.maxTargets + specialTier,
      }
    case 'combo-melee':
      return {
        ...behavior,
        steps: behavior.steps.map((step, index) => ({
          ...step,
          range: Math.round(step.range * playerStats.weaponRangeMultiplier),
          maxTargets: step.maxTargets + (index === behavior.steps.length - 1 ? specialTier : 0),
          damageMultiplier: step.damageMultiplier + (index === behavior.steps.length - 1 ? 0.08 * specialTier : 0.03 * specialTier),
        })),
      }
    default:
      return behavior
  }
}

function selectTuningEffect(random: RandomSource): TuningEffectId {
  const index = Math.min(
    TUNING_EFFECT_DEFINITIONS.length - 1,
    Math.max(0, Math.floor(random() * TUNING_EFFECT_DEFINITIONS.length)),
  )

  return TUNING_EFFECT_DEFINITIONS[index].id
}
