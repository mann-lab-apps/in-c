import type { ScorePageSetup } from '../score-core'

type XmlNode = Record<string, unknown>
export interface PageLayoutWarning { code: 'unsupported-layout'; message: string; path: string }
const paperMm = { a4:[210,297], letter:[215.9,279.4] } as const
// MusicXML's standard example physical scale: a 40-tenths staff is 7 mm.
const tenthsPerMm = 40 / 7
const decimal = (value:number) => Number(value.toFixed(5))
const object = (value:unknown):XmlNode|undefined => value && typeof value==='object'&&!Array.isArray(value)?value as XmlNode:undefined
const array = (value:unknown):unknown[] => value===undefined?[]:Array.isArray(value)?value:[value]
const number = (value:unknown):number|undefined => {
  if(typeof value!=='number'&&(typeof value!=='string'||!value.trim()))return undefined
  const result=Number(value);return Number.isFinite(result)?result:undefined
}

export function buildMusicXmlPageDefaults(setup:ScorePageSetup|undefined):XmlNode|undefined {
  if(!setup || (setup.pageSize===undefined&&setup.orientation===undefined&&setup.pageMarginMm===undefined))return undefined
  const layout:XmlNode={}
  if(setup.pageSize!==undefined||setup.orientation!==undefined){
    const [short,long]=paperMm[setup.pageSize??'a4']
    layout['page-height']=decimal((setup.orientation==='landscape'?short:long)*tenthsPerMm)
    layout['page-width']=decimal((setup.orientation==='landscape'?long:short)*tenthsPerMm)
  }
  if(setup.pageMarginMm!==undefined){
    const margin=decimal(setup.pageMarginMm*tenthsPerMm)
    layout['page-margins']={'@_type':'both','left-margin':margin,'right-margin':margin,'top-margin':margin,'bottom-margin':margin}
  }
  return {scaling:{millimeters:7,tenths:40},'page-layout':layout}
}

/** Only score-wide physical fields representable by the existing native model.
 * Do not average asymmetric pages or infer a scale from a paper aspect ratio. */
export function readMusicXmlPageDefaults(root:XmlNode):{pageSetup:ScorePageSetup|undefined;warnings:PageLayoutWarning[]} {
  const warnings:PageLayoutWarning[]=[],defaults=object(root.defaults),layout=object(defaults?.['page-layout'])
  const warn=(path:string,message:string)=>warnings.push({code:'unsupported-layout',path,message})
  for(const part of array(root.part))for(const measure of array(object(part)?.measure))for(const print of array(object(measure)?.print)){
    if(object(print)?.['page-layout']!==undefined){warn('print.page-layout','Page-specific page layout is not represented by the score-wide page settings.');break}
  }
  if(!layout)return {pageSetup:undefined,warnings}
  const scaling=object(defaults?.scaling),mm=number(scaling?.millimeters),tenths=number(scaling?.tenths)
  if(mm===undefined||tenths===undefined||mm<=0||tenths<=0||!Number.isFinite(mm/tenths)||mm/tenths<=0){
    warn('defaults.scaling','Physical page settings require a positive millimeters/tenths scale; no scale was inferred.')
    return {pageSetup:undefined,warnings}
  }
  const ratio=mm/tenths,setup:ScorePageSetup={}
  if(layout['page-height']!==undefined||layout['page-width']!==undefined){
    const width=number(layout['page-width']),height=number(layout['page-height'])
    const physicalWidth=width===undefined?NaN:width*ratio,physicalHeight=height===undefined?NaN:height*ratio
    // External exporters round tenths. Accept at most 0.1 mm of known paper
    // rounding, never arbitrary/custom paper by its ratio alone.
    for(const [pageSize,[short,long]] of Object.entries(paperMm))for(const orientation of ['portrait','landscape'] as const){
      if(Math.abs(physicalWidth-(orientation==='portrait'?short:long))<=0.1&&Math.abs(physicalHeight-(orientation==='portrait'?long:short))<=0.1){
        setup.pageSize=pageSize as ScorePageSetup['pageSize'];setup.orientation=orientation
      }
    }
    if(!setup.pageSize)warn('defaults.page-layout','Custom or incomplete paper dimensions are not represented by A4/Letter settings.')
  }
  const margins=array(layout['page-margins']).map(object)
  if(margins.length){
    const both=margins.length===1&&(margins[0]?.['@_type']===undefined||margins[0]?.['@_type']==='both')
    const oddEven=margins.length===2&&margins.some(m=>m?.['@_type']==='odd')&&margins.some(m=>m?.['@_type']==='even')
    const values=margins.flatMap(m=>['left','right','top','bottom'].map(side=>{const v=number(m?.[`${side}-margin`]);return v===undefined?NaN:v*ratio}))
    const first=values[0]
    if((both||oddEven)&&values.every(v=>Number.isFinite(v)&&v>=0&&v<=100&&Math.abs(v-first)<=0.00001))setup.pageMarginMm=decimal(first)
    else warn('defaults.page-layout.page-margins','Asymmetric, incomplete or unsupported page margins were not averaged or clamped.')
  }
  return {pageSetup:Object.keys(setup).length?setup:undefined,warnings}
}
