import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { WEAPON_DEFINITIONS } from '../.tmp-test/src/data/weapons.js'
import { resolveAutoAttackShot } from '../.tmp-test/src/scenes/arena/autoAttack.js'
import {
  HELD_WEAPON_DEPTH,
  resolveEquippedWeaponPresentation,
  resolveEquippedWeaponTextureRefresh,
  resolveWeaponPresentationFacing,
} from '../.tmp-test/src/systems/weaponPresentation.js'

const getOffsetMagnitude = (presentation) => Math.hypot(presentation.offset.x, presentation.offset.y)

test('weapon presentation facing uses nearest target independently of fire cooldown', () => {
  const origin = { x: 0, y: 0 }
  const candidates = [{ x: 3, y: 4, radius: 5, isActive: true }]

  assert.equal(
    resolveAutoAttackShot(origin, candidates, {
      isInteractionBlocked: false,
      time: 100,
      nextFireAt: 200,
      maxRange: 100,
    }),
    null,
  )

  assert.deepEqual(
    resolveWeaponPresentationFacing({
      origin,
      candidates,
      maxRange: 100,
      isInteractionBlocked: false,
      rememberedDirection: { x: 1, y: 0 },
    }),
    {
      direction: { x: 0.6, y: 0.8 },
      source: 'nearest-target',
    },
  )
})

test('weapon presentation facing pauses nearest-target refresh while preserving remembered direction', () => {
  assert.deepEqual(
    resolveWeaponPresentationFacing({
      origin: { x: 0, y: 0 },
      candidates: [{ x: 0, y: 20, radius: 5, isActive: true }],
      maxRange: 100,
      isInteractionBlocked: true,
      rememberedDirection: { x: -2, y: 0 },
      isDashing: true,
      dashDirection: { x: 1, y: 0 },
      moveDirection: { x: 0, y: 1 },
    }),
    {
      direction: { x: -1, y: 0 },
      source: 'remembered',
    },
  )
})

test('weapon presentation facing falls back through dash, move, then default', () => {
  assert.deepEqual(
    resolveWeaponPresentationFacing({
      origin: { x: 0, y: 0 },
      candidates: [],
      isInteractionBlocked: false,
      isDashing: true,
      dashDirection: { x: 0, y: -3 },
      moveDirection: { x: 1, y: 0 },
    }),
    {
      direction: { x: 0, y: -1 },
      source: 'dash',
    },
  )

  assert.deepEqual(
    resolveWeaponPresentationFacing({
      origin: { x: 0, y: 0 },
      candidates: [],
      isInteractionBlocked: false,
      moveDirection: { x: 4, y: 0 },
    }),
    {
      direction: { x: 1, y: 0 },
      source: 'move',
    },
  )

  assert.deepEqual(
    resolveWeaponPresentationFacing({
      origin: { x: 0, y: 0 },
      candidates: [],
      isInteractionBlocked: false,
    }),
    {
      direction: { x: 1, y: 0 },
      source: 'fallback',
    },
  )
})

test('equipped weapon presentation reuses active weapon HUD icons with melee emphasis', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const glaive = WEAPON_DEFINITIONS['slime-glaive']
  const starterPresentation = resolveEquippedWeaponPresentation(starter, { x: 1, y: 0 })
  const glaivePresentation = resolveEquippedWeaponPresentation(glaive, { x: 1, y: 0 })

  assert.equal(starterPresentation.textureKey, starter.visual.hudIconKey)
  assert.equal(glaivePresentation.textureKey, glaive.visual.hudIconKey)
  assert.ok(getOffsetMagnitude(glaivePresentation) > getOffsetMagnitude(starterPresentation))
  assert.equal(starterPresentation.depth, HELD_WEAPON_DEPTH)
  assert.equal(glaivePresentation.depth, HELD_WEAPON_DEPTH)
  assert.equal('damage' in starterPresentation, false)
  assert.equal('fireRateMs' in starterPresentation, false)
  assert.equal('range' in starterPresentation, false)
})

test('equipped weapon presentation grows visually with level upgrades', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const basePresentation = resolveEquippedWeaponPresentation(starter, { x: 1, y: 0 })
  const upgradedPresentation = resolveEquippedWeaponPresentation({
    ...starter,
    visualPowerTier: 2,
  }, { x: 1, y: 0 })

  assert.equal(upgradedPresentation.textureKey, starter.visual.hudIconKey)
  assert.ok(upgradedPresentation.scale > basePresentation.scale)
})

test('equipped weapon presentation flips left-facing weapons without changing texture ownership', () => {
  const frost = WEAPON_DEFINITIONS['frost-lance']
  const presentation = resolveEquippedWeaponPresentation(frost, { x: -1, y: 0 })

  assert.equal(presentation.textureKey, frost.visual.hudIconKey)
  assert.equal(presentation.flipY, true)
  assert.equal(presentation.rotation, Math.PI)
})

test('equipped weapon texture refresh tracks the active weapon only', () => {
  const starter = WEAPON_DEFINITIONS['starter-blaster']
  const frost = WEAPON_DEFINITIONS['frost-lance']
  const arc = WEAPON_DEFINITIONS['arc-loom']

  assert.deepEqual(resolveEquippedWeaponTextureRefresh(null, starter), {
    textureKey: starter.visual.hudIconKey,
    shouldRefresh: true,
  })
  assert.deepEqual(resolveEquippedWeaponTextureRefresh(starter.visual.hudIconKey, starter), {
    textureKey: starter.visual.hudIconKey,
    shouldRefresh: false,
  })
  assert.deepEqual(resolveEquippedWeaponTextureRefresh(starter.visual.hudIconKey, frost), {
    textureKey: frost.visual.hudIconKey,
    shouldRefresh: true,
  })
  assert.notEqual(
    resolveEquippedWeaponTextureRefresh(starter.visual.hudIconKey, frost).textureKey,
    arc.visual.hudIconKey,
  )
})

test('arena scene owns equipped-weapon lifecycle without moving presentation into combat behaviors', () => {
  const arenaSceneSource = readFileSync('src/scenes/ArenaScene.ts', 'utf8')
  const weaponBehaviorsSource = readFileSync('src/systems/weaponBehaviors.ts', 'utf8')

  assert.match(arenaSceneSource, /resolveEquippedWeaponPresentation/)
  assert.match(arenaSceneSource, /resolveWeaponPresentationFacing/)
  assert.match(arenaSceneSource, /createEquippedWeaponVisual/)
  assert.match(arenaSceneSource, /syncEquippedWeaponVisual\(time\)/)
  assert.match(arenaSceneSource, /destroyEquippedWeaponVisual\(\)/)
  assert.match(arenaSceneSource, /resolveEquippedWeaponTextureRefresh/)
  assert.equal(weaponBehaviorsSource.includes('weaponPresentation'), false)
  assert.equal(arenaSceneSource.includes('equippedWeaponVisuals'), false)

  const syncIndex = arenaSceneSource.indexOf('this.syncEquippedWeaponVisual(time)')
  const firingIndex = arenaSceneSource.indexOf('this.handleFiring(time)')
  assert.ok(syncIndex > -1)
  assert.ok(firingIndex > -1)
  assert.ok(syncIndex < firingIndex)

  const resetBody = arenaSceneSource.match(/private resetRunState\(\): void \{(?<body>[\s\S]*?)\n  \}/)?.groups?.body ?? ''
  assert.match(resetBody, /this\.destroyRunEntities\(\)/)
  assert.ok(resetBody.indexOf('this.destroyRunEntities()') < resetBody.indexOf('createInitialArenaRunState()'))

  const endRunIndex = arenaSceneSource.indexOf('private endRun(')
  const resultSceneStartIndex = arenaSceneSource.indexOf("this.scene.start('result', payload)", endRunIndex)
  const endRunCleanupIndex = arenaSceneSource.indexOf('this.destroyEquippedWeaponVisual()', endRunIndex)
  assert.ok(endRunIndex > -1)
  assert.ok(endRunCleanupIndex > endRunIndex)
  assert.ok(resultSceneStartIndex > endRunCleanupIndex)
})
