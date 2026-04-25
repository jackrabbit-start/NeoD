import Phaser from 'phaser'
import { createGameConfig } from './game/config.js'
import './style.css'
import { CodexController } from './ui/Codex.js'
import { HudController } from './ui/Hud.js'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Expected #app root element.')
}

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <strong>NeoD · 브라우저 우선 V1 프로토타입</strong>
      <span>안전한 가상 슬라임 런 · 드롭 + 조합 루프</span>
    </header>
    <section class="game-stage-shell">
      <section class="game-frame">
        <div class="codex-panel" id="codex" hidden></div>
        <div id="game-root"></div>
      </section>
      <section class="hud-panel" id="hud"></section>
    </section>
  </main>
`

const hudElement = document.querySelector<HTMLElement>('#hud')
if (!hudElement) {
  throw new Error('Expected #hud root element.')
}

const codexElement = document.querySelector<HTMLElement>('#codex')
if (!codexElement) {
  throw new Error('Expected #codex overlay element.')
}

const hud = new HudController(hudElement)
const codex = new CodexController(codexElement)

hud.update({
  title: 'NeoD 프로토타입',
  subtitle: '전장을 불러오는 중…',
  stats: ['Phaser 런타임 시작 중'],
  inventory: ['드롭 대기 중'],
  recipes: ['조합 정보 대기 중'],
  objective: '런을 시작하고 슬라임 보스를 처치하세요.',
  tip: 'WASD 이동 · 마우스 조준 · 클릭 유지 사격 · 인벤토리 열기: 조합 · Q 코덱스',
  status: '시작 중',
  inventoryButtonLabel: '인벤토리 열기',
  inventoryButtonDisabled: false,
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
