import type {
  HudModalState,
  HudOwnedItemView,
  HudOwnedWeaponView,
  HudRecipeView,
  HudState,
  RecipeId,
  WeaponId,
} from '../domain/types.js'

export interface HudControllerHandlers {
  onInventoryToggle: () => void
  onInventoryClose: () => void
  onRecipeSelect: (recipeId: RecipeId) => void
  onWeaponEquip: (weaponId: WeaponId) => void
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderList = (items: string[]) =>
  items.length > 0
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>—</p>'

export class HudController {
  private readonly summaryElement: HTMLDivElement

  private readonly modalLayer: HTMLDivElement

  private readonly resumeButton: HTMLButtonElement

  private readonly itemList: HTMLDivElement

  private readonly itemDetail: HTMLDivElement

  private readonly recipeList: HTMLDivElement

  private readonly weaponList: HTMLDivElement

  private modalState: HudModalState | null = null

  private hoveredItemId: string | null = null

  private modalSignature = ''

  private handlers: HudControllerHandlers = {
    onInventoryToggle: () => undefined,
    onInventoryClose: () => undefined,
    onRecipeSelect: () => undefined,
    onWeaponEquip: () => undefined,
  }

  constructor(private readonly element: HTMLElement) {
    this.summaryElement = document.createElement('div')
    this.summaryElement.className = 'hud-summary'

    this.modalLayer = document.createElement('div')
    this.modalLayer.className = 'hud-modal-layer'
    this.modalLayer.innerHTML = `
      <div class="hud-modal__backdrop" data-action="inventory-close"></div>
      <section class="hud-modal" role="dialog" aria-modal="true" aria-label="Inventory">
        <header class="hud-modal__header">
          <div>
            <p class="hud-modal__eyebrow">Inventory pause</p>
            <h2>Owned items and weapons</h2>
          </div>
          <button type="button" class="hud-button hud-button--secondary" data-action="inventory-close">Resume run</button>
        </header>
        <div class="hud-modal__grid">
          <section class="hud-modal__section">
            <h3>Owned items</h3>
            <div class="hud-modal__list" data-region="items"></div>
          </section>
          <section class="hud-modal__section hud-modal__detail">
            <h3>Item detail</h3>
            <div data-region="item-detail"></div>
          </section>
          <section class="hud-modal__section">
            <h3>Craftable combines</h3>
            <div class="hud-modal__list" data-region="recipes"></div>
          </section>
          <section class="hud-modal__section">
            <h3>Owned weapons</h3>
            <div class="hud-modal__list" data-region="weapons"></div>
          </section>
        </div>
      </section>
    `

    const resumeButton = this.modalLayer.querySelector<HTMLButtonElement>('button[data-action="inventory-close"]')
    const itemList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="items"]')
    const itemDetail = this.modalLayer.querySelector<HTMLDivElement>('[data-region="item-detail"]')
    const recipeList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="recipes"]')
    const weaponList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="weapons"]')

    if (!resumeButton || !itemList || !itemDetail || !recipeList || !weaponList) {
      throw new Error('Failed to initialize stable HUD modal boundary.')
    }

    this.resumeButton = resumeButton
    this.itemList = itemList
    this.itemDetail = itemDetail
    this.recipeList = recipeList
    this.weaponList = weaponList

    this.element.replaceChildren(this.summaryElement, this.modalLayer)
    this.element.addEventListener('click', this.handleClick)
    this.element.addEventListener('mouseover', this.handleHover)
    this.element.addEventListener('focusin', this.handleHover)
  }

  setHandlers(handlers: Partial<HudControllerHandlers>): void {
    this.handlers = {
      ...this.handlers,
      ...handlers,
    }
  }

  update(state: HudState): void {
    this.renderSummary(state)
    this.updateModal(state.modal)
  }

  destroy(): void {
    this.element.removeEventListener('click', this.handleClick)
    this.element.removeEventListener('mouseover', this.handleHover)
    this.element.removeEventListener('focusin', this.handleHover)
    this.element.innerHTML = ''
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const actionTarget = target.closest<HTMLElement>('[data-action]')
    if (!actionTarget) {
      return
    }

    switch (actionTarget.dataset.action) {
      case 'inventory-toggle':
        this.handlers.onInventoryToggle()
        break
      case 'inventory-close':
        this.handlers.onInventoryClose()
        break
      case 'recipe-select': {
        const recipeId = actionTarget.dataset.recipeId as RecipeId | undefined
        if (recipeId) {
          this.handlers.onRecipeSelect(recipeId)
        }
        break
      }
      case 'weapon-equip': {
        const weaponId = actionTarget.dataset.weaponId as WeaponId | undefined
        if (weaponId) {
          this.handlers.onWeaponEquip(weaponId)
        }
        break
      }
      default:
        break
    }
  }

  private readonly handleHover = (event: Event): void => {
    if (!this.modalState?.isOpen) {
      return
    }

    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const hoverTarget = target.closest<HTMLElement>('[data-hover-item-id]')
    if (!hoverTarget) {
      return
    }

    const itemId = hoverTarget.dataset.hoverItemId
    if (!itemId || itemId === this.hoveredItemId) {
      return
    }

    this.hoveredItemId = itemId
    this.renderHoveredItemState()
  }

  private renderSummary(state: HudState): void {
    this.summaryElement.innerHTML = `
      <div class="hud-summary__top">
        <div class="hud-summary__title-block">
          <p class="hud-summary__eyebrow">${escapeHtml(state.title)}</p>
          <p class="hud-summary__subtitle">${escapeHtml(state.subtitle)}</p>
          <p class="hud-summary__status"><strong>Status:</strong> ${escapeHtml(state.status)}</p>
        </div>
        <div class="hud-summary__action-block">
          <button
            type="button"
            class="hud-button"
            data-action="inventory-toggle"
            ${state.inventoryButtonDisabled ? 'disabled' : ''}
          >${escapeHtml(state.inventoryButtonLabel)}</button>
          <p class="hud-tip">${escapeHtml(state.tip)}</p>
        </div>
      </div>
      <div class="hud-summary__grid">
        <section class="hud-summary__section">
          <h2>Stats</h2>
          ${renderList(state.stats)}
        </section>
        <section class="hud-summary__section">
          <h2>Inventory</h2>
          ${renderList(state.inventory)}
        </section>
        <section class="hud-summary__section">
          <h2>Available combines</h2>
          ${renderList(state.recipes)}
        </section>
        <section class="hud-summary__section">
          <h2>Objective</h2>
          <p>${escapeHtml(state.objective)}</p>
        </section>
      </div>
    `
  }

  private updateModal(modal: HudModalState): void {
    this.modalState = modal
    this.modalLayer.classList.toggle('is-open', modal.isOpen)
    this.resumeButton.disabled = !modal.isOpen

    if (!modal.isOpen) {
      this.hoveredItemId = null
      this.modalSignature = ''
      this.itemList.replaceChildren()
      this.itemDetail.replaceChildren(this.createEmptyText('No collected item selected.'))
      this.recipeList.replaceChildren()
      this.weaponList.replaceChildren()
      return
    }

    const nextSignature = JSON.stringify(modal)
    if (nextSignature !== this.modalSignature) {
      this.modalSignature = nextSignature
      this.hoveredItemId = this.resolveHoveredItemId(modal.items)
      this.renderModalCollections(modal)
      this.renderHoveredItemState()
      return
    }

    if (!modal.items.some((item) => item.id === this.hoveredItemId)) {
      this.hoveredItemId = this.resolveHoveredItemId(modal.items)
      this.renderHoveredItemState()
    }
  }

  private resolveHoveredItemId(items: HudOwnedItemView[]): string | null {
    if (items.length === 0) {
      return null
    }

    return items.some((item) => item.id === this.hoveredItemId)
      ? this.hoveredItemId
      : items[0].id
  }

  private renderModalCollections(modal: HudModalState): void {
    this.itemList.replaceChildren(...this.createItemButtons(modal.items))
    this.recipeList.replaceChildren(...this.createRecipeButtons(modal.recipes))
    this.weaponList.replaceChildren(...this.createWeaponButtons(modal.weapons))
  }

  private renderHoveredItemState(): void {
    if (!this.modalState?.isOpen) {
      return
    }

    for (const button of this.itemList.querySelectorAll<HTMLElement>('[data-hover-item-id]')) {
      button.classList.toggle('is-hovered', button.dataset.hoverItemId === this.hoveredItemId)
    }

    const hoveredItem = this.modalState.items.find((item) => item.id === this.hoveredItemId)
    this.itemDetail.replaceChildren(
      ...(hoveredItem ? this.createItemDetailNodes(hoveredItem) : [this.createEmptyText('No collected item selected.')]),
    )
  }

  private createItemButtons(items: HudOwnedItemView[]): HTMLElement[] {
    if (items.length === 0) {
      return [this.createEmptyText('No drops collected yet.')]
    }

    return items.map((item) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud-modal__item'
      button.dataset.hoverItemId = item.id

      const label = document.createElement('span')
      label.textContent = item.name

      const count = document.createElement('strong')
      count.textContent = `× ${item.count}`

      button.append(label, count)
      return button
    })
  }

  private createRecipeButtons(recipes: HudRecipeView[]): HTMLElement[] {
    if (recipes.length === 0) {
      return [this.createEmptyText('No actionable combine yet.')]
    }

    return recipes.map((recipe) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud-modal__item hud-modal__item--action'
      button.dataset.action = 'recipe-select'
      button.dataset.recipeId = recipe.id

      const textGroup = document.createElement('span')
      const title = document.createElement('strong')
      title.textContent = recipe.name
      const inputs = document.createElement('small')
      inputs.textContent = recipe.inputs.join(' + ')
      textGroup.append(title, inputs)

      const output = document.createElement('span')
      output.className = 'hud-modal__recipe-output'
      output.textContent = `${recipe.outputWeaponName} · ${recipe.damage} dmg`

      button.append(textGroup, output)
      return button
    })
  }

  private createWeaponButtons(weapons: HudOwnedWeaponView[]): HTMLElement[] {
    if (weapons.length === 0) {
      return [this.createEmptyText('No owned weapons yet.')]
    }

    return weapons.map((weapon) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `hud-modal__item hud-modal__item--weapon${weapon.isEquipped ? ' is-equipped' : ''}`
      button.dataset.action = 'weapon-equip'
      button.dataset.weaponId = weapon.id

      const textGroup = document.createElement('span')
      const title = document.createElement('strong')
      title.textContent = weapon.name
      const description = document.createElement('small')
      description.textContent = weapon.description
      textGroup.append(title, description)

      const meta = document.createElement('span')
      meta.className = 'hud-modal__weapon-meta'
      meta.textContent = `${weapon.isEquipped ? 'Equipped' : 'Equip'} · ${weapon.damage} dmg`

      button.append(textGroup, meta)
      return button
    })
  }

  private createItemDetailNodes(item: HudOwnedItemView): HTMLElement[] {
    const wrapper = document.createElement('div')
    wrapper.className = 'hud-modal__detail-card'

    const name = document.createElement('p')
    name.className = 'hud-modal__eyebrow'
    name.textContent = item.name

    const description = document.createElement('p')
    description.textContent = item.description

    const count = document.createElement('p')
    count.className = 'hud-modal__detail-meta'
    count.textContent = `Owned: ${item.count}`

    wrapper.append(name, description, count)
    return [wrapper]
  }

  private createEmptyText(message: string): HTMLParagraphElement {
    const paragraph = document.createElement('p')
    paragraph.className = 'hud-empty'
    paragraph.textContent = message
    return paragraph
  }
}
