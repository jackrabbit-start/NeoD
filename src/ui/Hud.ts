import type {
  HudModalState,
  HudOwnedItemView,
  HudOwnedWeaponView,
  HudRecipeView,
  HudStageSelectionState,
  HudStageView,
  HudState,
  RecipeId,
  WeaponId,
  WeaponStackKey,
} from '../domain/types.js'
import { getHudWeaponAssetPath } from '../game/visualManifest.js'

export interface HudControllerHandlers {
  onInventoryToggle: () => void
  onInventoryClose: () => void
  onRecipeSelect: (recipeId: RecipeId) => void
  onWeaponEquip: (weaponKey: WeaponId | WeaponStackKey) => void
  onWeaponTune: (weaponId: WeaponId) => void
  onWeaponFuse: (weaponKey: WeaponStackKey) => void
  onStageSelectionToggle: () => void
  onStageSelectionClose: () => void
  onStageSelect: (stageIndex: number) => void
}

export interface HudRenderMetrics {
  summaryAssignments: number
  summarySkips: number
  modalClosedSkips: number
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderList = (items: string[], className = 'hud-summary__list') =>
  items.length > 0
    ? `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="hud-empty">—</p>'

const renderSummarySection = (title: string, content: string, className = '') => `
  <section class="hud-summary__section${className ? ` ${className}` : ''}">
    <h2>${escapeHtml(title)}</h2>
    ${content}
  </section>
`

const getHudIconSrc = (iconKey?: string) =>
  iconKey ? getHudWeaponAssetPath(iconKey) : null

const renderStatusPanel = (state: HudState) => `
  <section class="hud-summary__status" aria-label="현재 런 상태">
    <div class="hud-summary__status-line">
      <span>상태</span>
      <strong>${escapeHtml(state.status)}</strong>
    </div>
    <div class="hud-summary__status-meta">
      <p><span>목표</span>${escapeHtml(state.objective)}</p>
      <p><span>팁</span>${escapeHtml(state.tip)}</p>
    </div>
  </section>
`

export class HudController {
  private readonly summaryElement: HTMLDivElement

  private readonly modalLayer: HTMLDivElement

  private readonly stageModalLayer: HTMLDivElement

  private readonly resumeButton: HTMLButtonElement

  private readonly stageResumeButton: HTMLButtonElement

  private readonly stageList: HTMLDivElement

  private readonly itemList: HTMLDivElement

  private readonly itemDetail: HTMLDivElement

  private readonly recipeList: HTMLDivElement

  private readonly weaponList: HTMLDivElement

  private modalState: HudModalState | null = null

  private hoveredItemId: string | null = null

  private modalSignature = ''

  private summaryMarkup = ''

  private stageSignature = ''

  private renderMetrics: HudRenderMetrics = {
    summaryAssignments: 0,
    summarySkips: 0,
    modalClosedSkips: 0,
  }

  private handlers: HudControllerHandlers = {
    onInventoryToggle: () => undefined,
    onInventoryClose: () => undefined,
    onRecipeSelect: () => undefined,
    onWeaponEquip: () => undefined,
    onWeaponTune: () => undefined,
    onWeaponFuse: () => undefined,
    onStageSelectionToggle: () => undefined,
    onStageSelectionClose: () => undefined,
    onStageSelect: () => undefined,
  }

  constructor(private readonly element: HTMLElement) {
    this.summaryElement = document.createElement('div')
    this.summaryElement.className = 'hud-summary'

    this.modalLayer = document.createElement('div')
    this.modalLayer.className = 'hud-modal-layer'
    this.modalLayer.innerHTML = `
      <div class="hud-modal__backdrop" data-action="inventory-close"></div>
      <section class="hud-modal" role="dialog" aria-modal="true" aria-label="인벤토리">
        <header class="hud-modal__header">
          <div>
            <p class="hud-modal__eyebrow">인벤토리 일시정지</p>
            <h2>보유 무기 및 별 합성</h2>
          </div>
          <button type="button" class="hud-button hud-button--secondary" data-action="inventory-close">런 재개</button>
        </header>
        <div class="hud-modal__grid">
          <section class="hud-modal__section">
            <h3>토큰 보상</h3>
            <div class="hud-modal__list" data-region="items"></div>
          </section>
          <section class="hud-modal__section hud-modal__detail">
            <h3>보상 안내</h3>
            <div data-region="item-detail"></div>
          </section>
          <section class="hud-modal__section">
            <h3>가능한 합성</h3>
            <div class="hud-modal__list" data-region="recipes"></div>
          </section>
          <section class="hud-modal__section">
            <h3>보유 무기</h3>
            <div class="hud-modal__list" data-region="weapons"></div>
          </section>
        </div>
      </section>
    `

    this.stageModalLayer = document.createElement('div')
    this.stageModalLayer.className = 'hud-modal-layer'
    this.stageModalLayer.innerHTML = `
      <div class="hud-modal__backdrop" data-action="stage-close"></div>
      <section class="hud-modal hud-modal--stage" role="dialog" aria-modal="true" aria-label="스테이지 선택">
        <header class="hud-modal__header">
          <div>
            <p class="hud-modal__eyebrow">스테이지 선택</p>
            <h2>시작할 웨이브를 고르세요</h2>
          </div>
          <button type="button" class="hud-button hud-button--secondary" data-action="stage-close">선택 닫기</button>
        </header>
        <div class="hud-modal__list hud-modal__list--stage" data-region="stages"></div>
      </section>
    `

    const resumeButton = this.modalLayer.querySelector<HTMLButtonElement>('button[data-action="inventory-close"]')
    const itemList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="items"]')
    const itemDetail = this.modalLayer.querySelector<HTMLDivElement>('[data-region="item-detail"]')
    const recipeList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="recipes"]')
    const weaponList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="weapons"]')
    const stageResumeButton = this.stageModalLayer.querySelector<HTMLButtonElement>('button[data-action="stage-close"]')
    const stageList = this.stageModalLayer.querySelector<HTMLDivElement>('[data-region="stages"]')

    if (
      !resumeButton ||
      !itemList ||
      !itemDetail ||
      !recipeList ||
      !weaponList ||
      !stageResumeButton ||
      !stageList
    ) {
      throw new Error('안정적인 HUD 모달 경계를 초기화하지 못했습니다.')
    }

    this.resumeButton = resumeButton
    this.stageResumeButton = stageResumeButton
    this.stageList = stageList
    this.itemList = itemList
    this.itemDetail = itemDetail
    this.recipeList = recipeList
    this.weaponList = weaponList

    this.element.replaceChildren(this.summaryElement, this.modalLayer, this.stageModalLayer)
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
    this.updateStageSelection(state.stageSelection)
  }

  getRenderMetrics(): HudRenderMetrics {
    return { ...this.renderMetrics }
  }

  destroy(): void {
    this.element.removeEventListener('click', this.handleClick)
    this.element.removeEventListener('mouseover', this.handleHover)
    this.element.removeEventListener('focusin', this.handleHover)
    this.summaryMarkup = ''
    this.modalSignature = ''
    this.stageSignature = ''
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
      case 'stage-toggle':
        this.handlers.onStageSelectionToggle()
        break
      case 'stage-close':
        this.handlers.onStageSelectionClose()
        break
      case 'stage-select': {
        const stageIndex = Number(actionTarget.dataset.stageIndex)
        if (Number.isInteger(stageIndex)) {
          this.handlers.onStageSelect(stageIndex)
        }
        break
      }
      case 'recipe-select': {
        const recipeId = actionTarget.dataset.recipeId as RecipeId | undefined
        if (recipeId) {
          this.handlers.onRecipeSelect(recipeId)
        }
        break
      }
      case 'weapon-equip': {
        const weaponKey = actionTarget.dataset.weaponKey ?? actionTarget.dataset.weaponId
        if (weaponKey) {
          this.handlers.onWeaponEquip(weaponKey as WeaponId | WeaponStackKey)
        }
        break
      }
      case 'weapon-fuse': {
        const weaponKey = actionTarget.dataset.weaponKey as WeaponStackKey | undefined
        if (weaponKey) {
          this.handlers.onWeaponFuse(weaponKey)
        }
        break
      }
      case 'weapon-tune': {
        const weaponId = actionTarget.dataset.weaponId as WeaponId | undefined
        if (weaponId) {
          this.handlers.onWeaponTune(weaponId)
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
    const nextMarkup = `
      <div class="hud-summary__shell">
        <header class="hud-summary__hero">
          <div class="hud-summary__title-block">
            <h1>${escapeHtml(state.title)}</h1>
            <p>${escapeHtml(state.subtitle)}</p>
          </div>
          ${renderStatusPanel(state)}
          <button
            type="button"
            class="hud-button hud-button--stage"
            data-action="stage-toggle"
            ${state.stageButtonDisabled ? 'disabled' : ''}
          >${escapeHtml(state.stageButtonLabel)}</button>
        </header>
        <div class="hud-summary__grid">
          ${renderSummarySection('능력치', renderList(state.stats), 'hud-summary__section--stats')}
          ${state.pachinko ? renderSummarySection('파친코', renderList([
            `보상 레벨: Lv.${state.pachinko.level} · 누적 토큰 XP ${state.pachinko.totalTokenXp}`,
            `바닥 토큰: ${state.pachinko.droppedTokens}개 · 토큰 큐: ${state.pachinko.queuedTokens}개`,
            `${state.pachinko.isTokenInFlight ? '파친코 토큰 낙하 중' : '파친코 투입 대기 중'}`,
            `최근 보상: ${state.pachinko.latestReward ?? '아직 없음'}`,
          ]), 'hud-summary__section--pachinko') : ''}
          <section class="hud-summary__section hud-summary__section--inventory">
            <div class="hud-summary__inventory-header">
              <h2>인벤토리</h2>
              <button
                type="button"
                class="hud-button"
                data-action="inventory-toggle"
                ${state.inventoryButtonDisabled ? 'disabled' : ''}
              >${escapeHtml(state.inventoryButtonLabel)}</button>
            </div>
            ${renderList(state.inventory)}
          </section>
          ${renderSummarySection('가능한 합성', renderList(state.recipes))}
          ${renderSummarySection('목표', `<p class="hud-summary__body">${escapeHtml(state.objective)}</p>`)}
          ${renderSummarySection('조작법', `<p class="hud-tip">${escapeHtml(state.tip)}</p>`, 'hud-summary__section--controls')}
        </div>
      </div>
    `

    if (nextMarkup === this.summaryMarkup) {
      this.renderMetrics.summarySkips += 1
      return
    }

    this.summaryElement.innerHTML = nextMarkup
    this.summaryMarkup = nextMarkup
    this.renderMetrics.summaryAssignments += 1
  }

  private updateModal(modal: HudModalState): void {
    this.modalState = modal
    this.modalLayer.classList.toggle('is-open', modal.isOpen)
    this.resumeButton.disabled = !modal.isOpen

    if (!modal.isOpen) {
      if (this.modalSignature === 'closed') {
        this.renderMetrics.modalClosedSkips += 1
        return
      }

      this.hoveredItemId = null
      this.modalSignature = 'closed'
      this.itemList.replaceChildren()
      this.itemDetail.replaceChildren(this.createEmptyText('파친코 보상은 무기 스택으로 기록됩니다.'))
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

  private updateStageSelection(stageSelection: HudStageSelectionState): void {
    this.stageModalLayer.classList.toggle('is-open', stageSelection.isOpen)
    this.stageResumeButton.disabled = !stageSelection.isOpen

    if (!stageSelection.isOpen) {
      this.stageSignature = ''
      return
    }

    const nextSignature = JSON.stringify(stageSelection)
    if (nextSignature !== this.stageSignature) {
      this.stageSignature = nextSignature
      this.stageList.replaceChildren(...this.createStageButtons(stageSelection.stages))
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
      ...(hoveredItem ? this.createItemDetailNodes(hoveredItem) : [this.createEmptyText('파친코 보상은 무기 스택으로 기록됩니다.')]),
    )
  }

  private createItemButtons(items: HudOwnedItemView[]): HTMLElement[] {
    if (items.length === 0) {
      return [this.createEmptyText('재료 드롭은 비활성화되었습니다. 파친코 무기 보상을 확인하세요.')]
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
      return [this.createEmptyText('같은 무기와 같은 별 2개가 모이면 합성이 가능합니다.')]
    }

    return recipes.map((recipe) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud-modal__item hud-modal__item--action'
      button.dataset.action = 'recipe-select'
      button.dataset.recipeId = recipe.id

      const textGroup = document.createElement('span')
      textGroup.className = 'hud-modal__content'
      const title = document.createElement('strong')
      title.textContent = recipe.name
      const inputs = document.createElement('small')
      inputs.textContent = recipe.inputs.join(' + ')
      const identity = document.createElement('small')
      identity.textContent = `${recipe.identityLabel}: ${recipe.identityHint}`
      textGroup.append(title, identity, inputs)

      const left = document.createElement('div')
      left.className = 'hud-modal__left'
      const icon = this.createHudIcon(recipe.outputWeaponHudIconKey, recipe.outputWeaponName)
      if (icon) {
        left.append(icon)
      }
      left.append(textGroup)

      const output = document.createElement('span')
      output.className = 'hud-modal__recipe-output'
      output.textContent = `${recipe.outputWeaponName} · 피해 ${recipe.damage}`
      if (recipe.outputWeaponAccentColor != null) {
        output.style.color = `#${recipe.outputWeaponAccentColor.toString(16).padStart(6, '0')}`
      }

      button.append(left, output)
      return button
    })
  }

  private createWeaponButtons(weapons: HudOwnedWeaponView[]): HTMLElement[] {
    if (weapons.length === 0) {
      return [this.createEmptyText('아직 보유한 무기가 없습니다.')]
    }

    return weapons.map((weapon) => {
      const row = document.createElement('div')
      row.className = `hud-modal__item hud-modal__item--weapon${weapon.isEquipped ? ' is-equipped' : ''}`

      const textGroup = document.createElement('span')
      textGroup.className = 'hud-modal__content'
      const title = document.createElement('strong')
      const starText = weapon.star ? `${'★'.repeat(weapon.star)}${'☆'.repeat(Math.max(0, 5 - weapon.star))}` : ''
      const countText = weapon.count != null ? ` × ${weapon.count}` : ''
      title.textContent = `${weapon.name}${starText ? ` · ${starText}` : ''}${countText}`
      const description = document.createElement('small')
      description.textContent = weapon.description
      const tuning = document.createElement('small')
      tuning.textContent = weapon.canTune
        ? (weapon.tuningLabel ? `튜닝: ${weapon.tuningLabel}` : '튜닝 가능')
        : (weapon.tuneDisabledReason ?? '튜닝: 이번 파친코 패스에서는 비활성')
      textGroup.append(title, description, tuning)

      const left = document.createElement('div')
      left.className = 'hud-modal__left'
      const icon = this.createHudIcon(weapon.hudIconKey, weapon.name)
      if (icon) {
        left.append(icon)
      }
      left.append(textGroup)

      const actions = document.createElement('span')
      actions.className = 'hud-modal__weapon-actions'

      const meta = document.createElement('small')
      meta.className = 'hud-modal__weapon-meta'
      meta.textContent = `피해 ${weapon.damage} · 초당 ${Math.round(1000 / weapon.fireRateMs)}발`
      if (weapon.accentColor != null) {
        meta.style.color = `#${weapon.accentColor.toString(16).padStart(6, '0')}`
      }

      const equipButton = document.createElement('button')
      equipButton.type = 'button'
      equipButton.className = 'hud-button hud-button--compact'
      equipButton.dataset.action = 'weapon-equip'
      equipButton.dataset.weaponId = weapon.id
      if (weapon.stackKey) {
        equipButton.dataset.weaponKey = weapon.stackKey
      }
      equipButton.disabled = weapon.isEquipped
      equipButton.textContent = weapon.isEquipped ? '장착 중' : '장착'

      const fuseButton = document.createElement('button')
      fuseButton.type = 'button'
      fuseButton.className = 'hud-button hud-button--compact'
      fuseButton.dataset.action = 'weapon-fuse'
      if (weapon.stackKey) {
        fuseButton.dataset.weaponKey = weapon.stackKey
      }
      fuseButton.disabled = !weapon.canFuse || !weapon.stackKey
      fuseButton.title = weapon.fuseDisabledReason ?? '같은 별 2개를 높은 별 1개로 합성'
      fuseButton.textContent = weapon.canFuse ? '합성' : '합성 잠김'

      actions.append(meta, equipButton, fuseButton)
      row.append(left, actions)
      return row
    })
  }

  private createStageButtons(stages: HudStageView[]): HTMLElement[] {
    if (stages.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'hud-empty'
      empty.textContent = '선택 가능한 스테이지가 없습니다.'
      return [empty]
    }

    return stages.map((stage) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `hud-modal__item hud-modal__item--stage${stage.isCurrent ? ' is-equipped' : ''}`
      button.dataset.action = 'stage-select'
      button.dataset.stageIndex = String(stage.index)

      const textGroup = document.createElement('span')
      textGroup.className = 'hud-modal__content'

      const label = document.createElement('strong')
      label.textContent = stage.label

      const description = document.createElement('small')
      description.textContent = stage.description

      const meta = document.createElement('span')
      meta.className = 'hud-modal__weapon-meta'
      meta.textContent = stage.isCurrent ? '현재' : stage.isBoss ? '보스' : '시작'

      textGroup.append(label, description)
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
    count.textContent = `보유: ${item.count}`

    wrapper.append(name, description, count)
    return [wrapper]
  }

  private createEmptyText(message: string): HTMLParagraphElement {
    const paragraph = document.createElement('p')
    paragraph.className = 'hud-empty'
    paragraph.textContent = message
    return paragraph
  }

  private createHudIcon(iconKey: string | undefined, label: string): HTMLImageElement | null {
    const src = getHudIconSrc(iconKey)
    if (!src) {
      return null
    }

    const image = document.createElement('img')
    image.className = 'hud-icon'
    image.src = src
    image.alt = `${label} 아이콘`
    image.width = 32
    image.height = 32
    return image
  }
}
