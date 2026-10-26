# Score R3 · 악보 메모 sheet

## 적용 범위

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `악보 메모`.
- 공연·리허설·조율·악기/편성 메모의 기존 데이터를 `DdiroriPageHeader`, `DdiroriInput`, `DdiroriAdaptiveActions`, `DdiroriButton`으로 배치했다.
- 기존 lazy `ListView` 대신 단일 scroll 문서를 사용해 200% 글자에서도 저장 행동이 실제 widget tree에 유지되고 스크롤로 접근 가능하다.

## 보존 계약

- sheet 내부 문자열은 draft이며, 취소하면 기존 `SheetScoreNotes`를 변경하지 않는다.
- 저장 시에만 기존 `updateStructuredNotes` controller 경로가 실행된다.
- PDF document, 페이지·zoom·crop, 주석·undo, 연습·공연·세트리스트 상태는 변경하지 않는다.

## 자동 검증

`test/score_r2_viewer_test.dart`의
`real PDF score notes save through Ddirori inputs`는 390px 폭·200% 글자에서 실제 3쪽 PDF를 열어 다음을 확인한다.

1. `모든 도구 → 보기 옵션 → 악보 메모` 진입
2. 메모 입력과 공통 저장 행동
3. 저장 뒤 `SheetScoreNotes.performance` 반영
4. 동일한 PDF document identity 유지

이 검증은 iOS 키보드 inset, 한글 IME, VoiceOver, 실제 저장소 쓰기 실패 또는 펜/페달 동작의 증거가 아니다.
