import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  validateMeasureRhythm
} from '../score-core'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml, serializeMusicXmlWithReport } from './serialize'

const fixture = readFileSync(
  resolve('src/musicxml/fixtures/single-part-treble.musicxml'),
  'utf8'
)
const releaseQaFixture = readFileSync(
  resolve('src/musicxml/fixtures/release-qa.musicxml'),
  'utf8'
)
const compositionCatalog = JSON.parse(
  readFileSync(resolve('site/compositions-catalog.json'), 'utf8')
) as {
  compositions: Array<{
    slug: string
    status: string
    assets?: {
      musicxml?: string
    }
  }>
}
const externalFixtureRoot = resolve('src/musicxml/fixtures/external-apps')
const externalFixtureManifest = JSON.parse(
  readFileSync(resolve(externalFixtureRoot, 'manifest.json'), 'utf8')
) as {
  fixtures: Array<{
    id: string
    sourceApp: string
    origin: 'compatibility-seed' | 'app-export'
    collectionStatus: 'seed-placeholder' | 'app-export-collected'
    exportSettings: string
    evidence: string
    path: string
    expectedPartNames: string[]
    expectedStaffCounts: number[]
    expectedClefs: string[]
    expectedEventPitches: string[]
    expectedDynamics: string[]
    expectedArticulations: string[]
    expectedVoiceCounts?: number[]
    expectedWarnings: string[]
    expectedWarningPaths: string[]
  }>
  requiredAppExports: Array<{
    sourceApp: string
    collectionStatus: 'manual-collection-required' | 'collected'
    targetFixtureId: string
    exportSettings: string
    evidence: string
  }>
}

describe('MusicXML MVP', () => {
  it('parses every available public Composition MusicXML file', () => {
    const availableCompositions = compositionCatalog.compositions.filter(
      (composition) => composition.status === 'available'
    )

    expect(availableCompositions.length).toBeGreaterThan(0)

    for (const composition of availableCompositions) {
      const musicXmlPath = composition.assets?.musicxml

      expect(musicXmlPath, `${composition.slug} missing MusicXML path`).toBeTruthy()

      const score = parseMusicXml(
        readFileSync(
          resolve('site/public', musicXmlPath!.replace(/^\.\//, '')),
          'utf8'
        )
      )

      expect(score.title, composition.slug).toBeTruthy()

      for (const part of score.parts) {
        for (const staff of part.staves) {
          for (const measure of staff.measures) {
            expect(
              validateMeasureRhythm(measure).status,
              `${composition.slug} measure ${measure.number} rhythm`
            ).toBe('exact')
          }
        }
      }
    }
  })

  it('import-export.import-valid-single-voice parses a single-part treble-clef fixture into score-core', () => {
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
                          position: {
                            tick: 0
                          },
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
                          position: {
                            tick: TICKS_PER_QUARTER
                          },
                          pitch: {
                            step: 'F',
                            octave: 4,
                            alter: 1
                          }
                        },
                        {
                          type: 'rest',
                          position: {
                            tick: TICKS_PER_QUARTER * 2
                          },
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

  it('parses the release QA fixture with visual-regression expressions', () => {
    const score = parseMusicXml(releaseQaFixture)

    expect(score).toMatchObject({
      title: 'Release QA Scenario',
      composer: 'in-C QA',
      tempo: {
        bpm: 92
      },
      rehearsalMarks: [
        {
          measureId: 'measure-1',
          text: 'A'
        }
      ],
      dynamics: [
        {
          measureId: 'measure-1',
          value: 'mf'
        },
        {
          measureId: 'measure-4',
          value: 'p'
        }
      ]
    })

    const measures = score.parts[0].staves[0].measures

    expect(measures).toHaveLength(4)
    expect(measures.every((measure) => validateMeasureRhythm(measure).isExact)).toBe(true)
    expect(measures[0].voices[0].events[0]).toMatchObject({
      type: 'note',
      articulations: ['staccato']
    })
    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      fermata: true
    })
    expect(measures[2].voices[0].events[0]).toMatchObject({
      type: 'rest',
      fermata: true
    })
    expect(score.hairpins).toHaveLength(1)
    expect(score.hairpins?.[0]).toMatchObject({
      type: 'crescendo'
    })
    expect(score.hairpins?.[0].startEventId).toBeTruthy()
    expect(score.hairpins?.[0].endEventId).toBeTruthy()
  })

  it('import-export.external-app-fixture-qa parses representative notation app MusicXML fixtures', () => {
    expect(externalFixtureManifest.fixtures.map((entry) => entry.sourceApp).sort()).toEqual([
      'Dorico',
      'Finale',
      'MuseScore',
      'Sibelius'
    ])
    expect(
      externalFixtureManifest.requiredAppExports.map((entry) => entry.sourceApp).sort()
    ).toEqual(['Dorico', 'Finale', 'MuseScore', 'Sibelius'])

    const collectedAppExports = new Set(
      externalFixtureManifest.fixtures
        .filter((entry) => entry.origin === 'app-export')
        .map((entry) => entry.sourceApp)
    )

    for (const requiredExport of externalFixtureManifest.requiredAppExports) {
      expect(requiredExport.targetFixtureId, requiredExport.sourceApp).toBeTruthy()
      expect(requiredExport.exportSettings.trim(), requiredExport.sourceApp).not.toBe('')
      expect(requiredExport.evidence, requiredExport.sourceApp).toMatch(
        /^docs\/quality\/external-musicxml-fixture-qa\.md#/
      )
      if (!collectedAppExports.has(requiredExport.sourceApp)) {
        expect(requiredExport.collectionStatus, requiredExport.sourceApp).toBe(
          'manual-collection-required'
        )
      }
    }

    for (const fixtureEntry of externalFixtureManifest.fixtures) {
      const fixturePath = resolve(externalFixtureRoot, fixtureEntry.path)
      const xml = readFileSync(fixturePath, 'utf8')
      const { score, report } = parseMusicXmlWithReport(xml)
      const roundTrip = parseMusicXml(serializeMusicXml(score))

      expect(dirname(fixturePath)).toBe(externalFixtureRoot)
      expect(fixtureEntry.exportSettings.trim(), fixtureEntry.id).not.toBe('')
      expect(fixtureEntry.evidence, fixtureEntry.id).toMatch(
        /^docs\/quality\/external-musicxml-fixture-qa\.md#/
      )
      expect(fixtureEntry.collectionStatus, fixtureEntry.id).toBe(
        fixtureEntry.origin === 'app-export' ? 'app-export-collected' : 'seed-placeholder'
      )
      if (fixtureEntry.origin === 'compatibility-seed') {
        expect(xml, fixtureEntry.id).toContain(
          `<software>${fixtureEntry.sourceApp} compatibility seed</software>`
        )
      } else {
        expect(xml, fixtureEntry.id).not.toContain('compatibility seed')
      }
      expect(score.parts.map((part) => part.name), fixtureEntry.id).toEqual(
        fixtureEntry.expectedPartNames
      )
      expect(score.parts.map((part) => part.staves.length), fixtureEntry.id).toEqual(
        fixtureEntry.expectedStaffCounts
      )
      expect(readScoreClefs(score), fixtureEntry.id).toEqual(
        fixtureEntry.expectedClefs
      )
      expect(readScoreEventPitches(score), fixtureEntry.id).toEqual(
        fixtureEntry.expectedEventPitches
      )
      expect(readScoreDynamics(score), fixtureEntry.id).toEqual(
        fixtureEntry.expectedDynamics
      )
      expect(readScoreArticulations(score), fixtureEntry.id).toEqual(
        fixtureEntry.expectedArticulations
      )
      expect(
        score.parts.flatMap((part) =>
          part.staves.flatMap((staff) =>
            staff.measures.map((measure) => validateMeasureRhythm(measure).status)
          )
        ),
        fixtureEntry.id
      ).toEqual(
        score.parts.flatMap((part) =>
          part.staves.flatMap((staff) => staff.measures.map(() => 'exact'))
        )
      )
      if (fixtureEntry.expectedVoiceCounts) {
        expect(readScoreVoiceCounts(score), fixtureEntry.id).toEqual(
          fixtureEntry.expectedVoiceCounts
        )
      }
      expect([...new Set(report.warnings.map((warning) => warning.code))].sort()).toEqual(
        fixtureEntry.expectedWarnings.slice().sort()
      )
      expect(report.warnings.map((warning) => warning.path).sort()).toEqual(
        fixtureEntry.expectedWarningPaths.slice().sort()
      )
      expect(roundTrip.parts.map((part) => part.name), fixtureEntry.id).toEqual(
        fixtureEntry.expectedPartNames
      )
      expect(readScoreClefs(roundTrip), fixtureEntry.id).toEqual(
        fixtureEntry.expectedClefs
      )
      expect(readScoreDynamics(roundTrip), fixtureEntry.id).toEqual(
        fixtureEntry.expectedDynamics
      )
      expect(readScoreArticulations(roundTrip), fixtureEntry.id).toEqual(
        fixtureEntry.expectedArticulations
      )
    }
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

  it('playback.global-tempo exports and re-imports a global tempo marking', () => {
    const score = createScore({
      title: 'Tempo Sketch',
      tempo: {
        bpm: 96,
        beatUnit: 'quarter',
        text: 'Allegro ♩ = 96'
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<sound tempo="96"/>')
    expect(exported).toContain('<words>Allegro ♩ = 96</words>')
    expect(roundTrip.tempo).toEqual({
      bpm: 96,
      beatUnit: 'quarter',
      dots: 0,
      text: 'Allegro ♩ = 96'
    })
  })

  it('round-trips dotted tempo beat units', () => {
    const score = createScore({
      title: 'Dotted Tempo Sketch',
      tempo: {
        bpm: 72,
        beatUnit: 'quarter',
        dots: 1,
        text: 'Andante dotted quarter = 72'
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<beat-unit>quarter</beat-unit>')
    expect(exported).toContain('<beat-unit-dot/>')
    expect(roundTrip.tempo).toEqual({
      bpm: 72,
      beatUnit: 'quarter',
      dots: 1,
      text: 'Andante dotted quarter = 72'
    })
  })

  it('exports and re-imports transparent tempo markings', () => {
    const score = createScore({
      title: 'Transparent Tempo Sketch',
      tempo: {
        bpm: 120,
        beatUnit: 'quarter',
        text: '♩ = 120',
        transparent: true
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('print-object="no"')
    expect(roundTrip.tempo).toEqual({
      bpm: 120,
      beatUnit: 'quarter',
      dots: 0,
      text: '♩ = 120',
      transparent: true
    })
  })

  it('exports and re-imports positioned tempo events', () => {
    const score = createScore({
      title: 'Tempo Map Sketch',
      tempo: {
        bpm: 96,
        beatUnit: 'quarter',
        text: 'Allegro'
      },
      tempoEvents: [
        {
          id: 'tempo-rit',
          measureId: 'measure-1',
          tick: TICKS_PER_QUARTER * 2,
          bpm: 72,
          beatUnit: 'quarter',
          dots: 1,
          text: 'rit.'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain(`<offset>${TICKS_PER_QUARTER * 2}</offset>`)
    expect(roundTrip.tempoEvents).toEqual([
      {
        id: 'measure-1-tempo-2',
        measureId: 'measure-1',
        tick: TICKS_PER_QUARTER * 2,
        bpm: 72,
        beatUnit: 'quarter',
        dots: 1,
        text: 'rit.'
      }
    ])
  })

  it('exports and re-imports rhythm feel markings separately from staff text', () => {
    const score = createScore({
      title: 'Rhythm Feel Sketch',
      rhythmFeel: {
        unit: 'eighth'
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<words>♫ = ³♩ ♪</words>')
    expect(roundTrip.rhythmFeel).toEqual({
      unit: 'eighth'
    })
    expect(roundTrip.staffTexts).toBeUndefined()
  })

  it('imports legacy swing words as rhythm feel markings', () => {
    const score = createScore({
      title: 'Legacy Swing Sketch',
      staffTexts: [
        {
          id: 'legacy-swing-text',
          measureId: 'measure-1',
          text: 'Swing: ♪♪ = triplet ♩♪'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(roundTrip.rhythmFeel).toEqual({
      unit: 'eighth'
    })
    expect(roundTrip.staffTexts).toBeUndefined()
  })

  it('layout.rehearsal-mark exports and re-imports rehearsal marks', () => {
    const score = createScore({
      title: 'Marked Sketch',
      rehearsalMarks: [
        {
          id: 'rehearsal-a',
          measureId: 'measure-1',
          text: 'A'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<rehearsal>A</rehearsal>')
    expect(roundTrip.rehearsalMarks).toEqual([
      {
        id: 'measure-1-rehearsal-1',
        measureId: 'measure-1',
        text: 'A'
      }
    ])
  })

  it('layout.staff-text exports and re-imports staff text words', () => {
    const score = createScore({
      title: 'Text Sketch',
      staffTexts: [
        {
          id: 'staff-text-1',
          measureId: 'measure-1',
          text: 'dolce'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<words>dolce</words>')
    expect(roundTrip.staffTexts).toEqual([
      {
        id: 'measure-1-staff-text-1',
        measureId: 'measure-1',
        text: 'dolce'
      }
    ])
  })

  it('layout.system-text exports and re-imports system-level text words', () => {
    const score = createScore({
      title: 'System Text Sketch',
      systemTexts: [
        {
          id: 'system-text-1',
          measureId: 'measure-1',
          text: 'Chorus'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('system="yes"')
    expect(exported).toContain('<words font-weight="bold">Chorus</words>')
    expect(roundTrip.systemTexts).toEqual([
      {
        id: 'measure-1-system-text-1',
        measureId: 'measure-1',
        text: 'Chorus'
      }
    ])
    expect(roundTrip.staffTexts).toBeUndefined()
  })

  it('layout.expression-text exports and re-imports tick-positioned expression words', () => {
    const score = createScore({
      title: 'Expression Text Sketch',
      expressionTexts: [
        {
          id: 'expression-text-1',
          measureId: 'measure-1',
          tick: TICKS_PER_QUARTER,
          text: 'espressivo'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<words font-style="italic">espressivo</words>')
    expect(exported).toContain(`<offset>${TICKS_PER_QUARTER}</offset>`)
    expect(roundTrip.expressionTexts).toEqual([
      {
        id: 'measure-1-expression-text-1',
        measureId: 'measure-1',
        tick: TICKS_PER_QUARTER,
        text: 'espressivo'
      }
    ])
    expect(roundTrip.staffTexts).toBeUndefined()
  })

  it('import-export.export-unsupported-musicxml-report warns about layout data not preserved by MusicXML', () => {
    const { contents, report } = serializeMusicXmlWithReport(
      createScore({
        title: 'Layout Export Warning Sketch',
        layout: {
          systemBreakBeforeMeasureIds: ['measure-2'],
          pageBreakBeforeMeasureIds: ['measure-3'],
          pageSetup: {
            pageSize: 'letter',
            orientation: 'landscape',
            pageMarginMm: 12,
            staffSizePercent: 90,
            systemSpacingPercent: 120
          }
        }
      })
    )

    expect(contents).toContain('<score-partwise')
    expect(report.warnings).toEqual([
      {
        code: 'unsupported-layout',
        message:
          'manual system break is not exported to MusicXML yet; use PDF export to preserve printed layout.',
        path: 'score.layout.systemBreakBeforeMeasureIds[0]',
        measureId: 'measure-2'
      },
      {
        code: 'unsupported-layout',
        message:
          'manual page break is not exported to MusicXML yet; use PDF export to preserve printed layout.',
        path: 'score.layout.pageBreakBeforeMeasureIds[0]',
        measureId: 'measure-3'
      },
      {
        code: 'unsupported-layout',
        message:
          'PDF page setup is not exported to MusicXML yet; MusicXML consumers may use their own page settings.',
        path: 'score.layout.pageSetup'
      }
    ])
  })

  it('layout.dynamics exports and re-imports dynamic markings in the same measure', () => {
    const score = createScore({
      title: 'Dynamic Sketch',
      dynamics: [
        {
          id: 'dynamic-mf',
          measureId: 'measure-1',
          value: 'mf'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<mf/>')
    expect(roundTrip.dynamics).toEqual([
      {
        id: 'measure-1-dynamic-1',
        measureId: 'measure-1',
        value: 'mf'
      }
    ])
  })

  it('layout.dynamics imports and exports common professional dynamic markings without warnings', () => {
    const xml = fixture.replace(
      '</attributes>',
      `</attributes>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <pp/>
          </dynamics>
        </direction-type>
      </direction>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <ff/>
          </dynamics>
        </direction-type>
      </direction>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <sfz/>
          </dynamics>
        </direction-type>
      </direction>`
    )
    const { score, report } = parseMusicXmlWithReport(xml)
    const roundTrip = serializeMusicXml(score)

    expect(score.dynamics).toEqual([
      {
        id: 'measure-1-dynamic-1',
        measureId: 'measure-1',
        value: 'pp'
      },
      {
        id: 'measure-1-dynamic-2',
        measureId: 'measure-1',
        value: 'ff'
      },
      {
        id: 'measure-1-dynamic-3',
        measureId: 'measure-1',
        value: 'sfz'
      }
    ])
    expect(report.warnings).toHaveLength(0)
    expect(roundTrip).toContain('<pp/>')
    expect(roundTrip).toContain('<ff/>')
    expect(roundTrip).toContain('<sfz/>')
  })

  it('layout.hairpin-musicxml-round-trip exports and re-imports hairpin wedges', () => {
    const score = createScore({
      title: 'Hairpin Sketch',
      hairpins: [
        {
          id: 'hairpin-cresc',
          startEventId: 'note-start',
          endEventId: 'note-end',
          type: 'crescendo'
        }
      ],
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-start',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createNote({
                          id: 'note-end',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'D', octave: 4 }
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          duration: createDuration('half')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<wedge type="crescendo"/>')
    expect(exported).toContain('<wedge type="stop"/>')
    expect(roundTrip.hairpins).toEqual([
      {
        id: 'hairpin-1-1-2',
        startEventId: 'event-1',
        endEventId: 'event-2',
        type: 'crescendo'
      }
    ])
  })

  it('exports and re-imports note articulations', () => {
    const score = createScore({
      title: 'Articulation Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-articulated',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          articulations: ['staccato', 'accent', 'tenuto', 'marcato']
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const event = roundTrip.parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<staccato/>')
    expect(exported).toContain('<accent/>')
    expect(exported).toContain('<tenuto/>')
    expect(exported).toContain('<marcato/>')
    expect(event).toMatchObject({
      type: 'note',
      articulations: ['staccato', 'accent', 'tenuto', 'marcato']
    })
  })

  it('layout.fermata exports and re-imports fermatas on notes and rests', () => {
    const score = createScore({
      title: 'Fermata Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-fermata',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          fermata: true
                        }),
                        createRest({
                          id: 'rest-fermata',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('quarter'),
                          fermata: true
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          duration: createDuration('half')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const events = roundTrip.parts[0].staves[0].measures[0].voices[0].events

    expect(exported.match(/<fermata\/>/g)).toHaveLength(2)
    expect(events[0]).toMatchObject({
      type: 'note',
      fermata: true
    })
    expect(events[1]).toMatchObject({
      type: 'rest',
      fermata: true
    })
  })

  it('layout.breath-marks exports and re-imports breath marks and caesuras', () => {
    const score = createScore({
      title: 'Breath Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-breath',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          breathMark: 'breath'
                        }),
                        createRest({
                          id: 'rest-caesura',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('quarter'),
                          breathMark: 'caesura'
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          duration: createDuration('half')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const events = roundTrip.parts[0].staves[0].measures[0].voices[0].events

    expect(exported).toContain('<breath-mark/>')
    expect(exported).toContain('<caesura/>')
    expect(events[0]).toMatchObject({
      type: 'note',
      breathMark: 'breath'
    })
    expect(events[1]).toMatchObject({
      type: 'rest',
      breathMark: 'caesura'
    })
  })

  it('tremolo.musicxml-round-trip exports and re-imports single-note tremolo markings', () => {
    const score = createScore({
      title: 'Tremolo Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-tremolo',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          tremolo: {
                            type: 'single',
                            marks: 3
                          }
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const event = roundTrip.parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<tremolo type="single">3</tremolo>')
    expect(event).toMatchObject({
      type: 'note',
      tremolo: {
        type: 'single',
        marks: 3
      }
    })
  })

  it.each([
    ['8va', 'up', 8],
    ['8vb', 'down', 8],
    ['15ma', 'up', 15],
    ['15mb', 'down', 15]
  ] as const)(
    'exports and re-imports %s octave shift spans',
    (type, direction, size) => {
      const score = createScore({
        title: 'Octave Shift Sketch',
        octaveShifts: [
          {
            id: 'octave-8va',
            startEventId: 'note-start',
            endEventId: 'note-end',
            type
          }
        ],
        parts: [
          createPart({
            staves: [
              createStaff({
                measures: [
                  createMeasure({
                    voices: [
                      createVoice({
                        events: [
                          createNote({
                            id: 'note-start',
                            position: createTimePosition(0),
                            pitch: { step: 'C', octave: 5 }
                          }),
                          createNote({
                            id: 'note-end',
                            position: createTimePosition(TICKS_PER_QUARTER),
                            pitch: { step: 'D', octave: 5 }
                          }),
                          createRest({
                            id: 'rest-fill',
                            position: createTimePosition(TICKS_PER_QUARTER * 2),
                            duration: createDuration('half')
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
      const exported = serializeMusicXml(score)
      const roundTrip = parseMusicXml(exported)

      expect(exported).toContain(
        `<octave-shift type="${direction}" size="${size}"/>`
      )
      expect(exported).toContain(`<octave-shift type="stop" size="${size}"/>`)
      expect(roundTrip.octaveShifts).toEqual([
        {
          id: 'octave-shift-1-1-2',
          startEventId: 'event-1',
          endEventId: 'event-2',
          type
        }
      ])
    }
  )

  it('exports and re-imports repeat barlines', () => {
    const score = createScore({
      title: 'Repeat Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  repeat: {
                    start: true,
                    end: true,
                    times: 3
                  }
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const repeat = roundTrip.parts[0].staves[0].measures[0].repeat

    expect(exported).toContain('<repeat direction="forward"/>')
    expect(exported).toContain('<repeat direction="backward" times="3"/>')
    expect(repeat).toEqual({
      start: true,
      end: true,
      times: 3
    })
  })

  it('exports and re-imports volta endings', () => {
    const score = createScore({
      title: 'Volta Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  volta: {
                    number: 1,
                    start: true,
                    end: true
                  }
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const volta = roundTrip.parts[0].staves[0].measures[0].volta

    expect(exported).toContain('<ending number="1" type="start"/>')
    expect(exported).toContain('<ending number="1" type="stop"/>')
    expect(volta).toEqual({
      number: 1,
      start: true,
      end: true
    })
  })

  it('clef.musicxml-round-trip exports and re-imports supported clef changes', () => {
    const score = createScore({
      title: 'Clef Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  clef: {
                    sign: 'F',
                    line: 4
                  }
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<sign>F</sign>')
    expect(exported).toContain('<line>4</line>')
    expect(roundTrip.parts[0].staves[0].measures[0].clef).toEqual({
      sign: 'F',
      line: 4
    })
  })

  it('exports and re-imports slurs', () => {
    const score = createScore({
      title: 'Slur Sketch',
      slurs: [
        {
          id: 'slur-phrase',
          startEventId: 'note-slur-start',
          endEventId: 'note-slur-end',
          number: 2
        }
      ],
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-slur-start',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createNote({
                          id: 'note-slur-end',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'D', octave: 4 }
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          duration: createDuration('half')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<slur type="start" number="2"/>')
    expect(exported).toContain('<slur type="stop" number="2"/>')
    expect(roundTrip.slurs).toEqual([
      {
        id: 'slur-1',
        startEventId: 'event-1',
        endEventId: 'event-2',
        number: 2
      }
    ])
  })

  it('exports and re-imports overlapping slurs with distinct numbers', () => {
    const score = createScore({
      title: 'Nested Slur Sketch',
      slurs: [
        {
          id: 'outer-slur',
          startEventId: 'note-1',
          endEventId: 'note-3',
          number: 1
        },
        {
          id: 'inner-slur',
          startEventId: 'note-1',
          endEventId: 'note-2',
          number: 2
        }
      ],
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-1',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createNote({
                          id: 'note-2',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'D', octave: 4 }
                        }),
                        createNote({
                          id: 'note-3',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          pitch: { step: 'E', octave: 4 }
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER * 3),
                          duration: createDuration('quarter')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<slur type="start" number="1"/>')
    expect(exported).toContain('<slur type="start" number="2"/>')
    expect(exported).toContain('<slur type="stop" number="1"/>')
    expect(exported).toContain('<slur type="stop" number="2"/>')
    expect(roundTrip.slurs).toEqual([
      {
        id: 'slur-1',
        startEventId: 'event-1',
        endEventId: 'event-2',
        number: 2
      },
      {
        id: 'slur-2',
        startEventId: 'event-1',
        endEventId: 'event-3',
        number: 1
      }
    ])
  })

  it('parses every direction-type when a MusicXML direction contains multiple entries', () => {
    const xml = fixture.replace(
      '</attributes>',
      `</attributes>
      <direction>
        <direction-type>
          <rehearsal>A</rehearsal>
        </direction-type>
        <direction-type>
          <words>dolce</words>
        </direction-type>
        <direction-type>
          <dynamics>
            <mf/>
          </dynamics>
        </direction-type>
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>88</per-minute>
          </metronome>
        </direction-type>
      </direction>`
    )
    const score = parseMusicXml(xml)

    expect(score.tempo).toEqual({
      bpm: 88,
      beatUnit: 'quarter',
      dots: 0,
      text: '♩ = 88'
    })
    expect(score.rehearsalMarks).toEqual([
      {
        id: 'measure-1-rehearsal-1-1',
        measureId: 'measure-1',
        text: 'A'
      }
    ])
    expect(score.staffTexts).toEqual([
      {
        id: 'measure-1-staff-text-1-2',
        measureId: 'measure-1',
        text: 'dolce'
      }
    ])
    expect(score.dynamics).toEqual([
      {
        id: 'measure-1-dynamic-1-3',
        measureId: 'measure-1',
        value: 'mf'
      }
    ])
  })

  it('import-export.unsupported-musicxml-report reports imported-but-unsupported notation from external apps', () => {
    const xml = fixture.replace(
      '<type>quarter</type>',
      `<type>quarter</type>
        <notations>
          <articulations>
            <detached-legato/>
          </articulations>
          <technical>
            <up-bow/>
          </technical>
          <ornaments>
            <inverted-turn/>
          </ornaments>
        </notations>`
    ).replace(
      '</attributes>',
      `</attributes>
      <direction>
        <direction-type>
          <pedal type="start"/>
        </direction-type>
      </direction>`
    )
    const { score, report } = parseMusicXmlWithReport(xml)

    expect(score.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({
      type: 'note',
      pitch: { step: 'C', octave: 4 }
    })
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unsupported-notation',
        message: 'detached-legato articulation is not imported yet.',
        measureNumber: 1,
        eventIndex: 1,
        path: 'measure[1].note[1].notations.articulations.detached-legato'
      }),
      expect.objectContaining({
        code: 'unsupported-notation',
        message: 'technical playing instructions are not imported yet.',
        measureNumber: 1,
        eventIndex: 1,
        path: 'measure[1].note[1].notations.technical'
      }),
      expect.objectContaining({
        code: 'unsupported-notation',
        message: 'inverted-turn ornament is not imported yet.',
        measureNumber: 1,
        eventIndex: 1,
        path: 'measure[1].note[1].notations.ornaments.inverted-turn'
      }),
      expect.objectContaining({
        code: 'unsupported-direction',
        message: 'pedal direction is not imported yet.',
        measureNumber: 1,
        path: 'measure[1].direction[1].direction-type[1].pedal'
      })
    ]))
    expect(report.warnings).toHaveLength(4)
  })

  it('rejects MusicXML hairpins that never stop', () => {
    const xml = fixture.replace(
      '</attributes>',
      `</attributes>
      <direction>
        <direction-type>
          <wedge type="crescendo"/>
        </direction-type>
      </direction>`
    )

    expect(() => parseMusicXml(xml)).toThrow('hairpin의 종료 표식이 없습니다')
  })

  it('rejects MusicXML slurs that never stop', () => {
    const xml = fixture.replace(
      '<type>quarter</type>',
      `<type>quarter</type>
        <notations>
          <slur type="start" number="1"/>
        </notations>`
    )

    expect(() => parseMusicXml(xml)).toThrow('slur의 종료 표식이 없습니다')
  })

  it('rejects MusicXML integer fields with decimal or trailing text', () => {
    expect(() =>
      parseMusicXml(fixture.replace('<divisions>4</divisions>', '<divisions>4.5</divisions>'))
    ).toThrow('MusicXML 정수 값이 올바르지 않습니다: divisions')

    expect(() =>
      parseMusicXml(fixture.replace('<duration>4</duration>', '<duration>4abc</duration>'))
    ).toThrow('MusicXML 정수 값이 올바르지 않습니다: duration')
  })

  it('rejects note-level staff assignments outside declared staves', () => {
    const xml = fixture.replace(
      '<voice>1</voice>',
      `<voice>1</voice>
        <staff>2</staff>`
    )

    expect(() => parseMusicXml(xml)).toThrow('선언된 staff 수 1 범위를 벗어납니다')
  })

  it('imports multiple parts instead of silently dropping data', () => {
    const multiPart = fixture.replace(
      '</score-partwise>',
      '<part id="P2"><measure number="1"/></part></score-partwise>'
    )
    const score = parseMusicXml(multiPart)

    expect(score.parts).toHaveLength(2)
    expect(score.parts[0].staves[0].measures).toHaveLength(1)
    expect(score.parts[1]).toMatchObject({
      id: 'P2',
      name: 'MusicXML Part',
      staves: [
        {
          id: 'P2-staff-1',
          measures: [
            {
              id: 'P2-staff-1-measure-1',
              voices: [
                {
                  events: [
                    {
                      id: 'P2-staff-1-measure-1-full-measure-rest',
                      type: 'rest',
                      fullMeasure: true
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

  it('rejects rhythmically incomplete measures during import and export', () => {
    const incompleteXml = fixture.replace(
      /<note>\s*<rest\/>[\s\S]*?<\/note>/,
      ''
    )

    expect(() => parseMusicXml(incompleteXml)).toThrow(
      '리듬 정합성이 올바르지 않습니다: gap'
    )

    const incompleteScore = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'late-note',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: {
                            step: 'C',
                            octave: 4
                          }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    expect(() => serializeMusicXml(incompleteScore)).toThrow(
      '리듬 정합성이 올바르지 않습니다: gap'
    )
  })

  it('import-export.import-pickup-measure parses an implicit first measure using its actual duration', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1" implicit="yes">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`

    const measure = parseMusicXml(xml).parts[0].staves[0].measures[0]

    expect(measure.timing).toEqual({
      type: 'pickup',
      durationTicks: TICKS_PER_QUARTER
    })
    expect(measure.voices[0].events[0]).toMatchObject({
      type: 'note',
      position: { tick: 0 },
      pitch: { step: 'G', octave: 4 }
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('import-export.round-trip-pickup-measure preserves pickup duration across MusicXML round trips', () => {
    const pickupScore = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  timing: {
                    type: 'pickup',
                    durationTicks: TICKS_PER_QUARTER
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'pickup-note',
                          position: createTimePosition(0),
                          pitch: {
                            step: 'G',
                            octave: 4
                          }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    const exported = serializeMusicXml(pickupScore)
    const roundTrip = parseMusicXml(exported)
    const measure = roundTrip.parts[0].staves[0].measures[0]

    expect(exported).toContain('implicit="yes"')
    expect(measure.timing).toEqual({
      type: 'pickup',
      durationTicks: TICKS_PER_QUARTER
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('import-export.reject-invalid-pickup-measure rejects an implicit measure with zero duration', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1" implicit="yes">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
    </measure>
  </part>
</score-partwise>`

    expect(() => parseMusicXml(xml)).toThrow(
      'MusicXML 못갖춘마디의 duration은 0보다 커야 합니다.'
    )
  })

  it('note-input.accidental-musicxml-round-trip exports only accidentals that change written pitch context', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  keySignature: { fifths: 1 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'key-f-sharp',
                          position: createTimePosition(0),
                          pitch: { step: 'F', octave: 4, alter: 1 }
                        }),
                        createNote({
                          id: 'natural-f',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'F', octave: 4, alter: 0 }
                        }),
                        createNote({
                          id: 'continued-natural-f',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          pitch: { step: 'F', octave: 4, alter: 0 }
                        }),
                        createNote({
                          id: 'restored-f-sharp',
                          position: createTimePosition(TICKS_PER_QUARTER * 3),
                          pitch: { step: 'F', octave: 4, alter: 1 }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTripEvents =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events

    expect(exported.match(/<accidental>natural<\/accidental>/g)).toHaveLength(1)
    expect(exported.match(/<accidental>sharp<\/accidental>/g)).toHaveLength(1)
    expect(roundTripEvents.map((event) => event.type === 'note' && event.pitch))
      .toEqual([
        { step: 'F', octave: 4, alter: 1 },
        { step: 'F', octave: 4, alter: 0 },
        { step: 'F', octave: 4, alter: 0 },
        { step: 'F', octave: 4, alter: 1 }
      ])
  })

  it('preserves tie start and stop markers across MusicXML round trips', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  timeSignature: { beats: 2, beatType: 4 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'tie-start',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          ties: { start: true }
                        }),
                        createNote({
                          id: 'tie-stop',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'C', octave: 4 },
                          ties: { stop: true }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const events =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events

    expect(exported).toContain('<tie type="start"/>')
    expect(exported).toContain('<tie type="stop"/>')
    expect(exported).toContain('<tied type="start"/>')
    expect(exported).toContain('<tied type="stop"/>')
    expect(events).toMatchObject([
      { type: 'note', ties: { start: true } },
      { type: 'note', ties: { stop: true } }
    ])
  })

  it('import-export.preserve-measure-attributes preserves measure attribute changes while normalizing note order to the score timeline', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>2</beats>
          <beat-type>4</beat-type>
        </time>
        <staves>1</staves>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <rest/>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="2">
      <attributes>
        <key>
          <fifths>1</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>3</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <rest/>
        <duration>2</duration>
        <voice>1</voice>
        <type>half</type>
      </note>
    </measure>
  </part>
</score-partwise>`
    const score = parseMusicXml(xml)
    const [firstMeasure, secondMeasure] = score.parts[0].staves[0].measures
    const roundTrip = parseMusicXml(serializeMusicXml(score))

    expect(firstMeasure).toMatchObject({
      keySignature: { fifths: 0, mode: 'major' },
      timeSignature: { beats: 2, beatType: 4 }
    })
    expect(secondMeasure).toMatchObject({
      keySignature: { fifths: 1, mode: 'major' },
      timeSignature: { beats: 3, beatType: 4 }
    })
    expect(firstMeasure.voices[0].events).toMatchObject([
      { type: 'note', position: { tick: 0 } },
      { type: 'rest', position: { tick: TICKS_PER_QUARTER } }
    ])
    expect(secondMeasure.voices[0].events).toMatchObject([
      { type: 'note', position: { tick: 0 } },
      { type: 'rest', position: { tick: TICKS_PER_QUARTER } }
    ])
    expect(validateMeasureRhythm(firstMeasure).isExact).toBe(true)
    expect(validateMeasureRhythm(secondMeasure).isExact).toBe(true)
    expect(roundTrip.parts[0].staves[0].measures).toMatchObject([
      {
        keySignature: { fifths: 0, mode: 'major' },
        timeSignature: { beats: 2, beatType: 4 }
      },
      {
        keySignature: { fifths: 1, mode: 'major' },
        timeSignature: { beats: 3, beatType: 4 }
      }
    ])
  })

  it('import-export.import-multi-voice parses same-staff voice streams with MusicXML backup markers', () => {
    const multiVoiceXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Two Voice Sketch</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>3</duration>
        <voice>1</voice>
        <type>half</type>
        <dot/>
      </note>
      <backup><duration>4</duration></backup>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>2</duration>
        <voice>2</voice>
        <type>half</type>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration>
        <voice>2</voice>
        <type>half</type>
      </note>
    </measure>
  </part>
</score-partwise>`

    const score = parseMusicXml(multiVoiceXml)
    const measure = score.parts[0].staves[0].measures[0]

    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(measure.voices).toHaveLength(2)
    expect(measure.voices.map((voice) => voice.id)).toEqual(['voice-1', 'voice-2'])
    expect(measure.voices[0].events).toMatchObject([
      {
        type: 'note',
        position: { tick: 0 },
        pitch: { step: 'C', octave: 5 }
      },
      {
        type: 'note',
        position: { tick: TICKS_PER_QUARTER },
        pitch: { step: 'D', octave: 5 },
        duration: { value: 'half', dots: 1 }
      }
    ])
    expect(measure.voices[1].events).toMatchObject([
      {
        type: 'note',
        position: { tick: 0 },
        pitch: { step: 'E', octave: 4 }
      },
      {
        type: 'note',
        position: { tick: TICKS_PER_QUARTER * 2 },
        pitch: { step: 'G', octave: 4 }
      }
    ])
  })

  it('exports and re-imports same-staff multi-voice measures', () => {
    const score = createScore({
      title: 'Two Voice Export',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createNote({
                          id: 'v1-n1',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 5 }
                        }),
                        createNote({
                          id: 'v1-n2',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'D', octave: 5 },
                          duration: createDuration('half', 1)
                        })
                      ]
                    }),
                    createVoice({
                      id: 'voice-2',
                      events: [
                        createNote({
                          id: 'v2-n1',
                          position: createTimePosition(0),
                          pitch: { step: 'E', octave: 4 },
                          duration: createDuration('half')
                        }),
                        createNote({
                          id: 'v2-n2',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          pitch: { step: 'G', octave: 4 },
                          duration: createDuration('half')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    const exported = serializeMusicXml(score)
    const roundTripMeasure =
      parseMusicXml(exported).parts[0].staves[0].measures[0]

    expect(exported).toContain('<voice>1</voice>')
    expect(exported).toContain('<voice>2</voice>')
    expect(exported).toMatch(
      /<voice>1<\/voice>[\s\S]*<backup>[\s\S]*<duration>53760<\/duration>[\s\S]*<\/backup>[\s\S]*<voice>2<\/voice>/
    )
    expect(roundTripMeasure.voices).toHaveLength(2)
    expect(roundTripMeasure.voices[0].events).toHaveLength(2)
    expect(roundTripMeasure.voices[1].events).toHaveLength(2)
    expect(validateMeasureRhythm(roundTripMeasure).isExact).toBe(true)
  })

  it('import-export.round-trip-grand-staff-structure score-setup.create-grand-staff-score exports and re-imports grand staff structure', () => {
    const score = createScore({
      title: 'Grand Staff Round Trip',
      parts: [
        createPart({
          id: 'part-1',
          name: 'Piano',
          abbreviation: 'Pno.',
          staves: [
            createStaff({
              id: 'staff-1',
              measures: [
                createMeasure({
                  id: 'part-1-staff-1-measure-1',
                  clef: { sign: 'G', line: 2 }
                }),
                createMeasure({
                  id: 'part-1-staff-1-measure-2',
                  number: 2,
                  clef: { sign: 'G', line: 2 }
                })
              ]
            }),
            createStaff({
              id: 'staff-2',
              measures: [
                createMeasure({
                  id: 'part-1-staff-2-measure-1',
                  clef: { sign: 'F', line: 4 }
                }),
                createMeasure({
                  id: 'part-1-staff-2-measure-2',
                  number: 2,
                  clef: { sign: 'F', line: 4 }
                })
              ]
            })
          ]
        })
      ]
    })

    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<staves>2</staves>')
    expect(exported).toContain('<staff>1</staff>')
    expect(exported).toContain('<staff>2</staff>')
    expect(roundTrip.parts).toHaveLength(1)
    expect(roundTrip.parts[0]).toMatchObject({
      id: 'part-1',
      name: 'Piano',
      abbreviation: 'Pno.'
    })
    expect(roundTrip.parts[0].staves).toHaveLength(2)
    expect(roundTrip.parts[0].staves.map((staff) => staff.id)).toEqual([
      'part-1-staff-1',
      'part-1-staff-2'
    ])
    expect(
      roundTrip.parts[0].staves.map((staff) => staff.measures[0].clef)
    ).toEqual([
      { sign: 'G', line: 2, octaveChange: undefined },
      { sign: 'F', line: 4, octaveChange: undefined }
    ])
    expect(
      roundTrip.parts[0].staves.map((staff) => staff.measures.length)
    ).toEqual([2, 2])
    expect(
      roundTrip.parts[0].staves[1].measures[0].voices[0].events[0].id
    ).toBe('part-1-staff-2-event-2')
  })

  it('import-export.round-trip-grand-staff-basic-events preserves lower staff notes', () => {
    const score = createScore({
      title: 'Grand Staff Notes',
      parts: [
        createPart({
          id: 'part-1',
          name: 'Piano',
          staves: [
            createStaff({
              id: 'staff-1',
              measures: [
                createMeasure({
                  id: 'part-1-staff-1-measure-1',
                  clef: { sign: 'G', line: 2 }
                })
              ]
            }),
            createStaff({
              id: 'staff-2',
              measures: [
                createMeasure({
                  id: 'part-1-staff-2-measure-1',
                  clef: { sign: 'F', line: 4 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'bass-c',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 3 },
                          duration: createDuration('whole')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const lowerStaffEvent =
      roundTrip.parts[0].staves[1].measures[0].voices[0].events[0]

    expect(exported).toMatch(
      /<type>whole<\/type>[\s\S]*<staff>2<\/staff>/
    )
    expect(lowerStaffEvent).toMatchObject({
      type: 'note',
      pitch: {
        step: 'C',
        octave: 3
      },
      position: {
        tick: 0
      },
      duration: {
        value: 'whole'
      }
    })
  })

  it('import-export.round-trip-multi-part-structure score-setup.create-ensemble-score exports and re-imports multi-part structure', () => {
    const score = createScore({
      title: 'Quartet Round Trip',
      parts: [
        createPart({
          id: 'violin-1',
          name: 'Violin I',
          abbreviation: 'Vln. I',
          staves: [
            createStaff({
              id: 'staff-1',
              measures: [
                createMeasure({ id: 'violin-1-staff-1-measure-1' })
              ]
            })
          ]
        }),
        createPart({
          id: 'viola',
          name: 'Viola',
          abbreviation: 'Vla.',
          staves: [
            createStaff({
              id: 'staff-1',
              measures: [
                createMeasure({
                  id: 'viola-staff-1-measure-1',
                  clef: { sign: 'C', line: 3 }
                })
              ]
            })
          ]
        }),
        createPart({
          id: 'cello',
          name: 'Cello',
          abbreviation: 'Vc.',
          staves: [
            createStaff({
              id: 'staff-1',
              measures: [
                createMeasure({
                  id: 'cello-staff-1-measure-1',
                  clef: { sign: 'F', line: 4 }
                })
              ]
            })
          ]
        })
      ]
    })

    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<score-part id="violin-1">')
    expect(exported).toContain('<part id="viola">')
    expect(exported).toContain('<part id="cello">')
    expect(roundTrip.parts.map((part) => part.id)).toEqual([
      'violin-1',
      'viola',
      'cello'
    ])
    expect(roundTrip.parts.map((part) => part.name)).toEqual([
      'Violin I',
      'Viola',
      'Cello'
    ])
    expect(
      roundTrip.parts.map((part) => part.staves[0].measures[0].clef)
    ).toEqual([
      { sign: 'G', line: 2, octaveChange: undefined },
      { sign: 'C', line: 3, octaveChange: undefined },
      { sign: 'F', line: 4, octaveChange: undefined }
    ])
  })

  it('import-export.round-trip-multi-part-basic-events preserves notes in separate parts', () => {
    const score = createScore({
      title: 'Part Notes Round Trip',
      parts: [
        createPart({
          id: 'violin',
          name: 'Violin',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'violin-note',
                          pitch: { step: 'E', octave: 5 },
                          duration: createDuration('whole')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        }),
        createPart({
          id: 'cello',
          name: 'Cello',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  clef: { sign: 'F', line: 4 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'cello-note',
                          pitch: { step: 'C', octave: 3 },
                          duration: createDuration('whole')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    const roundTrip = parseMusicXml(serializeMusicXml(score))

    expect(
      roundTrip.parts.map(
        (part) => part.staves[0].measures[0].voices[0].events[0]
      )
    ).toMatchObject([
      {
        id: 'violin-staff-1-event-1',
        type: 'note',
        pitch: { step: 'E', octave: 5 }
      },
      {
        id: 'cello-staff-1-event-1',
        type: 'note',
        pitch: { step: 'C', octave: 3 }
      }
    ])
  })

  it('preserves multiple augmentation dots across MusicXML round trips', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'double-dotted-note',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: createDuration('quarter', 2)
                        }),
                        createRest({
                          id: 'double-dotted-rest',
                          position: createTimePosition(
                            TICKS_PER_QUARTER * 1.75
                          ),
                          duration: createDuration('quarter', 2)
                        }),
                        createRest({
                          id: 'final-rest',
                          position: createTimePosition(
                            TICKS_PER_QUARTER * 3.5
                          ),
                          duration: createDuration('eighth')
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const events =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events

    expect(exported.match(/<dot\/>/g)).toHaveLength(4)
    expect(events).toMatchObject([
      { type: 'note', duration: { value: 'quarter', dots: 2 } },
      { type: 'rest', duration: { value: 'quarter', dots: 2 } },
      { type: 'rest', duration: { value: 'eighth', dots: 0 } }
    ])
  })

  it('preserves mixed triplet groups across MusicXML round trips', () => {
    const tripletEighthDuration = {
      ...createDuration('eighth'),
      tuplet: {
        actualNotes: 3,
        normalNotes: 2
      }
    }
    const tripletQuarterDuration = {
      ...createDuration('quarter'),
      tuplet: {
        actualNotes: 3,
        normalNotes: 2
      }
    }
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'triplet-note-1',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: tripletEighthDuration
                        }),
                        createNote({
                          id: 'triplet-note-2',
                          position: createTimePosition(
                            TICKS_PER_QUARTER / 3
                          ),
                          pitch: { step: 'E', octave: 4 },
                          duration: tripletQuarterDuration
                        }),
                        createRest({
                          id: 'remainder',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ],
                      tuplets: [
                        {
                          id: 'triplet-1',
                          eventIds: [
                            'triplet-note-1',
                            'triplet-note-2'
                          ],
                          actualNotes: 3,
                          normalNotes: 2
                        }
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const voice =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0]

    expect(exported.match(/<time-modification>/g)).toHaveLength(2)
    expect(exported).toContain('<tuplet type="start"/>')
    expect(exported).toContain('<tuplet type="stop"/>')
    expect(voice.events.slice(0, 2)).toMatchObject([
      {
        type: 'note',
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        type: 'note',
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      }
    ])
    expect(voice.tuplets).toEqual([
      {
        id: 'measure-1-tuplet-1',
        eventIds: ['event-1', 'event-2'],
        actualNotes: 3,
        normalNotes: 2
      }
    ])
  })

  it('exports and re-imports single-voice chord notes', () => {
    const score = createScore({
      title: 'Chord Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'c-major',
                          pitch: { step: 'C', octave: 4 },
                          pitches: [
                            { step: 'C', octave: 4 },
                            { step: 'E', octave: 4 },
                            { step: 'G', octave: 4 }
                          ]
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const event =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported.match(/<chord\/>/g)).toHaveLength(2)
    expect(event).toMatchObject({
      type: 'note',
      pitches: [
        { step: 'C', octave: 4 },
        { step: 'E', octave: 4 },
        { step: 'G', octave: 4 }
      ]
    })
  })

  it('exports and re-imports harmony symbols', () => {
    const score = createScore({
      title: 'Harmony Sketch',
      harmonies: [
        {
          id: 'cmaj7',
          measureId: 'measure-1',
          tick: TICKS_PER_QUARTER,
          text: 'Cmaj7/G',
          root: { step: 'C' },
          kind: 'major-seventh',
          bass: { step: 'G' }
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<harmony>')
    expect(exported).toContain('<root-step>C</root-step>')
    expect(exported).toContain('<bass-step>G</bass-step>')
    expect(roundTrip.harmonies).toEqual([
      {
        id: 'measure-1-harmony-1',
        measureId: 'measure-1',
        tick: TICKS_PER_QUARTER,
        text: 'Cmaj7/G',
        root: { step: 'C' },
        kind: 'major-seventh',
        bass: { step: 'G' }
      }
    ])
  })

  it('lyrics.musicxml-round-trip exports and re-imports lyrics on notes', () => {
    const score = createScore({
      title: 'Lyric Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'sung-note',
                          pitch: { step: 'C', octave: 4 },
                          lyrics: [
                            {
                              number: 1,
                              syllabic: 'begin',
                              text: '사랑'
                            },
                            {
                              number: 2,
                              syllabic: 'single',
                              text: 'love',
                              extend: true
                            },
                            {
                              number: 4,
                              syllabic: 'single',
                              text: '한-글 두음절'
                            }
                          ]
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const event =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<lyric number="1">')
    expect(exported).toContain('<lyric number="4">')
    expect(exported).toContain('<text>한-글 두음절</text>')
    expect(exported).toContain('<text>사랑</text>')
    expect(event).toMatchObject({
      type: 'note',
      lyrics: [
        { number: 1, syllabic: 'begin', text: '사랑' },
        { number: 2, syllabic: 'single', text: 'love', extend: true },
        { number: 4, syllabic: 'single', text: '한-글 두음절' }
      ]
    })
  })

  it('lyrics.musicxml-import accepts multiple text nodes in one lyric', () => {
    const score = parseMusicXml(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>${TICKS_PER_QUARTER}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>${TICKS_PER_QUARTER * 4}</duration>
        <type>whole</type>
        <lyric number="3">
          <syllabic>single</syllabic>
          <text>한</text>
          <elision/>
          <text>음절</text>
        </lyric>
      </note>
    </measure>
  </part>
</score-partwise>`)
    const event = score.parts[0].staves[0].measures[0].voices[0].events[0]

    expect(event).toMatchObject({
      type: 'note',
      lyrics: [{ number: 3, syllabic: 'single', text: '한 음절' }]
    })
  })

  it('ornaments.musicxml-round-trip preserves all ornament kinds', () => {
    const score = createScore({
      title: 'Ornament Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'ornamented-note',
                          pitch: { step: 'D', octave: 4 },
                          graceNotes: [
                            {
                              pitch: { step: 'C', octave: 4 },
                              slash: true
                            }
                          ],
                          ornaments: ['trill', 'mordent', 'turn']
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const event =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<grace slash="yes"/>')
    expect(exported).toContain('<trill/>')
    expect(exported).toContain('<mordent/>')
    expect(exported).toContain('<turn/>')
    expect(event).toMatchObject({
      type: 'note',
      graceNotes: [
        {
          pitch: { step: 'C', octave: 4 },
          slash: true
        }
      ],
      ornaments: ['trill', 'mordent', 'turn']
    })
  })
})

function readScoreClefs(score: ReturnType<typeof parseMusicXml>): string[] {
  return score.parts.flatMap((part) =>
    part.staves.map((staff) => {
      const clef = staff.measures[0].clef

      return `${clef.sign}${clef.line}`
    })
  )
}

function readScoreEventPitches(score: ReturnType<typeof parseMusicXml>): string[] {
  return score.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.measures.flatMap((measure) =>
        measure.voices.flatMap((voice) =>
          voice.events.flatMap((event) =>
            event.type === 'note'
              ? [`${event.pitch.step}${event.pitch.octave}`]
              : []
          )
        )
      )
    )
  )
}

function readScoreDynamics(score: ReturnType<typeof parseMusicXml>): string[] {
  return (score.dynamics ?? []).map((dynamic) => dynamic.value)
}

function readScoreArticulations(score: ReturnType<typeof parseMusicXml>): string[] {
  return score.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.measures.flatMap((measure) =>
        measure.voices.flatMap((voice) =>
          voice.events.flatMap((event) =>
            event.type === 'note' ? event.articulations ?? [] : []
          )
        )
      )
    )
  )
}

function readScoreVoiceCounts(score: ReturnType<typeof parseMusicXml>): number[] {
  return score.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.measures.map((measure) => measure.voices.length)
    )
  )
}
