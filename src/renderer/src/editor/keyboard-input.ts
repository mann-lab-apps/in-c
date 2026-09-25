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
  Digit5: '16th',
  Digit6: '32nd',
  Digit7: '64th',
  Numpad1: 'whole',
  Numpad2: 'half',
  Numpad3: 'quarter',
  Numpad4: 'eighth',
  Numpad5: '16th',
  Numpad6: '32nd',
  Numpad7: '64th'
}

const accidentalByCode: Partial<Record<string, -1 | 0 | 1>> = {
  Digit0: 0,
  Equal: 1,
  Minus: -1,
  Numpad0: 0,
  NumpadAdd: 1,
  NumpadSubtract: -1
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

export interface ChordIntervalShortcut {
  direction: -1 | 1
  interval: number
}

export function resolveChordIntervalShortcut(
  event: PitchShortcutEvent
): ChordIntervalShortcut | undefined {
  if (
    event.isComposing ||
    event.key === 'Process' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return undefined
  }

  const interval = intervalByCode(event.code) ?? intervalByKey(event.key)

  if (!interval || interval < 2 || interval > 9) {
    return undefined
  }

  return {
    direction: event.shiftKey ? -1 : 1,
    interval
  }
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

export function resolveAccidentalShortcut(
  event: PitchShortcutEvent
): -1 | 0 | 1 | undefined {
  if (
    event.isComposing ||
    event.key === 'Process' ||
    !event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return undefined
  }

  const physicalAccidental = accidentalByCode[event.code]

  if (physicalAccidental !== undefined) {
    return physicalAccidental
  }

  if (event.key === '-' || event.key === '_') {
    return -1
  }

  if (event.key === '0') {
    return 0
  }

  if (event.key === '=' || event.key === '+') {
    return 1
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
      return 'whole'
    case '2':
      return 'half'
    case '3':
      return 'quarter'
    case '4':
      return 'eighth'
    case '5':
      return '16th'
    case '6':
      return '32nd'
    case '7':
      return '64th'
    default:
      return undefined
  }
}

function intervalByCode(code: string): number | undefined {
  const match = /^(?:Digit|Numpad)([2-9])$/.exec(code)
  return match ? Number(match[1]) : undefined
}

function intervalByKey(key: string): number | undefined {
  return /^[2-9]$/.test(key) ? Number(key) : undefined
}
