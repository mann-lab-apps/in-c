import { useCallback, useRef, useState } from 'react'
import { isRedoShortcut, isUndoShortcut } from './editor/keyboard-input'

export const editShortcutActions = [
  { id: 'undo', label: '실행 취소' }, { id: 'redo', label: '다시 실행' },
  { id: 'cut', label: '잘라내기' }, { id: 'copy', label: '복사' }, { id: 'paste', label: '붙여넣기' },
  { id: 'delete', label: '삭제' }
] as const
export type EditShortcutAction = typeof editShortcutActions[number]['id']
export interface EditShortcutChord { code: string; command: true; shift: true; alt: false }
export type EditShortcutOverrides = Partial<Record<EditShortcutAction, EditShortcutChord | null>>
export const editShortcutStorageKey = 'studio.edit-shortcuts.v1'
type KeyEvent = Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'> & Partial<Pick<KeyboardEvent, 'keyCode' | 'defaultPrevented'>>
const defaultLabels = { undo: '⌘/Ctrl+Z', redo: '⌘/Ctrl+Shift+Z 또는 ⌘/Ctrl+Y', cut: '⌘/Ctrl+X', copy: '⌘/Ctrl+C', paste: '⌘/Ctrl+V', delete: 'Delete / Backspace' }
const reserved = new Set(['KeyS', 'KeyN', 'KeyO', 'KeyQ', 'KeyW', 'KeyH', 'KeyM', 'KeyP', 'KeyR', 'KeyT', 'KeyL', 'KeyF'])
const hasOwn = (value: EditShortcutOverrides, action: EditShortcutAction) => Object.prototype.hasOwnProperty.call(value, action)
export function matchesEditShortcut(overrides: EditShortcutOverrides, action: EditShortcutAction, event: KeyEvent): boolean {
  if (event.defaultPrevented || event.isComposing || event.key === 'Process' || event.keyCode === 229) return false
  if (hasOwn(overrides, action)) {
    const chord = overrides[action]
    return Boolean(chord && (event.ctrlKey || event.metaKey) && !event.altKey && event.shiftKey && event.code === chord.code)
  }
  if (action === 'undo') return isUndoShortcut(event)
  if (action === 'redo') return isRedoShortcut(event)
  // Keep the legacy selected-object command, including its modifier handling.
  // Text, Select, lyrics and span ownership remain with the caller.
  if (action === 'delete') return event.key === 'Delete' || event.key === 'Backspace'
  return Boolean((event.ctrlKey || event.metaKey) && !event.altKey && (action !== 'cut' || !event.shiftKey) && event.code === { cut: 'KeyX', copy: 'KeyC', paste: 'KeyV' }[action])
}
export function describeEditShortcut(overrides: EditShortcutOverrides, action: EditShortcutAction): string {
  if (!hasOwn(overrides, action)) return defaultLabels[action]
  return overrides[action] ? `⌘/Ctrl+Shift+${overrides[action]!.code.slice(3)}` : '할당 없음'
}
export function ariaEditShortcut(overrides: EditShortcutOverrides, action: EditShortcutAction): string | undefined {
  if (hasOwn(overrides, action)) return overrides[action] ? `Meta+Shift+${overrides[action]!.code.slice(3)} Control+Shift+${overrides[action]!.code.slice(3)}` : undefined
  if (action === 'delete') return 'Delete Backspace'
  const keys = action === 'redo' ? ['Shift+Z', 'Y', 'Shift+Y'] : action === 'copy' ? ['C', 'Shift+C'] : action === 'paste' ? ['V', 'Shift+V'] : [action === 'undo' ? 'Z' : 'X']
  return keys.flatMap(key => [`Meta+${key}`, `Control+${key}`]).join(' ')
}
export function validateEditShortcut(overrides: EditShortcutOverrides, action: EditShortcutAction, chord: EditShortcutChord | null | undefined): string | undefined {
  if (chord === null) return
  const candidate = chord === undefined ? {} : { [action]: chord }
  if (chord && (chord.command !== true || chord.shift !== true || chord.alt !== false || !/^Key[A-Z]$/.test(chord.code))) return '새 단축키는 ⌘/Ctrl+Shift와 영문 글쇠를 함께 눌러 지정하세요.'
  if (chord && reserved.has(chord.code)) return '저장·파일·창·운영체제에 예약된 단축키입니다. 다른 글쇠를 선택하세요.'
  // Enumerate physical and logical keys separately: legacy Undo/Redo also
  // recognize logical z/y, while C/V/Y intentionally retain Shift aliases.
  for (const code of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') for (const shiftKey of [false, true]) {
    const event = { code: `Key${code}`, key: code.toLowerCase(), ctrlKey: true, metaKey: false, altKey: false, shiftKey, isComposing: false }
    if (!matchesEditShortcut(candidate, action, event)) continue
    const other = editShortcutActions.find(other => other.id !== action && matchesEditShortcut(overrides, other.id, event))
    if (other) return `‘${other.label}’에 이미 할당된 단축키입니다. 해당 명령의 키를 먼저 변경하거나 해제하세요.`
  }
}
export function readEditShortcutOverrides(raw: string | null): { overrides: EditShortcutOverrides; issue?: string } {
  if (raw === null) return { overrides: {} }
  try {
    if (raw.length > 4096) throw Error('size')
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !parsed.overrides || typeof parsed.overrides !== 'object' || Array.isArray(parsed.overrides) || Object.keys(parsed).some(key => !['version', 'overrides'].includes(key))) throw Error('shape')
    const overrides: EditShortcutOverrides = {}
    for (const [key, value] of Object.entries(parsed.overrides)) {
      if (!editShortcutActions.some(action => action.id === key)) throw Error('action')
      if (value !== null && (!value || typeof value !== 'object' || Object.keys(value).sort().join(',') !== 'alt,code,command,shift')) throw Error('chord')
      overrides[key as EditShortcutAction] = value as EditShortcutChord | null
    }
    for (const action of editShortcutActions) if (hasOwn(overrides, action.id) && validateEditShortcut(overrides, action.id, overrides[action.id])) throw Error('conflict')
    return { overrides }
  } catch { return { overrides: {}, issue: '저장된 단축키 설정을 읽을 수 없어 기본 키를 사용합니다. 설정을 적용하거나 기본값을 복원하면 다시 저장합니다.' } }
}
export function useEditShortcutBindings() {
  const [state, setState] = useState(() => {
    try { return readEditShortcutOverrides(localStorage.getItem(editShortcutStorageKey)) }
    catch { return { overrides: {} as EditShortcutOverrides, issue: '단축키 설정을 읽지 못했습니다. 이 창에서는 기본 키를 사용합니다.' } }
  })
  const current = useRef(state.overrides); current.current = state.overrides
  const set = useCallback((action: EditShortcutAction, chord: EditShortcutChord | null | undefined): string | undefined => {
    const error = validateEditShortcut(current.current, action, chord)
    if (error) return error
    const overrides = { ...current.current }
    if (chord === undefined) delete overrides[action]; else overrides[action] = chord
    let issue: string | undefined
    try { localStorage.setItem(editShortcutStorageKey, JSON.stringify({ version: 1, overrides })) }
    catch { issue = '단축키 설정을 저장하지 못했습니다. 이 창에서만 적용되며 다시 열면 유지되지 않을 수 있습니다.' }
    current.current = overrides; setState({ overrides, issue })
  }, [])
  const matches = useCallback((action: EditShortcutAction, event: KeyEvent) => matchesEditShortcut(state.overrides, action, event), [state.overrides])
  return { ...state, set, matches }
}
