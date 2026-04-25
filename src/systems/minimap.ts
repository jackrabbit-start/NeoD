import type { Point, WorldBounds } from './mapLayout.js'

export interface MiniMapBounds {
  x: number
  y: number
  width: number
  height: number
  padding: number
}

export interface MiniMapRect extends MiniMapBounds {}

export const MINIMAP_WIDTH = 180
export const MINIMAP_HEIGHT = 102
export const MINIMAP_PADDING = 8
export const MINIMAP_MARGIN = 16

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function getTopRightMiniMapBounds(
  gameWidth: number,
  margin = MINIMAP_MARGIN,
): MiniMapBounds {
  return {
    x: gameWidth - MINIMAP_WIDTH - margin,
    y: margin,
    width: MINIMAP_WIDTH,
    height: MINIMAP_HEIGHT,
    padding: MINIMAP_PADDING,
  }
}

export function projectWorldPointToMiniMap(
  point: Point,
  worldBounds: WorldBounds,
  miniMap: MiniMapBounds,
): Point {
  const usableWidth = miniMap.width - miniMap.padding * 2
  const usableHeight = miniMap.height - miniMap.padding * 2
  const normalizedX = worldBounds.width > 0
    ? clamp((point.x - worldBounds.x) / worldBounds.width, 0, 1)
    : 0
  const normalizedY = worldBounds.height > 0
    ? clamp((point.y - worldBounds.y) / worldBounds.height, 0, 1)
    : 0

  return {
    x: miniMap.x + miniMap.padding + normalizedX * usableWidth,
    y: miniMap.y + miniMap.padding + normalizedY * usableHeight,
  }
}

export function projectWorldRectToMiniMap(
  rect: WorldBounds,
  worldBounds: WorldBounds,
  miniMap: MiniMapBounds,
): MiniMapRect {
  const topLeft = projectWorldPointToMiniMap(rect, worldBounds, miniMap)
  const bottomRight = projectWorldPointToMiniMap(
    {
      x: rect.x + rect.width,
      y: rect.y + rect.height,
    },
    worldBounds,
    miniMap,
  )

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: Math.max(0, bottomRight.x - topLeft.x),
    height: Math.max(0, bottomRight.y - topLeft.y),
    padding: 0,
  }
}
