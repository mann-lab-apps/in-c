// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { pdfLayoutExceedsTarget } from './PdfSnapshot'

const plan = { targetPages: 2, overflowedTarget: false, renderWidth: 760, pageHeight: 1100 }
const root = (viewBox: string) => {
  const host=document.createElement('div');host.innerHTML=`<div class="notation-preview"><svg viewBox="${viewBox}"></svg></div>`;return host
}

it('checks the actual SVG aspect against the immutable paper budget without changing geometry or claiming an OS count', () => {
  const host=root('0 0 760 3000'),before=host.innerHTML,source=Object.freeze({...plan})
  expect(pdfLayoutExceedsTarget(host,source)).toBe(true)
  expect(host.innerHTML).toBe(before);expect(source).toEqual(plan)
  expect(pdfLayoutExceedsTarget(root('0 0 760 2200'),plan)).toBe(false)
  expect(pdfLayoutExceedsTarget(root('0 0 760 2201'),plan)).toBe(true)
})

it('uses the complete manual viewport width and tolerates subpixel rounding at the paper boundary', () => {
  expect(pdfLayoutExceedsTarget(root('-100 -20 1520 3000'),plan)).toBe(false)
  expect(pdfLayoutExceedsTarget(root('-100 -20 1520 4402'),plan)).toBe(true)
  expect(pdfLayoutExceedsTarget(root('0 0 760 2200.4'),plan)).toBe(false)
})

it('preserves auto and unavailable-metric policy and the existing planner overflow signal', () => {
  for(const value of ['0 0 0 100','0 0 760 NaN','0 0 760 -10'])expect(pdfLayoutExceedsTarget(root(value),plan)).toBe(false)
  expect(pdfLayoutExceedsTarget(root('0 0 760 5000'),{...plan,targetPages:undefined})).toBe(false)
  expect(pdfLayoutExceedsTarget(document.createElement('div'),{...plan,overflowedTarget:true})).toBe(true)
  expect(pdfLayoutExceedsTarget(root('0 0 760 5000'),{...plan,pageHeight:0})).toBe(false)
})
