import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { InventoryState, WeaponDefinition, WeaponId, WeaponStar } from '../domain/types.js'
import { consumeItems } from './inventory.js'

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
): EffectiveWeaponStats {
  const weapon = WEAPON_DEFINITIONS[weaponId]
  const effectId = tuningState[weaponId]
  const effect = TUNING_EFFECT_DEFINITIONS.find((candidate) => candidate.id === effectId)
  const starBonusSteps = Math.max(0, star - 1)
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
  const attackBehavior = baseAttackBehavior.kind === 'melee-cleave' && starBonusSteps > 0
    ? {
        ...baseAttackBehavior,
        range: baseAttackBehavior.range + STAR_MELEE_RANGE_STEP * starBonusSteps,
      }
    : baseAttackBehavior

  const effectiveWeapon: EffectiveWeaponStats = {
    ...weapon,
    damage: Math.round(tunedDamage * (1 + STAR_DAMAGE_MULTIPLIER_STEP * starBonusSteps)),
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

  return effectiveWeapon
}

function selectTuningEffect(random: RandomSource): TuningEffectId {
  const index = Math.min(
    TUNING_EFFECT_DEFINITIONS.length - 1,
    Math.max(0, Math.floor(random() * TUNING_EFFECT_DEFINITIONS.length)),
  )

  return TUNING_EFFECT_DEFINITIONS[index].id
}
