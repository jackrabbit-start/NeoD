import { ENEMY_IDS, WEAPON_IDS, type EnemyId, type WeaponId } from '../data/contentIds.js'
import type { WeaponStar } from '../domain/types.js'

export type RandomSource = () => number

export const MAX_WEAPON_STAR = 5 as const
export const MAX_ACTIVE_PACHINKO_TOKENS = 15 as const
export const PACHINKO_SLOT_COUNT = 10 as const
export const PACHINKO_TOKEN_LAUNCH_INTERVAL_MS = 110 as const

export const PACHINKO_LEVEL_THRESHOLDS = [0, 6, 14, 26, 42] as const

export const ENEMY_TOKEN_XP: Record<EnemyId, number> = {
  slime: 1,
  'spark-slime': 2,
  'prism-slime': 4,
  'dash-slime': 2,
  'orbit-slime': 2,
  'needle-wasp': 3,
  'slime-boss': 0,
}

export const STAR_ODDS_BY_LEVEL: Record<number, readonly [number, number, number, number, number]> = {
  1: [70, 25, 5, 0, 0],
  2: [55, 32, 11, 2, 0],
  3: [42, 35, 18, 5, 0],
  4: [30, 34, 25, 9, 2],
  5: [20, 30, 30, 15, 5],
}

export interface PachinkoRewardResult {
  weaponId: WeaponId
  star: WeaponStar
}

export interface PachinkoSlotReward extends PachinkoRewardResult {
  slotIndex: number
  slotCount: number
  ratioStart: number
  ratioEnd: number
  sampleRatio: number
  iconKey: string
}

export interface PachinkoTokenProgressState {
  totalTokenXp: number
  queuedTokenXp: number[]
}

export interface PachinkoTokenProgressResult extends PachinkoTokenProgressState {
  grantedTokenXp: number
  didEnqueue: boolean
  rewardLevel: number
}

export function getTokenXpForEnemy(enemyId: EnemyId): number {
  return ENEMY_TOKEN_XP[enemyId] ?? 0
}

export function shouldEnemyGrantPachinkoToken(enemyId: EnemyId): boolean {
  return getTokenXpForEnemy(enemyId) > 0
}

export function getPachinkoRewardLevel(totalTokenXp: number): number {
  let level = 1
  for (let index = 0; index < PACHINKO_LEVEL_THRESHOLDS.length; index += 1) {
    if (totalTokenXp >= PACHINKO_LEVEL_THRESHOLDS[index]) {
      level = index + 1
    }
  }

  return Math.min(level, PACHINKO_LEVEL_THRESHOLDS.length)
}

export function resolveStarForLevel(
  level: number,
  random: RandomSource = Math.random,
): WeaponStar {
  const odds = STAR_ODDS_BY_LEVEL[Math.max(1, Math.min(5, Math.floor(level)))] ?? STAR_ODDS_BY_LEVEL[1]
  const total = odds.reduce((sum, value) => sum + value, 0)
  let roll = random() * total

  for (let index = 0; index < odds.length; index += 1) {
    roll -= odds[index]
    if (roll <= 0) {
      return (index + 1) as WeaponStar
    }
  }

  return MAX_WEAPON_STAR
}

export function resolveWeaponReward(random: RandomSource = Math.random): WeaponId {
  const index = Math.min(WEAPON_IDS.length - 1, Math.floor(random() * WEAPON_IDS.length))
  return WEAPON_IDS[index]
}

export function resolvePachinkoReward(
  level: number,
  random: RandomSource = Math.random,
): PachinkoRewardResult {
  return {
    weaponId: resolveWeaponReward(random),
    star: resolveStarForLevel(level, random),
  }
}

export function resolvePachinkoSlotIndex(
  landingRatio: number,
  slotCount: number = PACHINKO_SLOT_COUNT,
): number {
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  const clampedRatio = Math.max(0, Math.min(0.999, landingRatio))
  return Math.min(normalizedSlotCount - 1, Math.floor(clampedRatio * normalizedSlotCount))
}

export function buildPachinkoSlotRewards(
  totalTokenXp: number,
  slotCount: number = PACHINKO_SLOT_COUNT,
): PachinkoSlotReward[] {
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  const level = getPachinkoRewardLevel(totalTokenXp)

  return Array.from({ length: normalizedSlotCount }, (_, slotIndex) => {
    const ratioStart = slotIndex / normalizedSlotCount
    const ratioEnd = (slotIndex + 1) / normalizedSlotCount
    const sampleRatio = Math.min(0.999, Math.max(0, ratioEnd - Number.EPSILON))
    const reward = resolvePachinkoReward(level, () => sampleRatio)

    return {
      ...reward,
      slotIndex,
      slotCount: normalizedSlotCount,
      ratioStart,
      ratioEnd,
      sampleRatio,
      iconKey: `weapon-${reward.weaponId}`,
    }
  })
}

export function resolvePachinkoSlotReward(
  totalTokenXp: number,
  landingRatio: number,
  slotCount: number = PACHINKO_SLOT_COUNT,
): PachinkoSlotReward {
  const slotRewards = buildPachinkoSlotRewards(totalTokenXp, slotCount)
  return slotRewards[resolvePachinkoSlotIndex(landingRatio, slotRewards.length)] ?? slotRewards[0]
}

export function canLaunchPachinkoToken({
  activeTokenCount,
  queuedTokenCount,
  now,
  lastLaunchAt,
  maxActiveTokens = MAX_ACTIVE_PACHINKO_TOKENS,
  launchIntervalMs = PACHINKO_TOKEN_LAUNCH_INTERVAL_MS,
}: {
  activeTokenCount: number
  queuedTokenCount: number
  now: number
  lastLaunchAt: number
  maxActiveTokens?: number
  launchIntervalMs?: number
}): boolean {
  if (activeTokenCount >= maxActiveTokens || queuedTokenCount <= 0) {
    return false
  }

  if (lastLaunchAt <= 0) {
    return true
  }

  return now - lastLaunchAt >= launchIntervalMs
}

export function getEnemyTokenSummary(enemyId: EnemyId): string {
  const xp = getTokenXpForEnemy(enemyId)
  if (xp <= 0) {
    return '보스 처치 시 즉시 런을 종료합니다.'
  }

  return `파친코 토큰 +1 · 보상 경험치 +${xp}`
}

export function getAllTokenRewardRows(): Array<{ enemyId: EnemyId; tokenXp: number }> {
  return ENEMY_IDS.map((enemyId) => ({ enemyId, tokenXp: getTokenXpForEnemy(enemyId) }))
}

export function applyEnemyPachinkoTokenProgress(
  state: PachinkoTokenProgressState,
  enemyId: EnemyId,
): PachinkoTokenProgressResult {
  const grantedTokenXp = getTokenXpForEnemy(enemyId)
  if (grantedTokenXp <= 0) {
    return {
      ...state,
      grantedTokenXp: 0,
      didEnqueue: false,
      rewardLevel: getPachinkoRewardLevel(state.totalTokenXp),
    }
  }

  const totalTokenXp = state.totalTokenXp + grantedTokenXp
  return {
    totalTokenXp,
    queuedTokenXp: [...state.queuedTokenXp, grantedTokenXp],
    grantedTokenXp,
    didEnqueue: true,
    rewardLevel: getPachinkoRewardLevel(totalTokenXp),
  }
}

export function resolvePachinkoLandingReward(
  totalTokenXp: number,
  landingRatio: number,
): PachinkoRewardResult {
  const { weaponId, star } = resolvePachinkoSlotReward(totalTokenXp, landingRatio)
  return { weaponId, star }
}
