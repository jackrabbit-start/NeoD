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
        range: 340,
        damage: 6,
        fireRateMs: 420,
        projectileSpeed: 430,
        projectileTextureKey: 'starter-projectile',
        hudIconKey: 'weapon-starter-blaster',
        knockback: { force: 60, durationMs: 82 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 760,
          distanceScaling: { nearMultiplier: 0.62, farMultiplier: 1.35 },
        },
      },
      'acid-sprayer': {
        range: 145,
        damage: 10,
        fireRateMs: 280,
        projectileSpeed: 460,
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
        knockback: { force: 54, durationMs: 84 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 1,
          spreadDegrees: 6,
          projectileLifetimeMs: 220,
          hazardRadius: 14,
          hazardDurationMs: 760,
          hazardTickMs: 220,
          hazardDamage: 4,
          execute: { thresholdRatio: 0.3, damageMultiplier: 1.85 },
        },
      },
      'frost-lance': {
        range: 400,
        damage: 12,
        fireRateMs: 310,
        projectileSpeed: 440,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
        knockback: { force: 50, durationMs: 78 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 1280,
          boomerang: {
            outboundDistance: 190,
            returnSpeedMultiplier: 1.32,
            returnDamageMultiplier: 1.1,
            returnHits: 1,
          },
        },
      },
      'storm-cannon': {
        range: 360,
        damage: 17,
        fireRateMs: 470,
        projectileSpeed: 420,
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
        knockback: { force: 124, durationMs: 128 },
        attackBehavior: {
          kind: 'impact-aoe',
          projectileLifetimeMs: 880,
          explosionRadius: 56,
          explosionDamage: 20,
        },
      },
      'arc-loom': {
        range: 390,
        damage: 14,
        fireRateMs: 300,
        projectileSpeed: 520,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
        knockback: { force: 62, durationMs: 86 },
        attackBehavior: {
          kind: 'chain',
          projectileLifetimeMs: 760,
          maxChains: 1,
          chainRange: 124,
          chainFalloff: 0.76,
        },
      },
      'spark-carbine': {
        range: 420,
        damage: 7,
        fireRateMs: 330,
        projectileSpeed: 620,
        projectileTextureKey: 'spark-projectile',
        hudIconKey: 'weapon-spark-carbine',
        knockback: { force: 48, durationMs: 70 },
        attackBehavior: {
          kind: 'burst-fire',
          shotsPerBurst: 1,
          shotIntervalMs: 52,
          projectileLifetimeMs: 680,
          damageMultiplier: 0.76,
          speedMultiplier: 1,
          spreadDegrees: 0,
        },
      },
      'mist-vortex': {
        range: 220,
        damage: 8,
        fireRateMs: 430,
        projectileSpeed: 270,
        projectileTextureKey: 'mist-projectile',
        hudIconKey: 'weapon-mist-vortex',
        knockback: { force: 30, durationMs: 76 },
        attackBehavior: {
          kind: 'zone-control',
          projectileLifetimeMs: 480,
          zoneRadius: 46,
          zoneDurationMs: 1900,
          zoneTickMs: 240,
          zoneDamage: 4,
          speedMultiplier: 0.5,
        },
      },
      'slime-glaive': {
        range: undefined,
        damage: 24,
        fireRateMs: 620,
        projectileSpeed: 0,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-slime-glaive',
        knockback: { force: 110, durationMs: 118 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 74,
          arcDegrees: 100,
          visualDurationMs: 150,
          maxTargets: 2,
        },
      },
      'prism-cutter': {
        range: undefined,
        damage: 18,
        fireRateMs: 290,
        projectileSpeed: 0,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-prism-cutter',
        knockback: { force: 78, durationMs: 82 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 62,
          arcDegrees: 36,
          visualDurationMs: 108,
          maxTargets: 1,
          execute: { thresholdRatio: 0.4, damageMultiplier: 2.1 },
        },
      },
      'needle-fan': {
        range: 200,
        damage: 9,
        fireRateMs: 340,
        projectileSpeed: 500,
        projectileTextureKey: 'needle-projectile',
        hudIconKey: 'weapon-needle-fan',
        knockback: { force: 70, durationMs: 82 },
        attackBehavior: {
          kind: 'split-shot',
          projectileCount: 1,
          spreadDegrees: 10,
          projectileLifetimeMs: 240,
          damageMultiplier: 0.82,
          speedMultiplier: 0.9,
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
  assert.equal(starterPlan.projectiles[0].distanceScaling?.farMultiplier, 1.35)
  assert.equal(frostPlan.projectiles.length, 1)
  assert.equal(frostPlan.projectiles[0].boomerang?.outboundDistance, 190)
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
  assert.equal(sparkPlan.projectiles.length, 1)
  assert.equal(sparkPlan.projectiles[0].delayMs, 0)
  assert.equal(getWeaponOutputGeometry(spark), 'burst-rhythm')

  assert.equal(needle.attackBehavior.kind, 'split-shot')
  assert.equal(needlePlan.projectiles.length, 1)
  assert.equal(Math.abs(needlePlan.projectiles[0].direction.y), 0)

  assert.equal(mist.attackBehavior.kind, 'zone-control')
  assert.equal(mistPlan.projectiles[0].hazardOnHit?.radius, 46)
  assert.equal(getWeaponSpecialEffectProfile(mist), 'hazard-linger')

  assert.equal(storm.attackBehavior.kind, 'impact-aoe')
  assert.equal(stormPlan.projectiles[0].explosionOnHit?.radius, 56)
  assert.equal(stormPlan.projectiles[0].explosionOnHit?.damage, 20)
  assert.equal(getWeaponSpecialEffectProfile(storm), 'impact-splash')
})

test('chain, execute melee, and wide melee remain actionable and identifiable', () => {
  const arc = WEAPON_DEFINITIONS['arc-loom']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const prism = WEAPON_DEFINITIONS['prism-cutter']

  assert.equal(buildAttackPlan(arc, { x: 0, y: 0 }, { x: 0, y: 10 }).projectiles[0].chain.maxChains, 1)
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
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['spark-carbine']), /1박자/)
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
