import { ENEMY_IDS, WEAPON_IDS, type EnemyId, type WeaponId } from '../data/contentIds.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { WeaponStar } from '../domain/types.js'

export type RandomSource = () => number

export const MAX_PACHINKO_REWARD_STAR = 20 as const
export const MAX_ACTIVE_PACHINKO_TOKENS = 30 as const
export const PACHINKO_SLOT_COUNT = 10 as const
export const PACHINKO_TOKEN_LAUNCH_INTERVAL_MS = 110 as const
export const PACHINKO_REWARD_TABLE_REFRESH_MS = 5000 as const
export const PACHINKO_FEVER_CHARGE_MAX = 100 as const
export const PACHINKO_FEVER_DURATION_TOKENS = 3 as const
export const PACHINKO_PITY_THRESHOLD = 4 as const
export const DOUBLE_TOKEN_DROP_START_MS = 13 * 60_000
export const RARE_TOKEN_XP_MULTIPLIER = 10 as const
export const RARE_TOKEN_DROP_CHANCE = 0.03
export const PACHINKO_STAR_20_TARGET_TOKEN_XP = 220_000

export const PACHINKO_XP_DISPLAY_SCALE = 100 as const

export const PACHINKO_LEVEL_THRESHOLDS = [0, 1200, 3000, 5600, 9200] as const

export const ENEMY_TOKEN_XP: Record<EnemyId, number> = {
  slime: 60,
  'spark-slime': 90,
  'prism-slime': 180,
  'dash-slime': 80,
  'orbit-slime': 90,
  'needle-wasp': 120,
  'splitter-slime': 90,
  'shard-sentinel': 130,
  'mender-slime': 100,
  'void-orb': 140,
  'crusher-slime': 170,
  'lantern-moth': 130,
  'mirror-wisp': 140,
  'siege-toad': 220,
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

export type PachinkoMomentumOutcome =
  | 'idle'
  | 'normal'
  | 'near-miss'
  | 'bonus'
  | 'jackpot'
  | 'fever-jackpot'

export interface PachinkoMomentumState {
  feverCharge: number
  pityCounter: number
  feverTokensRemaining: number
  lastOutcome: PachinkoMomentumOutcome
}

export interface PachinkoMomentumUpdate {
  state: PachinkoMomentumState
  outcome: PachinkoMomentumOutcome
  feverTriggered: boolean
  wasFeverActive: boolean
  isFeverActive: boolean
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
  isNearJackpot?: boolean
  modifier?: PachinkoSlotModifier
}

export interface PachinkoWeaponOddsRow {
  weaponId: WeaponId
  iconKey: string
  probability: number
  percentLabel: string
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

export interface PachinkoSpinProfile {
  feverActive: boolean
  activeWeaponWeightMultiplier: number
  nonActiveWeaponWeightMultiplier: number
  starBonus: number
  extraJackpotSlots: number
  extraBonusSlots: number
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

function clampPachinkoCharge(value: number): number {
  return Math.max(0, Math.min(PACHINKO_FEVER_CHARGE_MAX, Math.round(value)))
}

function getPachinkoJackpotNeighborIndices(jackpotSlots: Iterable<number>, slotCount: number): Set<number> {
  const neighbors = new Set<number>()
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  for (const jackpotSlot of jackpotSlots) {
    for (const offset of [-1, 1]) {
      const candidate = jackpotSlot + offset
      if (candidate >= 0 && candidate < normalizedSlotCount) {
        neighbors.add(candidate)
      }
    }
  }
  return neighbors
}

function assignOpenModifierSlot(
  modifiers: Map<number, PachinkoSlotModifierKind>,
  preferredSlot: number,
  kind: PachinkoSlotModifierKind,
  slotCount: number,
): void {
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  for (let offset = 0; offset < normalizedSlotCount; offset += 1) {
    const forwardSlot = (preferredSlot + offset) % normalizedSlotCount
    if (!modifiers.has(forwardSlot)) {
      modifiers.set(forwardSlot, kind)
      return
    }

    const backwardSlot = (preferredSlot - offset + normalizedSlotCount) % normalizedSlotCount
    if (!modifiers.has(backwardSlot)) {
      modifiers.set(backwardSlot, kind)
      return
    }
  }
}

function getPachinkoChargeGain(reward: Pick<PachinkoSlotReward, 'modifier' | 'isNearJackpot'>): number {
  if (reward.isNearJackpot) {
    return 34
  }

  if (reward.modifier?.kind === 'bonus') {
    return 22
  }

  if (reward.modifier?.kind === 'family') {
    return 16
  }

  return 14
}

export function createInitialPachinkoMomentumState(): PachinkoMomentumState {
  return {
    feverCharge: 0,
    pityCounter: 0,
    feverTokensRemaining: 0,
    lastOutcome: 'idle',
  }
}

export function isPachinkoFeverActive(state: PachinkoMomentumState): boolean {
  return state.feverTokensRemaining > 0
}

export function getPachinkoFeverChargeRatio(state: PachinkoMomentumState): number {
  return clampPachinkoCharge(state.feverCharge) / PACHINKO_FEVER_CHARGE_MAX
}

export function getPachinkoMomentumLabel(state: PachinkoMomentumState): string {
  if (isPachinkoFeverActive(state)) {
    return `FEVER ${state.feverTokensRemaining}연타`
  }

  if (state.feverCharge >= PACHINKO_FEVER_CHARGE_MAX * 0.8) {
    return '잭팟 예열'
  }

  if (state.pityCounter >= PACHINKO_PITY_THRESHOLD) {
    return '리치 누적'
  }

  if (state.lastOutcome === 'near-miss') {
    return '근접 적립'
  }

  return '토큰 대기'
}

export function createPachinkoSpinProfile(state: PachinkoMomentumState): PachinkoSpinProfile {
  const feverActive = isPachinkoFeverActive(state)
  const pityReady = !feverActive && state.pityCounter >= PACHINKO_PITY_THRESHOLD

  return {
    feverActive,
    activeWeaponWeightMultiplier: feverActive ? 1.75 : 1,
    nonActiveWeaponWeightMultiplier: feverActive ? 0.7 : 1,
    starBonus: feverActive ? 1 : 0,
    extraJackpotSlots: feverActive ? 1 : 0,
    extraBonusSlots: pityReady ? 1 : 0,
  }
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

export function getPachinkoStarRangeForTokenXp(totalTokenXp: number, playerLevel = 1): PachinkoStarRange {
  const playerRange = getPachinkoStarRangeForPlayerLevel(playerLevel)
  const tokenProgress = Math.max(0, Math.min(1, Math.floor(totalTokenXp) / PACHINKO_STAR_20_TARGET_TOKEN_XP))
  const tokenMaxStar = Math.min(
    MAX_PACHINKO_REWARD_STAR,
    Math.max(2, 2 + Math.floor(tokenProgress * (MAX_PACHINKO_REWARD_STAR - 2))),
  ) as WeaponStar
  const tokenMinStar = Math.max(
    1,
    tokenMaxStar >= 16 ? tokenMaxStar - 4 : tokenMaxStar >= 10 ? tokenMaxStar - 3 : Math.floor(tokenMaxStar / 2),
  ) as WeaponStar

  return {
    minStar: Math.max(playerRange.minStar, tokenMinStar) as WeaponStar,
    maxStar: Math.max(playerRange.maxStar, tokenMaxStar) as WeaponStar,
  }
}

export function getTokenXpForEnemy(enemyId: EnemyId): number {
  return ENEMY_TOKEN_XP[enemyId] ?? 0
}

export function shouldEnemyGrantPachinkoToken(enemyId: EnemyId): boolean {
  return getTokenXpForEnemy(enemyId) > 0
}

export function getEnemyPachinkoTokenDropCount(enemyId: EnemyId, elapsedMs: number): number {
  if (!shouldEnemyGrantPachinkoToken(enemyId)) {
    return 0
  }

  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs)) : 0
  if (safeElapsedMs < DOUBLE_TOKEN_DROP_START_MS) {
    return 1
  }
  if (safeElapsedMs >= 18 * 60_000) {
    return 4
  }
  if (safeElapsedMs >= 16 * 60_000) {
    return 3
  }
  return 2
}

export function resolveEnemyPachinkoTokenXpMultiplier(
  random: RandomSource = Math.random,
  elapsedMs = 0,
): number {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs)) : 0
  const rareChance = safeElapsedMs >= 18 * 60_000
    ? 0.08
    : safeElapsedMs >= DOUBLE_TOKEN_DROP_START_MS
      ? 0.05
      : RARE_TOKEN_DROP_CHANCE
  return random() < rareChance ? RARE_TOKEN_XP_MULTIPLIER : 1
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
  const starOptions = Array.from({ length: maxStar - minStar + 1 }, (_, index) => minStar + index)
  const rangedOdds = maxStar <= odds.length
    ? odds.map((value, index) => {
        const star = index + 1
        return star >= minStar && star <= maxStar ? value : 0
      })
    : starOptions.map((star) => {
        const span = Math.max(1, maxStar - minStar)
        const bucket = Math.min(odds.length - 1, Math.floor(((star - minStar) / span) * odds.length))
        return odds[bucket] ?? 0
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
      return (maxStar <= odds.length ? index + 1 : starOptions[index]) as WeaponStar
    }
  }

  return maxStar as WeaponStar
}

export function resolveWeaponReward(random: RandomSource = Math.random): WeaponId {
  const index = Math.min(WEAPON_IDS.length - 1, Math.floor(random() * WEAPON_IDS.length))
  return WEAPON_IDS[index]
}

export function resolveWeightedWeaponReward(
  random: RandomSource = Math.random,
  activeWeaponId?: WeaponId,
  activeWeaponWeightMultiplier = 1,
  nonActiveWeaponWeightMultiplier = 1,
): WeaponId {
  const weights = WEAPON_IDS.map((weaponId) => ({
    weaponId,
    weight:
      weaponId === activeWeaponId
        ? Math.max(1, activeWeaponWeightMultiplier)
        : Math.max(0.2, nonActiveWeaponWeightMultiplier),
  }))
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random() * totalWeight

  for (const entry of weights) {
    roll -= entry.weight
    if (roll <= 0) {
      return entry.weaponId
    }
  }

  return weights.at(-1)?.weaponId ?? WEAPON_IDS[0]
}

const WEAPON_FAMILY_BY_ID: Record<WeaponId, PachinkoWeaponFamily> = {
  'starter-blaster': 'rapid',
  'acid-sprayer': 'spray',
  'frost-lance': 'heavy',
  'storm-cannon': 'spray',
  'arc-loom': 'chain',
  'spark-carbine': 'zone',
  'mist-vortex': 'zone',
  'slime-glaive': 'melee',
  'prism-cutter': 'melee',
  'needle-fan': 'chain',
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
  activeWeaponId?: WeaponId,
  activeWeaponWeightMultiplier = 1,
  nonActiveWeaponWeightMultiplier = 1,
  spinProfile: PachinkoSpinProfile = createPachinkoSpinProfile(createInitialPachinkoMomentumState()),
): PachinkoRewardResult {
  return {
    weaponId: resolveWeightedWeaponReward(
      random,
      activeWeaponId,
      activeWeaponWeightMultiplier * spinProfile.activeWeaponWeightMultiplier,
      nonActiveWeaponWeightMultiplier * spinProfile.nonActiveWeaponWeightMultiplier,
    ),
    star: Math.min(
      MAX_PACHINKO_REWARD_STAR,
      resolveStarForLevel(level, random, starRange) + spinProfile.starBonus,
    ) as WeaponStar,
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
  activeWeaponWeightMultiplier = 1,
  nonActiveWeaponWeightMultiplier = 1,
  momentumState: PachinkoMomentumState = createInitialPachinkoMomentumState(),
): PachinkoSlotReward[] {
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  const level = getPachinkoRewardLevel(totalTokenXp)
  const starRange = getPachinkoStarRangeForTokenXp(totalTokenXp, playerLevel)
  const spinProfile = createPachinkoSpinProfile(momentumState)
  const modifiers = activeWeaponId
    ? buildPachinkoSlotModifiers(activeWeaponId, level, normalizedSlotCount, spinProfile)
    : new Map<number, PachinkoSlotModifierKind>()
  const jackpotNeighborIndices = getPachinkoJackpotNeighborIndices(
    [...modifiers.entries()].filter(([, modifier]) => modifier === 'jackpot').map(([slotIndex]) => slotIndex),
    normalizedSlotCount,
  )

  return Array.from({ length: normalizedSlotCount }, (_, slotIndex) => {
    const ratioStart = slotIndex / normalizedSlotCount
    const ratioEnd = (slotIndex + 1) / normalizedSlotCount
    const sampleRatio = Math.min(0.999, Math.max(0, ratioEnd - Number.EPSILON))
    const reward = resolvePachinkoReward(
      level,
      createSeededRandomSource(getPachinkoSlotRewardSeed(totalTokenXp, slotIndex, tableSeed)),
      starRange,
      activeWeaponId,
      activeWeaponWeightMultiplier,
      nonActiveWeaponWeightMultiplier,
      spinProfile,
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
      ...(jackpotNeighborIndices.has(slotIndex) && !modifier ? { isNearJackpot: true } : {}),
      ...(modifier ? { modifier } : {}),
    }
  })
}

export function buildPachinkoSlotModifiers(
  activeWeaponId: WeaponId,
  level: number,
  slotCount: number = PACHINKO_SLOT_COUNT,
  spinProfile: PachinkoSpinProfile = createPachinkoSpinProfile(createInitialPachinkoMomentumState()),
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

  const modifiers = new Map<number, PachinkoSlotModifierKind>([
    [familySlot, 'family'],
    [bonusSlot, 'bonus'],
    [jackpotSlot, 'jackpot'],
  ])

  for (let index = 0; index < spinProfile.extraBonusSlots; index += 1) {
    assignOpenModifierSlot(modifiers, bonusSlot + 1 + index, 'bonus', normalizedSlotCount)
  }

  for (let index = 0; index < spinProfile.extraJackpotSlots; index += 1) {
    assignOpenModifierSlot(modifiers, jackpotSlot - 1 - index, 'jackpot', normalizedSlotCount)
  }

  return modifiers
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
  activeWeaponWeightMultiplier = 1,
  nonActiveWeaponWeightMultiplier = 1,
  momentumState: PachinkoMomentumState = createInitialPachinkoMomentumState(),
): PachinkoSlotReward {
  const slotRewards = buildPachinkoSlotRewards(
    totalTokenXp,
    slotCount,
    tableSeed,
    playerLevel,
    activeWeaponId,
    activeWeaponWeightMultiplier,
    nonActiveWeaponWeightMultiplier,
    momentumState,
  )
  return slotRewards[resolvePachinkoSlotIndex(landingRatio, slotRewards.length)] ?? slotRewards[0]
}

export function getPachinkoWeaponOddsRows(
  totalTokenXp: number,
  slotCount: number = PACHINKO_SLOT_COUNT,
  _tableSeed = 0,
  _playerLevel = 1,
  activeWeaponId?: WeaponId,
  activeWeaponWeightMultiplier = 1,
  nonActiveWeaponWeightMultiplier = 1,
  momentumState: PachinkoMomentumState = createInitialPachinkoMomentumState(),
): PachinkoWeaponOddsRow[] {
  const normalizedSlotCount = Math.max(1, Math.floor(slotCount))
  const level = getPachinkoRewardLevel(totalTokenXp)
  const spinProfile = createPachinkoSpinProfile(momentumState)
  const modifiers = activeWeaponId
    ? buildPachinkoSlotModifiers(activeWeaponId, level, normalizedSlotCount, spinProfile)
    : new Map<number, PachinkoSlotModifierKind>()
  const activeWeight = Math.max(1, activeWeaponWeightMultiplier * spinProfile.activeWeaponWeightMultiplier)
  const otherWeight = Math.max(0.2, nonActiveWeaponWeightMultiplier * spinProfile.nonActiveWeaponWeightMultiplier)
  const totalWeight = activeWeaponId
    ? activeWeight + otherWeight * Math.max(0, WEAPON_IDS.length - 1)
    : WEAPON_IDS.length

  const probabilities = new Map<WeaponId, number>()
  for (const weaponId of WEAPON_IDS) {
    const baseProbability =
      activeWeaponId
        ? (weaponId === activeWeaponId ? activeWeight / totalWeight : otherWeight / totalWeight)
        : 1 / WEAPON_IDS.length
    probabilities.set(weaponId, baseProbability)
  }

  for (const modifier of modifiers.values()) {
    if (!activeWeaponId) {
      continue
    }

    if (modifier === 'family') {
      probabilities.set(activeWeaponId, (probabilities.get(activeWeaponId) ?? 0) + 1 / normalizedSlotCount)
      continue
    }

    if (modifier === 'jackpot') {
      probabilities.set(activeWeaponId, (probabilities.get(activeWeaponId) ?? 0) + 1 / normalizedSlotCount)
    }
  }

  return WEAPON_IDS.map((weaponId) => {
    const probability = probabilities.get(weaponId) ?? 0
    return {
      weaponId,
      iconKey: `weapon-${weaponId}`,
      probability,
      percentLabel: `${Math.round(probability * 100)}%`,
    }
  })
}

export function applyPachinkoMomentumState(
  state: PachinkoMomentumState,
  reward: Pick<PachinkoSlotReward, 'modifier' | 'isNearJackpot'>,
): PachinkoMomentumUpdate {
  const wasFeverActive = isPachinkoFeverActive(state)
  let feverTokensRemaining = wasFeverActive ? Math.max(0, state.feverTokensRemaining - 1) : 0
  let feverCharge = wasFeverActive ? 0 : clampPachinkoCharge(state.feverCharge)
  let pityCounter = wasFeverActive ? 0 : Math.max(0, state.pityCounter)
  let outcome: PachinkoMomentumOutcome = 'normal'
  let feverTriggered = false

  if (reward.modifier?.kind === 'jackpot') {
    outcome = wasFeverActive ? 'fever-jackpot' : 'jackpot'
    pityCounter = 0
    if (wasFeverActive) {
      feverTokensRemaining = Math.min(PACHINKO_FEVER_DURATION_TOKENS, feverTokensRemaining + 1)
    } else {
      feverCharge = Math.max(0, feverCharge - 18)
    }
  } else if (!wasFeverActive) {
    pityCounter += 1
    if (reward.isNearJackpot) {
      outcome = 'near-miss'
    } else if (reward.modifier?.kind === 'bonus' || reward.modifier?.kind === 'family') {
      outcome = 'bonus'
    }

    feverCharge = clampPachinkoCharge(feverCharge + getPachinkoChargeGain(reward))
    if (feverCharge >= PACHINKO_FEVER_CHARGE_MAX) {
      feverTriggered = true
      feverTokensRemaining = PACHINKO_FEVER_DURATION_TOKENS
      feverCharge = 0
      pityCounter = 0
    }
  }

  return {
    state: {
      feverCharge,
      pityCounter,
      feverTokensRemaining,
      lastOutcome: outcome,
    },
    outcome,
    feverTriggered,
    wasFeverActive,
    isFeverActive: feverTokensRemaining > 0,
  }
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
  tokenXpMultiplier = 1,
): PachinkoTokenProgressResult {
  const baseTokenXp = getTokenXpForEnemy(enemyId)
  const grantedTokenXp = Math.max(0, Math.round(baseTokenXp * Math.max(0, tokenXpMultiplier)))
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
  momentumState: PachinkoMomentumState = createInitialPachinkoMomentumState(),
): PachinkoRewardResult {
  const { weaponId, star } = resolvePachinkoSlotReward(
    totalTokenXp,
    landingRatio,
    PACHINKO_SLOT_COUNT,
    tableSeed,
    playerLevel,
    activeWeaponId,
    1,
    1,
    momentumState,
  )
  return { weaponId, star }
}
