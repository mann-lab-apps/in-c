import { createCreditImageFixture } from './credit-image-fixture'

type Creator = readonly [role: string | undefined, name: string]
export const creatorMetadataCases = {
  control: [['composer', '검증 작곡가']],
  arranger: [['arranger', '검증 편곡자']],
  lyricist: [['lyricist', '검증 작사가']],
  poet: [['poet', '검증 시인']],
  translator: [['translator', '검증 번역자']],
  untyped: [[undefined, '분류 없는 저자']],
  custom: [['Composer', '사용자 역할 저자']],
  second: [['composer', '검증 작곡가'], ['composer', '둘째 작곡가']],
  mixed: [['composer', '검증 작곡가'], ['arranger', '검증 편곡자']],
  reversed: [['lyricist', '검증 작사가'], ['composer', '검증 작곡가']],
  duplicate: [['composer', '검증 작곡가'], ['composer', '검증 작곡가']],
  empty: [['arranger', '  ']],
  blankFirst: [['composer', '  '], ['composer', '둘째 작곡가']],
  sameNameOtherRole: [['composer', '검증 작곡가'], ['arranger', '검증 작곡가']],
  escaped: [['arranger', '홍 & 김 <검증>']],
  rights: [['composer', '검증 작곡가'], ['arranger', '검증 편곡자']],
  many: Array.from({ length: 30 }, (_, i): Creator => ['arranger', `편곡자 ${i + 1}`]),
  manyRights: Array.from({ length: 30 }, (_, i): Creator => ['arranger', `편곡자 ${i + 1}`])
} satisfies Record<string, readonly Creator[]>

export type CreatorMetadataKind = keyof typeof creatorMetadataCases
const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export function createCreatorMetadataFixture(kind: CreatorMetadataKind = 'arranger', firstComposerOnly = false) {
  const creators: readonly Creator[] = creatorMetadataCases[kind]
  const selected = firstComposerOnly ? creators.filter(([role]) => role === 'composer').slice(0, 1) : creators
  const content = selected.map(([role, name]) => `<creator${role === undefined ? '' : ` type="${escapeXml(role)}"`}>${escapeXml(name)}</creator>`).join('')
  const rights = kind === 'rights' || kind === 'manyRights' ? '<rights>© Studio QA</rights>' : ''
  return createCreditImageFixture('control').replace('</work>', `</work><identification>${content}${rights}</identification>`)
}
