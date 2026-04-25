import Phaser from 'phaser'
import { createGameConfig } from './game/config.js'
import './style.css'
import { CodexController } from './ui/Codex.js'
import { HudController } from './ui/Hud.js'
import { GAME_HEADER_CONTROL_HINTS, GAMEPLAY_CONTROL_TIP, GAME_TITLE, KIM_COMMUNITY_NARRATIONS } from './ui/controlCopy.js'

const app = document.querySelector<HTMLDivElement>('#app')

const headerControlMarkup = GAME_HEADER_CONTROL_HINTS.map((hint) => `<span>${hint}</span>`).join('')
const headerNarration = KIM_COMMUNITY_NARRATIONS[new Date().getDate() % KIM_COMMUNITY_NARRATIONS.length]

if (!app) {
  throw new Error('#app 루트 요소가 필요합니다.')
}

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div class="game-header__brand game-header__brand--narration">
        <p class="game-header__narration" aria-label="김동성의 오늘">
          “${headerNarration}”
        </p>
        <div class="game-header__controls" aria-label="조작 방법">
          ${headerControlMarkup}
        </div>
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
  title: GAME_TITLE,
  subtitle: '김동성의 추격이 시작되기 전, 마지막 준비를 마치세요…',
  stats: ['게임 런타임 시작 중'],
  passives: ['레벨업 패시브 준비 중'],
  inventory: ['파친코 보상 레벨 준비 중'],
  recipes: ['같은 무기·같은 별 3개 자동 합성 대기 중'],
  objective: '김동성의 추격에서 끝까지 버티기 위해 토큰을 모아 무기를 강화하고 생존 루프를 완성하세요.',
  tip: GAMEPLAY_CONTROL_TIP,
  status: '생존 경기장 연결 중',
  inventoryButtonLabel: '인벤토리 열기',
  inventoryButtonDisabled: false,
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

const game = new Phaser.Game(createGameConfig('game-root'))
game.registry.set('hud', hud)
game.registry.set('codex', codex)

window.addEventListener('beforeunload', () => {
  hud.destroy()
  codex.destroy()
  game.destroy(true)
})
