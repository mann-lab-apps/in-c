import { useEffect, useMemo, useState } from 'react'
import type { Score } from '../../../score-core'
import { createPlaybackTimeline, type PlaybackTimeline } from './timeline'
import { expressPianoScore } from './piano-expression'

const cache = new Map<string, PlaybackTimeline>()

export function usePianoExpression(score: Score, natural: boolean) {
  const basic = useMemo(() => createPlaybackTimeline(score), [score])
  const notation = useMemo(() => expressPianoScore(score, basic, false), [score, basic])
  const key = useMemo(() => natural ? JSON.stringify([score, basic]) : '', [score, basic, natural])
  const [result, setResult] = useState<{ key: string; timeline: PlaybackTimeline }>()
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
    if (!natural) return
    const found = cache.get(key)
    if (found) { setResult({ key, timeline: found }); return }
    let worker: Worker | undefined
    let cancelled = false
    const timer = setTimeout(() => {
      try {
      worker = new Worker(new URL('./piano-expression.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }) => {
        if (cancelled) return
        if (data.error) setError(`${data.error} 악보대로 재생합니다.`)
        else {
          cache.set(key, data.timeline)
          if (cache.size > 8) cache.delete(cache.keys().next().value!)
          setResult({ key, timeline: data.timeline })
        }
        worker?.terminate()
      }
      worker.onerror = () => {
        if (!cancelled) setError('연주 표현을 준비하지 못했습니다. 악보대로 재생합니다.')
        worker?.terminate()
      }
      worker.postMessage({ score, timeline: basic, natural })
      } catch {
        if (!cancelled) setError('연주 표현을 준비하지 못했습니다. 악보대로 재생합니다.')
        worker?.terminate()
      }
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (worker) { worker.onmessage = null; worker.onerror = null; worker.terminate() }
    }
  }, [score, basic, natural, key])
  return { timeline: natural && result?.key === key ? result.timeline : notation,
    preparing: natural && result?.key !== key && !error, error }
}
