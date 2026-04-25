export const PLAYER_COLLISION_RADIUS = 14
export const PROJECTILE_COLLISION_RADIUS = 5
export const PROJECTILE_HIT_PADDING = 7
export const ENEMY_CONTACT_PADDING = 16

export interface RectBounds {
  x: number
  y: number
  width: number
  height: number
}

export const COMBAT_RECT: RectBounds = { x: 0, y: 0, width: 720, height: 540 }
export const PACHINKO_DIVIDER_X = 728
export const PACHINKO_RECT: RectBounds = { x: 740, y: 24, width: 200, height: 492 }

export function isPointInsideRect(point: { x: number; y: number }, rect: RectBounds): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
}

export function clampPointToRect(
  point: { x: number; y: number },
  rect: RectBounds,
  padding = 0,
): { x: number; y: number } {
  return {
    x: Math.min(rect.x + rect.width - padding, Math.max(rect.x + padding, point.x)),
    y: Math.min(rect.y + rect.height - padding, Math.max(rect.y + padding, point.y)),
  }
}
