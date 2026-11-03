// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { StudioPageSetup } from './StudioPageSetup'
import type { ScorePageSetup } from '../../score-core'

afterEach(cleanup)

it('studio.page-margin preserves a two-digit keyboard draft and commits once on Enter then blur',()=>{
  const change=vi.fn()
  function Editor(){
    const [value,setValue]=useState<Required<ScorePageSetup>>({pageSize:'a4',orientation:'portrait',pageMarginMm:8,staffSizePercent:100,systemSpacingPercent:100})
    return <StudioPageSetup theme="light" value={value} preset="" presets={[]} sizes={[{value:'a4',label:'A4'}]} orientations={[{value:'portrait',label:'세로'}]}
      onPreset={()=>{}} onChange={patch=>{change(patch);setValue(v=>({...v,...patch,pageMarginMm:Math.min(30,Math.max(3,patch.pageMarginMm??v.pageMarginMm))}))}}
      showGuides={false} onGuides={()=>{}} resetDisabled onReset={()=>{}} />
  }
  render(<Editor />)
  const field=screen.getByRole('spinbutton',{name:'PDF 여백 mm'})
  field.focus();fireEvent.change(field,{target:{value:'1'}})
  expect(field).toHaveValue(1)
  expect(change).not.toHaveBeenCalled()
  fireEvent.change(field,{target:{value:'17'}})
  fireEvent.keyDown(field,{key:'Enter',code:'Enter'});fireEvent.blur(field)
  expect(change).toHaveBeenCalledExactlyOnceWith({pageMarginMm:17})
  expect(field).toHaveValue(17)
})
