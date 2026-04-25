export interface AutoAttackPoint {
  x: number
  y: number
}

export interface AutoAttackCandidate extends AutoAttackPoint {
  isActive?: boolean
}

export interface AutoAttackTarget extends AutoAttackPoint {
  directionX: number
  directionY: number
  distanceSq: number
}

export interface AutoAttackWindow {
  isInteractionBlocked: boolean
  time: number
  nextFireAt: number
}

export function resolveNearestAutoAttackTarget(
  origin: AutoAttackPoint,
  candidates: AutoAttackCandidate[],
): AutoAttackTarget | null {
  let nearestCandidate: AutoAttackCandidate | null = null
  let nearestDistanceSq = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    if (candidate.isActive === false) {
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

export function resolveAutoAttackShot(
  origin: AutoAttackPoint,
  candidates: AutoAttackCandidate[],
  window: AutoAttackWindow,
): AutoAttackTarget | null {
  if (window.isInteractionBlocked || window.time < window.nextFireAt) {
    return null
  }

  return resolveNearestAutoAttackTarget(origin, candidates)
}
