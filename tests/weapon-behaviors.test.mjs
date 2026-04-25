import test from 'node:test'
import assert from 'node:assert/strict'

import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import {
  advanceHazardState,
  advanceRepeatingTimer,
  applyProjectileHitState,
  buildAttackPlan,
  canProjectileHitEnemy,
  collectTargetsInBox,
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
        range: 320,
        damage: 5,
        fireRateMs: 460,
        projectileSpeed: 410,
        projectileTextureKey: 'starter-projectile',
        hudIconKey: 'weapon-starter-blaster',
        knockback: { force: 60, durationMs: 82 },
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
      'acid-sprayer': {
        range: 200,
        damage: 9,
        fireRateMs: 600,
        projectileSpeed: 380,
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
        knockback: { force: 58, durationMs: 86 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 1,
          spreadDegrees: 8,
          projectileLifetimeMs: 240,
          hazardRadius: 18,
          hazardDurationMs: 900,
          hazardTickMs: 240,
          hazardDamage: 4,
        },
      },
      'frost-lance': {
        range: 420,
        damage: 13,
        fireRateMs: 1000,
        projectileSpeed: 380,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
        knockback: { force: 124, durationMs: 122 },
        attackBehavior: {
          kind: 'impact-aoe',
          projectileLifetimeMs: 980,
          explosionRadius: 52,
          explosionDamage: 18,
        },
      },
      'storm-cannon': {
        range: 170,
        damage: 9,
        fireRateMs: 720,
        projectileSpeed: 560,
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
        knockback: { force: 108, durationMs: 104 },
        attackBehavior: {
          kind: 'split-shot',
          projectileCount: 2,
          spreadDegrees: 8,
          projectileLifetimeMs: 220,
          shotDelayMs: 16,
          damageMultiplier: 0.8,
          speedMultiplier: 0.9,
          maxHits: 1,
        },
      },
      'arc-loom': {
        range: 380,
        damage: 10,
        fireRateMs: 560,
        projectileSpeed: 460,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
        knockback: { force: 84, durationMs: 94 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 1200,
          ricochet: {
            maxBounces: 1,
            bounceRange: 108,
            damageMultiplierPerBounce: 0.82,
            speedMultiplierPerBounce: 0.92,
            projectileCount: 1,
            spreadDegrees: 0,
            speedVariance: 0,
          },
        },
      },
      'spark-carbine': {
        range: 280,
        damage: 2,
        fireRateMs: 1300,
        projectileSpeed: 300,
        projectileTextureKey: 'spark-projectile',
        hudIconKey: 'weapon-spark-carbine',
        knockback: { force: 44, durationMs: 70 },
        attackBehavior: {
          kind: 'deploy-turret',
          projectileLifetimeMs: 560,
          impactDamage: 1,
          speedMultiplier: 0.6,
          deploy: {
            maxTurrets: 1,
            durationMs: 3200,
            range: 180,
            fireRateMs: 700,
            projectileLifetimeMs: 620,
            projectileSpeed: 520,
            projectileDamage: 6,
          },
        },
      },
      'mist-vortex': {
        range: 240,
        damage: 6,
        fireRateMs: 760,
        projectileSpeed: 260,
        projectileTextureKey: 'mist-projectile',
        hudIconKey: 'weapon-mist-vortex',
        knockback: { force: 36, durationMs: 82 },
        attackBehavior: {
          kind: 'zone-control',
          projectileLifetimeMs: 480,
          zoneRadius: 24,
          zoneDurationMs: 1100,
          zoneTickMs: 240,
          zoneDamage: 14,
          zoneTriggerMode: 'trigger-explode',
          armingDelayMs: 180,
          speedMultiplier: 0.12,
        },
      },
      'slime-glaive': {
        range: undefined,
        damage: 15,
        fireRateMs: 760,
        projectileSpeed: 0,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-slime-glaive',
        knockback: { force: 118, durationMs: 118 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 72,
          arcDegrees: 180,
          visualDurationMs: 170,
          maxTargets: 2,
          healOnHit: 1,
        },
      },
      'prism-cutter': {
        range: undefined,
        damage: 12,
        fireRateMs: 780,
        projectileSpeed: 0,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-prism-cutter',
        knockback: { force: 84, durationMs: 88 },
        attackBehavior: {
          kind: 'combo-melee',
          stepIntervalMs: 110,
          steps: [
            { damageMultiplier: 0.78, range: 46, arcDegrees: 20, hitShape: 'box', boxWidth: 22, visualDurationMs: 82, maxTargets: 1 },
            { damageMultiplier: 1.18, range: 64, arcDegrees: 64, hitShape: 'arc', visualDurationMs: 118, maxTargets: 2, knockbackMultiplier: 1.45 },
          ],
        },
      },
      'needle-fan': {
        range: 320,
        damage: 11,
        fireRateMs: 560,
        projectileSpeed: 500,
        projectileTextureKey: 'needle-projectile',
        hudIconKey: 'weapon-needle-fan',
        knockback: { force: 72, durationMs: 84 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 700,
          execute: {
            thresholdRatio: 0.28,
            damageMultiplier: 1.7,
          },
          summonOnKill: {
            maxMinions: 1,
            durationMs: 2600,
            speed: 150,
            damage: 7,
            attackIntervalMs: 420,
            contactRadius: 24,
          },
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

test('starter burst and rocket launcher plans expose the new ranged identities', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const frost = WEAPON_DEFINITIONS['frost-lance']
  const starterPlan = buildAttackPlan(starter, { x: 0, y: 0 }, { x: 100, y: 0 })
  const frostPlan = buildAttackPlan(frost, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(starterPlan.projectiles.length, 1)
  assert.equal(starterPlan.projectiles[0].delayMs, 0)
  assert.equal(frostPlan.projectiles.length, 1)
  assert.equal(frostPlan.projectiles[0].explosionOnHit?.radius, 52)
  assert.equal(frostPlan.projectiles[0].explosionOnExpire?.damage, 18)
  assert.equal(getWeaponOutputGeometry(starter), 'burst-rhythm')
  assert.equal(getWeaponSpecialEffectProfile(starter), 'none')
  assert.equal(getWeaponOutputGeometry(frost), 'single-shot')
  assert.equal(getWeaponSpecialEffectProfile(frost), 'impact-splash')
})

test('deploy, summon, zone, split, and ricochet weapons expose distinct plans', () => {
  const spark = WEAPON_DEFINITIONS['spark-carbine']
  const needle = WEAPON_DEFINITIONS['needle-fan']
  const mist = WEAPON_DEFINITIONS['mist-vortex']
  const storm = WEAPON_DEFINITIONS['storm-cannon']
  const arc = WEAPON_DEFINITIONS['arc-loom']

  const sparkPlan = buildAttackPlan(spark, { x: 0, y: 0 }, { x: 100, y: 0 })
  const needlePlan = buildAttackPlan(needle, { x: 0, y: 0 }, { x: 100, y: 0 })
  const mistPlan = buildAttackPlan(mist, { x: 0, y: 0 }, { x: 100, y: 0 })
  const stormPlan = buildAttackPlan(storm, { x: 0, y: 0 }, { x: 100, y: 0 })
  const arcPlan = buildAttackPlan(arc, { x: 0, y: 0 }, { x: 100, y: 0 })

  assert.equal(spark.attackBehavior.kind, 'deploy-turret')
  assert.equal(sparkPlan.projectiles.length, 1)
  assert.equal(sparkPlan.projectiles[0].deployTurret?.maxTurrets, 1)
  assert.equal(getWeaponOutputGeometry(spark), 'deployable-node')

  assert.equal(needle.attackBehavior.kind, 'single')
  assert.equal(needlePlan.projectiles.length, 1)
  assert.equal(needlePlan.projectiles[0].summonOnKill?.maxMinions, 1)
  assert.equal(needlePlan.projectiles[0].execute?.thresholdRatio, 0.28)

  assert.equal(mist.attackBehavior.kind, 'zone-control')
  assert.equal(mistPlan.projectiles[0].hazardOnHit?.radius, 24)
  assert.equal(mistPlan.projectiles[0].hazardOnHit?.mode, 'trigger-trap')
  assert.equal(getWeaponSpecialEffectProfile(mist), 'impact-splash')

  assert.equal(storm.attackBehavior.kind, 'split-shot')
  assert.equal(stormPlan.projectiles.length, 2)
  assert.equal(stormPlan.projectiles[1].delayMs, 16)
  assert.ok(Math.abs(stormPlan.projectiles[0].direction.y) > 0)

  assert.equal(arc.attackBehavior.kind, 'single')
  assert.equal(arcPlan.projectiles[0].ricochet?.maxBounces, 1)
  assert.equal(getWeaponSpecialEffectProfile(arc), 'ricochet')
})

test('melee cleave and combo weapons remain actionable and identifiable', () => {
  const arc = WEAPON_DEFINITIONS['arc-loom']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const prism = WEAPON_DEFINITIONS['prism-cutter']

  assert.equal(buildAttackPlan(arc, { x: 0, y: 0 }, { x: 0, y: 10 }).projectiles[0].ricochet.maxBounces, 1)
  assert.equal(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.length, 0)
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.length, 2)
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings[0]?.hitShape, 'box')
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.at(-1)?.hitShape, 'arc')
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.at(-1).maxTargets, 2)
  assert.equal(getWeaponOutputGeometry(glaive), 'wide-cleave')
  assert.equal(getWeaponOutputGeometry(prism), 'combo-melee')
  assert.equal(getWeaponSpecialEffectProfile(arc), 'ricochet')
  assert.equal(getWeaponSpecialEffectProfile(prism), 'high-knockback')
  assert.equal(isAttackPlanActionable(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 })), false)
})

test('crafted roster identity signatures are unique across all weapons', () => {
  const signatures = Object.values(WEAPON_DEFINITIONS).map((weapon) => `${weapon.id}:${JSON.stringify(attackSignature(weapon))}`)
  assert.equal(signatures.length, 10)
  assert.equal(new Set(signatures.map((entry) => entry.slice(entry.indexOf(':') + 1))).size, 10)
})

test('weapon identity labels prefer metadata and summaries expose role text', () => {
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['arc-loom']), '연쇄 킥')
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['starter-blaster']), /1박자/)
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['spark-carbine']), /배치 1기/)
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['prism-cutter']), /2연 콤보/)

  const fallbackFrost = {
    ...WEAPON_DEFINITIONS['frost-lance'],
    identityLabel: undefined,
  }

  assert.equal(getWeaponIdentityLabel(fallbackFrost), '충격 폭발')
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

  assert.deepEqual(
    collectTargetsInBox(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      40,
      20,
      [
        { id: 1, x: 18, y: 4, radius: 4 },
        { id: 2, x: 18, y: 18, radius: 4 },
        { id: 3, x: 55, y: 0, radius: 4 },
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
