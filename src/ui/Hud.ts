import type { HudState } from '../domain/types.js'

const renderList = (items: string[]) =>
  items.length > 0
    ? `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '<p>—</p>'

export class HudController {
  constructor(private readonly element: HTMLElement) {}

  update(state: HudState): void {
    this.element.innerHTML = `
      <h1>${state.title}</h1>
      <p>${state.subtitle}</p>
      <h2>Status</h2>
      <p>${state.status}</p>
      <h2>Stats</h2>
      ${renderList(state.stats)}
      <h2>Inventory</h2>
      ${renderList(state.inventory)}
      <h2>Available combines</h2>
      ${renderList(state.recipes)}
      <h2>Objective</h2>
      <p>${state.objective}</p>
      <h2>Controls</h2>
      <p class="hud-tip">${state.tip}</p>
    `
  }

  destroy(): void {
    this.element.innerHTML = ''
  }
}
