import Phaser from 'phaser'
import { createGameConfig } from './game/config.js'
import './style.css'
import { CodexController } from './ui/Codex.js'
import { HudController } from './ui/Hud.js'
import { GAMEPLAY_CONTROL_TIP, GAME_TITLE, KIM_COMMUNITY_NARRATIONS } from './ui/controlCopy.js'

const app = document.querySelector<HTMLDivElement>('#app')

const getHeaderNarration = (index: number): string => KIM_COMMUNITY_NARRATIONS[index % KIM_COMMUNITY_NARRATIONS.length]
const HEADER_CHARACTER_ICONS = [
  'assets/units/player-kim-idle-0.png',
  'assets/units/player-kim-walk-0.png',
  'assets/units/player-bunny-idle-0.svg',
  'assets/units/slime-idle-0.svg',
  'assets/units/needle-wasp-idle-0.svg',
  'assets/units/lantern-moth-idle-0.svg',
] as const
const getHeaderCharacterIcon = (index: number, offset: number): string =>
  HEADER_CHARACTER_ICONS[(index + offset) % HEADER_CHARACTER_ICONS.length]
let headerNarrationIndex = new Date().getSeconds() % KIM_COMMUNITY_NARRATIONS.length

if (!app) {
  throw new Error('#app 루트 요소가 필요합니다.')
}

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div class="game-header__narration-strip" data-region="kim-narration-strip">
        <div class="game-header__mood-icons" aria-hidden="true">
          <span><img src="${getHeaderCharacterIcon(headerNarrationIndex, 0)}" alt="" /></span>
          <span><img src="${getHeaderCharacterIcon(headerNarrationIndex, 2)}" alt="" /></span>
          <span><img src="${getHeaderCharacterIcon(headerNarrationIndex, 4)}" alt="" /></span>
        </div>
        <p class="game-header__narration" data-region="kim-narration" aria-live="polite" aria-label="김동성 커뮤니티 드립">
          “${getHeaderNarration(headerNarrationIndex)}”
        </p>
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
    feverChargePercent: 0,
    feverLabel: '토큰 대기',
    pityCounter: 0,
    feverTokensRemaining: 0,
    isFeverActive: false,
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

const narrationElement = document.querySelector<HTMLElement>('[data-region="kim-narration"]')
const narrationStripElement = document.querySelector<HTMLElement>('[data-region="kim-narration-strip"]')
const narrationTimer = window.setInterval(() => {
  if (!narrationElement || !narrationStripElement) {
    return
  }

  headerNarrationIndex += 1
  narrationStripElement.classList.remove('is-rolling')
  void narrationStripElement.offsetWidth
  narrationElement.textContent = `“${getHeaderNarration(headerNarrationIndex)}”`
  document.querySelectorAll<HTMLImageElement>('.game-header__mood-icons img').forEach((icon, iconIndex) => {
    icon.src = getHeaderCharacterIcon(headerNarrationIndex, iconIndex * 2)
  })
  narrationStripElement.classList.add('is-rolling')
  window.setTimeout(() => narrationStripElement.classList.remove('is-rolling'), 520)
}, 5000)

window.addEventListener('beforeunload', () => {
  window.clearInterval(narrationTimer)
  hud.destroy()
  codex.destroy()
  game.destroy(true)
})
