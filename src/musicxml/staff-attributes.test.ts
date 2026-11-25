import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

function staffXml(changes: string[] = []) {
 const notes='<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note><backup><duration>4</duration></backup><note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>2</staff></note>'
 return '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">'+Array.from({length:6},(_,i)=>`<measure number="${i+1}">${i===0?'<attributes><divisions>1</divisions><key><fifths>-1</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>':changes[i]?'<attributes>'+changes[i]+'</attributes>':''}${notes}</measure>`).join('')+'</part></score-partwise>'
}
const key=(number:number|undefined,fifths:number)=>`<key${number===undefined?'':` number="${number}"`}><fifths>${fifths}</fifths><mode>major</mode></key>`
const time=(number:number|undefined,beats:number,beatType:number)=>`<time${number===undefined?'':` number="${number}"`}><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`
const attrs=(score:ReturnType<typeof parseMusicXml>)=>score.parts[0].staves.map(s=>s.measures.map(m=>({key:m.keySignature,time:m.timeSignature})))

it.each([1,2])('imports staff %i key/meter changes without leaking to its neighbor,including inheritance and global reset',number=>{
 const xml=staffXml(['',key(number,4)+time(number,2,2),'',key(undefined,0)+time(undefined,4,4),key(3-number,-3)+time(3-number,2,2)])
 const score=parseMusicXml(xml),staves=attrs(score)
 for(let staff=0;staff<2;staff++){
  expect(staves[staff][0]).toEqual({key:{fifths:-1,mode:'major'},time:{beats:4,beatType:4}})
  for(const index of [1,2])expect(staves[staff][index]).toEqual(staff===number-1?{key:{fifths:4,mode:'major'},time:{beats:2,beatType:2}}:staves[staff][0])
  expect(staves[staff][3]).toEqual({key:{fifths:0,mode:'major'},time:{beats:4,beatType:4}})
  for(const index of [4,5])expect(staves[staff][index]).toEqual(staff===2-number?{key:{fifths:-3,mode:'major'},time:{beats:2,beatType:2}}:staves[staff][3])
 }
})

it('exports different existing staff keys/meters explicitly and preserves neighbor MIDI and all authored values on reimport',()=>{
 const source=parseMusicXml(staffXml())
 for(const m of source.parts[0].staves[0].measures.slice(2,4)){m.keySignature={fifths:4,mode:'major'};m.timeSignature={beats:2,beatType:2}}
 const before=structuredClone(source),midi=serializeMidi(source),xml=serializeMusicXml(source),tree=new XMLParser({ignoreAttributes:false}).parse(xml)['score-partwise'].part.measure
 for(const i of [2,3]){
  expect(tree[i].attributes.key.map((v:any)=>[v['@_number'],v.fifths])).toEqual([['1',4],['2',-1]])
  expect(tree[i].attributes.time.map((v:any)=>[v['@_number'],v.beats,v['beat-type']])).toEqual([['1',2,2],['2',4,4]])
 }
 const reopened=parseMusicXml(xml)
 expect(attrs(reopened)).toEqual(attrs(source));expect(serializeMidi(reopened)).toEqual(midi);expect(source).toEqual(before)
})

it('retains the unnumbered shared form when all staff keys/meters match',()=>{
 const source=parseMusicXml(staffXml()),xml=serializeMusicXml(source)
 expect(xml).not.toMatch(/<(?:key|time) number=/)
 expect(attrs(parseMusicXml(xml))).toEqual(attrs(source));expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(source))
})

it.each([0,3])('rejects out-of-range numbered key and time staff %i instead of applying it to all staves',number=>{
 for(const element of [key(number,4),time(number,2,2)])expect(()=>parseMusicXml(staffXml(['',element]))).toThrow(/staff|보표/i)
})

it('applies an unnumbered reset then a scoped override in the same attributes block',()=>{
 const score=parseMusicXml(staffXml(['',key(undefined,0)+key(1,4)+time(undefined,4,4)+time(2,2,2)]))
 const values=attrs(score)
 expect(values[0][1]).toEqual({key:{fifths:4,mode:'major'},time:{beats:4,beatType:4}})
 expect(values[1][1]).toEqual({key:{fifths:0,mode:'major'},time:{beats:2,beatType:2}})
 expect(attrs(parseMusicXml(serializeMusicXml(score)))).toEqual(values)
})
it('keeps different modes with the same fifths scoped rather than discarding the lower mode',()=>{
 const source=parseMusicXml(staffXml());source.parts[0].staves[1].measures[2].keySignature={fifths:-1,mode:'minor'}
 expect(attrs(parseMusicXml(serializeMusicXml(source)))).toEqual(attrs(source))
})

describe('key signature at the preceding measure end', () => {
  const header = '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Wind</part-name></score-part></part-list><part id="P1">'
  const attributes = (content: string) => `<attributes>${content}</attributes>`
  const bar = (number: number, contents: string) => `<measure number="${number}">${contents}</measure>`
  const scoreXml = (...bars: string[]) => header + bars.join('') + '</part></score-partwise>'
  const opening = '<divisions>1</divisions>' + key(undefined, 0) + time(undefined, 2, 4)
  const note = (step: string, alter?: number, staff?: number) =>
    `<note><pitch><step>${step}</step>${alter === undefined ? '' : `<alter>${alter}</alter>`}<octave>4</octave></pitch><duration>1</duration><type>quarter</type>${staff ? `<staff>${staff}</staff>` : ''}</note>`
  const naturals = note('F') + note('B')
  const flat = note('F') + note('B', -1)
  const change = attributes(key(undefined, -1))

  it.each([false, true])('carries the closing key without backdating it when a divisions block is present: %s', split => {
    const first = bar(1, attributes(opening) + naturals)
    const before = split ? attributes('<divisions>1</divisions>') : ''
    const source = scoreXml(first, bar(2, before + naturals + change), bar(3, flat))
    const control = parseMusicXml(scoreXml(first, bar(2, naturals), bar(3, change + flat)))
    const { score, report } = parseMusicXmlWithReport(source)

    expect(score).toEqual(control)
    expect(report.warnings).toEqual([])
    expect(serializeMidi(score)).toEqual(serializeMidi(control))
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(control))
  })

  it('uses the actual pickup length and keeps a final key change out of the last sounding bar', () => {
    const pickup = '<measure number="1" implicit="yes">' + attributes(opening) + note('B') + change + '</measure>'
    const source = scoreXml(pickup, bar(2, flat + attributes(key(undefined, 1))))
    const { score, report } = parseMusicXmlWithReport(source)
    expect(score.parts[0].staves[0].measures.map(measure => measure.keySignature.fifths)).toEqual([0, -1])
    expect(report.warnings.map(warning => warning.path)).toEqual(['part[1].measure[2].attributes[1].key[1]'])
  })

  it('carries a numbered key without changing its neighbor and honors the next opening after a backup', () => {
    const upper = note('F', undefined, 1) + note('B', undefined, 1)
    const lower = note('F', undefined, 2) + note('B', undefined, 2)
    const backup = '<backup><duration>2</duration></backup>'
    const source = scoreXml(
      bar(1, attributes(opening + '<staves>2</staves>') + upper + backup + lower),
      bar(2, upper + attributes(key(2, -1)) + backup + lower),
      bar(3, upper + backup + attributes(key(1, 1)) + lower)
    )
    const { score, report } = parseMusicXmlWithReport(source)
    expect(score.parts[0].staves.map(staff => staff.measures.map(measure => measure.keySignature.fifths)))
      .toEqual([[0, 0, 1], [0, 0, -1]])
    expect(report.warnings).toEqual([])
  })

  it.each([false, true])('preserves a closing meter grouped with the new key and transposition: %s', split => {
    const first = bar(1, attributes(opening) + naturals)
    const before = split ? attributes('<divisions>1</divisions>') : ''
    const settings = attributes(key(undefined, -1) + time(undefined, 3, 4) +
      '<transpose><chromatic>-2</chromatic></transpose>')
    const third = flat + note('C')
    const source = scoreXml(first, bar(2, before + naturals + settings), bar(3, third))
    const control = parseMusicXml(scoreXml(first, bar(2, naturals), bar(3, settings + third)))

    const { score, report } = parseMusicXmlWithReport(source)
    expect(score).toEqual(control)
    expect(report.warnings).toEqual([])
    expect(serializeMidi(score)).toEqual(serializeMidi(control))
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(control))
  })

  it('reports an interior key change that has no place in the measure model', () => {
    const source = scoreXml(bar(1, attributes(opening) + note('B') + change + note('B', -1)))
    const { score, report } = parseMusicXmlWithReport(source)
    expect(score.parts[0].staves[0].measures[0].keySignature.fifths).toBe(0)
    expect(report.warnings.map(warning => warning.path)).toEqual(['part[1].measure[1].attributes[2].key[1]'])
  })

  it('rejects an out-of-range closing key when it would become the next measure key', () => {
    const outside = attributes(key(undefined, 8))
    const first = bar(1, attributes(opening) + naturals + outside)
    expect(() => parseMusicXmlWithReport(scoreXml(first, bar(2, naturals))))
      .toThrow('현재 가져오기에서 지원하지 않는 조표 범위입니다: fifths=8 (지원 범위: -7~7)')
  })

  it('retains the final positioned-key warning when no measure uses the out-of-range value', () => {
    const outside = attributes(key(undefined, 8))
    const first = bar(1, attributes(opening) + naturals)
    const source = scoreXml(first, bar(2, naturals + outside))
    const { score, report } = parseMusicXmlWithReport(source)
    expect(score.parts[0].staves[0].measures.map(measure => measure.keySignature.fifths)).toEqual([0, 0])
    expect(report.warnings).toEqual([expect.objectContaining({
      path: 'part[1].measure[2].attributes[1].key[1]',
      message: expect.stringContaining('"fifths":"8"')
    })])
  })
})

describe('key and meter display metadata loss', () => {
  const scoreXml = (keyMarkup: string, timeMarkup: string) =>
    '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">' +
    '<measure number="1"><attributes><divisions>1</divisions>' + keyMarkup + timeMarkup + '</attributes>' +
    '<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>' +
    '</measure></part></score-partwise>'
  const standardKey = '<key><fifths>1</fifths></key>'
  const standardTime = '<time><beats>4</beats><beat-type>4</beat-type></time>'

  it('reports a hidden key and written octave without changing its accidental or the performed pitch', () => {
    const hidden = '<key print-object="no"><fifths>1</fifths><key-octave number="1">3</key-octave></key>'
    const plain = parseMusicXml(scoreXml(standardKey, standardTime))
    const { score, report } = parseMusicXmlWithReport(scoreXml(hidden, standardTime))

    expect(report.warnings).toEqual([expect.objectContaining({
      partNumber: 1, measureNumber: 1, path: 'part[1].measure[1].attributes[1].key[1]',
      message: expect.stringContaining('"octaves":[{"number":"1","octave":"3"}]')
    })])
    expect(report.warnings[0].message).toContain('"printObject":"no"')
    expect(score).toEqual(plain)
    expect(serializeMidi(score)).toEqual(serializeMidi(plain))
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(plain))
  })

  it.each([
    ['common', 4],
    ['cut', 2]
  ] as const)('reports hidden %s time with the original numeric meter preserved', (symbol, beats) => {
    const beatType = symbol === 'cut' ? 2 : 4
    const meter = `<beats>${beats}</beats><beat-type>${beatType}</beat-type>`
    const plain = parseMusicXml(scoreXml(standardKey, `<time>${meter}</time>`))
    const { score, report } = parseMusicXmlWithReport(
      scoreXml(standardKey, `<time print-object="no" symbol="${symbol}">${meter}</time>`)
    )

    expect(report.warnings).toEqual([expect.objectContaining({
      partNumber: 1, measureNumber: 1, path: 'part[1].measure[1].attributes[1].time[1]',
      message: expect.stringContaining(`"symbol":"${symbol}"`)
    })])
    expect(report.warnings[0].message).toContain('"printObject":"no"')
    expect(score).toEqual(plain)
    expect(serializeMidi(score)).toEqual(serializeMidi(plain))
  })

  it('keeps explicit default signature display free of appearance warnings', () => {
    const { report } = parseMusicXmlWithReport(scoreXml(
      standardKey.replace('<key>', '<key print-object="yes">'),
      standardTime.replace('<time>', '<time print-object="yes" symbol="normal">')
    ))
    expect(report.warnings).toEqual([])
  })

  it.each([
    { fifths: 1, placement: undefined, reportedPlacement: 'left' },
    { fifths: 1, placement: 'right', reportedPlacement: 'right' },
    { fifths: 0, placement: 'before-barline', reportedPlacement: 'before-barline' }
  ])('reports the source key cancellation at $reportedPlacement for staff 2', ({ fifths, placement, reportedPlacement }) => {
    const plain = key(2, fifths)
    const cancel = `<cancel${placement ? ` location="${placement}"` : ''}>-1</cancel>`
    const source = plain.replace('<fifths>', cancel + '<fifths>')
    const { score, report } = parseMusicXmlWithReport(staffXml(['', source]))
    const control = parseMusicXml(staffXml(['', plain]))

    expect(report.warnings).toEqual([expect.objectContaining({
      code: 'unsupported-notation',
      partNumber: 1,
      measureNumber: 2,
      path: 'part[1].measure[2].attributes[1].key[1]',
      message: expect.stringContaining(`"staff":"2","cancellation":{"fifths":"-1","location":"${reportedPlacement}"}`)
    })])
    expect(score).toEqual(control)
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(control))
    expect(serializeMidi(score)).toEqual(serializeMidi(control))
  })

  it.each(['', ' location="left"'])('keeps the normal neutral-key cancellation quiet (%s)', (placement) => {
    const neutral = key(2, 0)
    const source = neutral.replace('<fifths>', `<cancel${placement}>-1</cancel><fifths>`)
    const plain = parseMusicXml(staffXml(['', neutral]))
    const { score, report } = parseMusicXmlWithReport(staffXml(['', source]))
    expect(report.warnings).toEqual([])
    expect(score).toEqual(plain)
  })
})

it.each([
  ['<beats>3+2</beats><beat-type>8</beat-type>', '"beats":"3+2","beatType":"8"'],
  ['<beats>2</beats><beat-type>4</beat-type><beats>3</beats><beat-type>8</beat-type>',
    '"beats":["2","3"],"beatType":["4","8"]']
])('identifies an unsupported grouped meter and retains the source values in its diagnostic', (contents, details) => {
  const xml = staffXml().replace(/<time>.*?<\/time>/, `<time>${contents}</time>`)
  expect(() => parseMusicXml(xml)).toThrow('현재 가져오기에서 지원하지 않는 묶음 박자표입니다: {' + details + '}')
})

it('keeps the ordinary validation error for an invalid numeric meter', () => {
  const xml = staffXml().replace('<beats>4</beats>', '<beats>bad</beats>')
  expect(() => parseMusicXml(xml)).toThrow('MusicXML 정수 값이 올바르지 않습니다: beats')
})
