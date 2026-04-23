import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'

interface ResultPayload {
  outcome: 'win' | 'loss'
  weaponName: string
  wavesCleared: number
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  create(payload: ResultPayload): void {
    const isWin = payload.outcome === 'win'
    const title = isWin ? 'Run Cleared' : 'Run Failed'
    const subtitle = isWin
      ? 'The slime boss collapsed. The prototype loop holds.'
      : 'The run ended early. Retry and chase a stronger combine.'

    this.cameras.main.setBackgroundColor(isWin ? '#1d1735' : '#2b1220')

    this.add
      .text(GAME_WIDTH / 2, 140, title, {
        fontSize: '40px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 208, subtitle, {
        fontSize: '20px',
        color: '#d8e2ff',
        wordWrap: { width: 720 },
        align: 'center',
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_WIDTH / 2,
        292,
        `Final weapon: ${payload.weaponName}\nWaves cleared: ${payload.wavesCleared}`,
        {
          fontSize: '22px',
          color: '#b9c7ff',
          align: 'center',
        },
      )
      .setOrigin(0.5)

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 120,
        'Press R to restart the prototype run',
        {
          fontSize: '20px',
          color: '#a6ffd0',
        },
      )
      .setOrigin(0.5)

    this.input.keyboard?.once('keydown-R', () => {
      this.scene.start('arena')
    })
  }
}
