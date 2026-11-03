// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it('desktop title follows committed metadata and retains dirty state after save failure', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createPartSpanResetFixture(); source.score.title = 'Brand fixture'
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/title.chromatics',fileName:'title.chromatics',contents:encodeNativeProject(source)})
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
  await waitFor(() => expect(document.title).toBe('Brand fixture — 띠로리 Studio'))
  fireEvent.click(screen.getByRole('button', {name:'악보 정보'}))
  fireEvent.click(screen.getByRole('button', {name:'악보 제목 편집'}))
  const input=screen.getByRole('textbox',{name:'악보 제목'})
  fireEvent.change(input,{target:{value:'Edited brand'}})
  expect(document.title).toBe('Brand fixture — 띠로리 Studio')
  fireEvent.keyDown(input,{key:'Enter'})
  await waitFor(() => expect(document.title).toBe('Edited brand * — 띠로리 Studio'))
  vi.mocked(window.inC.project.save).mockRejectedValueOnce(new Error('test save failure'))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(() => expect(screen.getByText(/프로젝트 저장을 마무리하지 못했습니다/)).toBeInTheDocument())
  expect(document.title).toBe('Edited brand * — 띠로리 Studio')
  fireEvent.keyDown(document.body,{key:'z',ctrlKey:true})
  await waitFor(() => expect(document.title).toContain('Brand fixture'))
  fireEvent.keyDown(document.body,{key:'z',ctrlKey:true,shiftKey:true})
  await waitFor(() => expect(document.title).toBe('Edited brand * — 띠로리 Studio'))
  vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/title.chromatics',fileName:'title.chromatics'})
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(() => expect(document.title).toBe('Edited brand — 띠로리 Studio'))
})
