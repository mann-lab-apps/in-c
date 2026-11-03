import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createInteriorHairpinFixture } from '../testing/interior-hairpin-fixture'
import { encodeNativeProject, decodeNativeProject } from './schema'
import { serializeMusicXml, parseMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

// Two-measure endpoint annotation case is deliberately outside the previous
// three-measure interior-lane coverage. Real dynamic descenders need native ink QA.
it.each([false, true])('preserves short-span endpoint annotations and manual0 (cross=%s)', cross => {
  for (const manual of [false, true]) {
    const project = createInteriorHairpinFixture(cross, manual), { score } = project
    score.title = 'Generated short span endpoint ink'
    score.parts[0].staves[0].measures.pop()
    score.hairpins![0].endEventId = 'interior-note-1'
    score.dynamics![0].value = 'fff'
    const before = structuredClone(project), native = encodeNativeProject(project), xml = serializeMusicXml(score), midi = serializeMidi(score)
    expect(decodeNativeProject(native)).toEqual(before)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(midi)
    expect(project).toEqual(before)
    const out = process.env.DDIRORI_SHORT_HAIRPIN_QA_DIR
    if (out) { const dir = join(out, `${cross ? 'cross' : 'single'}-${manual ? 'manual' : 'auto'}`); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir,'source.chromatics'),native); writeFileSync(join(dir,'expected.musicxml'),xml); writeFileSync(join(dir,'expected.mid'),midi) }
  }
})
