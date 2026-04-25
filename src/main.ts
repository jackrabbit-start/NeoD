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
      <div class="game-header__brand">
        <strong>NeoD · browser-first V1 prototype</strong>
        <span>Safe fictional slime run · drop + combine loop</span>
      </div>
      <div class="game-header__rails" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    </header>
    <section class="game-frame">
      <div class="hud-panel" id="hud"></div>
      <div class="codex-panel" id="codex" hidden></div>
      <div id="game-root"></div>
    </section>
  </main>
`

const hudElement = document.querySelector<HTMLElement>('#hud')
if (!hudElement) {
  throw new Error('Expected #hud overlay element.')
}

const codexElement = document.querySelector<HTMLElement>('#codex')
if (!codexElement) {
  throw new Error('Expected #codex overlay element.')
}

const hud = new HudController(hudElement)
const codex = new CodexController(codexElement)

hud.update({
  title: 'NeoD Prototype',
  subtitle: 'Loading arena…',
  stats: ['Booting Phaser runtime'],
  inventory: ['Waiting for drops'],
  recipes: ['Waiting for recipe state'],
  objective: 'Start the run and defeat the slime boss.',
  tip: 'WASD move · Mouse aim · Hold click shoot · Open inventory to combine · Q codex',
  status: 'Booting',
  inventoryButtonLabel: 'Open inventory',
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
