import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PLAYER_MOVEMENT_MAX_DELTA_MS,
  normalizeMovementInput,
  resolvePlayerMovementStep,
} from '../.tmp-test/src/systems/playerMovement.js'

const nearlyEqual = (actual, expected, epsilon = 0.000001) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be within ${epsilon} of ${expected}`)
}

test('player movement normalizes diagonal input before applying speed', () => {
  const normalized = normalizeMovementInput({ x: 1, y: 1 })

  nearlyEqual(normalized.x, Math.SQRT1_2)
  nearlyEqual(normalized.y, Math.SQRT1_2)
})

test('player movement eases toward walk speed instead of snapping instantly', () => {
  const first = resolvePlayerMovementStep({ x: 1, y: 0 }, { x: 0, y: 0 }, 220, 16)
  const second = resolvePlayerMovementStep({ x: 1, y: 0 }, first.velocity, 220, 16)

  assert.equal(first.isInputActive, true)
  assert.equal(first.isMoving, true)
  assert.ok(first.velocity.x > 0)
  assert.ok(first.velocity.x < 220)
  assert.ok(second.velocity.x > first.velocity.x)
  assert.ok(second.velocity.x < 220)
})

test('player movement decelerates and snaps tiny drift to rest', () => {
  const slowing = resolvePlayerMovementStep({ x: 0, y: 0 }, { x: 20, y: 0 }, 220, 16)
  const stopped = resolvePlayerMovementStep({ x: 0, y: 0 }, { x: 1, y: 0 }, 220, 16)

  assert.equal(slowing.isInputActive, false)
  assert.equal(slowing.isMoving, true)
  assert.ok(slowing.velocity.x > 0)
  assert.ok(slowing.velocity.x < 20)
  assert.deepEqual(stopped.velocity, { x: 0, y: 0 })
  assert.equal(stopped.isMoving, false)
})

test('player movement caps large frame deltas for stable smoothing', () => {
  const capped = resolvePlayerMovementStep({ x: 1, y: 0 }, { x: 0, y: 0 }, 220, 1000)
  const expected = resolvePlayerMovementStep(
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    220,
    PLAYER_MOVEMENT_MAX_DELTA_MS,
  )

  nearlyEqual(capped.velocity.x, expected.velocity.x)
})
