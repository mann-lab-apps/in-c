# Studio App integration tests

Run every App integration group with `npm run test:components`. Add `-- -t 'scenario-id'` to select a workflow across all groups. `npm run test:all` also collects all groups plus the other product/shared UI tests and Node-native tools.

The former single App file reached the ordinary Node worker heap limit in continuous gate151. Its350 test definitions were partitioned without changing their bodies or assertions. At checkpoint153 all611 expanded App names and multiplicities match the original; later additions can increase this count. Root gate153 passed1,637 Vitest and5 Node tests with one external opt-in skip. That skip does not approve external application compatibility.

Files:

- `src/renderer/src/App.test.tsx`
- `src/renderer/src/App.workspace.test.tsx`
- `src/renderer/src/App.properties.test.tsx`
- `src/renderer/src/App.notation-exchange.test.tsx`

`App.test-harness.tsx` holds the fixed mocks/helpers and registers the unchanged per-test cleanup/reset hooks inside each suite. It is not a product module or a collected test file. Keep new tests next to related workflows and use the common harness; do not copy the mocks or grow another monolithic integration file. Discovery can be audited with `vitest list` on the four explicit paths.

A moved acceptance case must keep its ID/tag and update its current path in `docs/product/acceptance/automation-map.json`; leave historical logs/design manifests intact. `src/testing/acceptance-traceability.test.ts` verifies these mappings. CI uses `test:components` so a file move does not silently drop App coverage.

Preserved evidence: `docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28/151-suite/` (OOM),`152-suite/` (old mapping failure),`151-app-test-isolation/` (exact definition hashes/discovery/migration),`153-suite/` (complete PASS). This bounds integration test execution;it does not establish a product memory-leak diagnosis or a jsdom retention root cause.


## Full-gate resource and workflow budgets

`npm run test:all` runs the same complete Vitest collection with at most two workers,then `test:tools`. Plain `npm test` and focused commands keep their existing worker policy; the three scoped deadlines below apply wherever those tests are collected. No files,projects,assertions,or scenarios are excluded by the full-gate worker limit. This is execution scheduling,not product concurrency coverage;each asynchronous ownership scenario still exercises its original races.

The default test deadline remains5seconds. Three long App integration workflows have an explicit15second bound:independent part title edit/undo/reset/cancel/save/reopen/PDF,andpart page reset/history/native save in `App.test.tsx`,plusrest span endpoint edit/history/native save in `App.notation-exchange.test.tsx`. Their callback AST hashes match before/after. Do not apply a global timeout increase or split away their final state/history checks merely to get green.

Evidence and current result are in `docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28/380-test-resource-boundary/`. The original379default run had seven5000ms timeouts,including three which also failed isolated. Diagnostic complete execution and per-test durations established that those3workflows legitimately need more than5seconds in this test environment. This does not establish a product latency regression or prove a particular unrelated process caused the scheduling pressure. Preserve failed runs separately from subsequent passes and report actual CI/OS coverage honestly.
