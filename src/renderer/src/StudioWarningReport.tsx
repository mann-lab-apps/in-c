import { useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { Accordion, Banner, Text } from '@ddirori/ui'
import { isReportNavigationKey } from './editor/report-text-selection'
import './studio-warning-report.css'

function handleReportKeyDown(event: KeyboardEvent<HTMLElement>) {
  // Keep native disclosure/scroll behavior without editing the score behind it.
  // Document shortcuts and workspace focus navigation still reach the app.
  if (event.nativeEvent.isComposing || event.keyCode === 229 ||
    event.key === 'Enter' || event.key === ' ' || isReportNavigationKey(event.key)) event.stopPropagation()
}

// Presentation only. Each format keeps its own report payload and request ownership.
export function StudioWarningReport(props: {
  label: string
  title: string
  fileName: string
  theme: 'light' | 'dark'
  children: ReactNode
  details?: {
    summary: string
    title: string
    open: boolean
    onOpenChange: (open: boolean) => void
  }
}) {
  const list = <div className="studio-warning-report__viewport" role="group"
    aria-label={`${props.label} 목록 읽기`} tabIndex={0} onKeyDown={handleReportKeyDown}>
    <ul className="studio-warning-report__list">{props.children}</ul>
  </div>
  return <section className={`studio-warning-report ddirori${props.details ? ' studio-warning-report--compact' : ''}`} data-theme={props.theme} data-density="compact" aria-label={props.label}>
    <Banner kind="warning">
      <header className="studio-warning-report__header">
        <Text as="h3" variant="itemTitle">{props.title}</Text>
        <Text as="span" variant="caption">{props.fileName}</Text>
      </header>
      {props.details ? <div className="studio-warning-report__details" data-open={props.details.open} onKeyDown={handleReportKeyDown}>
        <Text variant="description">{props.details.summary}</Text>
        <Accordion title={props.details.title} open={props.details.open} onOpenChange={props.details.onOpenChange}>
          {list}
        </Accordion>
      </div> : list}
    </Banner>
  </section>
}

interface TechnicalDisclosure {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StudioWarningTechnicalDetails({ warning, meta, disclosure }: {
  warning: { path?: string; message: string }
  meta: string
  disclosure?: TechnicalDisclosure
}) {
  const [open, setOpen] = useState(false)
  return <div className="studio-warning-technical"
    onKeyDown={handleReportKeyDown}>
    <Accordion title="기술 정보" open={disclosure?.open ?? open} onOpenChange={disclosure?.onOpenChange ?? setOpen}>
      <div className="studio-warning-technical__content">
        <Text as="span" variant="caption" className="studio-warning-technical__meta">{meta}</Text>
        {warning.path ? <code>{warning.path}</code> : null}
        <Text as="span" variant="description" className="studio-warning-technical__message">{warning.message}</Text>
      </div>
    </Accordion>
  </div>
}

// Private file-lifecycle presentation shared by the welcome and score surfaces.
export interface StudioOperationDiagnostic {
  operation: '프로젝트 저장' | '프로젝트 열기' | 'MusicXML 가져오기' | 'MusicXML 저장' | 'MusicXML 내보내기' | 'PDF 출력' | 'PNG 출력' | '자동저장 복구' | '최근 악보 목록' | '자동저장'
  message: string
}
export function StudioOperationDetails({ details, disclosure, ref }: {
  details: StudioOperationDiagnostic
  disclosure?: TechnicalDisclosure
  ref?: Ref<HTMLDivElement>
}) {
  return <div ref={ref} role="group" aria-label={`${details.operation} 기술 정보`}>
    <StudioWarningTechnicalDetails key={`${details.operation}:${details.message}`}
      warning={{ message: details.message }} meta={`${details.operation} 진단`} disclosure={disclosure} />
  </div>
}
