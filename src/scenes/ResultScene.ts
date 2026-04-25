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
    const width = Math.max(1, Math.round(this.scale.gameSize.width || GAME_WIDTH))
    const height = Math.max(1, Math.round(this.scale.gameSize.height || GAME_HEIGHT))
    const panelWidth = Math.max(240, width - 96)
    const panelHeight = Math.max(240, height - 96)
    const textWidth = Math.max(160, Math.min(720, width - 96))
    const restartButtonY = Math.max(48, height - 48)
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
        Math.max(32, restartButtonY - 48),
        presentation.restartPrompt,
        {
          fontSize: '20px',
          color: '#f8fafc',
        },
      )
      .setOrigin(0.5)

    const restartButtonWidth = Math.min(244, Math.max(180, width - 96))
    const restartButtonHeight = 48
    const restartButton = this.add
      .rectangle(width / 2, restartButtonY, restartButtonWidth, restartButtonHeight, 0x1f3a5f, 0.96)
      .setStrokeStyle(2, Number.parseInt(presentation.accentColor.slice(1), 16), 0.95)
      .setInteractive({ useHandCursor: true })
      .setName('restart-run-button')

    const restartButtonLabel = this.add
      .text(width / 2, restartButtonY, '새 런 시작', {
        fontSize: '20px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    let isRestarting = false
    const restartRun = (): void => {
      if (isRestarting) {
        return
      }

      isRestarting = true
      restartButton.disableInteractive()
      restartButtonLabel.setText('시작 중...')
      this.input.off(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)
      this.scene.stop('arena')
      this.scene.start('arena', { startElapsedMs: 0 })
    }
    const isInsideRestartButton = (pointer: Phaser.Input.Pointer): boolean =>
      pointer.x >= restartButton.x - restartButtonWidth / 2 &&
      pointer.x <= restartButton.x + restartButtonWidth / 2 &&
      pointer.y >= restartButton.y - restartButtonHeight / 2 &&
      pointer.y <= restartButton.y + restartButtonHeight / 2
    const handleScenePointerDown = (pointer: Phaser.Input.Pointer): void => {
      if (isInsideRestartButton(pointer)) {
        restartRun()
      }
    }

    restartButton.on(Phaser.Input.Events.POINTER_OVER, () => {
      restartButton.setFillStyle(0x2d5f8f, 1)
    })
    restartButton.on(Phaser.Input.Events.POINTER_OUT, () => {
      restartButton.setFillStyle(0x1f3a5f, 0.96)
    })
    restartButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      restartButton.setFillStyle(0x16314f, 1)
      restartRun()
    })
    this.input.on(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)
    })
  }
}
