import { useEffect, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import type { NativeBackupEntry } from '../../project/backups'

export function NativeBackupsDialog({ onClose, onRestore }: {
  onClose: () => void
  onRestore: (id: string) => Promise<void>
}) {
  const [entries, setEntries] = useState<NativeBackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const alive = useRef(true)
  const dialog = useRef<HTMLElement>(null)

  useEffect(() => {
    alive.current = true
    let current = true
    const previousFocus = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    void window.inC.project.listBackups().then(items => {
      if (current) setEntries(items)
    }).catch(cause => {
      if (current) setError(cause instanceof Error ? cause.message : String(cause))
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false; alive.current = false; previousFocus?.focus() }
  }, [])

  const restore = async (id: string) => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try { await onRestore(id) } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally { pending.current = false; if (alive.current) setBusy(false) }
  }

  return <div className="modal-backdrop" role="presentation">
    <section className="recovery-dialog native-backups-dialog" role="dialog" aria-modal="true" aria-label="프로젝트 백업" tabIndex={-1} ref={dialog}
      onKeyDown={event => {
        event.stopPropagation()
        if (event.key === 'Escape') { event.preventDefault(); onClose() }
        if (event.key === 'Tab') {
          const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
          if (event.shiftKey ? index <= 0 : index < 0 || index === buttons.length - 1) {
            event.preventDefault(); (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus()
          }
        }
      }}>
      <header className="native-backups-header"><h2>프로젝트 백업</h2><button type="button" onClick={onClose} title="닫기" aria-label="닫기"><X size={18} aria-hidden="true" /></button></header>
      {loading ? <p role="status">불러오는 중</p> : entries.length === 0 && !error ? <p>백업 없음</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <ul className="native-backups-list">{entries.map(entry => <li key={entry.id} data-backup-id={entry.id}>
        <div><strong>{entry.title ?? '읽을 수 없는 백업'}</strong><span>{entry.fileName}</span>
          <time>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''}</time>
          {entry.error ? <span title={entry.error}>읽기 불가</span> : null}</div>
        <button type="button" disabled={busy || Boolean(entry.error)} onClick={() => void restore(entry.id)} aria-label={`${entry.title ?? entry.fileName} 복구`} title="백업 복구">
          <RotateCcw size={18} aria-hidden="true" />
        </button>
      </li>)}</ul>
    </section>
  </div>
}
