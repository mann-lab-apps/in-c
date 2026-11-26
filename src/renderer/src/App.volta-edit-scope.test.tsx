// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createScore, createScoreRepeatPlaybackPlan, createStaff, createVoice, type Score } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { expandScoreRepeatsForMusicXml } from '../../musicxml/expand-repeats'
import { serializeMidi } from './midi/serialize-midi'
import { openNotationSettings, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()

function fixture() {
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D'] as const
  const measures = notes.map((step, index) => createMeasure({
    id: `volta-bar-${index + 1}`,
    number: index + 1,
    timeSignature: { beats: 1, beatType: 4 },
    voices: [createVoice({ events: [createNote({
      id: `volta-note-${index + 1}`,
      pitch: { step, octave: index < 7 ? 4 : 5 },
      duration: { value: 'quarter', dots: 0 }
    })] })]
  }))
  measures[0].repeat = { start: true }
  measures[1].volta = { start: true, number: 1 }
  measures[3].repeat = { end: true, times: 2 }
  measures[3].volta = { end: true, number: 1 }
  measures[5].repeat = { start: true }
  measures[7].repeat = { end: true, times: 2 }
  return createScore({ title: '두 반복의 볼타 범위', parts: [createPart({
    staves: [createStaff({ measures })]
  })] })
}

async function openScore(score: Score) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    contents: encodeNativeProject(createNativeProject(score)),
    fileName: 'volta-scope.chromatics',
    filePath: '/fixture/volta-scope.chromatics'
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
}

function contextVolta(bar: number, number: 1 | 2) {
  fireEvent.contextMenu(screen.getByRole('button', { name: `${bar}마디 선택` }), { clientX: 190, clientY: 165 })
  fireEvent.click(within(screen.getByRole('menu', { name: '마디 작업' })).getByRole('menuitem', { name: `${number}번 볼타` }))
}

function inspectVolta(bar: number) {
  fireEvent.click(screen.getByRole('button', { name: `${bar}마디 선택` }))
  openNotationSettings('repeat')
  return within(screen.getByRole('region', { name: '반복과 볼타' }))
}

function bars(score = playbackMockState.lastScore!) {
  return score.parts[0].staves[0].measures
}

it('adds another first ending in a later repeat and undo restores only the new bracket', async () => {
  const source = fixture()
  await openScore(source)
  contextVolta(8, 1)
  const authored = structuredClone(playbackMockState.lastScore!)
  expect(bars(authored).slice(0, 7)).toEqual(bars(source).slice(0, 7))
  expect(bars(authored)[7].volta).toEqual({ number: 1, start: true, end: true })
  expect(screen.getByText('1회 수정')).toBeVisible()
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(authored)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(authored)
})

it('changes a bracket from its interior and removes both endpoints when toggled again', async () => {
  const score = fixture()
  bars(score)[7].volta = { number: 2, start: true, end: true }
  await openScore(score)
  const toolbar = inspectVolta(3)
  expect(toolbar.getByRole('button', { name: '1번 볼타' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(toolbar.getByRole('button', { name: '2번 볼타' }))
  expect(bars()[1].volta).toEqual({ start: true, number: 2 })
  expect(bars()[2].volta).toBeUndefined()
  expect(bars()[3].volta).toEqual({ end: true, number: 2 })
  expect(bars()[7]).toEqual(bars(score)[7])
  fireEvent.click(toolbar.getByRole('button', { name: '2번 볼타' }))
  expect(bars().filter(bar => bar.volta).map(bar => bar.number)).toEqual([8])
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(bars()[1].volta).toEqual({ start: true, number: 2 })
})

it('shows a saved pass list from an interior measure and protects it in both entry points', async () => {
  const score = fixture()
  bars(score)[1].volta = { start: true, passes: [1, 2] }
  bars(score)[3].volta = { end: true, passes: [1, 2] }
  await openScore(score)
  const toolbar = inspectVolta(3)
  expect(toolbar.getByText('볼타 회차: 1, 2')).toBeVisible()
  expect(toolbar.getByRole('button', { name: '1번 볼타' })).toBeDisabled()
  contextVolta(3, 1)
  expect(playbackMockState.lastScore).toEqual(score)
  expect(screen.getByText('0회 수정')).toBeVisible()
})

it('places a second ending before the next repeat independently of its first ending', async () => {
  const score = fixture()
  bars(score)[7].volta = { number: 1, start: true, end: true }
  await openScore(score)
  contextVolta(5, 2)
  expect(bars()[4].volta).toMatchObject({ start: true, number: 2 })
  expect(bars()[7]).toEqual(bars(score)[7])
  expect(bars().slice(0, 4)).toEqual(bars(score).slice(0, 4))
})

it('protects a different bracket already inside the proposed range', async () => {
  const score = fixture()
  await openScore(score)
  contextVolta(1, 2)
  expect(screen.getByText(/다른 볼타 괄호와 범위가 겹칩니다/)).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(score)
  expect(screen.getByText('0회 수정')).toBeVisible()
})

it('edits the same aligned repeat from a secondary part without moving its musical data', async () => {
  const score = fixture()
  const secondary = createPart({ id: 'volta-second-part', name: 'Second', staves: [createStaff({
    id: 'volta-second-staff',
    measures: bars(score).map(bar => createMeasure({
      id: `secondary-${bar.id}`, number: bar.number, timeSignature: bar.timeSignature,
      voices: bar.voices.map(voice => ({
        ...voice, events: voice.events.map(event => ({ ...event, id: `secondary-${event.id}` }))
      }))
    }))
  })] })
  score.parts.push(secondary)
  await openScore(score)
  fireEvent.click(screen.getByRole('button', { name: 'secondary-volta-note-3 선택' }))
  openNotationSettings('repeat')
  const toolbar = within(screen.getByRole('region', { name: '반복과 볼타' }))
  expect(toolbar.getByRole('button', { name: '1번 볼타' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(toolbar.getByRole('button', { name: '2번 볼타' }))
  expect(bars().filter(bar => bar.volta).map(bar => [bar.number, bar.volta?.number])).toEqual([[2, 2], [4, 2]])
  expect(playbackMockState.lastScore!.parts[1]).toEqual(secondary)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(score)
})

function threePassFixture() {
  const score = fixture()
  bars(score)[3].repeat = { end: true, times: 3 }
  bars(score)[4].volta = { start: true, end: true, passes: [3] }
  return score
}

function openPassEditor(bar: number) {
  const toolbar = inspectVolta(bar)
  fireEvent.click(toolbar.getByText('볼타 회차 편집', { selector: 'summary' }))
  return toolbar.getByRole('textbox', { name: '재생 회차' })
}

it('edits multiple passes from the middle of a bracket and preserves both MusicXML performances', async () => {
  const original = threePassFixture()
  await openScore(original)
  const input = openPassEditor(3)
  expect(input).toHaveValue('1')
  expect(screen.getByText(/2–4마디 · 도돌이표 끝 4마디 · 3회/)).toBeVisible()
  fireEvent.change(input, { target: { value: '2, 1' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  const current = structuredClone(playbackMockState.lastScore!)
  expect(bars(current)[1].volta).toEqual({ start: true, passes: [1, 2] })
  expect(bars(current)[2].volta).toBeUndefined()
  expect(bars(current)[3].volta).toEqual({ end: true, passes: [1, 2] })
  expect(bars(current).slice(4)).toEqual(bars(original).slice(4))
  expect(createScoreRepeatPlaybackPlan(current)?.entries.map(entry => entry.measureIndex + 1))
    .toEqual([1, 2, 3, 4, 1, 2, 3, 4, 1, 5, 6, 7, 8, 6, 7, 8, 9])
  for (const copy of [current, expandScoreRepeatsForMusicXml(current)]) {
    expect(serializeMidi(parseMusicXml(serializeMusicXml(copy)))).toEqual(serializeMidi(current))
  }
  expect(screen.getByText('1회 수정')).toBeVisible()
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(original)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(current)
})

it('saves edited volta passes and restores the bracket and repeat order when reopened', async () => {
  await openScore(threePassFixture())
  const input = openPassEditor(3)
  fireEvent.change(input, { target: { value: '1, 2' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  const edited = structuredClone(playbackMockState.lastScore!)
  expect(bars(edited)[1].volta).toEqual({ start: true, passes: [1, 2] })
  expect(bars(edited)[3].volta).toEqual({ end: true, passes: [1, 2] })

  vi.mocked(window.inC.project.save).mockResolvedValueOnce({
    fileName: 'volta-scope.chromatics', filePath: '/fixture/volta-scope.chromatics'
  })
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await within(screen.getByRole('status', { name: '편집 및 파일 상태' })).findByText(/volta-scope\.chromatics에 저장/)
  const [{ contents }] = vi.mocked(window.inC.project.save).mock.calls[0]
  expect(decodeNativeProject(contents).score).toEqual(edited)

  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    contents, fileName: 'reopened-volta.chromatics', filePath: '/fixture/reopened-volta.chromatics'
  })
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await within(screen.getByRole('status', { name: '편집 및 파일 상태' })).findByText(/reopened-volta\.chromatics을 열었습니다/)
  expect(inspectVolta(3).getByText('볼타 회차: 1, 2')).toBeVisible()
  const reopened = playbackMockState.lastScore!
  expect(reopened).toEqual(edited)
  expect(createScoreRepeatPlaybackPlan(reopened)).toEqual(createScoreRepeatPlaybackPlan(edited))
})

it('distinguishes an imported exact second ending from the legacy preset in the inspector', async () => {
  const score = threePassFixture()
  bars(score)[1].volta = { start: true, passes: [2] }
  bars(score)[3].volta = { end: true, passes: [2] }
  await openScore(score)
  const input = openPassEditor(3)
  expect(input).toHaveValue('2')
  expect(input).toHaveAccessibleDescription(expect.stringContaining('두 번째 회차에만 재생합니다'))
  expect(screen.getByRole('button', { name: '회차 적용' })).toBeDisabled()
  expect(playbackMockState.lastScore).toEqual(score)
})

it('applies a single third pass to the bracket and keeps unrelated repeats', async () => {
  const original = threePassFixture()
  await openScore(original)
  const input = openPassEditor(2)
  fireEvent.change(input, { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: '회차 적용' }))
  const current = playbackMockState.lastScore!
  expect(bars(current)[1].volta?.passes).toEqual([3])
  expect(bars(current)[3].volta?.passes).toEqual([3])
  expect(bars(current).slice(4)).toEqual(bars(original).slice(4))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(current)))).toEqual(serializeMidi(current))
})

it('keeps invalid and composing pass drafts away from score commands and other selections', async () => {
  const score = threePassFixture()
  await openScore(score)
  const input = openPassEditor(3)
  for (const [value, reason] of [['1, 4', /1–3 사이/], ['2, 2', /중복/], ['2', /두 번째 회차만/]] as const) {
    fireEvent.change(input, { target: { value } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).toHaveAccessibleDescription(expect.stringMatching(reason))
    expect(playbackMockState.lastScore).toEqual(score)
  }
  fireEvent.keyDown(input, { key: 's', code: 'KeyS', ctrlKey: true })
  expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(input).toHaveValue('1')
  fireEvent.compositionStart(input)
  fireEvent.change(input, { target: { value: '1, 2' } })
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(playbackMockState.lastScore).toEqual(score)
  const next = openPassEditor(5)
  expect(next).toHaveValue('3')
  fireEvent.change(next, { target: { value: '1' } })
  fireEvent.keyDown(next, { key: 'Enter' })
  expect(next).toHaveAccessibleDescription(expect.stringMatching(/마지막 회차 3/))
  expect(playbackMockState.lastScore).toEqual(score)
})

it('keeps nested volta ranges out of the pass editor without changing the score', async () => {
  const score = threePassFixture()
  bars(score)[2].repeat = { start: true }
  bars(score)[4].repeat = { end: true, times: 2 }
  await openScore(score)
  const toolbar = inspectVolta(3)
  expect(toolbar.queryByText('볼타 회차 편집', { selector: 'summary' })).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(score)
})

it('edits a pass list when a first end repeat returns to the beginning of the score', async () => {
  const original = threePassFixture()
  delete bars(original)[0].repeat
  await openScore(original)
  const input = openPassEditor(3)
  expect(input).toHaveValue('1')
  fireEvent.change(input, { target: { value: '1, 2' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  const current = playbackMockState.lastScore!
  expect(bars(current)[0].repeat).toBeUndefined()
  expect(bars(current)[1].volta?.passes).toEqual([1, 2])
  expect(bars(current)[3].volta?.passes).toEqual([1, 2])
  expect(createScoreRepeatPlaybackPlan(current)?.entries.map(entry => entry.measureIndex + 1))
    .toEqual([1, 2, 3, 4, 1, 2, 3, 4, 1, 5, 6, 7, 8, 6, 7, 8, 9])
  expect(serializeMidi(parseMusicXml(serializeMusicXml(current)))).toEqual(serializeMidi(current))
})
