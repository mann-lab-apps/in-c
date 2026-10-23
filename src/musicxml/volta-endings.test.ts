import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { parseMusicXml } from './parse'
import { serializeMusicXml, serializeMusicXmlWithReport } from './serialize'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'

const source = () => parseMusicXml(readFileSync('src/musicxml/fixtures/volta-open-end.musicxml', 'utf8'))

describe('volta ending appearance', () => {
  it('preserves explicit display endpoints in native and reports XML layout loss without changing playback', () => {
    const score = source()
    const measures = score.parts[0]!.staves[0]!.measures
    Object.assign(measures[2]!.volta!, { displayEndMeasureId: measures[2]!.id })
    const timeline = createPlaybackTimeline(score)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    const result = serializeMusicXmlWithReport(score)
    expect(result.report.warnings).toContainEqual(expect.objectContaining({
      code: 'unsupported-layout', measureId: measures[2]!.id,
      path: 'score.parts[0].staves[0].measures[2].volta.displayEndMeasureId'
    }))
    expect(createPlaybackTimeline(parseMusicXml(result.contents))).toEqual(timeline)
    for (const target of ['missing', measures[1]!.id, measures[3]!.id]) {
      Object.assign(measures[2]!.volta!, { displayEndMeasureId: target })
      expect(() => encodeNativeProject(createNativeProject(score))).toThrow(/volta display/i)
    }
  })
  it('keeps an open end through XML and native without extending its playback range', () => {
    const score = source()
    const measures = score.parts[0]!.staves[0]!.measures
    expect(measures[2]!.volta).toEqual({ number: 2, start: true, end: true, endStyle: 'open' })
    expect(measures[3]!.volta).toBeUndefined()
    const snapshot = JSON.stringify(score)
    const xml = serializeMusicXml(score)
    const nodes = new XMLParser({ ignoreAttributes: false }).parse(xml)['score-partwise'].part.measure
    expect(nodes[1].barline.find((barline: Record<string, unknown>) => barline['@_location'] === 'right').ending['@_type']).toBe('stop')
    expect(nodes[2].barline.find((barline: Record<string, unknown>) => barline['@_location'] === 'right').ending['@_type']).toBe('discontinue')
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    for (const candidate of [score, native, parseMusicXml(xml)]) {
      expect(candidate.parts[0]!.staves[0]!.measures[2]!.volta).toEqual(measures[2]!.volta)
      const timeline = createPlaybackTimeline(candidate)
      expect(timeline.totalBeats).toBe(20)
      expect(timeline.events.map(event => [event.startBeat, event.durationBeats])).toEqual([[0,4],[4,4],[8,4],[12,4],[16,4]])
      const closed = structuredClone(candidate)
      delete closed.parts[0]!.staves[0]!.measures[2]!.volta!.endStyle
      expect(createPlaybackTimeline(closed)).toEqual(timeline)
    }
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it('defaults legacy endings to closed and rejects unsupported native end styles', () => {
    const score = source()
    const mark = score.parts[0]!.staves[0]!.measures[2]!.volta!
    delete mark.endStyle
    const legacy = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(serializeMusicXml(legacy)).toContain('<ending number="2" type="stop"/>')
    Object.assign(mark, { endStyle: 'open' })
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    mark.endStyle = 'closed'
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    expect(serializeMusicXml(score)).toContain('<ending number="2" type="stop"/>')
    Object.assign(mark, { endStyle: 'unsupported' })
    expect(() => encodeNativeProject(createNativeProject(score))).toThrow()
  })
})
