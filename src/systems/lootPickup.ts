export const LEGACY_LOOT_PICKUP_DISTANCE = 20
export const LOOT_ATTRACTION_RADIUS = 72
export const LOOT_COLLECT_RADIUS = 32

export type LootPickupPhase = 'idle' | 'attract' | 'collect'

export function getLootPickupPhase(
  distance: number,
  attractionRadius = LOOT_ATTRACTION_RADIUS,
): LootPickupPhase {
  const safeAttractionRadius = Math.max(LOOT_COLLECT_RADIUS, attractionRadius)
  if (!Number.isFinite(distance) || distance > safeAttractionRadius) {
    return 'idle'
  }

  if (distance <= LOOT_COLLECT_RADIUS) {
    return 'collect'
  }

  return 'attract'
}

export function getLootAttractionStep(
  distance: number,
  deltaMs: number,
  attractionRadius = LOOT_ATTRACTION_RADIUS,
): number {
  if (getLootPickupPhase(distance, attractionRadius) !== 'attract') {
    return 0
  }

  const safeDeltaSeconds = Math.max(0, deltaMs) / 1000
  const safeAttractionRadius = Math.max(LOOT_COLLECT_RADIUS, attractionRadius)
  const attractionBand = safeAttractionRadius - LOOT_COLLECT_RADIUS
  const distanceIntoBand = safeAttractionRadius - distance
  const proximityRatio = distanceIntoBand / attractionBand
  const clampedRatio = Math.min(1, Math.max(0, proximityRatio))
  const radiusBoost = safeAttractionRadius > LOOT_ATTRACTION_RADIUS ? 2.4 : 1
  const attractionSpeed = (90 + clampedRatio * 150) * radiusBoost
  return attractionSpeed * safeDeltaSeconds
}
