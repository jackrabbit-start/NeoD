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
        range: 145,
        damage: 19,
        fireRateMs: 235,
        projectileSpeed: 500,
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
        knockback: { force: 70, durationMs: 95 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 4,
          spreadDegrees: 18,
          projectileLifetimeMs: 260,
          hazardRadius: 24,
          hazardDurationMs: 1050,
          hazardTickMs: 210,
          hazardDamage: 7,
        },
      },
      'frost-lance': {
        range: 560,
        damage: 17,
        fireRateMs: 205,
        projectileSpeed: 660,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
        knockback: { force: 55, durationMs: 80 },
        attackBehavior: { kind: 'pierce', projectileLifetimeMs: 920, maxHits: 4 },
      },
      'storm-cannon': {
        range: 470,
        damage: 34,
        fireRateMs: 340,
        projectileSpeed: 530,
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
        knockback: { force: 150, durationMs: 150 },
        attackBehavior: {
          kind: 'impact-burst',
          projectileLifetimeMs: 980,
          splashRadius: 56,
          splashDamageMultiplier: 0.62,
          splashKnockbackMultiplier: 0.6,
        },
      },
      'arc-loom': {
        range: 500,
        damage: 24,
        fireRateMs: 185,
        projectileSpeed: 590,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
        knockback: { force: 85, durationMs: 100 },
        attackBehavior: {
          kind: 'chain',
          projectileLifetimeMs: 900,
          maxChains: 2,
          chainRange: 140,
          chainFalloff: 0.66,
        },
      },
      'spark-carbine': {
        range: 520,
        damage: 10,
        fireRateMs: 170,
        projectileSpeed: 760,
        projectileTextureKey: 'spark-projectile',
        hudIconKey: 'weapon-spark-carbine',
        knockback: { force: 62, durationMs: 78 },
        attackBehavior: {
          kind: 'volley',
          projectileCount: 3,
          spreadDegrees: 8,
          projectileLifetimeMs: 760,
          damageMultiplier: 0.72,
          speedMultiplier: 1.08,
          maxHits: 1,
        },
      },
      'mist-vortex': {
        range: 220,
        damage: 12,
        fireRateMs: 310,
        projectileSpeed: 360,
        projectileTextureKey: 'mist-projectile',
        hudIconKey: 'weapon-mist-vortex',
        knockback: { force: 42, durationMs: 90 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 3,
          spreadDegrees: 10,
          projectileLifetimeMs: 380,
          hazardRadius: 46,
          hazardDurationMs: 1850,
          hazardTickMs: 260,
          hazardDamage: 5,
        },
      },
      'slime-glaive': {
        range: undefined,
        damage: 32,
        fireRateMs: 560,
        projectileSpeed: 0,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-slime-glaive',
        knockback: { force: 125, durationMs: 125 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 106,
          arcDegrees: 122,
          visualDurationMs: 155,
          maxTargets: 5,
        },
      },
      'prism-cutter': {
        range: undefined,
        damage: 26,
        fireRateMs: 240,
        projectileSpeed: 0,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-prism-cutter',
        knockback: { force: 95, durationMs: 88 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 76,
          arcDegrees: 46,
          visualDurationMs: 110,
          maxTargets: 1,
        },
      },
      'needle-fan': {
        range: 240,
        damage: 11,
        fireRateMs: 255,
        projectileSpeed: 620,
        projectileTextureKey: 'needle-projectile',
        hudIconKey: 'weapon-needle-fan',
        knockback: { force: 84, durationMs: 86 },
        attackBehavior: {
          kind: 'volley',
          projectileCount: 6,
          spreadDegrees: 13,
          projectileLifetimeMs: 280,
          damageMultiplier: 0.9,
          speedMultiplier: 0.95,
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

test('new volley primitive produces narrow and wide multi-projectile plans', () => {
  const spark = WEAPON_DEFINITIONS['spark-carbine']
  const needle = WEAPON_DEFINITIONS['needle-fan']
  const sparkPlan = buildAttackPlan(spark, { x: 0, y: 0 }, { x: 100, y: 0 })
  const needlePlan = buildAttackPlan(needle, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(spark.attackBehavior.kind, 'volley')
  assert.equal(needle.attackBehavior.kind, 'volley')
  assert.equal(sparkPlan.projectiles.length, 3)
  assert.equal(needlePlan.projectiles.length, 6)
  assert.ok(Math.abs(sparkPlan.projectiles[0].direction.y) < Math.abs(needlePlan.projectiles[0].direction.y))
  assert.equal(sparkPlan.projectiles[0].damage, 7)
  assert.equal(needlePlan.projectiles[0].damage, 10)
  assert.equal(getWeaponOutputGeometry(spark), 'multi-volley')
  assert.equal(getWeaponOutputGeometry(needle), 'multi-volley')
})

test('new impact burst primitive exposes hit splash data for storm cannon', () => {
  const storm = WEAPON_DEFINITIONS['storm-cannon']
  const plan = buildAttackPlan(storm, { x: 0, y: 0 }, { x: 10, y: 0 })

  assert.equal(storm.attackBehavior.kind, 'impact-burst')
  assert.equal(plan.projectiles.length, 1)
  assert.equal(plan.projectiles[0].impactBurstOnHit?.radius, 56)
  assert.equal(plan.projectiles[0].impactBurstOnHit?.damage, 21)
  assert.equal(plan.projectiles[0].impactBurstOnHit?.knockbackMultiplier, 0.6)
  assert.equal(getWeaponSpecialEffectProfile(storm), 'impact-splash')
  assert.match(getWeaponSummary(storm), /착탄 폭발/)
})

test('spray hazard weapons stay distinct between close acid pressure and long denial mist', () => {
  const acid = WEAPON_DEFINITIONS['acid-sprayer']
  const mist = WEAPON_DEFINITIONS['mist-vortex']
  const acidPlan = buildAttackPlan(acid, { x: 0, y: 0 }, { x: 100, y: 0 })
  const mistPlan = buildAttackPlan(mist, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(acid.attackBehavior.kind, 'spray-hazard')
  assert.equal(mist.attackBehavior.kind, 'spray-hazard')
  assert.equal(acidPlan.projectiles.length, 4)
  assert.equal(mistPlan.projectiles.length, 3)
  assert.equal(acidPlan[ 'projectiles'][1].hazardOnHit?.radius, 24)
  assert.equal(mistPlan.projectiles[1].hazardOnHit?.radius, 46)
  assert.equal(getWeaponRangeBand(acid), 'close')
  assert.equal(getWeaponRangeBand(mist), 'mid')
  assert.equal(getWeaponSpecialEffectProfile(acid), 'hazard-linger')
})

test('pierce, chain, melee, and starter plans remain actionable and identifiable', () => {
  const frost = WEAPON_DEFINITIONS['frost-lance']
  const arc = WEAPON_DEFINITIONS['arc-loom']
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const prism = WEAPON_DEFINITIONS['prism-cutter']

  assert.equal(buildAttackPlan(frost, { x: 0, y: 0 }, { x: 0, y: 10 }).projectiles[0].maxHits, 4)
  assert.equal(buildAttackPlan(arc, { x: 0, y: 0 }, { x: 0, y: 10 }).projectiles[0].chain.maxChains, 2)
  assert.equal(buildAttackPlan(starter, { x: 0, y: 0 }, { x: 0, y: 10 }).projectiles.length, 1)
  assert.equal(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.length, 1)
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings[0].maxTargets, 1)
  assert.equal(getWeaponOutputGeometry(glaive), 'wide-cleave')
  assert.equal(getWeaponOutputGeometry(prism), 'narrow-cleave')
  assert.equal(getWeaponSpecialEffectProfile(arc), 'chain-bounce')
  assert.equal(getWeaponSpecialEffectProfile(glaive), 'high-knockback')
  assert.equal(isAttackPlanActionable(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 })), true)
})

test('crafted roster identity signatures are unique across all weapons', () => {
  const signatures = Object.values(WEAPON_DEFINITIONS).map((weapon) => `${weapon.id}:${JSON.stringify(attackSignature(weapon))}`)
  assert.equal(signatures.length, 10)
  assert.equal(new Set(signatures.map((entry) => entry.slice(entry.indexOf(':') + 1))).size, 10)
})

test('weapon identity labels prefer metadata and summaries expose role text', () => {
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['arc-loom']), '감다살 연쇄')
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['spark-carbine']), /3연발/)
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['prism-cutter']), /전방 46°/)

  const fallbackFrost = {
    ...WEAPON_DEFINITIONS['frost-lance'],
    identityLabel: undefined,
  }

  assert.equal(getWeaponIdentityLabel(fallbackFrost), '관통 사격')
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
