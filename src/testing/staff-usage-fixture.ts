import { createStaffLineFixture } from './staff-line-fixture'

export type StaffUsageKind = 'alternate' | 'cue' | 'editorial' | 'ossia' | 'regular' | 'none' | 'default-number' | 'normalized' | 'multiple' | 'mixed'
export function createStaffUsageFixture(kind: StaffUsageKind): string {
  const target = '<staff-details number="1"><staff-lines>5</staff-lines></staff-details>'
  const usage = ['default-number','normalized','multiple','mixed'].includes(kind) ? 'alternate' : kind
  const detail = kind === 'none' ? '' : '<staff-details' + (kind === 'default-number' ? '' : ' number="2"') + (kind === 'mixed' ? ' print-object="no"' : '') + '><staff-type>' + usage + '</staff-type>' + (kind === 'mixed' ? '<staff-lines>1</staff-lines><staff-size>70</staff-size>' : '') + '</staff-details>'
  let xml = createStaffLineFixture('five').replace(target,detail+(kind === 'multiple' ? '<staff-details number="1"><staff-type>cue</staff-type></staff-details>' : '')).replace('보표 줄 수 손실 검증','보표 용도 손실 검증')
  if(kind === 'normalized') xml=xml.replace(/(<part id="P2">[\s\S]*?)<measure number="10">/,'$1<measure number="intro">')
  return xml
}
