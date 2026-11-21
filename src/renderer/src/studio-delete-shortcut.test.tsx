// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { ariaEditShortcut, describeEditShortcut, editShortcutActions, matchesEditShortcut, readEditShortcutOverrides, validateEditShortcut } from './studio-shortcut-bindings'
const chord = { code: 'KeyD', command: true, shift: true, alt: false } as const
const event = { key: 'Delete', code: 'Delete', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false }

it('exposes the existing deletion action and keeps its default aliases/modifier behavior', () => {
  expect(editShortcutActions.map(action => action.id)).toContain('delete')
  expect(describeEditShortcut({}, 'delete')).toBe('Delete / Backspace')
  expect(ariaEditShortcut({}, 'delete')).toBe('Delete Backspace')
  for (const key of ['Delete', 'Backspace']) for (const ctrlKey of [false, true]) for (const altKey of [false, true]) for (const shiftKey of [false, true]) {
    expect(matchesEditShortcut({}, 'delete', { ...event, key, ctrlKey, altKey, shiftKey })).toBe(true)
  }
})
it('rebinds and disables both old aliases without changing the other five commands', () => {
  const custom = { delete: chord }
  for (const key of ['Delete', 'Backspace']) {
    expect(matchesEditShortcut(custom, 'delete', { ...event, key })).toBe(false)
    expect(matchesEditShortcut({ delete: null }, 'delete', { ...event, key })).toBe(false)
  }
  expect(matchesEditShortcut(custom, 'delete', { ...event, code: 'KeyD', key: 'ㅇ', ctrlKey: true, shiftKey: true })).toBe(true)
  for (const extra of [{ isComposing: true }, { keyCode: 229 }, { key: 'Process' }, { defaultPrevented: true }]) expect(matchesEditShortcut({}, 'delete', { ...event, ...extra })).toBe(false)
  const legacy = JSON.stringify({ version: 1, overrides: { undo: chord } })
  expect(readEditShortcutOverrides(legacy)).toEqual({ overrides: { undo: chord } })
  expect(readEditShortcutOverrides(JSON.stringify({ version: 1, overrides: custom }))).toEqual({ overrides: custom })
  expect(validateEditShortcut({}, 'delete', { ...chord, code: 'KeyC' })).toContain('복사')
  expect(validateEditShortcut({}, 'delete', { ...chord, code: 'KeyS' })).toContain('예약')
})
