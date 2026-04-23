# Plan Draft — Enemy Spacing + Overhead Health Bars

## RALPLAN-DR Summary

### Principles
1. **Spacing-first readability:** if tradeoffs arise, preventing visible enemy stacking wins over health-bar polish.
2. **Small brownfield diff:** prefer scene-local changes over new systems or architectural expansion.
3. **Placeholder-safe presentation:** improve combat readability without adding art, VFX, HUD redesign, or balance changes.
4. **Data-aware, behavior-light:** reuse existing enemy size/health data before introducing new config surface.
5. **Reversible implementation:** keep changes easy to back out or tune inside the current Phaser/Vite/TS stack.

### Top Decision Drivers
1. **Primary success criterion:** enemies must no longer appear visually piled into one point during combat.
2. **Scope control:** no new dependencies; no balance/HUD/VFX/art work.
3. **Brownfield fit:** current enemy lifecycle, movement, and damage state already live in `ArenaScene`, so the plan should align with that ownership.

### Viable Options

#### Option A — Arcade-physics separation + scene-owned health bar graphics
Use Phaser Arcade overlap/collider-style enemy separation and attach per-enemy health-bar visuals managed by `ArenaScene`.

**Pros**
- Closest to current movement model (`physics.add.image`, `setCircle`, velocity updates).
- Smallest likely surface area; keeps spacing and health bars in one owner.
- Lets size-based collision radius drive separation consistently for normal enemies and boss.

**Cons**
- May require tuning bounce/push behavior to avoid jitter near the player.
- Health-bar drawing lifecycle must be cleaned up carefully with enemy destruction.

#### Option B — Manual post-move repulsion + scene-owned health bar graphics
Keep current chase movement, then apply a custom pairwise push-apart pass each update; draw health bars in the scene.

**Pros**
- Maximum control over visual spacing behavior.
- Easier to prioritize “looks separated” over strict physics behavior.

**Cons**
- More custom logic in the hot update loop.
- Higher risk of edge-case oscillation or uneven separation.
- More bespoke math to maintain than using existing Phaser physics primitives.

### Recommended Option
**Option A** — use Arcade-physics-based enemy separation plus scene-owned overhead health bars.

### Invalidation Rationale
- **Why not Option B first:** it is viable, but the repo already uses Arcade physics for enemy/player/projectile bodies, so a custom repulsion layer would add more bespoke behavior than needed for a first-pass brownfield change.
- **Why no larger refactor option:** moving enemies into a dedicated rendering/combat subsystem would exceed the requested small, reversible scope.

---

## Problem Statement
During combat, enemies currently chase the player directly and can visually collapse into the same space, making target counting and threat reading hard. Enemy health exists in state but is not shown above each enemy, so damage feedback is not immediately readable.

### Evidence
- `src/scenes/ArenaScene.ts` tracks enemies in a local `EnemyEntity[]`, moves them in `updateEnemies`, and stores `currentHealth`, but no per-enemy health-bar rendering exists.
- `spawnEnemy` uses `physics.add.image(...)` with `setCircle(config.size / 2)`, but no enemy-enemy separation behavior is visible.
- `src/data/enemies.ts` already defines `size` and `maxHealth` for both normal and boss enemies.

### Inference
- The smallest safe change is likely to remain inside `ArenaScene` and extend `EnemyEntity` with minimal render metadata rather than introducing a new UI/combat subsystem.

---

## Desired Outcome
- Enemies no longer appear stacked on top of each other while converging on the player.
- Every enemy, including the boss, shows an overhead health bar with a black background and red fill.
- Health-bar fill tracks `currentHealth / maxHealth`.
- Placeholder visuals remain intact; no art, HUD, VFX/SFX, or balance expansion is introduced.

---

## Scope

### In Scope
- First-pass enemy spacing / anti-overlap behavior during combat.
- Overhead enemy health bars for regular enemies and boss.
- Minimal supporting type/scene updates needed to create, update, and destroy those visuals.

### Out of Scope
- Enemy art or sprite imports.
- Wave pacing, enemy stats, spawn counts, or combat balance tuning.
- Player HUD redesign.
- Hit flashes, particles, sound, or other VFX/SFX work.

---

## Acceptance Criteria
1. When multiple enemies chase the player, they no longer appear fully collapsed into one point.
2. Regular enemies and the boss both display overhead health bars with black background + red health fill.
3. Health-bar width/fill updates as enemy damage is applied.
4. Enemy cleanup also removes associated health-bar visuals without leaving artifacts.
5. No new dependency is added, and no balance/HUD/VFX/art scope is expanded.

---

## Brownfield Implementation Plan

### Likely File Touchpoints
- `src/scenes/ArenaScene.ts` — primary implementation surface for enemy separation, health-bar creation/update/cleanup.
- `src/domain/types.ts` — only if a small shared type addition is needed for enemy render metadata; otherwise avoid.
- `src/data/enemies.ts` — likely read-only, unless bar sizing/offset tuning truly needs lightweight enemy-specific metadata; avoid if size-based defaults suffice.

### Plan Steps

1. **Confirm brownfield hooks and protect scope**
   - Map where enemies are spawned, moved, damaged, and destroyed in `ArenaScene`.
   - Keep the change scene-local unless inspection proves a type addition is necessary.
   - Acceptance: clear ownership for spawn/update/damage/cleanup paths is documented before implementation.

2. **Add first-pass anti-overlap strategy**
   - Introduce enemy-enemy separation using existing Arcade physics bodies/collision geometry, tuned from current `config.size`.
   - Preserve chase behavior toward the player while reducing visible pile-up.
   - Acceptance: the chosen strategy is compatible with existing `updateEnemies` movement and does not require balance changes.

3. **Add overhead health-bar lifecycle**
   - Create per-enemy bar visuals at spawn.
   - Update bar position and fill during the scene update/damage flow.
   - Destroy bar visuals when enemies die or are cleaned up.
   - Acceptance: bars exist for normal enemies and boss, follow enemy position, and reflect current health ratio.

4. **Keep the diff reversible and data-light**
   - Prefer deriving bar width/offset from existing enemy `size` and `maxHealth`.
   - Only extend shared types/data if scene-local typing becomes awkward or boss readability clearly requires a minimal explicit override.
   - Acceptance: no new dependency, no unrelated refactor, no broadened config surface without need.

5. **Verify against the scoped success criteria**
   - Run typecheck, tests, and build.
   - Do a manual browser check focused on two scenarios: clustered normal enemies and boss readability.
   - Acceptance: spacing-first behavior is visibly improved and health-bar behavior matches scope.

---

## Risks and Mitigations

### Risk 1 — Separation introduces jitter or awkward crowd motion
- **Mitigation:** prefer conservative separation tuning and judge success by “not visibly stacked,” not by perfect flocking behavior.

### Risk 2 — Health bars drift, linger, or desync on enemy destroy/cleanup
- **Mitigation:** bind bar lifecycle explicitly to spawn/update/damage/destroy paths already present in `ArenaScene`.

### Risk 3 — Scope creep into balance or presentation polish
- **Mitigation:** reject changes to enemy stats, wave data, HUD, VFX, or art unless required to satisfy a stated acceptance criterion.

### Risk 4 — Boss readability differs from regular enemies
- **Mitigation:** start from size-derived bar dimensions; only add a minimal boss-specific adjustment if manual verification shows default sizing is insufficient.

---

## Verification Plan

### Evidence-driven checks
- **Static verification:** `pnpm typecheck`
- **Regression verification:** `pnpm test`
- **Build verification:** `pnpm build`

### Manual browser checks
1. Spawn/chase scenario with multiple slimes: confirm enemies no longer visually merge into a single blob while closing on the player.
2. Damage normal enemies: confirm overhead red fill shrinks against a black background.
3. Boss encounter: confirm boss also shows a readable overhead bar and cleanup still works at death.
4. Boundary sanity: confirm no HUD layout changes, no added art/VFX/SFX, and no obvious wave/balance edits.

### Evidence vs Inference Notes
- **Evidence:** current enemy state, movement, damage, and cleanup are centralized in `ArenaScene`.
- **Inference:** manual browser checks will likely be the decisive proof for the spacing criterion, because “does not visually stack” is experiential rather than purely unit-testable.

---

## ADR

### Decision
Implement enemy anti-overlap and overhead health bars as a **small, scene-local brownfield change centered in `ArenaScene`**, using existing Phaser Arcade physics primitives where possible and deriving presentation from current enemy data.

### Drivers
- Spacing is the primary success criterion.
- Existing enemy ownership is already concentrated in the scene.
- The change must stay small, dependency-free, reversible, and placeholder-safe.

### Alternatives Considered
1. **Manual pairwise repulsion in the update loop**
   - More control, but more bespoke math and maintenance risk.
2. **Broader enemy/render subsystem extraction**
   - Cleaner long-term separation, but disproportionate to this scoped V1 brownfield change.

### Why Chosen
This approach best matches the existing architecture, minimizes diff size, and gives the highest chance of fixing visible enemy stacking without pulling new systems or scope into the repo.

### Consequences
- `ArenaScene` will take on a bit more responsibility for enemy presentation state.
- Some tuning may still be needed for collision/separation feel.
- Shared type/data changes should remain optional, not default.

### Follow-ups
- If future work expands enemy presentation, consider extracting enemy render helpers after this first-pass change proves the desired behavior.
- The deferred non-goals (art, balance, HUD, VFX/SFX) can be tracked separately without blocking this implementation.
