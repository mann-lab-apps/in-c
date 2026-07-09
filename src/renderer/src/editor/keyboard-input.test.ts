import { describe, expect, it } from 'vitest'

import {
  isRedoShortcut,
  isRestShortcut,
  isTieShortcut,
  isTextEditingTarget,
  isTupletShortcut,
  isUndoShortcut,
  resolveDotShortcut,
  resolveDurationShortcut,
  resolvePitchKeyboardAction,
  resolvePitchShortcut
} from './keyboard-input'

describe('keyboard input routing', () => {
  it.each([
    ['KeyA', 'ㅁ', 'A'],
    ['KeyB', 'ㅠ', 'B'],
    ['KeyC', 'ㅊ', 'C'],
    ['KeyD', 'ㅇ', 'D'],
    ['KeyE', 'ㄷ', 'E'],
    ['KeyF', 'ㄹ', 'F'],
    ['KeyG', 'ㅎ', 'G']
  ])('maps physical %s to %s regardless of the active layout', (code, key, pitch) => {
    expect(resolvePitchShortcut(keyEvent({ code, key }))).toBe(pitch)
  })

  it('falls back to the logical key for environments without a code', () => {
    expect(resolvePitchShortcut(keyEvent({ code: '', key: 'c' }))).toBe('C')
  })

  it.each([
    ['Digit1', '!', 'whole'],
    ['Digit2', '@', 'half'],
    ['Digit3', '#', 'quarter'],
    ['Digit4', '$', 'eighth'],
    ['Digit5', '%', '16th']
  ])('maps physical %s to %s duration regardless of the logical key', (code, key, duration) => {
    expect(resolveDurationShortcut(keyEvent({ code, key }))).toBe(duration)
  })

  it('maps physical punctuation keys to dot edits', () => {
    expect(resolveDotShortcut(keyEvent({ code: 'Period', key: 'ㄹ' }))).toBe(1)
    expect(resolveDotShortcut(keyEvent({ code: 'Comma', key: ',' }))).toBe(-1)
  })

  it('maps physical command keys for rest, tuplet, tie, undo, and redo', () => {
    expect(isRestShortcut(keyEvent({ code: 'KeyR', key: 'ㄱ' }))).toBe(true)
    expect(isTupletShortcut(keyEvent({ code: 'KeyT', key: 'ㅅ' }))).toBe(true)
    expect(isTieShortcut(keyEvent({ code: 'KeyL', key: 'ㅣ' }))).toBe(true)
    expect(
      isUndoShortcut(keyEvent({ code: 'KeyZ', key: 'ㅋ', metaKey: true }))
    ).toBe(true)
    expect(
      isRedoShortcut(keyEvent({ code: 'KeyY', key: 'ㅛ', ctrlKey: true }))
    ).toBe(true)
    expect(
      isRedoShortcut(
        keyEvent({ code: 'KeyZ', key: 'ㅋ', metaKey: true, shiftKey: true })
      )
    ).toBe(true)
  })

  it('does not capture pitch shortcuts during composition or command chords', () => {
    expect(
      resolvePitchShortcut(
        keyEvent({ code: 'KeyA', key: 'ㅁ', isComposing: true })
      )
    ).toBeUndefined()
    expect(
      resolvePitchShortcut(keyEvent({ code: 'KeyA', key: 'Process' }))
    ).toBeUndefined()
    expect(
      resolvePitchShortcut(keyEvent({ code: 'KeyA', key: 'a', ctrlKey: true }))
    ).toBeUndefined()
    expect(
      resolveDurationShortcut(
        keyEvent({ code: 'Digit3', key: '3', isComposing: true })
      )
    ).toBeUndefined()
    expect(
      resolveDotShortcut(keyEvent({ code: 'Period', key: '.', metaKey: true }))
    ).toBeUndefined()
    expect(
      isRestShortcut(keyEvent({ code: 'KeyR', key: 'ㄱ', isComposing: true }))
    ).toBe(false)
  })

  it('separates sequential input from selected slot editing by mode', () => {
    expect(resolvePitchKeyboardAction('note', true)).toBe('enter-note')
    expect(resolvePitchKeyboardAction('note', false)).toBe('enter-note')
    expect(resolvePitchKeyboardAction('select', true)).toBe('edit-selection')
    expect(resolvePitchKeyboardAction('select', false)).toBeUndefined()
    expect(resolvePitchKeyboardAction('rest', true)).toBe('edit-selection')
    expect(resolvePitchKeyboardAction('rest', false)).toBeUndefined()
  })

  it('recognizes text editing targets', () => {
    expect(isTextEditingTarget({ tagName: 'INPUT' } as HTMLElement)).toBe(true)
    expect(isTextEditingTarget({ tagName: 'textarea' } as HTMLElement)).toBe(true)
    expect(
      isTextEditingTarget({ tagName: 'DIV', isContentEditable: true } as HTMLElement)
    ).toBe(true)
    expect(
      isTextEditingTarget({
        tagName: 'DIV',
        getAttribute: (name: string) => (name === 'role' ? 'textbox' : null)
      } as unknown as HTMLElement)
    ).toBe(true)
    expect(isTextEditingTarget({ tagName: 'BUTTON' } as HTMLElement)).toBe(false)
  })
})

function keyEvent(
  overrides: Partial<Parameters<typeof isRedoShortcut>[0]>
): Parameters<typeof isRedoShortcut>[0] {
  return {
    altKey: false,
    code: '',
    ctrlKey: false,
    isComposing: false,
    key: '',
    metaKey: false,
    shiftKey: false,
    ...overrides
  }
}
