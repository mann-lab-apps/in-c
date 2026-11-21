// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent,render,screen,waitFor } from '@testing-library/react'
import { expect,it,vi } from 'vitest'
import { createXmlCharacterFixture,xmlCharacterCases } from '../../testing/xml-character-reference-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace,playbackMockState,registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['decimal','verse-reference'] as const)('imports $id into the actual App without text corruption and saves its unchanged meaning',async id=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const example=xmlCharacterCases.find(c=>c.id===id)!,source=createXmlCharacterFixture(example),expected=parseMusicXml(createXmlCharacterFixture(example,true))
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/reference.musicxml',fileName:'reference.musicxml',contents:source})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(expected))
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/reference.chromatics',fileName:'reference.chromatics'})
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
 await waitFor(()=>expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음'))
})
