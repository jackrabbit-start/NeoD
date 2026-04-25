import Phaser from 'phaser'
import { ArenaScene } from '../scenes/ArenaScene.js'
import { BootScene } from '../scenes/BootScene.js'
import { ResultScene } from '../scenes/ResultScene.js'

export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    scale: {
      parent,
      mode: Phaser.Scale.RESIZE,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    backgroundColor: '#0a1220',
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scene: [BootScene, ArenaScene, ResultScene],
  }
}
