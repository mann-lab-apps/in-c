import { expect, it } from 'vitest'
import { measureDynamicsFixture } from '../../../testing/measure-dynamics-fixture'
import { describeEmptyMusicXmlMeasure } from './musicxml-empty-measure'

it('identifies remaining empty voices without describing filled voices as empty',()=>{
  const {source}=measureDynamicsFixture(),measure=source.parts[0].staves[0].measures[0]
  measure.voices.push({id:'voice-2',events:[]},{id:'voice-4',events:[]})
  const before=structuredClone(source),error=describeEmptyMusicXmlMeasure(source,'measure 1의 리듬 정합성이 올바르지 않습니다: gap')!
  expect(error).toBeDefined();expect(error.message).toContain('빈 성부가 있어');expect(error.message).toContain('Piano · 보표 1 · 1마디');expect(error.message).toContain('2성부, 4성부')
  expect(error.message).not.toContain('gap');expect(error.technicalMessage).toContain('voices[1]');expect(error.technicalMessage).toContain('voices[2]');expect(source).toEqual(before)
  measure.voices[0].events.pop()
  expect(describeEmptyMusicXmlMeasure(source,'measure 1의 리듬 정합성이 올바르지 않습니다: gap')).toBeUndefined()
})

it('labels the actual secondary-staff empty measure without changing authored data', () => {
  const { source } = measureDynamicsFixture()
  source.parts[0].staves[1].measures[3].voices[0].events = []
  const before = structuredClone(source), raw = 'measure 4의 리듬 정합성이 올바르지 않습니다: empty'
  const error = describeEmptyMusicXmlMeasure(source, raw)!
  expect(error.message).toContain('Piano · 보표 2 · 4마디')
  expect(error.message).toContain('음표나 쉼표로 마디를 채운 뒤')
  expect(error.message).not.toContain('empty')
  expect(error.technicalMessage).toContain(raw)
  expect(error.technicalMessage).toContain('parts[0].staves[1].measures[3]')
  expect(source).toEqual(before)
})

it('does not relabel unrelated failures, complete measures, or an earlier non-empty rhythm defect', () => {
  const { source } = measureDynamicsFixture()
  expect(describeEmptyMusicXmlMeasure(source, 'measure 4의 리듬 정합성이 올바르지 않습니다: empty')).toBeUndefined()
  source.parts[0].staves[1].measures[3].voices[0].events = []
  expect(describeEmptyMusicXmlMeasure(source, 'Disk unavailable')).toBeUndefined()
  source.parts[0].staves[0].measures[0].voices[0].events.pop()
  expect(describeEmptyMusicXmlMeasure(source, 'measure 4의 리듬 정합성이 올바르지 않습니다: empty')).toBeUndefined()
})
