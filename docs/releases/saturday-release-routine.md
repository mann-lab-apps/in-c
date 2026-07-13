# Saturday Release Routine

작성일: 2026-07-13

## 목적

매주 토요일에 in C의 앱, 사이트, 문서, 다운로드, 알려진 이슈를 한 번에 점검해 이번 주
릴리즈 여부를 판단한다. 이 루틴은 매주 릴리즈를 강제하지 않는다. 릴리즈 진행, 보류,
차주 이월 이유를 남겨 운영 부담을 줄이는 것이 목적이다.

## 30분 점검 순서

| 순서 | 영역 | 확인 항목 | 결과 기록 |
| --- | --- | --- | --- |
| 1 | 변경 범위 | 이번 주 `main` 변경, 닫힌 이슈, 남은 PR | 릴리즈 후보/제외 변경 구분 |
| 2 | 앱 | `npm run typecheck`, `npm test`, `npm run build`, 필요 시 `npm run verify:mvp` | 통과/실패와 실패 이슈 |
| 3 | 사이트 | `npm run site:build`, 다운로드 manifest, 공개 CTA/문구 | manifest 버전과 링크 |
| 4 | 문서 | README, 배포 문서, release notes 초안, known issues | 사용자에게 말할 변경 |
| 5 | 패키징 | `npm run package:dir`, `npm run verify:package` 가능 여부 | 로컬 패키징 가능성 |
| 6 | 이슈 | bug, release blocker, 다음 릴리즈 후보 | 진행/보류/차주 이월 |

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
## YYYY-MM-DD 토요일 릴리즈 점검

- 판정: 진행 / 보류 / 차주 이월
- 릴리즈 후보 버전:
- 이번 주 포함 변경:
- 제외 변경:
- 실패/블로커:
- 다음 릴리즈 후보:
- 메모:
```
