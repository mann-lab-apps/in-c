import { useRef } from 'react'
import { Button, Density, Popover, Text } from '@ddirori/ui'
import { Pencil } from 'lucide-react'
import './studio-metadata-actions.css'

export function StudioMetadataActions({ theme, open, onOpenChange, partView, onEdit, onNavigateToScore }: {
  theme: 'light' | 'dark'
  open: boolean
  onOpenChange: (value: boolean) => void
  partView: boolean
  onEdit: (field: 'title' | 'composer' | 'partTitle', returnTarget?: HTMLButtonElement) => void
  onNavigateToScore: () => void
}) {
  const root = useRef<HTMLSpanElement>(null)
  return <span ref={root} className="studio-metadata-actions ddirori" data-theme={theme} data-density="compact"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') { event.stopPropagation(); return }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
        if (event.key === 'F6') { event.preventDefault(); event.stopPropagation(); onOpenChange(false); onNavigateToScore() }
      }
    }}>
    <Popover label="악보 정보" open={open} onOpenChange={onOpenChange}>
      <Density density="comfortable">
        <div className="studio-metadata-actions__content">
          <Text as="h3" variant="itemTitle">악보 정보</Text>
          <Text variant="description">제목과 작곡가는 악보 전체에 적용합니다. 파트보 제목은 현재 파트보에만 적용합니다.</Text>
          {([
            ['title', '악보 제목 편집'], ['composer', '작곡가 편집'], ['partTitle', '파트보 제목 편집']
          ] as const).map(([field, label]) => <Button key={field} kind="secondary" aria-label={label}
            disabled={field === 'partTitle' && !partView}
            title={field === 'partTitle' && !partView ? '파트보 보기에서 사용할 수 있습니다.' : undefined}
            onClick={() => {
              const trigger = root.current?.querySelector<HTMLButtonElement>('button[aria-label="악보 정보"]')
              onOpenChange(false)
              onEdit(field, trigger ?? undefined)
            }}>
            <span className="studio-metadata-actions__button-content"><Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span></span>
          </Button>)}
        </div>
      </Density>
    </Popover>
  </span>
}
