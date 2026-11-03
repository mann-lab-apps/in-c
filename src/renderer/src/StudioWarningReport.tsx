import { useState, type ReactNode } from 'react'
import { Accordion, Banner, Text } from '@ddirori/ui'
import './studio-warning-report.css'

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
  const list = <ul className="studio-warning-report__list">{props.children}</ul>
  return <section className={`studio-warning-report ddirori${props.details ? ' studio-warning-report--compact' : ''}`} data-theme={props.theme} data-density="compact" aria-label={props.label}>
    <Banner kind="warning">
      <header className="studio-warning-report__header">
        <Text as="h3" variant="itemTitle">{props.title}</Text>
        <Text as="span" variant="caption">{props.fileName}</Text>
      </header>
      {props.details ? <div className="studio-warning-report__details" data-open={props.details.open} onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Enter' || event.key === ' ') event.stopPropagation()
      }}>
        <Text variant="description">{props.details.summary}</Text>
        <Accordion title={props.details.title} open={props.details.open} onOpenChange={props.details.onOpenChange}>
          {list}
        </Accordion>
      </div> : list}
    </Banner>
  </section>
}

export function StudioWarningTechnicalDetails({ warning, meta }: {
  warning: { path?: string; message: string }
  meta: string
}) {
  const [open, setOpen] = useState(false)
  return <div className="studio-warning-technical"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Enter' || event.key === ' ') event.stopPropagation()
    }}>
    <Accordion title="기술 정보" open={open} onOpenChange={setOpen}>
      <div className="studio-warning-technical__content">
        <Text as="span" variant="caption" className="studio-warning-technical__meta">{meta}</Text>
        {warning.path ? <code>{warning.path}</code> : null}
        <Text as="span" variant="description">{warning.message}</Text>
      </div>
    </Accordion>
  </div>
}

// Private file-lifecycle presentation shared by the welcome and score surfaces.
export interface StudioOperationDiagnostic {
  operation: '프로젝트 저장' | '프로젝트 열기' | 'MusicXML 가져오기' | 'MusicXML 저장' | 'MusicXML 내보내기' | 'PDF 출력' | 'PNG 출력' | '자동저장 복구' | '최근 악보 목록' | '자동저장'
  message: string
}
export function StudioOperationDetails({ details }: { details: StudioOperationDiagnostic }) {
  return <div role="group" aria-label={`${details.operation} 기술 정보`}>
    <StudioWarningTechnicalDetails key={`${details.operation}:${details.message}`}
      warning={{ message: details.message }} meta={`${details.operation} 진단`} />
  </div>
}
