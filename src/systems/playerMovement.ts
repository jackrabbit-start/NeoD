export interface MovementVector {
  x: number
  y: number
}

export interface PlayerMovementStep {
  velocity: MovementVector
  normalizedInput: MovementVector
  isInputActive: boolean
  isMoving: boolean
}

export const PLAYER_MOVEMENT_ACCELERATION = 18
export const PLAYER_MOVEMENT_DECELERATION = 28
export const PLAYER_MOVEMENT_MAX_DELTA_MS = 50
export const PLAYER_MOVEMENT_REST_SPEED_EPSILON = 2

export function normalizeMovementInput(input: MovementVector): MovementVector {
  const length = Math.hypot(input.x, input.y)
  if (length <= 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: input.x / length,
    y: input.y / length,
  }
}

export function resolvePlayerMovementStep(
  input: MovementVector,
  currentVelocity: MovementVector,
  speed: number,
  deltaMs: number,
): PlayerMovementStep {
  const normalizedInput = normalizeMovementInput(input)
  const isInputActive = normalizedInput.x !== 0 || normalizedInput.y !== 0
  const targetVelocity = {
    x: normalizedInput.x * speed,
    y: normalizedInput.y * speed,
  }
  const clampedDeltaSeconds = Math.max(0, Math.min(deltaMs, PLAYER_MOVEMENT_MAX_DELTA_MS)) / 1000
  const smoothingRate = isInputActive ? PLAYER_MOVEMENT_ACCELERATION : PLAYER_MOVEMENT_DECELERATION
  const smoothingFactor = 1 - Math.exp(-smoothingRate * clampedDeltaSeconds)
  const velocity = {
    x: currentVelocity.x + (targetVelocity.x - currentVelocity.x) * smoothingFactor,
    y: currentVelocity.y + (targetVelocity.y - currentVelocity.y) * smoothingFactor,
  }

  if (!isInputActive && Math.hypot(velocity.x, velocity.y) < PLAYER_MOVEMENT_REST_SPEED_EPSILON) {
    velocity.x = 0
    velocity.y = 0
  }

  return {
    velocity,
    normalizedInput,
    isInputActive,
    isMoving: isInputActive || Math.hypot(velocity.x, velocity.y) >= PLAYER_MOVEMENT_REST_SPEED_EPSILON,
  }
}
