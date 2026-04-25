import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canStartPlayerDash,
  createReadyPlayerDashState,
  isPlayerDashActive,
  isPlayerDashInvulnerable,
  PLAYER_DASH_COOLDOWN_MS,
  PLAYER_DASH_DURATION_MS,
  PLAYER_DASH_INVULNERABLE_MS,
  PLAYER_DASH_SPEED,
  resolvePlayerDashDirection,
  startPlayerDash,
} from '../.tmp-test/src/systems/playerDash.js'
import { ENEMY_DEFINITIONS } from '../.tmp-test/src/data/enemies.js'
import { createInitialArenaRunState } from '../.tmp-test/src/systems/runState.js'

test('player dash constants support boss aoe escape without broad boss nerfs', () => {
  assert.equal(PLAYER_DASH_SPEED, 720)
  assert.equal(PLAYER_DASH_DURATION_MS, 180)
  assert.equal(PLAYER_DASH_INVULNERABLE_MS, 220)
  assert.equal(PLAYER_DASH_COOLDOWN_MS, 700)

  const bossAttack = ENEMY_DEFINITIONS['slime-boss'].attackBehavior
  assert.equal(bossAttack.kind, 'telegraphed-aoe')

  const dashDistance = PLAYER_DASH_SPEED * (PLAYER_DASH_DURATION_MS / 1000)
  const postDashWalkDistance =
    createInitialArenaRunState().playerSpeed *
    ((bossAttack.telegraphMs - PLAYER_DASH_DURATION_MS) / 1000)

  assert.ok(dashDistance + postDashWalkDistance > bossAttack.radius)
})

test('player dash starts only when unblocked and cooldown is ready', () => {
  const ready = createReadyPlayerDashState()
  assert.equal(canStartPlayerDash(0, ready, false), true)
  assert.equal(canStartPlayerDash(0, ready, true), false)

  const started = startPlayerDash(1000)
  assert.equal(canStartPlayerDash(1200, started, false), false)
  assert.equal(canStartPlayerDash(1700, started, false), true)
})

test('player dash exposes active and invulnerable timing windows', () => {
  const started = startPlayerDash(1000)

  assert.equal(isPlayerDashActive(1179, started), true)
  assert.equal(isPlayerDashActive(1180, started), false)
  assert.equal(isPlayerDashInvulnerable(1219, started), true)
  assert.equal(isPlayerDashInvulnerable(1220, started), false)
})

test('player dash direction prefers current input, then last movement, then a safe fallback', () => {
  assert.deepEqual(resolvePlayerDashDirection({ x: 3, y: 4 }, { x: -1, y: 0 }), { x: 0.6, y: 0.8 })
  assert.deepEqual(resolvePlayerDashDirection({ x: 0, y: 0 }, { x: 0, y: -2 }), { x: 0, y: -1 })
  assert.deepEqual(resolvePlayerDashDirection({ x: 0, y: 0 }, { x: 0, y: 0 }), { x: 1, y: 0 })
})
