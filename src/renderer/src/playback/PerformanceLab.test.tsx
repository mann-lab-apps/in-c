// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSingleVoiceMvpScore } from '../../../testing/single-voice-mvp-fixture'
import { PerformanceLab } from './PerformanceLab'
import { createScoreRequest } from './expression-profile'
import { createVoicingRequest } from './voicing-profile'

afterEach(cleanup)

describe('performance lab import and mode changes', () => {
  it('clears a loaded profile after a score edit even when the exported note timeline is unchanged', async () => {
    const score = createSingleVoiceMvpScore(), request = createScoreRequest(score)
    const profile = { version: 1, bpm: request.bpm, scoreKey: request.scoreKey,
      modelId: 'fixture', trainingKind: 'synthetic', notes: request.notes.map(n => ({
        noteId: n.noteId, timingOffsetSeconds: 0, velocity: 80 })) }
    const onChange = vi.fn(), onStop = vi.fn()
    const { rerender } = render(<PerformanceLab score={score} theme="light" onChange={onChange} onStop={onStop} />)
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [
      { size: 100, text: async () => JSON.stringify(profile) }
    ] } })
    await waitFor(() => expect(screen.getByRole('radio', { name: '모델' })).not.toBeDisabled())
    const changed = { ...score, title: 'Edited title' }
    expect(createScoreRequest(changed).scoreKey).toBe(request.scoreKey)
    rerender(<PerformanceLab score={changed} theme="light" onChange={onChange} onStop={onStop} />)
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(undefined))
    expect(screen.getByRole('radio', { name: '모델' })).toBeDisabled()
  })
  it('loads relative voicing, explains its timing policy and invalidates after a meter edit', async () => {
    const score = createSingleVoiceMvpScore(), request = createVoicingRequest(score)
    const profile = { version: 2, policy: 'relative-voicing-only-v1', bpm: request.bpm,
      scoreKey: request.scoreKey, modelId: 'a'.repeat(64), trainingKind: 'audio-transcribed',
      provenance: { checkpointMetadataSha256: 'b'.repeat(64), labelType: 'pseudo-label',
        sources: [{ sourceUrl: 'https://example.org/fixture', license: 'CC0', attribution: 'Fixture', kind: 'audio-transcribed' }],
        transcriptionModels: [{ package: 'fixture' }] },
      notes: request.notes.map(n => ({ noteId: n.noteId, velocityGain: 1 })) }
    const onChange = vi.fn(), onStop = vi.fn()
    const { rerender } = render(<PerformanceLab score={score} theme="light" onChange={onChange} onStop={onStop} />)
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [
      { size: 100, text: async () => JSON.stringify(profile) }
    ] } })
    await waitFor(() => expect(screen.getByText('음별 강약만 적용 · 기존 타이밍 유지')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('radio', { name: '모델' }))
    expect(onChange).toHaveBeenLastCalledWith(profile)
    const changed = structuredClone(score)
    for (const m of changed.parts[0].staves[0].measures) m.timeSignature = { beats: 3, beatType: 4 }
    rerender(<PerformanceLab score={changed} theme="light" onChange={onChange} onStop={onStop} />)
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(undefined))
    expect(screen.getByRole('radio', { name: '모델' })).toBeDisabled()
  })
  it('loads a profile, marks its provenance, applies on selection and invalidates after an edit', async () => {
    const score = createSingleVoiceMvpScore()
    const request = createScoreRequest(score)
    const profile = { version: 1, bpm: request.bpm, scoreKey: request.scoreKey,
      modelId: 'trained-fixture', trainingKind: 'audio-transcribed',
      notes: request.notes.map(note => ({ noteId: note.noteId, timingOffsetSeconds: 0.03, velocity: 80 })) }
    const onChange = vi.fn(), onStop = vi.fn()
    const { rerender } = render(<PerformanceLab score={score} theme="light" onChange={onChange} onStop={onStop} />)
    const file = { size: 100, text: async () => JSON.stringify(profile) }
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByText('학습 출처: 실제 녹음 · 전사 추정값')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('radio', { name: '모델' }))
    expect(onChange).toHaveBeenLastCalledWith(profile)
    expect(onStop).toHaveBeenCalled()
    rerender(<PerformanceLab score={{ ...score, tempo: { bpm: 90 } }} theme="light" onChange={onChange} onStop={onStop} />)
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(undefined))
    expect(screen.getByRole('radio', { name: '모델' })).toBeDisabled()
  })

  it('keeps the newer import when an older file read finishes later', async () => {
    const score = createSingleVoiceMvpScore(), request = createScoreRequest(score)
    const profile = (kind: string) => JSON.stringify({ version: 1, bpm: request.bpm,
      scoreKey: request.scoreKey, modelId: 'fixture', trainingKind: kind,
      notes: request.notes.map(note => ({ noteId: note.noteId, timingOffsetSeconds: 0.03, velocity: 80 })) })
    let finishOld!: (text: string) => void
    const oldFile = { size: 100, text: () => new Promise<string>(resolve => { finishOld = resolve }) }
    const newFile = { size: 100, text: async () => profile('human-performance') }
    render(<PerformanceLab score={score} theme="light" onChange={vi.fn()} onStop={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [oldFile] } })
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [newFile] } })
    await waitFor(() => expect(screen.getByText('학습 출처: 실제 연주 MIDI')).toBeInTheDocument())
    await act(async () => { finishOld(profile('synthetic')) })
    expect(screen.getByText('학습 출처: 실제 연주 MIDI')).toBeInTheDocument()
  })

  it('discards a pending file read after the score changes', async () => {
    const score = createSingleVoiceMvpScore(), request = createScoreRequest(score)
    const profile = { version: 1, bpm: request.bpm, scoreKey: request.scoreKey,
      modelId: 'real-model', trainingKind: 'audio-transcribed',
      notes: request.notes.map(note => ({ noteId: note.noteId, timingOffsetSeconds: 0, velocity: 80 })) }
    let finish!: (text: string) => void
    const file = { size: 100, text: () => new Promise<string>(resolve => { finish = resolve }) }
    const onChange = vi.fn(), onStop = vi.fn()
    const { rerender } = render(<PerformanceLab score={score} theme="light" onChange={onChange} onStop={onStop} />)
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [file] } })
    rerender(<PerformanceLab score={{ ...score, tempo: { bpm: 90 } }} theme="light" onChange={onChange} onStop={onStop} />)
    await act(async () => { finish(JSON.stringify(profile)) })
    expect(screen.getByText('예측 미등록')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '모델' })).toBeDisabled()
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })

  it('reports a newer failed import and ignores an older successful read', async () => {
    const score = createSingleVoiceMvpScore(), request = createScoreRequest(score)
    const profile = { version: 1, bpm: request.bpm, scoreKey: request.scoreKey,
      modelId: 'real-model', trainingKind: 'audio-transcribed',
      notes: request.notes.map(note => ({ noteId: note.noteId, timingOffsetSeconds: 0, velocity: 80 })) }
    let finish!: (text: string) => void
    const onChange = vi.fn()
    render(<PerformanceLab score={score} theme="light" onChange={onChange} onStop={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [
      { size: 100, text: () => new Promise<string>(resolve => { finish = resolve }) }
    ] } })
    fireEvent.change(screen.getByLabelText('연주 예측 파일'), { target: { files: [
      { size: 10, text: async () => '{broken' }
    ] } })
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    await act(async () => { finish(JSON.stringify(profile)) })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '모델' })).toBeDisabled()
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })
})
