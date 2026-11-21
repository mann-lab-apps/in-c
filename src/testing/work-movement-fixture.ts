import { createCreditImageFixture } from './credit-image-fixture'

type Metadata = { workTitle?: string; workNumber?: string; movementNumber?: string; movementTitle?: string }
export const workMovementCases = {
  workNumber: { workTitle:'작품 제목', workNumber:'Op. 3' },
  movementNumber: { workTitle:'작품 제목', movementNumber:'II' },
  differentTitle: { workTitle:'작품 제목', movementTitle:'느리게' },
  all: { workTitle:'작품 제목', workNumber:'Op. 3', movementNumber:'II', movementTitle:'느리게' },
  sameTitle: { workTitle:'작품 제목', movementTitle:'작품 제목' },
  movementOnly: { movementTitle:'느리게' },
  emptyNumbers: { workTitle:'작품 제목', workNumber:'', movementNumber:'' },
  blankWorkTitle: { workTitle:'', movementTitle:'별도 악장' },
  zeroNumber: { workTitle:'작품 제목', workNumber:'0', movementNumber:'0' },
  sameNumberText: { workTitle:'Op. 3', workNumber:'Op. 3' },
  escaped: { workTitle:'작품 제목', workNumber:'작품 & <3>', movementNumber:'"둘"', movementTitle:'홍 & 김 <검증>' },
  mixed: { workTitle:'작품 제목', workNumber:'Op. 3', movementNumber:'II', movementTitle:'느리게' },
  control: { workTitle:'작품 제목' }
} as const satisfies Record<string, Metadata>
export type WorkMovementKind = keyof typeof workMovementCases
const escape = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
export function createWorkMovementFixture(kind: WorkMovementKind, projected = false) {
  const entry: Metadata = workMovementCases[kind]
  const title = entry.workTitle ?? entry.movementTitle
  const node = (name: string, value: string | undefined) => value === undefined ? '' : `<${name}>${escape(value)}</${name}>`
  const work = node('work-number', projected ? undefined : entry.workNumber) + node('work-title', entry.workTitle)
  const movement = node('movement-number', projected ? undefined : entry.movementNumber) +
    node('movement-title', projected && entry.movementTitle !== title ? undefined : entry.movementTitle)
  let xml = createCreditImageFixture('control').replace(/<work>[\s\S]*?<\/work>/, (work ? `<work>${work}</work>` : '') + movement)
  if (kind === 'mixed' && !projected) xml = xml.replace('<part-list>', '<identification><creator type="arranger">편곡자</creator><rights>권리 고지</rights></identification><credit page="2"><credit-type>subtitle</credit-type><credit-words>부제</credit-words></credit><part-list>')
  return xml
}
