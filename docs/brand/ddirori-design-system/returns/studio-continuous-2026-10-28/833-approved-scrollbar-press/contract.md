# 833 — 승인된 네이티브 스크롤바 press 정책

사용자는 822 질문에 “일반 스크롤바와 통일: 누르면 추적 중단”을 선택했다. overlay thumb의 무이동 클릭도 즉시 수동 viewport 소유권을 얻는다. 내용 클릭과 공개 따라가기 복귀는 유지한다. 이전 승인 대기 기록과 미적용 828 시안은 역사적 증거로 그대로 둔다.

범위는 기존 observeDocumentScrollbarIntent와 관련 계약 테스트다. 원래 classic gutter 주 버튼 정책을 유지하고, clientWidth 안쪽 overlay는 실제 HTML target/body paint box/scroll range로 구분한다. 임의 OS 설정·스크롤바 폭·RAF/ms 지연을 추가하지 않는다. 기존 tracker의 contain/소수점/touch 계약, 최신 830 Tooltip과 831 기호 focus 수정, 점수/native/undo/draft·glyph·출력을 보존한다.

| 수용 기준 | 증거 |
| --- | --- |
| track/무이동 thumb/drag는 pointerdown에서 즉시 중단 | 새 단위·hook/App + 실제 native 장면 |
| 지연 scroll/resize/새 focus가 예전 reveal을 되살리지 않음 | 이전 실패와 동일한 실제 native track/resize, frame 대조군 |
| body/content/dock 클릭·내부 wheel·zero wheel은 유지 | 단위·App·actual content/contained controls |
| 공개 following으로 실제 cursor 노출 복구 | 실제 thumb click/drag 장면 |
| 선택/Native/history0 보존 | 실제 저장·재열기와 관련 App |
| 최신 공통 UI/기보 계약 보존 | type/build/profile/fixed·전체 suite·해시 |

변경 전 새 정책 red를 기록한 뒤 observer만 좁게 이행한다. 구정책의 기대값은 승인된 의미에 맞게 명시적으로 이전하고 기존 실패/검사/캡처를 삭제하지 않는다. 828의 전체 App/shared UI를 원본에 복사하지 않는다. 검증은 해시 고정 복제본·자체 Electron/IPC·임시 악보만 사용하고 사용자 앱/live out/다른 worktree·브랜드·모바일 변경은 보존한다. 커밋·푸시·릴리즈·버전 변경은 승인 범위가 아니다. 목표 도구 paused/재개 API 없음과 현재 턴의 실제 작업을 구분한다. 829 touch1400 movement 실패는 이 정책의 해결 범위가 아니다.
