import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
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
import { ENEMY_CONTACT_PADDING, PLAYER_COLLISION_RADIUS, PROJECTILE_COLLISION_RADIUS, PROJECTILE_HIT_PADDING } from '../.tmp-test/src/game/combatGeometry.js'
import { VECTOR_ASSETS } from '../.tmp-test/src/game/visualManifest.js'
import { resolveWeightedDrop } from '../.tmp-test/src/systems/drop.js'
import { getEnemyHealthBarMetrics, getEnemyHealthFillWidth } from '../.tmp-test/src/systems/enemyHealthBar.js'
import { getPlayerHealthBarMetrics, getPlayerHealthFillWidth } from '../.tmp-test/src/systems/playerHealthBar.js'
import { addItem } from '../.tmp-test/src/systems/inventory.js'
import {
  getLootAttractionStep,
  getLootPickupPhase,
  LOOT_ATTRACTION_RADIUS,
  LOOT_COLLECT_RADIUS,
  LEGACY_LOOT_PICKUP_DISTANCE,
} from '../.tmp-test/src/systems/lootPickup.js'
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
  applyRecipeSelection,
  equipOwnedWeapon,
  getActionableRecipes,
  seedOwnedWeapons,
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
  shouldAdvanceWave,
} from '../.tmp-test/src/systems/waves.js'
import {
  createRunResultHudState,
  createRunResultPresentation,
} from '../.tmp-test/src/systems/runResult.js'

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
    statusMessage: 'Acid Sprayer 제작 및 장착 완료. 준비되면 런을 다시 진행하세요.',
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
  assert.equal(state.isInventoryOpen, false)
  assert.equal(state.isCodexOpen, false)
  assert.equal(state.isRunEnding, false)
  assert.equal(state.playerHealth, 100)
  assert.equal(state.playerMaxHealth, 100)
  assert.equal(state.playerSpeed, 220)
  assert.equal(state.nextFireAt, 0)
  assert.equal(state.remainingSpawns, 0)
  assert.equal(state.currentWaveIndex, 0)
  assert.equal(state.activeWaveLabel, '')
  assert.equal(state.wavesCleared, 0)
  assert.equal(state.isBossActive, false)
  assert.equal(state.lastPlayerHitAt, 0)
  assert.equal(state.nextEnemyRuntimeId, 1)
})

test('new arena run state does not reuse mutable containers', () => {
  const first = createInitialArenaRunState()
  first.inventory['gel-shard'] = 2
  first.ownedWeaponIds.push('acid-sprayer')
  first.tuningState['acid-sprayer'] = 'sharpened-core'

  const second = createInitialArenaRunState()

  assert.deepEqual(second.inventory, {})
  assert.deepEqual(second.ownedWeaponIds, ['starter-blaster'])
  assert.deepEqual(second.tuningState, {})
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
    '산성 분사기 [부식 압박] → 피해 20 · 초당 4발 · 부식 압박 (안정적인 슬라임 물질을 부식성 화력으로 바꿉니다.)',
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
    '스파크 카빈 [고속 전격] → 피해 15 · 초당 7발 · 고속 전격 (안정적인 젤 코어로 전하를 붙잡아 가벼운 고속 무기로 만듭니다.)',
  ])
  assert.deepEqual(describeAvailableRecipes(mistRecipes), [
    '안개 소용돌이 [안개 제어] → 피해 14 · 초당 4발 · 안개 제어 (서리 입자와 안개 구슬을 회전시켜 오래 남는 제어 지대를 만듭니다.)',
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

test('wave progression only advances when the current wave is fully cleared', () => {
  assert.equal(shouldAdvanceWave(1, 0), false)
  assert.equal(shouldAdvanceWave(0, 2), false)
  assert.equal(shouldAdvanceWave(0, 0), true)
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

test('enemy expansion keeps reward ids stable while adding regular enemy ids', () => {
  assert.deepEqual(LOOT_IDS, [
    'gel-shard',
    'acid-core',
    'frost-mote',
    'spark-knot',
    'mist-bead',
    'tuning-capsule',
  ])
  assert.deepEqual(RECIPE_IDS, [
    'acid-sprayer-recipe',
    'frost-lance-recipe',
    'storm-cannon-recipe',
    'arc-loom-recipe',
    'spark-carbine-recipe',
    'mist-vortex-recipe',
  ])
  assert.deepEqual(WEAPON_IDS, [
    'starter-blaster',
    'acid-sprayer',
    'frost-lance',
    'storm-cannon',
    'arc-loom',
    'spark-carbine',
    'mist-vortex',
  ])
  assert.deepEqual(ENEMY_IDS, [
    'slime',
    'spark-slime',
    'prism-slime',
    'dash-slime',
    'orbit-slime',
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
  assert.deepEqual(
    getWaveSpawnSequence(secondWave),
    ['slime', 'slime', 'slime', 'slime', 'slime', 'dash-slime', 'dash-slime', 'dash-slime'],
  )
  assert.deepEqual(
    flattenWaveEntries(thirdWave.entries),
    [
      'spark-slime',
      'spark-slime',
      'spark-slime',
      'spark-slime',
      'orbit-slime',
      'orbit-slime',
      'orbit-slime',
      'dash-slime',
      'dash-slime',
    ],
  )
  assert.equal(getWaveSpawnCount(thirdWave), 9)
  assert.deepEqual(getWaveSpawnSequence(eliteWave), ['prism-slime'])
  assert.deepEqual(bossWave.entries, [{ enemyId: 'slime-boss', count: 1 }])
  assert.equal(getBossEnemyId(), 'slime-boss')
  assert.equal(isBossEnemyId('slime-boss'), true)
  assert.equal(isBossEnemyId('dash-slime'), false)
  assert.equal(getDefeatedEnemyRunOutcome('slime-boss'), 'win')
  assert.equal(getDefeatedEnemyRunOutcome('dash-slime'), 'continue')
})

test('boss win result presentation is explicit and reward-neutral', () => {
  const presentation = createRunResultPresentation({
    outcome: 'win',
    weaponName: '스타터 블래스터',
    wavesCleared: 4,
  })
  const hudState = createRunResultHudState({
    outcome: 'win',
    weaponName: '스타터 블래스터',
    wavesCleared: 4,
  })

  assert.equal(presentation.title, '런 클리어')
  assert.match(presentation.subtitle, /크라운 슬라임/)
  assert.match(presentation.restartPrompt, /R 키/)
  assert.deepEqual(presentation.statLines, [
    '결과: 클리어',
    '최종 무기: 스타터 블래스터',
    '돌파 웨이브: 4',
  ])
  assert.ok(presentation.inventoryLines.every((line) => !/해금|unlock/i.test(line)))
  assert.equal(hudState.title, '런 클리어')
  assert.equal(hudState.inventoryButtonDisabled, true)
  assert.equal(hudState.modal.isOpen, false)
})

test('loss result presentation keeps restart guidance distinct from boss clear', () => {
  const presentation = createRunResultPresentation({
    outcome: 'loss',
    weaponName: '스타터 블래스터',
    wavesCleared: 2,
  })

  assert.equal(presentation.title, '런 실패')
  assert.match(presentation.statLines[0] ?? '', /실패/)
  assert.match(presentation.objective, /다시 도전/)
  assert.match(presentation.restartPrompt, /새 런/)
})

test('elite wave appears before the boss wave', () => {
  assert.deepEqual(getWaveByIndex(3)?.entries, [{ enemyId: 'prism-slime', count: 1 }])
  assert.deepEqual(getWaveByIndex(4)?.entries, [{ enemyId: 'slime-boss', count: 1 }])
})

test('codex selectors expose shared items, recipes, and enemies', () => {
  const codex = getCodexState(true)

  assert.equal(codex.isOpen, true)
  assert.equal(codex.items.length, 6)
  assert.equal(codex.recipes.length, 6)
  assert.equal(codex.enemies.length, 6)

  const arcRecipe = codex.recipes.find((recipe) => recipe.id === 'arc-loom-recipe')
  assert.equal(arcRecipe?.identityLabel, '연쇄 제압')
  assert.match(arcRecipe?.identityHint ?? '', /전하/)
  assert.deepEqual(
    arcRecipe?.inputs.map((input) => input.id),
    ['spark-knot', 'mist-bead'],
  )

  const sparkRecipe = codex.recipes.find((recipe) => recipe.id === 'spark-carbine-recipe')
  assert.equal(sparkRecipe?.identityLabel, '고속 전격')
  assert.deepEqual(
    sparkRecipe?.inputs.map((input) => input.id),
    ['gel-shard', 'spark-knot'],
  )
  assert.equal(sparkRecipe?.output.id, 'spark-carbine')

  const mistRecipe = codex.recipes.find((recipe) => recipe.id === 'mist-vortex-recipe')
  assert.equal(mistRecipe?.identityLabel, '안개 제어')
  assert.deepEqual(
    mistRecipe?.inputs.map((input) => input.id),
    ['frost-mote', 'mist-bead'],
  )
  assert.equal(mistRecipe?.output.id, 'mist-vortex')

  const voltSlime = codex.enemies.find((enemy) => enemy.id === 'spark-slime')
  assert.ok(voltSlime)
  assert.deepEqual(
    voltSlime?.drops.map((drop) => drop.id),
    ['spark-knot', 'mist-bead', 'frost-mote'],
  )

  const prismSlime = codex.enemies.find((enemy) => enemy.id === 'prism-slime')
  assert.ok(prismSlime)
  assert.deepEqual(
    prismSlime?.drops.map((drop) => drop.id),
    ['tuning-capsule'],
  )

  const dashSlime = codex.enemies.find((enemy) => enemy.id === 'dash-slime')
  assert.ok(dashSlime)
  assert.ok(dashSlime?.stats.some((stat) => stat.includes('고속 돌진')))

  const orbitSlime = codex.enemies.find((enemy) => enemy.id === 'orbit-slime')
  assert.ok(orbitSlime)
  assert.ok(orbitSlime?.stats.some((stat) => stat.includes('맴돕니다')))
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
  assert.match(element.innerHTML, /아이템/)
  assert.match(element.innerHTML, /조합식/)
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
  assert.match(element.innerHTML, /아이템/)
  assert.equal(element.assignments, 3)
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
    1_500,
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
    },
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

test('player health bar metrics place a compact bar at the canvas bottom', () => {
  assert.deepEqual(getPlayerHealthBarMetrics(960, 540), {
    x: 360,
    y: 518,
    width: 240,
    height: 10,
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
