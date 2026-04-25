import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveCombine, getAvailableRecipes } from '../.tmp-test/src/systems/combine.js'
import { getCodexState } from '../.tmp-test/src/systems/codex.js'
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
  applyRecipeSelection,
  equipOwnedWeapon,
  getActionableRecipes,
  seedOwnedWeapons,
} from '../.tmp-test/src/systems/weaponOwnership.js'
import { getWaveByIndex, isBossWaveReady, shouldAdvanceWave } from '../.tmp-test/src/systems/waves.js'

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
    statusMessage: 'Collected Gel Shard.',
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
    statusMessage: 'That combine is no longer actionable. Choose another option.',
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
    statusMessage: 'Acid Sprayer crafted and equipped. Resume the run when ready.',
  })
})

test('inventory presenter mirrors the arena summary strings', () => {
  assert.deepEqual(describeInventoryEntries({}), ['No drops collected yet.'])
  assert.deepEqual(describeInventoryEntries({ 'gel-shard': 2 }), ['Gel Shard × 2'])
})

test('recipe presenter mirrors the actionable combine summary strings', () => {
  assert.deepEqual(describeAvailableRecipes([]), ['No actionable combine yet.'])

  const recipes = getActionableRecipes(
    {
      'gel-shard': 1,
      'acid-core': 1,
    },
    ['starter-blaster'],
  )

  assert.deepEqual(describeAvailableRecipes(recipes), [
    'Acid Sprayer → 20 dmg (Turns stable slime matter into corrosive firepower.)',
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

test('boss trigger stays behind the final regular wave', () => {
  assert.equal(isBossWaveReady(0), false)
  assert.equal(isBossWaveReady(1), false)
  assert.equal(isBossWaveReady(2), false)
  assert.equal(isBossWaveReady(3), true)
})

test('third wave exposes the new slime-family sample enemy', () => {
  assert.equal(getWaveByIndex(2)?.enemyId, 'spark-slime')
})

test('codex selectors expose shared items, recipes, and enemies', () => {
  const codex = getCodexState(true)

  assert.equal(codex.isOpen, true)
  assert.equal(codex.items.length, 5)
  assert.equal(codex.recipes.length, 4)
  assert.equal(codex.enemies.length, 3)

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
