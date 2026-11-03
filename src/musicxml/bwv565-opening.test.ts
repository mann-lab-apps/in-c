import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'

const source = readFileSync('docs/brand/ddirori-brand-system/score-reference/bwv565-opening.musicxml', 'utf8')

describe('BWV 565 opening, real Studio marketing score', () => {
  it('retains the opening upper mordents, octave notes, fermatas and short durations without conversion warnings', () => {
    const { score, report } = parseMusicXmlWithReport(source)
    expect(report.warnings).toEqual([])
    const events = score.parts.flatMap(p => p.staves.flatMap(s => s.measures.flatMap(m => m.voices.flatMap(v => v.events))))
    const ornaments = events.filter(e => e.type === 'note' && e.ornaments?.length)
    expect(ornaments).toHaveLength(3)
    for (const e of ornaments) expect(e.type === 'note' && e.ornaments).toEqual(['inverted-mordent'])
    expect(events.filter(e => e.fermata)).toHaveLength(6)
    const opening = events.find(e => e.type === 'note')!
    expect(opening.type === 'note' && opening.pitches).toEqual(expect.arrayContaining([
      { step: 'A', octave: 5 }, { step: 'A', octave: 4 }
    ]))
    expect(events.filter(e => e.type === 'note' && e.duration.value === '64th')).toHaveLength(4)
    expect(score.parts.map(p => p.staves.length)).toEqual([2, 1])
    const exported = serializeMusicXml(score)
    // The opening octave chord exports the shared notation on both members.
    expect(exported.match(/<inverted-mordent\s*\/>/g)).toHaveLength(4)
    const reopened = parseMusicXmlWithReport(exported)
    expect(reopened.report.warnings).toEqual([])
    expect(reopened.score.parts).toEqual(score.parts)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  })
})
