import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import type { HudController } from '../ui/Hud.js'
import { GAMEPLAY_CONTROL_TIP, GAME_TITLE } from '../ui/controlCopy.js'

export class StartScene extends Phaser.Scene {
  constructor() {
    super('start')
  }

  create(): void {
    const width = Math.max(1, Math.round(this.scale.gameSize.width || GAME_WIDTH))
    const height = Math.max(1, Math.round(this.scale.gameSize.height || GAME_HEIGHT))
    const textWidth = Math.max(220, Math.min(700, width - 96))
    const startButtonWidth = Math.min(280, Math.max(190, width - 112))
    const startButtonHeight = 56
    const startButtonY = Math.min(height - 76, Math.max(330, height * 0.72))
    const hud = this.game.registry.get('hud') as HudController | undefined

    hud?.update({
      title: GAME_TITLE,
      subtitle: '시작 버튼을 눌러 런을 시작하세요.',
      currentTimeLabel: '00:00',
      stats: ['대기 중: 아직 적이 등장하지 않습니다.', '시작 후 Stage 1부터 진행됩니다.'],
      passives: ['레벨업 패시브는 런 중 토큰 XP로 해금됩니다.'],
      inventory: ['파친코 토큰과 자석/하트는 런 시작 후 등장합니다.'],
      recipes: ['같은 무기·같은 별 3개 자동 합성 대기 중'],
      objective: '준비가 끝나면 새 런 시작을 눌러 경기장에 진입하세요.',
      tip: GAMEPLAY_CONTROL_TIP,
      status: '시작 화면 대기 중',
      inventoryButtonLabel: '인벤토리 열기',
      inventoryButtonDisabled: true,
      stageButtonLabel: '스테이지 선택',
      stageButtonDisabled: true,
      stageSelection: {
        isOpen: false,
        stages: [],
      },
      passiveSelection: {
        isOpen: false,
        level: 1,
        choices: [],
      },
      pachinko: {
        level: 1,
        totalTokenXp: 0,
        droppedTokens: 0,
        activeTokens: 0,
        queuedTokens: 0,
        isTokenInFlight: false,
        latestReward: null,
      },
      modal: {
        isOpen: false,
        items: [],
        recipes: [],
        weapons: [],
        characterStats: [],
      },
    })

    this.cameras.main.setBackgroundColor('#07111f')

    this.add
      .rectangle(width / 2, height / 2, Math.max(260, width - 96), Math.max(260, height - 96), 0x081426, 0.86)
      .setStrokeStyle(3, 0x52d7ff, 0.72)

    this.add
      .text(width / 2, Math.max(78, height * 0.2), GAME_TITLE, {
        fontSize: '42px',
        color: '#f8fafc',
        fontStyle: '900',
        align: 'center',
        wordWrap: { width: textWidth },
      })
      .setOrigin(0.5)
      .setShadow(0, 3, '#020713', 8)

    this.add
      .text(width / 2, Math.max(228, height * 0.5), '파친코 도박에 빠진 김동성은 매번 ‘이번 한 번만’이라는 말로 자기 삶을 잃어 갔습니다.\n쌓인 빚과 추격을 피해 들어온 이 경기장은, 중독에서 벗어나기 위한 마지막 탈출구입니다.\n토큰을 삼키는 대신 무기로 바꾸고, 그는 오늘 처음으로 도망이 아닌 탈출을 선택합니다.', {
        fontSize: '17px',
        color: '#ffe28a',
        align: 'center',
        lineSpacing: 7,
        wordWrap: { width: textWidth },
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, Math.max(312, height * 0.62), 'WASD 이동 · J 대시 · 자동 사격 · 토큰으로 레벨업', {
        fontSize: '18px',
        color: '#8fe4ff',
        align: 'center',
        wordWrap: { width: textWidth },
      })
      .setOrigin(0.5)

    const startButton = this.add
      .rectangle(width / 2, startButtonY, startButtonWidth, startButtonHeight, 0x1f5f4a, 0.98)
      .setStrokeStyle(2, 0x79ffb2, 0.96)
      .setInteractive({ useHandCursor: true })
      .setName('start-run-button')

    const startButtonLabel = this.add
      .text(width / 2, startButtonY, '새 런 시작', {
        fontSize: '22px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    let isStarting = false
    const startRun = (): void => {
      if (isStarting) {
        return
      }

      isStarting = true
      startButton.disableInteractive()
      startButtonLabel.setText('시작 중...')
      this.input.off(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)
      this.scene.stop('arena')
      this.scene.start('arena', { startElapsedMs: 0 })
    }
    const isInsideStartButton = (pointer: Phaser.Input.Pointer): boolean =>
      pointer.x >= startButton.x - startButtonWidth / 2 &&
      pointer.x <= startButton.x + startButtonWidth / 2 &&
      pointer.y >= startButton.y - startButtonHeight / 2 &&
      pointer.y <= startButton.y + startButtonHeight / 2
    const handleScenePointerDown = (pointer: Phaser.Input.Pointer): void => {
      if (isInsideStartButton(pointer)) {
        startRun()
      }
    }

    startButton.on(Phaser.Input.Events.POINTER_OVER, () => {
      startButton.setFillStyle(0x2d8f68, 1)
    })
    startButton.on(Phaser.Input.Events.POINTER_OUT, () => {
      startButton.setFillStyle(0x1f5f4a, 0.98)
    })
    startButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      startButton.setFillStyle(0x174a3a, 1)
      startRun()
    })
    this.input.on(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)

    const keyboard = this.input.keyboard
    const enterKey = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    const spaceKey = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    const handleKeyboardStart = (): void => startRun()
    enterKey?.on(Phaser.Input.Keyboard.Events.DOWN, handleKeyboardStart)
    spaceKey?.on(Phaser.Input.Keyboard.Events.DOWN, handleKeyboardStart)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, handleScenePointerDown)
      enterKey?.off(Phaser.Input.Keyboard.Events.DOWN, handleKeyboardStart)
      spaceKey?.off(Phaser.Input.Keyboard.Events.DOWN, handleKeyboardStart)
    })
  }
}
