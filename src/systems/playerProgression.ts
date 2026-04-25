import type { EnemyId } from '../data/contentIds.js'

export const XP_DISPLAY_SCALE = 100 as const

export const PLAYER_LEVEL_XP_THRESHOLDS = [0, 500, 1200, 2200, 3600] as const

const MIN_PLAYER_LEVEL = 1
const LAST_SEEDED_LEVEL = PLAYER_LEVEL_XP_THRESHOLDS.length
const LAST_SEEDED_LEVEL_XP = PLAYER_LEVEL_XP_THRESHOLDS[LAST_SEEDED_LEVEL - 1]
const LAST_SEEDED_LEVEL_XP_REQUIREMENT =
  PLAYER_LEVEL_XP_THRESHOLDS[LAST_SEEDED_LEVEL - 1] - PLAYER_LEVEL_XP_THRESHOLDS[LAST_SEEDED_LEVEL - 2]

export const ENEMY_PLAYER_XP: Record<EnemyId, number> = {
  slime: 100,
  'spark-slime': 200,
  'prism-slime': 500,
  'dash-slime': 200,
  'orbit-slime': 200,
  'needle-wasp': 300,
  'splitter-slime': 200,
  'shard-sentinel': 300,
  'mender-slime': 200,
  'void-orb': 300,
  'crusher-slime': 400,
  'lantern-moth': 300,
  'mirror-wisp': 300,
  'siege-toad': 500,
  'slime-boss': 0,
}

export interface PlayerProgressionState {
  totalXp: number
  level: number
}

export interface PlayerProgressionView extends PlayerProgressionState {
  currentLevelXp: number
  xpIntoLevel: number
  xpToNextLevel: number
  nextLevelAt: number | null
  progressRatio: number
  isMaxLevel: boolean
}

export interface PlayerProgressionResult {
  state: PlayerProgressionState
  grantedXp: number
  previousLevel: number
  level: number
  didLevelUp: boolean
  view: PlayerProgressionView
}

const clampTotalXp = (totalXp: number): number =>
  Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0

function getXpRequiredForLevel(level: number): number {
  const targetLevel = Math.max(MIN_PLAYER_LEVEL, Math.floor(level))
  const seededThreshold = PLAYER_LEVEL_XP_THRESHOLDS[targetLevel - 1]

  if (seededThreshold !== undefined) {
    return seededThreshold
  }

  let threshold = LAST_SEEDED_LEVEL_XP
  let xpToNextLevel = LAST_SEEDED_LEVEL_XP_REQUIREMENT + LAST_SEEDED_LEVEL * XP_DISPLAY_SCALE

  for (let currentLevel = LAST_SEEDED_LEVEL; currentLevel < targetLevel; currentLevel += 1) {
    threshold += xpToNextLevel
    xpToNextLevel += (currentLevel + 1) * XP_DISPLAY_SCALE
  }

  return threshold
}

function getXpRequiredForNextLevel(level: number): number {
  return getXpRequiredForLevel(level + 1) - getXpRequiredForLevel(level)
}

export function createInitialPlayerProgressionState(): PlayerProgressionState {
  return {
    totalXp: 0,
    level: 1,
  }
}

export function getPlayerXpForEnemy(enemyId: EnemyId): number {
  return ENEMY_PLAYER_XP[enemyId] ?? 0
}

export function getPlayerLevelForXp(totalXp: number): number {
  const xp = clampTotalXp(totalXp)
  let level = MIN_PLAYER_LEVEL

  while (xp >= getXpRequiredForLevel(level + 1)) {
    level += 1
  }

  return level
}

export function getPlayerProgressionView(totalXp: number): PlayerProgressionView {
  const xp = clampTotalXp(totalXp)
  const level = getPlayerLevelForXp(xp)
  const currentLevelXp = getXpRequiredForLevel(level)
  const nextLevelAt = getXpRequiredForLevel(level + 1)
  const xpToNextLevel = Math.max(1, getXpRequiredForNextLevel(level))
  const xpIntoLevel = Math.max(0, xp - currentLevelXp)
  const progressRatio = Math.min(xpIntoLevel / xpToNextLevel, 1)

  return {
    totalXp: xp,
    level,
    currentLevelXp,
    xpIntoLevel,
    xpToNextLevel,
    nextLevelAt,
    progressRatio,
    isMaxLevel: false,
  }
}

export function applyPlayerXp(
  state: PlayerProgressionState,
  xp: number,
): PlayerProgressionResult {
  const previousLevel = getPlayerLevelForXp(state.totalXp)
  const grantedXp = Math.max(0, Math.floor(xp))
  const nextTotalXp = clampTotalXp(state.totalXp + grantedXp)
  const view = getPlayerProgressionView(nextTotalXp)
  const nextState = {
    totalXp: view.totalXp,
    level: view.level,
  }

  return {
    state: nextState,
    grantedXp,
    previousLevel,
    level: view.level,
    didLevelUp: view.level > previousLevel,
    view,
  }
}

export function applyEnemyPlayerXp(
  state: PlayerProgressionState,
  enemyId: EnemyId,
): PlayerProgressionResult {
  return applyPlayerXp(state, getPlayerXpForEnemy(enemyId))
}
