import { createMidiProgramFixture } from './midi-program-fixture'

export const playTechniqueCases = ['note-mute', 'note-ipa', 'note-other', 'direct', 'direction', 'multiple', 'mixed', 'empty', 'control'] as const
export type PlayTechniqueCase = typeof playTechniqueCases[number]

// Source instrument techniques are distinct from local mixer mute/volume.
// Retain the same pitched notes and supported direction in the control XML.
export function createPlayTechniqueFixture(kind: PlayTechniqueCase) {
  const base = createMidiProgramFixture('definition-only')
  const title = `Playback technique import ${kind}`
  let xml = base.xml.replace(base.title, title)
  const play = (body: string, id = 'P1-I1') => `<play id="${id}">${body}</play>`
  const noteBody = kind === 'note-mute' ? '<mute>straight</mute>'
    : kind === 'note-ipa' ? '<ipa>ɑ ɹ</ipa>'
    : kind === 'note-other' ? '<other-play type="vibrato">천천히</other-play>'
    : kind === 'mixed' ? '<mute>on</mute><ipa>ɑ</ipa><semi-pitched>medium-low</semi-pitched><other-play type="vibrato">slow</other-play><mute>off</mute>' : ''
  if (noteBody || kind === 'empty') xml = xml.replace('</note>', `${play(noteBody)}</note>`)
  if (kind === 'direct' || kind === 'multiple') {
    const marking = `<sound>${play('<mute>off</mute>')}${kind === 'multiple' ? play('<other-play type="attack">soft</other-play>') : ''}</sound>`
    xml = xml.replace('<note>', `${marking}<note>`)
  }
  if (kind === 'direction') xml = xml.replace(/(<part id="P2">[\s\S]*?)(<note>)/, `$1<direction><direction-type><words>QA technique</words></direction-type><sound>${play('<semi-pitched>high</semi-pitched>', 'P2-I1')}</sound></direction>$2`)
  const baselineXml = xml.replace(/<play\b[^>]*>[\s\S]*?<\/play>/g, '')
  return { title, xml, baselineXml }
}
