import { afterEach, expect, it } from 'vitest'
import * as io from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { strToU8, zipSync } from 'fflate'
import { MusicXmlFileSession } from './musicxml-files'
import { decodeMusicXmlFile, encodeMusicXmlFile } from '../musicxml/container'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await io.rm(directory, { recursive: true, force: true })
})
const first = '<score-partwise><work><work-title>Before</work-title></work></score-partwise>'
const edited = first.replace('Before', 'App edit'), external = first.replace('Before', 'External edit')
const conflict = 'MusicXML file changed on disk. Reopen it or save to another file.'

async function setup(ext: string) {
  const directory = await io.mkdtemp(join(tmpdir(), 'studio-xml-external-change-'))
  directories.push(directory)
  const file = join(directory, `score.${ext}`), backup = join(directory, 'previous-copy'), neighbor = join(directory, 'neighbor')
  const backups: Buffer[] = []
  const original = Buffer.from(encodeMusicXmlFile(first, file))
  await io.writeFile(file, original); await io.writeFile(neighbor, 'keep neighbor')
  const backUp = async (path: string) => {
    try { const bytes = await io.readFile(path); backups.push(bytes); await io.writeFile(backup, bytes) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  const session = new MusicXmlFileSession(backUp)
  return { ext, directory, file, backup, neighbor, backups, original, backUp, session,
    read: async () => decodeMusicXmlFile(await io.readFile(file), file),
    write: async (xml: string) => io.writeFile(file, encodeMusicXmlFile(xml, file)),
    checkNeighborAndTemp: async () => {
      expect(await io.readFile(neighbor, 'utf8')).toBe('keep neighbor')
      expect((await io.readdir(directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
    }
  }
}

it.each(['musicxml', 'mxl'])('refuses externally changed %s before backup and preserves safe copy/reopen recovery', async ext => {
  const e = await setup(ext)
  expect(await e.session.open(e.file)).toBe(first)
  await e.write(external)
  const externalBytes = await io.readFile(e.file), mode = (await io.stat(e.file)).mode & 0o777
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(e.session.save(e.file, edited)).rejects.toThrow(conflict)
    expect(await io.readFile(e.file)).toEqual(externalBytes)
    expect((await io.stat(e.file)).mode & 0o777).toBe(mode)
    expect(e.backups).toEqual([])
    await expect(io.stat(e.backup)).rejects.toMatchObject({ code: 'ENOENT' })
    await e.checkNeighborAndTemp()
  }
  const copy = join(e.directory, `recovery.${ext}`)
  await e.session.exportCopy(copy, edited)
  expect(decodeMusicXmlFile(await io.readFile(copy), copy)).toBe(edited)
  expect(await io.readFile(e.file)).toEqual(externalBytes)
  await expect(e.session.save(copy, first)).rejects.toThrow(/대화상자/)
  await expect(e.session.exportCopy(e.file, edited)).rejects.toThrow(/원본/)
  expect(await e.session.open(e.file)).toBe(external)
  await e.session.save(e.file, edited)
  expect(await e.read()).toBe(edited)
  expect(e.backups).toEqual([externalBytes]); expect(await io.readFile(e.backup)).toEqual(externalBytes)
})

it.each(['musicxml', 'mxl'])('refuses a removed opened %s and permits retry after exact original restoration', async ext => {
  const e = await setup(ext); await e.session.open(e.file); await io.rm(e.file)
  await expect(e.session.save(e.file, edited)).rejects.toThrow(conflict)
  await expect(io.stat(e.file)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(e.backups).toEqual([]); await e.checkNeighborAndTemp()
  await io.writeFile(e.file, e.original)
  await e.session.save(e.file, edited)
  expect(await e.read()).toBe(edited); expect(e.backups).toEqual([e.original])
})

it.each(['musicxml', 'mxl'])('records only a successful first %s save and rejects a later external edit', async ext => {
  const e = await setup(ext)
  // A dialog-authorized destination with no prior read retains explicit overwrite policy.
  e.session.authorizeSave(e.file); await e.session.save(e.file, edited)
  expect(await e.read()).toBe(edited); expect(e.backups).toEqual([e.original])
  await e.write(external); const externalBytes = await io.readFile(e.file)
  await expect(e.session.save(e.file, first)).rejects.toThrow(conflict)
  expect(await io.readFile(e.file)).toEqual(externalBytes)
  expect(e.backups).toEqual([e.original]); await e.checkNeighborAndTemp()
})

it.each(['musicxml', 'mxl'])('accepts an unchanged %s XML body even when the archive envelope is rewritten', async ext => {
  const e = await setup(ext); await e.session.open(e.file)
  const rewritten = ext === 'mxl' ? Buffer.from(zipSync({
    mimetype: strToU8('application/vnd.recordare.musicxml'),
    'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>'),
    'score.musicxml': strToU8(first), 'unrelated-envelope.txt': strToU8('different zip metadata, same XML')
  }, { level: 0 })) : e.original
  if (ext === 'mxl') expect(rewritten).not.toEqual(e.original)
  await io.writeFile(e.file, rewritten)
  await e.session.save(e.file, edited); await e.session.save(e.file, first)
  expect(await e.read()).toBe(first); expect(e.backups[0]).toEqual(rewritten)
  expect(decodeMusicXmlFile(e.backups[1], e.file)).toBe(edited)
  await e.checkNeighborAndTemp()
})

it.each(['musicxml', 'mxl'])('keeps the opened %s revision when backup fails, then retries normally', async ext => {
  const e = await setup(ext); let fail = true
  const session = new MusicXmlFileSession(async path => { if (fail) throw new Error('owned backup failure'); await e.backUp(path) })
  await session.open(e.file)
  await expect(session.save(e.file, edited)).rejects.toThrow('owned backup failure')
  expect(await io.readFile(e.file)).toEqual(e.original); expect(e.backups).toEqual([])
  fail = false; await session.save(e.file, edited)
  expect(await e.read()).toBe(edited); expect(e.backups).toEqual([e.original])
  await e.checkNeighborAndTemp()
})

it.each(['musicxml', 'mxl'])('serializes two requested %s revisions while the first backup waits', async ext => {
  const e = await setup(ext)
  let release!: () => void, started!: () => void, calls = 0
  const barrier = new Promise<void>(resolve => { release = resolve })
  const firstStarted = new Promise<void>(resolve => { started = resolve })
  const session = new MusicXmlFileSession(async path => {
    calls++
    if (calls === 1) { started(); await barrier }
    await e.backUp(path)
  })
  await session.open(e.file)
  const a = session.save(e.file, edited); await firstStarted
  const b = session.save(e.file, external)
  // Inspect at the next turn while only our own first backup is blocked.
  await new Promise(resolve => setImmediate(resolve))
  const callsBeforeRelease = calls
  release(); await Promise.all([a, b])
  expect(callsBeforeRelease).toBe(1)
  expect(await e.read()).toBe(external)
  expect(e.backups.map(bytes => decodeMusicXmlFile(bytes, e.file))).toEqual([first, edited])
  await e.checkNeighborAndTemp()
})

it.each(['musicxml', 'mxl'])('continues the same %s queue after an earlier backup failure', async ext => {
  const e = await setup(ext); let calls = 0
  const session = new MusicXmlFileSession(async path => { if (++calls === 1) throw new Error('first owned backup failure'); await e.backUp(path) })
  await session.open(e.file)
  const a = session.save(e.file, edited), b = session.save(e.file, external)
  const result = await Promise.allSettled([a, b])
  expect(result[0]).toMatchObject({ status: 'rejected', reason: { message: 'first owned backup failure' } })
  expect(result[1]).toEqual({ status: 'fulfilled', value: undefined })
  expect(await e.read()).toBe(external); expect(e.backups).toEqual([e.original])
  await e.checkNeighborAndTemp()
})
