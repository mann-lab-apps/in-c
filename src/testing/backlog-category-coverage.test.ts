import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('rejects an unknown support-list category before any generated document can be written', () => {
  const file = resolve('scripts/verify-studio-parity-backlog.cjs'), source = readFileSync(file, 'utf8')
  const canonical = resolve('docs/product/studio-musescore-gap-backlog-20261104.json')
  const backlog = JSON.parse(readFileSync(canonical, 'utf8'))
  backlog.entries.find((entry: { id: string }) => entry.id === 'SMG-026-002').category = 'new-unmapped-category'
  const write = vi.fn(() => { throw Error('Unexpected filesystem mutation') }), nativeRequire = createRequire(file)
  const readOnlyFs = { readFileSync: (path: string, encoding: BufferEncoding) => resolve(path) === canonical ? JSON.stringify(backlog) : readFileSync(path, encoding), existsSync, writeFileSync: write }
  expect(() => runInNewContext(source, { __dirname: dirname(file), require: (name: string) => name === 'node:fs' ? readOnlyFs : nativeRequire(name), process: { argv: ['node', file, '--write'] }, console: { log: vi.fn() } }))
    .toThrow('SMG-026-002: unmapped public support category new-unmapped-category')
  expect(write).not.toHaveBeenCalled()
  expect(readFileSync(canonical, 'utf8')).not.toContain('new-unmapped-category')
})
