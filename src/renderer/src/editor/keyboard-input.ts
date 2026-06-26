import type { PitchStep } from '../../../score-core'
import type { EditorMode } from './editor-state'

const pitchByCode: Partial<Record<string, PitchStep>> = {
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  KeyE: 'E',
  KeyF: 'F',
  KeyG: 'G'
}

export type PitchKeyboardAction = 'edit-selection' | 'enter-note'

export interface PitchShortcutEvent {
  altKey: boolean
  code: string
  ctrlKey: boolean
  isComposing: boolean
  key: string
  metaKey: boolean
}

export function isTextEditingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  const tagName = element?.tagName?.toUpperCase()

  return Boolean(
    tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      element?.isContentEditable ||
      element?.getAttribute?.('role') === 'textbox'
  )
}

export function resolvePitchShortcut(
  event: PitchShortcutEvent
): PitchStep | undefined {
  if (
    event.isComposing ||
    event.key === 'Process' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return undefined
  }

  const physicalPitch = pitchByCode[event.code]

  if (physicalPitch) {
    return physicalPitch
  }

  const keyPitch = event.key.toUpperCase()

  return /^[A-G]$/.test(keyPitch) ? (keyPitch as PitchStep) : undefined
}

export function resolvePitchKeyboardAction(
  mode: EditorMode,
  hasSelectedPitchSlot: boolean
): PitchKeyboardAction | undefined {
  if (mode === 'note') {
    return 'enter-note'
  }

  if ((mode === 'select' || mode === 'rest') && hasSelectedPitchSlot) {
    return 'edit-selection'
  }

  return undefined
}
