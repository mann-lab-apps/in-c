// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks, playbackMockState } from './App.test-harness'
const state=vi.hoisted(()=>({check:vi.fn(),raster:vi.fn()}))
vi.mock('./notation/print-page-ink',async importOriginal=>({...await importOriginal<typeof import('./notation/print-page-ink')>(),assertPrintPageInk:state.check}))
vi.mock('./image-export/raster',()=>({rasterizePngPages:state.raster}))

describe('actual print page boundary failure ownership',()=>{
  registerAppTestHooks()
  it.each(['PDF','PNG'] as const)('blocks %s before native output and retains edit/undo with an actionable retry',async format=>{
    window.history.replaceState({},'','/?fixture=release-test')
    const {PrintPageInkError}=await import('./notation/print-page-ink')
    state.check.mockReset().mockImplementation(()=>{throw new PrintPageInkError({afterPage:3,kind:'staff'})})
    state.raster.mockReset().mockResolvedValue({pages:[{pageNumber:1,bytes:new Uint8Array([137,80,78,71])}],totalPages:1})
    const {App}=await import('./App');render(<App/>);const before=structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button',{name:'악보 정보'}));fireEvent.click(screen.getByRole('button',{name:'악보 제목 편집'}))
    const title=screen.getByRole('textbox',{name:'악보 제목'});fireEvent.change(title,{target:{value:'Boundary edited'}});fireEvent.keyDown(title,{key:'Enter'});fireEvent.blur(title)
    const edited=structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:format==='PNG'?'PNG 출력 설정':'내보내기 설정'}))
    const button=screen.getByRole('button',{name:format==='PNG'?'PNG 내보내기':'PDF 변환'});await waitFor(()=>expect(button).toBeEnabled());act(()=>button.focus());fireEvent.click(button)
    await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('3–4쪽 사이에서 보표가 나뉩니다'))
    expect(document.querySelector('.editor-status')).toHaveTextContent('용지 방향이나 보표 크기')
    expect(window.inC.pdf.save).not.toHaveBeenCalled();expect(window.inC.png.save).not.toHaveBeenCalled();expect(state.raster).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    await waitFor(()=>expect(button).toBeEnabled());await waitFor(()=>expect(button).toHaveFocus())
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
    fireEvent.keyDown(window,{key:'y',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    state.check.mockReturnValue(undefined)
    if(format==='PDF')vi.mocked(window.inC.pdf.save).mockResolvedValue({fileName:'retry.pdf',filePath:'/tmp/retry.pdf'})
    else vi.mocked(window.inC.png.save).mockResolvedValue({fileName:'retry.png',filePath:'/tmp/retry.png',pageCount:1,kind:'file'})
    fireEvent.click(button);await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent(format==='PDF'?'retry.pdf':'retry.png'))
    expect(playbackMockState.lastScore).toEqual(edited);expect(window.inC.project.save).not.toHaveBeenCalled()
  },15_000)
})
