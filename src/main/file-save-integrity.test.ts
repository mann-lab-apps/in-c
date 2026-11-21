import { afterEach, expect, it, vi } from 'vitest'
import * as io from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { MusicXmlFileSession } from './musicxml-files'
import { NativeProjectFileSession, readNativeProjectFile } from './project-files'
import { saveBinaryExport } from './binary-export-files'
import { decodeMusicXmlFile, encodeMusicXmlFile } from '../musicxml/container'
import { parseMusicXml } from '../musicxml/parse'
import { createNativeProject, encodeNativeProject } from '../project/schema'

const uuid = vi.hoisted(() => ({ enabled: false, value: '00000000-0000-4000-8000-000000000001' as const }))
vi.mock('node:crypto', async importOriginal => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return { ...actual, randomUUID: vi.fn(() => uuid.enabled ? uuid.value : actual.randomUUID()) }
})
const directories: string[] = []
afterEach(async () => {
  uuid.enabled = false
  for (const directory of directories.splice(0)) await io.rm(directory, { recursive: true, force: true })
})

const scenarios = [
  { format: 'native', operation: 'save' },
  { format: 'musicxml', operation: 'save' }, { format: 'mxl', operation: 'save' },
  { format: 'musicxml', operation: 'exportCopy' }, { format: 'mxl', operation: 'exportCopy' }
] as const

async function setup(scenario: typeof scenarios[number]) {
  const directory = await io.mkdtemp(join(tmpdir(), 'studio-save-integrity-'))
  directories.push(directory)
  const native = scenario.format === 'native'
  const target = join(directory, native ? 'score.chromatics' : `score.${scenario.format}`)
  const backup = join(directory, 'previous-copy'), neighbor = join(directory, 'neighbor')
  const backups: Buffer[] = []
  const backUp = async (path: string) => { const bytes = await io.readFile(path); backups.push(bytes); await io.writeFile(backup, bytes) }
  await io.writeFile(neighbor, 'keep neighbor')
  if (native) {
    const project = createNativeProject(parseMusicXml(await io.readFile('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8')))
    await io.writeFile(target, encodeNativeProject(project))
    const original = await io.readFile(target)
    const session = new NativeProjectFileSession(backUp), revised = await session.open(target)
    revised.score.title = 'Revised'
    return { directory, target, backup, neighbor, original, backups, temporaryPrefix: '.chromatics-',
      save: () => session.save(target, revised),
      read: async () => (await readNativeProjectFile(target)).score.title,
      expected: 'Revised', source: undefined }
  }
  const first = '<score-partwise><work><work-title>Before</work-title></work></score-partwise>', next = first.replace('Before', 'After')
  await io.writeFile(target, encodeMusicXmlFile(first, target))
  const original = await io.readFile(target), session = new MusicXmlFileSession(backUp)
  const source = scenario.operation === 'exportCopy' ? join(directory, `source.${scenario.format}`) : undefined
  if (source) { await io.writeFile(source, original); await session.open(source) }
  else await session.open(target)
  return { directory, target, backup, neighbor, original, backups, temporaryPrefix: '.studio-musicxml-',
    save: () => session[scenario.operation](target, next),
    read: async () => decodeMusicXmlFile(await io.readFile(target), target), expected: next, source }
}

it.each(scenarios)('keeps an unowned temporary-name collision during $format $operation and retries safely', async scenario => {
  const env = await setup(scenario), collision = join(env.directory, `${env.temporaryPrefix}${uuid.value}.tmp`)
  const unrelated = Buffer.from('another complete file must not be removed')
  await io.writeFile(collision, unrelated)
  uuid.enabled = true
  await expect(env.save()).rejects.toMatchObject({ code: 'EEXIST' })
  uuid.enabled = false
  expect(await io.readFile(collision)).toEqual(unrelated)
  expect(await io.readFile(env.target)).toEqual(env.original)
  expect(await io.readFile(env.neighbor, 'utf8')).toBe('keep neighbor')
  for (const bytes of env.backups) expect(bytes).toEqual(env.original)
  if (env.source) expect(await io.readFile(env.source)).toEqual(env.original)
  await env.save()
  expect(await env.read()).toBe(env.expected)
  expect(await io.readFile(collision)).toEqual(unrelated)
  expect((await io.readdir(env.directory)).filter(name => name.endsWith('.tmp'))).toEqual([`${env.temporaryPrefix}${uuid.value}.tmp`])
  expect(await io.readFile(env.backup)).toEqual(env.original)
})

it.skipIf(process.platform === 'win32').each(scenarios)(
  'preserves existing 0660 bits under private-worker umask 027 during $format $operation', async scenario => {
    const previous = process.umask(0o027)
    try {
      const env = await setup(scenario)
      await io.chmod(env.target, 0o660)
      await env.save()
      expect((await io.stat(env.target)).mode & 0o777).toBe(0o660)
      expect(await env.read()).toBe(env.expected)
      expect(await io.readFile(env.backup)).toEqual(env.original)
      expect(await io.readFile(env.neighbor, 'utf8')).toBe('keep neighbor')
      if (env.source) expect(await io.readFile(env.source)).toEqual(env.original)
    } finally { process.umask(previous) }
  }
)

it('keeps an unowned Binary temporary file as the existing collision control', async () => {
  const directory = await io.mkdtemp(join(tmpdir(), 'studio-binary-collision-control-'))
  directories.push(directory)
  const target = join(directory, 'score.pdf'), collision = join(directory, `.studio-export-${uuid.value}.tmp`)
  await io.writeFile(target, 'original complete output'); await io.writeFile(collision, 'unrelated complete file')
  uuid.enabled = true
  await expect(saveBinaryExport(target, Buffer.from('retry complete output'))).rejects.toMatchObject({ code: 'EEXIST' })
  uuid.enabled = false
  expect(await io.readFile(collision, 'utf8')).toBe('unrelated complete file')
  expect(await io.readFile(target, 'utf8')).toBe('original complete output')
  await saveBinaryExport(target, Buffer.from('retry complete output'))
  expect(await io.readFile(target, 'utf8')).toBe('retry complete output')
  expect(await io.readFile(collision, 'utf8')).toBe('unrelated complete file')
})

it.skipIf(process.platform === 'win32')('preserves Binary 0660 bits as the existing permission control', async () => {
  const previous = process.umask(0o027)
  try {
    const directory = await io.mkdtemp(join(tmpdir(), 'studio-binary-mode-control-'))
    directories.push(directory)
    const target = join(directory, 'score.pdf')
    await io.writeFile(target, 'original complete output'); await io.chmod(target, 0o660)
    await saveBinaryExport(target, Buffer.from('retry complete output'))
    expect((await io.stat(target)).mode & 0o777).toBe(0o660)
    expect(await io.readFile(target, 'utf8')).toBe('retry complete output')
  } finally { process.umask(previous) }
})
