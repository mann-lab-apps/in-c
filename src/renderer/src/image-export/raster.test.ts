// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { rasterizePngPages } from './raster'
import { PngPageRangeError } from './pages'
import { resolvePrintLayoutPlan } from '../notation/print-layout'
import { createReleaseTestScore } from '../../../testing/single-voice-mvp-fixture'

it.each([4,0,-1,NaN])('reports actual physical page count before font/image allocation for selection %s',async selected=>{
  const root=document.createElement('div');root.innerHTML='<div class="score-page"></div>';document.body.append(root)
  const host=root.firstElementChild as HTMLElement,paper={pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:10,staffSizePercent:100,systemSpacingPercent:100}
  const plan={...resolvePrintLayoutPlan(createReleaseTestScore(),'auto'),pageSetup:paper}
  host.getBoundingClientRect=()=>({width:750,height:750*277/190*3} as DOMRect)
  const previous=Object.getOwnPropertyDescriptor(document,'fonts');Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}})
  const progress:number[]=[];const before=root.innerHTML
  try{
    const result=rasterizePngPages(root,plan,150,selected,()=>true,n=>progress.push(n))
    await expect(result).rejects.toMatchObject({name:'PngPageRangeError',totalPages:3})
    await expect(result).rejects.toBeInstanceOf(PngPageRangeError)
    expect(progress).toEqual([]);expect(root.innerHTML).toBe(before)
  }finally{if(previous)Object.defineProperty(document,'fonts',previous);else Reflect.deleteProperty(document,'fonts');root.remove()}
})
