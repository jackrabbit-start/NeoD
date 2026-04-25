import type { InventoryState, WeaponId } from '../domain/types.js'
import type { WeaponTuningState } from './tuning.js'
import { seedOwnedWeapons, STARTER_WEAPON_ID } from './weaponOwnership.js'

export interface ArenaRunState {
  ownedWeaponIds: WeaponId[]
  activeWeaponId: WeaponId
  inventory: InventoryState
  tuningState: WeaponTuningState
  isInventoryOpen: boolean
  isCodexOpen: boolean
  isRunEnding: boolean
  playerHealth: number
  playerMaxHealth: number
  playerSpeed: number
  nextFireAt: number
  remainingSpawns: number
  currentWaveIndex: number
  activeWaveLabel: string
  wavesCleared: number
  isBossActive: boolean
  statusMessage: string
  lastPlayerHitAt: number
  nextEnemyRuntimeId: number
}

export function createInitialArenaRunState(): ArenaRunState {
  return {
    ownedWeaponIds: seedOwnedWeapons(),
    activeWeaponId: STARTER_WEAPON_ID,
    inventory: {},
    tuningState: {},
    isInventoryOpen: false,
    isCodexOpen: false,
    isRunEnding: false,
    playerHealth: 100,
    playerMaxHealth: 100,
    playerSpeed: 220,
    nextFireAt: 0,
    remainingSpawns: 0,
    currentWaveIndex: 0,
    activeWaveLabel: '',
    wavesCleared: 0,
    isBossActive: false,
    statusMessage: 'WASD로 이동하고 Space 대시로 회피하는 동안 무기가 자동으로 발사됩니다.',
    lastPlayerHitAt: 0,
    nextEnemyRuntimeId: 1,
  }
}
