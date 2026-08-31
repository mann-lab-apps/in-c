import type { PitchStep } from '../../../score-core'
import type { DurationValue } from '../../../score-core'
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

const durationByCode: Partial<Record<string, DurationValue>> = {
  Digit1: '64th',
  Digit2: '32nd',
  Digit3: '16th',
  Digit4: 'eighth',
  Digit5: 'quarter',
  Digit6: 'half',
  Digit7: 'whole',
  Numpad1: '64th',
  Numpad2: '32nd',
  Numpad3: '16th',
  Numpad4: 'eighth',
  Numpad5: 'quarter',
  Numpad6: 'half',
  Numpad7: 'whole'
}

export type PitchKeyboardAction = 'edit-selection' | 'enter-note'

export interface PitchShortcutEvent {
  altKey: boolean
  code: string
  ctrlKey: boolean
  isComposing: boolean
  key: string
  metaKey: boolean
  shiftKey?: boolean
}

export function isTextEditingTarget(target: EventTarget | null): boolean {
  let element = target as HTMLElement | null

  while (element) {
    const tagName = element.tagName?.toUpperCase()

    if (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      element.isContentEditable ||
      element.getAttribute?.('role') === 'textbox'
    ) {
      return true
    }

    element = element.parentElement
  }

  return false
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

export function resolveDurationShortcut(
  event: PitchShortcutEvent
): DurationValue | undefined {
  if (event.isComposing || event.key === 'Process' || hasCommandModifier(event)) {
    return undefined
  }

  return durationByCode[event.code] ?? durationByKey(event.key)
}

export function resolveDotShortcut(
  event: PitchShortcutEvent
): 1 | -1 | undefined {
  if (event.isComposing || event.key === 'Process' || hasCommandModifier(event)) {
    return undefined
  }

  if (event.code === 'Period' || event.key === '.') {
    return 1
  }

  if (event.code === 'Comma' || event.key === ',') {
    return -1
  }

  return undefined
}

export function isRestShortcut(event: PitchShortcutEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    !event.shiftKey &&
    (event.code === 'Digit0' ||
      event.code === 'Numpad0' ||
      event.key === '0' ||
      event.code === 'KeyR' ||
      event.key === 'r' ||
      event.key === 'R')
  )
}

export function isNoteInputToggleShortcut(event: PitchShortcutEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    !event.shiftKey &&
    event.code === 'KeyN'
  )
}

export function isTupletShortcut(event: PitchShortcutEvent): boolean {
  const usesCommandKey = event.metaKey || event.ctrlKey

  return (
    usesCommandKey &&
    !event.altKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    !event.shiftKey &&
    (event.code === 'Digit3' || event.code === 'Numpad3' || event.key === '3')
  )
}

export function isTieShortcut(event: PitchShortcutEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    (event.code === 'KeyT' || event.key === 't' || event.key === 'T')
  )
}

export function isSlurShortcut(event: PitchShortcutEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    event.code === 'KeyS'
  )
}

export function isUndoShortcut(event: PitchShortcutEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    !('shiftKey' in event && event.shiftKey) &&
    (event.code === 'KeyZ' || event.key.toLowerCase() === 'z')
  )
}

export function isRedoShortcut(
  event: PitchShortcutEvent & { shiftKey?: boolean }
): boolean {
  const usesCommandKey = event.metaKey || event.ctrlKey

  if (
    !usesCommandKey ||
    event.altKey ||
    event.isComposing ||
    event.key === 'Process'
  ) {
    return false
  }

  return (
    event.code === 'KeyY' ||
    event.key.toLowerCase() === 'y' ||
    (Boolean(event.shiftKey) &&
      (event.code === 'KeyZ' || event.key.toLowerCase() === 'z'))
  )
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

function hasCommandModifier(event: PitchShortcutEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey
}

function durationByKey(key: string): DurationValue | undefined {
  switch (key) {
    case '1':
      return '64th'
    case '2':
      return '32nd'
    case '3':
      return '16th'
    case '4':
      return 'eighth'
    case '5':
      return 'quarter'
    case '6':
      return 'half'
    case '7':
      return 'whole'
    default:
      return undefined
  }
}
