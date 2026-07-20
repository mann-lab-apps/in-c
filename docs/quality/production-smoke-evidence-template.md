# Production smoke evidence 기록 양식

배포 뒤 프로덕션의 핵심 흐름을 확인하고 결과를 같은 형식으로 남기는 양식이다.
확인하지 않은 항목은 통과로 추정하지 않고 `미실행`으로 기록한다.

아래 내용을 날짜별 기록 문서나 GitHub 이슈에 복사해 사용한다.

```markdown
# Production smoke evidence: YYYY-MM-DD

## 실행 정보

| 항목 | 값 |
| --- | --- |
| 확인 시각 | YYYY-MM-DD HH:mm KST |
| 확인자 |  |
| 환경 | production |
| 기준 브랜치 |  |
| 기준 커밋 SHA |  |
| 릴리즈/tag | 해당 없음 또는 URL |
| 배포 workflow | URL |

## 자동 확인

| 명령 | 결과 | 근거 |
| --- | --- | --- |
| `npm run verify:site-production` | 통과 / 실패 / 미실행 | 로그 또는 실행 URL |
| `npm run verify:analytics` | 통과 / 실패 / 미실행 | 로그 또는 실행 URL |
| `npm run verify:site-seo` | 통과 / 실패 / 미실행 | 로그 또는 실행 URL |

## 사용자 흐름 확인

| 확인 항목 | 확인 URL | 기대 결과 | 실제 결과 | 판정 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 홈 열기 | `https://in-c.mannlab.app/` | 홈이 오류 없이 열린다. |  | 통과 / 실패 / 미실행 | 스크린샷 또는 메모 |
| Columns 열기 | `https://in-c.mannlab.app/columns.html` | 목록과 공개 칼럼이 열린다. |  | 통과 / 실패 / 미실행 |  |
| Compositions 열기 | `https://in-c.mannlab.app/compositions.html` | 목록과 상세가 열린다. |  | 통과 / 실패 / 미실행 |  |
| 다운로드 확인 | manifest와 릴리즈 URL | 플랫폼 파일과 checksum 링크가 열린다. |  | 통과 / 실패 / 미실행 |  |
| 핵심 링크 확인 | 확인한 URL | CTA와 GitHub Issues 링크가 올바른 곳으로 이동한다. |  | 통과 / 실패 / 미실행 |  |
| GA4 확인 | GA4 Realtime URL | 확인 가능한 핵심 이벤트가 들어온다. |  | 통과 / 실패 / 미실행 |  |

## 최종 판정

- 판정: 통과 / 조건부 통과 / 실패
- 사용자 영향:
- 실패 또는 미실행 항목:
- 즉시 조치:
- 롤백 여부와 이유:
- 후속 담당자:
- 후속 이슈:

## Evidence Log 요약

| 날짜 | 기준 커밋 | 대상 URL | 판정 | 핵심 결과 | 상세 근거 |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | `<commit-sha>` | `https://in-c.mannlab.app/` | 통과 / 조건부 통과 / 실패 | 자동 확인 N/N, 사용자 흐름 N/N | 이 기록의 URL |
```

판정할 때는 다음 기준을 지킨다.

- 핵심 페이지, 다운로드, 개인정보 보호 페이지가 열리지 않으면 `실패`다.
- 일부 분석 이벤트처럼 사용자 흐름을 막지 않는 항목만 미확인이고 이유와 후속
  작업이 있으면 `조건부 통과`로 기록할 수 있다.
- 실행하지 않은 검증이나 근거가 없는 결과는 `통과`로 기록하지 않는다.
- 민감한 값, 접근 토큰, 개인정보는 로그와 스크린샷에 남기지 않는다.

## 관련 문서

- 브라우저별 확인: [브라우저 호환성 smoke 기준](browser-compatibility-smoke.md)
- 운영 절차와 확인 URL: [프로덕션 운영 플레이북](../operations/production-playbook.md)
- 누적 검증 결과: [Evidence Log](evidence-log.md)
- 출시 판정 기준: [Release Readiness Checklist](release-readiness-checklist.md)
