import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import {
  createRunResultHudState,
  createRunResultPresentation,
  isRunResultRestartKey,
  type RunResultPayload,
} from '../systems/runResult.js'
import type { HudController } from '../ui/Hud.js'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  create(payload: RunResultPayload): void {
    const width = Math.max(1, Math.round(this.scale.gameSize.width || GAME_WIDTH))
    const height = Math.max(1, Math.round(this.scale.gameSize.height || GAME_HEIGHT))
    const panelWidth = Math.max(240, width - 96)
    const panelHeight = Math.max(240, height - 96)
    const textWidth = Math.max(160, Math.min(720, width - 96))
    const presentation = createRunResultPresentation(payload)
    const hud = this.game.registry.get('hud') as HudController | undefined
    hud?.update(createRunResultHudState(payload))

    this.cameras.main.setBackgroundColor(presentation.backgroundColor)

    this.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x081426, 0.84)
      .setStrokeStyle(3, Number.parseInt(presentation.accentColor.slice(1), 16), 0.85)

    this.add
      .text(width / 2, Math.max(84, height * 0.24), presentation.title, {
        fontSize: '40px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, Math.max(144, height * 0.37), presentation.subtitle, {
        fontSize: '20px',
        color: '#d8e2ff',
        wordWrap: { width: textWidth },
        align: 'center',
      })
      .setOrigin(0.5)

    this.add
      .text(
        width / 2,
        Math.max(224, height * 0.54),
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
        width / 2,
        Math.max(312, height * 0.72),
        presentation.objective,
        {
          fontSize: '20px',
          color: presentation.accentColor,
          align: 'center',
          wordWrap: { width: textWidth },
        },
      )
      .setOrigin(0.5)

    this.add
      .text(
        width / 2,
        height - 96,
        presentation.restartPrompt,
        {
          fontSize: '20px',
          color: '#f8fafc',
        },
      )
      .setOrigin(0.5)

    const keyboard = this.input.keyboard
    if (!keyboard) {
      return
    }

    const handleRestartKey = (event: KeyboardEvent): void => {
      if (!isRunResultRestartKey(event)) {
        return
      }

      event.preventDefault()
      keyboard.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, handleRestartKey)
      this.scene.start('arena')
    }

    keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, handleRestartKey)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, handleRestartKey)
    })
  }
}
