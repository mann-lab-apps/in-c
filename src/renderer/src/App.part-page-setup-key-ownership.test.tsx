// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
import { createNativePartIdFixture } from '../../testing/native-part-id-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'

describe('part page-setup preference key ownership', () => {
  registerAppTestHooks()
  const fileTools = () => within(document.querySelector<HTMLElement>('section[aria-label="파일 및 선택 도구"]')!)
  const pageSetup = () => within(document.querySelector<HTMLElement>('section[aria-label="PDF 페이지 설정"]')!)
  async function load(id: string, stored = false, partView = false, ids?: string[]) {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const project = createNativeProject(createNativePartIdFixture(ids ?? [id]))
    if (stored) project.partLayouts = [{ partId: id, layout: { pageSetup: { pageMarginMm: 17, staffSizePercent: 95 } } }]
    if (stored || partView) project.view = { mode: 'part', partId: id }
    const contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/owned/key-source.chromatics', fileName: 'key-source.chromatics', contents })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/owned/key-saved.chromatics', fileName: 'key-saved.chromatics' })
    const { App } = await import('./App')
    render(<App />); openStudioWorkspace('파일')
    fireEvent.click(fileTools().getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('key-source.chromatics을 열었습니다.'))
    return decodeNativeProject(contents)
  }
  async function save(count: number) {
    openStudioWorkspace('파일')
    fireEvent.click(fileTools().getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(count))
    await waitFor(() => expect(fileTools().getByRole('button', { name: '프로젝트 저장' })).toBeEnabled())
    return decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[count - 1]![0].contents)
  }
  it.each([
    ['P1', false], ['constructor', false], ['toString', false], ['__proto__', false],
    ['constructor', true], ['toString', true], ['__proto__', true]
  ] as const)('preserves Native %s with stored page setup=%s without inherited preferences', async (id, stored) => {
    const original = await load(id, stored)
    expect(await save(1)).toEqual(original)
  })
  it('keeps a stored __proto__ setup separate from neighboring constructor and ordinary parts', async () => {
    const original = await load('__proto__', true, false, ['__proto__', 'P2', 'constructor'])
    expect(await save(1)).toEqual(original)
  })
  it('keeps __proto__ page edits, reset and undo/redo as owned preferences', async () => {
    const original = await load('__proto__', false, true)
    openStudioWorkspace('내보내기')
    expect(pageSetup().getByRole('button', { name: '파트보 조판 초기화' })).toBeDisabled()
    fireEvent.change(pageSetup().getByLabelText('PDF 여백 mm'), { target: { value: '17' } })
    fireEvent.blur(pageSetup().getByLabelText('PDF 여백 mm'))
    const edited = await save(1)
    expect(edited.score).toEqual(original.score)
    expect(edited.partLayouts).toHaveLength(1)
    expect(edited.partLayouts[0]).toMatchObject({ partId: '__proto__', layout: { pageSetup: { pageMarginMm: 17 } } })
    openStudioWorkspace('내보내기')
    fireEvent.click(pageSetup().getByRole('button', { name: '파트보 조판 초기화' }))
    expect(pageSetup().getByRole('button', { name: '파트보 조판 초기화' })).toBeDisabled()
    const inherited = await save(2)
    expect(inherited).toEqual(original)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(await save(3)).toEqual(edited)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(await save(4)).toEqual(original)
  })
})
