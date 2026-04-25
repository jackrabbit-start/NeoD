import test from 'node:test'
import assert from 'node:assert/strict'

import {
  advanceEnemyProjectileState,
  canProjectileDamageTarget,
  createEnemyProjectileState,
  isEnemyProjectileHittingPlayer,
  isEnemyProjectileOutOfBounds,
} from '../.tmp-test/src/systems/enemyProjectiles.js'

const baseSpec = {
  direction: { x: 1, y: 0 },
  speed: 100,
  damage: 9,
  radius: 4,
  lifetimeMs: 500,
  tint: 0xffb15c,
  textureKey: 'needle-projectile',
}

test('enemy projectile state advances by speed and lifetime', () => {
  const state = createEnemyProjectileState({ x: 10, y: 20 }, baseSpec)
  const step = advanceEnemyProjectileState(
    state,
    100,
    { width: 960, height: 540 },
    { x: 400, y: 20, radius: 14 },
  )

  assert.equal(step.didAdvance, true)
  assert.equal(step.projectile.x, 20)
  assert.equal(step.projectile.y, 20)
  assert.equal(step.projectile.remainingLifetimeMs, 400)
  assert.equal(step.destroyed, false)
})

test('enemy projectile lifecycle detects expiry, bounds, and player hits', () => {
  const expiring = createEnemyProjectileState({ x: 10, y: 20 }, baseSpec)
  const expiredStep = advanceEnemyProjectileState(
    expiring,
    600,
    { width: 960, height: 540 },
    { x: 400, y: 20, radius: 14 },
  )
  assert.equal(expiredStep.expired, true)
  assert.equal(expiredStep.destroyed, true)

  const outOfBounds = createEnemyProjectileState({ x: 960, y: 20 }, baseSpec)
  const outOfBoundsStep = advanceEnemyProjectileState(
    outOfBounds,
    100,
    { width: 960, height: 540 },
    { x: 400, y: 20, radius: 14 },
  )
  assert.equal(outOfBoundsStep.outOfBounds, true)
  assert.equal(outOfBoundsStep.destroyed, true)

  const hitting = createEnemyProjectileState({ x: 10, y: 20 }, baseSpec)
  const hitStep = advanceEnemyProjectileState(
    hitting,
    100,
    { width: 960, height: 540 },
    { x: 22, y: 20, radius: 14 },
  )
  assert.equal(hitStep.hitPlayer, true)
  assert.equal(hitStep.destroyed, true)
})

test('enemy projectile helper preserves pause and ownership boundaries', () => {
  const state = createEnemyProjectileState({ x: 10, y: 20 }, baseSpec)
  const pausedStep = advanceEnemyProjectileState(
    state,
    100,
    { width: 960, height: 540 },
    { x: 22, y: 20, radius: 14 },
    true,
  )

  assert.equal(pausedStep.didAdvance, false)
  assert.equal(pausedStep.projectile, state)
  assert.equal(pausedStep.destroyed, false)
  assert.equal(canProjectileDamageTarget('enemy', 'player'), true)
  assert.equal(canProjectileDamageTarget('enemy', 'enemy'), false)
  assert.equal(canProjectileDamageTarget('player', 'enemy'), true)
  assert.equal(canProjectileDamageTarget('player', 'player'), false)
})

test('enemy projectile pure collision helpers expose cleanup decisions', () => {
  assert.equal(
    isEnemyProjectileOutOfBounds({ x: -5, y: 20, radius: 4 }, { width: 960, height: 540 }),
    true,
  )
  assert.equal(
    isEnemyProjectileOutOfBounds({ x: -3, y: 20, radius: 4 }, { width: 960, height: 540 }),
    false,
  )
  assert.equal(
    isEnemyProjectileHittingPlayer({ x: 12, y: 20, radius: 4 }, { x: 28, y: 20, radius: 12 }),
    true,
  )
})
