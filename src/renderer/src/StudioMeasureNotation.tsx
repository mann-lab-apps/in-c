import { Button, Group, Select, Text } from '@ddirori/ui'
import './studio-measure-notation.css'

// Adding/editing text opens the existing inspector; no second text draft/command.
export function StudioMeasureNotation(props: {
  enabled: boolean
  clefEnabled: boolean
  clef: string
  clefs: readonly {value: string; label: string; disabled?: boolean}[]
  onClef: (value: string) => void
  onText: () => void
  onDynamic: () => void
}) {
  return <section className="studio-measure-notation" aria-label="마디 표기" data-applicability={props.enabled ? 'active-measure' : 'range-disabled'}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229 || (!event.metaKey && !event.ctrlKey && !event.altKey && ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' '))) event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">마디 표기</Text>
    <Text as="p" variant="description">텍스트와 셈여림은 선택 위치의 속성에서 편집합니다.</Text>
    <Group label="선택 위치의 속성 열기">
      <Button kind="secondary" disabled={!props.enabled} onClick={props.onText}>텍스트 표기 편집</Button>
      <Button kind="secondary" disabled={!props.enabled} onClick={props.onDynamic}>셈여림 편집</Button>
    </Group>
    <Select label="선택 마디 음자리표" help="선택한 한 마디에 적용합니다." value={props.clef} options={props.clefs} disabled={!props.clefEnabled} onChange={props.onClef}/>
    {!props.enabled ? <Text as="p" variant="caption">한 음표 또는 마디를 선택해 주세요.</Text> : null}
  </section>
}
