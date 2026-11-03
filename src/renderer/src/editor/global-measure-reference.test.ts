import { expect, it } from 'vitest'
import { createGlobalMeasureResolver, resolveGlobalAnnotationMeasures } from './global-measure-reference'
import { musicXmlOrderFixture } from '../../../testing/musicxml-order-fixture'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMidi } from '../midi/serialize-midi'

it('resolves primary aliases without changing concrete owners or the saved score', () => {
  const score = musicXmlOrderFixture('system-text')
  const [primary, lower] = score.parts[0].staves
  score.systemTexts![0].measureId = 'measure-1'
  score.rehearsalMarks = [{id:'r',measureId:'measure-2',text:'B'}]
  score.tempoEvents = [{id:'t',measureId:'measure-2',tick:0,bpm:88}]
  score.staffTexts = [{id:'s',measureId:lower.measures[0].id,text:'Local'}]
  const native = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score)
  const resolve = createGlobalMeasureResolver(score), layout = resolveGlobalAnnotationMeasures(score, resolve)
  expect(resolve('measure-1')).toBe(primary.measures[0].id)
  expect(resolve(lower.measures[0].id)).toBe(lower.measures[0].id)
  expect(resolve('missing')).toBeUndefined()
  expect(layout.systemTexts![0]).toEqual({...score.systemTexts![0],measureId:primary.measures[0].id})
  expect(layout.rehearsalMarks![0].measureId).toBe(primary.measures[1].id)
  expect(layout.tempoEvents![0].measureId).toBe(primary.measures[1].id)
  expect(layout.parts).toBe(score.parts)
  expect(layout.staffTexts).toBe(score.staffTexts)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(serializeMidi(score)).toEqual(midi)
  expect(resolveGlobalAnnotationMeasures(layout)).toBe(layout)
})

it('rejects ambiguous concrete IDs and primary ordinals rather than borrowing another staff', () => {
  const score=musicXmlOrderFixture('system-text'), [primary, lower]=score.parts[0].staves
  primary.measures[1].number=1
  expect(createGlobalMeasureResolver(score)('measure-1')).toBeUndefined()
  lower.measures[0].id=primary.measures[0].id
  expect(createGlobalMeasureResolver(score)(primary.measures[0].id)).toBeUndefined()
  primary.measures[1].id='measure-1'
  expect(createGlobalMeasureResolver(score)('measure-1')).toBe('measure-1')
})
