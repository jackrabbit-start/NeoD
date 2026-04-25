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
  collectTargetsInCleave,
  collectTargetsInRadius,
  getChainDamage,
  getWeaponAttackContract,
  getWeaponAttackRange,
  getWeaponIdentityLabel,
  getWeaponSummary,
  isAttackPlanActionable,
  isPointWithinRadius,
  isProjectileOutOfBounds,
  resolveProjectileRangeStep,
  shouldWeaponFire,
  selectChainTargets,
} from '../.tmp-test/src/systems/weaponBehaviors.js'

const toContractKey = (weapon) => {
  const contract = getWeaponAttackContract(weapon)
  return `${contract.family}|${contract.geometry}|${contract.cadence}|${contract.followUp}`
}

test('acid sprayer fires a close splatter spray that leaves lingering hazards', () => {
  const plan = buildAttackPlan(WEAPON_DEFINITIONS['acid-sprayer'], { x: 0, y: 0 }, { x: 10, y: 0 })

  assert.equal(plan.projectiles.length, 4)
  assert.equal(plan.cooldownMs, WEAPON_DEFINITIONS['acid-sprayer'].fireRateMs)

  const [left, center, right] = plan.projectiles
  assert.equal(center?.hazardOnHit?.damage, 7)
  assert.equal(center?.hazardOnExpire?.durationMs, 900)
  assert.equal(center?.lifetimeMs, 210)
  assert.equal(center?.maxTravelDistance, getWeaponAttackRange(WEAPON_DEFINITIONS['acid-sprayer']))
  assert.ok((left?.direction.y ?? 0) < 0)
  assert.ok(Math.abs(plan.projectiles[1]?.direction.y ?? 0) < 0.2)
  assert.ok((right?.direction.y ?? 0) >= 0)
})

test('weapon attack range helper uses ranged metadata and melee behavior authority', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const vortex = WEAPON_DEFINITIONS['mist-vortex']

  assert.equal(getWeaponAttackRange(starter), starter.range)
  assert.equal(getWeaponAttackRange(glaive), glaive.attackBehavior.range)
  assert.equal(getWeaponAttackRange(vortex), vortex.range)
  assert.equal(Object.hasOwn(glaive, 'range'), false)
})

test('weapon table preserves registered ids plus stable asset and knockback surfaces', () => {
  assert.deepEqual(
    Object.keys(WEAPON_DEFINITIONS).sort(),
    [
      'acid-sprayer',
      'arc-loom',
      'frost-lance',
      'mist-vortex',
      'needle-fan',
      'prism-cutter',
      'slime-glaive',
      'spark-carbine',
      'starter-blaster',
      'storm-cannon',
    ],
  )

  for (const weapon of Object.values(WEAPON_DEFINITIONS)) {
    assert.ok(weapon.projectileTextureKey.trim())
    assert.ok(weapon.visual.hudIconKey.trim())
    assert.ok(weapon.knockback.force > 0)
    assert.ok(weapon.knockback.durationMs > 0)
    assert.ok(weapon.identityLabel?.trim())
  }
})

test('weapon attack contract tuples are unique and break former overlap clusters', () => {
  const contracts = Object.fromEntries(
    Object.entries(WEAPON_DEFINITIONS).map(([weaponId, weapon]) => [weaponId, getWeaponAttackContract(weapon)]),
  )
  const tupleKeys = Object.values(WEAPON_DEFINITIONS).map(toContractKey)

  assert.equal(new Set(tupleKeys).size, tupleKeys.length)
  assert.notDeepEqual(contracts['starter-blaster'], contracts['storm-cannon'])
  assert.notDeepEqual(contracts['starter-blaster'], contracts['spark-carbine'])
  assert.notDeepEqual(contracts['storm-cannon'], contracts['spark-carbine'])
  assert.notDeepEqual(contracts['acid-sprayer'], contracts['mist-vortex'])
  assert.notDeepEqual(contracts['acid-sprayer'], contracts['needle-fan'])
  assert.notDeepEqual(contracts['mist-vortex'], contracts['needle-fan'])
  assert.notDeepEqual(contracts['slime-glaive'], contracts['prism-cutter'])
})

test('frost lance plan preserves a piercing projectile', () => {
  const plan = buildAttackPlan(WEAPON_DEFINITIONS['frost-lance'], { x: 0, y: 0 }, { x: 0, y: 10 })

  assert.equal(plan.projectiles.length, 1)
  assert.equal(plan.projectiles[0]?.maxHits, 3)
  assert.deepEqual(plan.projectiles[0]?.knockback, WEAPON_DEFINITIONS['frost-lance'].knockback)
  assert.equal(plan.projectiles[0]?.hazardOnHit, undefined)
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['frost-lance']), '기대컨 관통')
})

test('weapon identity labels prefer metadata and retain behavior fallback', () => {
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['arc-loom']), '감다살 연쇄')

  const fallbackFrost = {
    ...WEAPON_DEFINITIONS['frost-lance'],
    identityLabel: undefined,
  }

  assert.equal(getWeaponIdentityLabel(fallbackFrost), '관통 사격')
})

test('arc loom summary and chain damage expose crowd-control identity', () => {
  const weapon = WEAPON_DEFINITIONS['arc-loom']
  const summary = getWeaponSummary(weapon)

  assert.match(summary, /감다살 연쇄/)
  assert.equal(getChainDamage(24, 1, 0.65), 16)
  assert.equal(getChainDamage(24, 2, 0.65), 10)
})

test('starter blaster becomes a compact split-shot branch', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const plan = buildAttackPlan(starter, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(starter.attackBehavior.kind, 'split-shot')
  assert.equal(plan.projectiles.length, 2)
  assert.equal(plan.projectiles[0]?.damage, 7)
  assert.equal(plan.projectiles[0]?.delayMs ?? 0, 0)
  assert.equal(plan.projectiles[1]?.delayMs ?? 0, 0)
  assert.match(getWeaponSummary(starter), /갈래당 7/)
  assert.match(getWeaponSummary(starter), /2갈래/)
})

test('spark carbine becomes a burst-fire electric branch', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const storm = WEAPON_DEFINITIONS['storm-cannon']
  const spark = WEAPON_DEFINITIONS['spark-carbine']
  const plan = buildAttackPlan(spark, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(spark.attackBehavior.kind, 'burst-fire')
  assert.equal(getWeaponIdentityLabel(spark), '오버드라이브 속사')
  assert.ok(spark.fireRateMs < starter.fireRateMs)
  assert.ok(spark.fireRateMs < storm.fireRateMs)
  assert.ok(spark.projectileSpeed > starter.projectileSpeed)
  assert.ok(spark.projectileSpeed > storm.projectileSpeed)
  assert.ok(spark.damage < storm.damage)
  assert.equal(plan.cooldownMs, spark.fireRateMs)
  assert.equal(plan.projectiles.length, 3)
  assert.equal(plan.projectiles[0]?.damage, 11)
  assert.deepEqual(plan.projectiles.map((projectile) => projectile.delayMs ?? 0), [0, 55, 110])
  assert.equal(plan.projectiles[0]?.lifetimeMs, 720)
  assert.match(getWeaponSummary(spark), /탄당 11/)
  assert.match(getWeaponSummary(spark), /3점사/)
})

test('storm cannon impact shell carries explosion follow-up', () => {
  const storm = WEAPON_DEFINITIONS['storm-cannon']
  const plan = buildAttackPlan(storm, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(storm.attackBehavior.kind, 'impact-aoe')
  assert.equal(plan.projectiles.length, 1)
  assert.equal(plan.projectiles[0]?.explosionOnHit?.radius, 42)
  assert.equal(plan.projectiles[0]?.explosionOnExpire?.damage, 18)
  assert.match(getWeaponSummary(storm), /직격 28/)
  assert.match(getWeaponSummary(storm), /폭발 18/)
  assert.match(getWeaponSummary(storm), /반경 42/)
})

test('mist vortex becomes a distinct zone-control branch', () => {
  const acid = WEAPON_DEFINITIONS['acid-sprayer']
  const mist = WEAPON_DEFINITIONS['mist-vortex']

  assert.equal(acid.attackBehavior.kind, 'spray-hazard')
  assert.equal(mist.attackBehavior.kind, 'zone-control')

  const mistBehavior = mist.attackBehavior
  const plan = buildAttackPlan(mist, { x: 0, y: 0 }, { x: 100, y: 0 })
  const orb = plan.projectiles[0]

  assert.equal(getWeaponIdentityLabel(mist), '멘탈 안개')
  assert.ok(mistBehavior.zoneRadius > acid.attackBehavior.hazardRadius)
  assert.ok(mistBehavior.zoneDurationMs > acid.attackBehavior.hazardDurationMs)
  assert.equal(plan.projectiles.length, 1)
  assert.equal(orb?.hazardOnHit?.radius, mistBehavior.zoneRadius)
  assert.equal(orb?.hazardOnHit?.durationMs, mistBehavior.zoneDurationMs)
  assert.equal(orb?.hazardOnHit?.tickEveryMs, mistBehavior.zoneTickMs)
  assert.equal(orb?.hazardOnHit?.damage, mistBehavior.zoneDamage)
  assert.match(getWeaponSummary(mist), /틱 5/)
  assert.match(getWeaponSummary(mist), /지대 44/)
})

test('slime glaive keeps a wide peel cleave while prism cutter becomes delayed paired cuts', () => {
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const cutter = WEAPON_DEFINITIONS['prism-cutter']
  const plan = buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 })
  const cutterPlan = buildAttackPlan(cutter, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(glaive.attackBehavior.kind, 'melee-cleave')
  assert.equal(cutter.attackBehavior.kind, 'split-shot')
  assert.equal(plan.projectiles.length, 0)
  assert.equal(plan.meleeSwings.length, 1)
  assert.equal(cutterPlan.projectiles.length, 2)
  assert.deepEqual(cutterPlan.projectiles.map((projectile) => projectile.delayMs ?? 0), [0, 90])
  assert.equal(isAttackPlanActionable(plan), true)
  assert.equal(plan.cooldownMs, glaive.fireRateMs)
  assert.equal(plan.meleeSwings[0]?.range, glaive.attackBehavior.range)
  assert.equal(plan.meleeSwings[0]?.arcDegrees, glaive.attackBehavior.arcDegrees)
  assert.deepEqual(plan.meleeSwings[0]?.direction, { x: 1, y: 0 })

  assert.equal(cutterPlan.projectiles[0]?.speed, Math.round(cutter.projectileSpeed * 0.84))
  assert.notEqual(glaive.fireRateMs, cutter.fireRateMs)
  assert.match(getWeaponSummary(glaive), /범위/)
  assert.match(getWeaponSummary(cutter), /2갈래/)
})

test('projectile range step clamps at the max travel boundary', () => {
  assert.deepEqual(
    resolveProjectileRangeStep({ x: 0, y: 0 }, { x: 30, y: 40 }, 60),
    {
      point: { x: 30, y: 40 },
      distanceFromOrigin: 50,
      expired: false,
    },
  )

  assert.deepEqual(
    resolveProjectileRangeStep({ x: 0, y: 0 }, { x: 80, y: 0 }, 50),
    {
      point: { x: 50, y: 0 },
      distanceFromOrigin: 50,
      expired: true,
    },
  )
})

test('range-clamped projectile collision cannot reach beyond max base range', () => {
  const rangeStep = resolveProjectileRangeStep({ x: 0, y: 0 }, { x: 140, y: 0 }, 100)

  assert.equal(rangeStep.expired, true)
  assert.deepEqual(rangeStep.point, { x: 100, y: 0 })
  assert.equal(isPointWithinRadius(rangeStep.point, { x: 108, y: 0 }, 10), true)
  assert.equal(isPointWithinRadius(rangeStep.point, { x: 112, y: 0 }, 10), false)
})

test('expire hazards use the clamped in-range projectile point', () => {
  const overshoot = { x: 160, y: 0 }
  const rangeStep = resolveProjectileRangeStep({ x: 0, y: 0 }, overshoot, 100)
  const expireHazardSpawnPoint = rangeStep.point

  assert.equal(rangeStep.expired, true)
  assert.deepEqual(expireHazardSpawnPoint, { x: 100, y: 0 })
  assert.notDeepEqual(expireHazardSpawnPoint, overshoot)
})

test('frontal cleave target selection respects range, arc, radius, and deterministic order', () => {
  const selected = collectTargetsInCleave(
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    80,
    90,
    [
      { id: 8, x: 70, y: 0, radius: 10 },
      { id: 2, x: 30, y: 20, radius: 8 },
      { id: 4, x: -20, y: 0, radius: 8 },
      { id: 6, x: 70, y: 70, radius: 8 },
      { id: 3, x: 87, y: 0, radius: 10 },
    ],
    3,
  )

  assert.deepEqual(selected, [2, 8, 3])
  assert.deepEqual(
    collectTargetsInCleave({ x: 0, y: 0 }, { x: 0, y: 0 }, 80, 90, [{ id: 1, x: 10, y: 0, radius: 5 }]),
    [],
  )
})

test('needle fan becomes a cone split-shot volley without lingering puddles', () => {
  const needleFan = WEAPON_DEFINITIONS['needle-fan']
  const plan = buildAttackPlan(needleFan, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(needleFan.attackBehavior.kind, 'split-shot')
  assert.equal(getWeaponIdentityLabel(needleFan), '간바레 산탄')
  assert.equal(plan.projectiles.length, 5)
  assert.equal(plan.cooldownMs, needleFan.fireRateMs)
  assert.equal(plan.projectiles[0]?.maxTravelDistance, getWeaponAttackRange(needleFan))
  assert.ok((plan.projectiles[0]?.direction.y ?? 0) < 0)
  assert.ok((plan.projectiles.at(-1)?.direction.y ?? 0) > 0)
  assert.equal(plan.projectiles[0]?.hazardOnHit, undefined)
  assert.match(getWeaponSummary(needleFan), /5갈래/)
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
  assert.equal(isProjectileOutOfBounds({ x: 24, y: 24 }, { x: 24, y: 24, width: 200, height: 120 }), false)
  assert.equal(isProjectileOutOfBounds({ x: 23, y: 24 }, { x: 24, y: 24, width: 200, height: 120 }), true)
  assert.equal(isProjectileOutOfBounds({ x: 225, y: 24 }, { x: 24, y: 24, width: 200, height: 120 }), true)
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

test('codex summaries describe token rewards instead of hidden recipe output cards', () => {
  const codex = getCodexState(true)
  const sparkSlime = codex.enemies.find((enemy) => enemy.id === 'spark-slime')

  assert.equal(codex.recipes.length, 0)
  assert.match(codex.hint, /토큰 파친코/)
  assert.ok(sparkSlime?.stats.some((stat) => /보상 경험치 \+2/.test(stat)))
})
