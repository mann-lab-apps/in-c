import { expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXmlWithReport, serializeMusicXmlWithReport } from './index'
import { musicXmlOrderFixture } from '../testing/musicxml-order-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const parser=new XMLParser({ignoreAttributes:false})
const sizes={a4:[210,297],letter:[215.9,279.4]} as const
for(const pageSize of ['a4','letter'] as const)for(const orientation of ['portrait','landscape'] as const){
  it(`exchanges physical ${pageSize} ${orientation} without changing source or music`,()=>{
    const score=musicXmlOrderFixture('system-text'),staff=score.parts[0].staves[0]
    score.layout={systemBreakBeforeMeasureIds:[staff.measures[1].id],pageSetup:{pageSize,orientation,pageMarginMm:12.5}}
    const native=encodeNativeProject(createNativeProject(score)),midi=serializeMidi(score)
    const {contents,report}=serializeMusicXmlWithReport(score)
    const defaults=parser.parse(contents)['score-partwise'].defaults
    expect(defaults).toBeDefined()
    const [w,h]=sizes[pageSize],mm=defaults.scaling.millimeters/defaults.scaling.tenths
    expect(defaults['page-layout']['page-width']*mm).toBeCloseTo(orientation==='portrait'?w:h,5)
    expect(defaults['page-layout']['page-height']*mm).toBeCloseTo(orientation==='portrait'?h:w,5)
    expect(report.warnings).toEqual([])
    const imported=parseMusicXmlWithReport(contents)
    expect(imported.score.layout?.pageSetup).toEqual(score.layout.pageSetup)
    expect(imported.score.layout?.systemBreakBeforeMeasureIds).toEqual([imported.score.parts[0].staves[0].measures[1].id])
    expect(imported.report.warnings).toEqual([])
    expect(serializeMidi(imported.score)).toEqual(midi)
    expect(encodeNativeProject(createNativeProject(score))).toBe(native)
    expect(parseMusicXmlWithReport(serializeMusicXmlWithReport(imported.score).contents).score.layout).toEqual(imported.score.layout)
    const out=process.env.DDIRORI_PAGE_LAYOUT_QA_DIR
    if(out){const dir=join(out,`${pageSize}-${orientation}`);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.mid'),midi);writeFileSync(join(dir,'source.musicxml'),contents)}
  })
}

it.each([0,8,100])('preserves a margin-only explicit %i without inventing page dimensions',pageMarginMm=>{
  const score=musicXmlOrderFixture('tie');score.layout={pageSetup:{pageMarginMm}}
  const {contents,report}=serializeMusicXmlWithReport(score)
  expect(report.warnings).toEqual([])
  expect(contents).not.toContain('<page-width>')
  expect(parseMusicXmlWithReport(contents).score.layout?.pageSetup).toEqual({pageMarginMm})
})

it('keeps no page settings absent and reports only unsupported relative layout fields',()=>{
  const score=musicXmlOrderFixture('tie')
  expect(serializeMusicXmlWithReport(score).contents).not.toContain('<defaults>')
  score.layout={pageSetup:{pageSize:'letter',orientation:'landscape',pageMarginMm:8,staffSizePercent:90,systemSpacingPercent:120}}
  const {contents,report}=serializeMusicXmlWithReport(score)
  expect(report.warnings.map(w=>w.path)).toEqual(['score.layout.pageSetup'])
  expect(report.warnings[0].message).toMatch(/staff size|Staff size/)
  expect(parseMusicXmlWithReport(contents).score.layout?.pageSetup).toEqual({pageSize:'letter',orientation:'landscape',pageMarginMm:8})
})

function external(defaults:string,print=''){
  const contents=serializeMusicXmlWithReport(musicXmlOrderFixture('tie')).contents
  return contents.replace('<part-list>',`<defaults>${defaults}</defaults><part-list>`).replace('<measure number="1">',`<measure number="1">${print}`)
}
const scale='<scaling><millimeters>7</millimeters><tenths>40</tenths></scaling>'
function margins(values:number[],type='both'){return `<page-margins type="${type}">${['left','right','top','bottom'].map((side,i)=>`<${side}-margin>${values[i]}</${side}-margin>`).join('')}</page-margins>`}

it('reads equivalent odd/even margins and known dimensions with exporter precision',()=>{
  const xml=external(`${scale}<page-layout><page-height>1696.72</page-height><page-width>1200.33</page-width>${margins([85.7143,85.7143,85.7143,85.7143],'odd')}${margins([85.7143,85.7143,85.7143,85.7143],'even')}</page-layout>`)
  const {score,report}=parseMusicXmlWithReport(xml)
  expect(score.layout?.pageSetup).toEqual({pageSize:'a4',orientation:'portrait',pageMarginMm:15})
  expect(report.warnings).toEqual([])
})

it.each([
  ['',margins([40,40,40,40]),'scaling'],
  ['<scaling><millimeters>0</millimeters><tenths>40</tenths></scaling>',margins([40,40,40,40]),'scaling'],
  [scale,margins([40,60,40,40]),'page-margins'],
  [scale,margins([40,40,40,40],'odd')+margins([60,60,60,60],'even'),'page-margins'],
  [scale,margins([-40,-40,-40,-40]),'page-margins'],
  [scale,'<page-height>1000</page-height><page-width>1000</page-width>','page-layout']
])('does not clamp or guess unsupported physical settings: %s %s',(scaling,layout,path)=>{
  const {score,report}=parseMusicXmlWithReport(external(`${scaling}<page-layout>${layout}</page-layout>`))
  expect(score.layout?.pageSetup).toBeUndefined()
  expect(report.warnings).toEqual(expect.arrayContaining([expect.objectContaining({code:'unsupported-layout',path:`defaults.${path==='scaling'?'scaling':`page-layout${path==='page-margins'?'.page-margins':''}`}`})]))
})

it('keeps supported margins when paper is custom and reports page-specific overrides separately',()=>{
  const xml=external(`${scale}<page-layout><page-height>1000</page-height><page-width>1000</page-width>${margins([40,40,40,40])}</page-layout>`,
    '<print><page-layout><page-margins><left-margin>1</left-margin><right-margin>2</right-margin><top-margin>3</top-margin><bottom-margin>4</bottom-margin></page-margins></page-layout></print>')
  const {score,report}=parseMusicXmlWithReport(xml)
  expect(score.layout?.pageSetup).toEqual({pageMarginMm:7})
  expect(report.warnings.map(w=>w.path)).toEqual(['print.page-layout','defaults.page-layout'])
})
