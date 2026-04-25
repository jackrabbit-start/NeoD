import type { EnemyId, LootId, RecipeId, WeaponId } from '../data/contentIds.js'

export type { EnemyId, LootId, RecipeId, WeaponId } from '../data/contentIds.js'

export type WeaponStar = number
export type WeaponStackKey = `${WeaponId}:${number}`

export interface WeaponStack {
  weaponId: WeaponId
  star: WeaponStar
  count: number
}

export interface PachinkoHudState {
  level: number
  totalTokenXp: number
  droppedTokens: number
  activeTokens: number
  queuedTokens: number
  isTokenInFlight: boolean
  latestReward: string | null
  synergy?: string
  enemyOdds?: string[]
}

export type EnemyAnimationKey =
  | 'slime-idle'
  | 'spark-slime-idle'
  | 'dash-slime-idle'
  | 'orbit-slime-idle'
  | 'needle-wasp-idle'
  | 'splitter-slime-idle'
  | 'shard-sentinel-idle'
  | 'mender-slime-idle'
  | 'void-orb-idle'
  | 'crusher-slime-idle'
  | 'lantern-moth-idle'
  | 'mirror-wisp-idle'
  | 'siege-toad-idle'
  | 'slime-boss-idle'

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

export interface WeaponKnockbackDefinition {
  force: number
  durationMs: number
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

export interface WeaponMeleeCleaveBehavior {
  kind: 'melee-cleave'
  range: number
  arcDegrees: number
  visualDurationMs: number
  maxTargets: number
}

export type WeaponAttackBehavior =
  | WeaponSingleBehavior
  | WeaponSprayHazardBehavior
  | WeaponPierceBehavior
  | WeaponChainBehavior
  | WeaponMeleeCleaveBehavior

export interface WeaponDefinition {
  id: WeaponId
  name: string
  description: string
  identityLabel?: string
  identityHint?: string
  range?: number
  damage: number
  fireRateMs: number
  projectileSpeed: number
  projectileTint: number
  projectileTextureKey: string
  knockback: WeaponKnockbackDefinition
  attackBehavior: WeaponAttackBehavior
  visual: WeaponVisualDefinition
  levelUpgradeLabel?: string
  levelUpgradeDescription?: string
  visualPowerTier?: number
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

export interface EnemyDirectChaseMovementBehavior {
  kind: 'direct-chase'
}

export interface EnemyOrbitMovementBehavior {
  kind: 'orbit'
  preferredDistance: number
  distanceTolerance: number
  orbitDirection: -1 | 1
}

export interface EnemyDashMovementBehavior {
  kind: 'dash'
  triggerRange: number
  chargeSpeed: number
  chargeDurationMs: number
  cooldownMs: number
}

export type EnemyMovementBehavior =
  | EnemyDirectChaseMovementBehavior
  | EnemyOrbitMovementBehavior
  | EnemyDashMovementBehavior

export interface EnemyContactAttackBehavior {
  kind: 'contact'
}

export interface EnemyTelegraphedAoeAttackBehavior {
  kind: 'telegraphed-aoe'
  cooldownMs: number
  telegraphMs: number
  radius: number
  damage: number
  range: number
  anchor: 'self' | 'player'
  tint: number
}

export interface EnemySpreadBurstAttackBehavior {
  kind: 'spread-burst'
  cooldownMs: number
  windupMs: number
  range: number
  projectileCount: number
  spreadDegrees: number
  projectileSpeed: number
  projectileLifetimeMs: number
  projectileRadius: number
  damage: number
  tint: number
  projectileTextureKey: string
}

export interface EnemyLineBeamAttackBehavior {
  kind: 'line-beam'
  cooldownMs: number
  windupMs: number
  range: number
  width: number
  damage: number
  tint: number
}

export interface EnemyRadialBurstAttackBehavior {
  kind: 'radial-burst'
  cooldownMs: number
  windupMs: number
  range: number
  projectileCount: number
  projectileSpeed: number
  projectileLifetimeMs: number
  projectileRadius: number
  damage: number
  tint: number
  projectileTextureKey: string
}

export type EnemyAttackBehavior =
  | EnemyContactAttackBehavior
  | EnemyTelegraphedAoeAttackBehavior
  | EnemySpreadBurstAttackBehavior
  | EnemyLineBeamAttackBehavior
  | EnemyRadialBurstAttackBehavior

export interface EnemyVisualDefinition {
  portraitKey?: string
}

export interface EnemyKnockbackDefinition {
  resistance: number
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
  textureKey: string
  animationKey: EnemyAnimationKey
  knockback: EnemyKnockbackDefinition
  movementBehavior: EnemyMovementBehavior
  attackBehavior: EnemyAttackBehavior
  behaviorSummary: string
  visual?: EnemyVisualDefinition
  drops?: WeightedDropEntry[]
}

export interface RunSpawnEntryDefinition {
  enemyId: EnemyId
  count: number
}

export type RunEndReason = 'boss-defeated' | 'timeout' | 'player-defeated'

export interface RunProgressionPhaseDefinition {
  id: string
  label: string
  stageIndex: number
  stageLabel: string
  minuteIndex: number
  startMs: number
  durationMs: number
  entries: RunSpawnEntryDefinition[]
  spawnIntervalMs: number
  burstSize: number
  softEnemyCap: number
  healthMultiplier: number
  oneTimeSpawns?: EnemyId[]
  isFinale?: boolean
}

export interface WaveEntryDefinition {
  enemyId: EnemyId
  count: number
}

export interface WaveDefinition {
  id: string
  label: string
  entries: WaveEntryDefinition[]
  spawnIntervalMs: number
  burstSize?: number
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
  stackKey?: WeaponStackKey
  name: string
  description: string
  star?: WeaponStar
  count?: number
  damage: number
  fireRateMs: number
  projectileSpeed: number
  levelUpgradeLabel?: string
  levelUpgradeDescription?: string
  isEquipped: boolean
  hudIconKey?: string
  accentColor?: number
}

export interface HudCharacterStatView {
  label: string
  value: string
}

export interface HudPassiveChoiceView {
  id: string
  name: string
  description: string
  effectSummary: string
  grade: 'common' | 'rare' | 'epic' | 'legendary'
  gradeLabel: string
}

export interface HudModalState {
  isOpen: boolean
  items: HudOwnedItemView[]
  recipes: HudRecipeView[]
  weapons: HudOwnedWeaponView[]
  characterStats: HudCharacterStatView[]
}

export interface HudPassiveSelectionState {
  isOpen: boolean
  level: number
  choices: HudPassiveChoiceView[]
}

export interface HudStageView {
  index: number
  label: string
  description: string
  isCurrent: boolean
  isBoss: boolean
  startElapsedMs?: number
}

export interface HudStageSelectionState {
  isOpen: boolean
  stages: HudStageView[]
}

export interface HudState {
  title: string
  subtitle: string
  currentTimeLabel?: string
  stats: string[]
  inventory: string[]
  recipes: string[]
  passives: string[]
  objective: string
  tip: string
  status: string
  inventoryButtonLabel: string
  inventoryButtonDisabled: boolean
  stageButtonLabel: string
  stageButtonDisabled: boolean
  stageSelection: HudStageSelectionState
  passiveSelection: HudPassiveSelectionState
  pachinko?: PachinkoHudState
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
