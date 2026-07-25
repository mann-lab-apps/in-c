# 브라우저 호환성 smoke 기준

Chrome, Safari, Firefox에서 정적 사이트의 핵심 흐름이 같은지 10분 안에 확인하는
최소 기준이다. `smoke`는 주요 기능이 바로 막히지 않는지만 빠르게 확인하는 검증을
뜻한다. 실행하지 않은 항목은 통과로 추정하지 않고 `미실행`으로 기록한다.

## 실행 전 기록

- 대상 URL과 환경: 로컬 preview / production
- 기준 브랜치와 commit SHA
- 운영체제와 버전
- 브라우저 이름과 버전
- 확인 시각과 확인자

로컬에서 확인할 때는 `npm run site:build` 뒤 `npm run site:preview`를 실행한다.
production 확인은 배포 승인을 받은 뒤에만 진행한다.

## 브라우저별 공통 체크리스트

각 항목을 Chrome, Safari, Firefox에서 한 번씩 실행한다.

| 확인 항목 | 실행 방법 | 기대 결과 |
| --- | --- | --- |
| module script | 홈과 `columns.html`, `compositions.html`을 열고 개발자 도구의 Console을 확인한다. | 화면 콘텐츠가 표시되고 module script 로딩 오류가 없다. |
| fetch | 홈의 다운로드 영역과 Compositions 목록을 확인하고 Network를 확인한다. | `download-manifest.json`, `compositions-catalog.json` 요청이 성공하고 데이터가 표시된다. |
| 목록 필터 | Compositions에서 검색어, 난이도, 태그 필터를 각각 바꾼다. | 목록이 조건에 맞게 바뀌고 필터를 초기화하면 전체 목록으로 돌아온다. |
| query 상세 | Compositions 항목을 열어 `?score=<slug>` URL을 새 탭에서 다시 열고, Columns 항목도 `?column=<slug>`로 확인한다. | 새 탭에서도 해당 상세가 선택되고 잘못된 query 값은 페이지 전체를 깨뜨리지 않는다. |
| 기본 이동 | 홈에서 Columns와 Compositions로 이동한 뒤 브라우저 뒤로 가기를 실행한다. | 링크와 뒤로 가기가 동작하고 가로 스크롤이나 읽기 불가능한 겹침이 없다. |

개발자 도구를 열 수 없으면 화면 결과를 확인하고 Console 또는 Network 항목은
`미실행`으로 남긴다. 외부 분석 요청이 콘텐츠 차단 기능으로 막힌 경우 사이트의
핵심 콘텐츠와 구분해 기록한다.

## 판정 기준

- `통과`: 해당 브라우저의 모든 항목이 기대 결과와 같다.
- `조건부 통과`: 핵심 탐색은 가능하고, 사용자 흐름을 막지 않는 차이만 있으며
  원인과 후속 이슈가 기록되어 있다.
- `실패`: 페이지가 열리지 않거나, 콘텐츠를 가져오지 못하거나, 필터 또는 query
  상세 흐름이 막힌다.
- `미실행`: 확인하지 않았거나 근거를 남길 수 없다.

한 브라우저라도 `실패`이면 전체 판정을 `통과`로 기록하지 않는다. 실패 시 URL,
재현 순서, 사용자 영향, Console 오류 또는 스크린샷, 후속 이슈를 남긴다. 토큰,
개인정보, 로컬 파일 경로는 근거에 포함하지 않는다.

## Evidence 기록 양식

아래 표를 날짜별 기록 문서나 GitHub 이슈에 복사한다.

```markdown
## 브라우저 호환성 smoke: YYYY-MM-DD

- 대상 URL/환경:
- 기준 브랜치/commit SHA:
- 확인 시각/확인자:

| 브라우저 | 운영체제 | module script | fetch | 목록 필터 | query 상세 | 기본 이동 | 판정 | 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chrome 버전 | OS 버전 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 |  | URL, 로그 또는 스크린샷 |
| Safari 버전 | OS 버전 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 |  |  |
| Firefox 버전 | OS 버전 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 |  |  |

- 전체 판정: 통과 / 조건부 통과 / 실패 / 미실행
- 사용자 영향:
- 브라우저별 차이:
- 후속 이슈:
```

## 관련 문서

- 작은 화면 확인: [모바일 viewport 사이트 수동 QA](mobile-viewport-manual-qa.md)
- 배포 후 전체 확인: [Production smoke evidence 기록 양식](production-smoke-evidence-template.md)
- 출시 판정: [Release Readiness Checklist](release-readiness-checklist.md)
- 운영 절차: [프로덕션 운영 플레이북](../operations/production-playbook.md)
