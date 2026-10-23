import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { createNewScore } from '../renderer/src/editor/new-score'
import { createDuration, createNote, createTimePosition, TICKS_PER_QUARTER } from '../score-core'
import { parseMusicXml, serializeMusicXml } from './index'

const parser = new XMLParser({ ignoreAttributes: false })
function fixture(templateId: 'solo-melody' | 'piano-grand-staff' | 'string-quartet' = 'solo-melody', measureCount = 4) {
  return createNewScore({ title: 'Sparse attributes', templateId, measureCount,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
}
const parts = (xml: string) => [parser.parse(xml)['score-partwise'].part].flat()

describe('MusicXML sparse attributes', () => {
  it.each(['solo-melody', 'piano-grand-staff', 'string-quartet'] as const)('emits initial attributes per part without repeating unchanged %s settings', template => {
    const score = fixture(template)
    const before = JSON.stringify(score)
    const xml = serializeMusicXml(score)
    for (const part of parts(xml)) {
      expect(part.measure[0].attributes).toMatchObject({ divisions: TICKS_PER_QUARTER, key: { fifths: 0 }, time: { beats: 4, 'beat-type': 4 } })
      expect(part.measure.slice(1).map((measure: { attributes?: unknown }) => measure.attributes)).toEqual([undefined, undefined, undefined])
    }
    expect(parseMusicXml(xml).parts.map(part => part.staves.map(staff => staff.measures.map(measure => measure.clef))))
      .toEqual(score.parts.map(part => part.staves.map(staff => staff.measures.map(measure => measure.clef))))
    expect(JSON.stringify(score)).toBe(before)
  })

  it('preserves real key/time/clef changes and return-to-default boundaries', () => {
    const score = fixture()
    const measures = score.parts[0]!.staves[0]!.measures
    for (const measure of measures.slice(1, 3)) {
      measure.keySignature = { fifths: 4, mode: 'major' }
      measure.timeSignature = { beats: 3, beatType: 4 }
      measure.clef = { sign: 'F', line: 4 }
    }
    const xml = serializeMusicXml(score), nodes = parts(xml)[0].measure
    expect(nodes[1].attributes).toEqual({ key: { fifths: 4, mode: 'major' }, time: { beats: 3, 'beat-type': 4 }, clef: { sign: 'F', line: 4 } })
    expect(nodes[2].attributes).toBeUndefined()
    expect(nodes[3].attributes).toEqual({ key: { fifths: 0 }, time: { beats: 4, 'beat-type': 4 }, clef: { sign: 'G', line: 2 } })
    expect(parseMusicXml(xml).parts[0]!.staves[0]!.measures.map(({ keySignature, timeSignature, clef }) => ({ keySignature, timeSignature, clef })))
      .toEqual(measures.map(({ keySignature, timeSignature, clef }) => ({ keySignature, timeSignature, clef })))
  })

  it('numbers isolated grand-staff clef/transposition changes and emits an explicit zero reset', () => {
    const score = fixture('piano-grand-staff', 5)
    const lower = score.parts[0]!.staves[1]!.measures
    for (const measure of lower.slice(1, 3)) {
      measure.clef = { sign: 'G', line: 2, octaveChange: -1 }
      measure.transposition = { diatonic: -1, chromatic: -2, octaveChange: -1 }
    }
    const xml = serializeMusicXml(score), nodes = parts(xml)[0].measure
    expect(nodes[1].attributes).toEqual({
      clef: { '@_number': '2', sign: 'G', line: 2, 'clef-octave-change': -1 },
      transpose: { '@_number': '2', diatonic: -1, chromatic: -2, 'octave-change': -1 }
    })
    expect(nodes[2].attributes).toBeUndefined()
    expect(nodes[3].attributes).toEqual({ clef: { '@_number': '2', sign: 'F', line: 4 }, transpose: { '@_number': '2', chromatic: 0 } })
    expect(nodes[4].attributes).toBeUndefined()
    const reopened = parseMusicXml(xml).parts[0]!
    expect(reopened.staves[0]!.measures.every(measure => !measure.transposition)).toBe(true)
    expect(reopened.staves[1]!.measures[2]!.transposition).toEqual(lower[2]!.transposition)
    expect(reopened.staves[1]!.measures[3]!.transposition).toMatchObject({ chromatic: 0 })
    expect(reopened.staves.map(staff => staff.measures.map(measure => measure.clef)))
      .toEqual(score.parts[0]!.staves.map(staff => staff.measures.map(measure => measure.clef)))
  })

  it('compares the next measure clef against the last emitted inline clef', () => {
    const score = fixture()
    const measures = score.parts[0]!.staves[0]!.measures
    measures[0]!.voices[0]!.events = [0, 1].map(index => createNote({
      id: `inline-${index}`, pitch: { step: 'C', octave: 4 }, duration: createDuration('half'),
      position: createTimePosition(index * 2 * TICKS_PER_QUARTER),
      ...(index ? { clefBefore: { sign: 'F' as const, line: 4 } } : {})
    }))
    measures[1]!.clef = { sign: 'F', line: 4 }
    const xml = serializeMusicXml(score), nodes = parts(xml)[0].measure
    expect(nodes[0].attributes).toHaveLength(2)
    expect(nodes[1].attributes).toBeUndefined()
    expect(nodes[2].attributes).toEqual({ clef: { sign: 'G', line: 2 } })
    expect(nodes[3].attributes).toBeUndefined()
    const reopened = parseMusicXml(xml).parts[0]!.staves[0]!.measures
    expect(reopened.map(measure => measure.clef)).toEqual(measures.map(measure => measure.clef))
    expect(reopened[0]!.voices[0]!.events[1]!.clefBefore).toEqual({ sign: 'F', line: 4 })
  })
})
