import { describe, expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createScoreRepeatPlaybackPlan } from '../score-core'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml, serializeMusicXmlWithReport } from './index'

function fixture(firstEnding: string, nextEnding: string | undefined, times: number) {
  const note = (pitch: string) =>
    `<note><pitch><step>${pitch}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>`
  const ending = (number: string, type: 'start' | 'stop') =>
    `<ending number="${number}" type="${type}"/>`
  return `<score-partwise version="4.0">
    <work><work-title>Volta pass list</work-title></work>
    <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
    <part id="P1">
      <measure number="1">
        <attributes><divisions>1</divisions><time><beats>1</beats><beat-type>4</beat-type></time></attributes>
        <barline location="left"><repeat direction="forward"/></barline>
        ${note('C')}
      </measure>
      <measure number="2">
        <barline location="left">${ending(firstEnding, 'start')}</barline>
        ${note('D')}
        <barline location="right">${ending(firstEnding, 'stop')}<repeat direction="backward" times="${times}"/></barline>
      </measure>
      <measure number="3">
        ${nextEnding !== undefined ? `<barline location="left">${ending(nextEnding, 'start')}</barline>` : ''}
        ${note('E')}
        ${nextEnding !== undefined ? `<barline location="right">${ending(nextEnding, 'stop')}</barline>` : ''}
      </measure>
    </part>
  </score-partwise>`
}

function alternativeEndings(first: string, second: string, last: string, endCounts: readonly [number, number]) {
  const note = (pitch: string) =>
    `<note><pitch><step>${pitch}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>`
  const branch = (measure: number, pitch: string, passes: string, times?: number) =>
    `<measure number="${measure}">
      <barline location="left"><ending number="${passes}" type="start"/></barline>${note(pitch)}
      <barline location="right"><ending number="${passes}" type="stop"/>${times === undefined ? '' :
        `<repeat direction="backward"${times === 2 ? '' : ` times="${times}"`}/>`}</barline></measure>`
  return `<score-partwise version="4.0">
    <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">
      <measure number="1"><barline location="left"><repeat direction="forward"/></barline>
        <attributes><divisions>1</divisions><time><beats>1</beats><beat-type>4</beat-type></time></attributes>
        ${note('C')}</measure>
      ${branch(2, 'D', first, endCounts[0])}
      ${branch(3, 'E', second, endCounts[1])}
      ${branch(4, 'F', last)}
    </part></score-partwise>`
}

function alternativeEndingsWithFine(stopEnding: 2 | 3) {
  const opening = '<direction placement="above"><direction-type><segno/></direction-type><sound segno="segno"/></direction>'
  const fine = '<direction placement="above"><direction-type><words>Fine</words></direction-type><sound fine="yes"/></direction>'
  const jump = '<direction placement="above"><direction-type><words>D.S. al Fine</words></direction-type><sound dalsegno="segno"/></direction>'
  const measureEnd = '<barline location="right"><ending number="' + stopEnding + '" type="stop"/>'
  return alternativeEndings('1', '2', '3', [2, 2])
    .replace('<note><pitch><step>C', opening + '<note><pitch><step>C')
    .replace(measureEnd, fine + measureEnd)
    .replace('</part>', '<measure number="5"><note><rest/><duration>1</duration><type>quarter</type></note>' +
      jump + '</measure></part>')
}

function separateRepeatBeforeAlternatives({ returnBefore, afterJump }: { returnBefore: boolean; afterJump?: boolean }) {
  const opening = '<direction placement="above"><direction-type><segno/></direction-type><sound segno="segno"/></direction>'
  const source = alternativeEndingsWithFine(3).replace(/<measure number="([1-5])">/g,
    (_, number: string) => `<measure number="${Number(number) + 2}">`)
  const attributes = '<attributes><divisions>1</divisions><time><beats>1</beats><beat-type>4</beat-type></time></attributes>'
  const first = `<measure number="1"><barline location="left"><repeat direction="forward"/></barline>${attributes}
    ${returnBefore ? opening : ''}
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note></measure>`
  const end = afterJump === undefined ? '' : ` after-jump="${afterJump ? 'yes' : 'no'}"`
  const second = `<measure number="2">
    <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <barline location="right"><repeat direction="backward"${end}/></barline></measure>`
  const withoutAttributes = source.replace(attributes, '')
  const remainder = returnBefore ? withoutAttributes.replace(opening, '') : withoutAttributes
  return remainder.replace('<measure number="3">', first + second + '<measure number="3">')
}

function multipleRepeatsBeforeAlternatives(firstAfterJump: boolean, segnoAt: 1 | 4) {
  const segno = '<direction placement="above"><direction-type><segno/></direction-type><sound segno="segno"/></direction>'
  let xml = separateRepeatBeforeAlternatives({ returnBefore: true, afterJump: firstAfterJump })
    .replace(/<measure number="([3-7])">/g, (_, number: string) => `<measure number="${Number(number) + 4}">`)
  if (segnoAt === 4) xml = xml.replace(segno, '')
  const note = (pitch: string) =>
    `<note><pitch><step>${pitch}</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>`
  return xml.replace('<measure number="7">', `
    <measure number="3"><barline location="left"><repeat direction="forward"/></barline>${note('D')}</measure>
    <measure number="4">${segnoAt === 4 ? segno : ''}${note('E')}
      <barline location="right"><repeat direction="backward" after-jump="${firstAfterJump ? 'no' : 'yes'}"/></barline></measure>
    <measure number="5"><barline location="left"><repeat direction="forward"/></barline>${note('F')}</measure>
    <measure number="6">${note('G')}<barline location="right"><repeat direction="backward"/></barline></measure>
    <measure number="7">`)
}

describe('alternative endings returning to the same repeat start', () => {
  it.each([
    { first: '1', second: '2', last: '3', times: [2, 2], selected: [1, 2, 3] },
    { first: '1,3,4', second: '2,5', last: '6', times: [4, 3], selected: [1, 2, 1, 1, 2, 3] }
  ] as const)('shares the opening on each pass for endings $first / $second / $last', ({ first, second, last, times, selected }) => {
    const { score, report } = parseMusicXmlWithReport(alternativeEndings(first, second, last, times))
    expect(report.warnings).toEqual([])
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    if (second === '2') expect(native.parts[0].staves[0].measures[2].volta).toEqual({ passes: [2], start: true, end: true })
    const plan = createScoreRepeatPlaybackPlan(native)
    expect(plan?.entries.map(entry => [entry.measureIndex, entry.outputBeat, entry.pass]))
      .toEqual(selected.flatMap((ending, pass) => [[0, pass * 2, pass + 1], [ending, pass * 2 + 1, pass + 1]]))
    expect(plan?.totalBeats).toBe(selected.length * 2)
    expect(createPlaybackTimeline(native).totalBeats).toBe(selected.length * 2)
    const structure = serializeMusicXml(native)
    expect(structure.match(/direction="backward"/g)).toHaveLength(2)
    expect(serializeMidi(parseMusicXml(structure))).toEqual(serializeMidi(native))
    const unfolded = serializeMusicXml(expandScoreRepeatsForMusicXml(native))
    expect(unfolded).not.toMatch(/<repeat |<ending /)
    expect(serializeMidi(parseMusicXml(unfolded))).toEqual(serializeMidi(native))
  })

  it('plays every measure of a longer alternative ending before returning', () => {
    const opening = '<barline location="left"><ending number="2" type="start"/></barline>'
    const extra = '<note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>'
    const xml = alternativeEndings('1', '2', '3', [2, 2])
      .replace(opening, opening + extra + '</measure><measure number="20">')
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings).toEqual([])
    const bars = score.parts[0].staves[0].measures
    expect(bars[2].volta).toEqual({ passes: [2], start: true, end: undefined })
    expect(bars[3].volta).toEqual({ passes: [2], start: undefined, end: true })
    expect(createScoreRepeatPlaybackPlan(score)?.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 0, 2, 3, 0, 4])
    const unfolded = serializeMusicXml(expandScoreRepeatsForMusicXml(score))
    expect(serializeMidi(parseMusicXml(unfolded))).toEqual(serializeMidi(score))
  })

  it('takes the final alternative ending after D.S. al Fine', () => {
    const { score, report } = parseMusicXmlWithReport(alternativeEndingsWithFine(3))
    expect(report.warnings).toEqual([])
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    const plan = createScoreRepeatPlaybackPlan(native)
    expect(plan?.entries.map(({ measureIndex }) => measureIndex)).toEqual([0, 1, 0, 2, 0, 3, 4, 0, 3])
    expect(plan?.entries.filter(entry => entry.navigationJump)).toEqual([
      { measureIndex: 0, outputBeat: 7, pass: 3, navigationJump: true }
    ])
    expect(plan?.totalBeats).toBe(9)
    expect(serializeMidi(parseMusicXml(serializeMusicXml(native)))).toEqual(serializeMidi(native))
    const expanded = serializeMusicXml(expandScoreRepeatsForMusicXml(native))
    expect(expanded).not.toMatch(/<ending |dalsegno=|fine=/)
    expect(serializeMidi(parseMusicXml(expanded))).toEqual(serializeMidi(native))
  })

  it('takes To Coda on the final alternative ending after D.S.', () => {
    const xml = alternativeEndingsWithFine(3)
      .replace('<direction-type><words>Fine</words></direction-type><sound fine="yes"/>',
        '<direction-type><words>To </words><symbol>coda</symbol></direction-type><sound tocoda="codab"/>')
      .replace('D.S. al Fine', 'D.S. al Coda')
      .replace('</part>', `<measure number="6">
        <direction placement="above"><direction-type><coda/></direction-type><sound coda="codab"/></direction>
        <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      </measure></part>`)
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings).toEqual([])
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(native).toEqual(score)
    const plan = createScoreRepeatPlaybackPlan(native)
    expect(plan?.entries.map(({ measureIndex }) => measureIndex)).toEqual([0, 1, 0, 2, 0, 3, 4, 0, 3, 5])
    expect(plan?.entries.filter(entry => entry.navigationJump)).toEqual([
      { measureIndex: 0, outputBeat: 7, pass: 3, navigationJump: true },
      { measureIndex: 5, outputBeat: 9, pass: 3, navigationJump: true }
    ])
    expect(plan?.totalBeats).toBe(10)
    const structure = serializeMusicXml(native)
    expect(structure).toContain('tocoda="codab"')
    expect(structure).toContain('coda="codab"')
    expect(serializeMidi(parseMusicXml(structure))).toEqual(serializeMidi(native))
    const expanded = serializeMusicXml(expandScoreRepeatsForMusicXml(native))
    expect(expanded).not.toMatch(/<ending |\b(?:dalsegno|tocoda|coda)=/)
    expect(serializeMidi(parseMusicXml(expanded))).toEqual(serializeMidi(native))
  })

  it.each([
    { returnBefore: true, returned: [0, 1, 2, 5] },
    { returnBefore: false, returned: [2, 5] }
  ])('skips the earlier plain repeat on D.S. return from alternatives (returnBefore=$returnBefore)',
    ({ returnBefore, returned }) => {
      const { score, report } = parseMusicXmlWithReport(separateRepeatBeforeAlternatives({ returnBefore }))
      expect(report.warnings).toEqual([])
      const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
      expect(native).toEqual(score)
      const plan = createScoreRepeatPlaybackPlan(native)
      expect(plan?.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 0, 1, 2, 3, 2, 4, 2, 5, 6, ...returned])
      expect(plan?.entries.filter(entry => entry.navigationJump).map(entry => entry.outputBeat)).toEqual([11])
      expect(plan?.totalBeats).toBe(11 + returned.length)
      const structure = serializeMusicXml(native)
      expect(structure.match(/direction="backward"/g)).toHaveLength(3)
      expect(serializeMidi(parseMusicXml(structure))).toEqual(serializeMidi(native))
      const expanded = serializeMusicXml(expandScoreRepeatsForMusicXml(native))
      expect(expanded).not.toMatch(/<repeat |<ending |dalsegno=/)
      expect(serializeMidi(parseMusicXml(expanded))).toEqual(serializeMidi(native))
    })

  it('keeps an explicit no on the earlier plain repeat without suppressing D.S.', () => {
    const xml = separateRepeatBeforeAlternatives({ returnBefore: true, afterJump: false })
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings).toEqual([])
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(native.parts[0].staves[0].measures[1].repeat?.afterJump).toBe(false)
    const expected = createScoreRepeatPlaybackPlan(parseMusicXml(separateRepeatBeforeAlternatives({ returnBefore: true })))
    expect(createScoreRepeatPlaybackPlan(native)).toEqual(expected)
    expect(expected?.totalBeats).toBe(15)
    const structure = serializeMusicXml(native)
    expect(structure).toContain('after-jump="no"')
    expect(serializeMidi(parseMusicXml(structure))).toEqual(serializeMidi(native))
    const expanded = serializeMusicXml(expandScoreRepeatsForMusicXml(native))
    expect(expanded).not.toContain('after-jump=')
    expect(serializeMidi(parseMusicXml(expanded))).toEqual(serializeMidi(native))
  })

  it.each([
    { returnBefore: true, returned: [0, 1, 0, 1, 2, 5] },
    { returnBefore: false, returned: [2, 5] }
  ])('repeats only the earlier plain section when after-jump is yes (returnBefore=$returnBefore)', ({ returnBefore, returned }) => {
    const xml = separateRepeatBeforeAlternatives({ returnBefore, afterJump: true })
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings).toEqual([])
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(native.parts[0].staves[0].measures[1].repeat?.afterJump).toBe(true)
    const plan = createScoreRepeatPlaybackPlan(native)
    expect(plan?.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 0, 1, 2, 3, 2, 4, 2, 5, 6, ...returned])
    expect(plan?.entries.filter(entry => entry.navigationJump).map(entry => entry.outputBeat)).toEqual([11])
    expect(plan?.totalBeats).toBe(11 + returned.length)
    const structure = serializeMusicXml(native)
    expect(structure).toContain('after-jump="yes"')
    expect(serializeMidi(parseMusicXml(structure))).toEqual(serializeMidi(native))
    const expanded = serializeMusicXml(expandScoreRepeatsForMusicXml(native))
    expect(expanded).not.toMatch(/<repeat |<ending |after-jump=|dalsegno=/)
    expect(serializeMidi(parseMusicXml(expanded))).toEqual(serializeMidi(native))
  })

  it.each([
    { firstAfterJump: true, segnoAt: 1, returned: [0, 1, 0, 1, 2, 3, 4, 5, 6, 9] },
    { firstAfterJump: false, segnoAt: 1, returned: [0, 1, 2, 3, 2, 3, 4, 5, 6, 9] },
    { firstAfterJump: false, segnoAt: 4, returned: [3, 2, 3, 4, 5, 6, 9] }
  ] as const)('honors each plain repeat before the alternatives (firstAfterJump=$firstAfterJump, segnoAt=$segnoAt)',
    ({ firstAfterJump, segnoAt, returned }) => {
      const { score, report } = parseMusicXmlWithReport(multipleRepeatsBeforeAlternatives(firstAfterJump, segnoAt))
      expect(report.warnings).toEqual([])
      const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
      expect(native).toEqual(score)
      const plan = createScoreRepeatPlaybackPlan(native)!
      expect(plan.entries.map(entry => entry.measureIndex))
        .toEqual([0, 1, 0, 1, 2, 3, 2, 3, 4, 5, 4, 5, 6, 7, 6, 8, 6, 9, 10, ...returned])
      expect(plan.entries.filter(entry => entry.navigationJump).map(entry => [entry.measureIndex, entry.outputBeat]))
        .toEqual([[segnoAt - 1, 19]])
      expect(plan.totalBeats).toBe(19 + returned.length)
      const structure = serializeMusicXml(native)
      const reparsed = parseMusicXml(structure)
      const endings = reparsed.parts[0].staves[0].measures.filter(measure => measure.repeat?.end)
      expect(endings.map(measure => measure.repeat?.afterJump)).toEqual([firstAfterJump, !firstAfterJump, undefined, undefined, undefined])
      expect(serializeMidi(reparsed)).toEqual(serializeMidi(native))
      const expanded = serializeMusicXml(expandScoreRepeatsForMusicXml(native))
      expect(expanded).not.toMatch(/<repeat |<ending |after-jump=|dalsegno=/)
      expect(serializeMidi(parseMusicXml(expanded))).toEqual(serializeMidi(native))
    })

  it('retains the warning when earlier boundaries are nested instead of independent', () => {
    const xml = multipleRepeatsBeforeAlternatives(true, 1)
      .replace(/(<measure number="2">[\s\S]*?)<barline location="right"><repeat direction="backward" after-jump="yes"\/><\/barline>/, '$1')
      .replace('<measure number="5"><barline location="left"><repeat direction="forward"/></barline>', '<measure number="5">')
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings.some(warning => warning.message.startsWith('Playback navigation'))).toBe(true)
    expect(createScoreRepeatPlaybackPlan(score)?.entries.some(entry => entry.navigationJump)).toBe(false)
  })

  it('keeps a flag on an ending guarded even beside an independently configured repeat', () => {
    const xml = separateRepeatBeforeAlternatives({ returnBefore: true, afterJump: true })
      .replace('<ending number="1" type="stop"/><repeat direction="backward"/>',
        '<ending number="1" type="stop"/><repeat direction="backward" after-jump="no"/>')
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(score.parts[0].staves[0].measures[3].repeat?.afterJump).toBe(false)
    expect(report.warnings.some(warning => warning.message.startsWith('Playback navigation'))).toBe(true)
    expect(createScoreRepeatPlaybackPlan(score)?.entries).toHaveLength(10)
  })

  it('reports a Fine in an alternative ending skipped on return', () => {
    const { score, report } = parseMusicXmlWithReport(alternativeEndingsWithFine(2))
    expect(report.warnings.some(warning => warning.message.startsWith('Playback navigation'))).toBe(true)
    expect(createScoreRepeatPlaybackPlan(score)?.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 0, 2, 0, 3, 4])
  })

  it('keeps the legacy numeric second ending in a Native project', () => {
    const score = parseMusicXml(alternativeEndings('1', '2', '3', [2, 2]))
    score.parts[0].staves[0].measures[2].volta = { number: 2, start: true, end: true }
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(native.parts[0].staves[0].measures[2].volta).toEqual({ number: 2, start: true, end: true })
    expect(createScoreRepeatPlaybackPlan(native)?.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 0, 2, 2])
  })
})

describe('MusicXML volta pass lists', () => {
  it.each([
    { first: '1, 2', next: '3', expected: [0, 1, 0, 1, 0, 2], marks: [[1, 2], [3]] },
    { first: '3', next: undefined, expected: [0, 0, 0, 1, 2], marks: [[3], undefined] },
    { first: '2,2', next: undefined, expected: [0, 0, 1, 0, 2], marks: [[2, 2], undefined] },
    { first: ' ', next: undefined, expected: [0, 1, 0, 1, 0, 1, 2], marks: [[], undefined] },
  ])('preserves $first and $next through native, playback and both XML modes', ({ first, next, expected, marks }) => {
    const { score, report } = parseMusicXmlWithReport(fixture(first, next, 3))
    const original = structuredClone(score)
    const played = createScoreRepeatPlaybackPlan(score)!
    expect(played.entries.map(entry => entry.measureIndex)).toEqual(expected)
    expect(played.entries.map(entry => entry.outputBeat)).toEqual(expected.map((_, index) => index))
    expect(createPlaybackTimeline(score).totalBeats).toBe(expected.length)
    const project = createNativeProject(score)
    const native = decodeNativeProject(encodeNativeProject(project))
    expect(native.score).toEqual(score)
    const readPasses = (candidate: typeof score) => candidate.parts[0].staves[0].measures.slice(1).map(measure =>
      (measure.volta as { passes?: number[] } | undefined)?.passes
    )
    expect(readPasses(native.score)).toEqual(marks)
    const regular = parseMusicXml(serializeMusicXml(score))
    expect(readPasses(regular)).toEqual(marks)
    expect(serializeMidi(regular)).toEqual(serializeMidi(score))
    const expanded = expandScoreRepeatsForMusicXml(score)
    expect(expanded.parts[0].staves[0].measures).toHaveLength(expected.length)
    expect(serializeMidi(parseMusicXml(serializeMusicXml(expanded)))).toEqual(serializeMidi(score))
    expect(score).toEqual(original)
    expect(report.warnings.some(warning => warning.path.endsWith('.ending'))).toBe(first.trim() === '')
  })

  it.each([
    { suffix: '', repeatCount: 2, sourcePasses: '3', omitted: [3] },
    { suffix: ' times="3"', repeatCount: 3, sourcePasses: '3,4', omitted: [4] }
  ])('reports only unreachable ending passes with repeat count $repeatCount', ({ suffix, repeatCount, sourcePasses, omitted }) => {
    const xml = fixture('1,2', sourcePasses, 3).replace(' times="3"', suffix)
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings).toEqual([{
      code: 'unsupported-notation',
      partNumber: 1,
      measureNumber: 3,
      path: 'part[1].measure[3].barline[1].ending',
      message: `Volta passes outside the repeat count: ${JSON.stringify({ passes: omitted, repeatCount })}. Keep the original MusicXML and compare playback.`
    }])
    expect(createScoreRepeatPlaybackPlan(score)?.entries.map(entry => entry.measureIndex)).toEqual(
      repeatCount === 2 ? [0, 1, 0, 1] : [0, 1, 0, 1, 0, 2])
    expect(score.parts[0].staves[0].measures[2].volta?.passes).toEqual(sourcePasses.split(',').map(Number))
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
  })

  it('reports unresolved repeat ends without assigning an individual unreachable pass', () => {
    const xml = fixture('1,2', '3', 2).replace(
      '<barline location="right"><ending number="3" type="stop"/></barline>',
      '<barline location="right"><ending number="3" type="stop"/><repeat direction="backward"/></barline>'
    )
    const { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings).toEqual([expect.objectContaining({
      code: 'unsupported-notation', measureNumber: 3, partNumber: 1,
      path: 'part[1].measure[3].barline[2].repeat',
      message: expect.stringContaining('Multiple repeat ends with unresolved ending passes')
    })])
    expect(score.parts[0].staves[0].measures[2].volta?.passes).toEqual([3])
    expect(createScoreRepeatPlaybackPlan(score)?.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 0, 1])
  })

  it('reports overlapping alternative passes once while retaining the written repeat flags', () => {
    const { score, report } = parseMusicXmlWithReport(alternativeEndings('1', '1', '3', [2, 2]))
    expect(report.warnings).toHaveLength(1)
    expect(report.warnings[0]).toMatchObject({
      measureNumber: 3, path: 'part[1].measure[3].barline[2].repeat',
      message: expect.stringContaining('Multiple repeat ends with unresolved ending passes')
    })
    expect(score.parts[0].staves[0].measures.map(measure => measure.repeat?.end)).toEqual([undefined, true, true, undefined])
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
  })

  it('does not report different explicitly opened repeats as alternate ends', () => {
    const xml = alternativeEndings('1', '2', '3', [2, 2])
      .replace('<ending number="2" type="start"/></barline>',
        '<ending number="2" type="start"/><repeat direction="forward"/></barline>')
    const { report } = parseMusicXmlWithReport(xml)
    expect(report.warnings.some(warning => warning.message.startsWith('Multiple repeat ends'))).toBe(false)
  })

  it('plays the interior of a multi-measure ending only on its specified passes', () => {
    const input = fixture('1,2', '3', 3)
    const rightBarline = '<barline location="right"><ending number="1,2" type="stop"/><repeat direction="backward" times="3"/></barline>'
    expect(input).toContain(rightBarline)
    const withInterior = input.replace(rightBarline, `</measure>
      <measure number="20">
        <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      </measure>
      <measure number="21">
        <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
        ${rightBarline}`)
    const score = parseMusicXml(withInterior)
    const plan = createScoreRepeatPlaybackPlan(score)!
    expect(plan.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 4])
    const expanded = expandScoreRepeatsForMusicXml(score)
    expect(serializeMidi(parseMusicXml(serializeMusicXml(expanded)))).toEqual(serializeMidi(score))
  })

  it.each([3, 4])('plays a single imported second ending exactly once with %i repeat passes', times => {
    const score = parseMusicXml(fixture('2', String(times), times))
    const opened = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(opened.parts[0].staves[0].measures[1].volta).toEqual({ passes: [2], start: true, end: true })
    expect(createScoreRepeatPlaybackPlan(opened)?.entries.map(entry => entry.measureIndex))
      .toEqual([0, 0, 1, ...Array(times - 2).fill(0), 2])
    const { contents, report } = serializeMusicXmlWithReport(opened)
    expect(contents).toContain('<ending number="2" type="start"/>')
    expect(report.warnings).toEqual([])
    expect(serializeMidi(parseMusicXml(contents))).toEqual(serializeMidi(opened))
    expect(serializeMidi(expandScoreRepeatsForMusicXml(opened))).toEqual(serializeMidi(opened))
  })

  it.each([3, 4])('exports a legacy second ending as explicit passes while retaining %i native passes', times => {
    const score = parseMusicXml(fixture('2', String(times), times))
    score.parts[0].staves[0].measures[1].volta = { number: 2, start: true, end: true }
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    const original = structuredClone(native)
    const { contents, report } = serializeMusicXmlWithReport(native)
    const passes = Array.from({ length: times - 1 }, (_, index) => index + 2).join(',')
    expect(contents).toContain('<ending number="' + passes + '" type="start"/>')
    expect(contents).toContain('<ending number="' + passes + '" type="stop"/>')
    expect(report.warnings).toEqual([
      expect.objectContaining({ code: 'converted-volta-passes', measureNumber: 2,
        message: expect.stringContaining('"passes":[' + passes + ']') })
    ])
    expect(serializeMidi(parseMusicXml(contents))).toEqual(serializeMidi(native))
    const unfolded = serializeMusicXmlWithReport(expandScoreRepeatsForMusicXml(native))
    expect(unfolded.report.warnings).toEqual([])
    expect(serializeMidi(parseMusicXml(unfolded.contents))).toEqual(serializeMidi(native))
    expect(native).toEqual(original)
  })

  it('retains the exact pass of a start-only trailing second ending', () => {
    const xml = fixture('1', '2', 3).replace('<barline location="right"><ending number="2" type="stop"/></barline>', '')
    const imported = parseMusicXml(xml)
    expect(imported.parts[0].staves[0].measures[2].volta).toEqual({ passes: [2], start: true, end: undefined })
    expect(createScoreRepeatPlaybackPlan(imported)?.entries.map(entry => entry.measureIndex))
      .toEqual([0, 1, 0, 0])
  })

  it('exports the existing single-measure second ending without adding a closing barline', () => {
    const imported = parseMusicXml(fixture('1', '2', 3))
    imported.parts[0].staves[0].measures[2].volta = { number: 2, start: true }
    const original = structuredClone(imported)
    const { contents, report } = serializeMusicXmlWithReport(imported)
    expect(contents).toContain('<ending number="2,3" type="start"/>')
    expect(contents).not.toContain('<ending number="2,3" type="stop"/>')
    expect(report.warnings).toEqual([expect.objectContaining({
      code: 'converted-volta-passes', measureNumber: 3
    })])
    const reopened = parseMusicXml(contents)
    expect(createScoreRepeatPlaybackPlan(reopened)?.entries.map(entry => entry.measureIndex))
      .toEqual([0, 1, 0, 0, 2])
    expect(serializeMidi(reopened)).toEqual(serializeMidi(imported))
    expect(imported).toEqual(original)
  })

  it('converts both endpoints of a second ending and preserves the separate following repeat', () => {
    const rest = '<note><rest/><duration>1</duration><type>quarter</type></note>'
    const secondStart = '<barline location="left"><ending number="2" type="start"/></barline>'
    const input = fixture('2', '3', 3)
      .replace(secondStart, secondStart + rest + '</measure><measure number="20">')
      .replace('</part>', [
        '<measure number="4"><barline location="left"><repeat direction="forward"/></barline>',
        rest, '<barline location="right"><repeat direction="backward"/></barline></measure>',
        '<measure number="5">', secondStart, rest,
        '<barline location="right"><ending number="2" type="stop"/></barline></measure></part>'
      ].join(''))
    const score = parseMusicXml(input)
    const measures = score.parts[0].staves[0].measures
    expect(measures[1].volta).toEqual({ passes: [2], start: true, end: undefined })
    expect(measures[2].volta).toEqual({ passes: [2], start: undefined, end: true })
    expect(measures[5].volta).toEqual({ number: 2, start: true, end: true })
    const plan = createScoreRepeatPlaybackPlan(score)
    expect(plan?.entries.map(entry => entry.measureIndex)).toEqual([0, 0, 1, 2, 0, 3, 4, 4, 5])
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
  })

  it('keeps the existing 1st and 2nd ending encoding and MIDI order', () => {
    const score = parseMusicXml(fixture('1', '2', 2))
    const bars = score.parts[0].staves[0].measures
    expect(bars[1].volta).toEqual({ number:1, start:true, end:true })
    expect(bars[2].volta).toEqual({ number:2, start:true, end:true })
    expect(createScoreRepeatPlaybackPlan(score)?.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 0, 2])
  })

  it('reports the source label, visibility and open end while keeping the specified passes', () => {
    const control = parseMusicXmlWithReport(fixture('1,2', '3', 3))
    const source = fixture('1,2', '3', 3)
      .replace('<ending number="1,2" type="start"/>',
        '<ending number="1,2" type="start" print-object="no">Prima volta</ending>')
      .replace('<ending number="3" type="stop"/>', '<ending number="3" type="discontinue"/>')
    const { score, report } = parseMusicXmlWithReport(source)
    const warnings = report.warnings.filter(warning => warning.message.startsWith('Unrepresented volta appearance '))
    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'unsupported-notation', partNumber: 1, measureNumber: 2,
        path: 'part[1].measure[2].barline[1].ending',
        message: expect.stringContaining('"label":"Prima volta","printObject":"no"')
      }),
      expect.objectContaining({
        code: 'unsupported-notation', partNumber: 1, measureNumber: 3,
        path: 'part[1].measure[3].barline[2].ending',
        message: expect.stringContaining('"end":"discontinue"')
      })
    ])
    expect(score).toEqual(control.score)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control.score)
    expect(serializeMidi(score)).toEqual(serializeMidi(control.score))
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(control.score))
    expect(parseMusicXmlWithReport(serializeMusicXml(score)).report.warnings).toEqual(control.report.warnings)
  })

  it('does not warn when explicit ending labels and visibility match the numeric brackets', () => {
    const input = fixture('1,2', '3', 3)
      .replace('<ending number="1,2" type="start"/>', '<ending number="1,2" type="start" print-object="yes">1, 2.</ending>')
      .replace('<ending number="3" type="start"/>', '<ending number="3" type="start">3</ending>')
    expect(parseMusicXmlWithReport(input).report.warnings).toEqual(parseMusicXmlWithReport(fixture('1,2', '3', 3)).report.warnings)
  })
})

it('places left repeat and ending barlines before music and the right ones after it', () => {
  const score = parseMusicXml(fixture('1,2', '3', 3))
  const bars = score.parts[0].staves[0].measures
  score.layout = { ...score.layout, systemBreakBeforeMeasureIds: [bars[1].id] }
  const xml = serializeMusicXml(score)
  const first = xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)![1].trim()
  const second = xml.match(/<measure number="2">([\s\S]*?)<\/measure>/)![1].trim()
  expect(first).toMatch(/^<barline location="left">[\s\S]*?<repeat direction="forward"\/>/)
  expect(second).toMatch(/^<print new-system="yes"\/>\s*<barline location="left">\s*<ending number="1,2" type="start"\/>/)
  expect(second).toMatch(/<\/note>\s*<barline location="right">\s*<ending number="1,2" type="stop"\/>[\s\S]*<\/barline>$/)
  const reopened = parseMusicXml(xml)
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(reopened.parts[0].staves[0].measures.map(bar => bar.volta)).toEqual(bars.map(bar => bar.volta))
})
