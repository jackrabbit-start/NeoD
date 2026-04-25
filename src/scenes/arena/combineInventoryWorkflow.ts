import { ITEM_DEFINITIONS } from '../../data/items.js'
import { WEAPON_DEFINITIONS } from '../../data/weapons.js'
import type { InventoryState, LootId, RecipeId, WeaponId } from '../../domain/types.js'
import { addItem } from '../../systems/inventory.js'
import {
  applyRecipeSelection,
  type WeaponLoadoutState,
} from '../../systems/weaponOwnership.js'

export interface LootPickupResult {
  nextInventory: InventoryState
  statusMessage: string
}

export type RecipeSelectionWorkflowResult =
  | {
      kind: 'not-actionable'
      statusMessage: string
    }
  | {
      kind: 'success'
      nextInventory: InventoryState
      ownedWeaponIds: WeaponId[]
      activeWeaponId: WeaponId
      statusMessage: string
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

export function applyRecipeSelectionWorkflow(
  state: WeaponLoadoutState,
  recipeId: RecipeId,
): RecipeSelectionWorkflowResult {
  const result = applyRecipeSelection(state, recipeId)

  if (!result) {
    return {
      kind: 'not-actionable',
      statusMessage: 'That combine is no longer actionable. Choose another option.',
    }
  }

  const weapon = WEAPON_DEFINITIONS[result.weaponId]

  return {
    kind: 'success',
    nextInventory: result.nextInventory,
    ownedWeaponIds: result.ownedWeaponIds,
    activeWeaponId: result.activeWeaponId,
    statusMessage: `${weapon.name} crafted and equipped. Resume the run when ready.`,
  }
}
