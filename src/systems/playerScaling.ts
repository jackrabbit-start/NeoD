export const BASE_PLAYER_MAX_HEALTH = 100
export const PLAYER_HEALTH_PER_LEVEL = 8
export const PLAYER_DAMAGE_MULTIPLIER_PER_LEVEL = 0.05
export const WEAPON_RANGE_STEP_PER_5_LEVELS = 0.08
export const WEAPON_SPECIAL_STEP_PER_10_LEVELS = 1

export interface PlayerLevelCombatStats {
  level: number
  maxHealth: number
  damageMultiplier: number
  weaponRangeMultiplier: number
  weaponSpecialTier: number
}

export function getPlayerLevelCombatStats(level: number): PlayerLevelCombatStats {
  const normalizedLevel = Math.max(1, Math.floor(level))
  const bonusLevels = normalizedLevel - 1
  const rangeTier = Math.floor(normalizedLevel / 5)
  const weaponSpecialTier = Math.floor(normalizedLevel / 10) * WEAPON_SPECIAL_STEP_PER_10_LEVELS

  return {
    level: normalizedLevel,
    maxHealth: BASE_PLAYER_MAX_HEALTH + PLAYER_HEALTH_PER_LEVEL * bonusLevels,
    damageMultiplier: 1 + PLAYER_DAMAGE_MULTIPLIER_PER_LEVEL * bonusLevels,
    weaponRangeMultiplier: 1 + WEAPON_RANGE_STEP_PER_5_LEVELS * rangeTier,
    weaponSpecialTier,
  }
}
