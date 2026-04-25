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
        range: 420,
        damage: 5,
        fireRateMs: 250,
        projectileSpeed: 760,
        projectileTextureKey: 'starter-projectile',
        hudIconKey: 'weapon-starter-blaster',
        knockback: { force: 46, durationMs: 72 },
        attackBehavior: {
          kind: 'burst-fire',
          shotsPerBurst: 5,
          shotIntervalMs: 28,
          projectileLifetimeMs: 680,
          damageMultiplier: 0.68,
          speedMultiplier: 1.05,
          spreadDegrees: 3,
        },
      },
      'acid-sprayer': {
        range: 240,
        damage: 11,
        fireRateMs: 420,
        projectileSpeed: 460,
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
        knockback: { force: 58, durationMs: 86 },
        attackBehavior: {
          kind: 'spray-hazard',
          projectileCount: 3,
          spreadDegrees: 11,
          projectileLifetimeMs: 360,
          hazardRadius: 34,
          hazardDurationMs: 1400,
          hazardTickMs: 220,
          hazardDamage: 6,
        },
      },
      'frost-lance': {
        range: 520,
        damage: 16,
        fireRateMs: 760,
        projectileSpeed: 410,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
        knockback: { force: 124, durationMs: 122 },
        attackBehavior: {
          kind: 'impact-aoe',
          projectileLifetimeMs: 1100,
          explosionRadius: 88,
          explosionDamage: 28,
        },
      },
      'storm-cannon': {
        range: 180,
        damage: 10,
        fireRateMs: 520,
        projectileSpeed: 620,
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
        knockback: { force: 108, durationMs: 104 },
        attackBehavior: {
          kind: 'split-shot',
          projectileCount: 8,
          spreadDegrees: 9,
          projectileLifetimeMs: 260,
          damageMultiplier: 0.84,
          speedMultiplier: 0.96,
          maxHits: 1,
        },
      },
      'arc-loom': {
        range: 430,
        damage: 12,
        fireRateMs: 360,
        projectileSpeed: 560,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
        knockback: { force: 84, durationMs: 94 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 1600,
          ricochet: {
            maxBounces: 4,
            bounceRange: 210,
            damageMultiplierPerBounce: 0.94,
            speedMultiplierPerBounce: 1.03,
          },
        },
      },
      'spark-carbine': {
        range: 320,
        damage: 3,
        fireRateMs: 920,
        projectileSpeed: 340,
        projectileTextureKey: 'spark-projectile',
        hudIconKey: 'weapon-spark-carbine',
        knockback: { force: 44, durationMs: 70 },
        attackBehavior: {
          kind: 'deploy-turret',
          projectileLifetimeMs: 620,
          impactDamage: 3,
          speedMultiplier: 0.9,
          deploy: {
            maxTurrets: 2,
            durationMs: 5200,
            range: 250,
            fireRateMs: 420,
            projectileLifetimeMs: 700,
            projectileSpeed: 620,
            projectileDamage: 9,
          },
        },
      },
      'mist-vortex': {
        range: 280,
        damage: 8,
        fireRateMs: 440,
        projectileSpeed: 290,
        projectileTextureKey: 'mist-projectile',
        hudIconKey: 'weapon-mist-vortex',
        knockback: { force: 36, durationMs: 82 },
        attackBehavior: {
          kind: 'zone-control',
          projectileLifetimeMs: 520,
          zoneRadius: 44,
          zoneDurationMs: 1800,
          zoneTickMs: 210,
          zoneDamage: 24,
          zoneTriggerMode: 'trigger-explode',
          armingDelayMs: 140,
          speedMultiplier: 0.52,
        },
      },
      'slime-glaive': {
        range: undefined,
        damage: 17,
        fireRateMs: 560,
        projectileSpeed: 0,
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-slime-glaive',
        knockback: { force: 118, durationMs: 118 },
        attackBehavior: {
          kind: 'melee-cleave',
          range: 86,
          arcDegrees: 360,
          visualDurationMs: 170,
          maxTargets: 6,
          healOnHit: 2,
        },
      },
      'prism-cutter': {
        range: undefined,
        damage: 14,
        fireRateMs: 560,
        projectileSpeed: 0,
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-prism-cutter',
        knockback: { force: 84, durationMs: 88 },
        attackBehavior: {
          kind: 'combo-melee',
          stepIntervalMs: 68,
          steps: [
            { damageMultiplier: 0.75, range: 58, arcDegrees: 42, visualDurationMs: 82, maxTargets: 1 },
            { damageMultiplier: 0.82, range: 60, arcDegrees: 46, visualDurationMs: 86, maxTargets: 1 },
            { damageMultiplier: 0.92, range: 68, arcDegrees: 58, visualDurationMs: 94, maxTargets: 2, knockbackMultiplier: 1.1 },
            { damageMultiplier: 1.55, range: 78, arcDegrees: 112, visualDurationMs: 118, maxTargets: 4, knockbackMultiplier: 1.6 },
          ],
        },
      },
      'needle-fan': {
        range: 380,
        damage: 13,
        fireRateMs: 360,
        projectileSpeed: 560,
        projectileTextureKey: 'needle-projectile',
        hudIconKey: 'weapon-needle-fan',
        knockback: { force: 72, durationMs: 84 },
        attackBehavior: {
          kind: 'single',
          projectileLifetimeMs: 760,
          summonOnKill: {
            maxMinions: 3,
            durationMs: 4200,
            speed: 170,
            damage: 10,
            attackIntervalMs: 320,
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

  assert.equal(starterPlan.projectiles.length, 5)
  assert.equal(starterPlan.projectiles[1].delayMs, 28)
  assert.equal(frostPlan.projectiles.length, 1)
  assert.equal(frostPlan.projectiles[0].explosionOnHit?.radius, 88)
  assert.equal(frostPlan.projectiles[0].explosionOnExpire?.damage, 28)
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
  assert.equal(sparkPlan.projectiles[0].deployTurret?.maxTurrets, 2)
  assert.equal(getWeaponOutputGeometry(spark), 'deployable-node')

  assert.equal(needle.attackBehavior.kind, 'single')
  assert.equal(needlePlan.projectiles.length, 1)
  assert.equal(needlePlan.projectiles[0].summonOnKill?.maxMinions, 3)

  assert.equal(mist.attackBehavior.kind, 'zone-control')
  assert.equal(mistPlan.projectiles[0].hazardOnHit?.radius, 44)
  assert.equal(mistPlan.projectiles[0].hazardOnHit?.mode, 'trigger-trap')
  assert.equal(getWeaponSpecialEffectProfile(mist), 'impact-splash')

  assert.equal(storm.attackBehavior.kind, 'split-shot')
  assert.equal(stormPlan.projectiles.length, 8)
  assert.ok(Math.abs(stormPlan.projectiles[0].direction.y) > 0)

  assert.equal(arc.attackBehavior.kind, 'single')
  assert.equal(arcPlan.projectiles[0].ricochet?.maxBounces, 4)
  assert.equal(getWeaponSpecialEffectProfile(arc), 'ricochet')
})

test('melee cleave and combo weapons remain actionable and identifiable', () => {
  const arc = WEAPON_DEFINITIONS['arc-loom']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const prism = WEAPON_DEFINITIONS['prism-cutter']

  assert.equal(buildAttackPlan(arc, { x: 0, y: 0 }, { x: 0, y: 10 }).projectiles[0].ricochet.maxBounces, 4)
  assert.equal(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.length, 1)
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.length, 4)
  assert.equal(buildAttackPlan(prism, { x: 0, y: 0 }, { x: 100, y: 0 }).meleeSwings.at(-1).maxTargets, 4)
  assert.equal(getWeaponOutputGeometry(glaive), 'wide-cleave')
  assert.equal(getWeaponOutputGeometry(prism), 'combo-melee')
  assert.equal(getWeaponSpecialEffectProfile(arc), 'ricochet')
  assert.equal(getWeaponSpecialEffectProfile(prism), 'high-knockback')
  assert.equal(isAttackPlanActionable(buildAttackPlan(glaive, { x: 0, y: 0 }, { x: 100, y: 0 })), true)
})

test('crafted roster identity signatures are unique across all weapons', () => {
  const signatures = Object.values(WEAPON_DEFINITIONS).map((weapon) => `${weapon.id}:${JSON.stringify(attackSignature(weapon))}`)
  assert.equal(signatures.length, 10)
  assert.equal(new Set(signatures.map((entry) => entry.slice(entry.indexOf(':') + 1))).size, 10)
})

test('weapon identity labels prefer metadata and summaries expose role text', () => {
  assert.equal(getWeaponIdentityLabel(WEAPON_DEFINITIONS['arc-loom']), '연쇄 킥')
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['starter-blaster']), /5박자/)
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['spark-carbine']), /배치 2기/)
  assert.match(getWeaponSummary(WEAPON_DEFINITIONS['prism-cutter']), /4연 콤보/)

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
