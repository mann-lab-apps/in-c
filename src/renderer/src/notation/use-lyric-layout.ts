import { useEffect, useMemo, useState } from 'react'
import type { Score } from '../../../score-core'
import { createStaveNote } from './NotationPreview'
import { lyricDisplayText, minimumLyricColumnWidth } from './lyric-spacing'
import { spacedHarmonies, type HarmonySpacingWidths } from './harmony-spacing'
import { createSharedRepeatBarlines } from './repeat-barlines'
import type { MeasureWidthRequirements } from './system-layout'

const empty:ReadonlyMap<string,number>=new Map()

export function supportsAutomaticLyricSpacing(score:Score):boolean {
  return score.parts.some(part => part.staves.length > 0)
}

export function useLyricWidths(score:Score,contextKey='',enabled=true):{widths:ReadonlyMap<string,number>;ready:boolean} {
  const words=useMemo(()=>enabled?[...new Set(score.parts.flatMap(part=>part.staves.flatMap(staff=>staff.measures.flatMap(measure=>measure.voices.flatMap(voice=>voice.events.flatMap(event=>event.type==='note'?(event.lyrics??[]).map(lyricDisplayText):[]))))))].sort():[],[score,enabled])
  return useMeasuredTextWidths(words,contextKey,'.notation-preview .notation-lyric')
}

export function useHarmonyWidths(score:Score,contextKey=''):{widths:ReadonlyMap<string,number>;ready:boolean} {
  const words=useMemo(()=>[...new Set(spacedHarmonies(score).map(h=>h.text))].sort(),[score])
  return useMeasuredTextWidths(words,contextKey,'.notation-preview .notation-harmony-mark')
}

function useMeasuredTextWidths(words:string[],contextKey:string,selector:string) {
  const wordSignature=JSON.stringify(words)
  const signature=JSON.stringify([contextKey,selector,words])
  const [measured,setMeasured]=useState<{signature:string;widths:ReadonlyMap<string,number>}>()
  useEffect(()=>{
    if(!words.length||!document.fonts)return
    let cancelled=false
    const unavailable=()=>{if(!cancelled)setMeasured({signature,widths:empty})}
    void document.fonts.ready.then(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))).then(()=>{
      if(cancelled)return
      const actual=document.querySelector<SVGGraphicsElement>(selector)
      if(!actual||typeof actual.getBBox!=='function'){unavailable();return}
      const style=getComputedStyle(actual),svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
      svg.setAttribute('aria-hidden','true');svg.setAttribute('data-notation-text-metrics','true')
      Object.assign(svg.style,{position:'fixed',left:'0',top:'0',width:'1px',height:'1px',visibility:'hidden',pointerEvents:'none'})
      document.body.append(svg)
      const widths=new Map<string,number>()
      try{
        for(const word of JSON.parse(wordSignature) as string[]){
          const text=document.createElementNS(svg.namespaceURI,'text') as SVGTextElement
          for(const property of ['font-family','font-size','font-weight','font-style','font-stretch','font-variant','font-feature-settings','font-variation-settings','letter-spacing','word-spacing','text-rendering'])text.style.setProperty(property,style.getPropertyValue(property))
          text.textContent=word;svg.append(text);const width=text.getBBox().width
          if(Number.isFinite(width)&&width>0)widths.set(word,width)
          text.remove()
        }
      }finally{svg.remove()}
      if(!cancelled)setMeasured({signature,widths})
    }).catch(unavailable)
    return()=>{cancelled=true}
  },[signature])
  const widths=measured?.signature===signature?measured.widths:empty
  return {widths,ready:!words.length||!document.fonts||measured?.signature===signature}
}

export function minimumLyricScoreWidths(score:Score,widths:ReadonlyMap<string,number>):ReadonlyMap<string,number> {
  return minimumTextScoreWidths(score,widths)
}

export function useMinimumTextScoreWidths(score:Score,widths:ReadonlyMap<string,number>,harmonies?:HarmonySpacingWidths):MeasureWidthRequirements {
  const [fontRevision,setFontRevision]=useState(0)
  useEffect(()=>{
    const fonts=document.fonts
    if(!fonts)return
    let active=true
    const refresh=()=>{if(active)setFontRevision(revision=>revision+1)}
    void fonts.ready.then(refresh,()=>{})
    fonts.addEventListener?.('loadingdone',refresh)
    return()=>{active=false;fonts.removeEventListener?.('loadingdone',refresh)}
  },[])
  return useMemo(()=>minimumTextScoreWidths(score,widths,harmonies),[score,widths,harmonies,fontRevision])
}

export function minimumTextScoreWidths(score:Score,widths:ReadonlyMap<string,number>,harmonies?:HarmonySpacingWidths):MeasureWidthRequirements {
  if(!supportsAutomaticLyricSpacing(score))return empty
  const minima=new Map<string,number>(),primary=score.parts[0]?.staves[0]?.measures??[]
  const staves = score.parts.flatMap(part => part.staves)
  const repeatBarlines = createSharedRepeatBarlines(score)
  const systemStart = new Map<string, number>()
  primary.forEach((measure, index) => {
    const column = staves.flatMap(staff => {
      const bar = staff.measures[index]
      return bar ? [{...bar, repeat:repeatBarlines ? repeatBarlines.get(bar.id) : bar.repeat}] : []
    })
    systemStart.set(measure.id, minimumLyricColumnWidth(column, widths,
      (event, bar, voice) => createStaveNote(event, bar, voice, new Set()), harmonies,
      { isSystemStart:true, previousMeasures:staves.flatMap(staff => staff.measures[index] ? [staff.measures[index - 1]] : []) }))
    const changedHeader = index > 0 && staves.some(staff => {
      const bar = staff.measures[index], previous = staff.measures[index - 1]
      return bar && previous && (
        bar.clef.sign !== previous.clef.sign || bar.clef.line !== previous.clef.line ||
        bar.clef.octaveChange !== previous.clef.octaveChange ||
        bar.keySignature.fifths !== previous.keySignature.fifths || bar.keySignature.mode !== previous.keySignature.mode ||
        bar.timeSignature.beats !== previous.timeSignature.beats || bar.timeSignature.beatType !== previous.timeSignature.beatType)
    })
    // A repeat-begin or changed signature consumes space even without text.
    // Reuse the existing formatter minimum rather than letting its final notes
    // spill into the next measure. Match the renderer's shared marking owners.
    if(!widths.size&&!changedHeader&&!column.some(m=>harmonies?.has(m.id)||m.repeat?.start))return
    minima.set(measure.id, minimumLyricColumnWidth(column, widths,
      (event, bar, voice) => createStaveNote(event, bar, voice, new Set()),harmonies))
  })
  return Object.assign(minima, { systemStart })
}
