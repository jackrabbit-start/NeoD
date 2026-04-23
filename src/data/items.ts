import type { ItemDefinition, LootId } from '../domain/types.js'

export const ITEM_DEFINITIONS: Record<LootId, ItemDefinition> = {
  'gel-shard': {
    id: 'gel-shard',
    name: 'Gel Shard',
    description: 'A stable slime fragment used as a binding core.',
    color: 0x7dffb0,
  },
  'acid-core': {
    id: 'acid-core',
    name: 'Acid Core',
    description: 'Corrosive residue that boosts impact damage.',
    color: 0xb4ff5e,
  },
  'frost-mote': {
    id: 'frost-mote',
    name: 'Frost Mote',
    description: 'Chilled essence that sharpens projectile focus.',
    color: 0x83d5ff,
  },
}
