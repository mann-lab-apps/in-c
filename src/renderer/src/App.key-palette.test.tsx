// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createDuration, createNote, createTimePosition } from '../../score-core'
import { createNewScore, keySignaturePresets } from './editor/new-score'
import { serializeMidi } from './midi/serialize-midi'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
beforeEach(() => Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }))
async function setup(mode: 'major' | 'unspecified' = 'major', withNotes = true, laterDifferent = false) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNewScore({ title: '조표 팔레트 검증', templateId: 'duet', measureCount: 3,
    keySignature: { fifths: 0, ...(mode === 'major' ? { mode } : {}) }, timeSignature: { beats: 4, beatType: 4 } })
  if (withNotes) for (const part of score.parts) for (const staff of part.staves) for (const bar of staff.measures) {
    bar.voices[0].events = [createNote({ id: bar.voices[0].events[0].id, position: createTimePosition(0), duration: createDuration('whole'), pitch: { step: 'C', octave: 4 } })]
  }
  if(laterDifferent)score.parts[0].staves[0].measures[2].keySignature={fifths:4,mode:'major'}
  const project = decodeNativeProject(encodeNativeProject(createNativeProject(score)))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/keys.chromatics', fileName: 'keys.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '파일' })); fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  const event = project.score.parts[0].staves[0].measures[1].voices[0].events[0]
  fireEvent.click(screen.getByRole('button', { name: `${event.id} 선택` }))
  fireEvent.click(screen.getByRole('button', { name: '음자리표·조표·박자표' }))
  return { project, event, palette: within(screen.getByRole('complementary', { name: '고정 팔레트' })) }
}
function saveRuntimeFixture(id:string,project:ReturnType<typeof createNativeProject>,changed:typeof project.score){
  const dir=process.env.STUDIO_KEY_PALETTE_QA_DIR
  if(!dir)return
  mkdirSync(dir,{recursive:true})
  const preset=keySignaturePresets.find(p=>p.id===id)!,target=project.score.parts[0].staves[0].measures[1].voices[0].events[0]
  writeFileSync(join(dir,id+'-source.chromatics'),encodeNativeProject(project))
  writeFileSync(join(dir,id+'-expected.chromatics'),encodeNativeProject({...project,score:changed}))
  writeFileSync(join(dir,id+'.json'),JSON.stringify({id,label:preset.label,value:preset.value,targetEventId:target.id,firstEventId:project.score.parts[0].staves[0].measures[0].voices[0].events[0].id},null,2))
}
const label = (id: string) => `${keySignaturePresets.find(p => p.id === id)!.label} · 선택 보표의 이 마디부터 적용`
it('applies E major through the existing command with exact scope, pitch, one undo and native preservation', async () => {
  const { project, palette } = await setup(), tile = palette.getByRole('button', { name: label('e-major') })
  expect(palette.getByText(/선택 보표의 2마디부터 이후 마디/)).toBeInTheDocument()
  fireEvent.click(tile)
  const changed = structuredClone(playbackMockState.lastScore!), staff = changed.parts[0].staves[0]
  expect(staff.measures.map(m => m.keySignature)).toEqual([{ fifths: 0, mode: 'major' }, { fifths: 4, mode: 'major' }, { fifths: 4, mode: 'major' }])
  expect(changed.parts[1]).toEqual(project.score.parts[1]); expect(staff.measures[0]).toEqual(project.score.parts[0].staves[0].measures[0])
  expect(serializeMidi(changed)).toEqual(serializeMidi(project.score))
  saveRuntimeFixture('e-major',project,changed)
  fireEvent.click(tile); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(changed)
})
it('exposes all 30 existing presets without mutating on mode choice or cross-mode search', async () => {
  const { project, palette } = await setup(), mode = palette.getByRole('combobox', { name: '팔레트 조표 보기' })
  for (const preset of keySignaturePresets.filter(p => p.value.mode === 'major')) expect(palette.getByRole('button', { name: label(preset.id) })).toBeEnabled()
  fireEvent.click(mode); fireEvent.click(screen.getByRole('option', { name: '단조' }))
  for (const preset of keySignaturePresets.filter(p => p.value.mode === 'minor')) expect(palette.getByRole('button', { name: label(preset.id) })).toBeEnabled()
  expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.change(palette.getByRole('searchbox', { name: '표기 기호 검색' }), { target: { value: 'e-major' } })
  expect(palette.getByRole('button', { name: label('e-major') })).toBeEnabled()
  expect(mode).toBeDisabled(); expect(playbackMockState.lastScore).toEqual(project.score)
})
it('keeps imported unspecified mode until an explicit preset application', async () => {
  const { project, palette } = await setup('unspecified')
  fireEvent.click(palette.getByRole('combobox', { name: '팔레트 조표 보기' })); fireEvent.click(screen.getByRole('option', { name: '단조' }))
  expect(playbackMockState.lastScore).toEqual(project.score)
})


it.each([{fifths:7,mode:'major' as const},{fifths:-7,mode:'major' as const},{fifths:7,mode:'minor' as const},{fifths:-7,mode:'minor' as const}])('applies the existing edge preset $fifths/$mode without changing sounding pitches', async ({fifths,mode})=>{
  const {project,palette}=await setup(),preset=keySignaturePresets.find(p=>p.value.fifths===fifths&&p.value.mode===mode)!
  if(mode==='minor'){fireEvent.click(palette.getByRole('combobox',{name:'팔레트 조표 보기'}));fireEvent.click(screen.getByRole('option',{name:'단조'}))}
  fireEvent.click(palette.getByRole('button',{name:label(preset.id)}))
  const changed=structuredClone(playbackMockState.lastScore!)
  expect(changed.parts[0].staves[0].measures[1].keySignature).toEqual(preset.value)
  expect(changed.parts[0].staves[0].measures[2].keySignature).toEqual(preset.value)
  expect(changed.parts[1]).toEqual(project.score.parts[1]);expect(serializeMidi(changed)).toEqual(serializeMidi(project.score))
  if(fifths===-7&&mode==='minor')saveRuntimeFixture(preset.id,project,changed)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
})
it('lets the existing command update later bars even when the selected bar already has that preset',async()=>{
  const {project,palette}=await setup('major',true,true)
  const tile=palette.getByRole('button',{name:label('c-major')})
  fireEvent.click(tile)
  const changed=playbackMockState.lastScore!
  expect(changed.parts[0].staves[0].measures[2].keySignature).toEqual({fifths:0,mode:'major'})
  expect(serializeMidi(changed)).toEqual(serializeMidi(project.score));expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('keeps pending tuplets and range selections out of palette key application',async()=>{
  const {project,palette,event}=await setup('major',false)
  fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'다섯잇단음표 입력(5:4)'}))
  fireEvent.keyDown(window,{key:'c',code:'KeyC'})
  expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 1/5')
  const tile=palette.getByRole('button',{name:label('e-major')});expect(tile).toBeDisabled();fireEvent.click(tile)
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 1/5')
  fireEvent.keyDown(window,{key:'3',code:'Digit3',ctrlKey:true})
  fireEvent.click(screen.getByRole('button',{name:`${project.score.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택`}))
  fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}),{shiftKey:true})
  expect(palette.getByRole('button',{name:label('e-major')})).toBeDisabled()
  expect(playbackMockState.lastScore).toEqual(project.score)
})
