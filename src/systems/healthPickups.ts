export const HEART_PICKUP_TEXTURE_KEY = 'heart-pickup'
export const HEART_PICKUP_COLOR = 0xff5c8a
export const HEART_PICKUP_HEAL_AMOUNT = 24
export const HEART_PICKUP_MAX_ACTIVE = 3
export const HEART_PICKUP_INITIAL_DELAY_MS = 6_000
export const HEART_PICKUP_INTERVAL_MS = 12_000
export const HEART_PICKUP_RANDOM_JITTER_MS = 4_000

export type RandomSource = () => number

export function getHealedPlayerHealth(
  currentHealth: number,
  maxHealth: number,
  healAmount = HEART_PICKUP_HEAL_AMOUNT,
): number {
  if (maxHealth <= 0 || healAmount <= 0) {
    return Math.max(0, currentHealth)
  }

  return Math.min(maxHealth, Math.max(0, currentHealth) + healAmount)
}

export function shouldSpawnHeartPickup(
  timeMs: number,
  nextSpawnAtMs: number,
  activePickups: number,
  maxActive = HEART_PICKUP_MAX_ACTIVE,
): boolean {
  return activePickups < maxActive && timeMs >= nextSpawnAtMs
}

export function getInitialHeartPickupSpawnAt(startTimeMs: number): number {
  return startTimeMs + HEART_PICKUP_INITIAL_DELAY_MS
}

export function getNextHeartPickupSpawnAt(
  timeMs: number,
  random: RandomSource = Math.random,
): number {
  const jitter = Math.round(Math.max(0, Math.min(0.999, random())) * HEART_PICKUP_RANDOM_JITTER_MS)
  return timeMs + HEART_PICKUP_INTERVAL_MS + jitter
}
