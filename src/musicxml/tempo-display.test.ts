import { XMLParser } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { createScore } from '../score-core'
import { parseMusicXml, serializeMusicXml } from './index'

describe('MusicXML tempo display', () => {
  it.each(['quarter', 'eighth'] as const)('exports a generated %s label once as a visible metronome', beatUnit => {
    const text = `${beatUnit === 'eighth' ? '♪' : '♩'} = 92`
    const output = serializeMusicXml(createScore({ tempo: { bpm: 92, beatUnit, text } }))
    const direction = new XMLParser({ ignoreAttributes: false }).parse(output)['score-partwise'].part.measure.direction
    expect(direction['direction-type'].words).toBeUndefined()
    expect(direction['direction-type'].metronome['@_print-object']).toBeUndefined()
    expect(parseMusicXml(output).tempo).toEqual({ bpm: 92, beatUnit, dots: 0, text })
  })
  it.each(['Allegro', 'Allegro ♩ = 92'])('preserves custom text %s in a separate direction type', text => {
    const score = createScore({ tempo: { bpm: 92, beatUnit: 'quarter', text } })
    const output = serializeMusicXml(score)
    const direction = new XMLParser({ ignoreAttributes: false }).parse(output)['score-partwise'].part.measure.direction
    expect(direction['direction-type'][0]).toEqual({ words: text })
    expect(direction['direction-type'][1].metronome['@_print-object']).toBeUndefined()
    expect(direction.sound['@_tempo']).toBe('92')
    expect(parseMusicXml(output).tempo).toEqual({ ...score.tempo, dots: 0 })
    expect(parseMusicXml(output).staffTexts).toBeUndefined()
  })
  it('retains the visible metronome when no display text is supplied', () => {
    const output = serializeMusicXml(createScore({ tempo: { bpm: 92, beatUnit: 'quarter' } }))
    const direction = new XMLParser({ ignoreAttributes: false }).parse(output)['score-partwise'].part.measure.direction
    expect(direction['direction-type'].words).toBeUndefined()
    expect(direction['direction-type'].metronome['@_print-object']).toBeUndefined()
    expect(direction['direction-type'].metronome['per-minute']).toBe(92)
  })
})
