import { Button, Group, Input, Select, Text, Tooltip } from '@ddirori/ui'
import { FileDown, FileImage, FileMusic, FileVolume } from 'lucide-react'
import type { ReactNode } from 'react'
import './studio-export-tools.css'

interface Props {
  theme: 'light' | 'dark'
  copySourceHint?: string
  pageCount: string
  pageCountInvalid: boolean
  onPageCountChange: (value: string) => void
  pdfBusy: boolean
  pdfDisabled: boolean
  pdfHint: string
  onPdf: () => void
  onPdfWithGroupedRests?: () => void
  onMidi: () => void
  xmlBusy: boolean
  xmlHint: string
  onXml: () => void
  onExpandedXml: () => void
  png: {
    busy: boolean; disabled: boolean; scope: 'all' | 'page'; page: string; dpi: 150 | 300
    message?: string; hint: string
    details?: ReactNode
    onScope: (value: 'all' | 'page') => void; onPage: (value: string) => void
    onDpi: (value: 150 | 300) => void; onSave: () => void
  }
}

const pageError = 'PDF 장수는 1 이상이어야 합니다.'
const expandedXmlHint = '도돌이표·볼타·반복 이동을 현재 재생 순서대로 펼친 사본입니다. 일부 표기는 펼친 사본으로 옮길 수 없습니다. 원본은 프로젝트 파일로 보관하세요.'

// File/output ownership stays in App. Page count retains its raw string draft:
// NumberControl would clamp zero/empty and lose the existing invalid/retry contract.
export function StudioExportTools(props: Props) {
  const xmlHint = `${props.xmlHint}. 도돌이표·볼타와 반복 이동 표지를 유지합니다.`
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
          busy={props.pdfBusy} disabled={props.pdfDisabled} onClick={() => { props.onPdf() }}>
          <span className="studio-export-tools__command"><FileDown aria-hidden="true" size={18} strokeWidth={1.75}/><span>PDF 변환</span></span>
        </Button>
      </Tooltip>
      {props.onPdfWithGroupedRests ? <Tooltip text="연속 온마디 쉼표를 묶어 이 파트보의 PDF를 만듭니다.">
        <Button kind="secondary" busy={props.pdfBusy} disabled={props.pdfDisabled}
          onClick={props.onPdfWithGroupedRests}>쉼표를 묶어 파트보 PDF 출력</Button>
      </Tooltip> : null}
      <Tooltip text={midiHint}>
        <Button kind="secondary" aria-label="MIDI 내보내기"
          title={midiHint} onClick={() => { props.onMidi() }}>
          <span className="studio-export-tools__command"><FileVolume aria-hidden="true" size={18} strokeWidth={1.75}/><span>MIDI</span></span>
        </Button>
      </Tooltip>
      <Tooltip text={xmlHint}>
        <Button kind="secondary" aria-label="MusicXML 내보내기" title={xmlHint}
          busy={props.xmlBusy} disabled={props.xmlBusy} onClick={() => { props.onXml() }}>
          <span className="studio-export-tools__command"><FileMusic aria-hidden="true" size={18} strokeWidth={1.75}/><span>MusicXML</span></span>
        </Button>
      </Tooltip>
      <Tooltip text={expandedXmlHint}>
        <Button kind="secondary" aria-label="반복 펼치기 MusicXML 내보내기" title={expandedXmlHint}
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
      {props.png.details ? <div className="studio-export-tools__png-diagnostic">
        {props.png.details}
      </div> : null}
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
