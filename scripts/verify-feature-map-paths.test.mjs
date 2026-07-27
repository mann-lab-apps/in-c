import { describe, expect, it } from 'vitest'

import { verifyFeatureMapPaths } from './verify-feature-map-paths.mjs'

const featureMap = [
  {
    sections: [
      {
        items: [
          {
            name: '새 악보 만들기',
            docs: ['docs/product/feature-map.md'],
            acceptance: ['docs/product/acceptance/score-setup.feature']
          },
          {
            name: '연결 문서 준비 중',
            docs: [],
            acceptance: []
          }
        ]
      }
    ]
  }
]

describe('피쳐맵 관련 문서 경로 검증', () => {
  it('실제 파일 경로와 빈 배열을 허용한다', () => {
    expect(() => verifyFeatureMapPaths(featureMap)).not.toThrow()
  })

  it('잘못된 관련 문서 경로에 기능 이름과 경로를 표시한다', () => {
    const brokenFeatureMap = structuredClone(featureMap)
    brokenFeatureMap[0].sections[0].items[0].docs = [
      'docs/product/missing-document.md'
    ]

    expect(() => verifyFeatureMapPaths(brokenFeatureMap)).toThrow(
      '새 악보 만들기 docs 경로가 없습니다: docs/product/missing-document.md'
    )
  })

  it('잘못된 인수 시나리오 경로에 기능 이름과 경로를 표시한다', () => {
    const brokenFeatureMap = structuredClone(featureMap)
    brokenFeatureMap[0].sections[0].items[0].acceptance = [
      'docs/product/acceptance/missing.feature'
    ]

    expect(() => verifyFeatureMapPaths(brokenFeatureMap)).toThrow(
      '새 악보 만들기 acceptance 경로가 없습니다: docs/product/acceptance/missing.feature'
    )
  })
})
