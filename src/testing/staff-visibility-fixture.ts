import { createStaffLineFixture } from './staff-line-fixture'

export type StaffVisibilityKind = 'hidden-second' | 'hidden-default' | 'hidden-spacing' | 'padded-hidden' | 'normalized' | 'multiple' | 'line-mixed' | 'none' | 'default-visible' | 'explicit-visible' | 'spacing-only'
export function createStaffVisibilityFixture(kind: StaffVisibilityKind = 'hidden-second'): string {
  const target = '<staff-details number="1"><staff-lines>5</staff-lines></staff-details>'
  const attributes = kind === 'none' ? undefined : kind === 'default-visible' ? 'number="2"'
    : kind === 'explicit-visible' ? 'number="2" print-object="yes"'
      : kind === 'spacing-only' ? 'number="2" print-spacing="no"'
        : kind === 'hidden-default' ? 'print-object="no"'
          : kind === 'padded-hidden' ? 'number="2" print-object=" no "'
            : 'number="2" print-object="no"' + (kind === 'hidden-spacing' ? ' print-spacing="no"' : '')
  const detail = attributes === undefined ? '' : '<staff-details ' + attributes + '>' + (kind === 'line-mixed' ? '<staff-lines>1</staff-lines>' : '') + '</staff-details>'
  let source = createStaffLineFixture('five').replace(target, detail + (kind === 'multiple' ? '<staff-details number="1" print-object="no"/>' : ''))
    .replace('보표 줄 수 손실 검증', '보표 표시 설정 손실 검증')
  if (kind === 'normalized') source = source.replace(/(<part id="P2">[\s\S]*?)<measure number="10">/, '$1<measure number="intro">')
  return source
}

/** Valid repeated source declarations, not synthetic warning objects. */
export function createRepeatedStaffVisibilityFixture(measureCount = 30): string {
  if (!Number.isInteger(measureCount) || measureCount < 1 || measureCount > 100) throw new Error('Bounded QA measure count required')
  const seed = createStaffVisibilityFixture('multiple')
  return seed.replace('보표 표시 설정 손실 검증', '여러 보표 표시 경고 검증')
    .replace(/<part id="([^"]+)">([\s\S]*?)<\/part>/g, (_part, id: string, body: string) => {
      const template = [...body.matchAll(/<measure\s[^>]*>[\s\S]*?<\/measure>/g)].at(-1)?.[0]
      if (!template) throw new Error('Generated source measure missing')
      return '<part id="' + id + '">' + Array.from({length:measureCount},(_,i)=>template.replace(/number="[^"]*"/, 'number="'+(i+1)+'"')).join('') + '</part>'
    })
}
