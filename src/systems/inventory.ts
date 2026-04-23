import type { InventoryState, LootId } from '../domain/types.js'

export function addItem(
  inventory: InventoryState,
  itemId: LootId,
  amount = 1,
): InventoryState {
  return {
    ...inventory,
    [itemId]: (inventory[itemId] ?? 0) + amount,
  }
}

export function hasRequiredItems(
  inventory: InventoryState,
  itemIds: LootId[],
): boolean {
  const counts = new Map<LootId, number>()

  for (const itemId of itemIds) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1)
  }

  return [...counts.entries()].every(
    ([itemId, needed]) => (inventory[itemId] ?? 0) >= needed,
  )
}

export function consumeItems(
  inventory: InventoryState,
  itemIds: LootId[],
): InventoryState {
  const nextState: InventoryState = { ...inventory }

  for (const itemId of itemIds) {
    const current = nextState[itemId] ?? 0
    if (current <= 1) {
      delete nextState[itemId]
      continue
    }

    nextState[itemId] = current - 1
  }

  return nextState
}
