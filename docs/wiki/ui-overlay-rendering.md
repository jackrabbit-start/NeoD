# UI Overlay Rendering

This page records a shipped UI lifecycle rule for DOM-backed overlays in NeoD.

## Problem pattern

Phaser scenes may call UI controllers from the scene `update()` loop. If a DOM-backed overlay rewrites `innerHTML` on every call, browser-owned UI state can be lost even when the visual markup appears unchanged.

State at risk includes:

- scroll position
- focused element
- hover/selection affordances
- text selection
- any future DOM-owned control state

## Shipped example: Codex scroll

The Codex panel already had vertical overflow enabled, but scrolling still appeared broken because the controller recreated the Codex DOM every frame while it was open. The fix was to make `CodexController.update()` idempotent for identical open-state markup:

- compute the next Codex markup
- skip `innerHTML` assignment when it matches the last rendered markup
- clear the cache when the panel closes or is destroyed

Source artifacts:

- `.omx/context/codex-scroll-reset-20260425T102221Z.md`
- `.omx/plans/prd-codex-scroll-reset.md`
- `.omx/plans/test-spec-codex-scroll-reset.md`
- `.omx/context/post-interview-codex-scroll-reset-20260425T105023Z.md`
- PR #24: `Preserve Codex scroll during repeated renders`

## Rule

For DOM overlays under `src/ui/` that may be updated from a Phaser frame loop:

1. Treat repeated identical renders as no-ops at the DOM assignment boundary.
2. Do not rely on CSS overflow/focus styles to preserve state after replacing DOM content.
3. Reset caches explicitly on close/destroy so reopening can render fresh content.
4. Add deterministic tests for browser-owned state when possible before adding browser automation dependencies.

## Testing pattern

A lightweight fake element can model browser state loss by resetting `scrollTop` whenever `innerHTML` is assigned. The Codex regression test uses this pattern to prove that a second identical open update does not replace DOM content.

If a future overlay manages focus or selection, use the same approach: make the fake element expose the state that would be lost on content replacement, then assert identical updates preserve it.

## HUD summary render cache

The HUD summary follows the same rule as Codex because `ArenaScene.update()` may call `HudController.update()` every Phaser frame. The summary renderer caches the last generated markup and treats identical state as a no-op at the `innerHTML` boundary. This keeps the browser from doing repeated DOM replacement work while preserving the frame-loop call site for correctness.

Status, objective, and control hints are grouped into the status panel so the most volatile run feedback is readable without adding extra HUD sections or changing gameplay rules.
