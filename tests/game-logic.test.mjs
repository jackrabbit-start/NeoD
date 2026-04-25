import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveCombine, getAvailableRecipes } from '../.tmp-test/src/systems/combine.js'
import { resolveWeightedDrop } from '../.tmp-test/src/systems/drop.js'
import { addItem } from '../.tmp-test/src/systems/inventory.js'
import { isBossWaveReady, shouldAdvanceWave } from '../.tmp-test/src/systems/waves.js'
import {
  applyLootPickup,
  attemptCombine,
} from '../.tmp-test/src/scenes/arena/combineInventoryWorkflow.js'
import {
  describeAvailableRecipes,
  describeInventoryEntries,
} from '../.tmp-test/src/scenes/arena/combineInventoryPresenter.js'

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

test('invalid combine attempts do not produce upgrades', () => {
  const combined = resolveCombine({ 'gel-shard': 1 }, 'acid-sprayer-recipe')
  assert.equal(combined, null)
})

test('combine workflow reports the current no-recipe status message', () => {
  const result = attemptCombine({})

  assert.deepEqual(result, {
    kind: 'no-recipe',
    statusMessage: 'No valid combine yet. Collect matching drops first.',
  })
})

test('combine workflow returns next inventory, weapon, and pause metadata on success', () => {
  const result = attemptCombine({
    'gel-shard': 1,
    'acid-core': 1,
  })

  assert.deepEqual(result, {
    kind: 'success',
    nextInventory: {},
    weaponId: 'acid-sprayer',
    statusMessage: 'Combined into Acid Sprayer. Combat paused briefly to confirm the upgrade.',
    shouldPauseCombat: true,
  })
})

test('loot pickup workflow updates inventory and reports the pickup message', () => {
  const result = applyLootPickup({}, 'gel-shard')

  assert.deepEqual(result, {
    nextInventory: { 'gel-shard': 1 },
    statusMessage: 'Collected Gel Shard.',
  })
})

test('inventory presenter mirrors the scene inventory strings', () => {
  assert.deepEqual(describeInventoryEntries({}), ['No drops collected yet.'])
  assert.deepEqual(describeInventoryEntries({ 'gel-shard': 2 }), ['Gel Shard × 2'])
})

test('recipe presenter mirrors the scene recipe strings', () => {
  assert.deepEqual(describeAvailableRecipes([]), ['No valid combine yet.'])

  const recipes = getAvailableRecipes({
    'gel-shard': 1,
    'acid-core': 1,
  })

  assert.deepEqual(describeAvailableRecipes(recipes), [
    'Acid Sprayer → 20 dmg (Turns stable slime matter into corrosive firepower.)',
  ])
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
