# F03 Studio · 첫 음표를 파일로 남기기

대상 `src/renderer/src/App.tsx`·editor/new-score/file-lifecycle·project·Electron bridge. R2의 입력/선택 속성 구분과 IME 후 검증 작업이 진행 중이므로 해당 동작을 다시 만들지 않는다.

## 첫 세션

현재 시작 화면의 새 악보·MusicXML 가져오기·최근 파일·복구 진입을 유지한다. 새 악보를 주요 행동으로 두고 필수 설정을 확인한 뒤 즉시 빈 지면으로 진입한다. 기존 solo-melody·다장조·4/4·8마디 예제를 출발점으로 하되 전체 템플릿/조표/박자/파트·템포 설정을 삭제하지 않는다. composer ‘in-C’ 기본값을 개인의 실제 저작자로 승인한 것으로 취급하지 않는다. R3 시안은 제목과 기본 설정 관계만 보여준다.

첫 입력 안내는 실제 입력 모드·선택 위치 근처에 한 번 제공한다. 사용자가 음표/쉼표/단축키 등 기존 입력을 선택할 수 있어야 한다. R3의 ‘첫 음표 입력’ 버튼은 메모리 예제이며 제품에 새 엔진 명령·한 음짜리 제한을 추가하라는 뜻이 아니다. 실제 시작 상태의 caret/voice·음가·undo를 보존한다.

첫 프로젝트 저장은 .chromatics의 실제 save 성공을 기준으로 한다. MusicXML 사본/PDF 출력·복구 snapshot은 각각 다른 결과다. PDF 저장 성공만으로 프로젝트가 clean이 됐다고 표시하지 않는다. 저장 중 새 수정이 있으면 저장된 snapshot과 현재 dirty를 구분한다.

## 상태와 보존

| 상황 | 계약 |
| --- | --- |
| 새 악보 wizard 취소 | 기존 문서·복구본·최근 파일/selection 유지. 미확정 draft를 엔진에 반영하지 않음 |
| 기존 dirty 문서 교체 | 현행 손실 확인·저장/취소 정책 유지. 안내 편의를 위해 confirm을 생략하지 않음 |
| 한글/텍스트 입력 | 조합 중 Enter는 submit/전역 명령으로 전파하지 않음. 확정/blur·Escape 정책 R2 보존 |
| 첫 음표 | 실제 command·undo stack에서 확인. 단순 도구 선택은 완료가 아님 |
| 저장 dialog 취소 | dirty·음표·선택·undo 유지, 첫 저장 성취 없음 |
| 저장 실패 | 실제 파일 결과/error, 편집 데이터 유지·retry. 권한 원인을 확인하지 않고 설정 변경을 강요하지 않음 |
| 늦은 응답 | generation/snapshot 검사. 다른 문서/새 수정에 예전 성공을 적용하지 않음 |
| 재방문 | 최근 실제 파일/복구로 직접 진입. first-use 안내는 저장된 파일을 가리지 않음 |
| 복구본 | 실제 유효 복구본일 때만 제안. ‘복구본 열기’와 ‘파일로 저장’을 구분 |

## 구성·표시

1. 현재 공통: Text/Input/Button/IconButton/Select/Dialog·Banner/StatePanel/Progress·Bach.
2. 앱: start screen/newScoreDraft·document generation·score commands·native save·recent/recovery·keymap adapter.
3. 공통 확장: 필수 없음. 파일 bridge/명령·undo를 공통 UI에 넣지 않음.
4. 목표: 첫 행동의 우선순위·맥락성 입력 안내·실제 저장 후 첫 성취/J01 후속 안내.

neutral chrome·paper·compact32/fine·coarse48·dock 저장 폭을 유지한다. 작업창을 바흐 배경이나 온보딩 overlay로 덮지 않는다. 키보드만으로 생성→입력→저장 가능해야 한다. 초기 오류의 첫 invalid field focus, dialog 취소 trigger 복귀, 좁은 창·큰 글자에서 primary action 노출을 확인한다. 실제 shortcut은 keymap에서 읽고 임의의 타사 shortcut을 넣지 않는다.

## 수용·범위

새 문서→첫 실제 command→undo/redo→실제 프로젝트 저장→재열기 비교. 저장 취소·실패·동시 수정·다른 문서 응답·복구가 기존 계약대로 동작. MusicXML/PDF는 편집 저장과 별개. 첫 성취 feedback은 실제 결과 후 한 번이며 자동 효과음 없음.

관련 new-score/file-lifecycle/App·score-core 검사, 실제 renderer/bridge·PDF 출력 검증을 범위대로 실행. OS 저장 dialog·물리 IME·스크린리더는 별도 검수. root 테스트 실행기의 기존 실패와 분할 결과를 합쳐 통과라고 쓰지 않는다. desktop 범위에 불필요한 iOS YAML을 수정하지 않는다. [반환 규약](implementation.md)을 따른다.
