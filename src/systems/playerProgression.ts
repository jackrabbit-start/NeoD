import type { EnemyId } from '../data/contentIds.js'

export const PLAYER_LEVEL_XP_THRESHOLDS = [0, 5, 12, 22, 36] as const

export const ENEMY_PLAYER_XP: Record<EnemyId, number> = {
  slime: 1,
  'spark-slime': 2,
  'prism-slime': 5,
  'dash-slime': 2,
  'orbit-slime': 2,
  'needle-wasp': 3,
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

const clampTotalXp = (totalXp: number): number => Math.max(0, Math.floor(totalXp))

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
  let level = 1

  for (let index = 0; index < PLAYER_LEVEL_XP_THRESHOLDS.length; index += 1) {
    if (xp >= PLAYER_LEVEL_XP_THRESHOLDS[index]) {
      level = index + 1
    }
  }

  return Math.min(level, PLAYER_LEVEL_XP_THRESHOLDS.length)
}

export function getPlayerProgressionView(totalXp: number): PlayerProgressionView {
  const xp = clampTotalXp(totalXp)
  const level = getPlayerLevelForXp(xp)
  const currentLevelXp = PLAYER_LEVEL_XP_THRESHOLDS[level - 1] ?? 0
  const nextLevelAt = PLAYER_LEVEL_XP_THRESHOLDS[level] ?? null
  const isMaxLevel = nextLevelAt === null
  const xpToNextLevel = isMaxLevel ? 0 : Math.max(1, nextLevelAt - currentLevelXp)
  const xpIntoLevel = isMaxLevel ? xp - currentLevelXp : Math.max(0, xp - currentLevelXp)
  const progressRatio = isMaxLevel ? 1 : Math.min(xpIntoLevel / xpToNextLevel, 1)

  return {
    totalXp: xp,
    level,
    currentLevelXp,
    xpIntoLevel,
    xpToNextLevel,
    nextLevelAt,
    progressRatio,
    isMaxLevel,
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
