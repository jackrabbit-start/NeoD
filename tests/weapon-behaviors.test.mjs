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

test('acid sprayer fires a three-shot spray that leaves lingering hazards', () => {
  const plan = buildAttackPlan(WEAPON_DEFINITIONS['acid-sprayer'], { x: 0, y: 0 }, { x: 10, y: 0 })

  assert.equal(plan.projectiles.length, 3)
  assert.equal(plan.cooldownMs, WEAPON_DEFINITIONS['acid-sprayer'].fireRateMs)

  const [left, center, right] = plan.projectiles
  assert.equal(center?.hazardOnHit?.damage, 6)
  assert.equal(center?.hazardOnExpire?.durationMs, 950)
  assert.equal(center?.lifetimeMs, 250)
  assert.equal(center?.maxTravelDistance, getWeaponAttackRange(WEAPON_DEFINITIONS['acid-sprayer']))
  assert.ok((left?.direction.y ?? 0) < 0)
  assert.ok(Math.abs(center?.direction.y ?? 0) < 1e-9)
  assert.ok((right?.direction.y ?? 0) > 0)
})

test('weapon attack range helper uses ranged metadata and melee behavior authority', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']

  assert.equal(getWeaponAttackRange(starter), starter.range)
  assert.equal(getWeaponAttackRange(glaive), glaive.attackBehavior.range)
  assert.equal(Object.hasOwn(glaive, 'range'), false)
})

test('weapon refresh preserves protected gameplay fields and stable asset keys', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(WEAPON_DEFINITIONS).map(([weaponId, weapon]) => [
        weaponId,
        {
          range: Object.hasOwn(weapon, 'range') ? weapon.range : undefined,
          damage: weapon.damage,
          fireRateMs: weapon.fireRateMs,
          projectileSpeed: weapon.projectileSpeed,
          projectileTextureKey: weapon.projectileTextureKey,
          hudIconKey: weapon.visual.hudIconKey,
          knockback: weapon.knockback,
          attackBehavior: weapon.attackBehavior,
        },
      ]),
    ),
    {
      'starter-blaster': {
        range: 420,
        damage: 10,
        fireRateMs: 320,
        projectileSpeed: 460,
        projectileTextureKey: 'starter-projectile',
        hudIconKey: 'weapon-starter-blaster',
        knockback: { force: 90, durationMs: 110 },
        attackBehavior: { kind: 'single', projectileLifetimeMs: 1000 },
      },
      'acid-sprayer': {
        range: 130,
        damage: 20,
        fireRateMs: 230,
        projectileSpeed: 500,
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
        knockback: { force: 70, durationMs: 95 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 3,
          spreadDegrees: 28,
          projectileLifetimeMs: 250,
          hazardRadius: 24,
          hazardDurationMs: 950,
          hazardTickMs: 220,
          hazardDamage: 6,
        },
      },
      'frost-lance': {
        range: 520,
        damage: 18,
        fireRateMs: 190,
        projectileSpeed: 620,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
        knockback: { force: 55, durationMs: 80 },
        attackBehavior: { kind: 'pierce', projectileLifetimeMs: 900, maxHits: 3 },
      },
      'storm-cannon': {
        range: 500,
        damage: 28,
        fireRateMs: 210,
        projectileSpeed: 560,
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
        knockback: { force: 125, durationMs: 130 },
        attackBehavior: { kind: 'single', projectileLifetimeMs: 1050 },
      },
      'arc-loom': {
        range: 500,
        damage: 24,
        fireRateMs: 175,
        projectileSpeed: 590,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
        knockback: { force: 85, durationMs: 100 },
        attackBehavior: {
          kind: 'chain',
          projectileLifetimeMs: 900,
          maxChains: 2,
          chainRange: 130,
          chainFalloff: 0.65,
        },
      },
      'spark-carbine': {
        range: 560,
        damage: 15,
        fireRateMs: 145,
        projectileSpeed: 720,
        projectileTextureKey: 'spark-projectile',
        hudIconKey: 'weapon-spark-carbine',
        knockback: { force: 60, durationMs: 75 },
        attackBehavior: { kind: 'single', projectileLifetimeMs: 820 },
      },
      'mist-vortex': {
        range: 190,
        damage: 14,
        fireRateMs: 260,
        projectileSpeed: 430,
        projectileTextureKey: 'mist-projectile',
        hudIconKey: 'weapon-mist-vortex',
        knockback: { force: 45, durationMs: 90 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 5,
          spreadDegrees: 18,
          projectileLifetimeMs: 360,
          hazardRadius: 36,
          hazardDurationMs: 1450,
          hazardTickMs: 300,
          hazardDamage: 4,
        },
      },
      'slime-glaive': {
        range: undefined,
        damage: 30,
        fireRateMs: 520,
        projectileSpeed: 0,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-slime-glaive',
        knockback: { force: 115, durationMs: 120 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 94,
          arcDegrees: 105,
          visualDurationMs: 150,
          maxTargets: 4,
        },
      },
      'prism-cutter': {
        range: undefined,
        damage: 22,
        fireRateMs: 330,
        projectileSpeed: 0,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-prism-cutter',
        knockback: { force: 80, durationMs: 85 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 72,
          arcDegrees: 62,
          visualDurationMs: 105,
          maxTargets: 2,
        },
      },
      'needle-fan': {
        range: 210,
        damage: 16,
        fireRateMs: 210,
        projectileSpeed: 610,
        projectileTextureKey: 'needle-projectile',
        hudIconKey: 'weapon-needle-fan',
        knockback: { force: 65, durationMs: 80 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 4,
          spreadDegrees: 16,
          projectileLifetimeMs: 320,
          hazardRadius: 20,
          hazardDurationMs: 700,
          hazardTickMs: 240,
          hazardDamage: 3,
        },
      },
    },
  )
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

test('spark carbine is a fast single-shot electric branch', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const storm = WEAPON_DEFINITIONS['storm-cannon']
  const spark = WEAPON_DEFINITIONS['spark-carbine']
  const plan = buildAttackPlan(spark, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(spark.attackBehavior.kind, 'single')
  assert.equal(getWeaponIdentityLabel(spark), '오버드라이브 속사')
  assert.ok(spark.fireRateMs < starter.fireRateMs)
  assert.ok(spark.fireRateMs < storm.fireRateMs)
  assert.ok(spark.projectileSpeed > starter.projectileSpeed)
  assert.ok(spark.projectileSpeed > storm.projectileSpeed)
  assert.ok(spark.damage < storm.damage)
  assert.equal(plan.cooldownMs, spark.fireRateMs)
  assert.equal(plan.projectiles.length, 1)
  assert.equal(plan.projectiles[0]?.speed, spark.projectileSpeed)
  assert.equal(plan.projectiles[0]?.lifetimeMs, 820)
  assert.equal(plan.projectiles[0]?.maxTravelDistance, getWeaponAttackRange(spark))
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

  assert.equal(getWeaponIdentityLabel(mist), '멘탈 안개')
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

test('melee weapon plans create actionable frontal cleave swings without projectiles', () => {
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const cutter = WEAPON_DEFINITIONS['prism-cutter']
  const plan = buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(glaive.attackBehavior.kind, 'melee-cleave')
  assert.equal(cutter.attackBehavior.kind, 'melee-cleave')
  assert.equal(plan.projectiles.length, 0)
  assert.equal(plan.meleeSwings.length, 1)
  assert.equal(isAttackPlanActionable(plan), true)
  assert.equal(plan.cooldownMs, glaive.fireRateMs)
  assert.equal(plan.meleeSwings[0]?.range, glaive.attackBehavior.range)
  assert.equal(plan.meleeSwings[0]?.arcDegrees, glaive.attackBehavior.arcDegrees)
  assert.deepEqual(plan.meleeSwings[0]?.direction, { x: 1, y: 0 })

  assert.notEqual(glaive.attackBehavior.range, cutter.attackBehavior.range)
  assert.notEqual(glaive.attackBehavior.arcDegrees, cutter.attackBehavior.arcDegrees)
  assert.notEqual(glaive.fireRateMs, cutter.fireRateMs)
  assert.match(getWeaponSummary(glaive), /범위/)
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

test('needle fan reuses spray-hazard behavior for a bounded reward branch', () => {
  const needleFan = WEAPON_DEFINITIONS['needle-fan']
  const plan = buildAttackPlan(needleFan, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(needleFan.attackBehavior.kind, 'spray-hazard')
  assert.equal(getWeaponIdentityLabel(needleFan), '간바레 산탄')
  assert.equal(plan.projectiles.length, 4)
  assert.equal(plan.cooldownMs, needleFan.fireRateMs)
  assert.equal(plan.projectiles[0]?.maxTravelDistance, getWeaponAttackRange(needleFan))
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
