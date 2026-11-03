import { expressPianoScore, PIANO_RULES_VERSION } from './piano-expression'

self.onmessage = event => {
  try {
    const { score, timeline, natural } = event.data
    self.postMessage({ timeline: expressPianoScore(score, timeline, natural), method: PIANO_RULES_VERSION })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '연주 표현을 준비하지 못했습니다.' })
  }
}
