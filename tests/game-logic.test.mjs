import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveCombine, getAvailableRecipes } from '../.tmp-test/src/systems/combine.js'
import { resolveWeightedDrop } from '../.tmp-test/src/systems/drop.js'
import { addItem } from '../.tmp-test/src/systems/inventory.js'
import { isBossWaveReady, shouldAdvanceWave } from '../.tmp-test/src/systems/waves.js'

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
