import type { WeaponId } from '../data/contentIds.js'
import type { WeaponAttackBehavior, WeaponAttributeDefinition, WeaponDefinition } from '../domain/types.js'
import { getPachinkoWeaponFamily, type PachinkoWeaponFamily } from './pachinkoRewards.js'

interface PassiveEffects {
  damageMultiplier?: number
  fireRateMultiplier?: number
  projectileSpeedMultiplier?: number
  projectileLifetimeMultiplier?: number
  projectileSizeMultiplier?: number
  rangeDelta?: number
  knockbackForceMultiplier?: number
  hazardRadiusMultiplier?: number
  hazardDurationMultiplier?: number
  projectileCountDelta?: number
  turretDurationMultiplier?: number
  turretFireRateMultiplier?: number
  summonDurationMultiplier?: number
  summonCountDelta?: number
  ricochetBouncesDelta?: number
  ricochetRangeMultiplier?: number
  healOnHitDelta?: number
  statusDurationMultiplier?: number
  statusDamageMultiplier?: number
  statusSlowMultiplier?: number
  critChanceDelta?: number
  critDamageMultiplierDelta?: number
  playerSpeedMultiplier?: number
  playerXpMultiplier?: number
  tokenXpMultiplier?: number
  incomingDamageMultiplier?: number
  bossDamageMultiplier?: number
  normalEnemyDamageMultiplier?: number
  pachinkoActiveWeaponWeightMultiplier?: number
  pachinkoNonActiveWeaponWeightMultiplier?: number
  lootAttractionRadiusMultiplier?: number
  lootCollectRadiusMultiplier?: number
  lootAttractionSpeedMultiplier?: number
  heartHealMultiplier?: number
}

export type PassiveCardGrade = 'common' | 'rare' | 'epic' | 'legendary'
export type PassiveCardKind = 'passive' | 'general' | 'weapon-specialized'

export interface PassiveCardChoice {
  id: PassiveCardId
  name: string
  description: string
  effectSummary: string
  effects: PassiveEffects
  kind: PassiveCardKind
  kindLabel: string
  grade: PassiveCardGrade
  gradeLabel: string
  iconKey?: string
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
  kind?: PassiveCardKind
  weaponId?: WeaponId
  maxCount?: number
  preferredFamilies?: PachinkoWeaponFamily[]
  weight: {
    base: number
    levelScale?: number
    repeatPenalty?: number
    familyBonus?: number
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

const PASSIVE_KIND_LABELS: Record<PassiveCardKind, string> = {
  passive: '패시브',
  general: '일반 카드',
  'weapon-specialized': '무기 특화',
}

const PASSIVE_CARD_TEMPLATES = [
  {
    id: 'rapid-trigger',
    name: '속사 트리거',
    description: '전반적인 공격 주기가 짧아집니다.',
    kind: 'passive',
    preferredFamilies: ['rapid', 'starter'],
    weight: { base: 1.25, levelScale: 0.02, repeatPenalty: 0.38, familyBonus: 0.52 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.08, 0.13, level, 0.005, 0.2)
      const result = rollNumber(random, min, max, 2)
      return { effects: { fireRateMultiplier: 1 - result.value }, quality: result.quality }
    },
  },
  {
    id: 'keen-sense',
    name: '예리한 감각',
    description: '약점을 노려 치명타가 발생할 수 있습니다.',
    kind: 'passive',
    preferredFamilies: ['precision', 'rapid'],
    weight: { base: 1.12, levelScale: 0.018, repeatPenalty: 0.42, familyBonus: 0.44 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.05, 0.1, level, 0.004, 0.18)
      const result = rollNumber(random, min, max, 2)
      return { effects: { critChanceDelta: result.value }, quality: result.quality }
    },
  },
  {
    id: 'big-hit',
    name: '한방 각',
    description: '치명타가 더 크게 터집니다.',
    kind: 'passive',
    preferredFamilies: ['heavy', 'precision'],
    weight: { base: 0.9, levelScale: 0.02, repeatPenalty: 0.5, familyBonus: 0.46 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.22, 0.38, level, 0.012, 0.6)
      const result = rollNumber(random, min, max, 2)
      return { effects: { critDamageMultiplierDelta: result.value }, quality: result.quality }
    },
  },
  {
    id: 'long-barrel',
    name: '롱배럴 감성',
    description: '투사체 속도와 사거리가 늘어납니다.',
    kind: 'passive',
    preferredFamilies: ['pierce', 'precision', 'rapid'],
    weight: { base: 0.96, levelScale: 0.02, repeatPenalty: 0.4, familyBonus: 0.5 },
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.06, 0.11, level, 0.005, 0.2)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      const rangeTier = getLevelTier(level)
      const range = rollNumber(random, 20 + rangeTier * 4, 34 + rangeTier * 5)
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
    id: 'rangefinder',
    name: '사거리 계산',
    description: '투사체와 타격 범위가 더 멀리 뻗어 안정적으로 선공을 잡습니다.',
    kind: 'passive',
    preferredFamilies: ['precision', 'rapid', 'heavy', 'zone'],
    weight: { base: 0.94, levelScale: 0.018, repeatPenalty: 0.4, familyBonus: 0.46 },
    roll(level, random) {
      const tier = getLevelTier(level)
      const range = rollNumber(random, 24 + tier * 4, 40 + tier * 6)
      return {
        effects: {
          rangeDelta: range.value,
        },
        quality: range.quality,
      }
    },
  },
  {
    id: 'heavy-push',
    name: '묵직한 밀어내기',
    description: '무기 충격이 강해져 적을 더 잘 밀어냅니다.',
    kind: 'passive',
    preferredFamilies: ['heavy', 'melee'],
    weight: { base: 0.9, levelScale: 0.018, repeatPenalty: 0.45, familyBonus: 0.5 },
    roll(level, random) {
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.005, 0.16)
      const [pushMin, pushMax] = createLevelScaledPercentRange(0.1, 0.17, level, 0.006, 0.26)
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
    kind: 'passive',
    preferredFamilies: ['spray', 'zone', 'melee'],
    weight: { base: 0.96, levelScale: 0.02, repeatPenalty: 0.38, familyBonus: 0.56 },
    roll(level, random) {
      const [radiusMin, radiusMax] = createLevelScaledPercentRange(0.08, 0.16, level, 0.006, 0.24)
      const radius = rollNumber(random, radiusMin, radiusMax, 2)
      const rangeTier = getLevelTier(level)
      const range = rollNumber(random, 10 + rangeTier * 3, 20 + rangeTier * 4)
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
    description: '분사형·연발형 무기가 투사체를 더 뿌립니다.',
    kind: 'passive',
    preferredFamilies: ['spray', 'zone'],
    weight: { base: 0.82, levelScale: 0.03, repeatPenalty: 0.55, familyBonus: 0.72 },
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
    kind: 'general',
    weight: { base: 1.08, levelScale: 0.014, repeatPenalty: 0.35 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.04, 0.08, level, 0.003, 0.14)
      const result = rollNumber(random, min, max, 2)
      return { effects: { playerSpeedMultiplier: 1 + result.value }, quality: result.quality }
    },
  },
  {
    id: 'magnet-array',
    name: '마그넷 어레이',
    description: '토큰과 하트가 더 먼 거리에서도 빨려 들어옵니다.',
    kind: 'general',
    preferredFamilies: ['starter', 'zone', 'rapid'],
    weight: { base: 0.96, levelScale: 0.02, repeatPenalty: 0.36, familyBonus: 0.42 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.2, 0.36, level, 0.01, 0.54)
      const result = rollNumber(random, min, max, 2)
      return {
        effects: { lootAttractionRadiusMultiplier: 1 + result.value },
        quality: result.quality,
      }
    },
  },
  {
    id: 'vacuum-pocket',
    name: '진공 포켓',
    description: '가까워진 보상을 더 빨리 빨아들이고 획득 판정도 넉넉해집니다.',
    kind: 'general',
    preferredFamilies: ['spray', 'zone', 'melee'],
    weight: { base: 0.9, levelScale: 0.02, repeatPenalty: 0.38, familyBonus: 0.46 },
    roll(level, random) {
      const [collectMin, collectMax] = createLevelScaledPercentRange(0.14, 0.26, level, 0.008, 0.4)
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.14, 0.28, level, 0.01, 0.46)
      const collect = rollNumber(random, collectMin, collectMax, 2)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      return {
        effects: {
          lootCollectRadiusMultiplier: 1 + collect.value,
          lootAttractionSpeedMultiplier: 1 + speed.value,
        },
        quality: averageQuality(collect.quality, speed.quality),
      }
    },
  },
  {
    id: 'recovery-loop',
    name: '리커버리 루프',
    description: '하트 회복량이 늘고 안전하게 회수할 범위도 소폭 넓어집니다.',
    kind: 'general',
    preferredFamilies: ['heavy', 'melee', 'starter'],
    weight: { base: 0.84, levelScale: 0.018, repeatPenalty: 0.4, familyBonus: 0.38 },
    roll(level, random) {
      const [healMin, healMax] = createLevelScaledPercentRange(0.12, 0.22, level, 0.008, 0.36)
      const [collectMin, collectMax] = createLevelScaledPercentRange(0.08, 0.14, level, 0.006, 0.24)
      const heal = rollNumber(random, healMin, healMax, 2)
      const collect = rollNumber(random, collectMin, collectMax, 2)
      return {
        effects: {
          heartHealMultiplier: 1 + heal.value,
          lootCollectRadiusMultiplier: 1 + collect.value,
        },
        quality: averageQuality(heal.quality, collect.quality),
      }
    },
  },
  {
    id: 'scavenger-route',
    name: '스캐빈저 루트',
    description: '회수 경로를 최적화해 토큰 경험치와 흡입 속도를 함께 높입니다.',
    kind: 'general',
    preferredFamilies: ['rapid', 'starter', 'chain'],
    weight: { base: 0.82, levelScale: 0.02, repeatPenalty: 0.42, familyBonus: 0.44 },
    roll(level, random) {
      const [tokenMin, tokenMax] = createLevelScaledPercentRange(0.04, 0.1, level, 0.004, 0.18)
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.08, 0.18, level, 0.008, 0.3)
      const token = rollNumber(random, tokenMin, tokenMax, 2)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      return {
        effects: {
          tokenXpMultiplier: 1 + token.value,
          lootAttractionSpeedMultiplier: 1 + speed.value,
        },
        quality: averageQuality(token.quality, speed.quality),
      }
    },
  },
  {
    id: 'jackpot-fever',
    name: '잭팟 열기',
    description: '적이 주는 파친코 토큰 XP가 더 크게 불어납니다.',
    kind: 'general',
    preferredFamilies: ['starter', 'zone', 'rapid'],
    weight: { base: 0.9, levelScale: 0.03, repeatPenalty: 0.44, familyBonus: 0.48 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.08, 0.16, level, 0.006, 0.28)
      const result = rollNumber(random, min, max, 2)
      return {
        effects: {
          tokenXpMultiplier: 1 + result.value,
          pachinkoActiveWeaponWeightMultiplier: 1 + Math.max(0.04, result.value * 0.6),
        },
        quality: result.quality,
      }
    },
  },
  {
    id: 'loaded-reel',
    name: '로드드 릴',
    description: '현재 장착 무기 계열이 파친코 배정표에 더 자주 올라옵니다.',
    kind: 'general',
    preferredFamilies: ['starter', 'rapid', 'precision', 'heavy'],
    weight: { base: 0.86, levelScale: 0.02, repeatPenalty: 0.42, familyBonus: 0.48 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.14, 0.28, level, 0.01, 0.46)
      const result = rollNumber(random, min, max, 2)
      return {
        effects: { pachinkoActiveWeaponWeightMultiplier: 1 + result.value },
        quality: result.quality,
      }
    },
  },
  {
    id: 'wide-catalog',
    name: '와이드 카탈로그',
    description: '비활성 무기들도 더 자주 배정되어 보상풀이 넓어집니다.',
    kind: 'general',
    preferredFamilies: ['chain', 'zone', 'spray'],
    weight: { base: 0.8, levelScale: 0.018, repeatPenalty: 0.44, familyBonus: 0.42 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.1, 0.22, level, 0.008, 0.36)
      const result = rollNumber(random, min, max, 2)
      return {
        effects: { pachinkoNonActiveWeaponWeightMultiplier: 1 + result.value },
        quality: result.quality,
      }
    },
  },
  {
    id: 'lane-reading',
    name: '레인 리딩',
    description: '파친코 흐름을 읽듯 장거리 화력과 투사체 제어가 좋아집니다.',
    kind: 'passive',
    preferredFamilies: ['pierce', 'precision', 'rapid'],
    weight: { base: 0.86, levelScale: 0.02, repeatPenalty: 0.42, familyBonus: 0.52 },
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
    kind: 'passive',
    preferredFamilies: ['heavy', 'melee', 'precision'],
    weight: { base: 0.78, levelScale: 0.03, repeatPenalty: 0.5, familyBonus: 0.58 },
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
    kind: 'passive',
    preferredFamilies: ['spray', 'chain', 'zone'],
    weight: { base: 1.0, levelScale: 0.02, repeatPenalty: 0.42, familyBonus: 0.54 },
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
    kind: 'passive',
    preferredFamilies: ['melee', 'heavy', 'starter'],
    weight: { base: 0.92, levelScale: 0.022, repeatPenalty: 0.36, familyBonus: 0.42 },
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.06, 0.11, level, 0.004, 0.2)
      const result = rollNumber(random, min, max, 2)
      return { effects: { incomingDamageMultiplier: 1 - result.value }, quality: result.quality }
    },
  },
  {
    id: 'finisher-instinct',
    name: '마무리 본능',
    description: '결정타를 노리는 감각으로 치확과 화력을 함께 보강합니다.',
    kind: 'passive',
    preferredFamilies: ['precision', 'rapid', 'heavy'],
    weight: { base: 0.78, levelScale: 0.018, repeatPenalty: 0.5, familyBonus: 0.52 },
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
    kind: 'passive',
    preferredFamilies: ['precision', 'pierce', 'rapid'],
    weight: { base: 0.9, levelScale: 0.016, repeatPenalty: 0.4, familyBonus: 0.48 },
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
    kind: 'general',
    preferredFamilies: ['starter', 'rapid', 'zone'],
    weight: { base: 0.84, levelScale: 0.022, repeatPenalty: 0.38, familyBonus: 0.5 },
    roll(level, random) {
      const [tokenMin, tokenMax] = createLevelScaledPercentRange(0.05, 0.12, level, 0.004, 0.18)
      const [moveMin, moveMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.08)
      const token = rollNumber(random, tokenMin, tokenMax, 2)
      const move = rollNumber(random, moveMin, moveMax, 2)
      return {
        effects: {
          tokenXpMultiplier: 1 + token.value,
          playerSpeedMultiplier: 1 + move.value,
          pachinkoActiveWeaponWeightMultiplier: 1 + Math.max(0.03, token.value * 0.4),
        },
        quality: averageQuality(token.quality, move.quality),
      }
    },
  },
  {
    id: 'thick-armor',
    name: '두꺼운 장갑',
    description: '받는 피해를 줄이는 대신 일반 적 상대 압박도 조금 더 안정됩니다.',
    kind: 'passive',
    preferredFamilies: ['heavy', 'melee', 'starter'],
    weight: { base: 0.82, levelScale: 0.02, repeatPenalty: 0.42, familyBonus: 0.46 },
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
    kind: 'passive',
    preferredFamilies: ['precision', 'rapid', 'heavy'],
    weight: { base: 0.68, levelScale: 0.02, repeatPenalty: 0.56, familyBonus: 0.54 },
    roll(level, random) {
      const [critMin, critMax] = createLevelScaledPercentRange(0.03, 0.06, level, 0.003, 0.11)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.14, 0.26, level, 0.01, 0.44)
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
  {
    id: 'acid-bloom',
    name: '산성 만개',
    description: '분사와 장판 계열 무기가 더 넓고 끈질기게 압박합니다.',
    kind: 'passive',
    preferredFamilies: ['spray', 'zone'],
    weight: { base: 0.8, levelScale: 0.024, repeatPenalty: 0.45, familyBonus: 0.72 },
    roll(level, random) {
      const [radiusMin, radiusMax] = createLevelScaledPercentRange(0.05, 0.1, level, 0.004, 0.16)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.1)
      const radius = rollNumber(random, radiusMin, radiusMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          hazardRadiusMultiplier: 1 + radius.value,
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(radius.quality, damage.quality),
      }
    },
  },
  {
    id: 'needle-lattice',
    name: '니들 래티스',
    description: '관통/정밀 계열 무기가 더 빠르고 치명적으로 박힙니다.',
    kind: 'passive',
    preferredFamilies: ['pierce', 'precision'],
    weight: { base: 0.78, levelScale: 0.022, repeatPenalty: 0.46, familyBonus: 0.74 },
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.004, 0.14)
      const [critMin, critMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.09)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      const crit = rollNumber(random, critMin, critMax, 2)
      return {
        effects: {
          projectileSpeedMultiplier: 1 + speed.value,
          critChanceDelta: crit.value,
        },
        quality: averageQuality(speed.quality, crit.quality),
      }
    },
  },
  {
    id: 'arc-echo',
    name: '아크 에코',
    description: '연쇄/속사 계열 무기가 리듬을 타며 화력을 더 뽑아냅니다.',
    kind: 'passive',
    preferredFamilies: ['chain', 'rapid'],
    weight: { base: 0.78, levelScale: 0.022, repeatPenalty: 0.46, familyBonus: 0.72 },
    roll(level, random) {
      const [fireMin, fireMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.003, 0.14)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.003, 0.1)
      const fire = rollNumber(random, fireMin, fireMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          fireRateMultiplier: 1 - fire.value,
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(fire.quality, damage.quality),
      }
    },
  },
  {
    id: 'crusher-stance',
    name: '크러셔 스탠스',
    description: '중화력/근접 계열이 짧은 순간 더 묵직하게 밀어붙입니다.',
    kind: 'passive',
    preferredFamilies: ['heavy', 'melee'],
    weight: { base: 0.76, levelScale: 0.024, repeatPenalty: 0.48, familyBonus: 0.78 },
    roll(level, random) {
      const [pushMin, pushMax] = createLevelScaledPercentRange(0.06, 0.12, level, 0.005, 0.2)
      const [bossMin, bossMax] = createLevelScaledPercentRange(0.04, 0.09, level, 0.004, 0.16)
      const push = rollNumber(random, pushMin, pushMax, 2)
      const boss = rollNumber(random, bossMin, bossMax, 2)
      return {
        effects: {
          knockbackForceMultiplier: 1 + push.value,
          bossDamageMultiplier: 1 + boss.value,
        },
        quality: averageQuality(push.quality, boss.quality),
      }
    },
  },
  {
    id: 'growth-cache',
    name: '성장 캐시',
    description: '캐릭터 경험치를 더 끌어모아 레벨업 타이밍을 앞당깁니다.',
    kind: 'general',
    preferredFamilies: ['starter', 'rapid', 'melee'],
    weight: { base: 0.9, levelScale: 0.024, repeatPenalty: 0.34, familyBonus: 0.36 },
    roll(level, random) {
      const [xpMin, xpMax] = createLevelScaledPercentRange(0.1, 0.18, level, 0.006, 0.32)
      const [moveMin, moveMax] = createLevelScaledPercentRange(0.02, 0.05, level, 0.002, 0.1)
      const xp = rollNumber(random, xpMin, xpMax, 2)
      const move = rollNumber(random, moveMin, moveMax, 2)
      return {
        effects: {
          playerXpMultiplier: 1 + xp.value,
          playerSpeedMultiplier: 1 + move.value,
        },
        quality: averageQuality(xp.quality, move.quality),
      }
    },
  },
  {
    id: 'token-dividend',
    name: '토큰 배당',
    description: '파친코 토큰 보상을 조금 더 크게 받아 런의 눈덩이를 키웁니다.',
    kind: 'general',
    preferredFamilies: ['rapid', 'zone', 'heavy'],
    weight: { base: 0.84, levelScale: 0.022, repeatPenalty: 0.38, familyBonus: 0.4 },
    roll(level, random) {
      const [tokenMin, tokenMax] = createLevelScaledPercentRange(0.1, 0.18, level, 0.006, 0.32)
      const token = rollNumber(random, tokenMin, tokenMax, 2)
      return {
        effects: {
          tokenXpMultiplier: 1 + token.value,
          pachinkoActiveWeaponWeightMultiplier: 1 + Math.max(0.02, token.value * 0.35),
        },
        quality: token.quality,
      }
    },
  },
  {
    id: 'linger-protocol',
    name: '지속 프로토콜',
    description: '탄이 남는 시간과 장판/함정 유지 시간이 함께 늘어납니다.',
    kind: 'passive',
    preferredFamilies: ['zone', 'spray', 'precision'],
    weight: { base: 0.88, levelScale: 0.02, repeatPenalty: 0.34, familyBonus: 0.44 },
    roll(level, random) {
      const [lifeMin, lifeMax] = createLevelScaledPercentRange(0.1, 0.18, level, 0.006, 0.3)
      const [zoneMin, zoneMax] = createLevelScaledPercentRange(0.1, 0.2, level, 0.006, 0.34)
      const life = rollNumber(random, lifeMin, lifeMax, 2)
      const zone = rollNumber(random, zoneMin, zoneMax, 2)
      return {
        effects: {
          projectileLifetimeMultiplier: 1 + life.value,
          hazardDurationMultiplier: 1 + zone.value,
        },
        quality: averageQuality(life.quality, zone.quality),
      }
    },
  },
  {
    id: 'siege-framework',
    name: '공성 프레임',
    description: '설치물과 소환체가 더 오래 버티며 전장을 유지합니다.',
    kind: 'passive',
    preferredFamilies: ['zone', 'rapid', 'heavy'],
    weight: { base: 0.76, levelScale: 0.02, repeatPenalty: 0.4, familyBonus: 0.4 },
    roll(level, random) {
      const [turretMin, turretMax] = createLevelScaledPercentRange(0.1, 0.18, level, 0.006, 0.3)
      const [summonMin, summonMax] = createLevelScaledPercentRange(0.08, 0.16, level, 0.006, 0.26)
      const turret = rollNumber(random, turretMin, turretMax, 2)
      const summon = rollNumber(random, summonMin, summonMax, 2)
      return {
        effects: {
          turretDurationMultiplier: 1 + turret.value,
          summonDurationMultiplier: 1 + summon.value,
        },
        quality: averageQuality(turret.quality, summon.quality),
      }
    },
  },
  {
    id: 'arc-playbook',
    name: '반사 설계도',
    description: '튕김 횟수와 반사 거리처럼 경로형 무기의 판을 넓혀 줍니다.',
    kind: 'passive',
    preferredFamilies: ['chain', 'rapid', 'precision'],
    weight: { base: 0.7, levelScale: 0.022, repeatPenalty: 0.42, familyBonus: 0.36 },
    roll(level, random) {
      const bounce = rollNumber(random, 1, getLevelTier(level) >= 2 ? 2 : 1)
      const [rangeMin, rangeMax] = createLevelScaledPercentRange(0.08, 0.16, level, 0.006, 0.28)
      const range = rollNumber(random, rangeMin, rangeMax, 2)
      return {
        effects: {
          ricochetBouncesDelta: bounce.value,
          ricochetRangeMultiplier: 1 + range.value,
        },
        quality: averageQuality(bounce.quality, range.quality),
      }
    },
  },
  {
    id: 'hitbox-bloom',
    name: '히트박스 팽창',
    description: '투사체 크기가 커져 맞히기 쉬워지고 범위형 무기도 존재감이 커집니다.',
    kind: 'passive',
    preferredFamilies: ['starter', 'zone', 'heavy'],
    weight: { base: 0.74, levelScale: 0.02, repeatPenalty: 0.36, familyBonus: 0.34 },
    roll(level, random) {
      const [sizeMin, sizeMax] = createLevelScaledPercentRange(0.1, 0.18, level, 0.006, 0.3)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.03, 0.06, level, 0.003, 0.12)
      const size = rollNumber(random, sizeMin, sizeMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          projectileSizeMultiplier: 1 + size.value,
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(size.quality, damage.quality),
      }
    },
  },
  {
    id: 'status-overclock',
    name: '상태 오버클럭',
    description: '화상·중독·출혈 같은 속성 상태가 더 오래 남고 틱 피해도 강해집니다.',
    kind: 'passive',
    preferredFamilies: ['zone', 'heavy', 'melee'],
    weight: { base: 0.74, levelScale: 0.02, repeatPenalty: 0.38, familyBonus: 0.34 },
    roll(level, random) {
      const [durationMin, durationMax] = createLevelScaledPercentRange(0.12, 0.2, level, 0.006, 0.32)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.1, 0.18, level, 0.006, 0.28)
      const duration = rollNumber(random, durationMin, durationMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          statusDurationMultiplier: 1 + duration.value,
          statusDamageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(duration.quality, damage.quality),
      }
    },
  },
  {
    id: 'cold-logic',
    name: '냉각 로직',
    description: '빙결·감전 계열 둔화가 더 오래, 더 강하게 붙습니다.',
    kind: 'passive',
    preferredFamilies: ['precision', 'rapid', 'zone'],
    weight: { base: 0.68, levelScale: 0.02, repeatPenalty: 0.4, familyBonus: 0.32 },
    roll(level, random) {
      const [durationMin, durationMax] = createLevelScaledPercentRange(0.1, 0.18, level, 0.006, 0.3)
      const [slowMin, slowMax] = createLevelScaledPercentRange(0.1, 0.2, level, 0.006, 0.32)
      const duration = rollNumber(random, durationMin, durationMax, 2)
      const slow = rollNumber(random, slowMin, slowMax, 2)
      return {
        effects: {
          statusDurationMultiplier: 1 + duration.value,
          statusSlowMultiplier: 1 + slow.value,
        },
        quality: averageQuality(duration.quality, slow.quality),
      }
    },
  },
] as const satisfies ReadonlyArray<PassiveCardTemplate>

const WEAPON_SPECIALIZATION_TEMPLATES = [
  {
    id: 'starter-blaster-special',
    weaponId: 'starter-blaster',
    name: '꾹누름 과열',
    description: '탄막 기관총이 더 오래 이어지며 연사 리듬과 탄막 수가 함께 올라갑니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.1, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const [fireMin, fireMax] = createLevelScaledPercentRange(0.05, 0.1, level, 0.004, 0.18)
      const [countMin, countMax] = [1, getLevelTier(level) >= 2 ? 2 : 1]
      const fire = rollNumber(random, fireMin, fireMax, 2)
      const burst = rollNumber(random, countMin, countMax)
      return {
        effects: {
          fireRateMultiplier: 1 - fire.value,
          projectileLifetimeMultiplier: 1 + Math.max(0.05, fire.value * 0.9),
          projectileCountDelta: burst.value,
        },
        quality: averageQuality(fire.quality, burst.quality),
      }
    },
  },
  {
    id: 'acid-sprayer-special',
    weaponId: 'acid-sprayer',
    name: '구토 역류',
    description: '산성 분사기가 더 넓게 퍼지고 오염 지대가 더 오래 남습니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.1, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const [radiusMin, radiusMax] = createLevelScaledPercentRange(0.08, 0.16, level, 0.006, 0.26)
      const radius = rollNumber(random, radiusMin, radiusMax, 2)
      const extra = rollNumber(random, 1, getLevelTier(level) >= 2 ? 2 : 1)
      return {
        effects: {
          hazardRadiusMultiplier: 1 + radius.value,
          hazardDurationMultiplier: 1 + Math.max(0.08, radius.value * 0.85),
          projectileCountDelta: extra.value,
        },
        quality: averageQuality(radius.quality, extra.quality),
      }
    },
  },
  {
    id: 'frost-lance-special',
    weaponId: 'frost-lance',
    name: '불안정 탄두',
    description: '로켓포의 비행 거리와 폭발 압력이 함께 커집니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.06, levelScale: 0.022, repeatPenalty: 0.8 },
    roll(level, random) {
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.06, 0.12, level, 0.005, 0.2)
      const rangeTier = getLevelTier(level)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      const range = rollNumber(random, 12 + rangeTier * 3, 22 + rangeTier * 4)
      return {
        effects: {
          damageMultiplier: 1 + damage.value,
          projectileLifetimeMultiplier: 1 + Math.max(0.05, damage.value * 0.8),
          rangeDelta: range.value,
        },
        quality: averageQuality(damage.quality, range.quality),
      }
    },
  },
  {
    id: 'storm-cannon-special',
    weaponId: 'storm-cannon',
    name: '골목 쓸기',
    description: '산탄포가 한 번에 더 넓게 퍼지고 근접 제압력이 올라갑니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.08, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.004, 0.14)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      const extra = rollNumber(random, 1, getLevelTier(level) >= 2 ? 2 : 1)
      return {
        effects: {
          damageMultiplier: 1 + damage.value,
          projectileCountDelta: extra.value,
        },
        quality: averageQuality(damage.quality, extra.quality),
      }
    },
  },
  {
    id: 'arc-loom-special',
    weaponId: 'arc-loom',
    name: '강슛 반사',
    description: '축구공이 더 멀리 튕기고 더 많이 반사되며 오래 남습니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.04, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.004, 0.14)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      const range = rollNumber(random, 12 + getLevelTier(level) * 2, 22 + getLevelTier(level) * 3)
      return {
        effects: {
          projectileLifetimeMultiplier: 1 + Math.max(0.06, speed.value * 0.9),
          ricochetBouncesDelta: 1,
          ricochetRangeMultiplier: 1 + Math.max(0.08, speed.value * 1.1),
          rangeDelta: range.value,
        },
        quality: averageQuality(speed.quality, range.quality),
      }
    },
  },
  {
    id: 'spark-carbine-special',
    weaponId: 'spark-carbine',
    name: '노드 확장',
    description: '감시 포탑의 배치 수, 유지 시간, 사거리를 한 번에 밀어 올립니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.06, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const range = rollNumber(random, 16 + getLevelTier(level) * 3, 28 + getLevelTier(level) * 4)
      const extra = rollNumber(random, 1, 1)
      return {
        effects: {
          rangeDelta: range.value,
          projectileCountDelta: extra.value,
          turretDurationMultiplier: 1.18,
          turretFireRateMultiplier: 0.92,
        },
        quality: averageQuality(range.quality, extra.quality),
      }
    },
  },
  {
    id: 'mist-vortex-special',
    weaponId: 'mist-vortex',
    name: '문장 증폭',
    description: '컴파일러 함정의 폭발 범위와 유지 시간이 함께 올라갑니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.08, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const [radiusMin, radiusMax] = createLevelScaledPercentRange(0.08, 0.16, level, 0.006, 0.24)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.004, 0.14)
      const radius = rollNumber(random, radiusMin, radiusMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          hazardRadiusMultiplier: 1 + radius.value,
          hazardDurationMultiplier: 1 + Math.max(0.08, radius.value * 0.8),
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(radius.quality, damage.quality),
      }
    },
  },
  {
    id: 'slime-glaive-special',
    weaponId: 'slime-glaive',
    name: '사막의 포식',
    description: '레넥톤 손맛의 회전 반경, 난전 화력, 흡혈량을 동시에 올려줍니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.04, levelScale: 0.022, repeatPenalty: 0.8 },
    roll(level, random) {
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.05, 0.1, level, 0.004, 0.16)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      const range = rollNumber(random, 10 + getLevelTier(level) * 2, 18 + getLevelTier(level) * 3)
      return {
        effects: {
          damageMultiplier: 1 + damage.value,
          rangeDelta: range.value,
          healOnHitDelta: 1,
        },
        quality: averageQuality(damage.quality, range.quality),
      }
    },
  },
  {
    id: 'prism-cutter-special',
    weaponId: 'prism-cutter',
    name: '골목 연장전',
    description: '주먹 콤보의 마지막 휩쓸기가 더 세지고 연속기 간격이 빨라집니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.08, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const [fireMin, fireMax] = createLevelScaledPercentRange(0.05, 0.1, level, 0.004, 0.16)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.004, 0.12)
      const fire = rollNumber(random, fireMin, fireMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          fireRateMultiplier: 1 - fire.value,
          damageMultiplier: 1 + damage.value,
        },
        quality: averageQuality(fire.quality, damage.quality),
      }
    },
  },
  {
    id: 'needle-fan-special',
    weaponId: 'needle-fan',
    name: '야근 충원',
    description: '재생술사의 마무리 각과 되살린 병력 유지 시간이 함께 늘어납니다.',
    kind: 'weapon-specialized',
    maxCount: 2,
    weight: { base: 1.06, levelScale: 0.02, repeatPenalty: 0.8 },
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.04, 0.08, level, 0.004, 0.14)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.03, 0.06, level, 0.003, 0.1)
      const speed = rollNumber(random, speedMin, speedMax, 2)
      const damage = rollNumber(random, damageMin, damageMax, 2)
      return {
        effects: {
          projectileSpeedMultiplier: 1 + speed.value,
          damageMultiplier: 1 + damage.value,
          summonDurationMultiplier: 1.18,
          summonCountDelta: 1,
        },
        quality: averageQuality(speed.quality, damage.quality),
      }
    },
  },
] as const satisfies ReadonlyArray<PassiveCardTemplate>

type BasePassiveCardId = (typeof PASSIVE_CARD_TEMPLATES)[number]['id']
type WeaponSpecializationCardId = (typeof WEAPON_SPECIALIZATION_TEMPLATES)[number]['id']
export type PassiveCardId = BasePassiveCardId | WeaponSpecializationCardId
const ALL_PASSIVE_CARD_TEMPLATES = [...PASSIVE_CARD_TEMPLATES, ...WEAPON_SPECIALIZATION_TEMPLATES] as const

export type PassiveState = Partial<Record<PassiveCardId, PassiveStateEntry>>
export type PassiveCardDefinition = PassiveCardChoice

export interface PassiveTotals {
  damageMultiplier: number
  fireRateMultiplier: number
  projectileSpeedMultiplier: number
  projectileLifetimeMultiplier: number
  projectileSizeMultiplier: number
  rangeDelta: number
  knockbackForceMultiplier: number
  hazardRadiusMultiplier: number
  hazardDurationMultiplier: number
  projectileCountDelta: number
  turretDurationMultiplier: number
  turretFireRateMultiplier: number
  summonDurationMultiplier: number
  summonCountDelta: number
  ricochetBouncesDelta: number
  ricochetRangeMultiplier: number
  healOnHitDelta: number
  statusDurationMultiplier: number
  statusDamageMultiplier: number
  statusSlowMultiplier: number
  critChance: number
  critDamageMultiplier: number
  playerSpeedMultiplier: number
  playerXpMultiplier: number
  tokenXpMultiplier: number
  incomingDamageMultiplier: number
  bossDamageMultiplier: number
  normalEnemyDamageMultiplier: number
  pachinkoActiveWeaponWeightMultiplier: number
  pachinkoNonActiveWeaponWeightMultiplier: number
  lootAttractionRadiusMultiplier: number
  lootCollectRadiusMultiplier: number
  lootAttractionSpeedMultiplier: number
  heartHealMultiplier: number
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
  const definition = ALL_PASSIVE_CARD_TEMPLATES.find((card) => card.id === id)
  if (!definition) {
    throw new Error(`Unknown passive card: ${id}`)
  }
  return definition
}

function isTemplateCapped(template: PassiveCardTemplate, state: PassiveState = {}): boolean {
  if (!template.maxCount) {
    return false
  }

  return (state[template.id as PassiveCardId]?.count ?? 0) >= template.maxCount
}

export function getPassiveGradeLabel(grade: PassiveCardGrade): string {
  return PASSIVE_GRADE_LABELS[grade]
}

export function getPassiveKindLabel(kind: PassiveCardKind): string {
  return PASSIVE_KIND_LABELS[kind]
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
  if (effects.projectileLifetimeMultiplier !== undefined && effects.projectileLifetimeMultiplier > 1) {
    lines.push(`투사체 지속 +${roundPercent(effects.projectileLifetimeMultiplier - 1)}%`)
  }
  if (effects.projectileSizeMultiplier !== undefined && effects.projectileSizeMultiplier > 1) {
    lines.push(`투사체 크기 +${roundPercent(effects.projectileSizeMultiplier - 1)}%`)
  }
  if (effects.rangeDelta) {
    lines.push(`사거리/범위 +${Math.round(effects.rangeDelta)}`)
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
  if (effects.hazardDurationMultiplier !== undefined && effects.hazardDurationMultiplier > 1) {
    lines.push(`지속시간 +${roundPercent(effects.hazardDurationMultiplier - 1)}%`)
  }
  if (effects.projectileCountDelta) {
    lines.push(`투사체 +${Math.round(effects.projectileCountDelta)}`)
  }
  if (effects.turretDurationMultiplier !== undefined && effects.turretDurationMultiplier > 1) {
    lines.push(`포탑 지속 +${roundPercent(effects.turretDurationMultiplier - 1)}%`)
  }
  if (effects.turretFireRateMultiplier !== undefined && effects.turretFireRateMultiplier < 1) {
    lines.push(`포탑 공격속도 +${roundPercent(1 - effects.turretFireRateMultiplier)}%`)
  }
  if (effects.summonDurationMultiplier !== undefined && effects.summonDurationMultiplier > 1) {
    lines.push(`소환 지속 +${roundPercent(effects.summonDurationMultiplier - 1)}%`)
  }
  if (effects.summonCountDelta) {
    lines.push(`소환수 +${Math.round(effects.summonCountDelta)}`)
  }
  if (effects.ricochetBouncesDelta) {
    lines.push(`튕김 +${Math.round(effects.ricochetBouncesDelta)}회`)
  }
  if (effects.ricochetRangeMultiplier !== undefined && effects.ricochetRangeMultiplier > 1) {
    lines.push(`튕김 거리 +${roundPercent(effects.ricochetRangeMultiplier - 1)}%`)
  }
  if (effects.healOnHitDelta) {
    lines.push(`흡혈 +${Math.round(effects.healOnHitDelta)}`)
  }
  if (effects.statusDurationMultiplier !== undefined && effects.statusDurationMultiplier > 1) {
    lines.push(`상태시간 +${roundPercent(effects.statusDurationMultiplier - 1)}%`)
  }
  if (effects.statusDamageMultiplier !== undefined && effects.statusDamageMultiplier > 1) {
    lines.push(`지속피해 +${roundPercent(effects.statusDamageMultiplier - 1)}%`)
  }
  if (effects.statusSlowMultiplier !== undefined && effects.statusSlowMultiplier > 1) {
    lines.push(`둔화강도 +${roundPercent(effects.statusSlowMultiplier - 1)}%`)
  }
  if (effects.playerSpeedMultiplier !== undefined && effects.playerSpeedMultiplier > 1) {
    lines.push(`이동속도 +${roundPercent(effects.playerSpeedMultiplier - 1)}%`)
  }
  if (effects.playerXpMultiplier !== undefined && effects.playerXpMultiplier > 1) {
    lines.push(`캐릭터 XP +${roundPercent(effects.playerXpMultiplier - 1)}%`)
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
  if (effects.pachinkoActiveWeaponWeightMultiplier !== undefined && effects.pachinkoActiveWeaponWeightMultiplier > 1) {
    lines.push(`활성 무기 확률 +${roundPercent(effects.pachinkoActiveWeaponWeightMultiplier - 1)}%`)
  }
  if (effects.pachinkoNonActiveWeaponWeightMultiplier !== undefined && effects.pachinkoNonActiveWeaponWeightMultiplier > 1) {
    lines.push(`다른 무기 확률 +${roundPercent(effects.pachinkoNonActiveWeaponWeightMultiplier - 1)}%`)
  }
  if (effects.lootAttractionRadiusMultiplier !== undefined && effects.lootAttractionRadiusMultiplier > 1) {
    lines.push(`흡입 범위 +${roundPercent(effects.lootAttractionRadiusMultiplier - 1)}%`)
  }
  if (effects.lootCollectRadiusMultiplier !== undefined && effects.lootCollectRadiusMultiplier > 1) {
    lines.push(`획득 범위 +${roundPercent(effects.lootCollectRadiusMultiplier - 1)}%`)
  }
  if (effects.lootAttractionSpeedMultiplier !== undefined && effects.lootAttractionSpeedMultiplier > 1) {
    lines.push(`흡입 속도 +${roundPercent(effects.lootAttractionSpeedMultiplier - 1)}%`)
  }
  if (effects.heartHealMultiplier !== undefined && effects.heartHealMultiplier > 1) {
    lines.push(`하트 회복량 +${roundPercent(effects.heartHealMultiplier - 1)}%`)
  }

  return lines.join(' · ')
}

function mergeEffects(existing: PassiveEffects = {}, next: PassiveEffects): PassiveEffects {
  return {
    damageMultiplier: (existing.damageMultiplier ?? 1) * (next.damageMultiplier ?? 1),
    fireRateMultiplier: (existing.fireRateMultiplier ?? 1) * (next.fireRateMultiplier ?? 1),
    projectileSpeedMultiplier: (existing.projectileSpeedMultiplier ?? 1) * (next.projectileSpeedMultiplier ?? 1),
    projectileLifetimeMultiplier:
      (existing.projectileLifetimeMultiplier ?? 1) * (next.projectileLifetimeMultiplier ?? 1),
    rangeDelta: (existing.rangeDelta ?? 0) + (next.rangeDelta ?? 0),
    knockbackForceMultiplier: (existing.knockbackForceMultiplier ?? 1) * (next.knockbackForceMultiplier ?? 1),
    hazardRadiusMultiplier: (existing.hazardRadiusMultiplier ?? 1) * (next.hazardRadiusMultiplier ?? 1),
    hazardDurationMultiplier: (existing.hazardDurationMultiplier ?? 1) * (next.hazardDurationMultiplier ?? 1),
    projectileCountDelta: (existing.projectileCountDelta ?? 0) + (next.projectileCountDelta ?? 0),
    turretDurationMultiplier: (existing.turretDurationMultiplier ?? 1) * (next.turretDurationMultiplier ?? 1),
    turretFireRateMultiplier: (existing.turretFireRateMultiplier ?? 1) * (next.turretFireRateMultiplier ?? 1),
    summonDurationMultiplier: (existing.summonDurationMultiplier ?? 1) * (next.summonDurationMultiplier ?? 1),
    summonCountDelta: (existing.summonCountDelta ?? 0) + (next.summonCountDelta ?? 0),
    ricochetBouncesDelta: (existing.ricochetBouncesDelta ?? 0) + (next.ricochetBouncesDelta ?? 0),
    ricochetRangeMultiplier: (existing.ricochetRangeMultiplier ?? 1) * (next.ricochetRangeMultiplier ?? 1),
    healOnHitDelta: (existing.healOnHitDelta ?? 0) + (next.healOnHitDelta ?? 0),
    critChanceDelta: (existing.critChanceDelta ?? 0) + (next.critChanceDelta ?? 0),
    critDamageMultiplierDelta: (existing.critDamageMultiplierDelta ?? 0) + (next.critDamageMultiplierDelta ?? 0),
    playerSpeedMultiplier: (existing.playerSpeedMultiplier ?? 1) * (next.playerSpeedMultiplier ?? 1),
    playerXpMultiplier: (existing.playerXpMultiplier ?? 1) * (next.playerXpMultiplier ?? 1),
    tokenXpMultiplier: (existing.tokenXpMultiplier ?? 1) * (next.tokenXpMultiplier ?? 1),
    incomingDamageMultiplier: (existing.incomingDamageMultiplier ?? 1) * (next.incomingDamageMultiplier ?? 1),
    bossDamageMultiplier: (existing.bossDamageMultiplier ?? 1) * (next.bossDamageMultiplier ?? 1),
    normalEnemyDamageMultiplier: (existing.normalEnemyDamageMultiplier ?? 1) * (next.normalEnemyDamageMultiplier ?? 1),
    pachinkoActiveWeaponWeightMultiplier:
      (existing.pachinkoActiveWeaponWeightMultiplier ?? 1) * (next.pachinkoActiveWeaponWeightMultiplier ?? 1),
    pachinkoNonActiveWeaponWeightMultiplier:
      (existing.pachinkoNonActiveWeaponWeightMultiplier ?? 1) * (next.pachinkoNonActiveWeaponWeightMultiplier ?? 1),
    lootAttractionRadiusMultiplier:
      (existing.lootAttractionRadiusMultiplier ?? 1) * (next.lootAttractionRadiusMultiplier ?? 1),
    lootCollectRadiusMultiplier:
      (existing.lootCollectRadiusMultiplier ?? 1) * (next.lootCollectRadiusMultiplier ?? 1),
    lootAttractionSpeedMultiplier:
      (existing.lootAttractionSpeedMultiplier ?? 1) * (next.lootAttractionSpeedMultiplier ?? 1),
    heartHealMultiplier:
      (existing.heartHealMultiplier ?? 1) * (next.heartHealMultiplier ?? 1),
  }
}

export function createPassiveCardChoice(
  id: PassiveCardId,
  level: number,
  random: () => number = Math.random,
  activeWeaponId?: WeaponId,
): PassiveCardChoice {
  const template = getPassiveTemplate(id)
  const roll = template.roll(level, random)
  const grade = gradeFromQuality(roll.quality)
  const kind = template.kind ?? 'passive'
  const activeFamily = activeWeaponId ? getPachinkoWeaponFamily(activeWeaponId) : null
  const specializationWeaponId = template.weaponId ?? activeWeaponId
  const limitLabel = template.maxCount ? ` · 최대 ${template.maxCount}회` : ''
  const iconKey =
    kind === 'weapon-specialized' && specializationWeaponId
      ? `weapon-${specializationWeaponId}`
      : activeWeaponId && activeFamily && template.preferredFamilies?.includes(activeFamily)
        ? `weapon-${activeWeaponId}`
      : undefined
  return {
    id,
    name: template.name,
    description: `${template.description}${limitLabel}`,
    effectSummary: `${formatEffectSummary(roll.effects)}${limitLabel}`,
    effects: roll.effects,
    kind,
    kindLabel: getPassiveKindLabel(kind),
    grade,
    gradeLabel: getPassiveGradeLabel(grade),
    iconKey,
  }
}

function getPassiveCardWeight(
  template: PassiveCardTemplate,
  level: number,
  state: PassiveState,
  activeWeaponId?: WeaponId,
): number {
  if (template.weaponId && template.weaponId !== activeWeaponId) {
    return 0
  }

  const ownedCount = state[template.id as PassiveCardId]?.count ?? 0
  const tier = getLevelTier(level)
  const levelScale = template.weight.levelScale ?? 0
  const repeatPenalty = template.weight.repeatPenalty ?? 0.4
  const activeFamily = activeWeaponId ? getPachinkoWeaponFamily(activeWeaponId) : null
  const familyBonus =
    activeFamily && template.preferredFamilies?.includes(activeFamily)
      ? template.weight.familyBonus ?? 0.45
      : 0
  const weighted = template.weight.base + tier * levelScale + familyBonus - ownedCount * repeatPenalty
  return Math.max(0.05, weighted)
}

function pickWeightedTemplate(
  available: PassiveCardTemplate[],
  level: number,
  state: PassiveState,
  random: () => number,
  activeWeaponId?: WeaponId,
): PassiveCardTemplate {
  const weighted = available.map((template) => ({
    template,
    weight: getPassiveCardWeight(template, level, state, activeWeaponId),
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
  const template = getPassiveTemplate(choice.id)
  if (template.maxCount && (state[choice.id]?.count ?? 0) >= template.maxCount) {
    return state
  }
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
  activeWeaponId?: WeaponId,
): PassiveCardChoice[] {
  const picks: PassiveCardChoice[] = []
  const remainingBase = PASSIVE_CARD_TEMPLATES.filter((template) => !isTemplateCapped(template, state))
  const remainingWeaponSpecialized = activeWeaponId
    ? WEAPON_SPECIALIZATION_TEMPLATES.filter((template) => template.weaponId === activeWeaponId && !isTemplateCapped(template, state))
    : []

  if (remainingWeaponSpecialized.length > 0) {
    const specialization = pickWeightedTemplate(remainingWeaponSpecialized, level, state, random, activeWeaponId)
    picks.push(createPassiveCardChoice(specialization.id as PassiveCardId, level, random, activeWeaponId))
  }

  while (remainingBase.length > 0 && picks.length < 3) {
    const template = pickWeightedTemplate(remainingBase, level, state, random, activeWeaponId)
    picks.push(createPassiveCardChoice(template.id as PassiveCardId, level, random, activeWeaponId))
    const index = remainingBase.findIndex((entry) => entry.id === template.id)
    if (index >= 0) {
      remainingBase.splice(index, 1)
    }
  }

  return picks
}

export function getPassiveTotals(state: PassiveState = {}): PassiveTotals {
  const totals: PassiveTotals = {
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    projectileSpeedMultiplier: 1,
    projectileLifetimeMultiplier: 1,
    projectileSizeMultiplier: 1,
    rangeDelta: 0,
    knockbackForceMultiplier: 1,
    hazardRadiusMultiplier: 1,
    hazardDurationMultiplier: 1,
    projectileCountDelta: 0,
    turretDurationMultiplier: 1,
    turretFireRateMultiplier: 1,
    summonDurationMultiplier: 1,
    summonCountDelta: 0,
    ricochetBouncesDelta: 0,
    ricochetRangeMultiplier: 1,
    healOnHitDelta: 0,
    statusDurationMultiplier: 1,
    statusDamageMultiplier: 1,
    statusSlowMultiplier: 1,
    critChance: 0,
    critDamageMultiplier: BASE_CRIT_DAMAGE_MULTIPLIER,
    playerSpeedMultiplier: 1,
    playerXpMultiplier: 1,
    tokenXpMultiplier: 1,
    incomingDamageMultiplier: 1,
    bossDamageMultiplier: 1,
    normalEnemyDamageMultiplier: 1,
    pachinkoActiveWeaponWeightMultiplier: 1,
    pachinkoNonActiveWeaponWeightMultiplier: 1,
    lootAttractionRadiusMultiplier: 1,
    lootCollectRadiusMultiplier: 1,
    lootAttractionSpeedMultiplier: 1,
    heartHealMultiplier: 1,
  }

  for (const entry of Object.values(state)) {
    if (!entry || entry.count <= 0) {
      continue
    }

    const effects = entry.effects
    totals.damageMultiplier *= effects.damageMultiplier ?? 1
    totals.fireRateMultiplier *= effects.fireRateMultiplier ?? 1
    totals.projectileSpeedMultiplier *= effects.projectileSpeedMultiplier ?? 1
    totals.projectileLifetimeMultiplier *= effects.projectileLifetimeMultiplier ?? 1
    totals.projectileSizeMultiplier *= effects.projectileSizeMultiplier ?? 1
    totals.rangeDelta += effects.rangeDelta ?? 0
    totals.knockbackForceMultiplier *= effects.knockbackForceMultiplier ?? 1
    totals.hazardRadiusMultiplier *= effects.hazardRadiusMultiplier ?? 1
    totals.hazardDurationMultiplier *= effects.hazardDurationMultiplier ?? 1
    totals.projectileCountDelta += effects.projectileCountDelta ?? 0
    totals.turretDurationMultiplier *= effects.turretDurationMultiplier ?? 1
    totals.turretFireRateMultiplier *= effects.turretFireRateMultiplier ?? 1
    totals.summonDurationMultiplier *= effects.summonDurationMultiplier ?? 1
    totals.summonCountDelta += effects.summonCountDelta ?? 0
    totals.ricochetBouncesDelta += effects.ricochetBouncesDelta ?? 0
    totals.ricochetRangeMultiplier *= effects.ricochetRangeMultiplier ?? 1
    totals.healOnHitDelta += effects.healOnHitDelta ?? 0
    totals.statusDurationMultiplier *= effects.statusDurationMultiplier ?? 1
    totals.statusDamageMultiplier *= effects.statusDamageMultiplier ?? 1
    totals.statusSlowMultiplier *= effects.statusSlowMultiplier ?? 1
    totals.critChance += effects.critChanceDelta ?? 0
    totals.critDamageMultiplier += effects.critDamageMultiplierDelta ?? 0
    totals.playerSpeedMultiplier *= effects.playerSpeedMultiplier ?? 1
    totals.playerXpMultiplier *= effects.playerXpMultiplier ?? 1
    totals.tokenXpMultiplier *= effects.tokenXpMultiplier ?? 1
    totals.incomingDamageMultiplier *= effects.incomingDamageMultiplier ?? 1
    totals.bossDamageMultiplier *= effects.bossDamageMultiplier ?? 1
    totals.normalEnemyDamageMultiplier *= effects.normalEnemyDamageMultiplier ?? 1
    totals.pachinkoActiveWeaponWeightMultiplier *= effects.pachinkoActiveWeaponWeightMultiplier ?? 1
    totals.pachinkoNonActiveWeaponWeightMultiplier *= effects.pachinkoNonActiveWeaponWeightMultiplier ?? 1
    totals.lootAttractionRadiusMultiplier *= effects.lootAttractionRadiusMultiplier ?? 1
    totals.lootCollectRadiusMultiplier *= effects.lootCollectRadiusMultiplier ?? 1
    totals.lootAttractionSpeedMultiplier *= effects.lootAttractionSpeedMultiplier ?? 1
    totals.heartHealMultiplier *= effects.heartHealMultiplier ?? 1
  }

  totals.critChance = Math.min(0.55, totals.critChance)
  return totals
}

function applyAttackBehaviorPassives(
  behavior: WeaponAttackBehavior,
  totals: PassiveTotals,
): WeaponAttackBehavior {
  switch (behavior.kind) {
    case 'melee-cleave':
      return {
        ...behavior,
        range: Math.max(1, Math.round(behavior.range + totals.rangeDelta)),
        healOnHit: behavior.healOnHit ? behavior.healOnHit + totals.healOnHitDelta : behavior.healOnHit,
      }
    case 'combo-melee':
      return {
        ...behavior,
        steps: behavior.steps.map((step, index) => ({
          ...step,
          range: Math.max(1, Math.round(step.range + totals.rangeDelta)),
          maxTargets: step.maxTargets + (index === behavior.steps.length - 1 ? Math.max(0, totals.projectileCountDelta) : 0),
          healOnHit: step.healOnHit ? step.healOnHit + totals.healOnHitDelta : step.healOnHit,
        })),
      }
    case 'spray-hazard':
      return {
        ...behavior,
        projectileCount: Math.max(1, behavior.projectileCount + totals.projectileCountDelta),
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
        hazardRadius: Math.max(1, Math.round(behavior.hazardRadius * totals.hazardRadiusMultiplier)),
        hazardDurationMs: Math.max(200, Math.round(behavior.hazardDurationMs * totals.hazardDurationMultiplier)),
      }
    case 'split-shot':
      return {
        ...behavior,
        projectileCount: Math.max(1, behavior.projectileCount + totals.projectileCountDelta),
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
      }
    case 'burst-fire':
      return {
        ...behavior,
        shotsPerBurst: Math.max(1, behavior.shotsPerBurst + totals.projectileCountDelta),
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
      }
    case 'volley':
      return {
        ...behavior,
        projectileCount: Math.max(1, behavior.projectileCount + totals.projectileCountDelta),
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
      }
    case 'zone-control':
      return {
        ...behavior,
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
        zoneRadius: Math.max(1, Math.round(behavior.zoneRadius * totals.hazardRadiusMultiplier)),
        zoneDurationMs: Math.max(200, Math.round(behavior.zoneDurationMs * totals.hazardDurationMultiplier)),
      }
    case 'deploy-turret':
      return {
        ...behavior,
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
        deploy: {
          ...behavior.deploy,
          range: Math.max(1, Math.round(behavior.deploy.range + totals.rangeDelta)),
          maxTurrets: Math.max(1, behavior.deploy.maxTurrets + Math.max(0, totals.projectileCountDelta)),
          durationMs: Math.max(500, Math.round(behavior.deploy.durationMs * totals.turretDurationMultiplier)),
          fireRateMs: Math.max(100, Math.round(behavior.deploy.fireRateMs * totals.turretFireRateMultiplier)),
          projectileLifetimeMs: Math.max(
            120,
            Math.round(behavior.deploy.projectileLifetimeMs * totals.projectileLifetimeMultiplier),
          ),
        },
      }
    case 'single':
      return {
        ...behavior,
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
        ricochet: behavior.ricochet
          ? {
              ...behavior.ricochet,
              maxBounces: Math.max(0, behavior.ricochet.maxBounces + totals.ricochetBouncesDelta),
              bounceRange: Math.max(40, Math.round(behavior.ricochet.bounceRange * totals.ricochetRangeMultiplier)),
            }
          : behavior.ricochet,
        summonOnKill: behavior.summonOnKill
          ? {
              ...behavior.summonOnKill,
              maxMinions: Math.max(1, behavior.summonOnKill.maxMinions + Math.max(0, totals.summonCountDelta)),
              durationMs: Math.max(500, Math.round(behavior.summonOnKill.durationMs * totals.summonDurationMultiplier)),
            }
          : behavior.summonOnKill,
      }
    case 'pierce':
      return {
        ...behavior,
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
      }
    case 'chain':
      return {
        ...behavior,
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
      }
    case 'impact-burst':
      return {
        ...behavior,
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
      }
    case 'impact-aoe':
      return {
        ...behavior,
        projectileLifetimeMs: Math.max(80, Math.round(behavior.projectileLifetimeMs * totals.projectileLifetimeMultiplier)),
      }
    default:
      return behavior
  }
}

export function applyPassiveWeaponEffects(
  weapon: WeaponDefinition,
  state: PassiveState = {},
): WeaponDefinition {
  const totals = getPassiveTotals(state)
  const attackBehavior = applyAttackBehaviorPassives(weapon.attackBehavior, totals)
  const attribute = applyAttributePassives(weapon.attribute, totals)

  return {
    ...weapon,
    attribute,
    range: typeof weapon.range === 'number'
      ? Math.max(1, Math.round(weapon.range + totals.rangeDelta))
      : weapon.range,
    damage: Math.max(1, Math.round(weapon.damage * totals.damageMultiplier)),
    fireRateMs: Math.max(65, Math.round(weapon.fireRateMs * totals.fireRateMultiplier)),
    projectileSpeed: Math.max(0, Math.round(weapon.projectileSpeed * totals.projectileSpeedMultiplier)),
    projectileSizeMultiplier: (weapon.projectileSizeMultiplier ?? 1) * totals.projectileSizeMultiplier,
    knockback: {
      ...weapon.knockback,
      force: Math.round(weapon.knockback.force * totals.knockbackForceMultiplier),
    },
    attackBehavior,
  }
}

function applyAttributePassives(
  attribute: WeaponAttributeDefinition | undefined,
  totals: PassiveTotals,
): WeaponAttributeDefinition | undefined {
  if (!attribute?.statusEffect) {
    return attribute
  }

  return {
    ...attribute,
    statusEffect: {
      ...attribute.statusEffect,
      durationMs: Math.max(200, Math.round(attribute.statusEffect.durationMs * totals.statusDurationMultiplier)),
      tickDamage: attribute.statusEffect.tickDamage !== undefined
        ? Math.max(1, Math.round(attribute.statusEffect.tickDamage * totals.statusDamageMultiplier))
        : undefined,
      speedMultiplier: attribute.statusEffect.speedMultiplier !== undefined
        ? Math.max(0.2, 1 - (1 - attribute.statusEffect.speedMultiplier) * totals.statusSlowMultiplier)
        : undefined,
    },
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

export function getPassivePlayerXpMultiplier(state: PassiveState = {}): number {
  return getPassiveTotals(state).playerXpMultiplier
}

export function getPassiveTokenXpMultiplier(state: PassiveState = {}): number {
  return getPassiveTotals(state).tokenXpMultiplier
}

export function getPassiveEnemyDamageMultiplier(isBossEnemy: boolean, state: PassiveState = {}): number {
  const totals = getPassiveTotals(state)
  return isBossEnemy ? totals.bossDamageMultiplier : totals.normalEnemyDamageMultiplier
}

export function getPassivePachinkoActiveWeaponWeightMultiplier(state: PassiveState = {}): number {
  return getPassiveTotals(state).pachinkoActiveWeaponWeightMultiplier
}

export function getPassivePachinkoNonActiveWeaponWeightMultiplier(state: PassiveState = {}): number {
  return getPassiveTotals(state).pachinkoNonActiveWeaponWeightMultiplier
}

export function getPassiveLootPickupTuning(state: PassiveState = {}) {
  const totals = getPassiveTotals(state)
  return {
    attractionRadiusMultiplier: totals.lootAttractionRadiusMultiplier,
    collectRadiusMultiplier: totals.lootCollectRadiusMultiplier,
    attractionSpeedMultiplier: totals.lootAttractionSpeedMultiplier,
  }
}

export function getPassiveHeartHealMultiplier(state: PassiveState = {}): number {
  return getPassiveTotals(state).heartHealMultiplier
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
