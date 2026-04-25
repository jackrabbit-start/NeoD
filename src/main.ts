import Phaser from 'phaser'
import { createGameConfig } from './game/config.js'
import './style.css'
import { HudController } from './ui/Hud.js'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Expected #app root element.')
}

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <strong>NeoD · browser-first V1 prototype</strong>
      <span>Safe fictional slime run · drop + combine loop</span>
    </header>
    <section class="game-frame">
      <div class="hud-panel" id="hud"></div>
      <div id="game-root"></div>
    </section>
  </main>
`

const hudElement = document.querySelector<HTMLElement>('#hud')
if (!hudElement) {
  throw new Error('Expected #hud overlay element.')
}

const hud = new HudController(hudElement)

hud.update({
  title: 'NeoD Prototype',
  subtitle: 'Loading arena…',
  stats: ['Booting Phaser runtime'],
  inventory: ['Waiting for drops'],
  recipes: ['Waiting for recipe state'],
  objective: 'Start the run and defeat the slime boss.',
  tip: 'WASD move · Mouse aim · Hold click shoot · Open inventory to combine',
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

window.addEventListener('beforeunload', () => {
  hud.destroy()
  game.destroy(true)
})
