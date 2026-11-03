// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from '../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createVoiceOrderFixture } from '../../testing/voice-order-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

vi.mock('../../musicxml', async importOriginal => {
  const actual = await importOriginal<typeof import('../../musicxml')>()
  return { ...actual, serializeMusicXmlWithReport: vi.fn(actual.serializeMusicXmlWithReport) }
})

const routes = ['save', 'structure', 'expanded'] as const
async function openFixture(reversed: boolean, secondVoiceNumber: 2 | 3 = 2) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(createVoiceOrderFixture(reversed, secondVoiceNumber))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/scores/voice-order.chromatics', fileName: 'voice-order.chromatics', contents: encodeNativeProject(project)
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  return structuredClone(project)
}
function exportFixture(route: typeof routes[number]) {
  openStudioWorkspace(route === 'save' ? '파일' : '내보내기')
  fireEvent.click(screen.getByRole('button', { name: route === 'save' ? 'MusicXML로 저장' : route === 'structure' ? 'MusicXML 내보내기' : '반복 펼치기 MusicXML 내보내기' }))
  return route === 'save' ? window.inC.musicXml.save : window.inC.musicXml.exportCopy
}

describe('MusicXML voice order validation', () => {
  registerAppTestHooks()
  it.each(routes.flatMap(route => [false, true].map(reversed => ({ route, reversed }))))(
    'export.xml-voice-order $route reversed=$reversed preserves numbered voices and span ownership', async ({ route, reversed }) => {
      const project = await openFixture(reversed)
      const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
      const request = exportFixture(route)
      await waitFor(() => expect(request).toHaveBeenCalledOnce())
      const contents = vi.mocked(request).mock.calls[0][0].contents
      const reopened = parseMusicXml(contents)
      expect(reopened.parts[0].staves[0].measures[0].voices.map(v => v.id)).toEqual(['voice-1', 'voice-2'])
      expect(reopened.slurs).toHaveLength(2)
      expect(reopened.hairpins).toHaveLength(1)
      expect(playbackMockState.lastScore).toEqual(project.score)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(project.score)
      if (process.env.DDIRORI_VOICE_ORDER_QA_DIR) {
        const { mkdirSync, writeFileSync } = await import('node:fs')
        const { join } = await import('node:path')
        const dir = join(process.env.DDIRORI_VOICE_ORDER_QA_DIR, `${route}-${reversed ? 'reversed' : 'canonical'}`)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(project))
        writeFileSync(join(dir, 'expected.musicxml'), contents)
      }
    }
  )
  it.each(routes)('export.xml-voice-order %s rejects a real voice-number remapping', async route => {
    const project = await openFixture(false, 3)
    const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    // Valid XML, identical pitches/durations/event sequence, but voice 3 became voice 2.
    // This changes the renderer's lane/stem/rest policy and must not be normalized away.
    vi.mocked(serializeMusicXmlWithReport).mockImplementationOnce(score => ({
      contents: serializeMusicXml(score).replaceAll('<voice>3</voice>', '<voice>2</voice>'), report: { warnings: [] }
    }))
    const request = exportFixture(route)
    await waitFor(() => expect(screen.getByRole('status', { name: '편집 및 파일 상태' })).toHaveTextContent('MusicXML 저장 검증에 실패했습니다.'))
    expect(request).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(project.score)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected!)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
  })
})
