import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../../../musicxml'
import fixture from '../../../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'
import { projectGlobalAnnotationsForRendering } from './global-annotation-projection'

describe('global annotation render projection', () => {
  it('keeps global and equal local objects distinct without mutating source or moving local anchors', () => {
    const score = parseMusicXml(fixture)
    const top = score.parts[0].staves[0].measures[0].id
    const lower = score.parts[1].staves[1].measures[0].id
    score.rehearsalMarks = [
      { id: 'global', measureId: 'measure-1', text: 'A' },
      { id: 'local-top', measureId: top, text: 'A' },
      { id: 'local-lower', measureId: lower, text: 'A' }
    ]
    const before = structuredClone(score)
    const projected = projectGlobalAnnotationsForRendering(score)
    expect(projected.rehearsalMarks?.map(mark => [mark.id, mark.measureId])).toEqual([
      ['global', top], ['local-top', top], ['local-lower', lower]
    ])
    expect(projected.parts).toBe(score.parts)
    expect(score).toEqual(before)
    expect(projectGlobalAnnotationsForRendering(projected)).toEqual(projected)
  })
})
