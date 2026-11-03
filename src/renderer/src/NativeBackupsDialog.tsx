import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Banner, Dialog, IconButton, Item, Text } from '@ddirori/ui'
import { StudioWarningTechnicalDetails } from './StudioWarningReport'
import './studio-backups.css'
import type { NativeBackupEntry } from '../../project/backups'

export function NativeBackupsDialog({ theme, onClose, onRestore }: {
  theme: 'light' | 'dark'
  onClose: () => void
  onRestore: (id: string) => Promise<void>
}) {
  const [entries, setEntries] = useState<NativeBackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const alive = useRef(true)
  const root = useRef<HTMLDivElement>(null)
  const focusVersion = useRef(0)
  const restoreFocus = useRef<{ trigger: HTMLButtonElement; version: number; waiting?: HTMLElement }>(undefined)

  useLayoutEffect(() => {
    const request = restoreFocus.current
    if (!request) return
    if (busy) {
      if (request.version !== focusVersion.current ||
          (document.activeElement !== document.body && document.activeElement !== request.trigger)) return
      // Disabling the restore button removes native keyboard focus. Keep the
      // existing cancel action reachable while the read is outstanding.
      const close = root.current?.querySelector<HTMLButtonElement>('dialog button[aria-label="닫기"]')
      close?.focus({ preventScroll: true })
      request.waiting = close ?? undefined
      request.version = focusVersion.current
      return
    }
    restoreFocus.current = undefined
    if (alive.current && request.version === focusVersion.current && request.trigger.isConnected && !request.trigger.disabled &&
        (document.activeElement === document.body || document.activeElement === request.waiting || document.activeElement === request.trigger)) {
      request.trigger.focus()
    }
  }, [busy])

  useEffect(() => {
    alive.current = true
    let current = true
    void window.inC.project.listBackups().then(items => {
      if (current) setEntries(items)
    }).catch(cause => {
      if (current) setError(cause instanceof Error ? cause.message : String(cause))
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false; alive.current = false }
  }, [])

  const restore = async (id: string) => {
    if (pending.current) return
    const trigger = document.activeElement instanceof HTMLButtonElement &&
      document.activeElement.closest('[data-backup-id]')?.getAttribute('data-backup-id') === id ? document.activeElement : undefined
    restoreFocus.current = trigger ? { trigger, version: focusVersion.current } : undefined
    pending.current = true
    setBusy(true)
    setError('')
    try { await onRestore(id) } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally { pending.current = false; if (alive.current) setBusy(false) }
  }

  // Closing during restore cancels App's request. Dialog busy must not lock this exit.
  return <div ref={root} className="studio-backups ddirori" data-theme={theme} data-density="compact"
    onFocusCapture={() => { focusVersion.current += 1 }}
    onPointerDownCapture={() => { if (pending.current) focusVersion.current += 1 }}
    onKeyDownCapture={() => { if (pending.current) focusVersion.current += 1 }}
    onKeyDown={event => {
      event.stopPropagation()
      if (event.key === 'Escape') { event.preventDefault(); if (!event.nativeEvent.isComposing && event.keyCode !== 229) onClose() }
    }}>
    <Dialog open title="프로젝트 백업" onClose={onClose}>
      {loading ? <Text as="p" role="status">불러오는 중</Text> : entries.length === 0 && !error ? <Text as="p">백업 없음</Text> : null}
      {busy ? <Text as="p" role="status">복구 파일을 불러오는 중입니다. 닫으면 복구를 취소합니다.</Text> : null}
      {error ? <Banner kind="error">
        <Text as="p">백업을 확인하지 못했습니다. 창을 다시 열거나 다른 백업을 선택해 주세요.</Text>
        <StudioWarningTechnicalDetails warning={{message:error}} meta="프로젝트 백업"/>
      </Banner> : null}
      <ul className="studio-backup-list">{entries.map(entry => <li key={entry.id} data-backup-id={entry.id}>
        <Item flat title={entry.title ?? '읽을 수 없는 백업'} subtitle={entry.fileName}
          trailing={<IconButton disabled={busy || Boolean(entry.error)}
            onClick={() => { void restore(entry.id) }} label={`${entry.title ?? entry.fileName} 복구`} title="백업 복구">
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true"/>
          </IconButton>}
          actions={<>
            <time dateTime={entry.updatedAt || undefined}><Text as="span" variant="caption">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''}</Text></time>
            {entry.error ? <div className="studio-backup-entry-warning" role="group" aria-label={`${entry.fileName} 백업 검사`}>
              <Text as="p" variant="description">이 백업을 읽을 수 없습니다. 다른 백업을 선택해 주세요.</Text>
              <StudioWarningTechnicalDetails warning={{ message: entry.error }} meta={`백업 검사 · ${entry.fileName}`} />
            </div> : null}
          </>}/>
      </li>)}</ul>
    </Dialog>
  </div>
}
