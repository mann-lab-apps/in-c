import { createWorkMovementFixture } from './work-movement-fixture'
export const workOpusKinds = ['relative','https','attributes','alias','empty','fallback','mixed','blank-title','absent'] as const
export type WorkOpusKind = typeof workOpusKinds[number]
export function createWorkOpusFixture(kind: WorkOpusKind, projected = false) {
  const source = createWorkMovementFixture(kind === 'mixed' ? 'mixed' : kind === 'fallback' ? 'movementOnly' : kind === 'blank-title' ? 'blankWorkTitle' : 'control')
  if (kind === 'absent') return source
  const prefix = kind === 'alias' ? 'link' : 'xlink'
  const escape = (text:string) => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
  const href = kind === 'empty' ? '' : kind === 'https' ? 'https://example.invalid/collection.opus.xml' : kind === 'attributes' ? 'collection.opus.xml?part=1&name=연결' : 'collection.opus.xml'
  const extra = kind === 'attributes' ? ` ${prefix}:type="simple" ${prefix}:title="${escape('모음 & <검증>')}" ${prefix}:role="https://example.invalid/collection" ${prefix}:show="new" ${prefix}:actuate="onRequest"` : ''
  const node = `<opus ${prefix}:href="${escape(href)}"${extra}/>`
  let xml = source.replace('<score-partwise', `<score-partwise xmlns:${prefix}="http://www.w3.org/1999/xlink"`)
  if (!projected) xml = xml.includes('</work>') ? xml.replace('</work>',node+'</work>') : xml.replace('<movement-title>',`<work>${node}</work><movement-title>`)
  return xml
}
