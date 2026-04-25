import type { WeaponAttackBehavior, WeaponDefinition } from '../domain/types.js'

interface PassiveEffects {
  damageMultiplier?: number
  fireRateMultiplier?: number
  projectileSpeedMultiplier?: number
  rangeDelta?: number
  knockbackForceMultiplier?: number
  hazardRadiusMultiplier?: number
  projectileCountDelta?: number
  critChanceDelta?: number
  critDamageMultiplierDelta?: number
  playerSpeedMultiplier?: number
  tokenXpMultiplier?: number
  incomingDamageMultiplier?: number
  bossDamageMultiplier?: number
  normalEnemyDamageMultiplier?: number
}

export type PassiveCardGrade = 'common' | 'rare' | 'epic' | 'legendary'

export interface PassiveCardChoice {
  id: PassiveCardId
  name: string
  description: string
  effectSummary: string
  effects: PassiveEffects
  grade: PassiveCardGrade
  gradeLabel: string
}

export interface PassiveStateEntry {
  count: number
  effects: PassiveEffects
}

interface PassiveRoll {
  effects: PassiveEffects
  quality: number
}

interface PassiveCardTemplate {
  id: string
  name: string
  description: string
  weight: {
    base: number
    levelScale?: number
    repeatPenalty?: number
  }
  roll: (level: number, random: () => number) => PassiveRoll
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const roundPercent = (value: number): number => Math.round(value * 100)

const getLevelTier = (level: number): number => Math.max(0, Math.floor((Math.max(1, level) - 1) / 5))

const createLevelScaledPercentRange = (
  baseMin: number,
  baseMax: number,
  level: number,
  step = 0.005,
  maxCap = 0.25,
): [number, number] => {
  const tier = getLevelTier(level)
  return [
    clamp(baseMin + tier * step, 0, maxCap),
    clamp(baseMax + tier * step, 0, maxCap),
  ]
}

const rollNumber = (
  random: () => number,
  min: number,
  max: number,
  precision = 0,
): { value: number; quality: number } => {
  const ratio = clamp(random(), 0, 0.999999)
  const raw = min + (max - min) * ratio
  if (precision <= 0) {
    return { value: Math.round(raw), quality: ratio }
  }

  const factor = 10 ** precision
  return { value: Math.round(raw * factor) / factor, quality: ratio }
}

const averageQuality = (...values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length

const gradeFromQuality = (quality: number): PassiveCardGrade => {
  if (quality >= 0.93) {
    return 'legendary'
  }
  if (quality >= 0.72) {
    return 'epic'
  }
  if (quality >= 0.4) {
    return 'rare'
  }
  return 'common'
}

const PASSIVE_GRADE_LABELS: Record<PassiveCardGrade, string> = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
}

const PASSIVE_CARD_TEMPLATES = [
  {
    id: 'rapid-trigger',
    name: '속사 트리거',
    description: '모든 무기의 공격 주기가 짧아집니다.',
    weight: { base: 1.3, levelScale: 0.02, repeatPenalty: 0.38 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.06, 0.11, level, 0.005, 0.18)
      const result = rollNumber(random, min, max, 2)
      return { effects: { fireRateMultiplier: 1 - result.value }, quality: result.quality }
    },
  },
  {
    id: 'keen-sense',
    name: '예리한 감각',
    description: '약점을 노려 치명타가 발생할 수 있습니다.',
    weight: { base: 1.2, levelScale: 0.018, repeatPenalty: 0.42 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.04, 0.09, level, 0.004, 0.16)
      const result = rollNumber(random, min, max, 2)
      return { effects: { critChanceDelta: result.value }, quality: result.quality }
    },
  },
  {
    id: 'big-hit',
    name: '한방 각',
    description: '치명타가 더 크게 터집니다.',
    weight: { base: 0.95, levelScale: 0.02, repeatPenalty: 0.5 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.18, 0.34, level, 0.012, 0.55)
      const result = rollNumber(random, min, max, 2)
      return { effects: { critDamageMultiplierDelta: result.value }, quality: result.quality }
    },
  },
  {
    id: 'long-barrel',
    name: '롱배럴 감성',
    description: '투사체 속도와 사거리가 늘어납니다.',
    weight: { base: 1.0, levelScale: 0.02, repeatPenalty: 0.4 },
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.05, 0.1, level, 0.005, 0.18)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      const rangeTier = getLevelTier(level)
      const range = rollNumber(random, 16 + rangeTier * 3, 28 + rangeTier * 4)
      return {
        effects: {
          projectileSpeedMultiplier: 1 + speed.value,
          rangeDelta: range.value,
        },
        quality: averageQuality(speed.quality, range.quality),
      }
    },
  },
  {
    id: 'heavy-push',
    name: '묵직한 밀어내기',
    description: '무기 충격이 강해져 적을 더 잘 밀어냅니다.',
    weight: { base: 0.95, levelScale: 0.018, repeatPenalty: 0.45 },
    roll(level, random) {
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.03, 0.07, level, 0.005, 0.14)
      const [pushMin, pushMax] = createLevelScaledPercentRange(0.08, 0.15, level, 0.006, 0.24)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      const push = rollNumber(random, pushMin, pushMax, 2)
      return {
        effects: {
          damageMultiplier: 1 + damage.value,
          knockbackForceMultiplier: 1 + push.value,
        },
        quality: averageQuality(damage.quality, push.quality),
      }
    },
  },
  {
    id: 'wide-zone',
    name: '영역 장악',
    description: '장판과 근접 범위가 넓어져 공간을 더 잘 지킵니다.',
    weight: { base: 1.0, levelScale: 0.02, repeatPenalty: 0.38 },
    roll(level, random) {
      const [radiusMin, radiusMax] = createLevelScaledPercentRange(0.06, 0.14, level, 0.006, 0.22)
      const radius = rollNumber(random, radiusMin, radiusMax, 2)
      const rangeTier = getLevelTier(level)
      const range = rollNumber(random, 8 + rangeTier * 2, 16 + rangeTier * 3)
      return {
        effects: {
          rangeDelta: range.value,
          hazardRadiusMultiplier: 1 + radius.value,
        },
        quality: averageQuality(radius.quality, range.quality),
      }
    },
  },
  {
    id: 'split-focus',
    name: '분산 집중',
    description: '분사형 무기가 탄을 더 흩뿌립니다.',
    weight: { base: 0.85, levelScale: 0.03, repeatPenalty: 0.55 },
    roll(level, random) {
      const tier = getLevelTier(level)
      const roll = random()
      const extraProjectile = tier >= 3 && roll > 0.88 ? 2 : 1
      return { effects: { projectileCountDelta: extraProjectile }, quality: roll }
    },
  },
  {
    id: 'runner-instinct',
    name: '런각 본능',
    description: '캐릭터 이동 속도가 올라 카이팅 여지가 커집니다.',
    weight: { base: 1.15, levelScale: 0.014, repeatPenalty: 0.35 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.03, 0.07, level, 0.003, 0.12)
      const result = rollNumber(random, min, max, 2)
      return { effects: { playerSpeedMultiplier: 1 + result.value }, quality: result.quality }
    },
  },
  {
    id: 'jackpot-fever',
    name: '잭팟 열기',
    description: '적이 주는 파친코 토큰 XP가 더 크게 불어납니다.',
    weight: { base: 0.92, levelScale: 0.03, repeatPenalty: 0.44 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.08, 0.16, level, 0.006, 0.28)
      const result = rollNumber(random, min, max, 2)
      return { effects: { tokenXpMultiplier: 1 + result.value }, quality: result.quality }
    },
  },
  {
    id: 'lane-reading',
    name: '레인 리딩',
    description: '파친코 흐름을 읽듯 장거리 화력과 투사체 제어가 좋아집니다.',
    weight: { base: 0.9, levelScale: 0.02, repeatPenalty: 0.42 },
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.004, 0.14)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.1)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          projectileSpeedMultiplier: 1 + speed.value,
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(speed.quality, damage.quality),
      }
    },
  },
  {
    id: 'guard-breaker',
    name: '가드 브레이커',
    description: '강한 적일수록 더 세게 찍어눌러 보스전에 힘을 실어 줍니다.',
    weight: { base: 0.8, levelScale: 0.03, repeatPenalty: 0.5 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.06, 0.12, level, 0.005, 0.2)
      const result = rollNumber(random, min, max, 2)
      return { effects: { bossDamageMultiplier: 1 + result.value }, quality: result.quality }
    },
  },
  {
    id: 'crowd-reaper',
    name: '군중 수확',
    description: '일반 적 무리를 정리하는 화력이 한층 안정적으로 올라갑니다.',
    weight: { base: 1.05, levelScale: 0.02, repeatPenalty: 0.42 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.05, 0.1, level, 0.004, 0.18)
      const result = rollNumber(random, min, max, 2)
      return { effects: { normalEnemyDamageMultiplier: 1 + result.value }, quality: result.quality }
    },
  },
  {
    id: 'panic-shield',
    name: '패닉 실드',
    description: '위험한 순간 받는 피해를 덜어 생존 여유를 벌어줍니다.',
    weight: { base: 0.95, levelScale: 0.022, repeatPenalty: 0.36 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.05, 0.1, level, 0.004, 0.18)
      const result = rollNumber(random, min, max, 2)
      return { effects: { incomingDamageMultiplier: 1 - result.value }, quality: result.quality }
    },
  },
  {
    id: 'finisher-instinct',
    name: '마무리 본능',
    description: '결정타를 노리는 감각으로 치확과 화력을 함께 보강합니다.',
    weight: { base: 0.82, levelScale: 0.018, repeatPenalty: 0.5 },
    roll(level, random) {
      const [critMin, critMax] = createLevelScaledPercentRange(0.03, 0.07, level, 0.003, 0.12)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.1)
      const crit = rollNumber(random, critMin, critMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          critChanceDelta: crit.value,
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(crit.quality, damage.quality),
      }
    },
  },
  {
    id: 'steady-hands',
    name: '스테디 핸즈',
    description: '반동을 다듬듯 명중 안정성과 화력을 함께 끌어올립니다.',
    weight: { base: 0.96, levelScale: 0.016, repeatPenalty: 0.4 },
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.03, 0.07, level, 0.003, 0.12)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.09)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          projectileSpeedMultiplier: 1 + speed.value,
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(speed.quality, damage.quality),
      }
    },
  },
  {
    id: 'salvage-routine',
    name: '회수 루틴',
    description: '파친코 흐름과 이동 리듬을 다듬어 토큰 수급과 기동성을 함께 챙깁니다.',
    weight: { base: 0.88, levelScale: 0.022, repeatPenalty: 0.38 },
    roll(level, random) {
      const [tokenMin, tokenMax] = createLevelScaledPercentRange(0.05, 0.12, level, 0.004, 0.18)
      const [moveMin, moveMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.08)
      const token = rollNumber(random, tokenMin, tokenMax, 2)
      const move = rollNumber(random, moveMin, moveMax, 2)
      return {
        effects: {
          tokenXpMultiplier: 1 + token.value,
          playerSpeedMultiplier: 1 + move.value,
        },
        quality: averageQuality(token.quality, move.quality),
      }
    },
  },
  {
    id: 'thick-armor',
    name: '두꺼운 장갑',
    description: '받는 피해를 줄이는 대신 일반 적 상대 압박도 조금 더 안정됩니다.',
    weight: { base: 0.86, levelScale: 0.02, repeatPenalty: 0.42 },
    roll(level, random) {
      const [defMin, defMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.003, 0.14)
      const [mobMin, mobMax] = createLevelScaledPercentRange(0.03, 0.07, level, 0.003, 0.12)
      const defense = rollNumber(random, defMin, defMax, 2)
      const crowd = rollNumber(random, mobMin, mobMax, 2)
      return {
        effects: {
          incomingDamageMultiplier: 1 - defense.value,
          normalEnemyDamageMultiplier: 1 + crowd.value,
        },
        quality: averageQuality(defense.quality, crowd.quality),
      }
    },
  },
  {
    id: 'critical-mass',
    name: '크리티컬 매스',
    description: '치명타 확률과 피해를 함께 밀어주는 하이리스크 카드입니다.',
    weight: { base: 0.72, levelScale: 0.02, repeatPenalty: 0.56 },
    roll(level, random) {
      const [critMin, critMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.09)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.12, 0.24, level, 0.01, 0.4)
      const crit = rollNumber(random, critMin, critMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          critChanceDelta: crit.value,
          critDamageMultiplierDelta: damage.value,
        },
        quality: averageQuality(crit.quality, damage.quality),
      }
    },
  },
] as const satisfies ReadonlyArray<PassiveCardTemplate>

export type PassiveCardId = (typeof PASSIVE_CARD_TEMPLATES)[number]['id']
export type PassiveState = Partial<Record<PassiveCardId, PassiveStateEntry>>
export type PassiveCardDefinition = PassiveCardChoice

export interface PassiveTotals {
  damageMultiplier: number
  fireRateMultiplier: number
  projectileSpeedMultiplier: number
  rangeDelta: number
  knockbackForceMultiplier: number
  hazardRadiusMultiplier: number
  projectileCountDelta: number
  critChance: number
  critDamageMultiplier: number
  playerSpeedMultiplier: number
  tokenXpMultiplier: number
  incomingDamageMultiplier: number
  bossDamageMultiplier: number
  normalEnemyDamageMultiplier: number
}

export interface CriticalHitResult {
  damage: number
  isCritical: boolean
  critChance: number
  critDamageMultiplier: number
}

export const BASE_CRIT_DAMAGE_MULTIPLIER = 1.5

export function createInitialPassiveState(): PassiveState {
  return {}
}

function getPassiveTemplate(id: PassiveCardId): PassiveCardTemplate {
  const definition = PASSIVE_CARD_TEMPLATES.find((card) => card.id === id)
  if (!definition) {
    throw new Error(`Unknown passive card: ${id}`)
  }
  return definition
}

export function getPassiveGradeLabel(grade: PassiveCardGrade): string {
  return PASSIVE_GRADE_LABELS[grade]
}

function formatEffectSummary(effects: PassiveEffects): string {
  const lines: string[] = []

  if (effects.fireRateMultiplier !== undefined && effects.fireRateMultiplier < 1) {
    lines.push(`공격속도 +${roundPercent(1 - effects.fireRateMultiplier)}%`)
  }
  if (effects.critChanceDelta) {
    lines.push(`치명타 확률 +${roundPercent(effects.critChanceDelta)}%`)
  }
  if (effects.critDamageMultiplierDelta) {
    lines.push(`치명타 피해 +${roundPercent(effects.critDamageMultiplierDelta)}%`)
  }
  if (effects.projectileSpeedMultiplier !== undefined && effects.projectileSpeedMultiplier > 1) {
    lines.push(`투사체 속도 +${roundPercent(effects.projectileSpeedMultiplier - 1)}%`)
  }
  if (effects.rangeDelta) {
    lines.push(`범위 +${Math.round(effects.rangeDelta)}`)
  }
  if (effects.damageMultiplier !== undefined && effects.damageMultiplier > 1) {
    lines.push(`피해 +${roundPercent(effects.damageMultiplier - 1)}%`)
  }
  if (effects.knockbackForceMultiplier !== undefined && effects.knockbackForceMultiplier > 1) {
    lines.push(`넉백 +${roundPercent(effects.knockbackForceMultiplier - 1)}%`)
  }
  if (effects.hazardRadiusMultiplier !== undefined && effects.hazardRadiusMultiplier > 1) {
    lines.push(`장판 반경 +${roundPercent(effects.hazardRadiusMultiplier - 1)}%`)
  }
  if (effects.projectileCountDelta) {
    lines.push(`분사 투사체 +${Math.round(effects.projectileCountDelta)}`)
  }
  if (effects.playerSpeedMultiplier !== undefined && effects.playerSpeedMultiplier > 1) {
    lines.push(`이동속도 +${roundPercent(effects.playerSpeedMultiplier - 1)}%`)
  }
  if (effects.tokenXpMultiplier !== undefined && effects.tokenXpMultiplier > 1) {
    lines.push(`토큰 XP +${roundPercent(effects.tokenXpMultiplier - 1)}%`)
  }
  if (effects.incomingDamageMultiplier !== undefined && effects.incomingDamageMultiplier < 1) {
    lines.push(`받는 피해 -${roundPercent(1 - effects.incomingDamageMultiplier)}%`)
  }
  if (effects.bossDamageMultiplier !== undefined && effects.bossDamageMultiplier > 1) {
    lines.push(`보스 피해 +${roundPercent(effects.bossDamageMultiplier - 1)}%`)
  }
  if (effects.normalEnemyDamageMultiplier !== undefined && effects.normalEnemyDamageMultiplier > 1) {
    lines.push(`일반 적 피해 +${roundPercent(effects.normalEnemyDamageMultiplier - 1)}%`)
  }

  return lines.join(' · ')
}

function mergeEffects(existing: PassiveEffects = {}, next: PassiveEffects): PassiveEffects {
  return {
    damageMultiplier: (existing.damageMultiplier ?? 1) * (next.damageMultiplier ?? 1),
    fireRateMultiplier: (existing.fireRateMultiplier ?? 1) * (next.fireRateMultiplier ?? 1),
    projectileSpeedMultiplier: (existing.projectileSpeedMultiplier ?? 1) * (next.projectileSpeedMultiplier ?? 1),
    rangeDelta: (existing.rangeDelta ?? 0) + (next.rangeDelta ?? 0),
    knockbackForceMultiplier: (existing.knockbackForceMultiplier ?? 1) * (next.knockbackForceMultiplier ?? 1),
    hazardRadiusMultiplier: (existing.hazardRadiusMultiplier ?? 1) * (next.hazardRadiusMultiplier ?? 1),
    projectileCountDelta: (existing.projectileCountDelta ?? 0) + (next.projectileCountDelta ?? 0),
    critChanceDelta: (existing.critChanceDelta ?? 0) + (next.critChanceDelta ?? 0),
    critDamageMultiplierDelta: (existing.critDamageMultiplierDelta ?? 0) + (next.critDamageMultiplierDelta ?? 0),
    playerSpeedMultiplier: (existing.playerSpeedMultiplier ?? 1) * (next.playerSpeedMultiplier ?? 1),
    tokenXpMultiplier: (existing.tokenXpMultiplier ?? 1) * (next.tokenXpMultiplier ?? 1),
    incomingDamageMultiplier: (existing.incomingDamageMultiplier ?? 1) * (next.incomingDamageMultiplier ?? 1),
    bossDamageMultiplier: (existing.bossDamageMultiplier ?? 1) * (next.bossDamageMultiplier ?? 1),
    normalEnemyDamageMultiplier: (existing.normalEnemyDamageMultiplier ?? 1) * (next.normalEnemyDamageMultiplier ?? 1),
  }
}

export function createPassiveCardChoice(
  id: PassiveCardId,
  level: number,
  random: () => number = Math.random,
): PassiveCardChoice {
  const template = getPassiveTemplate(id)
  const roll = template.roll(level, random)
  const grade = gradeFromQuality(roll.quality)
  return {
    id,
    name: template.name,
    description: template.description,
    effectSummary: formatEffectSummary(roll.effects),
    effects: roll.effects,
    grade,
    gradeLabel: getPassiveGradeLabel(grade),
  }
}

function getPassiveCardWeight(
  template: PassiveCardTemplate,
  level: number,
  state: PassiveState,
): number {
  const ownedCount = state[template.id as PassiveCardId]?.count ?? 0
  const tier = getLevelTier(level)
  const levelScale = template.weight.levelScale ?? 0
  const repeatPenalty = template.weight.repeatPenalty ?? 0.4
  const weighted = template.weight.base + tier * levelScale - ownedCount * repeatPenalty
  return Math.max(0.05, weighted)
}

function pickWeightedTemplate(
  available: PassiveCardTemplate[],
  level: number,
  state: PassiveState,
  random: () => number,
): PassiveCardTemplate {
  const weighted = available.map((template) => ({
    template,
    weight: getPassiveCardWeight(template, level, state),
  }))
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random() * totalWeight

  for (const entry of weighted) {
    roll -= entry.weight
    if (roll <= 0) {
      return entry.template
    }
  }

  return weighted[weighted.length - 1].template
}

export function addPassiveCard(state: PassiveState, choice: PassiveCardChoice): PassiveState {
  const previous = state[choice.id]
  return {
    ...state,
    [choice.id]: {
      count: (previous?.count ?? 0) + 1,
      effects: mergeEffects(previous?.effects, choice.effects),
    },
  }
}

export function getPassiveCardChoices(
  level: number,
  state: PassiveState = {},
  random: () => number = Math.random,
): PassiveCardChoice[] {
  const remaining = [...PASSIVE_CARD_TEMPLATES]
  const picks: PassiveCardChoice[] = []

  while (remaining.length > 0 && picks.length < 3) {
    const template = pickWeightedTemplate(remaining, level, state, random)
    picks.push(createPassiveCardChoice(template.id as PassiveCardId, level, random))
    const index = remaining.findIndex((entry) => entry.id === template.id)
    if (index >= 0) {
      remaining.splice(index, 1)
    }
  }

  return picks
}

export function getPassiveTotals(state: PassiveState = {}): PassiveTotals {
  const totals: PassiveTotals = {
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    projectileSpeedMultiplier: 1,
    rangeDelta: 0,
    knockbackForceMultiplier: 1,
    hazardRadiusMultiplier: 1,
    projectileCountDelta: 0,
    critChance: 0,
    critDamageMultiplier: BASE_CRIT_DAMAGE_MULTIPLIER,
    playerSpeedMultiplier: 1,
    tokenXpMultiplier: 1,
    incomingDamageMultiplier: 1,
    bossDamageMultiplier: 1,
    normalEnemyDamageMultiplier: 1,
  }

  for (const entry of Object.values(state)) {
    if (!entry || entry.count <= 0) {
      continue
    }

    const effects = entry.effects
    totals.damageMultiplier *= effects.damageMultiplier ?? 1
    totals.fireRateMultiplier *= effects.fireRateMultiplier ?? 1
    totals.projectileSpeedMultiplier *= effects.projectileSpeedMultiplier ?? 1
    totals.rangeDelta += effects.rangeDelta ?? 0
    totals.knockbackForceMultiplier *= effects.knockbackForceMultiplier ?? 1
    totals.hazardRadiusMultiplier *= effects.hazardRadiusMultiplier ?? 1
    totals.projectileCountDelta += effects.projectileCountDelta ?? 0
    totals.critChance += effects.critChanceDelta ?? 0
    totals.critDamageMultiplier += effects.critDamageMultiplierDelta ?? 0
    totals.playerSpeedMultiplier *= effects.playerSpeedMultiplier ?? 1
    totals.tokenXpMultiplier *= effects.tokenXpMultiplier ?? 1
    totals.incomingDamageMultiplier *= effects.incomingDamageMultiplier ?? 1
    totals.bossDamageMultiplier *= effects.bossDamageMultiplier ?? 1
    totals.normalEnemyDamageMultiplier *= effects.normalEnemyDamageMultiplier ?? 1
  }

  totals.critChance = Math.min(0.55, totals.critChance)
  return totals
}

function applyAttackBehaviorPassives(
  behavior: WeaponAttackBehavior,
  totals: PassiveTotals,
): WeaponAttackBehavior {
  if (behavior.kind === 'melee-cleave') {
    return {
      ...behavior,
      range: Math.max(1, Math.round(behavior.range + totals.rangeDelta)),
    }
  }

  if (behavior.kind === 'spray-hazard') {
    return {
      ...behavior,
      projectileCount: Math.max(1, behavior.projectileCount + totals.projectileCountDelta),
      hazardRadius: Math.max(1, Math.round(behavior.hazardRadius * totals.hazardRadiusMultiplier)),
    }
  }

  return behavior
}

export function applyPassiveWeaponEffects(
  weapon: WeaponDefinition,
  state: PassiveState = {},
): WeaponDefinition {
  const totals = getPassiveTotals(state)
  const attackBehavior = applyAttackBehaviorPassives(weapon.attackBehavior, totals)

  return {
    ...weapon,
    range: typeof weapon.range === 'number'
      ? Math.max(1, Math.round(weapon.range + totals.rangeDelta))
      : weapon.range,
    damage: Math.max(1, Math.round(weapon.damage * totals.damageMultiplier)),
    fireRateMs: Math.max(65, Math.round(weapon.fireRateMs * totals.fireRateMultiplier)),
    projectileSpeed: Math.max(0, Math.round(weapon.projectileSpeed * totals.projectileSpeedMultiplier)),
    knockback: {
      ...weapon.knockback,
      force: Math.round(weapon.knockback.force * totals.knockbackForceMultiplier),
    },
    attackBehavior,
  }
}

export function resolveCriticalHit(
  baseDamage: number,
  state: PassiveState = {},
  random: () => number = Math.random,
): CriticalHitResult {
  const totals = getPassiveTotals(state)
  const isCritical = totals.critChance > 0 && random() < totals.critChance
  return {
    damage: isCritical ? Math.max(1, Math.round(baseDamage * totals.critDamageMultiplier)) : baseDamage,
    isCritical,
    critChance: totals.critChance,
    critDamageMultiplier: totals.critDamageMultiplier,
  }
}

export function applyPassivePlayerSpeed(baseSpeed: number, state: PassiveState = {}): number {
  return Math.round(baseSpeed * getPassiveTotals(state).playerSpeedMultiplier)
}

export function getPassiveIncomingDamageMultiplier(state: PassiveState = {}): number {
  return getPassiveTotals(state).incomingDamageMultiplier
}

export function getPassiveTokenXpMultiplier(state: PassiveState = {}): number {
  return getPassiveTotals(state).tokenXpMultiplier
}

export function getPassiveEnemyDamageMultiplier(isBossEnemy: boolean, state: PassiveState = {}): number {
  const totals = getPassiveTotals(state)
  return isBossEnemy ? totals.bossDamageMultiplier : totals.normalEnemyDamageMultiplier
}

export function getPassiveSummaryLines(state: PassiveState = {}): string[] {
  const entries = Object.entries(state) as Array<[PassiveCardId, PassiveStateEntry | undefined]>
  const activeEntries = entries.filter(([, entry]) => entry && entry.count > 0)

  if (activeEntries.length === 0) {
    return ['패시브 없음 · 레벨업하면 3장 카드 중 하나를 선택']
  }

  return activeEntries.map(([id, entry]) => {
    const template = getPassiveTemplate(id)
    return `${template.name}${(entry?.count ?? 0) > 1 ? ` × ${entry?.count}` : ''} · ${formatEffectSummary(entry?.effects ?? {})}`
  })
}
