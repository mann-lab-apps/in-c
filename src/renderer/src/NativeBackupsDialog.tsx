import { useEffect, useRef, useState } from 'react'
import { RefreshCw, RotateCcw, X } from 'lucide-react'
import type { NativeBackupEntry } from '../../project/backups'
import { ModalBackdrop } from './ModalBackdrop'
import { IconButton } from '../../../packages/ddirori_web/src/controls'

export function NativeBackupsDialog({ onClose, onRestore }: {
  onClose: () => void
  onRestore: (id: string) => Promise<void>
}) {
  const [entries, setEntries] = useState<NativeBackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const pending = useRef(false)
  const alive = useRef(true)
  const dialog = useRef<HTMLElement>(null)

  useEffect(() => {
    alive.current = true
    dialog.current?.focus()
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    void Promise.resolve().then(() => window.inC.project.listBackups()).then(items => {
      if (current) setEntries(items)
    }).catch(cause => {
      if (current) setError(cause instanceof Error ? cause.message : String(cause))
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [reload])

  const restore = async (id: string) => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try { await onRestore(id) } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally { pending.current = false; if (alive.current) setBusy(false) }
  }

  return <ModalBackdrop onDismiss={onClose}>
    <section className="recovery-dialog native-backups-dialog" role="dialog" aria-modal="true" aria-label="프로젝트 백업" tabIndex={-1} ref={dialog}>
      <header className="native-backups-header"><h2>프로젝트 백업</h2>
        <div className="native-backups-actions">
          <IconButton disabled={loading || busy} onClick={() => setReload(value => value + 1)} label="백업 목록 다시 불러오기"><RefreshCw size={18} aria-hidden="true" /></IconButton>
          <IconButton onClick={onClose} label="닫기"><X size={18} aria-hidden="true" /></IconButton>
        </div>
      </header>
      {loading ? <p role="status">불러오는 중</p> : entries.length === 0 && !error ? <p>백업 없음</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <ul className="native-backups-list">{entries.map(entry => <li key={entry.id} data-backup-id={entry.id}>
        <div><strong>{entry.title ?? '읽을 수 없는 백업'}</strong><span>{entry.fileName}</span>
          <time>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''}</time>
          {entry.error ? <span title={entry.error}>읽기 불가</span> : null}</div>
        <IconButton disabled={loading || busy || Boolean(entry.error)} onClick={() => void restore(entry.id)} label={`${entry.title ?? entry.fileName} 복구`} title="백업 복구">
          <RotateCcw size={18} aria-hidden="true" />
        </IconButton>
      </li>)}</ul>
    </section>
  </ModalBackdrop>
}
