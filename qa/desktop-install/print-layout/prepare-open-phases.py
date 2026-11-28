from pathlib import Path


def inject(file, replacements):
    target = Path(file)
    text = target.read_text()
    for old, new in replacements:
        assert text.count(old) == 1, (file, old)
        text = text.replace(old, new)
    target.write_text(text)


inject('src/main/project-files.ts', [
    ("readNativeProjectFile(filePath: string): Promise<NativeProject> {",
     """readNativeProjectFile(filePath: string, qa?: Record<string, number>): Promise<NativeProject> {
  const qaReadStart = performance.now()"""),
    ("  return decodeNativeProject(await readFile(filePath, 'utf8'))",
     """  const contents = await readFile(filePath, 'utf8')
  const qaReadComplete = performance.now()
  const project = decodeNativeProject(contents)
  if (qa) {
    qa.diskMs = qaReadComplete - qaReadStart
    qa.mainDecodeMs = performance.now() - qaReadComplete
  }
  return project"""),
    ("""  async open(filePath: string): Promise<NativeProject> {
    return this.enqueue(async () => {
      const path = await canonicalPath(filePath)
      const project = await readNativeProjectFile(path)
      this.revisions.set(path, fileRevision(encodeNativeProject(project)))
      this.authorizeSave(filePath)""",
     """  async open(filePath: string, qa?: Record<string, number>): Promise<NativeProject> {
    const qaQueued = performance.now()
    return this.enqueue(async () => {
      const qaDequeued = performance.now()
      const path = await canonicalPath(filePath)
      const qaPathReady = performance.now()
      const project = await readNativeProjectFile(path, qa)
      const qaDecoded = performance.now()
      this.revisions.set(path, fileRevision(encodeNativeProject(project)))
      this.authorizeSave(filePath)
      if (qa) {
        qa.queueMs = qaDequeued - qaQueued
        qa.pathMs = qaPathReady - qaDequeued
        qa.registerMs = performance.now() - qaDecoded
      }"""),
])

inject('src/main/index.ts', [
    ("  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))",
     """  const qaPrintOptions = printQaDirectory && process.env.STUDIO_QA_AUTOMATIC_PAGES === '1'
    ? { query: { qaAutomaticPages: '1' } } : undefined
  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'), qaPrintOptions)"""),
    ("ipcMain.handle('project:open', async () => {",
     """ipcMain.handle('project:open', async () => {
  const qaStarted = performance.now()
  const qa: Record<string, number> = {}"""),
    ("""  const contents = encodeNativeProject(await nativeFiles.open(filePath))
  return { filePath, fileName: basename(filePath), contents, revision: fileRevision(contents) }""",
     """  const qaSessionStart = performance.now()
  const project = await nativeFiles.open(filePath, qa)
  const qaSessionEnd = performance.now()
  const contents = encodeNativeProject(project)
  const payload = { filePath, fileName: basename(filePath), contents, revision: fileRevision(contents) }
  if (printQaDirectory) {
    console.log('QA_NATIVE_OPEN ' + JSON.stringify({ ...qa,
      mainHandlerMs: performance.now() - qaStarted, sessionMs: qaSessionEnd - qaSessionStart,
      replyMs: performance.now() - qaSessionEnd }))
  }
  return payload"""),
])

inject('src/renderer/src/App.tsx', [
    ("""    () => resolvePrintLayoutPlan(printScore, pdfTargetPageCount ?? 1, lyricMinimumWidths),""",
     """    () => resolvePrintLayoutPlan(printScore,
      new URLSearchParams(window.location.search).has('qaAutomaticPages') ? 'auto' : pdfTargetPageCount ?? 1,
      lyricMinimumWidths),"""),
    ("""  const [startScreenVisible, setStartScreenVisible] = useState(
    () => !isFixtureMode()
  )
""", """  const [startScreenVisible, setStartScreenVisible] = useState(
    () => !isFixtureMode()
  )
  useLayoutEffect(() => {
    if (!startScreenVisible && performance.getEntriesByName('qa-open-state-queued').length) {
      performance.mark('qa-open-commit')
    }
  }, [startScreenVisible])
"""),
    ("""      const file = recent ? await window.inC.recentMusicXml.open({ filePath: recent.filePath }) : await window.inC.project.open()
      if (!file || generation""",
     """      performance.mark('qa-open-ipc-request')
      const file = recent ? await window.inC.recentMusicXml.open({ filePath: recent.filePath }) : await window.inC.project.open()
      performance.mark('qa-open-ipc-return')
      if (!file || generation"""),
    ("""      const project = decodeNativeProject(file.contents)
      const preferences: PartPageSetupPreferences""",
     """      const project = decodeNativeProject(file.contents)
      performance.mark('qa-open-decoded')
      const preferences: PartPageSetupPreferences"""),
    ("""      nativeEnvelope.current = project
      currentMusicXmlFileRef.current = undefined
      const openedGeneration""",
     """      nativeEnvelope.current = project
      currentMusicXmlFileRef.current = undefined
      performance.mark('qa-open-state-queued')
      const openedGeneration"""),
])

inject('src/renderer/src/notation/print-layout.ts', [
    ('export function resolvePrintLayoutPlan(',
     """let qaCandidateEvaluations = 0

export function resolvePrintLayoutPlan("""),
    ('  performance.mark("qa-print-layout")\n  const layout=resolveLayoutForPrimaryStaff(score)',
     '''  performance.mark('qa-print-layout')
  const initialEvaluations = qaCandidateEvaluations
  const start = performance.now()
  try {
    return resolvePrintLayoutPlanImpl(score, targetPages, minimumMeasureWidths)
  } finally {
    performance.measure('qa-print-layout-duration', {
      start, detail: { evaluations: qaCandidateEvaluations - initialEvaluations, targetPages }
    })
  }
}

function resolvePrintLayoutPlanImpl(
  score: Score, targetPages: PrintPageTarget, minimumMeasureWidths?: ReadonlyMap<string, number>
): PrintLayoutPlan {
  const layout=resolveLayoutForPrimaryStaff(score)'''),
    ('): PrintLayoutPlan {\n  const normalizedCandidate = normalizePrintLayoutCandidate(',
     '''): PrintLayoutPlan {
  qaCandidateEvaluations += 1
  const normalizedCandidate = normalizePrintLayoutCandidate('''),
])

inject('src/renderer/src/notation/use-lyric-layout.ts', [
    ("""export function minimumTextScoreWidths(score:Score,widths:ReadonlyMap<string,number>,harmonies?:HarmonySpacingWidths):MeasureWidthRequirements {
  if(!supportsAutomaticLyricSpacing(score))return empty""",
     """export function minimumTextScoreWidths(score:Score,widths:ReadonlyMap<string,number>,harmonies?:HarmonySpacingWidths):MeasureWidthRequirements {
  const start = performance.now()
  try {
    return minimumTextScoreWidthsImpl(score, widths, harmonies)
  } finally {
    performance.measure('qa-text-widths', { start })
  }
}

function minimumTextScoreWidthsImpl(score:Score,widths:ReadonlyMap<string,number>,harmonies?:HarmonySpacingWidths):MeasureWidthRequirements {
  if(!supportsAutomaticLyricSpacing(score))return empty"""),
])
