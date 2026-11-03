import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../../../musicxml'
import fixture from '../../../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'
import { resolveMeasureAnnotationLanes } from './annotation-lanes'
import { createStaffAnnotationSpacing } from './staff-annotation-spacing'
import { createNote, createScore } from '../../../score-core'

const twoPartFixture = () => {
  const score = parseMusicXml(fixture)
  const piano=score.parts[1]
  score.parts = [{...piano,staves:[piano.staves[0]]},{...piano,id:'independent-lower-part',name:'Lower',staves:[piano.staves[1]]}]
  const upper = score.parts[0].staves[0].measures[0].id
  const lower = score.parts[1].staves[0].measures[0].id
  const lanes = new Map([
    [upper, resolveMeasureAnnotationLanes({ harmonyCount: 1, lyricLineCount: 1 })],
    [lower, resolveMeasureAnnotationLanes({ hasStaffText: true })]
  ])
  return { score, lanes, upper, lower }
}
// Recorded real font envelopes; these numbers are not font-approval in jsdom.
const measuredInk = (kind: string) => kind === 'notation-staff-label' ? { y: -24, height: 48 }
  : kind === 'notation-staff-text' || kind === 'notation-lyric' ? { y: -26, height: 52 } : { y: -14, height: 18 }

describe('measured staff annotation spacing', () => {
  it('measures a later staff text rather than only the first same-measure entry',()=>{
    const score=createScore(),upper=score.parts[0].staves[0].measures[0]
    upper.voices[0].events=[{...createNote({id:'upper',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}}),lyrics:[{text:'line'}]}]
    const lower=structuredClone(score.parts[0]);lower.id='lower';lower.name='Lower';lower.staves[0].id='lower-staff';lower.staves[0].measures[0].id='lower-measure';lower.staves[0].measures[0].voices[0].events=[createNote({id:'lower-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})];score.parts.push(lower)
    score.staffTexts=[{id:'short',measureId:'lower-measure',text:'short'},{id:'tall',measureId:'lower-measure',text:'tall'}]
    const before=structuredClone(score),lanes=new Map([[upper.id,resolveMeasureAnnotationLanes({lyricLineCount:1})],['lower-measure',resolveMeasureAnnotationLanes({hasStaffText:true,staffTextCount:2})]])
    const result=createStaffAnnotationSpacing(score,lanes,(kind,text)=>kind==='notation-staff-text'&&text==='tall'?{y:-100,height:110}:{y:-10,height:12})
    expect(result.measured).toBe(true);expect(result.offsets[1]-24-100).toBeGreaterThanOrEqual(116+2+8);expect(score).toEqual(before)
  })
  it('reserves the shifted lyric bottom even without competing upper annotations', () => {
    const score = createScore(), measure = score.parts[0].staves[0].measures[0]
    measure.voices[0].events = [{ ...createNote({ id: 'low-voice', pitch: { step: 'F', octave: 4 } }), lyrics: [{ number: 1, text: '함께' }, { number: 2, text: '둘이' }] }]
    const before = structuredClone(score), lanes = new Map([[measure.id, resolveMeasureAnnotationLanes({ lyricLineCount: 2 })]])
    const measureInk = () => ({ y: -10, height: 13 })
    expect(createStaffAnnotationSpacing(score, lanes, measureInk).measured).toBe(false)
    const shifted = createStaffAnnotationSpacing(score, lanes, measureInk, 1, new Map([[0, 30]]))
    expect(shifted.measured).toBe(true)
    expect(shifted.requiredBelow).toBe(165)
    expect(shifted.minimumSystemHeight).toBeGreaterThanOrEqual(173)
    expect(score).toEqual(before)
  })
  it('keeps the lower label above its text and both clear of upper staff/lyric ink without changing music', () => {
    const { score, lanes } = twoPartFixture(), before = structuredClone(score)
    const result = createStaffAnnotationSpacing(score, lanes, measuredInk)
    expect(result.measured).toBe(true)
    const nameTop = result.offsets[1] + result.labelBaselines[1] - 24
    const nameBottom = nameTop + 48
    const textTop = result.offsets[1] - 24 - 26
    expect(nameTop).toBeGreaterThanOrEqual(116 + 26 + 8)
    expect(nameBottom).toBeLessThanOrEqual(textTop - 6)
    expect(textTop).toBeGreaterThan(80)
    expect(result.requiredAbove).toBeGreaterThanOrEqual(-result.labelBaselines[0] + 24)
    expect(score).toEqual(before)
  })

  it.each([undefined, { y: 0, height: 0 }, { y: Number.NaN, height: 20 }])('retains existing spacing for unavailable or invalid font ink %j', metrics => {
    const { score, lanes } = twoPartFixture()
    expect(createStaffAnnotationSpacing(score, lanes, () => metrics)).toMatchObject({ offsets: [0, 96], labelBaselines: [-12, -12], measured: false })
  })

  it('does not alter an unannotated single-staff layout or request hidden staff-name metrics', () => {
    const score = createScore(), lanes = new Map()
    expect(createStaffAnnotationSpacing(score, lanes, () => { throw Error('unused') })).toMatchObject({ offsets: [0], labelBaselines: [-12], measured: false })
  })

  it('keeps lyric-only single-staff spacing on its established path without upper text', () => {
    const score = createScore(), measure = score.parts[0].staves[0].measures[0]
    const lanes = new Map([[measure.id, resolveMeasureAnnotationLanes({ lyricLineCount: 1 })]])
    expect(createStaffAnnotationSpacing(score, lanes, () => { throw Error('unused') })).toMatchObject({ offsets: [0], measured: false })
  })

  it('does not reserve absent lyrics below a single staff just because upper text exists', () => {
    const score = createScore(), measure = score.parts[0].staves[0].measures[0]
    score.harmonies = [{ id: 'h', measureId: measure.id, tick: 0, text: 'C' }]
    const lanes = new Map([[measure.id, resolveMeasureAnnotationLanes({ harmonyCount: 1 })]])
    expect(createStaffAnnotationSpacing(score, lanes, () => { throw Error('unused') })).toMatchObject({ offsets: [0], measured: false, minimumSystemHeight: 154 })
  })

  it('uses actual print lyric scale in its lower envelope and is deterministic on repeated calls', () => {
    const { score, lanes } = twoPartFixture()
    const normal = createStaffAnnotationSpacing(score, lanes, measuredInk)
    const scaled = createStaffAnnotationSpacing(score, lanes, measuredInk, 0.82)
    expect(scaled.offsets[1]).toBeLessThan(normal.offsets[1])
    expect(createStaffAnnotationSpacing(score, lanes, measuredInk, 0.82)).toEqual(scaled)
  })

  it('reserves the following system name envelope past the preceding lower staff and annotation ink', () => {
    const { score, lanes } = twoPartFixture()
    const result = createStaffAnnotationSpacing(score, lanes, measuredInk)
    const followingNameTop = result.minimumSystemHeight + result.labelBaselines[0] - 24
    expect(followingNameTop).toBeGreaterThanOrEqual(result.offsets[1] + result.requiredBelow + 8)
    expect(followingNameTop).toBeGreaterThan(result.offsets[1] + 80)
  })

  it('reserves a single staff lyric bottom before the following system chord top without measuring a hidden staff name', () => {
    const score = createScore(), measure = score.parts[0].staves[0].measures[0]
    measure.voices[0].events = [{ ...createNote({ id: 'n', duration: { value: 'whole', dots: 0 },
      pitch: { step: 'C', octave: 4 } }), lyrics: [{ text: '함께' }] }]
    score.harmonies = [{ id: 'h', measureId: measure.id, tick: 0, text: 'Cmaj7/Gb' }]
    const lanes = new Map([[measure.id, resolveMeasureAnnotationLanes({ harmonyCount: 1, lyricLineCount: 1 })]])
    const before = structuredClone(score)
    const result = createStaffAnnotationSpacing(score, lanes, kind => {
      expect(kind).not.toBe('notation-staff-label')
      return kind === 'notation-lyric' ? { y: -12, height: 16 } : { y: -14.5, height: 18 }
    })
    expect(result.measured).toBe(true)
    expect(result.minimumSystemHeight - 42 - 14.5).toBeGreaterThanOrEqual(116 - 12 + 16 + 8)
    expect(result.offsets).toEqual([0])
    expect(score).toEqual(before)
  })

  it('does not reserve a made-up lower staff name while retaining upper lyrics and lower text clearance', () => {
    const {score,lanes}=twoPartFixture(),parts=structuredClone(score.parts)
    score.parts=[{...parts[0],staves:[parts[0].staves[0],parts[1].staves[0]]}]
    const before=structuredClone(score),names:string[]=[]
    const actual=createStaffAnnotationSpacing(score,lanes,(kind,text)=>{
      if(kind==='notation-staff-label')names.push(text)
      return measuredInk(kind)
    })
    expect(names).not.toContain('Staff 2')
    expect(names).not.toContain('Lower')
    const lowerTextTop=actual.offsets[1]-24-26
    expect(lowerTextTop).toBeGreaterThanOrEqual(116+26+8)
    expect(score).toEqual(before)
  })
})
