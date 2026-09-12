import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from './index'
import { encodeMusicXmlFile } from './container'

it.skipIf(process.env.RUN_MUSESCORE_MXL_QA !== '1')('exchanges Chromatics MXL and written transposition through the installed MuseScore CLI', async () => {
  const binary = process.env.MUSESCORE_BIN ?? '/Applications/MuseScore 4.app/Contents/MacOS/mscore'
  const directory = await mkdtemp(join(tmpdir(), 'chromatics-mxl-reference-'))
  try {
    const score = parseMusicXml(await readFile(new URL('./fixtures/single-part-treble.musicxml', import.meta.url), 'utf8'))
    for (const measure of score.parts[0]!.staves[0]!.measures) {
      measure.transposition = { diatonic: -1, chromatic: -2 }
    }
    const input = join(directory, 'chromatics.mxl')
    const output = join(directory, 'musescore.musicxml')
    await writeFile(input, encodeMusicXmlFile(serializeMusicXml(score), input))
    const version = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 30_000 })
    expect(version.error).toBeUndefined()
    const result = spawnSync(binary, ['-F', '--musicxml-use-default-font', '-o', output, input], { encoding: 'utf8', timeout: 90_000 })
    expect(result.error, result.stderr).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
    const reopened = parseMusicXml(await readFile(output, 'utf8'))
    expect(reopened.parts).toHaveLength(score.parts.length)
    const before = score.parts[0]!.staves[0]!.measures
    const after = reopened.parts[0]!.staves[0]!.measures
    expect(after).toHaveLength(before.length)
    expect(after[0]!.transposition).toMatchObject({ chromatic: -2 })
    const notes = (measures: typeof before) => measures.flatMap((measure) => measure.voices.flatMap((voice) => voice.events.flatMap((event) =>
      event.type === 'note' ? [{ pitch: event.pitch, duration: event.duration }] : []
    )))
    expect(notes(after)).toEqual(notes(before))
    console.log(JSON.stringify({ reference: version.stdout.trim() || version.stderr.trim(), result: 'MXL import/XML export written-note and transposition round-trip passed', humanGuiQa: 'not-run' }))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 150_000)
