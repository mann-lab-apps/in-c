# Score R2 반환

상태: `implemented-awaiting-review`.

띠로리 스코어의 Product Design R2 S01~S03을 실제 Flutter 제품과 PDFium
렌더러에 적용했다. 이 반환은 정적 디자인 시안이 아니라 `InCSheetApp`과
실제 PDF fixture를 연 위젯 렌더러의 결과다. 물리 iOS 기기, VoiceOver,
Apple Pencil, 페달, 실제 오디오 출력은 아직 이 증거에 포함되지 않는다.

## 기준과 범위

- 디자인 기준: `product-design-r2`, `revision.json` SHA-256
  `af56b0a3ca6e25b9928835645562f5056cfa16553f2881bdb9750df37636f416`
- 시작 HEAD: `827ad18203e673b1e923d00cbcf0fd7f3af755d7`
- 제품 상태: 미커밋 변경. R1 manifest나 동시 진행 중인 디자인 시스템 파일은
  재생성하거나 변경하지 않았다.
- 공통 변경: 없음. 기존 `ddirori_ui`의 Button, IconButton, Sheet, inline
  message와 progress를 앱 adapter가 조합한다.

## 적용과 보존

| R2 | 실제 적용 | 보존한 계약 |
| --- | --- | --- |
| S01 | 악보함 제품 서명 아래의 여백을 줄이고 현재 라이브러리 전환과 곡 수를 한 줄로 정리 | 검색, 정렬, 필터, 즐겨찾기, 핀, 가져오기와 선택/일괄 편집 상태 |
| S02 | 기존 R1 선택 및 일괄 저장 경로를 유지 | draft/원본 분리, 실패 시 입력·선택 보존, 성공 후 반영 |
| S03 | 읽기/주석 입력, 연습 진입, 공연 제한을 별도 명령으로 배치하고 현재 주석 도구·옵션·undo/redo를 지면 가까이에 배치 | PDF 좌표, crop, zoom, 페이지 순서/원본 mapping, 주석·redo·공연 quick action 정책 |

주석은 저장 성공 뒤에만 라이브러리 모델을 공개한다. 저장 중에는 중복 필기,
되돌리기/다시 실행, 페이지 이동과 뒤로가기를 막고 실패하면 기존 레이어를
유지한 채 `주석 다시 저장`을 제공한다. 파일을 교체하거나 A-B-A로 돌아온
경우 이전 PDF의 늦은 page callback은 현재 문서 상태를 덮지 않는다.

도구를 숨겨도 복원 버튼과 하단 페이지 이동은 남는다. 좁은 화면과 큰 글자에서는
명령 줄이 가로 스크롤되고 주석의 전체 palette/stamp/text/layer 옵션은 sheet로
옮긴다. 옵션 수를 R2 시안의 subset으로 축소하지 않았다.

## 실제 화면 증거

`screens/`는 PDFium native engine으로 연 실제 fixture의 PNG/조건 JSON이다.
각 JSON은 PDF 지면 내부의 dark ink sample을 기록한다. UI 아이콘은 테스트에서
Material icon font를 별도로 로드했다.

- `read-*`: 3쪽 `short-score.pdf`, 390/840, light/dark, 200% 글자 포함
- `annotation-*`: 같은 문서의 주석 입력/현재 도구 상태. 검은 안내는 실제
  입력 모드 feedback이며 저장 성공을 주장하지 않는다.
- `performance-*`: 실제 공연 진입/종료 상태
- `annotation-saved-real-pdf`: 실제 pointer stroke 저장 실패→retry→undo/redo
  흐름 뒤의 동일 PDF 문서
- `long-scan-90-page59`: 90쪽 `long-scan-like-score.pdf`의 crop/숨김 도구/
  하단 페이지 이동 후 59쪽

## 검증과 차이

- R2 기준 해시 검사: 시작 시 590 files PASS. 구현 후 제품/return 변화는 의도된
  차이로 기록하며 historical manifest를 재작성하지 않는다.
- 실제 native PDF widget 검사: 8 PASS. 3쪽/90쪽 PDF, 주석 좌표·실패·retry,
  undo/redo, 원본 바이트 보존, keyboard page turn, source replacement/A-B-A
  stale callback 차단을 포함한다.
- iOS metadata: `source.state: pending`, `content.reviewed: false` 유지.
  `prepare_ios_metadata ... mode:check` PASS.
- R2는 리뷰의 정적 페이지 크기나 색 subset을 PDF engine 설정으로 반입하지
  않는다. 실제 viewer의 display mode, zoom, crop, performance 허용 정책이
  우선한다.

## 미검수

- iPhone/iPad 후보 build에서 실제 PDFium 렌더링, safe area, VoiceOver, Korean IME
- 손가락/Apple Pencil/S Pen 필기감과 Bluetooth/USB pedal cadence
- 메트로놈·드론·linked audio의 실제 출력 경로와 A-B timing
- 실제 Files/iCloud provider, 메모리 압박, 장시간 공연
- Store screenshot, metadata pinning, signing, upload/release

세부 source hash, 명령, 적용 backlog와 manual 범위는
[handoff.yaml](handoff.yaml)에 기록한다.
