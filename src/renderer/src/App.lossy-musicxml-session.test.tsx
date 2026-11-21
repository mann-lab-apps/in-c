// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { MusicXmlFileSession } from '../../main/musicxml-files'
import { decodeMusicXmlFile, encodeMusicXmlFile } from '../../musicxml/container'
import { parseMusicXmlWithReport } from '../../musicxml'
import { createNoteheadTextFixture } from '../../testing/notehead-text-fixture'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['musicxml', 'mxl'])('retains lossy source bytes through real backup failure and retry: %s', async extension => {
  const directory = await mkdtemp(join(tmpdir(), 'studio-lossy-xml-'))
  const source = join(directory, 'educational.' + extension), backup = join(directory, 'previous.' + extension)
  const xml = createNoteheadTextFixture({ partCount: 2, targetPart: 2, targetMeasure: 2 })
  const original = encodeMusicXmlFile(xml, source)
  let failBackup = true
  const session = new MusicXmlFileSession(async selected => {
    if (failBackup) throw new Error('Owned XML backup unavailable')
    await copyFile(selected, backup)
  })
  try {
    await writeFile(source, original)
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.open).mockImplementationOnce(async () => ({ filePath: source, fileName: 'educational.' + extension, contents: await session.open(source) }))
    vi.mocked(window.inC.musicXml.save).mockImplementation(async request => {
      expect(request.filePath).toBe(source)
      await session.save(source, request.contents)
      return { filePath: source, fileName: 'educational.' + extension }
    })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await screen.findByText(/^2번째 파트 · 2마디 · 원본 음표 머리 안의 글자와 임시표/)
    const imported = structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    const title = screen.getByLabelText('악보 제목')
    fireEvent.change(title, { target: { value: 'Owned current revision' } }); fireEvent.keyDown(title, { key: 'Enter' })
    const edited = structuredClone(playbackMockState.lastScore!), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    const clears = vi.mocked(window.inC.autosave.clear).mock.calls.length
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('MusicXML 저장을 마무리하지 못했습니다.'))
    expect(await readFile(source)).toEqual(Buffer.from(original))
    expect(await readdir(directory)).toEqual(['educational.' + extension])
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    expect(window.inC.autosave.clear).toHaveBeenCalledTimes(clears)
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(imported)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
    failBackup = false
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('educational.' + extension + '을 MusicXML로 내보냈습니다.'))
    expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2)
    const saved = await readFile(source), preserved = await readFile(backup)
    expect(preserved).toEqual(Buffer.from(original))
    const savedXml = decodeMusicXmlFile(saved, source), backupXml = decodeMusicXmlFile(preserved, backup)
    expect(backupXml).toBe(xml); expect(savedXml).not.toContain('<notehead-text>')
    expect(parseMusicXmlWithReport(backupXml).report.warnings.filter(w => w.message.startsWith('Unrepresented notehead text '))).toHaveLength(1)
    expect(serializeMidi(parseMusicXmlWithReport(savedXml).score)).toEqual(serializeMidi(edited))
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
    expect((await readdir(directory)).some(name => name.endsWith('.tmp'))).toBe(false)
    const output = process.env.STUDIO_LOSSY_SESSION_QA_DIR
    if (output) {
      const target = join(output, extension); await mkdir(target, { recursive: true })
      await writeFile(join(target, 'source-before.' + extension), original, { flag: 'wx' })
      await writeFile(join(target, 'source-after.' + extension), saved, { flag: 'wx' })
      await writeFile(join(target, 'backup.' + extension), preserved, { flag: 'wx' })
      await writeFile(join(target, 'source-decoded.musicxml'), xml, { flag: 'wx' })
      await writeFile(join(target, 'saved-decoded.musicxml'), savedXml, { flag: 'wx' })
      await writeFile(join(target, 'backup-decoded.musicxml'), backupXml, { flag: 'wx' })
      const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
      await writeFile(join(target, 'result.json'), JSON.stringify({ extension, sourceSha: sha(original), backupSha: sha(preserved), savedSha: sha(saved), backupExact: true, backupFailureOriginalPreserved: true, midiPreserved: true, temporaryFilesRemaining: false, scope: 'Real MusicXmlFileSession and owned filesystem; injected backup callback and App bridge mock, not OS dialog or production userData access.' }, null, 2) + '\n', { flag: 'wx' })
    }
  } finally { await rm(directory, { recursive: true, force: true }) }
})
