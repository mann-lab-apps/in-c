# 첫 30명 베타 사용자 성공 지표

작성일: 2026-07-16

## 판단 원칙

첫 30명 베타는 전환율 최적화가 아니라 흐름이 실제로 이해되는지 확인하는 단계다.
숫자는 방향을 알려주는 신호로만 보고, 막힌 이유는 관찰 테스트와 GitHub 제보로
확인한다.

## 성공 기준

| 흐름 | 정량 신호 | 정성 신호 | 성공 판정 |
| --- | --- | --- | --- |
| Columns | `column_view` 이후 관련 작품/악보 링크 클릭 | 사용자가 다음에 들어볼 질문을 말할 수 있음 | 글 3개 이상에서 다음 행동이 반복된다 |
| Compositions | `composition_view` 이후 `open_in_chromatics` 또는 `composition_download` | 악보별 첫 행동이 이해됨 | 최소 3개 악보에서 열기/다운로드가 발생한다 |
| 다운로드 | `download_primary` 또는 `download_platform` 클릭 | 설치 신뢰 문구와 서명 상태를 이해함 | GitHub Releases 우회가 설명 부족 때문인지 확인된다 |
| 첫 악보 | 새 악보 생성부터 MusicXML 저장까지 완료 | 실패 시 어디서 막혔는지 말할 수 있음 | 5분 안 성공자가 절반 이상이거나 막힌 단계가 명확하다 |
| 피드백 | `feedback_submit` 또는 `github_issue_link` | 개인정보 없이 재현 정보를 남김 | 제보가 버그/콘텐츠/제안으로 구분된다 |

## 30명 미만일 때 해석 금지

- 전환율을 제품-시장 적합성 근거로 쓰지 않는다.
- 특정 Columns나 악보의 클릭 수를 콘텐츠 품질 결론으로 단정하지 않는다.
- 다운로드 수를 활성 사용으로 해석하지 않는다.
- GitHub issue 수가 적다고 문제가 없다고 보지 않는다.

## 리뷰 루틴

| 시점 | 확인 항목 | 산출물 |
| --- | --- | --- |
| 매주 | GA4 이벤트가 0으로 깨진 항목이 없는지 확인 | 운영 메모 |
| 베타 10명 | 첫 악보 막힘 단계와 주요 질문 정리 | 후속 이슈 |
| 베타 30명 | Columns, Compositions, 다운로드, 첫 악보 성공 기준 재판정 | 제품 결정 로그 |

## 연결 문서

- [`analytics-events.md`](analytics-events.md)
- [`beta-recruiting-scope.md`](beta-recruiting-scope.md)
- [`../research/first-score-usability-script.md`](../research/first-score-usability-script.md)
- [`../research/decision-log-template.md`](../research/decision-log-template.md)

## GitHub 이슈 연결

- #378 첫 30명 베타 사용자 성공 지표 정의
- #330 사용자 여정별 피드백 질문과 노출 위치 확장
- #360 MusicXML 외부 샘플 호환성 테스트 후보 목록 작성
- #363 브라우저 호환성 smoke 기준 정리
