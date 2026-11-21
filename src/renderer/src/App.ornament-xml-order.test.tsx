// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['structure', 'expanded'] as const)('saves %s XML with a noncanonical ornament order without weakening the safety check', async mode => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createPracticeLoopFixture(), event = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (event.type !== 'note') throw Error('Owned regular note')
  event.ornaments = ['mordent', 'trill']
  const project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'ordered.chromatics', filePath: '/fixture/ordered.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  openStudioWorkspace('내보내기')
  fireEvent.click(screen.getByRole('button', { name: mode === 'expanded' ? '반복 펼치기 MusicXML 내보내기' : 'MusicXML 내보내기' }))
  await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
  const xml = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
  expect(xml).toBe(serializeMusicXml(project.score))
  expect(parseMusicXml(xml).parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({ ornaments: ['mordent', 'trill'] })
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
