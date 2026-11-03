// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { registerAppTestHooks, playbackMockState } from './App.test-harness'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'

registerAppTestHooks()

it.each((['recovery','recent-list'] as const).flatMap(background=>(['native','xml'] as const).map(format=>({background,format}))))('studio.startup-feedback-intent keeps the newer $format failure after old $background failure', async ({background,format})=>{
  window.history.replaceState({},'','/')
  let failBackground!: (error:Error)=>void
  if(background==='recovery')vi.mocked(window.inC.autosave.read).mockImplementationOnce(()=>new Promise((_resolve,reject)=>{failBackground=reject}))
  else vi.mocked(window.inC.recentMusicXml.list).mockImplementationOnce(()=>new Promise((_resolve,reject)=>{failBackground=reject}))
  const latestError='Newest owned file failure'
  if(format==='native')vi.mocked(window.inC.project.open).mockRejectedValueOnce(Error(latestError))
  else vi.mocked(window.inC.musicXml.open).mockRejectedValueOnce(Error(latestError))
  const {App}=await import('./App');render(<App />)
  const original=structuredClone(playbackMockState.lastScore)
  const open=screen.getByRole('button',{name:format==='native'?'프로젝트 열기':'MusicXML 가져오기'})
  fireEvent.click(open)
  await screen.findByText(latestError)
  const before=document.querySelector('.studio-start')!.textContent
  await act(async()=>failBackground(Error('Obsolete background startup failure')))
  expect(document.querySelector('.studio-start')).toHaveTextContent(before!)
  expect(screen.getByText(latestError)).not.toBeVisible()
  expect(screen.queryByText('Obsolete background startup failure')).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(original)
  expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(open).toBeEnabled()
  fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
  const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'}))
  expect(wizard.getByRole('textbox',{name:'제목'})).toBeVisible()
  fireEvent.click(wizard.getByRole('button',{name:'취소'}))
  expect(open).toBeEnabled()
})

it.each(['recovery','recent-list'] as const)('studio.startup-feedback-intent still reports a normal %s failure before any user command', async background=>{
  window.history.replaceState({},'','/')
  if(background==='recovery')vi.mocked(window.inC.autosave.read).mockRejectedValueOnce(Error('Current startup failure'))
  else vi.mocked(window.inC.recentMusicXml.list).mockRejectedValueOnce(Error('Current startup failure'))
  const {App}=await import('./App');render(<App />)
  expect(await screen.findByText('Current startup failure')).not.toBeVisible()
  expect(screen.getByRole('button',{name:'프로젝트 열기'})).toBeEnabled()
})

it('studio.startup-feedback-intent retains a valid recovery offer arriving after an explicit read failure', async ()=>{
  window.history.replaceState({},'','/')
  let finish!: (value:Awaited<ReturnType<typeof window.inC.autosave.read>>)=>void
  vi.mocked(window.inC.autosave.read).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  vi.mocked(window.inC.project.open).mockRejectedValueOnce(Error('Explicit current failure'))
  const {App}=await import('./App');render(<App />)
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText('Explicit current failure')
  const project=createPartSpanResetFixture()
  await act(async()=>finish({project,score:project.score,metadata:{title:'Available recovery',updatedAt:'2026-10-31T00:00:00Z',version:'test'}}))
  expect(screen.getByRole('button',{name:'복구본 열기'})).toBeEnabled()
  expect(screen.getByText('Explicit current failure')).not.toBeVisible()
})
