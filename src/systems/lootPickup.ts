export const LEGACY_LOOT_PICKUP_DISTANCE = 20
export const LOOT_ATTRACTION_RADIUS = 72
export const LOOT_COLLECT_RADIUS = 32
export const LOOT_ATTRACTION_SETTLE_EPSILON = 1

export type LootPickupPhase = 'idle' | 'attract' | 'collect'

export interface LootPickupTuning {
  attractionRadius?: number
  collectRadius?: number
  attractionSpeedMultiplier?: number
}

type LootPickupTuningInput = LootPickupTuning | number | undefined

function normalizeLootPickupTuning(tuning?: LootPickupTuningInput): LootPickupTuning | undefined {
  if (typeof tuning === 'number') {
    return {
      attractionRadius: tuning,
    }
  }

  return tuning
}

function getEffectiveAttractionRadius(tuning?: LootPickupTuningInput): number {
  const normalized = normalizeLootPickupTuning(tuning)
  const collectRadius = Math.max(1, normalized?.collectRadius ?? LOOT_COLLECT_RADIUS)
  const attractionRadius = normalized?.attractionRadius ?? LOOT_ATTRACTION_RADIUS
  const safeAttractionRadius = Math.max(collectRadius, attractionRadius)
  const epsilonBoost = typeof tuning === 'number' && safeAttractionRadius > LOOT_ATTRACTION_RADIUS ? 0.01 : 0
  return safeAttractionRadius + epsilonBoost
}

function getEffectiveCollectRadius(tuning?: LootPickupTuningInput): number {
  const normalized = normalizeLootPickupTuning(tuning)
  return Math.max(1, normalized?.collectRadius ?? LOOT_COLLECT_RADIUS)
}

export function getLootPickupPhase(distance: number, tuning?: LootPickupTuningInput): LootPickupPhase {
  const normalized = normalizeLootPickupTuning(tuning)
  const attractionRadius = getEffectiveAttractionRadius(tuning)
  const collectRadius = getEffectiveCollectRadius(normalized)

  if (!Number.isFinite(distance) || distance > attractionRadius) {
    return 'idle'
  }

  if (distance <= collectRadius) {
    return 'collect'
  }

  return 'attract'
}


export function getLootAttractionTravelDistance(
  distance: number,
  deltaMs: number,
  tuning?: LootPickupTuningInput,
): number {
  const normalized = normalizeLootPickupTuning(tuning)
  const collectRadius = getEffectiveCollectRadius(normalized)
  const step = getLootAttractionStep(distance, deltaMs, tuning)
  if (step <= 0 || distance <= 0) {
    return 0
  }

  const collectBoundaryDistance = Math.max(0, distance - collectRadius)
  if (step >= collectBoundaryDistance) {
    return Math.min(distance, collectBoundaryDistance + LOOT_ATTRACTION_SETTLE_EPSILON)
  }

  return step
}

export function getLootAttractionStep(distance: number, deltaMs: number, tuning?: LootPickupTuningInput): number {
  const normalized = normalizeLootPickupTuning(tuning)
  const attractionRadius = getEffectiveAttractionRadius(tuning)
  const collectRadius = getEffectiveCollectRadius(normalized)

  if (getLootPickupPhase(distance, tuning) !== 'attract') {
    return 0
  }

  const safeDeltaSeconds = Math.max(0, deltaMs) / 1000
  const attractionBand = attractionRadius - collectRadius
  const distanceIntoBand = attractionRadius - distance
  const proximityRatio = distanceIntoBand / attractionBand
  const clampedRatio = Math.min(1, Math.max(0, proximityRatio))
  const attractionSpeed = (90 + clampedRatio * 150) * Math.max(0.1, normalized?.attractionSpeedMultiplier ?? 1)
  return attractionSpeed * safeDeltaSeconds
}
