import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../musicxml/parse'
import { createNewScore } from '../renderer/src/editor/new-score'
import { createNativeProject, decodeNativeProject, encodeNativeProject, MAX_PROJECT_BYTES, validateNativeProject } from './schema'

const source = () => createNativeProject(parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8')))

describe('native project schema', () => {
  it('accepts the actual quartet template with part-scoped staff IDs', () => {
    const score = createNewScore({ title: 'Quartet', templateId: 'string-quartet', measureCount: 4, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    expect(score.parts).toHaveLength(4)
    expect(new Set(score.parts.flatMap(part => part.staves.map(staff => staff.id))).size).toBe(1)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score.parts).toHaveLength(4)
  })
  it('preserves the entire score and portable part layout/view/settings without local storage', () => {
    const project = source()
    const piano = project.score.parts[1]!
    project.partLayouts = [{ partId: piano.id, title: 'Piano part', layout: {
      pageSetup: { pageSize: 'letter', orientation: 'landscape', pageMarginMm: 12, staffSizePercent: 90, systemSpacingPercent: 110 },
      pageBreakBeforeMeasureIds: [piano.staves[0]!.measures[1]!.id]
    } }]
    project.score.layout = { systemBreakBeforeMeasureIds: [piano.staves[0]!.measures[1]!.id] }
    project.view = { mode: 'part', partId: piano.id }
    project.settings.inputMode = 'pitch-first'
    const reopened = decodeNativeProject(encodeNativeProject(project))
    expect(reopened).toEqual(JSON.parse(JSON.stringify(project)))
    expect(reopened.score.parts[1]!.staves).toHaveLength(2)
    expect(reopened.score.slurs).toHaveLength(1)
    expect(reopened.score.hairpins).toHaveLength(1)
    expect(reopened.score.parts[0]!.staves[0]!.measures[0]!.transposition?.chromatic).toBe(-2)
  })

  it.each([0, 5, 100, '1'])('rejects unsupported version %s without silently migrating or stripping', version => {
    expect(() => validateNativeProject({ ...source(), version })).toThrow(/Unsupported.*version/)
  })

  it('migrates version 1 without changing its source and preserves version 2 span geometry', () => {
    const legacy = { ...source(), version: 1 }
    const contents = JSON.stringify(legacy)
    expect(decodeNativeProject(contents)).toEqual({ ...legacy, version: 4 })
    expect(JSON.stringify(legacy)).toBe(contents)
    const project = source()
    project.score.hairpins![0].engraving = { placement: 'above', offsetX: 0.5, offsetY: -1, height: 3 }
    project.score.slurs![0].engraving = { placement: 'below', height: 2 }
    expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
    const v2 = JSON.stringify({ ...project, version: 2 })
    expect(decodeNativeProject(v2)).toEqual(project)
    expect(() => validateNativeProject({ ...project, version: 1 })).toThrow(/version 1/)
    project.score.hairpins![0].engraving.offsetX = 99
    expect(() => validateNativeProject(project)).toThrow()
  })

  it('rejects unknown fields instead of losing them on resave', () => {
    const project = source()
    expect(() => validateNativeProject({ ...project, devicePath: '/local/path' })).toThrow()
    expect(() => validateNativeProject({ ...project, settings: { ...project.settings, futureMode: true } })).toThrow()
    expect(() => validateNativeProject({ ...project, score: { ...project.score, unsupportedNotation: [] } })).toThrow()
  })

  it('rejects invalid scalar values, malformed JSON, size and nesting abuse', () => {
    const project = source()
    project.score.tempo!.bpm = NaN
    expect(() => encodeNativeProject(project)).toThrow()
    expect(() => decodeNativeProject('{')).toThrow(/JSON/)
    expect(() => decodeNativeProject(' '.repeat(MAX_PROJECT_BYTES + 1))).toThrow(/limit/)
    let nested: unknown = {}
    for (let index = 0; index < 40; index++) nested = { nested }
    expect(() => validateNativeProject(nested)).toThrow(/nesting/)
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic
    expect(() => validateNativeProject(cyclic)).toThrow(/cycle/)
  })

  it('rejects duplicate event IDs, dangling or cross-part span endpoints', () => {
    const project = source()
    project.score.slurs![0]!.endEventId = project.score.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[0]!.id
    expect(() => validateNativeProject(project)).toThrow(/span endpoints/)
    project.score.slurs![0]!.endEventId = 'missing'
    expect(() => validateNativeProject(project)).toThrow(/span endpoints/)
    const duplicate = source()
    const events = duplicate.score.parts[1]!.staves[1]!.measures[0]!.voices[0]!.events
    events[1]!.id = events[0]!.id
    expect(() => validateNativeProject(duplicate)).toThrow(/Duplicate project ID/)
  })

  it('rejects a part layout pointing into another part and dangling measure marks', () => {
    const project = source()
    project.partLayouts = [{ partId: 'P2', layout: { pageBreakBeforeMeasureIds: [project.score.parts[0]!.staves[0]!.measures[0]!.id] } }]
    expect(() => validateNativeProject(project)).toThrow(/Dangling measure/)
    project.partLayouts = []
    project.score.dynamics![0]!.measureId = 'missing'
    expect(() => validateNativeProject(project)).toThrow(/Dangling measure/)
  })

  it('rejects invalid tuplet references and overlapping events', () => {
    const project = source()
    project.score.parts[1]!.staves[0]!.measures[1]!.voices[0]!.tuplets![0]!.eventIds[0] = 'missing'
    expect(() => validateNativeProject(project)).toThrow(/tuplet/)
    const overlap = source()
    overlap.score.parts[1]!.staves[1]!.measures[0]!.voices[0]!.events[1]!.position.tick = 0
    expect(() => validateNativeProject(overlap)).toThrow(/rhythm/)
  })

  it('makes an independent validated snapshot and permits unfinished voice gaps', () => {
    const project = source()
    const original = project.score.title
    const snapshot = validateNativeProject(project)
    project.score.title = 'Changed'
    expect(snapshot.score.title).toBe(original)
    const part = snapshot.score.parts[0]!
    part.staves[0]!.measures[0]!.voices[0]!.events = []
    expect(() => validateNativeProject(snapshot)).not.toThrow()
  })
})
