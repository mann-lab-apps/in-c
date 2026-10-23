// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const styles = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'styles.css'), 'utf8')

const styleElement = document.createElement('style')
styleElement.textContent = styles
document.head.append(styleElement)
afterAll(() => styleElement.remove())

function declarationsFor(selector: string): string {
  const rules = Array.from(styleElement.sheet?.cssRules ?? [])
    .filter((rule): rule is CSSStyleRule => rule.type === CSSRule.STYLE_RULE)
    .filter((rule) => rule.selectorText.split(',').some((item) => item.trim() === selector))
  expect(rules.length, `Missing CSS rule for ${selector}`).toBeGreaterThan(0)
  return rules.map((rule) => rule.style.cssText).join('\n')
}

describe('notation span CSS contract', () => {
  it('fills tapered slurs and recolors their fill without adding an outline stroke', () => {
    expect(declarationsFor('.notation-slur')).toContain('fill: rgb(17, 24, 39)')
    expect(declarationsFor('.notation-slur')).toContain('stroke: none')
    for (const state of ['.is-selected', ':focus-visible']) {
      const slur = declarationsFor(`.notation-span-target${state} .notation-slur`)
      expect(slur).toContain('fill: rgb(0, 122, 132)')
      expect(slur).not.toContain('stroke:')
      expect(declarationsFor(`.notation-span-target${state} .notation-hairpin`)).toContain('stroke: rgb(0, 122, 132)')
    }
  })
})

describe('toolbar responsive CSS contract', () => {
  it('matches complete selectors instead of a descendant selector suffix', () => {
    expect(declarationsFor('.duration-strip')).toContain('flex-wrap: wrap')
    expect(declarationsFor('.duration-strip')).not.toContain('gap: 3px')
    expect(declarationsFor('.note-entry-toolbar .duration-strip')).toContain('gap: 3px')
  })

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
