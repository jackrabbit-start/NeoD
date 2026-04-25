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
    const title = isWin ? '런 클리어' : '런 실패'
    const subtitle = isWin
      ? '슬라임 보스를 쓰러뜨렸습니다. 프로토타입 루프가 성립합니다.'
      : '런이 중간에 종료되었습니다. 다시 도전해 더 강한 조합을 노리세요.'

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
        `최종 무기: ${payload.weaponName}\n돌파 웨이브: ${payload.wavesCleared}`,
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
        'R 키를 눌러 프로토타입 런을 다시 시작하세요',
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
