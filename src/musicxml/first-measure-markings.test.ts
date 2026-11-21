import { expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { createTempoRoundtripFixture } from '../testing/tempo-roundtrip-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const rows = [[10,20,30], [10,1,30], [3,2,1], [1,2,3]].flatMap(numbers => [false,true].map(hidden => ({numbers,hidden})))
const list = <T,>(value:T|T[]):T[] => Array.isArray(value) ? value : [value]
it.each(rows)('writes initial tempo and rhythm at the actual first measure for $numbers / hidden=$hidden', ({numbers,hidden}) => {
  const { score } = createTempoRoundtripFixture('global', 96)
  score.tempo = { ...score.tempo!, ...(hidden ? { transparent:true } : {}) }
  score.rhythmFeel = { unit:'eighth' }
  for (const part of score.parts) for (const staff of part.staves) staff.measures.forEach((bar,i) => { bar.number = numbers[i] })
  const before = encodeNativeProject(createNativeProject(score)), xml = serializeMusicXml(score), result = parseMusicXmlWithReport(xml)
  expect(result.score.tempo).toEqual(score.tempo)
  expect(result.score.rhythmFeel).toEqual(score.rhythmFeel)
  expect(result.score.tempoEvents).toBeUndefined()
  expect(result.report.warnings).toEqual([])
  expect(serializeMidi(result.score)).toEqual(serializeMidi(score))
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
  const document = new XMLParser({ignoreAttributes:false}).parse(xml)['score-partwise']
  for (const part of list<any>(document.part)) for (const [index,bar] of list<any>(part.measure).entries()) {
    const directions = bar.direction ? list<any>(bar.direction) : []
    const types = directions.flatMap(d => list<any>(d['direction-type'] ?? {}))
    expect(types.filter(type => type.metronome)).toHaveLength(index===0?1:0)
    expect(types.filter(type => String(typeof type.words === 'object' ? type.words['#text'] : type.words ?? '').includes('♫'))).toHaveLength(index===0?1:0)
  }
})
