import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { InventoryState, WeaponDefinition, WeaponId } from '../domain/types.js'
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

export interface EffectiveWeaponStats extends WeaponDefinition {
  tuningEffectId?: TuningEffectId
  tuningLabel?: string
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
): EffectiveWeaponStats {
  const weapon = WEAPON_DEFINITIONS[weaponId]
  const effectId = tuningState[weaponId]
  const effect = TUNING_EFFECT_DEFINITIONS.find((candidate) => candidate.id === effectId)

  if (!effect) {
    return { ...weapon }
  }

  return {
    ...weapon,
    damage: weapon.damage + ('damageDelta' in effect ? effect.damageDelta : 0),
    fireRateMs: Math.round(
      weapon.fireRateMs * ('fireRateMultiplier' in effect ? effect.fireRateMultiplier : 1),
    ),
    projectileSpeed:
      weapon.projectileSpeed + ('projectileSpeedDelta' in effect ? effect.projectileSpeedDelta : 0),
    tuningEffectId: effect.id,
    tuningLabel: effect.label,
  }
}

function selectTuningEffect(random: RandomSource): TuningEffectId {
  const index = Math.min(
    TUNING_EFFECT_DEFINITIONS.length - 1,
    Math.max(0, Math.floor(random() * TUNING_EFFECT_DEFINITIONS.length)),
  )

  return TUNING_EFFECT_DEFINITIONS[index].id
}
