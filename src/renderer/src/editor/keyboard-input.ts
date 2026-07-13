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
  Digit1: 'whole',
  Digit2: 'half',
  Digit3: 'quarter',
  Digit4: 'eighth',
  Digit5: '16th'
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
    (event.code === 'KeyR' || event.key === 'r' || event.key === 'R')
  )
}

export function isTupletShortcut(event: PitchShortcutEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    event.code === 'KeyT'
  )
}

export function isTieShortcut(event: PitchShortcutEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing &&
    event.key !== 'Process' &&
    event.code === 'KeyL'
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
      return 'whole'
    case '2':
      return 'half'
    case '3':
      return 'quarter'
    case '4':
      return 'eighth'
    case '5':
      return '16th'
    default:
      return undefined
  }
}
