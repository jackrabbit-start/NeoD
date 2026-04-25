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
}

export const PASSIVE_CARD_DEFINITIONS = [
  {
    id: 'rapid-trigger',
    name: '속사 트리거',
    description: '모든 무기의 공격 주기가 짧아집니다.',
    effectSummary: '공격속도 +14%',
    effects: { fireRateMultiplier: 0.86 },
  },
  {
    id: 'keen-sense',
    name: '예리한 감각',
    description: '약점을 노려 치명타가 발생할 수 있습니다.',
    effectSummary: '치명타 확률 +12%',
    effects: { critChanceDelta: 0.12 },
  },
  {
    id: 'big-hit',
    name: '한방 각',
    description: '치명타가 더 크게 터집니다.',
    effectSummary: '치명타 피해 +45%',
    effects: { critDamageMultiplierDelta: 0.45 },
  },
  {
    id: 'long-barrel',
    name: '롱배럴 감성',
    description: '투사체 속도와 사거리가 늘어납니다.',
    effectSummary: '투사체 속도 +12% · 사거리 +36',
    effects: { projectileSpeedMultiplier: 1.12, rangeDelta: 36 },
  },
  {
    id: 'heavy-push',
    name: '묵직한 밀어내기',
    description: '무기 충격이 강해져 적을 더 잘 밀어냅니다.',
    effectSummary: '피해 +8% · 넉백 +18%',
    effects: { damageMultiplier: 1.08, knockbackForceMultiplier: 1.18 },
  },
  {
    id: 'wide-zone',
    name: '영역 장악',
    description: '장판과 근접 범위가 넓어져 공간을 더 잘 지킵니다.',
    effectSummary: '범위 +18 · 장판 반경 +18%',
    effects: { rangeDelta: 18, hazardRadiusMultiplier: 1.18 },
  },
  {
    id: 'split-focus',
    name: '분산 집중',
    description: '분사형 무기가 탄을 더 흩뿌립니다.',
    effectSummary: '분사 투사체 +1',
    effects: { projectileCountDelta: 1 },
  },
  {
    id: 'runner-instinct',
    name: '런각 본능',
    description: '캐릭터 이동 속도가 올라 카이팅 여지가 커집니다.',
    effectSummary: '이동속도 +8%',
    effects: { playerSpeedMultiplier: 1.08 },
  },
] as const

export type PassiveCardId = (typeof PASSIVE_CARD_DEFINITIONS)[number]['id']
export type PassiveState = Partial<Record<PassiveCardId, number>>
export type PassiveCardDefinition = (typeof PASSIVE_CARD_DEFINITIONS)[number] & { effects: PassiveEffects }

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

export function getPassiveDefinition(id: PassiveCardId): PassiveCardDefinition {
  const definition = PASSIVE_CARD_DEFINITIONS.find((card) => card.id === id)
  if (!definition) {
    throw new Error(`Unknown passive card: ${id}`)
  }
  return definition
}

export function addPassiveCard(state: PassiveState, id: PassiveCardId): PassiveState {
  return {
    ...state,
    [id]: (state[id] ?? 0) + 1,
  }
}

export function getPassiveCardChoices(level: number, state: PassiveState = {}): PassiveCardDefinition[] {
  const startIndex = Math.max(0, Math.floor(level) - 2) % PASSIVE_CARD_DEFINITIONS.length
  const ordered = [
    ...PASSIVE_CARD_DEFINITIONS.slice(startIndex),
    ...PASSIVE_CARD_DEFINITIONS.slice(0, startIndex),
  ]

  return [...ordered]
    .sort((left, right) => (state[left.id] ?? 0) - (state[right.id] ?? 0))
    .slice(0, 3)
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
  }

  for (const [id, rawCount] of Object.entries(state) as Array<[PassiveCardId, number | undefined]>) {
    const count = Math.max(0, Math.floor(rawCount ?? 0))
    if (count <= 0) {
      continue
    }

    const effects = getPassiveDefinition(id).effects
    totals.damageMultiplier *= (effects.damageMultiplier ?? 1) ** count
    totals.fireRateMultiplier *= (effects.fireRateMultiplier ?? 1) ** count
    totals.projectileSpeedMultiplier *= (effects.projectileSpeedMultiplier ?? 1) ** count
    totals.rangeDelta += (effects.rangeDelta ?? 0) * count
    totals.knockbackForceMultiplier *= (effects.knockbackForceMultiplier ?? 1) ** count
    totals.hazardRadiusMultiplier *= (effects.hazardRadiusMultiplier ?? 1) ** count
    totals.projectileCountDelta += (effects.projectileCountDelta ?? 0) * count
    totals.critChance += (effects.critChanceDelta ?? 0) * count
    totals.critDamageMultiplier += (effects.critDamageMultiplierDelta ?? 0) * count
    totals.playerSpeedMultiplier *= (effects.playerSpeedMultiplier ?? 1) ** count
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

export function getPassiveSummaryLines(state: PassiveState = {}): string[] {
  const entries = (Object.entries(state) as Array<[PassiveCardId, number | undefined]>)
    .filter(([, count]) => (count ?? 0) > 0)

  if (entries.length === 0) {
    return ['패시브 없음 · 레벨업하면 3장 카드 중 하나를 선택']
  }

  return entries.map(([id, count]) => {
    const card = getPassiveDefinition(id)
    return `${card.name}${(count ?? 0) > 1 ? ` × ${count}` : ''} · ${card.effectSummary}`
  })
}
