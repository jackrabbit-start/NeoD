import test from 'node:test'
import assert from 'node:assert/strict'

import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
import {
  advanceEnemyCooldown,
  createEnemyTelegraph,
  getEnemyBehaviorSummary,
  isPointInsideCircle,
  resolveEnemyVelocity,
  selectAutoFireTarget,
  shouldEnemyStartTelegraph,
} from '../.tmp-test/src/systems/enemyBehaviors.js'
import { getCodexState } from '../.tmp-test/src/systems/codex.js'

test('auto-fire target selection prefers nearest enemy and breaks ties by runtime id', () => {
  const target = selectAutoFireTarget(
    { x: 0, y: 0 },
    [
      { id: 7, x: 40, y: 0 },
      { id: 3, x: 20, y: 0 },
      { id: 2, x: 20, y: 0 },
    ],
  )

  assert.deepEqual(target, { id: 2, x: 20, y: 0 })
})

test('orbit movement makes spark slime circle while backing off when too close', () => {
  const velocity = resolveEnemyVelocity(
    { x: 0, y: 100 },
    { x: 0, y: 0 },
    ENEMY_DEFINITIONS['spark-slime'].speed,
    ENEMY_DEFINITIONS['spark-slime'].movementBehavior,
  )

  assert.ok(velocity.x > 0)
  assert.ok(velocity.y > 0)
})

test('telegraphed aoe uses player or self anchor based on enemy config', () => {
  const sparkTelegraph = createEnemyTelegraph(
    { x: 10, y: 20 },
    { x: 90, y: 120 },
    ENEMY_DEFINITIONS['spark-slime'].attackBehavior,
  )
  const bossTelegraph = createEnemyTelegraph(
    { x: 44, y: 55 },
    { x: 90, y: 120 },
    ENEMY_DEFINITIONS['slime-boss'].attackBehavior,
  )

  assert.deepEqual(
    sparkTelegraph && { x: sparkTelegraph.x, y: sparkTelegraph.y, radius: sparkTelegraph.radius },
    { x: 90, y: 120, radius: 54 },
  )
  assert.deepEqual(
    bossTelegraph && { x: bossTelegraph.x, y: bossTelegraph.y, radius: bossTelegraph.radius },
    { x: 44, y: 55, radius: 88 },
  )
})

test('telegraph start and cooldown helpers remain deterministic', () => {
  const attackBehavior = ENEMY_DEFINITIONS['spark-slime'].attackBehavior

  assert.equal(shouldEnemyStartTelegraph(attackBehavior, 150, 0), true)
  assert.equal(shouldEnemyStartTelegraph(attackBehavior, 260, 0), false)
  assert.equal(shouldEnemyStartTelegraph(attackBehavior, 150, 300), false)
  assert.equal(advanceEnemyCooldown(1200, 300), 900)
  assert.equal(advanceEnemyCooldown(1200, 1500), 0)
})

test('circle hit test and codex enemy summary expose the new enemy identities', () => {
  assert.equal(isPointInsideCircle({ x: 108, y: 100 }, { x: 100, y: 100 }, 10), true)
  assert.equal(isPointInsideCircle({ x: 120, y: 100 }, { x: 100, y: 100 }, 10), false)
  assert.match(getEnemyBehaviorSummary(ENEMY_DEFINITIONS['spark-slime']), /충격 범위/)

  const codex = getCodexState(true)
  const sparkSlime = codex.enemies.find((enemy) => enemy.id === 'spark-slime')
  assert.ok(sparkSlime?.stats.some((entry) => /충격 범위/.test(entry)))
})
