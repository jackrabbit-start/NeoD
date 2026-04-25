export interface TargetPoint {
  x: number
  y: number
}

export interface TargetCandidate extends TargetPoint {
  isActive?: boolean
  radius?: number
}

export interface TargetSelection extends TargetPoint {
  directionX: number
  directionY: number
  distanceSq: number
}

const isCandidateInRange = (
  origin: TargetPoint,
  candidate: TargetCandidate,
  maxRange: number | undefined,
): boolean => {
  if (maxRange == null) {
    return true
  }

  const radius = Math.max(0, candidate.radius ?? 0)
  const effectiveRange = Math.max(0, maxRange) + radius
  const deltaX = candidate.x - origin.x
  const deltaY = candidate.y - origin.y

  return deltaX * deltaX + deltaY * deltaY <= effectiveRange * effectiveRange
}

export function resolveNearestTargetCandidate(
  origin: TargetPoint,
  candidates: TargetCandidate[],
  maxRange?: number,
): TargetSelection | null {
  let nearestCandidate: TargetCandidate | null = null
  let nearestDistanceSq = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    if (candidate.isActive === false) {
      continue
    }

    if (!isCandidateInRange(origin, candidate, maxRange)) {
      continue
    }

    const deltaX = candidate.x - origin.x
    const deltaY = candidate.y - origin.y
    const distanceSq = deltaX * deltaX + deltaY * deltaY

    if (distanceSq >= nearestDistanceSq) {
      continue
    }

    nearestCandidate = candidate
    nearestDistanceSq = distanceSq
  }

  if (!nearestCandidate) {
    return null
  }

  if (nearestDistanceSq === 0) {
    return {
      x: nearestCandidate.x,
      y: nearestCandidate.y,
      directionX: 0,
      directionY: -1,
      distanceSq: 0,
    }
  }

  const distance = Math.sqrt(nearestDistanceSq)

  return {
    x: nearestCandidate.x,
    y: nearestCandidate.y,
    directionX: (nearestCandidate.x - origin.x) / distance,
    directionY: (nearestCandidate.y - origin.y) / distance,
    distanceSq: nearestDistanceSq,
  }
}
