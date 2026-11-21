import { createMusicXmlParser } from './xml-parser'
import type { MusicXmlImportWarning } from './parse'
import type { Score } from '../score-core'

type Node = Record<string, unknown>
const predefined = new Set(['amp', 'lt', 'gt', 'quot', 'apos'])
const rawParser = createMusicXmlParser({
  ignoreAttributes: false, processEntities: false, parseTagValue: false,
  parseAttributeValue: false, trimValues: false, preserveOrder: true, cdataPropName: '#cdata'
})
// No declaration is passed to this decoder. It only distinguishes literal
// escaped/numeric ampersands from actual references in the original leaf.
const literalParser = createMusicXmlParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false })
function names(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const match of text.matchAll(/&([^#&;<>\s"']+);/gu)) {
    const name = match[1]!
    if (!predefined.has(name)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return counts
}
function scalar(value: unknown): string { return typeof value === 'string' || typeof value === 'number' ? String(value) : '' }
function text(nodes: Node[]): string {
  return nodes.map(node => '#text' in node ? scalar(node['#text'])
    : Array.isArray(node['#cdata']) ? text(node['#cdata'] as Node[]) : '').join('')
}
function elements(nodes: Node[]): { name: string; node: Node; children: Node[]; index: number }[] {
  const counts = new Map<string, number>()
  return nodes.flatMap(node => Object.entries(node).flatMap(([name, children]) => {
    if (name.startsWith('#') || name.startsWith('?') || name === ':@' || !Array.isArray(children)) return []
    const index = (counts.get(name) ?? 0) + 1
    counts.set(name, index)
    return [{ name, node, children: children as Node[], index }]
  }))
}

/** Diagnose retained reference names; never expand declarations or rewrite text. */
export function collectUnresolvedXmlReferences(xml: string, ordered: unknown[], score: Score): MusicXmlImportWarning[] {
  // This slice covers the audited internal-declaration case, not all DTD/XML
  // admission rules or references in documents with no declaration.
  if (!xml.includes('<!DOCTYPE') || names(xml).size === 0) return []
  const warnings: MusicXmlImportWarning[] = []
  type Owner = { partNumber?: number; measureNumber?: number }
  const inspect = (source: Node[], actual: string, path: string, owner: Owner) => {
    const references = new Map<string, number>()
    for (const node of source) for (const [name, count] of names(scalar(node['#text']))) {
      references.set(name, (references.get(name) ?? 0) + count)
    }
    if (!references.size) return
    const neutral = source.map(node => '#text' in node
      ? scalar(literalParser.parse(`<t>${scalar(node['#text'])}</t>`).t)
      : Array.isArray(node['#cdata']) ? text(node['#cdata'] as Node[]) : '').join('')
    const neutralNames = names(neutral), actualNames = names(actual)
    for (const [name, referencesCount] of references) {
      const literalCount = Math.max(0, (neutralNames.get(name) ?? 0) - referencesCount)
      const count = Math.min(referencesCount, Math.max(0, (actualNames.get(name) ?? 0) - literalCount))
      if (count) warnings.push({ code: 'unsupported-notation', ...owner, path,
        message: `Unresolved XML text reference (name=${JSON.stringify(name)}, count=${count}). The reference name remains in the imported data; its declaration was not expanded by the current parser. Keep the original MusicXML and compare text and re-export.` })
    }
  }
  const visit = (source: Node[], decoded: Node[], path: string, owner: Owner) => {
    const targets = elements(decoded)
    for (const element of elements(source)) {
      const target = targets.find(node => node.name === element.name && node.index === element.index)
      if (!target) continue
      const nextPath = path ? `${path}.${element.name}[${element.index}]` : element.name
      const nextOwner = element.name === 'part' ? { partNumber: element.index }
        : element.name === 'measure' ? { ...owner,
          measureNumber: score.parts[(owner.partNumber ?? 1) - 1]?.staves[0]?.measures[element.index - 1]?.number
        } : owner
      inspect(element.children, text(target.children), nextPath, nextOwner)
      const attributes = element.node[':@'] as Node | undefined
      const targetAttributes = target.node[':@'] as Node | undefined
      for (const [name, value] of Object.entries(attributes ?? {})) {
        inspect([{ '#text': value }], scalar(targetAttributes?.[name]), `${nextPath}.@${name.replace(/^@_/, '')}`, nextOwner)
      }
      visit(element.children, target.children, nextPath, nextOwner)
    }
  }
  visit(rawParser.parse(xml) as Node[], ordered as Node[], '', {})
  return warnings
}
