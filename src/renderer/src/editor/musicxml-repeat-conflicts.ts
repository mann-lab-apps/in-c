import { scoreRepeatSource, type Measure, type Score } from '../../../score-core'
import { musicXmlBarlineStaff } from '../../../musicxml/barline-scope'
import { createPartOptionLabels } from './part-option-labels'

export class MusicXmlRepeatConflictError extends Error {
  constructor(message: string, readonly technicalMessage: string) {
    super(message)
    this.name = 'MusicXmlRepeatConflictError'
  }
}

// Describe only repeat/volta information the existing part-level XML barline
// cannot retain. The caller must still run the strict complete save signature.
export function createMusicXmlRepeatConflictError(score: Score, diagnostic: string): MusicXmlRepeatConflictError | undefined {
  if (!scoreRepeatSource(score)) return undefined
  const shape = (measure: Measure) => JSON.stringify({ repeat: measure.repeat ?? null, volta: measure.volta ?? null })
  const labels = createPartOptionLabels(score.parts)
  const locations: { label: string; path: string }[] = []
  for (const [partIndex, part] of score.parts.entries()) {
    if (!part.staves.length) continue
    const source = musicXmlBarlineStaff(score, part)
    for (const [staffIndex, staff] of part.staves.entries()) {
      if (staff === source || !staff.measures.some(measure => measure.repeat?.start || measure.repeat?.end || measure.volta)) continue
      const index = staff.measures.findIndex((measure, index) => shape(measure) !== shape(source.measures[index]))
      if (index < 0) continue
      const measure = staff.measures[index]
      locations.push({
        label: `${labels[partIndex]} · 보표 ${staffIndex + 1} · ${measure.number}마디`,
        path: `parts[${partIndex}].staves[${staffIndex}].measures[${index}] (${part.id}/${staff.id}/${measure.id})`
      })
    }
  }
  if (!locations.length) return undefined
  return new MusicXmlRepeatConflictError(
    `MusicXML 저장 검증에 실패했습니다. 보표별 반복·볼타 설정이 달라 MusicXML로 모두 보존할 수 없습니다. 프로젝트로 저장해 원본을 유지해 주세요. 확인할 위치: ${locations[0].label}${locations.length > 1 ? ` 외 ${locations.length - 1}곳` : ''}`,
    `${diagnostic}\n${locations.map(location => location.path).join('\n')}`
  )
}

// Private Studio report context, not a MusicXML serializer warning or project field.
export interface StudioPartRepeatProjectionWarning {
  code: 'studio-part-repeat-projection'
  summary: string
  message: string
  path: string
  measureId: string
  measureNumber: number
}

export function collectPartRepeatProjectionWarnings(original: Score, projected: Score, partId: string): StudioPartRepeatProjectionWarning[] {
  const sources = original.parts.filter(part => part.id === partId)
  const targets = projected.parts.filter(part => part.id === partId)
  if (sources.length !== 1 || targets.length !== 1) return []
  const part = sources[0], target = targets[0], partIndex = original.parts.indexOf(part)
  const label = createPartOptionLabels(original.parts)[partIndex]
  const shape = (measure: Measure) => JSON.stringify({ repeat: measure.repeat ?? null, volta: measure.volta ?? null })
  return part.staves.flatMap((staff, staffIndex) => {
    if (!staff.measures.some(measure => measure.repeat?.start || measure.repeat?.end || measure.volta)) return []
    const matches = target.staves.filter(candidate => candidate.id === staff.id)
    if (matches.length !== 1 || matches[0].measures.length !== staff.measures.length) return []
    const index = staff.measures.findIndex((measure, index) => shape(measure) !== shape(matches[0].measures[index]))
    if (index < 0) return []
    const measure = staff.measures[index]
    return [{
      code: 'studio-part-repeat-projection' as const,
      summary: `${label} · 보표 ${staffIndex + 1} · ${measure.number}마디 · 파트보는 총보 공통 반복으로 내보냈습니다. 보표별로 다른 반복·볼타 설정은 사본에 포함되지 않습니다. 원본 프로젝트를 함께 보관해 주세요.`,
      message: 'Independent staff repeat and volta settings were replaced by the performed full-score sequence in the selected part copy.',
      path: `score.parts[${partIndex}].staves[${staffIndex}].measures[${index}] (${part.id}/${staff.id}/${measure.id})`,
      measureId: measure.id,
      measureNumber: measure.number
    }]
  })
}
