export function museScoreExportArgs(input, output) {
  // Factory/revert flags can modify the installed consumer's user preferences.
  return ['--musicxml-use-default-font', '-o', output, input]
}
