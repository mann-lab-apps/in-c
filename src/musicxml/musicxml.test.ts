import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'

const fixture = readFileSync(
  resolve('src/musicxml/fixtures/single-part-treble.musicxml'),
  'utf8'
)

describe('MusicXML MVP', () => {
  it('parses a single-part treble-clef fixture into score-core', () => {
    const score = parseMusicXml(fixture)

    expect(score).toMatchObject({
      title: 'MusicXML Sketch',
      composer: 'in-C',
      parts: [
        {
          id: 'P1',
          name: 'Piano',
          abbreviation: 'Pno.',
          staves: [
            {
              id: 'P1-staff-1',
              measures: [
                {
                  id: 'measure-1',
                  number: 1,
                  clef: {
                    sign: 'G',
                    line: 2
                  },
                  keySignature: {
                    fifths: 0,
                    mode: 'major'
                  },
                  timeSignature: {
                    beats: 4,
                    beatType: 4
                  },
                  voices: [
                    {
                      id: 'voice-1',
                      events: [
                        {
                          type: 'note',
                          pitch: {
                            step: 'C',
                            octave: 4
                          },
                          duration: {
                            value: 'quarter',
                            dots: 0
                          }
                        },
                        {
                          type: 'note',
                          pitch: {
                            step: 'F',
                            octave: 4,
                            alter: 1
                          }
                        },
                        {
                          type: 'rest',
                          duration: {
                            value: 'half'
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  })

  it('exports and re-imports the supported subset', () => {
    const score = parseMusicXml(fixture)
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<score-partwise version="4.0">')
    expect(exported).toContain('<alter>1</alter>')
    expect(exported).toContain('<rest/>')
    expect(roundTrip).toEqual(score)
  })

  it('rejects multiple parts instead of silently dropping data', () => {
    const invalid = fixture.replace(
      '</score-partwise>',
      '<part id="P2"><measure number="1"/></part></score-partwise>'
    )

    expect(() => parseMusicXml(invalid)).toThrow(
      '단일 part MusicXML만 가져올 수 있습니다'
    )
  })
})
