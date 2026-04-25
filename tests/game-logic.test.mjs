import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
import { ITEM_DEFINITIONS } from '../.tmp-test/src/data/items.js'
import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import { resolveCombine, getAvailableRecipes } from '../.tmp-test/src/systems/combine.js'
import { getCodexState } from '../.tmp-test/src/systems/codex.js'
import { ENEMY_CONTACT_PADDING, PLAYER_COLLISION_RADIUS, PROJECTILE_COLLISION_RADIUS, PROJECTILE_HIT_PADDING } from '../.tmp-test/src/game/combatGeometry.js'
import { VECTOR_ASSETS } from '../.tmp-test/src/game/visualManifest.js'
import { resolveWeightedDrop } from '../.tmp-test/src/systems/drop.js'
import { getEnemyHealthBarMetrics, getEnemyHealthFillWidth } from '../.tmp-test/src/systems/enemyHealthBar.js'
import { addItem } from '../.tmp-test/src/systems/inventory.js'
import {
  describeAvailableRecipes,
  describeInventoryEntries,
} from '../.tmp-test/src/scenes/arena/combineInventoryPresenter.js'
import {
  applyLootPickup,
  applyRecipeSelectionWorkflow,
} from '../.tmp-test/src/scenes/arena/combineInventoryWorkflow.js'
import {
  deriveEffectiveWeaponStats,
  resolveTuningSelection,
} from '../.tmp-test/src/systems/tuning.js'
import {
  applyRecipeSelection,
  equipOwnedWeapon,
  getActionableRecipes,
  seedOwnedWeapons,
} from '../.tmp-test/src/systems/weaponOwnership.js'
import {
  resolveAutoAttackShot,
  resolveNearestAutoAttackTarget,
} from '../.tmp-test/src/scenes/arena/autoAttack.js'
import { getWaveByIndex, isBossWaveReady, shouldAdvanceWave } from '../.tmp-test/src/systems/waves.js'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))

test('weighted drops only return configured loot ids', () => {
  const result = resolveWeightedDrop(
    [
      { itemId: 'gel-shard', weight: 5 },
      { itemId: 'acid-core', weight: 3 },
      { itemId: 'frost-mote', weight: 2 },
    ],
    () => 0.62,
  )

  assert.equal(result, 'acid-core')
})

test('combine resolves only when the required inputs exist', () => {
  let inventory = {}
  inventory = addItem(inventory, 'gel-shard')
  inventory = addItem(inventory, 'acid-core')

  const availableRecipes = getAvailableRecipes(inventory)
  assert.equal(availableRecipes.length, 1)
  assert.equal(availableRecipes[0]?.recipe.id, 'acid-sprayer-recipe')

  const combined = resolveCombine(inventory, 'acid-sprayer-recipe')
  assert.ok(combined)
  assert.equal(combined?.weaponId, 'acid-sprayer')
  assert.deepEqual(combined?.nextInventory, {})
})

test('new arc recipe resolves from the new sample drops', () => {
  let inventory = {}
  inventory = addItem(inventory, 'spark-knot')
  inventory = addItem(inventory, 'mist-bead')

  const availableRecipes = getAvailableRecipes(inventory)
  assert.equal(availableRecipes.length, 1)
  assert.equal(availableRecipes[0]?.recipe.id, 'arc-loom-recipe')

  const combined = resolveCombine(inventory, 'arc-loom-recipe')
  assert.ok(combined)
  assert.equal(combined?.weaponId, 'arc-loom')
  assert.deepEqual(combined?.nextInventory, {})
})

test('invalid combine attempts do not produce upgrades', () => {
  const combined = resolveCombine({ 'gel-shard': 1 }, 'acid-sprayer-recipe')
  assert.equal(combined, null)
})

test('loot pickup workflow updates inventory and reports the pickup message', () => {
  const result = applyLootPickup({}, 'gel-shard')

  assert.deepEqual(result, {
    nextInventory: { 'gel-shard': 1 },
    statusMessage: '젤 파편 획득.',
  })
})

test('recipe selection workflow reports the current not-actionable status message', () => {
  const result = applyRecipeSelectionWorkflow(
    {
      inventory: {},
      ownedWeaponIds: ['starter-blaster'],
    },
    'acid-sprayer-recipe',
  )

  assert.deepEqual(result, {
    kind: 'not-actionable',
    statusMessage: '해당 조합은 더 이상 실행할 수 없습니다. 다른 옵션을 선택하세요.',
  })
})

test('recipe selection workflow returns the equipped upgrade state on success', () => {
  const result = applyRecipeSelectionWorkflow(
    {
      inventory: {
        'gel-shard': 1,
        'acid-core': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'acid-sprayer-recipe',
  )

  assert.deepEqual(result, {
    kind: 'success',
    nextInventory: {},
    ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    activeWeaponId: 'acid-sprayer',
    statusMessage: 'Acid Sprayer 제작 및 장착 완료. 준비되면 런을 다시 진행하세요.',
  })
})

test('inventory presenter mirrors the arena summary strings', () => {
  assert.deepEqual(describeInventoryEntries({}), ['아직 획득한 드롭이 없습니다.'])
  assert.deepEqual(describeInventoryEntries({ 'gel-shard': 2 }), ['젤 파편 × 2'])
})

test('recipe presenter mirrors the actionable combine summary strings', () => {
  assert.deepEqual(describeAvailableRecipes([]), ['지금 바로 가능한 조합이 없습니다.'])

  const recipes = getActionableRecipes(
    {
      'gel-shard': 1,
      'acid-core': 1,
    },
    ['starter-blaster'],
  )

  assert.deepEqual(describeAvailableRecipes(recipes), [
    '산성 분사기 → 피해 20 · 초당 4발 · 산성 분사 (안정적인 슬라임 물질을 부식성 화력으로 바꿉니다.)',
  ])
})

test('actionable recipes exclude outputs that are already owned', () => {
  const inventory = {
    'gel-shard': 1,
    'acid-core': 1,
  }

  assert.deepEqual(seedOwnedWeapons(), ['starter-blaster'])
  assert.equal(getActionableRecipes(inventory, ['starter-blaster']).length, 1)
  assert.equal(getActionableRecipes(inventory, ['starter-blaster', 'acid-sprayer']).length, 0)
})

test('applying a recipe selection adds ownership and auto-equips the new weapon', () => {
  const result = applyRecipeSelection(
    {
      inventory: {
        'gel-shard': 1,
        'acid-core': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'acid-sprayer-recipe',
  )

  assert.ok(result)
  assert.deepEqual(result?.nextInventory, {})
  assert.deepEqual(result?.ownedWeaponIds, ['starter-blaster', 'acid-sprayer'])
  assert.equal(result?.activeWeaponId, 'acid-sprayer')
})

test('new recipe selection adds the new owned weapon path', () => {
  const result = applyRecipeSelection(
    {
      inventory: {
        'spark-knot': 1,
        'mist-bead': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'arc-loom-recipe',
  )

  assert.ok(result)
  assert.deepEqual(result?.ownedWeaponIds, ['starter-blaster', 'arc-loom'])
  assert.equal(result?.activeWeaponId, 'arc-loom')
})

test('duplicate-output recipe selections do not consume inventory', () => {
  const result = applyRecipeSelection(
    {
      inventory: {
        'gel-shard': 1,
        'acid-core': 1,
      },
      ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    },
    'acid-sprayer-recipe',
  )

  assert.equal(result, null)
})

test('equipping an owned weapon only changes the active weapon id', () => {
  assert.equal(
    equipOwnedWeapon(['starter-blaster', 'frost-lance'], 'starter-blaster', 'frost-lance'),
    'frost-lance',
  )
  assert.equal(
    equipOwnedWeapon(['starter-blaster'], 'starter-blaster', 'storm-cannon'),
    'starter-blaster',
  )
})

test('wave progression only advances when the current wave is fully cleared', () => {
  assert.equal(shouldAdvanceWave(1, 0), false)
  assert.equal(shouldAdvanceWave(0, 2), false)
  assert.equal(shouldAdvanceWave(0, 0), true)
})

test('nearest auto-attack target returns null when no active enemies are available', () => {
  assert.equal(resolveNearestAutoAttackTarget({ x: 10, y: 10 }, []), null)
  assert.equal(
    resolveNearestAutoAttackTarget(
      { x: 10, y: 10 },
      [
        { x: 12, y: 12, isActive: false },
        { x: 8, y: 8, isActive: false },
      ],
    ),
    null,
  )
})

test('nearest auto-attack target ignores inactive enemies and returns a normalized vector', () => {
  const target = resolveNearestAutoAttackTarget(
    { x: 0, y: 0 },
    [
      { x: 1, y: 0, isActive: false },
      { x: 3, y: 4, isActive: true },
      { x: 9, y: 0, isActive: true },
    ],
  )

  assert.deepEqual(target && { x: target.x, y: target.y, distanceSq: target.distanceSq }, {
    x: 3,
    y: 4,
    distanceSq: 25,
  })
  assert.equal(target?.directionX, 0.6)
  assert.equal(target?.directionY, 0.8)
})

test('nearest auto-attack target re-evaluates to the closest enemy each call', () => {
  const firstTarget = resolveNearestAutoAttackTarget(
    { x: 0, y: 0 },
    [
      { x: 4, y: 0, isActive: true },
      { x: 8, y: 0, isActive: true },
    ],
  )
  const secondTarget = resolveNearestAutoAttackTarget(
    { x: 7, y: 0 },
    [
      { x: 4, y: 0, isActive: true },
      { x: 8, y: 0, isActive: true },
    ],
  )

  assert.equal(firstTarget?.x, 4)
  assert.equal(secondTarget?.x, 8)
})

test('nearest auto-attack target handles an overlapping enemy with a deterministic fallback direction', () => {
  const target = resolveNearestAutoAttackTarget(
    { x: 5, y: 5 },
    [
      { x: 5, y: 5, isActive: true },
      { x: 8, y: 5, isActive: true },
    ],
  )

  assert.deepEqual(target, {
    x: 5,
    y: 5,
    directionX: 0,
    directionY: -1,
    distanceSq: 0,
  })
})

test('auto-attack shot gating respects interaction pause, cooldown, and target availability', () => {
  const origin = { x: 0, y: 0 }
  const candidates = [{ x: 3, y: 4, isActive: true }]

  assert.equal(
    resolveAutoAttackShot(origin, candidates, {
      isInteractionBlocked: true,
      time: 1000,
      nextFireAt: 0,
    }),
    null,
  )
  assert.equal(
    resolveAutoAttackShot(origin, candidates, {
      isInteractionBlocked: false,
      time: 100,
      nextFireAt: 200,
    }),
    null,
  )

  assert.deepEqual(
    resolveAutoAttackShot(origin, [], {
      isInteractionBlocked: false,
      time: 1000,
      nextFireAt: 0,
    }),
    null,
  )

  assert.deepEqual(
    resolveAutoAttackShot(origin, candidates, {
      isInteractionBlocked: false,
      time: 1000,
      nextFireAt: 200,
    }),
    {
      x: 3,
      y: 4,
      directionX: 0.6,
      directionY: 0.8,
      distanceSq: 25,
    },
  )
})

test('boss trigger stays behind the final regular wave', () => {
  assert.equal(isBossWaveReady(0), false)
  assert.equal(isBossWaveReady(1), false)
  assert.equal(isBossWaveReady(2), false)
  assert.equal(isBossWaveReady(3), false)
  assert.equal(isBossWaveReady(4), true)
})

test('third wave exposes the new slime-family sample enemy', () => {
  assert.equal(getWaveByIndex(2)?.enemyId, 'spark-slime')
})

test('elite wave appears before the boss wave', () => {
  assert.equal(getWaveByIndex(3)?.enemyId, 'prism-slime')
  assert.equal(getWaveByIndex(4)?.enemyId, 'slime-boss')
})

test('codex selectors expose shared items, recipes, and enemies', () => {
  const codex = getCodexState(true)

  assert.equal(codex.isOpen, true)
  assert.equal(codex.items.length, 6)
  assert.equal(codex.recipes.length, 4)
  assert.equal(codex.enemies.length, 4)

  const arcRecipe = codex.recipes.find((recipe) => recipe.id === 'arc-loom-recipe')
  assert.deepEqual(
    arcRecipe?.inputs.map((input) => input.id),
    ['spark-knot', 'mist-bead'],
  )

  const voltSlime = codex.enemies.find((enemy) => enemy.id === 'spark-slime')
  assert.ok(voltSlime)
  assert.deepEqual(
    voltSlime?.drops.map((drop) => drop.id),
    ['spark-knot', 'mist-bead', 'frost-mote'],
  )

  const prismSlime = codex.enemies.find((enemy) => enemy.id === 'prism-slime')
  assert.ok(prismSlime)
  assert.deepEqual(
    prismSlime?.drops.map((drop) => drop.id),
    ['tuning-capsule'],
  )
})

test('elite drop table returns a tuning capsule', () => {
  assert.equal(
    resolveWeightedDrop(ENEMY_DEFINITIONS['prism-slime'].drops, () => 0),
    'tuning-capsule',
  )
})

test('tuning consumes one capsule and records a deterministic effect', () => {
  const result = resolveTuningSelection(
    {
      inventory: { 'tuning-capsule': 2 },
      ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
      tuningState: {},
    },
    'acid-sprayer',
    () => 0,
  )

  assert.ok(result)
  assert.deepEqual(result?.nextInventory, { 'tuning-capsule': 1 })
  assert.deepEqual(result?.nextTuningState, { 'acid-sprayer': 'sharpened-core' })
  assert.equal(result?.effectId, 'sharpened-core')
})

test('tuning rejects invalid selections without consuming capsules', () => {
  const state = {
    inventory: { 'tuning-capsule': 1 },
    ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    tuningState: {},
  }

  assert.equal(resolveTuningSelection(state, 'starter-blaster', () => 0), null)
  assert.equal(resolveTuningSelection(state, 'frost-lance', () => 0), null)
  assert.deepEqual(state.inventory, { 'tuning-capsule': 1 })
})

test('tuning requires a capsule and blocks rerolls', () => {
  assert.equal(
    resolveTuningSelection(
      {
        inventory: {},
        ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
        tuningState: {},
      },
      'acid-sprayer',
      () => 0,
    ),
    null,
  )

  assert.equal(
    resolveTuningSelection(
      {
        inventory: { 'tuning-capsule': 1 },
        ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
        tuningState: { 'acid-sprayer': 'quick-loader' },
      },
      'acid-sprayer',
      () => 0,
    ),
    null,
  )
})

test('tuning effect selection is deterministic from injected random source', () => {
  const baseState = {
    inventory: { 'tuning-capsule': 1 },
    ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    tuningState: {},
  }

  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 0)?.effectId, 'sharpened-core')
  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 0.34)?.effectId, 'quick-loader')
  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 0.99)?.effectId, 'stabilized-bore')
  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 1)?.effectId, 'stabilized-bore')
})

test('effective weapon stats apply each tuning without mutating base definitions', () => {
  const baseWeapon = { ...WEAPON_DEFINITIONS['acid-sprayer'] }

  assert.equal(
    deriveEffectiveWeaponStats('acid-sprayer', { 'acid-sprayer': 'sharpened-core' }).damage,
    baseWeapon.damage + 4,
  )
  assert.equal(
    deriveEffectiveWeaponStats('acid-sprayer', { 'acid-sprayer': 'quick-loader' }).fireRateMs,
    Math.round(baseWeapon.fireRateMs * 0.9),
  )
  assert.equal(
    deriveEffectiveWeaponStats('acid-sprayer', { 'acid-sprayer': 'stabilized-bore' }).projectileSpeed,
    baseWeapon.projectileSpeed + 70,
  )
  assert.deepEqual(deriveEffectiveWeaponStats('acid-sprayer', {}), WEAPON_DEFINITIONS['acid-sprayer'])
  assert.deepEqual(WEAPON_DEFINITIONS['acid-sprayer'], baseWeapon)
})

test('visual asset manifest paths exist for all external art assets', () => {
  const missingAssets = VECTOR_ASSETS.filter((asset) => {
    const assetPath = resolve(TEST_DIR, '..', 'public', asset.path)
    return !existsSync(assetPath)
  }).map((asset) => asset.path)

  assert.deepEqual(missingAssets, [])
})

test('enemy visual metadata keeps immutable gameplay geometry while adding art hooks', () => {
  assert.equal(PLAYER_COLLISION_RADIUS, 14)
  assert.equal(PROJECTILE_COLLISION_RADIUS, 5)
  assert.equal(ENEMY_CONTACT_PADDING, 16)
  assert.equal(PROJECTILE_HIT_PADDING, 7)
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(ENEMY_DEFINITIONS).map(([enemyId, enemy]) => [
        enemyId,
        {
          size: enemy.size,
          textureKey: enemy.textureKey,
          animationKey: enemy.animationKey,
        },
      ]),
    ),
    {
      slime: { size: 20, textureKey: 'slime', animationKey: 'slime-idle' },
      'spark-slime': { size: 22, textureKey: 'spark-slime', animationKey: 'spark-slime-idle' },
      'prism-slime': { size: 30, textureKey: 'spark-slime', animationKey: 'spark-slime-idle' },
      'slime-boss': { size: 44, textureKey: 'slime-boss', animationKey: 'slime-boss-idle' },
    },
  )
})

test('item and weapon visual metadata stays aligned with the external asset pass', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(ITEM_DEFINITIONS).map(([itemId, item]) => [itemId, item.textureKey]),
    ),
    {
      'gel-shard': 'gel-shard',
      'acid-core': 'acid-core',
      'frost-mote': 'frost-mote',
      'spark-knot': 'spark-knot',
      'mist-bead': 'mist-bead',
      'tuning-capsule': 'tuning-capsule',
    },
  )

  assert.deepEqual(
    Object.fromEntries(
      Object.entries(WEAPON_DEFINITIONS).map(([weaponId, weapon]) => [
        weaponId,
        {
          projectileTextureKey: weapon.projectileTextureKey,
          hudIconKey: weapon.visual.hudIconKey,
        },
      ]),
    ),
    {
      'starter-blaster': {
        projectileTextureKey: 'starter-projectile',
        hudIconKey: 'weapon-starter-blaster',
      },
      'acid-sprayer': {
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
      },
      'frost-lance': {
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
      },
      'storm-cannon': {
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
      },
      'arc-loom': {
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
      },
    },
  )
})

test('enemy health bar metrics clamp across enemy sizes', () => {
  assert.deepEqual(getEnemyHealthBarMetrics(20), {
    width: 32,
    height: 4,
    offsetY: 22,
  })

  assert.deepEqual(getEnemyHealthBarMetrics(80), {
    width: 68,
    height: 8,
    offsetY: 56,
  })
})

test('enemy health bar fill width tracks clamped health ratio', () => {
  assert.equal(getEnemyHealthFillWidth(26, 26, 32), 32)
  assert.equal(getEnemyHealthFillWidth(13, 26, 32), 16)
  assert.equal(getEnemyHealthFillWidth(0, 26, 32), 0)
  assert.equal(getEnemyHealthFillWidth(-10, 26, 32), 0)
  assert.equal(getEnemyHealthFillWidth(40, 26, 32), 32)
  assert.equal(getEnemyHealthFillWidth(5, 0, 32), 0)
})
