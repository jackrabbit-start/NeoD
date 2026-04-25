export const LEGACY_LOOT_PICKUP_DISTANCE = 20
export const LOOT_ATTRACTION_RADIUS = 72
export const LOOT_COLLECT_RADIUS = 32

export type LootPickupPhase = 'idle' | 'attract' | 'collect'

export interface LootPickupTuning {
  attractionRadius?: number
  collectRadius?: number
  attractionSpeedMultiplier?: number
}

function getEffectiveAttractionRadius(tuning?: LootPickupTuning): number {
  return Math.max(LOOT_COLLECT_RADIUS + 1, tuning?.attractionRadius ?? LOOT_ATTRACTION_RADIUS)
}

function getEffectiveCollectRadius(tuning?: LootPickupTuning): number {
  return Math.max(1, tuning?.collectRadius ?? LOOT_COLLECT_RADIUS)
}

export function getLootPickupPhase(distance: number, tuning?: LootPickupTuning): LootPickupPhase {
  const attractionRadius = getEffectiveAttractionRadius(tuning)
  const collectRadius = getEffectiveCollectRadius(tuning)

  if (!Number.isFinite(distance) || distance > attractionRadius) {
    return 'idle'
  }

  if (distance <= collectRadius) {
    return 'collect'
  }

  return 'attract'
}

export function getLootAttractionStep(distance: number, deltaMs: number, tuning?: LootPickupTuning): number {
  const attractionRadius = getEffectiveAttractionRadius(tuning)
  const collectRadius = getEffectiveCollectRadius(tuning)

  if (getLootPickupPhase(distance, tuning) !== 'attract') {
    return 0
  }

  const safeDeltaSeconds = Math.max(0, deltaMs) / 1000
  const attractionBand = attractionRadius - collectRadius
  const distanceIntoBand = attractionRadius - distance
  const proximityRatio = distanceIntoBand / attractionBand
  const clampedRatio = Math.min(1, Math.max(0, proximityRatio))
  const attractionSpeed = (90 + clampedRatio * 150) * Math.max(0.1, tuning?.attractionSpeedMultiplier ?? 1)
  return attractionSpeed * safeDeltaSeconds
}
