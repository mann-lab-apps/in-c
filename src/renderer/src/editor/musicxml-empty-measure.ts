import { validateMeasureRhythm, type Score } from '../../../score-core'
import { createPartOptionLabels } from './part-option-labels'

// Presentation only: retain the serializer's strict rejection and raw diagnostic.
// Translate only its first invalid measure when it or its remaining voices are empty; unrelated
// structure, tuplet, rhythm or I/O errors must keep their existing handling.
export function describeEmptyMusicXmlMeasure(score: Score, diagnostic: string): { message: string; technicalMessage: string } | undefined {
  const labels = createPartOptionLabels(score.parts)
  for (const [partIndex, part] of score.parts.entries()) for (const [staffIndex, staff] of part.staves.entries()) {
    for (const [measureIndex, measure] of staff.measures.entries()) {
      const rhythm = validateMeasureRhythm(measure)
      if (rhythm.isExact) continue
      const emptyVoices = measure.voices.map((voice, index) => ({ voice, index }))
        .filter(({ voice }) => voice.events.length === 0)
      const onlyEmptyVoiceGaps = rhythm.status === 'gap' && emptyVoices.length > 0 &&
        rhythm.issues.length === emptyVoices.length && rhythm.issues.every(issue =>
          issue.type === 'gap' && issue.startTick === 0 && issue.endTick === rhythm.expectedTicks &&
          emptyVoices.some(({ voice }) => voice.id === issue.voiceId))
      if ((rhythm.status !== 'empty' && !onlyEmptyVoiceGaps) ||
        diagnostic !== `measure ${measure.number}의 리듬 정합성이 올바르지 않습니다: ${rhythm.status}`) return undefined
      const voiceLabels = emptyVoices.map(({ voice, index }) => {
        const number = Number(voice.id.match(/(\d+)$/)?.[1])
        return number >= 1 && number <= 4 ? `${number}성부` : `${index + 1}번째 성부`
      }).join(', ')
      const location = `${labels[partIndex]} · 보표 ${staffIndex + 1} · ${measure.number}마디`
      const measurePath = `parts[${partIndex}].staves[${staffIndex}].measures[${measureIndex}]`
      return {
        message: onlyEmptyVoiceGaps
          ? `빈 성부가 있어 MusicXML로 내보낼 수 없습니다. 해당 성부에 음표나 쉼표를 입력한 뒤 다시 시도해 주세요. 프로젝트로 저장하면 현재 상태를 보관할 수 있습니다. 확인할 위치: ${location} · ${voiceLabels}`
          : `빈 마디가 있어 MusicXML로 내보낼 수 없습니다. 음표나 쉼표로 마디를 채운 뒤 다시 시도해 주세요. 프로젝트로 저장하면 현재 상태를 보관할 수 있습니다. 확인할 위치: ${location}`,
        technicalMessage: `${diagnostic}\n${measurePath} (${part.id}/${staff.id}/${measure.id})` +
          (onlyEmptyVoiceGaps ? emptyVoices.map(({ voice, index }) => `\n${measurePath}.voices[${index}] (${voice.id})`).join('') : '')
      }
    }
  }
  return undefined
}
