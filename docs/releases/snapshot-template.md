# 릴리즈 전 스냅샷 템플릿

상태: **Pending**

2026-07-17 기준으로 이 템플릿은 기본 운영 루틴이 아니다. 빠른 CI 머지 후 사용자가
개별 diff를 매번 확인하지 않는 현재 방식에서는, 먼저 페어 전체 점검을 몇 차례 수행해
실제로 반복 확인하는 항목을 관찰한다. 이 문서는 그 관찰 결과를 나중에 정제할 때
참고하는 초안으로만 둔다. 후속 관찰은 #386에서 추적한다.

이 초안의 원래 의도는 릴리즈 전에 프로젝트 현황을 5-10분 안에 복원하기 위한 얇은
현황판이었다. 상시 운영 보드가 아니며, 매 목표모드나 매 PR마다 완료본을 커밋하지
않는 방향으로 작성했다. 다만 현재는 실제 페어 전체 점검에서 반복 확인 항목이
드러날 때까지 기본 루틴으로 사용하지 않는다.

## 언제 쓰는가

- 마지막 태그 이후 목표모드나 PR이 여러 개 쌓였을 때.
- 닫힌 이슈 수는 많지만 실제 제품 완료와 문서 완료가 섞여 보일 때.
- 토요일 릴리즈 루틴을 시작하기 전에 이번 주 변경을 한 화면으로 보고 싶을 때.
- 외부 사용자에게 말할 수 있는 변경과 아직 내부 기준인 변경을 구분해야 할 때.

이 스냅샷 초안은 [`saturday-release-routine.md`](saturday-release-routine.md)의 30분
점검을 대체하지 않는다. 나중에 이 초안을 다시 쓰기로 결정하더라도, 실제 릴리즈를
준비할 때는 [`checklist-template.md`](checklist-template.md)를 사용한다.

## 빠른 생성 절차

1. 이전 태그와 현재 `main`을 확인한다.
2. `git log {previous_tag}..HEAD --oneline`으로 변경 범위를 훑는다.
3. `gh pr list --state merged`와 닫힌 이슈 목록에서 릴리즈 후보 변경을 고른다.
4. 각 항목을 아래 분류 중 하나로 넣는다.
5. `릴리즈 보류` 또는 `결정 필요`가 있으면 토요일 루틴으로 넘어가기 전에 처리 방침을 정한다.

## 입력 명령 예시

```bash
git tag --sort=-creatordate | head
git log v0.1.0-alpha.4..HEAD --oneline
git diff --name-only v0.1.0-alpha.4..HEAD
gh pr list --repo mann-lab-apps/in-c --state merged --limit 20
gh issue list --repo mann-lab-apps/in-c --state open --limit 50
gh issue list --repo mann-lab-apps/in-c --state closed --limit 50
```

이 명령들은 스냅샷을 만들기 위한 입력 수집용이다. 태그 생성, release workflow 실행,
사이트 배포, packaging artifact 생성은 여기서 하지 않는다.

## 분류 기준

| 분류 | 의미 | 릴리즈 판단 |
| --- | --- | --- |
| 완료됨 | 코드, 사이트, 문서, 검증이 함께 끝나 사용자에게 말할 수 있다 | release note 후보 |
| 문서화 완료 | 기준, 템플릿, 조사 계획, 운영 원칙이 정리됐지만 제품 동작은 바뀌지 않았다 | 내부 변경 또는 후속 구현 근거 |
| 제품·사이트 반영 필요 | 문서 기준은 생겼지만 사용자-facing 화면, 앱 동작, 데이터 검증은 아직 남았다 | 다음 구현 후보 |
| 결정 필요 | 사용자, 비용, 운영 정책, 범위 선택이 필요하다 | 릴리즈 전 사람 판단 필요 |
| 릴리즈 보류 또는 known limitation | 릴리즈를 막거나 릴리즈 노트에 반드시 밝혀야 한다 | blocker 또는 known limitation |

## 스냅샷 양식

```md
# 릴리즈 전 스냅샷: YYYY-MM-DD

## 기준

| 항목 | 값 |
| --- | --- |
| 이전 태그 | `v0.1.0-alpha.N` |
| 기준 branch | `main` |
| 기준 commit | `abcdef0` |
| 비교 범위 | `v0.1.0-alpha.N..HEAD` |
| 후보 버전 | `0.1.0-alpha.N+1` |
| 판정 | 진행 / 보류 / 차주 이월 |

## 5분 요약

- 이번 릴리즈에 말할 수 있는 변경:
- 문서화만 완료된 변경:
- 제품/사이트 반영이 남은 변경:
- 릴리즈 전 결정 필요:
- release note에 밝혀야 할 known limitation:

## 릴리즈 영향 표

| 분류 | 항목 | 근거 | 사용자-facing 영향 | 다음 행동 |
| --- | --- | --- | --- | --- |
| 완료됨 | [확인 필요] | PR #, issue # | 예/아니오 | release note/없음 |
| 문서화 완료 | [확인 필요] | PR #, issue # | 아니오 | 후속 구현 후보 |
| 제품·사이트 반영 필요 | [확인 필요] | issue # | 예 | 다음 목표모드 후보 |
| 결정 필요 | [확인 필요] | issue # | 확인 필요 | 사람 결정 |
| 릴리즈 보류 또는 known limitation | [확인 필요] | issue # | 예 | 보류/known limitation |

## 검증 상태

| 검증 | 상태 | 근거 |
| --- | --- | --- |
| GitHub Actions CI | 통과/실패/미확인 | PR # |
| `npm test` | 통과/실패/미실행 | 로컬/CI |
| `npm run typecheck` | 통과/실패/미실행 | 로컬/CI |
| 사이트 검증 | 통과/실패/미실행 | 명령 또는 이유 |
| 패키징/릴리즈 검증 | 통과/실패/미실행 | 명령 또는 이유 |

## PR 메타데이터 품질

- PR들이 해결 이슈를 `Resolves #...`로 남겼는가:
- 검증 명령과 결과가 남았는가:
- follow-up이 `None` 또는 이슈 링크로 남았는가:
- 문서 완료와 제품 완료가 구분되는가:

## 판정

- 판정:
- 이유:
- 릴리즈를 진행한다면 다음 문서:
  - `docs/releases/saturday-release-routine.md`
  - `docs/releases/checklist-template.md`
- 보류한다면 필요한 이슈:
```

## 예시: 2026-07-16 기준 스냅샷 조각

아래 예시는 형식을 보여주기 위한 조각이다. 실제 릴리즈 판단에는 최신 `main`,
GitHub Actions, 열린 blocker 이슈를 다시 확인한다.

| 분류 | 항목 | 근거 | 사용자-facing 영향 | 다음 행동 |
| --- | --- | --- | --- | --- |
| 문서화 완료 | 2026-07-15 등록 문서/운영 이슈 10개 처리 | PR #383, #373-#382 | 직접 영향 없음 | 후속 구현 후보를 별도 이슈로 고른다 |
| 제품·사이트 반영 필요 | 베타 모집 범위와 첫 30명 성공 지표가 정의됨 | #373, #378 | 아직 사이트 노출 없음 | 베타 안내 UI/문구 작업을 별도 후보로 둔다 |
| 문서화 완료 | Concert Preview, Creator intake, Classes pilot 기준 정리 | #375-#377 | 직접 영향 없음 | 파트너 파일럿 전 intake 문구 검토 |
| 완료됨 | production operations docs가 추가됨 | PR #315, #307, #310, #312 | 운영 고지와 플레이북 영향 | release note에는 운영 안정화로 묶는다 |
| 릴리즈 보류 또는 known limitation | Supabase backend, multi-voice, multi-part, Windows advisory | #316, #93, #94, #8 | 예 | release note와 known limitations에 유지 |

## PR 본문 최소 기준

릴리즈 스냅샷은 PR과 이슈에서 재구성된다. 새 관리 도구를 도입하지 않는 대신,
PR 본문은 다음 정보를 가능한 한 같은 이름으로 남긴다.

```md
## 요약

-

## 이슈

Resolves #

## 스냅샷 분류

- 분류: 완료됨 / 문서화 완료 / 제품·사이트 반영 필요 / 결정 필요 / 릴리즈 보류 또는 known limitation
- 사용자-facing 영향: 예 / 아니오 / 확인 필요
- 릴리즈 노트 필요: 예 / 아니오
- known limitation 변경: 예 / 아니오
- 후속 작업: None 또는 issue #

## 인수 시나리오

- 영향 시나리오: `docs/product/acceptance/...` 또는 `인수 시나리오 영향 없음`
- 시나리오 변경: 있음/없음
- 변경 이유:

## 검증

-
```

작은 문서 PR은 모든 항목을 길게 쓰지 않아도 된다. 다만 `분류`, `사용자-facing 영향`,
`후속 작업`, `검증`이 비어 있으면 릴리즈 전 스냅샷에서 다시 추적해야 하므로 짧게라도
남긴다.
