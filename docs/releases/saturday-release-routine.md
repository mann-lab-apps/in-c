# Daily And Saturday Release Routine

작성일: 2026-07-13

## 목적

in C의 빠른 목표모드 작업을 데일리 10분 점검과 주간 30분 릴리즈 점검으로 나눠
관리한다. 데일리 루틴은 프로젝트 감각을 잃지 않도록 자주 확인해야 할 신호에
집중하고, 주간 루틴은 매주 토요일 또는 릴리즈를 고민할 때 앱, 사이트, 문서,
다운로드, 알려진 이슈를 한 번에 점검해 릴리즈 여부를 판단한다.

이 루틴은 매주 릴리즈를 강제하지 않는다. 릴리즈 진행, 보류, 차주 이월 이유를 남겨
운영 부담을 줄이는 것이 목적이다.

## 현재 운영 상태

2026-07-17 기준으로 `snapshot-template.md`는 Pending 상태다. PR은 CI 통과와 변경 범위
확인을 기준으로 빠르게 머지하고, 사용자는 개별 diff를 매번 확인하지 않는다. 대신
릴리즈 전에는 페어로 전체 표면을 훑으면서 실제로 확인하게 되는 질문을 관찰한다.
반복해서 등장하는 질문만 이후 snapshot/checklist 문서로 승격한다. 이 관찰 실험은
#386에서 추적하고, 점검 중 나온 질문은 [`../reviews/pair-review-notes.md`](../reviews/pair-review-notes.md)에
남긴다.

## 문서 읽는 순서

릴리즈 판단을 위해 모든 문서를 처음부터 읽지 않는다. 먼저 이번 주 변경과 릴리즈
가능성을 빠르게 파악하고, 진행할 가능성이 있을 때만 상세 체크리스트와 quality 근거로
들어간다.

| 순서 | 문서 | 언제 보는가 | 목적 |
| --- | --- | --- | --- |
| 1 | 이 문서의 데일리 루틴 | 하루 작업을 시작하거나 마칠 때 | 자주 확인해야 할 신호와 막힌 결정을 짧게 본다 |
| 2 | 이 문서의 주간 루틴 | 매주 토요일 또는 릴리즈를 고민할 때 | 이번 주를 `진행`, `보류`, `차주 이월` 중 하나로 판단한다 |
| 3 | [`../quality/current-state-report.md`](../quality/current-state-report.md) | 현재 제품 상태가 헷갈릴 때 | 앱, 사이트, backend, known limitation의 큰 상태를 복원한다 |
| 4 | [`../quality/known-limitations.md`](../quality/known-limitations.md) | 사용자에게 말할 제한사항을 정리할 때 | 릴리즈 노트와 사이트 문구에 남겨야 할 제한을 확인한다 |
| 5 | [`../quality/release-readiness-checklist.md`](../quality/release-readiness-checklist.md) | 릴리즈 진행 가능성이 있을 때 | release candidate로 볼 수 있는지 quality 기준으로 확인한다 |
| 6 | [`checklist-template.md`](checklist-template.md) | 실제 prerelease를 만들기로 했을 때 | 태그, 패키징, 사이트 배포, 배포 후 확인을 끝까지 실행한다 |
| 7 | [`manual-score-completion-qa.md`](manual-score-completion-qa.md) | 사람이 앱을 직접 만질 때 | 한 악보 완성 흐름으로 수동 QA를 수행한다 |
| 참고 | [`snapshot-template.md`](snapshot-template.md) | Pending 초안을 다시 볼 때 | 페어 전체 점검에서 반복 확인 항목이 보인 뒤 필요한 부분만 재사용한다 |

평소에는 1-2번만 보면 충분하다. 릴리즈를 실제로 진행하려는 날에는 3-7번으로 내려간다.
특정 판단의 근거가 더 필요할 때만
[`../quality/verification-matrix.md`](../quality/verification-matrix.md),
[`../quality/traceability-matrix.md`](../quality/traceability-matrix.md),
[`../quality/risk-register.md`](../quality/risk-register.md),
[`../quality/evidence-log.md`](../quality/evidence-log.md)를 확인한다.

## 데일리 10분 점검 순서

데일리 루틴은 릴리즈를 판단하지 않는다. 목표모드가 빠르게 진행되는 동안 사용자가
프로젝트의 현재 방향, 막힌 결정, 자주 확인해야 하는 운영 신호를 잃지 않게 하는
가벼운 점검이다. 모든 항목을 매일 완벽히 채우기보다, 이상 신호가 있는지만 본다.

| 시간 | 영역 | 판단용 확인 항목 | 결과 기록 |
| --- | --- | --- | --- |
| 0-2분 | 작업 흐름 | 열린 PR, 오늘 머지된 PR, 로컬 `main` 동기화 여부 | 오늘 볼 PR/없음 |
| 2-4분 | 이슈 신호 | bug, release blocker, `긴급`, 사용자가 결정해야 하는 이슈 | 막힌 결정/없음 |
| 4-6분 | 목표모드 잔여물 | 방금 닫힌 이슈가 문서화 완료인지 제품 반영 완료인지 | 후속 구현 필요/없음 |
| 6-8분 | 검증과 표면 신호 | 최근 CI 실패, 반복되는 flaky 검증, 사이트/download/privacy/known limitation 충돌 | 오늘 수정 필요/없음 |
| 8-10분 | 다음 행동 | 오늘 목표모드 후보 1개, 주간 루틴으로 넘길 항목, 또는 중단 판단 | 다음 목표/보류 이유 |

데일리 10분 루틴의 목표는 오늘 어디에 주의를 둘지 정하는 것이다. 테스트 실행,
사이트 빌드, 패키징, release note 작성, 모든 열린 이슈 재분류는 하지 않는다. 이상
신호가 있으면 `오늘 수정 필요`, `주간 루틴으로 넘김`, `목표모드 후보` 중 하나로만
분류한다.

## 10분 안에 하지 않는 일

- `npm test`, `npm run build`, `npm run site:build`, `npm run package:dir` 실행.
- 릴리즈 가능 여부 최종 판단.
- 모든 열린 이슈와 닫힌 이슈 재분류.
- 전체 점검 기록을 최종 루틴으로 확정.
- release notes 최종 문안 작성.

데일리 점검에서 목표모드나 PR이 많이 쌓여 분류가 어려워졌다고 느끼면, 바로 문서화
루틴을 확정하지 않고 페어 전체 점검 후보로 넘긴다.

### 데일리 기록 템플릿

```md
## YYYY-MM-DD 데일리 점검

- 오늘 볼 PR:
- 막힌 결정:
- 문서화 완료지만 제품 반영이 남은 것:
- 실패/이상 신호:
- 주간 루틴으로 넘길 항목:
- 오늘 목표모드 후보:
- 메모:
```

## 주간 30분 릴리즈 점검 순서

목표모드나 PR이 많이 쌓여 이번 주 변경을 한 번에 파악하기 어렵다면, 먼저 페어 전체
점검으로 앱, 사이트, 문서, known limitations, 열린 이슈를 훑는다. 이때 반복해서 확인한
질문은 나중에 snapshot/checklist 후보로 남긴다.

| 시간 | 영역 | 판단용 확인 항목 | 결과 기록 |
| --- | --- | --- | --- |
| 0-5분 | 변경 범위 | 마지막 태그 이후 `main` 변경, merged PR, 닫힌 이슈 | 릴리즈 후보/제외 변경 구분 |
| 5-10분 | 앱 | 최근 CI의 `test`, `build`, `electron-mvp` 결과와 앱 변경 여부 | 재검증 필요/불필요 |
| 10-15분 | 사이트 | `site/**`, download manifest, 공개 CTA/문구 변경 여부 | 사이트 검증 필요/불필요 |
| 15-20분 | 문서 | README, 배포 문서, release notes 초안, known limitations 변화 | 사용자에게 말할 변경 |
| 20-25분 | 패키징 | version, release artifact 영향 파일, `package.json`/builder 설정 변경 여부 | 패키징 리허설 필요/불필요 |
| 25-30분 | 이슈와 판정 | bug, release blocker, 결정 필요, 다음 릴리즈 후보 | 진행/보류/차주 이월 |

30분 루틴의 목표는 모든 검증을 실행하는 것이 아니라, 어떤 검증과 문서가 실제 릴리즈
진행 전에 필요한지 결정하는 것이다. `npm run build`, `npm run verify:mvp`,
`npm run package:dir`, production smoke처럼 시간이 오래 걸리거나 환경 영향이 큰 명령은
이 루틴에서 필요성을 판정하고, 진행하기로 결정한 뒤
[`checklist-template.md`](checklist-template.md)에서 실행한다.

## 30분 안에 하지 않는 일

- 새 태그 생성, GitHub Release 생성, release workflow 실행.
- packaging artifact 배포 또는 production site 전환.
- 모든 열린 문서/운영 이슈 재분류.
- 전체 quality evidence package 재작성.
- 릴리즈 노트 최종 문안 확정.

위 항목이 필요하다고 판단되면 주간 루틴의 결과를 `진행`으로 두고 실제 릴리즈
체크리스트로 내려간다.

## 관점별 드라이런 피드백

2026-07-16에 루틴을 10개 관점으로 드라이런한 결과, 아래 보완 기준을 반영했다. 이 표는
매번 갱신하지 않는다. 루틴 자체가 다시 헷갈릴 때만 참고한다.

| 관점 | 막힌 지점 | 문서 반영 |
| --- | --- | --- |
| 최근 `main` 변경 범위 | `v0.1.0-alpha.4..HEAD` 변경 파일이 많아 후보/제외 구분이 먼저 필요했다 | 페어 전체 점검에서 사용자-facing 표면과 후속 구현 후보를 먼저 본다 |
| 앱 검증 명령 | 30분 안에 모든 앱 검증을 실행하려 하면 루틴이 체크리스트로 변한다 | CI 결과 확인과 재검증 필요 판단으로 축소 |
| 사이트/download manifest | 사이트 파일 변경과 release manifest 변경을 같은 무게로 보면 과해진다 | 사이트 변경 여부와 manifest 영향만 먼저 확인 |
| 문서/release notes/known issues | 문서화 완료와 사용자-facing 변경이 섞였다 | `known limitations 변화`와 `사용자에게 말할 변경`을 분리 |
| 패키징 가능성 | `package:dir` 실행은 30분 루틴에서 무겁다 | 패키징 리허설 필요 여부만 판정 |
| 열린 이슈/release blocker | 열린 이슈 대부분이 문서/운영 후보라 blocker가 흐려진다 | bug, release blocker, 결정 필요를 우선 확인 |
| 사용자-facing 영향 | PR #383처럼 문서 변경은 닫힌 이슈가 많아도 화면 영향이 없을 수 있다 | 페어 전체 점검에서 화면 영향과 후속 구현 필요를 직접 구분한다 |
| 문서화 완료와 제품 반영 필요 | 기준 문서가 생긴 것을 제품 완료로 착각할 수 있다 | 반복 확인 질문으로 남기고 이후 checklist 후보로 승격한다 |
| 데일리와 주간 연결 | 데일리 이상 신호가 주간 판정으로 넘어가는 경로가 약했다 | 데일리에서 분류가 어려워지면 페어 전체 점검 후보로 넘긴다 |
| 30분 사용성 | 실행할 명령과 읽을 문서가 너무 많으면 30분 판단이 어렵다 | 시간 박스와 `30분 안에 하지 않는 일`을 추가 |

## 릴리즈 판정 기준

| 판정 | 기준 | 다음 행동 |
| --- | --- | --- |
| 진행 | 핵심 자동화 통과, known issue가 릴리즈 노트로 설명 가능 | 릴리즈 체크리스트 복사 후 태그 준비 |
| 보류 | 테스트 실패, 패키징 실패, 다운로드 링크 불확실 | 실패 이슈를 만들고 다음 토요일 재점검 |
| 차주 이월 | 기능은 좋지만 문서/사이트/릴리즈 노트가 부족 | 이번 주 변경을 next release 후보로 표시 |

## 반복 이슈 생성 판단

초기에는 이 문서를 보고 수동으로 점검한다. 3회 이상 같은 항목을 복사하게 되면
GitHub issue template 또는 `gh issue create` 스크립트를 검토한다. 자동화 구현은 릴리즈
판정 기준이 안정된 뒤 별도 이슈로 분리한다.

## 기존 체크리스트 연결

- 실제 prerelease를 진행할 때는 `docs/releases/checklist-template.md`를 복사한다.
- 한 악보 완성 흐름은 `docs/releases/manual-score-completion-qa.md`를 따른다.
- 배포와 다운로드 정책은 `docs/distribution.md`를 확인한다.

## 기록 템플릿

```md
## YYYY-MM-DD 주간 릴리즈 점검

- 판정: 진행 / 보류 / 차주 이월
- 릴리즈 후보 버전:
- 이번 주 포함 변경:
- 제외 변경:
- 재검증 필요:
- 실패/블로커:
- 결정 필요:
- 다음 릴리즈 후보:
- 메모:
```
