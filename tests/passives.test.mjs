import test from 'node:test'
import assert from 'node:assert/strict'

import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import {
  addPassiveCard,
  applyPassivePlayerSpeed,
  applyPassiveWeaponEffects,
  getPassiveCardChoices,
  getPassiveSummaryLines,
  resolveCriticalHit,
} from '../.tmp-test/src/systems/passives.js'

test('level-up passive choices are deterministic and avoid over-repeating owned cards', () => {
  const emptyChoices = getPassiveCardChoices(2, {})
  assert.equal(emptyChoices.length, 3)
  assert.deepEqual(
    emptyChoices.map((choice) => choice.id),
    ['rapid-trigger', 'keen-sense', 'big-hit'],
  )

  const weightedChoices = getPassiveCardChoices(2, { 'rapid-trigger': 2 })
  assert.equal(weightedChoices.some((choice) => choice.id === 'rapid-trigger'), false)
})

test('passives modify effective weapon stats and behavior safely', () => {
  const baseSprayer = WEAPON_DEFINITIONS['acid-sprayer']
  const modifiedSprayer = applyPassiveWeaponEffects(baseSprayer, {
    'rapid-trigger': 1,
    'split-focus': 1,
    'wide-zone': 1,
  })

  assert.ok(modifiedSprayer.fireRateMs < baseSprayer.fireRateMs)
  assert.equal(modifiedSprayer.attackBehavior.kind, 'spray-hazard')
  assert.equal(modifiedSprayer.attackBehavior.projectileCount, baseSprayer.attackBehavior.projectileCount + 1)
  assert.ok(modifiedSprayer.attackBehavior.hazardRadius > baseSprayer.attackBehavior.hazardRadius)

  const baseGlaive = WEAPON_DEFINITIONS['slime-glaive']
  const modifiedGlaive = applyPassiveWeaponEffects(baseGlaive, { 'wide-zone': 1 })
  assert.equal(modifiedGlaive.attackBehavior.kind, 'melee-cleave')
  assert.ok(modifiedGlaive.attackBehavior.range > baseGlaive.attackBehavior.range)
})

test('critical-hit resolution is deterministic from the injected random source', () => {
  const guaranteedCrit = resolveCriticalHit(20, { 'keen-sense': 1, 'big-hit': 1 }, () => 0.01)
  const guaranteedNormal = resolveCriticalHit(20, { 'keen-sense': 1, 'big-hit': 1 }, () => 0.99)

  assert.equal(guaranteedCrit.isCritical, true)
  assert.equal(guaranteedCrit.damage, Math.round(20 * 1.95))
  assert.equal(guaranteedNormal.isCritical, false)
  assert.equal(guaranteedNormal.damage, 20)
})

test('passive summaries and player speed reflect stacked run-local choices', () => {
  let state = {}
  state = addPassiveCard(state, 'runner-instinct')
  state = addPassiveCard(state, 'runner-instinct')
  state = addPassiveCard(state, 'keen-sense')

  assert.equal(applyPassivePlayerSpeed(220, state), Math.round(220 * 1.08 * 1.08))
  assert.deepEqual(getPassiveSummaryLines(state), [
    '런각 본능 × 2 · 이동속도 +8%',
    '예리한 감각 · 치명타 확률 +12%',
  ])
})
