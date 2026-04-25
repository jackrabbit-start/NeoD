export const LOOT_IDS = [
  'gel-shard',
  'acid-core',
  'frost-mote',
  'spark-knot',
  'mist-bead',
  'tuning-capsule',
  'chitin-needle',
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
  'slime-glaive',
  'prism-cutter',
  'needle-fan',
] as const

export type WeaponId = (typeof WEAPON_IDS)[number]

export const RECIPE_IDS = [
  'acid-sprayer-recipe',
  'frost-lance-recipe',
  'storm-cannon-recipe',
  'arc-loom-recipe',
  'spark-carbine-recipe',
  'mist-vortex-recipe',
  'slime-glaive-recipe',
  'prism-cutter-recipe',
  'needle-fan-recipe',
] as const

export type RecipeId = (typeof RECIPE_IDS)[number]

export const ENEMY_IDS = [
  'slime',
  'spark-slime',
  'prism-slime',
  'dash-slime',
  'orbit-slime',
  'needle-wasp',
  'splitter-slime',
  'shard-sentinel',
  'mender-slime',
  'void-orb',
  'crusher-slime',
  'lantern-moth',
  'mirror-wisp',
  'siege-toad',
  'slime-boss',
] as const

export type EnemyId = (typeof ENEMY_IDS)[number]
