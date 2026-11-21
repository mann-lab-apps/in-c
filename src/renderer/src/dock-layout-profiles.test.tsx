// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { decodeDockLayoutProfiles, dockLayoutProfilesKey as key, useDockLayoutProfiles, type DockLayout } from './dock-layout-profiles'
const layout: DockLayout = { widths: { palette: 207.5, properties: 360 }, visibility: { palette: true, properties: false }, activeDock: 'palette' }
const profile = () => ({ id: 'one', name: '한글 배치', layout: structuredClone(layout) })
beforeEach(() => {
  if (typeof window.localStorage?.clear !== 'function') {
    const memory=new Map<string,string>()
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,String(value)),clear:()=>memory.clear()}})
  }
  localStorage.clear()
}); afterEach(() => { cleanup(); vi.restoreAllMocks() })
it.each(['{', '{}', 'null', JSON.stringify({ version: 2, profiles: [] }), JSON.stringify({ version: 1, profiles: {} })])('rejects malformed data without touching storage: %s', raw => {
  localStorage.setItem(key, raw)
  const h = renderHook(useDockLayoutProfiles)
  expect(h.result.current.profiles).toEqual([]); expect(h.result.current.storageIssue).toContain('읽지 못했습니다')
  expect(localStorage.getItem(key)).toBe(raw)
})
it.each(['width', 'visibility', 'active', 'duplicate-id', 'duplicate-name', 'empty-name', 'long-name'])('rejects invalid fields and duplicates: %s', kind => {
  const first = profile(), next = { ...profile(), id: 'two', name: '다른 이름' }
  if (kind === 'width') first.layout.widths.palette = 199
  if (kind === 'visibility') (first.layout.visibility as unknown as Record<string, unknown>).palette = 'true'
  if (kind === 'active') (first.layout as unknown as Record<string, unknown>).activeDock = 'third'
  if (kind === 'duplicate-id') next.id = first.id
  if (kind === 'duplicate-name') next.name = first.name
  if (kind === 'empty-name') first.name = ' '
  if (kind === 'long-name') first.name = '가'.repeat(41)
  expect(() => decodeDockLayoutProfiles(JSON.stringify({ version: 1, profiles: [first, next] }))).toThrow()
})
it('keeps fractional widths, explicit snapshots, normalized names and independent copies across remount', () => {
  const h = renderHook(useDockLayoutProfiles)
  let id = ''
  act(() => { id = h.result.current.add('  한글\n배치  ', layout).id! })
  expect(h.result.current.profiles[0]).toEqual({ id, name: '한글 배치', layout })
  const changed = { ...layout, widths: { palette: 280, properties: 207 }, visibility: { palette: false, properties: false } }
  act(() => { expect(h.result.current.add('한글 배치', changed).error).toContain('같은 이름') })
  expect(h.result.current.profiles[0].layout).toEqual(layout)
  act(() => { expect(h.result.current.update(id, changed)).toBe(true) })
  changed.widths.palette = 360
  expect(h.result.current.profiles[0].layout.widths.palette).toBe(280)
  const saved = h.result.current.profiles
  h.unmount(); const reopen = renderHook(useDockLayoutProfiles)
  expect(reopen.result.current.profiles).toEqual(saved)
  act(() => { expect(reopen.result.current.remove(id)).toBe(true) })
  expect(decodeDockLayoutProfiles(localStorage.getItem(key))).toEqual([])
})
it('keeps the session list usable after storage write failure', () => {
  const h = renderHook(useDockLayoutProfiles), prototype = Object.getPrototypeOf(localStorage) === Storage.prototype ? Storage.prototype : localStorage
  vi.spyOn(prototype, 'setItem').mockImplementation(() => { throw Error('quota') })
  act(() => { expect(h.result.current.add('저장 실패', layout).id).toBeTruthy() })
  expect(h.result.current.storageIssue).toContain('현재 세션에서만')
  const id = h.result.current.profiles[0].id
  act(() => { expect(h.result.current.update(id, { ...layout, activeDock: 'properties' })).toBe(true) })
  expect(h.result.current.profiles[0].layout.activeDock).toBe('properties')
  act(() => { expect(h.result.current.remove(id)).toBe(true) })
  expect(h.result.current.profiles).toEqual([])
})
it('limits count without overwriting or truncating an existing entry', () => {
  const h = renderHook(useDockLayoutProfiles)
  for (let n = 0; n < 20; n++) act(() => { expect(h.result.current.add(`배치 ${n}`, layout).id).toBeTruthy() })
  const saved = localStorage.getItem(key)
  act(() => { expect(h.result.current.add('추가 배치', layout).error).toContain('20개') })
  expect(localStorage.getItem(key)).toBe(saved); expect(h.result.current.profiles).toHaveLength(20)
})
