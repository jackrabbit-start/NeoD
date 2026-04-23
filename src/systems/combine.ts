import { RECIPE_DEFINITIONS } from '../data/recipes.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { AvailableRecipe, InventoryState, WeaponId } from '../domain/types.js'
import { consumeItems, hasRequiredItems } from './inventory.js'

export function getAvailableRecipes(
  inventory: InventoryState,
): AvailableRecipe[] {
  return RECIPE_DEFINITIONS.filter((recipe) =>
    hasRequiredItems(inventory, recipe.inputs),
  ).map((recipe) => ({
    recipe,
    weapon: WEAPON_DEFINITIONS[recipe.outputWeaponId],
  }))
}

export function resolveCombine(
  inventory: InventoryState,
  recipeId: string,
): { nextInventory: InventoryState; weaponId: WeaponId } | null {
  const recipe = RECIPE_DEFINITIONS.find((candidate) => candidate.id === recipeId)

  if (!recipe || !hasRequiredItems(inventory, recipe.inputs)) {
    return null
  }

  return {
    nextInventory: consumeItems(inventory, recipe.inputs),
    weaponId: recipe.outputWeaponId,
  }
}
