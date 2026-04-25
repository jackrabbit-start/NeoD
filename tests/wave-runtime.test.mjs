import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createWaveAdvancePlan,
  setSpawnLoopPaused,
  startWaveRuntime,
} from '../.tmp-test/src/scenes/arena/waveRuntime.js'

test('wave runtime starts a regular wave with an immediate spawn and scheduled follow-ups', () => {
  const appliedState = []
  const scheduledLoops = []
  const spawnedEnemies = []
  let clearedLoops = 0

  const started = startWaveRuntime(0, {
    applyState: (patch) => {
      appliedState.push(patch)
    },
    clearSpawnLoop: () => {
      clearedLoops += 1
    },
    scheduleSpawnLoop: (config) => {
      scheduledLoops.push(config)
    },
    spawnEnemy: (enemyId) => {
      spawnedEnemies.push(enemyId)
    },
  })

  assert.equal(started, true)
  assert.equal(clearedLoops, 1)
  assert.equal(scheduledLoops.length, 1)
  assert.equal(scheduledLoops[0]?.delayMs, 700)
  assert.equal(scheduledLoops[0]?.repeat, 8)
  assert.deepEqual(appliedState[0], {
    currentWaveIndex: 0,
    activeWaveLabel: '1 웨이브',
    remainingSpawns: 18,
    statusMessage: '1 웨이브 시작.',
    isBossActive: false,
  })
  assert.deepEqual(spawnedEnemies, ['slime', 'slime'])
  assert.deepEqual(appliedState[1], {
    remainingSpawns: 16,
  })

  scheduledLoops[0]?.onTick()

  assert.deepEqual(spawnedEnemies, ['slime', 'slime', 'slime', 'slime'])
  assert.deepEqual(appliedState[2], {
    remainingSpawns: 14,
  })
})

test('wave runtime locks burst-spawn near-miss pressure cadence', () => {
  const starts = [0, 1, 2].map((index) => {
    const appliedState = []
    const scheduledLoops = []
    const spawnedEnemies = []

    startWaveRuntime(index, {
      applyState: (patch) => {
        appliedState.push(patch)
      },
      clearSpawnLoop: () => {},
      scheduleSpawnLoop: (config) => {
        scheduledLoops.push(config)
      },
      spawnEnemy: (enemyId) => {
        spawnedEnemies.push(enemyId)
      },
    })

    return { appliedState, scheduledLoops, spawnedEnemies }
  })

  assert.deepEqual(
    starts.map(({ appliedState }) => appliedState[0]?.remainingSpawns),
    [18, 24, 27],
  )
  assert.deepEqual(
    starts.map(({ scheduledLoops }) => scheduledLoops[0]?.delayMs),
    [700, 620, 560],
  )
  assert.deepEqual(
    starts.map(({ scheduledLoops }) => scheduledLoops[0]?.repeat),
    [8, 7, 6],
  )
  assert.deepEqual(
    starts.map(({ spawnedEnemies }) => spawnedEnemies),
    [
      ['slime', 'slime'],
      ['slime', 'slime', 'slime'],
      ['spark-slime', 'spark-slime', 'spark-slime', 'spark-slime'],
    ],
  )
})

test('wave runtime starts a boss wave without scheduling follow-up spawns', () => {
  const appliedState = []
  const scheduledLoops = []
  const spawnedEnemies = []
  let clearedLoops = 0

  const started = startWaveRuntime(4, {
    applyState: (patch) => {
      appliedState.push(patch)
    },
    clearSpawnLoop: () => {
      clearedLoops += 1
    },
    scheduleSpawnLoop: (config) => {
      scheduledLoops.push(config)
    },
    spawnEnemy: (enemyId) => {
      spawnedEnemies.push(enemyId)
    },
  })

  assert.equal(started, true)
  assert.equal(clearedLoops, 0)
  assert.deepEqual(scheduledLoops, [])
  assert.deepEqual(appliedState[0], {
    currentWaveIndex: 4,
    activeWaveLabel: '보스 웨이브',
    remainingSpawns: 1,
    statusMessage: '보스 웨이브 시작.',
    isBossActive: true,
  })
  assert.deepEqual(spawnedEnemies, ['slime-boss'])
  assert.deepEqual(appliedState[1], {
    remainingSpawns: 0,
  })
})

test('wave advance plan keeps regular-wave clear counts and stops after the boss wave', () => {
  assert.deepEqual(createWaveAdvancePlan(0), {
    nextWaveIndex: 1,
    shouldIncrementWavesCleared: true,
  })
  assert.deepEqual(createWaveAdvancePlan(2), {
    nextWaveIndex: 3,
    shouldIncrementWavesCleared: true,
  })
  assert.deepEqual(createWaveAdvancePlan(3), {
    nextWaveIndex: 4,
    shouldIncrementWavesCleared: true,
  })
  assert.equal(createWaveAdvancePlan(4), null)
})

test('spawn loop pause helper toggles timer-like handles without crashing on missing loops', () => {
  const spawnLoop = {
    paused: false,
  }

  setSpawnLoopPaused(spawnLoop, true)
  assert.equal(spawnLoop.paused, true)

  setSpawnLoopPaused(spawnLoop, false)
  assert.equal(spawnLoop.paused, false)

  setSpawnLoopPaused(undefined, true)
})
