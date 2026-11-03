import { useEffect, useMemo, useRef, useState } from 'react'
import { IconButton, SegmentedControl, Text, Tooltip } from '@ddirori/ui'
import { Download, Upload } from 'lucide-react'
import type { Score } from '../../../score-core'
import { createScoreRequest, parseExpressionProfile, type ScoreRequest } from './expression-profile'
import { createVoicingRequest, parseVoicingProfile, type AnyExpressionProfile,
  type VoicingRequest } from './voicing-profile'
import './performance-lab.css'

export function PerformanceLab({ score, theme, onChange, onStop }: {
  score: Score
  theme: 'light' | 'dark'
  onChange: (profile: AnyExpressionProfile | undefined) => void
  onStop: () => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const loadGeneration = useRef(0)
  const [profile, setProfile] = useState<AnyExpressionProfile>()
  const [mode, setMode] = useState<'basic' | 'model'>('basic')
  const [error, setError] = useState('')
  const prepared = useMemo(() => {
    try { return { request: createScoreRequest(score), error: '' } }
    catch (cause) { return { request: undefined, error: String((cause as Error).message) } }
  }, [score])
  const voicing = useMemo(() => {
    try { return { request: createVoicingRequest(score), error: '' } }
    catch (cause) { return { request: undefined, error: String((cause as Error).message) } }
  }, [score])
  const key = JSON.stringify([prepared.request?.scoreKey, voicing.request?.scoreKey])
  const currentKey = useRef(key)
  currentKey.current = key
  const currentScore = useRef(score)
  currentScore.current = score
  const loadedForScore = useRef<Score | undefined>(undefined)
  const expectedKey = profile?.version === 2 ? voicing.request?.scoreKey : prepared.request?.scoreKey
  const activeProfile = loadedForScore.current === score && profile?.scoreKey === expectedKey
    ? profile : undefined

  useEffect(() => {
    loadGeneration.current += 1
    loadedForScore.current = undefined
    setProfile(undefined)
    setMode('basic')
    setError('')
    onChange(undefined)
    return () => { loadGeneration.current += 1 }
  }, [score, key, onChange])

  function exportRequest(request: ScoreRequest | VoicingRequest | undefined, name: string) {
    if (!request) return
    const blob = new Blob([JSON.stringify(request, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function loadFile(file: File) {
    const importKey = currentKey.current
    const importScore = score
    const generation = ++loadGeneration.current
    onStop()
    onChange(undefined)
    setMode('basic')
    setProfile(undefined)
    setError('')
    try {
      if (file.size > 5_000_000) throw new Error('예측 파일은 5MB 이하여야 합니다.')
      const value = JSON.parse(await file.text())
      let parsed: AnyExpressionProfile
      if (value?.version === 2) {
        if (!voicing.request) throw new Error(voicing.error)
        parsed = parseVoicingProfile(value, voicing.request)
      } else {
        if (!prepared.request) throw new Error(prepared.error)
        parsed = parseExpressionProfile(value, prepared.request)
      }
      if (generation !== loadGeneration.current || importKey !== currentKey.current ||
          importScore !== currentScore.current) return
      loadedForScore.current = importScore
      setProfile(parsed)
    } catch (cause) {
      if (generation === loadGeneration.current && importKey === currentKey.current &&
          importScore === currentScore.current) {
        setError(cause instanceof Error ? cause.message : '예측 파일을 읽지 못했습니다.')
      }
    }
  }

  return <section className="performance-lab ddirori" data-theme={theme} data-density="compact"
    aria-label="연주 모델 실험" onKeyDown={event => event.stopPropagation()}>
    <Text as="strong" variant="label">연주 모델</Text>
    <SegmentedControl label="연주 방식" value={activeProfile ? mode : 'basic'} options={[
      { value: 'basic', label: '기본' },
      { value: 'model', label: '모델', disabled: !activeProfile }
    ]} onChange={value => {
      onStop()
      setMode(value)
      onChange(value === 'model' ? activeProfile : undefined)
    }} />
    <Tooltip text="악보 입력 내보내기"><IconButton label="악보 입력 내보내기"
      disabled={!prepared.request} onClick={() => exportRequest(prepared.request, 'score-request.json')}><Download size={18} /></IconButton></Tooltip>
    <Tooltip text={voicing.error || '기보 타이밍과 강약을 유지하는 음별 강약 실험 입력'}><IconButton label="음별 강약 입력 내보내기"
      disabled={!voicing.request} onClick={() => exportRequest(voicing.request, 'voicing-request.json')}><Download size={18} /></IconButton></Tooltip>
    <Tooltip text="연주 예측 불러오기"><IconButton label="연주 예측 불러오기"
      disabled={!prepared.request} onClick={() => fileInput.current?.click()}><Upload size={18} /></IconButton></Tooltip>
    <input ref={fileInput} type="file" accept=".json,application/json" hidden
      aria-label="연주 예측 파일" onChange={event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void loadFile(file)
      }} />
    <Text as="output" variant="caption" aria-live="polite">{activeProfile
      ? activeProfile.trainingKind === 'synthetic' ? '학습 출처: 합성 데이터'
        : activeProfile.trainingKind === 'audio-transcribed' ? '학습 출처: 실제 녹음 · 전사 추정값'
        : activeProfile.trainingKind === 'mixed' ? '학습 출처: 혼합 데이터' : '학습 출처: 실제 연주 MIDI'
      : '예측 미등록'}</Text>
    {activeProfile?.version === 2 && <Text variant="caption">음별 강약만 적용 · 기존 타이밍 유지</Text>}
    {(error || prepared.error) && <span className="performance-lab__error" role="alert">{error || prepared.error}</span>}
  </section>
}
