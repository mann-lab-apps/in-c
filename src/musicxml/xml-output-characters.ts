import { isXml10Character } from './xml-characters'

/** Only values in the final ordered XML tree are checked. Native IDs and
 * fields omitted from a selected-part copy are deliberately outside this guard.
 */
export class MusicXmlTextOutputError extends Error {
  readonly technicalMessage: string

  constructor(readonly path: string, readonly offset: number, readonly codePoint: number) {
    const code = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
    super(`${describeLocation(path)}에 MusicXML로 표현할 수 없는 문자(${code})가 있습니다. 해당 글자를 수정한 뒤 다시 저장해 주세요. 원본 프로젝트는 유지됩니다.`)
    this.name = 'MusicXmlTextOutputError'
    this.technicalMessage = `XML 1.0 Char: ${path}; UTF-16 position ${offset + 1}; ${code}`
  }
}

function describeLocation(path: string): string {
  if (path.includes('/work-title[')) return '악보 제목'
  if (path.includes('/creator[')) return '작곡가'
  const part = /\/(?:part|score-part)\[(\d+)\]/.exec(path)?.[1]
  if (path.includes('/part-name[')) return `출력할 ${part}번째 파트 이름`
  if (path.includes('/part-abbreviation[')) return `출력할 ${part}번째 파트 약어`
  const measure = /\/measure\[(\d+)\]/.exec(path)?.[1]
  const owner = `${part ? `출력할 ${part}번째 파트의 ` : ''}${measure ? `${measure}번째 마디 ` : ''}`
  return `${owner}${path.includes('/lyric[') ? '가사' : path.includes('/rehearsal[') ? '연습표' : '글자'}`
}

function checkText(value: unknown, path: string): void {
  if (typeof value !== 'string') return
  let offset = 0
  for (const character of value) {
    const code = character.codePointAt(0)!
    // XML 1.0 production [2]. Discouraged-but-valid characters are allowed;
    // paired surrogates are one code point, isolated surrogates are forbidden.
    if (!isXml10Character(code)) {
      throw new MusicXmlTextOutputError(path, offset, code)
    }
    offset += character.length
  }
}

/** Walk XMLBuilder's ordered element/text/attribute tree after projections and
 * output-only identifier mapping, before UTF-8 encoding can replace a surrogate.
 */
export function assertMusicXmlOutputCharacters(nodes: readonly unknown[], parent = ''): void {
  const siblings = new Map<string, number>()
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const record = node as Record<string, unknown>
    for (const [name, children] of Object.entries(record)) {
      if (name === ':@') continue
      if (name === '#text') { checkText(children, parent); continue }
      const ordinal = (siblings.get(name) ?? 0) + 1
      siblings.set(name, ordinal)
      const path = `${parent}/${name}[${ordinal}]`
      const attributes = record[':@']
      if (attributes && typeof attributes === 'object') {
        for (const [attribute, value] of Object.entries(attributes)) {
          checkText(value, `${path}/@${attribute.replace(/^@_/, '')}`)
        }
      }
      if (Array.isArray(children)) assertMusicXmlOutputCharacters(children, path)
    }
  }
}
