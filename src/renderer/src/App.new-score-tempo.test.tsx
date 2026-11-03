// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { createImplicitTempoUnitFixture } from '../../testing/implicit-tempo-unit-fixture'
import { registerAppTestHooks } from './App.test-harness'

describe('new score tempo with the real playback hook', () => {
  registerAppTestHooks()
  beforeEach(() => {
    // The ordinary shell harness returns120; this boundary needs real conversion.
    vi.doUnmock('./playback/useScorePlayback')
  })

  it.each([
    { tempo: { bpm: 200, beatUnit: 'half' }, expected: 240 },
    { tempo: { bpm: 40, beatUnit: 'eighth' }, expected: 40 },
    { tempo: { bpm: 97, beatUnit: 'quarter', dots: 1 }, expected: 146 }
  ] as const)('studio.new-score-tempo normalizes $tempo only at the authoring boundary', async ({ tempo, expected }) => {
    window.history.replaceState({}, '', '/')
    const source = createImplicitTempoUnitFixture('global-implicit')
    source.tempo = tempo
    const original = structuredClone(source)
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/source.chromatics', fileName: 'source.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/saved.chromatics', fileName: 'saved.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(document.querySelector('.studio-document')).toHaveTextContent(source.title!))
    const menu = (label: string) => {
      fireEvent.click(screen.getByRole('button', { name: '파일' }))
      fireEvent.click(screen.getByRole('menuitem', { name: label }))
    }
    menu('새 악보 만들기')
    let dialog = within(screen.getByRole('dialog', { name: '새 악보 만들기' }))
    const bpm = dialog.getByRole('spinbutton', { name: '빠르기' })
    expect(bpm).toHaveValue(expected)
    expect(bpm).toBeValid()
    fireEvent.click(dialog.getByRole('button', { name: '취소' }))
    menu('프로젝트 저장')
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(original)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')

    menu('새 악보 만들기')
    dialog = within(screen.getByRole('dialog', { name: '새 악보 만들기' }))
    fireEvent.submit(dialog.getByRole('form', { name: '새 악보 만들기' }))
    menu('프로젝트 저장')
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    const created = JSON.parse(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
    expect(created.score.tempo).toMatchObject({ bpm: expected, beatUnit: 'quarter', dots: 0 })
    expect(source).toEqual(original)
  })
})
