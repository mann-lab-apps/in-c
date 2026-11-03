import { Banner, Button, Checkbox, Select, Text } from '@ddirori/ui'
import './studio-lyric-tools.css'

type Syllabic = 'single' | 'begin' | 'middle' | 'end'

// Verse is workspace state; syllabic and extend use App's existing lyric command.
export function StudioLyricTools(props: {
  enabled: boolean
  blockedReason?: string
  verse: number
  verses: readonly number[]
  syllabic: Syllabic
  extend: boolean
  onOpen: () => void
  onVerse: (verse: number) => void
  onSyllabic: (syllabic: Syllabic) => void
  onExtend: (extend: boolean) => void
}) {
  return <section className="studio-lyric-tools" aria-label="가사 속성" tabIndex={-1}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229 || (!event.ctrlKey && !event.metaKey && !event.altKey && ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' '))) event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">가사</Text>
    {props.enabled ? <>
      <Text as="p" variant="description">선택한 음표의 가사입니다. 글자는 악보에서 입력합니다.</Text>
      {props.blockedReason ? <Banner kind="warning">{props.blockedReason}</Banner> : null}
      <Button kind="secondary" disabled={Boolean(props.blockedReason)} onClick={props.onOpen}>가사 글자 입력</Button>
      <Select disabled={Boolean(props.blockedReason)} label="가사 절" value={String(props.verse)} options={props.verses.map(verse => ({ value: String(verse), label: `${verse}절` }))} onChange={value => props.onVerse(Number.parseInt(value, 10))}/>
      <Select disabled={Boolean(props.blockedReason)} label="가사 음절" value={props.syllabic} options={[
        { value: 'single', label: '한 음절' }, { value: 'begin', label: '첫 음절' },
        { value: 'middle', label: '가운데 음절' }, { value: 'end', label: '마지막 음절' }
      ]} onChange={value => props.onSyllabic(value as Syllabic)}/>
      <Checkbox disabled={Boolean(props.blockedReason)} label="멜리스마" checked={props.extend} onChange={event => props.onExtend(event.target.checked)}/>
    </> : <Text as="p" variant="caption">음표를 선택하면 가사 입력 항목이 표시됩니다.</Text>}
  </section>
}
