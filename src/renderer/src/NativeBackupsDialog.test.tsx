// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NativeBackupsDialog } from './NativeBackupsDialog'

const listBackups = vi.fn()
const entry = { id: 'one', title: 'Practice', fileName: 'practice.chromatics', updatedAt: '' }
beforeEach(() => {
  listBackups.mockReset()
  vi.stubGlobal('inC', { project: { listBackups } })
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 40, 32)] as unknown as DOMRectList)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('native backup dialog recovery states', () => {
  it('does not dismiss during IME composition or send keys to the score', async () => {
    listBackups.mockResolvedValue([])
    const close = vi.fn(), scoreKey = vi.fn()
    render(<div onKeyDown={scoreKey}><NativeBackupsDialog onClose={close} onRestore={vi.fn()} /></div>)
    await screen.findByText('백업 없음')
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape', isComposing: true })
    fireEvent.keyDown(dialog, { key: 'n' })
    expect(close).not.toHaveBeenCalled()
    expect(scoreKey).not.toHaveBeenCalled()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(close).toHaveBeenCalledOnce()
  })

  it('returns focus to the menu trigger when the launching menu item disappears', async () => {
    listBackups.mockResolvedValue([])
    function Workspace() {
      const [menu, setMenu] = useState(true), [open, setOpen] = useState(false)
      return <>
        <button aria-controls="backup-menu" onClick={() => setMenu(true)}>File menu</button>
        {menu && <div id="backup-menu" role="menu"><button role="menuitem" onClick={() => {
          setMenu(false); setOpen(true)
        }}>Backups</button></div>}
        {open && <NativeBackupsDialog onClose={() => setOpen(false)} onRestore={vi.fn()} />}
      </>
    }
    render(<Workspace />)
    const item = screen.getByRole('menuitem', { name: 'Backups' })
    item.focus()
    fireEvent.click(item)
    await screen.findByText('백업 없음')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'File menu' })).toHaveFocus()
  })
  it('retries a failed list request without restoring or claiming success', async () => {
    listBackups.mockRejectedValueOnce(Error('Directory unavailable')).mockResolvedValueOnce([entry])
    const restore = vi.fn()
    render(<NativeBackupsDialog onClose={vi.fn()} onRestore={restore} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Directory unavailable')
    fireEvent.click(screen.getByRole('button', { name: '백업 목록 다시 불러오기' }))
    expect(await screen.findByRole('button', { name: 'Practice 복구' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(listBackups).toHaveBeenCalledTimes(2)
    expect(restore).not.toHaveBeenCalled()
  })

  it('keeps loading distinct from an empty list and disables repeated retry', async () => {
    let finish!: (entries: unknown[]) => void
    listBackups.mockRejectedValueOnce(Error('offline')).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    render(<NativeBackupsDialog onClose={vi.fn()} onRestore={vi.fn()} />)
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: '백업 목록 다시 불러오기' }))
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중')
    expect(screen.queryByText('백업 없음')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '백업 목록 다시 불러오기' })).toBeDisabled()
    await waitFor(() => expect(listBackups).toHaveBeenCalledTimes(2))
    finish([])
    expect(await screen.findByText('백업 없음')).toBeInTheDocument()
    expect(listBackups).toHaveBeenCalledTimes(2)
  })

  it('retains the list after restore failure and allows retry', async () => {
    listBackups.mockResolvedValue([entry])
    const restore = vi.fn().mockRejectedValueOnce(Error('Read failed')).mockResolvedValueOnce(undefined)
    const close = vi.fn()
    render(<NativeBackupsDialog onClose={close} onRestore={restore} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Practice 복구' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Read failed')
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Practice 복구' }))
    await waitFor(() => expect(restore).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('does not allow corrupt backup restoration', async () => {
    listBackups.mockResolvedValue([{ ...entry, error: 'invalid JSON' }])
    render(<NativeBackupsDialog onClose={vi.fn()} onRestore={vi.fn()} />)
    expect(await screen.findByRole('button', { name: 'Practice 복구' })).toBeDisabled()
    expect(screen.getByText('읽기 불가')).toBeInTheDocument()
  })

  it('ignores a delayed list response after the dialog is closed', async () => {
    let finish!: (entries: unknown[]) => void
    listBackups.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const restore = vi.fn()
    const { unmount } = render(<NativeBackupsDialog onClose={vi.fn()} onRestore={restore} />)
    await waitFor(() => expect(listBackups).toHaveBeenCalledOnce())
    unmount()
    finish([entry])
    await Promise.resolve()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(restore).not.toHaveBeenCalled()
  })

  it('keeps keyboard focus inside and restores the opener on close', async () => {
    listBackups.mockResolvedValue([])
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const close = vi.fn()
    const { unmount } = render(<NativeBackupsDialog onClose={close} onRestore={vi.fn()} />)
    await screen.findByText('백업 없음')
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(close).toHaveBeenCalledOnce()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
