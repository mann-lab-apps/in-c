import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(
  fileURLToPath(new URL('./styles.css', import.meta.url)),
  'utf8'
)

function declarationsFor(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))

  expect(match, `Missing CSS rule for ${selector}`).not.toBeNull()

  return match?.[1] ?? ''
}

describe('toolbar responsive CSS contract', () => {
  it('ui.toolbar-responsive-overflow keeps dense toolbar controls reachable', () => {
    expect(declarationsFor('.editor-toolbar-stack')).toContain('overflow-x: auto')
    expect(declarationsFor('.selection-toolbar')).toContain('overflow-x: auto')
    expect(declarationsFor('.toolbar')).toContain('overflow-x: auto')

    expect(declarationsFor('.toolbar-tabs')).toContain('flex-wrap: wrap')
    expect(declarationsFor('.selection-toolbar')).toContain('flex-wrap: wrap')
    expect(declarationsFor('.toolbar')).toContain('flex-wrap: wrap')
    expect(declarationsFor('.duration-strip')).toContain('flex-wrap: wrap')
    expect(declarationsFor('.inspector-properties')).toContain('flex-wrap: wrap')
    expect(declarationsFor('.inspector-properties__grid')).toContain(
      'flex-wrap: wrap'
    )

    expect(declarationsFor('.inspector-properties__grid')).not.toContain(
      'flex-wrap: nowrap'
    )
  })
})
