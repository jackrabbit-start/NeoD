import type { LootId, WeightedDropEntry } from '../domain/types.js'

export type RandomSource = () => number

export function resolveWeightedDrop(
  table: WeightedDropEntry[] | undefined,
  random: RandomSource = Math.random,
): LootId | null {
  if (!table || table.length === 0) {
    return null
  }

  const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0)

  if (totalWeight <= 0) {
    return null
  }

  let roll = random() * totalWeight

  for (const entry of table) {
    roll -= entry.weight
    if (roll <= 0) {
      return entry.itemId
    }
  }

  return table[table.length - 1]?.itemId ?? null
}
