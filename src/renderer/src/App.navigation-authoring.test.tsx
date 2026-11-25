// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createScore, createStaff, createVoice, type Score } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openNotationSettings, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
import { createPlaybackTimeline } from './playback/timeline'

registerAppTestHooks()

function fixture(aligned = true) {
  return createScore({ title: '반복 이동의 원본', parts: ['primary', 'secondary'].map((id, partIndex) => createPart({
    id, name: id, staves: [createStaff({ id: `${id}-staff`, measures:
      Array.from({ length: 6 }, (_, index) => createMeasure({
        id: `${id}-bar-${index+1}`, number: index+1,
        timeSignature: { beats: !aligned && partIndex === 1 && index === 2 ? 3 : 4, beatType: 4 },
        voices: [createVoice({ events: [createNote({
          id: `${id}-note-${index+1}`, pitch: { step: 'C', octave: partIndex+4 },
          duration: !aligned && partIndex === 1 && index === 2
            ? { value: 'half', dots: 1 } : { value: 'whole', dots: 0 }
        })] })]
      }))
    })]
  })) })
}

async function openScore(score: Score) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    contents: encodeNativeProject(createNativeProject(score)),
    fileName: 'navigation.chromatics', filePath: '/fixture/navigation.chromatics'
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
}

function openEditor(bar: number) {
  fireEvent.click(screen.getByRole('button', { name: `primary-note-${bar} 선택` }))
  openNotationSettings('repeat')
  const region = within(screen.getByRole('region', { name: '반복과 볼타' }))
  fireEvent.click(region.getByText('반복 이동', { selector: 'summary' }))
  return within(region.getByRole('group', { name: '이동 표지 편집' }))
}

function select(scope: ReturnType<typeof within>, field: string, option: string | RegExp) {
  fireEvent.click(scope.getByRole('combobox', { name: field }))
  fireEvent.click(within(screen.getByRole('listbox', { name: field })).getByRole('option', { name: option }))
}

it('authors a D.S. al Fine route, edits and removes its marker with exact undo and Native save', async () => {
  const original = fixture()
  await openScore(original)
  const segno = openEditor(2)
  select(segno, '이동 표지 종류', '세뇨')
  fireEvent.click(segno.getByRole('button', { name: '이동 표지 적용' }))
  const fine = openEditor(4)
  select(fine, '이동 표지 종류', 'Fine')
  fireEvent.click(fine.getByRole('button', { name: '이동 표지 적용' }))
  const ds = openEditor(6)
  select(ds, '이동 표지 종류', 'D.S.')
  fireEvent.change(ds.getByRole('textbox', { name: '악보 문구' }), { target: { value: 'D.S. al Fine' } })
  fireEvent.click(ds.getByRole('button', { name: '이동 표지 적용' }))
  const authored = structuredClone(playbackMockState.lastScore!)
  expect(authored.parts[0].staves[0].measures[1].navigation).toEqual([{ type: 'segno', label: 'segno', symbol: true }])
  expect(authored.parts[0].staves[0].measures[5].navigation).toEqual([{ type: 'dalsegno', label: 'segno', display: { words: 'D.S. al Fine' } }])
  expect(authored.parts[1]).toEqual(original.parts[1])
  expect(createPlaybackTimeline(authored).totalBeats).toBe(36)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(authored)

  const marker = openEditor(2)
  select(marker, '편집할 이동 표지', /세뇨/)
  fireEvent.click(marker.getByRole('button', { name: '이동 표지 삭제' }))
  expect(marker.getByText(/돌아갈 세뇨가 없거나/)).toBeVisible()
  expect(createPlaybackTimeline(playbackMockState.lastScore!).totalBeats).toBe(24)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(authored)
  expect(playbackMockState.play).not.toHaveBeenCalled()
})

it('edits the original staff of an imported jump without losing its pass restriction or repeat data', async () => {
  const source = fixture()
  const [upper, lower] = source.parts.map(part => part.staves[0])
  upper.measures[1].repeat = { start: true }
  upper.measures[2].repeat = { end: true, times: 2, afterJump: false }
  upper.measures[1].navigation = [{ type: 'segno', label: 'return', symbol: true }]
  lower.measures[2].navigation = [{ type: 'dalsegno', label: 'return', passes: [2], display: { words: 'D.S.' } }]
  await openScore(source)
  const editor = openEditor(3)
  select(editor, '편집할 이동 표지', /D\.S\..*secondary/)
  fireEvent.change(editor.getByRole('textbox', { name: '악보 문구' }), { target: { value: 'D.S. subito' } })
  fireEvent.click(editor.getByRole('button', { name: '이동 표지 적용' }))
  const actual = playbackMockState.lastScore!
  expect(actual.parts[0]).toEqual(source.parts[0])
  expect(actual.parts[1].staves[0].measures[2].navigation).toEqual([
    { type: 'dalsegno', label: 'return', passes: [2], display: { words: 'D.S. subito' } }
  ])
  expect(createPlaybackTimeline(actual)).toEqual(createPlaybackTimeline(source))
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
})

it('disables insertion into unaligned staffs without altering their original notes', async () => {
  const source = fixture(false)
  await openScore(source)
  const editor = openEditor(3)
  expect(editor.getByText(/보표의 마디 길이.*일치/)).toBeVisible()
  expect(editor.getByRole('button', { name: '이동 표지 적용' })).toBeDisabled()
  expect(playbackMockState.lastScore).toEqual(source)
})

it('authors both jumps of D.C. al Coda and emits distinct intact and expanded MusicXML', async () => {
  const original = fixture()
  await openScore(original)
  const coda = openEditor(4)
  select(coda, '이동 표지 종류', '코다')
  fireEvent.click(coda.getByRole('button', { name: '이동 표지 적용' }))
  const toCoda = openEditor(2)
  select(toCoda, '이동 표지 종류', 'To Coda')
  fireEvent.click(toCoda.getByRole('button', { name: '이동 표지 적용' }))
  const dc = openEditor(6)
  select(dc, '이동 표지 종류', 'D.C.')
  fireEvent.change(dc.getByRole('textbox', { name: '악보 문구' }), { target: { value: 'D.C. al Coda' } })
  fireEvent.click(dc.getByRole('button', { name: '이동 표지 적용' }))
  const score = playbackMockState.lastScore!
  expect(createPlaybackTimeline(score).totalBeats).toBe(44)
  openStudioWorkspace('내보내기')
  const exportCopy = vi.mocked(window.inC.musicXml.exportCopy)
  exportCopy.mockResolvedValue({ filePath: '/fixture/coda.musicxml', fileName: 'coda.musicxml' })
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
  await waitFor(() => expect(exportCopy.mock.calls.length, document.querySelector('.studio-status__result')?.textContent).toBe(1))
  const originalXml = exportCopy.mock.calls[0][0].contents
  expect(originalXml).toMatch(/<sound tocoda="coda"\/>/)
  expect(originalXml).toMatch(/<sound dacapo="yes"\/>/)
  expect(originalXml).toMatch(/<symbol>coda<\/symbol>/)
  fireEvent.click(screen.getByRole('button', { name: '반복 펼치기 MusicXML 내보내기' }))
  await waitFor(() => expect(exportCopy).toHaveBeenCalledTimes(2))
  const { parseMusicXml } = await import('../../musicxml')
  const expanded = parseMusicXml(exportCopy.mock.calls[1][0].contents)
  expect(expanded.parts[0].staves[0].measures).toHaveLength(11)
  expect(expanded.parts[0].staves[0].measures.every(measure => !measure.navigation)).toBe(true)
  expect(playbackMockState.lastScore).toEqual(score)
})

it('blocks save for a composed draft, cancels a label draft and never applies it to another measure', async () => {
  const source = fixture()
  await openScore(source)
  const editor = openEditor(2)
  const label = editor.getByRole('textbox', { name: '연결 이름' })
  label.focus()
  fireEvent.change(label, { target: { value: 'custom label' } })
  fireEvent.keyDown(label, { key: 's', code: 'KeyS', ctrlKey: true })
  expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(editor.getByRole('status')).toBeVisible()
  fireEvent.keyDown(label, { key: 'Escape', code: 'Escape' })
  expect(label).toHaveValue('segno')
  fireEvent.change(label, { target: { value: 'unapplied label' } })
  const summary = screen.getByText('반복 이동', { selector: 'summary' })
  fireEvent.click(summary)
  expect(editor.queryByRole('textbox', { name: '연결 이름' })).not.toBeInTheDocument()
  fireEvent.click(summary)
  const reopened = within(screen.getByRole('group', { name: '이동 표지 편집' }))
  const freshLabel = reopened.getByRole('textbox', { name: '연결 이름' })
  expect(freshLabel).toHaveValue('segno')
  fireEvent.compositionStart(freshLabel)
  fireEvent.change(freshLabel, { target: { value: '임시' } })
  expect(reopened.getByRole('button', { name: '이동 표지 적용' })).toBeDisabled()
  fireEvent.keyDown(freshLabel, { key: 'Enter', isComposing: true, keyCode: 229 })
  expect(playbackMockState.lastScore).toEqual(source)
  const next = openEditor(3)
  expect(next.getByRole('textbox', { name: '연결 이름' })).toHaveValue('segno')
  fireEvent.click(next.getByRole('button', { name: '이동 표지 적용' }))
  expect(playbackMockState.lastScore?.parts[0].staves[0].measures[1].navigation).toBeUndefined()
  expect(playbackMockState.lastScore?.parts[0].staves[0].measures[2].navigation).toEqual([
    { type: 'segno', label: 'segno', symbol: true }
  ])
  expect(playbackMockState.play).not.toHaveBeenCalled()
})

it('retains the shared route and post-jump repeat while deleting its secondary owner', async () => {
  const source = fixture()
  const [upper, lower] = source.parts.map(part => part.staves[0])
  upper.measures[1].repeat = { start: true }
  upper.measures[2].repeat = { end: true }
  upper.measures[5].navigation = [{ type: 'dalsegno', label: 'return', display: { words: 'D.S. al Fine' } }]
  lower.measures[1].navigation = [{ type: 'segno', label: 'return', symbol: true }]
  lower.measures[2].repeat = { end: true, afterJump: true }
  lower.measures[3].navigation = [{ type: 'fine', display: { words: 'Fine' } }]

  const originalTimeline = createPlaybackTimeline(source)
  expect(originalTimeline.totalBeats).toBe(52)
  await openScore(source)
  fireEvent.click(screen.getByRole('button', { name: 'secondary-note-1 선택' }))
  openStudioWorkspace('악보')
  fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))
  const remaining = playbackMockState.lastScore!
  expect(remaining.parts.map(part => part.id)).toEqual(['primary'])
  const bars = remaining.parts[0].staves[0].measures
  expect(bars[1].navigation).toEqual(lower.measures[1].navigation)
  expect(bars[3].navigation).toEqual(lower.measures[3].navigation)
  expect(bars[2].repeat).toEqual({ end: true, afterJump: true })
  expect(createPlaybackTimeline(remaining).events).toEqual(originalTimeline.events.filter(event => event.partId === 'primary'))
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
})
