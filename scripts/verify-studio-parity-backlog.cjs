// Canonical JSON -> developer queue and offline user-facing support boundaries.
// This is a consistency check, never proof that a feature is implemented.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const base = path.join(root, 'docs/product')
const read = name => fs.readFileSync(path.join(base, name), 'utf8')
const backlog = JSON.parse(read('studio-musescore-gap-backlog-20261104.json'))
const index = JSON.parse(read('studio-musescore-handbook-topics-20261104.json'))
const rows = backlog.entries, ids = new Set(rows.map(row => row.id))
assert.equal(ids.size, rows.length, 'Duplicate gap IDs')
const states = ['partial', 'preservation-only', 'no-public-ui', 'not-audited', 'not-verified', 'external-qa', 'scope-decision']
const statuses = ['queued', 'in-progress', 'needs-design', 'needs-audit', 'external-qa', 'deferred', 'done']
// Keep the five published groups/anchors stable while retaining engineering labels.
const categories = ['입력·표기', '속성·작업 공간', '재생과 파일 교환', '추가 조사 대상', '범위 결정']
const publicCategoryBySource = new Map([
  ...categories.map(category => [category, category]),
  ['MusicXML 교환', '재생과 파일 교환'], ['파일 교환', '재생과 파일 교환'],
  ['UI·접근성', '속성·작업 공간'], ['작업 공간', '속성·작업 공간'], ['조판', '속성·작업 공간'],
  // Help implementation tasks are metadata, not additional notation features.
  ['도움말', null]
])
const history = read('chromatics-musescore-parity-roadmap.md') + read('chromatics-commercial-v1-work-queue.md')
const topicUrls = new Set(index.topics.map(topic => topic.url))
for (const row of rows) {
  assert(/^SMG-\d{3}(?:-\d{3})?$/.test(row.id), row.id)
  assert(states.includes(row.featureState), row.id)
  assert(statuses.includes(row.status), row.id)
  assert(publicCategoryBySource.has(row.category), `${row.id}: unmapped public support category ${row.category}`)
  assert(['P0', 'P1', 'P2', 'P3'].includes(row.priority), row.id)
  for (const key of ['title', 'category', 'current', 'gap', 'publicSummary']) assert(row[key], `${row.id}: ${key}`)
  assert(row.sourceEvidence.length && row.acceptance.length && row.verification.length && row.officialUrls.length, row.id)
  for (const item of row.sourceEvidence) assert(item.observation && fs.existsSync(path.join(root, item.path)), `${row.id}: ${item.path}`)
  for (const url of row.officialUrls) assert(topicUrls.has(url), `${row.id}: not in checked official index ${url}`)
  for (const id of row.existingIds) assert(history.includes(id), `${row.id}: missing existing task ${id}`)
  for (const id of row.dependencies) assert(ids.has(id) && id !== row.id, `${row.id}: invalid dependency ${id}`)
  if (row.status === 'done') {
    assert(row.evidence.length, `${row.id}: completion needs evidence`)
    for (const file of row.evidence) assert(fs.existsSync(path.join(root, file)), `${row.id}: missing evidence ${file}`)
  }
  if (row.featureState === 'not-audited' && row.status !== 'done') assert.equal(row.status, 'needs-audit', `${row.id}: do not presume missing`)
}
const visit = (id, stack = []) => {
  assert(!stack.includes(id), `Dependency cycle ${[...stack, id]}`)
  for (const dependency of rows.find(row => row.id === id).dependencies) visit(dependency, [...stack, id])
}
for (const id of ids) visit(id)
for (const topic of index.topics) for (const id of topic.gapIds) {
  assert(ids.has(id) && rows.find(row => row.id === id).officialUrls.includes(topic.url), `Stale topic mapping ${id}`)
}
const labels = {partial:'일부 지원', 'preservation-only':'보존 경로만 있음', 'no-public-ui':'직접 UI 없음', 'not-audited':'추가 조사 필요', 'not-verified':'실제 검수 미완', 'external-qa':'외부 검증 미완', 'scope-decision':'별도 제품 범위 결정'}
const linked = index.topics.filter(topic => topic.gapIds.length).length
const parentCount=rows.filter(row=>/^SMG-\d{3}$/.test(row.id)).length, childCount=rows.length-parentCount
let developer = `# Studio · MuseScore 기능 차이 실행 백로그\n\n기준 ${backlog.checkedDate} · ${backlog.productVersion} · HEAD ${backlog.sourceHead}. 새 도움말 UI는 미배포다.\n\n정본은 같은 이름의 JSON이다. 이 문서와 앱의 지원 차이 장은 검증 스크립트가 생성·대조한다. 공식 [핸드북](https://handbook.musescore.org/)과 [목차](https://handbook.musescore.org/llms.txt)의 US/UK 중복을 제외한 ${index.topics.length}개 항목 중 ${linked}개를 아래 ${parentCount}개 상위 작업 묶음에 연결했다. 별도로 ${childCount}개 하위 슬라이스를 추적한다. 나머지 ${index.topics.length-linked}개는 상세 대조 대기이며 미지원이라고 판정하지 않았다. 목차 항목 수와 원자적 기능 수는 다르다.\n\n현재 소스·공개 UI와 가져온 값 보존/내부 재생/교환 출력은 서로 구분한다. queued는 자동 완성 약속이 아니라 현행 확인 후 작은 구현을 선택할 후보이며, needs-design은 기존 승인 정책을 바꾸기 전 범위를 정해야 한다. 외부·물리 검수 미완은 기능 부재가 아니다. 기존 로컬 roadmap/work-queue ID로 중복을 연결했고 원격 이슈는 만들지 않았다.\n\n[연속 실행 프롬프트](studio-musescore-next-goal-20261104.md) · [현재 설명서](studio-manual/README.md) · [공식 목차 대조 상태](studio-musescore-handbook-topics-20261104.json)\n\n| ID | 우선순위 | 작업 | 현재 지원 | 실행 상태 | 기존 백로그 |\n| --- | --- | --- | --- | --- | --- |\n`
for (const row of rows) developer += `| ${row.id} | ${row.priority} | ${row.title} | ${labels[row.featureState]} | ${row.status} | ${row.existingIds.join(', ') || '직접 연결 없음'} |\n`
for (const row of rows) {
  developer += `\n## ${row.id} · ${row.title}\n\n- 현재: ${row.current}\n- 남은 범위: ${row.gap}\n- 정책 변경 검토: ${row.requiresPolicy ? '필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.' : '기존 계약을 유지하는 작은 범위부터 조사한다.'}\n- 의존성: ${row.dependencies.join(', ') || '없음'}\n- 소스: ${row.sourceEvidence.map(item => `[${item.path}](../../${item.path})`).join(', ')}\n- 공식 근거: ${row.officialUrls.map((url, i) => `[참고 ${i+1}](${url})`).join(', ')}\n\n수용 기준:\n\n${row.acceptance.map(text => `- ${text}`).join('\n')}\n\n검증:\n\n${row.verification.map(text => `- ${text}`).join('\n')}\n`
  if (row.evidence.length) developer += `\n기록: ${row.evidence.map(file => `[${file}](../../${file})`).join(', ')}\n`
}
let manual = '# MuseScore와의 차이\n\n현재 지원과 앞으로의 작업을 구분합니다. 기준은 띠로리 Studio alpha.40입니다. 아래 목록은 출시 일정이나 지원 약속이 아닙니다. 목록에 없는 기능도 모든 세부 동작까지 동일하다는 뜻은 아닙니다.\n\n지원 중인 작업은 [기능 색인](feature-index.md)과 [단축키](10-shortcuts.md)를 확인하세요. 예를 들어 일반 타이·슬러, 꾸밈음 붙이기/변환, 도돌이표·볼타, MIDI·MusicXML·PDF·PNG 출력은 이미 제공하며 아래의 추가 범위와 다릅니다.\n'

for (const [i, category] of categories.entries()) {
  manual += `\n<a id="gaps-${i+1}"></a>\n## ${category}\n\n`
  if (category === '추가 조사 대상') manual += '다음은 정확한 범위를 더 확인할 항목입니다. 아직 미구현이라고 확정한 목록이 아닙니다.\n\n'
  for (const row of rows.filter(row => publicCategoryBySource.get(row.category) === category && row.status !== 'done')) manual += `- **${row.title} · ${labels[row.featureState]}**: ${row.publicSummary}\n`
}
const resolved = rows.filter(row => row.status === 'done' && row.category !== '도움말')
if (resolved.length) manual += '\n<a id="gaps-resolved"></a>\n## 이 버전에서 보완한 범위\n\n' + resolved.map(row => `- **${row.title}**: ${row.publicSummary}\n`).join('')
manual += '\n<a id="gaps-alternatives"></a>\n## 현재 가능한 대안과 확인\n\n- [음표·쉼표 편집과 꾸밈음](03-notes.md)\n- [현재 박자표·조표·음자리표 범위](04-structure.md)\n- [기존 표기와 표현](05-notation.md)\n- [선택 속성·자동값·초기화](06-properties.md)\n- [현재 재생과 믹서](07-playback.md)\n- [지원하는 파일 출력](09-files.md)\n- [직접 확인하기](13-checklist.md)\n\n외부 앱의 읽기·재생 검증과 물리 IME·스크린리더 검수는 내부 검사 통과와 구분합니다. MuseScore 서비스·플러그인·외부 음원은 Studio의 기능으로 약속하지 않습니다.\n'
// Every user-facing row must survive grouping; help implementation metadata is intentionally private.
const publicUserRows = rows.filter(row => row.category !== '도움말')
for (const row of publicUserRows) assert(manual.includes(row.publicSummary), `${row.id}: support boundary silently omitted from public manual`)
const outputs = [['studio-musescore-gap-backlog-20261104.md', developer], ['studio-manual/14-musescore-differences.md', manual]]
for (const [file, expected] of outputs) {
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(base, file), expected)
  assert.equal(read(file), expected, `Regenerate explicitly: node scripts/verify-studio-parity-backlog.cjs --write (${file})`)
}
const chapters = JSON.parse(read('studio-manual/manifest.json')).chapters
assert(chapters.some(chapter => chapter.file === '14-musescore-differences.md'), 'Support gaps must be readable in the offline app, not just a developer file')
console.log(JSON.stringify({status:'passed', workGroups:parentCount, trackedEntries:rows.length, childSlices:childCount, officialIndexTopics:index.topics.length, linkedTopics:linked, topicAuditsPending:index.topics.length-linked, featureParityApproval:false, publicEntries:publicUserRows.length, publicUnresolvedEntries:publicUserRows.filter(row=>row.status!=='done').length, publicResolvedEntries:publicUserRows.filter(row=>row.status==='done').length, helpMetadataExcluded:rows.length-publicUserRows.length, statuses:rows.reduce((result, row) => ({...result,[row.status]:(result[row.status]||0)+1}),{})},null,2))
