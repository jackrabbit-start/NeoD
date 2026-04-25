import type { CodexEnemyEntry, CodexItemEntry, CodexRecipeEntry, CodexState } from '../domain/types.js'

const colorHex = (value: number) => `#${value.toString(16).padStart(6, '0')}`

const renderSwatch = (color: number) =>
  `<span class="codex-swatch" style="--swatch:${colorHex(color)}"></span>`

const renderItems = (items: CodexItemEntry[]) => items.length === 0
  ? '<p class="codex-empty">재료 아이콘 드롭은 숨김 처리되었습니다. 적 처치 토큰이 파친코 보상으로 전환됩니다.</p>'
  : `
  <div class="codex-grid">
    ${items
      .map(
        (item) => `
          <article class="codex-entry">
            <h3>${renderSwatch(item.color)}${item.name}</h3>
            <p>${item.description}</p>
          </article>
        `,
      )
      .join('')}
  </div>
`

const renderRecipes = (recipes: CodexRecipeEntry[]) => recipes.length === 0
  ? '<p class="codex-empty">기존 조합식은 호환 데이터로 남지만, 이번 루프에서는 같은 무기·같은 별 2개 합성이 우선입니다.</p>'
  : `
  <div class="codex-grid">
    ${recipes
      .map(
        (recipe) => `
          <article class="codex-entry">
            <h3>${recipe.name}</h3>
            <p><strong>${recipe.identityLabel}</strong> · ${recipe.identityHint}</p>
            <p class="codex-inline-list">
              ${recipe.inputs
                .map((input) => `${renderSwatch(input.color)}${input.name}`)
                .join('<span class="codex-arrow">+</span>')}
              <span class="codex-arrow">→</span>
              <strong>${recipe.output.name}</strong>
            </p>
            <p>${recipe.note}</p>
            <p class="codex-meta">${recipe.output.summary} · ${recipe.output.description}</p>
          </article>
        `,
      )
      .join('')}
  </div>
`

const renderEnemies = (enemies: CodexEnemyEntry[]) => `
  <div class="codex-grid">
    ${enemies
      .map(
        (enemy) => `
          <article class="codex-entry">
            <h3>${renderSwatch(enemy.tint)}${enemy.name}</h3>
            <p>${enemy.description}</p>
            <p class="codex-meta">${enemy.stats.join(' · ')}</p>
            <p class="codex-inline-list">
              <span class="codex-label">보상</span>
              ${enemy.drops.length > 0
                ? enemy.drops.map((drop) => `${renderSwatch(drop.color)}${drop.name}`).join('')
                : `<span>${enemy.stats.at(-1) ?? '토큰 보상 없음'}</span>`}
            </p>
          </article>
        `,
      )
      .join('')}
  </div>
`

const renderCodex = (state: CodexState) => `
      <div class="codex-shell">
        <header class="codex-header">
          <div>
            <h2>${state.title}</h2>
            <p>${state.subtitle}</p>
          </div>
          <span class="codex-hint">${state.hint}</span>
        </header>
        <section class="codex-section">
          <h3>숨긴 재료</h3>
          ${renderItems(state.items)}
        </section>
        <section class="codex-section">
          <h3>별 합성 안내</h3>
          ${renderRecipes(state.recipes)}
        </section>
        <section class="codex-section">
          <h3>적</h3>
          ${renderEnemies(state.enemies)}
        </section>
      </div>
    `

export class CodexController {
  private renderedMarkup: string | null = null

  constructor(private readonly element: HTMLElement) {}

  update(state: CodexState): void {
    this.element.hidden = !state.isOpen

    if (!state.isOpen) {
      if (this.renderedMarkup !== null || this.element.innerHTML !== '') {
        this.element.innerHTML = ''
      }
      this.renderedMarkup = null
      return
    }

    const nextMarkup = renderCodex(state)
    if (nextMarkup === this.renderedMarkup) {
      return
    }

    this.element.innerHTML = nextMarkup
    this.renderedMarkup = nextMarkup
  }

  destroy(): void {
    this.renderedMarkup = null
    this.element.innerHTML = ''
    this.element.hidden = true
  }
}
