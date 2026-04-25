import { WEAPON_IDS, type WeaponId } from '../data/contentIds.js'
import type {
  AvailableRecipe,
  InventoryState,
  RecipeId,
  WeaponStack,
  WeaponStackKey,
  WeaponStar,
} from '../domain/types.js'
import { getAvailableRecipes, resolveCombine } from './combine.js'
import { MAX_WEAPON_STAR } from './pachinkoRewards.js'

export const STARTER_WEAPON_ID: WeaponId = 'starter-blaster'
export const STARTER_WEAPON_STAR: WeaponStar = 1
export const STARTER_WEAPON_STACK_KEY = createWeaponStackKey(STARTER_WEAPON_ID, STARTER_WEAPON_STAR)
export const AUTO_FUSE_STACK_COUNT = 3

export interface WeaponLoadoutState {
  inventory: InventoryState
  ownedWeaponIds: WeaponId[]
}

export interface WeaponStackLoadoutState {
  weaponStacks: WeaponStack[]
  activeWeaponKey: WeaponStackKey
}

export interface AppliedRecipeSelection {
  nextInventory: InventoryState
  ownedWeaponIds: WeaponId[]
  activeWeaponId: WeaponId
  weaponId: WeaponId
}

export interface FusionResult {
  weaponStacks: WeaponStack[]
  activeWeaponKey: WeaponStackKey
  sourceKey: WeaponStackKey
  resultKey: WeaponStackKey
  weaponId: WeaponId
  resultStar: WeaponStar
}

export interface AutoFusionResult {
  weaponStacks: WeaponStack[]
  activeWeaponKey: WeaponStackKey
  fusions: FusionResult[]
}

export function createWeaponStackKey(weaponId: WeaponId, star: WeaponStar): WeaponStackKey {
  return `${weaponId}:${star}`
}

export function parseWeaponStackKey(key: WeaponStackKey): { weaponId: WeaponId; star: WeaponStar } | null {
  const [weaponId, starText] = key.split(':')
  const star = Number(starText)
  if (!WEAPON_IDS.includes(weaponId as WeaponId) || !Number.isInteger(star) || star < 1 || star > MAX_WEAPON_STAR) {
    return null
  }

  return { weaponId: weaponId as WeaponId, star: star as WeaponStar }
}

export function seedOwnedWeapons(): WeaponId[] {
  return [STARTER_WEAPON_ID]
}

export function seedWeaponStacks(): WeaponStack[] {
  return [{ weaponId: STARTER_WEAPON_ID, star: STARTER_WEAPON_STAR, count: 1 }]
}

export function addOwnedWeapon(
  ownedWeaponIds: WeaponId[],
  weaponId: WeaponId,
): WeaponId[] {
  return ownedWeaponIds.includes(weaponId)
    ? ownedWeaponIds
    : [...ownedWeaponIds, weaponId]
}

export function getStackKey(stack: Pick<WeaponStack, 'weaponId' | 'star'>): WeaponStackKey {
  return createWeaponStackKey(stack.weaponId, stack.star)
}

export function getStackCount(weaponStacks: WeaponStack[], key: WeaponStackKey): number {
  return weaponStacks.find((stack) => getStackKey(stack) === key)?.count ?? 0
}

export function hasWeaponStack(weaponStacks: WeaponStack[], key: WeaponStackKey): boolean {
  return getStackCount(weaponStacks, key) > 0
}

export function getWeaponIdFromStackKey(key: WeaponStackKey): WeaponId {
  return parseWeaponStackKey(key)?.weaponId ?? STARTER_WEAPON_ID
}

function getWeaponOrder(weaponId: WeaponId): number {
  const index = WEAPON_IDS.indexOf(weaponId)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

export function sortWeaponStacks(
  weaponStacks: WeaponStack[],
  activeWeaponKey?: WeaponStackKey,
): WeaponStack[] {
  return [...weaponStacks]
    .filter((stack) => stack.count > 0)
    .sort((left, right) => {
      const leftKey = getStackKey(left)
      const rightKey = getStackKey(right)
      if (activeWeaponKey) {
        if (leftKey === activeWeaponKey && rightKey !== activeWeaponKey) return -1
        if (rightKey === activeWeaponKey && leftKey !== activeWeaponKey) return 1
      }
      if (right.star !== left.star) return right.star - left.star
      const orderDelta = getWeaponOrder(left.weaponId) - getWeaponOrder(right.weaponId)
      return orderDelta !== 0 ? orderDelta : leftKey.localeCompare(rightKey)
    })
}

export function resolveFallbackWeaponKey(weaponStacks: WeaponStack[]): WeaponStackKey {
  return getStackKey(sortWeaponStacks(weaponStacks)[0] ?? seedWeaponStacks()[0])
}

export function normalizeActiveWeaponKey(
  weaponStacks: WeaponStack[],
  activeWeaponKey: WeaponStackKey,
): WeaponStackKey {
  return hasWeaponStack(weaponStacks, activeWeaponKey) ? activeWeaponKey : resolveFallbackWeaponKey(weaponStacks)
}

export function addWeaponStack(
  weaponStacks: WeaponStack[],
  weaponId: WeaponId,
  star: WeaponStar,
  count = 1,
): WeaponStack[] {
  if (count <= 0) {
    return sortWeaponStacks(weaponStacks)
  }

  const key = createWeaponStackKey(weaponId, star)
  let didUpdate = false
  const nextStacks = weaponStacks.map((stack) => {
    if (getStackKey(stack) !== key) {
      return stack
    }
    didUpdate = true
    return { ...stack, count: stack.count + count }
  })

  if (!didUpdate) {
    nextStacks.push({ weaponId, star, count })
  }

  return sortWeaponStacks(nextStacks)
}

export function addWeaponStackWithAutoFusion(
  state: WeaponStackLoadoutState,
  weaponId: WeaponId,
  star: WeaponStar,
  count = 1,
): AutoFusionResult {
  let weaponStacks = addWeaponStack(state.weaponStacks, weaponId, star, count)
  let activeWeaponKey = normalizeActiveWeaponKey(weaponStacks, state.activeWeaponKey)
  const fusions: FusionResult[] = []

  let didFuse = true
  while (didFuse) {
    didFuse = false
    const fusionSource = sortWeaponStacks(weaponStacks, activeWeaponKey)
      .reverse()
      .find((stack) => stack.star < MAX_WEAPON_STAR && stack.count >= AUTO_FUSE_STACK_COUNT)

    if (!fusionSource) {
      break
    }

    const sourceKey = getStackKey(fusionSource)
    const fusion = fuseWeaponStack({ weaponStacks, activeWeaponKey }, sourceKey)
    if (!fusion) {
      break
    }

    weaponStacks = fusion.weaponStacks
    activeWeaponKey = fusion.activeWeaponKey
    fusions.push(fusion)
    didFuse = true
  }

  return {
    weaponStacks,
    activeWeaponKey: normalizeActiveWeaponKey(weaponStacks, activeWeaponKey),
    fusions,
  }
}

export function equipWeaponStack(
  weaponStacks: WeaponStack[],
  activeWeaponKey: WeaponStackKey,
  nextWeaponKey: WeaponStackKey,
): WeaponStackKey {
  return hasWeaponStack(weaponStacks, nextWeaponKey) ? nextWeaponKey : activeWeaponKey
}

export function canFuseWeaponStack(weaponStacks: WeaponStack[], key: WeaponStackKey): boolean {
  const parsed = parseWeaponStackKey(key)
  if (!parsed || parsed.star >= MAX_WEAPON_STAR) {
    return false
  }

  return getStackCount(weaponStacks, key) >= AUTO_FUSE_STACK_COUNT
}

export function fuseWeaponStack(
  state: WeaponStackLoadoutState,
  key: WeaponStackKey,
): FusionResult | null {
  const parsed = parseWeaponStackKey(key)
  if (!parsed || !canFuseWeaponStack(state.weaponStacks, key)) {
    return null
  }

  const resultStar = (parsed.star + 1) as WeaponStar
  const resultKey = createWeaponStackKey(parsed.weaponId, resultStar)
  let sourceWasDepleted = false
  const decremented = state.weaponStacks
    .map((stack) => {
      if (getStackKey(stack) !== key) {
        return stack
      }
      const nextCount = stack.count - AUTO_FUSE_STACK_COUNT
      sourceWasDepleted = nextCount <= 0
      return { ...stack, count: nextCount }
    })
    .filter((stack) => stack.count > 0)

  const weaponStacks = addWeaponStack(decremented, parsed.weaponId, resultStar, 1)
  const activeWeaponKey = state.activeWeaponKey === key && sourceWasDepleted
    ? resultKey
    : normalizeActiveWeaponKey(weaponStacks, state.activeWeaponKey)

  return {
    weaponStacks,
    activeWeaponKey,
    sourceKey: key,
    resultKey,
    weaponId: parsed.weaponId,
    resultStar,
  }
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
