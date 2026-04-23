import type { RecipeDefinition } from '../domain/types.js'

export const RECIPE_DEFINITIONS: RecipeDefinition[] = [
  {
    id: 'acid-sprayer-recipe',
    name: 'Acid Sprayer',
    inputs: ['gel-shard', 'acid-core'],
    outputWeaponId: 'acid-sprayer',
    note: 'Turns stable slime matter into corrosive firepower.',
  },
  {
    id: 'frost-lance-recipe',
    name: 'Frost Lance',
    inputs: ['gel-shard', 'frost-mote'],
    outputWeaponId: 'frost-lance',
    note: 'Channels frozen energy into a rapid precision weapon.',
  },
  {
    id: 'storm-cannon-recipe',
    name: 'Storm Cannon',
    inputs: ['acid-core', 'frost-mote'],
    outputWeaponId: 'storm-cannon',
    note: 'Combines volatile acid and frost into a stronger hybrid build.',
  },
]
