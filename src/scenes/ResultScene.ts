import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import {
  createRunResultHudState,
  createRunResultPresentation,
  type RunResultPayload,
} from '../systems/runResult.js'
import type { HudController } from '../ui/Hud.js'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  create(payload: RunResultPayload): void {
    const presentation = createRunResultPresentation(payload)
    const hud = this.game.registry.get('hud') as HudController | undefined
    hud?.update(createRunResultHudState(payload))

    this.cameras.main.setBackgroundColor(presentation.backgroundColor)

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 96, GAME_HEIGHT - 96, 0x081426, 0.84)
      .setStrokeStyle(3, Number.parseInt(presentation.accentColor.slice(1), 16), 0.85)

    this.add
      .text(GAME_WIDTH / 2, 128, presentation.title, {
        fontSize: '40px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 198, presentation.subtitle, {
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
        presentation.statLines.join('\n'),
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
        390,
        presentation.objective,
        {
          fontSize: '20px',
          color: presentation.accentColor,
          align: 'center',
          wordWrap: { width: 720 },
        },
      )
      .setOrigin(0.5)

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 120,
        presentation.restartPrompt,
        {
          fontSize: '20px',
          color: '#f8fafc',
        },
      )
      .setOrigin(0.5)

    this.input.keyboard?.once('keydown-R', () => {
      this.scene.start('arena')
    })
  }
}
