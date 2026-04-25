import Phaser from 'phaser'
import { createGameConfig } from './game/config.js'
import './style.css'
import { CodexController } from './ui/Codex.js'
import { HudController } from './ui/Hud.js'
import { GAME_HEADER_CONTROL_HINTS, GAMEPLAY_CONTROL_TIP } from './ui/controlCopy.js'

const app = document.querySelector<HTMLDivElement>('#app')

const headerControlMarkup = GAME_HEADER_CONTROL_HINTS.map((hint) => `<span>${hint}</span>`).join('')

if (!app) {
  throw new Error('#app 루트 요소가 필요합니다.')
}

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div class="game-header__brand">
        <div class="game-header__title-row">
          <strong>NeoD</strong>
          <div class="game-header__controls" aria-label="조작 방법">
            ${headerControlMarkup}
          </div>
        </div>
        <span>슬라임 아레나 · 드롭과 조합으로 완성하는 생존 런</span>
      </div>
      <div class="game-header__rails" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    </header>
    <section class="game-stage-shell">
      <section class="game-frame">
        <div class="codex-panel" id="codex" hidden></div>
        <div id="game-root"></div>
        <section class="hud-panel" id="hud"></section>
      </section>
    </section>
  </main>
`

const hudElement = document.querySelector<HTMLElement>('#hud')
if (!hudElement) {
  throw new Error('#hud 루트 요소가 필요합니다.')
}

const codexElement = document.querySelector<HTMLElement>('#codex')
if (!codexElement) {
  throw new Error('#codex 오버레이 요소가 필요합니다.')
}

const hud = new HudController(hudElement)
const codex = new CodexController(codexElement)

hud.update({
  title: 'NeoD',
  subtitle: '슬라임 아레나 진입 준비…',
  stats: ['게임 런타임 시작 중'],
  inventory: ['드롭 대기 중'],
  recipes: ['조합 상태 대기 중'],
  objective: '드롭을 모아 무기를 완성하고 크라운 슬라임에게 도전하세요.',
  tip: GAMEPLAY_CONTROL_TIP,
  status: '아레나 연결 중',
  inventoryButtonLabel: '인벤토리 열기',
  inventoryButtonDisabled: false,
  stageButtonLabel: '스테이지 선택',
  stageButtonDisabled: true,
  stageSelection: {
    isOpen: false,
    stages: [],
  },
  modal: {
    isOpen: false,
    items: [],
    recipes: [],
    weapons: [],
  },
})

const game = new Phaser.Game(createGameConfig('game-root'))
game.registry.set('hud', hud)
game.registry.set('codex', codex)

window.addEventListener('beforeunload', () => {
  hud.destroy()
  codex.destroy()
  game.destroy(true)
})
