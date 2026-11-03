import { Button, Group, IconButton, Text, Tooltip } from '@ddirori/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { OctaveShiftType } from '../../score-core'
import './studio-range-tools.css'

const octaves = ['8va', '8vb', '15ma', '15mb'] as const

export function StudioRangeTools(props: {
  hairpin?: 'crescendo' | 'diminuendo'
  slur: boolean
  octave?: OctaveShiftType
  canHairpin: boolean
  canSlur: boolean
  canOctave: boolean
  onHairpin: (type: 'crescendo' | 'diminuendo') => void
  onSlur: () => void
  onOctave: (type: OctaveShiftType) => void
}) {
  return <section className="studio-range-tools" aria-label="범위 기호"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key === ' '))) event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">범위 기호</Text>
    <Group label="헤어핀">
      <Tooltip text="크레셴도 헤어핀"><IconButton label="크레셴도 헤어핀" selected={props.hairpin === 'crescendo'} disabled={!props.canHairpin} onClick={() => props.onHairpin('crescendo')}>
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75}/>
      </IconButton></Tooltip>
      <Tooltip text="디미누엔도 헤어핀"><IconButton label="디미누엔도 헤어핀" selected={props.hairpin === 'diminuendo'} disabled={!props.canHairpin} onClick={() => props.onHairpin('diminuendo')}>
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75}/>
      </IconButton></Tooltip>
    </Group>
    <Button kind="secondary" aria-label="슬러 추가 또는 해제, 단축키 S" selected={props.slur} disabled={!props.canSlur} onClick={props.onSlur}>슬러 (S)</Button>
    <Group label="옥타브">
      {octaves.map(type => <Tooltip key={type} text={`${type} 옥타브 표시`}>
        <Button kind="secondary" selected={props.octave === type} disabled={!props.canOctave} onClick={() => props.onOctave(type)}>{type}</Button>
      </Tooltip>)}
    </Group>
  </section>
}
