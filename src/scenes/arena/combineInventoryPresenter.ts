import { ITEM_DEFINITIONS } from '../../data/items.js'
import type { AvailableRecipe, InventoryState, LootId } from '../../domain/types.js'

export function describeInventoryEntries(inventory: InventoryState): string[] {
  const inventoryEntries = Object.entries(inventory) as [LootId, number][]

  if (inventoryEntries.length === 0) {
    return ['No drops collected yet.']
  }

  return inventoryEntries.map(
    ([itemId, count]) => `${ITEM_DEFINITIONS[itemId].name} × ${count}`,
  )
}

export function describeAvailableRecipes(recipes: AvailableRecipe[]): string[] {
  if (recipes.length === 0) {
    return ['No actionable combine yet.']
  }

  return recipes.map(
    ({ recipe, weapon }) => `${recipe.name} → ${weapon.damage} dmg (${recipe.note})`,
  )
}
