import {
  resolveNearestTargetCandidate,
  type TargetCandidate,
  type TargetPoint,
  type TargetSelection,
} from '../../systems/targeting.js'

export type AutoAttackPoint = TargetPoint
export type AutoAttackCandidate = TargetCandidate

export type AutoAttackTarget = TargetSelection

export interface AutoAttackWindow {
  isInteractionBlocked: boolean
  time: number
  nextFireAt: number
  maxRange?: number
}

export function resolveNearestAutoAttackTarget(
  origin: AutoAttackPoint,
  candidates: AutoAttackCandidate[],
  maxRange?: number,
): AutoAttackTarget | null {
  return resolveNearestTargetCandidate(origin, candidates, maxRange)
}

export function resolveAutoAttackShot(
  origin: AutoAttackPoint,
  candidates: AutoAttackCandidate[],
  window: AutoAttackWindow,
): AutoAttackTarget | null {
  if (window.isInteractionBlocked || window.time < window.nextFireAt) {
    return null
  }

  return resolveNearestAutoAttackTarget(origin, candidates, window.maxRange)
}
