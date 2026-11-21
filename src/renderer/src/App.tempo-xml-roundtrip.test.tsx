// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createTempoRoundtripFixture} from '../../testing/tempo-roundtrip-fixture'
import {decodeNativeProject} from '../../project/schema'
import {serializeMidi} from './midi/serialize-midi'
import {parseMusicXml,serializeMusicXml} from '../../musicxml'
import {playbackMockState,registerAppTestHooks,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
it.each([{scope:'global' as const,bpm:241},{scope:'position' as const,bpm:60.5}])('imports and saves the original $scope BPM $bpm without an edit or hidden clamping',async({scope,bpm})=>{
 window.history.replaceState({},'','/?fixture=release-test');const{score,source}=createTempoRoundtripFixture(scope,bpm)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'tempo-xml.musicxml',filePath:'/fixture/tempo-xml.musicxml',contents:source})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const current=()=>scope==='global'?playbackMockState.lastScore?.tempo:playbackMockState.lastScore?.tempoEvents?.[0]
 await waitFor(()=>expect(current()?.bpm).toBe(bpm));expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 const contents=vi.mocked(window.inC.project.save).mock.calls[0][0].contents,saved=decodeNativeProject(contents);expect((scope==='global'?saved.score.tempo:saved.score.tempoEvents?.[0])?.bpm).toBe(bpm);expect(serializeMidi(saved.score)).toEqual(serializeMidi(score));expect(serializeMidi(parseMusicXml(serializeMusicXml(saved.score)))).toEqual(serializeMidi(score))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'tempo-xml.chromatics',filePath:'/fixture/tempo-xml.chromatics',contents});fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(saved.score));expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
