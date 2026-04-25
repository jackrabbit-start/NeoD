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
  assert.notDeepEqual(
    firstChoices.map((choice) => `${choice.id}:${choice.effectSummary}`),
    secondChoices.map((choice) => `${choice.id}:${choice.effectSummary}`),
  )

  const weightedChoices = getPassiveCardChoices(
    2,
    { 'rapid-trigger': { count: 2, effects: { fireRateMultiplier: 0.8 } } },
    createSequenceRandom([0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7]),
  )
  assert.equal(weightedChoices.some((choice) => choice.id === 'rapid-trigger'), false)
})

test('passives modify hazard, volley, and melee behavior safely with rolled values', () => {
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

  const baseVolley = WEAPON_DEFINITIONS['spark-carbine']
  const modifiedVolley = applyPassiveWeaponEffects(baseVolley, state)
  assert.equal(modifiedVolley.attackBehavior.kind, 'volley')
  assert.ok(modifiedVolley.attackBehavior.projectileCount > baseVolley.attackBehavior.projectileCount)
  assert.equal(modifiedVolley.attackBehavior.spreadDegrees, baseVolley.attackBehavior.spreadDegrees)

  const glaiveState = addPassiveCard({}, createPassiveCardChoice('wide-zone', 6, createSequenceRandom([0.4, 0.9])))
  const baseGlaive = WEAPON_DEFINITIONS['slime-glaive']
  const modifiedGlaive = applyPassiveWeaponEffects(baseGlaive, glaiveState)
  assert.equal(modifiedGlaive.attackBehavior.kind, 'melee-cleave')
  assert.ok(modifiedGlaive.attackBehavior.range > baseGlaive.attackBehavior.range)

  const baseStorm = WEAPON_DEFINITIONS['storm-cannon']
  const modifiedStorm = applyPassiveWeaponEffects(baseStorm, state)
  assert.equal(modifiedStorm.attackBehavior.kind, 'impact-burst')
  assert.equal(modifiedStorm.attackBehavior.splashRadius, baseStorm.attackBehavior.splashRadius)
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

  assert.ok(applyPassivePlayerSpeed(220, state) > 220)
  const lines = getPassiveSummaryLines(state)
  assert.equal(lines.length, 3)
  assert.match(lines[0], /런각 본능 × 2/)
  assert.match(lines[0], /이동속도 \+/)
  assert.ok(lines.some((line) => /예리한 감각/.test(line)))
  assert.ok(lines.some((line) => /투사체 \+/.test(line)))
})

test('new pachinko and enemy cards expose varied utility modifiers', () => {
  const jackpot = createPassiveCardChoice('jackpot-fever', 12, createSequenceRandom([0.9]))
  const shield = createPassiveCardChoice('panic-shield', 9, createSequenceRandom([0.75]))
  const boss = createPassiveCardChoice('guard-breaker', 15, createSequenceRandom([0.8]))
  const crowd = createPassiveCardChoice('crowd-reaper', 15, createSequenceRandom([0.6]))

  let state = {}
  state = addPassiveCard(state, jackpot)
  state = addPassiveCard(state, shield)
  state = addPassiveCard(state, boss)
  state = addPassiveCard(state, crowd)

  assert.ok(getPassiveTokenXpMultiplier(state) > 1)
  assert.ok(getPassiveIncomingDamageMultiplier(state) < 1)
  assert.ok(getPassiveEnemyDamageMultiplier(true, state) > 1)
  assert.ok(getPassiveEnemyDamageMultiplier(false, state) > 1)

  const lines = getPassiveSummaryLines(state)
  assert.ok(lines.some((line) => /토큰 XP/.test(line)))
  assert.ok(lines.some((line) => /받는 피해/.test(line)))
  assert.ok(lines.some((line) => /보스 피해/.test(line)))
  assert.ok(lines.some((line) => /일반 적 피해/.test(line)))
})
