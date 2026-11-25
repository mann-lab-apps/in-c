import { describe, expect, it } from 'vitest'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { applyScoreCommand, buildTieCommand, collectTiePairs, collectUnsupportedChordTieWarnings } from '../score-core'

function writtenScore(transpose: string) {
  return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Wind</part-name></score-part></part-list><part id="P1">
    <measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>${transpose}</attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><notations><ornaments><trill-mark/></ornaments></notations></note>
    <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
    <measure number="2"><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
    <measure number="3"><attributes><transpose><diatonic>0</diatonic><chromatic>0</chromatic></transpose></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
  </part></score-partwise>`
}

it.each([false, true])('preserves a single-note enharmonic tie with system break %s', (systemBreak) => {
  const transpose = '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>'
  const time = systemBreak ? 2 : 4
  const attributes = `<attributes><divisions>1</divisions><time><beats>${time}</beats><beat-type>4</beat-type></time>${transpose}</attributes>`
  const first = `<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch>
    <duration>${systemBreak ? 2 : 1}</duration><tie type="start"/><type>${systemBreak ? 'half' : 'quarter'}</type>
    <accidental>sharp</accidental><notations><tied type="start"/></notations></note>`
  const second = `<note><pitch><step>G</step><alter>-1</alter><octave>4</octave></pitch>
    <duration>1</duration><tie type="stop"/><type>quarter</type>
    <accidental>flat</accidental><notations><tied type="stop"/></notations></note>`
  const last = `<note><pitch><step>A</step><octave>4</octave></pitch>
    <duration>${systemBreak ? 1 : 2}</duration><type>${systemBreak ? 'quarter' : 'half'}</type></note>`
  const boundary = systemBreak ? '</measure><measure number="2"><print new-system="yes"/>' : ''
  const source = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Clarinet</part-name>
    </score-part></part-list><part id="P1"><measure number="1">${attributes}${first}${boundary}${second}${last}</measure></part></score-partwise>`
  const { score, report } = parseMusicXmlWithReport(source)
  expect(report.warnings).toEqual([])
  const events = (value: typeof score) => value.parts[0].staves[0].measures.flatMap(measure => measure.voices[0].events)
  expect(events(score).slice(0, 2)).toMatchObject([
    { pitch: { step: 'F', alter: 1 }, ties: { start: true } },
    { pitch: { step: 'G', alter: -1 }, ties: { stop: true } }
  ])
  const [start, stop] = events(score)
  const pairs = [{ fromEventId: start.id, toEventId: stop.id, respellsPitch: true }]
  expect(collectTiePairs(score)).toEqual(pairs)
  expect(collectUnsupportedChordTieWarnings(score)).toEqual([])
  const timeline = createPlaybackTimeline(score)
  const end = systemBreak ? 3 : 2
  expect(timeline.events.map(event => [event.startBeat, event.durationBeats, event.frequency])).toEqual([
    [0, end, expect.closeTo(329.628, 2)],
    [end, 4 - end, expect.closeTo(391.995, 2)]
  ])
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  expect(native).toEqual(score)
  const xml = serializeMusicXml(native)
  expect(xml).toMatch(/<note>\s*<pitch>\s*<step>G<\/step>[\s\S]*?<accidental>flat<\/accidental>[\s\S]*?<tied type="stop"\/>/)
  const reopened = parseMusicXmlWithReport(xml)
  expect(reopened.report.warnings).toEqual([])
  expect(events(reopened.score)).toEqual(events(score))
  expect(collectTiePairs(reopened.score)).toEqual(pairs)
  expect(serializeMidi(reopened.score)).toEqual(serializeMidi(score))
  const remove = buildTieCommand(score, stop.id, false)
  expect(remove).toBeDefined()
  const untied = applyScoreCommand(score, remove!).score
  expect(collectTiePairs(untied)).toEqual([])
  expect(buildTieCommand(untied, start.id, true)).toBeUndefined()
  expect(() => parseMusicXml(source.replace('<alter>-1</alter>', '<alter>0</alter>'))).toThrow(/타이 관계/)
  if (systemBreak) {
    const changed = source.replace(boundary, `${boundary}<attributes><transpose><chromatic>0</chromatic></transpose></attributes>`)
    expect(() => parseMusicXml(changed)).toThrow(/타이 관계/)
  }
})

describe('written instrument transposition', () => {
  it.each([
    ['Bb', -1, -2, 0, 58],
    ['Eb', -5, -9, 0, 51],
    ['F', -4, -7, 0, 53],
    ['Bb bass', -1, -2, -1, 46]
  ])('preserves %s written notes through save and plays sounding chords/MIDI', (_name, diatonic, chromatic, octaveChange, midi) => {
    const { score, report } = parseMusicXmlWithReport(writtenScore(`<transpose><diatonic>${diatonic}</diatonic><chromatic>${chromatic}</chromatic><octave-change>${octaveChange}</octave-change></transpose>`))
    expect(report.warnings).toEqual([])
    const reopened = parseMusicXml(serializeMusicXml(score))
    const measures = reopened.parts[0].staves[0].measures
    expect(measures[0].transposition).toEqual({ diatonic, chromatic, octaveChange })
    expect(measures[1].transposition).toEqual(measures[0].transposition)
    expect(measures[2].transposition?.chromatic).toBe(0)
    expect(measures[0].voices[0].events[0]).toMatchObject({ pitch: { step: 'C', octave: 4 } })
    const timeline = createPlaybackTimeline(reopened)
    const frequency = (pitch: number) => 440 * 2 ** ((pitch - 69) / 12)
    expect(timeline.events[0].frequency).toBeCloseTo(frequency(midi))
    expect(timeline.events[0].frequencies?.[1]).toBeCloseTo(frequency(midi + 4))
    expect(timeline.events[0].trillFrequency).toBeCloseTo(frequency(midi + 2))
    expect(timeline.events[1].frequency).toBeCloseTo(frequency(midi))
    expect(timeline.events[2].frequency).toBeCloseTo(frequency(60))
    const bytes = Array.from(serializeMidi(reopened))
    expect(bytes.some((value, i) => value === 0x90 && bytes[i + 1] === midi)).toBe(true)
  })

  it.each([
    ['divisions', '1', '+1'],
    ['fifths', '1', '+01'],
    ['octave', '4', '+4'],
    ['diatonic', '1', '+1'],
    ['octave-change', '1', '+1'],
    ['duration', '4', '+4']
  ])('reads an explicitly positive %s without changing the score', (field, canonical, signed) => {
    const xml = writtenScore('<transpose><diatonic>1</diatonic><chromatic>2</chromatic><octave-change>1</octave-change></transpose>')
      .replace('</divisions><time>', '</divisions><key><fifths>1</fifths></key><time>')
    const signedXml = xml.replace(`<${field}>${canonical}</${field}>`, `<${field}>${signed}</${field}>`)
    const { score, report } = parseMusicXmlWithReport(signedXml)
    const control = parseMusicXml(xml)
    expect(report.warnings).toEqual([])
    expect(score).toEqual(control)
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(control))
    expect(serializeMidi(score)).toEqual(serializeMidi(control))
  })

  it('keeps numbered staff transposition independent', () => {
    const xml = writtenScore('<staves>2</staves><transpose number="1"><chromatic>-2</chromatic></transpose><transpose number="2"><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>')
    const reopened = parseMusicXml(serializeMusicXml(parseMusicXml(xml)))
    expect(reopened.parts[0].staves[0].measures[1].transposition?.chromatic).toBe(-2)
    expect(reopened.parts[0].staves[1].measures[1].transposition).toMatchObject({ chromatic: 0, octaveChange: -1 })
  })

  it('infers an omitted graphic type only when the duration and written dots match', () => {
    const source = (events: string) => `<score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>Clarinet</part-name></score-part></part-list>
      <part id="P1"><measure number="1"><attributes><divisions>6</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>
      <transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>${events}</measure></part>
      </score-partwise>`
    const control = '<note><pitch><step>F</step><octave>4</octave></pitch><duration>9</duration><type>quarter</type><dot/></note>' +
      '<note><rest/><duration>3</duration><type>eighth</type></note>' +
      '<note><pitch><step>G</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type></note>' +
      '<note><pitch><step>A</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type></note>'
    const omitted = control.replaceAll(/<type>[^<]+<\/type>/g, '')
    const { score, report } = parseMusicXmlWithReport(source(omitted))
    const explicit = parseMusicXml(source(control))
    expect(report.warnings).toEqual([])
    expect(score).toEqual(explicit)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(explicit)
    expect(serializeMidi(score)).toEqual(serializeMidi(explicit))
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(explicit))
    expect(() => parseMusicXml(source(omitted.replace('<dot/>', '')))).toThrow(/지원하는 음가/)
    expect(() => parseMusicXml(source(control.replace('<type>quarter</type>', '<type>eighth</type>')))).toThrow(/type과 duration/)
  })

  it('infers a missing type using the declared tuplet ratio', () => {
    const notes = ['C', 'D', 'E'].map((step, index) =>
      `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type>
      <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>${index === 1 ? '' :
      `<notations><tuplet type="${index === 0 ? 'start' : 'stop'}"/></notations>`}</note>`).join('')
    const source = (events: string) => `<score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
      <part id="P1"><measure number="1"><attributes><divisions>3</divisions><time><beats>1</beats><beat-type>4</beat-type></time></attributes>
      ${events}</measure></part></score-partwise>`
    const { score, report } = parseMusicXmlWithReport(source(notes.replaceAll('<type>eighth</type>', '')))
    expect(report.warnings).toEqual([])
    expect(score).toEqual(parseMusicXml(source(notes)))
    expect(score.parts[0].staves[0].measures[0].voices[0].tuplets).toEqual([
      expect.objectContaining({ actualNotes: 3, normalNotes: 2, eventIds: ['event-1', 'event-2', 'event-3'] })
    ])
  })

  it('rejects unsupported doubling instead of silently changing playback on save', () => {
    expect(() => parseMusicXml(writtenScore('<transpose><chromatic>0</chromatic><double/></transpose>'))).toThrow(/transpose/)
  })

  it('reads transposition across separate attribute blocks at the start of a measure', () => {
    const grouped = writtenScore('<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>')
      .replace('<measure number="3"><attributes>', '<measure number="3"><attributes><divisions>1</divisions>')
    const split = grouped
      .replace('</time><transpose>', '</time></attributes><attributes><transpose>')
      .replace('<measure number="3"><attributes><divisions>1</divisions><transpose>',
        '<measure number="3"><attributes><divisions>1</divisions></attributes><attributes><transpose>')
    const control = parseMusicXml(grouped)
    const { score, report } = parseMusicXmlWithReport(split)
    expect(report.warnings).toEqual([])
    expect(score).toEqual(control)
    expect(score.parts[0].staves[0].measures.map(measure => measure.transposition?.chromatic)).toEqual([-2, -2, 0])
    expect(serializeMidi(score)).toEqual(serializeMidi(control))
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score)))
    expect(native.score).toEqual(score)
    expect(serializeMidi(parseMusicXml(serializeMusicXml(native.score)))).toEqual(serializeMidi(control))
  })

  it('uses each note duration unit and applies a staff transposition after a backup to tick zero', () => {
    const transpose = '<transpose number="2"><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>'
    const note = (staff: number, duration: number) =>
      `<note><pitch><step>C</step><octave>4</octave></pitch><duration>${duration}</duration><type>quarter</type><staff>${staff}</staff></note>`
    const opening = '<divisions>1</divisions><time><beats>1</beats><beat-type>4</beat-type></time><staves>2</staves>'
    const grouped = `<attributes>${opening}${transpose}</attributes>${note(1, 1)}<backup><duration>1</duration></backup>${note(2, 1)}`
    const split = `<attributes>${opening}</attributes>${note(1, 1)}<backup><duration>1</duration></backup><attributes><divisions>2</divisions>${transpose}</attributes>${note(2, 2)}`
    const xml = (measure: string) => '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Wind</part-name></score-part></part-list>'
      + `<part id="P1"><measure number="1">${measure}</measure></part></score-partwise>`
    const { score, report } = parseMusicXmlWithReport(xml(split))
    expect(report.warnings).toEqual([])
    expect(score).toEqual(parseMusicXml(xml(grouped)))
    expect(score.parts[0].staves.map(staff => staff.measures[0].transposition?.chromatic)).toEqual([undefined, -2])
    const sounding = createPlaybackTimeline(score).events.map(event => [event.startBeat, event.durationBeats, event.frequency])
    expect(sounding).toEqual([[0, 1, expect.closeTo(261.626, 2)], [0, 1, expect.closeTo(233.082, 2)]])
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
  })

  it('applies a shared transposition to all staves declared at the same boundary', () => {
    const transpose = '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>'
    const grouped = writtenScore(`<staves>2</staves>${transpose}`)
    const split = grouped.replace(`<staves>2</staves>${transpose}`, `${transpose}</attributes><attributes><staves>2</staves>`)
    const score = parseMusicXml(split)
    expect(score.parts[0].staves.map(staff => staff.measures[0].transposition?.chromatic)).toEqual([-2, -2])
    expect(score).toEqual(parseMusicXml(grouped))
  })
})

it.each([
  { sign: 'G', line: 2, octaveChange: -1 },
  { sign: 'F', line: 4, octaveChange: 2 },
  { sign: 'C', line: 3, octaveChange: 0 }
])('opens an omitted $sign clef line as line $line while preserving pitches and octave', ({ sign, line, octaveChange }) => {
  const octaveTag = octaveChange ? `<clef-octave-change>${octaveChange}</clef-octave-change>` : ''
  const clef = (lineTag: string) => `<clef><sign>${sign}</sign>${lineTag}${octaveTag}</clef>`
  const explicit = parseMusicXml(writtenScore(clef(`<line>${line}</line>`)))
  const { score, report } = parseMusicXmlWithReport(writtenScore(clef('')))
  expect(score).toEqual(explicit)
  expect(report.warnings).toEqual([])
  expect(serializeMidi(score)).toEqual(serializeMidi(explicit))
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  expect(parseMusicXml(serializeMusicXml(native))).toEqual(parseMusicXml(serializeMusicXml(explicit)))
  expect(() => parseMusicXml(writtenScore(clef('<line>unknown</line>')))).toThrow(/line/)
})

it.each([
  { duration: '1', sourceTicks: 13440 },
  { duration: '1.9999999999999999999', sourceTicks: null }
])('reports chord member length $duration when the current chord has a shared duration', ({ duration, sourceTicks }) => {
  const control = writtenScore('<transpose><chromatic>-2</chromatic></transpose>')
  const source = control.replace(
    '<step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type>',
    `<step>E</step><octave>4</octave></pitch><duration>${duration}</duration><type>quarter</type>`
  )
  const previous = parseMusicXmlWithReport(control)
  const { score, report } = parseMusicXmlWithReport(source)
  expect(previous.report.warnings).toEqual([])
  expect(score).toEqual(previous.score)
  expect(serializeMidi(score)).toEqual(serializeMidi(previous.score))
  expect(report.warnings).toEqual([expect.objectContaining({
    path: 'part[1].measure[1].note[2].duration',
    message: expect.stringContaining(`"sourceTicks":${sourceTicks},"appliedTicks":53760,"duration":"${duration}","divisions":"1"`)
  })])
})

describe('transposition at the preceding measure end', () => {
  const header = '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Wind</part-name></score-part></part-list><part id="P1">'
  const attributes = (elements: string) => `<attributes>${elements}</attributes>`
  const transpose = (chromatic: number, staff?: number) =>
    `<transpose${staff ? ` number="${staff}"` : ''}><chromatic>${chromatic}</chromatic></transpose>`
  const time = '<divisions>1</divisions><time><beats>2</beats><beat-type>4</beat-type></time>'
  const note = (step: string, staff?: number) =>
    `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>${staff ? `<staff>${staff}</staff>` : ''}</note>`
  const bar = (number: number, elements: string) => `<measure number="${number}">${elements}</measure>`
  const wrap = (...measures: string[]) => header + measures.join('') + '</part></score-partwise>'
  const sounding = (score: ReturnType<typeof parseMusicXml>) => createPlaybackTimeline(score).events.flatMap(event =>
    event.frequency === undefined ? [] :
      [[event.startBeat, event.durationBeats, Math.round(69 + 12 * Math.log2(event.frequency / 440))]])

  it.each([false, true])('applies a closing reset from the next downbeat with a redundant opening block: %s', split => {
    const notes = note('C') + note('D')
    const opening = bar(1, attributes(time + transpose(-2)) + notes)
    const reset = attributes(transpose(0))
    const source = wrap(opening, bar(2, (split ? attributes('<divisions>1</divisions>') : '') + notes + reset), bar(3, notes))
    const control = parseMusicXml(wrap(opening, bar(2, notes), bar(3, reset + notes)))
    const { score, report } = parseMusicXmlWithReport(source)

    expect(score).toEqual(control)
    expect(report.warnings).toEqual([])
    expect(sounding(score)).toEqual([[0, 1, 58], [1, 1, 60], [2, 1, 58], [3, 1, 60], [4, 1, 60], [5, 1, 62]])
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(serializeMidi(native)).toEqual(serializeMidi(control))
    expect(parseMusicXml(serializeMusicXml(native))).toEqual(control)
  })

  it.each([false, true])('rejects a change between pitches with a redundant opening block: %s', split => {
    const opening = bar(1, attributes(time) + note('C') + note('D'))
    const positioned = bar(2, (split ? attributes('<divisions>1</divisions>') : '') +
      note('E') + attributes(transpose(-2)) + note('F'))
    const source = wrap(opening, positioned, bar(3, note('G') + note('A')))
    expect(() => parseMusicXmlWithReport(source)).toThrow(
      '마디 안 이조를 정확히 보존할 수 없습니다: Wind (P1), 2마디 1보표, 1박 경과, 이조 0 → -2반음'
    )
  })

  it.each([false, true])('retains the sounding pitches when an interior declaration repeats the effective shift: %s', split => {
    const opening = bar(1, attributes(time + transpose(-2)) + note('C') + note('D'))
    const positioned = bar(2, (split ? attributes('<divisions>1</divisions>') : '') +
      note('E') + attributes(transpose(-2)) + note('F'))
    const { score } = parseMusicXmlWithReport(wrap(opening, positioned, bar(3, note('G') + note('A'))))
    expect(sounding(score).map(([, , midi]) => midi)).toEqual([58, 60, 62, 63, 65, 67])
  })

  it('applies a transposition after leading rests and carries it over the next bar', () => {
    const rest = '<note><rest/><duration>1</duration><type>quarter</type></note>'
    const notes = note('C') + note('D')
    const opening = bar(1, attributes(time + transpose(0)) + notes)
    const changed = attributes(transpose(-2))
    const source = wrap(opening, bar(2, attributes('<divisions>1</divisions>') + rest + changed + note('C')), bar(3, notes))
    const control = parseMusicXml(wrap(opening, bar(2, changed + rest + note('C')), bar(3, notes)))
    const { score, report } = parseMusicXmlWithReport(source)

    expect(score).toEqual(control)
    expect(report.warnings).toEqual([expect.objectContaining({
      path: 'part[1].measure[2].attributes[2].transpose[1]',
      message: expect.stringMatching(/^Moved transposition before first pitched content .*"tick":13440.*"chromatic":"-2"/)
    })])
    expect(sounding(score)).toEqual([[0, 1, 60], [1, 1, 62], [3, 1, 58], [4, 1, 58], [5, 1, 60]])
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(serializeMidi(native)).toEqual(serializeMidi(control))
    expect(parseMusicXml(serializeMusicXml(native))).toEqual(control)
  })

  it('represents a staff-only change after its rest without disturbing another staff', () => {
    const opening = attributes(time + '<staves>2</staves>')
    const upper = note('C', 1) + note('D', 1)
    const backup = '<backup><duration>2</duration></backup>'
    const rest = '<note><rest/><duration>1</duration><type>quarter</type><staff>2</staff></note>'
    const change = attributes(transpose(-2, 2))
    const source = wrap(bar(1, opening + upper + backup + rest + change + note('C', 2)))
    const control = parseMusicXml(wrap(bar(1, opening + change + upper + backup + rest + note('C', 2))))
    const { score, report } = parseMusicXmlWithReport(source)

    expect(score).toEqual(control)
    expect(sounding(score)).toEqual([[0, 1, 60], [1, 1, 62], [1, 1, 58]])
    expect(report.warnings).toEqual([expect.objectContaining({
      message: expect.stringMatching(/^Moved transposition before first pitched content .*"staff":"2"/)
    })])
  })

  it('rejects inexact changes when earlier harmony, a shared staff or another change prevents relocation', () => {
    const opening = attributes(time)
    const rest = '<note><rest/><duration>1</duration><type>quarter</type></note>'
    const harmony = '<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>'
    const change = attributes(transpose(-2))
    const earlierHarmony = wrap(bar(1, opening + harmony + rest + change + note('C')))
    expect(() => parseMusicXmlWithReport(earlierHarmony)).toThrow(/1마디 1보표.*이조 0 → -2반음/)

    const twoStaffOpening = attributes(time + '<staves>2</staves>')
    const upper = note('C', 1) + note('D', 1)
    const backup = '<backup><duration>2</duration></backup>'
    const earlierStaffNote = wrap(bar(1, twoStaffOpening + upper + backup + rest.replace('</note>', '<staff>2</staff></note>') + change + note('C', 2)))
    expect(() => parseMusicXmlWithReport(earlierStaffNote)).toThrow(/1마디 1보표.*이조 0 → -2반음/)

    const secondChange = attributes(transpose(0))
    const longBar = wrap(bar(1, attributes(time.replace('<beats>2</beats>', '<beats>3</beats>')) +
      rest + change + note('C') + secondChange + note('D')))
    expect(() => parseMusicXmlWithReport(longBar)).toThrow(/1마디 1보표.*이조 0 → -2반음/)
  })

  it('reports the source staff, voice and duration when a forward gap prevents import', () => {
    const forward = '<forward><duration>1</duration><voice>1</voice><staff>1</staff></forward>'
    const source = wrap(bar(1, attributes(time) + forward + attributes(transpose(-2)) + note('C')))
    expect(() => parseMusicXml(source)).toThrow(
      'MusicXML forward가 있는 마디의 성부 길이를 맞출 수 없습니다: part[1].measure[1].forward ' +
      '{"staff":1,"forward":[{"duration":"1","voice":"1","staff":"1"}]}'
    )
    expect(() => parseMusicXml(wrap(bar(1, attributes(time) + note('C'))))).toThrow(
      'MusicXML measure 1의 리듬 정합성이 올바르지 않습니다: gap'
    )
  })

  it.each(['before', 'after'])('warns if a forward gap %s the note shortens a pickup', position => {
    const forward = '<forward><duration>1</duration><voice>1</voice><staff>1</staff></forward>'
    const rest = '<note><rest/><duration>1</duration><type>quarter</type></note>'
    const pickup = (gap: string) =>
      `<measure number="1" implicit="yes">${attributes(time)}${position === 'before' ? gap + note('C') : note('C') + gap}</measure>`
    const { score, report } = parseMusicXmlWithReport(wrap(pickup(forward), bar(2, note('D') + note('E'))))
    const control = parseMusicXmlWithReport(wrap(pickup(rest), bar(2, note('D') + note('E'))))
    expect(sounding(score)).toEqual([[0, 1, 60], [1, 1, 62], [2, 1, 64]])
    expect(sounding(control.score)[1]).toEqual([2, 1, 62])
    expect(control.report.warnings).toEqual([])
    expect(report.warnings).toEqual([expect.objectContaining({
      path: 'part[1].measure[1].forward',
      message: expect.stringMatching(/^Unrepresented pickup forward duration .*"sourceTicks":26880,"importedTicks":13440/)
    })])
  })

  it('uses the actual pickup length for the following downbeat', () => {
    const pickup = `<measure number="1" implicit="yes">${attributes(time + transpose(-2))}${note('C')}${attributes(transpose(0))}</measure>`
    const { score, report } = parseMusicXmlWithReport(wrap(pickup, bar(2, note('C') + note('D'))))
    expect(sounding(score)).toEqual([[0, 1, 58], [1, 1, 60], [2, 1, 62]])
    expect(report.warnings).toEqual([])
  })

  it('keeps the last measure sounding at its opening transposition', () => {
    const notes = note('C') + note('D')
    const source = wrap(bar(1, attributes(time + transpose(-2)) + notes), bar(2, notes + attributes(transpose(0))))
    const { score, report } = parseMusicXmlWithReport(source)
    expect(sounding(score)).toEqual([[0, 1, 58], [1, 1, 60], [2, 1, 58], [3, 1, 60]])
    expect(report.warnings).toContainEqual(expect.objectContaining({ path: 'part[1].measure[2].attributes[1].transpose[1]' }))
  })

  it('carries a numbered reset at the measure end, with a real opening after backup taking precedence', () => {
    const firstStaff = note('C', 1) + note('D', 1)
    const secondStaff = note('E', 2) + note('F', 2)
    const backup = '<backup><duration>2</duration></backup>'
    const notes = firstStaff + backup + secondStaff
    const source = wrap(
      bar(1, attributes(time + '<staves>2</staves>' + transpose(-2)) + notes),
      bar(2, firstStaff + attributes(transpose(0, 2)) + backup + secondStaff),
      bar(3, firstStaff + backup + attributes(transpose(-5, 1)) + secondStaff)
    )
    const { score, report } = parseMusicXmlWithReport(source)
    expect(score.parts[0].staves.map(staff => staff.measures.map(measure => measure.transposition?.chromatic)))
      .toEqual([[-2, -2, -5], [-2, -2, 0]])
    expect(report.warnings).toEqual([])
    expect(sounding(score).filter(([beat]) => beat === 4).map(([, , midi]) => midi)).toEqual([55, 64])
  })
})

describe('integral MusicXML semitones written as decimals', () => {
  const natural = '<accidental>natural</accidental>'
  const xml = '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Clarinet</part-name></score-part></part-list><part id="P1">' +
    '<measure number="1"><attributes><divisions>1</divisions><key><fifths>1</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time>' +
    '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>' +
    '<harmony><root><root-step>D</root-step><root-alter>-1</root-alter></root><kind>minor</kind><bass><bass-step>A</bass-step><bass-alter>1</bass-alter></bass></harmony>' +
    '<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>' +
    '<note><grace slash="yes"/><pitch><step>G</step><alter>-1</alter><octave>4</octave></pitch><type>eighth</type></note>' +
    '<note><pitch><step>F</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type>' + natural + '</note>' +
    '</measure></part></score-partwise>'

  it.each([
    ['<chromatic>-2</chromatic>', '<chromatic>-2.00</chromatic>'],
    ['<alter>1</alter>', '<alter>+1.0</alter>'],
    ['<alter>-1</alter>', '<alter>-1.</alter>'],
    ['<alter>0</alter>', '<alter>-.0</alter>'],
    ['<root-alter>-1</root-alter>', '<root-alter>-1.000</root-alter>'],
    ['<bass-alter>1</bass-alter>', '<bass-alter>+1.</bass-alter>']
  ])('reads %s and its decimal equivalent with identical pitch and export', (canonical, decimal) => {
    const plain = parseMusicXml(xml)
    const { score, report } = parseMusicXmlWithReport(xml.replace(canonical, decimal))

    expect(score).toEqual(plain)
    expect(report.warnings).toEqual([])
    expect(serializeMidi(score)).toEqual(serializeMidi(plain))
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(plain))
    expect(score.harmonies?.[0].text).toBe('Dbm/A#')
  })

  it.each([
    ['alter', '1', '0.999999999999999999'],
    ['root-alter', '-1', '-.5'],
    ['bass-alter', '1', '+1.25'],
    ['chromatic', '-2', '-2.000000000000000001']
  ])('identifies fractional %s as unsupported without rounding its digits', (element, integer, fraction) => {
    const source = xml.replace(`<${element}>${integer}</${element}>`, `<${element}>${fraction}</${element}>`)
    expect(() => parseMusicXml(source)).toThrow(`현재 가져오기에서 지원하지 않는 미분음입니다: ${element}=${fraction}`)
  })

  it('rejects malformed decimal syntax and keeps the double-accidental range', () => {
    expect(() => parseMusicXml(xml.replace('<alter>1</alter>', '<alter>1e0</alter>'))).toThrow('MusicXML 정수 값이 올바르지 않습니다: alter')
    expect(() => parseMusicXml(xml.replace('<alter>1</alter>', '<alter>3.0</alter>'))).toThrow('지원하지 않는 alter 값입니다: 3')
  })
})
