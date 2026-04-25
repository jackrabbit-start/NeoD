import test from 'node:test'
import assert from 'node:assert/strict'

import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
import {
  advanceEnemyCooldown,
  createEnemyAttackTarget,
  createEnemyLineBeam,
  createEnemyRadialBurstProjectiles,
  createEnemySpreadBurstProjectiles,
  createEnemyTelegraph,
  getEnemyBehaviorSummary,
  isPointInsideCircle,
  isPointInsideLineBeam,
  resolveEnemyVelocity,
  selectAutoFireTarget,
  shouldEnemyStartLineBeam,
  shouldEnemyStartRadialBurst,
  shouldEnemyStartSpreadBurst,
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

test('enemy pressure constants match the near-miss low-clear-rate pass', () => {
  const slime = ENEMY_DEFINITIONS.slime
  const spark = ENEMY_DEFINITIONS['spark-slime']
  const prism = ENEMY_DEFINITIONS['prism-slime']
  const dash = ENEMY_DEFINITIONS['dash-slime']
  const orbit = ENEMY_DEFINITIONS['orbit-slime']
  const splitter = ENEMY_DEFINITIONS['splitter-slime']
  const sentinel = ENEMY_DEFINITIONS['shard-sentinel']
  const mender = ENEMY_DEFINITIONS['mender-slime']
  const voidOrb = ENEMY_DEFINITIONS['void-orb']
  const crusher = ENEMY_DEFINITIONS['crusher-slime']
  const moth = ENEMY_DEFINITIONS['lantern-moth']
  const wisp = ENEMY_DEFINITIONS['mirror-wisp']
  const toad = ENEMY_DEFINITIONS['siege-toad']
  const boss = ENEMY_DEFINITIONS['slime-boss']

  assert.equal(slime.maxHealth, 30)
  assert.equal(slime.speed, 84)
  assert.equal(slime.contactDamage, 18)

  assert.equal(spark.maxHealth, 40)
  assert.equal(spark.speed, 92)
  assert.equal(spark.contactDamage, 20)
  assert.equal(spark.movementBehavior.kind, 'orbit')
  assert.equal(spark.movementBehavior.preferredDistance, 132)
  assert.equal(spark.movementBehavior.distanceTolerance, 22)
  assert.equal(spark.attackBehavior.kind, 'telegraphed-aoe')
  assert.equal(spark.attackBehavior.damage, 24)
  assert.equal(spark.attackBehavior.cooldownMs, 820)
  assert.equal(spark.attackBehavior.telegraphMs, 500)
  assert.equal(spark.attackBehavior.radius, 72)
  assert.equal(spark.attackBehavior.range, 290)
  assert.equal(spark.attackBehavior.targetJitterRadius, 86)

  assert.equal(prism.maxHealth, 110)
  assert.equal(prism.speed, 82)
  assert.equal(prism.contactDamage, 28)

  assert.equal(dash.maxHealth, 46)
  assert.equal(dash.speed, 76)
  assert.equal(dash.contactDamage, 22)
  assert.equal(dash.movementBehavior.kind, 'dash')
  assert.equal(dash.movementBehavior.triggerRange, 270)
  assert.equal(dash.movementBehavior.chargeSpeed, 270)
  assert.equal(dash.movementBehavior.chargeDurationMs, 520)
  assert.equal(dash.movementBehavior.cooldownMs, 850)

  assert.equal(orbit.maxHealth, 38)
  assert.equal(orbit.speed, 82)
  assert.equal(orbit.contactDamage, 19)
  assert.equal(orbit.movementBehavior.kind, 'orbit')
  assert.equal(orbit.movementBehavior.preferredDistance, 86)
  assert.equal(orbit.movementBehavior.distanceTolerance, 28)

  assert.equal(splitter.attackBehavior.kind, 'radial-burst')
  assert.equal(splitter.attackBehavior.projectileCount, 8)
  assert.equal(splitter.attackBehavior.damage, 10)
  assert.equal(sentinel.attackBehavior.kind, 'line-beam')
  assert.equal(sentinel.attackBehavior.width, 34)
  assert.equal(mender.attackBehavior.kind, 'telegraphed-aoe')
  assert.equal(mender.attackBehavior.anchor, 'self')
  assert.equal(voidOrb.attackBehavior.kind, 'line-beam')
  assert.equal(crusher.attackBehavior.kind, 'telegraphed-aoe')
  assert.equal(crusher.attackBehavior.anchor, 'self')
  assert.ok(crusher.maxHealth > prism.maxHealth)
  assert.equal(moth.attackBehavior.kind, 'spread-burst')
  assert.equal(wisp.attackBehavior.kind, 'line-beam')
  assert.equal(toad.attackBehavior.kind, 'radial-burst')
  assert.ok(toad.maxHealth > crusher.maxHealth)

  assert.equal(boss.maxHealth, 720)
  assert.equal(boss.speed, 64)
  assert.equal(boss.contactDamage, 34)
  assert.equal(boss.attackBehavior.kind, 'telegraphed-aoe')
  assert.equal(boss.attackBehavior.damage, 42)
  assert.equal(boss.attackBehavior.cooldownMs, 820)
  assert.equal(boss.attackBehavior.telegraphMs, 450)
  assert.equal(boss.attackBehavior.radius, 145)
  assert.equal(boss.attackBehavior.range, 330)
  assert.equal(boss.attackBehavior.anchor, 'player')
  assert.equal(boss.attackBehavior.targetJitterRadius, 120)
})

test('telegraphed aoe uses configured anchors for readable pressure zones', () => {
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
  const selfAnchoredTelegraph = createEnemyTelegraph(
    { x: 44, y: 55 },
    { x: 90, y: 120 },
    {
      kind: 'telegraphed-aoe',
      cooldownMs: 1000,
      telegraphMs: 500,
      radius: 33,
      damage: 10,
      range: 100,
      anchor: 'self',
      tint: 0xffffff,
    },
  )

  assert.deepEqual(
    sparkTelegraph && { x: sparkTelegraph.x, y: sparkTelegraph.y, radius: sparkTelegraph.radius },
    { x: 90, y: 120, radius: 72 },
  )
  assert.deepEqual(
    bossTelegraph && { x: bossTelegraph.x, y: bossTelegraph.y, radius: bossTelegraph.radius },
    { x: 90, y: 120, radius: 145 },
  )
  assert.deepEqual(
    selfAnchoredTelegraph && {
      x: selfAnchoredTelegraph.x,
      y: selfAnchoredTelegraph.y,
      radius: selfAnchoredTelegraph.radius,
    },
    { x: 44, y: 55, radius: 33 },
  )
})


test('enemy attack target jitter offsets player-targeted attacks deterministically', () => {
  const target = createEnemyAttackTarget({ x: 100, y: 100 }, 80, (() => {
    const rolls = [0, 0.25]
    return () => rolls.shift() ?? 0
  })())

  assert.deepEqual(target, { x: 140, y: 100 })
  assert.deepEqual(createEnemyAttackTarget({ x: 100, y: 100 }, 0, () => 0.5), { x: 100, y: 100 })
})

test('telegraph start and cooldown helpers remain deterministic', () => {
  const attackBehavior = ENEMY_DEFINITIONS['spark-slime'].attackBehavior

  assert.equal(shouldEnemyStartTelegraph(attackBehavior, 150, 0), true)
  assert.equal(shouldEnemyStartTelegraph(attackBehavior, 300, 0), false)
  assert.equal(shouldEnemyStartTelegraph(attackBehavior, 150, 300), false)
  assert.equal(advanceEnemyCooldown(1200, 300), 900)
  assert.equal(advanceEnemyCooldown(1200, 1500), 0)
})

test('spread-burst enemy projectiles fan around the target vector', () => {
  const attackBehavior = ENEMY_DEFINITIONS['needle-wasp'].attackBehavior
  assert.equal(attackBehavior.kind, 'spread-burst')

  const projectiles = createEnemySpreadBurstProjectiles(
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    attackBehavior,
  )

  assert.equal(shouldEnemyStartSpreadBurst(attackBehavior, attackBehavior.range, 0), true)
  assert.equal(shouldEnemyStartSpreadBurst(attackBehavior, attackBehavior.range + 1, 0), false)
  assert.equal(shouldEnemyStartSpreadBurst(attackBehavior, attackBehavior.range, 1), false)
  assert.equal(projectiles.length, attackBehavior.projectileCount)
  assert.equal(projectiles[2]?.direction.x, 1)
  assert.equal(projectiles[2]?.direction.y, 0)
  assert.ok((projectiles[0]?.direction.y ?? 0) < 0)
  assert.ok((projectiles.at(-1)?.direction.y ?? 0) > 0)
  assert.equal(
    Math.round(Math.abs(projectiles[0]?.direction.y ?? 0) * 1000),
    Math.round(Math.abs(projectiles.at(-1)?.direction.y ?? 0) * 1000),
  )
})

test('spread-burst helper avoids unsafe zero-distance directions', () => {
  const attackBehavior = ENEMY_DEFINITIONS['needle-wasp'].attackBehavior

  assert.equal(attackBehavior.kind, 'spread-burst')
  assert.deepEqual(
    createEnemySpreadBurstProjectiles({ x: 4, y: 4 }, { x: 4, y: 4 }, attackBehavior),
    [],
  )
})

test('line-beam helpers keep linear threats deterministic and range-bound', () => {
  const attackBehavior = ENEMY_DEFINITIONS['shard-sentinel'].attackBehavior
  assert.equal(attackBehavior.kind, 'line-beam')

  const beam = createEnemyLineBeam(
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    attackBehavior,
  )

  assert.equal(shouldEnemyStartLineBeam(attackBehavior, attackBehavior.range, 0), true)
  assert.equal(shouldEnemyStartLineBeam(attackBehavior, attackBehavior.range + 1, 0), false)
  assert.equal(shouldEnemyStartLineBeam(attackBehavior, attackBehavior.range, 1), false)
  assert.deepEqual(beam && beam.start, { x: 10, y: 20 })
  assert.equal(beam?.end.y, 20)
  assert.equal(Math.round((beam?.end.x ?? 0) - 10), attackBehavior.range)
  assert.equal(isPointInsideLineBeam({ x: 80, y: 30 }, beam ?? { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, width: 0 }), true)
  assert.equal(isPointInsideLineBeam({ x: 80, y: 80 }, beam ?? { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, width: 0 }), false)
})

test('radial-burst helper emits evenly distributed danger around the caster', () => {
  const attackBehavior = ENEMY_DEFINITIONS['splitter-slime'].attackBehavior
  assert.equal(attackBehavior.kind, 'radial-burst')

  const projectiles = createEnemyRadialBurstProjectiles(attackBehavior)

  assert.equal(shouldEnemyStartRadialBurst(attackBehavior, attackBehavior.range, 0), true)
  assert.equal(shouldEnemyStartRadialBurst(attackBehavior, attackBehavior.range + 1, 0), false)
  assert.equal(shouldEnemyStartRadialBurst(attackBehavior, attackBehavior.range, 1), false)
  assert.equal(projectiles.length, attackBehavior.projectileCount)
  assert.deepEqual(projectiles[0]?.direction, { x: 1, y: 0 })
  assert.deepEqual(projectiles[2] && {
    x: Math.round(projectiles[2].direction.x),
    y: Math.round(projectiles[2].direction.y),
  }, { x: 0, y: 1 })
  assert.deepEqual(projectiles[4] && {
    x: Math.round(projectiles[4].direction.x),
    y: Math.round(projectiles[4].direction.y),
  }, { x: -1, y: 0 })
})

test('circle hit test and codex enemy summary expose the new enemy identities', () => {
  assert.equal(isPointInsideCircle({ x: 108, y: 100 }, { x: 100, y: 100 }, 10), true)
  assert.equal(isPointInsideCircle({ x: 120, y: 100 }, { x: 100, y: 100 }, 10), false)
  assert.match(getEnemyBehaviorSummary(ENEMY_DEFINITIONS['spark-slime']), /충격 범위/)

  const codex = getCodexState(true)
  const sparkSlime = codex.enemies.find((enemy) => enemy.id === 'spark-slime')
  assert.ok(sparkSlime?.stats.some((entry) => /충격 범위/.test(entry)))

  const needleWasp = codex.enemies.find((enemy) => enemy.id === 'needle-wasp')
  assert.ok(needleWasp?.stats.some((entry) => /부채꼴/.test(entry)))
  const shardSentinel = codex.enemies.find((enemy) => enemy.id === 'shard-sentinel')
  assert.ok(shardSentinel?.stats.some((entry) => /직선 광선/.test(entry)))
  const splitterSlime = codex.enemies.find((enemy) => enemy.id === 'splitter-slime')
  assert.ok(splitterSlime?.stats.some((entry) => /전방위/.test(entry)))
  const lanternMoth = codex.enemies.find((enemy) => enemy.id === 'lantern-moth')
  assert.ok(lanternMoth?.stats.some((entry) => /침 비/.test(entry)))
})
