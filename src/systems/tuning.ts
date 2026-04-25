import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { InventoryState, WeaponDefinition, WeaponId, WeaponStar } from '../domain/types.js'
import { consumeItems } from './inventory.js'
import { getPlayerLevelCombatStats, type PlayerLevelCombatStats } from './playerScaling.js'

export const TUNING_CAPSULE_ITEM_ID = 'tuning-capsule'
export const STARTER_TUNING_INELIGIBLE_WEAPON_ID: WeaponId = 'starter-blaster'

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

export const STAR_DAMAGE_MULTIPLIER_STEP = 0.18
export const STAR_FIRE_RATE_MULTIPLIER_STEP = 0.06
export const STAR_PROJECTILE_SPEED_MULTIPLIER_STEP = 0.08
export const STAR_MELEE_RANGE_STEP = 6

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
  const baseAttackBehavior = effect && weapon.attackBehavior.kind === 'melee-cleave' && 'meleeRangeDelta' in effect
    ? {
        ...weapon.attackBehavior,
        range: weapon.attackBehavior.range + effect.meleeRangeDelta,
      }
    : weapon.attackBehavior
  const attackBehavior = applyPlayerLevelWeaponMilestones(
    baseAttackBehavior.kind === 'melee-cleave' && starBonusSteps > 0
      ? {
          ...baseAttackBehavior,
          range: baseAttackBehavior.range + STAR_MELEE_RANGE_STEP * starBonusSteps,
        }
      : baseAttackBehavior,
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

function getWeaponLevelUpgradeLabel(
  weapon: WeaponDefinition,
  playerStats: PlayerLevelCombatStats,
): string {
  const rangeLabel = playerStats.weaponRangeMultiplier > 1
    ? `범위 +${Math.round((playerStats.weaponRangeMultiplier - 1) * 100)}%`
    : '기본 범위'

  switch (weapon.attackBehavior.kind) {
    case 'single':
      return `Lv.${playerStats.level} 공명 · 관통 ${playerStats.weaponSpecialTier + 1}회 · ${rangeLabel}`
    case 'pierce':
      return `Lv.${playerStats.level} 공명 · 관통 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'chain':
      return `Lv.${playerStats.level} 공명 · 연계 +${playerStats.weaponSpecialTier} · ${rangeLabel}`
    case 'spray-hazard':
      return `Lv.${playerStats.level} 공명 · 탄막 +${playerStats.weaponSpecialTier} · 장판 강화`
    case 'melee-cleave':
      return `Lv.${playerStats.level} 공명 · 범위/타깃 강화 · ${rangeLabel}`
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
      return '캐릭터 레벨 공명으로 단발 탄이 관통탄처럼 진화했습니다.'
    case 'pierce':
      return '캐릭터 레벨 공명으로 관통 한계가 더 넓어졌습니다.'
    case 'chain':
      return '캐릭터 레벨 공명으로 전하가 더 멀리, 더 많이 이어집니다.'
    case 'spray-hazard':
      return '캐릭터 레벨 공명으로 탄막 수와 장판 위력이 커졌습니다.'
    case 'melee-cleave':
      return '캐릭터 레벨 공명으로 휘두르는 각도와 타깃 수가 확장됐습니다.'
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
      if (specialTier <= 0) {
        return behavior
      }

      return {
        kind: 'pierce',
        projectileLifetimeMs: behavior.projectileLifetimeMs,
        maxHits: 1 + specialTier,
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
    case 'spray-hazard':
      return {
        ...behavior,
        projectileCount: behavior.projectileCount + specialTier,
        hazardRadius: Math.round(behavior.hazardRadius * playerStats.weaponRangeMultiplier),
        hazardDamage: Math.max(1, Math.round(behavior.hazardDamage * playerStats.damageMultiplier)),
      }
    case 'melee-cleave':
      return {
        ...behavior,
        range: Math.round(behavior.range * playerStats.weaponRangeMultiplier),
        arcDegrees: Math.min(160, behavior.arcDegrees + 6 * specialTier),
        maxTargets: behavior.maxTargets + specialTier,
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
