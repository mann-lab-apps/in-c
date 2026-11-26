import { appendFileSync } from 'node:fs'

export default class CaseTimings {
  output = process.env.STUDIO_CI_CASE_FILE

  record(entry) {
    appendFileSync(this.output, JSON.stringify(entry) + '\n')
  }

  onTestModuleStart(module) {
    this.record({ kind: 'module-start', project: module.project.name, file: module.relativeModuleId })
  }

  onTestCaseResult(test) {
    const result = test.result()
    const diagnostic = test.diagnostic()
    this.record({
      kind: 'case-result',
      project: test.module.project.name,
      file: test.module.relativeModuleId,
      name: test.fullName,
      state: result.state,
      startedAt: diagnostic?.startTime ?? null,
      durationMs: diagnostic?.duration ?? null,
      ...(result.errors?.length && { error: result.errors[0].message }),
    })
  }

  onTestModuleEnd(module) {
    const diagnostic = module.diagnostic()
    this.record({
      kind: 'module-result',
      project: module.project.name,
      file: module.relativeModuleId,
      state: module.state(),
      durationMs: diagnostic.duration,
      collectDurationMs: diagnostic.collectDuration,
    })
  }

  onTestRunEnd(_, errors, reason) {
    this.record({ kind: 'run-end', reason, unhandledErrors: errors.length })
  }
}
