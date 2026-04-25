export const LOOT_IDS = [
  'gel-shard',
  'acid-core',
  'frost-mote',
  'spark-knot',
  'mist-bead',
  'tuning-capsule',
] as const

export type LootId = (typeof LOOT_IDS)[number]

export const WEAPON_IDS = [
  'starter-blaster',
  'acid-sprayer',
  'frost-lance',
  'storm-cannon',
  'arc-loom',
  'spark-carbine',
  'mist-vortex',
] as const

export type WeaponId = (typeof WEAPON_IDS)[number]

export const RECIPE_IDS = [
  'acid-sprayer-recipe',
  'frost-lance-recipe',
  'storm-cannon-recipe',
  'arc-loom-recipe',
  'spark-carbine-recipe',
  'mist-vortex-recipe',
] as const

export type RecipeId = (typeof RECIPE_IDS)[number]

export const ENEMY_IDS = [
  'slime',
  'spark-slime',
  'prism-slime',
  'dash-slime',
  'orbit-slime',
  'slime-boss',
] as const

export type EnemyId = (typeof ENEMY_IDS)[number]
