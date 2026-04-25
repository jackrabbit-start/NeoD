import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import { ITEM_DEFINITIONS } from '../data/items.js'
import { RECIPE_DEFINITIONS } from '../data/recipes.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { AvailableRecipe, CodexState, InventoryState, LootId } from '../domain/types.js'

const formatWeaponSummary = (damage: number, fireRateMs: number) =>
  `피해 ${damage} · 초당 ${Math.round(1000 / fireRateMs)}발`

export function getCodexState(isOpen: boolean): CodexState {
  return {
    isOpen,
    title: '현장 코덱스',
    subtitle: '공유 데이터 보기 · Q로 닫기',
    hint: '아이템, 조합식, 슬라임 정보는 모두 현재 게임 데이터 정의를 그대로 반영합니다.',
    items: Object.values(ITEM_DEFINITIONS),
    recipes: RECIPE_DEFINITIONS.map((recipe) => {
      const weapon = WEAPON_DEFINITIONS[recipe.outputWeaponId]
      return {
        id: recipe.id,
        name: recipe.name,
        note: recipe.note,
        inputs: recipe.inputs.map((itemId) => {
          const item = ITEM_DEFINITIONS[itemId]
          return {
            id: item.id,
            name: item.name,
            color: item.color,
          }
        }),
        output: {
          id: weapon.id,
          name: weapon.name,
          description: weapon.description,
          summary: formatWeaponSummary(weapon.damage, weapon.fireRateMs),
        },
      }
    }),
    enemies: Object.values(ENEMY_DEFINITIONS).map((enemy) => ({
      id: enemy.id,
      name: enemy.name,
      description: enemy.description,
      tint: enemy.tint,
      stats: [
        `체력 ${enemy.maxHealth}`,
        `속도 ${enemy.speed}`,
        `피해 ${enemy.contactDamage}`,
      ],
      drops: (enemy.drops ?? []).map((drop) => {
        const item = ITEM_DEFINITIONS[drop.itemId]
        return {
          id: item.id,
          name: item.name,
          color: item.color,
        }
      }),
    })),
  }
}

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
    ({ recipe, weapon }) => `${recipe.name} → 피해 ${weapon.damage} (${recipe.note})`,
  )
}
