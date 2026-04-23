# Investigation: Inventory-based Combine + Full Pause

## Question

How should the existing prototype spec absorb the new requirement that combination uses only inventory contents and opening inventory pauses the game?

## Facts

### Existing source-of-truth spec

From `.omx/specs/deep-interview-safe-topdown-combine-action-game.md`:

- The game is a top-down 2D real-time action game.
- Enemies drop weapons/items.
- Combining items into stronger gear is a core loop.
- Within-run growth is required.
- Weapons/items originate from enemy drop rates.

### New user-confirmed requirements from this investigation

Through OMX questioning:

1. Dropped weapons/items **automatically go into the inventory**.
2. Combination happens **only inside the inventory**.
3. Opening inventory causes a **full pause**:
   - enemy movement stops,
   - enemy attacks stop,
   - projectiles stop,
   - wave timers stop.

## Inferences

- This changes the combine interaction from an unspecified generic system into a **menu-driven crafting window**.
- Real-time combat and combination no longer compete for attention at the same moment.
- The inventory screen becomes a major game-state mode, not a minor overlay.
- Because pause is full, inventory-combine acts as a tactical planning break between active combat beats.

## Conclusion

The new requirement is **compatible** with the current game concept, but it sharpens the rules in a meaningful way:

- **loot acquisition** remains combat-driven and enemy-drop-based,
- **build shaping** moves to a paused inventory state,
- **combination** is no longer an in-field action,
- the game now has two primary modes:
  1. **active combat mode**
  2. **paused inventory/combine mode**

## Recommended Spec Delta

Add the following rules to the future planning artifact:

1. Enemy drops are collected into the inventory rather than combined directly in the field.
2. Combination recipes may only consume items currently present in inventory.
3. Opening inventory hard-pauses the simulation.
4. While paused, the player may inspect items, compare inventory contents, and run combinations.
5. Closing inventory resumes combat/wave progression from the exact frozen state.

## Suggested Acceptance Criteria Additions

- Defeated enemies add loot to inventory.
- Inventory UI can be opened during a run.
- Opening inventory hard-pauses simulation state.
- Combining inventory contents produces upgraded output and removes consumed inputs.
- Closing inventory cleanly resumes the frozen run state.

## Confidence

High for the interaction rules above, because they were directly confirmed by the user through structured OMX questioning.

## Open Questions

- Does inventory capacity exist in V1, or is it effectively unlimited?
- Can the player equip items directly from inventory, or only combine there?
- Does the inventory allow sorting/filtering in V1, or only a minimal grid/list?
- Are boss rewards also inventory-based, or do they use a special reward screen?

## Next Step

Use this investigation result plus the earlier deep-interview spec as the input to planning. The best next handoff is:

```text
$plan --consensus --direct .omx/specs/deep-interview-safe-topdown-combine-action-game.md
```

with this investigation artifact treated as a delta/clarification input.
