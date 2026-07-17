# GA4 Reporting Plan

작성일: 2026-07-14

## 결론

현재 트래픽 규모에서는 GA4 콘솔 수동 확인을 유지한다. 자동 수집과 스프레드시트
리포트는 반복 확인 비용이 생기거나 사용자 수가 늘어났을 때 진행한다.

## 자동화 시작 기준

다음 중 하나가 2주 이상 반복되면 GA4 Data API + Google Spreadsheet 리포트를
구현한다.

- 7일 활성 사용자가 100명 이상이다.
- 특정 날짜의 사용자 수가 직전 7일 평균의 3배 이상이고, 원인을 매번 수동으로
  확인해야 한다.
- Columns, Compositions, Community, 공연 배너 간 이동 흐름을 주간으로
  비교해야 한다.
- GitHub Releases 다운로드 수와 GA4 `download_*` 이벤트를 정기적으로 대조해야 한다.
- 사용자 유입 채널이나 랜딩 페이지를 외부 보고서에 반복 제출해야 한다.

## 수집할 지표

일별 기본 지표:

- `date`
- `activeUsers`
- `sessions`
- `screenPageViews`
- `eventCount`
- `newUsers`

차원:

- `sessionDefaultChannelGroup`
- `pagePath`
- `country`
- `eventName`

핵심 이벤트:

- `download_primary`
- `download_platform`
- `column_view`
- `column_read_complete`
- `composition_view`
- `open_in_chromatics`
- `composition_download`
- `work_view`
- `promotion_click`
- `community_view`
- `feedback_submit`

## Spreadsheet 구조

권장 sheet:

- `daily_summary`: 날짜별 active users, sessions, page views, event count.
- `events`: 날짜, eventName, count.
- `landing_pages`: 날짜, pagePath, active users, sessions.
- `channels`: 날짜, channel group, active users, sessions.
- `alerts`: 급증/급감 규칙, 감지 시각, 운영 메모.

## 알림 규칙

초기에는 알림을 보내지 않고 `alerts` sheet에 기록한다. 다음 조건 중 하나가 반복되면
Slack, Discord, 또는 이메일 알림을 붙인다.

- 전일 active users가 직전 7일 평균의 3배 이상.
- `download_*` 이벤트가 2일 연속 0.
- `open_in_chromatics` 또는 `composition_download`가 Compositions 조회 대비 5% 미만.
- `github_issue_link` 클릭이 급증.

## 구현 방식

1. Google Cloud project와 GA4 Data API access를 사용자 승인 후 준비한다.
2. 서비스 계정 또는 OAuth 방식을 정한다.
3. GitHub Actions scheduled workflow 또는 로컬 운영 스크립트 중 하나를 선택한다.
4. Google Sheets API 쓰기 권한을 최소 범위로 부여한다.
5. 실패해도 사이트 기능에 영향이 없도록 리포트 작업은 완전히 분리한다.

## 보류 사유

2026-07-13 스파이크는 총 18명 규모였고, 현재는 GA4 콘솔 수동 확인으로 충분하다.
자동화를 지금 만들면 운영 복잡도가 지표 가치보다 커질 수 있다.
