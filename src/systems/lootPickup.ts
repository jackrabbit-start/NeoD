export const LEGACY_LOOT_PICKUP_DISTANCE = 20
export const LOOT_ATTRACTION_RADIUS = 72
export const LOOT_COLLECT_RADIUS = 32

export type LootPickupPhase = 'idle' | 'attract' | 'collect'

export function getLootPickupPhase(distance: number): LootPickupPhase {
  if (!Number.isFinite(distance) || distance > LOOT_ATTRACTION_RADIUS) {
    return 'idle'
  }

  if (distance <= LOOT_COLLECT_RADIUS) {
    return 'collect'
  }

  return 'attract'
}

export function getLootAttractionStep(distance: number, deltaMs: number): number {
  if (getLootPickupPhase(distance) !== 'attract') {
    return 0
  }

  const safeDeltaSeconds = Math.max(0, deltaMs) / 1000
  const attractionBand = LOOT_ATTRACTION_RADIUS - LOOT_COLLECT_RADIUS
  const distanceIntoBand = LOOT_ATTRACTION_RADIUS - distance
  const proximityRatio = distanceIntoBand / attractionBand
  const clampedRatio = Math.min(1, Math.max(0, proximityRatio))
  const attractionSpeed = 90 + clampedRatio * 150
  return attractionSpeed * safeDeltaSeconds
}
