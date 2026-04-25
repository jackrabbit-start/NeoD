import test from 'node:test'
import assert from 'node:assert/strict'

import { RUN_PROGRESS_PHASES } from '../.tmp-test/src/data/runProgression.js'
import {
  advanceRunProgressionRuntime,
  createRunProgressionRuntime,
} from '../.tmp-test/src/scenes/arena/runProgressionRuntime.js'
import {
  FINAL_STAGE_START_MS,
  RUN_DURATION_MS,
  getRunPhaseByElapsedMs,
} from '../.tmp-test/src/systems/runProgression.js'
import { setSpawnLoopPaused } from '../.tmp-test/src/scenes/arena/waveRuntime.js'

test('run progression runtime starts with immediate recurring pressure', () => {
  const state = createRunProgressionRuntime(0)
  const step = advanceRunProgressionRuntime(state, 0, 0)

  assert.equal(step.state.elapsedMs, 0)
  assert.equal(step.activePhase.id, 'minute-01-a')
  assert.equal(step.spawnedEnemyIds.length, 2)
  assert.deepEqual(step.spawnedEnemyIds, ['slime', 'slime'])
  assert.equal(step.timedOut, false)
})

test('run progression advances by elapsed time even while enemies carry over', () => {
  const start = createRunProgressionRuntime(29_900)
  const step = advanceRunProgressionRuntime(start, 200, 7)

  assert.equal(step.activePhase.id, 'minute-01-b')
  assert.equal(step.phaseChanged, true)
  assert.equal(step.state.elapsedMs, 30_100)
  assert.ok(step.spawnedEnemyIds.length > 0)
})

test('run progression enforces deterministic soft caps for refill pressure', () => {
  const phase = getRunPhaseByElapsedMs(0)
  const capped = advanceRunProgressionRuntime(createRunProgressionRuntime(0), 0, phase.softEnemyCap)
  const nearCap = advanceRunProgressionRuntime(createRunProgressionRuntime(0), 0, phase.softEnemyCap - 1)

  assert.deepEqual(capped.spawnedEnemyIds, [])
  assert.equal(nearCap.spawnedEnemyIds.length, 1)
})

test('run progression emits the boss exactly at the 16 minute finale boundary', () => {
  const beforeFinale = createRunProgressionRuntime(FINAL_STAGE_START_MS - 100)
  const step = advanceRunProgressionRuntime(beforeFinale, 100, 99)

  assert.equal(step.activePhase.startMs, FINAL_STAGE_START_MS)
  assert.equal(step.activePhase.isFinale, true)
  assert.ok(step.spawnedEnemyIds.includes('slime-boss'))
})

test('run progression hard-caps at 20 minutes for timeout handling', () => {
  const step = advanceRunProgressionRuntime(createRunProgressionRuntime(RUN_DURATION_MS - 50), 100, 0)

  assert.equal(step.state.elapsedMs, RUN_DURATION_MS)
  assert.equal(step.timedOut, true)
})

test('run progression table covers 20 minutes with half-minute probability phases', () => {
  assert.equal(RUN_PROGRESS_PHASES.length, 40)
  assert.equal(RUN_PROGRESS_PHASES[0]?.startMs, 0)
  assert.equal(RUN_PROGRESS_PHASES.at(-1)?.startMs, 19 * 60_000 + 30_000)
  assert.ok((RUN_PROGRESS_PHASES.at(-1)?.softEnemyCap ?? 0) > (RUN_PROGRESS_PHASES[0]?.softEnemyCap ?? 0))
  assert.ok((RUN_PROGRESS_PHASES.at(-1)?.healthMultiplier ?? 0) > (RUN_PROGRESS_PHASES[0]?.healthMultiplier ?? 0))
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
