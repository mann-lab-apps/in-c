import { isXml10Character } from './xml-characters'
import { createMusicXmlParser } from './xml-parser'

// Keep references unexpanded and CDATA separate for this preflight only.
// The ordinary musical parsers retain their existing entity/limit hooks.
const rawParser = createMusicXmlParser({
  ignoreAttributes: false, processEntities: false, parseTagValue: false,
  trimValues: false, preserveOrder: true, cdataPropName: '#cdata'
})

function invalidCharacter(code: number, location: string): never {
  const label = Number.isFinite(code)
    ? `U+${code.toString(16).toUpperCase().padStart(4, '0')}` : '유효 범위 밖'
  throw new Error(`MusicXML의 XML 1.0 문자 범위에 맞지 않는 값(${label})이 있습니다: ${location}`)
}

function checkReferences(value: unknown): void {
  if (typeof value !== 'string') return
  // Applied only to raw parsed text/attributes, never comments or CDATA.
  for (const match of value.matchAll(/&#(?:x([0-9a-fA-F]+)|([0-9]+));/g)) {
    const code = match[1] !== undefined ? Number.parseInt(match[1], 16) : Number(match[2])
    if (!isXml10Character(code)) invalidCharacter(code, `숫자 문자 참조, 텍스트 위치 ${match.index! + 1}`)
  }
}

/** XML 1.0 source admission only; existing Native strings are never rewritten. */
export function assertMusicXmlInputCharacters(xml: string): void {
  let offset = 0
  for (const character of xml) {
    const code = character.codePointAt(0)!
    if (!isXml10Character(code)) invalidCharacter(code, `원문 UTF-16 위치 ${offset + 1}`)
    offset += character.length
  }
  if (!xml.includes('&#')) return
  const pending = rawParser.parse(xml) as unknown[]
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node || typeof node !== 'object') continue
    for (const [name, value] of Object.entries(node)) {
      if (name === '#cdata' || name.startsWith('?')) continue
      if (name === '#text') checkReferences(value)
      else if (name === ':@' && value && typeof value === 'object') {
        for (const attribute of Object.values(value)) checkReferences(attribute)
      } else if (Array.isArray(value)) {
        for (const child of value) pending.push(child)
      }
    }
  }
}
