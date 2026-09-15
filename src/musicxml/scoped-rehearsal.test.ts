import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { parseMusicXml, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import fixture from './fixtures/expanded-v1-part-export.musicxml?raw'

describe('scoped rehearsal mark interchange', () => {
  it('preserves equal text on different parts/staves instead of merging it globally', () => {
    const score = parseMusicXml(fixture)
    const targets = score.parts.flatMap(part => part.staves.map(staff => staff.measures[0]))
    expect(targets.length).toBeGreaterThan(2)
    score.rehearsalMarks = targets.map((measure, index) => ({ id: `local-${index}`, measureId: measure.id, text: 'A' }))
    score.rehearsalMarks.push({ id: 'global', measureId: 'measure-2', text: 'Global' })
    const before = structuredClone(score)
    const output = serializeMusicXml(score)
    const reopened = parseMusicXml(output)
    const actualTargets = reopened.parts.flatMap(part => part.staves.map(staff => staff.measures[0]))
    expect(reopened.rehearsalMarks?.filter(mark => mark.text === 'A').map(mark => mark.measureId).sort())
      .toEqual(actualTargets.map(measure => measure.id).sort())
    expect(reopened.rehearsalMarks?.filter(mark => mark.text === 'Global')).toHaveLength(1)
    const document = new XMLParser({ ignoreAttributes: false, isArray: name => ['part', 'measure', 'direction', 'direction-type'].includes(name) }).parse(output)
    const directions = document['score-partwise'].part.flatMap((part: any) => part.measure.flatMap((measure: any) => measure.direction ?? []))
    expect(directions.filter((direction: any) => direction['direction-type'].some((type: any) => type.rehearsal === 'A')))
      .toEqual(expect.arrayContaining([expect.objectContaining({ '@_system': 'none', staff: 2 })]))
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(JSON.parse(JSON.stringify(score)))
    expect(score).toEqual(before)
  })
})
