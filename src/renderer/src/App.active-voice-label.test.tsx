// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createVoiceOrderFixture } from '../../testing/voice-order-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('Selected voice number in the work context', () => {
  registerAppTestHooks()
  it.each([[1, 2], [2, 1], [1, 3], [3, 1], [2, 4], [4, 2]])(
    'selection.active-voice-label uses IDs for native voice array %s,%s', async (first, second) => {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const project = createNativeProject(createVoiceOrderFixture())
      const voices = project.score.parts[0].staves[0].measures[0].voices
      // Native IDs are semantic voice slots; event IDs and span ownership stay intact.
      voices[0].id = `voice-${first}`; voices[1].id = `voice-${second}`
      const initial = structuredClone(project)
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({
        filePath: '/scores/selected-voice.chromatics', fileName: 'selected-voice.chromatics', contents: encodeNativeProject(project)
      })
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await waitFor(() => expect(playbackMockState.lastScore).toEqual(initial.score))
      for (const voice of initial.score.parts[0].staves[0].measures[0].voices) {
        fireEvent.click(screen.getByRole('button', { name: `${voice.events[0].id} 선택` }))
        const number = Number(voice.id.slice('voice-'.length))
        expect(within(screen.getByLabelText('작업과 선택 상태')).getByText(new RegExp(`· 성부 ${number}$`))).toBeVisible()
        expect(within(screen.getByRole('group', { name: '입력 성부' })).getByRole('button', { name: `${number}성부` })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')!.split(':').at(-1)).toBe(voice.id)
        expect(playbackMockState.lastScore).toEqual(initial.score)
        expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      }
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(initial.score)
      if (process.env.DDIRORI_VOICE_LABEL_QA_DIR) {
        const { mkdirSync, writeFileSync } = await import('node:fs')
        const { join } = await import('node:path')
        const dir = join(process.env.DDIRORI_VOICE_LABEL_QA_DIR, `${first}-${second}`)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(initial))
      }
    }
  )
})
