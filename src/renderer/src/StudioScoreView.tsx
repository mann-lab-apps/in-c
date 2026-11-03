import { Select, Text } from '@ddirori/ui'
import { createPartOptionLabels } from './editor/part-option-labels'
import './studio-score-view.css'

export function StudioScoreView({ mode, partId, parts, target, onMode, onPart }: {
  mode: 'score' | 'part'
  partId?: string
  parts: readonly { id: string; name: string }[]
  target: string
  onMode: (mode: 'score' | 'part') => void
  onPart: (partId: string) => void
}) {
  const labels = createPartOptionLabels(parts)
  return <section className="studio-score-view" aria-label="총보와 파트보 보기"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229 ||
        (!event.metaKey && !event.ctrlKey && !event.altKey &&
          (event.target as HTMLElement).closest('[role="combobox"]'))) event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">악보 보기</Text>
    <div className="studio-score-view__fields">
      <Select label="악보 보기" value={mode} options={[{ value: 'score', label: '총보' }, { value: 'part', label: '파트보' }]}
        onChange={onMode}/>
      <Select label="파트보 선택" value={partId ?? ''} disabled={mode !== 'part'}
        options={parts.map((part,index) => ({ value: part.id, label: labels[index]! }))} onChange={onPart}/>
    </div>
    <Text as="output" variant="description" aria-label="현재 파트와 보표">{target}</Text>
  </section>
}
