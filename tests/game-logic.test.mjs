import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
import { RUN_PROGRESS_PHASES } from '../.tmp-test/src/data/runProgression.js'
import { ITEM_DEFINITIONS } from '../.tmp-test/src/data/items.js'
import { RECIPE_DEFINITIONS } from '../.tmp-test/src/data/recipes.js'
import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import { ENEMY_IDS, LOOT_IDS, RECIPE_IDS, WEAPON_IDS } from '../.tmp-test/src/data/contentIds.js'
import { resolveCombine, getAvailableRecipes } from '../.tmp-test/src/systems/combine.js'
import { getCodexState } from '../.tmp-test/src/systems/codex.js'
import { CodexController } from '../.tmp-test/src/ui/Codex.js'
import { COMBAT_RECT, ENEMY_CONTACT_PADDING, PACHINKO_DIVIDER_X, PACHINKO_RECT, PLAYER_COLLISION_RADIUS, PROJECTILE_COLLISION_RADIUS, PROJECTILE_HIT_PADDING, clampPointToRect, isPointInsideRect } from '../.tmp-test/src/game/combatGeometry.js'
import { VECTOR_ASSETS } from '../.tmp-test/src/game/visualManifest.js'
import { resolveWeightedDrop } from '../.tmp-test/src/systems/drop.js'
import { getEnemyHealthBarMetrics, getEnemyHealthFillWidth } from '../.tmp-test/src/systems/enemyHealthBar.js'
import {
  getPlayerExperienceFillWidth,
  getPlayerHealthBarMetrics,
  getPlayerHealthFillWidth,
} from '../.tmp-test/src/systems/playerHealthBar.js'
import { addItem } from '../.tmp-test/src/systems/inventory.js'
import {
  getLootAttractionStep,
  getLootAttractionTravelDistance,
  getLootPickupPhase,
  LOOT_ATTRACTION_RADIUS,
  LOOT_COLLECT_RADIUS,
  LEGACY_LOOT_PICKUP_DISTANCE,
} from '../.tmp-test/src/systems/lootPickup.js'
import {
  AMBIENT_ITEM_RADIUS,
  ARENA_WORLD_BOUNDS,
  ENEMY_SPAWN_MIN_DISTANCE,
  HEART_ITEM_RADIUS,
  MAGNET_ITEM_RADIUS,
  PLAYER_SAFE_RADIUS,
  createMapLayout,
  getAmbientItemSpawnPoints,
  getHeartItemSpawnPoints,
  getMagnetItemSpawnPoints,
  getWorldCenter,
  isCircleClearOfObstacles,
  isPointWithinWorld,
  selectAmbientItemSpawnPoint,
  selectHeartItemSpawnPoint,
  selectMagnetItemSpawnPoint,
  selectEnemySpawnPoint,
} from '../.tmp-test/src/systems/mapLayout.js'
import {
  HEART_PICKUP_HEAL_AMOUNT,
  HEART_PICKUP_INITIAL_DELAY_MS,
  HEART_PICKUP_INTERVAL_MS,
  HEART_PICKUP_MAX_ACTIVE,
  HEART_PICKUP_TEXTURE_KEY,
  getHealedPlayerHealth,
  getInitialHeartPickupSpawnAt,
  getNextHeartPickupSpawnAt,
  shouldSpawnHeartPickup,
} from '../.tmp-test/src/systems/healthPickups.js'
import {
  MAGNET_PICKUP_ATTRACTION_RADIUS,
  MAGNET_PICKUP_DURATION_MS,
  MAGNET_PICKUP_INITIAL_DELAY_MS,
  MAGNET_PICKUP_INTERVAL_MS,
  MAGNET_PICKUP_MAX_ACTIVE,
  getInitialMagnetPickupSpawnAt,
  getMagnetizedUntil,
  getNextMagnetPickupSpawnAt,
  isMagnetActive,
  shouldSpawnMagnetPickup,
} from '../.tmp-test/src/systems/magnetPickups.js'
import {
  getTopRightMiniMapBounds,
  projectWorldPointToMiniMap,
  projectWorldRectToMiniMap,
} from '../.tmp-test/src/systems/minimap.js'
import { createInitialArenaRunState } from '../.tmp-test/src/systems/runState.js'
import {
  describeAvailableRecipes,
  describeInventoryEntries,
} from '../.tmp-test/src/scenes/arena/combineInventoryPresenter.js'
import {
  applyLootPickup,
  applyRecipeSelectionWorkflow,
} from '../.tmp-test/src/scenes/arena/combineInventoryWorkflow.js'
import {
  deriveEffectiveWeaponStats,
  resolveTuningSelection,
} from '../.tmp-test/src/systems/tuning.js'
import {
  BASE_PLAYER_MAX_HEALTH,
  PLAYER_DAMAGE_MULTIPLIER_PER_LEVEL,
  PLAYER_HEALTH_PER_LEVEL,
  getPlayerLevelCombatStats,
} from '../.tmp-test/src/systems/playerScaling.js'
import { buildAttackPlan, getWeaponAttackRange } from '../.tmp-test/src/systems/weaponBehaviors.js'
import {
  STARTER_WEAPON_STACK_KEY,
  addWeaponStack,
  addWeaponStackWithAutoFusion,
  applyRecipeSelection,
  canFuseWeaponStack,
  createWeaponStackKey,
  equipOwnedWeapon,
  equipWeaponStack,
  formatWeaponStarLabel,
  getWeaponStarHopeDescription,
  fuseWeaponStack,
  getActionableRecipes,
  seedOwnedWeapons,
  seedWeaponStacks,
} from '../.tmp-test/src/systems/weaponOwnership.js'
import {
  resolveAutoAttackShot,
  resolveNearestAutoAttackTarget,
} from '../.tmp-test/src/scenes/arena/autoAttack.js'
import {
  createEnemyRuntimeState,
  resolveEnemyVelocity,
  resolveEnemyVelocityStep,
} from '../.tmp-test/src/systems/enemyBehaviors.js'
import {
  flattenWaveEntries,
  getBossEnemyId,
  getDefeatedEnemyRunOutcome,
  getWaveByIndex,
  getWaveSpawnCount,
  getWaveSpawnSequence,
  isBossEnemyId,
  isBossWaveReady,
} from '../.tmp-test/src/systems/waves.js'
import {
  getStageSelectionStartElapsedMs,
  getStageSelectionViews,
} from '../.tmp-test/src/systems/stageSelection.js'
import {
  FINAL_STAGE_START_MS,
  RUN_DURATION_MS,
  flattenRunPhaseEntries,
  formatRunTime,
  getRunEnemySpawnChanceRows,
  getRunPhaseByElapsedMs,
  getRunSpawnCapacity,
  getUnknownRunEnemyIds,
  isFinaleActive,
  isRunTimedOut,
} from '../.tmp-test/src/systems/runProgression.js'
import {
  createRunResultHudState,
  createRunResultPresentation,
} from '../.tmp-test/src/systems/runResult.js'
import {
  PACHINKO_FEVER_CHARGE_MAX,
  PACHINKO_FEVER_DURATION_TOKENS,
  PACHINKO_PITY_THRESHOLD,
  DOUBLE_TOKEN_DROP_START_MS,
  PACHINKO_STAR_20_TARGET_TOKEN_XP,
  RARE_TOKEN_XP_MULTIPLIER,
  ENEMY_TOKEN_DROP_BASE_COUNT,
  MAX_ACTIVE_PACHINKO_TOKENS,
  PACHINKO_SLOT_COUNT,
  PACHINKO_LEVEL_THRESHOLDS,
  PACHINKO_REWARD_TABLE_REFRESH_MS,
  PACHINKO_TOKEN_LAUNCH_INTERVAL_MS,
  STAR_ODDS_BY_LEVEL,
  applyEnemyPachinkoTokenProgress,
  applyPachinkoMomentumState,
  applyPachinkoSlotModifier,
  buildPachinkoSlotModifiers,
  buildPachinkoSlotRewards,
  canLaunchPachinkoToken,
  createInitialPachinkoMomentumState,
  getEnemyPachinkoTokenDropCount,
  getPachinkoRewardTableSeed,
  getPachinkoRewardLevel,
  getPachinkoStarRangeForPlayerLevel,
  getPachinkoStarRangeForTokenXp,
  getPachinkoMomentumLabel,
  getPachinkoWeaponFamily,
  getPachinkoWeaponFamilyLabel,
  getPachinkoWeaponSynergySummary,
  getTokenXpForEnemy,
  isPachinkoFeverActive,
  resolvePachinkoLandingReward,
  resolvePachinkoReward,
  resolveEnemyPachinkoTokenXpMultiplier,
  resolvePachinkoSlotIndex,
  resolvePachinkoSlotReward,
  resolveStarForLevel,
  resolveWeaponReward,
  shouldEnemyGrantPachinkoToken,
} from '../.tmp-test/src/systems/pachinkoRewards.js'
import {
  ENEMY_PLAYER_XP,
  PLAYER_LEVEL_XP_THRESHOLDS,
  applyEnemyPlayerXp,
  applyPlayerXp,
  createInitialPlayerProgressionState,
  getPlayerLevelForXp,
  getPlayerProgressionView,
  getPlayerXpForEnemy,
} from '../.tmp-test/src/systems/playerProgression.js'
import { HudController } from '../.tmp-test/src/ui/Hud.js'
import { GAME_HEADER_CONTROL_HINTS, GAMEPLAY_CONTROL_TIP, GAME_TITLE, KIM_COMMUNITY_NARRATIONS } from '../.tmp-test/src/ui/controlCopy.js'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))

test('weighted drops only return configured loot ids', () => {
  const result = resolveWeightedDrop(
    [
      { itemId: 'gel-shard', weight: 5 },
      { itemId: 'acid-core', weight: 3 },
      { itemId: 'frost-mote', weight: 2 },
    ],
    () => 0.62,
  )

  assert.equal(result, 'acid-core')
})

test('combine resolves only when the required inputs exist', () => {
  let inventory = {}
  inventory = addItem(inventory, 'gel-shard')
  inventory = addItem(inventory, 'acid-core')

  const availableRecipes = getAvailableRecipes(inventory)
  assert.equal(availableRecipes.length, 1)
  assert.equal(availableRecipes[0]?.recipe.id, 'acid-sprayer-recipe')

  const combined = resolveCombine(inventory, 'acid-sprayer-recipe')
  assert.ok(combined)
  assert.equal(combined?.weaponId, 'acid-sprayer')
  assert.deepEqual(combined?.nextInventory, {})
})

test('new arc recipe resolves from the new sample drops', () => {
  let inventory = {}
  inventory = addItem(inventory, 'spark-knot')
  inventory = addItem(inventory, 'mist-bead')

  const availableRecipes = getAvailableRecipes(inventory)
  assert.equal(availableRecipes.length, 1)
  assert.equal(availableRecipes[0]?.recipe.id, 'arc-loom-recipe')

  const combined = resolveCombine(inventory, 'arc-loom-recipe')
  assert.ok(combined)
  assert.equal(combined?.weaponId, 'arc-loom')
  assert.deepEqual(combined?.nextInventory, {})
})

test('spark carbine recipe resolves from existing gel and spark drops', () => {
  let inventory = {}
  inventory = addItem(inventory, 'gel-shard')
  inventory = addItem(inventory, 'spark-knot')

  const availableRecipes = getAvailableRecipes(inventory)
  assert.ok(availableRecipes.some(({ recipe }) => recipe.id === 'spark-carbine-recipe'))

  const actionableRecipes = getActionableRecipes(inventory, ['starter-blaster'])
  assert.ok(actionableRecipes.some(({ recipe }) => recipe.id === 'spark-carbine-recipe'))

  const combined = resolveCombine(inventory, 'spark-carbine-recipe')
  assert.ok(combined)
  assert.equal(combined?.weaponId, 'spark-carbine')
  assert.deepEqual(combined?.nextInventory, {})
})

test('mist vortex recipe resolves from existing frost and mist drops', () => {
  let inventory = {}
  inventory = addItem(inventory, 'frost-mote')
  inventory = addItem(inventory, 'mist-bead')

  const availableRecipes = getAvailableRecipes(inventory)
  assert.ok(availableRecipes.some(({ recipe }) => recipe.id === 'mist-vortex-recipe'))

  const actionableRecipes = getActionableRecipes(inventory, ['starter-blaster'])
  assert.ok(actionableRecipes.some(({ recipe }) => recipe.id === 'mist-vortex-recipe'))

  const combined = resolveCombine(inventory, 'mist-vortex-recipe')
  assert.ok(combined)
  assert.equal(combined?.weaponId, 'mist-vortex')
  assert.deepEqual(combined?.nextInventory, {})
})

test('melee weapon recipes resolve from unused material pairings', () => {
  const glaiveInventory = addItem(addItem({}, 'acid-core'), 'spark-knot')
  const cutterInventory = addItem(addItem({}, 'acid-core'), 'mist-bead')

  assert.ok(getAvailableRecipes(glaiveInventory).some(({ recipe }) => recipe.id === 'slime-glaive-recipe'))
  assert.ok(getAvailableRecipes(cutterInventory).some(({ recipe }) => recipe.id === 'prism-cutter-recipe'))
  assert.equal(resolveCombine(glaiveInventory, 'slime-glaive-recipe')?.weaponId, 'slime-glaive')
  assert.equal(resolveCombine(cutterInventory, 'prism-cutter-recipe')?.weaponId, 'prism-cutter')
})

test('needle fan recipe resolves from insect loot and spark drops', () => {
  let inventory = {}
  inventory = addItem(inventory, 'chitin-needle')
  inventory = addItem(inventory, 'spark-knot')

  const availableRecipes = getAvailableRecipes(inventory)
  assert.ok(availableRecipes.some(({ recipe }) => recipe.id === 'needle-fan-recipe'))

  const actionableRecipes = getActionableRecipes(inventory, ['starter-blaster'])
  assert.ok(actionableRecipes.some(({ recipe }) => recipe.id === 'needle-fan-recipe'))

  const combined = resolveCombine(inventory, 'needle-fan-recipe')
  assert.ok(combined)
  assert.equal(combined?.weaponId, 'needle-fan')
  assert.deepEqual(combined?.nextInventory, {})
})

test('invalid combine attempts do not produce upgrades', () => {
  const combined = resolveCombine({ 'gel-shard': 1 }, 'acid-sprayer-recipe')
  assert.equal(combined, null)
})

test('loot pickup phase uses a forgiving collect radius and attraction band', () => {
  assert.equal(LOOT_COLLECT_RADIUS > LEGACY_LOOT_PICKUP_DISTANCE, true)
  assert.equal(LOOT_ATTRACTION_RADIUS > LOOT_COLLECT_RADIUS, true)

  assert.equal(getLootPickupPhase(LOOT_ATTRACTION_RADIUS + 0.01), 'idle')
  assert.equal(getLootPickupPhase(LOOT_ATTRACTION_RADIUS), 'attract')
  assert.equal(getLootPickupPhase(LOOT_COLLECT_RADIUS + 0.01), 'attract')
  assert.equal(getLootPickupPhase(LOOT_COLLECT_RADIUS), 'collect')
  assert.equal(getLootPickupPhase(Number.POSITIVE_INFINITY), 'idle')
  assert.equal(getLootPickupPhase(MAGNET_PICKUP_ATTRACTION_RADIUS, MAGNET_PICKUP_ATTRACTION_RADIUS), 'attract')
  assert.equal(getLootPickupPhase(MAGNET_PICKUP_ATTRACTION_RADIUS + 1, MAGNET_PICKUP_ATTRACTION_RADIUS), 'idle')
})

test('loot attraction step is bounded to the attraction phase', () => {
  assert.equal(getLootAttractionStep(LOOT_ATTRACTION_RADIUS + 1, 16), 0)
  assert.equal(getLootAttractionStep(LOOT_COLLECT_RADIUS, 16), 0)
  assert.equal(getLootAttractionStep((LOOT_ATTRACTION_RADIUS + LOOT_COLLECT_RADIUS) / 2, 16) > 0, true)
  assert.equal(getLootAttractionStep((LOOT_ATTRACTION_RADIUS + LOOT_COLLECT_RADIUS) / 2, -16), 0)
  assert.equal(getLootAttractionStep(MAGNET_PICKUP_ATTRACTION_RADIUS - 1, 16, MAGNET_PICKUP_ATTRACTION_RADIUS) > 0, true)
  assert.equal(
    getLootAttractionTravelDistance(LOOT_COLLECT_RADIUS + 0.5, 16),
    1.5,
  )
  assert.equal(getLootPickupPhase(LOOT_COLLECT_RADIUS - 0.5), 'collect')
})

test('loot pickup workflow updates inventory and reports the pickup message', () => {
  const result = applyLootPickup({}, 'gel-shard')

  assert.deepEqual(result, {
    nextInventory: { 'gel-shard': 1 },
    statusMessage: '젤 파편 획득.',
  })
})

test('recipe selection workflow reports the current not-actionable status message', () => {
  const result = applyRecipeSelectionWorkflow(
    {
      inventory: {},
      ownedWeaponIds: ['starter-blaster'],
    },
    'acid-sprayer-recipe',
  )

  assert.deepEqual(result, {
    kind: 'not-actionable',
    statusMessage: '해당 조합은 더 이상 실행할 수 없습니다. 다른 옵션을 선택하세요.',
  })
})

test('recipe selection workflow returns the equipped upgrade state on success', () => {
  const result = applyRecipeSelectionWorkflow(
    {
      inventory: {
        'gel-shard': 1,
        'acid-core': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'acid-sprayer-recipe',
  )

  assert.deepEqual(result, {
    kind: 'success',
    nextInventory: {},
    ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    activeWeaponId: 'acid-sprayer',
    statusMessage: '술먹고 난 토 제작 및 장착 완료. 준비되면 런을 다시 진행하세요.',
  })
})

test('inventory presenter mirrors the arena summary strings', () => {
  assert.deepEqual(describeInventoryEntries({}), ['아직 획득한 드롭이 없습니다.'])
  assert.deepEqual(describeInventoryEntries({ 'gel-shard': 2 }), ['젤 파편 × 2'])
})

test('new arena runs start from the clean baseline state', () => {
  const state = createInitialArenaRunState()

  assert.deepEqual(state.inventory, {})
  assert.deepEqual(state.ownedWeaponIds, ['starter-blaster'])
  assert.equal(state.activeWeaponId, 'starter-blaster')
  assert.deepEqual(state.tuningState, {})
  assert.deepEqual(state.weaponStacks, [{ weaponId: 'starter-blaster', star: 1, count: 1 }])
  assert.equal(state.activeWeaponKey, STARTER_WEAPON_STACK_KEY)
  assert.equal(state.pachinkoTokenXp, 0)
  assert.deepEqual(state.playerProgression, { totalXp: 0, level: 1 })
  assert.equal(state.isInventoryOpen, false)
  assert.equal(state.isCodexOpen, false)
  assert.equal(state.isRunEnding, false)
  assert.equal(state.playerHealth, 100)
  assert.equal(state.playerMaxHealth, 100)
  assert.equal(state.playerSpeed, 220)
  assert.equal(state.nextFireAt, 0)
  assert.equal(state.runElapsedMs, 0)
  assert.equal(state.currentStageIndex, 0)
  assert.equal(state.activeRunLabel, '')
  assert.equal(state.activeEnemySoftCap, 0)
  assert.equal(state.isFinaleActive, false)
  assert.equal(state.lastPlayerHitAt, 0)
  assert.equal(state.nextEnemyRuntimeId, 1)
})

test('new arena run state does not reuse mutable containers', () => {
  const first = createInitialArenaRunState()
  first.inventory['gel-shard'] = 2
  first.ownedWeaponIds.push('acid-sprayer')
  first.tuningState['acid-sprayer'] = 'sharpened-core'
  first.weaponStacks[0].count = 99
  first.playerProgression.totalXp = 99
  first.playerProgression.level = 5

  const second = createInitialArenaRunState()

  assert.deepEqual(second.inventory, {})
  assert.deepEqual(second.ownedWeaponIds, ['starter-blaster'])
  assert.deepEqual(second.tuningState, {})
  assert.deepEqual(second.weaponStacks, [{ weaponId: 'starter-blaster', star: 1, count: 1 }])
  assert.deepEqual(second.playerProgression, { totalXp: 0, level: 1 })
})

test('pachinko reward levels and enemy token xp follow the approved thresholds', () => {
  assert.deepEqual(PACHINKO_LEVEL_THRESHOLDS, [0, 1200, 3000, 5600, 9200])
  assert.deepEqual(STAR_ODDS_BY_LEVEL[1], [70, 25, 5, 0, 0])
  assert.deepEqual(STAR_ODDS_BY_LEVEL[5], [20, 30, 30, 15, 5])

  assert.equal(getTokenXpForEnemy('slime'), 60)
  assert.equal(getTokenXpForEnemy('spark-slime'), 90)
  assert.equal(getTokenXpForEnemy('dash-slime'), 80)
  assert.equal(getTokenXpForEnemy('orbit-slime'), 90)
  assert.equal(getTokenXpForEnemy('prism-slime'), 180)
  assert.equal(getTokenXpForEnemy('lantern-moth'), 130)
  assert.equal(getTokenXpForEnemy('mirror-wisp'), 140)
  assert.equal(getTokenXpForEnemy('siege-toad'), 220)
  assert.equal(getTokenXpForEnemy('slime-boss'), 0)
  assert.equal(shouldEnemyGrantPachinkoToken('slime'), true)
  assert.equal(shouldEnemyGrantPachinkoToken('slime-boss'), false)

  assert.equal(getPachinkoRewardLevel(0), 1)
  assert.equal(getPachinkoRewardLevel(1100), 1)
  assert.equal(getPachinkoRewardLevel(1200), 2)
  assert.equal(getPachinkoRewardLevel(3000), 3)
  assert.equal(getPachinkoRewardLevel(5600), 4)
  assert.equal(getPachinkoRewardLevel(9200), 5)
  assert.equal(getPachinkoRewardLevel(99900), 5)
})

test('pachinko reward resolution keeps weapon random and star odds deterministic', () => {
  assert.equal(resolveWeaponReward(() => 0), 'starter-blaster')
  assert.equal(resolveWeaponReward(() => 0.999), 'needle-fan')
  assert.equal(resolveStarForLevel(1, () => 0.69), 1)
  assert.equal(resolveStarForLevel(1, () => 0.70), 1)
  assert.equal(resolveStarForLevel(1, () => 0.74), 2)
  assert.equal(resolveStarForLevel(5, () => 0.99, { minStar: 1, maxStar: 5 }), 5)
  assert.equal(resolveStarForLevel(5, () => 0.99), 2)

  const rolls = [0.12, 0.99]
  assert.deepEqual(resolvePachinkoReward(4, () => rolls.shift()), {
    weaponId: 'acid-sprayer',
    star: 2,
  })
})

test('player level raises pachinko star range before live table rolls stars', () => {
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(1), { minStar: 1, maxStar: 2 })
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(5), { minStar: 1, maxStar: 3 })
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(9), { minStar: 2, maxStar: 4 })
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(17), { minStar: 3, maxStar: 6 })
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(25), { minStar: 4, maxStar: 8 })
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(33), { minStar: 5, maxStar: 10 })
  assert.deepEqual(getPachinkoStarRangeForTokenXp(PACHINKO_STAR_20_TARGET_TOKEN_XP, 1), { minStar: 16, maxStar: 20 })

  const lowLevelStars = buildPachinkoSlotRewards(4200, PACHINKO_SLOT_COUNT, 0, 1).map((slot) => slot.star)
  const midLevelStars = buildPachinkoSlotRewards(1200, PACHINKO_SLOT_COUNT, 0, 9).map((slot) => slot.star)
  const highLevelStars = buildPachinkoSlotRewards(0, PACHINKO_SLOT_COUNT, 0, 25).map((slot) => slot.star)

  assert.equal(Math.min(...lowLevelStars), 1)
  assert.equal(Math.max(...lowLevelStars), 2)
  assert.equal(Math.min(...midLevelStars), 2)
  assert.equal(Math.max(...midLevelStars), 4)
  assert.equal(Math.min(...highLevelStars), 4)
  assert.equal(Math.max(...highLevelStars), 5)
})

test('enemy token drops scale by time while rare tokens can appear before the late double-drop mark', () => {
  assert.equal(ENEMY_TOKEN_DROP_BASE_COUNT.slime, 1)
  assert.equal(ENEMY_TOKEN_DROP_BASE_COUNT['needle-wasp'], 2)
  assert.equal(ENEMY_TOKEN_DROP_BASE_COUNT['prism-slime'], 3)
  assert.equal(ENEMY_TOKEN_DROP_BASE_COUNT['siege-toad'], 4)
  assert.equal(getEnemyPachinkoTokenDropCount('slime', DOUBLE_TOKEN_DROP_START_MS - 1), 1)
  assert.equal(getEnemyPachinkoTokenDropCount('needle-wasp', DOUBLE_TOKEN_DROP_START_MS - 1), 2)
  assert.equal(getEnemyPachinkoTokenDropCount('prism-slime', DOUBLE_TOKEN_DROP_START_MS - 1), 3)
  assert.equal(getEnemyPachinkoTokenDropCount('siege-toad', DOUBLE_TOKEN_DROP_START_MS - 1), 4)
  assert.equal(getEnemyPachinkoTokenDropCount('slime', DOUBLE_TOKEN_DROP_START_MS), 2)
  assert.equal(getEnemyPachinkoTokenDropCount('needle-wasp', 16 * 60_000), 4)
  assert.equal(getEnemyPachinkoTokenDropCount('prism-slime', 18 * 60_000), 6)
  assert.equal(getEnemyPachinkoTokenDropCount('siege-toad', 20 * 60_000), 7)
  assert.equal(getEnemyPachinkoTokenDropCount('slime-boss', DOUBLE_TOKEN_DROP_START_MS), 0)
  assert.equal(resolveEnemyPachinkoTokenXpMultiplier(() => 0), RARE_TOKEN_XP_MULTIPLIER)
  assert.equal(resolveEnemyPachinkoTokenXpMultiplier(() => 0.99), 1)
  assert.equal(resolveEnemyPachinkoTokenXpMultiplier(() => 0.04, 13 * 60_000), RARE_TOKEN_XP_MULTIPLIER)
  assert.equal(resolveEnemyPachinkoTokenXpMultiplier(() => 0.07, 18 * 60_000), RARE_TOKEN_XP_MULTIPLIER)

  const earlyRareProgress = applyEnemyPachinkoTokenProgress({ totalTokenXp: 0, queuedTokenXp: [] }, 'needle-wasp', RARE_TOKEN_XP_MULTIPLIER)
  assert.equal(earlyRareProgress.grantedTokenXp, getTokenXpForEnemy('needle-wasp') * RARE_TOKEN_XP_MULTIPLIER)
})

test('enemy defeat token progress feeds the same landing reward resolver as the scene', () => {
  let progress = { totalTokenXp: 0, queuedTokenXp: [] }
  progress = applyEnemyPachinkoTokenProgress(progress, 'slime')
  assert.deepEqual(progress, {
    totalTokenXp: 60,
    queuedTokenXp: [60],
    grantedTokenXp: 60,
    didEnqueue: true,
    rewardLevel: 1,
  })

  progress = applyEnemyPachinkoTokenProgress(progress, 'prism-slime')
  assert.deepEqual(progress.queuedTokenXp, [60, 180])
  assert.equal(progress.totalTokenXp, 240)
  assert.equal(progress.rewardLevel, 1)

  const boostedProgress = applyEnemyPachinkoTokenProgress(progress, 'mender-slime', 1.5)
  assert.equal(boostedProgress.grantedTokenXp, 150)
  assert.deepEqual(boostedProgress.queuedTokenXp, [60, 180, 150])
  assert.equal(boostedProgress.totalTokenXp, 390)

  const bossProgress = applyEnemyPachinkoTokenProgress(progress, 'slime-boss')
  assert.deepEqual(bossProgress, {
    ...progress,
    grantedTokenXp: 0,
    didEnqueue: false,
    rewardLevel: 1,
  })

  const landingSeed = 7
  const playerLevel = 17
  const visibleLandingSlot = resolvePachinkoSlotReward(4200, 0.999, PACHINKO_SLOT_COUNT, landingSeed, playerLevel)
  assert.deepEqual(resolvePachinkoLandingReward(4200, 0.999, landingSeed, playerLevel), {
    weaponId: visibleLandingSlot.weaponId,
    star: visibleLandingSlot.star,
  })
})

test('player progression starts per run and levels from token pickup xp', () => {
  assert.deepEqual(PLAYER_LEVEL_XP_THRESHOLDS, [0, 900, 2200, 4200, 7000])
  assert.deepEqual(ENEMY_PLAYER_XP, {
    slime: 60,
    'spark-slime': 90,
    'prism-slime': 180,
    'dash-slime': 80,
    'orbit-slime': 90,
    'needle-wasp': 120,
    'splitter-slime': 90,
    'shard-sentinel': 130,
    'mender-slime': 100,
    'void-orb': 140,
    'crusher-slime': 170,
    'lantern-moth': 130,
    'mirror-wisp': 140,
    'siege-toad': 220,
    'slime-boss': 0,
  })

  const initial = createInitialPlayerProgressionState()
  assert.deepEqual(initial, { totalXp: 0, level: 1 })
  assert.deepEqual(createInitialArenaRunState().playerProgression, initial)

  assert.equal(getPlayerXpForEnemy('slime'), 60)
  assert.equal(getPlayerXpForEnemy('prism-slime'), 180)
  assert.equal(getPlayerXpForEnemy('slime-boss'), 0)
  assert.equal(getPlayerLevelForXp(0), 1)
  assert.equal(getPlayerLevelForXp(800), 1)
  assert.equal(getPlayerLevelForXp(900), 2)
  assert.equal(getPlayerLevelForXp(2200), 3)
  assert.equal(getPlayerLevelForXp(7000), 5)
  assert.equal(getPlayerLevelForXp(10300), 6)
  assert.equal(getPlayerLevelForXp(99900), 30)
  assert.equal(getPlayerLevelForXp(240000), 50)
  assert.equal(getPlayerLevelForXp(340000), 60)

  const firstTokenPickup = applyEnemyPlayerXp(initial, 'prism-slime')
  assert.deepEqual(firstTokenPickup.state, { totalXp: 180, level: 1 })
  assert.equal(firstTokenPickup.grantedXp, 180)
  assert.equal(firstTokenPickup.didLevelUp, false)
  assert.equal(firstTokenPickup.view.xpIntoLevel, 180)
  assert.equal(firstTokenPickup.view.xpToNextLevel, 900)

  const nextTokenPickup = applyEnemyPlayerXp(firstTokenPickup.state, 'needle-wasp')
  assert.deepEqual(nextTokenPickup.state, { totalXp: 300, level: 1 })
  assert.equal(nextTokenPickup.didLevelUp, false)
  assert.equal(nextTokenPickup.view.xpIntoLevel, 300)
  assert.equal(nextTokenPickup.view.progressRatio, 300 / 900)

  const bossTokenPickup = applyEnemyPlayerXp(nextTokenPickup.state, 'slime-boss')
  assert.deepEqual(bossTokenPickup.state, nextTokenPickup.state)
  assert.equal(bossTokenPickup.grantedXp, 0)
  assert.equal(bossTokenPickup.didLevelUp, false)
})

test('player progression view clamps invalid xp and continues past seeded levels', () => {
  assert.deepEqual(getPlayerProgressionView(-5), {
    totalXp: 0,
    level: 1,
    currentLevelXp: 0,
    xpIntoLevel: 0,
    xpToNextLevel: 900,
    nextLevelAt: 900,
    progressRatio: 0,
    isMaxLevel: false,
  })

  assert.deepEqual(getPlayerProgressionView(10000), {
    totalXp: 10000,
    level: 6,
    currentLevelXp: 9825,
    xpIntoLevel: 175,
    xpToNextLevel: 2855,
    nextLevelAt: 12680,
    progressRatio: 175 / 2855,
    isMaxLevel: false,
  })

  assert.deepEqual(getPlayerProgressionView(99900), {
    totalXp: 99900,
    level: 30,
    currentLevelXp: 98125,
    xpIntoLevel: 1775,
    xpToNextLevel: 5075,
    nextLevelAt: 103200,
    progressRatio: 1775 / 5075,
    isMaxLevel: false,
  })

  assert.deepEqual(applyPlayerXp({ totalXp: 400, level: 1 }, 800).state, {
    totalXp: 1200,
    level: 2,
  })
})

test('pachinko slot table makes displayed bottom rewards exact', () => {
  const levelOneSlots = buildPachinkoSlotRewards(0)
  assert.equal(levelOneSlots.length, PACHINKO_SLOT_COUNT)
  assert.deepEqual(levelOneSlots.map((slot) => WEAPON_IDS.includes(slot.weaponId)), Array(PACHINKO_SLOT_COUNT).fill(true))
  assert.deepEqual(levelOneSlots[0], {
    slotIndex: 0,
    slotCount: 10,
    ratioStart: 0,
    ratioEnd: 0.1,
    sampleRatio: 0.09999999999999978,
    weaponId: 'acid-sprayer',
    star: 1,
    iconKey: 'weapon-acid-sprayer',
  })

  for (const slot of levelOneSlots) {
    const landingRatio = slot.ratioStart + 0.001
    assert.deepEqual(resolvePachinkoSlotReward(0, landingRatio), slot)
    assert.deepEqual(resolvePachinkoLandingReward(0, landingRatio), {
      weaponId: slot.weaponId,
      star: slot.star,
    })
  }

  const nextTable = buildPachinkoSlotRewards(0, PACHINKO_SLOT_COUNT, 1)
  assert.notDeepEqual(nextTable.map((slot) => `${slot.weaponId}:${slot.star}`), levelOneSlots.map((slot) => `${slot.weaponId}:${slot.star}`))

  const levelFiveSlots = buildPachinkoSlotRewards(4200, PACHINKO_SLOT_COUNT, 0, 17)
  assert.ok(levelFiveSlots.every((slot) => slot.star >= 3 && slot.star <= 5), 'player level should bound visible star outcomes')
  const levelFiveLandingSlot = resolvePachinkoSlotReward(4200, 0.999, PACHINKO_SLOT_COUNT, 0, 17)
  assert.deepEqual(resolvePachinkoLandingReward(4200, 0.999, 0, 17), {
    weaponId: levelFiveLandingSlot.weaponId,
    star: levelFiveLandingSlot.star,
  })
})

test('pachinko weapon-family synergy marks mostly-upside bonus slots', () => {
  assert.equal(getPachinkoWeaponFamily('slime-glaive'), 'melee')
  assert.equal(getPachinkoWeaponFamilyLabel('melee'), '근접')
  assert.equal(getPachinkoWeaponSynergySummary('slime-glaive'), '근접 계열: 레넥톤 손맛 보너스 슬롯 등장')

  const modifiers = buildPachinkoSlotModifiers('slime-glaive', 3)
  assert.equal(modifiers.get(7), 'family')
  assert.equal(modifiers.get(3), 'bonus')
  assert.equal(modifiers.get(5), 'jackpot')

  const synergizedSlots = buildPachinkoSlotRewards(3000, PACHINKO_SLOT_COUNT, 0, 1, 'slime-glaive')
  assert.equal(synergizedSlots[7].modifier?.kind, 'family')
  assert.equal(synergizedSlots[7].weaponId, 'slime-glaive')
  assert.equal(synergizedSlots[3].modifier?.kind, 'bonus')
  assert.equal(synergizedSlots[5].modifier?.kind, 'jackpot')
  assert.equal(synergizedSlots[5].weaponId, 'slime-glaive')
})

test('pachinko slot modifiers never punish the base reward', () => {
  const baseReward = { weaponId: 'acid-sprayer', star: 4 }
  assert.deepEqual(applyPachinkoSlotModifier(baseReward, 'family', 'spark-carbine'), {
    weaponId: 'spark-carbine',
    star: 4,
  })
  assert.deepEqual(applyPachinkoSlotModifier(baseReward, 'bonus', 'spark-carbine'), {
    weaponId: 'acid-sprayer',
    star: 5,
  })
  assert.deepEqual(applyPachinkoSlotModifier(baseReward, 'jackpot', 'spark-carbine'), {
    weaponId: 'spark-carbine',
    star: 6,
  })

  const familyLanding = resolvePachinkoLandingReward(1400, 0.75, 0, 1, 'slime-glaive')
  assert.deepEqual(familyLanding, {
    weaponId: 'slime-glaive',
    star: 1,
  })
})

test('pachinko momentum turns misses into fever without minting extra tokens', () => {
  let momentum = createInitialPachinkoMomentumState()
  assert.equal(momentum.feverCharge, 0)
  assert.equal(isPachinkoFeverActive(momentum), false)
  assert.equal(getPachinkoMomentumLabel(momentum), '토큰 대기')

  for (let index = 0; index < PACHINKO_PITY_THRESHOLD; index += 1) {
    const update = applyPachinkoMomentumState(momentum, { modifier: undefined, isNearJackpot: false })
    momentum = update.state
  }

  assert.equal(momentum.pityCounter, PACHINKO_PITY_THRESHOLD)
  assert.equal(momentum.feverCharge, 56)
  assert.equal(getPachinkoMomentumLabel(momentum), '리치 누적')

  const nearMiss = applyPachinkoMomentumState(momentum, { modifier: undefined, isNearJackpot: true })
  assert.equal(nearMiss.feverTriggered, false)
  assert.equal(nearMiss.state.feverCharge, 90)
  assert.equal(nearMiss.state.lastOutcome, 'near-miss')

  const feverTrigger = applyPachinkoMomentumState(nearMiss.state, { modifier: undefined, isNearJackpot: true })
  assert.equal(feverTrigger.feverTriggered, true)
  assert.equal(feverTrigger.state.feverCharge, 0)
  assert.equal(feverTrigger.state.pityCounter, 0)
  assert.equal(feverTrigger.state.feverTokensRemaining, PACHINKO_FEVER_DURATION_TOKENS)
  assert.equal(isPachinkoFeverActive(feverTrigger.state), true)
  assert.equal(getPachinkoMomentumLabel(feverTrigger.state), `FEVER ${PACHINKO_FEVER_DURATION_TOKENS}연타`)
})

test('pachinko fever expands upside slots and consumes a short burst window', () => {
  const feverState = {
    feverCharge: 0,
    pityCounter: 0,
    feverTokensRemaining: PACHINKO_FEVER_DURATION_TOKENS,
    lastOutcome: 'bonus',
  }

  const neutralModifiers = buildPachinkoSlotModifiers('slime-glaive', 3)
  const feverModifiers = buildPachinkoSlotModifiers('slime-glaive', 3, PACHINKO_SLOT_COUNT, {
    feverActive: true,
    activeWeaponWeightMultiplier: 1.75,
    nonActiveWeaponWeightMultiplier: 0.7,
    starBonus: 1,
    extraJackpotSlots: 1,
    extraBonusSlots: 0,
  })
  assert.equal([...neutralModifiers.values()].filter((modifier) => modifier === 'jackpot').length, 1)
  assert.equal([...feverModifiers.values()].filter((modifier) => modifier === 'jackpot').length, 2)

  const feverSlots = buildPachinkoSlotRewards(3000, PACHINKO_SLOT_COUNT, 0, 1, 'slime-glaive', 1, 1, feverState)
  assert.ok(feverSlots.some((slot) => slot.modifier?.kind === 'jackpot'))
  assert.ok(feverSlots.some((slot) => slot.isNearJackpot))
  assert.ok(feverSlots.every((slot) => slot.star >= 2), 'fever should add a modest global star uplift at level 3')

  const nonJackpotDuringFever = applyPachinkoMomentumState(feverState, { modifier: undefined, isNearJackpot: false })
  assert.equal(nonJackpotDuringFever.wasFeverActive, true)
  assert.equal(nonJackpotDuringFever.state.feverTokensRemaining, PACHINKO_FEVER_DURATION_TOKENS - 1)

  const jackpotDuringFever = applyPachinkoMomentumState(nonJackpotDuringFever.state, { modifier: { kind: 'jackpot' }, isNearJackpot: false })
  assert.equal(jackpotDuringFever.outcome, 'fever-jackpot')
  assert.ok(jackpotDuringFever.state.feverTokensRemaining >= PACHINKO_FEVER_DURATION_TOKENS - 2)
  assert.ok(jackpotDuringFever.state.feverTokensRemaining <= PACHINKO_FEVER_DURATION_TOKENS)
  assert.equal(jackpotDuringFever.state.feverCharge, 0)
  assert.ok(PACHINKO_FEVER_CHARGE_MAX >= 100)
})

test('pachinko slot index clamps boundaries and live table timing', () => {
  assert.equal(PACHINKO_REWARD_TABLE_REFRESH_MS, 5000)
  assert.equal(getPachinkoRewardTableSeed(0), 0)
  assert.equal(getPachinkoRewardTableSeed(4999), 0)
  assert.equal(getPachinkoRewardTableSeed(5000), 1)
  assert.equal(getPachinkoRewardTableSeed(1700), 0)

  assert.equal(resolvePachinkoSlotIndex(-1), 0)
  assert.equal(resolvePachinkoSlotIndex(0), 0)
  assert.equal(resolvePachinkoSlotIndex(0.1), 1)
  assert.equal(resolvePachinkoSlotIndex(0.999), 9)
  assert.equal(resolvePachinkoSlotIndex(1), 9)

  const launchedAtLevelOne = resolvePachinkoSlotReward(0, 0.95, PACHINKO_SLOT_COUNT, 0)
  const resolvedAfterRefresh = resolvePachinkoSlotReward(0, 0.95, PACHINKO_SLOT_COUNT, 1)
  assert.deepEqual(launchedAtLevelOne, {
    slotIndex: 9,
    slotCount: 10,
    ratioStart: 0.9,
    ratioEnd: 1,
    sampleRatio: 0.999,
    weaponId: 'starter-blaster',
    star: 2,
    iconKey: 'weapon-starter-blaster',
  })
  assert.notDeepEqual(resolvedAfterRefresh, launchedAtLevelOne)
  assert.deepEqual(resolvePachinkoLandingReward(0, 0.95, 1), {
    weaponId: resolvedAfterRefresh.weaponId,
    star: resolvedAfterRefresh.star,
  })

  const leveledLanding = resolvePachinkoSlotReward(0, 0.95, PACHINKO_SLOT_COUNT, 1, 25)
  assert.ok(leveledLanding.star >= 4 && leveledLanding.star <= 5)
  assert.deepEqual(resolvePachinkoLandingReward(0, 0.95, 1, 25), {
    weaponId: leveledLanding.weaponId,
    star: leveledLanding.star,
  })
})

test('pachinko launch capacity respects active cap, queue, and cadence', () => {
  assert.equal(MAX_ACTIVE_PACHINKO_TOKENS, 30)
  assert.equal(canLaunchPachinkoToken({
    activeTokenCount: 29,
    queuedTokenCount: 1,
    now: 1000,
    lastLaunchAt: 0,
  }), true)
  assert.equal(canLaunchPachinkoToken({
    activeTokenCount: 30,
    queuedTokenCount: 10,
    now: 1000,
    lastLaunchAt: 0,
  }), false)
  assert.equal(canLaunchPachinkoToken({
    activeTokenCount: 3,
    queuedTokenCount: 0,
    now: 1000,
    lastLaunchAt: 0,
  }), false)
  assert.equal(canLaunchPachinkoToken({
    activeTokenCount: 3,
    queuedTokenCount: 4,
    now: 1000,
    lastLaunchAt: 1000 - PACHINKO_TOKEN_LAUNCH_INTERVAL_MS + 1,
  }), false)
  assert.equal(canLaunchPachinkoToken({
    activeTokenCount: 3,
    queuedTokenCount: 4,
    now: 1000,
    lastLaunchAt: 1000 - PACHINKO_TOKEN_LAUNCH_INTERVAL_MS,
  }), true)
})
test('weapon star stacks auto-fuse three matching weapons into the next grade', () => {
  let stacks = seedWeaponStacks()
  stacks = addWeaponStack(stacks, 'starter-blaster', 1, 1)
  stacks = addWeaponStack(stacks, 'acid-sprayer', 2, 3)

  const starterKey = createWeaponStackKey('starter-blaster', 1)
  const acidTwoKey = createWeaponStackKey('acid-sprayer', 2)
  assert.equal(canFuseWeaponStack(stacks, starterKey), false)
  assert.equal(canFuseWeaponStack(stacks, acidTwoKey), true)
  assert.equal(equipWeaponStack(stacks, starterKey, acidTwoKey), acidTwoKey)

  const fusedStarter = addWeaponStackWithAutoFusion(
    { weaponStacks: stacks, activeWeaponKey: starterKey },
    'starter-blaster',
    1,
    1,
  )
  assert.equal(fusedStarter.activeWeaponKey, createWeaponStackKey('starter-blaster', 2))
  assert.deepEqual(
    fusedStarter.weaponStacks.find((stack) => stack.weaponId === 'starter-blaster' && stack.star === 2),
    { weaponId: 'starter-blaster', star: 2, count: 1 },
  )
  assert.equal(fusedStarter.fusions.length, 2)
  assert.ok(
    deriveEffectiveWeaponStats(fusedStarter.fusions[0].weaponId, {}, fusedStarter.fusions[0].resultStar).damage
      > deriveEffectiveWeaponStats(fusedStarter.fusions[0].weaponId, {}, 1).damage,
  )

  const highStar = addWeaponStack([], 'arc-loom', 5, 3)
  const arcFiveKey = createWeaponStackKey('arc-loom', 5)
  const fusedArc = fuseWeaponStack({ weaponStacks: highStar, activeWeaponKey: arcFiveKey }, arcFiveKey)
  assert.equal(canFuseWeaponStack(highStar, arcFiveKey), true)
  assert.equal(fusedArc?.activeWeaponKey, createWeaponStackKey('arc-loom', 6))
  assert.deepEqual(fusedArc?.weaponStacks, [{ weaponId: 'arc-loom', star: 6, count: 1 }])
  assert.equal(formatWeaponStarLabel(fusedArc?.resultStar), '★×6')
  assert.equal(formatWeaponStarLabel(12), '★×12')
})

test('combat and pachinko rectangles split the 960px canvas into play and reward lanes', () => {
  assert.deepEqual(COMBAT_RECT, { x: 0, y: 0, width: 720, height: 540 })
  assert.equal(PACHINKO_DIVIDER_X, 728)
  assert.deepEqual(PACHINKO_RECT, { x: 740, y: 24, width: 200, height: 492 })
  assert.equal(isPointInsideRect({ x: 719, y: 120 }, COMBAT_RECT), true)
  assert.equal(isPointInsideRect({ x: 740, y: 120 }, COMBAT_RECT), false)
  assert.deepEqual(clampPointToRect({ x: 900, y: -10 }, COMBAT_RECT, 14), { x: 706, y: 14 })
})

test('map layout defines a larger scrolling world with a safe starting area', () => {
  const layout = createMapLayout(ARENA_WORLD_BOUNDS)
  const start = getWorldCenter(layout.worldBounds)

  assert.equal(layout.worldBounds.width > 960, true)
  assert.equal(layout.worldBounds.height > 540, true)
  assert.deepEqual(layout.playerStart, start)
  assert.deepEqual(layout.obstacles, [])

  assert.equal(isCircleClearOfObstacles(start, PLAYER_SAFE_RADIUS, layout.obstacles), true)
})

test('ambient map item points stay clear and reuse existing loot ids', () => {
  const layout = createMapLayout(ARENA_WORLD_BOUNDS)
  const spawnPoints = getAmbientItemSpawnPoints(layout.worldBounds, layout.obstacles)

  assert.equal(spawnPoints.length >= 5, true)
  for (const spawn of spawnPoints) {
    assert.equal(LOOT_IDS.includes(spawn.itemId), true)
    assert.notEqual(spawn.itemId, 'tuning-capsule')
    assert.equal(isPointWithinWorld(spawn, layout.worldBounds, 48), true)
    assert.equal(isCircleClearOfObstacles(spawn, AMBIENT_ITEM_RADIUS, layout.obstacles), true)
  }

  assert.deepEqual(selectAmbientItemSpawnPoint(spawnPoints, () => 0), spawnPoints[0])
  assert.deepEqual(selectAmbientItemSpawnPoint(spawnPoints, () => 0.999), spawnPoints.at(-1))
})

test('heart item spawn points are sparse map pickups outside inventory loot', () => {
  const layout = createMapLayout(ARENA_WORLD_BOUNDS)
  const spawnPoints = getHeartItemSpawnPoints(layout.worldBounds, layout.obstacles)

  assert.equal(spawnPoints.length >= 4, true)
  assert.equal(LOOT_IDS.includes('heart-pickup'), false)
  for (const spawn of spawnPoints) {
    assert.equal(isPointWithinWorld(spawn, layout.worldBounds, 56), true)
    assert.equal(isCircleClearOfObstacles(spawn, HEART_ITEM_RADIUS, layout.obstacles), true)
  }

  assert.deepEqual(layout.heartItemSpawns, spawnPoints)
  assert.deepEqual(selectHeartItemSpawnPoint(spawnPoints, () => 0), spawnPoints[0])
  assert.deepEqual(selectHeartItemSpawnPoint(spawnPoints, () => 0.999), spawnPoints.at(-1))
})


test('magnet item spawn points are map utility pickups outside inventory loot', () => {
  const layout = createMapLayout(ARENA_WORLD_BOUNDS)
  const spawnPoints = getMagnetItemSpawnPoints(layout.worldBounds, layout.obstacles)

  assert.equal(spawnPoints.length >= 4, true)
  assert.equal(LOOT_IDS.includes('magnet-pickup'), false)
  for (const spawn of spawnPoints) {
    assert.equal(isPointWithinWorld(spawn, layout.worldBounds, 56), true)
    assert.equal(isCircleClearOfObstacles(spawn, MAGNET_ITEM_RADIUS, layout.obstacles), true)
  }

  assert.deepEqual(layout.magnetItemSpawns, spawnPoints)
  assert.deepEqual(selectMagnetItemSpawnPoint(spawnPoints, () => 0), spawnPoints[0])
  assert.deepEqual(selectMagnetItemSpawnPoint(spawnPoints, () => 0.999), spawnPoints.at(-1))
})

test('enemy map spawn selection respects player distance, world bounds, and obstacle clearance', () => {
  const layout = createMapLayout(ARENA_WORLD_BOUNDS)
  const spawn = selectEnemySpawnPoint(
    layout.playerStart,
    layout.worldBounds,
    layout.obstacles,
    () => 0,
    28,
  )

  assert.equal(isPointWithinWorld(spawn, layout.worldBounds, 48), true)
  assert.equal(isCircleClearOfObstacles(spawn, 28, layout.obstacles), true)
  assert.equal(
    Math.hypot(spawn.x - layout.playerStart.x, spawn.y - layout.playerStart.y) >= ENEMY_SPAWN_MIN_DISTANCE,
    true,
  )
})

test('heart pickup healing and intermittent spawn gates stay deterministic', () => {
  assert.equal(HEART_PICKUP_HEAL_AMOUNT, 24)
  assert.equal(HEART_PICKUP_MAX_ACTIVE, 4)
  assert.equal(getHealedPlayerHealth(40, 100), 64)
  assert.equal(getHealedPlayerHealth(90, 100), 100)
  assert.equal(getHealedPlayerHealth(-5, 100), 24)
  assert.equal(getInitialHeartPickupSpawnAt(1_000), 1_000 + HEART_PICKUP_INITIAL_DELAY_MS)
  assert.equal(getNextHeartPickupSpawnAt(1_000, () => 0), 1_000 + HEART_PICKUP_INTERVAL_MS)
  assert.equal(
    getNextHeartPickupSpawnAt(1_000, () => 0.999),
    1_000 + HEART_PICKUP_INTERVAL_MS + 2_997,
  )
  assert.equal(shouldSpawnHeartPickup(6_999, 7_000, 0), false)
  assert.equal(shouldSpawnHeartPickup(7_000, 7_000, HEART_PICKUP_MAX_ACTIVE), false)
  assert.equal(shouldSpawnHeartPickup(7_000, 7_000, HEART_PICKUP_MAX_ACTIVE - 1), true)
})


test('magnet pickup timing and duration stay deterministic', () => {
  assert.equal(MAGNET_PICKUP_MAX_ACTIVE, 2)
  assert.equal(MAGNET_PICKUP_DURATION_MS, 5_000)
  assert.equal(getInitialMagnetPickupSpawnAt(1_000), 1_000 + MAGNET_PICKUP_INITIAL_DELAY_MS)
  assert.equal(getNextMagnetPickupSpawnAt(1_000, () => 0), 1_000 + MAGNET_PICKUP_INTERVAL_MS)
  assert.equal(
    getNextMagnetPickupSpawnAt(1_000, () => 0.999),
    1_000 + MAGNET_PICKUP_INTERVAL_MS + 5_994,
  )
  assert.equal(getMagnetizedUntil(3_000), 8_000)
  assert.equal(isMagnetActive(7_999, 8_000), true)
  assert.equal(isMagnetActive(8_000, 8_000), false)
  assert.equal(shouldSpawnMagnetPickup(10_999, 11_000, 0), false)
  assert.equal(shouldSpawnMagnetPickup(11_000, 11_000, MAGNET_PICKUP_MAX_ACTIVE), false)
  assert.equal(shouldSpawnMagnetPickup(11_000, 11_000, MAGNET_PICKUP_MAX_ACTIVE - 1), true)
})

test('minimap projects world points and viewport into the top-right overlay', () => {
  const miniMap = getTopRightMiniMapBounds(960)
  assert.equal(miniMap.x > 960 / 2, true)
  assert.equal(miniMap.y, 16)

  const topLeft = projectWorldPointToMiniMap(
    { x: ARENA_WORLD_BOUNDS.x, y: ARENA_WORLD_BOUNDS.y },
    ARENA_WORLD_BOUNDS,
    miniMap,
  )
  const bottomRight = projectWorldPointToMiniMap(
    {
      x: ARENA_WORLD_BOUNDS.x + ARENA_WORLD_BOUNDS.width,
      y: ARENA_WORLD_BOUNDS.y + ARENA_WORLD_BOUNDS.height,
    },
    ARENA_WORLD_BOUNDS,
    miniMap,
  )

  assert.deepEqual(topLeft, { x: miniMap.x + miniMap.padding, y: miniMap.y + miniMap.padding })
  assert.deepEqual(bottomRight, {
    x: miniMap.x + miniMap.width - miniMap.padding,
    y: miniMap.y + miniMap.height - miniMap.padding,
  })

  const viewport = projectWorldRectToMiniMap(
    { x: 0, y: 0, width: 960, height: 540 },
    ARENA_WORLD_BOUNDS,
    miniMap,
  )

  assert.equal(viewport.width < miniMap.width, true)
  assert.equal(viewport.height < miniMap.height, true)
})

test('recipe presenter mirrors the actionable combine summary strings', () => {
  assert.deepEqual(describeAvailableRecipes([]), ['지금 바로 가능한 조합이 없습니다.'])

  const acidRecipes = getActionableRecipes(
    {
      'gel-shard': 1,
      'acid-core': 1,
    },
    ['starter-blaster'],
  )

  const [acidSummary] = describeAvailableRecipes(acidRecipes)
  assert.match(acidSummary ?? '', /술먹고 난 토 \[숙취 토사]/)
  assert.match(acidSummary ?? '', /사거리 240/)
  assert.match(acidSummary ?? '', /숙취 토사/)
  assert.doesNotMatch(acidSummary ?? '', /초당 \d+회/)

  const sparkRecipes = getActionableRecipes(
    {
      'gel-shard': 1,
      'spark-knot': 1,
    },
    ['starter-blaster'],
  )
  const mistRecipes = getActionableRecipes(
    {
      'frost-mote': 1,
      'mist-bead': 1,
    },
    ['starter-blaster'],
  )

  const [sparkSummary] = describeAvailableRecipes(sparkRecipes)
  const [mistSummary] = describeAvailableRecipes(mistRecipes)
  assert.match(sparkSummary ?? '', /방범 카메라 \[포탑 배치]/)
  assert.match(sparkSummary ?? '', /배치 2기/)
  assert.match(sparkSummary ?? '', /포탑당 9/)
  assert.match(mistSummary ?? '', /컴파일러 \[문법 폭발]/)
  assert.match(mistSummary ?? '', /직격 8/)
  assert.match(mistSummary ?? '', /폭발 24/)
  assert.match(mistSummary ?? '', /함정 44/)

  const needleRecipes = getActionableRecipes(
    {
      'chitin-needle': 1,
      'spark-knot': 1,
    },
    ['starter-blaster'],
  )
  const [needleSummary] = describeAvailableRecipes(needleRecipes)
  assert.match(needleSummary ?? '', /다시 출근 \[시체 재가동]/)
  assert.match(needleSummary ?? '', /처치 시 아군화/)
})

test('actionable recipes exclude outputs that are already owned', () => {
  const inventory = {
    'gel-shard': 1,
    'acid-core': 1,
  }

  assert.deepEqual(seedOwnedWeapons(), ['starter-blaster'])
  assert.equal(getActionableRecipes(inventory, ['starter-blaster']).length, 1)
  assert.equal(getActionableRecipes(inventory, ['starter-blaster', 'acid-sprayer']).length, 0)
})

test('applying a recipe selection adds ownership and auto-equips the new weapon', () => {
  const result = applyRecipeSelection(
    {
      inventory: {
        'gel-shard': 1,
        'acid-core': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'acid-sprayer-recipe',
  )

  assert.ok(result)
  assert.deepEqual(result?.nextInventory, {})
  assert.deepEqual(result?.ownedWeaponIds, ['starter-blaster', 'acid-sprayer'])
  assert.equal(result?.activeWeaponId, 'acid-sprayer')
})

test('new recipe selection adds the new owned weapon path', () => {
  const result = applyRecipeSelection(
    {
      inventory: {
        'spark-knot': 1,
        'mist-bead': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'arc-loom-recipe',
  )

  assert.ok(result)
  assert.deepEqual(result?.ownedWeaponIds, ['starter-blaster', 'arc-loom'])
  assert.equal(result?.activeWeaponId, 'arc-loom')
})

test('branch recipe selections add the new owned weapon paths', () => {
  const sparkResult = applyRecipeSelection(
    {
      inventory: {
        'gel-shard': 1,
        'spark-knot': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'spark-carbine-recipe',
  )

  assert.ok(sparkResult)
  assert.deepEqual(sparkResult?.ownedWeaponIds, ['starter-blaster', 'spark-carbine'])
  assert.equal(sparkResult?.activeWeaponId, 'spark-carbine')

  const mistResult = applyRecipeSelection(
    {
      inventory: {
        'frost-mote': 1,
        'mist-bead': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'mist-vortex-recipe',
  )

  assert.ok(mistResult)
  assert.deepEqual(mistResult?.ownedWeaponIds, ['starter-blaster', 'mist-vortex'])
  assert.equal(mistResult?.activeWeaponId, 'mist-vortex')

  const needleResult = applyRecipeSelection(
    {
      inventory: {
        'chitin-needle': 1,
        'spark-knot': 1,
      },
      ownedWeaponIds: ['starter-blaster'],
    },
    'needle-fan-recipe',
  )

  assert.ok(needleResult)
  assert.deepEqual(needleResult?.ownedWeaponIds, ['starter-blaster', 'needle-fan'])
  assert.equal(needleResult?.activeWeaponId, 'needle-fan')
})

test('duplicate-output recipe selections do not consume inventory', () => {
  const result = applyRecipeSelection(
    {
      inventory: {
        'gel-shard': 1,
        'acid-core': 1,
      },
      ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    },
    'acid-sprayer-recipe',
  )

  assert.equal(result, null)
})

test('duplicate-output branch recipe selections do not consume inventory', () => {
  assert.equal(
    applyRecipeSelection(
      {
        inventory: {
          'gel-shard': 1,
          'spark-knot': 1,
        },
        ownedWeaponIds: ['starter-blaster', 'spark-carbine'],
      },
      'spark-carbine-recipe',
    ),
    null,
  )

  assert.equal(
    applyRecipeSelection(
      {
        inventory: {
          'frost-mote': 1,
          'mist-bead': 1,
        },
        ownedWeaponIds: ['starter-blaster', 'mist-vortex'],
      },
      'mist-vortex-recipe',
    ),
    null,
  )

  assert.equal(
    applyRecipeSelection(
      {
        inventory: {
          'chitin-needle': 1,
          'spark-knot': 1,
        },
        ownedWeaponIds: ['starter-blaster', 'needle-fan'],
      },
      'needle-fan-recipe',
    ),
    null,
  )
})

test('equipping an owned weapon only changes the active weapon id', () => {
  assert.equal(
    equipOwnedWeapon(['starter-blaster', 'frost-lance'], 'starter-blaster', 'frost-lance'),
    'frost-lance',
  )
  assert.equal(
    equipOwnedWeapon(['starter-blaster'], 'starter-blaster', 'storm-cannon'),
    'starter-blaster',
  )
})

test('run progression advances by elapsed time instead of enemy clear state', () => {
  const firstPhase = getRunPhaseByElapsedMs(0)
  const firstHalfMinute = getRunPhaseByElapsedMs(30_000)
  const secondMinute = getRunPhaseByElapsedMs(60_000)
  const finale = getRunPhaseByElapsedMs(FINAL_STAGE_START_MS)

  assert.equal(firstPhase.minuteIndex, 0)
  assert.equal(firstPhase.healthMultiplier, 1)
  assert.equal(firstHalfMinute.minuteIndex, 0)
  assert.equal(firstHalfMinute.id, 'minute-01-b')
  assert.equal(firstPhase.stageLabel, 'Stage 1')
  assert.match(firstPhase.label, /Stage 1 전반/)
  assert.equal(secondMinute.minuteIndex, 1)
  assert.equal(secondMinute.stageIndex, 1)
  assert.equal(finale.isFinale, true)
  assert.equal(finale.oneTimeSpawns?.includes('slime-boss'), true)
  assert.equal(isFinaleActive(FINAL_STAGE_START_MS), true)
  assert.equal(isRunTimedOut(RUN_DURATION_MS), true)
  assert.equal(formatRunTime(RUN_DURATION_MS), '20:00')
  assert.deepEqual(getUnknownRunEnemyIds(), [])
  const scheduledEnemyIds = new Set(
    RUN_PROGRESS_PHASES.flatMap((phase) => [
      ...phase.entries.map((entry) => entry.enemyId),
      ...(phase.oneTimeSpawns ?? []),
    ]),
  )
  assert.deepEqual(
    Object.keys(ENEMY_DEFINITIONS).filter((enemyId) => !scheduledEnemyIds.has(enemyId)),
    [],
  )
  assert.equal(getRunSpawnCapacity(firstPhase, firstPhase.softEnemyCap, firstPhase.burstSize), 0)
})

test('run progression exposes per-enemy spawn chance rows for the current half-minute phase', () => {
  const firstPhase = getRunPhaseByElapsedMs(0)
  const thirdMinuteFront = getRunPhaseByElapsedMs(2 * 60_000)
  const thirdMinuteBack = getRunPhaseByElapsedMs(2 * 60_000 + 30_000)
  const latePhase = getRunPhaseByElapsedMs(24 * 60_000)
  const firstRows = getRunEnemySpawnChanceRows(firstPhase)
  const thirdMinuteFrontRows = getRunEnemySpawnChanceRows(thirdMinuteFront)
  const thirdMinuteBackRows = getRunEnemySpawnChanceRows(thirdMinuteBack)
  const lateRows = getRunEnemySpawnChanceRows(latePhase)

  assert.deepEqual(firstRows, [
    {
      enemyId: 'slime',
      enemyName: '출석 체크 알림',
      count: 6,
      ratio: 1,
      percentLabel: '100%',
    },
  ])
  const firstBackRows = getRunEnemySpawnChanceRows(getRunPhaseByElapsedMs(30_000))
  assert.ok(firstBackRows.some((row) => row.enemyId === 'dash-slime'))
  assert.notDeepEqual(firstRows, firstBackRows)
  assert.notDeepEqual(thirdMinuteFrontRows, thirdMinuteBackRows)
  assert.ok(lateRows.length > 4)
  assert.ok(lateRows.some((row) => row.enemyId === 'crusher-slime'))
  assert.ok(lateRows.some((row) => row.enemyId === 'void-orb'))
  assert.equal(lateRows.some((row) => ['slime', 'dash-slime', 'spark-slime', 'splitter-slime'].includes(row.enemyId)), false)
  assert.equal(lateRows.reduce((sum, row) => sum + row.count, 0) > 0, true)
  assert.equal(lateRows.reduce((sum, row) => sum + row.ratio, 0).toFixed(4), '1.0000')
})


test('run progression spawn sequence interleaves weighted enemies early', () => {
  const firstBackPhase = getRunPhaseByElapsedMs(30_000)
  const sequence = flattenRunPhaseEntries(firstBackPhase)

  assert.equal(sequence.length, 9)
  assert.deepEqual(sequence.slice(0, 4), ['slime', 'dash-slime', 'slime', 'dash-slime'])
})

test('run progression gives enemy roles clear scheduled ambush moments', () => {
  const dashAmbush = getRunPhaseByElapsedMs(90_000)
  const splitterAmbush = getRunPhaseByElapsedMs(3 * 60_000 + 30_000)
  const supportAmbush = getRunPhaseByElapsedMs(9 * 60_000 + 30_000)
  const finaleAmbush = getRunPhaseByElapsedMs(FINAL_STAGE_START_MS)
  const lastStage = getRunPhaseByElapsedMs(RUN_DURATION_MS)

  assert.equal(dashAmbush.oneTimeSpawns?.filter((enemyId) => enemyId === 'dash-slime').length, 5)
  assert.equal(splitterAmbush.oneTimeSpawns?.filter((enemyId) => enemyId === 'splitter-slime').length, 6)
  assert.equal(supportAmbush.oneTimeSpawns?.filter((enemyId) => enemyId === 'mender-slime').length, 3)
  assert.ok(finaleAmbush.oneTimeSpawns?.includes('slime-boss'))
  assert.equal(finaleAmbush.oneTimeSpawns?.filter((enemyId) => enemyId === 'siege-toad').length, 3)
  assert.equal(lastStage.stageLabel, 'Stage 20')
})

test('hud places enemy spawn odds beside the game title for visibility', () => {
  const hudSource = readFileSync(resolve(TEST_DIR, '../src/ui/Hud.ts'), 'utf8')
  const styleSource = readFileSync(resolve(TEST_DIR, '../src/style.css'), 'utf8')

  assert.ok(hudSource.includes('renderEnemyOddsPanel(state.pachinko?.enemyOdds)'))
  assert.ok(hudSource.includes("hud-summary__section--enemy-odds"))
  assert.ok(hudSource.includes('hud-summary__enemy-odds'))
  assert.ok(hudSource.includes('getHudEnemyAssetPath(row.iconKey)'))
  assert.ok(hudSource.includes('적 출현 확률 ·'))
  assert.ok(styleSource.includes('.hud-summary__enemy-odds'))
  assert.ok(styleSource.includes('.hud-summary__enemy-odds-chip img'))
  assert.ok(hudSource.includes('피버 게이지:'))
  assert.ok(hudSource.includes('FEVER'))
})

test('arena hud injects enemy spawn odds into the visible stats list', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')
  const hudSource = readFileSync(resolve(TEST_DIR, '../src/ui/Hud.ts'), 'utf8')
  const styleSource = readFileSync(resolve(TEST_DIR, '../src/style.css'), 'utf8')

  assert.ok(arenaSceneSource.includes('const visibleEnemyChanceLines = enemyChanceRows.slice(0, 5).map'))
  assert.ok(arenaSceneSource.includes('`적 출현 확률 (${this.getRunStageOddsLabel(currentPhase)})`'))
  assert.ok(arenaSceneSource.includes('...visibleEnemyChanceLines'))
  assert.ok(arenaSceneSource.includes('currentTimeLabel: formatRunTime(this.runElapsedMs)'))
  assert.ok(arenaSceneSource.includes('자석 효과 활성화'))
  assert.ok(arenaSceneSource.includes('enemyOddsLabel'))
  assert.ok(arenaSceneSource.includes('syncEnemyOddsHudText(enemyChanceLines)'))
  assert.ok(arenaSceneSource.includes('iconKey: ENEMY_DEFINITIONS[row.enemyId].textureKey'))
  assert.ok(arenaSceneSource.includes('rows: enemyChanceRows'))
  assert.ok(arenaSceneSource.includes('const currentTimeLabel = formatRunTime(this.runElapsedMs)'))
  assert.ok(arenaSceneSource.includes('getRunStageOddsLabel(phase'))
  assert.ok(arenaSceneSource.includes('현재 시간 ${currentTimeLabel} · 적 출현 확률 · ${stageLabel} ·'))
  assert.ok(arenaSceneSource.includes('const enemyOddsX = x'))
  assert.ok(arenaSceneSource.includes('.setOrigin(0, 0.5)'))
  assert.ok(hudSource.includes('<span>현재 시간</span>'))
  assert.ok(hudSource.includes('state.currentTimeLabel'))
  assert.ok(hudSource.includes('hud-summary__status-line--time'))
  assert.ok(styleSource.includes('.hud-summary__status-line--time'))
})

test('arena snapshots pachinko reward inputs per launched token before fever state mutates', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')

  assert.ok(arenaSceneSource.includes('const resolutionSnapshot = {'))
  assert.ok(arenaSceneSource.includes('totalTokenXp: this.pachinkoTokenXp'))
  assert.ok(arenaSceneSource.includes('momentumState: { ...this.pachinkoMomentumState }'))
  assert.ok(arenaSceneSource.includes('const snapshot = token.resolutionSnapshot'))
  assert.ok(arenaSceneSource.includes('snapshot.totalTokenXp'))
  assert.ok(arenaSceneSource.includes('snapshot.tableSeed'))
})

test('nearest auto-attack target returns null when no active enemies are available', () => {
  assert.equal(resolveNearestAutoAttackTarget({ x: 10, y: 10 }, []), null)
  assert.equal(
    resolveNearestAutoAttackTarget(
      { x: 10, y: 10 },
      [
        { x: 12, y: 12, isActive: false },
        { x: 8, y: 8, isActive: false },
      ],
    ),
    null,
  )
})

test('nearest auto-attack target ignores inactive enemies and returns a normalized vector', () => {
  const target = resolveNearestAutoAttackTarget(
    { x: 0, y: 0 },
    [
      { x: 1, y: 0, isActive: false },
      { x: 3, y: 4, isActive: true },
      { x: 9, y: 0, isActive: true },
    ],
  )

  assert.deepEqual(target && { x: target.x, y: target.y, distanceSq: target.distanceSq }, {
    x: 3,
    y: 4,
    distanceSq: 25,
  })
  assert.equal(target?.directionX, 0.6)
  assert.equal(target?.directionY, 0.8)
})

test('nearest auto-attack target re-evaluates to the closest enemy each call', () => {
  const firstTarget = resolveNearestAutoAttackTarget(
    { x: 0, y: 0 },
    [
      { x: 4, y: 0, isActive: true },
      { x: 8, y: 0, isActive: true },
    ],
  )
  const secondTarget = resolveNearestAutoAttackTarget(
    { x: 7, y: 0 },
    [
      { x: 4, y: 0, isActive: true },
      { x: 8, y: 0, isActive: true },
    ],
  )

  assert.equal(firstTarget?.x, 4)
  assert.equal(secondTarget?.x, 8)
})

test('nearest auto-attack target handles an overlapping enemy with a deterministic fallback direction', () => {
  const target = resolveNearestAutoAttackTarget(
    { x: 5, y: 5 },
    [
      { x: 5, y: 5, isActive: true },
      { x: 8, y: 5, isActive: true },
    ],
  )

  assert.deepEqual(target, {
    x: 5,
    y: 5,
    directionX: 0,
    directionY: -1,
    distanceSq: 0,
  })
})

test('auto-attack shot gating respects interaction pause, cooldown, and target availability', () => {
  const origin = { x: 0, y: 0 }
  const candidates = [{ x: 3, y: 4, isActive: true }]

  assert.equal(
    resolveAutoAttackShot(origin, candidates, {
      isInteractionBlocked: true,
      time: 1000,
      nextFireAt: 0,
    }),
    null,
  )
  assert.equal(
    resolveAutoAttackShot(origin, candidates, {
      isInteractionBlocked: false,
      time: 100,
      nextFireAt: 200,
    }),
    null,
  )

  assert.deepEqual(
    resolveAutoAttackShot(origin, [], {
      isInteractionBlocked: false,
      time: 1000,
      nextFireAt: 0,
    }),
    null,
  )

  assert.deepEqual(
    resolveAutoAttackShot(origin, candidates, {
      isInteractionBlocked: false,
      time: 1000,
      nextFireAt: 200,
    }),
    {
      x: 3,
      y: 4,
      directionX: 0.6,
      directionY: 0.8,
      distanceSq: 25,
    },
  )
})

test('auto-attack target selection respects active weapon range and target radius', () => {
  const origin = { x: 0, y: 0 }

  assert.equal(
    resolveNearestAutoAttackTarget(
      origin,
      [
        { x: 80, y: 0, radius: 5, isActive: true },
        { x: 50, y: 0, radius: 5, isActive: false },
      ],
      40,
    ),
    null,
  )

  assert.deepEqual(
    resolveNearestAutoAttackTarget(
      origin,
      [
        { x: 80, y: 0, radius: 5, isActive: true },
        { x: 45, y: 0, radius: 10, isActive: true },
        { x: 20, y: 0, radius: 5, isActive: false },
      ],
      40,
    ),
    {
      x: 45,
      y: 0,
      directionX: 1,
      directionY: 0,
      distanceSq: 2025,
    },
  )

  assert.equal(
    resolveAutoAttackShot(origin, [{ x: 70, y: 0, radius: 5, isActive: true }], {
      isInteractionBlocked: false,
      time: 1000,
      nextFireAt: 0,
      maxRange: 40,
    }),
    null,
  )
})

test('boss trigger stays behind the final regular wave', () => {
  assert.equal(isBossWaveReady(0), false)
  assert.equal(isBossWaveReady(1), false)
  assert.equal(isBossWaveReady(2), false)
  assert.equal(isBossWaveReady(3), false)
  assert.equal(isBossWaveReady(4), true)
})

test('third wave still includes the existing spark slime sample enemy', () => {
  const thirdWave = getWaveByIndex(2)

  assert.ok(thirdWave)
  assert.ok(getWaveSpawnSequence(thirdWave).includes('spark-slime'))
})


test('enemy names match college engineering life story beats', () => {
  assert.equal(ENEMY_DEFINITIONS.slime.name, '출석 체크 알림')
  assert.equal(ENEMY_DEFINITIONS['slime-boss'].name, '최종 발표 교수님')
  assert.match(ENEMY_DEFINITIONS['needle-wasp'].description, /코드리뷰/)
  assert.match(ENEMY_DEFINITIONS['siege-toad'].description, /캡스톤 마감/)
  assert.ok(Object.values(ENEMY_DEFINITIONS).every((enemy) => !enemy.name.includes('슬라임')))

  for (const enemy of Object.values(ENEMY_DEFINITIONS)) {
    const svg = readFileSync(resolve(TEST_DIR, `../public/assets/units/${enemy.textureKey}-idle-0.svg`), 'utf8')
    assert.ok(
      svg.includes(`<title>${enemy.name}</title>`),
      `${enemy.id} should use a matching themed SVG title`,
    )
  }

  assert.equal(ENEMY_DEFINITIONS['prism-slime'].textureKey, 'prism-slime')
})

test('content id catalogs include scoped enemy and reward branches', () => {
  assert.deepEqual(LOOT_IDS, [
    'gel-shard',
    'acid-core',
    'frost-mote',
    'spark-knot',
    'mist-bead',
    'tuning-capsule',
    'chitin-needle',
  ])
  assert.deepEqual(RECIPE_IDS, [
    'acid-sprayer-recipe',
    'frost-lance-recipe',
    'storm-cannon-recipe',
    'arc-loom-recipe',
    'spark-carbine-recipe',
    'mist-vortex-recipe',
    'slime-glaive-recipe',
    'prism-cutter-recipe',
    'needle-fan-recipe',
  ])
  assert.deepEqual(WEAPON_IDS, [
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
  ])
  assert.deepEqual(ENEMY_IDS, [
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
  ])
})

test('mixed regular waves resolve deterministic spawn order while boss stays singular', () => {
  const secondWave = getWaveByIndex(1)
  const thirdWave = getWaveByIndex(2)
  const eliteWave = getWaveByIndex(3)
  const bossWave = getWaveByIndex(4)

  assert.ok(secondWave)
  assert.ok(thirdWave)
  assert.ok(eliteWave)
  assert.ok(bossWave)
  assert.equal(secondWave.burstSize, 3)
  assert.equal(thirdWave.burstSize, 4)
  assert.equal(bossWave.burstSize, undefined)
  assert.deepEqual(
    getWaveSpawnSequence(secondWave),
    [...Array(15).fill('slime'), ...Array(9).fill('dash-slime')],
  )
  assert.deepEqual(
    flattenWaveEntries(thirdWave.entries),
    [
      ...Array(11).fill('spark-slime'),
      ...Array(8).fill('orbit-slime'),
      ...Array(3).fill('needle-wasp'),
      ...Array(5).fill('dash-slime'),
    ],
  )
  assert.equal(getWaveSpawnCount(thirdWave), 27)
  assert.deepEqual(getWaveSpawnSequence(eliteWave), ['prism-slime'])
  assert.deepEqual(bossWave.entries, [{ enemyId: 'slime-boss', count: 1 }])
  assert.equal(getBossEnemyId(), 'slime-boss')
  assert.equal(isBossEnemyId('slime-boss'), true)
  assert.equal(isBossEnemyId('dash-slime'), false)
  assert.equal(getDefeatedEnemyRunOutcome('slime-boss'), 'win')
  assert.equal(getDefeatedEnemyRunOutcome('dash-slime'), 'continue')
  assert.equal(getDefeatedEnemyRunOutcome('needle-wasp'), 'continue')
})

test('game title, narration, and control hints stay aligned with playable keyboard shortcuts', () => {
  assert.equal(GAME_TITLE, '달려라 김동성!')
  assert.deepEqual([...GAME_HEADER_CONTROL_HINTS], ['WASD 이동', 'J 대시', 'I 인벤토리', 'Q 코덱스'])
  assert.ok(KIM_COMMUNITY_NARRATIONS.length >= 30)
  assert.ok(KIM_COMMUNITY_NARRATIONS.some((line) => line.startsWith('익명1:')))
  assert.ok(KIM_COMMUNITY_NARRATIONS.some((line) => line.startsWith('베댓:')))
  assert.ok(KIM_COMMUNITY_NARRATIONS.some((line) => line.includes('ㅋㅋ')))
  assert.ok(KIM_COMMUNITY_NARRATIONS.some((line) => line.includes('기구한 일생')))
  assert.ok(KIM_COMMUNITY_NARRATIONS.some((line) => line.includes('무한런편')))
  assert.match(GAMEPLAY_CONTROL_TIP, /I 인벤토리/)
  assert.match(GAMEPLAY_CONTROL_TIP, /Q 코덱스/)
  assert.match(GAMEPLAY_CONTROL_TIP, /끝까지 버티기/)

  const mainSource = readFileSync(resolve(TEST_DIR, '../src/main.ts'), 'utf8')
  const styleSource = readFileSync(resolve(TEST_DIR, '../src/style.css'), 'utf8')
  assert.ok(mainSource.includes('headerNarration'))
  assert.ok(mainSource.includes('game-header__narration'))
  assert.ok(mainSource.includes('window.setInterval'))
  assert.ok(mainSource.includes('}, 5000)'))
  assert.ok(mainSource.includes('data-region="kim-narration"'))
  assert.ok(mainSource.includes('game-header__mood-icons'))
  assert.ok(mainSource.includes('HEADER_CHARACTER_ICONS'))
  assert.ok(mainSource.includes('assets/units/player-kim-idle-0.png'))
  assert.ok(!mainSource.includes('<strong>${GAME_TITLE}</strong>'))
  assert.ok(!mainSource.includes('game-header__controls'))
  assert.ok(!mainSource.includes('game-header__rails'))
  assert.ok(styleSource.includes('.game-header__narration'))
  assert.ok(styleSource.includes('line-height: 1.45'))
  assert.ok(styleSource.includes('word-break: keep-all'))
  assert.ok(styleSource.includes('@keyframes narration-drop'))
  assert.ok(styleSource.includes('.game-header__mood-icons'))
  assert.ok(styleSource.includes('.game-header__mood-icons img'))
  assert.ok(!styleSource.includes('COMMUNITY LOG'))
})


test('weapon star descriptions become more hopeful as stars rise', () => {
  const base = WEAPON_DEFINITIONS['starter-blaster'].description

  assert.equal(getWeaponStarHopeDescription(base, 1), base)
  assert.match(getWeaponStarHopeDescription(base, 2), /다음 수/)
  assert.match(getWeaponStarHopeDescription(base, 3), /생존기/)
  assert.match(getWeaponStarHopeDescription(base, 4), /내일/)
  assert.match(getWeaponStarHopeDescription(base, 5), /직접 길/)
})

test('weapon descriptions carry Kim-flavored personal hooks', () => {
  assert.equal(WEAPON_DEFINITIONS['arc-loom'].name, '낡은 축구공')
  assert.equal(WEAPON_DEFINITIONS['acid-sprayer'].name, '술먹고 난 토')
  assert.equal(WEAPON_DEFINITIONS['mist-vortex'].name, '컴파일러')
  assert.match(WEAPON_DEFINITIONS['arc-loom'].description, /축구/)
  assert.match(WEAPON_DEFINITIONS['slime-glaive'].description, /레넥톤/)
  assert.match(WEAPON_DEFINITIONS['starter-blaster'].description, /파친코/)
  assert.equal(WEAPON_DEFINITIONS['starter-blaster'].identityLabel, '꾹누름 본능')
  assert.match(WEAPON_DEFINITIONS['mist-vortex'].description, /커뮤 댓글/)
  assert.ok(Object.values(WEAPON_DEFINITIONS).every((weapon) => weapon.description.length >= 40))
  assert.ok(Object.values(WEAPON_DEFINITIONS).every((weapon) => !/기관총입니다|범위 무기입니다|폭발 무기입니다|샷건입니다|리바운드 무기입니다|설치 무기입니다|함정형 무기입니다|브루저 무기입니다|격투 콤보 무기입니다|지배형 무기입니다/.test(weapon.description)))
  assert.ok(Object.values(WEAPON_DEFINITIONS).every((weapon) => weapon.identityLabel !== '지속 탄막'))
})

test('stage selection views expose readable time-stage choices and current marker', () => {
  const stages = getStageSelectionViews(15 * 60_000)

  assert.equal(stages.length, 20)
  assert.equal(stages[15]?.isCurrent, true)
  assert.match(stages[15]?.label ?? '', /Stage 16/)
  assert.match(stages[15]?.description ?? '', /체력 ×/)
  const bossStage = stages.find((stage) => stage.isBoss)
  assert.ok(bossStage)
  assert.match(bossStage.description, /보스 결전/)
  assert.equal(bossStage.startElapsedMs, FINAL_STAGE_START_MS)
})

test('stage selection maps choices to time offsets instead of wave clears', () => {
  assert.equal(getStageSelectionStartElapsedMs(0), 0)
  assert.equal(getStageSelectionStartElapsedMs(2), 2 * 60_000)
  assert.equal(getStageSelectionStartElapsedMs(16), FINAL_STAGE_START_MS)
  assert.equal(getStageSelectionStartElapsedMs(99), null)
})

test('boss win result presentation is explicit and reward-neutral', () => {
  const payload = {
    outcome: 'win',
    weaponName: '스타터 블래스터',
    elapsedMs: FINAL_STAGE_START_MS + 30_000,
    stageReachedLabel: '6막 크라운 피날레',
    finaleReached: true,
    endReason: 'boss-defeated',
  }
  const presentation = createRunResultPresentation(payload)
  const hudState = createRunResultHudState(payload)

  assert.equal(presentation.title, '런 클리어')
  assert.match(presentation.subtitle, /최종 발표 교수님/)
  assert.match(presentation.restartPrompt, /버튼/)
  assert.deepEqual(presentation.statLines, [
    '결과: 클리어',
    '최종 무기: 스타터 블래스터',
    '생존 시간: 16:30',
    '도달 단계: 6막 크라운 피날레',
    '피날레 진입: 예',
  ])
  assert.ok(presentation.inventoryLines.every((line) => !/해금|unlock/i.test(line)))
  assert.equal(hudState.title, '런 클리어')
  assert.equal(hudState.inventoryButtonDisabled, true)
  assert.equal(hudState.stageButtonDisabled, true)
  assert.equal(hudState.stageSelection.isOpen, false)
  assert.equal(hudState.modal.isOpen, false)
})

test('arena frame stops immediately after any run-ending combat step', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')

  for (const step of ['updateEnemies(delta)', 'updateProjectiles(delta)', 'updateHazards(delta)']) {
    assert.ok(
      arenaSceneSource.includes(`this.${step}
    if (this.isRunEnding) {
      return
    }`),
      `${step} must be followed by an isRunEnding guard so boss defeat cannot leave a frozen arena frame`,
    )
  }

  assert.ok(
    arenaSceneSource.includes(`for (const enemy of this.enemies) {
      if (enemy.sprite.active) {
        enemy.sprite.setVelocity(0, 0)
      }
    }`),
    'freezeCombat must skip destroyed enemy sprites because boss defeat destroys the boss before endRun freezes combat',
  )
})

test('arena token pickup applies player xp before pachinko token enqueue', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')

  assert.ok(
    arenaSceneSource.includes('const playerXpResult = this.grantPlayerXpForEnemy(pickup.enemyId)'),
    'collectPachinkoTokenPickup should grant run-local player XP only when the dropped token is collected',
  )
  assert.equal(
    arenaSceneSource.includes('const playerXpResult = this.grantPlayerXpForEnemy(enemy.config.id)'),
    false,
    'damageEnemy must not level the player before the token is collected',
  )
  assert.ok(
    arenaSceneSource.includes('this.playerProgression = result.state'),
    'grantPlayerXpForEnemy should update the scene progression state on token pickup',
  )
  assert.ok(
    arenaSceneSource.includes('this.showPlayerLevelUpFeedback(result.level)'),
    'level-up should trigger a lightweight visible feedback path',
  )
  assert.ok(
    arenaSceneSource.includes('getPlayerProgressionView(this.playerProgression.totalXp)'),
    'the player HUD should render from the player progression view',
  )
})

test('loss result presentation keeps restart guidance distinct from boss clear', () => {
  const presentation = createRunResultPresentation({
    outcome: 'loss',
    weaponName: '스타터 블래스터',
    elapsedMs: 12 * 60_000,
    stageReachedLabel: '3막 전격 혼합',
    finaleReached: false,
    endReason: 'player-defeated',
  })
  const timeoutPresentation = createRunResultPresentation({
    outcome: 'loss',
    weaponName: '스타터 블래스터',
    elapsedMs: RUN_DURATION_MS,
    stageReachedLabel: '6막 크라운 피날레',
    finaleReached: true,
    endReason: 'timeout',
  })

  assert.equal(presentation.title, '런 실패')
  assert.match(presentation.statLines[0] ?? '', /실패/)
  assert.match(presentation.objective, /다시 도전/)
  assert.match(presentation.restartPrompt, /다시 달려라!/)
  assert.equal(timeoutPresentation.title, '시간 종료')
  assert.match(timeoutPresentation.status, /타임아웃/)
})

test('start screen gates arena entry behind an explicit button', () => {
  const bootSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/BootScene.ts'), 'utf8')
  const startSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/StartScene.ts'), 'utf8')
  const configSource = readFileSync(resolve(TEST_DIR, '../src/game/config.ts'), 'utf8')

  assert.ok(configSource.includes('StartScene'))
  assert.ok(configSource.includes('scene: [BootScene, StartScene, ArenaScene, ResultScene]'))
  assert.ok(bootSceneSource.includes("this.scene.start('start')"))
  assert.ok(!bootSceneSource.includes("this.scene.start('arena')"))
  assert.ok(startSceneSource.includes(".setName('start-run-button')"))
  assert.ok(startSceneSource.includes("'달려라!'"))
  assert.ok(startSceneSource.includes('createPlayerTitleIcon'))
  assert.ok(startSceneSource.includes("this.add.sprite(0, 0, 'player-walk-0')"))
  assert.ok(startSceneSource.includes("playerIcon.play('player-move')"))
  assert.ok(startSceneSource.includes('setPadding(4, 8, 6, 8)'))
  assert.ok(startSceneSource.includes('const startRun = (): void => {'))
  assert.ok(startSceneSource.includes("this.scene.stop('arena')"))
  assert.ok(startSceneSource.includes("this.scene.start('arena', { startElapsedMs: 0 })"))
  assert.ok(!startSceneSource.includes('시작 전에는 시간이 흐르지 않고 적도 등장하지 않습니다.'))
  assert.ok(startSceneSource.includes('파친코 기계 앞에서 삶을 탕진한 김동성'))
  assert.ok(startSceneSource.includes('무기와 레벨로 바꿔 중독을 끊어낼 연료'))
  assert.ok(startSceneSource.includes('무엇이 쫓아오든 20분만 버티면'))
  assert.ok(startSceneSource.includes('잭팟이 아닌 자기 발로 내일을 되찾게'))
  assert.ok(!startSceneSource.includes("'새 런 시작'"))
  assert.ok(!startSceneSource.includes('경기장에 진입'))
  assert.ok(startSceneSource.includes('this.input.on(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)'))
  assert.ok(startSceneSource.includes('Phaser.Input.Keyboard.KeyCodes.ENTER'))
})

test('result scene restart is button-driven instead of R-key driven', () => {
  const resultSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ResultScene.ts'), 'utf8')

  assert.ok(
    resultSceneSource.includes(`.setName('restart-run-button')`),
    'ResultScene should expose a named restart button for the result screen',
  )
  assert.ok(resultSceneSource.includes("'다시 달려라!'"))
  assert.ok(
    resultSceneSource.includes(`const restartRun = (): void => {`),
    'ResultScene restart should use a shared restart handler for button input',
  )
  assert.ok(
    resultSceneSource.includes(`restartButton.on(Phaser.Input.Events.POINTER_DOWN`),
    'ResultScene restart should fire on button pointer down rather than waiting for a fragile pointer-up path',
  )
  assert.ok(
    resultSceneSource.includes(`this.input.on(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)`),
    'ResultScene should include a scene-level pointer fallback so button clicks restart even if game-object hit testing misses',
  )
  assert.ok(
    resultSceneSource.includes(`this.scene.stop('arena')`),
    'ResultScene restart handler should stop any stale arena scene before returning to a fresh start flow',
  )
  assert.ok(
    resultSceneSource.includes(`this.scene.start('start')`),
    'ResultScene restart handler should return to the start screen so the next run starts only after explicit input',
  )
  assert.ok(
    !resultSceneSource.includes(`this.scene.start('arena', { startElapsedMs: 0 })`),
    'ResultScene restart must not bypass the start screen',
  )
  assert.ok(
    resultSceneSource.includes(`const restartButtonY = Math.max(48, height - 48)`),
    'ResultScene restart button should stay inside the resized canvas instead of using fixed GAME_HEIGHT coordinates',
  )
  assert.ok(
    !resultSceneSource.includes(`Phaser.Input.Keyboard.Events.ANY_KEY_DOWN`),
    'ResultScene must not keep the old R-key restart binding',
  )
  assert.ok(
    !resultSceneSource.includes(`GAME_HEIGHT - 72`),
    'ResultScene restart button must not use the old fixed baseline that can fall outside resized canvases',
  )
})

test('elite wave appears before the boss wave', () => {
  assert.deepEqual(getWaveByIndex(3)?.entries, [{ enemyId: 'prism-slime', count: 1 }])
  assert.deepEqual(getWaveByIndex(4)?.entries, [{ enemyId: 'slime-boss', count: 1 }])
})

test('codex selectors expose hidden materials and token enemy rewards', () => {
  const codex = getCodexState(true)

  assert.equal(codex.isOpen, true)
  assert.equal(codex.items.length, 0)
  assert.equal(codex.recipes.length, 0)
  assert.equal(codex.enemies.length, 15)
  assert.match(codex.hint, /토큰 파친코/)



  const voltSlime = codex.enemies.find((enemy) => enemy.id === 'spark-slime')
  assert.ok(voltSlime)
  assert.deepEqual(voltSlime?.drops, [])
  assert.ok(voltSlime?.stats.some((stat) => stat.includes('보상 경험치 +90')))

  const prismSlime = codex.enemies.find((enemy) => enemy.id === 'prism-slime')
  assert.ok(prismSlime)
  assert.equal(prismSlime?.iconKey, 'prism-slime')
  assert.ok(prismSlime?.stats.some((stat) => stat.includes('보상 경험치 +180')))

  const dashSlime = codex.enemies.find((enemy) => enemy.id === 'dash-slime')
  assert.ok(dashSlime)
  assert.ok(dashSlime?.stats.some((stat) => stat.includes('고속 돌진')))

  const orbitSlime = codex.enemies.find((enemy) => enemy.id === 'orbit-slime')
  assert.ok(orbitSlime)
  assert.ok(orbitSlime?.stats.some((stat) => stat.includes('맴돕니다')))

  const boss = codex.enemies.find((enemy) => enemy.id === 'slime-boss')
  assert.ok(boss?.stats.some((stat) => stat.includes('즉시 런을 종료')))

  const needleWasp = codex.enemies.find((enemy) => enemy.id === 'needle-wasp')
  assert.ok(needleWasp)
  assert.equal(needleWasp?.iconKey, 'needle-wasp')
  assert.ok(needleWasp?.description.includes('코드리뷰'))
  assert.ok(needleWasp?.stats.some((stat) => stat.includes('부채꼴')))
  assert.deepEqual(needleWasp?.drops, [])
  assert.ok(needleWasp?.stats.some((stat) => stat.includes('보상 경험치 +120')))
})

test('recipe identity metadata stays aligned with known ids and weapon outputs', () => {
  const recipeIds = new Set(RECIPE_IDS)
  const weaponIds = new Set(WEAPON_IDS)

  assert.equal(RECIPE_DEFINITIONS.length, RECIPE_IDS.length)

  for (const recipe of RECIPE_DEFINITIONS) {
    assert.ok(recipeIds.has(recipe.id), `${recipe.id} should be registered`)
    assert.ok(weaponIds.has(recipe.outputWeaponId), `${recipe.outputWeaponId} should be registered`)
    assert.ok(recipe.identityLabel.trim(), `${recipe.id} should expose an identity label`)
    assert.ok(recipe.identityHint.trim(), `${recipe.id} should expose an identity hint`)
    assert.equal(WEAPON_DEFINITIONS[recipe.outputWeaponId].identityLabel, recipe.identityLabel)
  }

  assert.ok(WEAPON_DEFINITIONS['spark-carbine'].identityLabel?.trim())
  assert.ok(WEAPON_DEFINITIONS['mist-vortex'].identityLabel?.trim())
  assert.ok(WEAPON_DEFINITIONS['slime-glaive'].identityLabel?.trim())
  assert.ok(WEAPON_DEFINITIONS['prism-cutter'].identityLabel?.trim())
})

test('codex controller preserves scroll across repeated open renders', () => {
  class FakeCodexElement {
    hidden = true
    scrollTop = 0
    assignments = 0
    #innerHTML = ''

    get childElementCount() {
      return this.children.length
    }

    get innerHTML() {
      return this.#innerHTML
    }

    set innerHTML(value) {
      this.assignments += 1
      this.scrollTop = 0
      this.#innerHTML = value
    }
  }

  const element = new FakeCodexElement()
  const controller = new CodexController(element)
  const openState = getCodexState(true)

  controller.update(openState)
  assert.equal(element.hidden, false)
  assert.match(element.innerHTML, /숨긴 재료/)
  assert.match(element.innerHTML, /별 합성 안내/)
  assert.match(element.innerHTML, /적/)
  assert.equal(element.assignments, 1)

  element.scrollTop = 48
  controller.update(getCodexState(true))
  assert.match(element.innerHTML, /codex-enemy-icon/)
  assert.match(element.innerHTML, /assets\/units\/prism-slime-idle-0.svg/)

  assert.equal(element.scrollTop, 48)
  assert.equal(element.assignments, 1)

  controller.update(getCodexState(false))
  assert.equal(element.hidden, true)
  assert.equal(element.innerHTML, '')
  assert.equal(element.assignments, 2)

  controller.update(openState)
  assert.equal(element.hidden, false)
  assert.match(element.innerHTML, /숨긴 재료/)
  assert.equal(element.assignments, 3)
})

test('hud controller skips summary DOM rewrites for identical frame-loop updates', () => {
  class FakeClassList {
    toggle() {}
  }

  class FakeElement {
    children = []
    classList = new FakeClassList()
    dataset = {}
    disabled = false
    style = {}
    textContent = ''
    assignments = 0
    #innerHTML = ''
    #regions = new Map()

    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase()
    }

    get childElementCount() {
      return this.children.length
    }

    get innerHTML() {
      return this.#innerHTML
    }

    set innerHTML(value) {
      this.assignments += 1
      this.#innerHTML = value

      if (value.includes('data-region="equipped-weapons"')) {
        this.#regions.set('button[data-action="inventory-close"]', new FakeElement('button'))
        this.#regions.set('[data-region="equipped-weapons"]', new FakeElement('div'))
        this.#regions.set('[data-region="weapons"]', new FakeElement('div'))
        this.#regions.set('[data-region="character-stats"]', new FakeElement('div'))
      }
      if (value.includes('data-region="stages"')) {
        this.#regions.set('button[data-action="stage-close"]', new FakeElement('button'))
        this.#regions.set('[data-region="stages"]', new FakeElement('div'))
      }
    }

    addEventListener() {}

    removeEventListener() {}

    append(...nodes) {
      this.children.push(...nodes)
    }

    replaceChildren(...nodes) {
      this.children = nodes
    }

    querySelector(selector) {
      return this.#regions.get(selector) ?? null
    }

    querySelectorAll() {
      return []
    }
  }

  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
  }

  try {
    const root = new FakeElement('section')
    const controller = new HudController(root)
    const state = {
      title: 'NeoD 프로토타입',
      subtitle: '1 웨이브',
      stats: ['체력: 10/10', '무기: 기본'],
      inventory: ['젤 파편 × 1'],
      recipes: ['조합 대기'],
      objective: '웨이브를 버티세요.',
      tip: 'WASD 이동 · J 대시',
      status: '전투 중입니다. 계속 움직이세요.',
      inventoryButtonLabel: '인벤토리 열기',
      inventoryButtonDisabled: false,
      stageButtonLabel: '스테이지 선택',
      stageButtonDisabled: false,
      stageSelection: {
        isOpen: false,
        stages: [],
      },
      modal: {
        isOpen: false,
        items: [],
        recipes: [],
        weapons: [],
        characterStats: [],
      },
    }

    controller.update(state)
    const summaryElement = root.children[0]
    assert.equal(summaryElement.assignments, 1)
    assert.match(summaryElement.innerHTML, /hud-summary__status-line/)

    controller.update({ ...state, modal: { ...state.modal } })

    assert.equal(summaryElement.assignments, 1)
    assert.deepEqual(controller.getRenderMetrics(), {
      summaryAssignments: 1,
      summarySkips: 1,
      modalClosedSkips: 1,
    })
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = previousDocument
    }
  }
})

test('hud weapon modal renders the owned-weapon summary path with redesigned summary text', () => {
  class FakeClassList {
    toggle() {}
  }

  class FakeElement {
    children = []
    classList = new FakeClassList()
    dataset = {}
    disabled = false
    style = {}
    textContent = ''
    assignments = 0
    #innerHTML = ''
    #regions = new Map()

    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase()
    }

    get childElementCount() {
      return this.children.length
    }

    get innerHTML() {
      return this.#innerHTML
    }

    set innerHTML(value) {
      this.assignments += 1
      this.#innerHTML = value

      if (value.includes('data-region="equipped-weapons"')) {
        this.#regions.set('button[data-action="inventory-close"]', new FakeElement('button'))
        this.#regions.set('[data-region="equipped-weapons"]', new FakeElement('div'))
        this.#regions.set('[data-region="weapons"]', new FakeElement('div'))
        this.#regions.set('[data-region="character-stats"]', new FakeElement('div'))
      }
      if (value.includes('data-region="stages"')) {
        this.#regions.set('button[data-action="stage-close"]', new FakeElement('button'))
        this.#regions.set('[data-region="stages"]', new FakeElement('div'))
      }
    }

    addEventListener() {}
    removeEventListener() {}
    append(...nodes) { this.children.push(...nodes) }
    replaceChildren(...nodes) { this.children = nodes }
    querySelector(selector) { return this.#regions.get(selector) ?? null }
    querySelectorAll() { return [] }
  }

  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
  }

  try {
    const root = new FakeElement('section')
    const controller = new HudController(root)

    controller.update({
      title: 'NeoD 프로토타입',
      subtitle: '무기 점검',
      stats: ['체력: 10/10', '무기: 점검 중'],
      inventory: ['젤 파편 × 1'],
      recipes: ['합성 대기'],
      objective: '무기 정보를 확인하세요.',
      tip: 'WASD 이동 · J 대시',
      status: '점검 중',
      inventoryButtonLabel: '인벤토리 닫기',
      inventoryButtonDisabled: false,
      stageButtonLabel: '스테이지 선택',
      stageButtonDisabled: false,
      stageSelection: {
        isOpen: false,
        stages: [],
      },
      modal: {
        isOpen: true,
        items: [],
        recipes: [],
        weapons: [
          {
            id: 'spark-carbine',
            stackKey: 'spark-carbine:2',
            name: '오버드라이브 카빈',
            description: getWeaponStarHopeDescription('속도감 있는 전격 점사입니다.', 2),
            summary: '탄당 11 · 3점사 · 사거리 560 · 오버드라이브 속사',
            star: 2,
            count: 1,
            damage: 19,
            fireRateMs: 131,
            projectileSpeed: 792,
            isEquipped: true,
            tuningLabel: null,
            canTune: false,
            tuneDisabledReason: '튜닝 비활성',
            canFuse: false,
            fuseDisabledReason: '같은 별 2개가 필요합니다.',
            hudIconKey: 'weapon-spark-carbine',
            accentColor: 0xfff06a,
          },
        ],
        characterStats: [
          { label: '공격력', value: '24', bonus: '(+6)' },
          { label: '최대 체력', value: '132', bonus: '(+32)' },
        ],
      },
      pachinko: {
        level: 1,
        totalTokenXp: 0,
        droppedTokens: 0,
        queuedTokens: 0,
        isTokenInFlight: false,
        latestReward: null,
      },
    })

    const weaponList = controller.weaponList
    const firstWeaponEntry = weaponList.children[0]
    const firstWeaponRow = firstWeaponEntry.children[1] ? firstWeaponEntry : firstWeaponEntry.children[0]
    const left = firstWeaponRow.children[0]
    const textGroup = left.children[left.children.length - 1]
    const description = textGroup.children[1]
    const meta = textGroup.children[2]

    assert.equal(firstWeaponRow.children.length, 2)
    assert.equal(firstWeaponRow.children[1].children.length, 1)
    assert.equal(firstWeaponRow.children[1].children[0].textContent, '장착 중')
    assert.match(description.textContent, /다음 수/)
    assert.equal(meta.textContent, '탄당 11 · 3점사 · 사거리 560 · 오버드라이브 속사')

    const equippedRow = controller.equippedWeaponList.children[0]
    assert.equal(equippedRow.children.length, 1)

    const characterStats = controller.characterStatsList
    assert.equal(characterStats.children[0].children[1].textContent, '24')
    assert.equal(characterStats.children[0].children[1].children[1].textContent, '(+6)')
    assert.equal(characterStats.children[1].children[1].textContent, '132')
    assert.equal(characterStats.children[1].children[1].children[1].textContent, '(+32)')
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = previousDocument
    }
  }
})

test('elite drop table returns a tuning capsule', () => {
  assert.equal(
    resolveWeightedDrop(ENEMY_DEFINITIONS['prism-slime'].drops, () => 0),
    'tuning-capsule',
  )
})

test('tuning consumes one capsule and records a deterministic effect', () => {
  const result = resolveTuningSelection(
    {
      inventory: { 'tuning-capsule': 2 },
      ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
      tuningState: {},
    },
    'acid-sprayer',
    () => 0,
  )

  assert.ok(result)
  assert.deepEqual(result?.nextInventory, { 'tuning-capsule': 1 })
  assert.deepEqual(result?.nextTuningState, { 'acid-sprayer': 'sharpened-core' })
  assert.equal(result?.effectId, 'sharpened-core')
})

test('branch weapons remain eligible for tuning as crafted weapons', () => {
  const sparkResult = resolveTuningSelection(
    {
      inventory: { 'tuning-capsule': 1 },
      ownedWeaponIds: ['starter-blaster', 'spark-carbine'],
      tuningState: {},
    },
    'spark-carbine',
    () => 0.34,
  )

  assert.ok(sparkResult)
  assert.deepEqual(sparkResult?.nextInventory, {})
  assert.deepEqual(sparkResult?.nextTuningState, { 'spark-carbine': 'quick-loader' })

  const mistResult = resolveTuningSelection(
    {
      inventory: { 'tuning-capsule': 1 },
      ownedWeaponIds: ['starter-blaster', 'mist-vortex'],
      tuningState: {},
    },
    'mist-vortex',
    () => 0.99,
  )

  assert.ok(mistResult)
  assert.deepEqual(mistResult?.nextInventory, {})
  assert.deepEqual(mistResult?.nextTuningState, { 'mist-vortex': 'stabilized-bore' })
})

test('tuning rejects invalid selections without consuming capsules', () => {
  const state = {
    inventory: { 'tuning-capsule': 1 },
    ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    tuningState: {},
  }

  assert.equal(resolveTuningSelection(state, 'starter-blaster', () => 0), null)
  assert.equal(resolveTuningSelection(state, 'frost-lance', () => 0), null)
  assert.deepEqual(state.inventory, { 'tuning-capsule': 1 })
})

test('tuning requires a capsule and blocks rerolls', () => {
  assert.equal(
    resolveTuningSelection(
      {
        inventory: {},
        ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
        tuningState: {},
      },
      'acid-sprayer',
      () => 0,
    ),
    null,
  )

  assert.equal(
    resolveTuningSelection(
      {
        inventory: { 'tuning-capsule': 1 },
        ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
        tuningState: { 'acid-sprayer': 'quick-loader' },
      },
      'acid-sprayer',
      () => 0,
    ),
    null,
  )
})

test('tuning effect selection is deterministic from injected random source', () => {
  const baseState = {
    inventory: { 'tuning-capsule': 1 },
    ownedWeaponIds: ['starter-blaster', 'acid-sprayer'],
    tuningState: {},
  }

  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 0)?.effectId, 'sharpened-core')
  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 0.34)?.effectId, 'quick-loader')
  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 0.99)?.effectId, 'stabilized-bore')
  assert.equal(resolveTuningSelection(baseState, 'acid-sprayer', () => 1)?.effectId, 'stabilized-bore')
})

test('effective weapon stats apply each tuning without mutating base definitions', () => {
  const baseWeapon = { ...WEAPON_DEFINITIONS['acid-sprayer'] }

  assert.equal(
    deriveEffectiveWeaponStats('acid-sprayer', { 'acid-sprayer': 'sharpened-core' }).damage,
    baseWeapon.damage + 4,
  )
  assert.equal(
    deriveEffectiveWeaponStats('acid-sprayer', { 'acid-sprayer': 'quick-loader' }).fireRateMs,
    Math.round(baseWeapon.fireRateMs * 0.9),
  )
  assert.equal(
    deriveEffectiveWeaponStats('acid-sprayer', { 'acid-sprayer': 'stabilized-bore' }).projectileSpeed,
    baseWeapon.projectileSpeed + 70,
  )
  assert.deepEqual(deriveEffectiveWeaponStats('acid-sprayer', {}), WEAPON_DEFINITIONS['acid-sprayer'])
  assert.deepEqual(WEAPON_DEFINITIONS['acid-sprayer'], baseWeapon)
})

test('effective weapon stats scale by star grade for combat-visible fusion payoff', () => {
  const oneStar = deriveEffectiveWeaponStats('acid-sprayer', {}, 1)
  const fiveStar = deriveEffectiveWeaponStats('acid-sprayer', {}, 5)
  const tunedThreeStar = deriveEffectiveWeaponStats('acid-sprayer', { 'acid-sprayer': 'quick-loader' }, 3)
  const glaiveThreeStar = deriveEffectiveWeaponStats('slime-glaive', {}, 3)

  assert.equal(fiveStar.damage, 19)
  assert.equal(fiveStar.fireRateMs, 319)
  assert.equal(fiveStar.projectileSpeed, 554)
  assert.ok(fiveStar.damage > oneStar.damage)
  assert.ok(fiveStar.fireRateMs < oneStar.fireRateMs)
  assert.ok(fiveStar.projectileSpeed > oneStar.projectileSpeed)
  assert.equal(tunedThreeStar.fireRateMs, 333)
  assert.equal(glaiveThreeStar.attackBehavior.kind, 'melee-cleave')
  assert.equal(glaiveThreeStar.attackBehavior.range, WEAPON_DEFINITIONS['slime-glaive'].attackBehavior.range + 12)
})

test('player level combat stats raise health and weapon damage globally', () => {
  assert.equal(BASE_PLAYER_MAX_HEALTH, 100)
  assert.equal(PLAYER_HEALTH_PER_LEVEL, 8)
  assert.equal(PLAYER_DAMAGE_MULTIPLIER_PER_LEVEL, 0.05)

  assert.deepEqual(getPlayerLevelCombatStats(1), {
    level: 1,
    maxHealth: 100,
    damageMultiplier: 1,
    weaponRangeMultiplier: 1,
    weaponSpecialTier: 0,
  })

  assert.deepEqual(getPlayerLevelCombatStats(10), {
    level: 10,
    maxHealth: 172,
    damageMultiplier: 1.45,
    weaponRangeMultiplier: 1.16,
    weaponSpecialTier: 1,
  })

  const levelTenBlaster = deriveEffectiveWeaponStats('starter-blaster', {}, 1, 10)
  assert.equal(levelTenBlaster.damage, 7)
  assert.equal(levelTenBlaster.range, 487)
  assert.equal(levelTenBlaster.playerDamageMultiplier, 1.45)
  assert.equal(levelTenBlaster.weaponSpecialTier, 1)
  assert.equal(levelTenBlaster.visualPowerTier, 1)
  assert.match(levelTenBlaster.levelUpgradeLabel, /범위 \+16%/)
  assert.match(levelTenBlaster.levelUpgradeDescription, /점사 박자/)
})

test('weapon milestone upgrades expand behavior every five and ten player levels', () => {
  const levelFiveGlaive = deriveEffectiveWeaponStats('slime-glaive', {}, 1, 5)
  assert.equal(levelFiveGlaive.attackBehavior.kind, 'melee-cleave')
  assert.equal(levelFiveGlaive.attackBehavior.range, 93)

  const levelTenBlaster = deriveEffectiveWeaponStats('starter-blaster', {}, 1, 10)
  assert.equal(levelTenBlaster.attackBehavior.kind, 'burst-fire')
  assert.equal(levelTenBlaster.attackBehavior.shotsPerBurst, 6)

  const levelTwentyFrost = deriveEffectiveWeaponStats('frost-lance', {}, 1, 20)
  assert.equal(levelTwentyFrost.attackBehavior.kind, 'impact-aoe')
  assert.equal(levelTwentyFrost.attackBehavior.explosionRadius, 116)
  assert.equal(levelTwentyFrost.attackBehavior.explosionDamage, 55)

  const levelTwentyArc = deriveEffectiveWeaponStats('arc-loom', {}, 1, 20)
  assert.equal(levelTwentyArc.attackBehavior.kind, 'single')
  assert.equal(levelTwentyArc.attackBehavior.ricochet?.maxBounces, 4)
  assert.equal(levelTwentyArc.attackBehavior.ricochet?.bounceRange, 240)

  const levelTwentyMist = deriveEffectiveWeaponStats('mist-vortex', {}, 1, 20)
  assert.equal(levelTwentyMist.attackBehavior.kind, 'zone-control')
  assert.equal(levelTwentyMist.attackBehavior.zoneRadius, 58)
  assert.equal(levelTwentyMist.attackBehavior.zoneDamage, 47)
  assert.equal(levelTwentyMist.attackBehavior.zoneTriggerMode, 'trigger-explode')

  const levelTwentySpark = deriveEffectiveWeaponStats('spark-carbine', {}, 1, 20)
  assert.equal(levelTwentySpark.attackBehavior.kind, 'deploy-turret')
  assert.equal(levelTwentySpark.attackBehavior.deploy.maxTurrets, 3)
  assert.equal(levelTwentySpark.attackBehavior.deploy.range, 330)

  const levelTwentyPrism = deriveEffectiveWeaponStats('prism-cutter', {}, 1, 20)
  assert.equal(levelTwentyPrism.attackBehavior.kind, 'combo-melee')
  assert.equal(levelTwentyPrism.attackBehavior.steps.at(-1)?.maxTargets, 6)
  assert.equal(levelTwentyPrism.attackBehavior.steps.at(-1)?.range, 103)
})

test('level-up weapon visuals expose stronger projectiles and HUD copy', () => {
  const levelTenBlaster = deriveEffectiveWeaponStats('starter-blaster', {}, 1, 10)
  const plan = buildAttackPlan(levelTenBlaster, { x: 0, y: 0 }, { x: 10, y: 0 })

  assert.equal(plan.projectiles.length, 6)
  assert.equal(plan.projectiles[0].visualPowerTier, 1)
  assert.equal(plan.projectiles[0].radius, 6)

  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')
  const hudSource = readFileSync(resolve(TEST_DIR, '../src/ui/Hud.ts'), 'utf8')

  assert.ok(arenaSceneSource.includes('levelUpgradeLabel: effectiveWeapon.levelUpgradeLabel'))
  assert.ok(arenaSceneSource.includes('projectile.setScale(1 + visualTier * 0.08)'))
  assert.ok(arenaSceneSource.includes('spawnMeleeSwingEffect(this'))
  assert.ok(hudSource.includes('weapon.levelUpgradeLabel'))
  assert.ok(hudSource.includes('weapon.levelUpgradeDescription'))
  assert.ok(hudSource.includes('weapon.identityLabel'))
  assert.ok(hudSource.includes('weapon.summary'))
})

test('arena damage feedback shows normal hits as numbers and critical hits with emphasis', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')

  assert.ok(arenaSceneSource.includes('this.showDamageFeedback(enemy.sprite.x, enemy.sprite.y, criticalHit.damage, criticalHit.isCritical)'))
  assert.ok(arenaSceneSource.includes('label: `${damage}`'))
  assert.ok(arenaSceneSource.includes('label: `CRIT! ${damage}`'))
  assert.ok(arenaSceneSource.includes("color: '#f7fbff'"))
  assert.ok(arenaSceneSource.includes("color: '#ffd866'"))
})

test('combat effects are split out for projectile trails and lingering hazard pulses', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')
  const combatEffectsSource = readFileSync(resolve(TEST_DIR, '../src/scenes/arena/combatEffects.ts'), 'utf8')
  const levelTwentyFrost = deriveEffectiveWeaponStats('frost-lance', {}, 1, 20)
  const levelTwentyMist = deriveEffectiveWeaponStats('mist-vortex', {}, 1, 20)
  const frostPlan = buildAttackPlan(levelTwentyFrost, { x: 0, y: 0 }, { x: 10, y: 0 })
  const mistPlan = buildAttackPlan(levelTwentyMist, { x: 0, y: 0 }, { x: 10, y: 0 })

  assert.equal(frostPlan.projectiles[0]?.explosionOnHit?.radius, 116)
  assert.equal(mistPlan.projectiles[0]?.hazardOnHit?.visualPowerTier, 2)
  assert.ok(arenaSceneSource.includes('spawnProjectileTrailEffect('))
  assert.ok(arenaSceneSource.includes('createHazardZoneEffect('))
  assert.ok(arenaSceneSource.includes("weapon.attackBehavior.zoneTriggerMode === 'trigger-explode'"))
  assert.ok(arenaSceneSource.includes('this.lastPlayerMoveDirection.x'))
  assert.ok(combatEffectsSource.includes('spawnHazardTickEffect'))
  assert.ok(combatEffectsSource.includes('scene.add.graphics({ x, y })'))
  assert.ok(combatEffectsSource.includes('scene.add.container(point.x, point.y)'))
})

test('effective melee weapon tuning updates nested behavior immutably', () => {
  const baseWeapon = WEAPON_DEFINITIONS['slime-glaive']
  const baseBehavior = baseWeapon.attackBehavior

  assert.equal(baseBehavior.kind, 'melee-cleave')

  const sharpened = deriveEffectiveWeaponStats('slime-glaive', { 'slime-glaive': 'sharpened-core' })
  const quick = deriveEffectiveWeaponStats('slime-glaive', { 'slime-glaive': 'quick-loader' })
  const stabilized = deriveEffectiveWeaponStats('slime-glaive', { 'slime-glaive': 'stabilized-bore' })

  assert.equal(sharpened.damage, baseWeapon.damage + 4)
  assert.equal(quick.fireRateMs, Math.round(baseWeapon.fireRateMs * 0.9))
  assert.equal(stabilized.attackBehavior.kind, 'melee-cleave')
  assert.equal(stabilized.attackBehavior.range, baseBehavior.range + 18)
  assert.equal(getWeaponAttackRange(stabilized), baseBehavior.range + 18)
  assert.notEqual(stabilized.attackBehavior, baseBehavior)
  assert.deepEqual(WEAPON_DEFINITIONS['slime-glaive'], baseWeapon)
})

test('visual asset manifest paths exist for all external art assets', () => {
  const missingAssets = VECTOR_ASSETS.filter((asset) => {
    const assetPath = resolve(TEST_DIR, '..', 'public', asset.path)
    return !existsSync(assetPath)
  }).map((asset) => asset.path)

  assert.deepEqual(missingAssets, [])
})

test('enemy visual metadata keeps immutable gameplay geometry while adding art hooks', () => {
  assert.equal(PLAYER_COLLISION_RADIUS, 14)
  assert.equal(PROJECTILE_COLLISION_RADIUS, 5)
  assert.equal(ENEMY_CONTACT_PADDING, 16)
  assert.equal(PROJECTILE_HIT_PADDING, 7)
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(ENEMY_DEFINITIONS).map(([enemyId, enemy]) => [
        enemyId,
        {
          size: enemy.size,
          textureKey: enemy.textureKey,
          animationKey: enemy.animationKey,
        },
      ]),
    ),
    {
      slime: { size: 20, textureKey: 'slime', animationKey: 'slime-idle' },
      'spark-slime': { size: 22, textureKey: 'spark-slime', animationKey: 'spark-slime-idle' },
      'prism-slime': { size: 30, textureKey: 'prism-slime', animationKey: 'prism-slime-idle' },
      'dash-slime': { size: 24, textureKey: 'dash-slime', animationKey: 'dash-slime-idle' },
      'orbit-slime': { size: 22, textureKey: 'orbit-slime', animationKey: 'orbit-slime-idle' },
      'needle-wasp': { size: 24, textureKey: 'needle-wasp', animationKey: 'needle-wasp-idle' },
      'splitter-slime': { size: 24, textureKey: 'splitter-slime', animationKey: 'splitter-slime-idle' },
      'shard-sentinel': { size: 28, textureKey: 'shard-sentinel', animationKey: 'shard-sentinel-idle' },
      'mender-slime': { size: 22, textureKey: 'mender-slime', animationKey: 'mender-slime-idle' },
      'void-orb': { size: 24, textureKey: 'void-orb', animationKey: 'void-orb-idle' },
      'crusher-slime': { size: 34, textureKey: 'crusher-slime', animationKey: 'crusher-slime-idle' },
      'lantern-moth': { size: 26, textureKey: 'lantern-moth', animationKey: 'lantern-moth-idle' },
      'mirror-wisp': { size: 22, textureKey: 'mirror-wisp', animationKey: 'mirror-wisp-idle' },
      'siege-toad': { size: 36, textureKey: 'siege-toad', animationKey: 'siege-toad-idle' },
      'slime-boss': { size: 44, textureKey: 'slime-boss', animationKey: 'slime-boss-idle' },
    },
  )
})



test('dash slime movement locks a burst vector through the charge window', () => {
  const dashSlime = ENEMY_DEFINITIONS['dash-slime']
  const firstMove = resolveEnemyVelocityStep(
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    dashSlime.speed,
    dashSlime.movementBehavior,
    createEnemyRuntimeState(dashSlime.movementBehavior),
    1_000,
  )

  assert.equal(dashSlime.movementBehavior.kind, 'dash')
  assert.equal(firstMove.mode, 'dash-charge')
  assert.ok(dashSlime.movementBehavior.chargeSpeed > dashSlime.speed)
  assert.equal(firstMove.velocity.x, dashSlime.movementBehavior.chargeSpeed)
  assert.equal(firstMove.velocity.y, 0)

  const lockedMove = resolveEnemyVelocityStep(
    { x: 20, y: 0 },
    { x: 20, y: 120 },
    dashSlime.speed,
    dashSlime.movementBehavior,
    firstMove.runtimeState,
    1_100,
  )

  assert.equal(lockedMove.mode, 'dash-charge')
  assert.deepEqual(lockedMove.velocity, firstMove.velocity)

  const recoveryMove = resolveEnemyVelocityStep(
    { x: 20, y: 0 },
    { x: 20, y: 120 },
    dashSlime.speed,
    dashSlime.movementBehavior,
    lockedMove.runtimeState,
    1_550,
  )

  assert.equal(recoveryMove.mode, 'dash-recover')
  assert.equal(recoveryMove.velocity.x, 0)
  assert.equal(recoveryMove.velocity.y, dashSlime.speed)
})

test('orbit slime movement adds lateral pressure inside its engagement band', () => {
  const orbitSlime = ENEMY_DEFINITIONS['orbit-slime']
  const orbitVelocity = resolveEnemyVelocity(
    { x: 90, y: 0 },
    { x: 0, y: 0 },
    orbitSlime.speed,
    orbitSlime.movementBehavior,
  )

  assert.equal(orbitSlime.movementBehavior.kind, 'orbit')
  assert.ok(orbitVelocity.x < 0)
  assert.notEqual(orbitVelocity.y, 0)

  const chaseVelocity = resolveEnemyVelocity(
    { x: 90, y: 0 },
    { x: 0, y: 0 },
    orbitSlime.speed,
    { kind: 'direct-chase' },
  )
  assert.equal(chaseVelocity.y, 0)
})

test('item and weapon visual metadata stays aligned with the external asset pass', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(ITEM_DEFINITIONS).map(([itemId, item]) => [itemId, item.textureKey]),
    ),
    {
      'gel-shard': 'gel-shard',
      'acid-core': 'acid-core',
      'frost-mote': 'frost-mote',
      'spark-knot': 'spark-knot',
      'mist-bead': 'mist-bead',
      'tuning-capsule': 'tuning-capsule',
      'chitin-needle': 'chitin-needle',
    },
  )

  assert.deepEqual(
    Object.fromEntries(
      VECTOR_ASSETS
        .filter((asset) => Object.values(ITEM_DEFINITIONS).some((item) => item.textureKey === asset.key))
        .map((asset) => [asset.key, { width: asset.width, height: asset.height, radius: asset.fallback?.radius }]),
    ),
    {
      'gel-shard': { width: 22, height: 22, radius: 10 },
      'acid-core': { width: 22, height: 22, radius: 10 },
      'frost-mote': { width: 22, height: 22, radius: 10 },
      'spark-knot': { width: 22, height: 22, radius: 10 },
      'mist-bead': { width: 22, height: 22, radius: 10 },
      'tuning-capsule': { width: 22, height: 22, radius: 10 },
      'chitin-needle': { width: 22, height: 22, radius: 10 },
    },
  )

  assert.deepEqual(
    VECTOR_ASSETS
      .filter((asset) => asset.key === HEART_PICKUP_TEXTURE_KEY)
      .map((asset) => ({ key: asset.key, width: asset.width, height: asset.height, radius: asset.fallback?.radius })),
    [{ key: 'heart-pickup', width: 24, height: 24, radius: 11 }],
  )

  assert.deepEqual(
    Object.fromEntries(
      Object.entries(WEAPON_DEFINITIONS).map(([weaponId, weapon]) => [
        weaponId,
        {
          projectileTextureKey: weapon.projectileTextureKey,
          hudIconKey: weapon.visual.hudIconKey,
        },
      ]),
    ),
    {
      'starter-blaster': {
        projectileTextureKey: 'starter-projectile',
        hudIconKey: 'weapon-starter-blaster',
      },
      'acid-sprayer': {
        projectileTextureKey: 'acid-projectile',
        hudIconKey: 'weapon-acid-sprayer',
      },
      'frost-lance': {
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-frost-lance',
      },
      'storm-cannon': {
        projectileTextureKey: 'storm-projectile',
        hudIconKey: 'weapon-storm-cannon',
      },
      'arc-loom': {
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-arc-loom',
      },
      'spark-carbine': {
        projectileTextureKey: 'spark-projectile',
        hudIconKey: 'weapon-spark-carbine',
      },
      'mist-vortex': {
        projectileTextureKey: 'mist-projectile',
        hudIconKey: 'weapon-mist-vortex',
      },
      'slime-glaive': {
        projectileTextureKey: 'arc-projectile',
        hudIconKey: 'weapon-slime-glaive',
      },
      'prism-cutter': {
        projectileTextureKey: 'frost-projectile',
        hudIconKey: 'weapon-prism-cutter',
      },
      'needle-fan': {
        projectileTextureKey: 'needle-projectile',
        hudIconKey: 'weapon-needle-fan',
      },
    },
  )
})

test('enemy health bar metrics clamp across enemy sizes', () => {
  assert.deepEqual(getEnemyHealthBarMetrics(20), {
    width: 32,
    height: 4,
    offsetY: 22,
  })

  assert.deepEqual(getEnemyHealthBarMetrics(80), {
    width: 68,
    height: 8,
    offsetY: 56,
  })
})

test('enemy health bar fill width tracks clamped health ratio', () => {
  assert.equal(getEnemyHealthFillWidth(26, 26, 32), 32)
  assert.equal(getEnemyHealthFillWidth(13, 26, 32), 16)
  assert.equal(getEnemyHealthFillWidth(0, 26, 32), 0)
  assert.equal(getEnemyHealthFillWidth(-10, 26, 32), 0)
  assert.equal(getEnemyHealthFillWidth(40, 26, 32), 32)
  assert.equal(getEnemyHealthFillWidth(5, 0, 32), 0)
})

test('player health bar metrics place a compact top hud with level and xp rows', () => {
  assert.deepEqual(getPlayerHealthBarMetrics(960, 540), {
    x: 360,
    y: 22,
    width: 240,
    height: 10,
    levelLabelY: 38,
    xpY: 52,
    xpWidth: 240,
    xpHeight: 6,
  })
})

test('player health bar fill width tracks clamped health ratio', () => {
  assert.equal(getPlayerHealthFillWidth(100, 100, 236), 236)
  assert.equal(getPlayerHealthFillWidth(50, 100, 236), 118)
  assert.equal(getPlayerHealthFillWidth(0, 100, 236), 0)
  assert.equal(getPlayerHealthFillWidth(-10, 100, 236), 0)
  assert.equal(getPlayerHealthFillWidth(140, 100, 236), 236)
  assert.equal(getPlayerHealthFillWidth(20, 0, 236), 0)
})

test('player experience bar fill width tracks clamped progress ratio', () => {
  assert.equal(getPlayerExperienceFillWidth(0, 236), 0)
  assert.equal(getPlayerExperienceFillWidth(0.5, 236), 118)
  assert.equal(getPlayerExperienceFillWidth(1, 236), 236)
  assert.equal(getPlayerExperienceFillWidth(-0.5, 236), 0)
  assert.equal(getPlayerExperienceFillWidth(1.5, 236), 236)
})
