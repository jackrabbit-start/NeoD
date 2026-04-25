import type { EnemyId, LootId, RecipeId, WeaponId } from '../data/contentIds.js'

export type { EnemyId, LootId, RecipeId, WeaponId } from '../data/contentIds.js'

export type EnemyAnimationKey = 'slime-idle' | 'spark-slime-idle' | 'slime-boss-idle'

export interface ItemDefinition {
  id: LootId
  name: string
  description: string
  color: number
  textureKey: string
}

export interface WeaponVisualDefinition {
  hudIconKey: string
  accentColor: number
}

export interface WeaponSingleBehavior {
  kind: 'single'
  projectileLifetimeMs: number
}

export interface WeaponSprayHazardBehavior {
  kind: 'spray-hazard'
  projectileCount: number
  spreadDegrees: number
  projectileLifetimeMs: number
  hazardRadius: number
  hazardDurationMs: number
  hazardTickMs: number
  hazardDamage: number
}

export interface WeaponPierceBehavior {
  kind: 'pierce'
  projectileLifetimeMs: number
  maxHits: number
}

export interface WeaponChainBehavior {
  kind: 'chain'
  projectileLifetimeMs: number
  maxChains: number
  chainRange: number
  chainFalloff: number
}

export type WeaponAttackBehavior =
  | WeaponSingleBehavior
  | WeaponSprayHazardBehavior
  | WeaponPierceBehavior
  | WeaponChainBehavior

export interface WeaponDefinition {
  id: WeaponId
  name: string
  description: string
  identityLabel?: string
  identityHint?: string
  damage: number
  fireRateMs: number
  projectileSpeed: number
  projectileTint: number
  projectileTextureKey: string
  attackBehavior: WeaponAttackBehavior
  visual: WeaponVisualDefinition
}

export interface RecipeDefinition {
  id: RecipeId
  name: string
  inputs: LootId[]
  outputWeaponId: WeaponId
  identityLabel: string
  identityHint: string
  note: string
}

export interface WeightedDropEntry {
  itemId: LootId
  weight: number
}

export interface EnemyVisualDefinition {
  portraitKey?: string
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
  textureKey: string
  animationKey: EnemyAnimationKey
  visual?: EnemyVisualDefinition
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
  identityLabel: string
  identityHint: string
  outputWeaponId: WeaponId
  outputWeaponName: string
  damage: number
  inputs: string[]
  outputWeaponHudIconKey?: string
  outputWeaponAccentColor?: number
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
  hudIconKey?: string
  accentColor?: number
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
  identityLabel: string
  identityHint: string
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
