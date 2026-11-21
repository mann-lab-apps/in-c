import { createStaffLineFixture } from './staff-line-fixture'

export type StaffSizeKind = 'space70' | 'notation70' | 'notes100space70' | 'enlarged' | 'fractional' | 'zero' | 'second-staff' | 'combined' | 'normalized' | 'none' | 'default100' | 'both100' | 'line-only'
export function createStaffSizeFixture(kind: StaffSizeKind = 'space70'): string {
  const base = createStaffLineFixture('none').replace('보표 줄 수 손실 검증', '개별 보표 크기 손실 검증')
  const size = kind === 'none' || kind === 'line-only' ? '' : kind === 'notation70' ? '<staff-size scaling="70">100</staff-size>'
    : kind === 'notes100space70' ? '<staff-size scaling="100">70</staff-size>'
      : kind === 'both100' ? '<staff-size scaling="100">100</staff-size>'
        : '<staff-size>' + (kind === 'default100' ? '100' : kind === 'enlarged' ? '150' : kind === 'fractional' ? '75.5' : kind === 'zero' ? '0' : '70') + '</staff-size>'
  const lines = kind === 'combined' || kind === 'line-only' ? '<staff-lines>1</staff-lines>' : ''
  const details = kind === 'none' ? '' : '<staff-details number="' + (kind === 'second-staff' ? 2 : 1) + '">' + lines + size + '</staff-details>'
  const split = base.indexOf('<part id="P2">')
  if (split < 0) throw Error('Missing generated second part')
  const second = base.slice(split).replace(/(<measure number="10"><attributes>[\s\S]*?)(<\/attributes>)/, '$1' + details + '$2')
  return base.slice(0, split) + (kind === 'normalized' ? second.replace('<measure number="10">', '<measure number="intro">') : second)
}
