export type LootId = 'gel-shard' | 'acid-core' | 'frost-mote'

export type WeaponId =
  | 'starter-blaster'
  | 'acid-sprayer'
  | 'frost-lance'
  | 'storm-cannon'

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
  id: string
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
  id: 'slime' | 'slime-boss'
  name: string
  maxHealth: number
  speed: number
  contactDamage: number
  score: number
  tint: number
  size: number
  drops?: WeightedDropEntry[]
}

export interface WaveDefinition {
  id: string
  label: string
  enemyId: EnemyDefinition['id']
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
  id: string
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
  isEquipped: boolean
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
