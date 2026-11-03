import { spawnSync } from 'node:child_process'
import { isAbsolute, resolve } from 'node:path'

// Shared by the two reference-app QA consumers. Never reset user settings.
export function buildMuseScoreConversionArgs(inputPath, outputPath) {
  if (!isAbsolute(inputPath) || !isAbsolute(outputPath)) {
    throw new Error('MuseScore QA input/output paths must be absolute.')
  }
  if (resolve(inputPath) === resolve(outputPath)) {
    throw new Error('MuseScore QA output must differ from its source.')
  }
  return ['--musicxml-use-default-font', '-o', outputPath, inputPath]
}

export function invokeMuseScoreConversion({ binary, inputPath, outputPath, execute = spawnSync }) {
  return execute(binary, buildMuseScoreConversionArgs(inputPath, outputPath), {
    encoding: 'utf8', timeout: 90_000
  })
}
