import { createCreditImageFixture } from './credit-image-fixture'
import type { DurationValue } from '../score-core'

export type MetronomeTextOptions = {
  text?: string
  soundQuarter?: number
  beatUnit?: DurationValue
  dots?: number
  words?: string
  hidden?: boolean
  position?: boolean
  secondary?: boolean
  soundOffset?: number
}
const escape = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')
export function createMetronomeTextFixture({ text = '90–100', soundQuarter, beatUnit = 'quarter', dots = 0,
  words, hidden = false, position = false, secondary = false, soundOffset }: MetronomeTextOptions = {}) {
  let xml = createCreditImageFixture('control').replace('이미지 교환 감사 control','메트로놈 문구 검증')
  const direction = '<direction><direction-type>' + (words === undefined ? '' : '<words>' + escape(words) + '</words></direction-type><direction-type>') +
    '<metronome' + (hidden ? ' print-object="no"' : '') + '><beat-unit>' + beatUnit + '</beat-unit>' + '<beat-unit-dot/>'.repeat(dots) +
    '<per-minute>' + escape(text) + '</per-minute></metronome></direction-type>' +
    (position ? '<offset sound="yes">2</offset>' : '') +
    (soundQuarter === undefined ? '' : '<sound tempo="' + soundQuarter + '">' + (soundOffset === undefined ? '' : '<offset>' + soundOffset + '</offset>') + '</sound>') + '</direction>'
  const part = secondary ? 'P2' : 'P1'
  xml = xml.replace(/<part id="P[12]">[\s\S]*?<\/part>/g, body => {
    if (!body.startsWith('<part id="' + part + '">')) return body
    return position ? body.replace('<measure number="2">','<measure number="2">' + direction) : body.replace('</attributes>','</attributes>' + direction)
  })
  if (!xml.includes('<metronome')) throw Error('Owned metronome source missing')
  return xml
}
