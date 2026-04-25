import test from 'node:test'
import assert from 'node:assert/strict'

import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
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
  getWeaponOutputGeometry,
  getWeaponRangeBand,
  getWeaponSpecialEffectProfile,
  getWeaponSummary,
  isAttackPlanActionable,
  isPointWithinRadius,
  isProjectileOutOfBounds,
  resolveProjectileRangeStep,
  selectChainTargets,
  shouldWeaponFire,
} from '../.tmp-test/src/systems/weaponBehaviors.js'

const attackSignature = (weapon) => ({
  kind: weapon.attackBehavior.kind,
  rangeBand: getWeaponRangeBand(weapon),
  geometry: getWeaponOutputGeometry(weapon),
  special: getWeaponSpecialEffectProfile(weapon),
  contract: getWeaponAttackContract(weapon),
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
        range: 520,
        damage: 9,
        fireRateMs: 290,
        projectileSpeed: 580,
        projectileTextureKey: 'starter-projectile',
        hudIconKey: 'weapon-starter-blaster',
        knockback: { force: 82, durationMs: 100 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 960,
          distanceScaling: { nearMultiplier: 0.72, farMultiplier: 1.65 },
        },
      },
      'acid-sprayer': {
        range: 170,
        damage: 14,
        fireRateMs: 220,
        projectileSpeed: 540,
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
        knockback: { force: 68, durationMs: 92 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 4,
          spreadDegrees: 16,
          projectileLifetimeMs: 250,
          hazardRadius: 20,
          hazardDurationMs: 950,
          hazardTickMs: 190,
          hazardDamage: 6,
          execute: { thresholdRatio: 0.3, damageMultiplier: 1.85 },
        },
      },
      'frost-lance': {
        range: 480,
        damage: 16,
        fireRateMs: 250,
        projectileSpeed: 500,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
        knockback: { force: 58, durationMs: 84 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 1500,
          boomerang: {
            outboundDistance: 235,
            returnSpeedMultiplier: 1.4,
            returnDamageMultiplier: 1.2,
            returnHits: 2,
          },
        },
      },
      'storm-cannon': {
        range: 430,
        damage: 22,
        fireRateMs: 390,
        projectileSpeed: 470,
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
        knockback: { force: 150, durationMs: 150 },
        attackBehavior: {
          kind: 'impact-aoe',
          projectileLifetimeMs: 980,
          explosionRadius: 74,
          explosionDamage: 30,
        },
      },
      'arc-loom': {
        range: 470,
        damage: 18,
        fireRateMs: 235,
        projectileSpeed: 610,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
        knockback: { force: 74, durationMs: 94 },
        attackBehavior: {
          kind: 'chain',
          projectileLifetimeMs: 860,
          maxChains: 3,
          chainRange: 156,
          chainFalloff: 0.72,
        },
      },
      'spark-carbine': {
        range: 500,
        damage: 9,
        fireRateMs: 265,
        projectileSpeed: 760,
        projectileTextureKey: 'spark-projectile',
        hudIconKey: 'weapon-spark-carbine',
        knockback: { force: 60, durationMs: 76 },
        attackBehavior: {
          kind: 'burst-fire',
          shotsPerBurst: 4,
          shotIntervalMs: 44,
          projectileLifetimeMs: 760,
          damageMultiplier: 0.82,
          speedMultiplier: 1.05,
          spreadDegrees: 3,
        },
      },
      'mist-vortex': {
        range: 260,
        damage: 10,
        fireRateMs: 360,
        projectileSpeed: 320,
        projectileTextureKey: 'mist-projectile',
        hudIconKey: 'weapon-mist-vortex',
        knockback: { force: 36, durationMs: 82 },
        attackBehavior: {
          kind: 'zone-control',
          projectileLifetimeMs: 520,
          zoneRadius: 58,
          zoneDurationMs: 2350,
          zoneTickMs: 220,
          zoneDamage: 6,
          speedMultiplier: 0.58,
        },
      },
      'slime-glaive': {
        range: undefined,
        damage: 31,
        fireRateMs: 510,
        projectileSpeed: 0,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-slime-glaive',
        knockback: { force: 132, durationMs: 128 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 94,
          arcDegrees: 116,
          visualDurationMs: 150,
          maxTargets: 4,
        },
      },
      'prism-cutter': {
        range: undefined,
        damage: 24,
        fireRateMs: 230,
        projectileSpeed: 0,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-prism-cutter',
        knockback: { force: 94, durationMs: 88 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 74,
          arcDegrees: 42,
          visualDurationMs: 108,
          maxTargets: 1,
          execute: { thresholdRatio: 0.4, damageMultiplier: 2.1 },
        },
      },
      'needle-fan': {
        range: 250,
        damage: 12,
        fireRateMs: 270,
        projectileSpeed: 610,
        projectileTextureKey: 'needle-projectile',
        hudIconKey: 'weapon-needle-fan',
        knockback: { force: 88, durationMs: 88 },
        attackBehavior: {
          kind: 'split-shot',
          projectileCount: 5,
          spreadDegrees: 14,
          projectileLifetimeMs: 290,
          damageMultiplier: 0.9,
          speedMultiplier: 0.96,
          maxHits: 1,
        },
      },
    },
  )
})

test('weapon attack range helper uses ranged metadata and melee behavior authority', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']

  assert.equal(getWeaponAttackRange(starter), starter.range)
  assert.equal(getWeaponAttackRange(glaive), glaive.attackBehavior.range)
  assert.equal(Object.hasOwn(glaive, 'range'), false)
})

test('starter and frost now use distance scaling and boomerang paths', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const frost = WEAPON_DEFINITIONS['frost-lance']
  const starterPlan = buildAttackPlan(starter, { x: 0, y: 0 }, { x: 100, y: 0 })
  const frostPlan = buildAttackPlan(frost, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(starterPlan.projectiles.length, 1)
  assert.equal(starterPlan.projectiles[0].distanceScaling?.farMultiplier, 1.65)
  assert.equal(frostPlan.projectiles.length, 1)
  assert.equal(frostPlan.projectiles[0].boomerang?.outboundDistance, 235)
  assert.equal(getWeaponOutputGeometry(starter), 'distance-shot')
  assert.equal(getWeaponSpecialEffectProfile(starter), 'distance-ramp')
  assert.equal(getWeaponOutputGeometry(frost), 'return-shot')
  assert.equal(getWeaponSpecialEffectProfile(frost), 'return-pass')
})

test('burst, split, zone, and impact weapons expose distinct plans', () => {
  const spark = WEAPON_DEFINITIONS['spark-carbine']
  const needle = WEAPON_DEFINITIONS['needle-fan']
  const mist = WEAPON_DEFINITIONS['mist-vortex']
  const storm = WEAPON_DEFINITIONS['storm-cannon']

  const sparkPlan = buildAttackPlan(spark, { x: 0, y: 0 }, { x: 100, y: 0 })
  const needlePlan = buildAttackPlan(needle, { x: 0, y: 0 }, { x: 100, y: 0 })
  const mistPlan = buildAttackPlan(mist, { x: 0, y: 0 }, { x: 100, y: 0 })
  const stormPlan = buildAttackPlan(storm, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(spark.attackBehavior.kind, 'burst-fire')
  assert.equal(sparkPlan.projectiles.length, 4)
  assert.equal(sparkPlan.projectiles[1].delayMs, 44)
  assert.equal(getWeaponOutputGeometry(spark), 'burst-rhythm')

  assert.equal(needle.attackBehavior.kind, 'split-shot')
  assert.equal(needlePlan.projectiles.length, 5)
  assert.ok(Math.abs(needlePlan.projectiles[0].direction.y) > 0)

  assert.equal(mist.attackBehavior.kind, 'zone-control')
  assert.equal(mistPlan.projectiles[0].hazardOnHit?.radius, 58)
  assert.equal(getWeaponSpecialEffectProfile(mist), 'hazard-linger')

  assert.equal(storm.attackBehavior.kind, 'impact-aoe')
  assert.equal(stormPlan.projectiles[0].explosionOnHit?.radius, 74)
  assert.equal(stormPlan.projectiles[0].explosionOnHit?.damage, 30)
  assert.equal(getWeaponSpecialEffectProfile(storm), 'impact-splash')
})

test('chain, execute melee, and wide melee remain actionable and identifiable', () => {
  const arc = WEAPON_DEFINITIONS['arc-loom']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const prism = WEAPON_DEFINITIONS['prism-cutter']

  assert.equal(buildAttackPlan(arc, { x: 0, y: 0 }, { x: 0, y: 10 }).projectiles[0].chain.maxChains, 3)
  assert.equal(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.length, 1)
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings[0].execute.damageMultiplier, 2.1)
  assert.equal(getWeaponOutputGeometry(glaive), 'wide-cleave')
  assert.equal(getWeaponOutputGeometry(prism), 'execute-sweep')
  assert.equal(getWeaponSpecialEffectProfile(arc), 'chain-bounce')
  assert.equal(getWeaponSpecialEffectProfile(prism), 'execute-finisher')
  assert.equal(isAttackPlanActionable(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 })), true)
})

test('crafted roster identity signatures are unique across all weapons', () => {
  const signatures = Object.values(WEAPON_DEFINITIONS).map((weapon) => `${weapon.id}:${JSON.stringify(attackSignature(weapon))}`)
  assert.equal(signatures.length, 10)
  assert.equal(new Set(signatures.map((entry) => entry.slice(entry.indexOf(':') + 1))).size, 10)
})

test('weapon identity labels prefer metadata and summaries expose role text', () => {
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['arc-loom']), '감염 전파')
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['starter-blaster']), /멀수록 증폭/)
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['spark-carbine']), /4박자/)
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['prism-cutter']), /빈사 수확/)

  const fallbackFrost = {
    ...WEAPON_DEFINITIONS['frost-lance'],
    identityLabel: undefined,
  }

  assert.equal(getWeaponIdentityLabel(fallbackFrost), '귀환 사격')
})

test('chain selection and chain damage prioritize nearby enemies deterministically', () => {
  assert.deepEqual(
    selectChainTargets(
      { x: 0, y: 0 },
      [
        { id: 3, x: 60, y: 0 },
        { id: 2, x: 20, y: 0 },
        { id: 1, x: 20, y: 10 },
      ],
      80,
      2,
    ),
    [2, 1],
  )
  assert.equal(getChainDamage(24, 1, 0.66), 16)
  assert.equal(getChainDamage(24, 2, 0.66), 10)
})

test('radius and cleave helpers collect expected targets', () => {
  assert.deepEqual(
    collectTargetsInRadius(
      { x: 0, y: 0 },
      20,
      [
        { id: 1, x: 10, y: 0, radius: 4 },
        { id: 2, x: 30, y: 0, radius: 4 },
      ],
    ),
    [1],
  )

  assert.deepEqual(
    collectTargetsInCleave(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      80,
      70,
      [
        { id: 1, x: 40, y: 0, radius: 8 },
        { id: 2, x: 40, y: 30, radius: 8 },
        { id: 3, x: -20, y: 0, radius: 8 },
      ],
      2,
    ),
    [1],
  )
})

test('projectile hit state, range stepping, bounds, and timers stay deterministic', () => {
  const hit = applyProjectileHitState(new Set(), 4, 2)
  assert.equal(canProjectileHitEnemy(hit.hitEnemyIds, 4), false)
  assert.equal(hit.remainingHits, 1)

  const rangeStep = resolveProjectileRangeStep({ x: 0, y: 0 }, { x: 12, y: 16 }, 10)
  assert.deepEqual(rangeStep.point, { x: 6, y: 8 })
  assert.equal(rangeStep.expired, true)

  assert.equal(isPointWithinRadius({ x: 0, y: 0 }, { x: 3, y: 4 }, 5), true)
  assert.equal(isProjectileOutOfBounds({ x: 101, y: 40 }, { x: 0, y: 0, width: 100, height: 100 }), true)
  assert.equal(shouldWeaponFire(false, true, 120, 100), true)
  assert.deepEqual(advanceRepeatingTimer(20, 50, 30), { ticks: 2, remainingMs: 30 })
  assert.deepEqual(advanceHazardState(100, 30, 40, 30), {
    ticks: 1,
    tickCountdownMs: 20,
    remainingLifetimeMs: 60,
    expired: false,
  })
})
