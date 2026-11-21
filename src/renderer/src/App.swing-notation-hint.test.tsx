// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createSwingPlaybackFixture } from '../../testing/swing-playback-fixture'
import type { Score } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

const cases: { id: string; notation: Score['rhythmFeel']; playback: Score['swingPlayback']; hint: string; unsupported?: boolean }[] = [
  { id: 'cue-only', notation: { unit: 'eighth' }, playback: undefined, hint: '악보의 8분 · 2:1 표기와 별개로 실제 스윙 재생은 꺼져 있습니다.' },
  { id: 'ratio-differs', notation: { unit: 'eighth' }, playback: { unit: 'eighth', ratio: '3:2' }, hint: '악보 표기는 8분 · 2:1, 실제 재생은 8분 · 3:2입니다. 두 설정은 자동으로 맞춰지지 않습니다.' },
  { id: 'unit-differs', notation: { unit: 'eighth' }, playback: { unit: '16th', ratio: '2:1' }, hint: '악보 표기는 8분 · 2:1, 실제 재생은 16분 · 2:1입니다. 두 설정은 자동으로 맞춰지지 않습니다.' },
  { id: 'custom-cue', notation: { unit: 'eighth', text: 'Swing' }, playback: { unit: 'eighth', ratio: '3:2' }, hint: '실제 스윙 재생은 8분 · 3:2입니다. 원본 리듬 해석 문구의 비율은 자동으로 해석하지 않습니다.' },
  { id: 'playback-only', notation: undefined, playback: { unit: 'eighth', ratio: '3:2' }, hint: '실제 스윙 재생은 8분 · 3:2입니다. 악보에 리듬 해석 표기를 자동으로 추가하지 않습니다.' },
  { id: 'unsupported-meters', notation: undefined, playback: { unit: 'eighth', ratio: '3:2' }, unsupported: true, hint: '저장된 스윙 재생 설정은 8분 · 3:2입니다. 현재 악보에서는 적용되지 않으며 표기는 그대로 유지됩니다.' }
]
it.each(cases)(
  'explains $id through the actual Select help without editing notation, native or MIDI', async ({ id, notation, playback, hint, unsupported }) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const score = { ...createSwingPlaybackFixture(), rhythmFeel: notation, swingPlayback: playback }
    if (unsupported) {
      const other = structuredClone(score.parts[0]); other.id = 'other'; other.staves[0].id = 'other-staff'
      other.staves[0].measures[0].id = 'other-bar'; other.staves[0].measures[0].timeSignature = { beats: 8, beatType: 8 }
      for (const event of other.staves[0].measures[0].voices[0].events) event.id = 'other-' + event.id
      score.parts.push(other)
    }
    const contents = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: id + '.chromatics', filePath: '/fixture/' + id + '.chromatics', contents })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
    openStudioWorkspace('악보')
    expect(screen.getByText(hint)).toBeVisible()
    const select = screen.getByRole('combobox', { name: '전역 스윙 재생' })
    const described = (select.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent).join(' ')
    expect(described).toContain(hint)
    expect(encodeNativeProject(createNativeProject(playbackMockState.lastScore!))).toBe(contents)
    expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi)
    expect(playbackMockState.play).not.toHaveBeenCalled()
  }
)
