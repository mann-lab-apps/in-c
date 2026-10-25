# F02 Score · PDF를 펼치고 첫 표시까지

대상 `apps/in_c_sheet/`. 실제 SheetLibraryController/Store·SheetViewerScreen·annotation store·연습 도구가 상태를 소유한다. 진행 중인 R2 viewer chrome를 보존하고 첫 사용 진입·결과에 한정해 조합한다.

## 흐름

빈 악보함 → ‘PDF 악보 추가’ → 실제 picker → 내부 PDF 사본/메타데이터 저장 → 악보함의 해당 악보 → PDF ready → ‘주석’ → 첫 stroke → 실제 annotation persistence → 짧은 완료 안내.

PDF 추가 자체가 첫 중간 성과이며 첫 주석을 강제하지 않는다. 읽고 돌아가도 추가한 악보와 마지막 위치는 남는다. 연습 도구를 먼저 쓰려는 사용자는 기존 경로로 갈 수 있다. R3가 주석을 대표 성취로 택했다고 연습/공연 기능을 숨기지 않는다.

- 초기 화면: 공통 StatePanel+선택적 바흐, 한 주요 행동. 이미지 추가는 현재 JPG/PNG 지원 범위에서 보조 진입. HEIC/HEIF 변환은 제공하지 않음.
- 선택 취소: 오류/성공 없이 기존 목록과 포커스 유지. 파일 접근은 picker를 사용하는 순간에 처리. 첫 주석에는 마이크 권한이 필요하지 않음.
- 가져오기 중: 실제 task명/진행. 저장 중 같은 자료를 중복 추가하거나 뒤늦은 결과가 다른 library를 덮지 않게 controller에서 처리.
- 가져오기 완료: 실제 추가 개수·파일 표시명과 ‘악보 열기’. thumbnail/지면 준비 성공을 파일 복사 성공과 혼합하지 않음.
- 열기: 실제 PDF engine ready를 기다림. 손상/암호화/누락 등의 진단은 actual inspect 결과로 설명. R3의 PNG가 열린 것을 engine 성공으로 기록하지 않음.
- 주석: 읽기/주석 모드와 도구는 R2·현행 엔진 유지. 저장 실패 시 stroke/draft·페이지·zoom·선택·undo 보존, 실패 주석을 저장된 것으로 안내하지 않음.

## 외부 PDF와 재방문

네이티브 PDF 수신은 현재 `clef/shared_imports` 경로를 우선한다. 실제 import 완료 결과가 있어야 ‘받은 PDF’ 목록/문서로 이동한다. 이미 유효한 파일이 전달됐는데 첫 소개를 거쳐 파일을 다시 고르게 하지 않는다. 수동 전달 파일은 picker에서 직접 선택한다.

R3의 ‘외부 PDF 추가 완료 · Score’ persona는 수신 성공 snapshot을 미리 둔 메모리 사례다. 수신·검사·복사·persistence 자체를 실행한 증거가 아니다. Android 복수 PDF/초기 수신/실행 중 수신, iOS document open은 각 플랫폼에서 별도 검수한다. iOS Share Extension을 추가했다고 쓰지 않는다.

기존 자료가 있으면 기본 악보함·검색·최근 문서로 진입. 중단 후 돌아오면 실제 lastPage/scroll/선택·library policy를 유지. 지면을 열었다고 최근 자료의 user query를 초기화하지 않는다.

## 먼저 확인할 저장 경계

현재 importPdf/importImagesAsPdf/importSharedPdfFiles에는 목록을 바꾼 뒤 persistence를 기다리는 경로가 있다. 진행 중 R2에서 일반 `_replace`는 저장 후 모델을 publish하도록 개선된 것을 확인했다. 연결 파일 metadata에 이미 적용된 개선을 다시 요구하지 않되, 복사 파일의 수명/실패 정리는 별도 확인한다. 저장 실패·중간 파일 복사·재시도 시 실제 UI와 저장소가 어긋나지 않는지 확인한다. 기존 bulk 저장의 개선이 모든 import 경로에 적용됐다고 가정하지 않는다.

목표 계약은 ‘완료 전 성공 안내 없음, 실패 후 입력/복구 가능 자료 보존, 다음 재시도에서 성공 파일 중복 생성 방지 또는 실제 새 사본 정책 명시’다. 이를 UI가 임의 rollback·삭제로 흉내 내지 말고 기존 store/controller의 원자성·권리/사본 수명과 함께 구현한다. 현재 버그 수정 완료로 기록하지 않는다.

## 구성·접근성

1. 공통: Ddirori 상태·버튼·행·Progress·Dialog/Sheet·주석/페이지 도구.
2. 앱: first-use visibility·import result·library route·ViewerChrome/annotation 저장 adapter. PDF·좌표·gesture·파일·연습 엔진은 앱 소유.
3. 공통 확장: 필수 없음. ‘firstSuccess’ 전역 provider로 세 엔진의 완료를 추상화하지 않음.
4. 목표: 첫 단계 안내·맥락성 피드백·외부 파일 후 진입 정리, J01/J02 수동 안내.

지면 주변 도구는 R2 치수/반응형을 출발점으로 한다. 모바일 gutter16·터치48, 좁은 창/가로에서 wrap/옵션 sheet, 큰 글자200%에서도 지면 진입과 복구에 도달. 주석 색은 브랜드 accent 교체와 독립. 도구를 닫으면 실제 trigger로 focus 복귀. 파일명·제목은 표시명 전체 접근, private path 기본 비노출.

## 수용·회귀

실제 PDF3페이지/긴 스캔형 파일, picker cancel·파일 접근/형식·metadata 저장 실패·retry·부분 native 수신. 가져오기/선택/bulk 기존 회귀를 보존한다. PDF ready→주석 저장 실패→retry 후 페이지/zoom/원본·annotation/undo 확인. R2의 공연·연습·페이지 mapping을 깨지 않는다.

annotation/store/controller·viewer input/geometry/performance 관련 검사를 변경 범위에 맞춰 실행한다. OS 수신·provider·펜/손가락·페달·VoiceOver는 미실행이면 명시한다. `deployment/apps/clef/ios-metadata.yaml`의 영향 문구/scene/steps/assertions/manual을 AGENTS대로 갱신하고 mode:check. [반환 규약](implementation.md)을 따른다.
