import type { SpawnSyncReturns } from 'node:child_process'

export function buildMuseScoreConversionArgs(inputPath: string, outputPath: string): string[]
export function invokeMuseScoreConversion(options: {
  binary: string
  inputPath: string
  outputPath: string
  execute?: (binary: string, args: string[], options: { encoding: 'utf8'; timeout: number }) => SpawnSyncReturns<string>
}): SpawnSyncReturns<string>
