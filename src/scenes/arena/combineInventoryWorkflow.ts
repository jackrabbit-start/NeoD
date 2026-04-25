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
    statusMessage: `${ITEM_DEFINITIONS[itemId].name} 획득.`,
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
      statusMessage: '해당 조합은 더 이상 실행할 수 없습니다. 다른 옵션을 선택하세요.',
    }
  }

  const weapon = WEAPON_DEFINITIONS[result.weaponId]

  return {
    kind: 'success',
    nextInventory: result.nextInventory,
    ownedWeaponIds: result.ownedWeaponIds,
    activeWeaponId: result.activeWeaponId,
    statusMessage: `${weapon.name} 제작 및 장착 완료. 준비되면 런을 다시 진행하세요.`,
  }
}
