import test from 'node:test'
import assert from 'node:assert/strict'

import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import {
  addPassiveCard,
  applyPassivePlayerSpeed,
  applyPassiveWeaponEffects,
  createPassiveCardChoice,
  getPassiveCardChoices,
  getPassiveEnemyDamageMultiplier,
  getPassiveIncomingDamageMultiplier,
  getPassivePachinkoActiveWeaponWeightMultiplier,
  getPassivePlayerXpMultiplier,
  getPassivePachinkoNonActiveWeaponWeightMultiplier,
  getPassiveSummaryLines,
  getPassiveTokenXpMultiplier,
  resolveCriticalHit,
} from '../.tmp-test/src/systems/passives.js'

const createSequenceRandom = (values) => {
  let index = 0
  return () => {
    const value = values[index] ?? values.at(-1) ?? 0
    index += 1
    return value
  }
}

test('level-up passive choices are varied but deterministic from the injected random source', () => {
  const firstChoices = getPassiveCardChoices(2, {}, createSequenceRandom([0.01, 0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7]))
  const secondChoices = getPassiveCardChoices(2, {}, createSequenceRandom([0.99, 0.7, 0.5, 0.3, 0.1, 0.9, 0.8, 0.6, 0.4]))

  assert.equal(firstChoices.length, 3)
  assert.equal(new Set(firstChoices.map((choice) => choice.id)).size, 3)
  assert.ok(firstChoices.every((choice) => typeof choice.grade === 'string'))
  assert.notDeepEqual(
    firstChoices.map((choice) => `${choice.id}:${choice.grade}:${choice.effectSummary}`),
    secondChoices.map((choice) => `${choice.id}:${choice.grade}:${choice.effectSummary}`),
  )

  const weightedChoices = getPassiveCardChoices(
    2,
    { 'rapid-trigger': { count: 2, effects: { fireRateMultiplier: 0.8 } } },
    createSequenceRandom([0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7]),
  )
  assert.equal(weightedChoices.some((choice) => choice.id === 'rapid-trigger'), false)
})

test('active weapon always gets its own specialization card until the cap is reached', () => {
  const choices = getPassiveCardChoices(
    9,
    {},
    createSequenceRandom([0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6]),
    'slime-glaive',
  )

  const specialized = choices.find((choice) => choice.kind === 'weapon-specialized')
  assert.ok(specialized)
  assert.equal(specialized?.id, 'slime-glaive-special')
  assert.match(specialized?.description ?? '', /최대 2회/)
  assert.equal(specialized?.iconKey, 'weapon-slime-glaive')

  let cappedState = {}
  const first = createPassiveCardChoice('slime-glaive-special', 9, createSequenceRandom([0.4, 0.6]), 'slime-glaive')
  const second = createPassiveCardChoice('slime-glaive-special', 9, createSequenceRandom([0.5, 0.7]), 'slime-glaive')
  const third = createPassiveCardChoice('slime-glaive-special', 9, createSequenceRandom([0.8, 0.9]), 'slime-glaive')
  cappedState = addPassiveCard(cappedState, first)
  cappedState = addPassiveCard(cappedState, second)
  cappedState = addPassiveCard(cappedState, third)

  assert.equal(cappedState['slime-glaive-special']?.count, 2)

  const cappedChoices = getPassiveCardChoices(
    9,
    cappedState,
    createSequenceRandom([0.2, 0.4, 0.6, 0.8, 0.1, 0.3]),
    'slime-glaive',
  )
  assert.equal(cappedChoices.some((choice) => choice.id === 'slime-glaive-special'), false)
})

test('passives modify hazard, burst, impact, and melee behavior safely with rolled values', () => {
  const rapidTrigger = createPassiveCardChoice('rapid-trigger', 8, createSequenceRandom([0.8]))
  const splitFocus = createPassiveCardChoice('split-focus', 12, createSequenceRandom([0.9]))
  const wideZone = createPassiveCardChoice('wide-zone', 10, createSequenceRandom([0.7, 0.6]))

  let state = {}
  state = addPassiveCard(state, rapidTrigger)
  state = addPassiveCard(state, splitFocus)
  state = addPassiveCard(state, wideZone)

  const baseSprayer = WEAPON_DEFINITIONS['acid-sprayer']
  const modifiedSprayer = applyPassiveWeaponEffects(baseSprayer, state)
  assert.ok(modifiedSprayer.fireRateMs < baseSprayer.fireRateMs)
  assert.equal(modifiedSprayer.attackBehavior.kind, 'spray-hazard')
  assert.ok(modifiedSprayer.attackBehavior.projectileCount > baseSprayer.attackBehavior.projectileCount)
  assert.ok(modifiedSprayer.attackBehavior.hazardRadius > baseSprayer.attackBehavior.hazardRadius)

  const baseTurret = WEAPON_DEFINITIONS['spark-carbine']
  const modifiedTurret = applyPassiveWeaponEffects(baseTurret, state)
  assert.equal(modifiedTurret.attackBehavior.kind, 'deploy-turret')
  assert.ok(modifiedTurret.attackBehavior.deploy.maxTurrets > baseTurret.attackBehavior.deploy.maxTurrets)
  assert.ok(modifiedTurret.attackBehavior.deploy.range > baseTurret.attackBehavior.deploy.range)
  const baseBurst = WEAPON_DEFINITIONS['starter-blaster']
  const modifiedBurst = applyPassiveWeaponEffects(baseBurst, state)
  assert.equal(modifiedBurst.attackBehavior.kind, 'burst-fire')
  assert.ok(modifiedBurst.attackBehavior.shotsPerBurst > baseBurst.attackBehavior.shotsPerBurst)
  assert.ok(modifiedBurst.fireRateMs < baseBurst.fireRateMs)
  assert.ok((modifiedBurst.range ?? 0) > (baseBurst.range ?? 0))

  const glaiveState = addPassiveCard({}, createPassiveCardChoice('wide-zone', 6, createSequenceRandom([0.4, 0.9])))
  const baseGlaive = WEAPON_DEFINITIONS['slime-glaive']
  const modifiedGlaive = applyPassiveWeaponEffects(baseGlaive, glaiveState)
  assert.equal(modifiedGlaive.attackBehavior.kind, 'melee-cleave')
  assert.ok(modifiedGlaive.attackBehavior.range > baseGlaive.attackBehavior.range)

  const baseStorm = WEAPON_DEFINITIONS['storm-cannon']
  const modifiedStorm = applyPassiveWeaponEffects(baseStorm, state)
  assert.equal(modifiedStorm.attackBehavior.kind, 'split-shot')
  assert.ok(modifiedStorm.attackBehavior.projectileCount > baseStorm.attackBehavior.projectileCount)
  const impactState = addPassiveCard({}, createPassiveCardChoice('linger-protocol', 12, createSequenceRandom([0.8, 0.7])))
  const baseImpact = WEAPON_DEFINITIONS['frost-lance']
  const modifiedImpact = applyPassiveWeaponEffects(baseImpact, impactState)
  assert.equal(modifiedImpact.attackBehavior.kind, 'impact-aoe')
  assert.ok(modifiedImpact.attackBehavior.projectileLifetimeMs > baseImpact.attackBehavior.projectileLifetimeMs)
})

test('duration, ricochet, summon, turret, and lifesteal card stats all feed weapon behavior', () => {
  let state = {}
  state = addPassiveCard(state, createPassiveCardChoice('linger-protocol', 12, createSequenceRandom([0.8, 0.7])))
  state = addPassiveCard(state, createPassiveCardChoice('arc-playbook', 12, createSequenceRandom([0.9, 0.8])))
  state = addPassiveCard(state, createPassiveCardChoice('siege-framework', 12, createSequenceRandom([0.75, 0.65])))
  state = addPassiveCard(state, createPassiveCardChoice('slime-glaive-special', 12, createSequenceRandom([0.8, 0.7]), 'slime-glaive'))
  state = addPassiveCard(state, createPassiveCardChoice('spark-carbine-special', 12, createSequenceRandom([0.6, 0.5]), 'spark-carbine'))
  state = addPassiveCard(state, createPassiveCardChoice('needle-fan-special', 12, createSequenceRandom([0.7, 0.6]), 'needle-fan'))

  const compiler = applyPassiveWeaponEffects(WEAPON_DEFINITIONS['mist-vortex'], state)
  assert.equal(compiler.attackBehavior.kind, 'zone-control')
  assert.ok(compiler.attackBehavior.zoneDurationMs > WEAPON_DEFINITIONS['mist-vortex'].attackBehavior.zoneDurationMs)
  assert.ok(compiler.attackBehavior.projectileLifetimeMs > WEAPON_DEFINITIONS['mist-vortex'].attackBehavior.projectileLifetimeMs)

  const kickoff = applyPassiveWeaponEffects(WEAPON_DEFINITIONS['arc-loom'], state)
  assert.equal(kickoff.attackBehavior.kind, 'single')
  assert.ok(kickoff.attackBehavior.ricochet.maxBounces > WEAPON_DEFINITIONS['arc-loom'].attackBehavior.ricochet.maxBounces)
  assert.ok(kickoff.attackBehavior.ricochet.bounceRange > WEAPON_DEFINITIONS['arc-loom'].attackBehavior.ricochet.bounceRange)

  const sentry = applyPassiveWeaponEffects(WEAPON_DEFINITIONS['spark-carbine'], state)
  assert.equal(sentry.attackBehavior.kind, 'deploy-turret')
  assert.ok(sentry.attackBehavior.deploy.durationMs > WEAPON_DEFINITIONS['spark-carbine'].attackBehavior.deploy.durationMs)
  assert.ok(sentry.attackBehavior.deploy.fireRateMs < WEAPON_DEFINITIONS['spark-carbine'].attackBehavior.deploy.fireRateMs)

  const reanimator = applyPassiveWeaponEffects(WEAPON_DEFINITIONS['needle-fan'], state)
  assert.equal(reanimator.attackBehavior.kind, 'single')
  assert.ok(reanimator.attackBehavior.summonOnKill.maxMinions > WEAPON_DEFINITIONS['needle-fan'].attackBehavior.summonOnKill.maxMinions)
  assert.ok(reanimator.attackBehavior.summonOnKill.durationMs > WEAPON_DEFINITIONS['needle-fan'].attackBehavior.summonOnKill.durationMs)

  const bloodReaver = applyPassiveWeaponEffects(WEAPON_DEFINITIONS['slime-glaive'], state)
  assert.equal(bloodReaver.attackBehavior.kind, 'melee-cleave')
  assert.ok(bloodReaver.attackBehavior.healOnHit > WEAPON_DEFINITIONS['slime-glaive'].attackBehavior.healOnHit)
})

test('critical-hit resolution stays deterministic from rolled passive state', () => {
  let critState = {}
  critState = addPassiveCard(critState, createPassiveCardChoice('keen-sense', 10, createSequenceRandom([0.95])))
  critState = addPassiveCard(critState, createPassiveCardChoice('big-hit', 10, createSequenceRandom([0.9])))

  const guaranteedCrit = resolveCriticalHit(20, critState, () => 0.01)
  const guaranteedNormal = resolveCriticalHit(20, critState, () => 0.99)

  assert.equal(guaranteedCrit.isCritical, true)
  assert.ok(guaranteedCrit.damage > 20)
  assert.equal(guaranteedNormal.isCritical, false)
  assert.equal(guaranteedNormal.damage, 20)
})

test('passive summaries and player speed reflect rolled and stacked run-local choices', () => {
  let state = {}
  state = addPassiveCard(state, createPassiveCardChoice('runner-instinct', 4, createSequenceRandom([0.2])))
  state = addPassiveCard(state, createPassiveCardChoice('runner-instinct', 11, createSequenceRandom([0.8])))
  state = addPassiveCard(state, createPassiveCardChoice('keen-sense', 7, createSequenceRandom([0.5])))
  state = addPassiveCard(state, createPassiveCardChoice('split-focus', 9, createSequenceRandom([0.2])))
  state = addPassiveCard(state, createPassiveCardChoice('rangefinder', 9, createSequenceRandom([0.6])))

  assert.ok(applyPassivePlayerSpeed(220, state) > 220)
  const lines = getPassiveSummaryLines(state)
  assert.equal(lines.length, 4)
  assert.match(lines[0], /런각 본능 × 2/)
  assert.match(lines[0], /이동속도 \+/)
  assert.ok(lines.some((line) => /예리한 감각/.test(line)))
  assert.ok(lines.some((line) => /투사체 \+/.test(line)))
  assert.ok(lines.some((line) => /사거리\/범위 \+/.test(line)))
})



test('pickup utility cards expose attraction, collect, speed, and heal scaling', () => {
  const magnet = createPassiveCardChoice('magnet-array', 12, createSequenceRandom([0.9]))
  const vacuum = createPassiveCardChoice('vacuum-pocket', 10, createSequenceRandom([0.8, 0.7]))
  const recovery = createPassiveCardChoice('recovery-loop', 9, createSequenceRandom([0.6, 0.5]))
  const scavenger = createPassiveCardChoice('scavenger-route', 11, createSequenceRandom([0.7, 0.8]))

  let state = {}
  state = addPassiveCard(state, magnet)
  state = addPassiveCard(state, vacuum)
  state = addPassiveCard(state, recovery)
  state = addPassiveCard(state, scavenger)

  const lines = getPassiveSummaryLines(state)
  assert.ok(lines.some((line) => /흡입 범위/.test(line)))
  assert.ok(lines.some((line) => /획득 범위/.test(line)))
  assert.ok(lines.some((line) => /흡입 속도/.test(line)))
  assert.ok(lines.some((line) => /하트 회복량/.test(line)))
})

test('card categories keep loot utility in general and combat scaling in passive buckets', () => {
  const magnet = createPassiveCardChoice('magnet-array', 8, createSequenceRandom([0.8]))
  const vacuum = createPassiveCardChoice('vacuum-pocket', 8, createSequenceRandom([0.7, 0.6]))
  const scavenger = createPassiveCardChoice('scavenger-route', 8, createSequenceRandom([0.7, 0.5]))
  const shield = createPassiveCardChoice('panic-shield', 8, createSequenceRandom([0.7]))
  const critMass = createPassiveCardChoice('critical-mass', 8, createSequenceRandom([0.8, 0.7]))
  const linger = createPassiveCardChoice('linger-protocol', 8, createSequenceRandom([0.8, 0.7]))
  const status = createPassiveCardChoice('status-overclock', 8, createSequenceRandom([0.8, 0.7]))

  assert.equal(magnet.kind, 'general')
  assert.equal(vacuum.kind, 'general')
  assert.equal(scavenger.kind, 'general')
  assert.equal(shield.kind, 'passive')
  assert.equal(critMass.kind, 'passive')
  assert.equal(linger.kind, 'passive')
  assert.equal(status.kind, 'passive')
})

test('new pachinko and enemy cards expose varied utility modifiers', () => {
  const jackpot = createPassiveCardChoice('jackpot-fever', 12, createSequenceRandom([0.9]))
  const loaded = createPassiveCardChoice('loaded-reel', 12, createSequenceRandom([0.8]))
  const wide = createPassiveCardChoice('wide-catalog', 12, createSequenceRandom([0.7]))
  const shield = createPassiveCardChoice('panic-shield', 9, createSequenceRandom([0.75]))
  const boss = createPassiveCardChoice('guard-breaker', 15, createSequenceRandom([0.8]))
  const crowd = createPassiveCardChoice('crowd-reaper', 15, createSequenceRandom([0.6]))

  let state = {}
  state = addPassiveCard(state, jackpot)
  state = addPassiveCard(state, loaded)
  state = addPassiveCard(state, wide)
  state = addPassiveCard(state, shield)
  state = addPassiveCard(state, boss)
  state = addPassiveCard(state, crowd)

  assert.ok(getPassiveTokenXpMultiplier(state) > 1)
  assert.ok(getPassivePachinkoActiveWeaponWeightMultiplier(state) > 1)
  assert.ok(getPassivePachinkoNonActiveWeaponWeightMultiplier(state) > 1)
  assert.ok(getPassiveIncomingDamageMultiplier(state) < 1)
  assert.ok(getPassiveEnemyDamageMultiplier(true, state) > 1)
  assert.ok(getPassiveEnemyDamageMultiplier(false, state) > 1)

  const lines = getPassiveSummaryLines(state)
  assert.ok(lines.some((line) => /토큰 XP/.test(line)))
  assert.ok(lines.some((line) => /활성 무기 확률/.test(line)))
  assert.ok(lines.some((line) => /다른 무기 확률/.test(line)))
  assert.ok(lines.some((line) => /받는 피해/.test(line)))
  assert.ok(lines.some((line) => /보스 피해/.test(line)))
  assert.ok(lines.some((line) => /일반 적 피해/.test(line)))
  assert.ok([jackpot.grade, shield.grade, boss.grade, crowd.grade].every(Boolean))
})

test('general progression cards can boost character xp separately from token xp', () => {
  const growth = createPassiveCardChoice('growth-cache', 10, createSequenceRandom([0.9, 0.4]))
  const dividend = createPassiveCardChoice('token-dividend', 10, createSequenceRandom([0.8]))

  let state = {}
  state = addPassiveCard(state, growth)
  state = addPassiveCard(state, dividend)

  assert.ok(getPassivePlayerXpMultiplier(state) > 1)
  assert.ok(getPassiveTokenXpMultiplier(state) > 1)

  const lines = getPassiveSummaryLines(state)
  assert.ok(lines.some((line) => /캐릭터 XP/.test(line)))
  assert.ok(lines.some((line) => /토큰 XP/.test(line)))
})
