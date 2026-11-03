// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks } from './App.test-harness'
import { NativeBackupsDialog } from './NativeBackupsDialog'

describe('backup restore keyboard ownership', () => {
  registerAppTestHooks()
  function deferred() {
    let resolve!: () => void, reject!: (cause: Error) => void
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
    return { promise, resolve, reject }
  }
  async function setup() {
    vi.mocked(window.inC.project.listBackups).mockResolvedValue([{ id: 'owned', fileName: 'owned.chromatics', title: '연습용 백업', updatedAt: '' }])
    const pending = deferred(), onRestore = vi.fn(() => pending.promise), onClose = vi.fn()
    const host = render(<NativeBackupsDialog theme="light" onRestore={onRestore} onClose={onClose} />)
    const restore = await screen.findByRole('button', { name: '연습용 백업 복구' })
    const close = screen.getByRole('button', { name: '닫기' })
    restore.focus(); fireEvent.click(restore)
    expect(restore).toBeDisabled(); expect(onRestore).toHaveBeenCalledExactlyOnceWith('owned')
    return { pending, onRestore, onClose, host, restore, close }
  }
  it.each(['failure', 'cancel'] as const)('keeps cancellation reachable while pending and returns a still-owned retry after %s', async outcome => {
    const { pending, onRestore, onClose, restore, close } = await setup()
    expect(close).toHaveFocus()
    await act(async () => { outcome === 'failure' ? pending.reject(new Error('Owned read failed')) : pending.resolve() })
    await waitFor(() => expect(restore).toBeEnabled())
    expect(restore).toHaveFocus(); expect(onRestore).toHaveBeenCalledTimes(1); expect(onClose).not.toHaveBeenCalled()
    if (outcome === 'failure') expect(screen.getByText('백업을 확인하지 못했습니다. 창을 다시 열거나 다른 백업을 선택해 주세요.')).toBeVisible()
  })
  it.each(['pointer', 'keyboard'] as const)('does not take focus back after a newer %s interaction with the pending dialog', async kind => {
    const { pending, restore, close } = await setup()
    close.focus()
    if (kind === 'pointer') fireEvent.pointerDown(close)
    else fireEvent.keyDown(close, { key: 'Tab' })
    await act(async () => pending.reject(new Error('Owned read failed')))
    await waitFor(() => expect(restore).toBeEnabled())
    expect(close).toHaveFocus(); expect(restore).not.toHaveFocus()
  })
  it('does not restore an old action after the dialog unmounts', async () => {
    const { pending, host, restore } = await setup()
    host.unmount()
    const other = document.createElement('button'); document.body.append(other); other.focus()
    try {
      await act(async () => pending.reject(new Error('Late closed read')))
      expect(other).toHaveFocus(); expect(restore.isConnected).toBe(false)
    } finally { other.remove() }
  })
})
