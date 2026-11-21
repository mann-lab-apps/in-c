// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { isRedoShortcut, isUndoShortcut } from './editor/keyboard-input'
import { ariaEditShortcut, describeEditShortcut, editShortcutActions, editShortcutStorageKey, matchesEditShortcut, readEditShortcutOverrides, useEditShortcutBindings, validateEditShortcut } from './studio-shortcut-bindings'
const chord = { code: 'KeyD', command: true, alt: false, shift: true } as const
const event = (code = 'KeyD', key = 'd', shiftKey = true) => ({ code, key, shiftKey, ctrlKey: true, metaKey: false, altKey: false, isComposing: false })
beforeEach(() => {
  if (typeof window.localStorage?.removeItem !== 'function') {
    const memory = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, String(value)) }, removeItem: (key: string) => { memory.delete(key) } } })
  }
  localStorage.removeItem(editShortcutStorageKey)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.removeItem(editShortcutStorageKey) })
it('preserves the existing physical/logical default matrix and Shift aliases for both platforms', () => {
  for (const code of ['KeyX', 'KeyC', 'KeyV', 'KeyY', 'KeyZ', 'KeyD', 'Unidentified']) {
    for (const key of ['x', 'C', 'v', 'y', 'Z', 'ㄱ']) for (const shift of [false, true]) for (const mac of [false, true]) {
      const keyEvent = { ...event(code, key, shift), ctrlKey: !mac, metaKey: mac }
      expect(matchesEditShortcut({}, 'undo', keyEvent)).toBe(isUndoShortcut(keyEvent))
      expect(matchesEditShortcut({}, 'redo', keyEvent)).toBe(isRedoShortcut(keyEvent))
      for (const action of ['cut', 'copy', 'paste'] as const) expect(matchesEditShortcut({}, action, keyEvent)).toBe((action !== 'cut' || !shift) && code === { cut: 'KeyX', copy: 'KeyC', paste: 'KeyV' }[action])
    }
  }
})
it('uses physical custom keys, drops old aliases, and rejects composition/consumed events', () => {
  expect(matchesEditShortcut({ undo: chord }, 'undo', event('KeyD', 'ㅇ'))).toBe(true)
  expect(matchesEditShortcut({ undo: chord }, 'undo', event('KeyZ', 'z', false))).toBe(false)
  expect(matchesEditShortcut({ undo: null }, 'undo', event('KeyZ', 'z', false))).toBe(false)
  for (const extra of [{ defaultPrevented: true }, { isComposing: true }, { key: 'Process' }, { keyCode: 229 }, { altKey: true }, { shiftKey: false }, { ctrlKey: false }]) expect(matchesEditShortcut({ undo: chord }, 'undo', { ...event(), ...extra })).toBe(false)
})
it('detects existing Shift aliases, fixed commands, and conflicts on restoring defaults', () => {
  expect(validateEditShortcut({}, 'undo', { ...chord, code: 'KeyC' })).toContain('복사')
  expect(validateEditShortcut({}, 'undo', { ...chord, code: 'KeyY' })).toContain('다시 실행')
  expect(validateEditShortcut({}, 'undo', { ...chord, code: 'KeyS' })).toContain('예약')
  expect(validateEditShortcut({ copy: null }, 'undo', { ...chord, code: 'KeyC' })).toBeUndefined()
  expect(validateEditShortcut({ copy: null, undo: { ...chord, code: 'KeyC' } }, 'copy', undefined)).toContain('실행 취소')
})
it.each([
  '{', JSON.stringify({ version: 2, overrides: {} }), JSON.stringify({ version: 1, overrides: [] }),
  JSON.stringify({ version: 1, overrides: { unknown: chord } }), JSON.stringify({ version: 1, overrides: { undo: { ...chord, code: 'KeyS' } } }),
  JSON.stringify({ version: 1, overrides: { undo: chord, copy: chord } }), JSON.stringify({ version: 1, overrides: { undo: { ...chord, shift: false } } }),
  JSON.stringify({ version: 1, overrides: { undo: { ...chord, extra: true } } }), ' '.repeat(4097)
])('falls back safely without changing malformed storage: %s', raw => {
  localStorage.setItem(editShortcutStorageKey, raw)
  const result = readEditShortcutOverrides(raw)
  expect(result.overrides).toEqual({}); expect(result.issue).toContain('기본 키')
  const { result: hook } = renderHook(useEditShortcutBindings)
  expect(hook.current.overrides).toEqual({}); expect(localStorage.getItem(editShortcutStorageKey)).toBe(raw)
})
it('persists/reloads and resets a real mapping without any score model', () => {
  const hook = renderHook(useEditShortcutBindings)
  act(() => { expect(hook.result.current.set('undo', chord)).toBeUndefined() })
  hook.unmount()
  const reloaded = renderHook(useEditShortcutBindings)
  expect(reloaded.result.current.matches('undo', event())).toBe(true)
  expect(describeEditShortcut(reloaded.result.current.overrides, 'undo')).toBe('⌘/Ctrl+Shift+D')
  expect(ariaEditShortcut(reloaded.result.current.overrides, 'undo')).toBe('Meta+Shift+D Control+Shift+D')
  act(() => { reloaded.result.current.set('undo', null) })
  expect(ariaEditShortcut(reloaded.result.current.overrides, 'undo')).toBeUndefined()
  act(() => { reloaded.result.current.set('undo', undefined) })
  expect(readEditShortcutOverrides(localStorage.getItem(editShortcutStorageKey)).overrides).toEqual({})
  expect(editShortcutActions.map(action => action.id)).toEqual(['undo', 'redo', 'cut', 'copy', 'paste', 'delete'])
})
it('keeps a chosen key for this window if storage fails and reports the limitation', () => {
  const hook = renderHook(useEditShortcutBindings)
  vi.spyOn(Object.getPrototypeOf(localStorage) === Storage.prototype ? Storage.prototype : localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
  act(() => { hook.result.current.set('undo', chord) })
  expect(hook.result.current.matches('undo', event())).toBe(true)
  expect(hook.result.current.issue).toContain('이 창에서만')
  expect(localStorage.getItem(editShortcutStorageKey)).toBeNull()
})
