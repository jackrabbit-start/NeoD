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

export interface PassiveCardChoice {
  id: PassiveCardId
  name: string
  description: string
  effectSummary: string
  effects: PassiveEffects
}

export interface PassiveStateEntry {
  count: number
  effects: PassiveEffects
}

interface PassiveCardTemplate {
  id: string
  name: string
  description: string
  roll: (level: number, random: () => number) => PassiveEffects
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const roundPercent = (value: number): number => Math.round(value * 100)

const rollRange = (
  random: () => number,
  min: number,
  max: number,
  precision = 0,
): number => {
  const raw = min + (max - min) * random()
  if (precision <= 0) {
    return Math.round(raw)
  }

  const factor = 10 ** precision
  return Math.round(raw * factor) / factor
}

const getLevelTier = (level: number): number => Math.max(0, Math.floor((Math.max(1, level) - 1) / 5))

const createLevelScaledPercentRange = (
  baseMin: number,
  baseMax: number,
  level: number,
  step = 0.01,
  maxCap = 0.3,
): [number, number] => {
  const tier = getLevelTier(level)
  return [
    clamp(baseMin + tier * step, 0, maxCap),
    clamp(baseMax + tier * step, 0, maxCap),
  ]
}

const PASSIVE_CARD_TEMPLATES = [
  {
    id: 'rapid-trigger',
    name: '속사 트리거',
    description: '모든 무기의 공격 주기가 짧아집니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.1, 0.16, level, 0.01, 0.24)
      return { fireRateMultiplier: 1 - rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'keen-sense',
    name: '예리한 감각',
    description: '약점을 노려 치명타가 발생할 수 있습니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.08, 0.14, level, 0.005, 0.22)
      return { critChanceDelta: rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'big-hit',
    name: '한방 각',
    description: '치명타가 더 크게 터집니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.3, 0.55, level, 0.02, 0.85)
      return { critDamageMultiplierDelta: rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'long-barrel',
    name: '롱배럴 감성',
    description: '투사체 속도와 사거리가 늘어납니다.',
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.08, 0.16, level, 0.01, 0.24)
      const rangeTier = getLevelTier(level)
      return {
        projectileSpeedMultiplier: 1 + rollRange(random, speedMin, speedMax, 2),
        rangeDelta: rollRange(random, 24 + rangeTier * 4, 42 + rangeTier * 5),
      }
    },
  },
  {
    id: 'heavy-push',
    name: '묵직한 밀어내기',
    description: '무기 충격이 강해져 적을 더 잘 밀어냅니다.',
    roll(level, random) {
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.05, 0.11, level, 0.01, 0.2)
      const [pushMin, pushMax] = createLevelScaledPercentRange(0.12, 0.22, level, 0.01, 0.35)
      return {
        damageMultiplier: 1 + rollRange(random, damageMin, damageMax, 2),
        knockbackForceMultiplier: 1 + rollRange(random, pushMin, pushMax, 2),
      }
    },
  },
  {
    id: 'wide-zone',
    name: '영역 장악',
    description: '장판과 근접 범위가 넓어져 공간을 더 잘 지킵니다.',
    roll(level, random) {
      const [radiusMin, radiusMax] = createLevelScaledPercentRange(0.1, 0.22, level, 0.01, 0.35)
      const rangeTier = getLevelTier(level)
      return {
        rangeDelta: rollRange(random, 12 + rangeTier * 3, 24 + rangeTier * 4),
        hazardRadiusMultiplier: 1 + rollRange(random, radiusMin, radiusMax, 2),
      }
    },
  },
  {
    id: 'split-focus',
    name: '분산 집중',
    description: '분사형 무기가 탄을 더 흩뿌립니다.',
    roll(level, random) {
      const tier = getLevelTier(level)
      return { projectileCountDelta: tier >= 2 && random() > 0.5 ? 2 : 1 }
    },
  },
  {
    id: 'runner-instinct',
    name: '런각 본능',
    description: '캐릭터 이동 속도가 올라 카이팅 여지가 커집니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.05, 0.1, level, 0.005, 0.18)
      return { playerSpeedMultiplier: 1 + rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'jackpot-fever',
    name: '잭팟 열기',
    description: '적이 주는 파친코 토큰 XP가 더 크게 불어납니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.12, 0.24, level, 0.01, 0.4)
      return { tokenXpMultiplier: 1 + rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'lane-reading',
    name: '레인 리딩',
    description: '파친코 흐름을 읽듯 장거리 화력과 투사체 제어가 좋아집니다.',
    roll(level, random) {
      const [speedMin, speedMax] = createLevelScaledPercentRange(0.06, 0.14, level, 0.01, 0.24)
      return {
        projectileSpeedMultiplier: 1 + rollRange(random, speedMin, speedMax, 2),
        damageMultiplier: 1 + rollRange(random, 0.03, 0.08 + getLevelTier(level) * 0.01, 2),
      }
    },
  },
  {
    id: 'guard-breaker',
    name: '가드 브레이커',
    description: '강한 적일수록 더 세게 찍어눌러 보스전에 힘을 실어 줍니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.1, 0.2, level, 0.01, 0.32)
      return { bossDamageMultiplier: 1 + rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'crowd-reaper',
    name: '군중 수확',
    description: '일반 적 무리를 정리하는 화력이 한층 안정적으로 올라갑니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.08, 0.16, level, 0.01, 0.28)
      return { normalEnemyDamageMultiplier: 1 + rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'panic-shield',
    name: '패닉 실드',
    description: '위험한 순간 받는 피해를 덜어 생존 여유를 벌어줍니다.',
    roll(level, random) {
      const [min, max] = createLevelScaledPercentRange(0.08, 0.16, level, 0.01, 0.28)
      return { incomingDamageMultiplier: 1 - rollRange(random, min, max, 2) }
    },
  },
  {
    id: 'finisher-instinct',
    name: '마무리 본능',
    description: '결정타를 노리는 감각으로 치확과 화력을 함께 보강합니다.',
    roll(level, random) {
      const [critMin, critMax] = createLevelScaledPercentRange(0.05, 0.1, level, 0.005, 0.16)
      const [damageMin, damageMax] = createLevelScaledPercentRange(0.03, 0.08, level, 0.005, 0.16)
      return {
        critChanceDelta: rollRange(random, critMin, critMax, 2),
        damageMultiplier: 1 + rollRange(random, damageMin, damageMax, 2),
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
  const effects = template.roll(level, random)
  return {
    id,
    name: template.name,
    description: template.description,
    effectSummary: formatEffectSummary(effects),
    effects,
  }
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
  return [...PASSIVE_CARD_TEMPLATES]
    .map((template) => ({
      template,
      count: state[template.id]?.count ?? 0,
      roll: random(),
    }))
    .sort((left, right) => {
      if (left.count !== right.count) {
        return left.count - right.count
      }
      return left.roll - right.roll
    })
    .slice(0, 3)
    .map(({ template }) => createPassiveCardChoice(template.id, level, random))
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

  totals.critChance = Math.min(0.75, totals.critChance)
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
    fireRateMs: Math.max(55, Math.round(weapon.fireRateMs * totals.fireRateMultiplier)),
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
