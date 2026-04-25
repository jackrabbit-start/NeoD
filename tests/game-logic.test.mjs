import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
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
  PLAYER_SAFE_RADIUS,
  createMapLayout,
  getAmbientItemSpawnPoints,
  getHeartItemSpawnPoints,
  getWorldCenter,
  isCircleClearOfObstacles,
  isPointWithinWorld,
  selectAmbientItemSpawnPoint,
  selectHeartItemSpawnPoint,
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
  MAX_ACTIVE_PACHINKO_TOKENS,
  PACHINKO_SLOT_COUNT,
  PACHINKO_LEVEL_THRESHOLDS,
  PACHINKO_REWARD_TABLE_REFRESH_MS,
  PACHINKO_TOKEN_LAUNCH_INTERVAL_MS,
  STAR_ODDS_BY_LEVEL,
  applyEnemyPachinkoTokenProgress,
  applyPachinkoSlotModifier,
  buildPachinkoSlotModifiers,
  buildPachinkoSlotRewards,
  canLaunchPachinkoToken,
  getPachinkoRewardTableSeed,
  getPachinkoRewardLevel,
  getPachinkoStarRangeForPlayerLevel,
  getPachinkoWeaponFamily,
  getPachinkoWeaponFamilyLabel,
  getPachinkoWeaponSynergySummary,
  getTokenXpForEnemy,
  resolvePachinkoLandingReward,
  resolvePachinkoReward,
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
import { GAME_HEADER_CONTROL_HINTS, GAMEPLAY_CONTROL_TIP, GAME_TITLE } from '../.tmp-test/src/ui/controlCopy.js'

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
})

test('loot attraction step is bounded to the attraction phase', () => {
  assert.equal(getLootAttractionStep(LOOT_ATTRACTION_RADIUS + 1, 16), 0)
  assert.equal(getLootAttractionStep(LOOT_COLLECT_RADIUS, 16), 0)
  assert.equal(getLootAttractionStep((LOOT_ATTRACTION_RADIUS + LOOT_COLLECT_RADIUS) / 2, 16) > 0, true)
  assert.equal(getLootAttractionStep((LOOT_ATTRACTION_RADIUS + LOOT_COLLECT_RADIUS) / 2, -16), 0)
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
    statusMessage: '난리자베스 분사기 제작 및 장착 완료. 준비되면 런을 다시 진행하세요.',
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
  assert.deepEqual(PACHINKO_LEVEL_THRESHOLDS, [0, 6, 14, 26, 42])
  assert.deepEqual(STAR_ODDS_BY_LEVEL[1], [70, 25, 5, 0, 0])
  assert.deepEqual(STAR_ODDS_BY_LEVEL[5], [20, 30, 30, 15, 5])

  assert.equal(getTokenXpForEnemy('slime'), 1)
  assert.equal(getTokenXpForEnemy('spark-slime'), 2)
  assert.equal(getTokenXpForEnemy('dash-slime'), 2)
  assert.equal(getTokenXpForEnemy('orbit-slime'), 2)
  assert.equal(getTokenXpForEnemy('prism-slime'), 4)
  assert.equal(getTokenXpForEnemy('slime-boss'), 0)
  assert.equal(shouldEnemyGrantPachinkoToken('slime'), true)
  assert.equal(shouldEnemyGrantPachinkoToken('slime-boss'), false)

  assert.equal(getPachinkoRewardLevel(0), 1)
  assert.equal(getPachinkoRewardLevel(5), 1)
  assert.equal(getPachinkoRewardLevel(6), 2)
  assert.equal(getPachinkoRewardLevel(14), 3)
  assert.equal(getPachinkoRewardLevel(26), 4)
  assert.equal(getPachinkoRewardLevel(42), 5)
  assert.equal(getPachinkoRewardLevel(999), 5)
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
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(17), { minStar: 3, maxStar: 5 })
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(25), { minStar: 4, maxStar: 5 })
  assert.deepEqual(getPachinkoStarRangeForPlayerLevel(33), { minStar: 5, maxStar: 5 })

  const lowLevelStars = buildPachinkoSlotRewards(42, PACHINKO_SLOT_COUNT, 0, 1).map((slot) => slot.star)
  const midLevelStars = buildPachinkoSlotRewards(42, PACHINKO_SLOT_COUNT, 0, 9).map((slot) => slot.star)
  const highLevelStars = buildPachinkoSlotRewards(42, PACHINKO_SLOT_COUNT, 0, 25).map((slot) => slot.star)

  assert.equal(Math.min(...lowLevelStars), 1)
  assert.equal(Math.max(...lowLevelStars), 2)
  assert.equal(Math.min(...midLevelStars), 2)
  assert.equal(Math.max(...midLevelStars), 4)
  assert.equal(Math.min(...highLevelStars), 4)
  assert.equal(Math.max(...highLevelStars), 5)
})

test('enemy defeat token progress feeds the same landing reward resolver as the scene', () => {
  let progress = { totalTokenXp: 0, queuedTokenXp: [] }
  progress = applyEnemyPachinkoTokenProgress(progress, 'slime')
  assert.deepEqual(progress, {
    totalTokenXp: 1,
    queuedTokenXp: [1],
    grantedTokenXp: 1,
    didEnqueue: true,
    rewardLevel: 1,
  })

  progress = applyEnemyPachinkoTokenProgress(progress, 'prism-slime')
  assert.deepEqual(progress.queuedTokenXp, [1, 4])
  assert.equal(progress.totalTokenXp, 5)
  assert.equal(progress.rewardLevel, 1)

  const bossProgress = applyEnemyPachinkoTokenProgress(progress, 'slime-boss')
  assert.deepEqual(bossProgress, {
    ...progress,
    grantedTokenXp: 0,
    didEnqueue: false,
    rewardLevel: 1,
  })

  const landingSeed = 7
  const playerLevel = 17
  const visibleLandingSlot = resolvePachinkoSlotReward(42, 0.999, PACHINKO_SLOT_COUNT, landingSeed, playerLevel)
  assert.deepEqual(resolvePachinkoLandingReward(42, 0.999, landingSeed, playerLevel), {
    weaponId: visibleLandingSlot.weaponId,
    star: visibleLandingSlot.star,
  })
})

test('player progression starts per run and levels from enemy defeat xp', () => {
  assert.deepEqual(PLAYER_LEVEL_XP_THRESHOLDS, [0, 5, 12, 22, 36])
  assert.deepEqual(ENEMY_PLAYER_XP, {
    slime: 1,
    'spark-slime': 2,
    'prism-slime': 5,
    'dash-slime': 2,
    'orbit-slime': 2,
    'needle-wasp': 3,
    'splitter-slime': 2,
    'shard-sentinel': 3,
    'mender-slime': 2,
    'void-orb': 3,
    'crusher-slime': 4,
    'slime-boss': 0,
  })

  const initial = createInitialPlayerProgressionState()
  assert.deepEqual(initial, { totalXp: 0, level: 1 })
  assert.deepEqual(createInitialArenaRunState().playerProgression, initial)

  assert.equal(getPlayerXpForEnemy('slime'), 1)
  assert.equal(getPlayerXpForEnemy('prism-slime'), 5)
  assert.equal(getPlayerXpForEnemy('slime-boss'), 0)
  assert.equal(getPlayerLevelForXp(0), 1)
  assert.equal(getPlayerLevelForXp(4), 1)
  assert.equal(getPlayerLevelForXp(5), 2)
  assert.equal(getPlayerLevelForXp(12), 3)
  assert.equal(getPlayerLevelForXp(36), 5)
  assert.equal(getPlayerLevelForXp(55), 6)
  assert.equal(getPlayerLevelForXp(999), 17)

  const firstDefeat = applyEnemyPlayerXp(initial, 'prism-slime')
  assert.deepEqual(firstDefeat.state, { totalXp: 5, level: 2 })
  assert.equal(firstDefeat.grantedXp, 5)
  assert.equal(firstDefeat.didLevelUp, true)
  assert.equal(firstDefeat.view.xpIntoLevel, 0)
  assert.equal(firstDefeat.view.xpToNextLevel, 7)

  const nextDefeat = applyEnemyPlayerXp(firstDefeat.state, 'needle-wasp')
  assert.deepEqual(nextDefeat.state, { totalXp: 8, level: 2 })
  assert.equal(nextDefeat.didLevelUp, false)
  assert.equal(nextDefeat.view.xpIntoLevel, 3)
  assert.equal(nextDefeat.view.progressRatio, 3 / 7)

  const bossDefeat = applyEnemyPlayerXp(nextDefeat.state, 'slime-boss')
  assert.deepEqual(bossDefeat.state, nextDefeat.state)
  assert.equal(bossDefeat.grantedXp, 0)
  assert.equal(bossDefeat.didLevelUp, false)
})

test('player progression view clamps invalid xp and continues past seeded levels', () => {
  assert.deepEqual(getPlayerProgressionView(-5), {
    totalXp: 0,
    level: 1,
    currentLevelXp: 0,
    xpIntoLevel: 0,
    xpToNextLevel: 5,
    nextLevelAt: 5,
    progressRatio: 0,
    isMaxLevel: false,
  })

  assert.deepEqual(getPlayerProgressionView(40), {
    totalXp: 40,
    level: 5,
    currentLevelXp: 36,
    xpIntoLevel: 4,
    xpToNextLevel: 19,
    nextLevelAt: 55,
    progressRatio: 4 / 19,
    isMaxLevel: false,
  })

  assert.deepEqual(getPlayerProgressionView(999), {
    totalXp: 999,
    level: 17,
    currentLevelXp: 880,
    xpIntoLevel: 119,
    xpToNextLevel: 157,
    nextLevelAt: 1037,
    progressRatio: 119 / 157,
    isMaxLevel: false,
  })

  assert.deepEqual(applyPlayerXp({ totalXp: 4, level: 1 }, 8).state, {
    totalXp: 12,
    level: 3,
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

  const levelFiveSlots = buildPachinkoSlotRewards(42, PACHINKO_SLOT_COUNT, 0, 17)
  assert.ok(levelFiveSlots.every((slot) => slot.star >= 3 && slot.star <= 5), 'player level should bound visible star outcomes')
  const levelFiveLandingSlot = resolvePachinkoSlotReward(42, 0.999, PACHINKO_SLOT_COUNT, 0, 17)
  assert.deepEqual(resolvePachinkoLandingReward(42, 0.999, 0, 17), {
    weaponId: levelFiveLandingSlot.weaponId,
    star: levelFiveLandingSlot.star,
  })
})

test('pachinko weapon-family synergy marks mostly-upside bonus slots', () => {
  assert.equal(getPachinkoWeaponFamily('slime-glaive'), 'melee')
  assert.equal(getPachinkoWeaponFamilyLabel('melee'), '근접')
  assert.equal(getPachinkoWeaponSynergySummary('slime-glaive'), '근접 계열: 젓가락워킹 글레이브 보너스 슬롯 등장')

  const modifiers = buildPachinkoSlotModifiers('slime-glaive', 3)
  assert.equal(modifiers.get(7), 'family')
  assert.equal(modifiers.get(3), 'bonus')
  assert.equal(modifiers.get(5), 'jackpot')

  const synergizedSlots = buildPachinkoSlotRewards(14, PACHINKO_SLOT_COUNT, 0, 1, 'slime-glaive')
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
    star: 5,
  })

  const familyLanding = resolvePachinkoLandingReward(14, 0.75, 0, 1, 'slime-glaive')
  assert.deepEqual(familyLanding, {
    weaponId: 'slime-glaive',
    star: 2,
  })
})

test('pachinko slot index clamps boundaries and live table timing', () => {
  assert.equal(PACHINKO_REWARD_TABLE_REFRESH_MS, 850)
  assert.equal(getPachinkoRewardTableSeed(0), 0)
  assert.equal(getPachinkoRewardTableSeed(849), 0)
  assert.equal(getPachinkoRewardTableSeed(850), 1)
  assert.equal(getPachinkoRewardTableSeed(1700), 2)

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
  assert.equal(HEART_PICKUP_MAX_ACTIVE, 3)
  assert.equal(getHealedPlayerHealth(40, 100), 64)
  assert.equal(getHealedPlayerHealth(90, 100), 100)
  assert.equal(getHealedPlayerHealth(-5, 100), 24)
  assert.equal(getInitialHeartPickupSpawnAt(1_000), 1_000 + HEART_PICKUP_INITIAL_DELAY_MS)
  assert.equal(getNextHeartPickupSpawnAt(1_000, () => 0), 1_000 + HEART_PICKUP_INTERVAL_MS)
  assert.equal(
    getNextHeartPickupSpawnAt(1_000, () => 0.999),
    1_000 + HEART_PICKUP_INTERVAL_MS + 3_996,
  )
  assert.equal(shouldSpawnHeartPickup(6_999, 7_000, 0), false)
  assert.equal(shouldSpawnHeartPickup(7_000, 7_000, HEART_PICKUP_MAX_ACTIVE), false)
  assert.equal(shouldSpawnHeartPickup(7_000, 7_000, HEART_PICKUP_MAX_ACTIVE - 1), true)
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

  assert.deepEqual(describeAvailableRecipes(acidRecipes), [
    '난리자베스 분사기 [난리 분사] → 피해 20 · 초당 4발 · 사거리 130 · 난리 분사 (안정적인 젤을 난리 난 초록 리액션 분사로 바꿉니다.)',
  ])

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

  assert.deepEqual(describeAvailableRecipes(sparkRecipes), [
    '오버드라이브 카빈 [오버드라이브 속사] → 피해 15 · 초당 7발 · 사거리 560 · 오버드라이브 속사 (안정적인 젤 코어로 전하를 붙잡아 쇼츠 박자의 속사 무기로 만듭니다.)',
  ])
  assert.deepEqual(describeAvailableRecipes(mistRecipes), [
    '멘탈나감 소용돌이 [멘탈 안개] → 피해 14 · 초당 4발 · 사거리 190 · 멘탈 안개 (서리 입자와 안개 구슬을 멘탈 나간 듯한 회전 제어 지대로 만듭니다.)',
  ])

  const needleRecipes = getActionableRecipes(
    {
      'chitin-needle': 1,
      'spark-knot': 1,
    },
    ['starter-blaster'],
  )
  assert.deepEqual(describeAvailableRecipes(needleRecipes), [
    '간바레 응원부채 [간바레 산탄] → 피해 16 · 초당 5발 · 사거리 210 · 간바레 산탄 (벌레 사수의 날카로운 키틴을 간바레 구호 같은 산탄 부채로 다듬습니다.)',
  ])
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
  const secondMinute = getRunPhaseByElapsedMs(60_000)
  const finale = getRunPhaseByElapsedMs(FINAL_STAGE_START_MS)

  assert.equal(firstPhase.minuteIndex, 0)
  assert.equal(firstPhase.healthMultiplier, 1.15)
  assert.equal(secondMinute.minuteIndex, 1)
  assert.equal(secondMinute.stageIndex, 1)
  assert.equal(finale.isFinale, true)
  assert.equal(finale.oneTimeSpawns?.includes('slime-boss'), true)
  assert.equal(isFinaleActive(FINAL_STAGE_START_MS), true)
  assert.equal(isRunTimedOut(RUN_DURATION_MS), true)
  assert.equal(formatRunTime(RUN_DURATION_MS), '30:00')
  assert.deepEqual(getUnknownRunEnemyIds(), [])
  assert.equal(getRunSpawnCapacity(firstPhase, firstPhase.softEnemyCap, firstPhase.burstSize), 0)
})

test('run progression exposes per-enemy spawn chance rows for the current minute', () => {
  const firstPhase = getRunPhaseByElapsedMs(0)
  const latePhase = getRunPhaseByElapsedMs(24 * 60_000)
  const firstRows = getRunEnemySpawnChanceRows(firstPhase)
  const lateRows = getRunEnemySpawnChanceRows(latePhase)

  assert.deepEqual(firstRows, [
    {
      enemyId: 'slime',
      enemyName: '진흙 슬라임',
      count: 16,
      ratio: 1,
      percentLabel: '100%',
    },
  ])
  assert.ok(lateRows.length > 4)
  assert.ok(lateRows.some((row) => row.enemyId === 'crusher-slime'))
  assert.ok(lateRows.some((row) => row.enemyId === 'void-orb'))
  assert.equal(lateRows.reduce((sum, row) => sum + row.count, 0) > 0, true)
  assert.equal(lateRows.reduce((sum, row) => sum + row.ratio, 0).toFixed(4), '1.0000')
})

test('hud places enemy spawn odds beside the game title for visibility', () => {
  const hudSource = readFileSync(resolve(TEST_DIR, '../src/ui/Hud.ts'), 'utf8')
  const styleSource = readFileSync(resolve(TEST_DIR, '../src/style.css'), 'utf8')

  assert.ok(hudSource.includes('renderTitleEnemyOdds(state.pachinko?.enemyOdds)'))
  assert.ok(hudSource.includes('hud-summary__enemy-odds'))
  assert.ok(hudSource.includes('적 출현 확률 ·'))
  assert.ok(styleSource.includes('.hud-summary__enemy-odds'))
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

test('game title and title control hints stay aligned with playable keyboard shortcuts', () => {
  assert.equal(GAME_TITLE, '김동성의 살아남기')
  assert.deepEqual([...GAME_HEADER_CONTROL_HINTS], ['WASD 이동', 'J 대시', 'I 인벤토리', 'Q 코덱스'])
  assert.match(GAMEPLAY_CONTROL_TIP, /I 인벤토리/)
  assert.match(GAMEPLAY_CONTROL_TIP, /Q 코덱스/)
})

test('stage selection views expose readable time-stage choices and current marker', () => {
  const stages = getStageSelectionViews(15 * 60_000)

  assert.equal(stages.length, 30)
  assert.equal(stages[15]?.isCurrent, true)
  assert.match(stages[15]?.description ?? '', /체력 ×/)
  const bossStage = stages.find((stage) => stage.isBoss)
  assert.ok(bossStage)
  assert.match(bossStage.description, /보스 결전/)
  assert.equal(bossStage.startElapsedMs, FINAL_STAGE_START_MS)
})

test('stage selection maps choices to time offsets instead of wave clears', () => {
  assert.equal(getStageSelectionStartElapsedMs(0), 0)
  assert.equal(getStageSelectionStartElapsedMs(2), 2 * 60_000)
  assert.equal(getStageSelectionStartElapsedMs(25), FINAL_STAGE_START_MS)
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
  assert.match(presentation.subtitle, /크라운 슬라임/)
  assert.match(presentation.restartPrompt, /버튼/)
  assert.deepEqual(presentation.statLines, [
    '결과: 클리어',
    '최종 무기: 스타터 블래스터',
    '생존 시간: 25:30',
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

test('arena enemy defeat applies player xp before outcome handling', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')

  assert.ok(
    arenaSceneSource.includes('const playerXpResult = this.grantPlayerXpForEnemy(enemy.config.id)'),
    'damageEnemy should grant run-local player XP at the enemy defeat chokepoint',
  )
  assert.ok(
    arenaSceneSource.includes('this.playerProgression = result.state'),
    'grantPlayerXpForEnemy should update the scene progression state immediately',
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
  assert.match(presentation.restartPrompt, /새 런/)
  assert.equal(timeoutPresentation.title, '시간 종료')
  assert.match(timeoutPresentation.status, /타임아웃/)
})

test('result scene restart is button-driven instead of R-key driven', () => {
  const resultSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ResultScene.ts'), 'utf8')

  assert.ok(
    resultSceneSource.includes(`.setName('restart-run-button')`),
    'ResultScene should expose a named restart button for the result screen',
  )
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
    resultSceneSource.includes(`this.scene.start('arena')`),
    'ResultScene restart handler should start the arena scene',
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
  assert.equal(codex.enemies.length, 12)
  assert.match(codex.hint, /토큰 파친코/)



  const voltSlime = codex.enemies.find((enemy) => enemy.id === 'spark-slime')
  assert.ok(voltSlime)
  assert.deepEqual(voltSlime?.drops, [])
  assert.ok(voltSlime?.stats.some((stat) => stat.includes('보상 경험치 +2')))

  const prismSlime = codex.enemies.find((enemy) => enemy.id === 'prism-slime')
  assert.ok(prismSlime)
  assert.ok(prismSlime?.stats.some((stat) => stat.includes('보상 경험치 +4')))

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
  assert.ok(needleWasp?.description.includes('비-슬라임'))
  assert.ok(needleWasp?.stats.some((stat) => stat.includes('부채꼴')))
  assert.deepEqual(needleWasp?.drops, [])
  assert.ok(needleWasp?.stats.some((stat) => stat.includes('보상 경험치 +3')))
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

  assert.equal(fiveStar.damage, 34)
  assert.equal(fiveStar.fireRateMs, 175)
  assert.equal(fiveStar.projectileSpeed, 660)
  assert.ok(fiveStar.damage > oneStar.damage)
  assert.ok(fiveStar.fireRateMs < oneStar.fireRateMs)
  assert.ok(fiveStar.projectileSpeed > oneStar.projectileSpeed)
  assert.equal(tunedThreeStar.fireRateMs, 182)
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
  assert.equal(levelTenBlaster.damage, 15)
  assert.equal(levelTenBlaster.range, 487)
  assert.equal(levelTenBlaster.playerDamageMultiplier, 1.45)
  assert.equal(levelTenBlaster.weaponSpecialTier, 1)
  assert.equal(levelTenBlaster.visualPowerTier, 1)
  assert.match(levelTenBlaster.levelUpgradeLabel, /관통 2회/)
  assert.match(levelTenBlaster.levelUpgradeDescription, /관통탄/)
})

test('weapon milestone upgrades expand behavior every five and ten player levels', () => {
  const levelFiveGlaive = deriveEffectiveWeaponStats('slime-glaive', {}, 1, 5)
  assert.equal(levelFiveGlaive.attackBehavior.kind, 'melee-cleave')
  assert.equal(levelFiveGlaive.attackBehavior.range, 102)

  const levelTenBlaster = deriveEffectiveWeaponStats('starter-blaster', {}, 1, 10)
  assert.equal(levelTenBlaster.attackBehavior.kind, 'pierce')
  assert.equal(levelTenBlaster.attackBehavior.maxHits, 2)

  const levelTwentyFrost = deriveEffectiveWeaponStats('frost-lance', {}, 1, 20)
  assert.equal(levelTwentyFrost.attackBehavior.kind, 'pierce')
  assert.equal(levelTwentyFrost.attackBehavior.maxHits, 5)

  const levelTwentyArc = deriveEffectiveWeaponStats('arc-loom', {}, 1, 20)
  assert.equal(levelTwentyArc.attackBehavior.kind, 'chain')
  assert.equal(levelTwentyArc.attackBehavior.maxChains, 4)
  assert.equal(levelTwentyArc.attackBehavior.chainRange, 172)

  const levelTwentyMist = deriveEffectiveWeaponStats('mist-vortex', {}, 1, 20)
  assert.equal(levelTwentyMist.attackBehavior.kind, 'spray-hazard')
  assert.equal(levelTwentyMist.attackBehavior.projectileCount, 7)
  assert.equal(levelTwentyMist.attackBehavior.hazardRadius, 48)
})

test('level-up weapon visuals expose stronger projectiles and HUD copy', () => {
  const levelTenBlaster = deriveEffectiveWeaponStats('starter-blaster', {}, 1, 10)
  const plan = buildAttackPlan(levelTenBlaster, { x: 0, y: 0 }, { x: 10, y: 0 })

  assert.equal(plan.projectiles.length, 1)
  assert.equal(plan.projectiles[0].visualPowerTier, 1)
  assert.equal(plan.projectiles[0].radius, 6)

  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')
  const hudSource = readFileSync(resolve(TEST_DIR, '../src/ui/Hud.ts'), 'utf8')

  assert.ok(arenaSceneSource.includes('levelUpgradeLabel: effectiveWeapon.levelUpgradeLabel'))
  assert.ok(arenaSceneSource.includes('projectile.setScale(1 + visualTier * 0.08)'))
  assert.ok(arenaSceneSource.includes('graphics.lineStyle(3 + visualTier'))
  assert.ok(hudSource.includes('weapon.levelUpgradeLabel'))
  assert.ok(hudSource.includes('weapon.levelUpgradeDescription'))
})

test('arena damage feedback shows normal hits as numbers and critical hits with emphasis', () => {
  const arenaSceneSource = readFileSync(resolve(TEST_DIR, '../src/scenes/ArenaScene.ts'), 'utf8')

  assert.ok(arenaSceneSource.includes('this.showDamageFeedback(enemy.sprite.x, enemy.sprite.y, criticalHit.damage, criticalHit.isCritical)'))
  assert.ok(arenaSceneSource.includes('label: `${damage}`'))
  assert.ok(arenaSceneSource.includes('label: `CRIT! ${damage}`'))
  assert.ok(arenaSceneSource.includes("color: '#f7fbff'"))
  assert.ok(arenaSceneSource.includes("color: '#ffd866'"))
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
      'prism-slime': { size: 30, textureKey: 'spark-slime', animationKey: 'spark-slime-idle' },
      'dash-slime': { size: 24, textureKey: 'dash-slime', animationKey: 'dash-slime-idle' },
      'orbit-slime': { size: 22, textureKey: 'orbit-slime', animationKey: 'orbit-slime-idle' },
      'needle-wasp': { size: 24, textureKey: 'needle-wasp', animationKey: 'needle-wasp-idle' },
      'splitter-slime': { size: 24, textureKey: 'slime', animationKey: 'slime-idle' },
      'shard-sentinel': { size: 28, textureKey: 'spark-slime', animationKey: 'spark-slime-idle' },
      'mender-slime': { size: 22, textureKey: 'orbit-slime', animationKey: 'orbit-slime-idle' },
      'void-orb': { size: 24, textureKey: 'orbit-slime', animationKey: 'orbit-slime-idle' },
      'crusher-slime': { size: 34, textureKey: 'dash-slime', animationKey: 'dash-slime-idle' },
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
