import { Button, Group, Input, Select, Text, Tooltip } from '@ddirori/ui'
import { FileDown, FileImage, FileMusic, FileVolume } from 'lucide-react'
import './studio-export-tools.css'

interface Props {
  theme: 'light' | 'dark'
  copySourceHint?: string
  pageCount: string
  pageCountInvalid: boolean
  onPageCountChange: (value: string) => void
  pdfDisabled: boolean
  pdfHint: string
  onPdf: () => void
  onMidi: () => void
  xmlBusy: boolean
  xmlHint: string
  onXml: () => void
  onExpandedXml: () => void
  png: {
    busy: boolean; disabled: boolean; scope: 'all' | 'page'; page: string; dpi: 150 | 300
    message?: string; hint: string
    onScope: (value: 'all' | 'page') => void; onPage: (value: string) => void
    onDpi: (value: 150 | 300) => void; onSave: () => void
  }
}

const pageError = 'PDF 장수는 1 이상이어야 합니다.'

// File/output ownership stays in App. Page count retains its raw string draft:
// NumberControl would clamp zero/empty and lose the existing invalid/retry contract.
export function StudioExportTools(props: Props) {
  const pdfHint = [props.pdfHint, props.copySourceHint].filter(Boolean).join(' ')
  const midiHint = ['현재 악보 보기 또는 선택 파트보를 MIDI 파일로 내보내기', props.copySourceHint].filter(Boolean).join(' ')
  return <section className="studio-export-tools ddirori" aria-label="내보내기 작업"
    data-theme={props.theme} data-density="compact"
    onKeyDownCapture={event => {
      if(event.nativeEvent.isComposing || event.keyCode === 229) event.stopPropagation()
    }}
    onKeyDown={event => {
      if(!event.ctrlKey && !event.metaKey && !event.altKey &&
        (event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
    }}>
    <Group label="파일 형식">
      <Tooltip text={props.png.hint}>
        <Button kind="secondary" aria-label="PNG 내보내기" busy={props.png.busy} disabled={props.png.disabled || props.png.busy} onClick={props.png.onSave}>
          <span className="studio-export-tools__command"><FileImage aria-hidden="true" size={18} strokeWidth={1.75}/><span>PNG</span></span>
        </Button>
      </Tooltip>
      <Tooltip text={pdfHint}>
        <Button kind="secondary" aria-label="PDF 변환" title={pdfHint}
          aria-describedby={props.pageCountInvalid ? 'pdf-target-pages-error' : undefined}
          disabled={props.pdfDisabled} onClick={() => { props.onPdf() }}>
          <span className="studio-export-tools__command"><FileDown aria-hidden="true" size={18} strokeWidth={1.75}/><span>PDF 변환</span></span>
        </Button>
      </Tooltip>
      <Tooltip text={midiHint}>
        <Button kind="secondary" aria-label="MIDI 내보내기"
          title={midiHint} onClick={() => { props.onMidi() }}>
          <span className="studio-export-tools__command"><FileVolume aria-hidden="true" size={18} strokeWidth={1.75}/><span>MIDI</span></span>
        </Button>
      </Tooltip>
      <Tooltip text={props.xmlHint}>
        <Button kind="secondary" aria-label="MusicXML 내보내기" title={props.xmlHint}
          busy={props.xmlBusy} disabled={props.xmlBusy} onClick={() => { props.onXml() }}>
          <span className="studio-export-tools__command"><FileMusic aria-hidden="true" size={18} strokeWidth={1.75}/><span>MusicXML</span></span>
        </Button>
      </Tooltip>
      <Tooltip text="반복과 볼타를 현재 재생 순서대로 펼친 사본입니다. 일부 표기는 옮길 수 없어 일반 MusicXML 내보내기나 프로젝트 저장이 필요합니다.">
        <Button kind="secondary" aria-label="반복 펼치기 MusicXML 내보내기"
          busy={props.xmlBusy} disabled={props.xmlBusy} onClick={()=>{props.onExpandedXml()}}>
          <span className="studio-export-tools__command"><FileMusic aria-hidden="true" size={18} strokeWidth={1.75}/><span>MusicXML 반복 펼치기</span></span>
        </Button>
      </Tooltip>
    </Group>
    <Group label="PNG 출력 설정">
      <Select label="PNG 페이지" value={props.png.scope} disabled={props.png.busy}
        options={[{value:'all',label:'전체 페이지'},{value:'page',label:'페이지 선택'}]}
        onChange={value=>props.png.onScope(value)}/>
      {props.png.scope === 'page' ? <Input label="PNG 페이지 번호" type="number" min={1} step={1} value={props.png.page} disabled={props.png.busy}
        onChange={event=>props.png.onPage(event.target.value)}/> : null}
      <Select label="PNG 해상도" value={String(props.png.dpi)} disabled={props.png.busy}
        options={[{value:'150',label:'150 dpi'},{value:'300',label:'300 dpi'}]} onChange={value=>props.png.onDpi(Number(value) as 150 | 300)}/>
      <Text variant="caption">PNG도 PDF 페이지 설정의 용지·방향·여백을 사용합니다. 여러 페이지는 선택한 위치의 새 폴더에 저장합니다.</Text>
      {props.png.message ? <Text variant="caption">{props.png.message}</Text> : null}
    </Group>
    <div className="studio-export-tools__page-count">
      <Input label="PDF 목표 장수" aria-label="PDF 목표 장수" type="number"
        inputMode="numeric" pattern="[0-9]*" min={1} step={1}
        title={pageError} error={props.pageCountInvalid ? pageError : undefined}
        value={props.pageCount} onChange={event => props.onPageCountChange(event.target.value)}/>
    </div>
    {props.pageCountInvalid ? <span className="sr-only" id="pdf-target-pages-error">{pageError}</span> : null}
  </section>
}
