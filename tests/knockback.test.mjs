import test from 'node:test'
import assert from 'node:assert/strict'

import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import {
  MAX_KNOCKBACK_DURATION_MS,
  advanceKnockbackState,
  clearKnockbackForTelegraph,
  combineMovementWithKnockback,
  createKnockbackState,
  getEffectiveKnockbackForce,
  getKnockbackDirection,
  normalizeKnockbackDirection,
  resolveKnockbackHit,
  shouldApplyKnockbackSource,
} from '../.tmp-test/src/systems/knockback.js'

const approx = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

test('effective knockback differs by weapon configuration', () => {
  const slimeKnockback = ENEMY_DEFINITIONS.slime.knockback
  const starterForce = getEffectiveKnockbackForce(WEAPON_DEFINITIONS['starter-blaster'].knockback, slimeKnockback)
  const stormForce = getEffectiveKnockbackForce(WEAPON_DEFINITIONS['storm-cannon'].knockback, slimeKnockback)

  assert.ok(stormForce > starterForce)
})

test('effective knockback differs by enemy resistance and weight', () => {
  const weaponKnockback = WEAPON_DEFINITIONS['storm-cannon'].knockback
  const slimeForce = getEffectiveKnockbackForce(weaponKnockback, ENEMY_DEFINITIONS.slime.knockback)
  const bossForce = getEffectiveKnockbackForce(weaponKnockback, ENEMY_DEFINITIONS['slime-boss'].knockback)

  assert.ok(slimeForce > bossForce)
})

test('knockback direction normalizes and falls back safely for zero vectors', () => {
  assert.deepEqual(normalizeKnockbackDirection({ x: 3, y: 4 }), { x: 0.6, y: 0.8 })
  assert.deepEqual(normalizeKnockbackDirection({ x: 0, y: 0 }, { x: 0, y: -5 }), { x: 0, y: -1 })
  assert.deepEqual(getKnockbackDirection({ x: 10, y: 10 }, { x: 10, y: 10 }), { x: 1, y: 0 })
})

test('direct projectile hit creates one active state and combines without vector stacking', () => {
  const result = resolveKnockbackHit({
    source: 'direct-projectile',
    direction: { x: 10, y: 0 },
    weapon: WEAPON_DEFINITIONS['starter-blaster'].knockback,
    enemy: ENEMY_DEFINITIONS.slime.knockback,
    targetIsTelegraphing: false,
    hitTimeMs: 100,
  })

  assert.equal(result.applied, true)
  assert.equal(result.reason, 'applied')
  assert.deepEqual(result.state?.direction, { x: 1, y: 0 })
  assert.deepEqual(combineMovementWithKnockback({ x: 12, y: 5 }, { x: 3, y: -2 }), { x: 15, y: 3 })
})

test('stronger direct hit replaces active knockback state', () => {
  const activeState = createKnockbackState({ x: 1, y: 0 }, 40, 100, 100)
  const result = resolveKnockbackHit({
    source: 'direct-projectile',
    direction: { x: 0, y: 1 },
    weapon: WEAPON_DEFINITIONS['storm-cannon'].knockback,
    enemy: ENEMY_DEFINITIONS.slime.knockback,
    activeState,
    targetIsTelegraphing: false,
    hitTimeMs: 120,
  })

  assert.equal(result.reason, 'replaced-stronger')
  assert.deepEqual(result.state?.direction, { x: 0, y: 1 })
  assert.ok((result.state?.force ?? 0) > (activeState?.force ?? 0))
})

test('equal-strength newer direct hit replaces active knockback state', () => {
  const weapon = WEAPON_DEFINITIONS['starter-blaster'].knockback
  const enemy = ENEMY_DEFINITIONS.slime.knockback
  const force = getEffectiveKnockbackForce(weapon, enemy)
  const activeState = createKnockbackState({ x: 1, y: 0 }, force, weapon.durationMs, 100)

  const result = resolveKnockbackHit({
    source: 'direct-projectile',
    direction: { x: 0, y: 1 },
    weapon,
    enemy,
    activeState,
    targetIsTelegraphing: false,
    hitTimeMs: 101,
  })

  assert.equal(result.reason, 'replaced-newer-equal')
  assert.deepEqual(result.state?.direction, { x: 0, y: 1 })
  assert.equal(result.state?.createdAtMs, 101)
})

test('weaker direct hit does not refresh duration or direction', () => {
  const activeState = createKnockbackState({ x: 1, y: 0 }, 120, 130, 100)
  const result = resolveKnockbackHit({
    source: 'direct-projectile',
    direction: { x: 0, y: 1 },
    weapon: WEAPON_DEFINITIONS['frost-lance'].knockback,
    enemy: ENEMY_DEFINITIONS['slime-boss'].knockback,
    activeState,
    targetIsTelegraphing: false,
    hitTimeMs: 200,
  })

  assert.equal(result.reason, 'weaker-ignored')
  assert.equal(result.state, activeState)
  assert.deepEqual(result.state?.direction, { x: 1, y: 0 })
  assert.equal(result.state?.remainingDurationMs, 130)
})

test('knockback duration is capped to the configured max duration', () => {
  const state = createKnockbackState({ x: 1, y: 0 }, 80, 500, 100, 120)

  assert.equal(state?.remainingDurationMs, 120)
  assert.equal(state?.totalDurationMs, 120)
  assert.equal(MAX_KNOCKBACK_DURATION_MS, 140)
})

test('knockback step decays force and clears deterministically', () => {
  const state = createKnockbackState({ x: 1, y: 0 }, 100, 100, 100)
  const halfStep = advanceKnockbackState(state, 50)

  assert.deepEqual(halfStep.velocity, { x: 100, y: 0 })
  assert.equal(halfStep.state?.remainingDurationMs, 50)
  assert.equal(halfStep.state?.force, 50)

  const finalStep = advanceKnockbackState(halfStep.state, 50)
  assert.deepEqual(finalStep.velocity, { x: 50, y: 0 })
  assert.equal(finalStep.state, undefined)
})

test('telegraphing target suppresses direct-hit knockback state creation', () => {
  const activeState = createKnockbackState({ x: 1, y: 0 }, 80, 100, 100)
  const result = resolveKnockbackHit({
    source: 'direct-projectile',
    direction: { x: 0, y: 1 },
    weapon: WEAPON_DEFINITIONS['storm-cannon'].knockback,
    enemy: ENEMY_DEFINITIONS.slime.knockback,
    activeState,
    targetIsTelegraphing: true,
    hitTimeMs: 150,
  })

  assert.equal(result.applied, false)
  assert.equal(result.reason, 'telegraph-suppressed')
  assert.equal(result.state, undefined)
  assert.equal(clearKnockbackForTelegraph(), undefined)
})

test('source policy enables melee swing knockback while keeping hazard and chain disabled for v1', () => {
  const activeState = createKnockbackState({ x: 1, y: 0 }, 80, 100, 100)

  assert.equal(shouldApplyKnockbackSource('direct-projectile'), true)
  assert.equal(shouldApplyKnockbackSource('melee-swing'), true)
  assert.equal(shouldApplyKnockbackSource('hazard'), false)
  assert.equal(shouldApplyKnockbackSource('chain'), false)

  const meleeResult = resolveKnockbackHit({
    source: 'melee-swing',
    direction: { x: 0, y: 1 },
    weapon: WEAPON_DEFINITIONS['slime-glaive'].knockback,
    enemy: ENEMY_DEFINITIONS.slime.knockback,
    activeState,
    targetIsTelegraphing: false,
    hitTimeMs: 150,
  })

  assert.equal(meleeResult.applied, true)
  assert.notEqual(meleeResult.reason, 'source-disabled')

  for (const source of ['hazard', 'chain']) {
    const result = resolveKnockbackHit({
      source,
      direction: { x: 0, y: 1 },
      weapon: WEAPON_DEFINITIONS['storm-cannon'].knockback,
      enemy: ENEMY_DEFINITIONS.slime.knockback,
      activeState,
      targetIsTelegraphing: false,
      hitTimeMs: 150,
    })

    assert.equal(result.applied, false)
    assert.equal(result.reason, 'source-disabled')
    assert.equal(result.state, activeState)
  }
})

test('enemy data keeps boss knockback restrained with resistance and weight', () => {
  const force = getEffectiveKnockbackForce(
    WEAPON_DEFINITIONS['storm-cannon'].knockback,
    ENEMY_DEFINITIONS['slime-boss'].knockback,
  )

  approx(force, 17.500000000000004)
})
