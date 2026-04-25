import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import { ITEM_DEFINITIONS } from '../data/items.js'
import { RECIPE_DEFINITIONS } from '../data/recipes.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type { CodexState } from '../domain/types.js'

const formatWeaponSummary = (damage: number, fireRateMs: number) =>
  `${damage} dmg · ${Math.round(1000 / fireRateMs)} shots/s`

export function getCodexState(isOpen: boolean): CodexState {
  return {
    isOpen,
    title: 'Field Codex',
    subtitle: 'Shared data view · Q to close',
    hint: 'Items, recipes, and slime notes all come from the live game definitions.',
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
        `HP ${enemy.maxHealth}`,
        `SPD ${enemy.speed}`,
        `DMG ${enemy.contactDamage}`,
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
