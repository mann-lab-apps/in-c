// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioWarningReport, StudioWarningTechnicalDetails } from './StudioWarningReport'
afterEach(cleanup)
it.each(['MusicXML 경고 상세','MIDI 경고 상세'])('provides a focused reading viewport for %s without consuming document shortcuts',label=>{
 const globalKeys=vi.fn()
 render(<div onKeyDown={globalKeys}><StudioWarningReport label={label} title="혼합 경고" fileName="generated.musicxml" theme="light">
  {Array.from({length:31},(_,i)=><li key={i}>원문 경고 {i+1}<StudioWarningTechnicalDetails warning={{path:`source[${i+1}]`,message:'원문 진단 보존'}} meta="owned"/></li>)}
 </StudioWarningReport></div>)
 const reader=screen.getByRole('group',{name:label+' 목록 읽기'})
 expect(reader).toHaveAttribute('tabindex','0');act(()=>reader.focus());expect(reader).toHaveFocus()
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Enter',' ']){
  expect(fireEvent.keyDown(reader,{key,code:key})).toBe(true);expect(globalKeys).not.toHaveBeenCalled()
 }
 expect(fireEvent.keyDown(reader,{key:'Process',isComposing:true,keyCode:229})).toBe(true);expect(globalKeys).not.toHaveBeenCalled()
 for(const stroke of [{key:'s',ctrlKey:true},{key:'s',metaKey:true},{key:'z',ctrlKey:true},{key:'c',ctrlKey:true},{key:'Tab'},{key:'F6'},{key:'Escape'}]){
  globalKeys.mockClear();expect(fireEvent.keyDown(reader,stroke)).toBe(true);expect(globalKeys).toHaveBeenCalledOnce()
 }
 expect(screen.getAllByText('원문 진단 보존')).toHaveLength(31)
 expect(screen.getAllByRole('button',{name:'기술 정보'})).toHaveLength(31)
})
it('does not expose the reading viewport while the parent disclosure is closed',()=>{
 render(<StudioWarningReport label="검증 경고" title="반복 경고" fileName="generated.musicxml" theme="dark" details={{summary:'요약',title:'경고 상세',open:false,onOpenChange:vi.fn()}}><li>전체 원문</li></StudioWarningReport>)
 expect(screen.queryByRole('group',{name:'검증 경고 목록 읽기'})).not.toBeInTheDocument()
 expect(screen.getByRole('button',{name:'경고 상세'})).toHaveAttribute('aria-expanded','false')
})
