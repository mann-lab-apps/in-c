# 383 — Tooltip 잔류 수정

실제 ff-to-p 경로에서 이전 글자 영역과 다음 버튼이 겹쳐 manual Tooltip 두 개가 남았다. 공통 DOM 검사4개와 실제 native pointer-red 실패를 보존했다. 추가 IME 및 내부 clip red도 별도 기록했다.

공통 Tooltip의 문서별 단일 표시 소유권과 생명주기를 수정했다. 새 trigger가 표시를 넘겨받고, 숨김/창 이탈/화면 및 내부 scroll clip에서 닫는다. keyboard 및 hover 설명·클릭 통과·disabled 안내·aria-describedby·Escape focus 유지, IME 예외를 보존한다. 공개 API/토큰/CSS/브랜드/기보/명령 모델을 바꾸지 않았다.

공통 UI9 files/88 tests와 현재 production build(typecheck 포함) 통과. 실제 16조건(960/1400,light/dark,100/200%,fine/coarse emulation)에서 visible 최대1 및 이탈 뒤0을 확인했다. 모든 조건의 실제 셈여림 적용/undo/redo/native snapshot이 정확하며, 입력 toggle과 Escape의 입력 모드 보존, disabled pause hover도 확인했다. 별도 pointer-only16경로와 전체 history16경로의 범위는 구분한다. source/build before/after hashes 일치, 대표 light 정상/ dark200% 캡처를 직접 검토했다.

기존 실패·도구 setup 오류는 tooling-notes.md에 보존한다. CSS shorthand를 확장하지 않는 jsdom과 background rAF에 대한 검증기 수정은 제품 원인과 구분했다. 기존 미커밋 변경과 다른 앱·피아노 프로세스를 보존했고, 전용 QA 프로세스1개만 정리했다. 사용자 설정·물리 IME·OS dialog·touch 장치·SR·청취 검증은 하지 않았다.

다음은 beam-owned 줄기/빔 및 타이, 이어 cross-system tie와 최신 피아노 통합이다. 전체 suite는 네 슬라이스 변경을 모은 뒤 실행한다. 목표는 active이며 한 슬라이스 통과로 완료/paused 처리하지 않았다. 커밋/푸시/릴리즈/버전/iOS metadata/다른 worktree 변경 없음.
