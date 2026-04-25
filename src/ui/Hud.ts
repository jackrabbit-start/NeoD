import type {
  HudCharacterStatView,
  HudModalState,
  HudOwnedWeaponView,
  HudStageSelectionState,
  HudStageView,
  HudState,
  WeaponStackKey,
} from '../domain/types.js'
import { getHudWeaponAssetPath } from '../game/visualManifest.js'
import { formatWeaponStarLabel } from '../systems/weaponOwnership.js'

export interface HudControllerHandlers {
  onInventoryToggle: () => void
  onInventoryClose: () => void
  onWeaponEquip: (weaponKey: WeaponStackKey) => void
  onStageSelectionToggle: () => void
  onStageSelectionClose: () => void
  onStageSelect: (stageIndex: number) => void
  onPassiveSelect: (passiveId: string) => void
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

const renderTitleEnemyOdds = (enemyOdds?: string[]) => {
  if (!enemyOdds || enemyOdds.length === 0) {
    return ''
  }

  const [phaseLabel = '현재', ...enemyRows] = enemyOdds
  return `
    <div class="hud-summary__enemy-odds" aria-label="현재 적 출현 확률">
      <span class="hud-summary__enemy-odds-label">적 출현 확률 · ${escapeHtml(phaseLabel)}</span>
      <div class="hud-summary__enemy-odds-chips">
        ${enemyRows.map((row) => `<span>${escapeHtml(row)}</span>`).join('')}
      </div>
    </div>
  `
}

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

  private readonly passiveModalLayer: HTMLDivElement

  private readonly resumeButton: HTMLButtonElement

  private readonly stageResumeButton: HTMLButtonElement

  private readonly stageList: HTMLDivElement

  private readonly passiveList: HTMLDivElement

  private readonly equippedWeaponList: HTMLDivElement

  private readonly weaponList: HTMLDivElement

  private readonly characterStatsList: HTMLDivElement

  private modalSignature = ''

  private summaryMarkup = ''

  private stageSignature = ''

  private passiveSignature = ''

  private renderMetrics: HudRenderMetrics = {
    summaryAssignments: 0,
    summarySkips: 0,
    modalClosedSkips: 0,
  }

  private handlers: HudControllerHandlers = {
    onInventoryToggle: () => undefined,
    onInventoryClose: () => undefined,
    onWeaponEquip: () => undefined,
    onStageSelectionToggle: () => undefined,
    onStageSelectionClose: () => undefined,
    onStageSelect: () => undefined,
    onPassiveSelect: () => undefined,
  }

  constructor(private readonly element: HTMLElement) {
    this.summaryElement = document.createElement('div')
    this.summaryElement.className = 'hud-summary'

    this.modalLayer = document.createElement('div')
    this.modalLayer.className = 'hud-modal-layer'
    this.modalLayer.innerHTML = `
      <div class="hud-modal__backdrop" data-action="inventory-close"></div>
      <div class="hud-modal__cluster hud-modal__cluster--inventory">
        <section class="hud-modal hud-modal--inventory-stats" role="dialog" aria-modal="true" aria-label="캐릭터 스탯">
          <header class="hud-modal__header hud-modal__header--compact">
            <div>
              <p class="hud-modal__eyebrow">현재 상태</p>
              <h2>캐릭터 스탯</h2>
              <p class="hud-modal__summary">현재 레벨과 장착 무기 기준 실시간 수치입니다.</p>
            </div>
          </header>
          <div class="hud-modal__stats" data-region="character-stats"></div>
        </section>
        <section class="hud-modal hud-modal--inventory-main" role="dialog" aria-modal="true" aria-label="인벤토리">
          <header class="hud-modal__header">
            <div>
              <p class="hud-modal__eyebrow">인벤토리 일시정지</p>
              <h2>무기 인벤토리</h2>
              <p class="hud-modal__summary">같은 무기·같은 별 3개는 자동으로 합쳐집니다.</p>
            </div>
            <button type="button" class="hud-button hud-button--secondary" data-action="inventory-close">런 재개</button>
          </header>
          <div class="hud-modal__grid hud-modal__grid--inventory">
            <section class="hud-modal__section hud-modal__section--equipped">
              <h3>현재 장착</h3>
              <div class="hud-modal__list" data-region="equipped-weapons"></div>
            </section>
            <section class="hud-modal__section hud-modal__section--owned">
              <h3>보유 아이템</h3>
              <p class="hud-modal__hint">장착할 무기만 고르세요. 스펙은 항목에 마우스를 올리면 보입니다.</p>
              <div class="hud-modal__list" data-region="weapons"></div>
            </section>
          </div>
        </section>
      </div>
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

    this.passiveModalLayer = document.createElement('div')
    this.passiveModalLayer.className = 'hud-modal-layer'
    this.passiveModalLayer.innerHTML = `
      <div class="hud-modal__backdrop"></div>
      <section class="hud-modal hud-modal--stage" role="dialog" aria-modal="true" aria-label="레벨업 패시브 선택">
        <header class="hud-modal__header">
          <div>
            <p class="hud-modal__eyebrow">LEVEL UP</p>
            <h2>패시브 카드를 선택하세요</h2>
          </div>
        </header>
        <div class="hud-modal__list hud-modal__list--stage" data-region="passives"></div>
      </section>
    `

    const resumeButton = this.modalLayer.querySelector<HTMLButtonElement>('button[data-action="inventory-close"]')
    const equippedWeaponList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="equipped-weapons"]')
    const weaponList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="weapons"]')
    const characterStatsList = this.modalLayer.querySelector<HTMLDivElement>('[data-region="character-stats"]')
    const stageResumeButton = this.stageModalLayer.querySelector<HTMLButtonElement>('button[data-action="stage-close"]')
    const stageList = this.stageModalLayer.querySelector<HTMLDivElement>('[data-region="stages"]')
    const passiveList =
      this.passiveModalLayer.querySelector<HTMLDivElement>('[data-region="passives"]') ??
      (() => {
        const fallback = document.createElement('div')
        fallback.className = 'hud-modal__list hud-modal__list--stage'
        fallback.dataset.region = 'passives'
        this.passiveModalLayer.append(fallback)
        return fallback
      })()

    if (
      !resumeButton ||
      !equippedWeaponList ||
      !weaponList ||
      !characterStatsList ||
      !stageResumeButton ||
      !stageList
    ) {
      throw new Error('안정적인 HUD 모달 경계를 초기화하지 못했습니다.')
    }

    this.resumeButton = resumeButton
    this.stageResumeButton = stageResumeButton
    this.stageList = stageList
    this.passiveList = passiveList
    this.equippedWeaponList = equippedWeaponList
    this.weaponList = weaponList
    this.characterStatsList = characterStatsList

    this.element.replaceChildren(this.summaryElement, this.modalLayer, this.stageModalLayer, this.passiveModalLayer)
    this.element.addEventListener('click', this.handleClick)
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
    this.updatePassiveSelection(state.passiveSelection ?? { isOpen: false, level: 1, choices: [] })
  }

  getRenderMetrics(): HudRenderMetrics {
    return { ...this.renderMetrics }
  }

  destroy(): void {
    this.element.removeEventListener('click', this.handleClick)
    this.summaryMarkup = ''
    this.modalSignature = ''
    this.stageSignature = ''
    this.passiveSignature = ''
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
      case 'weapon-equip': {
        const weaponKey = actionTarget.dataset.weaponKey
        if (weaponKey) {
          this.handlers.onWeaponEquip(weaponKey as WeaponStackKey)
        }
        break
      }
      case 'passive-select':
        if (actionTarget.dataset.passiveId) {
          this.handlers.onPassiveSelect(actionTarget.dataset.passiveId)
        }
        break
      default:
        break
    }
  }

  private renderSummary(state: HudState): void {
    const nextMarkup = `
      <div class="hud-summary__shell">
        <header class="hud-summary__hero">
          <div class="hud-summary__title-block">
            <h1>${escapeHtml(state.title)}</h1>
            <p>${escapeHtml(state.subtitle)}</p>
            ${renderTitleEnemyOdds(state.pachinko?.enemyOdds)}
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
          ${renderSummarySection('패시브', renderList(state.passives ?? []), 'hud-summary__section--stats')}
          ${state.pachinko ? renderSummarySection('파친코', renderList([
            `보상 레벨: Lv.${state.pachinko.level} · 누적 토큰 XP ${state.pachinko.totalTokenXp}`,
            `바닥 토큰: ${state.pachinko.droppedTokens}개 · 투입 중: ${state.pachinko.activeTokens}/${30}개 · 대기: ${state.pachinko.queuedTokens}개`,
            ...(state.pachinko.synergy ? [`시너지: ${state.pachinko.synergy}`] : []),
            `${state.pachinko.isTokenInFlight ? '파친코 토큰 다중 낙하 중' : '파친코 투입 대기 중'}`,
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
          ${renderSummarySection('자동 합성', renderList(state.recipes))}
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
    this.modalLayer.classList.toggle('is-open', modal.isOpen)
    this.resumeButton.disabled = !modal.isOpen

    if (!modal.isOpen) {
      if (this.modalSignature === 'closed') {
        this.renderMetrics.modalClosedSkips += 1
        return
      }

      this.modalSignature = 'closed'
      this.equippedWeaponList.replaceChildren()
      this.weaponList.replaceChildren()
      this.characterStatsList.replaceChildren()
      return
    }

    const nextSignature = JSON.stringify({
      isOpen: modal.isOpen,
      weapons: modal.weapons,
      characterStats: modal.characterStats,
    })
    if (nextSignature !== this.modalSignature) {
      this.modalSignature = nextSignature
      this.renderModalCollections(modal)
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

  private updatePassiveSelection(passiveSelection: HudState['passiveSelection']): void {
    this.passiveModalLayer.classList.toggle('is-open', passiveSelection.isOpen)

    if (!passiveSelection.isOpen) {
      this.passiveSignature = ''
      this.passiveList.replaceChildren()
      return
    }

    const nextSignature = JSON.stringify(passiveSelection)
    if (nextSignature !== this.passiveSignature) {
      this.passiveSignature = nextSignature
      this.passiveList.replaceChildren(...this.createPassiveButtons(passiveSelection.choices))
    }
  }

  private renderModalCollections(modal: HudModalState): void {
    this.equippedWeaponList.replaceChildren(...this.createEquippedWeaponRows(modal.weapons))
    this.weaponList.replaceChildren(...this.createOwnedWeaponRows(modal.weapons))
    this.characterStatsList.replaceChildren(...this.createCharacterStatRows(modal.characterStats))
  }

  private createCharacterStatRows(characterStats: HudCharacterStatView[]): HTMLElement[] {
    if (characterStats.length === 0) {
      return [this.createEmptyText('표시할 캐릭터 스탯이 없습니다.')]
    }

    return characterStats.map((stat) => {
      const row = document.createElement('div')
      row.className = 'hud-modal__stat-row'

      const label = document.createElement('span')
      label.className = 'hud-modal__stat-label'
      label.textContent = stat.label

      const value = document.createElement('strong')
      value.className = 'hud-modal__stat-value'
      value.textContent = stat.value

      row.append(label, value)
      return row
    })
  }

  private createEquippedWeaponRows(weapons: HudOwnedWeaponView[]): HTMLElement[] {
    const equippedWeapons = weapons.filter((weapon) => weapon.isEquipped)
    if (equippedWeapons.length === 0) {
      return [this.createEmptyText('현재 장착한 무기가 없습니다.')]
    }

    return equippedWeapons.map((weapon) => this.createWeaponRow(weapon, 'equipped'))
  }

  private createOwnedWeaponRows(weapons: HudOwnedWeaponView[]): HTMLElement[] {
    if (weapons.length === 0) {
      return [this.createEmptyText('아직 보유한 무기가 없습니다.')]
    }

    return weapons.map((weapon) => this.createWeaponRow(weapon, 'owned'))
  }

  private createWeaponRow(weapon: HudOwnedWeaponView, variant: 'equipped' | 'owned'): HTMLElement {
    const row = document.createElement('div')
    row.className = `hud-modal__item hud-modal__item--weapon hud-modal__item--${variant}${weapon.isEquipped ? ' is-equipped' : ''}`

    const textGroup = document.createElement('span')
    textGroup.className = 'hud-modal__content'
    const title = document.createElement('strong')
    const starText = formatWeaponStarLabel(weapon.star)
    const countText = weapon.count != null ? ` × ${weapon.count}` : ''
    title.textContent = `${weapon.name}${starText ? ` · ${starText}` : ''}${countText}`
    const description = document.createElement('small')
    description.textContent = weapon.levelUpgradeDescription
      ? `${weapon.description} · ${weapon.levelUpgradeDescription}`
      : weapon.description
    textGroup.append(title, description)

    const left = document.createElement('div')
    left.className = 'hud-modal__left'
    const icon = this.createHudIcon(weapon.hudIconKey, weapon.name)
    if (icon) {
      left.append(icon)
    }
    left.append(textGroup)

    const actions = document.createElement('span')
    actions.className = 'hud-modal__weapon-actions'

    const stats = this.createWeaponStats(weapon, variant)
    actions.append(stats)

    if (variant === 'owned') {
      const equipButton = document.createElement('button')
      equipButton.type = 'button'
      equipButton.className = 'hud-button hud-button--compact'
      equipButton.dataset.action = 'weapon-equip'
      if (weapon.stackKey) {
        equipButton.dataset.weaponKey = weapon.stackKey
      }
      equipButton.disabled = weapon.isEquipped || !weapon.stackKey
      equipButton.textContent = weapon.isEquipped ? '장착 중' : '장착'
      actions.append(equipButton)
    }

    row.append(left, actions)
    return row
  }

  private createWeaponStats(weapon: HudOwnedWeaponView, variant: 'equipped' | 'owned'): HTMLElement {
    const stats = document.createElement('small')
    stats.className = `hud-modal__weapon-meta hud-modal__weapon-stats hud-modal__weapon-stats--${variant}`
    const upgradeText = weapon.levelUpgradeLabel ? ` · ${weapon.levelUpgradeLabel}` : ''
    stats.textContent = `피해 ${weapon.damage} · 초당 ${Math.round(1000 / weapon.fireRateMs)}발 · 탄속 ${weapon.projectileSpeed}${upgradeText}`
    if (weapon.accentColor != null) {
      stats.style.color = `#${weapon.accentColor.toString(16).padStart(6, '0')}`
    }
    return stats
  }

  private createPassiveButtons(choices: HudState['passiveSelection']['choices']): HTMLElement[] {
    if (choices.length === 0) {
      return [this.createEmptyText('선택 가능한 패시브가 없습니다.')]
    }

    return choices.map((choice) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'hud-modal__item hud-modal__item--action'
      button.dataset.action = 'passive-select'
      button.dataset.passiveId = choice.id

      const textGroup = document.createElement('span')
      textGroup.className = 'hud-modal__content'

      const title = document.createElement('strong')
      title.textContent = choice.name

      const summary = document.createElement('small')
      summary.textContent = choice.effectSummary

      const description = document.createElement('small')
      description.textContent = choice.description

      textGroup.append(title, summary, description)
      button.append(textGroup)
      return button
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
