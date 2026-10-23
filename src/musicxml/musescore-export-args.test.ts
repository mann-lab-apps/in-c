import { expect, it } from 'vitest'
import { museScoreExportArgs } from '../../scripts/musescore-export-args.mjs'

it.each(['mid', 'pdf', 'musicxml'])('exports %s without resetting consumer preferences', extension => {
  const input = '/temporary score/input.musicxml'
  const output = `/temporary score/output.${extension}`
  const args = museScoreExportArgs(input, output)
  expect(args).toEqual(['--musicxml-use-default-font', '-o', output, input])
  expect(args).not.toContain('-F')
  expect(args).not.toContain('-R')
  expect(args).not.toContain('--factory-settings')
  expect(args).not.toContain('--revert-settings')
})
