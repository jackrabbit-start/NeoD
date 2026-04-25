import type { LootId } from '../domain/types.js'

export interface Point {
  x: number
  y: number
}

export interface WorldBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface RectObstacle {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface AmbientItemSpawnPoint extends Point {
  itemId: LootId
}

export interface MapLayout {
  worldBounds: WorldBounds
  playerStart: Point
  obstacles: RectObstacle[]
  ambientItemSpawns: AmbientItemSpawnPoint[]
  heartItemSpawns: Point[]
  magnetItemSpawns: Point[]
}

export type RandomSource = () => number

export const ARENA_WORLD_BOUNDS: WorldBounds = {
  x: 0,
  y: 0,
  width: 2400,
  height: 1350,
}

export const PLAYER_SAFE_RADIUS = 220
export const ENEMY_SPAWN_MIN_DISTANCE = 320
export const ENEMY_SPAWN_RING_DISTANCE = 560
export const AMBIENT_ITEM_RADIUS = 18
export const HEART_ITEM_RADIUS = 18
export const MAGNET_ITEM_RADIUS = 18

const AMBIENT_ITEM_SEQUENCE: LootId[] = [
  'gel-shard',
  'acid-core',
  'frost-mote',
  'spark-knot',
  'mist-bead',
]

export function getWorldCenter(bounds: WorldBounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

export function isPointWithinWorld(point: Point, bounds: WorldBounds, margin = 0): boolean {
  return (
    point.x >= bounds.x + margin
    && point.x <= bounds.x + bounds.width - margin
    && point.y >= bounds.y + margin
    && point.y <= bounds.y + bounds.height - margin
  )
}

export function isCircleClearOfObstacles(
  point: Point,
  radius: number,
  obstacles: RectObstacle[],
): boolean {
  return obstacles.every((obstacle) => {
    const closestX = Math.max(obstacle.x, Math.min(point.x, obstacle.x + obstacle.width))
    const closestY = Math.max(obstacle.y, Math.min(point.y, obstacle.y + obstacle.height))
    return Math.hypot(point.x - closestX, point.y - closestY) > radius
  })
}

export function getStaticMapObstacles(bounds: WorldBounds = ARENA_WORLD_BOUNDS): RectObstacle[] {
  void bounds
  return []
}

function isClearForSpawn(
  point: Point,
  bounds: WorldBounds,
  obstacles: RectObstacle[],
  radius: number,
  margin: number,
): boolean {
  return isPointWithinWorld(point, bounds, margin) && isCircleClearOfObstacles(point, radius, obstacles)
}

export function getAmbientItemSpawnPoints(
  bounds: WorldBounds = ARENA_WORLD_BOUNDS,
  obstacles: RectObstacle[] = getStaticMapObstacles(bounds),
): AmbientItemSpawnPoint[] {
  const candidates: Point[] = [
    { x: bounds.x + bounds.width * 0.14, y: bounds.y + bounds.height * 0.16 },
    { x: bounds.x + bounds.width * 0.36, y: bounds.y + bounds.height * 0.24 },
    { x: bounds.x + bounds.width * 0.68, y: bounds.y + bounds.height * 0.18 },
    { x: bounds.x + bounds.width * 0.86, y: bounds.y + bounds.height * 0.43 },
    { x: bounds.x + bounds.width * 0.2, y: bounds.y + bounds.height * 0.52 },
    { x: bounds.x + bounds.width * 0.48, y: bounds.y + bounds.height * 0.62 },
    { x: bounds.x + bounds.width * 0.74, y: bounds.y + bounds.height * 0.58 },
    { x: bounds.x + bounds.width * 0.3, y: bounds.y + bounds.height * 0.84 },
    { x: bounds.x + bounds.width * 0.6, y: bounds.y + bounds.height * 0.9 },
    { x: bounds.x + bounds.width * 0.88, y: bounds.y + bounds.height * 0.82 },
  ]

  return candidates
    .filter((point) => isClearForSpawn(point, bounds, obstacles, AMBIENT_ITEM_RADIUS, 48))
    .map((point, index) => ({
      x: Math.round(point.x),
      y: Math.round(point.y),
      itemId: AMBIENT_ITEM_SEQUENCE[index % AMBIENT_ITEM_SEQUENCE.length],
    }))
}

export function getHeartItemSpawnPoints(
  bounds: WorldBounds = ARENA_WORLD_BOUNDS,
  obstacles: RectObstacle[] = getStaticMapObstacles(bounds),
): Point[] {
  const candidates: Point[] = [
    { x: bounds.x + bounds.width * 0.22, y: bounds.y + bounds.height * 0.28 },
    { x: bounds.x + bounds.width * 0.5, y: bounds.y + bounds.height * 0.18 },
    { x: bounds.x + bounds.width * 0.78, y: bounds.y + bounds.height * 0.32 },
    { x: bounds.x + bounds.width * 0.18, y: bounds.y + bounds.height * 0.74 },
    { x: bounds.x + bounds.width * 0.52, y: bounds.y + bounds.height * 0.82 },
    { x: bounds.x + bounds.width * 0.82, y: bounds.y + bounds.height * 0.72 },
  ]

  return candidates
    .filter((point) => isClearForSpawn(point, bounds, obstacles, HEART_ITEM_RADIUS, 56))
    .map((point) => ({
      x: Math.round(point.x),
      y: Math.round(point.y),
    }))
}

export function getMagnetItemSpawnPoints(
  bounds: WorldBounds = ARENA_WORLD_BOUNDS,
  obstacles: RectObstacle[] = getStaticMapObstacles(bounds),
): Point[] {
  const candidates: Point[] = [
    { x: bounds.x + bounds.width * 0.12, y: bounds.y + bounds.height * 0.38 },
    { x: bounds.x + bounds.width * 0.42, y: bounds.y + bounds.height * 0.36 },
    { x: bounds.x + bounds.width * 0.68, y: bounds.y + bounds.height * 0.48 },
    { x: bounds.x + bounds.width * 0.9, y: bounds.y + bounds.height * 0.62 },
    { x: bounds.x + bounds.width * 0.38, y: bounds.y + bounds.height * 0.76 },
    { x: bounds.x + bounds.width * 0.66, y: bounds.y + bounds.height * 0.86 },
  ]

  return candidates
    .filter((point) => isClearForSpawn(point, bounds, obstacles, MAGNET_ITEM_RADIUS, 56))
    .map((point) => ({
      x: Math.round(point.x),
      y: Math.round(point.y),
    }))
}

export function createMapLayout(bounds: WorldBounds = ARENA_WORLD_BOUNDS): MapLayout {
  const obstacles = getStaticMapObstacles(bounds)
  const playerStart = getWorldCenter(bounds)
  const ambientItemSpawns = getAmbientItemSpawnPoints(bounds, obstacles)
  const heartItemSpawns = getHeartItemSpawnPoints(bounds, obstacles)
  const magnetItemSpawns = getMagnetItemSpawnPoints(bounds, obstacles)

  return {
    worldBounds: bounds,
    playerStart,
    obstacles,
    ambientItemSpawns,
    heartItemSpawns,
    magnetItemSpawns,
  }
}

export function selectAmbientItemSpawnPoint(
  spawnPoints: AmbientItemSpawnPoint[],
  random: RandomSource = Math.random,
): AmbientItemSpawnPoint | null {
  if (spawnPoints.length === 0) {
    return null
  }

  const index = Math.min(spawnPoints.length - 1, Math.floor(random() * spawnPoints.length))
  return spawnPoints[index] ?? null
}

export function selectHeartItemSpawnPoint(
  spawnPoints: Point[],
  random: RandomSource = Math.random,
): Point | null {
  if (spawnPoints.length === 0) {
    return null
  }

  const index = Math.min(spawnPoints.length - 1, Math.floor(random() * spawnPoints.length))
  return spawnPoints[index] ?? null
}

export function selectMagnetItemSpawnPoint(
  spawnPoints: Point[],
  random: RandomSource = Math.random,
): Point | null {
  if (spawnPoints.length === 0) {
    return null
  }

  const index = Math.min(spawnPoints.length - 1, Math.floor(random() * spawnPoints.length))
  return spawnPoints[index] ?? null
}

function clampToWorld(point: Point, bounds: WorldBounds, margin: number): Point {
  return {
    x: Math.min(bounds.x + bounds.width - margin, Math.max(bounds.x + margin, point.x)),
    y: Math.min(bounds.y + bounds.height - margin, Math.max(bounds.y + margin, point.y)),
  }
}

function getEnemySpawnCandidates(player: Point, bounds: WorldBounds, random: RandomSource): Point[] {
  const directions = 16
  const startIndex = Math.floor(random() * directions)
  const distances = [
    ENEMY_SPAWN_RING_DISTANCE,
    Math.round(ENEMY_SPAWN_RING_DISTANCE * 0.82),
    Math.round(ENEMY_SPAWN_RING_DISTANCE * 1.22),
    ENEMY_SPAWN_MIN_DISTANCE,
  ]
  const candidates: Point[] = []

  for (const distance of distances) {
    for (let offset = 0; offset < directions; offset += 1) {
      const index = (startIndex + offset) % directions
      const angle = (index / directions) * Math.PI * 2
      candidates.push(
        clampToWorld(
          {
            x: player.x + Math.cos(angle) * distance,
            y: player.y + Math.sin(angle) * distance,
          },
          bounds,
          56,
        ),
      )
    }
  }

  return candidates
}

export function selectEnemySpawnPoint(
  player: Point,
  bounds: WorldBounds,
  obstacles: RectObstacle[],
  random: RandomSource = Math.random,
  radius = 24,
): Point {
  const candidates = getEnemySpawnCandidates(player, bounds, random)
  const validCandidate = candidates.find((candidate) => (
    Math.hypot(candidate.x - player.x, candidate.y - player.y) >= ENEMY_SPAWN_MIN_DISTANCE
    && isClearForSpawn(candidate, bounds, obstacles, radius, 48)
  ))

  if (validCandidate) {
    return {
      x: Math.round(validCandidate.x),
      y: Math.round(validCandidate.y),
    }
  }

  const fallback = clampToWorld(
    {
      x: player.x + ENEMY_SPAWN_MIN_DISTANCE,
      y: player.y,
    },
    bounds,
    56,
  )

  return {
    x: Math.round(fallback.x),
    y: Math.round(fallback.y),
  }
}
