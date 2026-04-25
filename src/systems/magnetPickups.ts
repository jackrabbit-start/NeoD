export const MAGNET_PICKUP_TEXTURE_KEY = 'magnet-pickup'
export const MAGNET_PICKUP_COLOR = 0x66d9ef
export const MAGNET_PICKUP_MAX_ACTIVE = 2
export const MAGNET_PICKUP_INITIAL_DELAY_MS = 10_000
export const MAGNET_PICKUP_INTERVAL_MS = 18_000
export const MAGNET_PICKUP_RANDOM_JITTER_MS = 6_000
export const MAGNET_PICKUP_DURATION_MS = 5_000
export const MAGNET_PICKUP_ATTRACTION_RADIUS = 640

export type RandomSource = () => number

export function shouldSpawnMagnetPickup(
  timeMs: number,
  nextSpawnAtMs: number,
  activePickups: number,
  maxActive = MAGNET_PICKUP_MAX_ACTIVE,
): boolean {
  return activePickups < maxActive && timeMs >= nextSpawnAtMs
}

export function getInitialMagnetPickupSpawnAt(startTimeMs: number): number {
  return startTimeMs + MAGNET_PICKUP_INITIAL_DELAY_MS
}

export function getNextMagnetPickupSpawnAt(
  timeMs: number,
  random: RandomSource = Math.random,
): number {
  const jitter = Math.round(Math.max(0, Math.min(0.999, random())) * MAGNET_PICKUP_RANDOM_JITTER_MS)
  return timeMs + MAGNET_PICKUP_INTERVAL_MS + jitter
}

export function getMagnetizedUntil(currentTimeMs: number): number {
  return currentTimeMs + MAGNET_PICKUP_DURATION_MS
}

export function isMagnetActive(timeMs: number, magnetizedUntilMs: number): boolean {
  return timeMs < magnetizedUntilMs
}
