import type { EnemyId, LootId, RecipeId, WeaponId } from '../data/contentIds.js'

export type { EnemyId, LootId, RecipeId, WeaponId } from '../data/contentIds.js'

export interface ItemDefinition {
  id: LootId
  name: string
  description: string
  color: number
}

export interface WeaponDefinition {
  id: WeaponId
  name: string
  description: string
  damage: number
  fireRateMs: number
  projectileSpeed: number
  projectileTint: number
}

export interface RecipeDefinition {
  id: RecipeId
  name: string
  inputs: LootId[]
  outputWeaponId: WeaponId
  note: string
}

export interface WeightedDropEntry {
  itemId: LootId
  weight: number
}

export interface EnemyDefinition {
  id: EnemyId
  name: string
  description: string
  maxHealth: number
  speed: number
  contactDamage: number
  score: number
  tint: number
  size: number
  textureKey: 'slime' | 'boss'
  drops?: WeightedDropEntry[]
}

export interface WaveDefinition {
  id: string
  label: string
  enemyId: EnemyId
  count: number
  spawnIntervalMs: number
  isBossWave?: boolean
}

export type InventoryState = Partial<Record<LootId, number>>

export interface AvailableRecipe {
  recipe: RecipeDefinition
  weapon: WeaponDefinition
}

export interface HudOwnedItemView {
  id: LootId
  name: string
  description: string
  count: number
}

export interface HudRecipeView {
  id: RecipeId
  name: string
  outputWeaponId: WeaponId
  outputWeaponName: string
  damage: number
  inputs: string[]
}

export interface HudOwnedWeaponView {
  id: WeaponId
  name: string
  description: string
  damage: number
  fireRateMs: number
  projectileSpeed: number
  isEquipped: boolean
  tuningLabel: string | null
  canTune: boolean
  tuneDisabledReason: string | null
}

export interface HudModalState {
  isOpen: boolean
  items: HudOwnedItemView[]
  recipes: HudRecipeView[]
  weapons: HudOwnedWeaponView[]
}

export interface HudState {
  title: string
  subtitle: string
  stats: string[]
  inventory: string[]
  recipes: string[]
  objective: string
  tip: string
  status: string
  inventoryButtonLabel: string
  inventoryButtonDisabled: boolean
  modal: HudModalState
}

export interface CodexItemEntry {
  id: LootId
  name: string
  description: string
  color: number
}

export interface CodexRecipeEntry {
  id: RecipeId
  name: string
  note: string
  inputs: Array<{
    id: LootId
    name: string
    color: number
  }>
  output: {
    id: WeaponId
    name: string
    description: string
    summary: string
  }
}

export interface CodexEnemyEntry {
  id: EnemyId
  name: string
  description: string
  tint: number
  stats: string[]
  drops: Array<{
    id: LootId
    name: string
    color: number
  }>
}

export interface CodexState {
  isOpen: boolean
  title: string
  subtitle: string
  hint: string
  items: CodexItemEntry[]
  recipes: CodexRecipeEntry[]
  enemies: CodexEnemyEntry[]
}
