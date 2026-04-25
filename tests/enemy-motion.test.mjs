import test from 'node:test'
import assert from 'node:assert/strict'

import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
import {
  getEnemyAttackMotionProfile,
  getEnemyHitMotionProfile,
} from '../.tmp-test/src/systems/enemyMotion.js'

test('enemy attack motion profiles differ across attack families', () => {
  const telegraph = getEnemyAttackMotionProfile(
    'spark-slime',
    ENEMY_DEFINITIONS['spark-slime'].attackBehavior,
  )
  const spread = getEnemyAttackMotionProfile(
    'needle-wasp',
    ENEMY_DEFINITIONS['needle-wasp'].attackBehavior,
  )
  const line = getEnemyAttackMotionProfile(
    'shard-sentinel',
    ENEMY_DEFINITIONS['shard-sentinel'].attackBehavior,
  )
  const radial = getEnemyAttackMotionProfile(
    'splitter-slime',
    ENEMY_DEFINITIONS['splitter-slime'].attackBehavior,
  )
  const contact = getEnemyAttackMotionProfile(
    'dash-slime',
    ENEMY_DEFINITIONS['dash-slime'].attackBehavior,
  )

  assert.notDeepEqual(telegraph, spread)
  assert.notDeepEqual(spread, line)
  assert.notDeepEqual(line, radial)
  assert.notDeepEqual(radial, contact)
  assert.equal(radial.scaleX, radial.scaleY)
  assert.ok(spread.angle !== 0)
  assert.ok(line.angle !== 0)
})

test('enemy hit motion profiles reflect heavier and lighter silhouettes differently', () => {
  const crusherHit = getEnemyHitMotionProfile('crusher-slime')
  const waspHit = getEnemyHitMotionProfile('needle-wasp')
  const orbHit = getEnemyHitMotionProfile('void-orb')

  assert.ok(crusherHit.scaleX > 1)
  assert.ok(crusherHit.scaleY < 1)
  assert.ok(waspHit.angle !== 0)
  assert.ok(orbHit.scaleY > 1)
  assert.notDeepEqual(crusherHit, waspHit)
  assert.notDeepEqual(waspHit, orbHit)
})
