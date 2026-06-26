import { describe, expect, it } from 'vitest'

import {
  isTextEditingTarget,
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
  overrides: Partial<Parameters<typeof resolvePitchShortcut>[0]>
): Parameters<typeof resolvePitchShortcut>[0] {
  return {
    altKey: false,
    code: '',
    ctrlKey: false,
    isComposing: false,
    key: '',
    metaKey: false,
    ...overrides
  }
}
