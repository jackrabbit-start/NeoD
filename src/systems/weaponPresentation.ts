import type { WeaponDefinition } from '../domain/types.js'
import {
  resolveNearestTargetCandidate,
  type TargetCandidate,
  type TargetPoint,
} from './targeting.js'

export interface WeaponPresentationVector {
  x: number
  y: number
}

export type WeaponPresentationFacingSource =
  | 'nearest-target'
  | 'remembered'
  | 'dash'
  | 'move'
  | 'fallback'

export interface WeaponPresentationFacingInput {
  origin: TargetPoint
  candidates: TargetCandidate[]
  maxRange?: number
  isInteractionBlocked: boolean
  rememberedDirection?: WeaponPresentationVector | null
  isDashing?: boolean
  dashDirection?: WeaponPresentationVector | null
  moveDirection?: WeaponPresentationVector | null
  fallbackDirection?: WeaponPresentationVector | null
}

export interface WeaponPresentationFacing {
  direction: WeaponPresentationVector
  source: WeaponPresentationFacingSource
}

export interface EquippedWeaponPresentation {
  textureKey: string
  offset: WeaponPresentationVector
  rotation: number
  flipY: boolean
  scale: number
  depth: number
}

export interface EquippedWeaponTextureRefresh {
  textureKey: string
  shouldRefresh: boolean
}

const DEFAULT_FACING: WeaponPresentationVector = { x: 1, y: 0 }
const RANGED_FORWARD_OFFSET = 20
const MELEE_FORWARD_OFFSET = 27
const RANGED_SIDE_OFFSET = -5
const MELEE_SIDE_OFFSET = -3
export const HELD_WEAPON_DEPTH = 0.85

const normalizeDirection = (
  direction: WeaponPresentationVector | null | undefined,
): WeaponPresentationVector | null => {
  if (!direction) {
    return null
  }

  const length = Math.hypot(direction.x, direction.y)
  if (length <= 1e-6) {
    return null
  }

  return {
    x: direction.x / length,
    y: direction.y / length,
  }
}

export function resolveWeaponPresentationFacing(
  input: WeaponPresentationFacingInput,
): WeaponPresentationFacing {
  if (!input.isInteractionBlocked) {
    const nearestTarget = resolveNearestTargetCandidate(input.origin, input.candidates, input.maxRange)
    if (nearestTarget) {
      return {
        direction: {
          x: nearestTarget.directionX,
          y: nearestTarget.directionY,
        },
        source: 'nearest-target',
      }
    }
  }

  const rememberedDirection = normalizeDirection(input.rememberedDirection)
  if (rememberedDirection) {
    return {
      direction: rememberedDirection,
      source: 'remembered',
    }
  }

  const dashDirection = input.isDashing ? normalizeDirection(input.dashDirection) : null
  if (dashDirection) {
    return {
      direction: dashDirection,
      source: 'dash',
    }
  }

  const moveDirection = normalizeDirection(input.moveDirection)
  if (moveDirection) {
    return {
      direction: moveDirection,
      source: 'move',
    }
  }

  return {
    direction: normalizeDirection(input.fallbackDirection) ?? DEFAULT_FACING,
    source: 'fallback',
  }
}

export function resolveEquippedWeaponPresentation(
  weapon: WeaponDefinition,
  facingDirection: WeaponPresentationVector,
): EquippedWeaponPresentation {
  const direction = normalizeDirection(facingDirection) ?? DEFAULT_FACING
  const perpendicular = { x: -direction.y, y: direction.x }
  const isMelee = weapon.attackBehavior.kind === 'melee-cleave'
  const forwardOffset = isMelee ? MELEE_FORWARD_OFFSET : RANGED_FORWARD_OFFSET
  const sideOffset = isMelee ? MELEE_SIDE_OFFSET : RANGED_SIDE_OFFSET
  const powerScale = Math.min(0.12, Math.max(0, weapon.visualPowerTier ?? 0) * 0.03)

  return {
    textureKey: weapon.visual.hudIconKey,
    offset: {
      x: direction.x * forwardOffset + perpendicular.x * sideOffset,
      y: direction.y * forwardOffset + perpendicular.y * sideOffset,
    },
    rotation: Math.atan2(direction.y, direction.x),
    flipY: direction.x < 0,
    scale: (isMelee ? 0.24 : 0.2) + powerScale,
    depth: HELD_WEAPON_DEPTH,
  }
}

export function resolveEquippedWeaponTextureRefresh(
  currentTextureKey: string | null,
  weapon: WeaponDefinition,
): EquippedWeaponTextureRefresh {
  return {
    textureKey: weapon.visual.hudIconKey,
    shouldRefresh: currentTextureKey !== weapon.visual.hudIconKey,
  }
}
