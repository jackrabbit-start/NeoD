import type { AvailableRecipe, InventoryState, RecipeId, WeaponId } from '../domain/types.js'
import { getAvailableRecipes, resolveCombine } from './combine.js'

export const STARTER_WEAPON_ID: WeaponId = 'starter-blaster'

export interface WeaponLoadoutState {
  inventory: InventoryState
  ownedWeaponIds: WeaponId[]
}

export interface AppliedRecipeSelection {
  nextInventory: InventoryState
  ownedWeaponIds: WeaponId[]
  activeWeaponId: WeaponId
  weaponId: WeaponId
}

export function seedOwnedWeapons(): WeaponId[] {
  return [STARTER_WEAPON_ID]
}

export function addOwnedWeapon(
  ownedWeaponIds: WeaponId[],
  weaponId: WeaponId,
): WeaponId[] {
  return ownedWeaponIds.includes(weaponId)
    ? ownedWeaponIds
    : [...ownedWeaponIds, weaponId]
}

export function getActionableRecipes(
  inventory: InventoryState,
  ownedWeaponIds: WeaponId[],
): AvailableRecipe[] {
  const ownedWeapons = new Set<WeaponId>(ownedWeaponIds)

  return getAvailableRecipes(inventory).filter(
    ({ recipe }) => !ownedWeapons.has(recipe.outputWeaponId),
  )
}

export function applyRecipeSelection(
  state: WeaponLoadoutState,
  recipeId: RecipeId,
): AppliedRecipeSelection | null {
  const selectedRecipe = getActionableRecipes(
    state.inventory,
    state.ownedWeaponIds,
  ).find(({ recipe }) => recipe.id === recipeId)

  if (!selectedRecipe) {
    return null
  }

  const combineResult = resolveCombine(state.inventory, recipeId)

  if (!combineResult || state.ownedWeaponIds.includes(combineResult.weaponId)) {
    return null
  }

  return {
    nextInventory: combineResult.nextInventory,
    ownedWeaponIds: addOwnedWeapon(state.ownedWeaponIds, combineResult.weaponId),
    activeWeaponId: combineResult.weaponId,
    weaponId: combineResult.weaponId,
  }
}

export function equipOwnedWeapon(
  ownedWeaponIds: WeaponId[],
  activeWeaponId: WeaponId,
  nextWeaponId: WeaponId,
): WeaponId {
  return ownedWeaponIds.includes(nextWeaponId) ? nextWeaponId : activeWeaponId
}
