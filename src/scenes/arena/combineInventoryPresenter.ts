import { ITEM_DEFINITIONS } from '../../data/items.js'
import type { AvailableRecipe, InventoryState, LootId } from '../../domain/types.js'
import { getWeaponSummary } from '../../systems/weaponBehaviors.js'

export function describeInventoryEntries(inventory: InventoryState): string[] {
  const inventoryEntries = Object.entries(inventory) as [LootId, number][]

  if (inventoryEntries.length === 0) {
    return ['아직 획득한 드롭이 없습니다.']
  }

  return inventoryEntries.map(
    ([itemId, count]) => `${ITEM_DEFINITIONS[itemId].name} × ${count}`,
  )
}

export function describeAvailableRecipes(recipes: AvailableRecipe[]): string[] {
  if (recipes.length === 0) {
    return ['지금 바로 가능한 조합이 없습니다.']
  }

  return recipes.map(
    ({ recipe, weapon }) => `${recipe.name} → ${getWeaponSummary(weapon)} (${recipe.note})`,
  )
}
