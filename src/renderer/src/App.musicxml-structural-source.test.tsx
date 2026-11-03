// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createMidiChannelFixture } from '../../testing/midi-channel-fixture'
import { serializeMusicXml, parseMusicXml } from '../../musicxml'
import { expandScoreRepeatsForMusicXml } from '../../musicxml/expand-repeats'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('MusicXML structural source restoration', () => {
 registerAppTestHooks()
 for (const mode of ['structure', 'expanded'] as const) {
  it.each(['deleted', 'undo-restored'] as const)(`export.musicxml-structural-source ${mode} %s preserves its source and reports only omitted content`, async action => {
   window.history.replaceState({}, '', '/?fixture=release-test')
   const project = createNativeProject(createMidiChannelFixture(2).score)
   vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/scores/xml-source.chromatics', fileName: 'xml-source.chromatics', contents: encodeNativeProject(project) })
   let finish!: (value: { filePath: string; fileName: string }) => void
   vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
   const { App } = await import('./App')
   render(<App />)
   openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
   await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
   const source = structuredClone(playbackMockState.lastScore!)
   const copy = mode === 'expanded' ? expandScoreRepeatsForMusicXml(source) : source
   const expectedXml = serializeMusicXml(copy)
   if (process.env.DDIRORI_MUSICXML_STRUCTURAL_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'),{ join } = await import('node:path')
    const dir = join(process.env.DDIRORI_MUSICXML_STRUCTURAL_QA_DIR, mode)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(project))
    writeFileSync(join(dir, 'expected.musicxml'), expectedXml)
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(copy))
   }
   openStudioWorkspace('내보내기')
   fireEvent.click(screen.getByRole('button', { name: mode === 'expanded' ? '반복 펼치기 MusicXML 내보내기' : 'MusicXML 내보내기' }))
   await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
   expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents).toBe(expectedXml)
   openStudioWorkspace('악보');fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))
   await waitFor(() => expect(playbackMockState.lastScore!.parts).toHaveLength(1))
   if (action === 'undo-restored') {
    const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
    fireEvent.click(menu.getByRole('button', { name: '편집' }))
    fireEvent.click(menu.getByRole('menuitem', { name: '실행 취소' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
   }
   const current = structuredClone(playbackMockState.lastScore!)
   const dirty = document.querySelector('.studio-document__state')!.textContent
   const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
   await act(async () => finish({ filePath: '/scores/source-copy.musicxml', fileName: 'source-copy.musicxml' }))
   const status = document.querySelector('.studio-status__result')!
   await waitFor(() => expect(status).toHaveTextContent('source-copy.musicxml로 MusicXML을 내보냈습니다.'))
   if (action === 'deleted') expect(status).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.')
   else expect(status).not.toHaveTextContent('수정 내용은 포함되지 않았습니다.')
   expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
   expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
   expect(playbackMockState.lastScore).toEqual(current)
   expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents).toBe(expectedXml)
   expect(serializeMidi(parseMusicXml(expectedXml))).toEqual(serializeMidi(copy))
   openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
   await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
   expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(current)
  })
 }
})
