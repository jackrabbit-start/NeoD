import { ENEMY_IDS, WEAPON_IDS, type EnemyId, type WeaponId } from '../data/contentIds.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { WeaponStar } from '../domain/types.js'

export type RandomSource = () => number

export const MAX_PACHINKO_REWARD_STAR = 5 as const
export const MAX_ACTIVE_PACHINKO_TOKENS = 15 as const
export const PACHINKO_SLOT_COUNT = 10 as const
export const PACHINKO_TOKEN_LAUNCH_INTERVAL_MS = 110 as const
export const PACHINKO_REWARD_TABLE_REFRESH_MS = 850 as const

export const PACHINKO_LEVEL_THRESHOLDS = [0, 6, 14, 26, 42] as const

export const ENEMY_TOKEN_XP: Record<EnemyId, number> = {
  slime: 1,
  'spark-slime': 2,
  'prism-slime': 4,
  'dash-slime': 2,
  'orbit-slime': 2,
  'needle-wasp': 3,
  'splitter-slime': 2,
  'shard-sentinel': 3,
  'mender-slime': 2,
  'void-orb': 3,
  'crusher-slime': 4,
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

export interface PachinkoStarRange {
  minStar: WeaponStar
  maxStar: WeaponStar
}

export type PachinkoWeaponFamily =
  | 'starter'
  | 'spray'
  | 'pierce'
  | 'heavy'
  | 'chain'
  | 'rapid'
  | 'zone'
  | 'melee'
  | 'precision'

export type PachinkoSlotModifierKind = 'family' | 'bonus' | 'jackpot'

export interface PachinkoSlotModifier {
  kind: PachinkoSlotModifierKind
  label: string
  color: number
  description: string
}

export interface PachinkoSlotReward extends PachinkoRewardResult {
  slotIndex: number
  slotCount: number
  ratioStart: number
  ratioEnd: number
  sampleRatio: number
  iconKey: string
  modifier?: PachinkoSlotModifier
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

function createSeededRandomSource(seed: number): RandomSource {
  let state = Math.max(1, Math.floor(seed)) >>> 0

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function getPachinkoSlotRewardSeed(totalTokenXp: number, slotIndex: number, tableSeed: number): number {
  const normalizedXp = Math.max(0, Math.floor(totalTokenXp))
  const normalizedSlot = Math.max(0, Math.floor(slotIndex))
  const normalizedTableSeed = Math.max(0, Math.floor(tableSeed))

  return (
    Math.imul(normalizedXp + 1, 73856093) ^
    Math.imul(normalizedSlot + 1, 19349663) ^
    Math.imul(normalizedTableSeed + 1, 83492791)
  ) >>> 0
}

export function getPachinkoRewardTableSeed(
  now: number,
  refreshIntervalMs: number = PACHINKO_REWARD_TABLE_REFRESH_MS,
): number {
  const interval = Math.max(1, Math.floor(refreshIntervalMs))
  return Math.max(0, Math.floor(now / interval))
}

export function getPachinkoStarRangeForPlayerLevel(playerLevel: number): PachinkoStarRange {
  const normalizedLevel = Math.max(1, Math.floor(playerLevel))
  const minStar = Math.min(
    MAX_PACHINKO_REWARD_STAR,
    Math.max(1, 1 + Math.floor((normalizedLevel - 1) / 8)),
  ) as WeaponStar
  const maxStar = Math.min(
    MAX_PACHINKO_REWARD_STAR,
    Math.max(minStar, 2 + Math.floor((normalizedLevel - 1) / 4)),
  ) as WeaponStar

  return {
    minStar,
    maxStar,
  }
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
  starRange: PachinkoStarRange = getPachinkoStarRangeForPlayerLevel(1),
): WeaponStar {
  const odds = STAR_ODDS_BY_LEVEL[Math.max(1, Math.min(5, Math.floor(level)))] ?? STAR_ODDS_BY_LEVEL[1]
  const minStar = Math.max(1, Math.min(MAX_PACHINKO_REWARD_STAR, starRange.minStar))
  const maxStar = Math.max(minStar, Math.min(MAX_PACHINKO_REWARD_STAR, starRange.maxStar))
  const rangedOdds = odds.map((value, index) => {
    const star = index + 1
    return star >= minStar && star <= maxStar ? value : 0
  })
  const total = rangedOdds.reduce((sum, value) => sum + value, 0)
  if (total <= 0) {
    const starCount = maxStar - minStar + 1
    return (minStar + Math.min(starCount - 1, Math.floor(random() * starCount))) as WeaponStar
  }
  let roll = random() * total

  for (let index = 0; index < rangedOdds.length; index += 1) {
    roll -= rangedOdds[index]
    if (roll <= 0) {
      return (index + 1) as WeaponStar
    }
  }

  return maxStar as WeaponStar
}

export function resolveWeaponReward(random: RandomSource = Math.random): WeaponId {
  const index = Math.min(WEAPON_IDS.length - 1, Math.floor(random() * WEAPON_IDS.length))
  return WEAPON_IDS[index]
}

const WEAPON_FAMILY_BY_ID: Record<WeaponId, PachinkoWeaponFamily> = {
  'starter-blaster': 'starter',
  'acid-sprayer': 'spray',
  'frost-lance': 'pierce',
  'storm-cannon': 'heavy',
  'arc-loom': 'chain',
  'spark-carbine': 'rapid',
  'mist-vortex': 'zone',
  'slime-glaive': 'melee',
  'prism-cutter': 'precision',
  'needle-fan': 'spray',
}

const PACHINKO_FAMILY_LABELS: Record<PachinkoWeaponFamily, string> = {
  starter: '기본',
  spray: '분사',
  pierce: '관통',
  heavy: '중화력',
  chain: '연쇄',
  rapid: '속사',
  zone: '구역',
  melee: '근접',
  precision: '절단',
}

const PACHINKO_SLOT_MODIFIERS: Record<PachinkoSlotModifierKind, PachinkoSlotModifier> = {
  family: {
    kind: 'family',
    label: '계열',
    color: 0x8fe4ff,
    description: '현재 무기 계열 보너스: 활성 무기 보상이 등장합니다.',
  },
  bonus: {
    kind: 'bonus',
    label: '+별',
    color: 0xffd866,
    description: '보너스 슬롯: 별 등급이 1단계 상승합니다.',
  },
  jackpot: {
    kind: 'jackpot',
    label: 'JACK',
    color: 0xff7ac8,
    description: '잭팟 슬롯: 활성 무기 보상과 높은 별 등급을 노립니다.',
  },
}

export function getPachinkoWeaponFamily(weaponId: WeaponId): PachinkoWeaponFamily {
  return WEAPON_FAMILY_BY_ID[weaponId]
}

export function getPachinkoWeaponFamilyLabel(family: PachinkoWeaponFamily): string {
  return PACHINKO_FAMILY_LABELS[family]
}

export function getPachinkoWeaponSynergySummary(activeWeaponId: WeaponId): string {
  const family = getPachinkoWeaponFamily(activeWeaponId)
  const weaponName = WEAPON_DEFINITIONS[activeWeaponId].name
  return `${getPachinkoWeaponFamilyLabel(family)} 계열: ${weaponName} 보너스 슬롯 등장`
}

export function resolvePachinkoReward(
  level: number,
  random: RandomSource = Math.random,
  starRange: PachinkoStarRange = getPachinkoStarRangeForPlayerLevel(1),
): PachinkoRewardResult {
  return {
    weaponId: resolveWeaponReward(random),
    star: resolveStarForLevel(level, random, starRange),
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
  tableSeed = 0,
  playerLevel = 1,
  activeWeaponId?: WeaponId,
): PachinkoSlotReward[] {
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  const level = getPachinkoRewardLevel(totalTokenXp)
  const starRange = getPachinkoStarRangeForPlayerLevel(playerLevel)
  const modifiers = activeWeaponId
    ? buildPachinkoSlotModifiers(activeWeaponId, level, normalizedSlotCount)
    : new Map<number, PachinkoSlotModifierKind>()

  return Array.from({ length: normalizedSlotCount }, (_, slotIndex) => {
    const ratioStart = slotIndex / normalizedSlotCount
    const ratioEnd = (slotIndex + 1) / normalizedSlotCount
    const sampleRatio = Math.min(0.999, Math.max(0, ratioEnd - Number.EPSILON))
    const reward = resolvePachinkoReward(
      level,
      createSeededRandomSource(getPachinkoSlotRewardSeed(totalTokenXp, slotIndex, tableSeed)),
      starRange,
    )
    const modifierKind = modifiers.get(slotIndex)
    const modifier = modifierKind ? PACHINKO_SLOT_MODIFIERS[modifierKind] : undefined
    const modifiedReward = modifier && activeWeaponId
      ? applyPachinkoSlotModifier(reward, modifier.kind, activeWeaponId)
      : reward

    return {
      ...modifiedReward,
      slotIndex,
      slotCount: normalizedSlotCount,
      ratioStart,
      ratioEnd,
      sampleRatio,
      iconKey: `weapon-${modifiedReward.weaponId}`,
      ...(modifier ? { modifier } : {}),
    }
  })
}

export function buildPachinkoSlotModifiers(
  activeWeaponId: WeaponId,
  level: number,
  slotCount: number = PACHINKO_SLOT_COUNT,
): Map<number, PachinkoSlotModifierKind> {
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  const activeIndex = Math.max(0, WEAPON_IDS.indexOf(activeWeaponId))
  const normalizedLevel = Math.max(1, Math.min(5, Math.floor(level)))
  const familySlot = activeIndex % normalizedSlotCount
  let bonusSlot = (activeIndex + normalizedLevel * 2) % normalizedSlotCount
  if (bonusSlot === familySlot) {
    bonusSlot = (bonusSlot + 1) % normalizedSlotCount
  }
  let jackpotSlot = (activeIndex + normalizedLevel + Math.ceil(normalizedSlotCount / 2)) % normalizedSlotCount
  while (jackpotSlot === familySlot || jackpotSlot === bonusSlot) {
    jackpotSlot = (jackpotSlot + 1) % normalizedSlotCount
  }

  return new Map<number, PachinkoSlotModifierKind>([
    [familySlot, 'family'],
    [bonusSlot, 'bonus'],
    [jackpotSlot, 'jackpot'],
  ])
}

export function applyPachinkoSlotModifier(
  reward: PachinkoRewardResult,
  modifier: PachinkoSlotModifierKind,
  activeWeaponId: WeaponId,
): PachinkoRewardResult {
  if (modifier === 'family') {
    return {
      weaponId: activeWeaponId,
      star: reward.star,
    }
  }

  if (modifier === 'bonus') {
    return {
      weaponId: reward.weaponId,
      star: Math.min(MAX_PACHINKO_REWARD_STAR, reward.star + 1) as WeaponStar,
    }
  }

  return {
    weaponId: activeWeaponId,
    star: Math.min(MAX_PACHINKO_REWARD_STAR, reward.star + 2) as WeaponStar,
  }
}

export function resolvePachinkoSlotReward(
  totalTokenXp: number,
  landingRatio: number,
  slotCount: number = PACHINKO_SLOT_COUNT,
  tableSeed = 0,
  playerLevel = 1,
  activeWeaponId?: WeaponId,
): PachinkoSlotReward {
  const slotRewards = buildPachinkoSlotRewards(totalTokenXp, slotCount, tableSeed, playerLevel, activeWeaponId)
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
  tableSeed = 0,
  playerLevel = 1,
  activeWeaponId?: WeaponId,
): PachinkoRewardResult {
  const { weaponId, star } = resolvePachinkoSlotReward(
    totalTokenXp,
    landingRatio,
    PACHINKO_SLOT_COUNT,
    tableSeed,
    playerLevel,
    activeWeaponId,
  )
  return { weaponId, star }
}
