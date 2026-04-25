import { ITEM_DEFINITIONS } from '../../data/items.js'
import { getAvailableRecipes, resolveCombine } from '../../systems/combine.js'
import { addItem } from '../../systems/inventory.js'
import type { InventoryState, LootId, WeaponId } from '../../domain/types.js'

type CombineAttemptResult =
  | {
      kind: 'no-recipe'
      statusMessage: string
    }
  | {
      kind: 'invalid-combine'
      statusMessage: string
    }
  | {
      kind: 'success'
      nextInventory: InventoryState
      weaponId: WeaponId
      statusMessage: string
      shouldPauseCombat: true
    }

interface LootPickupResult {
  nextInventory: InventoryState
  statusMessage: string
}

export function attemptCombine(inventory: InventoryState): CombineAttemptResult {
  const availableRecipes = getAvailableRecipes(inventory)
  const recipe = availableRecipes[0]

  if (!recipe) {
    return {
      kind: 'no-recipe',
      statusMessage: 'No valid combine yet. Collect matching drops first.',
    }
  }

  const combineResult = resolveCombine(inventory, recipe.recipe.id)
  if (!combineResult) {
    return {
      kind: 'invalid-combine',
      statusMessage: 'Combine failed. Inventory did not match the recipe.',
    }
  }

  return {
    kind: 'success',
    nextInventory: combineResult.nextInventory,
    weaponId: combineResult.weaponId,
    statusMessage: `Combined into ${recipe.weapon.name}. Combat paused briefly to confirm the upgrade.`,
    shouldPauseCombat: true,
  }
}

export function applyLootPickup(
  inventory: InventoryState,
  itemId: LootId,
): LootPickupResult {
  return {
    nextInventory: addItem(inventory, itemId),
    statusMessage: `Collected ${ITEM_DEFINITIONS[itemId].name}.`,
  }
}
