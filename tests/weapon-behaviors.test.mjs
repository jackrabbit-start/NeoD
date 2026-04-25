import test from 'node:test'
import assert from 'node:assert/strict'

import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import { getCodexState } from '../.tmp-test/src/systems/codex.js'
import {
  advanceHazardState,
  advanceRepeatingTimer,
  applyProjectileHitState,
  buildAttackPlan,
  canProjectileHitEnemy,
  collectTargetsInRadius,
  getChainDamage,
  getWeaponIdentityLabel,
  getWeaponSummary,
  isProjectileOutOfBounds,
  shouldWeaponFire,
  selectChainTargets,
} from '../.tmp-test/src/systems/weaponBehaviors.js'

test('acid sprayer fires a three-shot spray that leaves lingering hazards', () => {
  const plan = buildAttackPlan(WEAPON_DEFINITIONS['acid-sprayer'], { x: 0, y: 0 }, { x: 10, y: 0 })

  assert.equal(plan.projectiles.length, 3)
  assert.equal(plan.cooldownMs, WEAPON_DEFINITIONS['acid-sprayer'].fireRateMs)

  const [left, center, right] = plan.projectiles
  assert.equal(center?.hazardOnHit?.damage, 6)
  assert.equal(center?.hazardOnExpire?.durationMs, 950)
  assert.equal(center?.lifetimeMs, 250)
  assert.ok((left?.direction.y ?? 0) < 0)
  assert.ok(Math.abs(center?.direction.y ?? 0) < 1e-9)
  assert.ok((right?.direction.y ?? 0) > 0)
})

test('frost lance plan preserves a piercing projectile', () => {
  const plan = buildAttackPlan(WEAPON_DEFINITIONS['frost-lance'], { x: 0, y: 0 }, { x: 0, y: 10 })

  assert.equal(plan.projectiles.length, 1)
  assert.equal(plan.projectiles[0]?.maxHits, 3)
  assert.deepEqual(plan.projectiles[0]?.knockback, WEAPON_DEFINITIONS['frost-lance'].knockback)
  assert.equal(plan.projectiles[0]?.hazardOnHit, undefined)
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['frost-lance']), '정밀 관통')
})

test('weapon identity labels prefer metadata and retain behavior fallback', () => {
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['arc-loom']), '연쇄 제압')

  const fallbackFrost = {
    ...WEAPON_DEFINITIONS['frost-lance'],
    identityLabel: undefined,
  }

  assert.equal(getWeaponIdentityLabel(fallbackFrost), '관통 사격')
})

test('arc loom summary and chain damage expose crowd-control identity', () => {
  const weapon = WEAPON_DEFINITIONS['arc-loom']
  const summary = getWeaponSummary(weapon)

  assert.match(summary, /연쇄 제압/)
  assert.equal(getChainDamage(24, 1, 0.65), 16)
  assert.equal(getChainDamage(24, 2, 0.65), 10)
})

test('spark carbine is a fast single-shot electric branch', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const storm = WEAPON_DEFINITIONS['storm-cannon']
  const spark = WEAPON_DEFINITIONS['spark-carbine']
  const plan = buildAttackPlan(spark, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(spark.attackBehavior.kind, 'single')
  assert.equal(getWeaponIdentityLabel(spark), '고속 전격')
  assert.ok(spark.fireRateMs < starter.fireRateMs)
  assert.ok(spark.fireRateMs < storm.fireRateMs)
  assert.ok(spark.projectileSpeed > starter.projectileSpeed)
  assert.ok(spark.projectileSpeed > storm.projectileSpeed)
  assert.ok(spark.damage < storm.damage)
  assert.equal(plan.cooldownMs, spark.fireRateMs)
  assert.equal(plan.projectiles.length, 1)
  assert.equal(plan.projectiles[0]?.speed, spark.projectileSpeed)
  assert.equal(plan.projectiles[0]?.lifetimeMs, 820)
})

test('mist vortex is a distinct spray hazard control branch', () => {
  const acid = WEAPON_DEFINITIONS['acid-sprayer']
  const mist = WEAPON_DEFINITIONS['mist-vortex']

  assert.equal(acid.attackBehavior.kind, 'spray-hazard')
  assert.equal(mist.attackBehavior.kind, 'spray-hazard')

  const acidBehavior = acid.attackBehavior
  const mistBehavior = mist.attackBehavior
  const differingDimensions = [
    mistBehavior.projectileCount !== acidBehavior.projectileCount,
    mistBehavior.spreadDegrees !== acidBehavior.spreadDegrees,
    mistBehavior.projectileLifetimeMs !== acidBehavior.projectileLifetimeMs,
    mistBehavior.hazardRadius !== acidBehavior.hazardRadius,
    mistBehavior.hazardDurationMs !== acidBehavior.hazardDurationMs,
    mistBehavior.hazardTickMs !== acidBehavior.hazardTickMs,
    mistBehavior.hazardDamage !== acidBehavior.hazardDamage,
    mist.damage !== acid.damage,
  ].filter(Boolean).length
  const plan = buildAttackPlan(mist, { x: 0, y: 0 }, { x: 100, y: 0 })
  const center = plan.projectiles[Math.floor(plan.projectiles.length / 2)]

  assert.equal(getWeaponIdentityLabel(mist), '안개 제어')
  assert.ok(differingDimensions >= 2)
  assert.ok(mistBehavior.hazardRadius > acidBehavior.hazardRadius)
  assert.ok(mistBehavior.hazardDurationMs > acidBehavior.hazardDurationMs)
  assert.ok(mistBehavior.hazardDamage < acidBehavior.hazardDamage)
  assert.equal(plan.projectiles.length, 5)
  assert.equal(center?.hazardOnHit?.radius, mistBehavior.hazardRadius)
  assert.equal(center?.hazardOnHit?.durationMs, mistBehavior.hazardDurationMs)
  assert.equal(center?.hazardOnHit?.tickEveryMs, mistBehavior.hazardTickMs)
  assert.equal(center?.hazardOnHit?.damage, mistBehavior.hazardDamage)
})

test('needle fan reuses spray-hazard behavior for a bounded reward branch', () => {
  const needleFan = WEAPON_DEFINITIONS['needle-fan']
  const plan = buildAttackPlan(needleFan, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(needleFan.attackBehavior.kind, 'spray-hazard')
  assert.equal(getWeaponIdentityLabel(needleFan), '산탄 견제')
  assert.equal(plan.projectiles.length, 4)
  assert.equal(plan.cooldownMs, needleFan.fireRateMs)
  assert.ok((plan.projectiles[0]?.direction.y ?? 0) < 0)
  assert.ok((plan.projectiles.at(-1)?.direction.y ?? 0) > 0)
  assert.equal(plan.projectiles[0]?.hazardOnHit?.radius, 20)
  assert.equal(plan.projectiles[0]?.hazardOnHit?.damage, 3)
})

test('chain target selection is deterministic by distance then runtime id', () => {
  const selected = selectChainTargets(
    { x: 0, y: 0 },
    [
      { id: 7, x: 60, y: 0 },
      { id: 3, x: 30, y: 0 },
      { id: 2, x: 30, y: 0 },
      { id: 9, x: 200, y: 0 },
    ],
    100,
    3,
  )

  assert.deepEqual(selected, [2, 3, 7])
})

test('repeating timer advances ticks without frame-rate coupling', () => {
  assert.deepEqual(advanceRepeatingTimer(100, 40, 100), {
    ticks: 0,
    remainingMs: 60,
  })

  assert.deepEqual(advanceRepeatingTimer(100, 250, 100), {
    ticks: 2,
    remainingMs: 50,
  })
})

test('hazard state preserves the last valid tick before expiry on a long frame', () => {
  assert.deepEqual(advanceHazardState(100, 50, 120, 50), {
    ticks: 2,
    tickCountdownMs: 50,
    remainingLifetimeMs: 0,
    expired: true,
  })
})

test('projectiles track same-enemy dedupe and arena bounds as pure combat rules', () => {
  const hitEnemyIds = new Set([3])

  assert.equal(canProjectileHitEnemy(hitEnemyIds, 3), false)
  assert.equal(canProjectileHitEnemy(hitEnemyIds, 4), true)
  assert.equal(isProjectileOutOfBounds({ x: -1, y: 30 }, 100, 100), true)
  assert.equal(isProjectileOutOfBounds({ x: 40, y: 40 }, 100, 100), false)
})

test('piercing projectile hit state survives early hits and stops on the last one', () => {
  const firstHit = applyProjectileHitState(new Set(), 11, 3)
  assert.equal(firstHit.applied, true)
  assert.equal(firstHit.remainingHits, 2)
  assert.equal(firstHit.destroyed, false)

  const duplicateHit = applyProjectileHitState(firstHit.hitEnemyIds, 11, firstHit.remainingHits)
  assert.equal(duplicateHit.applied, false)
  assert.equal(duplicateHit.remainingHits, 2)

  const finalHit = applyProjectileHitState(new Set([11, 12]), 13, 1)
  assert.equal(finalHit.applied, true)
  assert.equal(finalHit.remainingHits, 0)
  assert.equal(finalHit.destroyed, true)
})

test('hazard radius selection only keeps enemies inside the zone', () => {
  const victims = collectTargetsInRadius(
    { x: 100, y: 100 },
    30,
    [
      { id: 1, x: 115, y: 100, radius: 12 },
      { id: 2, x: 138, y: 100, radius: 10 },
      { id: 3, x: 170, y: 100, radius: 8 },
    ],
  )

  assert.deepEqual(victims, [1, 2])
})

test('pause and cooldown gating block firing before scene spawn dispatch', () => {
  assert.equal(shouldWeaponFire(true, true, 100, 0), false)
  assert.equal(shouldWeaponFire(false, false, 100, 0), false)
  assert.equal(shouldWeaponFire(false, true, 90, 100), false)
  assert.equal(shouldWeaponFire(false, true, 100, 100), true)
})

test('codex summaries include weapon identity beyond raw stats', () => {
  const codex = getCodexState(true)
  const arcRecipe = codex.recipes.find((recipe) => recipe.output.id === 'arc-loom')

  assert.match(arcRecipe?.output.summary ?? '', /연쇄 제압/)
})
