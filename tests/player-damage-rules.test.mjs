import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PLAYER_HIT_COOLDOWN_MS,
  shouldApplyPlayerDamage,
} from '../.tmp-test/src/systems/playerDamageRules.js'

test('player hit cooldown is a named survival pressure rule', () => {
  assert.equal(PLAYER_HIT_COOLDOWN_MS, 375)
})

test('player damage gate blocks before cooldown and allows at the cooldown boundary', () => {
  assert.equal(shouldApplyPlayerDamage(1374, 1000, false), false)
  assert.equal(shouldApplyPlayerDamage(1375, 1000, false), true)
})

test('player damage gate preserves interaction-block immunity', () => {
  assert.equal(shouldApplyPlayerDamage(2000, 1000, true), false)
})

test('player damage gate preserves dash invulnerability', () => {
  assert.equal(shouldApplyPlayerDamage(2000, 1000, false, true), false)
  assert.equal(shouldApplyPlayerDamage(2000, 1000, false, false), true)
})
