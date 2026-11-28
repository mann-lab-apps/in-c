from pathlib import Path


main = Path('src/main/index.ts')
source = main.read_text()
anchor = "const musicXmlFiles = new MusicXmlFileSession(backupExistingMusicXmlFile)"
assert source.count(anchor) == 1
main.write_text(source.replace(anchor, """
const printQaDirectory = process.argv.includes('--piano-audit') ? process.env.STUDIO_QA_PRINT_DIR : undefined
if (printQaDirectory) {
  dialog.showOpenDialog = (async (options: { title?: string }) => {
    if (!options.title?.endsWith('프로젝트 열기')) throw new Error('Unexpected QA open dialog: ' + options.title)
    return { canceled: false, filePaths: [join(printQaDirectory, process.env.STUDIO_QA_INPUT || 'input.chromatics')] }
  }) as typeof dialog.showOpenDialog
  dialog.showSaveDialog = (async (options: { title?: string }) => {
    const name = options.title === 'PDF 변환' ? 'score.pdf'
      : options.title === 'PNG 페이지 저장' ? 'score.png'
      : options.title?.endsWith('프로젝트 저장') ? 'recovered.chromatics' : undefined
    if (!name) throw new Error('Unexpected QA save dialog: ' + options.title)
    return { canceled: false, filePath: join(printQaDirectory, name) }
  }) as typeof dialog.showSaveDialog
}
""" + anchor))

module = Path('src/renderer/src/notation/print-layout.ts')
source = module.read_text()
anchor = '): PrintLayoutPlan {\n  const layout=resolveLayoutForPrimaryStaff(score)'
assert source.count(anchor) == 1
module.write_text(source.replace(anchor, '): PrintLayoutPlan {\n  performance.mark("qa-print-layout")\n  const layout=resolveLayoutForPrimaryStaff(score)'))
