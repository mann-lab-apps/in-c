# Studio · MuseScore 기능 차이 실행 백로그

기준 2026-11-08 · 0.1.0-alpha.39 · HEAD 8415163b36df4027a33976307db7a7384989437f. 새 도움말 UI는 미배포다.

정본은 같은 이름의 JSON이다. 이 문서와 앱의 지원 차이 장은 검증 스크립트가 생성·대조한다. 공식 [핸드북](https://handbook.musescore.org/)과 [목차](https://handbook.musescore.org/llms.txt)의 US/UK 중복을 제외한 153개 항목 중 98개를 아래 57개 상위 작업 묶음에 연결했다. 별도로 213개 하위 슬라이스를 추적한다. 나머지 55개는 상세 대조 대기이며 미지원이라고 판정하지 않았다. 목차 항목 수와 원자적 기능 수는 다르다.

현재 소스·공개 UI와 가져온 값 보존/내부 재생/교환 출력은 서로 구분한다. queued는 자동 완성 약속이 아니라 현행 확인 후 작은 구현을 선택할 후보이며, needs-design은 기존 승인 정책을 바꾸기 전 범위를 정해야 한다. 외부·물리 검수 미완은 기능 부재가 아니다. 기존 로컬 roadmap/work-queue ID로 중복을 연결했고 원격 이슈는 만들지 않았다.

[연속 실행 프롬프트](studio-musescore-next-goal-20261104.md) · [현재 설명서](studio-manual/README.md) · [공식 목차 대조 상태](studio-musescore-handbook-topics-20261104.json)

| ID | 우선순위 | 작업 | 현재 지원 | 실행 상태 | 기존 백로그 |
| --- | --- | --- | --- | --- | --- |
| SMG-001 | P0 | 위치별 빠르기의 범위 밖 입력 처리 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-002 | P1 | 사용자 지정 박자표 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-002-001 | P1 | 선택 마디 사용자 지정 박자표 입력 | 일부 지원 | done | 직접 연결 없음 |
| SMG-002-002 | P1 | 새 악보 사용자 지정 박자표 입력 | 일부 지원 | done | 직접 연결 없음 |
| SMG-002-003 | P0 | 박자표 변경의 쉼표 기호·범위 끝점 보호 | 일부 지원 | done | 직접 연결 없음 |
| SMG-003 | P1 | 박자표의 총보·이후 구간 적용 범위 | 일부 지원 | needs-design | CV1-X-SCORE-MEASURE-STRUCTURE |
| SMG-003-001 | P1 | 박자표 축소 시 authored 빠르기·코드·표현 위치 보호 | 일부 지원 | done | CV1-X-SCORE-MEASURE-STRUCTURE |
| SMG-004 | P1 | 못갖춘마디·실제 마디 길이 편집 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-004-001 | P1 | 새 악보 첫 못갖춘마디 생성 | 일부 지원 | done | 직접 연결 없음 |
| SMG-005 | P1 | 음표 앞 음자리표 직접 입력 | 별도 제품 범위 결정 | needs-design | 직접 연결 없음 |
| SMG-005-001 | P1 | 마디 안 음자리표 가져오기 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-006 | P1 | 셋잇단음표 외 비율·중첩 잇단음표 | 일부 지원 | needs-design | CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW |
| SMG-006-001 | P1 | 16분음표 다섯잇단음표 입력(5:4) | 일부 지원 | done | CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW |
| SMG-007 | P2 | 화음 구성음 선택과 부분 화음 타이 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-008 | P2 | 박·성부별 셈여림 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-008-001 | P1 | MusicXML 셈여림 위치·성부 축소의 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-008-002 | P1 | 복합·배열·음표 부착 셈여림의 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-009 | P2 | 꾸밈음 발음과 연주 시간 배분 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-010 | P1 | 파트·구간별 span 속성 편집 | 별도 제품 범위 결정 | needs-design | CV1-X-SPAN-PROPERTIES, CV1-X-PART-LAYOUT |
| SMG-011 | P2 | 악보 위 직접 배치·핸들 조절 | 일부 지원 | in-progress | CV1-X-SPAN-PROPERTIES |
| SMG-012 | P2 | 팔레트 드래그 적용·사용자 팔레트 | 일부 지원 | in-progress | MS-NOTATION-001 |
| SMG-012-008 | P2 | 네 표현 기호를 음표에 끌어 추가 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-012-001 | P2 | 음자리표 타일의 한 마디 드래그 적용 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-013 | P2 | 단축키 사용자 재지정 | 일부 지원 | in-progress | CV1-X-COMMANDS-SHORTCUTS |
| SMG-013-004 | P2 | 기존 삭제 명령의 단축키 재지정·해제·복원 | 일부 지원 | done | CV1-X-COMMANDS-SHORTCUTS |
| SMG-013-001 | P1 | 기본 T 단축키의 수식키 소유권 | 일부 지원 | done | CV1-X-COMMANDS-SHORTCUTS |
| SMG-014 | P2 | 사용자 템플릿·악보 스타일 저장 | 일부 지원 | needs-audit | CV1-X-TEMPLATES-STYLES |
| SMG-014-001 | P2 | 이름 있는 로컬 출력 설정 프리셋 | 일부 지원 | done | CV1-X-TEMPLATES-STYLES |
| SMG-015 | P1 | 실음·기보음 화면 전환 | 별도 제품 범위 결정 | needs-design | CV1-X-CONCERT-VIEW |
| SMG-016 | P2 | 메트로놈 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-017 | P2 | 선택 구간 루프 재생 | 일부 지원 | needs-design | MS-PLAYBACK-001 |
| SMG-017-001 | P2 | 연속 구간·총보의 세션 연습 루프 | 일부 지원 | done | MS-PLAYBACK-001 |
| SMG-018 | P3 | MIDI 키보드 입력 | 직접 UI 없음 | needs-design | MS-MIDI-001, CV1-X-MIDI-INPUT |
| SMG-019 | P2 | 음높이를 먼저 고르는 입력 모드 | 직접 UI 없음 | needs-design | CV1-X-PITCH-FIRST |
| SMG-020 | P2 | 줄기·빔·리듬 묶음 수동 편집 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-021 | P3 | 추가 음가 범위 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-022 | P2 | 보표 사이 이동·교차보표 기보 | 일부 지원 | needs-design | CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW |
| SMG-023 | P2 | 여러 마디 쉼표·빈 보표 숨김 | 일부 지원 | needs-audit | CV1-X-PART-LAYOUT |
| SMG-024 | P2 | D.C./D.S./Coda와 마디 반복 기호 | 일부 지원 | needs-design | MS-NOTATION-001 |
| SMG-025 | P3 | 음표 머리·음역·추가 표현 기호 | 추가 조사 필요 | needs-audit | 직접 연결 없음 |
| SMG-026 | P3 | 기타 TAB·프렛보드·주법 편집 | 일부 지원 | needs-audit | 직접 연결 없음 |
| SMG-027 | P3 | 타악기 전용 입력·킷 편집 | 일부 지원 | needs-audit | 직접 연결 없음 |
| SMG-028 | P2 | 고급 글자 서식·운지·숫자저음 | 일부 지원 | needs-audit | 직접 연결 없음 |
| SMG-028-001 | P2 | 숫자저음 MusicXML 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-029 | P3 | 프레임·이미지·악장 구분 | 추가 조사 필요 | needs-audit | 직접 연결 없음 |
| SMG-029-001 | P2 | 페이지 이미지 MusicXML 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-030 | P2 | 머리말·꼬리말·마디 번호 설정 | 일부 지원 | needs-audit | 직접 연결 없음 |
| SMG-030-001 | P1 | 원본 마디 번호와 내부 주소의 가져오기 계약 | 일부 지원 | done | 직접 연결 없음 |
| SMG-030-002 | P1 | 가져오기 전 프로젝트 구조 검증 | 일부 지원 | done | 직접 연결 없음 |
| SMG-031 | P2 | SVG 제품 내보내기 | 직접 UI 없음 | needs-design | CV1-X-IMAGE-EXPORT |
| SMG-032 | P3 | 오디오 파일 내보내기 | 직접 UI 없음 | needs-design | 직접 연결 없음 |
| SMG-033 | P3 | 외부 음원·SoundFont·VST | 직접 UI 없음 | needs-design | 직접 연결 없음 |
| SMG-034 | P2 | 이름 있는 작업 공간·자유 도킹 | 일부 지원 | needs-design | CV1-X-WORKSPACE |
| SMG-035 | P2 | 복수 선택 속성·고급 선택/탐색 | 일부 지원 | needs-audit | CV1-X-OBJECT-FILTERS, CV1-X-OBJECT-CLIPBOARD |
| SMG-035-004 | P2 | 마디 내용 지우기와 마디 제거의 키 정책 | 일부 지원 | needs-design | CV1-X-OBJECT-FILTERS, CV1-X-OBJECT-CLIPBOARD |
| SMG-036 | P1 | 외부 MusicXML 이조·중첩 반복 호환성 | 외부 검증 미완 | external-qa | MS-MUSICXML-001, CV1-MXML-MUSESCORE-GUI-SNAPSHOT |
| SMG-037 | P2 | 스크린리더·점자·물리 입력 검수 | 실제 검수 미완 | needs-audit | 직접 연결 없음 |
| SMG-038 | P3 | 온라인 게시·영상·플러그인 생태계 | 별도 제품 범위 결정 | deferred | 직접 연결 없음 |
| SMG-039 | P0 | 앱 내 현재 지원 범위·미지원 목록 열람 | 일부 지원 | done | MS-HELP-001 |
| SMG-040 | P1 | 새 악보 마디 수 입력 초안 | 일부 지원 | done | 직접 연결 없음 |
| SMG-006-002 | P2 | 고정 2:3 잇단음표 입력 | 일부 지원 | done | 직접 연결 없음 |
| SMG-006-003 | P2 | 고정 7:4 잇단음표 입력 | 일부 지원 | done | 직접 연결 없음 |
| SMG-012-002 | P2 | 팔레트 가족 순서와 로컬 저장 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-006-004 | P2 | 잇단음표 도구의 적용·해제·취소 문맥 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-004-002 | P1 | 기존 모든 보표의 빈 첫 마디 못갖춘 변환 | 일부 지원 | done | 직접 연결 없음 |
| SMG-041 | P2 | 특수 마디선 스타일·범위 편집 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-041-001 | P2 | 가져온 특수 마디선 스타일 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-034-001 | P2 | 이름 있는 도크 배치 저장·복원 | 일부 지원 | done | CV1-X-WORKSPACE |
| SMG-020-001 | P2 | 가져온 유음고 음표의 줄기 숨김 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-012-003 | P2 | 기존 장·단조30프리셋의 조표 타일 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-016-001 | P2 | 기본꺼짐 독립 연습 메트로놈 | 일부 지원 | done | 직접 연결 없음 |
| SMG-019-001 | P2 | native 입력 설정의 미지원 방식 안내 | 일부 지원 | done | CV1-X-PITCH-FIRST |
| SMG-016-002 | P2 | 메트로놈 클릭 오류의 재생·자원 정리 | 일부 지원 | done | 직접 연결 없음 |
| SMG-012-004 | P2 | 조표 타일의 놓은 보표·마디 드래그 적용 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-023-001 | P2 | MusicXML 온마디 쉼표의 생략된 graphic type 가져오기 | 일부 지원 | done | CV1-X-PART-LAYOUT |
| SMG-035-001 | P2 | 악보 포인터 초점의 SVG 글꼴 상자 테두리 제거 | 일부 지원 | done | CV1-X-OBJECT-FILTERS, CV1-X-OBJECT-CLIPBOARD |
| SMG-023-002 | P2 | 온마디 쉼표의 원본·모델 길이 차이 안내 | 일부 지원 | done | CV1-X-PART-LAYOUT |
| SMG-024-001 | P2 | 명시적 MusicXML 재생 점프·마커 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-012-005 | P2 | 기존 네 박자표 preset의 직접 팔레트 적용 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-012-006 | P2 | 기존 박자표 타일의 마디 대상 끌기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-001 | P2 | 특수 음표 머리 모양·채움·괄호 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-012-007 | P2 | 기존 셈여림 타일의 안전한 마디 대상 끌기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-002 | P2 | 아르페지오·글리산도 등 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-023-003 | P2 | 여러 마디 쉼표 묶음의 가져오기 손실 안내 | 일부 지원 | done | CV1-X-PART-LAYOUT |
| SMG-011-001 | P2 | 수동 배치 슬러·헤어핀의 키보드 공통 이동 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-030-003 | P1 | 마디 번호 문구·표시설정의 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-001-001 | P0 | 기존 모델 빠르기의 MusicXML 왕복 보존 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-001-002 | P0 | 기존 빠르기와 새 입력 범위의 안내 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-012-009 | P2 | 장식음4종의 이벤트 드래그 추가 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-012-010 | P2 | 실제 잉크에 따른 드래그 표적 소유권 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-012-011 | P2 | 장식음 표시 순서의 MusicXML 왕복 보존 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-001-003 | P1 | MIDI 빠르기의 실제 표현 범위 검증 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-030-004 | P1 | 실제 첫 마디의 전역 빠르기·리듬 표기 보존 | 일부 지원 | done | 직접 연결 없음 |
| SMG-028-002 | P2 | 자동 표현 글자의 용지 끝 배치 | 일부 지원 | done | 직접 연결 없음 |
| SMG-030-005 | P1 | 볼타 소유권과 출력 페이지 배치 | 일부 지원 | done | 직접 연결 없음 |
| SMG-030-006 | P1 | 반복 횟수 글자의 출력 소유권 | 일부 지원 | done | 직접 연결 없음 |
| SMG-030-007 | P1 | 저작권 고지 메타데이터·크레디트의 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-013-002 | P1 | 기본 재생 Space의 수식키 소유권 | 일부 지원 | done | CV1-X-COMMANDS-SHORTCUTS |
| SMG-030-008 | P1 | 0번호 못갖춘마디와 타이의 실제 가져오기/출력 | 일부 지원 | done | 직접 연결 없음 |
| SMG-030-009 | P1 | 박자표 편집 시 유효한 원본 마디 번호 보존 | 일부 지원 | done | CV1-X-SCORE-MEASURE-STRUCTURE |
| SMG-035-002 | P2 | 선택·필터·복사의 현재 지원 범위 안내 | 일부 지원 | done | CV1-X-OBJECT-FILTERS, CV1-X-OBJECT-CLIPBOARD |
| SMG-035-003 | P2 | 같은 마디 단순 음표/쉼표 잘라내기 | 일부 지원 | done | CV1-X-OBJECT-FILTERS, CV1-X-OBJECT-CLIPBOARD |
| SMG-026-001 | P2 | 코드 프렛보드 그림의 MusicXML 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-025-003 | P2 | 페르마타·숨표·중지표의 현재 지원 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-013-003 | P2 | 편집5명령의 실제 단축키 재지정 | 일부 지원 | done | CV1-X-COMMANDS-SHORTCUTS |
| SMG-028-003 | P1 | MusicXML 여러 글자 조각의 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-011-002 | P2 | 수동 슬러·헤어핀의 마우스 공통 이동 | 일부 지원 | done | CV1-X-SPAN-PROPERTIES |
| SMG-012-012 | P2 | 정지 기호 3종의 팔레트 드래그 적용 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-030-010 | P1 | 조표·마디 속성·성부 편집 시 원본 번호 보존 | 일부 지원 | done | CV1-X-SCORE-MEASURE-STRUCTURE |
| SMG-028-004 | P2 | 단일 보표 글자의 굵게 서식 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-042 | P2 | 기존 음표의 성부 이동·성부 교환 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-035-005 | P2 | 입력 성부 전환과 음표 이동의 안내 구분 | 일부 지원 | done | 직접 연결 없음 |
| SMG-043 | P2 | 보표·악기 괄호와 파트 묶음 편집 | 직접 UI 없음 | needs-design | 직접 연결 없음 |
| SMG-043-001 | P2 | MusicXML 파트 묶음 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-044 | P2 | 조표의 총보 범위·가시성·비전통 조성 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-045 | P2 | 옥타브 선의 선택 속성·모양 편집 | 일부 지원 | needs-design | 직접 연결 없음 |
| SMG-045-001 | P2 | 옥타브 선의 보표·시간 범위와 해제 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-043-002 | P2 | MusicXML 비기본 다중 보표 묶음 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-039-001 | P1 | 설명서 과제 제목과 검색 연결 복원 | 일부 지원 | done | MS-HELP-001 |
| SMG-039-002 | P1 | 설명서 연속 문단의 읽기 간격 | 일부 지원 | done | MS-HELP-001 |
| SMG-044-001 | P1 | 미지원 선법·비전통 조표 가져오기 실패 안내 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-042-001 | P1 | 단일 일반 음표를 같은 마디의 빈 성부로 이동 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-042-002 | P1 | 같은 박의 다중 성부 쉼표·음표 잉크 간격 감사 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-046 | P2 | 보표 유형·줄 수·개별 크기 설정 | 직접 UI 없음 | needs-design | CV1-X-ENGRAVING |
| SMG-046-001 | P1 | MusicXML 비5선 보표의 줄 수 손실 안내 | 직접 UI 없음 | done | CV1-X-ENGRAVING |
| SMG-042-003 | P2 | 자동 배치된 점 쉼표의 부착·출력 회귀 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-042-004 | P1 | 성부 이동 시 헤어핀 적용·MIDI 보존 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-046-002 | P2 | MusicXML 개별 보표·기보 크기 손실 안내 | 직접 UI 없음 | done | CV1-X-ENGRAVING |
| SMG-009-001 | P1 | 꾸밈음 MIDI 발음 누락의 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-025-004 | P2 | 트릴·단음 트레몰로의 MIDI 표현 손실 안내 감사 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-025-005 | P1 | 꼬리 있는 단음 트레몰로의 내부 연주 간격 감사 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-034-002 | P2 | 믹서 포커스에서 상단 도구로 돌아가는 스크롤 경로 감사 | 일부 지원 | done | CV1-X-WORKSPACE |
| SMG-025-006 | P2 | 네 장식음의 표기·내부 연주·MIDI 지원 구분 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-042-005 | P1 | 대상 빈 성부의 쉼표 끝점 연결 안내 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-039-003 | P1 | 설명서 표의 한국어 표제 어절 줄바꿈 | 일부 지원 | done | MS-HELP-001 |
| SMG-039-004 | P1 | 설명서 내부 읽기 링크의 단어 줄바꿈 | 일부 지원 | done | MS-HELP-001 |
| SMG-039-005 | P1 | 도움말 이동 예약과 새 수동 화면 소유권 | 일부 지원 | done | MS-HELP-001 |
| SMG-039-006 | P2 | 창 비활성·숨김 전후 도움말 예약 이동 조사 | 일부 지원 | done | MS-HELP-001 |
| SMG-028-005 | P2 | 가사 입력 키와 핸드북 차이 안내 | 일부 지원 | done | MS-HELP-001 |
| SMG-028-006 | P2 | 가사 직접 입력의 문자·확정·undo·재열기 검증 | 일부 지원 | done | MS-HELP-001 |
| SMG-004-003 | P2 | 마디 우클릭 속성 진입과 지원 범위 | 일부 지원 | done | 직접 연결 없음 |
| SMG-047 | P2 | 마디별 가로 간격·고정 폭 설정 | 별도 제품 범위 결정 | needs-design | 직접 연결 없음 |
| SMG-047-001 | P2 | MusicXML 마디 폭 지정의 보존·안내 조사 | 일부 지원 | done | 직접 연결 없음 |
| SMG-034-003 | P1 | 작업대 예약 포커스와 새 수동 이동 | 일부 지원 | done | CV1-X-WORKSPACE |
| SMG-034-004 | P1 | 재생 도구 초점과 예약 커서 화면 추적 | 일부 지원 | done | CV1-X-WORKSPACE |
| SMG-034-005 | P1 | 선택한 안내 글자와 재생 커서의 화면 소유권 | 일부 지원 | done | CV1-X-WORKSPACE |
| SMG-004-004 | P2 | 파트보 마디 속성의 대상·선택 범위 검증 | 일부 지원 | done | 직접 연결 없음 |
| SMG-004-005 | P2 | 다중 보표 하위 보표의 마디 속성 대상 검증 | 일부 지원 | done | 직접 연결 없음 |
| SMG-027-001 | P2 | 무음정 음표 MusicXML 가져오기 지원 경계 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-026-002 | P2 | 기존 native TAB의 MusicXML·표시 지원 경계 감사 | 일부 지원 | done | 직접 연결 없음 |
| SMG-039-007 | P1 | 앱 지원 차이 목록의 분류 누락 방지 | 일부 지원 | done | MS-HELP-001 |
| SMG-025-007 | P2 | 음표 머리 안 글자의 MusicXML 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-025-008 | P2 | 머리 글자 손실 문서의 XML/MXL 백업·재시도 검증 | 보존 경로만 있음 | done | 직접 연결 없음 |
| SMG-028-007 | P2 | MusicXML 기울임 서식의 손실 안내 감사 | 일부 지원 | done | 직접 연결 없음 |
| SMG-048 | P1 | 스윙 재생의 비율·구간·보표 범위 | 일부 지원 | in-progress | 직접 연결 없음 |
| SMG-048-001 | P1 | 표기와 분리한 전역 스윙 재생의 첫 범위 | 일부 지원 | in-progress | 직접 연결 없음 |
| SMG-048-002 | P1 | 총보에서 미적용인 스윙의 파트 사본 재활성 계약 | 일부 지원 | done | 직접 연결 없음 |
| SMG-028-008 | P2 | MusicXML 단일 글자의 지정 글꼴·크기 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-028-009 | P2 | MusicXML 단일 글자의 지정 색 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-037-001 | P0 | 경고 기술 정보 탐색 키와 악보 명령 격리 | 일부 지원 | in-progress | 직접 연결 없음 |
| SMG-025-009 | P1 | 추가 보표의 단음 트레몰로 실제 표시와 출력 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-025-010 | P1 | 숨표·중지표의 실제 소유 보표 기준 배치 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-004-006 | P1 | 비첫 보표 주소의 총보 줄·페이지 나누기 일치 | 일부 지원 | done | 직접 연결 없음 |
| SMG-011-003 | P1 | 시스템별 슬러·헤어핀 조각의 포커스 복원 | 일부 지원 | done | CV1-X-SPAN-PROPERTIES |
| SMG-011-004 | P1 | 선택과 다른 Tab 표기의 포커스 소유권 | 일부 지원 | done | CV1-X-SPAN-PROPERTIES |
| SMG-011-005 | P1 | span 선택 중 Tab 음표의 포커스 보존 | 일부 지원 | done | CV1-X-SPAN-PROPERTIES |
| SMG-035-006 | P2 | 마디·표기 단위의 키보드 탐색 | 일부 지원 | needs-design | CV1-X-OBJECT-FILTERS, CV1-X-COMMANDS-SHORTCUTS |
| SMG-028-010 | P1 | MusicXML 코드 구성음의 손실 안내 | 일부 지원 | done | CV1-X-PART-XML |
| SMG-028-011 | P1 | MusicXML 상대 화성 표기의 손실 안내 | 일부 지원 | done | CV1-X-PART-XML |
| SMG-028-012 | P1 | MusicXML 코드 종류 접미사의 근음·베이스 표시 | 일부 지원 | done | CV1-X-PART-XML |
| SMG-028-013 | P1 | MusicXML 한 코드 안의 복수 화음 손실 안내 | 일부 지원 | done | CV1-X-PART-XML |
| SMG-011-006 | P1 | 같은 코드의 history 복원과 Tab 음표 초점 소유권 | 일부 지원 | done | CV1-X-SPAN-PROPERTIES |
| SMG-028-014 | P1 | 코드 심벌 전체의 숨김 설정 손실 안내 | 일부 지원 | done | CV1-X-PART-XML |
| SMG-011-007 | P2 | 보표 글자 implicit 요청·셈여림 Select의 history 초점 QA | 일부 지원 | done | CV1-X-SPAN-PROPERTIES |
| SMG-028-015 | P2 | 보표 글자의 기보 시작점·오선 상단 기본 앵커 정책 | 일부 지원 | in-progress | CV1-X-PART-XML |
| SMG-011-008 | P2 | 시스템·표현·연습표의 global/precise 참조 초점 QA | 일부 지원 | done | CV1-X-SPAN-PROPERTIES |
| SMG-011-009 | P2 | PDF 완료 전후 OS 활성·native 입력 초점 소유권 조사 | 일부 지원 | needs-audit | CV1-X-SPAN-PROPERTIES |
| SMG-023-004 | P2 | 명시적 보표 숨김 설정의 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-PART-LAYOUT |
| SMG-023-005 | P2 | 반복되는 보표 표시 경고의 기본 보고서 밀도 | 일부 지원 | in-progress | CV1-X-PART-LAYOUT |
| SMG-046-003 | P2 | MusicXML 대체·큐 보표 용도 손실 안내 | 직접 UI 없음 | in-progress | CV1-X-ENGRAVING |
| SMG-011-010 | P2 | 파일 작업 완료 순서·초점·진단 소유권 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, CV1-X-WORKFLOW-AUDIT |
| SMG-037-002 | P1 | 선택한 진단 글자의 클립보드와 악보 명령 소유권 | 일부 지원 | in-progress | 직접 연결 없음 |
| SMG-025-011 | P2 | 개별 음표·쉼표의 숨김 설정 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-028-016 | P2 | 개별 가사와 음표의 가사 숨김 설정 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-028-017 | P2 | 한 가사 음절의 여러 text 조각과 원래 공백 보존 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-028-018 | P2 | 가사 글자의 굵게·기울임 지정 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-037-003 | P2 | 긴 혼합 진단 목록의 내부 스크롤과 읽기 키 격리 | 일부 지원 | in-progress | MS-UX-SCOPE-002, CV1-X-NATIVE-LIFECYCLE |
| SMG-028-019 | P2 | 명시적 가사 연결 기호의 가져오기 손실 안내 | 일부 지원 | in-progress | MS-UX-SCOPE-002, CV1-X-NATIVE-LIFECYCLE |
| SMG-028-020 | P1 | MusicXML 숫자 문자 참조의 문자 손실·절 번호 오류 | 일부 지원 | in-progress | MS-UX-SCOPE-002, CV1-X-NATIVE-LIFECYCLE |
| SMG-028-021 | P1 | 압축 MusicXML rootfile의 XML 속성 문자와 경로 검사 | 일부 지원 | in-progress | MS-UX-SCOPE-002, CV1-X-NATIVE-LIFECYCLE |
| SMG-028-022 | P2 | 별도 파트 이름·약칭 표시 설정의 손실 안내 | 일부 지원 | in-progress | 직접 연결 없음 |
| SMG-025-012 | P2 | 음표 덧줄 숨김 설정의 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-025-013 | P2 | 음표·쉼표 음가 점 숨김의 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-025-014 | P2 | 꾸밈음 원래 기보 음가·점의 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-025-015 | P1 | 개별 큐 표기 구분의 가져오기 손실 안내 | 일부 지원 | in-progress | CV1-X-NATIVE-LIFECYCLE, MS-UX-SCOPE-002 |
| SMG-009-002 | P2 | 꾸밈음 원래 연주 시간 지정의 가져오기 손실 안내 | 일부 지원 | in-progress | 직접 연결 없음 |
| SMG-025-016 | P2 | 임시표의 괄호·크기·주의/편집 지정 가져오기 손실 안내 | 일부 지원 | in-progress | MS-UX-SCOPE-002, CV1-X-NATIVE-LIFECYCLE |
| SMG-025-017 | P2 | 한 시점 마디의 온음표·가사 첫 박 위치 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-001-004 | P1 | 모델 범위 밖 메트로놈 빠르기 변환의 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-001-006 | P1 | 미지원 메트로놈 기준 음가의 변환·재생 손실 조사 | 일부 지원 | done | 직접 연결 없음 |
| SMG-001-007 | P1 | 지원되는 가져온 빠르기 기준 음가의 선택기·위치 안내 보존 | 일부 지원 | done | 직접 연결 없음 |
| SMG-001-005 | P1 | 메트로놈 범위·근사 문구의 기존 표시 필드 보존 조사 | 일부 지원 | done | 직접 연결 없음 |
| SMG-029-002 | P2 | 페이지 추가 글자·음악 기호의 가져오기 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-030-011 | P1 | 추가 저자 메타데이터의 MusicXML 손실 안내 조사 | 일부 지원 | done | 직접 연결 없음 |
| SMG-002-004 | P1 | 현재 박자표 값을 열고 닫을 때의 선택기 보존 | 일부 지원 | done | 직접 연결 없음 |
| SMG-029-003 | P2 | 작품·악장 정보와 작품 모음 연결의 MusicXML 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-044-002 | P1 | 장·단조 미지정 조표의 선택기 값 보존 | 일부 지원 | done | 직접 연결 없음 |
| SMG-005-002 | P1 | 기존 음자리표의 마디·보표 선택기 값 보존 | 일부 지원 | done | 직접 연결 없음 |
| SMG-015-001 | P1 | 기존 사용자 지정·혼합 파트 이조의 선택기 값 보존 | 일부 지원 | done | 직접 연결 없음 |
| SMG-011-011 | P1 | 문서 교체 중 선택기의 임시 후보 소유권 검증 | 일부 지원 | done | 직접 연결 없음 |
| SMG-036-001 | P1 | Native 파트 ID의 MusicXML 형식 적합성 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-033-001 | P1 | MusicXML 음표별 악기 지정 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-033-002 | P2 | 반복되는 악기 지정 경고의 보고서 밀도 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-033-003 | P2 | MusicXML 악기별 음량·공간 배치 손실 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-036-002 | P1 | Native 직접 글자의 XML 형식 오류·UTF8 출력 손실 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-036-003 | P1 | 유효한 CR 줄 끝 문자의 MusicXML 원문 보존 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-030-012 | P1 | 악보 정보 열람 시 Native 줄바꿈 보존 | 일부 지원 | done | MS-UX-SCOPE-002 |
| SMG-036-004 | P2 | MusicXML 본문 기본 문법·단일 최상위 요소 검사 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-036-005 | P1 | 일부 파트 ID의 프로젝트 저장·인쇄설정 보존 | 일부 지원 | done | CV1-X-NATIVE-LIFECYCLE, MS-MUSICXML-001 |
| SMG-036-006 | P1 | 복구본 선택 뒤 이전 파일 읽기의 처리 중 상태 해제 | 일부 지원 | done | CV1-X-NATIVE-LIFECYCLE, MS-MUSICXML-001 |
| SMG-024-002 | P2 | MusicXML 마디 반복 기호의 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001, MS-MUSICXML-001 |
| SMG-024-003 | P2 | MusicXML 박 반복 표기의 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001, MS-MUSICXML-001 |
| SMG-025-018 | P2 | MusicXML 박·리듬 슬래시 표기의 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001, MS-MUSICXML-001 |
| SMG-049 | P1 | 현재 악보에 없는 파트의 solo 설정 잔류 | 일부 지원 | done | MS-PLAYBACK-001 |
| SMG-025-019 | P1 | MusicXML 표기 묶음의 표현 기호·숨표 가져오기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-020 | P1 | 복수 표기 묶음의 페르마타 가져오기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-021 | P1 | 복수 표기 묶음의 슬러 가져오기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-022 | P1 | 복수 표기 묶음의 타이 읽기와 화음 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-006-005 | P1 | 복수 표기 묶음의 기존 잇단음표 가져오기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-023 | P1 | 복수 표기 묶음의 기존 장식음 가져오기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-024 | P1 | 내부 반복 표기 묶음의 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-025 | P1 | 기존 단일 트레몰로의 기본형·묶음 가져오기 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-026 | P1 | 여러 트레몰로 지시의 기존 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-027 | P1 | 표기 기호 숨김 설정의 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-028 | P1 | 표기 묶음의 편집자 주석·편집층 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-029 | P1 | 참고용 편집층의 표시·재생 구분 보존 설계 | 별도 제품 범위 결정 | needs-design | MS-NOTATION-001 |
| SMG-025-030 | P1 | 페르마타 모양·방향·복수 지정의 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-025-031 | P1 | 마디선 소유 페르마타의 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001 |
| SMG-024-004 | P1 | 마디선 세뇨·코다의 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001, MS-MUSICXML-001 |
| SMG-025-032 | P1 | 마디선 편집자 주석·편집층 손실 안내 | 일부 지원 | done | MS-NOTATION-001, MS-MUSICXML-001 |
| SMG-028-023 | P2 | 시스템·표현 글자와 연습표 출력 오류의 실제 수정 경로 안내 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-050 | P2 | 페달 기호·선의 표기와 속성 편집 | 일부 지원 | needs-design | CV1-X-ENGRAVING |
| SMG-050-001 | P2 | 페달 표시 기호의 가져오기 손실 안내 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-051 | P2 | 범위 이명동음 정리와 실음·기보음 분리 전환 | 일부 지원 | needs-design | CV1-X-ENGRAVING |
| SMG-051-001 | P1 | 이명동음 전환 뒤 이웃음 재생 보존 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-052 | P1 | 선택 음높이 이동의 이웃음 보존 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-053 | P1 | 음 이름 변경의 이웃음 보존 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-054 | P1 | 선택 임시표의 이웃음 보존 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-055 | P1 | 화음 구성음 편집의 이웃음 보존 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-056 | P1 | 화음 추가의 저장 가능 음역 보호 | 일부 지원 | done | CV1-X-NATIVE-SCHEMA, CV1-X-ENGRAVING |
| SMG-057 | P1 | MIDI 음높이 표현 범위의 손실 없는 출력 정책 | 일부 지원 | done | CV1-X-NATIVE-SCHEMA |
| SMG-057-001 | P2 | MIDI 음역 오류의 읽을 수 있는 원인 위치 | 일부 지원 | done | 직접 연결 없음 |
| SMG-001-008 | P2 | MIDI 빠르기 오류의 기본·위치별 수정 범위 안내 | 일부 지원 | done | 직접 연결 없음 |
| SMG-001-009 | P1 | 파트 사본의 총보 공통 빠르기 전달 범위 | 일부 지원 | done | 직접 연결 없음 |
| SMG-050-002 | P2 | 소프트·소스테누토 페달 재생 지시의 손실 안내 | 일부 지원 | done | CV1-X-ENGRAVING |
| SMG-011-012 | P1 | 같은 문서의 선택 대상 변경과 표기 속성 후보 소유권 | 일부 지원 | done | 직접 연결 없음 |
| SMG-036-007 | P1 | MusicXML 음표 반복 회차 조건의 가져오기 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-036-008 | P1 | MusicXML 음표 연주 시작·종료 시점 조정 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-036-009 | P2 | MusicXML 피치카토·아르코 연주 지시 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-028-024 | P1 | MusicXML 보표·시스템 글자의 마디 안 위치 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-028-025 | P1 | MusicXML 표현 글자의 원본 박별 위치와 divisions 읽기 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-033-004 | P2 | MusicXML MIDI 뱅크 지정의 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-033-005 | P2 | MusicXML 원본 MIDI 채널 지정의 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-033-006 | P2 | MusicXML 원본 MIDI 악기 이름·장치 지정의 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-033-007 | P2 | 원본 MIDI 타악기 음 번호 지정의 가져오기 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-025-033 | P1 | 독립 임시표·사용자 확장 표기의 가져오기 손실 안내 | 일부 지원 | done | MS-NOTATION-001, MS-MUSICXML-001 |
| SMG-033-008 | P1 | MusicXML 원본 재생 연주법 지정의 손실 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-036-010 | P2 | MusicXML 마디 우선 구조의 미지원 안내 | 일부 지원 | done | MS-MUSICXML-001 |
| SMG-037-004 | P2 | 긴 최근 목록의 시작 화면 오류 노출 | 일부 지원 | done | MS-UX-SCOPE-002, CV1-X-NATIVE-LIFECYCLE |
| SMG-037-005 | P2 | 최근 MusicXML 읽기의 진행 상태 | 일부 지원 | done | MS-UX-SCOPE-002, CV1-X-NATIVE-LIFECYCLE |

## SMG-001 · 위치별 빠르기의 범위 밖 입력 처리

- 현재: 새저작40–240정수의오류초안/확정/취소·기존값보존·미확정저장계약은구현돼있다. 기존값/XML왕복·MIDI범위안내·metronome범위/근사문구·승인된음가환산·지원음가선택기·총보공통빠르기파트사본은done child001~009와현재소스/검증에연결한다. 004/005가미구현이라는오래된상위설명을현재구현과대조해정정했다.
- 남은 범위: 명명된입력/보존범위는완료했다. 새저작40–240정수와기존가져온값의보존을구분하며모든음가의새저작·독립파트빠르기·새schema·외부앱/물리입력검수를추가한것은아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioTempoEventInput.tsx](../../src/renderer/src/StudioTempoEventInput.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md), [참고 2](https://handbook.musescore.org/text/entering-and-editing-text.md)

수용 기준:

- 수정 전 자동 보정을 재현하고 수정 후에는 오류 초안·원본 값 보존을 검증한다.
- 독립 slice 수용 기준으로 구체화: 임의 40/240 변경 대신 유효성 안내·확정/취소·저장 초안 계약을 일관되게 적용한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.
- 가져온 빠르기는 열람/no-edit 저장만으로 정규화하지 않는다. 수정값의 UI 범위와 원본 보존을 구분한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지
- DV 이후 새 input 감사 범위004/005 때문에 parent를 in-progress로 재분류했다. 기존 done child001–003를 되돌리거나 이전 기능 실패로 보고한 것이 아니다.
- 2026-11-10 상위정합성검토:004/005때문에in-progress였던설명을done child001~009·현재source·DW/EB/GG와대조했다. GV753/7102·Node5/외부1skip/1561소스불변을연결하며새제품수정으로세지않는다.
- 최종L 격리build/실제Help M의960/1400 두폭에서정리된상위완료범위·원래40–240저작과수입값보존경계를관측했다. 설명서App4검사와현재GV전체를연결하며새템포기능으로세지않는다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-002 · 사용자 지정 박자표

- 현재: 미배포 작업본의 선택 한 마디 및 새 악보에서 사용자 지정 분자/분모 입력을 지원한다.
- 남은 범위: SMG-002-001/002 입력은 완료. 임의 표시문구/additive와 빔 그룹 설정은 현재 모델·저장/출력 정책을 별도 설계해야 한다. 기존 악보 총보 전파는SMG-003이다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: SMG-001
- 소스: [src/renderer/src/StudioMeasureTools.tsx](../../src/renderer/src/StudioMeasureTools.tsx), [src/renderer/src/editor/new-score.ts](../../src/renderer/src/editor/new-score.ts), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 선택 마디 입력은 SMG-002-001로 검증했다. 새 악보 wizard 및 표시/빔 그룹의 남은 범위를 분리한다.
- 독립 slice 수용 기준으로 구체화: 분자·분모 입력을 기존 명령의 유효 범위부터 audit하고 5/4·7/8 같은 실제 지원 가능 범위를 단계적으로 연다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-002-001 · 선택 마디 사용자 지정 박자표 입력

- 현재: 미배포 작업본에서 선택 보표 한 마디의 사용자 지정 분자/분모 입력을 지원한다. 새 악보는 별도SMG-002-002에서 같은 입력 범위를 제공한다.
- 남은 범위: 선택 마디 slice 완료. 상위 SMG-002의 새 악보 wizard와 임의 표시/빔 그룹은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-001
- 소스: [src/renderer/src/StudioMeasureTools.tsx](../../src/renderer/src/StudioMeasureTools.tsx), [src/renderer/src/editor/new-score.ts](../../src/renderer/src/editor/new-score.ts), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 5/4·7/8 한 마디 적용; 다른 마디/보표 보존
- 범위 밖·리듬 초과 거부; IME·취소·대상 변경·focus 보호
- 정확한 undo/redo, native/XML 왕복 및 실제 PDF

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-002-002 · 새 악보 사용자 지정 박자표 입력

- 현재: 미배포 작업본에서 새 악보 분자1–128과 분모1/2/4/8/16/32/64를 설정하고 모든 새 보표/마디에 적용한다.
- 남은 범위: 새 악보 직접 입력 slice 완료. 총보 전파·임의 표시·빔 그룹은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-002-001
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 새 악보의 모든 보표/마디에5/4·7/8 적용; 기존 네 preset 보존
- 잘못된 초안·IME·취소 시 기존 악보 불변; preset 전환과 pickup 재검증
- 실제 입력·한undo/redo·native 재열기와 MusicXML/PDF 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-002-003 · 박자표 변경의 쉼표 기호·범위 끝점 보호

- 현재: 미배포 작업본에서 쉼표 부착 기호와 범위 끝점을 박자표 변경 중 보호한다. focused34·실제960/1400·누적전체3901검사를 통과했다.
- 남은 범위: 작은 보호 slice 완료. 박자표 총보 전파·새 표기 모델은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-002-001
- 소스: [src/renderer/src/editor/time-signature.ts](../../src/renderer/src/editor/time-signature.ts), [src/project/schema.ts](../../src/project/schema.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 통마디 쉼표의 fermata/breath를 실제박자 변경 뒤 보존
- 사라지는 쉼표 끝점·기호를 거부하며 원본/undo/native 보호
- 일반 쉼표 정리·이웃파트·살아남은 manualgeometry·안전한 수정 후 재시도는 유지

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-003 · 박자표의 총보·이후 구간 적용 범위

- 현재: 현재 진입은 선택 보표 한 마디에 적용되며 다른 보표의 박자표를 일괄 바꾸지 않는다.
- 남은 범위: 선택 보표/총보·한 마디/다음 변경 전까지의 정책, 음가 초과·반복·파트보 계약을 설계한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: SMG-002
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioMeasureTools.tsx](../../src/renderer/src/StudioMeasureTools.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 현재 동작 확인: 현재 진입은 선택 보표 한 마디에 적용되며 다른 보표의 박자표를 일괄 바꾸지 않는다.
- 독립 slice 수용 기준으로 구체화: 선택 보표/총보·한 마디/다음 변경 전까지의 정책, 음가 초과·반복·파트보 계약을 설계한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-003-001 · 박자표 축소 시 authored 빠르기·코드·표현 위치 보호

- 현재: 마디 축소 후 위치 표기가 끝 밖에 남는 core4/App2 red를 재현했다. 기존 global alias resolver와 거부 경로로 좁게 수정해 focused96/확대1448/type/build PASS. 실제E960 오류/선택/undo0/clean 확인 후 취소 직전 native focus가 상실되어 후속 저장/전체 UI는 미완이다. 후속 누적 AM468파일4623검사/Node5와1942입력불변이 통과했다. native focus로 미도달한 실제 경로는 별도 미완으로 유지한다. 현재A tempo-alias2폭/B local harmony·expression4경로의677guards·modalfocus30에서거부/취소/focus복귀/native12저장·6고유재열기/actualXML12·MIDI6/PDF6을확인했다. XSD14/고유PDF3쪽·대표오류를직접검토했다. 제품변경없이BS549files5148+Node5를재사용한다.
- 남은 범위: 총보 박자표 전파·자동 rebar·out-of-bar import/native검증 정책은별도다. 과거E의hostfocus원인은미확정이며물리/외부앱검수는포함하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/time-signature.ts](../../src/renderer/src/editor/time-signature.ts), [src/score-core/measure-reference.ts](../../src/score-core/measure-reference.ts), [src/renderer/src/editor/measure-markings.ts](../../src/renderer/src/editor/measure-markings.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 축소로 대상 마디 밖에 남는 빠르기·코드·표현 글자는 기존 점유 보호와 같이 거부한다.
- 정확한 마디 끝·다른 보표/마디·동일 길이와 확장·원본 저장값은 보존한다.
- 실패 시 선택·원본·dirty·undo0와 기존 대화상자 오류/취소를 유지한다.
- 실제 renderer에서 확인한 범위와 native focus 중단 이후 미검증을 구분한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-004 · 못갖춘마디·실제 마디 길이 편집

- 현재: 새 악보 생성과 승인된 모든 보표의 빈 첫 마디 변환/복원을 완료했다. 기존 명령·번호/ID·기호·위치 anchor를 보존하며 전체K3980+Node5 및 실제 출력으로 검증했다. 비첫보표총보나누기불일치는004-006에서수정·실제두폭/출력확인했다.
- 남은 범위: 기존 음표가 있는 마디 변환·마디 번호 제외·끝마디 보상은 별도 후속 범위다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/new-score.ts](../../src/renderer/src/editor/new-score.ts), [src/renderer/src/StudioMeasureTools.tsx](../../src/renderer/src/StudioMeasureTools.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/pickup-and-non-metered-measures.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties.md)

수용 기준:

- 새 문서 생성은 SMG-004-001로 검증했다. 기존 음표가 있는 마디 변환의 미검증 보호 계약을 분리한다.
- 독립 slice 수용 기준으로 구체화: 기존 timing 명령·검증을 먼저 확인해 시작 마디 만들기/변환과 취소·undo·XML 보존을 연결한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-004-001 · 새 악보 첫 못갖춘마디 생성

- 현재: 미배포 새 악보 wizard에서 모든 보표 첫 마디의 못갖춘 길이를 지정한다. 기존 마디 변환 UI는 없다.
- 남은 범위: 생성 slice 완료. 기존 마디 편집과 번호/마지막 마디 보상은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/new-score.ts](../../src/renderer/src/editor/new-score.ts), [src/renderer/src/StudioMeasureTools.tsx](../../src/renderer/src/StudioMeasureTools.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/pickup-and-non-metered-measures.md)

수용 기준:

- 모든 보표의 첫 마디에 같은 유효 길이; 이후 regular·번호·총 마디 수 보존
- 범위/IME/취소·실제 음표 입력·undo/native/XML/PDF 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-005 · 음표 앞 음자리표 직접 입력

- 현재: 마디/보표 전체 음자리표만 표현한다. 현재 Measure.clef 하나뿐이며 가져온 inline 위치도 보존하지 못한다. 미배포 작업본은 위치 손실을 안내한다.
- 남은 범위: 직접 삽입/수정/삭제는 위치별 모델과 프로젝트·renderer/편집 정책이 필요하다. 원본 inline 보존이라는 최초 조사 주장을 정정한다. 안내 slice는 SMG-005-001로 분리한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioMeasureNotation.tsx](../../src/renderer/src/StudioMeasureNotation.tsx), [src/renderer/src/StudioPartLabels.tsx](../../src/renderer/src/StudioPartLabels.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/clefs.md)

수용 기준:

- 현재 Measure.clef 단일 값과 위치 손실을 실제 XML로 확인했다. 직접 UI 전에 모델/프로젝트/소유권/레이아웃 계약을 제안한다.
- 독립 slice 수용 기준으로 구체화: 선택 음표 앞 변경과 마디/보표 전체 변경을 분리하고 기존 inline 데이터 경로를 조사한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-005-001 · 마디 안 음자리표 가져오기 손실 안내

- 현재: 마디/보표 전체 음자리표만 표현한다. 현재 Measure.clef 하나뿐이며 가져온 inline 위치도 보존하지 못한다. 미배포 작업본은 위치 손실을 안내한다.
- 남은 범위: 손실 안내만 완료. 위치별 편집/원본 위치 보존은 상위 SMG-005 설계가 필요하다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/clefs.md)

수용 기준:

- 중간/끝 변경 손실 경고와 backup tick0 대조군
- 일반 경고만으로 대신하지 않고 손실·원본 보관 행동을 한국어로 표시
- supported native/MIDI와 원본 XML 비변경

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-006 · 셋잇단음표 외 비율·중첩 잇단음표

- 현재: 기존3:2와미배포고정2:3/5:4/7:4입력preset이있다.
- 남은 범위: 고정2:3/5:4/7:4 입력과 문맥 안내의 누적 gate는 완료했다. 임의 비율·중첩·일반 속성은 별도 모델/입력/파일 정책 설계다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioNoteToolbar.tsx](../../src/renderer/src/StudioNoteToolbar.tsx), [src/renderer/src/editor/note-input-state.ts](../../src/renderer/src/editor/note-input-state.ts), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/tuplets.md), [참고 2](https://handbook.musescore.org/appendix/all-keyboard-shortcuts.md)

수용 기준:

- 현재 동작 확인: 기본 버튼은 셋잇단음표다. beginTupletInput의 비율 매개변수만으로 임의 비율/중첩 UI 지원을 주장하지 않는다.
- 독립 slice 수용 기준으로 구체화: 2·5·7연음과 사용자 비율의 core 제약을 audit하고 안전한 한 비율부터 입력·완료·취소를 구현한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-006-001 · 16분음표 다섯잇단음표 입력(5:4)

- 현재: 미배포 Add5:4(16분) 입력 전용 preset을 구현했다. 실제 화면/native/XML/MIDI/PDF gate는 통과했고 누적 전체 검증을 진행한다. 기존3:2 경로는 유지한다.
- 남은 범위: SMG-006-001의5:4 preset을 별도로 추적한다. 2·7연음·임의 비율·중첩·범용 속성은 별도 미구현이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioNoteToolbar.tsx](../../src/renderer/src/StudioNoteToolbar.tsx), [src/renderer/src/editor/note-input-state.ts](../../src/renderer/src/editor/note-input-state.ts), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/tuplets.md)

수용 기준:

- 실제 메뉴에서5:4 입력·score focus와 Native 보존
- 3:2/기존단축키·미완성/취소·undo/redo·저장/사본 source 안내 유지
- 960/1400·menu12조건·actual MIDI/XML/PDF 및 전체 gate

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-007 · 화음 구성음 선택과 부분 화음 타이

- 현재: 이벤트 단위 선택이며 새 타이는 동일 화음만 허용한다. 기존 부분 연결 원본은 보존·안내하는 승인 정책이다.
- 남은 범위: 구성음별 선택/연결은 별도 모델·파일·재생 설계가 필요하다. 현재 승인 정책을 우회해 추가하지 않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioChordProperties.tsx](../../src/renderer/src/StudioChordProperties.tsx), [src/score-core/types.ts](../../src/score-core/types.ts), [src/renderer/src/editor/keyboard-input.ts](../../src/renderer/src/editor/keyboard-input.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/editing-notes-and-rests.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md), [참고 3](https://handbook.musescore.org/notation/repeats/items-across-repeats-and-jumps.md), [참고 4](https://handbook.musescore.org/appendix/all-keyboard-shortcuts.md)

수용 기준:

- 현재 동작 확인: 이벤트 단위 선택이며 새 타이는 동일 화음만 허용한다. 기존 부분 연결 원본은 보존·안내하는 승인 정책이다.
- 독립 slice 수용 기준으로 구체화: 구성음별 선택/연결은 별도 모델·파일·재생 설계가 필요하다. 현재 승인 정책을 우회해 추가하지 않는다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-008 · 박·성부별 셈여림

- 현재: 현재는 마디 단위 첫 값 표시/재생과 원본 보관 값 정리 정책을 사용한다. 원본마디중간cursor/offset·voice가마디값으로축소되는5손실/3시작점대조를감사했다. 모델지원확장이아닌import손실안내child001로분리한다. 복합/미지원/배열/음표부착glyph11누락을17source/34XSD로확인했고현행값유지진단child002로분리했다.
- 남은 범위: beat/voice anchor와 여러 값 재생 계약은 별도 설계한다. 보관 값 개별 정리 승인 범위를 유지한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/dynamics-and-hairpins.md)

수용 기준:

- 현재 동작 확인: 현재는 마디 단위 첫 값 표시/재생과 원본 보관 값 정리 정책을 사용한다.
- 독립 slice 수용 기준으로 구체화: beat/voice anchor와 여러 값 재생 계약은 별도 설계한다. 보관 값 개별 정리 승인 범위를 유지한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-008-001 · MusicXML 셈여림 위치·성부 축소의 손실 안내

- 현재: fullXSD감사8사례중5무경고손실/3정상시작점을확인했다. 새core/App16회귀10red/6대조후기존indexDirectionTicks·report/Korean어댑터로수정했다. 마디id/value/원순서·첫값표시/재생을그대로두며원offset0/voice·원파트/마디/type경로를안내한다. focused5파일106/type·광역MusicXML/App127파일1833검사와16XSD가통과했고Native/MIDI/재출력XML바이트는수정전과같다. 현재production/누적전체는후속이다. BTactualE16고유흐름960dark/1400light·Native32/16재열기/XML32fullXSD/MIDI16/PDF16동일1page·1483source불변,실제화면/PDF검토PASS. actualHelpG두장×두폭/문구·Escape와H한글linebox4조건838/1278폭안쪽PASS. profile/fixed통과·baseline변경없음. FA673파일6413검사/Node5 PASS·외부1skip/1225.49초,40606개입력 실행중/원래34937→즉시독립36273/receiptREAD뒤불변. 이명명범위의수용조건은완료했다.
- 남은 범위: 이좁은수용범위는완료했다. 부모모델/전체workspace지원및물리OS·IME/dialog/clipboard·스크린리더·청음/외부앱승인으로확대하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/musicxml/dynamic-position-warning.test.ts](../../src/musicxml/dynamic-position-warning.test.ts), [src/renderer/src/App.dynamic-position-warning.test.tsx](../../src/renderer/src/App.dynamic-position-warning.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/dynamics-and-hairpins.md)

수용 기준:

- 실제마디중간/offset/명시voice5사례의누락범위를정확히안내하며정상시작점·offset0·상쇄offset0에는새경고를만들지않는다.
- 원문offset0·voice·파트/마디/direction/type주소와한국어확인행동을보존한다.
- 모델/Native/출력XML/MIDI의현행마디투영은바꾸지않고재출력파일에는손실원정보를가졌다고꾸미지않는다.
- actual960/1400가져오기·재열기·두XML모드/MIDI/PDF·pinnedXSD와필요한누적회귀를기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-008-002 · 복합·배열·음표 부착 셈여림의 손실 안내

- 현재: 17source/17사본fullXSD·기존투영Native/XML/MIDI대조에서11기호손실의진단누락을확인했다. rootcore/App34회귀22red/12대조후privatecomponent/배열/note검사와Korean어댑터로보완했다. 기존9값·scalar/마디투영·note백분율경고는그대로다. 관련5파일59/type-d·광역130파일1875검사와원구성/남은값/owner/기존30%를강화한34회귀통과. 현재34XSD및source/control/Native/XML/MIDI바이트는수정전A와같다. 실제BU App G34흐름/Native68·재열기34/XML68fullXSD/MIDI34/PDF34·Help I4·density M6고유조건/Native6/PDF6·profile/fixed 통과. source1486과baseline 유지. 누적 FB675파일/6447검사·Node5·외부opt-in1skip/1243.05초도 통과했다. 원래57812 종료 직후 독립86795 종료와 receipt 본문을 읽었고 41486입력이 같다.
- 남은 범위: 이 항목의 진단 수용 범위는 완료했다. 부모 SMG-008의 박/성부 모델과 복합기호 합성·미지원 pppp·음표 단위 재생·원본 표기 복원은 지원하지 않는다. 물리 OS·IME·스크린리더·청음·외부 앱과 비활성 문서의 자동 native focus reveal은 미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/musicxml/dynamic-components-warning.test.ts](../../src/musicxml/dynamic-components-warning.test.ts), [src/renderer/src/App.dynamic-components-warning.test.tsx](../../src/renderer/src/App.dynamic-components-warning.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/dynamics-and-hairpins.md)

수용 기준:

- 유효한11기호손실에각각정확한진단을보이며정상단일/빈값/별도DT의보관값·기존속성6대조를유지한다.
- 동일note의기존30%재생세기와새부착기호를별도주소/메시지각1개로안내한다.
- 현재지원9값·첫scalar/마디투영과source/control/Native/XML/MIDI바이트를유지하며새모델/합성/임의변환을하지않는다.
- 실제960/1400import·Native재열기/두XML모드/MIDI/PDF·공개Help·pinnedXSD와필요한누적회귀를기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-009 · 꾸밈음 발음과 연주 시간 배분

- 현재: 붙이기/변환·표기·native/XML 보존은 지원하나 별도 내부/MIDI 발음은 제공하지 않는다. 읽기 대조에서 MIDI 무경고 누락을 확인해009001 진단 하위를 등록했다. 미배포009001 MIDI 손실 안내는 누적BA까지 한정 완료했다.
- 남은 범위: 앞/뒤 음의 시간 차용·타이·반복·템포 정책과 MIDI 일치를 설계한 뒤 구현한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/grace-conversion.ts](../../src/renderer/src/editor/grace-conversion.ts), [src/renderer/src/StudioNoteDecorations.tsx](../../src/renderer/src/StudioNoteDecorations.tsx), [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/grace-notes.md)

수용 기준:

- 현재 동작 확인: 붙이기/변환·표기·native/XML 보존은 지원하나 별도 내부/MIDI 발음은 제공하지 않는다.
- 독립 slice 수용 기준으로 구체화: 앞/뒤 음의 시간 차용·타이·반복·템포 정책과 MIDI 일치를 설계한 뒤 구현한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-010 · 파트·구간별 span 속성 편집

- 현재: 현재 모델/native v2는 한 span의 공통 placement/offsetX/offsetY/height만 지원한다. 파트·시스템 구간 override/상속 필드는 없으며 기존 보존 주장을 정정했다.
- 남은 범위: 파트·구간 주소와 줄바꿈 변화, 상속/null/undefined, 버전·기존 파일 호환, 선택/undo/출력 정책을 설계한 뒤 모델 확장이 필요하다. 기존 UI 연결만으로 완성할 수 없다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/SpanProperties.tsx](../../src/renderer/src/SpanProperties.tsx), [src/score-core/types.ts](../../src/score-core/types.ts), [src/project/schema.ts](../../src/project/schema.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/properties-panel.md), [참고 2](https://handbook.musescore.org/basics/parts.md), [참고 3](https://handbook.musescore.org/notation/repeats/items-across-repeats-and-jumps.md), [참고 4](https://handbook.musescore.org/formatting/page-layout-concepts.md)

수용 기준:

- 현재 모델/native v2는 한 span의 공통 placement/offsetX/offsetY/height만 지원한다. 파트·시스템 구간 override/상속 필드는 없으며 기존 보존 주장을 정정했다.
- 새 모델/주소·상속·파일 호환·출력 정책을 별도 제안한 뒤 구현한다. 공통 span 편집의 자동/명시적0/reset/undo는 보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011 · 악보 위 직접 배치·핸들 조절

- 현재: 속성·SVG 키보드 이동과 기존 수동 슬러/헤어핀의 공통 offset 마우스 이동을 지원한다. 001/002의 실제 이동·취소·undo/redo·고정 75/125%·긴 안내·속성 포커스·밀도·native/XML/MIDI/PDF 검증을 제한된 범위에서 완료했다.
- 남은 범위: 자동→수동 전환, 곡선·끝점 핸들, 독립 파트/구간 모델과 touch/pen 직접 이동은 별도 범위다. 자식의 제한된 완료를 직접 편집 전체의 완료로 해석하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/SpanProperties.tsx](../../src/renderer/src/SpanProperties.tsx), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/adjusting-elements-directly.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md)

수용 기준:

- 현재 동작 확인: 속성의 placement/offset/height 편집은 있으나 MuseScore식 직접 shape handle 전체를 제공하지 않는다.
- 독립 slice 수용 기준으로 구체화: 현행 hit/선택을 유지하며 드래그·키보드·취소·명령1회/undo1회 계약부터 좁게 설계한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012 · 팔레트 드래그 적용·사용자 팔레트

- 현재: 기존 명령을 재사용한 음자리표·조표·박자표·셈여림의 지정 마디 drag, 표현 기호·장식음의 음표 drag와 정지 기호의 음표/쉼표 drag를 지원한다. 공유 잉크 표적, no-op·undo/redo·현재 밀도·native/XML/MIDI/PDF의 제한된 자식 범위를 검증했다.
- 남은 범위: 사용자 가족 편집·전체 기호 범위와 span anchor drag는 별도다. 모든 타일 또는 개별 화음 구성음·꾸밈음 drag로 확대 해석하지 않는다. 과거 host focus 상실과 외부 입력 관찰의 원인은 미해결이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- 음자리표의 실제960/1400 drag/취소/한undo/왕복은 SMG-012-001로 검증했다. 다른 가족은 적용 대상/anchor 정책부터 분리한다.
- 독립 slice 수용 기준으로 구체화: 기존 적용 handler의 event/measure/span anchor 제약을 audit한 뒤 한 가족 drag 경로부터 추가한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-008 · 네 표현 기호를 음표에 끌어 추가

- 현재: 네 표현 기호의 기존 click-toggle과 별도로 주 음표 이벤트에 native drag 추가를 지원한다. 동일 기호는 no-op이며 한 undo/redo·이웃·grace/tie 보존을 검증했다. 실제960/1400 8경로와 두 XML16XSD/MIDI/PDF8이 통과했다.
- 남은 범위: 개별 구성음/꾸밈음/범위·새 기호 모델은 범위 밖이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-007
- 소스: [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- 네 타일의 실제 event 대상/동일 값 no-op·한 undo/redo·기존 속성/이웃 보존
- 쉼표·내부 GraceNote·외부/위조/취소/새 문서·입력/범위/span 거부와 툴팁/focus
- 기존 네 종류 drag 보호·실제960/1400/native/XML/MIDI/PDF·설명서

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-001 · 음자리표 타일의 한 마디 드래그 적용

- 현재: 기존 마디 선택/입력 종료 조건을 유지한 음자리표 한 마디 drag와 클릭을 공유한다. focused45·실제20actions·누적전체3901검사를 통과했다.
- 남은 범위: 음자리표 한 가족의 한 마디 적용 완료. 다른 가족/사용자 팔레트/inline clef는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- hover/cancel/외부payload/문서교체/입력초안에 score mutation 없음
- 놓은 음표·쉼표의 한 마디만 변경, 동일값no-op·한undo/redo·focus 복귀
- 실제960/1400 HTMLdrag/native/교환/출력과 기존search/접힘·F6 경로 보존

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-013 · 단축키 사용자 재지정

- 현재: 실행 취소·다시 실행·잘라내기·복사·붙여넣기·삭제 6명령의 로컬 재지정과 기본 복원을 지원한다. 삭제 범위 004의 실제 UI, Escape 초안 취소, 남은 밀도 조건과 native 보존을 제한된 범위에서 완료했다.
- 남은 범위: 현재6명령과지원chord범위를넘는명령·설정파일교환·다른기기전송·실제OS/IME검증은미완이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/studio-shortcut-bindings.ts](../../src/renderer/src/studio-shortcut-bindings.ts), [src/renderer/src/StudioShortcutSettings.tsx](../../src/renderer/src/StudioShortcutSettings.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/keyboard-shortcuts.md), [참고 2](https://handbook.musescore.org/appendix/all-keyboard-shortcuts.md)

수용 기준:

- 6명령의설정·실제실행·기본복원과남은명령/파일교환범위를분리한다.
- 재지정은충돌을거부하고기존문맥/IME/선택/undo/저장계약을보존한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-013-004 · 기존 삭제 명령의 단축키 재지정·해제·복원

- 현재: 8red뒤 focused62/기존편집337/설명서3/type/build PASS. 실제I960 이벤트 삭제·해제·복원/도움말/native153확인과L1400 span버튼 nativeTab·picker focus/undo/native116확인이 통과했다. M은960light의fine/coarse/text200 3조건뒤dark진입에서native focus로중단됐다. 누적전체와나머지9밀도는미완이다. 누적 AN 470파일/4,633검사와 Node5 PASS, 고정1,947 입력 불변. 남은 밀도9조건은 미검증이다. 현재 미완9조건(960dark3/1400두theme6)을378nativeguards·20focus관측으로 완료했다. 현재Delete기본값·마디삭제경고/기록Escape취소/dialog유지·닫기/scorehistory0/native정확보존을 확인했다. fine최소36/coarse48, scoped16→32px/가로overflow없음. 대표2화면직접검토/전체9좌표검사와격리build PASS. 제품변경없는coverage다.
- 남은 범위: 기존 Delete 문맥의 재지정/해제/복원과 이벤트·span/도크 접근, 제한된 화면 밀도 검증 범위는 완료했다. 물리 IME/스크린리더/OS dialog·전체 앱200·물리touch는 별도 미검증이다. 마디 삭제와 일반 지우기의 의미는 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-013-003
- 소스: [src/renderer/src/studio-shortcut-bindings.ts](../../src/renderer/src/studio-shortcut-bindings.ts), [src/renderer/src/SpanProperties.tsx](../../src/renderer/src/SpanProperties.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/keyboard-shortcuts.md)

수용 기준:

- 기존 기본 Delete/Backspace·이전5명령·version1설정과 modifier 동작을 보존한다.
- 재지정/해제 뒤 옛 키가 전역/span/도크 버튼에서 우회 실행되지 않는다.
- 텍스트/Select/IME/geometry draft·native·선택·정확undo와삭제전picker focus를보존한다.
- 현재설정의도움말·span힌트/aria와설명서를같이갱신한다.설정자체는악보/dirty/undo를바꾸지않는다.
- 실제UI/밀도/물리입력의확인범위를별도로기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-013-001 · 기본 T 단축키의 수식키 소유권

- 현재: 수식키 T가 helper 뒤 중복 fallback으로 타이를 만들던6 red를 수정했다. focused/기존290/최종39·type/build/실제두폭 modifier12개·native/XML/MIDI/XSD8/PDF4를 검증했다. 새 전체는 미실행이다.
- 남은 범위: 사용자 키 재지정 기능이 아니라 기존 기본 T의 소유권 회귀를 좁게 다룬다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/studio-shortcuts.ts](../../src/renderer/src/studio-shortcuts.ts), [src/renderer/src/editor/keyboard-input.ts](../../src/renderer/src/editor/keyboard-input.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/keyboard-shortcuts.md)

수용 기준:

- Ctrl/Meta/Alt+T에서 문서·선택·dirty·undo 비변경
- 기본 T/Shift+T와 IME·입력창·한 명령/undo 보존
- 실제 native 키 이벤트·native/필요한 XML/MIDI/PDF와 설명서 계약 대조

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-014 · 사용자 템플릿·악보 스타일 저장

- 현재: 내장4종과 PDF 내장4프리셋에 더해 이름 있는 기기 로컬5필드 프리셋 child001을 구현·실제 검증했다.
- 남은 범위: 전체 사용자 악보 템플릿·스타일의 복제/저장/교환과 소유권은 별도 조사다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/new-score.ts](../../src/renderer/src/editor/new-score.ts), [src/renderer/src/StudioPageSetup.tsx](../../src/renderer/src/StudioPageSetup.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/templates-and-styles.md)

수용 기준:

- 현재 동작 확인: 솔로/피아노/듀엣/현악4중주 내장 템플릿은 있으나 사용자 템플릿/스타일 라이브러리는 없다.
- 독립 slice 수용 기준으로 구체화: 현재 악보에서 복제·저장하는 범위와 데이터 소유권을 정하고 내장/사용자 항목을 분리한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-014-001 · 이름 있는 로컬 출력 설정 프리셋

- 현재: 기기 로컬5필드 목록/오류/IME/문서 소유권과 기존 총보/파트 명령의 no-op·undo를 구현했다. 실제 I960/1400/12밀도·native·두 XML/MIDI/PDF·재시작을 검증했다. 누적 Z427파일4,294검사/Node5와1,322입력 유지까지 통과했다.
- 남은 범위: 현재 뷰에 기존 명령으로만 적용한다. 전체 악보 템플릿/스타일·파일 교환은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/new-score.ts](../../src/renderer/src/editor/new-score.ts), [src/renderer/src/StudioPageSetup.tsx](../../src/renderer/src/StudioPageSetup.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/templates-and-styles.md)

수용 기준:

- 기기 로컬 저장/갱신/삭제·재열기, 손상/실패·이름/개수 범위와 소수값 보존
- 현재 총보/선택 파트에 기존 명령1회/undo1회, 동일 값 no-op와 이웃 보존
- IME·미확정 입력·문서/뷰 변경·focus 소유권 보존
- 실제960/1400 공통 UI·native/출력 검증과 설명서

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지
- GE/GR동일1549소스: PDF프리셋/용지/방향의 총보/파트보·동일ID문서교체승인/취소24조건, Native score/partLayouts/settings/view84·정확undo/redo·대표PNG2검토 PASS. 기존key의현행QA이며 제품수정/새PDF/물리OS승인아님. A의없는버튼대기실패는보존했다.
- GE/GR동일소스: 실제잘못된Native의main검증거부→App오류안내12조건,현재PDF후보/문서보존·명시1명령/undo/redo·Native score/layout/settings/view36. C tracker의reject누락보존/D관측만정정. 새제품/PDF/물리승인아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-015 · 실음·기보음 화면 전환

- 현재: 악기 이조·기보음/실음 재생은 있지만 전역 concert-pitch 보기 전환은 공개 UI에 없다.
- 남은 범위: 읽기 audit 완료: 저장된transposition 변경 명령을 보기toggle로재사용할수없다. 원본ID/조표·임시표 projection, 선택/입력역변환과화면/PDF모드를설계해야한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/instrument-transposition.ts](../../src/renderer/src/editor/instrument-transposition.ts), [src/renderer/src/StudioPartLabels.tsx](../../src/renderer/src/StudioPartLabels.tsx), [src/renderer/src/StudioScoreView.tsx](../../src/renderer/src/StudioScoreView.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/transposition.md)

수용 기준:

- 현재 동작 확인: 악기 이조·기보음/실음 재생은 있지만 전역 concert-pitch 보기 전환은 공개 UI에 없다.
- 독립 slice 수용 기준으로 구체화: 기보 데이터 변경 없는 보기 전환인지 조표/임시표/선택/음표 입력 의미부터 audit한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-016 · 메트로놈

- 현재: 기본꺼짐 독립 연습클릭과 부분노드/예약오류 정리를 child001/002에서 전체P까지 완료했다. 기존piano의시계/cache를재사용하며파일출력을바꾸지않는다.
- 남은 범위: 독립보표박자·count-in·별도음색/음량·오디오파일출력은별도범위다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/playback/metronome.ts](../../src/renderer/src/playback/metronome.ts), [src/renderer/src/StudioPlayback.tsx](../../src/renderer/src/StudioPlayback.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/playback-controls.md)

수용 기준:

- 승인된 기본꺼짐·파트믹서독립·출력미포함의 연습 클릭부터 실제 clock/취소/출력 비변경을 검증한다.
- 독립 slice 수용 기준으로 구체화: 현재 clock·tempo·변박자·pause/seek 계약을 재사용해 메트로놈의 실제 박과 mute 정책을 검증한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-017 · 선택 구간 루프 재생

- 현재: 연속 구간·총보·세션 전용 loop child001은 완료했다. 반복/볼타·경계 타이·선택 보표 loop 등 확장 범위는 설계 잔여다.
- 남은 범위: 첫 범위 완료와 전체 MuseScore loop를 구분한다. 반복/볼타 수행 차수·경계 타이/선택 보표·표식 편집은 별도 설계가 필요하다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioPlayback.tsx](../../src/renderer/src/StudioPlayback.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/playback-controls.md)

수용 기준:

- 현재 동작 확인: 반복/볼타 악보 재생은 지원하지만 임의 구간 loop marker/재생 toggle은 없다.
- 독립 slice 수용 기준으로 구체화: 악보 반복과 연습용 loop를 분리해 범위·끝 위치·타이·stop/seek·문서 교체를 검증한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-017-001 · 연속 구간·총보의 세션 연습 루프

- 현재: 승인된 연속 구간·총보 세션 루프를 구현했다. 실제 활성 저장/출력·취소/오류 retry·offline130음성 파형0/profile/fixed와 누적 Y4256검사/Node5를 통과했다. 2026-11-08 독립 시계 감사에서 스윙 음가/비율·빠르기 변경·부분 첫 회차의16조합과10,000회경계/click-piano동기화·지연/중복pump·Native16/MIDI16을 확인했다. 제품 변경 없는 명령/시계 회귀이며 새 청음/UI 승인은 아니다.
- 남은 범위: 반복·볼타와 경계 타이는 거부하고 기존 일반 재생을 유지한다. native/XML/MIDI/PDF에는 저장하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioPlayback.tsx](../../src/renderer/src/StudioPlayback.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/playback-controls.md)

수용 기준:

- 연속 선택의 첫 시작부터 마지막 음의 끝 exclusive, 총보·기존 mixer 적용
- 반복·볼타/경계 타이/정렬 불가 보표와 stale anchor를 설명하고 원본 보존
- 같은 오디오 시계/cache, tempo/fermata, pause/start/stop/off, 예약 취소와 drift 방지
- 실제960/1400 공개 경로·키보드/포커스·native/두 XML/MIDI/PDF 비변경

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지
- Current pure selection→timeline→loopclock→piano/click queues16conditions PASS against independent swing ratio/BPM integral;1/2/100/10000lap boundaries, duplicate/late pumps, Native/MIDI before/after exact. B retains actual16+16files; same16cases, no product change/source1480EYsame/live audio approval.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-018 · MIDI 키보드 입력

- 현재: MIDI 사본 출력은 있으나 장치 입력/연결·step/chord 입력 경로는 없다.
- 남은 범위: 권한·장치 수명·음표 off·동시 화음·입력 모드·undo 계약을 정한 별도 단계로 구현한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/keyboard-input.ts](../../src/renderer/src/editor/keyboard-input.ts), [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/working-with-midi.md), [참고 2](https://handbook.musescore.org/basics/entering-notes-and-rests.md)

수용 기준:

- 현재 동작 확인: MIDI 사본 출력은 있으나 장치 입력/연결·step/chord 입력 경로는 없다.
- 독립 slice 수용 기준으로 구체화: 권한·장치 수명·음표 off·동시 화음·입력 모드·undo 계약을 정한 별도 단계로 구현한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-019 · 음높이를 먼저 고르는 입력 모드

- 현재: 기존duration-first입력과미지원native설정안내child001을누적P까지검증했다. 실제pitch-first입력기는없다.
- 남은 범위: pitch-first staging/화음/caret/키보드와저장설정의적용정책이필요하다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/note-input-state.ts](../../src/renderer/src/editor/note-input-state.ts), [src/renderer/src/StudioNoteToolbar.tsx](../../src/renderer/src/StudioNoteToolbar.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/input-by-duration-mode.md)

수용 기준:

- 현재 동작 확인: 현재는 음가 선택 후 A–G 입력이다. 별도 pitch-first 모드 전환은 없다.
- 독립 slice 수용 기준으로 구체화: 기존 기본 입력을 보존하며 pitch-first 상태·쉼표·화음·caret·IME·단축키 충돌을 audit한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-020 · 줄기·빔·리듬 묶음 수동 편집

- 현재: 자동 voice-based 줄기/빔은 유지한다. 실제 type/native schema/command/toolbar에서 수동 줄기 방향·길이·숨김/빔 override가 없는 것을 확인했다.
- 남은 범위: 수동 authoring은 모델·명령·XML/renderer 설계가 필요하다. 먼저 기존 모델 비변경의 stemless import 경고 누락을 SMG-020-001로 분리한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/StudioNoteToolbar.tsx](../../src/renderer/src/StudioNoteToolbar.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/stems-and-flags.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/beams.md), [참고 3](https://handbook.musescore.org/notation/rhythm-meter-and-measures/regroup-rhythms.md)

수용 기준:

- 현재 동작 확인: 자동 stem/beam 렌더링은 있으나 수동 방향·분할·feathering·리듬 재묶음의 공개 범위는 추가 확인이 필요하다.
- 독립 slice 수용 기준으로 구체화: 정확한 공개 조작과 import/native 보존을 따로 audit한 뒤 미지원 sub-feature를 분리한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-021 · 추가 음가 범위

- 현재: 현재 DurationValue는 온음표부터64분음표까지7종이다.
- 남은 범위: 128/256분음표·배온음표 이상은 tick 해상도·글리프·입력·파일 의미를 정하기 전 지원한다고 쓰지 않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/renderer/src/StudioNoteToolbar.tsx](../../src/renderer/src/StudioNoteToolbar.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/entering-notes-and-rests.md), [참고 2](https://handbook.musescore.org/appendix/all-keyboard-shortcuts.md)

수용 기준:

- 현재 동작 확인: 현재 DurationValue는 온음표부터64분음표까지7종이다.
- 독립 slice 수용 기준으로 구체화: 128/256분음표·배온음표 이상은 tick 해상도·글리프·입력·파일 의미를 정하기 전 지원한다고 쓰지 않는다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-022 · 보표 사이 이동·교차보표 기보

- 현재: 일반다중보표/입력대상전환은있지만원래성부와표시보표를분리하는모델/명령은없다. 유효cross-staffXML은현재gap으로거부된다.
- 남은 범위: 성부소유권/표시보표/beam·tie/slur/선택·undo/native/XML설계가필요하다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/keyboard/cross-staff-notation.md)

수용 기준:

- 현재 동작 확인: 다중 보표/성부와 피아노는 지원한다. cross-staff beam/note의 별도 공개 범위는 미확정이다.
- 독립 slice 수용 기준으로 구체화: 음의 소유 성부/표시 보표·beam·tie/slur·XML을 분리 조사한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-023 · 여러 마디 쉼표·빈 보표 숨김

- 현재: 온마디쉼표type생략과길이변환안내는완료했다. 명시multiple-rest지시는보존하지않으며손실안내child003은작은진단gate를통과했다. 묶기생성과빈보표숨김의전용모델/명령은별도조사·설계다.
- 남은 범위: 자동 묶음·분할·마디 번호·파트보·재생/출력 의미를 확인한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/StudioScoreView.tsx](../../src/renderer/src/StudioScoreView.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests.md), [참고 2](https://handbook.musescore.org/notation/instruments-staves-and-systems/showing-staves-only-where-needed.md)

수용 기준:

- 현재 동작 확인: 일반 쉼표·파트보는 지원한다. multimeasure rest/빈 보표 생략의 실제 생성·복원 경로는 조사 전이다.
- 독립 slice 수용 기준으로 구체화: 자동 묶음·분할·마디 번호·파트보·재생/출력 의미를 확인한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-024 · D.C./D.S./Coda와 마디 반복 기호

- 현재: 기본도돌이표/1·2볼타는있다. jump/marker의별도모델과명령은없으며명시sound source는현재순서그대로재생된다. 1/2/4마디measure-repeat의무경고표기손실은024002에서실제CD12조건으로확인했다.
- 남은 범위: 명시jump/marker손실안내001과마디반복손실안내002를실제기호/편집/속성·스타일/재생모델설계와구분한다. measure-repeat전체기능은needs-design으로유지한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioRepeatTools.tsx](../../src/renderer/src/StudioRepeatTools.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/repeats/jumps-and-markers.md), [참고 2](https://handbook.musescore.org/notation/repeats/measure-and-multimeasure-repeats.md), [참고 3](https://handbook.musescore.org/notation/repeats/items-across-repeats-and-jumps.md)

수용 기준:

- 현재 동작 확인: 기본 도돌이표/1·2번 볼타와 반복 재생은 있다. jump/marker·마디 반복은 별도 조사 대상이다.
- 독립 slice 수용 기준으로 구체화: 표기·명령·재생·XML 계약을 분리하고 기존 반복 완료를 미구현으로 되돌리지 않는다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025 · 음표 머리·음역·추가 표현 기호

- 현재: 음표 머리·추가 기호·MIDI 표현의 손실 안내와 네 장식음/정지 기호의 현재 지원 구분을 검증했다. 꼬리 있는 단음 tremolo의 내부 간격과 추가 보표의 tremolo 누락 표시를 좁게 수정했고 실제 native/XML/MIDI/PDF 및 BU 전체 회귀를 확인했다. 부분 완료를 전용 기호 편집 전체로 해석하지 않는다. 개별note숨김지정손실의진단/반복요약은025011에서좁게보완했고실제native검수는남아있다.
- 남은 범위: notehead 직접 편집·scheme·visual duration, ambitus·아르페지오·글리산도·l.v. 및 전체 스타일/재생 모델은 별도 조사·설계다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioEventMarks.tsx](../../src/renderer/src/StudioEventMarks.tsx), [src/renderer/src/StudioNoteDecorations.tsx](../../src/renderer/src/StudioNoteDecorations.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md), [참고 2](https://handbook.musescore.org/notation/pitch/ambitus.md), [참고 3](https://handbook.musescore.org/notation/expressive-markings/arpeggios-and-glissandos.md), [참고 4](https://handbook.musescore.org/notation/expressive-markings/laissez-vibrer-ties.md), [참고 5](https://handbook.musescore.org/notation/expressive-markings/breaths-and-pauses.md)

수용 기준:

- 현재 동작 확인: 기본 notehead·4표현·4장식·트레몰로는 지원한다. 추가 종류의 개별 지원 범위는 조사 전이다.
- 독립 slice 수용 기준으로 구체화: notehead·ambitus·arpeggio/glissando·l.v. tie를 독립 sub-feature로 나눠 audit한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-026 · 기타 TAB·프렛보드·주법 편집

- 현재: TAB clef와 MIDI 건너뛰기 안내는 기존 지원이다. 코드 프렛보드 그림의 가져오기 손실 안내child001은검증완료했다. 그림보존/편집·TAB입력·튜닝·벤드/기타재생은추가조사다.
- 남은 범위: 전용 TAB/프렛보드/카포/튜닝/벤드 기능별 표기·저장·재생 범위를 조사한다. 실제native TAB의화면/PDF G-clef fallback과원래TAB기보의차이를확인했다. 전용기보·출력정책은별도범위로결정한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/guitar/entering-and-editing-tablature-notation.md), [참고 2](https://handbook.musescore.org/idiomatic-notation/guitar/fretboard-diagrams.md), [참고 3](https://handbook.musescore.org/idiomatic-notation/guitar/applying-capos.md), [참고 4](https://handbook.musescore.org/idiomatic-notation/guitar/alternate-string-tunings.md), [참고 5](https://handbook.musescore.org/idiomatic-notation/guitar/guitar-bends.md)

수용 기준:

- 현재 동작 확인: TAB clef 원본 표시/보존 경계가 있으며 MIDI 건너뛰기 안내가 있다. 전용 입력·튜닝·벤드 UI는 미확인이다.
- 독립 slice 수용 기준으로 구체화: 전용 TAB/프렛보드/카포/튜닝/벤드 기능별 표기·저장·재생 범위를 조사한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-027 · 타악기 전용 입력·킷 편집

- 현재: 현재 타악기 clef와 MIDI 건너뛰기 정책, MusicXML unpitched 입력의 지원 경계 안내를 구분한다. 자식001에서 유효 XML의 미지원 입력 거부·기존 문서 보존·정상 rest 재시도·native 재열기를 실제 두 폭에서 검증했다. 전용 타악기 입력·킷 재생을 추가한 것은 아니다.
- 남은 범위: 악기·notehead·음색·MIDI mapping·사용자 킷 프리셋의 전용 모델과 실제 입력 정책은 별도 조사다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/renderer/src/StudioInputTarget.tsx](../../src/renderer/src/StudioInputTarget.tsx), [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/percussion/inputting-percussion-notation.md), [참고 2](https://handbook.musescore.org/idiomatic-notation/percussion/percussion-kit-customization.md)

수용 기준:

- 현재 동작 확인: 타악기 clef 처리와 MIDI 제한 안내는 있으나 전용 percussion 입력/킷 mapping은 미확인이다.
- 독립 slice 수용 기준으로 구체화: 악기·notehead·음색·MIDI mapping과 사용자 프리셋을 조사한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-028 · 고급 글자 서식·운지·숫자저음

- 현재: 일반 글자·가사·코드·연습표의 기존 편집과 여러 words 조각·숫자저음·굵게/기울임/지정 글꼴·크기·색의 손실 안내를 검증했다. 가사 실제 문자 입력·확정·undo·재열기 및 경고 읽기 키의 음악 명령 격리를 실제 경로에서 확인했다. 기존 source/output 보존과 BU 전체 회귀를 구분해 기록했다. 코드 구성음 degree의 무경고 손실은010에서 기존 진단/한국어 안내로 보완하고 BZ 전체를 통과했다. 원래 구조 모델의 보존/편집은 추가하지 않았다. 011상대/013복수화음손실안내와012기존접미사표시를별도child에서검증했고누적CC5232+Node5를통과했다. 원래관계모델/복수구조복원·새문법/연주는지원하지않는다. 016은 가사 숨김의 유효 표시 상속·덮어쓰기와 무경고 손실을 진단한다. 원래 비표시 복원 모델은 추가하지 않았다. 017은 한 음절의 연속text에서 없는공백이추가되거나내부공백이줄어드는오류를수정한다. 기존elision과일반문자열모델은유지한다. 018은 일반가사text의italic/bold손실을기존진단/한국어안내로연결하며모델/원래서식복원은추가하지않았다. 019는 명시적 elision 문자/SMuFL의 무경고 손실을 진단하며 기존 평문 fallback과 기호 복원 미지원 정책은 유지한다. 022는 별도 파트 이름·약칭 표시 설정 손실을 진단하며 formal name과 재생 의미를 유지한다.
- 남은 범위: 손실 안내와 의미 있는 전용 서식 편집은 다르다. rich text 조각·폰트/색 보존 편집·운지·숫자저음 전용 모델/레이아웃 전체는 별도 조사·설계다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx), [src/renderer/src/StudioLyricTools.tsx](../../src/renderer/src/StudioLyricTools.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/formatting-text.md), [참고 2](https://handbook.musescore.org/text/fingering.md), [참고 3](https://handbook.musescore.org/text/figured-bass.md), [참고 4](https://handbook.musescore.org/text/lyrics.md), [참고 5](https://handbook.musescore.org/text/rehearsal-marks.md), [참고 6](https://handbook.musescore.org/text/entering-and-editing-text.md)

수용 기준:

- 현재 동작 확인: 일반 글자·가사·코드·연습표는 지원한다. rich text/운지/숫자저음의 개별 편집 범위는 별도다.
- 독립 slice 수용 기준으로 구체화: 일반 문자열로 표시하는 것과 의미 있는 전용 표기를 분리 조사한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-001 · 숫자저음 MusicXML 손실 안내

- 현재: 7red/2대조 후 기존 손실 보고서로 연결했다. focused63파일645·type/build·실제960/1400/12밀도·native/두 XML/MIDI/XSD4/PDF4를 검증했다. 전체 Z4294는 변경 전이다.
- 남은 범위: 표기/재생/편집을 새로 구현하지 않고 기존 손실 보고서의 누락만 보완한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx), [src/renderer/src/StudioLyricTools.tsx](../../src/renderer/src/StudioLyricTools.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/figured-bass.md)

수용 기준:

- 원본 part/measure/occurrence·숨김/연장선/속성·빈 figure를 모델 미지원 데이터로 안내하고 실제 잉크 손실과 구분한다.
- 일반 음표/코드에 허위 경고를 추가하지 않고 현재 정규화 모델/native/MIDI와 사본 내용을 유지한다.
- 한국어 우선/접힌 기술 정보·실제960/1400·native/두 XML/MIDI/정규화 대조 PDF를 검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-029 · 프레임·이미지·악장 구분

- 현재: root credit-image의 손실 안내는 child001에서 완료했다. direction-image에는 기존 경고가 있다. 이미지/프레임/악장 직접 기능은 별도 조사·설계가 필요하다.
- 남은 범위: 삽입/배치/출력/파일 경로·개인정보 경계를 조사하고 범위를 정한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioPageSetup.tsx](../../src/renderer/src/StudioPageSetup.tsx), [src/renderer/src/StudioMetadataActions.tsx](../../src/renderer/src/StudioMetadataActions.tsx), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/formatting/using-frames-for-additional-content.md), [참고 2](https://handbook.musescore.org/formatting/working-with-images.md), [참고 3](https://handbook.musescore.org/formatting/using-sections-for-multiple-movements-or-songs.md), [참고 4](https://handbook.musescore.org/formatting/page-layout-concepts.md), [참고 5](https://handbook.musescore.org/text/entering-and-editing-text.md)

수용 기준:

- 현재 동작 확인: 기존 제목/작곡가/페이지 설정과 프레임·이미지·섹션은 다른 기능이다.
- 독립 slice 수용 기준으로 구체화: 삽입/배치/출력/파일 경로·개인정보 경계를 조사하고 범위를 정한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-029-001 · 페이지 이미지 MusicXML 손실 안내

- 현재: root credit-image의 무안내 손실을 확인해 원본 쪽/credit 위치와 URI 비노출의 기존 report로 연결했다. red5/대조3→focused8/확대644, 실제960/1400/12밀도와 native/4XML XSD/MIDI/PDF4 통과.
- 남은 범위: 이미지 삽입/렌더링/프레임 편집·네트워크·새 모델을 구현하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/formatting/working-with-images.md)

수용 기준:

- root credit/발생 번호·페이지·유형/크기와 한국어 우선 안내; URI 비노출·비조회·허위 part/measure 금지
- plain/기존 제목과 direction-image 경고를 보존하며 음악/native/MIDI/두 XML의 기존 정규화 내용을 바꾸지 않음
- 실제960/1400·닫힌 기술 정보/키보드·dirty/선택·native 재열기·원본/사본 XSD·정규화 대조 PDF

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030 · 머리말·꼬리말·마디 번호 설정

- 현재: 문제 파트의 번호 정규화·native 사전검사·표시 손실 안내·첫 마디 표기·반복/볼타 출력 소유권과 고지 손실 안내를 검증했다. 0번호 못갖춘마디·타이 및 조표/마디 속성/성부 편집 시 유효 원본 번호·ID·이웃·수동 geometry 보존도 자식008–010의 실제 경로에서 확인했다.
- 남은 범위: 임의 머리말/꼬리말·권리 정보 보존/편집·페이지 번호 치환·마디 번호 스타일 전체와 파트보 반복 표시 정책은 별도 조사다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioMetadataActions.tsx](../../src/renderer/src/StudioMetadataActions.tsx), [src/renderer/src/StudioPageSetup.tsx](../../src/renderer/src/StudioPageSetup.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md), [참고 3](https://handbook.musescore.org/text/entering-and-editing-text.md)

수용 기준:

- 현재 동작 확인: 제목·작곡가·파트 제목은 지원한다. 임의 header/footer와 번호 사용자 지정 전체를 지원한다고 단정하지 않는다.
- 독립 slice 수용 기준으로 구체화: 페이지번호·메타데이터 치환·마디번호·파트보 반복 표시를 구분 조사한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-001 · 원본 마디 번호와 내부 주소의 가져오기 계약

- 현재: 승인된문제파트만순서주소/손실안내 완료. focused51/확대1621/AF4458+Node5, actualU6경로·24XML XSD/PDF12·24쪽·native/undo, X보호재시도와Y12밀도 통과. AF후pickup3/XSD6는회귀coverage만추가했다.
- 남은 범위: 내부주소와 원본표시번호를 구분해야 하며 문자모델/schema 확장으로 우회하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-030-004
- 소스: [src/renderer/src/StudioMetadataActions.tsx](../../src/renderer/src/StudioMetadataActions.tsx), [src/renderer/src/StudioPageSetup.tsx](../../src/renderer/src/StudioPageSetup.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 해당파트 내부1..N 정규화+원본손실안내 또는 명확한 사전거부 정책 확정
- 기존고유양정수/다른파트·annotation/타이/슬러/반복/재생·native 및 선택/undo 보존
- 실제메뉴/두 XML/MIDI/PDF와XSD·기존문서교체보호 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-002 · 가져오기 전 프로젝트 구조 검증

- 현재: openScore전기존native구조/참조검사를재사용했다.4red/2대조→focused6/type/build/확대917,실제960/1400오류보호·native경로/undo/redo·정상재시도/두XML/MIDI/PDF통과. 승인001후회귀6은parser실패와129박native실패를명확히구분했다. 실제v4 UI미완료이며기존이력과구분한다. actualX는v4 parser/native거부·undo/기존경로/정상재시도·native/두XML/MIDI/PDF까지통과했다.
- 남은 범위: 승인된 번호 정규화001 뒤에도 native 구조·참조 검사는 유지한다. 잘못된 박자0/129/문자 사례로 기존 문서 보호 회귀를 이전했다. 미래 파일 크기/저장 성공 보장이 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/project/schema.ts](../../src/project/schema.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 불가능한native구조가새문서로적용되기전현재문서·dirty·선택·undo·native경로를유지
- 최근실패는시작화면/목록을유지하고기존parse거부·유효양정수재시도/저장을그대로허용
- 기존open/wizard/race/교환회귀와실제960/1400메뉴/키보드/저장/재열기/출력 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-031 · SVG 제품 내보내기

- 현재: 현재 PDF/PNG 출력과 SVG 기반 renderer가 있어도 SVG 파일 내보내기 제품 경로는 없다.
- 남은 범위: 폰트/실제 잉크/변환기 배포/접근성/편집 가능성과 다중 페이지 정책을 먼저 정한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioExportTools.tsx](../../src/renderer/src/StudioExportTools.tsx), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/file-export.md)

수용 기준:

- 현재 동작 확인: 현재 PDF/PNG 출력과 SVG 기반 renderer가 있어도 SVG 파일 내보내기 제품 경로는 없다.
- 독립 slice 수용 기준으로 구체화: 폰트/실제 잉크/변환기 배포/접근성/편집 가능성과 다중 페이지 정책을 먼저 정한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-032 · 오디오 파일 내보내기

- 현재: 실제 피아노 재생과 MIDI 출력은 WAV/MP3 등 오디오 파일 출력과 다르다.
- 남은 범위: offline rendering·반복/표현·sample license·tail·용량/취소 정책을 정한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioExportTools.tsx](../../src/renderer/src/StudioExportTools.tsx), [src/renderer/src/StudioPiano.tsx](../../src/renderer/src/StudioPiano.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/file-export.md)

수용 기준:

- 현재 동작 확인: 실제 피아노 재생과 MIDI 출력은 WAV/MP3 등 오디오 파일 출력과 다르다.
- 독립 slice 수용 기준으로 구체화: offline rendering·반복/표현·sample license·tail·용량/취소 정책을 정한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-033 · 외부 음원·SoundFont·VST

- 현재: 내장 피아노 sample/믹서는 있으나 일반 음원 설치·VST host UI는 없다.
- 남은 범위: 보안·라이선스·프로세스 경계·플랫폼 지원을 별도 설계한다. MuseSounds 자산을 복제하지 않는다. 기존 음표별 악기 참조의 손실 안내는 child001로 분리하며 실제 악기 전환/채널·음원 모델은 별도 설계다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioPiano.tsx](../../src/renderer/src/StudioPiano.tsx), [src/renderer/src/StudioPlayback.tsx](../../src/renderer/src/StudioPlayback.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/soundfonts.md), [참고 2](https://handbook.musescore.org/sound-and-playback/working-with-vst-and-vsti.md), [참고 3](https://handbook.musescore.org/sound-and-playback/mixer.md), [참고 4](https://handbook.musescore.org/notation/instruments-staves-and-systems/mid-score-instrument-changes.md)

수용 기준:

- 현재 동작 확인: 내장 피아노 sample/믹서는 있으나 일반 음원 설치·VST host UI는 없다.
- 독립 slice 수용 기준으로 구체화: 보안·라이선스·프로세스 경계·플랫폼 지원을 별도 설계한다. MuseSounds 자산을 복제하지 않는다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-034 · 이름 있는 작업 공간·자유 도킹

- 현재: 도크 snapshot child는 실제 UI/출력/전체L gate를 완료했다. 기존 폭/표시/열린 탭은 보존하며 이름 저장/명시적 복원/갱신/삭제를 제공한다.
- 남은 범위: 전체 MuseScore workspace의 palette/toolbar 내용과 자유 도킹은 별도 설계가 필요하다. 작은 child 완료를 전체 workspace 완료로 확대하지 않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioDockHeader.tsx](../../src/renderer/src/StudioDockHeader.tsx), [src/renderer/src/StudioDockResizeHandle.tsx](../../src/renderer/src/StudioDockResizeHandle.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/workspaces.md), [참고 2](https://handbook.musescore.org/customization/toolbars-and-windows.md), [참고 3](https://handbook.musescore.org/customization/appearance.md)

수용 기준:

- 현재 동작 확인: 현재 도크 폭200–360/default280·표시 preference를 제공한다. 이것은 자유 도킹/작업 공간 프로필 관리가 아니다.
- 독립 slice 수용 기준으로 구체화: 기존 preference 호환과 reset 의미를 유지하며 필요한 범위를 audit한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-035 · 복수 선택 속성·고급 선택/탐색

- 현재: 포인터 초점 표시, 현재 선택·필터·복사 범위 안내와 같은 마디 단순 음표/쉼표 잘라내기를 검증했다. 자식005에서 입력 성부 전환과 기존 음표 이동의 실제 범위 안내·읽기 키 격리를 확인했다. 삭제 키 정책004는 제품 결정 범위로 남기며 복수 선택 편집이 완성됐다고 표시하지 않는다.
- 남은 범위: 다중 마디·비연속 목록·mixed 속성과 시각 Timeline은 미지원이다. 마디 내용 지우기/구조 제거의 키 정책004는 별도 설계로 유지한다. 006의 마디·표기 단위 키 탐색은 실제 현행 대조 후 별도 needs-design이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx), [src/renderer/src/StudioFileTools.tsx](../../src/renderer/src/StudioFileTools.tsx), [src/renderer/src/StudioStatusBar.tsx](../../src/renderer/src/StudioStatusBar.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/selecting-elements.md), [참고 2](https://handbook.musescore.org/basics/copy-and-paste.md), [참고 3](https://handbook.musescore.org/navigation/timeline.md), [참고 4](https://handbook.musescore.org/appendix/all-keyboard-shortcuts.md)

수용 기준:

- 현재 동작 확인: 단일/범위·필터·일부 객체 편집은 지원한다. 전체 mixed 편집·Timeline 등의 일치는 미검증이다.
- 독립 slice 수용 기준으로 구체화: 지원 선택 집합과 복사/필터/탐색의 실제 계약을 기능별 대조한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-035-004 · 마디 내용 지우기와 마디 제거의 키 정책

- 현재: 현재 마디 선택의 일반 Delete도 removeMeasure를 호출한다. 원본 의미를 보존한013004 재지정에서 이를 명시했으며, 별도 clearSelection 메뉴와 같은 단축키를 잘못 연결하지 않았다. 공식 추가/삭제 장의 누락된 목차 연결을 보완했다. 기존 앞/뒤 한 마디의 총보 적용·구조 번호 재지정을 소스로 대조했고 새 구현/검증으로 계산하지 않는다. 현재 총보 한 마디 구조 범위/번호 재지정/마디 선택 Delete의 설명은2red 뒤 본문/catalog/확인표에 보완했고 설명서9/type/build·실제960기본/1400본문200·기본확인표/Escape/파일대화상자0을 확인했다. 키 정책 자체는 그대로이며 새 기능 구현으로 세지 않는다.
- 남은 범위: MuseScore의 일반 삭제/마디 제거 키 구분과 비교해 내용 지우기의 보표·성부·기호 끝점 보존과 별도 제거 키를 설계한다. 현재 의미를 승인 없이 바꾸지 않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.delete-shortcut-settings.test.tsx](../../src/renderer/src/App.delete-shortcut-settings.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/default-keyboard-shortcuts.md), [참고 2](https://handbook.musescore.org/basics/editing-notes-and-rests.md), [참고 3](https://handbook.musescore.org/basics/adding-and-removing-measures.md)

수용 기준:

- 선택 마디/보표/성부의 내용 지우기 범위와 실제 마디 제거를 구분한 정책·예제를 승인받는다.
- 음표/쉼표·타이/잇단·부착 표기/끝점을 잃지 않는 변경 또는 명시적 거부를 설계한다.
- 기본·재지정 키/메뉴/설명서와undo/native/음악시간의적용범위를검증한다.
- 정책전현재Delete동작을유지하고미구현을완료로보고하지않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036 · 외부 MusicXML 이조·중첩 반복 호환성

- 현재: 기본/반복 펼치기 MusicXML 출력은 구현됐다. 과거 MuseScore 종료 문제와 의미 불일치는 미해결이다. 이 worktree에는 과거 musescore-playback.test.ts/qa.md가 없고 invocation 검사는 변환 실행 정책 검사다.
- 남은 범위: 기존 외부 비교 자료의 현재 존재와 실행 경로를 먼저 복원·대조한 뒤 새 가설·정상 종료 출력으로만 원본/왕복/MIDI를 비교한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/testing/musescore-invocation.test.ts](../../src/testing/musescore-invocation.test.ts), [docs/releases/studio-alpha39-20261103/publication-notes.md](../../docs/releases/studio-alpha39-20261103/publication-notes.md)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md), [참고 2](https://handbook.musescore.org/notation/repeats/items-across-repeats-and-jumps.md)

수용 기준:

- 현재 동작 확인: 기본/반복 펼치기 MusicXML 출력은 구현됐다. 과거 MuseScore 종료 문제와 의미 불일치는 미해결이다.
- 독립 slice 수용 기준으로 구체화: 새 가설·정상 종료 산출물로 원본/왕복/MIDI를 비교한다. 내부 테스트나 XSD 통과를 외부 호환성으로 대체하지 않는다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-037 · 스크린리더·점자·물리 입력 검수

- 현재: 접근성 이름·키보드와 합성 IME 검사는 있지만 전체 OS/SR/물리IME/점자 지원을 승인하지 않았다. 현재 Help에 초점/선택과 Enter·Space 역할을 구분하고 실제 일반 음표·span 활성과 재생 시작 0/8.5박을 native960/1400으로 대조했다. 실제 스크린리더 검수와 구분한다. 003은긴혼합진단목록의실제높이초과를재현해원문보존내부읽기영역을추가했다. 합성키/숨김scrollAPI검증과실제OS/SR검수는구분한다.
- 남은 범위: 접근성 도구 실제 사용과 기능 부재/검수 미완을 구분한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioManual.tsx](../../src/renderer/src/StudioManual.tsx), [src/renderer/src/StudioNoteToolbar.tsx](../../src/renderer/src/StudioNoteToolbar.tsx), [scripts/studio-native-input-state-qa.cjs](../../scripts/studio-native-input-state-qa.cjs)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/accessibility.md), [참고 2](https://handbook.musescore.org/navigation/braille.md), [참고 3](https://handbook.musescore.org/customization/appearance.md)

수용 기준:

- 현재 동작 확인: 접근성 이름·키보드와 합성 IME 검사는 있지만 전체 OS/SR/물리IME/점자 지원을 승인하지 않았다.
- 독립 slice 수용 기준으로 구체화: 접근성 도구 실제 사용과 기능 부재/검수 미완을 구분한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지
- 문서 누락 A/읽기 스크롤 B 보존 → Help C6경로354가드와 악보 활성 B2경로174가드, 실제 화면·native·timeline0/8.5 대조. 제품 소스 동일/BY 전체 재사용. 물리IME/SR/전체앱200%는 별도 미검증.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-038 · 온라인 게시·영상·플러그인 생태계

- 현재: MuseScore 서비스 연동은 별도 제품 기능이다. Studio의 파일 출력/Score 수동 전달과 다르다.
- 남은 범위: 계정·외부서비스·라이선스·보안·배포 결정 전 자동 구현하지 않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioExportTools.tsx](../../src/renderer/src/StudioExportTools.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/publish-to-musescore.com.md), [참고 2](https://handbook.musescore.org/file-management/share-on-audio.com.md), [참고 3](https://handbook.musescore.org/video/exporting-video.md), [참고 4](https://handbook.musescore.org/customization/plugins.md)

수용 기준:

- 현재 동작 확인: MuseScore 서비스 연동은 별도 제품 기능이다. Studio의 파일 출력/Score 수동 전달과 다르다.
- 독립 slice 수용 기준으로 구체화: 계정·외부서비스·라이선스·보안·배포 결정 전 자동 구현하지 않는다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

## SMG-039 · 앱 내 현재 지원 범위·미지원 목록 열람

- 현재: 오프라인 도움말은 이미 구현된 미배포 작업본이다. 이번에 비교 목록의 앱 내 열람을 보완한다. 2026-11-08 복구본열기의실제즉시동선을기존App7회귀(필터163skip)로확인하고취소대화상자를연상시키는안내를교정했다. 열기자체undo미지원과실제파일저장별도를분리한다. 제품수정없이오프라인본문/목록을갱신하며current build검증을이어간다. 현재기존설명서9파일39/type/AC격리build/profile/fixed와pure기본4+본문2004/대표3이미지로교정문구를확인했다. 제품src/packages1221개EH동일/manifest불변,새제품테스트나OS승인이아니다. 2026-11-08 transport/follow안내를정지/추적복귀와악보undo의차이로명확히썼다. 기존92·설명서39/type/AD격리build/profile/fixed·pureManual16조건/대표2이미지PASS,제품1221개EH동일·새제품회귀/물리승인아님.
- 남은 범위: 목차·검색으로 지원 차이를 읽고 사용 가능한 대안으로 돌아갈 수 있게 한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioManual.tsx](../../src/renderer/src/StudioManual.tsx), [docs/product/studio-manual/manifest.json](../../docs/product/studio-manual/manifest.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- 현재 동작 확인: 오프라인 도움말은 이미 구현된 미배포 작업본이다. 이번에 비교 목록의 앱 내 열람을 보완한다.
- 독립 slice 수용 기준으로 구체화: 목차·검색으로 지원 차이를 읽고 사용 가능한 대안으로 돌아갈 수 있게 한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-040 · 새 악보 마디 수 입력 초안

- 현재: 실패2건과 실제 blur 중 버튼 이동을 고친 뒤 focused32·격리build/typecheck·실제18actions/12help+12오류조건·XML2건/PDF2쪽을 확인했다.
- 남은 범위: 이 작은 범위는 최신누적전체3915검사·실제h2 gate완료. 상위추가범위는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/setting-up-your-score.md)

수용 기준:

- 기본8·공개1–64를 유지하고 빈값·0·65·소수는 자동변환하지 않는다.
- 오류 제출/IME/취소는 기존 문서·선택·undo를 보존하고 수정 후에만 생성한다.
- 실제960/1400 Backspace·오류/retry·입력/undo/native/출력과 설명서를 검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-006-002 · 고정 2:3 잇단음표 입력

- 현재: 미배포 작업본에서 기존모델2:3 입력·종류별표시·해제를 연결하고, 해제시빈구간을쉼표로채운다. focused89와실제960/1400네조합·12메뉴조건/XML4건/PDF4쪽을확인했다.
- 남은 범위: 이 작은 범위는 최신누적전체3915검사·실제h2 gate완료. 상위추가범위는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-006-001
- 소스: [src/renderer/src/editor/note-input-state.ts](../../src/renderer/src/editor/note-input-state.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/tuplets.md)

수용 기준:

- 실제 추가 메뉴의2:3 입력과 score focus, pending취소·저장보호·중첩거부
- 음표/쉼표2개를3개길이로한번commit, 정확한undo/redo·native/XML/MIDI
- 기존3단축키와5:4동작·음악기호/종류별안내·실제960/1400/PDF를보존

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-006-003 · 고정 7:4 잇단음표 입력

- 현재: 6red후기존고정preset으로연결했다. focused96·실제7/5같은driver각18actions/12help·12메뉴조건·각XML4건/PDF4쪽통과.
- 남은 범위: 고정7:4 입력의 수용 범위는 integration-i 전체 gate까지 완료했다. 임의비율/중첩·일반속성·7쉼표조합production은 별도 미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-006-002
- 소스: [src/renderer/src/editor/note-input-state.ts](../../src/renderer/src/editor/note-input-state.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/tuplets.md)

수용 기준:

- 실제추가메뉴고정7:4와종류별toolbar/도움말,새단축키없음
- pending원본불변/취소·저장거부·한commit/undo와기존해제보호
- 실제960/1400/native/XML/MIDI/PDF와기존2:3/5:4보존

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-002 · 팔레트 가족 순서와 로컬 저장

- 현재: 기존 도크 설정의 공통 Select/위아래 버튼으로 가족 순서를 바꾸고 로컬 저장한다. runtime-d의12조건·두 폭 reload와 전후PDF 동일성을 확인하고 integration-i 전체를 통과했다.
- 남은 범위: 가족 헤더 직접 drag·새 가족·즐겨찾기는 별도 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-001
- 소스: [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx), [src/renderer/src/StudioDockHeader.tsx](../../src/renderer/src/StudioDockHeader.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- 가족한개선택후위아래이동;끝위치disable/focus·원본8가족유지
- order로컬저장/잘못된값정리·새세션복원/reset;기존open/single/검색유지
- 기존명령/selection/caret/native/undo불변,실제960/1400설정과keyboard·48px/200%검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-006-004 · 잇단음표 도구의 적용·해제·취소 문맥 안내

- 현재: 기존 handler와 적용/선택그룹해제/미완성취소 안내·숫자를 일치시켰다. focused26+필터39, runtime-d네경로/PDF4쌍 동일, integration-j전체3934+Node5 통과.
- 남은 범위: 이 UI 안내 범위 완료. 임의 비율·중첩·전용 속성은 상위 범위로 남는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-006-003
- 소스: [src/renderer/src/editor/note-input-state.ts](../../src/renderer/src/editor/note-input-state.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/tuplets.md)

수용 기준:

- 입력 모드 밖의 선택3:2는 해제 안내, 일반 입력 준비는 적용/입력준비 안내, 미완성은 취소 안내
- 기존 표기/끝점 보호·정확한undo/native·이웃 이벤트를 보존
- 실제960/1400 버튼/keyboard/focus와 설명서를 확인

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-004-002 · 기존 모든 보표의 빈 첫 마디 못갖춘 변환

- 현재: 4App red 후 기존 명령으로 구현했다. focused41·격리build·통합k1의 두 조건/native/XML4/MIDI/PDF2쪽 및 전체K3980+Node5를 통과했다. 선택입력1,225개 유지.
- 남은 범위: 빈 첫 마디 범위는 완료했다. 기존 음표가 있는 마디 변환·끝마디 보상·마디 번호 제외는 별도 후속 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-004-001
- 소스: [src/renderer/src/editor/existing-pickup.ts](../../src/renderer/src/editor/existing-pickup.ts), [src/renderer/src/StudioPickupDialog.tsx](../../src/renderer/src/StudioPickupDialog.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/pickup-and-non-metered-measures.md)

수용 기준:

- 모든 보표의 빈 첫 마디만 함께 변환/regular 복원; 음표·분할쉼표·상이한박자/길이 거부
- 마디 번호/ID/기호/수동geometry와 이웃 유지, 위치 anchor 보호, 한undo/redo/native
- IME/오류/저장가드/문서교체 초안격리 및 실제메뉴/출력

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-041 · 특수 마디선 스타일·범위 편집

- 현재: 일반/반복·볼타 표기는 지원하지만 native에는 별도 bar-style 필드가 없다. 이중선·점선·끝선 등의 가져오기 손실 안내 누락을 재현했다.
- 남은 범위: 특수 스타일 직접편집·모든/선택보표 적용·마디안 시각선·수직span/색/두께는 모델/범위 결정이 필요하다. 손실 안내는 하위SMG-041-001.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/barlines.md)

수용 기준:

- 지원 일반/반복/볼타와 추가 스타일·위치/범위를 분리한다.
- 새 모델 편집은 별도 설계이며 현재 비보존 스타일 손실 안내부터 검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-041-001 · 가져온 특수 마디선 스타일 손실 안내

- 현재: core12red/4대조군+App2red 후 경고와 한국어요약을 추가했다. focused23·확대574·실제4가져오기/경고12조건·XML8/MIDI/PDF4쪽 및 전체K3980+Node5를 통과했다. 선택입력1,225개 유지.
- 남은 범위: 이 경고 범위는 완료했다. 임의 마디선 모델/편집·위치/geometry는 상위 needs-design이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/barlines.md)

수용 기준:

- 원본 비보존스타일과소유파트/마디/path 진단
- 일반/기본repeat 스타일 오경고 방지 및 Score/native/MIDI 비변경
- 실제960/1400 한국어요약/기술상세·원본비변경·사본/PDF·도움말

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-034-001 · 이름 있는 도크 배치 저장·복원

- 현재: 2Appred 후 focused20/확대44·type/build·실제F960/1400+12density/Tab6단계/reload/native/XML2XSD/MIDI/PDF 동일 및 전체L4000+Node5 PASS. 선택입력1232개 유지.
- 남은 범위: 도크 snapshot의 작은 범위 완료. 전체 workspace/free docking은 부모 needs-design.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/dock-layout-profiles.ts](../../src/renderer/src/dock-layout-profiles.ts), [src/renderer/src/StudioDockLayoutDialog.tsx](../../src/renderer/src/StudioDockLayoutDialog.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/workspaces.md), [참고 2](https://handbook.musescore.org/customization/toolbars-and-windows.md)

수용 기준:

- 기존 200–360 폭·표시·열린 탭 preference 호환과 명시적 저장/복원/갱신/삭제
- 잘못된 저장 데이터·중복/긴 이름·저장 실패와 IME/문서 초안/focus 보호
- 악보/selection/undo/native·XML/MIDI/PDF 보존 및 실제960/1400/reload/help

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-020-001 · 가져온 유음고 음표의 줄기 숨김 손실 안내

- 현재: core6red/5대조군+App2red 후 focused13/확대558·type/build·실제960/1400/12밀도·XSD6/native/XML/MIDI/PDF2쪽과 전체M4014+Node5 PASS,1237inputs stable.
- 남은 범위: 가시적 stem=none 손실 안내만 완료. 수동 stem/beam 편집·whole/rest stemlet/다른방향 보존은 부모 needs-design.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/stems-and-flags.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/beams.md), [참고 3](https://handbook.musescore.org/notation/rhythm-meter-and-measures/regroup-rhythms.md)

수용 기준:

- quarter/half/eighth·secondary chord/grace의 원본 숨김 손실과 정확한 part/bar/raw note path
- whole/rest/default/untouched directions 대조군, score/native/MIDI 비변경
- 실제960/1400 한국어요약/원본표시차이/native/두 XML모드·XSD/MIDI/PDF·설명서

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-003 · 기존 장·단조30프리셋의 조표 타일

- 현재: focused30/type/build/runtime-c·actual native/XML/MIDI/PDF와 integration-n396files4023tests+Node5/1240stable PASS.
- 남은 범위: click/keyboard tile 작은 범위이며 key drag/custom key schema를 포함하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-002
- 소스: [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- 장조/단조15개씩·검색시모든mode·실제 presetlabel/부호개수와 적용범위
- 기존 selected-staff-from-current-bar 명령/MIDI보존/한undo/native 및 imported unknown mode 비변경
- pending tuplet/range 거부·기존clefdrag/search/collapse/order/single 보존
- 실제960/1400·207/280/360·glyph ink/density/keyboard/output/help

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-016-001 · 기본꺼짐 독립 연습 메트로놈

- 현재: focused273/type/build/runtime-i와 integration-o400files4057tests+Node5/1249stable PASS.
- 남은 범위: 승인된 독립 연습 클릭 범위 완료. 별도 음색/음량·count-in·독립 meter·audio export는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/playback/metronome.ts](../../src/renderer/src/playback/metronome.ts), [src/renderer/src/StudioPlayback.tsx](../../src/renderer/src/StudioPlayback.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/playback-controls.md)

수용 기준:

- 승인된 기본꺼짐·파트믹서독립·출력미포함의 연습 클릭부터 실제 clock/취소/출력 비변경을 검증한다.
- 독립 slice 수용 기준으로 구체화: 현재 clock·tempo·변박자·pause/seek 계약을 재사용해 메트로놈의 실제 박과 mute 정책을 검증한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-019-001 · native 입력 설정의 미지원 방식 안내

- 현재: 5red/3대조군→focused45+기존App56/type/build/runtime-b 및 최신 click-failure/runtime-a 일반native·입력/undo·설정/출력동등성 PASS. 누적P대기. 누적P402files4070tests+Node5/1255입력유지 PASS.
- 남은 범위: 이 child의 작은 수용 범위는 검증 완료. 부모 기능의 잔여는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/native-input-notice.ts](../../src/renderer/src/editor/native-input-notice.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/input-by-duration-mode.md)

수용 기준:

- 기존 pitch-first 설정은 저장 시 그대로 보존하고 현재 실제 입력은 음가→음 이름이라고 안내한다.
- 일반native/backup/autosave/최근목록오류와 기존 응답소유권을 유지한다.
- 기본설정 무경고와 한입력/undo·native전체 envelope·출력 비변경을 검증한다.
- 실제pitch-first 입력기 구현으로 보고하지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-016-002 · 메트로놈 클릭 오류의 재생·자원 정리

- 현재: 4실패·미처리 rejection 1건 재현 후 focused20/확대267/typecheck/build, 실제 오류10건·밀도12조건·캐시 재시도·native 보존 통과. 다음 누적 gate 대기. 누적P402files4070tests+Node5/1255입력유지 PASS.
- 남은 범위: 이 child의 작은 수용 범위는 검증 완료. 부모 기능의 잔여는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-016-001
- 소스: [src/renderer/src/playback/metronome-transport.ts](../../src/renderer/src/playback/metronome-transport.ts), [src/renderer/src/playback/useScorePlayback.ts](../../src/renderer/src/playback/useScorePlayback.ts), [src/renderer/src/StudioPiano.tsx](../../src/renderer/src/StudioPiano.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/playback-controls.md)

수용 기준:

- 초기 실패 stopped/중간 paused와 piano·click·timer·RAF 정리, 부분노드 연결해제를 검증한다.
- 한글 안내/원래 기술정보·Enter/Space 격리와 명시적 cache retry를 확인한다.
- native·선택·undo·현재음악/출력의미와 공통API를 보존한다.
- 개별gate와 누적전체gate를 구분하며 물리장치 검수로 과장하지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-004 · 조표 타일의 놓은 보표·마디 드래그 적용

- 현재: 5red→focused33/type/build/runtime-b2폭·trusted native drag/cancel·12밀도·native/한undo/두XML/MIDI/PDF PASS. 기존clef실제C도통과. 다음누적gate대기. 누적Q404files4086tests+Node5/1262입력유지 PASS.
- 남은 범위: 작은 child 범위 검증 완료. 부모의 나머지 범위는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-001, SMG-012-003
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- 선택과다른놓은보표의그마디이후만변경하며실제음높이/이전마디/이웃보표를보존한다.
- hover/cancel/외부·위조·이전문서payload/입력중거부와tooltip양보를확인한다.
- 실제nativeHTMLdrag/한undo·redo/native재열기/XML2/MIDI/PDF를검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-023-001 · MusicXML 온마디 쉼표의 생략된 graphic type 가져오기

- 현재: 7red/3대조군→focused10/확대582/type/build/runtime-b2폭·실제fontink/한입력·undo/native/XML6XSD/MIDI/PDF4쪽동일 PASS. 누적Q대기. 누적Q404files4086tests+Node5/1262입력유지 PASS.
- 남은 범위: 작은 child 범위 검증 완료. 부모의 나머지 범위는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/measure-rest-type.test.ts](../../src/musicxml/measure-rest-type.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests.md), [참고 2](https://handbook.musescore.org/notation/instruments-staves-and-systems/showing-staves-only-where-needed.md)

수용 기준:

- 명시된온마디쉼표의생략된type만지원하며일반음표·쉼표와명시type검증은유지한다.
- 변박자/못갖춘마디/fermata·native/타이밍/MIDI·음표ID/원본파일을보존한다.
- 실제가져오기·한입력/undo/재열기·XML2/XSD/PDF대조를확인한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-035-001 · 악보 포인터 초점의 SVG 글꼴 상자 테두리 제거

- 현재: 실제 UA pointer outline red 후 CSS focus 선택자만 수정했다. 관련24/type/build, 실제4창/theme·24focus상태·glyph/hit좌표/native 보존과출력D의XML4XSD/MIDI/PDF4raster동일 PASS. 누적R406files4098tests+Node5/1268입력유지 PASS.
- 남은 범위: 이 child의 좁은 초점 표시 수정은 검증 완료. 전체Q는 CSS 수정 전이며 다음 넓은 누적gate에 포함한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/styles.css](../../src/renderer/src/styles.css)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/selecting-elements.md), [참고 2](https://handbook.musescore.org/basics/copy-and-paste.md), [참고 3](https://handbook.musescore.org/navigation/timeline.md)

수용 기준:

- 실제pointer/Tab의동일객체focus소유권과작은hitrect keyboard ring을유지한다.
- 브라우저의font em box pointer outline만제거하고선택색·glyph/hitgeometry·native/출력을보존한다.
- 실제light/dark·960/1400·관측24상태와원래실패로그를구분한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-023-002 · 온마디 쉼표의 원본·모델 길이 차이 안내

- 현재: 7red/5대조군→focused12/확대580/type/build·실제960/1400·12밀도·Enter/Space/선택·native/두XML/MIDI/XSD6/PDF2 동일 PASS. 기존길이변환은보존하며누적R대기. 누적R406files4098tests+Node5/1268입력유지 PASS.
- 남은 범위: 작은 손실 안내 범위 검증 완료. 원본 길이의 실제 모델 지원은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-023-001
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests.md), [참고 2](https://handbook.musescore.org/notation/instruments-staves-and-systems/showing-staves-only-where-needed.md)

수용 기준:

- 입력원본과현재마디길이가다를때만원본길이·보표/파트·마디/이벤트경로를알린다.
- divisions상속/실제pickup/다른staffmeter·그래픽whole음가를구분해거짓경고를막는다.
- 기존표시/재생/native/XML/MIDI와원본파일을바꾸지않으며한국어우선/원문technical/키보드를검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-024-001 · 명시적 MusicXML 재생 점프·마커 손실 안내

- 현재: 명시적 재생 이동 손실을 한국어/원문으로 안내한다. focused25/확대603/실제12밀도·native·두XML/MIDI/XSD6/PDF4 및 전체S4123+Node5 통과.
- 남은 범위: 이 child의 손실 안내 범위는 완료. 실제 jump/label/time-only 모델과 원본 metadata 영구 보존은 parent024 별도 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/repeats/jumps-and-markers.md), [참고 2](https://handbook.musescore.org/notation/repeats/measure-and-multimeasure-repeats.md)

수용 기준:

- direct/direction의7명시속성과part/measure/원래path/value를보고한다.
- 일반words/빈label/비활성no/tempo·pedal·기본barline repeat를새jump로다루지않는다.
- 기존표시/재생/native/MIDI/XML변환을유지하고한국어우선·원문technical·키보드·출력을검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-005 · 기존 네 박자표 preset의 직접 팔레트 적용

- 현재: 기존 네 preset의 클릭/TabEnter·한undo/native·두XML/MIDI/XSD4/PDF2·최신12밀도 재검증 통과. 다음 누적T 대기. 누적T410files4137tests+Node5/1279stable PASS.
- 남은 범위: 이 작은 preset 적용 범위의 실제/누적 gate는 완료했다. 총보 전파·뒤 마디 재묶기/사용자 family와전체symbol breadth는별도잔여다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-002-001
- 소스: [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 기존2/4·3/4·4/4·6/8 preset 클릭과 정확한 한 보표/한 마디 범위
- 음표/표기 손실 거부·입력/범위/span 보호·검색/접기 보존
- 기존 빠르기 음가 처리·한undo/redo/native·실제 출력/keyboard/density

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-006 · 기존 박자표 타일의 마디 대상 끌기

- 현재: 7red·빈undo추가실패 후 focused7/확대66/type/build·실제trusted drag/cancel/native·XSD4/MIDI/PDF2와기존key/clef회귀를통과했다. 누적T410files4137tests+Node5/1279stable PASS.
- 남은 범위: 이 작은 preset 적용 범위의 실제/누적 gate는 완료했다. 총보 전파·뒤 마디 재묶기/사용자 family와전체symbol breadth는별도잔여다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-005
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- source선택과다른놓은보표/마디를기준으로범위·기본빠르기를적용한다.
- hover/dragend/blur/외부payload/문서교체/input의소유권과도움말을보존한다.
- 축소거부는score/selection/undo를유지하며동일값재적용은빈undo를만들지않는다.
- 실제960/1400 native HTMLdrag·native저장/재열기·두XML/MIDI/PDF와기존drag회귀

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-001 · 특수 음표 머리 모양·채움·괄호 손실 안내

- 현재: 11red/7대조군→focused18/확대633/type/build·실제960/1400/12밀도/원문키보드/native·두XML/MIDI/XSD6/PDF4대조동일 및 대표화면/고유PDF검토 PASS. 누적U412files4155tests+Node5/1284stable PASS.
- 남은 범위: 이 작은 손실 안내 범위는 완료. 직접모양편집/원본style보존과전체SMG025는별도설계/조사다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- 특수shape/실제filled override/parentheses/smufl과명시적기본값을구분한다.
- 원본main/chord/grace의part/measure/note경로와값을기존diagnostic/한국어로알린다.
- 현재모델/native/MIDI/두XML을바꾸지않고실제keyboard/density/출력으로검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-007 · 기존 셈여림 타일의 안전한 마디 대상 끌기

- 현재: 9red→focused9/공유drag34/기존셈여림11/type/build·실제960/1400/native/12밀도·XSD4/MIDI/PDF2 PASS. 누적V413파일4164검사+Node5·1287입력유지 PASS.
- 남은 범위: 0/1개목적지의작은drag범위는완료했다. 박/성부anchor·carry재생모델과전체palette breadth는별도잔여다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-004
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/dynamics-and-hairpins.md)

수용 기준:

- 0/1개목적지의기존ID/새ID와다른보표/보관값보존
- 복수목적지거부·취소·외부payload·문서교체·입력/범위보호
- 같은값빈undo없음·선택stored값표시및click범위유지
- 실제960/1400 trusted drag·native/두XML/MIDI/PDF

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-002 · 아르페지오·글리산도 등 가져오기 손실 안내

- 현재: 손실안내/간결한동종상태요약·focused12/확대622/보고서UI14/type/build·실제960/1400/native/XSD4/MIDI/PDF4 PASS. 누적W415파일4176검사+Node5/1292입력유지 PASS.
- 남은 범위: 이작은손실안내범위는완료했다. 전용기호의표시/재생/직접편집·원본보존은별도모델설계가필요하다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/arpeggios-and-glissandos.md)

수용 기준:

- 위/아래arpeggiate와동시화음괄호·glissando/slide양끝의원래part/bar/note주소
- 빈XML기호·중복notations container와지원staccato/일반화음대조군
- 정규화model/native/MIDI/기존사본보존·원본기호미복원명시
- 실제960/1400/Korean/rawkeyboard/native/XML/PDF

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-023-003 · 여러 마디 쉼표 묶음의 가져오기 손실 안내

- 현재: 6red/대조1→focused7/확대634/type/build·실제960/1400/12보고서밀도/native·actual4XML XSD/MIDI/PDF4 PASS. 이작은진단gate완료; 전체W4176는변경전이며새전체미실행.
- 남은 범위: 이작은손실안내범위는완료했다. 묶음표시/편집·자동분할·빈보표숨김은별도모델/배치설계가필요하다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-023-001
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests.md)

수용 기준:

- 원본count/use-symbols/staff와part/bar/attributes/style주소
- 일반온마디쉼표는경고하지않음·생략된graphic type지원유지
- 현재개별마디/다른파트/timeline/native/MIDI/기존사본보존
- 실제960/1400/rawkeyboard/native/두XML/PDF

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-001 · 수동 배치 슬러·헤어핀의 키보드 공통 이동

- 현재: 수동 슬러·헤어핀의 SVG 포커스 방향키 공통 offset 이동을 구현했다. 실제 viewport red 후 보정 범위를 수정했고 native/undo/redo/두 XML 손실 안내/MIDI/PDF와 누적 X 4201검사를 통과했다.
- 남은 범위: 이미수동인span의0.25/1sp격자공통이동만다룬다. 자동형상전환·pointerdrag/curve/endpoints·part/segment독립배치는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/editor/manual-span-nudge.ts](../../src/renderer/src/editor/manual-span-nudge.ts), [src/renderer/src/SpanProperties.tsx](../../src/renderer/src/SpanProperties.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/adjusting-elements-directly.md)

수용 기준:

- 현재선택SVG/focus/문서/뷰소유권과자동배치거부
- 0.25/1sp격자·경계거부·fraction/명시0/height/다른필드보존
- IME·숫자draft·단축키/음표옥타브·한명령/undo/native/MIDI보존
- 실제960/1400 SVGfocus/키보드·새도움말/두XML/PDF

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-003 · 마디 번호 문구·표시설정의 손실 안내

- 현재: 표시 문구/print 번호설정의 무안내 손실8 red/대조2 후 기존 report로 안내한다. focused10/확대658/type/build·실제960/1400/12밀도/native/두XML/MIDI/PDF 통과.
- 남은 범위: 번호 정규화001과 독립된 손실 안내다. 번호 그리기·편집·임의 header/footer는 구현하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 다른 text와 명시적인 번호 표시설정의 누락을 원본 발생 위치와 함께 안내한다.
- 동일 text/일반 번호 대조군에 허위 경고가 없고 내부 ID·native·MIDI·정규화 XML/PDF를 보존한다.
- 실제960/1400 메뉴/보고서 키보드·12밀도·저장/재열기·출력을 검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-001 · 기존 모델 빠르기의 MusicXML 왕복 보존

- 현재: native유효숫자의9red/2대조→focused11/확대672/type/build·실제960/1400/native/두XML/MIDI/PDF/profile/fixed 및 누적AD4366+Node5 통과.
- 남은 범위: 입력 UI 범위 확대·직접 measure sound 지원 범위·native밖 값/문구형 per-minute 정책은 별개다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/project/schema.ts](../../src/project/schema.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 기존 native에서 유효한 빠르기의 global/position XML 왕복에서 숫자·음가·점·위치·MIDI/native를 보존한다.
- UI40–240정수·draft/no-edit·직접 measure sound의 승인된 범위와 기존 keymap/명령을 보존한다.
- 실제960/1400 가져오기/무편집저장/재열기/두XML/MIDI/PDF와 관련 회귀를 검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-002 · 기존 빠르기와 새 입력 범위의 안내

- 현재: 실제241/39의기존값보존과새입력범위를기존Text/Field설명으로구분했다.기존회귀5파일50·type/build·실제960/1400연결된설명/무편집CmdS/native/두XML/MIDI/PDF/profile/fixed 통과.
- 남은 범위: 문구·의미연결만정리하며음악/입력범위/명령/확정시점/API는바꾸지않는다. 실제SR승인은별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioTempoTools.tsx](../../src/renderer/src/StudioTempoTools.tsx), [src/renderer/src/StudioTempoEventInput.tsx](../../src/renderer/src/StudioTempoEventInput.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 기존39/241 보존 안내가실제보이고접근가능설명에연결됨
- 일반값에는불필요한안내가없고기존확정/Escape/undo/저장계약과값을보존
- 960/1400 무편집/저장/두XML/MIDI/PDF 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-009 · 장식음4종의 이벤트 드래그 추가

- 현재: 장식음 4종의 실제 960/1400 드래그 8경로·XML 재가져오기 2건에 더해 현재 공유 표현 기호 8경로와 현재 장식음 밀도 12조건을 통과했다. 개별 native/undo/redo/XML/XSD/MIDI/PDF 증거를 보존하며 원래 입력 충돌의 원인 해결로 해석하지 않는다.
- 남은 범위: 화음이벤트전체에만적용한다.쉼표/개별꾸밈음/외부·위조·숨긴파트·입력모드는제외하고customfamily/span drag는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-010
- 소스: [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- 4기호 add-only/no-op,이웃/다른mark/grace/tie/fermata보존,정확한undo/redo와선택
- 쉼표·내부꾸밈음·위조/외부·blur/입력·숨긴파트거부,클릭toggle유지
- 960/1400 실제trusteddrag·밀도·native·두XML/MIDI/PDF·기존표현기호공유경로회귀

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-010 · 실제 잉크에 따른 드래그 표적 소유권

- 현재: 기존 실제 겹침 소유권 회귀와 잉크 cue 수정에 더해 표현 기호 8·수정 후 음표 정지 기호 6·쉼표 정지 기호 6경로의 실제 cue 60개를 독립 비교했다. 최대 차이 0.008px 미만과 정확한 소유자, native/undo/redo/XML/MIDI/PDF를 확인했다. 과거 외부 좌표 개입과 host focus 상실 원인은 미규명으로 남긴다.
- 남은 범위: 본체 cue는 주음표/화음/쉼표의 머리·줄기·flag 실제 잉크를 사용하고 grace·투명 hit·em box는 제외한다. 측정 불가 시 안내만 유지한다. 완료 범위는 기존 지원 표적이며 전체 기호·물리 동시 입력이나 모든 밀집 간격 승인은 아니다. breath/caesura의 보표 연관 관찰은 별도 감사 후보로 남긴다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-007
- 소스: [src/renderer/src/notation/note-pointer-owner.ts](../../src/renderer/src/notation/note-pointer-owner.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/notation/palette-event-ink.ts](../../src/renderer/src/notation/palette-event-ink.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- DOMrect가다른보표/마디여도unique실제head/flag를클릭과일관되게해석
- 표현기호/장식음/마디설정공유표적·grace거부·ambiguous fallback·undo/선택보존
- 960/1400 실제겹침드래그 및기존표현기호/장식음/native/XML/MIDI/PDF 검증
- 실제 표기의 잉크에 맞는 drop cue: 과대 group bbox를 그대로 승인하지 않고 화면/좌표를 별도 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-011 · 장식음 표시 순서의 MusicXML 왕복 보존

- 현재: 실제 XML 안전 차단/장식음 배열 순서 한 차이→회귀7실패/대조1→reader 원본 순서 보존. 관련48/확대826/type/build 및 실제16XML XSD/MIDI/PDF·두폭 재가져오기/기호 노출 통과. 안전 검사는 유지한다. 누적AE 4394/Node5·입력1503불변 PASS.
- 남은 범위: 장식음 배열은 표시 순서다. 파서에서 원본 순서와 기존 중복 제거를 보존하며 새 기호·발음·모델은 추가하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-009
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/using-the-palettes.md), [참고 2](https://handbook.musescore.org/customization/palettes.md)

수용 기준:

- 비정규 장식음 순서·별칭/중복·tremolo 독립 계약 보존
- 저장 안전 검사를 유지한 두 XML 모드 App 회귀
- 실제960/1400 드래그·native/undo/redo·XML/MIDI/PDF·pinned XSD 검사

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-003 · MIDI 빠르기의 실제 표현 범위 검증

- 현재: 실제3무경고tempo잘림/6red3대조→저장전거부·한국어안내.확대55/비동기29/실제960·1400 IPC0·12조건·native/undo/retry·XML4 XSD/MIDI/PDF6 PASS.전체AE는변경전이며다음넓은묶음AF대기.
- 남은 범위: 프로젝트/XML/입력값은 유지한다.파일형식에 표현할 수 없는 MIDI만 저장 전에 거부한다.새 tempo 변환/시간 재샘플링 모드는 추가하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-001-001
- 소스: [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 전체/위치별/기준음가의 실제MIDI잘림 재현과24bit경계·정상대조군
- 파일요청/대화상자 이전 차단, 원본/dirty/선택/undo·XML보존
- 실제960/1400 오류/기술정보/키보드·값수정후retry·native/정상MIDI/XML/PDF

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-004 · 실제 첫 마디의 전역 빠르기·리듬 표기 보존

- 현재: 정상 희소·역순 번호에서 number===1 기준의 초기 표기 손실6건을 재현했다. 원본 순서 첫 마디를 사용해 수정하고 정상2대조와 함께8검사 통과. 실제 교환 검증 중. 확대173파일1621검사/type/build/profile15 통과. 전체AF대기. 누적AF448파일4458검사/Node5/고정1577변경0·fixedT 통과. 실제4세트의동일PDF와두화면검토완료. 작은수정범위만done이다.
- 남은 범위: 번호 재작성·내보내기 안전검사 완화 없이 첫 마디 표기를 보존한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 희소·역순·중간1 및 정상 번호에서 visible/hidden 초기 빠르기·리듬을 첫 마디에만 기록한다.
- 원본 번호·native·MIDI·두 XML 및 실제 출력·안전검사를 보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-002 · 자동 표현 글자의 용지 끝 배치

- 현재: 숫자 control과 정규화 source 모두 dolce 실제 잉크가 오른쪽2.58px를 넘었다. renderer2 red/정상2 후 짧은 자동 표현 글자만 실제 잉크로 여백 안에 배치한다. 실제 출력 재검증 중. 확대173파일1621검사/type/build/profile15 통과. 전체AF대기. 누적AF448파일4458검사/Node5/고정1577변경0·fixedT 통과. 실제4세트의동일PDF와두화면검토완료. 작은수정범위만done이다.
- 남은 범위: 글꼴·tick·원본문구·수동geometry·긴문구 차단을 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/figured-bass.md)

수용 기준:

- 표현 글자의 자동 배치만 안전한 SVG폭 안에 두고 선택hit도 같은 잉크로 계산한다.
- clear onset·긴문구와 native/XML/MIDI를 보존한다.
- 실제960/1400·숫자control PDF와 잉크를 대조한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-005 · 볼타 소유권과 출력 페이지 배치

- 현재: 실제unknown8=볼타잉크소유권누락. 3red/계산1대조후그룹에systemIndex만연결했다. notation83파일597/type/build·profile/fixed·실제960/1400 8경로/8PDF16쪽/native/MIDI/선택보존 통과. 가로3→2쪽,세로기존픽셀동일. 다음누적AG대기.
- 남은 범위: 추가미소유잉크와새조합은별도감사한다. 다음후보는반복횟수표시다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/measured-print-pages.ts](../../src/renderer/src/notation/measured-print-pages.ts), [src/renderer/src/notation/print-page-ink.ts](../../src/renderer/src/notation/print-page-ink.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 정확한잉크와악보단소유권으로고립글자/빈페이지를재현한다.
- 실제자동배치또는안전출력경계를좁게수정하고수동geometry/제목/글꼴/프로젝트와정상다중페이지·선택페이지출력을보존한다.
- 실제960/1400·오류/명시적수정후retry·native/PDF를검증하고전후이미지를직접검토한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-006 · 반복 횟수 글자의 출력 소유권

- 현재: actualB에서 x3의미소유잉크1개를확인했다. 3red후 실제systemIndex만연결했다. notation84파일600/type/build/profile/fixed,실제960/1400의1생성악보·8출력경로·8PDF16쪽/native/선택/MIDI보존과4고유쪽직접검토통과. 세로기존이미지동일/가로3→2쪽. 다음누적AG대기.
- 남은 범위: 다른미소유기호는기존coverage와중복없이별도감사한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 반복횟수의실제악보단소유권을3red/정상대조로재현한다.
- 현재x3표시·native/반복/MIDI와기존정상세로출력을보존한다.
- 실제960/1400 native전후·세로/가로PDF를검증하고원본실패와전후이미지를보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-007 · 저작권 고지 메타데이터·크레디트의 손실 안내

- 현재: 기존 보고서의 저작권 고지 손실 안내를 완료했다. 8red/정상3 뒤 focused11·확대775/type/build·실제960/1400/12조건/native/6XML XSD/MIDI/PDF4와 profile/fixed, 누적AG4479+Node5를 통과했다. 고지 저장·편집이나 머리말/꼬리말을 구현한 것은 아니다.
- 남은 범위: 저작권고지를보존/편집하거나header/footer를구현하지않고현재손실만안내한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md)

수용 기준:

- 내용이있는identification/rights와명시적rights credit의각credit-words 손실을원본위치와함께안내한다.
- 제목/작곡가중복·빈고지·본문글자에허위경고가없고native·MIDI·정규화사본은기존과같다.
- 실제960/1400·보고서밀도/기술정보키보드·native재열기/두XML/MIDI/PDF를검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-013-002 · 기본 재생 Space의 수식키 소유권

- 현재: 일반/선택 span·세 재생 상태의 수식키 Space 가로채기6red/대조7 뒤 기존 App guard로 수정했다.5파일63/type/build·실제48 native 전달·저장/재열기·4XML XSD/MIDI/PDF2·profile/fixed 통과. 전체AG4479는 수정 전이다.
- 남은 범위: 사용자 키 재지정 대신 기존 기본 Space만 다루며 OS 예약 키·물리 IME 검증을 대신하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/studio-shortcuts.ts](../../src/renderer/src/studio-shortcuts.ts), [src/renderer/src/editor/keyboard-input.ts](../../src/renderer/src/editor/keyboard-input.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/keyboard-shortcuts.md)

수용 기준:

- 기본 Space의 선택 위치 재생·일시정지·재개 명령1회 유지
- 수식키 Space에서 전역 재생·default prevention·문서/선택/dirty/undo 비변경
- IME·입력창·공통 버튼 소유권과 실제 native 키 전달을 구분 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-008 · 0번호 못갖춘마디와 타이의 실제 가져오기/출력

- 현재: 기존 core3/AA fixture의 실제6경로를 native Home→strict pointer 메뉴로 검증했다. native·pickup1박/타이2박·다른파트10/20·두XML/MIDI/18XSD/PDF12동일 및 고유2쪽 검토 PASS. 제품 수정은 없고 A의 직접 포인터 준비 경쟁은 미규명이다.
- 남은 범위: 번호 정규화의 못갖춘마디 길이와 경계 타이를 실제 폰트·저장·출력으로 확인한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-030-004
- 소스: [src/renderer/src/StudioMetadataActions.tsx](../../src/renderer/src/StudioMetadataActions.tsx), [src/renderer/src/StudioPageSetup.tsx](../../src/renderer/src/StudioPageSetup.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 문제 파트만1..N, 다른 파트10/20·pickup1박과2박 타이 유지
- 실제 메뉴/포인터 선택/native 재열기/두 XML/MIDI/PDF 대조
- 기존 생성물/원본 해시·선택·dirty 보존, 현행 통과와 제품 수정 구분

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-009 · 박자표 편집 시 유효한 원본 마디 번호 보존

- 현재: core4/App2 실패 후 기존 parts 교체 명령으로 번호·전역 참조·undo를 보존했다. focused63/확대1437/type/build/profile/fixed PASS. 실제960 native·undo·두XML 및1400 undo 산출물이 정확하고 실제/source4XML XSD가 통과했다. H/I는 이후 native focus 거부로 중단되어 실제 MIDI/PDF/전체 UI는 미완이다. 전체AL4606은 이 수정 전이다. 후속 누적 AM468파일4623검사/Node5와1942입력불변이 통과했다. native focus로 미도달한 실제 경로는 별도 미완으로 유지한다. 현재A1400역순/B960불연속번호의전체UI를231guards/focus20으로완료했다. nativeundo2/변경2정확·실제재열기완료·actualXML4serializer/MIDI왕복·MIDI2/PDF2·XSD4/대표화면직접검토. 기존forcedfocushelper는실행하지않고native가드와현재파일완료조건을강화했다. 제품동일BS549files5148+Node5재사용.
- 남은 범위: 내부/native/XML번호참조보존범위이며새표시번호편집기/총보전파·rebar정책은별도다. oldH/Ihostfocus원인은미확정이고물리/외부앱검수는포함하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-030-001
- 소스: [src/renderer/src/editor/time-signature.ts](../../src/renderer/src/editor/time-signature.ts), [src/renderer/src/editor/existing-pickup.ts](../../src/renderer/src/editor/existing-pickup.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 유효한 연속·비연속·역순 양정수 번호와 마디/이벤트 ID를 유지한다.
- 번호 기반 빠르기 참조와 수동 span, 다른 보표·파트를 보존한다.
- 한 번 undo/redo, 동일 값 무편집, native 저장/재열기와 XML/MIDI 예상값을 검증한다.
- 실제 메뉴와 속성의960/1400 경로 및 출력을 검사하고 미실행 범위를 기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-035-002 · 선택·필터·복사의 현재 지원 범위 안내

- 현재: 선택/복사/Timeline 본문과 실행 분기를 대조해 설명서3장을 구체화했다. 기존6파일124·10소스해시불변/build·실제검색/12조건/6표스크롤/native·선택·출력동등 통과. 새 제품/복수선택 기능을 추가하지 않았다.
- 남은 범위: 지원 선택 집합과 복사/필터/탐색의 실제 계약을 기능별 대조한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx), [src/renderer/src/StudioFileTools.tsx](../../src/renderer/src/StudioFileTools.tsx), [src/renderer/src/StudioStatusBar.tsx](../../src/renderer/src/StudioStatusBar.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/selecting-elements.md), [참고 2](https://handbook.musescore.org/basics/copy-and-paste.md), [참고 3](https://handbook.musescore.org/navigation/timeline.md)

수용 기준:

- 선택 모델·복사/붙여넣기·필터·단일 객체 속성의 적용 범위를 코드와 기존 테스트로 대조
- 미지원 목록/다중마디·보표/잘라내기·교환·리듬 변환을 지원한다고 표시하지 않음
- 앱 내 설명서·소스 해시·기존 검사와 검토 범위를 실제로 기록

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-035-003 · 같은 마디 단순 음표/쉼표 잘라내기

- 현재: 기존copy+clear의단순cut:20개/type/build·실제8기본4거부+6필터/batch·28XSD/MIDI/PDF14/12밀도/profile/fixed PASS. 누적AI455파일4512검사+Node5/1730입력불변,외부opt-in1skip. AH중단실패는별도보존.
- 남은 범위: 다중 마디/보표·span·개별 표기·mixed/input preview/시간압축은 범위 밖이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx), [src/renderer/src/StudioFileTools.tsx](../../src/renderer/src/StudioFileTools.tsx), [src/renderer/src/StudioStatusBar.tsx](../../src/renderer/src/StudioStatusBar.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/selecting-elements.md), [참고 2](https://handbook.musescore.org/basics/copy-and-paste.md), [참고 3](https://handbook.musescore.org/navigation/timeline.md)

수용 기준:

- 기존 복사/삭제 모두 가능한 범위만 enable, 한 실행·한 undo
- 거부 시 기존 clipboard/선택/dirty/undo 및 입력/IME 소유권 보존
- 실제 native 메뉴/키와 저장/재열기·XML/MIDI/PDF 검증·설명서 갱신

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-026-001 · 코드 프렛보드 그림의 MusicXML 손실 안내

- 현재: 7red/정상2→9개/확대749·type/build/누적AJ4521+Node5 PASS. 35파일바이트불변/21XSD. actualG960완료구간+K1400관측실행의native/MIDI/4XML XSD/PDF4대조·12밀도/고유PDF2쪽검토. G/Hfocus원인은별도미규명.
- 남은 범위: 프렛보드 그림 보존/표시/편집·자동생성·TAB/튜닝 모델은 범위 밖이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/project/schema.ts](../../src/project/schema.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/guitar/entering-and-editing-tablature-notation.md), [참고 2](https://handbook.musescore.org/idiomatic-notation/guitar/fretboard-diagrams.md), [참고 3](https://handbook.musescore.org/idiomatic-notation/guitar/applying-capos.md), [참고 4](https://handbook.musescore.org/idiomatic-notation/guitar/alternate-string-tunings.md), [참고 5](https://handbook.musescore.org/idiomatic-notation/guitar/guitar-bends.md)

수용 기준:

- 각원본frame의파트/마디/harmony경로와중복을구분한손실안내
- 한국어우선/기술정보보존·일반코드대조오탐0
- 모델/native/MIDI/XML/출력불변과실제960/1400검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-003 · 페르마타·숨표·중지표의 현재 지원 안내

- 현재: 기존 최종 표제의 실제 UI 잔여를 최초1회 활성화 조건에서 확인했다. B617가드·12조건/거부0·표 설명 열 keyboard/복귀·개별 설정의 실제 줄 좌표·원본 상태 보존. 제품/빌드는 BC1118파일과 같아 전체를 중복 실행하지 않았다.
- 남은 범위: 기본 고정 멈춤 계약 안내만 완료했다. 개별 변형/시간배율/숨표·중지표 별도 지연/물리 청음과 과거 focus 원인은 미완이다. 다른 첫 표제의 고립 음절은039003 별도 수정이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [docs/product/studio-manual/05-notation.md](../../docs/product/studio-manual/05-notation.md), [src/renderer/src/playback/timeline.ts](../../src/renderer/src/playback/timeline.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/breaths-and-pauses.md)

수용 기준:

- 현재표시/재생/개별설정지원범위를소스와설명서에서일치
- 실제도움말960/1400·light/dark·scoped200/coarse와표keyboard접근
- 음악/명령/native/출력계약을변경하지않음

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-013-003 · 편집5명령의 실제 단축키 재지정

- 현재: 7red→App10/설정14·history포커스57/기존편집218·메뉴6/type/build/profile/fixed와실제F12조건/Gnative·설정reload통과. 전체AK459파일4547+Node5/외부1skip·고정1825변경0까지완료.
- 남은 범위: 이5명령의지원chord범위는완료했다. 다른명령/설정교환·물리OS/IME는부모잔여다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/studio-shortcut-bindings.ts](../../src/renderer/src/studio-shortcut-bindings.ts), [src/renderer/src/StudioShortcutSettings.tsx](../../src/renderer/src/StudioShortcutSettings.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/keyboard-shortcuts.md)

수용 기준:

- 5명령의설정·실제실행·기본복원과남은명령/파일교환범위를분리한다.
- 재지정은충돌을거부하고기존문맥/IME/선택/undo/저장계약을보존한다.
- native·선택·undo·기존 키보드·기보/재생 의미를 보존하고 실제 공개 경로로 검증한다.
- 지원 상태/설명서/검증 증거는 gate 후 같은 slice에서 갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-003 · MusicXML 여러 글자 조각의 손실 안내

- 현재: 유효5core+2App red→focused12/기존XML735/type/build·24XSD/40산출물불변통과. actualG960안내/기술키·fine/coarse뒤nativefocus를guard가차단했고1400/출력등은미도달이다. 후속 전체AL464파일4606검사/Node5가 이 진단 수정을 포함해 통과했다. 기존G native focus 중단과 나머지 실제 UI/출력 미완은 별개로 유지한다. 후속 누적 AM468파일4623검사/Node5와1942입력불변이 통과했다. native focus로 미도달한 실제 경로는 별도 미완으로 유지한다. rehearsal 배열도 유효5 core/2 App red 후 기존 진단 경로에 손실 경고만 추가했다. 새 텍스트 모델/병합 없이 단일/별도/빈 조각을 보존한다. 관련31/XML742/type/build 통과. 실제1400의6밀도·native/unique reopen/XML2/MIDI/PDF가 끝났고,960의6밀도/native/unique reopen 뒤 structured 출력 중 focus 거부는 미완으로 유지한다. 새actual words B는1400/960의12조건(새10+기존2대조)381guards/native4/XML4/MIDI2/PDF2와focus분리관측24를완료했다. rehearsal C960cold에서는native1/XML2/MIDI/PDF출력공백을확인했다. XSD8·uniquePDF2를검토했다. 별도037001의실제읽기키수정도N으로검증했다.
- 남은 범위: 복수조각richtext/서식복원은추가하지않는다. 과거wordsG/rehearsalF의동일창focus상실원인은미확정이다. 새cold완료/이번비재현을원인해결로보고하지않으며물리/외부검수는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/formatting-text.md), [참고 2](https://handbook.musescore.org/text/fingering.md), [참고 3](https://handbook.musescore.org/text/figured-bass.md)

수용 기준:

- 유효복수words원본의무경고손실을재현하고원본파트/마디/path를안내한다.
- 단일/별개direction-type와기보/native/MIDI/기존사본을보존한다.
- 960/1400실제공개경로와필요한출력·설명서/정본gate를확인한다.
- 복수 rehearsal의 실제 무경고 손실을 보고하고 단일/별도/빈 조각과 원본 파트·마디/path를 보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-002 · 수동 슬러·헤어핀의 마우스 공통 이동

- 현재: App부재6red→기존명령/owner transaction/CTM SVGpreview를구현했다. focus/capture2red와modifier4red뒤focused59/기존기보680/type/build통과. 실제I960/J재열기XMLMIDI/M1400/독립N PDF수정재시도를확인했고도구별실패를보존한다. 후속 누적 AL은464파일4606검사/Node5와1926입력불변으로 통과했다. S1400 전체 UI/native133·2XML/MIDI/PDF와 U산출물 검사는 통과했다. T960은 저장 후 재열기에서focus를 잃어 formal960 완료는 여전히 미검증이다. 후속 누적 AM468파일4623검사/Node5와1942입력불변이 통과했다. native focus로 미도달한 실제 경로는 별도 미완으로 유지한다. 현재1400 dark125% hairpin/960 light75% slur의 고정배율 전체 UI가395nativeguards/26focus관측으로 완료됐다. preview/Escape/commit한undo·redo/정확native3저장·고유재열기/XML4/MIDI2/PDF2와 pinnedXSD/두PDF직접검토를 통과했다. 슬러는 기존guard 차단 뒤 실제0.5sp 수정/retry/dirty보존을 확인했다.960 A/B의 조기좌표 실패는 C에서 유한도크높이/scroll정착으로 분리했고 D는 기존10초기한에서 실제좌표·문서높이3연속정착 뒤 strict hit를 유지했다. 제품변경은 없고 원래실패를 보존한다. 현재긴직접이동안내/속성필드의12theme-density조건584nativeguards·native2원본정확보존을완료했다. 도크207/280/360,pickerfine32/coarse48,guide12→24px,input50px/ring4px의pane/viewport/footercontainment와nativeTabfocus,명시0/자동빈값·선택/history0유지. A의center reveal실패는보존하고B는기존nearest정렬/같은strict기한을유지했다. 별도C의안내200이미지를직접검토하고중복조건으로세지않았다. 제품변경없는coverage다.
- 남은 범위: 기존 수동 span의 mouse/keyboard 공통 offset·취소/undo/native/출력·고정 배율 및 기록된 안내/밀도 범위는 완료했다. 자동→수동 전환·곡률 핸들·독립 구간·touch 모델·물리 입력은 별도다. 과거 host focus 원인은 미규명이며 최신 tremolo 추가 수정 후 전체 검사는 다음 넓은 묶음에 포함한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/manual-span-pointer-drag.ts](../../src/renderer/src/notation/manual-span-pointer-drag.ts), [src/renderer/src/editor/manual-span-drag.ts](../../src/renderer/src/editor/manual-span-drag.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/adjusting-elements-directly.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md)

수용 기준:

- 이미선택한수동slur/hairpin의기본mouse실제preview/한command·undo
- fraction/명시0/undefined축/height/다른음악/native/MIDI보존
- Escape·focus/scroll/capture/IME/선택문서교체·modifier취소와범위거부
- 실제960/1400·native/두XML/MIDI/PDF와기존pageguard/수정retry·설명서대조

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-012-012 · 정지 기호 3종의 팔레트 드래그 적용

- 현재: 13개 드래그 red 뒤 기존 명령으로 적용 경로를 연결했다. 최신 팔레트49/기존189/type/build/profile/fixed PASS. 오프라인24XML pinnedXSD·표기/MIDI 왕복 통과. 실제G는960 light 밀도3캡처 뒤134확인에서 native focus 거부로 드래그 전 중단됐다. 누적 AO471파일/4,650검사+Node5 PASS, 고정1,998 입력 불변. 실제 drag 미도달은 별도 미완이다. 강화된 guard의1400 페르마타 functional에서 실제 취소/적용/중복·native/undo 정확성을 확인했다.134확인 뒤 redo 재저장 전 focus 거부이며 실제 출력을 승인하지 않는다. 별도 mark-staff-print audit에서 실제 화면/PDF의 장식음이 Stave 원점을 따라 다른 보표 근처에 놓이는 결함을 재현했다. 실제 첫 오선을 기준으로 자동 위치를 정규화하고 그 위에 페르마타를 쌓는다. numeric4 red/대조1→관련85/type/build와 실제960/1400 raw ink/PDF 통과, PDF 래스터 동일이다. 장식음/실제 빔 후속 감사의 네 생성 조합(1400세종/960높은음 down)은 공개 열기/화면·print ink/PDF 완료와 직접 검토에서 충돌이 재현되지 않았다. 제품 변경 없는 회귀 근거이며 모든 기호/폭·6px 윤곽 여백 승인과 구분한다. 현재 일반음표의3기호×960/1400 실제drag6조합이완료됐다. A명령저장통과뒤PDF직접검토에서하위보표숨표/중지표누락을확인했다. actualDOM mark0 redF/소유권4redG뒤추가보표의기존drawBreathMark호출과measure/event소유권을연결했다. I1386guards/120focus/native30저장·고유재열기/XML12/MIDI6/PDF6와actualscreen/print잉크·pinnedXSD를확인하고3PDF직접검토했다. 관련3files29/type/build/profile/fixed PASS/baseline불변. BS전체는이수정전이며BT예정이다. 후속BT전체550파일5152검사+Node5 PASS/외부1skip,8858고정입력불변으로최신수정을포함했다. 후속quarterrest3종×960/1400actual6조합1386guards/native30저장/XML12/MIDI6/PDF6와실제screen/print기호,pinnedXSD/3PDF직접검토를완료했다. 남은밀도9조건455guards/actualtheme/도크207·280·360/fine32/coarse48/caption14→28px/overflow없음·native2원본정확보존을확인했다. 새제품수정없는coverage다.
- 남은 범위: 일반음표/quarterrest의3종drag·취소/적용/중복/undo/native/출력과기록된밀도범위는완료했다. 자동staff연관·밀집조판/물리drag·IME/SR은별도감사다. 새모델/개별꾸밈음·화음구성음/touch확장은포함하지않는다. 최신전체BT는직전tremolo수정전이며다음넓은gate에포함한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-012-010
- 소스: [src/renderer/src/StudioNotationPalette.tsx](../../src/renderer/src/StudioNotationPalette.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/breaths-and-pauses.md)

수용 기준:

- 클릭 토글과 드래그 추가 전용/같은 값 무변경을 구분
- 음표·쉼표·다른 표기/이웃 파트/undo/native 보존
- 개별 꾸밈음·위조 토큰·blur·숨은 파트·입력 모드 전환 후 드롭 거부
- 실제 renderer와 XML/MIDI/PDF 검증 범위를 분리 기록

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-010 · 조표·마디 속성·성부 편집 시 원본 번호 보존

- 현재: core4/App14 red→기존 parts 명령의 private adapter로6호출/7동작을 수정했다. 최신18/관련53/확대1,391/type/build PASS. 실제960 조표 native/undo/reopen·2XML/MIDI/PDF, 보표 clef native/undo까지 확인 후160확인에서 focus 거부. 실제2+offline27 XML은 pinned XSD 통과. 누적 AP473파일/4,668검사+Node5 PASS, 고정2,076입력 불변이다. 실제 미도달 범위는 별도 미완이다. 새 F1400 dark 조표에서도 실제 undo/redo/native 정확 저장을 확인했으나60확인 뒤 재열기 직전 focus 거부다. 후속 bar-clef 실제 QA에서1400 마디 선택/적용/undo native 원본 정확 복원을 확인했으나 redo 저장 전48확인 후 focus 거부다.960도 선택/적용 뒤 최초 저장 전38확인 후 중단되어 변경 native/출력을 승인하지 않는다. QA 경로의 불필요한 하단 설정 링크를 실제 직접 팔레트 타일로 정리했으며 제품 변경은 없다. 구조 편집의 별도 현행 감사는 sparse/reverse8조합·global alias/physical break·undo/native/XML/MIDI를 통과한 회귀 coverage다. 관련38/type/XSD이며 제품 수정과 구분한다. repeat 실제1400은 적용 native/undo/redo/unique reopen/2XML XSD/MIDI/PDF 전체 완료와 독립 모델·MIDI 비교를 통과했다.960은 적용 native 정확 저장 후 undo-save 단계57확인 뒤 focus 거부로 나머지 미완이다. 제품 수정 없는 실제 coverage로 구분한다. volta 실제1400 적용/undo/redo/native 재열기 후84확인 뒤 출력 메뉴 전 focus 거부,960은최초저장전38확인 뒤 중단이다. A의 실제 저장 native를 연 별도D에서 기존expanded거부(대화상자0/파일0/state보존)와 정상XML/MIDI/PDF를 확인했다. 연속같은창 PASS로 과장하지 않는다. 빈 성부 실제 QA는1400 voice/960 staff-voice의 선택 이동·apply/undo/redo/native 재열기·XML2/MIDI/PDF를 완료했다. 독립 모델/MIDI 비교와 실제4XML XSD를 통과했다. 반대 조합은1400 staff-voice redo 저장 전53확인,960 voice undo 저장 전35확인에서 focus 거부로 미완이다. 관련71/type/syntax PASS이며 제품 수정 없는 coverage다. 실제 저장본의 별도 cold-open QA에서1400 조표/960 보표clef의 unique 재열기·재저장 native·XML2/MIDI/PDF를 완료했다. 네 실제 XML XSD·모델/MIDI 비교와 PDF 직접 검토를 통과했다. 이전 연속 창의 focus 실패는 보존한다. 2026-11-06 현재 남은 9개 조합을 같은 편집 창의 실제 UI로 완료했다. 1045 native guards, native25/reopen사본9/XML16/MIDI9/PDF9를 독립 대조했다. 원본 번호·ID·tempo alias·수동 geometry와 이웃 파트가 유지된다. XML16 pinned XSD, PDF9 각1쪽/7고유종 직접 검토. 볼타 expanded2는 기존 정책의 정상 거부(dialog0/file0/state불변)다. 제품 변경 없는 회귀 coverage이며 과거 focus 원인은 미규명이다.
- 남은 범위: 이 행의 원본 번호 보존과 실제 편집·출력 검증 범위는 완료했다. 새 표시번호 편집기·총보 전파·rebar·물리 입력·전체 밀도·외부 앱 검수와 과거 host focus 원인 규명은 포함하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-030-001, SMG-030-009
- 소스: [src/renderer/src/editor/key-signature.ts](../../src/renderer/src/editor/key-signature.ts), [src/renderer/src/editor/staff-content-command.ts](../../src/renderer/src/editor/staff-content-command.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-numbering.md)

수용 기준:

- 희소·역순을 포함한 유효 번호와 번호 alias 빠르기 보존
- 각 편집의 원래 범위·음높이·성부·이웃 파트·수동 geometry 보존
- 한undo/redo·native/XML/MIDI 보존과 source 비변경
- 마디 추가/삭제·core/schema/정규화 정책 비변경

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-004 · 단일 보표 글자의 굵게 서식 손실 안내

- 현재: core3/App1 red→관련35/XML753/type/build/profile/fixed PASS. 유효 원본10/사본10과 실제 출력4 XSD, 모델/native/MIDI 보존을 확인했다. 실제960 전체 안내·6밀도·native unique reopen·XML2/MIDI/PDF/도움말 완료,1400은6밀도/native 뒤53확인 focus 거부. 실제1400 저장본의 별도 cold-open 출력/도움말은 완료했다. 두 PDF 래스터가 같고 직접 검토했다. 누적 AS481파일/4,763검사+Node5와 고정2,328입력 불변을 통과했다.
- 남은 범위: 완료 범위는 일반 보표 글자의 명시적 bold 손실 안내다. 전체 서식 검사/rich text 편집은 미지원이다. 화면/print의 기존600/italic과 원본 지정값 보존은 구분한다.1400은 import/native와 별도 cold 출력으로 검증했고 같은 창 연속 경로는 focus로 미검수다. bounded 안내 수용 기준을 넘어서는 물리/외부 검수는 승인하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/musicxml/staff-text-weight-warning.test.ts](../../src/musicxml/staff-text-weight-warning.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/formatting-text.md)

수용 기준:

- 단일 일반 보표 글자의 bold 손실을 원본 파트/마디/속성 경로와 함께 안내
- 기존 시스템 굵게/표현 기울임/빠르기/리듬감과 복수 조각 진단을 오인하거나 중복하지 않음
- 한국어 우선·원문 기술 정보·키보드 격리·저장 payload 유지
- 선택/undo/native/XML/MIDI/출력 geometry 보존과 실제 메뉴·화면·출력 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-042 · 기존 음표의 성부 이동·성부 교환

- 현재: 기존 성부 버튼/V/CmdAlt의 입력 위치 전환은 유지한다. 승인된 042001의 단일 일반 음표→같은 마디의 빈 성부 이동은 native/한 undo/redo/XML/MIDI/PDF와 누적 AV를 통과했다. 042002의 실제 쉼표/음표 머리 교차 수정도 누적 AW를 통과했다.
- 남은 범위: 범위/화음/기존 내용 병합·성부 교환·교차보표는 이번 승인 범위 밖이며 별도 설계가 필요하다. 첫 이동 구현과 상위 전체 기능 완료를 구분한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioInputTarget.tsx](../../src/renderer/src/StudioInputTarget.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/working-with-multiple-voices.md)

수용 기준:

- 입력 위치 탐색과 기존 음표 이동을 별도 기능으로 표시
- source/target 리듬·충돌·기존 참조·교환 단위와 키 의미를 설계한 뒤 작은 구현 범위 승인
- 승인 후 한 undo/redo·native/XML/MIDI·선택/focus 보존과 실제 UI 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-035-005 · 입력 성부 전환과 음표 이동의 안내 구분

- 현재: 실제 설명서 검색/확인표2red 뒤 catalog/본문/색인/확인표/지원 범위를 정정했다. 관련6(필터140skip)/설명서7/type/build/문서verifier PASS. 실제960light/1400dark 검색·본문과fine/coarse4조건을 확인했으나 두 경로 모두text200에서33확인 뒤 focus 거부다. 원래 QA heading 가정 오류도 별도 보존했다. 현재B1400dark/C960light의6밀도·130guards/focus14에서실제본문200/확인표·article대상native음악키3격리/각키비재생·상태보존/EscapeHelptrigger복귀를확인했다. 사용자확인란은비워두고대표화면을직접검토했다. 제품변경없이BS549files5148+Node5동일제품이다.
- 남은 범위: 기존G/H의hostfocus원인은미확정이다. 입력성부탐색설명과별도단일음표이동구현을구분하며물리IME/SR/전체앱200·프로젝트/PDF새출력은이번검수범위가아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioInputTarget.tsx](../../src/renderer/src/StudioInputTarget.tsx), [docs/product/studio-manual/03-notes.md](../../docs/product/studio-manual/03-notes.md), [src/renderer/src/StudioManual.voice-navigation.test.tsx](../../src/renderer/src/StudioManual.voice-navigation.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/working-with-multiple-voices.md)

수용 기준:

- 음표 이동을 약속한 잘못된 절차/충돌 안내 제거와 실제 전환 동작 설명
- 기존 voices anchor·task ID·명령/키·수동 사용자 확인 상태 유지
- 없는 성부 생성은 악보 변경이며 기존 성부 탐색은 이력 비변경임을 구분
- 최신 실제 도움말 검색/확인표와 keyboard/focus·선택/dirty/history 비변경을960/1400에서 확인

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-043 · 보표·악기 괄호와 파트 묶음 편집

- 현재: 다중 보표와 파트 표시는 지원하지만 사용자 괄호·파트 묶음의 별도 모델/편집 경로는 없다. 유효 part-group 원본의 구조 손실은 자식043001에서 원본 start별로 안내한다. 실제1400 출력/native 검증과 누적AT를 통과했으나960 후속 UI는 미완이며 원본 괄호를 복원하지 않는다. 한 악기 안의 비기본part-symbol/부분보표 손실은043002로 분리해 안내했으며 누적AU를 준비한다.
- 남은 범위: 파트 간 괄호의 타입/span/column·중첩/이동·삭제·출력/간격 모델과 한 악기의 part-symbol을 분리해 설계한다. 손실 안내043001/043002과 실제 편집 기능을 구분한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/brackets.md)

수용 기준:

- 기존 다중 보표와 사용자 part-group/part-symbol의 실제 지원을 분리 확인
- 종류/포함 보표·파트/중첩·수동 배치와 구조 편집 정책을 정한 뒤 작은 범위 승인
- 승인 후 native/XML·선택/undo·실제 화면/PDF와 기호 간격 검증

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-043-001 · MusicXML 파트 묶음 손실 안내

- 현재: core5/App2 red→관련21/XML760/type/build/profile/fixed PASS,14offline+2actual XSD. 실제1400 nested 경고2/6밀도/native unique reopen/두XML·MIDI·PDF/도움말을99확인으로 완료하고 payload/MIDI를 독립 비교했다.960 named는 기술 정보까지 확인 후 첫밀도16확인에서 focus 거부로 후속 미완이다. 누적 AT는 아직 전이다. 후속 누적 AT 485파일/4,776검사와 Node5 PASS, 고정 2,386입력 불변. 후속A960named의6밀도/118nativeguards와font전후focus18/native정확저장·고유재열기/XML2·왕복MIDI/MIDI/PDF/실제도움말을완료했다. 입력1+actualXML2 XSD3/PDF1쪽·대표UI를직접검토했다. 제품변경없이BS549files5148+Node5동일런타임이다.
- 남은 범위: 과거D의hostfocus상실은원인미확정이다. 새grouping모델/원래괄호복원·물리검수/외부앱승인은포함하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/brackets.md)

수용 기준:

- 시작 그룹·중첩·기본값·무그룹 대조로 의미 있는 실패 재현
- 동일 start/stop 손실 중복 없이 원본 위치/지정값과 한국어 안내
- 기존 파트/다중 보표·음악/native/XML/MIDI 보존과 원본 비변경
- focused/type/build·공개 import/report/native/output/PDF와 문서 gate 후에만 완료 판단

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-044 · 조표의 총보 범위·가시성·비전통 조성

- 현재: 장·단조30프리셋과 선택 보표 이후 적용/실제 음높이 보존이 있다. native는fifths와장·단조/미지정mode이며 팔레트click/drag는기존012범위다.
- 남은 범위: 총보/지역 적용·예고/표시 스타일·무조성·사용자 지정 부호/다른 선법을 기존major/minor로 임의 정규화하지 않고 별도 설계한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/key-signature.ts](../../src/renderer/src/editor/key-signature.ts), [src/project/schema.ts](../../src/project/schema.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/key-signatures.md)

수용 기준:

- 현재 직접 지원·원본 보존·추가 모델/정책을 구분한다.
- 기존 선택/undo/native·음높이·기보/출력 의미를 보존한다.
- 한정 수용 기준과 실제 검증/미검증 근거를 기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI 변경은 격리 build/실제 Electron
- npm run verify:studio-manual && npm run verify:studio-parity-backlog
- 필요한 전체 test:all과 소스 불변 확인; 실행 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-045 · 옥타브 선의 선택 속성·모양 편집

- 현재: 8va/8vb/15ma/15mb 범위 버튼과 재생·XML/native는 있다. 같은 범위의 같은 버튼으로 해제하고 다른 종류로 교체한다.
- 남은 범위: 현재는type/anchor모델이며 숫자만·선 숨김/대각선·임의 텍스트/선 스타일·직접 endpoint 속성은 별도 설계다.010/011의slur/hairpingeometry를복제하지않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioRangeTools.tsx](../../src/renderer/src/StudioRangeTools.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/editor/span-editing.ts](../../src/renderer/src/editor/span-editing.ts), [src/score-core/octave-shifts.ts](../../src/score-core/octave-shifts.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/octave-lines.md)

수용 기준:

- 현재 직접 지원·원본 보존·추가 모델/정책을 구분한다.
- 기존 선택/undo/native·음높이·기보/출력 의미를 보존한다.
- 한정 수용 기준과 실제 검증/미검증 근거를 기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI 변경은 격리 build/실제 Electron
- npm run verify:studio-manual && npm run verify:studio-parity-backlog
- 필요한 전체 test:all과 소스 불변 확인; 실행 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-045-001 · 옥타브 선의 보표·시간 범위와 해제 안내

- 현재: 설명서2red 뒤 본문/catalog/확인표/지원 경계를 정정했다. 현행4종 보표/성부/시간 경계 회귀와 관련25/type/build PASS, XML4 XSD. 실제960/1400 기본/본문200·확인표·Escape/opener 복귀·전체 결과 문단 containment를 확인했고 원래 표제 중심 캡처도 보존했다.
- 남은 범위: 한정 안내 완료다. 기존 음악/공통 코드는AT와 같으며 새6검사는AT4776에 소급 포함하지 않는다. 옥타브 상세 속성·원본외형 보존·물리입력/전체앱200은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/score-core/octave-shifts.ts](../../src/score-core/octave-shifts.ts), [docs/product/studio-manual/05-notation.md](../../docs/product/studio-manual/05-notation.md), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/octave-lines.md)

수용 기준:

- 현재 직접 지원·원본 보존·추가 모델/정책을 구분한다.
- 기존 선택/undo/native·음높이·기보/출력 의미를 보존한다.
- 한정 수용 기준과 실제 검증/미검증 근거를 기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI 변경은 격리 build/실제 Electron
- npm run verify:studio-manual && npm run verify:studio-parity-backlog
- 필요한 전체 test:all과 소스 불변 확인; 실행 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-043-002 · MusicXML 비기본 다중 보표 묶음 손실 안내

- 현재: core8/App2 red 뒤 비기본 part-symbol과 부분 보표 범위 손실을 기존 report/한국어로 안내했다. 관련22/XML775/type/build/profile/fixed,22생성+4실제 XSD PASS. 실제960 전체99확인과1400 6밀도/native42확인 뒤 focus 중단, 실제저장본의 별도G 출력60확인을 구분한다. 후속 누적 AU489파일/4,795검사와 Node5 PASS, 고정2,508입력 불변. 현재A1400partial동일창전체와B960none최신대조를236guards/focus48로완료했다. native2저장/고유2재열기/XML4왕복MIDI/MIDI2/PDF2·XSD6/직접캡처검토,제품동일BS549files5148+Node5재사용.
- 남은 범위: 과거F의hostfocus원인은미확정이다. 손실안내범위만완료이며원래괄호·staff범위복원/새그룹모델/색·position전체지원·물리/외부앱승인은포함하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/brackets.md)

수용 기준:

- 시작 그룹·중첩·기본값·무그룹 대조로 의미 있는 실패 재현
- 동일 start/stop 손실 중복 없이 원본 위치/지정값과 한국어 안내
- 기존 파트/다중 보표·음악/native/XML/MIDI 보존과 원본 비변경
- focused/type/build·공개 import/report/native/output/PDF와 문서 gate 후에만 완료 판단

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-039-001 · 설명서 과제 제목과 검색 연결 복원

- 현재: 실제5개제목/2개검색red7과추가포인터소유권red1을재현한뒤문서배치와anchor형식검증을수정했다.기존문구/과제83·anchor를보존했고관련22/type/build PASS. 실제960/1400 검색·과제/문단노출·Escape복귀가각27확인으로통과했다.
- 남은 범위: 한정탐색수정완료다.새8검사는AU4795에포함하지않는다.전체앱200/coarse·물리IME/SR와길어진안내의읽기간격은별도범위이며음악모델/명령을변경하지않았다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-039
- 소스: [docs/product/studio-manual/02-workspace.md](../../docs/product/studio-manual/02-workspace.md), [docs/product/studio-manual/05-notation.md](../../docs/product/studio-manual/05-notation.md), [docs/product/studio-manual/07-playback.md](../../docs/product/studio-manual/07-playback.md), [docs/product/studio-manual/09-files.md](../../docs/product/studio-manual/09-files.md), [src/renderer/src/studio-manual.ts](../../src/renderer/src/studio-manual.ts), [scripts/verify-studio-manual.cjs](../../scripts/verify-studio-manual.cjs)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- 5개 실제 절 제목과 파일/단축키 검색 위치의 red를 보존한다.
- 기존 문장/지원 범위·catalog83·anchor·userChecked=false를 보존한다.
- 실제960/1400 검색/본문·내부 스크롤/포커스와 도구 검증을 확인한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-039-002 · 설명서 연속 문단의 읽기 간격

- 현재: 실제 18쌍 0px red 뒤 설명서 CSS만 기존 md 12px로 수정했다. 관련22/type/build와 F960/G1400의 light/dark·실제 Text16/32px·내부 스크롤·Escape가 각47가드로 통과했다. 현재actual1400/960의강화8조건118guards/focus16에서p+p30쌍의12px/md간격·실제16/32px·경계뷰포트/overflow·nativePageUp완료/Escape복귀/score불변을확인했다. 4대표캡처직접검토·기존제품BS549files5148+Node5재사용.
- 남은 범위: 과거I/J의hostfocus원인은미확정이다. 동일30문단쌍을8조건으로검사한범위이며전체앱200/coarse/물리IME/SR·새프로젝트/PDF/외부앱검수는포함하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-039
- 소스: [src/renderer/src/studio-manual.css](../../src/renderer/src/studio-manual.css), [scripts/studio-manual-paragraph-spacing-qa.cjs](../../scripts/studio-manual-paragraph-spacing-qa.cjs)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- 수정 전 실제 문단 간격 0px와 실패·캡처를 보존한다.
- 기존 md 토큰 간격을 적용하고 문구/anchor/공통 API·기보·파일 의미를 유지한다.
- 960/1400의 light/dark·기본/본문200%와 내부 스크롤·focus 복귀를 검사한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-044-001 · 미지원 선법·비전통 조표 가져오기 실패 안내

- 현재: 유효 원본/XSD7과 core1/App3 red 후 기존 거부를 유지하며 한국어 지원 경계·원본 보관·기술 정보를 연결했다. 관련15/XML781/type/build, 실제960/1400 각72가드 및 전통 재시도/native 재열기·정확한 score/MIDI 비교 PASS.
- 남은 범위: 지원 실패의 안내만 한정 완료다. 고급 조표·선법 모델은 상위044 needs-design, 새9검사 이후 누적 suite는 다음 묶음에 실행한다. 물리IME/OSdialog/SR·외부 앱·새PDF는 별도 미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-044
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/key-signatures.md)

수용 기준:

- 유효 원본과 대조군을 pinned XSD로 검사하고 실패 안내 red를 보존한다.
- 이전 dirty/선택/undo·native 경로·최근 목록을 보존하고 실제 진단을 숨김 기술 정보에서 확인한다.
- 원본과 지원되는 대조군의 기보·native/XML/MIDI 의미를 임의 변환하지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-042-001 · 단일 일반 음표를 같은 마디의 빈 성부로 이동

- 현재: 사용자 승인 범위의 별도 이동을 기존 명령/공통 UI로 구현했다. 관련40/type/build·960/1400 각122가드·정확한 undo/redo/native/XML/MIDI/PDF/XSD6과 누적 AV495파일4835/Node5가 통과했다.
- 남은 범위: 단일 일반 음표/빈 성부 기능의 한정 완료다. 첫 박 쉼표/F# 근접은042002 잉크 감사로 별도 추적한다. 상위042의 범위/화음/교환·병합과 물리IME/OSdialog/SR는 별도 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-042
- 소스: [src/renderer/src/editor/empty-voice-move.ts](../../src/renderer/src/editor/empty-voice-move.ts), [src/renderer/src/StudioVoiceMoveProperties.tsx](../../src/renderer/src/StudioVoiceMoveProperties.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/working-with-multiple-voices.md)

수용 기준:

- 승인 범위의 일반 단음/빈 성부만 허용하며 기존 전환 버튼/단축키 의미를 유지한다.
- ID·위치·음가·발음·원본 번호·이웃/수동 geometry를 보존하고 하나의 undo/redo와 선택 주소를 검증한다.
- 미확정 draft/IME·선택 변경을 보호하고 native/XML/MIDI·실제960/1400·PDF를 확인한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-042-002 · 같은 박의 다중 성부 쉼표·음표 잉크 간격 감사

- 현재: 실제 폰트/CTM alpha mask에서 875px(4배 표본)의 쉼표·음표 머리 교차를 재현했다. formatter 뒤 실제 머리 잉크가 겹치는 쉼표만 바깥쪽으로 옮긴다. 수치 red3→신규9/관련52·타입·격리 build와 위/아래·보조 보표의 실제 교차0을 확인했다. 실제 출력/수동 geometry 보존과 누적 AW497파일/4844+Node5·2734입력 불변까지 통과했다.
- 남은 범위: 작은 자동 쉼표/다른 성부 음표 머리 충돌 범위는 완료했다. 줄기·임시표·점·쉼표끼리의 전체 조판 또는 수동 쉼표 배치 지원은 별도 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-042-001
- 소스: [src/renderer/src/notation/visual-state.ts](../../src/renderer/src/notation/visual-state.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/notation/voice-rest-clearance.ts](../../src/renderer/src/notation/voice-rest-clearance.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/working-with-multiple-voices.md)

수용 기준:

- 기존 성부 배치 coverage와 중복을 확인하고 실제 잉크 경계를 측정한다.
- 확인된 결함만 기존 renderer로 수정하며 native/명령/수동 geometry를 보존한다.
- 같은 박·다른 음높이/성부와960/1400/PDF 대조군을 유지한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-046 · 보표 유형·줄 수·개별 크기 설정

- 현재: 비5선 줄 수046001과 개별 보표/기보 크기046002 손실 안내는 누적 gate까지 완료했다. 기본 모델/기보는 유지한다.
- 남은 범위: 줄 수/개별 크기/줄 간격/보표 유형의 직접 편집과 보존은 모델·renderer/파트/출력 계약 설계가 필요하다. 기존 PDF 전체 보표 크기와 개별 보표 속성을 구분한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-type-change.md), [참고 2](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-part-properties.md), [참고 3](https://handbook.musescore.org/alternative-notation/custom-staff-types.md), [참고 4](https://handbook.musescore.org/formatting/page-layout-concepts.md)

수용 기준:

- 기존 PDF 전체 크기와 개별 보표/마디별 유형 변경을 구분한다.
- 원본 가져오기 보존·직접 편집·실제 조판·외부 소비자 검증을 별도 범위로 설계한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-046-001 · MusicXML 비5선 보표의 줄 수 손실 안내

- 현재: parser6/App2 red→관련29/XML792·타입/build·실제960/1400 각99가드/12밀도와 native/두XML/MIDI/PDF·총24XSD PASS. 현재 기본5선 모델/기보는 유지하며 한국어 손실 안내와 원문 보표 번호/줄 수를 보존한다. 누적AX499파일/4859+Node5·2864입력 불변까지 통과했다.
- 남은 범위: 이 작은 진단/회귀 범위는 완료했다. 상위 모델 설계·물리입력/외부앱·전체 조판 승인과 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-type-change.md), [참고 2](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-part-properties.md), [참고 3](https://handbook.musescore.org/alternative-notation/custom-staff-types.md)

수용 기준:

- 비5선 지정은 경고하고 생략/명시5선은 잘못 경고하지 않는다.
- 원본 파트/마디·보표 번호/원문과 default-hidden 기술 정보를 보존한다.
- 음악 모델/native/두 XML/MIDI와 기존 표시 geometry를 유지하고 실제960/1400에서 공개 가져오기/재열기/출력을 검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-042-003 · 자동 배치된 점 쉼표의 부착·출력 회귀

- 현재: 객체2신규/해당파일5검사와 실제 위/아래×960/1400 총4경로 각40가드·점 포함 alpha 교차0/두 XML/MIDI/PDF·10XSD를 확인했다. 새 제품 결함이 재현되지 않아 회귀 coverage만 추가했다. 누적AX499파일/4859+Node5·2864입력 불변까지 통과했다.
- 남은 범위: 이 작은 진단/회귀 범위는 완료했다. 상위 모델 설계·물리입력/외부앱·전체 조판 승인과 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-042-002
- 소스: [src/renderer/src/notation/voice-rest-render-objects.test.ts](../../src/renderer/src/notation/voice-rest-render-objects.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/working-with-multiple-voices.md)

수용 기준:

- 쉼표를 옮긴 뒤 실제 점의 anchor·부착 수·리듬이 보존되는지 확인한다.
- 실제 폰트 alpha에 점이 포함됐는지 확인하고 위/아래960/1400·PDF/native/XML/MIDI를 검토한다.
- 결함이 재현되지 않으면 제품 수정으로 계산하지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-042-004 · 성부 이동 시 헤어핀 적용·MIDI 보존

- 현재: core3/App2 red 후 private 적용범위 가드·신규10/관련31·확대71/type/build PASS. 실제960 75가드와1400 136가드에서 거부·안전한3성부 이동/한 undo/redo/native/두XML/MIDI/PDF·6XSD를 확인했다. 누적AY501파일/4869+Node5·2906입력 불변도 통과했다.
- 남은 범위: 작은 헤어핀 적용 보존 범위는 완료했다. 모델 확장·전체 성부 이동과 물리/외부 검수는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-042-001
- 소스: [src/renderer/src/editor/empty-voice-move.ts](../../src/renderer/src/editor/empty-voice-move.ts), [src/renderer/src/playback/timeline.ts](../../src/renderer/src/playback/timeline.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/working-with-multiple-voices.md)

수용 기준:

- 헤어핀 중간 음표 leaving/target entry의 세기 손실을 변경 전 거부한다.
- 다른 파트/cross-voice/반열린 경계/안전한 대상은 허용하고 MIDI/정확한 undo를 보존한다.
- 실제 메뉴·속성에 이유/disabled를 표시하고 원본/선택/dirty/undo/native/XML/MIDI를 보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-046-002 · MusicXML 개별 보표·기보 크기 손실 안내

- 현재: 13red/5대조→신규16/관련29/XML806·실제960/1400/native·출력/XSD·build/profile/fixed 및 누적AZ503파일/4885+Node5,3096입력 불변 PASS.
- 남은 범위: 이 작은 손실 진단·상태줄/회귀 범위는 완료했다. 개별 배율 모델/편집과 기존focus/물리입력/외부앱 미완은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-type-change.md), [참고 2](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-part-properties.md), [참고 3](https://handbook.musescore.org/alternative-notation/custom-staff-types.md)

수용 기준:

- 개별 공간/기보 크기의 비기본 값을 failure-first로 진단하고 원문/보표 소유권을 보존한다.
- 명시100·생략과 기존 비5선 안내를 혼동하지 않는다.
- 기존 음악/native/XML/MIDI·기보 geometry를 바꾸지 않고 실제960/1400에서 보고서/출력을 검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-009-001 · 꾸밈음 MIDI 발음 누락의 손실 안내

- 현재: core4/App2 red·조용한4대조→신규10/관련28/MIDI45/기존async22·실제960/1400각221가드·12밀도/native·출력·6XSD/build/profile/fixed 및 누적BA505파일/4895+Node5·3179입력불변 PASS.
- 남은 범위: 이 작은MIDI누락진단 범위만 완료했다. 꾸밈음 발음·시간차용/새모델은 상위009 needs-design이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/grace-notes.md)

수용 기준:

- 꾸밈음의 MIDI 발음 누락은 경고하고 없는 대조는 잘못 경고하지 않는다.
- 원본 위치/개수·한국어 요약·기술 정보를 보존한다.
- MIDI 바이트/내부 재생 의미/native/XML/선택/undo/dirty를 바꾸지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-004 · 트릴·단음 트레몰로의 MIDI 표현 손실 안내 감사

- 현재: core7/App2 red·조용한3대조→신규12/관련32/확대36파일380/type·실제F/G각229/I mixed270가드·18밀도/두원문키보드focus·native/title1undo/redo/출력13XSD와grace기본회귀221/추가2XSD를확인했다. 누적 BB: 508파일/4928검사·Node5 PASS, 외부1skip·3536입력 불변.
- 남은 범위: 이 작은 MIDI 표현 누락 안내만 완료했다. MIDI 발음·시간·모델 확장 및 모르덴트/턴·2음 트레몰로 감사는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/playback/piano-transport.ts](../../src/renderer/src/playback/piano-transport.ts), [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/ornaments.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/tremolos-and-rolls.md)

수용 기준:

- 동일fixture의 내부 연주명령·MIDI·native/XML 계약을 먼저 분리해 확인한다.
- 확인된 표현 누락은 source owner/한국어 요약·기술 원문으로 알리고 조용한 대조를 보존한다.
- 현재MIDI바이트/시간·기보·native/XML·선택/undo/dirty는 바꾸지 않는다. 의미변경은 별도설계다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-005 · 꼬리 있는 단음 트레몰로의 내부 연주 간격 감사

- 현재: strong red11/5대조와끝attack red1 뒤신규21/확대35파일370/type PASS.실제old I/J1대2·2대3/oldU4대3을finalX/Y/W2/3/3으로수정확인했다.각88가드·native/이전MIDI동일·25XSD·PDF3개각1쪽을확인했다. 누적 BB: 508파일/4928검사·Node5 PASS, 외부1skip·3536입력 불변.
- 남은 범위: 꼬리·획 간격과 음 끝의 중복 발음만 완료했다. legacy resume 정렬 정책과 실제 청음·실기기·외부 앱은 별도다. 두 파트 믹서 실패는 034002로 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/playback/timeline.ts](../../src/renderer/src/playback/timeline.ts), [src/renderer/src/playback/piano-transport.ts](../../src/renderer/src/playback/piano-transport.ts), [src/renderer/src/playback/useScorePlayback.ts](../../src/renderer/src/playback/useScorePlayback.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/tremolos-and-rolls.md)

수용 기준:

- 공식꼬리/빔과획수기준으로의미있는실패를먼저재현하고quarter/half/whole대조를유지한다.
- 확인된내부간격만기존timeline/예약경로로수정하며원본음가·native/XML/MIDI/기보geometry는유지한다.
- 점·잇단음표·타이/반복·페르마타와실제음소거예약을구분해검증한다.다른재개정책/발음모델은자동확장하지않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-034-002 · 믹서 포커스에서 상단 도구로 돌아가는 스크롤 경로 감사

- 현재: 제품 수정 없이 실제 native wheel/F6 복귀를 검증했다. D960 light 82·E1400 dark 74 strict 가드/거부0, 실제 잉크·선택·native 고유 재열기 보존과 기존11검사 PASS. A/B의 프로그램 준비 실패와 C의 em-box 관찰은 별도로 보존했다.
- 남은 범위: 이 기존 사용자 조작 경로의 조사만 완료했다. 프로그램 scrollIntoView의 모든 연속성, 005 일시정지 nearest 화면 전체, 물리 장치/자유 도킹 승인은 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [scripts/studio-tremolo-timing-qa.cjs](../../scripts/studio-tremolo-timing-qa.cjs)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/workspaces.md), [참고 2](https://handbook.musescore.org/customization/toolbars-and-windows.md)

수용 기준:

- 기존실패/가드를보존한채실제wheel/keyboard와helper scroll을분리해원인을판정한다.
- 제품결함만기존intent/ref로좁게수정하고draft/선택/undo/재생상태를보존한다.
- 앱강제refocus/DOMclick대체/가시성완화/근거없는반복을하지않고960/1400의실제잉크·focus·정상대조를기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-006 · 네 장식음의 표기·내부 연주·MIDI 지원 구분

- 현재: 현행 core4와 실제 도움말 red B→App1, 관련3파일8 PASS. 실제 최종 H960/I1400은397/137 native가드·12조건·마지막 MIDI열 keyboard/복귀·원본 상태 보존. 생성4XSD/type/build/문서 gate를 확인했다. 후속 누적BC512파일/4937·Node5와3690입력 불변 PASS.
- 남은 범위: 지원 범위 안내만 완료했다. 모르덴트·프랄트릴러·턴의 새 발음이나 모든 장식의 외부 호환성은 구현하지 않았다. BB4928은 신규5검사 전이며 후속 BC에 포함됐다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/playback/ornament-scope.test.ts](../../src/renderer/src/playback/ornament-scope.test.ts), [docs/product/studio-manual/05-notation.md](../../docs/product/studio-manual/05-notation.md)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/ornaments.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/tremolos-and-rolls.md)

수용 기준:

- 원본/native·XML 왕복·MIDI 바이트와 내부 연주 명령을 네 기호별로 구분한다.
- 실제 도움말에서 한국어 표·keyboard/닫기 복귀를 검증한다.
- 현재 조용한 MIDI 대조와 음악 모델을 보존하고 새 장식 연주 구현으로 주장하지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-042-005 · 대상 빈 성부의 쉼표 끝점 연결 안내

- 현재: 기존 거부를 유지하며 이유만 구체화했다. core/App red·수정 뒤6파일35/type, 실제 I960/J1400각75 strict가드·원본/native/수동geometry·두XML/MIDI/PDF와6XSD를 확인했다. 누적 BC512파일/4937검사·Node5와3690입력 불변 PASS.
- 남은 범위: 기존 거부 이유 안내만 완료했다. 대상 끝점 자동 이동/삭제·고급 성부 이동/교환·새 모델은 지원하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-042-001
- 소스: [src/renderer/src/editor/empty-voice-move.ts](../../src/renderer/src/editor/empty-voice-move.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/working-with-multiple-voices.md)

수용 기준:

- 유효 native의 헤어핀 시작/끝 두 사례를 먼저 재현한다.
- ID 할당 전 거부와 선택/undo/dirty·원본/native/XML/MIDI를 보존한다.
- 실제 메뉴·공유 속성·저장/재열기·출력에서 기존 연결과 수동 geometry를 확인한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-039-003 · 설명서 표의 한국어 표제 어절 줄바꿈

- 현재: 실제960lightfine74가드 red의 기본페르마/타를 첫 열 어절 정책으로 수정했다. D725가드·12조건/48표제와 장식표12/최장색인4조건·focused17/type/build PASS.
- 남은 범위: 첫 열 표제만 완료했다. 모든 표/전체앱200·실물입력 승인은 아니며 내부 읽기 링크의 분리는039004로 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-039
- 소스: [src/renderer/src/studio-manual.css](../../src/renderer/src/studio-manual.css)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- 실제 glyph 문자의 DOM Range 줄 좌표로 고립 음절을 재현한다.
- 960/1400·두 테마·본문200/coarse와 표 가로 keyboard/복귀를 보존한다.
- 음악 모델·기보/출력·원본/선택/undo를 변경하지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-039-004 · 설명서 내부 읽기 링크의 단어 줄바꿈

- 현재: 실제96016px 읽/기 Range red(43가드) 뒤 내부 href에만 어절 보존을 적용했다. focused17/type/build·D960115/E140079가드·normal/본문200·native 절차 열기/이전 항목/키보드/닫기 복귀 PASS.
- 남은 범위: 내부 읽기 동작의 줄바꿈만 완료했다. 외부/다운로드 실제 실행과 전체 링크/전체앱200/물리 입력 검수는 별도다. BC4937은 두 CSS 수정 전이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-039
- 소스: [src/renderer/src/StudioManual.tsx](../../src/renderer/src/StudioManual.tsx), [src/renderer/src/studio-manual.css](../../src/renderer/src/studio-manual.css)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- 실제 글자 Range로 읽/기 분리를 재현한다.
- 기존 내부 링크 이동/keyboard/뒤로/닫기·다른 열과 URL을 보존한다.
- 좁은/넓은 창·큰 글자에서 실제 내부 링크를 읽고 실행할 수 있어야 한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-039-005 · 도움말 이동 예약과 새 수동 화면 소유권

- 현재: 5 red/3대조 뒤 private intent snapshot으로 수정했다. 신규8/관련25/type/build·E960/F1400각39가드에서 자연 click→wheel 중첩과 새 수동 위치/포커스·다음명시이동/요청시점 Back·원본 상태를 확인했다. profile/fixed 및 링크115가드 회귀 PASS. BD513파일/4945·Node5/외부1skip,3959고정해시 통과했다.
- 남은 범위: 실제 정상 흐름과 native 이벤트 순서를 구분해 검증한다. 단위의 제어된 frame 지연을 자연 production 재현이라고 주장하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-039
- 소스: [src/renderer/src/StudioManual.tsx](../../src/renderer/src/StudioManual.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- 새 수동 viewport 이동을 오래된 chapter/back 예약이 덮지 않는다.
- zero wheel/IME/정상 reveal와 다음 명시적 이동·history 복원을 보존한다.
- 실제 native 조작의 순서를 기록하고 원본/선택/dirty/undo/음악 키 격리를 유지한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-039-006 · 창 비활성·숨김 전후 도움말 예약 이동 조사

- 현재: 3red/2대조→관련21/type/build·전체BE4956 PASS. F/G blur·I960 app.hide/J1400 win.hide 각38가드의 자연pending·복귀/Back·원본상태 PASS. L원본trace4재분석에서일시focus/scroll덮임없음. Evisibility가정실패보존·실제visibilityhidden/물리OS/타플랫폼미검증.
- 남은 범위: 자체 임시 창의 blur/hidden·복귀와 정상 명시 이동을 대조한다. 사용자 앱/다른 앱 focus를 조사하거나 조작하지 않는다. native 순서가 실제로 재현됐는지 구분한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-039
- 소스: [src/renderer/src/StudioManual.tsx](../../src/renderer/src/StudioManual.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- 현재 창 소유권 상실 뒤 오래된 예약이 focus/scroll을 바꾸는지 먼저 재현한다.
- 자체 창/임시 프로필과 단위 대조만 사용하고 다른 앱을 조작하지 않는다.
- 정상복귀·새 명시적 이동·IME/원본/선택/undo·기존 gesture를 보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-005 · 가사 입력 키와 핸드북 차이 안내

- 현재: manual3red→신규3/실제adapter기본문자3 포함 관련36/type/build PASS. F960129/G140049가드·4조건에서 실제표/키보드열복귀/Escape/원본상태를 확인했다. 입력키 자체는 보존하며 BE515파일/4956·Node5/외부1skip,4003고정해시 통과했다.
- 남은 범위: MuseScore의 Space·하이픈·Enter 키 정책과 동일하지 않다. 쉼표가사·음절별외부붙여넣기·전체가사복사·전용스타일은 이번구현이 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/renderer/src/notation/StudioInlineLyricInput.tsx](../../src/renderer/src/notation/StudioInlineLyricInput.tsx), [docs/product/studio-manual/05-notation.md](../../docs/product/studio-manual/05-notation.md)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- 실제 Input의 공백/하이픈/Shift공백 기본동작과 전역음악키 격리를 보존한다.
- 앱 내 설명서가 Enter 다음음표·↑↓절·Space/하이픈 글자와 MuseScore 차이를 명시한다.
- 960/1400 본문/표 접근과 Escape·원본·선택·dirty를 확인하고 미지원기능을 구현으로 주장하지 않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-006 · 가사 직접 입력의 문자·확정·undo·재열기 검증

- 현재: B960231/C1400247 strict가드에서 실제공백/하이픈·Enter한명령·두절·정확한undo/redo·고유native재열기/재저장 PASS. actualXML4XSD,실제baseline대비MIDI2동일,PDF2×2쪽이미지동일·직접검토. A의절1가정oracle실패보존. 제품변경없는회귀coverage다.
- 남은 범위: 기존 App mock·private adapter 기본동작 검사를 실제 native 문자 입력 승인으로 대신하지 않는다. 기존 production coverage와 다른 조합만 검증한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/renderer/src/notation/StudioInlineLyricInput.tsx](../../src/renderer/src/notation/StudioInlineLyricInput.tsx), [docs/product/studio-manual/05-notation.md](../../docs/product/studio-manual/05-notation.md)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- 실제 기존 메뉴/가사 Input에서 공백·하이픈·Enter 계약을 확인한다.
- 한 번 확정/undo와 저장/재열기를 비교하고 원본·선택·기보 의미를 보존한다.
- 물리 IME와 합성 조합·native 이벤트를 구분하고 실제결함만 수정한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-004-003 · 마디 우클릭 속성 진입과 지원 범위

- 현재: 2red/1대조→관련9/기존App회귀4/type/build PASS. G960/H1400각144가드에서실제마디속성·메뉴200·조표focus/0history·박자직접진입·편집/정확undo/native재열기/출력PASS. XML4XSD/PDF2동일/MIDIexpected동일·profile/fixed PASS. BF517파일/4959·Node5/외부1skip,4150고정입력 PASS. 총보대표범위완료·파트보는004004후속검증.
- 남은 범위: 현재구조·조표·박자표의진입점이며 MuseScore의실제길이/마디별숨김·줄기없음·번호·폭대화상자전체구현이아니다. 총보박자전파·임의길이는기존제품범위결정에남긴다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-004
- 소스: [src/renderer/src/StudioMeasureContextMenu.tsx](../../src/renderer/src/StudioMeasureContextMenu.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties.md)

수용 기준:

- 우클릭한마디의속성메뉴가악보/undo를바꾸지않고현재조표필드에focus한다.
- 기존박자직접진입/메뉴취소/keyboard/IME와실제한마디편집/undo/native를보존한다.
- 960/1400 실제메뉴위치·보이는필드·PDF/native와미지원범위를구분한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-047 · 마디별 가로 간격·고정 폭 설정

- 현재: 자동 가로 배치와 명시 줄/페이지 나누기는 기존 모델을 사용한다. Measure 타입에는 개별 폭 필드가 없고 전용 폭 편집기는 없다. 공식 layout stretch와 MusicXML 절대 tenths 폭을 같은 값으로 취급하지 않는다.
- 남은 범위: 기존 span geometry/출력 프리셋/작업창 폭과 다른 범위다. 개별 마디 폭 authoring과 시스템 재배치·native/XML·출력 계약 설계가 필요하다. 먼저047001에서 현재 @width 보존/안내를 조사한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/page-layout.ts](../../src/musicxml/page-layout.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/formatting/systems-and-horizontal-spacing.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties.md), [참고 3](https://handbook.musescore.org/formatting/page-layout-concepts.md)

수용 기준:

- 기존자동배치/줄나누기와per-measure폭·고정폭지원범위를구분한다.
- 새geometry/schema/API는계약설계없이추가하지않는다.
- XML의절대width와MuseScore stretch factor를혼용하지않고기보/재생/수동geometry를보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-047-001 · MusicXML 마디 폭 지정의 보존·안내 조사

- 현재: 폭없는대조군/width180·360 source에서현재모델/native/MIDI동일·XMLwidth소실/전용경고없음을2검사로확인. source/control/copy5XML pinnedXSD PASS. 제품변경아닌현행조사. BG520파일/4970검사·Node5/외부1skip·4269입력SHA유지PASS.
- 남은 범위: authored stretch와computed hint구분/폭편집·경고빈도는부모047 needs-design. 외부소비자·시각보존을검증하지않았다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-047
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd)
- 공식 근거: [참고 1](https://handbook.musescore.org/formatting/systems-and-horizontal-spacing.md), [참고 2](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties.md)

수용 기준:

- validXSD source와폭없는대조군의현재결과를먼저재현한다.
- 원본/음악/MIDI/native와출력 geometry를임의보정하지않는다.
- 새모델·authoring·경고빈도정책을무승인추가하지않고확인된범위를정본/설명서에기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-034-003 · 작업대 예약 포커스와 새 수동 이동

- 현재: App red4/대조3→focused11·기존workspace5·type/build PASS. 기존viewportintent guard를재사용했다. 실제F960/G1400각31native가드·원래RAF의자연중첩에서새수동document이동뒤focus탈취없음·다음명시진입/native보존. BF는이번7검사/수정전·새누적전체대기. BG520파일/4970검사·Node5/외부1skip·4269입력SHA유지PASS.
- 남은 범위: 기존예약focus의새수동viewport취소범위완료. physicaltouch/Page의실제장치·다른workspace정책은미검수이며부모034의자유도킹지원과다르다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-034
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/workspaces.md), [참고 2](https://handbook.musescore.org/customization/toolbars-and-windows.md)

수용 기준:

- 기존coverage대조뒤예약과새manual이동의순서를결정적으로재현한다.
- 실제결함만기존intent/ref로수정하고다음명시진입·selection/undo/draft/native를보존한다.
- 실제native원래RAF순서/수동viewport와단위제어를구분하고deadline/strictinputguard를유지한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-034-004 · 재생 도구 초점과 예약 커서 화면 추적

- 현재: 037002 실제추가검증J/K에서일시정지초점뒤예약cursor가root0→973으로이동/버튼가림을재현했다. 기존hookframe가드에transportfocus소유권을추가했다. 두timing red/기존61대조→관련3파일84/type·BQ actualN960/1400 frame좌표(0유지)·재생/일시정지/선택해제Space·Native10/MIDI4/도움말통과. 누적전체는아직전이다. 최종214공개행을포함한BR actualO55499exit0에서같은2폭/Native10MIDI4/Help4를재확인했다(N과고유경로중복합산안함). EZ전체671파일6396검사/Node5뒤focusedFollow재활성1red/63대조를추가확인했다. 기존callback의일시명시target으로보완해3파일85/type·BS actualS2폭off0→on973/764.5→새cursor유지→다른pausefocus0와같은Space/Native10MIDI4/Help4를통과했다. EZ는이보강전이다. FA673파일6413검사/Node5 PASS·외부1skip/1225.49초,40606개입력 실행중/원래34937→즉시독립36273/receiptREAD뒤불변. 이명명범위의수용조건은완료했다.
- 남은 범위: 이좁은수용범위는완료했다. 부모모델/전체workspace지원및물리OS·IME/dialog/clipboard·스크린리더·청음/외부앱승인으로확대하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-034
- 소스: [src/renderer/src/playback/usePlaybackViewport.ts](../../src/renderer/src/playback/usePlaybackViewport.ts), [src/renderer/src/playback/usePlaybackViewport.test.tsx](../../src/renderer/src/playback/usePlaybackViewport.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/workspaces.md), [참고 2](https://handbook.musescore.org/customization/toolbars-and-windows.md)

수용 기준:

- 재생도구의명시초점중예약/후속cursor는화면을가져가지않으며선택·음악·following설정은그대로다.
- 악보로초점복귀하면기존추적을재개하고수동스크롤의중단/명시복귀정책을보존한다.
- 현재960/1400 App의엄격viewport/hit·playing/pausedSpace·Native/MIDI와누적회귀를기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-034-005 · 선택한 안내 글자와 재생 커서의 화면 소유권

- 현재: 실제 현재BU C960/1400에서 32박 음표부터 재생한 뒤 공개 reader에 초점과 글자 선택을 유지해도 첫 두 RAF에 root281→945/187→845.5로 이동해 선택 글자가 화면 밖으로 사라졌다. 뒤 focus 노출은 root544/451로 일부 되돌리지만 원래 읽던 위치가 바뀐다. stopped/paused는 유지됐다. 새8회귀 중 제품5실패·대조67을 확인했고 기존 읽기 소유권 helper/selectionchange 예약으로 관련110/type 통과. 실제 수정BV와 누적회귀는 후속이다. 첫 BV D는 선택 위치/Native2·재열기2/MIDI2를 통과했으나 강화 F/G는 순수 선택 해제 후 cursor 지속 표시에서 실패했다. H 실제 scroll stack으로 App RO가 이전 reader를 다시 reveal함을 특정했다. App 추가6의1red/5대조 뒤 같은 읽기 선택 해제 대상만 playing RO에 양보하도록 보완해 관련5파일118/type 통과. BW 실제/누적검증 후속. 현재BW K/N960dark·1400light의 같은12상태와N 명시Follow2·Native2/재열기2/MIDI2, 실제Help L4·광역M7파일56·profile/fixed를 통과했다. source1487 및기보/모델/출력406파일은유지. 누적FC후속이며K/N같은조건을중복합산하지않는다. 최신누적FC676파일6461검사/Node5 PASS·외부1skip/1253.60초,41902입력이 실행중375초·원래72597→즉시독립37771 종료/receipt본문확인뒤같았다. 이선택읽기/같은초점선택해제범위의수용조건은완료했다.
- 남은 범위: 이 좁은 선택 읽기/같은 초점의 선택 해제·명시 Follow 범위는 완료했다. 새 빈 reader 초점과 화면 밖 Follow tooltip은 별도 audit 후보이며 전체workspace/물리OS·IME/SR/청음/외부앱 승인은 미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-034, SMG-037-002
- 소스: [src/renderer/src/playback/usePlaybackViewport.ts](../../src/renderer/src/playback/usePlaybackViewport.ts), [src/renderer/src/playback/usePlaybackViewport.test.tsx](../../src/renderer/src/playback/usePlaybackViewport.test.tsx), [src/renderer/src/App.report-viewport-release.test.tsx](../../src/renderer/src/App.report-viewport-release.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/customization/workspaces.md), [참고 2](https://handbook.musescore.org/customization/toolbars-and-windows.md)

수용 기준:

- 읽기 문맥의 보이는 안내 글자를 선택한 동안 예약/후속 cursor가 root를 옮기거나 선택을 가리지 않는다. following 설정과 오디오/선택은 그대로다.
- 선택 해제는 새 cursor mutation 없이 추적을 재개한다. 명시 악보·Follow가 남은 텍스트 선택보다 우선하며 숨겨진/접힌 선택은 정상 추적을 막지 않는다.
- 960/1400 실제 App에서 stopped/playing/paused·초점/RAF/좌표, Native/MIDI·Help·필요한 누적 회귀와 비물리 검증 한계를 기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-004-004 · 파트보 마디 속성의 대상·선택 범위 검증

- 현재: App2/타입·실제F960/G1400각179native가드·파트보Cello우클릭/field/메뉴200·정확undo/nativeview/재열기·4XMLXSD/2PDF동일/MIDIselectedpart expected PASS. 새제품변경아님·누적전체대기. BG520파일/4970검사·Node5/외부1skip·4269입력SHA유지PASS.
- 남은 범위: 비첫단일보표대표범위. key는App검사·PDF는박자표변경. 다중보표하위보표는후속대조. D/E 도구focus/viewport point실패를보존한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-004
- 소스: [src/renderer/src/StudioMeasureContextMenu.tsx](../../src/renderer/src/StudioMeasureContextMenu.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties.md)

수용 기준:

- 비첫파트의실제선택보표/마디와설정scope가일치한다.
- 뷰·원본/이웃파트·기존명령/undo/native를보존한다.
- 실제결함만수정하고미실행UI/출력과회귀coverage를구분한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-004-005 · 다중 보표 하위 보표의 마디 속성 대상 검증

- 현재: 이전 1400 dark와 현재 960 light에서 비첫 Piano 하위 보표 2마디의 실제 우클릭·속성 scope·3/4 변경·undo/redo·native 저장/재열기·선택 파트 XML/MIDI/PDF를 각196 입력 가드로 확인했다. 두 경로의 native 전체와 이웃 파트/보표는 보존됐다. 새 OS 활성 앱 진단은 실패를 재현하지 못했으며 과거 원인은 미확정이다.
- 남은 범위: 완료는 기존 선택 보표/마디의 실제 속성 진입 범위다. 과거 host 활성 상태 상실·외부 입력 원인, 물리 입력·전체 밀도·모든 MuseScore 마디 속성은 별도 미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-004
- 소스: [src/renderer/src/StudioMeasureContextMenu.tsx](../../src/renderer/src/StudioMeasureContextMenu.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties.md)

수용 기준:

- 비첫파트의실제선택보표/마디와설정scope가일치한다.
- 뷰·원본/이웃파트·기존명령/undo/native를보존한다.
- 실제결함만수정하고미실행UI/출력과회귀coverage를구분한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-027-001 · 무음정 음표 MusicXML 가져오기 지원 경계 안내

- 현재: 유효 unpitched의 main/grace/chord·표시좌표/type 생략 및 말소리 대조에서 지원 경계 안내를 보완했다. 생략된 percussion line만 기존 내부2로 처리하며 원본 음고로 변환하지 않는다. 최신 XML81파일837검사와 BJ526파일5000검사/Node5 PASS. 실제 native J960은60번째 strict guard focus 상실로 실패해1400/rest정상 재시도는 미검증이다. 현재actual960light/1400dark각9거부·정상rest재시도/native재열기·cold저장4score동등을450guards/focus40으로검증했다. 현재입력10XSD·오류한정200/대표화면직접검토. 초기wrapper폭오표기는결과실측960으로정정하고C에서실제1400을따로확인했다. 제품변경없이BS549files5148+Node5동일런타임이다.
- 남은 범위: 부모027의드럼킷/무음정음표모델·기보/재생/출력정책은별도다. oldJhostfocus원인은미확정이며welcome실물검증으로기존dirty/undo·물리검수를승인하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-027
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/percussion/inputting-percussion-notation.md), [참고 2](https://handbook.musescore.org/idiomatic-notation/percussion/percussion-kit-customization.md)

수용 기준:

- validXSD unpitched/source대조군으로현행지원/진단을재현한다.
- 현재문서/선택/undo/native원본을보존한다.
- 확인된진단결함만좁게고치며새drumkit모델/임의기보음변환은하지않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-026-002 · 기존 native TAB의 MusicXML·표시 지원 경계 감사

- 현재: 기존native TAB값/기보음보존·표준TAB XML매핑·한국어거부안내의실제960/1400 지원경계를검증했다. 전체XML3경로쓰기전차단·유효TAB가져오기거부/원본문서보존·지원파트사본/MIDI/PDF를구분한다.
- 남은 범위: 현재지원경계감사의실제native공백은완료했다. 화면/PDF는기존G-clef fallback이며정확한TAB기보지원이아니다. 전용현/프렛모델·가져오기·출력정책은부모026별도설계,물리OSdialog/IME/SR·외부앱/청음은미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-026
- 소스: [src/musicxml/shared.ts](../../src/musicxml/shared.ts), [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/notation/vexflow-adapter.ts](../../src/renderer/src/notation/vexflow-adapter.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/guitar/entering-and-editing-tablature-notation.md)

수용 기준:

- 기존native 최소score/XML/XSD/save·copy guard의현재결과를재현한다.
- 표시·native보존·XML교환·MIDI스킵과전용TAB편집을구분한다.
- 확인된작은결함만기존모델/handler로수정하고새정책은구체적으로설계한다.
- 지원 거부 이유와 프로젝트/원본 보관을 한국어로 안내하고 raw 진단·기술키·지원 파트 사본을 보존한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지
- C960light/1400dark742native가드: XML3경로×2쓰기IPC0/파일없음·원래진단/Enter/Space·유효TABimport거부·dirty/선택/정확한undo/redo/native8/파트뷰재열기보존. ActualXML4/input3 XSD7·파트XML왕복MIDI4·actualMIDI4/PDF4각1쪽/두고유PDF와UI직접검토.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-039-007 · 앱 지원 차이 목록의 분류 누락 방지

- 현재: App 실패 재현과 producer 누락 재현 뒤 기존 5개 공개 그룹/앵커를 보존해 4개 미완료 행을 복원했다. 미지 분류는 쓰기 전에 거부한다. App/VM 5검사·최신 build/profile/fixed·BI 524파일4994검사/Node5 PASS.
- 남은 범위: 콘텐츠/생성기 수정 완료. 새로운 실제 OS Help 포인터·스크린리더 승인은 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-039
- 소스: [scripts/verify-studio-parity-backlog.cjs](../../scripts/verify-studio-parity-backlog.cjs), [docs/product/studio-musescore-gap-backlog-20261104.json](../../docs/product/studio-musescore-gap-backlog-20261104.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/support/getting-help.md)

수용 기준:

- App도움말의실제4누락행을재현하고표시를복원한다.
- 정본개발자분류/기존5공개그룹·앵커를보존하며알려진별칭을명시대응한다.
- 미지분류와누락행을verifier가거부한다. 도움말meta제외는명시한다.
- score/selection/history/save/keymap을보존하고문서·회귀를갱신한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-007 · 음표 머리 안 글자의 MusicXML 손실 안내

- 현재: 기존main/grace/chord음표머리글자손실안내의실제960/1400 native공백을검증했다. 한국어요약·원래요소수/위치·별도모양경고공존과현재지원모델의저장재열기/출력을보존한다.
- 남은 범위: 손실안내첫범위의native/UI/파일/PDF검증은완료했다. 원래notehead-text/diamond서식복원·머리글자편집모델을추가하지않는다. 물리OSdialog/IME/SR·외부앱/청음은미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- 유효 source/XSD 및 main/grace/chord의 누락을 재현한다.
- 모양 경고와 공존하고 원본 파트·마디·음표 위치를 유지한다.
- 한국어 우선/기술 정보·재생키 격리·native/MIDI/undo 보존을 검증한다.
- 새 notehead 모델이나 일반 글자로의 변환 없이 실제 QA의 미검증을 남긴다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI면 격리 build/profile/fixed 및 가능한 실제960/1400 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 변경 묶음의 test:all; 실행 중 수정/build/Electron 병행 금지
- B실제3종×960light/1400dark6경로/native1506·Enter/Space·모양/글자경고구분·원래값비노출·한title undo/redo/native24재열기/actualXML12serializer동일·왕복MIDI/actualMIDI6 PASS. C입력3+actualXML12 XSD15/PDF6각1쪽·3종두폭PNG동일/고유3쪽·chord보고서직접검토. BR동일제품전체재사용.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-008 · 머리 글자 손실 문서의 XML/MXL 백업·재시도 검증

- 현재: 실제 MusicXmlFileSession과 자체파일/압축을 App mock 요청에 연결했다. 백업실패의 원본/dirty/선택/undo 및 성공재시도의 source-before=backup SHA/MIDI/tmp정리를 XML/MXL2경로에서 확인했다. 기존4검사 포함6/type/XSD6 PASS. 제품수정이 아닌 회귀coverage다. 최신BK530파일5015검사/Node5·외부1skip·4634입력SHA유지PASS.
- 남은 범위: 명시한App mock·실제파일session/자체임시파일보존coverage완료. actualOS dialog/userData timestamp백업경로/물리UI·외부앱승인이아니다. 공식backup장의TBD로동등성을추론하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025, SMG-025-007
- 소스: [src/main/musicxml-files.ts](../../src/main/musicxml-files.ts), [src/main/index.ts](../../src/main/index.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md), [참고 2](https://handbook.musescore.org/file-management/opening-and-saving-scores.md)

수용 기준:

- 손실원본과현재모델을 구분해 실제 MusicXML/MXL 파일을 연다.
- 백업 실패에서 원본bytes/dirty/selection/undo 보존과 재시도를 확인한다.
- 성공 재시도의 이전원본backup exact·현재모델MIDI/tmp정리·유효XML을 검사한다.
- 주입IPC/backup callback·실제filesystem·OS 미검증을 구분하고 새정책을 추가하지 않는다.

검증:

- 새App real-session2 + 기존 main4 + npm run typecheck
- decoded source/backup/current XML의 pinnedXSD
- 넓은변경과누적 test:all; 전체중수정/build/Electron병행금지
- 백로그/설명서/roadmap/queue verifier와 scoped whitespace

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-007 · MusicXML 기울임 서식의 손실 안내 감사

- 현재: 기존유효XML의명시적기울임손실안내에대해현재실제native10경로에서한국어요약·원래진단/keyboard·저장재열기/XML/MIDI/PDF를검증했다. 지원되는expression기울임대조군은유지한다.
- 남은 범위: 손실안내의실제native검증은완료했다. 임의기울임편집/원본서식복원·폰트모델확장은하지않는다. 물리OSdialog/IME/SR·외부앱·청음은미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [src/renderer/src/styles.css](../../src/renderer/src/styles.css)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/formatting-text.md)

수용 기준:

- 새로운TS/API failure-first로네확인경로의명시적기울임손실을재현한다.
- 보존되는expression/normal/생략/빈글자/다중조각을오진하지않는다.
- 기존report/한국어기술정보와score/native/MIDI/undo를보존한다.
- 실제renderer·교환서식손실범위와현재UI미검증을분리기록한다.

검증:

- 관련core/App + typecheck
- pinnedXSD·필요한격리build/실제UI·기보profile/fixed
- document verifiers/scoped diff check
- 넓은변경묶음test:all,전체중수정/build/Electron병행금지
- P실제5종×960light/1400dark10경로/native718가드·native20/actualXML10serializer동일/MIDI10동일/PDF10각1쪽 PASS. Q입력5+actualXML10 pinnedXSD/PDF5종직접검토대조군PNG동일, R960system보고서직접검토. BQ제품소스동일전체재사용.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-048 · 스윙 재생의 비율·구간·보표 범위

- 현재: BQ전체545파일5127검사+Node5이후제품변경없이실제전역스윙8조합의선택·한undo/redo·off·native저장재열기/MIDI·음소거play/pause/stop을검증했다. 표기와재생설정은별개로보존한다.
- 남은 범위: 현재PDF취소/오류/성공6경로에서focus상실은미재현이며과거F의원인은미확정이다. 청음·실제OSdialog/IME/SR·외부앱·전체앱200%는미검증이다. 구간/보표별스윙모델은별도범위다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/project/schema.ts](../../src/project/schema.ts), [src/renderer/src/playback/swing.ts](../../src/renderer/src/playback/swing.ts), [src/renderer/src/playback/timeline.ts](../../src/renderer/src/playback/timeline.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/swing-playback.md), [참고 2](https://handbook.musescore.org/text/entering-and-editing-text.md)

수용 기준:

- 현재표기/실제재생/MusicXML지원차이를실제MIDI·timeline·XSD로확인한다.
- 기존파일의재생을변경하지않는첫전역범위에대한사용자결정을기록한다.
- 승인후모델/UI/undo/native/XML/MIDI와지원경계검증을완성한다.

검증:

- 기존 표기-only timeline/MIDI 불변 및 명령1개 undo/native 저장
- redA5/UI2 → focused clock/menu/ratio 및 확대회귀
- 현재 새 XML42 XSD, 16조합 MIDI/native 보존
- 현재 whole-window native UI·청음·외부 앱은 미검증, 전체 gate는 후속
- BM이후 경계2red→4files55, 성부2red→관련5files57 PASS. 현재확대/production gate는후속이다.
- 실제표현함수/command·mute·동일ID worker/cache AR2files17, App 네조합 save-success/reopen AS4, 새XML10XSD·AP MIDI바이트 PASS. 기존74파일불변은재사용증거다.
- AX153files1454/외부1skip·AUbuild/AVcomponent8·AYclassic15·BA동일화음tie2XSD/MIDI1728→2160/no1968 PASS. 실제native/PDF/청음미검증을유지한다.
- BC관계안내5red/BE적용불가1red/BG MIDI누락2red → BH11파일56검사, BItype/BJ격리build PASS. BN전체는이새변경전이다.
- BO 전체541파일5088검사+Node5 PASS/외부1skip·5403입력불변(1005.69초), 종료후 현재해시도일치. 표기/실제관계안내와적용불가 MIDI경고 포함. baseline변경없음.
- 후속M/O: 실제PDF6개/960·1400·off/on잉크와120dpi raster동일·표기변경대조. 실제App off target2대조도동일. Fnative guard37뒤focus상실거부/전체흐름미완.
- BQ후A6경로native192/C실제8조합native1278/E파트MIDI·XML경고24조건native454 PASS. reportText200/coarse emulation과전체앱/physicaltouch를구분한다. 새제품변경없음.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-048-001 · 표기와 분리한 전역 스윙 재생의 첫 범위

- 현재: BQ전체545파일5127검사+Node5이후제품변경없이실제전역스윙8조합의선택·한undo/redo·off·native저장재열기/MIDI·음소거play/pause/stop을검증했다. 표기와재생설정은별개로보존한다.
- 남은 범위: 현재PDF취소/오류/성공6경로에서focus상실은미재현이며과거F의원인은미확정이다. 청음·실제OSdialog/IME/SR·외부앱·전체앱200%는미검증이다. 구간/보표별스윙모델은별도범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-048
- 소스: [src/score-core/types.ts](../../src/score-core/types.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/project/schema.ts](../../src/project/schema.ts), [src/renderer/src/playback/swing.ts](../../src/renderer/src/playback/swing.ts), [src/renderer/src/playback/timeline.ts](../../src/renderer/src/playback/timeline.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/swing-playback.md)

수용 기준:

- 현재표기/실제재생/MusicXML지원차이를실제MIDI·timeline·XSD로확인한다.
- 기존파일의재생을변경하지않는첫전역범위에대한사용자결정을기록한다.
- 승인후모델/UI/undo/native/XML/MIDI와지원경계검증을완성한다.

검증:

- 기존 표기-only timeline/MIDI 불변 및 명령1개 undo/native 저장
- redA5/UI2 → focused clock/menu/ratio 및 확대회귀
- 현재 새 XML42 XSD, 16조합 MIDI/native 보존
- 현재 whole-window native UI·청음·외부 앱은 미검증, 전체 gate는 후속
- BM이후 경계2red→4files55, 성부2red→관련5files57 PASS. 현재확대/production gate는후속이다.
- 실제표현함수/command·mute·동일ID worker/cache AR2files17, App 네조합 save-success/reopen AS4, 새XML10XSD·AP MIDI바이트 PASS. 기존74파일불변은재사용증거다.
- AX153files1454/외부1skip·AUbuild/AVcomponent8·AYclassic15·BA동일화음tie2XSD/MIDI1728→2160/no1968 PASS. 실제native/PDF/청음미검증을유지한다.
- BC관계안내5red/BE적용불가1red/BG MIDI누락2red → BH11파일56검사, BItype/BJ격리build PASS. BN전체는이새변경전이다.
- BO 전체541파일5088검사+Node5 PASS/외부1skip·5403입력불변(1005.69초), 종료후 현재해시도일치. 표기/실제관계안내와적용불가 MIDI경고 포함. baseline변경없음.
- 후속M/O: 실제PDF6개/960·1400·off/on잉크와120dpi raster동일·표기변경대조. 실제App off target2대조도동일. Fnative guard37뒤focus상실거부/전체흐름미완.
- BQ후A6경로native192/C실제8조합native1278/E파트MIDI·XML경고24조건native454 PASS. reportText200/coarse emulation과전체앱/physicaltouch를구분한다. 새제품변경없음.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-048-002 · 총보에서 미적용인 스윙의 파트 사본 재활성 계약

- 현재: 사용자A승인후파트MIDI/구조유지XML/반복펼치기XML3red를보완했다. 총보에서미적용인스윙은파생사본에서만제외하고기존한국어/기술정보로안내한다. 원본/native/총보XML설정은유지한다.
- 남은 범위: 승인된첫파트출력계약은완료했다. 물리OSdialog/IME/SR·청음·외부앱/200%·coarse는이번검증범위밖이며이전PDF후focus거부도별도다. 구간/보표별스윙모델은추가하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-048-001
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/playback/swing.ts](../../src/renderer/src/playback/swing.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/swing-playback.md)

수용 기준:

- 총보와파트사본의재생범위를구체적근거로결정한다.
- 선택한정책의원본/native/dirty/undo보존과MIDI/XML동등성을검증한다.
- 현재정상같은박자총보및스윙꺼짐대조군을유지한다.

검증:

- scratch L App현재handler1 PASS/모의bridge·재생hook, 원본native불변. 정식정책회귀로고정하지않음.
- 독립MIDI reader N: 총보240tick/파트288tick, 선택파트XML1건pinned XSD PASS.
- 외부앱/청음/실제native파트출력은미검증.
- 승인후A3red/18대조→H31/G125files1298·외부1skip/Itype/Mgeometry4 PASS. 실제App payload15경로/native요청12·XML10XSD/MIDI독립byte240/288tick/총보Other트랙일치.
- Nbuild/Qtype/P실제960·1400 pointer310/Rnative Enter(char)·Space30 PASS, actual XML6XSD/nativeMIDI4 payload동등/Native보존·partview재열기. P의keyboard과대표현은scope보완원본으로구분.
- BQ 전체545파일5127검사+Node5 PASS/외부1skip,5861입력해시불변/종료후동일(1015.23초).

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-008 · MusicXML 단일 글자의 지정 글꼴·크기 손실 안내

- 현재: 기존R6red/2대조후단일글자의font-family/font-size손실을한국어요약/기술정보로안내한다. BQ전체이후제품변경없이실제native10경로의가져오기·keyboard·native저장재열기와XML/MIDI/PDF를검증했다.
- 남은 범위: 손실안내첫범위의검증은완료했다. 글꼴·크기편집/복원·색등모든서식지원은추가하지않는다. 물리OSdialog/IME/SR·외부앱·청음은미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/formatting-text.md), [참고 2](https://handbook.musescore.org/text/fingering.md), [참고 3](https://handbook.musescore.org/text/figured-bass.md), [참고 4](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- XSD-valid속성손실을실패재현한뒤안내한다.
- 글자/재생/native/XML출력의기존계약을보존한다.
- 한국어요약·기술정보keyboard·저장재열기를검증하고미실행nativeQA를구분한다.

검증:

- R6실패/2대조→T86파일865검사 PASS/외부1skip, Utype PASS.
- S실제입력5개 pinned XSD PASS; 내용/clock/MIDI/native/XML대조군동일.
- 실제OSdialog/새native보고서화면/외부앱미검증.
- BP 전체543파일5096검사+Node5 PASS/외부1skip,5728입력해시유지(1025.25초), 종료후현재동일.
- BQ545파일5127+Node5제품동일재사용. K실제5종×960light/1400dark10경로/native831가드·20native/10XMLserializer동일/10MIDI동일/10PDF각1쪽·5쌍PNG동일및5고유쪽직접검토. M현재입력5+실제전체nativeXML12 XSD PASS.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-009 · MusicXML 단일 글자의 지정 색 손실 안내

- 현재: T실제App/core6red·3대조후기존scalar words진단과한국어보고서로색손실을안내했다. 원래값/path를보존하고지원되는숨김tempo는잘못경고하지않는다.
- 남은 범위: 지정색손실안내의첫범위와현재누적BR gate는완료했다. 색편집/복원은지원하지않으며물리OSdialog/IME/SR·외부앱/청음·전체앱200%는미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/formatting-text.md), [참고 2](https://handbook.musescore.org/text/fingering.md), [참고 3](https://handbook.musescore.org/text/figured-bass.md), [참고 4](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- XSD-valid단일words의색손실을실패재현한뒤한국어로안내한다.
- 빈글자/조각경고중복과지원되는투명tempo를잘못경고하지않는다.
- 내용/재생/native/XML보존과실제보고서keyboard/저장재열기/출력을검증한다.

검증:

- 현재source color="#FF0000"/왕복color없음/warnings=[]; pinnedXSD-valid source를확인했다.
- W8파일66/Vtype/AA129파일1327 PASS·외부1skip, X격리build PASS.
- Z실제6종×960light/1400dark12경로/native867가드·native24/actualXML12serializer동일/MIDI12동일/PDF12각1쪽 PASS. AB입력6+actualXML12 pinnedXSD·기존PDF5종raster동일/hidden쌍동일/AD현재UI·hiddenPDF직접검토.
- BR전체547파일5138검사+Node5 PASS·외부1skip,6468입력실행중불변,962.93초.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-037-001 · 경고 기술 정보 탐색 키와 악보 명령 격리

- 현재: nativeG의 기술정보 Down→C♭4/dirty/undo1을 formal9red후 service-local handler로 수정했다. J22/type/build·N960/1400의249strictguards/native8/PDF2에서 읽기 불변과 정상 악보pitch1/undo1·문서 저장을 검증했다. 누적BS는 별도 결과다. 2026-11-08 기존wrapper밖 파일결과/body선택Up이C4→C♯4/history1→2가되는실제Native공백을확인했다. 기존8탐색키판정을private helper로재사용해선택된보이는진단글자에만적용했다. red4/controls8→신규12/관련82/type/BL actual288keys/Native14/MIDI4/Help PASS; EX전체669파일6365검사·Node5가통과했다. 실제OS전체승인은별도다.
- 남은 범위: 물리키보드/IME/SR/OS전체 검수는 별도다. native 브라우저 PageDown의 이동량을 임의 조정하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioWarningReport.tsx](../../src/renderer/src/StudioWarningReport.tsx), [src/renderer/src/App.report-text-navigation.test.tsx](../../src/renderer/src/App.report-text-navigation.test.tsx), [src/renderer/src/editor/report-text-selection.ts](../../src/renderer/src/editor/report-text-selection.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/accessibility.md)

수용 기준:

- 기술 정보 탐색 키는 score/selection/dirty/undo를 변경하지 않는다.
- native 스크롤을 preventDefault하지 않고 저장/undo/F6/Tab/Escape와 정상 악보 화살표 명령을 보존한다.
- 960/1400 실제 메뉴/포커스/읽기/저장과 누적 회귀를 구분해 기록한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지
- 2026-11-08 actualBK body error Range+Up proved C4-to-Csharp4/history1-to2 with actualNative+undo. Red4fail/8controls then App12+related6files82/type/assets120/isolatedBL passed. AppC92953exit0:960/1400x3surfacesx8navkeysx5modifiers240 +oldclipboardDelete48; Native14/MIDI4/explicitScoreUp+undo/internalDclipboard/Help09. A alter0 assumption/B QA shadow failure retained. EW668/6353Node5 is before guard; EX full pending. No bodySpace/commonAPI/engine/schema/bridge/baseline/physicalOS approval.
- integrationEX669files6365tests +external1file/1test skip +Node-native5 PASS/1158.70s. Original83399 terminal0 then immediate prewritten independent35842 terminal0/receipt READ before edits/build. 38432frozen inputs unchanged midrun/originalexit/independent. Includes selected-result navigation guard/new12/manual09/generated14. Baselines unchanged; actual OS/IME/SR/foreground/clipboard/external remain pending.
- 2026-11-10 GM/GU동일제품 상태줄 B8조건(1000높이)/D4 F6보강/F4조건(750높이)에서 200%·960dark/1400light·에뮬레이션 포인터·실제내부wheel/Page키·첫/끝글자·버튼hit·Native 보존 확인. D원래terminal미회수/완료결과회수, F원래3980 exit0. C이벤트취소기록시점실패보존. footer예약RAF 이후 nonzero/zero wheel2개 회귀추가, 관련4파일37/type PASS. 제품변경없고 OS/물리/SR/새PDF 승인아님.
- GM동일제품 고정확대율 실제4조건/750높이·200%: 미확정125/F6유지/Escape취소/Enter150/닫힌F6악보복귀·모드재열기/Native4/1558소스불변 PASS. 원래53156 exit0, 대표pendingPNG1검토. QA-only, 새제품/물리/OS/PDF승인아님.
- 2026-11-10 diagnostic AX actual2widths750: exact detail Text backend node collapsed ignored→Enter expanded StaticText/raw→reclosed ignored, summary/button expanded preserved; new Native success removes old error. Unsafe PDF native/dialog0; Native2reopen exact; current1561 unchanged/GW same product. Not OS AX/SR/physical approval; capture mainly summary/header, not full raw visibility.
- Fresh disclosure A default2 cases first/last visible,max0,PageDown0—not key pass. B UItext2x/finecoarse4conditions750 actual button Enter→one trusted PageDown per condition, both first/last Range+hit readable, root unchanged/scorehistory preserved. No raw DOM reveal after open; actualPDF native/dialog0; NativeA2/B4reopen. Current1561/GW same product, no new feature or physicalOS/SR approval.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-009 · 추가 보표의 단음 트레몰로 실제 표시와 출력

- 현재: 현재2파트 source의위1줄/아래3줄단음트레몰로를실제공개열기로읽었다. 두음표는있으나SVG group1개/선1개만그려져실제assertion1≠2가실패했다. 추가보표경로에기존drawTremoloMark호출이없는코드관찰과일치한다. 제품수정전red를보존했다. actualA1≠2/소유권3red뒤추가보표에기존그리기함수와measure/event소유권을연결했다. 기존stroke16×8/2px·stem위치·리듬/native/XML/MIDI유지. 관련3files28/type/build/profile/fixed PASS. 실제960/1400screen/print잉크·124guards/native2·고유재열기/XML4/MIDI2/PDF2와source포함5XSD,PDF직접검토/폭별래스터동일.960하위기호reveal후실제footer위표시도확인했다. BT전체는이추가수정전이다.
- 남은 범위: 기존single-note의추가보표표시누락과print소유권범위는완료했다. 새2음모델/발음·MIDI반복확장·밀집beam/tuplet/다른stem조건·물리입력은별도다. 최신추가수정후전체suite는다음넓은묶음에포함한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-005, SMG-012-012
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/tremolos-and-rolls.md)

수용 기준:

- 기존single-note트레몰로1/2/3줄을소유보표·마디에그린다.
- 기존선두께·기울기·stem위치·fontmetrics와음악/native/XML/MIDI를보존한다.
- 실제960/1400screen/print잉크·페이지소유권·PDF를검토한다.
- 새2음모델·재생·명령·스키마를확장하지않는다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-010 · 숨표·중지표의 실제 소유 보표 기준 배치

- 현재: 실제1400 화면/PDF에서 쉼표 중지표가 자기 보표 위51.859px·상위 보표 아래14.317px로 잘못 연관돼 보이는 것을 확인했다. 기존 실제 오선/잉크 간격 계산을 재사용해3red→관련96검사/type/build와960/1400 실제8경로472가드/native8저장·재열기/XML16 XSD/MIDI8/PDF8을 통과했다. 단독 쉼표 여유는8.009px이며 다른 최종 부착물 잉크도 피한다. BU 전체는 이 추가 수정 전이다. 이후BV전체552파일5158검사+Node5/10177입력불변을통과했다. 동일제품의1400총보음표/960파트보쉼표+수동slur/hairpin2실제경로418가드/native10저장·재열기/XML4XSD/MIDI2/PDF2와보표기준수동잉크보존을확인했다. 중앙의manual span hit는보존하며실제glyph의정상hit지점을사용한QA임을구분한다. 동일BV제품의1400두시스템/960두페이지native2경로112가드·XML4XSD/MIDI2/PDF1+2쪽에서두번째시스템의소유오선·8px여백과실제PDF페이지귀속을확인했다.
- 남은 범위: 기존 자동 숨표/중지표의 실제 오선 연관만 수정한다. 새 기호 변형·time-stretch·전체 밀집 악보·물리 입력/청음/외부 앱 승인은 별도다. 수동 span과 native 의미는 보존한다. 현재span의part/segment geometry override는모델에없으므로별도설계범위다. 기존partLayouts의다른나누기와기호소유권은다음QA로분리한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-003, SMG-012-012
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/notation/breath-staff-spacing.dom.test.ts](../../src/renderer/src/notation/breath-staff-spacing.dom.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/breaths-and-pauses.md)

수용 기준:

- 실제 쉼표/음표의 숨표·중지표가 자기 오선 기준이며 원점 오차로 위 보표에 붙어 보이지 않는다.
- 최종 장식음/fermata와 실제 잉크를 피하고 측정 불가 시 기존 보수적 baseline을 유지한다.
- native·수동 geometry·원본 score와XML/MIDI 의미를 보존하며 두 폭의 실제 화면/PDF를 검사한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-004-006 · 비첫 보표 주소의 총보 줄·페이지 나누기 일치

- 현재: 실제native가허용하는비첫보표주소의총보나누기를무시하던3red를수정했다. 기존XML정렬index정책을내부읽기어댑터로공유하며원본저장주소·이웃설정·명시적빈배열·한undo를보존한다. 관련95파일960검사/type/build와실제960/1400총보/독립파트보345가드·XML8XSD/MIDI4/PDF4를통과했다. 새전체BW는별도진행중이며BV는수정전이다. 이후BW555파일5168검사+Node5/10715입력불변과최종profile/fixed를통과했다.
- 남은 범위: 완료는현재aligned주소의읽기·편집·화면/인쇄일치범위다. unknown/unaligned주소는추측하지않는다. 저장후nearest reveal의status가림·물리입력·외부앱·전체density는별도미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-004-005
- 소스: [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/project/layout-measure-reference.ts](../../src/project/layout-measure-reference.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties.md)

수용 기준:

- 다른보표concrete주소/기존ordinal alias의나누기를기존XML과같은정렬된위치에표시·인쇄한다.
- 명시적해제는대상index만변경하고원본다른주소·파트설정·한undo/native원본을보존한다.
- 기존XML/MIDI와schema·glyph/font metrics를바꾸지않고실제두폭/페이지·누적회귀를검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-003 · 시스템별 슬러·헤어핀 조각의 포커스 복원

- 현재: 실제두번째조각click후첫조각으로focus/scroll324px점프를재현해DOMsystemidentity로복원하도록수정했다. 3red→관련21/확대96파일701검사/type/build·profile/fixed와슬러/헤어핀×960/1400 실제329가드·nudge/undo/redo·native8저장/4재열기·XML8XSD/MIDI4/PDF4를통과했다. 출력잉크변경없음. 새전체BX는진행전이며BW는이수정전이다. 이후BX전체556파일5176검사+Node5와11246입력불변/최종profile·fixed를통과했다.
- 남은 범위: 완료는선택한표기의현재paintedsystem조각보존범위다. Tab으로다른미선택target에focus만옮긴경우·전체density/물리입력·재나누기후새조각모델은별도검증/범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-011-001, SMG-011-002
- 소스: [src/renderer/src/notation/focus-viewport.ts](../../src/renderer/src/notation/focus-viewport.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/adjusting-elements-directly.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md)

수용 기준:

- 두번째시스템의실제stroke선택뒤focus/viewport가첫조각으로점프하지않는다.
- 재그리기/수동nudge·undo에서같은조각을유지하며기존선택변경/reflow fallback/keyboard순서와이웃표기를보존한다.
- 논리spanID·native/schema/명령/geometry·XML/MIDI/PDF잉크를보존하고두폭의실제검증을완결한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-004 · 선택과 다른 Tab 표기의 포커스 소유권

- 현재: BX실제17가드red에서선택된span과다른Tabfocus가undo에탈취되는오류를수정했다. 관련27/확대97파일707검사/type/build/profile/fixed,두방향Tab×960/1400 실제356가드·Enter선택구분·native8저장/4재열기·XML8XSD/MIDI4/PDF4를통과했다. 출력잉크는같다. 새전체BY는미실행/BX는수정전이다. 이후BY전체558파일5190검사+Node5/11872입력불변·최종profile/fixed를통과했다.
- 남은 범위: 현재미선택span의focus보존만대상이다. Tab음표·모든선택객체/물리입력·모든resize형태는별도검증이다. A의창폭변경은SVG재그리기에이르지못했다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-011-003
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/notation/focus-viewport.ts](../../src/renderer/src/notation/focus-viewport.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/adjusting-elements-directly.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md)

수용 기준:

- 선택과다른미선택span의Tabfocus가undo/redo재그리기에서보존된다.
- Enter의명시적선택과새문서/선택·삭제/reflow fallback을보존한다.
- native·한undo·원본참조·XML/MIDI/PDF잉크를바꾸지않고실제두폭을확인한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-005 · span 선택 중 Tab 음표의 포커스 보존

- 현재: 004 tab-build에서16가드red로음표Tabfocus→선택span탈취/585px점프를재현했다. 같은활성span선택/같은문서일때만전체음표주소를복원한다. 관련35/확대99파일727검사/type/build/profile/fixed와실제396가드·Enter선택구분·native8저장/4재열기/XML8XSD/MIDI4/PDF4를통과했다. 새전체BY는미실행/BX는수정전이다. 이후BY전체558파일5190검사+Node5/11872입력불변·최종profile/fixed를통과했다.
- 남은 범위: 현재span선택중Tab음표/undo범위만검증한다. 일반음표의선택/입력·readonlypreview·새문서·전체물리입력은기존정책을유지하며별도검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-011-004
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/notation/focus-viewport.ts](../../src/renderer/src/notation/focus-viewport.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/adjusting-elements-directly.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md)

수용 기준:

- span선택과별개인Tab음표의전체주소/실viewport를undo/redo에서유지한다.
- Enter의명시적음표선택·일반음표탐색·preview/삭제fallback·새문서intent를보존한다.
- 모델/명령/geometry·native/XML/MIDI/PDF의미를바꾸지않고두폭의실제경로를검증한다.

검증:

- 관련 focused 검사 + npm run typecheck
- UI/조판이면 격리 build/Electron과 필요한960/1400·PDF/native 검사
- npm run verify:studio-parity-backlog && npm run verify:studio-manual
- 넓은 코드 변경만 npm run test:all; 전체 중 수정/build/Electron 병행 금지

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-035-006 · 마디·표기 단위의 키보드 탐색

- 현재: 실제 Mac960/1400에서 plain/Command/Option 좌우는 같은 성부의 인접 event만 이동한다. Alt상하는 두 파트의 같은 위치 선택을 지원한다. 현재 소스·native·undo 불변을 확인했으며 새 탐색 명령은 추가하지 않았다.
- 남은 범위: 마디 단위와 모든 종류 표기 단위 순회의 키 정책·대상 순서·범위·끝 경계를 설계한다. UI 초점 Tab과 논리 선택, 입력 중 caret 이동을 혼용하지 않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/studio-shortcuts.ts](../../src/renderer/src/studio-shortcuts.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/navigating-your-score.md), [참고 2](https://handbook.musescore.org/basics/default-keyboard-shortcuts.md)

수용 기준:

- 일반 선택 모드의 단일 음표/쉼표에서 같은 성부 마디 이동의 키·대상·끝 경계를 예제로 확정한다.
- plain좌우·IME/입력창·미확정 입력·span1sp 이동과 기존 사용자 재지정을 보존한다.
- 별도 모든 표기 순회·범위 확장을 첫 마디 이동 구현과 섞지 않는다.
- 명시적 선택/초점·caret·scroll 소유권·새 undo 없음·native/음악시간 보존을 실제 경로로 검증한다.

검증:

- 실제 Mac960/1400의8키 조합×2경로188가드·수신 modifier 확인·native2저장/score명령0을 현행 관찰로 기록했다.
- 정책 확정 후 의미 있는 실패 재현과 기존 명령/선택 helper를 재사용하고 focused/typecheck·격리 production QA를 수행한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-010 · MusicXML 코드 구성음의 손실 안내

- 현재: core7/App2 red/정상2 → 신규11·확대107파일950검사/type/build 및 BZ전체560파일5201검사+Node5 PASS. 실제960복수/1400숨김222가드·6밀도/native4저장/2재열기/실제XML4XSD/MIDI2/PDF4와 대조raster불변을 확인했다. 현재 모델의 원래degree는 보존하지 못하며 한국어 안내/기술정보만 보완했다.
- 남은 범위: degree 구조의 원본 보존·확장 코드 입력/연주·RNA/NNS 전용 모델은 별도 조사·설계다. 이 child의 완료는 손실 안내 범위뿐이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/chord-symbols.md)

수용 기준:

- 확인된 degree 구조의 누락을 개수·원본값·part/measure/harmony/degree 주소와 함께 안내한다.
- 코드 글자가 같은 hidden degree도 구조 손실로 구분하며 정상 root/kind/bass에는 거짓 경고를 만들지 않는다.
- 프렛보드 등 이웃 경고와 원본·현재 음악 모델·native/MIDI/두 XML 출력의 기존 의미를 보존한다.
- 실제 renderer의 한국어요약/기술키 격리·저장재열기와 필요한 출력 QA를 수행한다.

검증:

- probeA 세 원본+세 사본 XSD/고정3schema 해시·무경고 손실 확인.
- 신규9red/정상2 → 구현 후 focused/typecheck/build/실제 UI·출력/전체 gate를 기록한다.
- BZ560파일5201검사+Node5/외부1skip·12671입력 불변, 최종 Help42가드·profile/fixed PASS.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-011 · MusicXML 상대 화성 표기의 손실 안내

- 현재: core4/App2 red/정상2 → 신규8·확대109파일958검사/type/build PASS. 실제960function/1400numeral-key362가드·6밀도/제목1명령undo/dirty사본거부4/native4저장2재열기/MIDI2/PDF4·대조raster불변을 확인했다. 원본 상대 관계 모델은 추가하지 않았다. CA전체562파일5209검사+Node5, 최종Help42가드/profile/fixed PASS·13033입력 실행중/직후 불변.
- 남은 범위: 원본 상대 정보의 모델/전용 입력·연주와 외부 호환성은 별도다. 이 child 완료는 손실 안내와 기존 사본 거부/현재 native 보관 계약에 한정한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/chord-symbols.md)

수용 기준:

- 현재 보존하지 못하는 function/numeral 정보를 원본 위치·값과 함께 가져오기 단계에서 안내한다.
- 정상 절대 root/kind/bass와 이웃 화음에는 거짓 경고나 음높이 변환을 만들지 않는다.
- 원래 문자·native JSON·음표 timeline/MIDI와 기존 MusicXML 거부/실패 상태를 유지한다.
- 실제 renderer의 경고 읽기·저장 거부·프로젝트 보관/재열기와 관련 gate를 검증한다.

검증:

- probeB 세 원본XSD·schema3해시, native canonical JSON/MIDI 동일과 warning0/사본 거부를 확인했다. probeA의 undefined 비교 오류는 별도 정정문과 함께 보존했다.
- core4/App2 red + 정상2 → 구현 후 focused/typecheck/실제 QA/넓은 전체 gate를 기록한다.
- CA562파일5209검사+Node5 PASS·외부1skip·13033입력 불변, 최종Help42가드/profile/fixed PASS.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-012 · MusicXML 코드 종류 접미사의 근음·베이스 표시

- 현재: core7/App2 red·정상5대조 후 기존7종 코드 어휘에 일치하는 명시적 접미사만 root/kind/bass와 조합했다. 신규14·관련112파일995검사/type/build PASS. 실제960minor/1400dominant-bass314가드·편집1명령undo/redo·dirty 두XML사본·native4저장2재열기/MIDI2/PDF6를 확인했다. CB는 기존 기대값1실패/5222통과로 전체PASS가 아니다. root=C fixture의positive/negative3곳을Cmaj7으로 정확히 바꾸고 구조assertion을 추가한 뒤 해당1검사는PASS했다. 최종CC566파일5232검사+Node5/외부1skip·13850입력실행중/직후불변·최종Help42가드/profile/fixed PASS.
- 남은 범위: 기존7종접미사의표시보완만완료다. 사용자지정/추가문법·RNA/NNS·외부앱호환성은별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/harmony-text.ts](../../src/musicxml/harmony-text.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/chord-symbols.md)

수용 기준:

- 기존7종 어휘와 일치하는 kind 접미사는 root와bass를 포함한 코드명으로 읽는다.
- 기존 전체 이름·opaque/custom·모순된 접미사·지원범위 밖 kind·root 없는 상대 관계는 현재 정책을 유지한다.
- 원본 구조주소/ID/tick·음표/timeline/MIDI/native와 편집1회undo·저장재열기/출력을 보존한다.

검증:

- probeA4원본+4사본XSD/schema3해시/경고0·표시누락 확인.
- 실패회귀를 먼저 보존하고 focused/typecheck/production/전체 gate를 기록한다.
- redA의 정상5대조 ID 오류를 원본로그와 함께 정정해 redB9실패5통과 후 green14. 관련112파일995검사+외부1skip·type/build PASS.
- 현재12원본+11사본23XSD/schema3해시, 실제XML4XSD/serializer동일/MIDI왕복동일. 실제PDF6각1쪽/원본2쌍raster동일/편집후크기쌍동일.
- CB1failed/5222passed·외부1skip, Node미실행·13471입력불변. 기존파트 기대값을 정확히 정정한 뒤 target1passed/169필터skip.
- CC566파일5232검사+Node5 PASS·외부1skip,13850입력불변. CB원래1실패보존·정확한기대값정정·파트/PDF9검사후재전체.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-013 · MusicXML 한 코드 안의 복수 화음 손실 안내

- 현재: core4/App2 red·정상2→8green, 임시표원본값추가1red→신규9green. 기존진단/한국어요약·원본값/주소를보완하고114파일1004검사/type/build PASS. 실제960/1400 362가드·6밀도/제목1명령undo·dirty사본/native4저장2재열기/MIDI2/PDF4·모델대조raster불변을확인했다. 최종CC566파일5232검사+Node5/외부1skip·13850입력실행중/직후불변·최종Help42가드/profile/fixed PASS.
- 남은 범위: 복수화음손실안내만완료다. 원래구조의모델/배치/편집/연주는지원하지않으며원본을보관해야한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/score-core/types.ts](../../src/score-core/types.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/chord-symbols.md)

수용 기준:

- 복수화음의미보존을개수/원본값/배치/정확한주소와한국어요약으로안내한다.
- 정상단일코드와여러독립harmony에는거짓복수그룹경고를만들지않는다.
- 현재부분모델·이웃표기·음표MIDI/native/두XML/PDF·dirty/선택/undo를보존하고원본복원과구분한다.

검증:

- probeA4원본+4사본8XSD/schema3해시·경고0/표시구조누락을확인했다.
- core/App실패회귀후focused/typecheck/native출력/누적CC를기록한다.
- 신규9/관련114파일1004검사+외부1skip,type/build PASS. 생성14XML/실제4XML XSD·현재serializer/MIDI동일.
- 실제362가드/6밀도·native4저장2재열기/MIDI2/PDF4각1쪽·고유1이미지와보고서2화면직접검토.
- CC566파일5232검사+Node5 PASS·외부1skip,13850입력불변. CB원래1실패보존·정확한기대값정정·파트/PDF9검사후재전체.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-006 · 같은 코드의 history 복원과 Tab 음표 초점 소유권

- 현재: 같은 코드의 undo/redo에서 과거 필드 focus 요청이 새 Tab 음표 초점을 빼앗는 문제를 좁게 수정했다. App3/helper22와 최종6파일59검사, 확대76파일1046(마지막 redo 추가 전), type/build/profile/fixed PASS. 실제960dark/1400light undo473+redo224가드와 명시적 필드 재진입·native10저장4재열기·대조 포함 XML16 XSD/MIDI8/PDF8을 확인했다. 누적 DD568파일5257검사+Node5 PASS, 외부 opt-in1skip, 14262입력이 실행 중/직후 동일했다.
- 남은 범위: 같은 객체·문서·보기의 오래된 필드 요청 가드만 완료했다. 실제 native는 코드 한 종류이며 다른 표기 family는 공통 helper 단위 검사다. 다른 객체 선택 복원·전체 탐색 키 parity·물리 OS/IME/SR/청음/외부 앱 승인은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-011-004
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/navigating-your-score.md), [참고 2](https://handbook.musescore.org/basics/default-keyboard-shortcuts.md)

수용 기준:

- 같은객체/family/generation/view에서실제Tab음표가초점을소유하면과거history의필드focus요청이이를빼앗지않는다.
- 다른객체/문서/view,선택없음,필드origin·읽기전용/불완전owner에는기존정책을유지한다.
- 명령1회/정확한undo·redo/선택ID·native/원본·MIDI/XML/PDF와공통UI API·기보geometry를보존한다.

검증:

- 실제A1400두경로128가드: focus-request는음표primary-bar-2-a→INPUT선택요약코드로이동,포인터대조는유지. 선택h-source-first동일·undo0·두native음악모델/원본해시보존.
- App의동일경로1실패/정상1대조. 원래실패로그와실제화면을보존한다.
- 수정 후 실제 960 dark/1400 light undo 473가드 + redo 224가드 PASS. 실제 native 8저장4재열기 및 redo 2저장, CC 출력 대조와 XML16 XSD/MIDI8/PDF8을 확인했다. 이 중 수정 전 대조군·red 산출물을 성공으로 계산하지 않는다.
- App3/helper22검사 PASS, 확대76파일1046검사는 마지막 redo 추가 전이다. 새 DD 전체 gate는 pending.
- 최종 typecheck·6파일59·Help C45가드/새 문단 실제 캡처·profile classic-15·fixed PASS. 타입 A의 잘못된 test exact 옵션과 Help A의 h2/h3 도구 오류를 보존했다.
- DD:568파일5257검사 PASS/외부1skip, Node5 PASS,977.70초,14262입력 불변 및 종료 직후 독립 해시 확인 PASS.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-014 · 코드 심벌 전체의 숨김 설정 손실 안내

- 현재: 단일 harmony print-object=no의 무경고 손실을 유효 XML8건과 수정 전 실제 DD 빌드에서 확인하고 기존 진단·한국어 안내·설명서로 보완했다. 신규6·확대94파일918·최종4파일31·type/build/Help42/profile/fixed PASS. 실제960/1400 386가드6조건/native4저장2재열기/actualXML4 XSD/MIDI2/PDF4를 확인했다. 누적 DE570파일5263검사+Node5 PASS, 외부1skip, 14645입력 불변과 직후 독립 해시 확인 PASS.
- 남은 범위: 손실 안내만 완료했다. 코드 숨김 속성의 모델/편집/원래 숨김 출력 복원은 미지원이다. 현재 모델 대조의 native/XML/MIDI/PDF 보존을 원본 숨김 보존으로 해석하지 않는다. 물리·외부 앱 검수는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/score-core/types.ts](../../src/score-core/types.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/chord-symbols.md)

수용 기준:

- 숨김 단일 harmony의 원본 경로/print-object=no를 기존 경고로 알리고 visible/default 대조에는 잘못 경고하지 않는다.
- 코드 글자·원본/native/음악/선택/undo/dirty/사본과 기존 XSD 계약을 바꾸지 않는다. 원본 숨김이 복원된 것처럼 보고하지 않는다.
- 한국어 요약과 필요 시 원래 경로/기술 정보를 실제 UI에서 확인하고 keyboard/밀도와 출력·재열기를 검증한다.

검증:

- 조사A: source4/copy4 XSD PASS, hidden/mixed 무경고 손실·현재 모델/native/MIDI 확인. 실제 UI 및 수정은 아직 미실행.
- 신규6검사 PASS(4red/2정상부터). 확대94파일918검사+외부1skip, typecheck PASS. 테스트의 optional score 좁히기 누락을 명시적 guard로 보완했고 원래 타입 실패 로그를 보존했다.
- 실제960/1400 386가드6조건, 한국어/기술 경로·읽기 키 격리·dirty/선택/한undo·native4저장2재열기·XML4 XSD/MIDI2/PDF4. 두 PDF 그룹은 각각 현재모델 대조와 래스터가 같고 고유 두 페이지 및 200% 보고서를 직접 검토했다.
- native A는 실제 잉크 텍스트 위의 소유 hit rect를 대상으로 잘못 조회한 도구 오류다. AB는 올바른 실제 owner로 확인해 29가드에서 기존 무경고 표시를 확인했다. 실제 XML checker B의 undefined/생략 JSON 차이는 직렬화된 값으로 정렬한 C에서 통과했으며 정확한 XML/ID/음악/MIDI 검사는 유지했다.
- 백로그 첫 gate는 W3C URL이 MuseScore 주제 색인 URL이 아니라 실패했다. officialUrls는 확인된 코드 심벌 주제로 두고 W3C 원문 근거를 referenceReview에 분리했다. verifier는 바꾸지 않았다.
- 최종 Help42가드/새 숨김 안내 실제 캡처·profile classic-15/fixed·typecheck·4파일31 PASS. baseline 변경 없음.
- DE570파일5263검사 PASS/외부1파일1검사 skip, Node5 PASS,984.28초,14645입력 불변 및 종료 직후 독립 해시 확인 PASS.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-007 · 보표 글자 implicit 요청·셈여림 Select의 history 초점 QA

- 현재: 제품 수정 없이 일반 글자의 implicit 요청4검사를 추가해 관련3파일45검사/typecheck PASS. 제품·scripts·공통 UI 748소스는 DE와 같다. old CC에서 staff Input/셈여림 Select의 같은 기존 undo/redo 결함4개를432가드로 확인했고 현재 DE의 실제960dark/1400light868가드에서8경로와 Select field-origin/새 명시적 진입이 통과했다. native/출력과 82가드의 작은 스크롤/배치 관찰을 구분해 검증했다.
- 남은 범위: 두 소비처의 실제 추가 coverage만 완료했다. 시스템/표현/연습표의 실제 native와 전체 탐색·물리 입력은 별도다. 특정 브라우저의 앵커 처리 원인을 확정한 것은 아니다. 제품 변경·전체 suite의 새로운 실행 성과로 계산하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-011-006
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/navigating-your-score.md), [참고 2](https://handbook.musescore.org/basics/default-keyboard-shortcuts.md)

수용 기준:

- 네 일반 글자의 생략된 focus 요청도 같은 helper 조건에서 과거 필드 초점을 되살리지 않고 선택 참조를 유지한다.
- 실제 보표 글자 Input/셈여림 Select에서 동일 객체+Tab 음표 owner의 undo/redo·정확한 값·한 명령/이웃/원본/native/MIDI/PDF를 확인한다.
- field-origin 및 새 명시적 입력 요청의 기존 동작은 유지한다. 현재 통과는 회귀 coverage로 구분하고 추가 제품 수정으로 계산하지 않는다.

검증:

- 네 implicit 요청 추가 회귀 포함 3파일45·typecheck PASS. DE570파일5263+Node5는 그4검사 추가 전이고 현재 제품 runtime 소스748개는 같으므로 제품 whole 기준점을 재사용한다.
- old CC AB432가드/4초점 mismatch는 같은 기존 결함의 소비처 추가 확인이다. 수정 전 파일/현재파일 모두 음악모델·의도한 필드 변경을 검증했으며 focus PASS와 구분한다.
- 현재960dark/1400light868가드:staff/dynamic 각 undo/redo8경로·Select field-origin undo/redo·새 명시적 진입, native12저장4고유재열기 PASS. 대조 포함 native18모델/actualXML12 XSD/MIDI6/PDF12를 검사하고 PDF2고유 이미지·대표 두 화면을 직접 검토했다.
- scroll C/D82가드:mf 변경 시 문서 높이+9, 초점 owner 문서Y+5.23877·scroll+5·화면Y+0.23877, undo는원복. 좌표는focus owner bounds이며 실제 ink/pageclearance 승인이 아니다. 특정browser 메커니즘 확정 없이 화면위치 보존으로 기록한다.
- native A는 버튼 value 빈값을 읽은 oracle 오류로 중단했다. 화면mf/명령1은정상이었고 AB는실제Select표시값을읽도록정정했다. 기존실패·캡처·유한deadline/strictnative checks를유지했다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-015 · 보표 글자의 기보 시작점·오선 상단 기본 앵커 정책

- 현재: 승인된 보표 기준 자동 앵커와 7종×960/1400의 총보/파트보 전체 앱 보완을 확인했다. 긴 글자의 실제 PDF/PNG 차단8회와 수정 후 출력·undo/redo·Native 재열기도 통과했다. 자동 보표 글자의 오류에서 실제 속성 문구 수정/PDF 설정 경로를 안내하도록 좁게 수정했다. 회귀2red/대조2→관련7파일50/type·DY actual I960/1400·Help AF를 통과했다. 2026-11-10 세로실제후속: 현재L/GV에서24개글자125%의원래잉크페이지교차와저장전차단을960/1400으로확인했고,75%정상재시도/정확undo·redo/Native재열기·PDF래스터보존을검증했다. 새제품수정이아닌QA-only이며원래OS/native활성초점검수는남는다.
- 남은 범위: 실제 가로/세로 차단·설정 수정 후 출력, 750px/글자200%의 오류 읽기와 PDF 버튼 동일 DOM 초점 복귀를 확인했다. 기존 native 전면 활성화·물리 IME/OS dialog/SR은 미완이며 전체 parity 승인이 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/notation/annotation-lanes.ts](../../src/renderer/src/notation/annotation-lanes.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/notation/staff-text-anchor.ts](../../src/renderer/src/notation/staff-text-anchor.ts), [src/renderer/src/notation/print-page-ink.ts](../../src/renderer/src/notation/print-page-ink.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/staff-system-and-expression-text.md)

수용 기준:

- 기존 마디 단위모델/schema/fontmetrics/glyph/수동geometry를보존하고자동기본앵커의변경범위를결정한다.
- 승인시 tick0기보기준점/실제오선상단과고음/줄기/여러글자충돌을함께검증하며단순상수이동으로새겹침을만들지않는다.
- 실제960/1400·총보/파트보·PDF·선택hit/native/undo/재열기와검토된baseline차이를기록한다.

검증:

- 실제A/B1400 read-only 조사: source hash 유지, lower staff선251.5·간격10·글자baseline187/x22, 실제glyphink별도측정. 제품변경없음.
- 공식본문의부착기준과publicmain style 기본값을읽었으며소스복사/설치된소비자실행비교는하지않았다.
- 사용자가 “보표 기준 자동 앵커로 이행 (권장)”을 명시적으로 선택했다. 현재 모델·글꼴·수동 선을 보존하며 첫 기보 위치/실제 오선 상단과 고음 충돌을 함께 다루는 제안 범위를 승인했다.
- 기존 DE actual red:baseline187 vs own top251.5/space10, x22 vs tick0 109.64. D는 Vex 논리선/실제stroke중심0.5차이를 드러냈고 실제5선 측정 후 E actual baseline240.5/top250.5/onset109.64 통과.
- 관련10파일100검사/typecheck, 고음/쉼표/온쉼표/두성부/복수글자/줄바꿈의 실제 NotationPreview+Chromium fonts960/1400 14조합 통과. App/menu/native/PDF 전체를 대신하지 않는다.
- G low 실제 저장 모델1/actualXML2 XSD/MIDI1/PDF1과 직접이미지를 확인했다. G batch 전체는 후속 OS focus loss로 실패했으며 성공 부분과 구분한다. 원본/수동geometry/baseline을 보존했다.
- DF571파일5282+외부1skip/Node5,1074.70초/종료0;15506입력실행중·즉시독립post-exit불변. 이후screen-only overlay2회귀추가와filter보완은그whole결과에포함되지않는다.
- N actual range red:stafftop+29.75. unit2red→green/10파일102,type/build. O960/1400 none/range의글자·오선좌표정확히같음. 원래M의작은float oracle차이와구분했다.
- 최종O profile/fixed PASS·baseline불변. Q14/O4/R4/U14 실제component/font36조건 PASS. U는actual App pure projection의QA-only virtual export이며sourceSHA불변/메뉴·native·print pipeline승인은아니다. T 도구font-plugin 누락과missing-file실패를보존했다.
- generated S native16모델/XML32 XSD/pinned3해시/음악MIDI/완전staff text/warning0 PASS. actual UI XML2건과구분한다. long960의큰잉크를보존했으며실제App출력차단·재시도는미검증이다.
- DG current whole573파일5297+외부opt-in1file/1test skip/Node5 PASS.1058.57초/종료0,16188입력실행중·즉시독립해시불변. 실제App/native/PDF미검증을대신하지않으며자식은in-progress로유지한다.
- DH 전체576파일/5313검사 +Node-native5 통과, 외부opt-in1파일/1검사 skip. 동결16641개 실행 중·즉시 종료 후 불변. 실제App/native 미완 gate는 별도.
- V현재K빌드1400high는실제열기/잉크assertion/기호선택·기존필드focus/Escape/직접PNG검토까지부분도달했다. 18가드검사중1거부·6정수소유권관측hit=true. 저장/XML/MIDI/PDF0개. 전체수용PASS가아니다.
- FT freeze중 memory/stdin: existing fixtures-f7kinds source/edited14Native current encode byte-equal andMIDI equal tohistorical files; current structured/expanded28fullXSD. No App/menu/undo/current geometry/PDF/native-input approval. Original nativeReady/visibility/integer-hit/deadlines unchanged; new supplemental protocol recorded separately afterFT receipt.
- 별도 D 7종×960/1400 전체 App/main 임시 IO 14흐름 PASS. Native84/재열기28·현재 두XML56 전체XSD·MIDI28·PDF28/30페이지PNG. 15개 고유 PDF 페이지 직접 검토·폭별 래스터 동일. Piano/Violin 전환의 ghost 글자/속성 없음·원래ID/수동슬러/이웃파트/정확한 undo/redo 보존. 제품1497·원래native스크립트29 불변. A/B synthetic Enter 실패와 C/D explicit focusout adapter를 구분하며 원래 native/물리 gate는 미완이다.
- 동일 제품 FT 전체706파일6696검사·Node5·외부opt-in1skip1183.73초를 재사용한다. 원래75055→즉시73938→receipt본문확인/55378고정입력 불변. 이번 QA/문서 추가를 새 제품 수정이나 중복 전체 PASS로 계산하지 않는다.
- Long H1400/960 actual score/part PDF/PNG 차단8회: native출력채널/dialog/파일0·원문/선택/history 유지. 한 번 수정→실제 PDF2/PNG2/XML4 전체XSD/MIDI2/Native6·undo/redo/재열기 PASS, 사본 뒤 history1/dirty 유지. 폭별 PDF래스터·PNG바이트 동일, 2480x3508/pHYs11811/CRC·IDAT와 실제 화면/PDF/PNG 직접 검토. E/F/G 및 H 준비 실패는 도구 오류로 보존했다. 제품1497은 FT와 동일하며 새 제품 수정이 아니다.
- 보표 글자 오류 행동 안내: print-page-ink의 실제 text class만 분류해 기존 속성 문구 수정/PDF 설정을 안내한다. 2red/대조2→관련7파일50/type PASS. DY actual I960/1400 총보/파트보 PDF/PNG 차단8회·native출력0, 수정 후18파일/Native재열기·undo/redo·사본dirty 유지. H before와 Native/XML/MIDI/PNG/PDF래스터 바이트·PDF추출글자 동일, actual HelpAF2조건 PASS. 원시PDF는 생성/수정시각 차이와 첫 비교실패를 보존하며 byte-equal로 주장하지 않는다. 제품1498 lock이며FT는 이 수정 전이다.
- FU 전체707파일6700검사/Node-native5 PASS, 외부opt-in1파일/1검사 skip,1189.73초. 원래60097 종료→즉시 사전 독립14199 종료→receipt본문확인 뒤 편집재개. 고정56409입력 실행중/즉시종료후 변경0·현재제품1498 동일. 이 마지막 보표 글자 오류 안내 변경을 포함하며 원래 native/OS/물리 gate는 대체하지 않는다.
- 현재L/GV 동일1561소스의세로출력후속: C1400 8조건/Native8·PDF3/차단5(과대악보단별도)·원래79301 exit0. D960/1400의24글자125%에서실제19번째잉크870.612>경계869.072로보표글자세로차단·native/dialog0,75%수정후PDF4/Native8·정확한undo/redo·재열기,래스터4쌍동일·오류화면1/PDF2검토·원래22879 exit0. 제품수정/새전체/OS초점승인아님.
- 현재L/GV동일1561소스·세로오류density E4조건(960/1400×fine/coarse,750높이,UI노드14→28정확2배)·실제내부wheel8/Page키8/root불변·기술Enter·72px버튼/48pxSlider·정상PDF4/기존raster4동일/Native4재열기 PASS. D동일조건보강/원래17521·40575 exit0, B/C 가시성/기준font가정실패보존. 제품수정/OS초점승인아님.
- 2026-11-11 HF동일1574소스: 세로오류 PDFfocus B 960dark/1400light×fine/coarse 네조건, 신규완료문구14→28px·차단/성공/취소12초점결과·6RAF+220ms/hit/footer/scroll PASS. PDF4·raster4동일·Native4/재열기와대표화면/PDF 직접검토. A/B동일조건보강이며제품수정/새전체아님. B원래exit코드는도구출력유실로미관측;완료결과/해시/자체프로세스종료별도확인.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-008 · 시스템·표현·연습표의 global/precise 참조 초점 QA

- 현재: 동일 DE 제품 runtime의 실제960/1400에서 세 소비처의12이력경로와 native/XML/MIDI/PDF를 추가 검증했다.
- 남은 범위: 이 세 소비처의 회귀 coverage와 QA 정수 클릭 가드만 완료했다. 전체 편집/물리 입력/새 whole PASS는 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-011-006, SMG-011-007
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioSelectedProperties.tsx](../../src/renderer/src/StudioSelectedProperties.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/navigating-your-score.md), [참고 2](https://handbook.musescore.org/basics/default-keyboard-shortcuts.md)

수용 기준:

- 유효한global 마디참조와표현tick을유지하며같은표기선택/Tab음표초점이undo/redo후보존된다.
- 한명령·정확한값/ID·새명시적필드진입/Escape·native/원본·MIDI/XML/PDF를확인한다.
- 현행통과는회귀coverage이며다른실행의whole/타입검사결과를새실행처럼계산하지않는다.

검증:

- E960dark/F1400light:1401 native 가드/380 정수소유권 검사/12focus경로 PASS. native18저장6재열기/actualXML12 XSD/MIDI6/PDF12를 검사했다.
- 세 모델별 고유PDF 이미지와 대표960expression화면 직접검토. QA 좌표 반올림 결함·이력복원 배치안정화·OS focus 중단을 분리해 기존 실패를 보존했다.
- G6가드:거부 좌표 이벤트0/정상클릭 유지. DE whole은4추가검사와이번QA변경전이고 새whole/build/visual승인으로쓰지않는다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-009 · PDF 완료 전후 OS 활성·native 입력 초점 소유권 조사

- 현재: P의read-only AppKit관측은시작시전면PID=자체Electron,실패시전면PID=다른앱을확인했다. 이실행은PDF전입력에서도중단돼PDF가원인이라고단정하지않는다. 과거F/G/H와모든원인의확정은아니다.
- 남은 범위: PDF경로의제품초점결함인지독립적인OS활성변화인지분리한다. 강제focus/DOMclick/자동재시도/지연증가로통과시키지않는다. 같은실패를가설없이반복하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [scripts/studio-native-input-state-qa.cjs](../../scripts/studio-native-input-state-qa.cjs), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/navigating-your-score.md), [참고 2](https://handbook.musescore.org/basics/default-keyboard-shortcuts.md)

수용 기준:

- startup와PDF후비활성을분리하고자체프로세스의activation trace/완료시점/닫힌창을관측한다.
- 확인된원인이제품이면소유권범위내에서회귀후수정한다. OS다른앱을강제활성/종료하지않는다.
- 정상활성대조/명시적사용자복귀/새문서/기존selection·dirty·undo를보존한다.

검증:

- F/G/H로그보존. G는실제low파일출력완료뒤비활성이벤트를관측했지만원인확정/수정은하지않았다.
- 현재O build의P에서nativeReady실패직전자체창종료전NSWorkspace bundleId/PID만읽었다. 다른앱으로전환된관측을확인했으나행위자/원인과PDF관련성은확정하지않았다. 강제focus/AX/설정변경/다른앱종료없음.
- 별도011010에서동일출력창의연결trigger 완료순서3red/3controls를재현했다. 그renderer경합과이전OS전면상실의인과는확인하지않았다.
- DJ후V: 정상자체시작77649→저장메뉴전외부80385로전면전환/guard거부. 이사례는PDF전실패이며과거F/G/H원인전체확정은아니다. 같은활성조건의DH/DI/DJ3연속턴차단audit를기록했다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-023-004 · 명시적 보표 숨김 설정의 가져오기 손실 안내

- 현재: 9red/4대조군후명시no의보표표시설정손실을기존warning/한국어/technical/summary로진단한다. 모델과기존visible표시·음악/native/MIDI/사본은유지한다. 관련6파일42/확대94파일926·외부1skip/type/buildC/생성22XSD와실제default report12조건이통과했다.
- 남은 범위: 비대화식 실제App 파일파이프라인은 보강했다. 원래 native입력/OSfocus·물리IME/SR/청음 gate와 숨김·용도 전용모델/편집·재생 의미 복원은 여전히 별도다. DOM/tempfile PASS로 이를 완료 처리하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-023-003
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/showing-staves-only-where-needed.md)

수용 기준:

- 원본no만보표번호기본1/print-spacing선택값·정확한source주소와함께경고하며기본yes/명시yes는조용히유지한다.
- 기존size/lineswarning과함께성립하고모델/보표·음표·native/MIDI/사본출력과원본을보존한다.
- 한국어우선/기술정보원문/한명령·선택·undo·저장경계를기존reportsurface에서검증하고실제미검증을구분한다.

검증:

- probe A source+copy10 XSD/pinned3해시. hidden3/control2모두기존warning0이고source와visiblecontrol model/native/MIDI같음. 실제renderer/PDF미검증.
- 2파일9red/4controls→관련6파일42/확대94파일926·외부opt-in1skip/type/buildC PASS. 생성11사례source+copy22XSD/pinned3해시/native/MIDI/기존사본보존 PASS.
- QA-only actual MusicXmlReportPanel/parser/adapter:960/1400 light/dark fine/coarse/text200 12조건 PASS. actualcoarsebutton48·닫힌raw checkVisibility·가로넘침없음. 두이미지직접검토. 실제Appimport/native/open disclosure승인이아니다.
- E/F도구실패보존. 렌더러생성전CDPtouch명령을F10초기한으로분리하고G는로드후동일명령/원assertion으로통과했다. 전체180초/작업10초유지. DF whole은이번제품수정전이며새전체미실행.
- DG current whole573파일5297+외부opt-in1file/1test skip/Node5 PASS.1058.57초/종료0,16188입력실행중·즉시독립해시불변. 실제App/native/PDF미검증을대신하지않으며자식은in-progress로유지한다.
- DH 전체576파일/5313검사 +Node-native5 통과, 외부opt-in1파일/1검사 skip. 동결16641개 실행 중·즉시 종료 후 불변. 실제App/native 미완 gate는 별도.
- 2026-11-08 같은 ET/BG제품 실제App 비대화식14흐름:Native14/14재열기·XML28fullXSD/MIDI14/PDF14·source/control/copy21XSD·일반/숨김/복수/선혼합/cue/용도혼합. 제목1명령undo/redo·원문소스주소·사본dirty·Native취소1/성공clean·합성Space뒤transport보존. 기존native/OS/물리 gate는대체하지않음. QA-only.
- 2026-11-08 sameEU/BI actualApp same-path report60↔mixed2↔plain0 sixteen phases960/1400: previous DOM/opentechnical2 replaced; new collapsed115.796875px/60originalpaths and raw retained, plain removes report, current selection/clean/history0/stoppedtransport preserved. Native16 plus16 matching-source output replays XML32fullXSD/MIDI16=64files; fixture9XSD. B viewport failure preserved/C actualrootwheel same strictcriteria. QA-only; not32independentcases/nativeOS/PDF/reopen approval.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-023-005 · 반복되는 보표 표시 경고의 기본 보고서 밀도

- 현재: 2red/2대조군후동일보표숨김import경고만여러개일때기존summary/disclosure를재사용했다. 기본높이6850.80/5410.80→각115.80이며60진단/60경로가남는다. 관련17/legacy8/type와실제defaultcomponent12조건을통과했다.
- 남은 범위: 비대화식 실제App 파일파이프라인은 보강했다. 원래 native입력/OSfocus·물리IME/SR/청음 gate와 숨김·용도 전용모델/편집·재생 의미 복원은 여전히 별도다. DOM/tempfile PASS로 이를 완료 처리하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-023-004
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/studio-warning-report.css](../../src/renderer/src/studio-warning-report.css)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/showing-staves-only-where-needed.md)

수용 기준:

- 동일보표표시설정import손실만2개이상이면명확한한국어손실·원본확인행동·총개수를기본으로남기고기존마디별상세로접는다.
- 모든원본진단/위치/값은펼친상세와technical에서접근되고단일/혼합/unknown은기존전체노출을유지한다.
- 기존report snapshot별open·동일파일재가져오기초기화/읽기키·IME/선택·0수정·native모델을보존하고실제component검사를actualApp/native와구분한다.

검증:

- Generated source60warnings,source+copy2XSD/pinned3해시,model/native/MIDI보존 PASS. 실제component960/1400높이6850.80/5410.80 관측. 전체App/caret/scoregeometry는아직관측하지않았다.
- 관련3파일17/type/기존legacy selected8 PASS(220filtered). source·score·0수정·선택/native저장·동일파일재가져오기snapshot초기화/원문technical접근을Appunit에서확인했다.
- 실제default report12조건:960/1400 light/dark fine/coarse/text200 PASS. 60행/60고유주소유지/접힌행visibilityfalse. 높이각115.80/원래기본6850.80·5410.80. 두이미지직접검토. 실제App/native/open-disclosure승인과다르다.
- DH 전체576파일/5313검사 +Node-native5 통과, 외부opt-in1파일/1검사 skip. 동결16641개 실행 중·즉시 종료 후 불변. 실제App/native 미완 gate는 별도.
- 같은파일의반복숨김6↔숨김/큐혼합2를양방향3단계로검사:신규2/관련4files10/typeB PASS. 한국어요약/원문/경로/native/MIDI/clean유지, 현행통과의coverage추가이며제품수정아님. 실제native미완.
- integrationDL 전체583files5408tests+외부opt-in1file/1test skip+Node도구5 PASS(1104.25초). 17402입력은실행중/종료직후독립불변. 실제OS/native gate는별도미완.
- 2026-11-08 같은 ET/BG제품 실제App 비대화식14흐름:Native14/14재열기·XML28fullXSD/MIDI14/PDF14·source/control/copy21XSD·일반/숨김/복수/선혼합/cue/용도혼합. 제목1명령undo/redo·원문소스주소·사본dirty·Native취소1/성공clean·합성Space뒤transport보존. 기존native/OS/물리 gate는대체하지않음. QA-only.
- 2026-11-08 sameEU/BI actualApp same-path report60↔mixed2↔plain0 sixteen phases960/1400: previous DOM/opentechnical2 replaced; new collapsed115.796875px/60originalpaths and raw retained, plain removes report, current selection/clean/history0/stoppedtransport preserved. Native16 plus16 matching-source output replays XML32fullXSD/MIDI16=64files; fixture9XSD. B viewport failure preserved/C actualrootwheel same strictcriteria. QA-only; not32independentcases/nativeOS/PDF/reopen approval.
- 2026-11-08 sameEU/BI same-path/title/report60/source-address A→A→B→A actual8imports960/1400. Fresh DOM/reset despite equal warnings; current Native8/MIDI8 exact. Actual whole-glyph center relative own5staff lines changes by-0.5 for C→D and restores, same-source unchanged. Source/copy4XSD, twoC/Dscreens reviewed. MIDI preserves open import report for actual next transition. QA-only; no new XMLUI/PDF/nativeOS/reopen approval.
- 2026-11-08 sameEU/BI actualNative4reopens960/1400 of C/D two unique30measure contents from oppositepitch XML report60/open2: exact filename/main file read, old report removed, current glyph position/first selection/clean/history0/stoppedtransport; Nativecopy4/MIDI4 exact/inputSHA unchanged. Two screens reviewed, QA-only. Native lacks original unsupported visibility/report; not restoration/new selection persistence/PDF/OS/physical approval.
- 2026-11-08 sameEU/BI actual Native open recovery960/1400: dirty replacement refusal/no dialog, chooser cancel, malformed JSON/schema preserve report60/open2/current score/selection/history/save path; real quick save then one undo/redo, corrected same-path Native retry/new save/MIDI. Native writes6 immutable snapshots6/MIDI2. Independent receipt B exit0 checks14files/1263 unchanged inputs. Original App PTY exit unavailable after truncated handoff; completion JSON/log and no process observed. QA-only; no physicalOS/PDF/new product approval.
- 2026-11-08 sameEU/BI actual main Native revision conflict960/1400: external valid file bytes protected while current edit/selection/dirty/history/report60-open2 survive rejected quick save and SaveAs cancel. SaveAs retry clean, one undo/redo/MIDI exact; external file reopen clears old report and preserves recovery file on quick save. Session20546 exit0, Nativewrites6/MIDI2, two screenshots reviewed. QA-only/EU1263unchanged; physicalOS/PDF not approved.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-046-003 · MusicXML 대체·큐 보표 용도 손실 안내

- 현재: 10red/2controls→관련54/MusicXML926/외부1skip/type/build/classic-15 profile/fixed 통과. source/copy20 XSD/3schema해시·실제기본보고서12조건/직접2이미지검토. 현재음악/native/MIDI/copy유지; 실제App/native와새전체DH는별도.
- 남은 범위: 비대화식 실제App 파일파이프라인은 보강했다. 원래 native입력/OSfocus·물리IME/SR/청음 gate와 숨김·용도 전용모델/편집·재생 의미 복원은 여전히 별도다. DOM/tempfile PASS로 이를 완료 처리하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-type-change.md), [참고 2](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-part-properties.md), [참고 3](https://handbook.musescore.org/alternative-notation/custom-staff-types.md)

수용 기준:

- alternate/cue/editorial/ossia 및 기본번호/정규화/여러선언/혼합의 손실과 원본 위치를 안내한다. regular/생략은 경고하지 않는다.
- 현재 모델·native/MIDI/재저장 XML을 바꾸지 않고 기존 보표 줄 수/크기/숨김 안내를 유지한다.
- 한국어·기술 정보·읽기 키 격리·native payload 및 실제 component/production을 검증한다. 실제App/native UI 미완은 별도로 남긴다.

검증:

- 신규10red/2controls → 관련7files54 및 typecheck PASS
- source/copy20건 pinned XSD/3schema해시 및 모델/native/MIDI/기존copy보존 PASS
- 실제component/격리production 및 전체검증 후 결과 추가; 실제App/native입력은 전면 환경 조율 pending
- DH 전체576파일/5313검사 +Node-native5 통과, 외부opt-in1파일/1검사 skip. 동결16641개 실행 중·즉시 종료 후 불변. 실제App/native 미완 gate는 별도.
- 같은파일의반복숨김6↔숨김/큐혼합2를양방향3단계로검사:신규2/관련4files10/typeB PASS. 한국어요약/원문/경로/native/MIDI/clean유지, 현행통과의coverage추가이며제품수정아님. 실제native미완.
- integrationDL 전체583files5408tests+외부opt-in1file/1test skip+Node도구5 PASS(1104.25초). 17402입력은실행중/종료직후독립불변. 실제OS/native gate는별도미완.
- 2026-11-08 같은 ET/BG제품 실제App 비대화식14흐름:Native14/14재열기·XML28fullXSD/MIDI14/PDF14·source/control/copy21XSD·일반/숨김/복수/선혼합/cue/용도혼합. 제목1명령undo/redo·원문소스주소·사본dirty·Native취소1/성공clean·합성Space뒤transport보존. 기존native/OS/물리 gate는대체하지않음. QA-only.
- 2026-11-08 sameEU/BI actualApp same-path report60↔mixed2↔plain0 sixteen phases960/1400: previous DOM/opentechnical2 replaced; new collapsed115.796875px/60originalpaths and raw retained, plain removes report, current selection/clean/history0/stoppedtransport preserved. Native16 plus16 matching-source output replays XML32fullXSD/MIDI16=64files; fixture9XSD. B viewport failure preserved/C actualrootwheel same strictcriteria. QA-only; not32independentcases/nativeOS/PDF/reopen approval.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-010 · 파일 작업 완료 순서·초점·진단 소유권

- 현재: 출력경합12/저장→수락된열기후속21과관련75·legacy18/type/build/classic-15/fixed 및 DJ578files5346+Node5 통과. 동결16972개 실행중/즉시종료후/nativeV후불변. 기존focus/ref·저장정책·nativepayload/dirty/selection/undo보존. 후속최근A삭제→B실패의낡은진단/대상덮기를수정했다. 2red/4대조→XML/native10·관련43·기존최근9/typeD PASS. 2026-11-08 MIDI 새성공/실패의기술정보가이전펼침을이어받는4red/2대조→기존request/ownsFeedback를사용한privateUI requestId/key7줄로보완했다. 신규6·관련5파일23/type,기존순서/실패9PASS(필터219skip),AA격리build/profile/fixed·pureB48조건(정확한component200ratio)/대표2이미지PASS. 원래A확대조건오류자료를보존하며최신EH전체대기다. EH 전체640파일6052검사/Node5 PASS·외부1skip,1187.51초/exit0·28242개 실행중/즉시종료후독립해시 동일로 이번MIDI reader범위를 확인했다. 기존OS/native필수gate는별도미완이다. EN 뒤 최근 XML 대기 중 편집 가설은 공개 UI 접근 불가로 기각했다. 제품 변경 없이 시작 화면의 명령 차단·문서 교체 후 최근 목록 제거 새2/관련35/type 회귀를 보강했다. 원래 setup실패/탐색 SHA는 보존한다. 2026-11-08 actualBDApp F2경로에서A Native대기→B공개XML가져오기/제목1수정→A실제쓰기/IPC/공유busy해제뒤Bdirty/보고서/선택/DOMreader/scroll보존과undo/redo·별도B출력을확인했다. 임시dialog/DOMinput이며nativeOS필수gate충족으로확대하지않는다. 2026-11-08 Native오류읽기버튼에서실제SaveAs취소후bodyfocus/다음Up의C4→C♯4를960/1400Native로재현했다. 기존focus/reveal에취소된같은진단의논리button복귀를추가했고pending숨김/취소후접힘·새필드/스크롤/열기/성공/실패를유지한다. 신규Native/XML12회귀·관련81/legacy26/type/BN Nativeactual2폭·Native8/MIDI2/Help/profile/fixed PASS. 새악보의첫XML저장dialog취소/재시도도actual2폭에서XML8fullXSD·Native6/MIDI4/정확undo-redo/restID로통과했으며EY전체670파일6377검사·Node5가통과했다. 물리OS검수는별도미완이다. 동일BN/EY의실제새trustedwheel/새공개title조합draft가취소복귀보다우선하는4고유경로를Native16/MIDI4/정확undo-redo로확인했다. root535→415후415유지·late scrollIntoView/scrollBy0·draft/focus보존,제품수정없다. 2026-11-10 PDF 완료 대기 중 enabled/상태누락을 실제 C에서 확인했다. 기존 pdfExporting을 공통 Button busy에 연결했으며 강화 표 PDF6red/기존18pass→관련39/type·retry2, 실제 E6흐름/PDF6·Native6재열기와 후발wheel/focus 우선, F/I동일4조건750px·UI글자2배·fine/coarse·busy/다른출력enabled, profile/fixed를 확인했다. 새 전체GW는 별도다. 후속GW753파일7108검사·Node5 PASS/외부1skip,1260.31초·고정76123변경0을원래실행/독립즉시검사/receipt본문으로확인했다. 2026-11-12 후속: 확인된 읽기 전용 대상의 Native/XML/PNG 교체 우회와 긴 XML 임시/백업 이름을 보완했다. 승인된 XML 심볼릭 링크는 실제 대상에 저장하고, 새 대상이 없으면 링크를 유지하며 생성한다. 기존 Binary 경로 helper를 내부 공유했다. 관련 main79/type/build·실제 XML8조건과 PDF/MIDI4보존/retry/동등성을 확인했다. HP전체의 기존 파트 제목15초초과는 보존하고 접근성 검색 범위만 별도 보완했으며 HQ는 가사 통합 사례의 기존30초 초과1건으로7260통과/1실패·Node미실행이다. 공개 영역 긍정 조회만 좁혀 분리19.181→13.560초/타입을 확인했고 HR 전체가 후속이다. XML 링크 부분 쓰기/최종 교체 실패는 제품 변경 없이 신규16·관련95/type과 실제16실패/retry/32XSD경로/16재열기로 회귀를 보강했다. HR은178.505초 시계 차이로 전체 요약/Node 없이 종료돼 현재 전체PASS가 아니다. HS는7276通과/연습표복사15초초과1·Node미실행을보존했고동일15초공개영역조회분리9.926→4.470초/타입을확인했다. 이후 Native/XML의wx충돌cleanup과POSIX비트보존2결함을10red/2대조·actual20으로재현해28/관련107/type/build·actual20/기존partial16/XSD32·Native/XML내용동일로수정했다. 후속HT전체769파일7289검사·Node5 PASS/외부1skip·2141.31초/84,903입력불변으로현재누적gate를확인했다. 사용자요청으로인계후일단락하며추가slice는시작하지않는다. 2026-11-16 승인: XML/MXL 외부 변경·삭제는 본문revision으로backup전거부, 실패시편집보존·새사본안내. main8/UI2red→관련92/main146/type/build·실제6조건/4copyXSD/6native보관/undo-redo·chmod10재확인. 현재누적전체후속. HU전체772파일7319검사/Node5가현재수정까지통과했다(외부1skip·85445입력불변). 2026-11-16 Native backup wx충돌의남의temp삭제를FS1red/App2로확인해open성공소유권가드만추가했다. 관련164/type/build/newApp2·Native2/renderer-preload131동일. HU는backup수정과후속6검사전이며HV전체가후속이다. 2026-11-21 승인된 단일 PNG 링크·기존 POSIX 권한 보존, 4red→관련64/type/build 및 실제 10경로. HX 빌드의 글자200%/키보드4와 새 빌드의 문서 교체·늦은 PNG 응답4를 검증했다. HY 전체 775파일/7,334검사와 Node5 통과. 뒤이어 늦은 MIDI 성공이 PNG 기술 정보를 제거하는 2경로를 재현했고 PNG 설정의 단일 기술 정보 경로를 보완했다. 신규2·관련34/type/build·실제4 통과. HZ 전체 775파일/7,336검사·Node5 PASS 및 동일 빌드 PDF/XML 문서 교체 12경로의 스냅샷/진단/초점 확인. 동일 PNG 진단의 열림·읽기 포커스를 유지하고 MusicXML 취소 뒤 상태줄의 포커스 가시성을 지켰다. 실제 PNG 중첩 오류 6·취소 복귀 4·문서교체 MIDI 6경로 통과. IA 775파일/7338검사/Node5 통과. 설정이 닫힌 동안 오류 도착 2경로 및 PDF로 상태줄 진단 직접 교체의 포커스 결함을 확인해 수정했다. 최종 관련40·실제22경로가 통과했다. 최종 IB 전체 775파일/7,340검사 및 Node5 통과. 외부 opt-in 1검사 제외·87,672입력 불변. 2026-11-21 같은 PNG 진단 이동에서 본문 선택·방향·읽던 줄을 보존했다. PDF 오류·MIDI 성공 8조건과 MusicXML 취소 4조건 및 선택 후 Space 2폭을 확인했다. 같은 문서 MIDI 역순 8조건은 기존 요청 계약이 통과했다. 실제 OS 대화상자·스크린리더, 선택 없이 스크롤한 읽기 위치와 다중 요소 선택이 남아 있다.
- 남은 범위: 현재필수native경합검증은활성입력조건때문에미완이다. V는자체앱정상시작뒤외부80385전환으로저장메뉴전거부됐다. 이전OS전면상실과renderer수정의인과를단정하지않는다. 현재 제품의 누적 전체는 HP 1timeout으로 미통과이며, 분리 검색 보완 뒤 HQ가 필요하다. 앞선 HO7255/Node5는 후속 dangling 수정 전 결과다. HQ 실패 후 가사/빠르기 통합 조회 보완의 전체 확인은 HR은 시계 차이로 중단돼 다음 누적 전체에서 수행한다. 단독1통과/169필터skip은 전체 PASS가 아니다. HS의연습표복사시간초과는원본보존·조회보완후이며, 새2writer수정/12회귀를포함한누적전체는HT에서통과했다. 물리OS등기존필수검수는여전히남아있다. POSIX비트검증을ACL/owner/group/Windows권한승인으로확대하지않는다. 새XML충돌안내200%/coarse/Help는실제4조건으로확인했고동시외부경합·다중창/링크retarget는별도범위다. 새XML충돌안내200%/coarse/Help는2026-11-16 actual4에서확인했다. Native sync실패단계는추가coverage2/actual2로현행통과했다. Native backup temp충돌cleanup은확인된결함을수정했고동일제품누적전체HV가후속이다. 단일 PNG의 HY 전체는 통과했다. PNG 진단 UI의 HZ 전체와 비대화식 PDF/XML 문서 교체는 통과했다. 실제 OS·동시 다중 창·외부 앱 검수는 남는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.copy-focus-order.test.tsx](../../src/renderer/src/App.copy-focus-order.test.tsx), [src/renderer/src/App.open-save-focus-order.test.tsx](../../src/renderer/src/App.open-save-focus-order.test.tsx), [src/renderer/src/App.recent-removal-order.test.tsx](../../src/renderer/src/App.recent-removal-order.test.tsx), [src/renderer/src/App.recent-xml-pending-surface.test.tsx](../../src/renderer/src/App.recent-xml-pending-surface.test.tsx), [src/renderer/src/App.native-save-conflict.test.tsx](../../src/renderer/src/App.native-save-conflict.test.tsx), [src/renderer/src/App.cancel-save-reader-focus.test.tsx](../../src/renderer/src/App.cancel-save-reader-focus.test.tsx), [src/main/binary-export-files.ts](../../src/main/binary-export-files.ts), [src/main/binary-export-files.test.ts](../../src/main/binary-export-files.test.ts), [src/main/png-files.ts](../../src/main/png-files.ts), [src/main/png-files.test.ts](../../src/main/png-files.test.ts), [src/main/musicxml-files.ts](../../src/main/musicxml-files.ts), [src/main/project-files.ts](../../src/main/project-files.ts), [src/main/musicxml-files.ts](../../src/main/musicxml-files.ts), [src/main/musicxml-backup-name.ts](../../src/main/musicxml-backup-name.ts), [src/main/png-files.ts](../../src/main/png-files.ts), [src/main/png-temp-integrity.test.ts](../../src/main/png-temp-integrity.test.ts), [src/main/png-files.ts](../../src/main/png-files.ts), [src/renderer/src/StudioExportTools.tsx](../../src/renderer/src/StudioExportTools.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/navigating-your-score.md), [참고 2](https://handbook.musescore.org/basics/default-keyboard-shortcuts.md)

수용 기준:

- 같은작업창의이전/최신trigger가연결된채새XML다음이전PDF가같은batch에서완료돼도최신명시요청이focus를소유한다.
- 이전PDF성공/취소/실패,역순batch,최신응답대기,최신control이미focus의대조군과기존수동wheel/새필드/문서교체복귀검사를유지한다.
- score/선택/undo/dirty와copy XML을유지하며별도격리build/화면회귀및필요한전체검증을실행한다. 실제OS/native gate는별도로기록한다.
- 나중에수락한열기는아직문서를바꾸지않았거나취소/실패로끝나도이전저장복귀보다우선한다. 열기확인거절은새유효요청을만들지않는다.
- 이전최근파일삭제의실제목록변경은반영하되나중열기실패의진단과다른missing파일대상·삭제진입점을덮지않는다. 정상단일삭제·실패재시도는유지한다.
- 파일오류의기술정보읽기에서프로젝트/XML저장을취소하면같은진단의새접힌button으로논리초점을복귀하되result/generation/request/수동viewport·새필드/열기·성공/실패를존중한다. 원래busy숨김/취소후접힘과score/dirty/selection/undo·Native보존을유지하며단위/실제각채널검증을구분한다.
- PDF/MIDI사본을같은경로에다시저장하다쓰기/최종교체가실패하면기존파일은완전한바이트로유지하고정상재시도는원래출력바이트/기보를보존한다. 자체임시파일만정리하며Native/dirty/선택/undo·기존symlink목적지/권한을유지한다.
- 선택한기존PNG가쓰기불가면기존바이트/권한/이웃을보존해오류를알리고,소유자가쓰기권한을복원한뒤명시적으로재시도할수있다. 새출력/배치권한정책은유지한다.
- 단일 PNG에서 기존·없는 대상을 가리키는 상대 링크를 유지하고 실제 대상을 갱신한다. 기존 대상의 POSIX 권한·선택된 파일명과 새 파일 0600/umask를 유지하며 chmod 실패 시 대상·링크·이웃을 보존한다.
- 같은 문서에 늦은 MIDI 성공이 도착해도 현재 PNG 실패 원인을 열 수 있다. 같은 진단을 중복하지 않고 PNG 재시도와 문서 교체 때 이전 진단을 정리한다.
- 다른 출력 오류나 취소가 PNG 상세의 위치를 바꿔도 동일 진단의 열림과 현재 포커스를 보존한다. 문서 교체 후 늦은 MIDI 결과와 파일은 각각 해당 요청에 귀속된다.

검증:

- 3red/3controls → 신규경합12/관련4files35 및기존file-focus17/153의도적필터제외PASS
- npm run typecheck PASS
- 격리production/profile/fixed 및전체후속은별도. 실제native입력환경은조율pending.
- 격리current-build-e/실제classic-15 profile/fixed PASS. PDF6선택PASS/222의도적필터제외. baseline변경없음. 원App은DH동결SHA일치. DI전체와native는별도.
- DI 전체577files5325+Node-native5 PASS/외부opt-in1파일1검사skip. 동결16809개 실행 중·즉시 종료 후 불변. 실제native는별도.
- 후속G6red/3대조→J신규21/관련6files75/typecheck PASS. F관측오류1개와원래로그보존. 격리build/전체/native는별도.
- 수락된열기후속: J관련6files75(신규21)/typeJ, Klegacy18선택/152의도적필터제외, current-build-k/실제classic-15/fixed PASS. baseline변경없음. DJ전체/native는별도.
- DJ578files5346+Node5 PASS/외부opt-in1skip,16972개실행중·즉시종료후·nativeV후불변. 실제native gate는별도미완.
- 최근삭제후속: 원래A Item trailing관측오류보존→B2red/4대조→신규XML/native10/관련3files43·기존최근9선택/219의도적필터제외·typeD PASS. 현재production/전체/native는별도.
- 최근삭제제품수정: 격리buildE/typeD/실제classic-15 profileE/fixedE·문서4gates/diff검사 PASS, 이전CSS/폰트/worker해시동일·baseline불변. 새전체DL은후속, 실제native별도.
- integrationDL 전체583files5408tests+외부opt-in1file/1test skip+Node도구5 PASS(1104.25초). 17402입력은실행중/종료직후독립불변. 실제OS/native gate는별도미완.
- test-only RecentFileStore공개실패회복6·관련main/renderer3files18/typeC PASS. 실제임시FS+명시주입한ENOSPC/EACCES와실제malformed/oversized보존/수리후재시도·queue회복·cleanup을대조했다. 제품변경없음. DL전체는이번6추가전결과이며자연OS실패/사용자index승인아님.
- integrationDM 전체586files5438tests PASS/외부opt-in1file·1test skip/Node도구5 PASS(1102.04초). 고정17769입력 실행중·종료후독립불변. 실제OS/native/PDF는별도pending.
- 2026-11-08 actual disk-conflict primary lacked Korean reason/SaveAs path. Red2/controls4 -> new6, related4files18 + lifecycle13/type; BJbuild/actual960-1400 main Nativewrites6/MIDI2 exactly8preBI files, Korean reason/recovery/raw technical and Help paragraph/Escape passed. Post-write recent/cleanup never claim unwritten; engine/schema/bridge unchanged. Profileoverlay0/fixed pass/baseline unchanged. New EV full required; EU6335 is before this change; physicalOS/textonly200/coarse48 not approved.
- integrationEV latest full667files6341tests + external1file/1test skip + Node-native5 PASS/1132.33s; original35531 terminal0 then immediate prewritten independent32006 terminal0 and receipt READ before edits/build. Frozen37632inputs unchanged at2midrun/originalexit/independent. Includes known Native disk-conflict Korean safe recovery/new6regressions/manual09. Baselines unchanged; physicalOS/native focus/IME/SR/external stillpending.
- 2026-11-08 sameBJ/EV status16conditions960/1400×light/dark×fine/coarse×scopedstatusfont100/200: computedratio2/mediaquery, Korean recovery/raw diagnostic first-last Range/hit, focus margins and coarse48px passed. A fallbackwheel0 explicitly not actualwheel evidence; B76997 terminal0 adds8overflow/16trustedwheel+scrollend/rootunchanged/finalglyph. Native6/MIDI2 same8priorfiles; product1264SHAunchanged/full6341Node5reused. QA-only, not wholeApp200/physicaltouch/OSclipboard/focus/IME/SR/PDF approval.
- 2026-11-08 BMprobe2206exit0 actual960/1400 Native SaveAs cancel lost focused diagnostic to body; nextUp C4-to-Csharp4/history1to2 proved in Native+undo. RedB2fail/10controls→new12/related6files81 +legacy26/144title-filter skips/type/assets120/BNbuild/profileoverlay0/fixed pass. AppB58050exit0 two widths logical collapsed focus+Up unchanged,Native8/MIDI2/exact1undo-redo/originalIDs/Help09; AppA strictFileviewport failure retained/unresolved cause, B explicit menu focus not weakening guard. XML actual first-save cancellation pending; EX669/6365Node5 before guard/new12, later full required. No engine/schema/bridge/commonAPI/baseline or physicalOS approval.
- SameBN actual XML first-save B36607exit0 at960/1400: public new wizard4bars+N5C/Escape creates C4quarter/history1; actual XML save dialog title/filter observed, cancel absent file/same collapsed diagnostic focus/readUp unchanged; retry XML and MIDI byte-identical to prior copy, exact current write clean; Native6/MIDI4/8uniqueXML fullpinnedXSD, exact1undo-redo/originalRestID. A78562 native-dialog selector failure retained; current-source QA re-export bundle only, no product change. PhysicalOS/foreground/IME/SR/PDF/coldreopen not approved; EY full pending.
- integrationEY670files6377tests +external1file/1test skip +Node-native5 PASS/1157.88s. Original96972 terminal0 then immediate prewritten independent84886 terminal0/receipt READ before mutation/build. 38699frozen inputs unchanged midrun/originalexit/independent. Includes cancellation logical diagnostic focus guard/12tests/manual09, actual Native/XML outcomes separate. Baselines unchanged; OSdialog/foreground/clipboard/physicalIME/SR/listening/external/PDF/coldreopen not approved.
- SameBN/EY actual late-cancel negative ownership A64737exit0 four unique960/1400×trusted-renderer-wheel/composing-title flows: root535-to415 stays415 after cancellation, currentcollapsed diagnostic notfocused, new input draft/focus/history1 survives; compositionEnd/Escape draft-only;Native16/MIDI4/exact1undo-redo/originalIDs. B94205 repeats2field for actual draft captures, C34848 repeats2wheel with forwarding native scrollIntoView/scrollBy observation0; not8uniquecases, matching8outputfiles each byte-identical toA. Current1480source/manual/common/root unchanged fromEY6377/Node5; no product/baseline/Space/physicalOS/IME approval.
- PDF 완료 viewport: C actual enabled failure + unit6red/18controls → focused39/type/retry2 PASS. E6flows18output files incl PDF6/Native6; F/I same4conditions12outputs each; actual CSS transition token equality and pending capture reviewed. Current1561 hashes unchanged; GV precedes this product fix, GW pending. OS/native/physical claims excluded.
- GW latest753files7108tests + Node5 PASS/외부opt-in1file1testskip,1260.31s. Frozen76123 unchanged original terminal73502 and immediate independent54868 exit0; receipt body read before edits. Current PDF busy/6additional cases included; GV precedes them.
- PDF AX M: same normal960/1400 conditions, public role/button name/ignored plus Chromium pending disabled=true,busy=1→completion focused/unlocked. ActualPDF2/Native2reopen; current1561 unchanged/GW same product. Browser AX only; native OS/SR approval excluded, no new product change.
- 2026-11-11 MXL response-to-page-selector coverage: actual main read/decode completes before gated IPC delivery, preserving original result/error. B original85905 exit0:960dark/1400light×paper/orientation×success/root-decodefailure=8conditions,Native28 exactscore/layout/settings/view/undo/redo. Success drops old candidate;failure retains same trigger/candidate/browser focus and commits1 with renderer Tab withoutQA refocus. A earlier weakerfocus run retained, not summed.1570inputs unchanged;core1567 sameGZ757/7146+Node5/external1skip. document.hasFocus true is not native OS activation; original physical/native gate remains pending.
- 2026-11-11 PNG actualA12+실제EISDIR B6:960dark/1400light×정상/수동wheel/새필드×성공/취소/오류18조건. 원래62886/26100exit0,정상trigger복귀·새의도후oldfocus/reveal0·완료전후root동일. 실제오류후재시도PNG6/기존성공6바이트동일·CRC/pHYs300dpi,Native18score일치/대표화면4+PNG1검토. Native재열기/undo는이번미실행. HF동일1574제품·baseline불변/QA-only,원래OSnative필수gate미완.
- 2026-11-11 PNG 실제 EISDIR 안내를 저장 위치/출력 설정 확인으로 좁게 수정했다. 기존 오류1red/취소대조→관련38/type/buildD·실제D6조건/PNG6이전바이트동일·Native6decoded동일·원래오류접힘보존 PASS. HF전체는문구변경전이며새200%/750px확인후속이다.
- 2026-11-11 동일D의E:960dark/1400light×fine/coarse750px·글자200%4조건에서새안내/원래기술문구14→28px·첫끝Range/실제footerwheel·6RAF+220ms동일PNGfocus/hit·32/48px·재시도PNG4이전바이트동일/Native4보존 PASS. 원래23191exit0,새제품수정/기준이미지없음·HF는앞선문구수정전.
- 2026-11-11 다중PNG실패정리: 새폴더내다른파일·늦은write오류/실제다음page EEXIST2회귀를추가했다. 자기부분파일만정리/다른파일·이전배치보존/다음빈폴더재시도바이트·원래오류확인. 제품수정없음,관련4파일20/type PASS(원래13290/84619exit0),1574입력중main/png-files.test만D와다름. 실제임시FS범위이며OSpicker/전체suite승인아님.
- HG 전체763파일7205검사·Node5 PASS/외부1skip.1264.23초,고정80973실행중/즉시독립변경0. 원래43534exit0→독립55286exit0→receipt본문확인후편집재개. PNG문구/기술정보회귀와새batch2회귀포함이며원래OS/native필수gate는미완이다.
- 2026-11-11 실제main ENOSPC부분쓰기주입4조건기존파일손상→private원자교체. unit7red/2대조→신규13/관련30/type/buildC·App21·actualC4기존파일보존/재시도/Native4·MIDI2·PDF2래스터동일. HG7205는수정전,새누적후속. 자연디스크부족/OSdialog승인아님.
- 2026-11-11 PNG읽기전용:실제FS1red/5대조·실제960/1400에서444→600/내용덮어쓰기2조건재현→기존대상W_OK가드. 관련4파일25/type/build·actualB2보존/오류/재시도 PASS. PNG2/Native2성공바이트동일·renderer/preload131동일,Nativedecode만확인. HH/HI는1800초exit124/최종요약없음·Node미실행이며현재전체PASS아님.
- 2026-11-11 HL 정식npm run test:all:764파일7219검사·Node5 PASS/외부1skip,2125.52초. 원래83197→즉시독립73390 종료0→receipt본문READ,81872입력변경0·시계차이0.011275초. PNG읽기전용/PDF·MIDI원자쓰기와rolequery포함. 과거HH–HK미완/실패와OSnative미검증유지.
- 2026-11-11 문서읽기전용:실제FS5red/9대조→관련main6파일42/type/buildA PASS. actualredB10조건원본교체→greenA10조건보존/오류/권한복원retry/undo/실제재열기,XML8XSD·Native2. 성공Native2/plainXML4/압축해제XML4동일·renderer/preload131동일·제품소스1452불변. redA의undefined비교adapter실패보존/기존Native전체직렬화비교로교정. HL7219는추가수정전이며물리/OS/Windows검수미완.
- 2026-11-11 긴XML이름:단위ASCII8red/한글8+기존8대조,actualred960/1400×16조합32시도중ASCII16ENAMETOOLONG/한글16정상. 짧은임시이름/긴내부백업이름수정뒤관련8files65/type/build·actualgreen32저장/백업·16재열기/32XML XSD PASS. 기존한글16XML내용/renderer-preload131동일·1453src불변.255바이트는실제FS단위/production은제안244~249바이트. HL7219는이전수정전/새전체후속.
- 2026-11-11 HN최종:정식test:all766파일7247검사·Node5PASS/외부1skip,2191.99초. 원래35229→즉시독립62666 종료0→receipt본문READ,82654입력불변·시계차이0.006367초·기대수집범위일치. 읽기전용/긴XML이름수정과fixture검색범위포함. HM원래15초timeout기록/OSnative미검증유지. 사용자요청으로이후새slice없이인계후pause.
- 2026-11-12 HO정식전체767파일7255검사/외부1skip·Node5,원래56992/독립2762종료0·receipt본문확인/83515입력불변. 승인된XML심볼릭기존대상저장8회귀와설명서/실제App검증포함;물리OS·dangling선택경로는별도미검증.
- 2026-11-16 HT1739unchanged; newchmod10+existing28=38/type PASS, own hidden actual960/1400 Native/XML/MXL5x2=10 EPERM/retry/reopen,16XSDpath checks8outputs,1874inputs unchanged. Product unchanged; new whole pending. first10failures were hook /var realpath harness issue, not product red.
- 2026-11-16 approved external XML policy: 8main/2UI red +10controls;9files92,allmain18files146,type/build,own hidden960/1400 Native/XML/MXL6cases,copycancel/retry4XSD/native6,exactundo-redo;1876inputs stable. chmod10 rereun same acceptance. Whole pending; physical OS not approved.
- 2026-11-16 HU canonical full772files7319tests/external1skip/Node5 PASS;2149.24s;original11180->independent99168 exit0->receipt read;85445inputs unchanged,clock -3.874547s within5s,owned processes ended. Includes newchmod10/mainXML14/UI6. Physical/atomic-race/densityHelp200 QA separate.
- 2026-11-16 sameHU hidden App 960dark XML/1400light MXL xfine/coarse4; actual14->28px/currenterror first-last Range/internalwheel/Page/Tabfocus/32-48target,Help100/200/Escape;copycancel/retry4XSD/native4/undo-redo/1876unchanged. QA-only,physicalOS not approved.
- 2026-11-16 Native sync ENOSPC stage: newexisting/absent2+related5files32/type,ownhidden960/1400actual2/retry/reopen/1877unchanged. Product unchanged;HU7319 before new2.
- 2026-11-16 Native backup temp: actualFS1red/discovery2controls +oldApp960/1400 observed deletion, minimalcreatedguard;22files164/type/build1746stable/newApp2/1878stable/Native2bytes andrenderer130preload1equal. Owned write/sync/rename3controls afterfix;not3reds. HU beforefix;HVnext.
- HV 정식test:all764파일7311검사PASS/10파일14검사15000ms초과; Node-native &&후속미실행;85738입력불변/원래→즉시독립→receipt본문 순서 유지. 이전 HU를 현재 전체PASS로 사용하지 않음.
- HV14개 CPU분리 A/B PASS(33.008/20.920초), 공개영역 양성조회103곳/10테스트파일의 원문 역변환 byte-exact; 모든 fixture/assertion/명령/15000ms/2workers 유지. 영향10파일 전체432검사PASS/skip0,typecheckPASS. 제품/공통/기보 변경없음. 최신 전체는 아직 HV실패, HW 필요.
- HW 정식test:all774파일7325검사·&&후속Node5 PASS/외부opt-in1파일1검사skip,2019.66초. 원래70341→즉시독립11904 종료0→receipt본문 확인,85856입력불변/기대수집일치·clock -0.002477초/자체종료. HV실패보존·baseline/커밋/푸시/릴리즈없음. 승인XML충돌·Native sync/backup회귀와백업소유권수정·조회보완을포함.
- PNG단일writer공개FS2red/12대조·실제old960/1400×기존/없는대상4조건의unowned temp삭제를확인했다. createdflag최소수정후관련8파일67/main+PNG App22파일166/type/격리build/new실제4/retry/dirty·선택·한undo/redo/Native보존 PASS. PNG4/Native4/renderer130/preload1 byte-exact,150dpi/전체CRC·대표3이미지검토. HW전체7325는수정전이며HX775파일7330검사가후속.
- HX 정식test:all775파일7330검사·&&후속Node5 PASS/외부opt-in1파일1검사skip,1965.83초.원래85682→즉시독립58830 종료0→receipt본문확인/86156입력불변·기대수집일치·clock+0.003357초·자체종료. PNG temp최소수정/신규5 포함. 사용자중지요청으로새slice미착수·인계/gate후paused호출예정·커밋/푸시/릴리즈/baseline없음.
- 새 회귀4 red → 관련11파일64/type/build, 실제 960/1400px 10 저장 경로 및 글자200%·키보드·문서 교체 검증4+4
- PNG/MIDI 동일 문서 오류 2red → 관련 6파일 34, 타입·빌드, 실제 동시/순차 4경로 및 글자200% 키보드 읽기·재시도.
- HZ 전체 7,336·Node5, PDF/MXL 문서 교체 뒤 성공·취소·오류 12경로·PDF8/고정 XSD8·Native12 확인.
- PNG 신규 2red·관련38/type/build·실제 오류6/취소복귀4·MIDI 문서교체6 및 파일 이벤트·권한 비교.
- IA 전체 7338/Node5, 뒤이어 PNG/PDF 공유 슬롯 교체 4경로와 기존 18경로를 동일 최종 빌드에서 검증.
- 최종 IB npm run test:all 7,340 + Node5, 독립 receipt 본문과 87,672개 해시 확인.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-037-002 · 선택한 진단 글자의 클립보드와 악보 명령 소유권

- 현재: 표시된 경고/기술 정보/파일 결과 글자 선택에서 Ctrl/Cmd+C/X/V가 악보를 복사·삭제·붙여넣기 하던14red/5controls를 재현했다. 기존 키 라우팅에 실제 DOM Selection 소유권만 추가했다. App23/helper21, 관련8files89와 navigation2/typeD, 숨김 Chromium36조건을 통과했다. 실제OSclipboard/native 입력 승인은 미완이다. 2026-11-08 실제 오류 글자 선택+Delete가 선택 음표를 쉼표로 바꾸는 결함을 Native로 재현했다. 기존 읽기 소유권과 삭제 keymap 판정에 연결해 기본/사용자 지정 삭제를 차단하고 명시적 악보 focus·선택 없음·Save/history는 유지했다. 신규12/관련70·BK actual48키와 Native/MIDI/Help/profile/fixed 통과, EW 전체668파일6353검사·Node5가 통과했다. 실제 OS 검수는 별도 미완이다. 2026-11-08 같은BN/EY source1480불변에서선택한파일오류요약/body의plainSpace가실제4박대→6박대로재생됨을2폭에서관측했다. technical/report wrapper·수식키대조와Native8/MIDI2/정확undo-redo는보존했다. 전역Space와선택글자읽기우선순위는proposal답변대기이며제품패치는미적용이다. 사용자가 actual call_a0cade456fcf49988325c984003b6b7e로 선택한 안내 글자의 읽기 우선을 승인했다. 기존 DOM Selection 읽기 소유권 guard에 plainSpace를 추가했다. 새 App16회귀의6red/10controls 뒤 관련6파일86/type PASS이며 실제 현재 production/누적 gate는 아직 후속이다. 승인 후Space6red/10대조→신규17(실제shortcut-source포함)과관련회귀/type 통과. BP actualH2폭의정지Space/명시악보/Native8MIDI2/Help4 PASS 뒤, BQ actualN2폭에서trustedCDPSpace/body기본미취소·playing/paused읽기·선택해제후재개/Native10MIDI4/Help4도통과했다. G/I/J/K의서로다른가시성/검증전제/예약cursor실패는보존하고후자의명시transportfocus결함은034004로분리했다. 누적EZ전체는아직미실행이다. 최종214공개행을포함한BR actualO55499exit0에서같은2폭/Native10MIDI4/Help4를재확인했다(N과고유경로중복합산안함). FA673파일6413검사/Node5·40606입력불변으로현재Space및후속보강의누적회귀도통과했다.
- 남은 범위: 승인된Space읽기우선과후속누적FA는통과했다. 실제OSclipboard·물리키보드/IME/SR/전면초점검수는별도미완이며과거실패를승인으로바꾸지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-037-001
- 소스: [src/renderer/src/editor/report-text-selection.ts](../../src/renderer/src/editor/report-text-selection.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.report-text-clipboard.test.tsx](../../src/renderer/src/App.report-text-clipboard.test.tsx), [src/renderer/src/App.report-text-delete.test.tsx](../../src/renderer/src/App.report-text-delete.test.tsx), [src/renderer/src/App.report-text-space.test.tsx](../../src/renderer/src/App.report-text-space.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/accessibility.md)

수용 기준:

- 선택한 보이는 진단 글자의 복사/잘라내기/붙여넣기는 악보·내부클립보드·dirty·선택·undo를 바꾸지 않고 브라우저 기본동작을 취소하지 않는다.
- 닫힘/끊긴선택/외부경계/명시적악보focus는 기존 악보 명령을 유지한다. 저장·사용자단축키·IME 계약은 유지한다.
- 단위 키 라우팅·숨김 Chromium helper 검증과 실제 native/OSclipboard 검증을 분리하고 미실행을 기록한다.
- 보이는 진단 글자를 선택한 읽기/body context의Delete/Backspace·사용자 지정 삭제는 뒤 악보를 바꾸지 않는다. explicit score focus와 접힌 선택은 기존 삭제를 유지하며 문서 Save/history·원래 진단을 보존한다. 실제 Native 사전 재현과 수정 후 소스/출력 검증을 구분한다.

검증:

- App23/helper21, 관련8files89 + navigation2 PASS
- npm run typecheck PASS (앞선 옵션 TS2769 실패 보존)
- 숨김 실제 Chromium960/1400×light/dark×9조건36 PASS; 화면2개 직접 검토; OS clipboard 전송·App native 입력 없음
- 격리 current-buildH/typeH/profileH(classic-15)/fixedH PASS. integrationDK580files5390+외부optin1skip+Node도구5 PASS,17167입력이 실행중·종료직후독립검사에서불변. baseline 변경없음. 실제OSclipboard/native검수는별도미완.
- 같은파일/경고없는XML/native교체와취소/실패/거부의보고서선택수명6사례 및관련4files52/typeD PASS. 최초4실패는focus후선택이비는테스트전제로분리; 기대값유지/owner=true추가. 제품변경없음, 새전체는후속묶음에서실행.
- integrationDL 전체583files5408tests+외부opt-in1file/1test skip+Node도구5 PASS(1104.25초). 17402입력은실행중/종료직후독립불변. 실제OS/native gate는별도미완.
- 2026-11-08 sameBJ/EV actual main/fullrenderer Native rejection: report path/Korean primary/operation diagnostic selected text Ctrl/Meta C-X-V36 conditions960/1400 preserve default/selection/dirty/history/status; real CtrlS while reading, explicit score focus with controlled lingering Range, clipboard D copied before C selection survives diagnostic keys and pastes D after clear; two undo restores original score/IDs/selection. C53051exit0, actual Nativewrites10/MIDI2; A bad menu-label failure retained, B/C not72independent. Source1264unchanged/full6341Node5reused. DOM/FS/Range only, no OSclipboard/nativeforeground/physical input/coldreopen/PDF approval.
- 2026-11-08 actualBJ Native probe selected Korean error text+bodyDelete changed C4 to rest/history1→2; Native proof and exact undo restored. Existing helper/matchesDelete guard fix: redB7fail/5controls→new12+related5files70/type. BKbuild/assets120/appD41419exit0 actual960/1400 48reader keys(CXV36+DeleteBackspace12)/Nativewrites10/MIDI2/twoUndo/originalID + Help09/Escape/profileoverlay0/fixed passed, baselines unchanged. PriorEV6341/Node5 is before this guard/tests; newEWfull required. No engine/schema/bridge/commonAPI or physicalOSclipboard/focus/IME/SR/PDF approval.
- integrationEW668files6353tests +external1file/1test skip +Node-native5 PASS/1142.48s. Original91646 terminal0 then immediate prewritten independent95650 terminal0/receipt READ before any edits/build. Frozen38048inputs unchanged at2midrun/originalexit/independent. Includes current selected-text delete guard/new12tests/manual09; actualBK48keys/Native10/MIDI2/Help/profile/fixed are separate evidence. PhysicalOS/clipboard/foreground/IME/SR/external remain pending.
- SameBN/EY source1480 unchanged actualSpace audit B9463exit0 (audit complete not productfix PASS):960/1400 primary/body selectedKoreanText plainSpace prevented and transport4.x-to6.x; report/operationtechnical Space noPlay,8modifier controls noPlay, explicitScore+lingeringRange normal0beat afterStop;Native8/MIDI2/exactUndoRedo/IDs preserved; muted true/no listening or acoustic energy approval. A93335 first-note-selection control assumption failure retained and corrected from actualStop/activeEvent contract, assertions not removed. No productpatch/commonAPI/baseline change; explicit priority proposal pending.
- Approved plainSpace priority: App16 regression6red/10controls→related6files86PASS/type. Stopped/paused/playing, primary/report bodyRange, collapsed/explicitscore/hidden, modifier/IME and Save/undo/redo preserved. Actual current build/Electron/full pending.
- 2026-11-10 GM/GU동일제품 상태줄 B8조건(1000높이)/D4 F6보강/F4조건(750높이)에서 200%·960dark/1400light·에뮬레이션 포인터·실제내부wheel/Page키·첫/끝글자·버튼hit·Native 보존 확인. D원래terminal미회수/완료결과회수, F원래3980 exit0. C이벤트취소기록시점실패보존. footer예약RAF 이후 nonzero/zero wheel2개 회귀추가, 관련4파일37/type PASS. 제품변경없고 OS/물리/SR/새PDF 승인아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-011 · 개별 음표·쉼표의 숨김 설정 가져오기 손실 안내

- 현재: note print-object=no의무경고손실을core8/App2 red후기존진단·한국어요약/기술정보로안내한다. 같은손실30개의기본보고서3460.80px→115.80px, 원문30/경로30유지. 모델/native/MIDI/기보유지. 신규24·관련30/type/확대1062/actualXML16XSD/숨김current보고서24조건PASS. 2026-11-08 기존visible yes/omitted 네owner8대조군의source/control/copy24건fullXSD·native artifact/MIDI동일성증거를추가했다. 이미있는경고없음회귀를새결함/테스트로중복계산하지않는다. 기존016 AppB의note-hidden 일반주음2폭에서는음표1+가사2경고와Native/XML/MIDI/PDF를추가확인했다. 다른chord/grace/rest owner나원래숨김복원/물리/외부승인으로확대하지않는다. 2026-11-09 동일FC/BW actualC chord/grace/rest와flags·표시대조6×2폭12흐름/Native24·재열기12/XML24fullXSD/MIDI12/PDF12각1page·3고유raster검토를 추가했다. source/control/copy18XSD·source1463불변이다. 기본/실제출력작업대 각각8읽기조건의 마지막glyph/hit를 보강해 출력작업대960은trustedwheel1씩/1400은0으로읽힘을 확인했다. 원래비표시복원이나물리검수승인아니다.
- 남은 범위: 실제 App의 비대화식 공개 메뉴와 임시 main 파일 IO·Native/재열기/XML/MIDI/PDF는 chord/grace/rest까지 보강했다. 원래 숨김 모델/편집·비표시 복원, 물리 OS dialog/nativeWindowfocus/IME/SR/청음/외부 앱·wholeApp200%는 미완이다. 기존 visible yes/omitted·print-spacing 비활성 계약과 원문 관련값은 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- main/chord/grace/rest의명시no와공백token을누락없이안내하고원본위치·관련값을보존한다.
- 기본표시/yes/spacing-only에는이숨김손실을추가하지않고notehead손실과공존한다.
- 같은손실의반복만요약해전체원문/경로를보존하며단일/다른종류혼합·기존선택/undo/저장/재생/출력모델은유지한다.
- 합성App·숨김실제component와실제native/OS/PDF를구분해미실행을기록한다.

검증:

- redA10fail/11controls→단일21PASS;밀도F1fail/23controls→관련4files30/typeH PASS.
- MusicXML+scorecore102files1062tests/외부optin1skip PASS; 실제source/copy16건pinnedfullXSD PASS.
- actualcurrentK24조건·960/1400/light/dark/fine/coarse/text200기본보고서containment/32·48target/숨김진단/30원문·경로보존PASS, 대표2이미지직접검토.
- 현재격리production/전체는후속gate이며실제native/PDF/OS입력은별도pending.
- 격리buildL/typeL/actualclassic-15 profileL/fixedL·관련App5files33·문서4gates/diff PASS. CSS/font/exportfont/worker바이트동일. 새전체DM/native는별도.
- integrationDM 전체586files5438tests PASS/외부opt-in1file·1test skip/Node도구5 PASS(1102.04초). 고정17769입력 실행중·종료후독립불변. 실제OS/native/PDF는별도pending.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-016 · 개별 가사와 음표의 가사 숨김 설정 가져오기 손실 안내

- 현재: 가사표시의무경고손실 core5/App3 red→신규28/관련4files52 PASS. lyric/no·note print-lyric/no·print-object/no 상속과 yes/no우선순위를 구분한다. 한국어요약/원문/실제source속성과반복30개요약을연결했다. source/copy26XSD/실제report24조건PASS. 모델/native/MIDI유지. 2026-11-08 ET동일BG제품의실제App10흐름에서Native10재열기/XML20XSD/MIDI10/PDF10을확인했다. 일반/yes우선0·mixed1·개별숨김2·note상속3경고·실제disclosure/기술주소·원래파일보관안내를유지했다. 기존1214제품/공통/configSHA동일로새제품수정/새기능완료는아니다.
- 남은 범위: 실제App DOM공개메뉴와임시main파일bridge/Native재열기/두XML모드/MIDI/PDF는확인했다. 원래가사숨김모델·비표시복원/편집·nativeWindowfocus/OSdialog/물리IME/SR/외부앱은미검수/별도범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- 유효한가사별표시와상위숨김상속을구분하고기본/명시적yes/가사없음에거짓경고를만들지않는다.
- 한국어요약과원본보관·절별/재출력비교를안내하고원본part/마디/note/절/실제속성경로를보존한다.
- 같은가사손실반복만요약하고단일/음표숨김혼합·모든원문·native/MIDI와기존선택/undo/저장을유지한다.
- 합성App·실제숨김pure보고서와native/OS/PDF승인을구분해기록한다.

검증:

- redA8fail/17controls;B안전한치환assert중단후같은red보존→C25PASS→E신규28/관련4files52PASS. typeD PASS(후속3coverage전).
- 실제source/copy26건pinnedofflinefullXSD PASS. 현재pure보고서G24조건/반복기본115.80px/원문30·경로30/32·48target/containment통과,대표2이미지직접검토.
- production/확대회귀/전체는후속gate, 실제native/PDF/OS별도pending.
- 최신typeH/XMLcore103files1087tests/외부optin1skip/App4files36/buildJ/actualclassic-15 profileK/fixedK PASS. 첫profileJ인자거부로그보존/올바른기존CLI K통과. baseline불변. 전체DN/native별도.
- integrationDN: Vitest588files5466tests PASS/외부opt-in1file·1test skip/Node도구5 PASS(1029.51초). 동결18049입력은실행중/종료후독립불변. 실제OS/native/PDF별도pending.
- ET동일BG AppB960/1400×5종10흐름,Native10/10재열기/XML20fullXSD/MIDI10/PDF10·15source/control/copyXSD·고유1raster/대표2화면검토·제품/공통1214SHA불변.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-017 · 한 가사 음절의 여러 text 조각과 원래 공백 보존

- 현재: 유효source5red/15controls→신규core20/관련45·확대XMLcore1107/1external skip/typeC PASS. 기존순서파서/WeakMap으로일반음절원래조각을연결하고기존elision은유지한다. App2신규/관련10, actualnotation20조건·XML30XSD·purePDF4/2rasterpairs PASS. MIDI/native/이웃절보존. 2026-11-08 실제 App/PDF 감사에서 저장된 두 공백이 한 공백과 같은 SVG advance/PDF raster로 표시되는 누락을 재현했다. 실제Electron redC와 측정hook1red/5대조 뒤 가사CSS의공백보존과숨은폭측정의동일white-space전달을구현했다. 모델/Native/글꼴/glyph는유지하며focused/type·실제출력후속이다. 추가focused11files119/type·BG production F/J8흐름의Native8/8재열기/XML16fullXSD/MIDI8/PDF8·명령1/undo/redo와HelpN/profile/fixed까지확인했다. 한공백PDF는이전동일,두공백은실제SVG4글자/25.0863·PDF상이이며LF/tab/CRLF는기존같다. 기존모델/기보font/baseline을유지하고다음ET전체를실행한다. 누적ET664파일6321검사/Node5 PASS·외부1skip/1124.67초. 원래68614→즉시독립80665 receipt읽기전수정/build없이36181SHA동일로현재변경묶음을확인했다.
- 남은 범위: 일반 가사 fragment/내부공백의 모델·시각적 표시·PDF 문자 보존은 확인했다. Poppler26.07 raw/layout의 한글 single/double 공백4사례와 PDFKit1451.5.3의 double 공백 추출/원문검색2사례 불일치가 남는다. PDFKit single/일반한국어4사례는 정확했다. 실제 OS viewer 검색/복사·다른 소비자/SR·원래 서식/elision 복원·멀티라인 편집·물리 IME/native OS 검수는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/lyric-components.test.ts](../../src/musicxml/lyric-components.test.ts), [src/renderer/src/App.lyric-components.test.tsx](../../src/renderer/src/App.lyric-components.test.tsx), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd), [src/renderer/src/notation/use-lyric-layout.ts](../../src/renderer/src/notation/use-lyric-layout.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- elision없는같은음절에공백을만들지않고원래내부공백·이웃절/파트를유지한다.
- 단일/빈조각·기본elision·엔티티·서식조각은문자열보존과미지원서식복원을구분한다.
- 기존모델/명령/선택/undo/native와재생을보존하며scalar대조군·XSD·실제폰트의기보/PDF를검증한다.
- 실제App/native/PDF저장메뉴와합성App·숨김기보컴포넌트의범위를분리해기록한다.

검증:

- core redA5fail15controls→B관련2files45/typeC/XMLcore104files1107/1external optin skip PASS.
- App D/E2fail8controls는기본null취소를성공가정한테스트설정오류. 성공응답명시후동일단언으로F3files10/신규2 PASS. 원래로그유지.
- 현재H20actualnotation조건에서source/scalar실제잉크일치, source/scalar/copy30XSD PASS. purePDF4/2고유한페이지쌍이미지일치/직접검토.
- 보관한수정전parser의오늘QA-only J재현은사 랑!=사랑으로실제renderer red. 현재제품파일덮어쓰기없음.
- 현재production/최신type/전체/native는후속gate. DN전체는이번수정전결과.
- 최신typeL/격리buildL/actualclassic-15 profileM/fixedM PASS. 기존CSS/font/exportfont/worker해시동일, baseline불변. 새전체DO와실제native/정규PDFgate는후속.
- integrationDO590files5488tests PASS/외부optin1file·1test skip/Node도구5 PASS(1076.87초). 동결18351입력 실행중/종료후독립불변. 실제native/OS/정규PDF메뉴별도pending.
- actualB/C SVG3=3·동일PDF red + D측정1red/5대조→focused11files119/type·BG F와J8흐름/Native8/8재열기/XML16fullXSD/MIDI8/PDF8·HelpN/profile/fixed PASS. ES6307은이전이며ET누적후속.
- 현재누적ET:664/6321·Node5 PASS/외부1skip, 원래68614 terminal0→독립80665 receipt읽음,36181고정SHA동일.
- 2026-11-11 current L/HF동일1574: single/double/korean×960/1400 실제6흐름·PDF6/Native6재열기·source3XSD PASS. Poppler 정확공백4불일치를보존했다. PDF Tj/ToUnicode는6원문정확보존,단어간격0.953458/1.906921pt(약2배),대표PDF2시각검토. 추출기의공백재구성차이이며제품수정/검색호환성전체승인/새전체검사아님. 원래74396exit0.
- 2026-11-11 기존PDF6 SHA일치/PDFKit1451.5.3 읽기전용 API: single/한국어4 정확추출·검색, double2는한공백재구성/원문검색0. 없는문자열6대조0·원래30019exit0,HG제품1574/PDF6변경0. 새PDF/앱GUI/물리검색승인이아니며불일치유지.
- 2026-11-11 QA-only generateTaggedPDF 비교: 현재D default6/tagged6 실제PDF·Native재열기,Tagged no/yes확인. 두모드각각single/한국어4정확·double2원문검색실패로옵션단독해결가설기각. raster12/Native12이전해시동일·HG1574불변,원래63014/34471/79324exit0. 제품적용/접근성규격승인없음.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-018 · 가사 글자의 굵게·기울임 지정 가져오기 손실 안내

- 현재: core7/App3 red·12대조→신규22/관련44/최신App37/typeC/확대XMLcore1126·외부1skip PASS. 원본절/text/속성별italic/bold진단과한국어확인행동을연결한다. 같은서식반복30개만요약하고모든원문/위치보존. 실제report24조건/22XML XSD통과. 모델/문자/native/MIDI유지. 2026-11-08 기존017공백production J8흐름중 이항목의2폭공개메뉴/진단/기술주소·Native재열기/XML/MIDI/PDF도별도확인했다. 8흐름을항목별새성과로중복합산하지않으며원래서식/기호복원·nativeOS/물리승인은아니다.
- 남은 범위: 실제App의DOM공개경로·임시main파일bridge·Native재열기·XML/MIDI/실제PDF검증을확인했다. nativeWindowfocus/OSdialog/물리IME/SR·외부앱은미검수이며원래서식/기호복원·rich text모델은지원하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/formatting-text.md), [참고 2](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- 유효italic/bold의원본속성위치와값을안내하고명시normal/생략/빈text에거짓경고를추가하지않는다.
- 한국어로원본보관·가사내용/서식·재출력비교를안내하고전체원문과기술정보를유지한다.
- 같은강조손실반복만요약하며단일/다른손실혼합·기존가사조각문자/native/MIDI/선택/undo/저장을유지한다.
- 숨김실제pure보고서/합성App검사와실제native/OS/PDF승인을구분해기록한다.

검증:

- redA10fail12controls→B신규22/관련4files44PASS. 최신App5files37/typeC/확대XMLcore105files1126tests·외부optin1skip PASS.
- 실제source/copy22건pinnedfullXSD PASS. actualreportE24조건/반복기본115.80px/원문30·경로30/32·48target/viewport containment PASS. 대표2이미지직접검토.
- 현재production/전체는후속gate이며실제App/native/OS/PDF별도pending. 기보변환/serializer/schema/bridge/API/geometry/기준이미지변경없음.
- 격리buildH/typeC/actualclassic-15 profileI/fixedI PASS. 기존CSS/font/exportfont/worker바이트동일, baseline불변. 다음혼합목록감사후최신전체는별도이며실제native/OS/PDF별도pending.
- SMG037003 viewport적용후actualfontI24조건/현재관련9files46 PASS. 새CSS/readerDOM의결과는이후cohort에별도보관하며기존E증거를덮어쓰지않는다.
- 통합 production K / classic-15 profile L / fixed-canvas L 종료 0. WOFF2·export-font·piano worker 불변, viewport CSS만 예상 변경, DO 기보/core/project 등 218개 소스 유지. 최신 전체 DP는 후속이며 실제 OS/native/SR/PDF 승인 아님.
- 현재 통합 DP 실제 종료0: Vitest 595files/5517tests PASS·외부1skip, Node5 PASS. 19076입력 실행 중/종료 직후 독립 해시 유지. 실제 OS/native/SR/PDF dialog는 별도 pending.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-037-003 · 긴 혼합 진단 목록의 내부 스크롤과 읽기 키 격리

- 현재: 4red/3대조와actualC960×750높이3549.80px실패→기존handler/토큰으로읽기group·min(50vh,28rem)본문추가. 신규7/관련9·최신9files46/typeE PASS. 실제G26조건·fontI24조건과원문31/path31보존·처음안내/끝도달성/작은목록intrinsic높이PASS. native저장늦은응답의현재readerfocus보존도합성App검증. 2026-11-08 기존header의긴파일명조건24개(960/1400·light/dark·fine/coarse/componenttext200·ASCII/한글) 현행PASS,대표2이미지검토. 제품수정이아닌pure UI coverage이며native/OS/wholeApp검수는아니다. 추가로긴work/opus원문을실제기술정보에서펼친12조건·DOMscroll끝좌표/닫기·network0와대표2이미지를확인했다. pure표시coverage이며제품수정/nativeQA는아니다. 2026-11-08 실제전체BDApp/임시mainbridge후속 B4흐름960×750/1400×1000의large31/small2·내부375/448px·원주소/끝도달·늦은저장뒤같은DOMreader/scroll/root유지PASS. F다른문서2흐름은A16마디저장대기→B2마디가져오기/실제제목명령1→A실제응답뒤Bdirty/선택/보고서/DOMreader보존·undo/redo1/Native/XML/MIDI PASS. 총B/F6흐름Native8/재열기6/XML6XSD/MIDI6·대표4이미지검토/관련5/type·제품불변. 네이티브OS초점은아니며document.hasFocus=false다. 확대후속actualBDApp D4조건:Chromiumzoom2(CSS480×375/700×500)·엄격메뉴bbox/hit·root/reader가로넘침없음·31/2원문/주소·trustednativewheel좌표·실제자체scrollend뒤마지막glyph노출PASS. 초기API끝설정만의footer가림과B미완료wheel/C잘못된root-onlyack실패를보존했다. 제품수정없고물리/OS/전체App200승인아님.
- 남은 범위: 실제전체App와임시main파일bridge의6흐름은확인했다. DOMactiveElement와nativeWindowfocus를구분하며document.hasFocus=false조건이다. 실제OSdialog/native활성입력/SR/물리pointer·keyboard/focusring·정규PDF/청취gate는별도pending이다. 제품변경없고QA-only이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioWarningReport.tsx](../../src/renderer/src/StudioWarningReport.tsx), [src/renderer/src/studio-warning-report.css](../../src/renderer/src/studio-warning-report.css), [src/renderer/src/App.report-scroll.test.tsx](../../src/renderer/src/App.report-scroll.test.tsx), [src/musicxml/mixed-warning-report.test.ts](../../src/musicxml/mixed-warning-report.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/accessibility.md), [참고 2](https://handbook.musescore.org/navigation/braille.md)

수용 기준:

- 긴혼합경고가화면전체를차지하는실제높이를재현하고원문/위치/행동을보존한내부읽기영역을제공한다.
- 같은family기존요약과단일/혼합정책을유지하며알수없는경고를일괄disclosure에숨기지않는다.
- 읽기영역은Tab으로도달하고기존탐색/IME격리와문서단축키·작업영역이동전달을유지한다.
- 960/1400×750/1000·light/dark·largefont/coarse의실측과끝도달성·수평overflow없음·작은목록intrinsic높이를검증한다.
- 문서/선택/caret/undo/저장요청소유권·기보/font/출력의미를유지하고실제OS/SR/nativegate를분리한다.

검증:

- 원래redA4fail3controls;actualC높이3549.796875px가같은높이단언실패. D관련4files9(신규7)/Etype/최신J9files46 PASS.
- actualG26조건에서960×750fine높이453.796875px,31원문/경로/기술정보유지. firstunknown안내불변·초기완전노출·scrollAPI끝도달·작은목록intrinsic높이 PASS. 대표before/after3이미지직접검토.
- postviewportfontI24조건PASS. 원본/copy2실제offlinepinnedfullXSD/model/native/MIDI PASS.
- 현재production/최신전체/실제OS/native/SR/PDF는후속gate. font경고와UI slice를묶어전체실행예정.
- 통합 production K / classic-15 profile L / fixed-canvas L 종료 0. WOFF2·export-font·piano worker 불변, viewport CSS만 예상 변경, DO 기보/core/project 등 218개 소스 유지. 최신 전체 DP는 후속이며 실제 OS/native/SR/PDF 승인 아님.
- 현재 통합 DP 실제 종료0: Vitest 595files/5517tests PASS·외부1skip, Node5 PASS. 19076입력 실행 중/종료 직후 독립 해시 유지. 실제 OS/native/SR/PDF dialog는 별도 pending.
- 후속 실제 helper/DOM overflow 선택 E76조건 PASS. 원래 C 동기PASS/캡처 불일치 보존 후 두RAF painting과 후속scrollTop 안정성을 같은 단언에 추가했다. 2이미지 직접검토, 제품변경없음·OS clipboard/native 승인은 별도.
- 기존016 실제AppB 경고6흐름에서합성Space뒤실제transport play/pause/stop disabled와위치0.0/8.0도불변. 물리/nativefocus/OS/SR승인은아니다.
- 2026-11-08 sameEU/BI QA-only: formal name position/font one-warning actualApp4conditions960x750/1400x1000 Chromiumzoom2. Strict technical disclosure after acknowledged trusted wheel; exact raw/zero/sourcepath, tailglyph211.38/219.88<225 and288.18<331.90, selection/dirty/history0/actual stoppedtransport preserved. A path failure/ownPIDcleanup and B occludedbutton failure retained. C/D same4conditions, not8. No new output/nativeOS/physical/SR approval.
- SMG-033-006의 실제GK S/T에서 기술정보 공백collapse를 재현하고 공개Text원문에pre-wrap을 적용했다. GL W20 및 X/Y동일16의정확원문/각단어가로경계·읽기소유권으로보완했으며 전체긴진단목표완료로확대하지않는다.
- 2026-11-10 GM/GU동일제품 상태줄 B8조건(1000높이)/D4 F6보강/F4조건(750높이)에서 200%·960dark/1400light·에뮬레이션 포인터·실제내부wheel/Page키·첫/끝글자·버튼hit·Native 보존 확인. D원래terminal미회수/완료결과회수, F원래3980 exit0. C이벤트취소기록시점실패보존. footer예약RAF 이후 nonzero/zero wheel2개 회귀추가, 관련4파일37/type PASS. 제품변경없고 OS/물리/SR/새PDF 승인아님.
- GM동일제품 고정확대율 실제4조건/750높이·200%: 미확정125/F6유지/Escape취소/Enter150/닫힌F6악보복귀·모드재열기/Native4/1558소스불변 PASS. 원래53156 exit0, 대표pendingPNG1검토. QA-only, 새제품/물리/OS/PDF승인아님.
- 2026-11-10 diagnostic AX actual2widths750: exact detail Text backend node collapsed ignored→Enter expanded StaticText/raw→reclosed ignored, summary/button expanded preserved; new Native success removes old error. Unsafe PDF native/dialog0; Native2reopen exact; current1561 unchanged/GW same product. Not OS AX/SR/physical approval; capture mainly summary/header, not full raw visibility.
- Fresh disclosure A default2 cases first/last visible,max0,PageDown0—not key pass. B UItext2x/finecoarse4conditions750 actual button Enter→one trusted PageDown per condition, both first/last Range+hit readable, root unchanged/scorehistory preserved. No raw DOM reveal after open; actualPDF native/dialog0; NativeA2/B4reopen. Current1561/GW same product, no new feature or physicalOS/SR approval.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-019 · 명시적 가사 연결 기호의 가져오기 손실 안내

- 현재: core7/App2 red·11대조 후 신규22/관련63·확대XML/project1096/외부1skip·typeF PASS. 실제 report36조건/sourcecopy6XSD·대표2캡처 검토. raw source elision 진단만 추가하고 기존 fallback·score/native/MIDI·복원 미지원 유지. 2026-11-08 기존017공백production J8흐름중 이항목의2폭공개메뉴/진단/기술주소·Native재열기/XML/MIDI/PDF도별도확인했다. 8흐름을항목별새성과로중복합산하지않으며원래서식/기호복원·nativeOS/물리승인은아니다.
- 남은 범위: 실제App의DOM공개경로·임시main파일bridge·Native재열기·XML/MIDI/실제PDF검증을확인했다. nativeWindowfocus/OSdialog/물리IME/SR·외부앱은미검수이며원래서식/기호복원·rich text모델은지원하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- 명시적 연결 문자/SMuFL의 원래 주소와 값을 안내하며 기본 빈 기호·기호 없음에는 새 경고를 추가하지 않는다.
- 원문 text가 SMuFL보다 우선하고 여러 기호/둘째 절/리터럴NBSP/숫자 참조 표기를 구분한다.
- 가사/native/MIDI·기본fallback·선택/수정횟수/실제 저장 payload를 보존하고 한국어 확인 행동과 기술정보를 유지한다.
- 실제 숨김 보고서/합성App 결과와 native/OS/SR/PDF gate를 구분한다.

검증:

- redA7fail11controls / redBcore7+App2fail11controls. greenC1fail39pass 원문 numeric-reference 가정 차이 보존 후 literal/reference 두 대조를 명시했다.
- 최신 E5files63/typeF PASS. 확대 F115files1096tests/외부1skip. source/copy20 XSD 대조가 신규 검사에 포함된다.
- actual H36조건, 생성 source/copy6건 full offline pinnedXSD, 대표2캡처 직접 검토. productionI/profileJ/fixedJ exit0, baseline불변. 최신전체와 실제native/OS/PDF는 후속이다.
- 최종 현재 문서 포함 productionM/profileN/fixedN exit0, L네문서gate/diff PASS. DP대비CSS/font/exportfont/worker 바이트동일·기보/core/project등218개소스유지. 최신전체 DQ는 별도 후속.
- 현재 DQ 실제 전체 종료0: Vitest 597files/5539tests PASS/외부1skip, Node5;19509입력 실행 중/종료 직후 해시 불변. OS/native/SR/PDF dialog pending.
- DQ후 test-only sparse helper red1/22controls→신규3/관련5files66·typeD PASS. 원래 parser는 index2/가사/native/MIDI를 보존하며 제품 수정 아님. source/독립control/copy fullXSD. DQ전체는 신규3추가전.
- 020의 XML 의미 교정 뒤 literal NBSP와 numeric-reference 진단 값을 같은 문자로 엄격 비교하고 escaped-reference는 원래 참조 문자열로 유지하는 대조를 추가했다. 원래 증거는 보존하며 현재 metadata의 의미와 이전 lexical표현을 혼동하지 않는다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-020 · MusicXML 숫자 문자 참조의 문자 손실·절 번호 오류

- 현재: core7/App2 red·11대조→XML전용 private parser adapter로 숫자 참조를 한 번 해석한다. 현재9사례+metadata2 source/scalar·native/XML/MIDI, 실제notation36/화면18쌍/PDF4/동일raster2쌍 검증. F관련74/GXMLproject1126·App43/Lmetadata포함78·typeM PASS. 기존 native literal 문자열 자동 변환 없음. EO뒤후속: 실제UTF8오류8수락/숫자참조삭제를감사했다. core23의14red/9대조→XML1.0/선언없음의원문scalar·rawtext/attribute직접NCR guard, Native/escaped/CDATA·기존entity/limit·XML1.1기존행동보존. 관련151/최종27/type·XML전체1529/외부1skip·AUbuild/profile/fixed·실제960/1400 오류16·Native4/2재열기/XML4XSD/MIDI2·Help PASS. 새누적EP657파일6239·Node5/외부1skip/직후32699SHA동일로 원문/직접NCR검사 범위를 확인했다. EP뒤metadata조각공백후속: 실제CDATA경계공백손실7red/8대조→기존ordered tree로header scalar를합쳐바깥trim1회. 관련179/type·XML1544/외부1skip·AVbuild/profile(overlay0)/fixed·actualvalidH960/1400×2fields Native4/reopen4·XML8XSD/MIDI4/PDF4(고유2raster검토)/sourcecontrol4XSD PASS. 새누적EQ대기다. 최종metadata유효fixture후XML M121files1544/typeM·AX실제Help L viewport문단/Escape/0편집과문서gates도통과했다. 앞선실행과중복합산하지않는다. 최종quoted PI의추가2red/15대조뒤17검사/전체XML P1546/typeP·AYbuild/profileoverlay0/fixed·actualX2흐름Native2/XML4/MIDI2/PDF2잉크대조도통과했다. Poppler두글자공백추출실패S는유지하고실제공백잉크+7px와구분했다. 같은028020의파트 이름·약칭조각공백후속:실제24source/controlXSD의8손실·C9red/7대조→기존header adapter11줄. focused5files99/type·XML I122files1562/외부1skip·actualJ960/1400 Native2/2reopen/XML4XSD/MIDI2/scorepartPDF4·raster2동일쌍/고유2검토PASS. BA Help본문/Escape/0편집·profileBBoverlay0/fixedPASS, 누적EQ후속. 최신누적EQ659files6272tests/Node5PASS·외부1skip/1122.06초·원래43141terminal0→사전작성22534receipt를수정/build전읽음·34284SHA실행중/원래종료/직후독립동일. header공백수정범위는전체까지확인했다. EQ뒤내부선언참조진단:12core red/8대조·추가마디주소1/App2 red→rawleaf/decodedordered대조와기존report한국어안내. focused56/type·XML123files1583/외부1skip·원문16모델/Native/MIDI불변/진단10(유효9+기존오류1)·BBoverlay0profile/fixed·actualL960/1400×2fields Native4/4reopen/XML8XSD/MIDI4·HelpI/대표화면3검토PASS. 미해석글자복원은아니고새전체ER후속이다. 누적ER661files6295tests/Node5PASS·외부1skip/1122.27초·원래74245terminal0→수정/build전사전작성39938receipt실제읽음·34727SHA실행중/종료/직후독립동일로명명진단범위전체gate확인. ER뒤큰입력감사:8실제source/fullXSD의같은모델/보고서/Native/MIDI에서무참조DTD추가비용을확인했다. 후보0개fastpath1줄로4000마디로컬Node중앙값397.43→218.66ms(3회/정확source동일). 실제16원문진단동일·focused79/type/XML1583·BDprofileoverlay0/fixed·AppE2무경고흐름Native2/XML4XSD/MIDI2PASS. UI응답/portableSLA승인은아니며새누적전체는후속묶음이다. 2026-11-10 실제 App File가져오기→PDF의한글/literal/mixed3case source/scalar6입력을두폭12흐름으로검증했다. Native12재열기/PDF12각1쪽·Poppler UTF8layout/word의정확문자·source/scalar6쌍/폭별6쌍 text/raster동일,source6fullXSD·현재1561해시불변. 제품수정없이추출coverage만추가했다.
- 남은 범위: 한글/literal/mixed3case의현재실제App PDF추출은확인했다. 실제OS PDF viewer 복사/검색·전체읽기순서/스크린리더·모든Unicode/글꼴/공백정규화는별도다. 원래8종글자복원·모든DTD/외부소비자·OS/native/IME/SR의미완범위도유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd), [src/musicxml/xml-parser.ts](../../src/musicxml/xml-parser.ts), [src/musicxml/xml-input-characters.ts](../../src/musicxml/xml-input-characters.ts), [src/musicxml/metadata-fragment-space.test.ts](../../src/musicxml/metadata-fragment-space.test.ts), [src/musicxml/part-label-fragment-space.test.ts](../../src/musicxml/part-label-fragment-space.test.ts), [src/musicxml/xml-unresolved-references.ts](../../src/musicxml/xml-unresolved-references.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- 유효 decimal/hex·한글 조각·NBSP·절 번호가 literal scalar와 같은 모델·문자로 읽힌다.
- escaped literal/CDATA·혼합 조각은 XML 의미대로 정확히 한 번 해석하며 native에 저장된 기존 문자열은 자동 변환하지 않는다.
- XML predefined5·기존 entity 제한/선언 처리와 부작용 없는 parser 경계를 유지한다.
- 실패 회귀 후 실제 문자열/잉크·native/XML/MIDI·기존019 진단·focused/type/필요한 PDF/전체를 구분해 검증한다.
- XML1.0 원문 불가scalar와 직접숫자참조가 조용히 사라지지 않고 기존가져오기실패로 현재Native/dirty/선택/undo를보존한다. 유효참조·escapedliteral/CDATA/주석·기존Native문자와 일반entity/limit·XML1.1기존동작을유지한다.
- 제목/work-title·movement-title·creator scalar는일반글자/CDATA/PI조각사이공백을보존하며바깥trim·명시빈값우선순위·creator역할/속성·Native/기보/재생을유지한다.
- 파트 이름·약칭의 CDATA/PI/quotedPI 경계 공백과 기존 바깥trim/빈값·header/body ID 연결·Native/두XML/MIDI를 보존한다.
- 내부선언의미해석참조는정확한원주소/이름/건수로기존경고를제공한다. 정상단순선언/CDATA/escaped/numericamp및동명이름리터럴을오진하지않으며모델/Native/MIDI/보안hook을바꾸지않는다.

검증:

- 수정 전 실제 Node C probe9사례: source/control18건 pinnedfullXSD, confirmed7(문자6/번호오류1)/정상2. native wire구조/실제문자보존·MIDI동일.
- B JSON.stringify 순서 비교 때문에 native false였던 관찰은 보존하되 제품손실증거에서 제외했다. C의 구조적 wire동등성과 엄격 문자 비교로 분리 확인. 제품수정/실제App/renderer/PDF/현재전체 PASS를 주장하지 않는다.
- 원래 redD9fail11controls 보존. greenE2fail48pass(019진단 의미/기존 오류문구 가정) 후 literal/NCR/escaped 대조와 엄격 count 오류문구를 고정했다. F6files74/typeF, Gcore117files1126/외부1skip·App8files43, Lmetadata포함7files78/typeM PASS.
- 현재 H9사례 모두 source/scalar/native/XML/MIDI 일치, archived B native literal 보존. 실제 XML28+metadata6 complete offline pinnedXSD. actualNotation J36, 화면18쌍 byte동일, PDF4각1page/raster2쌍동일·대표2PDF/1400화면 직접검토. 실제native/OS/PDFdialog 승인은 별도.
- 최종 현재 productionN/profileO/fixedO exit0, N네문서verifier/diff PASS. DQ대비 기보/core/project/serializer218개·CSS/font/exportfont/worker 유지, source-n 안정. 최신 전체 DR는 별도 실행 후 기록.
- DR 실제 종료0:601files5575tests PASS/외부1skip·Node5,1025.45초. 동결 입력19894개가 실행 중/직후 독립해시에서 모두 동일. MXL container·실제OS/native/정규PDFdialog 승인 아님.
- 원문/NCR후속: core14red/9대조→관련151/type·정리27/type·XML1529/외부1skip/AUbuild/profile/fixed/actual960·1400 오류16·Native4/2reopen/XML4XSD/MIDI2/Help PASS; EP전체후속.
- EP657files6239tests/Node5 PASS,external1skip/1202.87s,32699hash unchanged; original49885 then independent52204 receipt before edits.
- metadata7red/8controls→관련179/type·수정fixture15/전체XML1544·AVprofile overlay0/fixed·actualH validNative4/reopen4/XML8fullXSD/MIDI4/PDF4(two unique raster reviewed) PASS. 최종manual/누적EQ후속.
- 추가quotedPI O2red/15pass→최종XML P121files1546/typeP·AYbuild/overlay0profile/fixed·actualX Native2/reopen2/XML4fullXSD/MIDI2/PDF2(positive ink7px wider than same-font no-space control) PASS. 현재자체프로세스종료/새전체EQ후속.
- EQ659files6272tests/Node5PASS·외부1skip/1122.06s,34284inputs unchanged; original43141terminal0 then independent22534receipt READ before edits/build.
- ER661files6295tests/Node5PASS·외부1skip/1122.27s,34727inputs unchanged; original74245terminal0 then prewritten39938receipt READ before edits/build.
- PDF text-extraction D12actual App flows/Native12reopen/PDF12one-page, source6fullXSD. Korean/literal/mixed exact layout text+word, source-scalar6pairs and width6pairs text/raster equal. Two screen/twoPDF images reviewed. GenerationA wrong voice path/B undefined identity tool failures retained and C JSON wire strict corrected. Current1561 unchanged vsGW; no product/baseline change. Not OS viewer copy/search or SR/allUnicode.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-021 · 압축 MusicXML rootfile의 XML 속성 문자와 경로 검사

- 현재: 직접 공백 때문에 다른 ZIP 악보를 선택하던 5사례를 재현하고, 문자 참조 해석 전 정규화 한 줄과 신규 19검사로 수정했다. 관련108/type·MusicXML1939검사·FU 실제18정상/2거부보존·112출력파일·BU Help2를 확인했다. GM 전체740파일6979검사/Node5 PASS, 외부opt-in1skip이며 고정69870입력과1544소스 변경0이다. GM 뒤 원문·선택하지 않은 속성/요소의 잘못된 참조 11개가 수락되는 것을 독립 XML/실제 디스크 reader로 재현했다. 신규21의13실패/8대조 후 기존 본문 문자 검사와 버전 조건을 재사용했다. 중간 오류 문맥4실패를 보존하고 MXL 구분을 유지했다. 관련6파일111/type PASS이며 실제 앱·새 전체는 후속이다. FV 실제960/1400의10정상/4오류보존·68출력파일/Native10재열기/XML20fullXSD/PDF10동일이미지·BX Help2를 확인했다. MusicXML154파일1960검사/외부1skip PASS. 현재1545소스·GM는수정전이다. 이번 문자 검사 수정은 GN 전체741파일7000검사·Node-native5/외부opt-in1skip,1245.61초와 고정70231입력·현재1545소스 변경0까지 확인했다.
- 남은 범위: 직접 속성 공백과 XML1.0 원문/숫자 참조 검사 수정은 GN 누적 전체 gate까지 확인했다. URI/Unicode 정규화·전체 container runtime XSD와 물리 OS/IME/외부 앱/SR 검수는 별도다. 부모 기능 전체나 모든 XML 문법 검증의 완료를 뜻하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-028-020
- 소스: [src/musicxml/container.ts](../../src/musicxml/container.ts), [src/musicxml/container-characters.test.ts](../../src/musicxml/container-characters.test.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/musicxml/container-literal-whitespace.test.ts](../../src/musicxml/container-literal-whitespace.test.ts), [src/musicxml/container-input-characters.test.ts](../../src/musicxml/container-input-characters.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/lyrics.md)

수용 기준:

- XML predefined5/NCR 경로와 MIME을 한 번 해석하고 escaped literal은 재해석하지 않는다.
- first-root·DTD비확장·ZIP이름/크기/수/UTF8·MIME 가드를 유지하고 raw alias fallback과 해석 후 unsafe 경로를 거부한다.
- 기존 disk reader/native/XML/MIDI와 현재 focused/type/build를 분리해 검증한다.
- 직접입력한XML속성TAB/LF/CRLF는참조해석전에공백으로읽고명시NCR/escapedliteral은기존대로한번만해석한다. 정상경로가없을때raw별칭/나중root로넘어가지않는다.

검증:

- redA24fail8대조→greenB4files57/typeC/coreC119files1157·외부1skip. trim 대조는 redD1 보존 후 수정했다.
- actualE임시MXL11개 disk/model/report/native/XML/MIDI/canonicalMXL 재열기 일치. container11+copy11 complete offline XSD PASS. 원래HEAD encodedunsafe 허용/현재거부 대조.
- trim포함 F5files64/typeF·네문서verifier/diff PASS. 현재 buildG/profileG(overlay-0)/fixedG 종료0. DR기존src 중 container.ts만 변경, 신규test1개·CSS/font/worker 동일·source-e10개 안정. 최신전체는 DS로별도기록.
- DS 실제 종료0:602files5603tests PASS/외부1skip·Node5,1014.68초. 입력20152개가 실행 중/직후 독립해시에서 모두 동일. 실제OS/native검수와구분.
- 후속2026-11-10: 독립PythonXML속성·container/score10fullpinnedXSD·실제disk5wrongalias/3controls,unit13red/3대조→신규19/관련5파일108/type·MusicXML153파일1939검사/외부1skip PASS. NCR9/10/13 기존3대조보존,수정API disk8조건에서wrongalias0/교정5/정상3. 실제앱/새전체는후속이며GL는수정전이다.
- FU G실제960/1400의MXL16+plainXML2조건,거부후보존2조건·112파일/Native22쓰기18재열기/XML36fullXSD/MIDI18/PDF18같은이미지. F의p선택자가정을실제publicstatus로고쳤고원래실패보존·제품추가변경없음. FU/BU Help2에서canonical partial/firstroot/DTD범위확인. 현재1544소스고정·GM전체는후속이다.
- GM 전체740파일6979검사·Node-native5 PASS, 외부opt-in1파일/1검사 skip. 실제1310.27초, 원래34498 종료0→즉시 독립37130 종료0→receipt 본문 확인 뒤 편집 재개. 고정69870입력 및 현재1544소스 변경0; 실행 중 편집/build/Electron 병행 없음.
- 컨테이너 원문 문자 후속: 실제 임시MXL18개에서 독립XML오류11개수락/정상7개수락. 신규21에서13red/8대조→기존assertMusicXmlInputCharacters+XML1.0/선언없음조건. 관련6파일111/type PASS; 기존오류구분4실패는메시지문맥으로수정했고assertion을약화하지않았다.
- 최종 D 관련6파일111/type·E XML154파일1960검사/외부1skip. FV actualF10정상+4거부보존·Native18쓰기10재열기/XML20fullXSD/MIDI10/PDF10동일대조이미지. BX Help2 PASS; BV/BW의검증기경로실패와원래로그보존. 현재1545소스/제품수정후누적전체는후속이다.
- GN 전체741파일7000검사·Node-native5 PASS, 외부opt-in1파일/1검사 skip. 실제1245.61초, 원래86010 종료0→즉시 독립42903 종료0→receipt 본문 확인 뒤 편집 재개. 고정70231입력 및 현재1545소스 변경0; 전체 중 편집/build/Electron 병행 없음.
- 2026-11-11 literal-root identity QA-only:source/alias12fullpinnedXSD+6container checks against official listing extracted QA schema (reference hashes retained). ActualC original80553 exit0:960dark/1400light12flows8opened4rejected;Native12reopen/XML16fullXSD/MIDI8/PDF8+images8+text8=60files,correct model/title excludes confusable wrong alias;1570inputs unchanged. B wrong CSS selector failure retained, C uses actual h1 without weakening exact data checks. Core1567 identicalGZ757/7146+Node5, no new product/full run.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-022 · 별도 파트 이름·약칭 표시 설정의 손실 안내

- 현재: 실제 source/copy 7쌍 XSD 감사에서 별도 표시 설정 7종이 무경고로 사라졌다. core 9실패/1대조와 한국어요약 App 2실패 후 기존 진단에 연결했다. formal name/abbreviation·모델·Native·MIDI는 유지하며 원래 표시 내용이나 서식은 복원하지 않는다. 관련 3파일14검사와 type, 새 fixture 9쌍/18XML full pinned XSD를 확인했다. production 및 누적 전체는 후속이다. 현재 XML124파일1593검사/외부1skip, 격리BE App4흐름 Native4저장/4재열기·XML8전체XSD/MIDI4·한국어요약/기술값·HelpJ·profile/fixed도 통과했다. baseline과 기보는 그대로이며 누적ES는 후속이다. 누적ES663파일6307검사/Node5 PASS·외부1skip,1119.67초. 원래58904→즉시독립80348 receipt를 읽기 전 수정/build 없이35405SHA가 같았다. 이제 같은022의 print별 표시 손실을 별도 감사하며 복원을 주장하지 않는다. ES 뒤 같은022의 시스템별 print 표시7종에서도 무경고 손실을 실제14XML XSD로 확인했다. 추가core10/App2 red와11대조 후 기존 helper에 실제 마디/print 주소만 연결했다. 관련3파일25/type·새source/copy18XSD 확인 후 실제 production을 진행한다. BF App F4흐름/Native4재열기/XML8fullXSD/MIDI4·동일한1페이지PDF4/대표1raster·HelpG/profile/fixed까지 확인했다. E/F는같은4흐름이고빈box관측을F에서수치로보완했다. ES6307은이print후속전이며새전체는후속이다. 누적ET664파일6321검사/Node5 PASS·외부1skip/1124.67초. 원래68614→즉시독립80665 receipt읽기전수정/build없이36181SHA동일로현재변경묶음을확인했다. 정식이름·약칭의직접서식속성도기존진단에연결했다. 관련39/type/XML1616·실제8흐름40파일로기존값/기보를보존하며누적EU6335/Node5까지통과했다.
- 남은 범위: header와measure.print 표시손실 진단의focused/type/실제App/PDF·ET누적을확인했다. 원래글자·임시표·서식/mixed-content순서·시스템별표시복원은별도설계다. OS/native/물리/외부/SR승인은미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/part-name-display-warning.test.ts](../../src/musicxml/part-name-display-warning.test.ts), [src/renderer/src/App.part-name-display-warning.test.tsx](../../src/renderer/src/App.part-name-display-warning.test.tsx), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/staff-part-properties.md)

수용 기준:

- 기존 formal name/abbreviation을 교체하지 않고 별도 표시 설정 손실을 안내한다.
- 빈 표시·숨김·혼합 서식과 역순 header의 주소/실제 파트 소유자를 보존한다.
- 일반 대조에 경고를 만들지 않고 Native·XML·MIDI와 기존 동작을 보존한다.
- 실제 앱에서 한국어요약·기술정보·저장/재열기와 두 XML 모드를 검증한다.

검증:

- core red 9/1대조, App red 2 → 관련 14/type 통과.
- 새 source/copy 9쌍 full pinned MusicXML4 XSD 및 모델/Native/동일 MIDI.
- BE 실제 App4흐름·Native4/4재열기·두모드 XML8fullXSD/MIDI4·HelpJ·profile overlay0/fixed PASS, 누적ES 후속.
- ES 원래 terminal/직후독립receipt/35405SHA 동일·663/6307/Node5 PASS; 외부opt-in1skip.
- 같은022 print후속 core/App12red/11대조→25/type/XML1604/새18XSD·BF AppF4흐름/Native4/XML8/MIDI4/PDF4/HelpG/profile/fixed PASS. ES 이후13신규검사 누적전체는 후속.
- 현재누적ET:664/6321·Node5 PASS/외부1skip, 원래68614 terminal0→독립80665 receipt읽음,36181고정SHA동일.
- 2026-11-08 same022 formal-field followup:valid6source/copy12XSD no-warning audit;core9/App2red+3controls -> related5files39/type/XML1616+external1skip. G21XSD·before-model/Native/MIDI/copy same;actualBI H8flows Native8/reopen8/XML16XSD/MIDI8/PDF8 all same prechange raster·HelpI/profile PASS. Fullnew pending; no restoration/nativeOS approval.
- integrationEU full666files6335tests/Node5 PASS; externaloptin1file/1testskip,1123.04s. Original13123 terminal0 followed by prewritten independent92942 terminal0 and receipt READ before edits/build;37064frozen inputs unchanged midrun2/originalexit/immediateaudit. No nativeOS/physical/externalGUI restoration approval.
- 2026-11-08 sameEU/BI QA-only: formal name position/font one-warning actualApp4conditions960x750/1400x1000 Chromiumzoom2. Strict technical disclosure after acknowledged trusted wheel; exact raw/zero/sourcepath, tailglyph211.38/219.88<225 and288.18<331.90, selection/dirty/history0/actual stoppedtransport preserved. A path failure/ownPIDcleanup and B occludedbutton failure retained. C/D same4conditions, not8. No new output/nativeOS/physical/SR approval.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-012 · 음표 덧줄 숨김 설정의 가져오기 손실 안내

- 현재: redA8fail29대조→보이는 일반/화음/꾸밈음의 덧줄 숨김 손실을 기존 진단·한국어 report/status로 안내한다. hidden combined는 한 번, rest/yes/생략은 무경고. B69/typeC/core1172·actualF10/native/XML/MIDI/20XSD 및 reportE36조건·대표캡처 검토 통과. 2026-11-09 같은FC/BW 전체App의960dark/1400light에서 ledger/dot9종18흐름·Native36/재열기18/XML36fullXSD/MIDI18/PDF18각1page·PNG18을 보강했다. 고유PDF9이미지를 직접검토했으며 원래 숨김복원은 아니다. 2026-11-10 EU/GE 동일1517소스에서 동종4/4·혼합8·무경고0의 chrome200% 읽기16조건과 동일source 재가져오기 확장초기화를 보강했다.
- 남은 범위: 반복·혼합 경고의 전체chrome200% 읽기/공개아코디언/마지막glyph·읽기키·상태와100%복원뒤Native16건을 확인했다. 원래 표시의 모델/편집/복원,200%전체편집·출력,물리OSdialog/nativeWindowfocus/IME/SR/청음/외부앱은 별도 미검증 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- 일반/화음/꾸밈음 source note의 print-leger=no 손실을 한국어 확인 행동과 원문 경로/값으로 안내한다.
- 쉼표·yes/생략은 무경고이며 hidden note의 기존 combined notice를 중복하지 않는다.
- 동종/혼합 전체 경고와 기존 model/native/XML/MIDI·dirty/history/기술 정보 계약을 유지한다.

검증:

- redA8fail29대조 보존→greenB5files69/typeC/core120files1172·외부1skip PASS.
- actualF10입력 old/current projectedscore/native/XML/MIDI 같음·20건 full offline pinnedXSD.
- reportE실제36조건·기본접힘/전체원문/32fine48coarse/가로containment PASS, 대표2캡처 직접검토. actualOS/native 승인아님.
- 최종 혼합status 대조 포함 G5files69/typeG·네문서verifier/diff와 현재 buildH/profileHoverlay0/fixedH PASS. DS기존src 중 parse.ts/App.tsx 진단만 변경·신규test/fixture3개, 공통src/CSS/font/worker 유지·source-f10개 안정. 최신전체는 후속.
- DT 실제 종료0:606files5638tests PASS/외부1skip·Node5,1021.36초. 입력20811개가 실행 중/직후 독립해시에서 모두 동일. actualOS/native/SR승인아님.
- 2026-11-09 QA-only ledger/dot actualB18흐름126파일·source/control/copy27fullXSD/actualXML36fullXSD; readerC14조건 마지막glyph strictHit·960각1wheel/1400각0. B33665/C70529exit0 관측·제품1463FC동일·baseline변경없음. 기존history0/선택/dirty보존이며 신규undo1아님.
- 2026-11-10 QA-only C:960dark/1400light×fine/coarse×4fixture=16조건(경고12/대조4),source4fullXSD·모델/MIDI control동일·Native16;원문끝glyph960각3wheel/1400각2·trusted scrollend/strictHit·source재가져오기초기화/기존history0/선택/dirty/transport보존. A/B 고정wheel input충돌은QA원인으로보존,제품/baseline불변·GE1517동일.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-013 · 음표·쉼표 음가 점 숨김의 가져오기 손실 안내

- 현재: redB10fail21대조 후 실제 점이 있는 일반/화음/쉼표 print-dot=no를 기존 진단·한국어 report/status로 안내한다. hidden combined에는 명시printDot 값을 유지하며 yes/생략/no-dot는 무경고. G58/typeH/core1185·actualK13/native/XML/MIDI/26XSD·reportJ36 통과. 2026-11-09 같은FC/BW 전체App의960dark/1400light에서 ledger/dot9종18흐름·Native36/재열기18/XML36fullXSD/MIDI18/PDF18각1page·PNG18을 보강했다. 고유PDF9이미지를 직접검토했으며 원래 숨김복원은 아니다. 2026-11-10 EU/GE 동일1517소스에서 동종4/4·혼합8·무경고0의 chrome200% 읽기16조건과 동일source 재가져오기 확장초기화를 보강했다.
- 남은 범위: 반복·혼합 경고의 전체chrome200% 읽기/공개아코디언/마지막glyph·읽기키·상태와100%복원뒤Native16건을 확인했다. 원래 표시의 모델/편집/복원,200%전체편집·출력,물리OSdialog/nativeWindowfocus/IME/SR/청음/외부앱은 별도 미검증 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- 실제 점이 있는 일반/화음/쉼표의 숨김 손실을 한국어로 안내하고 원래 source경로/값을 기술 정보에 남긴다.
- yes/생략/no-dot와 grace appearance를 오인하지 않고 기존 hidden combined는 한 번만 유지한다.
- 동종/혼합 경고·모델/native/XML/MIDI·명령/dirty/history를 유지한다.

검증:

- redA10fail20대조의 혼합 fixture 순서를 바로잡고 fullXSD대조 추가 뒤 redB10fail21대조를 제품 수정 전에 재현했다.
- actual notationF16/source-control8PNG쌍·glyphink 동일, ordinary dots main/rest1/chord2 표시·grace0은 별도 제한. QA C의 browserESM Glyphs오류 보존 후 E/F실행.
- GreenG6files58/typeH/core121files1185·외부1skip. actualK13/model/native/XML/MIDI유지·26fullXSD. reportJ36조건/대표2캡처직접검토. 최종guard1포함 focused/type는 후속.
- 마지막grace경계대조 포함 L6files59/typeL·네문서verifier/diff, 현재 buildM/profileMoverlay0/fixedM PASS. source-k10·공통18·CSS/font/worker 유지·baseline변경 없음. 최신전체는 DT후속.
- DT 실제 종료0:606files5638tests PASS/외부1skip·Node5,1021.36초. 입력20811개가 실행 중/직후 독립해시에서 모두 동일. actualOS/native/SR승인아님.
- 2026-11-09 QA-only ledger/dot actualB18흐름126파일·source/control/copy27fullXSD/actualXML36fullXSD; readerC14조건 마지막glyph strictHit·960각1wheel/1400각0. B33665/C70529exit0 관측·제품1463FC동일·baseline변경없음. 기존history0/선택/dirty보존이며 신규undo1아님.
- 2026-11-10 QA-only C:960dark/1400light×fine/coarse×4fixture=16조건(경고12/대조4),source4fullXSD·모델/MIDI control동일·Native16;원문끝glyph960각3wheel/1400각2·trusted scrollend/strictHit·source재가져오기초기화/기존history0/선택/dirty/transport보존. A/B 고정wheel input충돌은QA원인으로보존,제품/baseline불변·GE1517동일.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-014 · 꾸밈음 원래 기보 음가·점의 가져오기 손실 안내

- 현재: red A 13실패/26대조 후 기존 진단과 한국어 report/status로 비기본 type/dot 손실을 안내한다. Green B56/type C/core1220, actual D11/native/XML/MIDI/22XSD, report F36 및 격리 build/profile/fixed H 통과. 원래 모양·발음 복원이 아닌 진단이며 최신 전체는 후속이다. 최신 DU 전체612파일5702검사/Node5와21679입력 불변 및 직후 독립 해시를 통과했다. 동일BN/EY 실제fullApp8흐름(2파트·파트2마디2/960/1400)에서모양·시간·명시0을분리안내했고Native16/8재열기/XML16/MIDI8/20XSD/PDF8한페이지·raster동일을확인했다. 제품변경없는회귀QA다.
- 남은 범위: 실제App/main/preload·공개메뉴/임시실제IO·기본Native재열기/XML/MIDI/PDF8과이번wholeAppchrome200/CDPcoarse4조건은확인했다. 물리OSdialog/nativeWindowfocus·IME/SR/청음/외부앱·물리터치/OS글자크기는별도미검수다. 원래꾸밈음시간/기보표기복원·편집모델은별도설계다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- 기본8분·비기본type·dot source의 실제 모델/기보/재출력 차이를 확인한다.
- ordinary print-dot 진단과 혼용하거나 engine/schema 지원을 추가한 것처럼 표시하지 않는다.
- 확인된 손실만 first-red로 안내하며 모델/native/MIDI·기존 기보를 유지한다.

검증:

- 현재 실제 K source/copy XSD와 rendererF의 grace0을 관찰했다. 아직 appearance손실 진단 구현·전체 지원승인 아님.
- DT동결 중 readonly10cases/source-copy20XSD: quarter/16th/dot1/2도 default8과같은 model/MIDI/copy, default8/omitted/slashfalse controls 유지. 새파일/제품수정없이관찰하고 DT끝뒤기록.
- red A 원본 보존, B5파일56/type/core123파일1220외부1skip, NodeD11/22XSD 및 reportF36/대표2이미지, buildH/profile overlay0/fixed 통과. DT 전체는 직전 결과다.
- Integration DU 실제612files/5702tests+Node5 PASS, 외부 opt-in1skip, 21679입력 실행중/직후독립해시 불변. all3 baseline/profile explicit lock 유지. 실제 native/OS/외부 앱 승인은 아님.
- 2026-11-08 AppA55876/B42867terminal0:동일8고유흐름·1/1/2/0경고/모든source경로/percent25/50/explicit0·Native16/8reopen/XML16/MIDI8/fullXSD20·PDF8(각1page)/96dpi8rasterSHA동일·source1480EY동일. B는A조건PDF보강(중복합산안함),제품/baseline변경없음.
- 동일FE/CB 제품1465의wholeAppchrome200/CDPcoarse4조건PASS: 반복30/혼합31경고·현재원본진단/끝glyph/reader와footer주입trustedwheel·72target·Native4보존. sourceXSD2/pinned해시대조/두대표이미지검토. 새제품/전체/PDF승인아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-015 · 개별 큐 표기 구분의 가져오기 손실 안내

- 현재: redA10fail21대조→source cue child의 구분 손실을 기존 진단·한국어report/status로 안내한다. main/chord/grace/rest/typeSize 기술값·동종30/혼합31 유지. B45/typeC/core1199·actualD10/projectednative/XML/MIDI/20XSD·reportF36 통과. 실제 cue 무음은 구현하지 않았다. 최신 DU 전체612파일5702검사/Node5와21679입력 불변 및 직후 독립 해시를 통과했다. 현재 동일BN/EY fullApp8흐름(actual960/1400×main/chord/plain/size-only)과Native16/8재열기·XML16/MIDI8·입력4+사본16fullXSD20·source1480EY동일을 확인했다. 제품수정없는 회귀QA다. 이어동일BN/EY fullApp chrome200%/coarse×960/1400×동종30/혼합31의4고유조건도통과했다. Reader/footer실제trustedwheel·마지막glyph·48target(최소72)/Native4·history0를보존했다.
- 남은 범위: 실제전체App의기본8파일흐름과chrome200%/CDPcoarse긴경고4조건은확인했다. 물리OSdialog·touch/IME/SR/청음/외부앱은별도미검수다. 실제cue무음/per-pitch모델/원래크기복원은별도설계다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- 원래 cue child가 있는 source note의 구분 손실을 한국어 행동·원래 경로/종류/size로 안내한다.
- no-cue와type-size-only를 cue무음으로 오인하지 않고 main/chord/grace/rest를 정확히 구분한다.
- 동종/혼합 전체 경고와 기존 model/native/XML/MIDI·선택/dirty/history/키보드를 유지한다.

검증:

- DT동결 중 파일쓰기 없는 actual7cases/14XSD·SMF1 note-on을 확인하고 DT종료/해시뒤 원래 관찰만 기록했다. product/audio/OS수정 승인아님.
- redA10fail21대조→greenB5files45/typeC/core122files1199·외부1skip PASS.
- actualD10/projectedscore/native/XML/MIDI unchanged vsarchived pre-cue;20complete offline pinnedXSD,SMF1 events retained. Fullcue audio지원아님.
- actualreportF36/모든기술경로/기본접힘/fine32coarse48/가로containment·대표2캡처직접검토. actualnative/OS/wholeApp200%승인아님.
- 현재 docG/diff/buildH/profileHoverlay0/fixedH PASS. source-g10·공통18·CSS/font/worker 유지. 기준해시의DT비교는baseline-scope-i에명시한1개이며다른과거기준해시비교를주장하지않는다(--update미사용). source-from-DT65줄의역구성baseline은실제DT해시와같다. 최신전체는후속.
- Integration DU 실제612files/5702tests+Node5 PASS, 외부 opt-in1skip, 21679입력 실행중/직후독립해시 불변. all3 baseline/profile explicit lock 유지. 실제 native/OS/외부 앱 승인은 아님.
- 2026-11-08 fullApp B terminal40446 exit0:8unique960/1400flows, Native16/8reopen/XML16/MIDI8/20fullXSD, exactscore/ID/view/byte·clean/history0·source1480EY동일. Aviewport실패·generatorJSON형상/요약kind오류 보존·baseline/제품변경없음.
- FullAppdensityA21881/B21051 terminal0:동일4조건(중복합산안함)chrome200/CDPcoarse·정확30/31행/경로·min72target·reader/footertrustedwheel root불변/lastglyph노출·Native4 exactscore/IDs/input2fullXSD/source1480EY동일. DOM키7개라우팅이며물리key/SR아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-009-002 · 꾸밈음 원래 연주 시간 지정의 가져오기 손실 안내

- 현재: 원래 grace 시간 지정 손실을 값/단위/source와 한국어로 안내한다. 후속 omitted-slash source 속성 미주입은 red2/20대조→fixture/test만 수정·B82/type/actual6/12XSD로 보완했다. 최신 DV614파일5737/Node5·22304불변/직후독립해시까지 통과했다. 기존 기보/발음·모델은 유지한다. 동일BN/EY 실제fullApp8흐름(2파트·파트2마디2/960/1400)에서모양·시간·명시0을분리안내했고Native16/8재열기/XML16/MIDI8/20XSD/PDF8한페이지·raster동일을확인했다. 제품변경없는회귀QA다.
- 남은 범위: 실제App/main/preload·공개메뉴/임시실제IO·기본Native재열기/XML/MIDI/PDF8과이번wholeAppchrome200/CDPcoarse4조건은확인했다. 물리OSdialog/nativeWindowfocus·IME/SR/청음/외부앱·물리터치/OS글자크기는별도미검수다. 원래꾸밈음시간/기보표기복원·편집모델은별도설계다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/grace-notes.md)

수용 기준:

- 원래 시간지정의 명시/생략/0과 source단위·경로를 대조하고 실제 손실을 구분한다.
- 기존 MIDI누락안내를 반복 성과로 계산하지 않고 import시간값과 외형손실을 분리한다.
- 새 연주시간/엔진/schema정책을 자동 구현하지 않고 확인된 진단 누락만 first-red로 보완한다.

검증:

- DT동결중readonly6cases/12XSD를관찰했으며 DT끝뒤 원래결과를기록했다. actual playback/audio/nativeOS검수아님.
- redA14실패/8대조 보존. Green B6파일64/type C/core124파일1238외부1skip, actualD11/22XSD와 reportF36 조건/대표2이미지 검토 통과. 원래 timing과 graphic appearance/MIDI 누락 진단을 구분한다.
- Integration DU 실제612files/5702tests+Node5 PASS, 외부 opt-in1skip, 21679입력 실행중/직후독립해시 불변. all3 baseline/profile explicit lock 유지. 실제 native/OS/외부 앱 승인은 아님.
- 테스트 공백 보완: actual generated source의 timing 존재를 먼저 단언해 red2fail20controls→B6files82/typeC. yes/no/생략 6source actual parser/native/XML/MIDI 같음·12XSD. 제품/renderer 수정은 아니다.
- 실제 DV614files/5737tests+Node5 PASS, 외부 opt-in1skip, 22304입력 실행중/직후독립 해시 불변. actual native/OS/글꼴 원래표시 복원 승인과 구분한다.
- 2026-11-08 AppA55876/B42867terminal0:동일8고유흐름·1/1/2/0경고/모든source경로/percent25/50/explicit0·Native16/8reopen/XML16/MIDI8/fullXSD20·PDF8(각1page)/96dpi8rasterSHA동일·source1480EY동일. B는A조건PDF보강(중복합산안함),제품/baseline변경없음.
- 동일FE/CB 제품1465의wholeAppchrome200/CDPcoarse4조건PASS: 반복30/혼합31경고·현재원본진단/끝glyph/reader와footer주입trustedwheel·72target·Native4보존. sourceXSD2/pinned해시대조/두대표이미지검토. 새제품/전체/PDF승인아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-016 · 임시표의 괄호·크기·주의/편집 지정 가져오기 손실 안내

- 현재: 비기본 accidental 괄호/크기/주의·편집 손실을 기존 한국어 report/status로 안내한다. redB16/15대조→C78/type/core1265·actual16/32XSD·report36/대표2이미지·격리H/profile/fixed·현재I와 최신DV614파일5737/Node5·22304불변을 통과했다. 원래 표시 모델/편집을 복원한 것은 아니다. 2026-11-09 같은FC/BW 전체App4대표사례×2폭8흐름·Native16/재열기8/XML16XSD/MIDI8/PDF8각1page·PNG8을 보강했다. source/control/copy12XSD·고유PDF3직접검토·6읽기조건 마지막glyph PASS. 2026-11-10 현재ET/1517소스에서전체chrome200%읽기16조건(경고12/무경고4)·fine/coarse양성·summary32/glyph40/버튼72·마지막glyph/2–3trustedwheel·읽기7키/선택/history를확인했다.
- 남은 범위: 현재GE721files6811/Node5와동일한1517소스에서전체chrome200%읽기는보강했다.원래강제natural/괄호·크기·주의/편집표시모델·편집과다른font/color/smufl,실제OSdialog/nativefocus/IME/SR/청음/외부앱·200%전체편집/파일출력은별도범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/noteheads.md)

수용 기준:

- 비기본 괄호/대괄호/주의/편집·작은 크기와 기본/no/full을 구분해 실제 source 손실을 first-red로 검증한다.
- 원래 값·source 위치·한국어 확인 행동을 보존하며 pitch/MIDI/native/명령/기보 모델은 바꾸지 않는다.
- 단일/반복/혼합 report와 실제 renderer를 적절히 구분하고 원래 강제 표시·스타일 편집 지원으로 과장하지 않는다.

검증:

- DU 동결 중 실제 in-memory Node 및 stdin pinned fullXSD18사례/36출력, zero file writes. actual terminal/독립 posthash 뒤 결과 기록. first-red/실제 glyph·PDF는 미실행.
- redA 구문 오류는 App 실패로 계산하지 않고 원문 보존. 제품 수정 전 redB16fail15controls→C6files78/typeD/core125files1265외부1skip. NodeD16/32fullXSD·reportF36조건/대표2이미지 통과, 원래 model/native/XML/MIDI 동일.
- 현재 격리 profile H(overlay-0)/fixed H PASS, 기준 갱신 없음. 이 제품 수정 이후 전체는 아직 없고 DU5702는 이전 결과다.
- 실제 DV614files/5737tests+Node5 PASS, 외부 opt-in1skip, 22304입력 실행중/직후독립 해시 불변. actual native/OS/글꼴 원래표시 복원 승인과 구분한다.
- 2026-11-09 actualB8파일흐름56파일·source/control/copy12fullXSD/actualXML16fullXSD·고유PDF3직접검토; C6읽기조건 마지막glyph strictHit·960각1wheel/1400각0. B51753/C76593exit0관측·현재코드1463FC동일·baseline불변. 기존history0/payload보존이며 새로운undo1아님.
- 2026-11-10 현재ET의전체chrome200%16읽기조건(경고12/대조4),fine/coarse양성/summary16→32·glyph40유지/technicalbutton72px·엄격source원문/마지막glyph·2–3trustedwheel/scrollend·안내선택7키/score선택·dirty/history0/transport유지PASS.기존원본4해시/pinnedXSD PASS.다음import/메뉴는100%이며새Native저장/PDF/물리승인이아니다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-017 · 한 시점 마디의 온음표·가사 첫 박 위치

- 현재: 단위3red/실제잉크4red후공유singleonset여백fallback수정. 관련25/type·최신BY actualF12/Native24재열기12XML24XSDMIDI12PDF12·머리pointer28, public파트H6/Native12재열기6PDF6pointer6·Help2강화I/profile/fixed PASS. 모델/음악바이트·온마디쉼표/단일보표대조PDF는보존했다. FD677files6464tests/Node5·외부1skip/1245.71초·43019입력실행중/직후독립해시가통과해이름있는수용범위를마무리했다.
- 남은 범위: 이하위작업의짧은가사/peeronset/온마디쉼표첫박수용범위는완료했다. 부모025의긴가사/코드추가실제잉크감사·표시모델/스타일/물리OS/IME/SR/외부GUI범위는이완료와별개다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/shared-rhythm-layout.ts](../../src/renderer/src/notation/shared-rhythm-layout.ts), [src/renderer/src/notation/shared-rhythm-single-onset.test.ts](../../src/renderer/src/notation/shared-rhythm-single-onset.test.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/formatting/systems-and-horizontal-spacing.md)

수용 기준:

- 한시점음표가마디여백절반만큼이동하지않고짧은가사/다른보표의후속음추가만으로첫박anchor가바뀌지않는다.
- 같은tick의음표정렬과온마디쉼표의독립중앙정렬을보존한다.
- 실제960/1400의glyphink·hit/Native/XML/MIDI/PDF를검증하고새전체결과를기록한다.

검증:

- 단위C3assertionred 및실제BW B의D수용검사8중4red/4대조를제품수정전에보존. 초기secondarytarget가정QA오류는별도다.
- 수정후 E3files25tests 및type E PASS. isolated BXbuild PASS,실제green출력은후속.
- BY actualF12/H6현재조건·strictInjectedPointer34·Native36/reopen18/XML24fullXSD/MIDI12/PDF18각1page·source/copy12XSD; HelpG/I동일2조건강화·G초기capture증거제외/I후속직접검토. profile/fixedbaseline불변. F/H원래terminal0관측·전체FD후속.
- 실제FD677files6464tests/Node5 PASS,외부opt-in1skip/1245.71초.43019개실행중382.42초·원래60171terminal→즉시독립65558terminal/receipt본문READ전수정없음·변경0.
- FD동일1464/BZ QA-only: 긴가사/held0tick코드/fullrest0tick코드×2폭6흐름42파일·Native12재열기6/XML12XSD/MIDI6/PDF6각1page/주입pointer6,sourcecopy6XSD. 실제잉크·같은lane여백6조건/고유3PDF·960화면검토PASS. 제품/baseline변경없음·새전체반복없음.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-004 · 모델 범위 밖 메트로놈 빠르기 변환의 손실 안내

- 현재: 실제7red 후 기존 fallback/모델/MIDI를 바꾸지 않는 원래값·적용값·음가/점·source 진단을 추가했다. focused8files121/typecheck, data12cases24fullXSD 및 이전runtime 전체모델/XML/MIDI 동일. actual component/격리 제품/전체DW 대기. 최신DW618files5786+Node5/외부1skip·22825입력 직후 독립해시 동일, current buildG/profile/fixed 및 actual combined notation36/report36/componentPDF12 PASS. 좁은 수용범위 완료, 미배포.
- 남은 범위: 원래 수치·단위·source 위치와 기존 fallback의 손실 안내를 먼저 구현한다. 현재 numeric native범위(0,1000]·저작40–240·legacy 밖값 fallback·direct-sound 정책을 임의로 바꾸지 않는다. 원래값 지원/가져오기 거부 정책은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- native-valid40/360/1000과 현재 direct-sound 대조를 유지하고 확인된 metronome 수치 손실만 first-red로 안내한다.
- 원래값/로컬 beat-unit/dots·적용 또는 fallback의 정확한 의미/source를 보존하고 이웃파트/offset·기존 수치 우선순위를 바꾸지 않는다.
- 현재 fallback 음악 결과를 임의 변경하거나 native/저작 범위를 늘리지 않는다. actualMIDI/native/XML·한국어 report/status·취소/실패/교체 계약을 검증한다.

검증:

- 7red5controls→focused121/typecheck PASS; 12cases/24fullXSD와 기존 모델/native/XML/MIDI 동일. native/authoring 범위·기존 fallback 변경 없음. 최신 실제 UI/전체DW는 대기.
- DW cumulative: 618files/5786tests+Node5 PASS; external opt-in1file/1test skip;22825 inputs stable in-run and independent immediate postexit. Current isolated G build/profileoverlay0/fixed PASS. Source/copy pure notation36/report36/PDF12 component-only; native/OS/IME/SR/audio/external pending.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-006 · 미지원 메트로놈 기준 음가의 변환·재생 손실 조사

- 현재: 사용자가 동등한 빠르기로 환산·표현 불가 시 거부를 승인했다. EA 실제 종료/독립해시 뒤 first-red A15/B17로 기존 잘못된clock·누락경고·거부경로를 재현했다(A의position assertion은Q와기존hiddenwords정책으로 보정하고B도17red). 기존 음가/BPM/dots로 변환하는 private parser와 Korean 진단 adapter를 구현했다. 현재 관련9files138/type 통과,production/누적전체대기. EB 실제628files5935tests/Node5·외부1skip,25064실행중·직후독립해시 유지로 승인된 작은 환산 범위를 완료했다.
- 남은 범위: 원래 unsupported glyph를 복원하는 기능이 아니다. 지원 음가로 바뀐 표기와 동등한 clock을 안내하고 표현불가는 현재 문서를 보존해 거부한다. 기존 지원 음가의 legacy수치정책/독립sound·part·offset/MIDI한계를 보존한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 지원되는64th 대조 및 기존 numeric/text/explicit sound·part/position/offset 정책을 보존한다.
- 미지원 source 단위가 원래/적용 음가 및 실제 clock에 미치는 결과를 first-red와 기존 field representability로 분리한다. 기존 fallback을 바꿀 경우 정책·범위를 먼저 명확히 한다.
- 진단만 구현하면 원래 기보/재생을 복원한 것으로 보고하지 않는다. 모델/native/XML/MIDI/실제 보고서와 오류·재시도 범위를 대조한다.

검증:

- DW 동결 중 readonly16case/32fullXSD 및 실제 SMF 대비3사례만 확인했다. 원래 source·first-red·제품 수정·actual glyph/PDF/외부앱은 아직 미검증.
- Actual existing fields/native/copy/data-only piano clock5cases/9fullXSD capability check; unsupported target/native maximum7500 quarterBPM established. Product conversion is NOT implemented; concrete policy question pending.
- 승인 후 first-red B17→관련9files138/type PASS. 이 결과는 실제 importer 구현을 포함하며 과거 representation-only와 구분한다. production/XSD산출물/보고서/누적전체는 대기.
- K isolated productionbuild/profile overlay0/fixed/manual4/4doc/scoped whitespace PASS. Current importer/native/XML/MIDI/data-onlyclock9cases17fullXSD; actual pure existing UI36conditions/18representative960 images reviewed. No unsupported-glyph restoration or new PDF/OS/physical/audio/external approval. New cumulative EB/independent hashes pending.
- EB 전체628files5935tests+Node5/external1skip,1055.08초/exit0.25064입력 실행중 및 즉시 독립해시 일치. source/copy17fullXSD 및 native/MIDI/data-onlyclock와 pureUI/render gate를 포함한 제한범위 승인.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-007 · 지원되는 가져온 빠르기 기준 음가의 선택기·위치 안내 보존

- 현재: 실제 App 6개 실패/3개 대조군 뒤 private adapter를 수정했다. E10파일41검사/type, 숨김 UI48조건·대표12검토 및 F 격리 build/profile overlay0/fixed/manual4/문서 검사 통과. 최신 전체 DY는 대기이며 DX는 수정 전이다. 누적 DY623파일/5878검사+Node5/외부1skip과 고정23900입력 실행중·종료직후 독립 해시까지 통과했다. 좁은 수용 범위만 완료, 미배포.
- 남은 범위: 현재지원되는저장값을정확히표시하고확인차열기→Tab/Escape만으로score/clock/dirty/history가바뀌지않아야한다. 미지원unit006정책과별개이며기본저작선택지·native/schema/공통API를임의확장하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [packages/ddirori_web/src/basic.tsx](../../packages/ddirori_web/src/basic.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 실제메뉴import/기존field에서32nd/64th/dots3표시·bareopen→Tab·Escape를first-red로대조한다.
- 기존값만조건부로표현하고기본저작선택지·공통API·명령/enablement/IME를보존한다. disabled current옵션만추가해다시firstenabled가확정되는대체는금지한다.
- 선택/caret/dirty/undo·native재열기·XML/MIDI/기존음가clock과960/1400보고서/선택기실제표시를확인한다. 원래기보glyph/fontmetrics/geometry를바꾸지않는다.

검증:

- A6failed3controls→B6files22/type,Cnew10tests(명시편집undo/redo추가),E최신10files41/type PASS. 실제Appjsdom bareopenTab/ArrowEscape/Nativepayload/reopen/quarterBPM/SMF/selection/history보존. ActualhiddenUI D48(initialonly)·12logical960capturesreviewed. Actualnative/OS입력/팝업승인은아니다. 최신wideDY/currentbuild대기.
- 현재 F build/profile overlay0/fixed/manual4/문서 검사 통과. 기존 전체 DX를 이 UI 수정의 승인으로 재사용하지 않으며 다음 누적 DY를 대기한다.
- DY 실제 terminal0:623파일5878검사+Node5 PASS,외부opt-in1파일1검사 skip,1036.03초. 고정23900입력 실행중/직후독립 해시 동일. 원래 jsdom 경고 로그를 보존했다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-005 · 메트로놈 범위·근사 문구의 기존 표시 필드 보존 조사

- 현재: 23red를 기존 표시/숫자 field로 수정했다. focused229/typecheck, native/XML/MIDI14cases+28fullXSD, actual notation36/report24·component PDF12쪽 검토 PASS. 최신 전체·격리 제품 profile/fixed는 대기이며 DV는 수정 전이다. 최신DW618files5786+Node5/외부1skip·22825입력 직후 독립해시 동일, current buildG/profile/fixed 및 actual combined notation36/report36/componentPDF12 PASS. 좁은 수용범위 완료, 미배포.
- 남은 범위: 경고만으로 축소하지 말고 기존 TempoMarking.text·숫자 tempo 필드로 보존 가능한 범위를 first-red로 구현한다. 명확한 sound quarterBPM의 단위/점 변환과 기존 explicit words 우선순위·numeric 정책을 대조한다. 값이 없을 때 BPM을 추측하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 범위/suffix label은 기존 표시 필드로 실제 보존하고 plain numeric/native-valid·explicit words/transparent·상대위치·native/XML/MIDI를 보호한다.
- nonnumeric per-minute와 명확한 유효 sound는 기존 fallback 의도·unit/dots math로 가능한지 actual control로 확인한다. 무조건 오류 안내만 덧붙이는 쉬운 대체를 최종 해결로 보지 않는다.
- 사용 가능한 재생값이 없으면 새 BPM을 추측하지 않고 지원 한계/기존 문서 보존·retry를 명확히 안내한다. strictnumeric 우선순위/독립 offset 정책을 근거 없이 바꾸지 않는다.
- 표시 문구가 길어지는 실제960/1400·native 재열기/출력과 글꼴·수동 geometry를 적절히 검증하며 새 schema/기보폰트/작곡 의미를 만들지 않는다.

검증:

- focused12files/229 PASS; 14cases/28fullXSD; actual component notation36/report24; PDF12쪽, 고유6쪽 직접 검토. 최신 전체는 다음DW 대기.
- DW cumulative: 618files/5786tests+Node5 PASS; external opt-in1file/1test skip;22825 inputs stable in-run and independent immediate postexit. Current isolated G build/profileoverlay0/fixed PASS. Source/copy pure notation36/report36/PDF12 component-only; native/OS/IME/SR/audio/external pending.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-029-002 · 페이지 추가 글자·음악 기호의 가져오기 손실 안내

- 현재: 18red5controls→기존 parser/report만 수정. focused42/typecheck·broad132files1349/external1skip, data20cases40fullXSD·기존model/decodednative.score/XML/MIDI동일, pure actualreport48·대표12화면검토PASS. 최신제품build/profile/fixed/전체DX대기. root metadata fallback/glyph/page배치복원은아니다. 최신DX620files5829+Node5/외부1skip·23351입력 종료직후독립해시 동일, currentI build/profile/fixed/manual PASS. 좁은진단범위완료·미배포.
- 남은 범위: 지원 metadata와 다른 credit words/symbol source 손실을 기존 report로 안내하는 범위를 audit한다. 제목/작곡가 중복·rights 기존진단은 중복하지 않고 페이지별 source를 보존한다. freeform 페이지 모델/제목 fallback/프레임 복원은 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/formatting/using-frames-for-additional-content.md), [참고 2](https://handbook.musescore.org/text/header-and-footer.md)

수용 기준:

- 원래 페이지/type/각 credit-words·credit-symbol source를 first-red로 대조하고 가짜 part/measure 위치를 만들지 않는다.
- 같은 title/composer metadata·빈/본문/없음 controls에 허위 content 경고를 만들지 않고 rights/image 진단을 보존한다.
- 반복 root-page family를 접을 경우 기존 API의 페이지별 상세 명칭을 사용하고 혼합 보고서는 모든 원문/위치를 유지한다.
- score/native/XML/MIDI·현재 title/composer 우선순위와 기보를 유지하고 아직 실제 glyph/레이아웃 복원한 것처럼 보고하지 않는다.

검증:

- focused6files42/typecheck PASS; broad132files1349/external1file1test skip. Original D invalid empty symbol fixture failure retained; E valid20cases40fullXSD and prior model/native.score/XML/MIDI same. Actual pure reportF48/default disclosure/source paths/fine32/coarse48/componenttext200,12logical960captures reviewed. Latest cumulative/isolated product gates pending.
- After the invalid-empty-symbol fixture finding, added20 normative source/copy full offlineXSD regressions to core. Current focusedI2files43/typecheck PASS; original red18/controls5 and broadG1349 kept historical.
- DX actual620files5829tests+Node5 PASS/external1file1test skip/1030.64sec;23351inputs stable in-run and immediate postexit. CurrentproductI/profileIoverlay0/fixedI/manual4+doc/whitespace PASS. Component/native/OS scopes remain distinct.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-011 · 추가 저자 메타데이터의 MusicXML 손실 안내 조사

- 현재: 실제 18개 실패/21개 대조군을 재현한 뒤 root creator 손실 진단과 한국어 안내를 구현했다. 관련4파일82검사/type, 데이터18사례36건 pinned XSD 및 이전 model/decodednative.score/XML/MIDI 동일, 실제 순수 보고서48조건 통과. 현재 제품 build와 전체 DY는 아직 대기한다. 누적 DY623파일/5878검사+Node5/외부1skip과 고정23900입력 실행중·종료직후 독립 해시까지 통과했다. 좁은 수용 범위만 완료, 미배포.
- 남은 범위: rootidentification.creator별원래역할/이름/위치손실을기존report로안내한다. 기존첫composer·빈입력·제목우선순위·projectmodel을바꾸거나저자를임의합치지않는다. part범위identification·범용ProjectProperties편집기는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/header-and-footer.md), [참고 2](https://handbook.musescore.org/file-management/project-properties.md)

수용 기준:

- root추가creator의내용있는role/name손실만원래identification.creator[n]으로first-red;가짜part/measure/page를만들지않는다.
- 기존첫composer/duplicate같은이름/empty및rights·credit진단을구분하고모델·decodednative.score/XML/MIDI·저장/선택/undo를보존한다.
- 반복metadata는기존report로요약하되페이지나마디로잘못표시하지않고원문/위치와single/mixed를유지한다. 범용메타데이터편집·집계·titlefallback은추가하지않는다.

검증:

- A18failed21controls→B4files82/type PASS. 데이터 C18사례36 XSD·실제 D48조건을 통과했다. 현재 전체 App-native/OS/물리입력 검증이나 다중 저자 모델 구현은 아니다. 현재 build와 넓은 DY 대기.
- DY 실제 terminal0:623파일5878검사+Node5 PASS,외부opt-in1파일1검사 skip,1036.03초. 고정23900입력 실행중/직후독립 해시 동일. 원래 jsdom 경고 로그를 보존했다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-002-004 · 현재 박자표 값을 열고 닫을 때의 선택기 보존

- 현재: 실제 App A/B3실패/5대조군에서7/8·11/8이 단순 열기→Tab으로2/4가 됨을 재현했다. private adapter의enabled-current/알 수 없는 preset fallback 차단을 수정했다. G8파일23/type, 실제 pure UI36/대표12검토 PASS. 현재build와누적전체대기. EA 실제626파일5907검사+Node5/외부1skip,24628실행중·직후독립해시 유지로 해당 보존 범위를 완료했다. DZ 실패는 보존한다.
- 남은 범위: 현재 지원되는 마디의 단순 열기→Tab/Escape를 실제 App에서 확인하고 결함일 때만 기존 adapter로 수정한다. 공통 API/총보 박자 적용 정책/schema를 확장하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [packages/ddirori_web/src/basic.tsx](../../packages/ddirori_web/src/basic.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures.md)

수용 기준:

- 기존7/8 또는11/8의 실제 메뉴/필드를 열고 Tab/Escape만 누른 뒤 score/선택/history/native/XML/MIDI를 대조한다.
- 명시적인 다른 박자 선택·적용 범위·한 undo/redo는 대조군으로 유지한다.
- 조표/음자리표는 실제 enablement와 handler를 먼저 읽고 새 재현 없이 결함이라고 하지 않는다. 공통 소스를 복사하거나 새 API를 만들지 않는다.

검증:

- A/B3red5controls→G8files23/type PASS. Native payload/reopen/selection/XML/MIDI 및 실제 음표+쉼표 보존을 확인했다. ActualpureUI36/대표12이미지 검토 PASS, actualnative/OS/팝업 조작과 구분한다. 현재build/누적전체대기.
- 합본 I build/profile overlay0/fixed/manual4/문서·공백 검사 및 최신 의도적 키보드 대조 포함 F4files31/type PASS. 현재 누적 DZ는 대기이며 DY는 이 수정 전이다.
- DZ 전체는625files5905passed/1file2failed/external1skip,Node미실행이다. 고정24457입력의실행중·직후독립해시동일. workspace2개의stale disabled기대를 검토·갱신하고 focused2/226필터제외·type PASS,제품구현변경없음. 새 EA전체gate를 대기한다.
- EA626files5907tests/Node5/external1skip,1047.47초.24628입력 실행중·즉시 독립해시 동일. 기존 Jbuild/profile overlay0/fixed/manual4/문서gate와 합산한 좁은 범위 승인이다. 후속006 제품변경의 전체PASS는 아니다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-029-003 · 작품·악장 정보와 작품 모음 연결의 MusicXML 손실 안내

- 현재: A실제2files11red/17controls뒤 root 작품번호·악장번호·별도제목의내용손실안내를추가했다. 기존title우선/빈값/같은제목·fallback/native/XML/MIDI는그대로다. C관련7files133/type,현재13원본26fullXSD,actualpureUI48초기조건+8끝행geometry/대표24이미지검토통과. currentbuild/누적전체대기. EC전체631files5986tests/Node5·외부1skip,25591실행중·직후독립해시 유지로 원래정보손실안내 범위를 완료했다. 2026-11-08 같은root메타데이터의work/opus연결무경고손실을A8FAIL/10PASS·AppB4FAIL/1PASS로재현해진단/한국어요약만추가했다. 기존3필드완료는유지하며추가범위의C4files54/typePASS,source/copy18XSD통과. 새모음모델/URI열기/보존지원은아니다. 추가production/data/다음전체전이라in-progress다. 현재Y격리build/profile overlay0/fixed/manual4·문서4/piano/diff,실제data9source/copy18XSD/native파일bytes/MIDI,실제pure report48초기+8DOM끝좌표/대표960이미지2검토도통과했다. 최신누적전체전이다. EG 전체 639파일/6046검사·Node5 PASS, 외부 opt-in 1skip, 1072.62초/exit0. 27397개 입력의 실행 중·종료 직후 독립 해시를 확인하여 추가 work/opus 진단의 명명된 범위를 완료했다.
- 남은 범위: 내용 있는 번호와 현재 제목에 나타나지 않는 별도 제목만 원래 root 경로로 진단한다. 제목을 합치거나 섹션/프레임/프로젝트 모델을 새로 만들지 않는다. work/opus는작품번호와다른모음문서연결이며링크내용을root경로로진단만한다. 빈href도XSD유효한명시노드이므로부재와구분한다. URI를읽거나원본관계를복원하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/formatting/using-sections-for-multiple-movements-or-songs.md), [참고 2](https://handbook.musescore.org/file-management/project-properties.md)

수용 기준:

- work.work-number, movement-number, 서로 다른 movement-title의 원문/root경로를 first-red로 확인한다.
- 빈 번호/같은 제목/악장 제목만 있는 대조군과 기존 title 우선순위/model/native/XML/MIDI를 보존한다.
- rights/creator/credit와 혼합해도 잘못된 페이지/마디/저자 요약을 만들지 않는다. 새 model/제목 자동 합치기/section 지원으로 과장하지 않는다.
- work/opus의상대/외부URI·속성·대체namespace·빈href·제목fallback/혼합진단과부재를대조하고root진단/한국어행동·기존score/native/XML/MIDI를보존한다. XSD정합성을URI대상/외부앱호환성PASS로확대하지않는다.

검증:

- 기존 coverage → 실제 재현/대조군 → 필요한 수정 → focused/typecheck → 현재 격리 build/실제 UI → 문서. full을 반복해 새 성과로 계산하지 않는다.
- A11FAIL/17PASS→C7files133/type. Actualsource/copy26fullXSD/native/MIDI13cases,existingpure report48initial/8DOMscroll-end geometry and24representative960images reviewed. ActualOS/native/physicalIME/SR/wholeApp200/audio/external/PDF approval is not claimed.
- EC actual631files5986tests+Node5/external1skip,1096.98초/exit0.25591입력 실행중 및 실제종료직후 독립해시일치. 원래정보복원/metadataeditor/section/frame/외부앱지원승인은아니다.
- 2026-11-08 Opus A8FAIL/10PASS·AppB4FAIL/1PASS→C4files54/typePASS. 새23회귀의source9/copy9fullofflineXSD와기존26XSD포함;추가production/다음전체대기. 기존EC3필드완료는역사적scope로유지.
- Y production gate PASS, data9/18fullXSD·pinned3해시동일,actualpure report48initial+8DOMscroll-end geometry. 대표960darktext200두이미지만직접검토. 실제OS/native/wholeApp200/physicalIME/SR/audio/external/새PDF승인아님. 최신전체대기.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-044-002 · 장·단조 미지정 조표의 선택기 값 보존

- 현재: C 조표3red 뒤 현재 미지정mode 옵션을 활성으로 유지하고 알 수 없는ID fallback을 막았다. F관련171/type·실제UI H84조건/대표16검토, 최신의도적키보드포함그룹31통과. 누적전체대기. EA 실제626파일5907검사+Node5/외부1skip,24628실행중·직후독립해시 유지로 해당 보존 범위를 완료했다. DZ 실패는 보존한다.
- 남은 범위: 기존 저장값을 열고 닫는 것만으로 악보·재생·이력이 바뀌지 않아야 한다. 새 저작 모델이나 공통 API를 늘리지 않고 명시적 변경/적용범위/undo를 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [packages/ddirori_web/src/basic.tsx](../../packages/ddirori_web/src/basic.tsx), [src/renderer/src/App.current-signature-preservation.test.tsx](../../src/renderer/src/App.current-signature-preservation.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/key-signatures.md)

수용 기준:

- bare열기→Tab/Escape가 score/선택/history/native/XML/MIDI를 보존한다.
- 명시적마우스·ArrowDown/Tab변경은원래적용범위/명령1회/정확undo로유지한다.
- 현재디자인시스템/공통컴포넌트/토큰을재사용하고960/1400·theme·component200·fine/coarse를검증한다. 실제OS/IME/SR과구분한다.

검증:

- 실제first-red→관련App/core/type/순수컴포넌트UI검사통과. 현재합본build/누적전체는아직대기다.
- 합본 I build/profile overlay0/fixed/manual4/문서·공백 검사 및 최신 의도적 키보드 대조 포함 F4files31/type PASS. 현재 누적 DZ는 대기이며 DY는 이 수정 전이다.
- DZ 전체는625files5905passed/1file2failed/external1skip,Node미실행이다. 고정24457입력의실행중·직후독립해시동일. workspace2개의stale disabled기대를 검토·갱신하고 focused2/226필터제외·type PASS,제품구현변경없음. 새 EA전체gate를 대기한다.
- EA626files5907tests/Node5/external1skip,1047.47초.24628입력 실행중·즉시 독립해시 동일. 기존 Jbuild/profile overlay0/fixed/manual4/문서gate와 합산한 좁은 범위 승인이다. 후속006 제품변경의 전체PASS는 아니다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-005-002 · 기존 음자리표의 마디·보표 선택기 값 보존

- 현재: C clef6red(타악기/TAB/옥타브×마디/보표전체) 뒤 현재옵션을 활성으로 유지했다. 기존fields와동일적용범위/undo를검증했다. 실제UI H84/대표16검토 및최신그룹31/type통과. 누적전체대기. EA 실제626파일5907검사+Node5/외부1skip,24628실행중·직후독립해시 유지로 해당 보존 범위를 완료했다. DZ 실패는 보존한다.
- 남은 범위: 기존 저장값을 열고 닫는 것만으로 악보·재생·이력이 바뀌지 않아야 한다. 새 저작 모델이나 공통 API를 늘리지 않고 명시적 변경/적용범위/undo를 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [packages/ddirori_web/src/basic.tsx](../../packages/ddirori_web/src/basic.tsx), [src/renderer/src/App.current-signature-preservation.test.tsx](../../src/renderer/src/App.current-signature-preservation.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/clefs.md)

수용 기준:

- bare열기→Tab/Escape가 score/선택/history/native/XML/MIDI를 보존한다.
- 명시적마우스·ArrowDown/Tab변경은원래적용범위/명령1회/정확undo로유지한다.
- 현재디자인시스템/공통컴포넌트/토큰을재사용하고960/1400·theme·component200·fine/coarse를검증한다. 실제OS/IME/SR과구분한다.

검증:

- 실제first-red→관련App/core/type/순수컴포넌트UI검사통과. 현재합본build/누적전체는아직대기다.
- 합본 I build/profile overlay0/fixed/manual4/문서·공백 검사 및 최신 의도적 키보드 대조 포함 F4files31/type PASS. 현재 누적 DZ는 대기이며 DY는 이 수정 전이다.
- DZ 전체는625files5905passed/1file2failed/external1skip,Node미실행이다. 고정24457입력의실행중·직후독립해시동일. workspace2개의stale disabled기대를 검토·갱신하고 focused2/226필터제외·type PASS,제품구현변경없음. 새 EA전체gate를 대기한다.
- EA626files5907tests/Node5/external1skip,1047.47초.24628입력 실행중·즉시 독립해시 동일. 기존 Jbuild/profile overlay0/fixed/manual4/문서gate와 합산한 좁은 범위 승인이다. 후속006 제품변경의 전체PASS는 아니다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-015-001 · 기존 사용자 지정·혼합 파트 이조의 선택기 값 보존

- 현재: A2red2controls 뒤 custom현재값만활성으로유지했다. 일반파트customdisabled/기본6프리셋유지. E11파일59, 최신F4파일31/type·실제UI36/대표12검토통과. 누적전체대기. EA 실제626파일5907검사+Node5/외부1skip,24628실행중·직후독립해시 유지로 해당 보존 범위를 완료했다. DZ 실패는 보존한다.
- 남은 범위: 기존 저장값을 열고 닫는 것만으로 악보·재생·이력이 바뀌지 않아야 한다. 새 저작 모델이나 공통 API를 늘리지 않고 명시적 변경/적용범위/undo를 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [packages/ddirori_web/src/basic.tsx](../../packages/ddirori_web/src/basic.tsx), [src/renderer/src/App.current-transposition-preservation.test.tsx](../../src/renderer/src/App.current-transposition-preservation.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/transposition.md)

수용 기준:

- bare열기→Tab/Escape가 score/선택/history/native/XML/MIDI를 보존한다.
- 명시적마우스·ArrowDown/Tab변경은원래적용범위/명령1회/정확undo로유지한다.
- 현재디자인시스템/공통컴포넌트/토큰을재사용하고960/1400·theme·component200·fine/coarse를검증한다. 실제OS/IME/SR과구분한다.

검증:

- 실제first-red→관련App/core/type/순수컴포넌트UI검사통과. 현재합본build/누적전체는아직대기다.
- 합본 I build/profile overlay0/fixed/manual4/문서·공백 검사 및 최신 의도적 키보드 대조 포함 F4files31/type PASS. 현재 누적 DZ는 대기이며 DY는 이 수정 전이다.
- DZ 전체는625files5905passed/1file2failed/external1skip,Node미실행이다. 고정24457입력의실행중·직후독립해시동일. workspace2개의stale disabled기대를 검토·갱신하고 focused2/226필터제외·type PASS,제품구현변경없음. 새 EA전체gate를 대기한다.
- EA626files5907tests/Node5/external1skip,1047.47초.24628입력 실행중·즉시 독립해시 동일. 기존 Jbuild/profile overlay0/fixed/manual4/문서gate와 합산한 좁은 범위 승인이다. 후속006 제품변경의 전체PASS는 아니다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-011 · 문서 교체 중 선택기의 임시 후보 소유권 검증

- 현재: 명명된 현재 선택기의 문서 소유권을 실제 재현하고 기존 documentGeneration/private 경계와 voice identity로 보완했다. EC 이후 App키5줄/VoiceMove Select키1줄·새37회귀를 포함한 EF637파일6023검사/Node5·외부1skip,1078.90초/exit0 및26919입력 실행중/직후독립해시가 통과했다. 현재135/type/W격리build/profile/fixed/manual4·문서/piano gate도 통과했다. Native view/score/selection/XML/MIDI/history와전역workspace/session설정을유지한다. 모든UI비동기전환이나실제OS/native/physical검수완료는아니다.
- 남은 범위: 현재값 보존과 문서/대상 소유권은 별개다. 새 문서가 열린 뒤 이전 선택기의 후보를 그대로 확정하지 않는지 실제로 확인한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-002-004, SMG-044-002, SMG-005-002, SMG-015-001
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [packages/ddirori_web/src/basic.tsx](../../packages/ddirori_web/src/basic.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/opening-and-saving-scores.md)

수용 기준:

- 실제 공개 메뉴로 지연된 Native 열기와 기존 선택기 후보를 조작하고 새 프로젝트/같은 ID 재사용/취소/실패를 대조한다.
- 새 문서 score/dirty/selection/undo/native/XML/MIDI를 보존하고 이전 후보를 확정하지 않아야 한다. 새 문서에서의 명시적 선택은 기존 명령1회/undo1회로 유지한다.
- 실제 결함만 기존 generation/target adapter로 고친다. 열기 우선순위/확인·파일 bridge·공통 API·모델을 바꾸거나 테스트 전용 경로를 만들지 않는다.

검증:

- 읽기 전용 source 조사와 기존 file/focus coverage 확인까지만 했다. 실제 first-red/제품 수정/추가 GUI 검증은 아직 없다.
- B5red/2controls→E7files94/type PASS. 새회귀20개(동일ID정상문서교체no-op5/취소·실패10/새명시선택한undo·redo5)를포함한다. C의중복키12실패/34통과로그보존. 실제OS/native입력/물리focus승인은아니다.
- EC631files5986tests/Node5·외부1skip,25591실행중·직후독립해시동일. 다만StudioLyricTools추가source-only후보가있어전체child완료로해석하지않는다.
- 2026-11-08 가사A3FAIL/2PASS→C4files47PASS,제품App1줄키변경/새회귀7. typeB PASS; 실제native/OS/물리IME/SR/청음/새PDF승인은아니다. 다중보표inventory·production/누적전체대기.
- 2026-11-08 보표 B2FAIL/3PASS 뒤 private InputTarget key 1줄. D5files53PASS(가사7/보표6 새 사례),type/R격리build/profile overlay0. 기존 음자리표 비활성화/단일보표 guard도 유지한다. 새 누적전체와 실제 OS 입력 승인은 별도다.
- ED633files5999tests+Node5/external1skip,1064.29s/exit0.26177입력실행중/직후독립hash동일;초기production/실제OS/native입력승인구분. 트레몰로추가후보는재현전.
- ED 이후 트레몰로 A2FAIL/3PASS→B6files58PASS/type. 새5회귀/제품App key1줄. ED633/5999는이한줄전이며새누적전체/production은별도. 실제OS/native입력승인아님.
- 성부대상 pure A1FAIL/3PASS,App B2FAIL/2PASS→C10files72PASS/type. 기존identity/privateSelect key1줄,실제이동별도버튼/한undo/다른파트·슬러·Native/XML/MIDI보존. ED633/5999이후두제품줄/새11검사,Uproduction/다음전체대기.
- U격리build/profile overlay0/fixed/manual4/문서4/piano/diff PASS. 최신C10files72/type와함께확인,baseline변경없음. 다음EE전까지추가범위/integration은in-progress.
- EE635files6010tests+Node5/external1skip,1094.46s/exit0;26550입력실행중/직후독립hash동일. 최신트레몰로/성부대상두줄/새11회귀포함. 실제OS/physical/외부승인아님. 남은spanpicker는재현전.
- EE뒤spanpicker A2FAIL/3PASS→B12files125/typePASS. App privateSpanProperties 문서키1줄;상세placement/endpoint미노출guard·native/XML/MIDI/history0보존. 실제geometry변경실패나OS승인아님.
- EE뒤span/view 두 제품키·새13회귀. View A4FAIL/4PASS→B13files135/typePASS. mode/part후보·선택·Native view/score/XML/MIDI/history0대조. 원래보기정책/기보geometry변경없음;현재W/다음전체는별도.
- 현재W production gate PASS. selector-inventory는source분류와실제App대조를구분한다. 전역PNG/필터session설정·팔레트/도크/단축키를문서score명령으로자동전환하지않았다. EF최신전체대기.
- EF637files6023tests+Node5/external1skip,1078.90s/exit0;26919입력실행중/직후독립hash동일. named inventory와명명된App/nativeadapter회귀범위done. 실제OS/native/physical/SR/외부/새PDF·모든비동기전환승인아님.
- 후속동일문서history소유권회귀8/관련3파일33/type·EN actual두폭8흐름Native24/재열기·실제잉크pointer/공개선택기DOM키PASS.제품수정아닌coverage이며GC에포함예정이다.
- 후속selectorhistory8사례는GC718파일6801검사/Node5에포함됐으며고정62634입력이불변이다.실제OS/물리키승인은별도다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-001 · Native 파트 ID의 MusicXML 형식 적합성

- 현재: 사용자가 XML 출력 전용 ID 매핑과 원본 Native 보존을 승인했다. 유효 ID를 먼저 예약하고 score-part/part 참조에 같은 고유 ID를 사용한다. 유효한 한글·악센트·결합문자 꼬리는 유지하고 공백·콜론·제어문자 등의 출력만 변환한다. core/App red-e 13실패/4대조 후 구현했고 관련7파일79검사와 별도 생성21사례/두모드42XML 전체 XSD·Native/view/MIDI 보존을 확인했다. type-h는 테스트 double의 filePath 누락으로 실패했으며 실제 반환 타입에 맞게 보완했다. 누적 전체와 실제 renderer 파일 QA는 후속이다. 최신 core/App/manual3파일51검사·type-k·AJ격리build,올바른profile-ak/fixed-ak도통과했다. 실제AJ전체App-j는960파트보/1400총보·12밀도+기술2, Native2저장/재열기·XML저장2/두사본4/MIDI2를확인했고독립6XML전체XSD·Native/view/기보/MIDI도같았다. J대표2이미지를직접검토했다. App-i의10회표시는파트명Piano 1과수정0회가붙은QA정규식오류이며실제Text요소를검사하도록고쳤다. 현재누적전체는아직전이다. 최종 도움말 반영 AL build/profile/fixed·실제App-l2흐름/12밀도+기술2·Native2/XML6XSD/MIDI2와 L대표2이미지 별도 검토도 통과했다. 마지막 전체EI이후033002와합친EJ누적을다음에실행한다. EJ 전체645파일/6,114검사·Node5 PASS,외부1skip/1157.70초이며30,323개실행중/실제terminal직후독립해시도같았다. 이 명명범위의 수용조건은 완료했다.
- 남은 범위: 명명한 범위는 완료·미배포다. 실제OS/native입력·물리IME/터치·SR/whole-App200·청음·외부소비자는 별도 미검증이며 parent 전체지원으로 확대하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/project/schema.ts](../../src/project/schema.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 원본/native ID·파트 설정·선택·undo·수동 geometry·음악 의미를 유지한다.
- 유효한 영문·한글은 유지하고, 승인한 출력 정책을 실제 실패 회귀 후 구현한다.
- 출력 매핑 선택 시 모든 유효 ID를 먼저 예약하고 score-part/part 참조의 일치·충돌 회피·결정성과 변환 안내를 확인한다.
- 전체/파트, 구조 유지/반복 펼치기, 실제 App bridge XML을 pinned 전체 XSD와 MIDI/Native로 확인한다.
- 기존 저장 안전성 assertion을 약화하지 않으며 내부 XSD를 외부 앱 성공으로 보고하지 않는다.

검증:

- 실제 core/Native 7사례: 영문·한글 XSD PASS, 나머지 5사례 exit 3. App 감사 2사례 수집 완료이나 공백 XML은 XSD 실패.
- 승인 후 failure-first focused/typecheck 및 필요한 격리 production QA와 전체 test:all.
- 문서 verifier와 scoped diff check, XSD 3파일/실제 산출물 해시 기록.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-001 · MusicXML 음표별 악기 지정 손실 안내

- 현재: 전체 XSD가 유효한 원본에서 note/instrument 2개가 사본에서 0개로 사라지는데 report가 비어 있음을 재현했다. core6/App2 red와1대조군 후 기존 warning collector·한국어 어댑터로 안내를 추가했다. 관련5파일28검사/type/AE격리 build/profile/fixed·생성21XML 전체 XSD·공개 pure 보고서24조건과 대표2이미지를 확인했다. 현재 누적 전체 gate 전이다. 누적 EI642파일/6,061검사와 Node5 PASS, 외부1skip/1,197.09초, 고정29,155개 실제 종료 직후 독립 해시까지 일치했다. 같은EI제품의전체AG main/preload/renderer에서두공개가져오기/실제파일흐름·12밀도조건·Native2/두XML4전체XSD/MIDI2도확인했다. DOM활성화와OS/native입력은구분한다.
- 남은 범위: 명명된 note/instrument 손실 안내 범위는 완료했다. 실제 악기 전환·음원/채널 모델과 원본 음색 재현, OS/native 입력·외부 앱 검수는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/testing/note-instrument-fixture.ts](../../src/testing/note-instrument-fixture.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/mid-score-instrument-changes.md)

수용 기준:

- 지원하지 않는 note/instrument 참조의 손실을 실제 원본 경로와 ID로 안내한다.
- 참조 없는 원본에 경고를 발명하지 않으며 기존 MIDI program 안내와 구분한다.
- 기존 모델/native/MIDI/사본·선택·undo·한국어 우선/기술 정보 키 소유권을 보존한다.
- 현재 public report의 960/1400·light/dark·fine32/coarse48·본문200%와 명명된 전체 gate를 확인한다.
- 기존 모델의 손실 안내를 실제 악기 전환이나 원본 음색 보존으로 보고하지 않는다.

검증:

- core6/App2 실패와1대조군을 보존한 후 관련5파일28/type PASS.
- 격리 AE build/profile overlay0/fixed, 실제 생성 source/control/copy21건 XSD와 Native/MIDI 보존.
- 공개 pure 보고서24조건·대표2이미지 직접 검토. DOM expand/scroll·터치/본문 확대 에뮬레이션과 OS 입력을 구분한다.
- 정확한 npm run test:all EI642파일/6,061검사·Node5 PASS/외부1skip; 실행 중·실제 terminal 직후 독립 hash29,155개 일치. 이후 문서 정리와 최신 도움말 build는 별도 기록한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-002 · 반복되는 악기 지정 경고의 보고서 밀도

- 현재: 손실안내033001은완료했다. 그결과반복되는같은악기참조경고의기본보고서가526.80px이고기존동질숨김경고의compact대조는115.80px인것을960/1400에서측정했다. 내부스크롤과원본경로30개는이미있다. 원본/대조/사본12XML전체XSD와model/Native/MIDI대조도유지했다. UI회귀red-b5실패/3대조군후기존private predicate/summary/disclosure로좁게구현했다. 관련7파일33/type·AH격리build/profile/fixed·새source/baseline/copy15XSD·실제pure22조건/끝글자독립22검사가통과했다. 기본높이는115.796875px로411px줄고완료문구는249→71글자다. 넓은누적전체는아직전이다. AI 실제 전체 App C의 두 공개 흐름/12밀도 조건·Native2/두 XML모드4 전체XSD/MIDI2와 두 이미지 직접 검토도 통과했다. DOM 활성화와 실제 OS/native 입력은 구분하며 누적 전체는 아직 전이다. EJ 전체645파일/6,114검사·Node5 PASS,외부1skip/1157.70초이며30,323개실행중/실제terminal직후독립해시도같았다. 이 명명범위의 수용조건은 완료했다.
- 남은 범위: 명명한 범위는 완료·미배포다. 실제OS/native입력·물리IME/터치·SR/whole-App200·청음·외부소비자는 별도 미검증이며 parent 전체지원으로 확대하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-033-001
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioWarningReport.tsx](../../src/renderer/src/StudioWarningReport.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/instruments-staves-and-systems/mid-score-instrument-changes.md)

수용 기준:

- 기존동질경고정책에맞게같은note instrument손실의복수import만요약한다. 단일과혼합/unknown·export는임의로접지않는다.
- 펼치면모든원래경고/경로/ID/개수가남으며기술정보키소유권과snapshot별확장상태를유지한다.
- 완료안내는한국어범주요약으로줄이고파일명/실제완료소유권·원문확인행동을보존한다.
- 기존core report/모델/native/MIDI/XML·선택·dirty·undo·기보geometry는변경하지않는다.
- failure-first App회귀와960/1400·theme/fine32/coarse48/본문200의실제좌표·원문도달을검증한다.

검증:

- 현재소스감사/실제8초기조건: 같은30경고의기본높이526.796875대기존compact대조115.796875,차이411px·모든원본경로유지.
- 생성source/baseline/copy12파일pinned전체XSD·model/Native/MIDI대조완료. 제품수정PASS가아니다.
- 다음은영구실패회귀→기존private predicate/summary/disclosure구현→focused/type/격리build와필요한QA·문서gate.
- 의미있는제품변경묶음전체test:all및실제terminal직후독립hash를확인한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-003 · MusicXML 악기별 음량·공간 배치 손실 안내

- 현재: EJ 종료·즉시 독립 해시 뒤 source/control/copy27건 전체XSD로 감사했다. 악기별volume0/pan0·음수/elevation·초기/직접sound/direction/재정렬/조합7사례에서 값이 사본에 남지 않고 경고도0임을 재현했다. 기존program과미지정대조는정상이다. 아직새제품수정은없다. core7/App2 red+2대조군 후 기존collector를확장하고한국어안내를추가했다. 관련5파일33검사/type-c·현재permanentfixture의source/control/copy27XSD·Native/MIDI대조가통과했다. 두App대조에서는기존local mixer37%/72%와mute설정도유지했다. 실제renderer와누적전체는아직전이다. AM격리build/profile/fixed·실제전체AppD2흐름/12밀도·Native2/XML4XSD/MIDI2와대표D2이미지검토도통과했다. 원래volume/pan/elevation복원/소리변경이아니며다음EK누적전체전이다. 누적EK는1개fixture기대목록불일치로FAIL(646파일6124PASS/1FAIL/1skip·Node미실행),실제terminal직후30699해시는같았다. 수집MuseScore원문volume78.7402/pan0을확인해live기대경로2개만추가했고5fixture종류/경로·source/copy2XSD와관련4파일79가통과했다. source/수집metadata/정확assertion과AMruntime1186SHA는유지했다. 새전체재실행전이다. EL 재실행647파일/6125검사·Node5 PASS,외부1skip/1203.11초이며원래50178terminal0→77158독립receipt까지30782개가같았다. 원래EK실패는보존하고명명손실안내범위만완료했다.
- 남은 범위: 명명된손실안내는완료·미배포다. 원본악기별믹서값복원/새음원/팬·3D모델과실제OS/native/whole-App200·물리/SR/청음/외부소비자·새PDF는별도범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/mixer.md)

수용 기준:

- 유효원본에서volume0/pan0·음수/elevation·초기/measure sound/direction/이웃파트·재정렬의원문/경로/위치를안내한다.
- 원본score/Native/MIDI/선택/undo와local mixer를바꾸지않고기존program경고를보존한다.
- 단일·조합·미지정/기존program대조와한국어기본/원문기술정보를보호한다.
- 생성source/control/copy전체XSD와실제공개report/파일흐름을필요범위에서검증하고누적결과/미검증을분리한다.

검증:

- 의미있는failure-first core/App 회귀와typecheck
- 필요한격리build/renderer·실제XSD/Native/MIDI·문서/verifier와diff check
- 제품변경후누적전체test:all은동결및실제종료직후독립해시로확인한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-002 · Native 직접 글자의 XML 형식 오류·UTF8 출력 손실

- 현재: 사용자가 XML 출력 전 차단·원문 유지를 승인했다. 최종 ordered XML 트리의 실제 출력 글자/속성만 검사해 XML1.0 불가 문자와 짝없는 surrogate를 bridge 전에 차단하고, 한국어 필드/코드와 별도 기술 경로를 안내한다. 원래 Native/모델·ID매핑·유효CR/문자참조를 보존한다. 14core+5App 실패와 대조 뒤 관련99/type를 통과했고 실제 AR 출력·수정 후 재시도·Native 재열기와 EN 누적 gate까지 통과했다. 최신 합산EN652파일6189·Node5 PASS/외부1skip·직후31902SHA동일로 이 명명 범위를 확인했다.
- 남은 범위: 이 명명 범위는 완료했다. 숨김 DOM/이벤트 adapter 검증을 실제 OS초점·물리IME·스크린리더·외부앱 승인으로 확대하지 않으며 상위 미해결 범위는 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/project/schema.ts](../../src/project/schema.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 실제표현불가문자와유효한한글/emoji·탭/줄바꿈/escaping을구분한다.
- 일반문자처리정책승인후실패회귀와출력guard/오류/재시도를구현한다. 기존ID매핑과원본Native·score·설정·선택·dirty·undo를보존한다.
- 실제XML로내보내지않는Native/event/spanID를임의거부하지않고Native/schema/XML버전을교체하지않는다.
- 총보/파트·일반저장/두사본·실제UTF8파일/XSD·Native/수정후재시도·필요한실제App/누적gate와미검증을분리한다.

검증:

- Native/schema/serializer실제10감사·Appjsdom3감사와source/outputSHA·fullXSD
- 정책승인후failure-first focused/type·격리production/파일검증·필요한전체
- 문서4gate와diff check,기존실패자료보존

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-003 · 유효한 CR 줄 끝 문자의 MusicXML 원문 보존

- 현재: 유효한 Native 내부 CR·CRLF를 XML 문자 참조로 직렬화해 원문을 보존한다. 14실패 재현/8대조 후 관련95·type/AO build/profile/fixed와 실제960/1400 XML6독립해석/fullXSD·Native2/MIDI2 및 누적EM649파일6147·Node5/직후31204SHA를 검증했다. 원본·모델·schema·ID·저장signature·기보는 유지한다.
- 남은 범위: 이 명명 범위는 완료했다. 036002의 XML 불가 문자 차단은 이후 사용자 승인과 EN으로 완료했으며, 외부 MuseScore 종료·의미 차이와 상위 교환 범위는 별도 미해결이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- Native 제목/작곡가 CR·CRLF를 실제 UTF8 XML·표준 파서에서 원문 그대로 보존한다.
- LF/탭/emoji·escaping·리터럴 문자참조 대조와 Native/score/ID/MIDI/signature를 보존한다.
- App 일반 저장·구조 유지·반복 펼치기와 실제 960/1400 출력·full XSD·누적 gate를 분리 기록한다.
- 036002의 표현 불가 문자 정책은 답변 전 적용하지 않는다.

검증:

- failure-first core/App, 관련 focused/typecheck
- 격리 build/profile/fixed, 자체 hidden Electron·실제 XML/Native·표준 parser/full XSD
- 문서 gate와 scoped diff, 필요한 전체 회귀

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-030-012 · 악보 정보 열람 시 Native 줄바꿈 보존

- 현재: 제목/작곡가/파트보 제목의 CR·CRLF·LF를 아무 입력 없이 열고 blur할 때 원문과 Native가 달라지는9실패와3정상 대조를 재현했다. 기존 private metadata adapter에서 최초 실제 DOM 표시 값을 비교 기준으로 잡도록 수정했고 회귀 검증 중이다. 최신 합산EN652파일6189·Node5 PASS/외부1skip·직후31902SHA동일로 이 명명 범위를 확인했다.
- 남은 범위: 이 명명 범위는 완료했다. 숨김 DOM/이벤트 adapter 검증을 실제 OS초점·물리IME·스크린리더·외부앱 승인으로 확대하지 않으며 상위 미해결 범위는 유지한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/StudioMetadataInput.tsx](../../src/renderer/src/StudioMetadataInput.tsx), [src/renderer/src/App.metadata-line-end-inspection.test.tsx](../../src/renderer/src/App.metadata-line-end-inspection.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/entering-and-editing-text.md)

수용 기준:

- CR/CRLF/LF 제목·작곡가·파트보 제목의 무편집 blur는 원문/Native/선택/dirty/undo를 바꾸지 않는다.
- 명시적 Enter/실제 입력의 기존 정규화·명령1회/undo1회와 늦은 IME 최종 DOM 값·소유권 취소를 보존한다.
- 공통 Input API/모델/schema/기보/출력 geometry를 바꾸지 않고 private adapter에서 수정한다.
- failure-first/관련focused/type·실제공개UI와 Native·누적 gate·미검증을 분리한다.

검증:

- 9red/3대조 뒤 관련metadata/IME/save회귀·typecheck
- 격리build/profile/fixed·자체hiddenApp960/1400·Native 저장/재열기
- 문서4gate/diff와 필요한전체

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-004 · MusicXML 본문 기본 문법·단일 최상위 요소 검사

- 현재: 실제 source XSD가 거부한6문법오류를 parser/report가 무경고로 수락했다. 새21검사의13red/8대조 뒤 whole-score ordered parser의 기존 validator와 단일root/바깥글자 검사를 연결했다. focused100/type·MusicXML1506/외부1skip·AS build/profile/fixed·실제960/1400 오류14/Native4·2재열기/XML4fullXSD/MIDI2 통과. 누적전체는후속이다. 최종 AT build/실제 AppH의 같은14오류·10파일과 도움말 본문 표시도 통과했다. 최신 누적EO655파일6212·Node5PASS/외부1skip/직후32394SHA동일로 명명된 기본문법·단일root 범위를 완료했다.
- 남은 범위: 이 명명 범위는 완료했다. 원문 문자/NCR·기타 XML/XSD/DTD 규칙·외부앱 적합성은 별도 검증이며 전체XML승인으로 확대하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/xml-body-syntax.test.ts](../../src/musicxml/xml-body-syntax.test.ts), [src/renderer/src/App.xml-body-syntax.test.tsx](../../src/renderer/src/App.xml-body-syntax.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 확인된 잘못된 태그·중복 속성·여러 root·바깥 글자를 가져오기 실패로 처리한다.
- 기존 Native/dirty/선택/undo/문서경로와 정상 재시도·최근 목록을 보존한다.
- 정상 whitespace/PI/comments/CDATA/numeric references/internalDOCTYPE와 기존 timing/MXL·fragment 계약을 유지한다.
- 실제960/1400·임시파일·정상XML XSD/MIDI/Native·설명서와 필요한 누적 gate를 구분해 기록한다.

검증:

- 13red/8controls → focused8files100/type PASS
- MusicXML119files1506tests PASS/external1skip
- AS build/classic-15 profile/fixed, actual AppG14rejections/native4/xml4fullXSD/midi2 PASS
- AT build/actual AppH14rejections·Native4/XML4/MIDI2·실제설명서 PASS. 누적전체/문서gate는후속.
- EO655files6212tests/Node5 PASS,external1skip/1214.13s,32394hash unchanged; original92196 then independent10734 receipt before edits.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-005 · 일부 파트 ID의 프로젝트 저장·인쇄설정 보존

- 현재: 실제D두폭의constructor저장실패/__proto__빈설정추가를own-entry조회/computed쓰기/Native설정수집으로수정했다. E4red4대조→H관련17/type, CA actualJ12흐름·Native24/재열기12/XML16XSD/MIDI8/PDF12·HelpK2조건 PASS. FE678files6473tests/Node5·외부1skip/1272.55초·43622입력실행중/즉시독립해시변경0로이름있는수용범위를마무리했다.
- 남은 범위: 이하위작업의유효Native파트ID/own인쇄설정저장·초기화·undo/재열기수용범위를완료했다. 부모036파일교환·물리OS/IME/SR·외부GUI/청음과새schema는이완료와별개다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.part-page-setup-key-ownership.test.tsx](../../src/renderer/src/App.part-page-setup-key-ownership.test.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 유효한원래파트ID가객체기본속성이름과같아도프로젝트저장을거부하거나빈독립인쇄설정을추가하지않는다.
- 저장된own설정/원래범위값은유지하고실제파트보설정수정·초기화·undo/redo를보존한다.
- 정상ID와다른파트/기보·XML/MIDI/페이지설정scope를보존하고실제Native재열기·필요한출력·최신전체결과를기록한다.

검증:

- 제품수정전E8tests4failed4passed, actualD6관측: P1정상2/constructor거부2/__proto__빈설정추가2. 초기준비오류/관측조건만료는별도QA실패로보존.
- 수정후F2files16tests/type PASS,신규production/전체후속.
- H관련2files17tests/type PASS. CA actualJ12흐름72파일·두고유PDF/960화면직접검토·저장된own설정/이웃파트fullNative동일. HelpK2조건PASS. I의label가정오류와runner인자오류원래로그보존. FE미실행.
- FE678files6473tests/Node5 PASS, external1skip/1272.55초. original24701→즉시independent99479/receipt본문READ뒤후속기록·43622입력불변.
- 동일FE/CB 제품1465의실제자동저장/백업복원12흐름 PASS: 실제main파일각6·Native36/재열기12·PDF12각1page/6고유이미지·정확edit1/undo0/redo1/undo0·원래70/이웃95/수동0-height2/fullpayload보존. 입력XSD3·제품추가수정없음·coldapp/물리검수아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-006 · 복구본 선택 뒤 이전 파일 읽기의 처리 중 상태 해제

- 현재: App Native2red/XML2+일반1대조 및 oldCB actualA두폭Nativebusy잔류를재현했다. 기존beginDocumentOpen재사용후관련6files36/type·CC actualB4흐름 Native8/재열기4/PDF4·HelpC2조건 PASS. 원래Native/수동geometry/dirty와새요청busy보존. FF679files6478tests/Node5·외부1skip/1236.22초·44150입력실행중/즉시독립해시변경0로이름있는수용범위를마무리했다.
- 남은 범위: 이하위작업의복구후이전최근Native busy잔류와늦은응답/새읽기소유권수용범위를완료했다. 부모파일교환/다른진입과물리OSdialog/IME/SR/청음·외부앱은별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.recovery-read-intent.test.tsx](../../src/renderer/src/App.recovery-read-intent.test.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 복구본이적용되면이전최근Native읽기의처리중상태가복구문서의새열기를막지않는다.
- 이전읽기의성공/오류/완료가복구문서또는복구후시작한새읽기의busy와소유권을변경하지않는다.
- 일반/XML대조·현재문서/dirty/선택/undo·원래Native설정/기보를보존하며실제파일/필요한출력과최신검증범위를기록한다.

검증:

- 수정전신규5검사에서Native2failed/XML2+일반1passed. oldCB actualA4관측에서Native2disabled/busy true, XML2정상과복구Native4파일보존.
- 수정후관련6files36tests/type PASS. 신규production/전체후속.
- CC actualB4흐름/Native8재열기4PDF4각1page·명시관측960dark/1400light·source1466변경0. PDF는수정전동일constructor-backup의이미지와모두같음. HelpC2조건/profileCC PASS. 최신전체FF후속.
- FF679files6478tests/Node5 PASS·external1skip/1236.22초. original85500→즉시independent18868/receipt본문READ뒤기록·44150입력불변.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-024-002 · MusicXML 마디 반복 기호의 가져오기 손실 안내

- 현재: 미배포 작업본은 각 measure-repeat 원본 발생의 경로·type/count/slashes/staff 손실을 기존 경고로 안내한다. 한국어 요약과 원본 보관·비교 행동, 기술 정보의 원래 진단을 제공한다. 기호 자체는 일반 음표 투영으로 남는다.
- 남은 범위: 명명한 마디 반복 기호 손실 안내 범위는 FG 전체 gate까지 통과했다. 부모024 기호저작·렌더링·속성·스타일/새재생모델은 needs-design이며 물리/외부 앱 검수는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/score-core/types.ts](../../src/score-core/types.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/repeats/measure-and-multimeasure-repeats.md)

수용 기준:

- 미지원1/2/4마디repeat-style start/stop의실제각원본발생을part/measure/path/type/count/slashes/staff정보로손실안내한다.
- plain/default대조와기존multiple-rest/도돌이표·볼타경고/재생을보존하고실제음표를중복복제하지않는다.
- 한국어손실요약과원본보관/재출력비교행동을우선하고기술정보의원래진단을접근가능하게유지한다.
- 현재score/Native/MIDI/두XML투영/선택·dirty·undo/출력geometry를보존하고focused/type·필요한실제960/1400파일/report/PDF·누적검증범위를기록한다.

검증:

- 읽기전용memory3XSD관측의source/projection해시와새fixture3군9XSD가일치. source경고0/roundtrip기호없음·plain모델Native/MIDI같음.
- CD actualA22341 감사완료12조건84파일·Native24재열기12/XML24fullXSD/MIDI12/PDF12각1쪽·고유3PDF와960화면검토·product1466변경0. 제품PASS아님.
- First-red7/대조1 후 관련5파일17/type·CE AppB12흐름84파일 PASS: 경고2/2/1 대조0·Native24재열기12/XML24XSD/MIDI12/PDF12·이전A PDF 래스터 동일. 고유3PDF/960요약/1400기술정보 직접 검토. 새 누적 전체 대기.
- FG681files6486tests/Node5 PASS, external1skip/1241.22sec. 44882inputs during74/501/918 and original18195→immediate80396/receipt BODY READ unchanged. Named diagnosis only; baseline unchanged.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-024-003 · MusicXML 박 반복 표기의 가져오기 손실 안내

- 현재: 미배포 작업본은 박 반복 표기의 원본 각 발생·경로와 원래 옵션을 기존unsupported-notation 경고로 안내한다. 없는 default를 넣지 않고 명시음표·Native/MIDI/기존XML투영을 유지하며 한국어 안내와 원래 기술정보를 제공한다.
- 남은 범위: 명명한 원본 발생별 손실 안내 범위는 FH전체 gate까지 통과했다. 기호저작·렌더링·스타일/재생 모델 및 부모024/025·물리/외부검수는 별도 미완이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/repeats/measure-and-multimeasure-repeats.md)

수용 기준:

- 원본 각 style 발생의 part/measure/attributes/style/path와 type/staff·지원밖 원래 옵션을 별도진단하며 omitted와명시값을 구분한다.
- 한국어손실·원본보관/비교행동을우선하고 원래진단/path/값은 접근가능한기술정보에 유지한다.
- 실제음표를복제하거나재생을재해석하지 않고 score/Native/MIDI/두XML투영/현재PDF geometry·dirty/선택/undo를 보존한다.
- 의미있는first-red→구현/focused/type·실제960/1400 파일/report/Native재열기/출력·누적gate를 기록하며 부모전체기능을완료로확대하지않는다.

검증:

- FG동결중readonly memory3XSD/sourceSHA와 새fixture3군9XSD 일치, 현재모델Native/MIDI plain동일/파일별0경고·style없음.
- CF actualA61965 exit0·12조건84파일/Native24재열기12/XML24fullXSD/MIDI12/PDF12·source1469변경0. 고유1PDF래스터/1400무경고UI직접검토. 결함감사이며제품PASS아님.
- First-red22341: new2files10FAIL/1plaincontrolPASS. 기존수집/한국어adapter 구현 후51209 related7files28PASS 및32528typecheckPASS. 원본/경고투영/Native/MIDI/기존multiple-rest/measure-repeat대조 포함; actualB/full pending.
- CG B49183 actual12/84files Native24/reopen12/XML24fullXSD/MIDI12/PDF12 pre-fixA rasters equal. Fixture13XSD/rawfacts, Help36242 4conditions/profile44364/fixed94461, related72461 74PASS. ReportC tool-order failure retained; D22078 6conditions last glyph true (960 actual rootwheel1 each/1400 alreadyvisible). FullFH pending.
- FH683files6497tests/Node5 PASS, external1skip/1246.08s;45365inputs during108/571/911 and original22677→immediate33310/receipt BODY READ unchanged. Named diagnosis only; baseline/model/Native/music/geometry unchanged.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-018 · MusicXML 박·리듬 슬래시 표기의 가져오기 손실 안내

- 현재: 미배포 작업본은 박·리듬 슬래시 표기의 원본 각 발생·경로와 원래 옵션을 기존unsupported-notation 경고로 안내한다. 없는 default를 넣지 않고 명시음표·Native/MIDI/기존XML투영을 유지하며 한국어 안내와 원래 기술정보를 제공한다.
- 남은 범위: 명명한 원본 발생별 손실 안내 범위는 FH전체 gate까지 통과했다. 기호저작·렌더링·스타일/재생 모델 및 부모024/025·물리/외부검수는 별도 미완이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/alternative-notation/slash-notation.md)

수용 기준:

- 원본 각 style 발생의 part/measure/attributes/style/path와 type/staff·지원밖 원래 옵션을 별도진단하며 omitted와명시값을 구분한다.
- 한국어손실·원본보관/비교행동을우선하고 원래진단/path/값은 접근가능한기술정보에 유지한다.
- 실제음표를복제하거나재생을재해석하지 않고 score/Native/MIDI/두XML투영/현재PDF geometry·dirty/선택/undo를 보존한다.
- 의미있는first-red→구현/focused/type·실제960/1400 파일/report/Native재열기/출력·누적gate를 기록하며 부모전체기능을완료로확대하지않는다.

검증:

- FG동결중readonly memory3XSD/sourceSHA와 새fixture3군9XSD 일치, 현재모델Native/MIDI plain동일/파일별0경고·style없음.
- CF actualA61965 exit0·12조건84파일/Native24재열기12/XML24fullXSD/MIDI12/PDF12·source1469변경0. 고유1PDF래스터/1400무경고UI직접검토. 결함감사이며제품PASS아님.
- First-red22341: new2files10FAIL/1plaincontrolPASS. 기존수집/한국어adapter 구현 후51209 related7files28PASS 및32528typecheckPASS. 원본/경고투영/Native/MIDI/기존multiple-rest/measure-repeat대조 포함; actualB/full pending.
- CG B49183 actual12/84files Native24/reopen12/XML24fullXSD/MIDI12/PDF12 pre-fixA rasters equal. Fixture13XSD/rawfacts, Help36242 4conditions/profile44364/fixed94461, related72461 74PASS. ReportC tool-order failure retained; D22078 6conditions last glyph true (960 actual rootwheel1 each/1400 alreadyvisible). FullFH pending.
- FH683files6497tests/Node5 PASS, external1skip/1246.08s;45365inputs during108/571/911 and original22677→immediate33310/receipt BODY READ unchanged. Named diagnosis only; baseline/model/Native/music/geometry unchanged.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-049 · 현재 악보에 없는 파트의 solo 설정 잔류

- 현재: 현재 score.parts 전체로 적용 map만 제한한다. 보관 설정과 같은ID 공유를 유지하며 실제 hook/CI 두 폭의 source4/2/2/2·Native2 보존, FI684파일6506검사·Node5까지 확인했다.
- 남은 범위: 이 적용범위 오류 수정은 완료했다. 음향 meter·문서별 mixer 저장 모델·물리 청음/입력/외부 앱 전체 검수는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/playback/useScorePlayback.ts](../../src/renderer/src/playback/useScorePlayback.ts), [src/renderer/src/playback/piano-transport.ts](../../src/renderer/src/playback/piano-transport.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/mixer.md)

수용 기준:

- 현재score.parts에없는solo설정이현재파트소리/활동을막지않되원래로컬설정은보관하고이전합주복귀때재적용한다.
- 현재악보의solo/mutedsolo/rest-only solo/mute/volume0와파트보보기·도크닫힘·같은ID의기존공유정책을보존한다.
- 실제hook first-red와스케줄PianoCommands/행활동을함께검증하고sampler/transport/loop가같은적용map을쓰며불필요한재시작을추가하지않는다.
- 960/1400 own actualUI/nativefile/actualWebAudio-source와Native·MIDI/선택/dirty/undo·focused/type/필요한누적gate를검증하고물리청음과구분한다.

검증:

- FH와같은1472·CH actualC62193 exit0(감사):두폭모두sourceStarts4/2/0/2, foreign Upper false/false/100·P2solo stored·context running/clock진행, 합주복귀설정유지. controlledNative읽기5/저장2바이트동일·source변경0.
- GeneratorA참조오류/부분산출물과AppA/Bstrict 입력위치실패를보존했다. C는실제trusted wheel/solo change1회/transport pointer로수행했으며숨겨진버튼/force DOM실행/assertion약화없음. 수정완료PASS아님.
- Real hook red6/control3 → focused5files31tests·related5files45tests/type PASS. CI actualD76460 exit0:960/1400 source4/2/2/2, Native2 byte-equal·local map/selection/dirty/history0·1473sources unchanged. 새 full FI 대기.
- FI original19357 → immediate independent28018 terminal0 and receipt BODY READ:684files6506tests·Node5 PASS, external1skip/1242.44sec,45789 frozen inputs unchanged during78/550/898seconds and immediate independent. Baseline unchanged.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-019 · MusicXML 표기 묶음의 표현 기호·숨표 가져오기

- 현재: 기존 모델의 articulation/breath 읽기와 뒤 묶음의 generic 손실 안내를 보완했다. CK actualB4흐름12파일·원래 정상대조 PDF 래스터·Native/XML/MIDI 투영 일치와 FJ686파일6517검사·Node5/고정46199입력 불변까지 확인했다.
- 남은 범위: 이 표현 기호·숨표와 뒤 묶음 진단 범위는 완료했다. 다른 타이/슬러/tuplet/fermata/ornament·visibility/편집층 모델, 같은 묶음의 반복 미지원 child는 별도 후속이다. 물리 OS/IME/SR/청음/외부 앱도 미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/arpeggio-warning.test.ts](../../src/musicxml/arpeggio-warning.test.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/articulations.md)

수용 기준:

- 복수 묶음의 기존 articulation을 원본 순서/기존 중복 제거와 alias 정책으로 보존하고 단일 묶음을 회귀시키지 않는다.
- 뒤 묶음의 미지원 technical/지시를 기존 loss report로 안내하고 원본 part/bar/note/container 위치를 구분한다.
- 전역 XML helper/score schema·glyph/font metrics·미지원 운지/편집층/visibility 모델을 확장하지 않는다. 타이/슬러/tuplet 등은 별도 검증한다.
- first-red/관련/type·현재 production960/1400·실제 circle/PDF·Native/재열기·MIDI와 누적 gate를 기록한다.

검증:

- CurrentCJ actualA40890 exit0 감사:4흐름12파일·Native4/재열기4/PDF4·XSD4·circle0/1·경고0/0·제품1473 불변. 수정PASS가 아니다.
- Root red9/control1→focused102/App-related44/related45/type PASS; CK actualB97705 exit0:4flows12files Native4/reopen4/PDF4, circles1/1 warning1/0, old normal-control raster equal, XML source SHA/MIDI projection preserved,1476input unchanged. New full pending.
- CK studio-r3 profile5331 and fixed64121 exit0, baseline unchanged. Current metadata final Help and cumulative FJ pending.
- FJ original32035 → immediate independent29047 terminal0 and receipt BODY READ:686files6517tests·Node5 PASS, external1skip/1254.14sec,46199 frozen inputs unchanged during109/588/842seconds and independent. Baseline unchanged.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-020 · 복수 표기 묶음의 페르마타 가져오기

- 현재: 기존Boolean을복수묶음전체의존재에서읽도록수정했다. redB5실패/3대조→관련5파일60검사/type·CM actualB4흐름16파일에서glyph1/1·MIDI off2880·실제음소거시계약3.01초·Native/정상대조PDF일치를확인했다.
- 남은 범위: 이번 범위의 기존 페르마타/슬러 복수 묶음 읽기와 실제 출력 검증은 완료했다. 개별 스타일·editorial/visibility·다른 기호·외부/물리 검수는 추가 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-019
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/playback/timeline.ts](../../src/renderer/src/playback/timeline.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/breaths-and-pauses.md)

수용 기준:

- 유효한복수notations에서기존note/rest의기본fermata Boolean을보존하고배열이없거나표기가없으면undefined를유지한다.
- 중복fermata가현재Boolean을중복누적하지않고기존Native기보음가·1.5배hold·공통시계/MIDI계약을유지한다.
- 원래XML SHA·직접기호잉크·Native/재열기·실제MIDI/PDF·음소거실제AudioContext를960/1400에서대조한다.
- 새모델/엔진/schema/글꼴/수동geometry를바꾸지않으며기존잘못된Native의내용을추측해수정하지않는다. 미검수scope를분리한다.

검증:

- CurrentCL actualA23190 exit0 감사:4flows16files Native4/reopen4/MIDI4/PDF4; glyph0/1 and off1920/2880; AudioContext2.034/3.010sec960 and2.039/3.031sec1400; source1476unchanged, XSD4. Product fix not yet.
- CorrectedRedB5fail/3controls -> green5files60tests/type PASS; CM actualB57491 exit0:4flows16files, glyph1/1/off2880, AudioContext3.015/3.010sec960 and3.010/3.015sec1400, old normal Native/MIDI/PDF control equal, source1477unchanged, XSD4. OriginalRedA2setup errors retained. Next grouped broad pending.
- FK test:all688files6533tests+Node5 PASS, external1skip/1283.50sec. 원래26000→즉시독립20017의 raw receipt는 자체 runner.log 포함 오류로 실패/보존. 추가독립93092 exit0에서 생성출력임을 확인했고 실제47019입력 불변. CN profile/fixed·CO Help4조건/manual5도 PASS. raw 독립 실패를 숨기거나 assertion을 완화하지 않았다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-021 · 복수 표기 묶음의 슬러 가져오기

- 현재: 복수 표기 묶음에서 기존 슬러의 시작·끝을 읽도록 수정했다. actual CN6흐름에서 Native/재열기/MIDI/PDF가 원래 정상 대조와 같다.
- 남은 범위: 이번 범위의 기존 페르마타/슬러 복수 묶음 읽기와 실제 출력 검증은 완료했다. 개별 스타일·editorial/visibility·다른 기호·외부/물리 검수는 추가 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-019
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md)

수용 기준:

- 양끝/시작만/끝만/뒤 묶음의 유효 슬러를 기존 endpoint로 가져오고 진짜 짝 없는 표식은 거부한다.
- 원본 XML·Native·MIDI·정상 대조 PDF를 보존하며 실제 painted contour와 transparent hit 영역을 구분한다.
- 960/1400 공개 메뉴·Native 재열기·PDF와 focused/type/누적 gate를 기록한다.

검증:

- CM actualA58573 exit0:4흐름16파일, slur0/대조1·경고0, MIDI동일; partial-start source는 parser거부/XSD유효.
- Red6/대조2 →6파일48검사/type PASS. CN actualB31609 exit0:6흐름24파일 Native6/재열기6/MIDI6/PDF6·각1쪽·슬러1·원래 정상 래스터 동일·1478입력불변·XSD6.
- FK test:all688files6533tests+Node5 PASS, external1skip/1283.50sec. 원래26000→즉시독립20017의 raw receipt는 자체 runner.log 포함 오류로 실패/보존. 추가독립93092 exit0에서 생성출력임을 확인했고 실제47019입력 불변. CN profile/fixed·CO Help4조건/manual5도 PASS. raw 독립 실패를 숨기거나 assertion을 완화하지 않았다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-022 · 복수 표기 묶음의 타이 읽기와 화음 손실 안내

- 현재: 복수 묶음의 기존 타이 flags와 화음 notation mask를 같은 private reader로 수정했다. first-red11/대조3→관련51/type·App8·CQ actual12흐름48파일 Native/재열기/MIDI/PDF가 원래 정상 대조와 같다.
- 남은 범위: 이번 기존 reader/손실 안내 범위의 focused·실제 파일/UI·누적 gate는 완료했다. 부분 화음/별도 채널·새 비율/중첩·모든 속성·외부/물리 검수는 별도 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-019
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties.md)

수용 기준:

- 유효한 복수 표기에서 기존 단일 음표/동일 화음 타이와 MIDI/Native를 단일 묶음 대조와 같게 유지한다.
- 같은 전체 화음은 잘못 경고하지 않고 실제 구성음별 차이는 묶음 수에 관계없이 기존 안내를 유지한다.
- 짝 없는 standalone/conditional/let-ring·원래 endpoint·부분 화음 미지원 정책을 보존하고 새 sound/notation 모델을 만들지 않는다.
- 960/1400 실제 공개 메뉴·painted tie·Native 재열기·MIDI/PDF와 원본 XSD/해시·회귀 gate를 기록한다.

검증:

- CP actualA2 12874 exit0:12flows48files Native12/reopen12/MIDI12/PDF12·each1page·XSD12/1478unchanged. Notation-only ties0/1 off960/1920; full chord warning2/0, partial warning0/2. OriginalA7664 report disclosure setup failure retained.
- CQ actualB12926 exit0:12flows48files Native12/reopen12/MIDI12/PDF12·each1page·XSD12/1479unchanged. Notation-only tie1/off1920; full warning0, real partial warning2; original normal Native/MIDI/PDF equal. Focused7files51/type and App6+density2 passed. FK before this change.
- FL original28256 → immediate independent73455 terminal0 and receipt BODY READ:690files6555tests·Node5 PASS, external1skip/1257.30sec,48027 frozen inputs unchanged during84/527/811sec and independent. CR profile/fixed·CS Help4/manual5/gates passed; baseline unchanged. Metadata-only closure does not rerun full.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-006-005 · 복수 표기 묶음의 기존 잇단음표 가져오기

- 현재: 기존 비율/그룹 모델의 tuplet start/stop reader를 복수 묶음에 연결했다. CR actual8흐름은 Native/MIDI/PDF를 원래 정상 대조와 같게 유지한다.
- 남은 범위: 이번 기존 reader/손실 안내 범위의 focused·실제 파일/UI·누적 gate는 완료했다. 부분 화음/별도 채널·새 비율/중첩·모든 속성·외부/물리 검수는 별도 범위다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/rhythm-meter-and-measures/tuplets.md)

수용 기준:

- 복수 표기 묶음의 기존3:2 start/stop을 원래 그룹/비율/Native/MIDI로 가져온다.
- 진짜 빠진 표식과 중첩 시작을 계속 거부하며 새 비율/엔진/schema/표시 속성을 추가하지 않는다.
- 960/1400 실제 source별 가져오기와 잉크/프로젝트 재열기/MIDI/PDF·원본 SHA/XSD·회귀 gate를 기록한다.

검증:

- CQ actualA96569 exit0:8흐름·정상2/거부6·기존 대조 Native8/reopen8/MIDI8/PDF8·XSD8/1479불변. Source 변환 성공 아님.
- Red5/대조3→관련5파일97검사/type; CR actualB53860 exit0:8성공흐름32파일 Native8/reopen8/MIDI8/PDF8·tuplets1/glyph1·원래 정상대조 동일·XSD8/1480불변. 첫 생성기 문법 오류는 보존.
- FL original28256 → immediate independent73455 terminal0 and receipt BODY READ:690files6555tests·Node5 PASS, external1skip/1257.30sec,48027 frozen inputs unchanged during84/527/811sec and independent. CR profile/fixed·CS Help4/manual5/gates passed; baseline unchanged. Metadata-only closure does not rerun full.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-023 · 복수 표기 묶음의 기존 장식음 가져오기

- 현재: 기존 장식음 배열을 복수 notations와 반복 ornaments 전체에서 읽도록 수정했다. CU actual8흐름 Native/MIDI/PDF는 원래 정상 대조와 같다. FM 누적692파일6574검사와 Node5 및 독립49037입력 검증을 통과했다.
- 남은 범위: 해당 기존 모델의 묶음 읽기/손실 안내 범위를 검증했다. 새 기호·발음·모든 표시 속성·scalar tremolo/editorial/visibility와 외부/물리 검수는 별도이며 전체 parity 완료가 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-019
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/ornaments.md)

수용 기준:

- 기존 enum 장식음의 외부/내부 복수 묶음을 최초 등장 순서와 중복 정책대로 읽고 정상 대조 Native/XML/MIDI/피아노 명령을 유지한다.
- 실제 glyph identity/order/잉크·Native 재열기/MIDI/PDF를960/1400에서 확인한다.
- 새 발음·scalar tremolo·스타일/editorial/visibility 모델을 추가하지 않고 current gate/미검수를 분리한다.

검증:

- CT actualA2 65953 exit0:8flows32files Native8/reopen8/MIDI8/PDF8·source glyph 없음/controls trill 및 trillturn·XSD8/1480불변. OriginalA35034 SVG text count 오해 실패는 보존, glyph 문자열/잉크 대조로 도구만 수정.
- Red6/controls3→focused5files83/type·App3files15; CU actualB1506 exit0:8flows32files Native8/reopen8/MIDI8/PDF8·exactglyph/order·oldnormal PDF equal·XSD8/1481불변. FL6555 before this change.
- FM 원래92850 exit0→즉시 독립92070 exit0·receipt 본문 확인:692파일6574검사/Node5·외부1skip·1188.27초·49037입력 변경0. CV profile/fixed와 CW 실제 Help4조건/manual5 통과. metadata 상태를 포함한 최종 Help는 이어서 확인한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-024 · 내부 반복 표기 묶음의 손실 안내

- 현재: 반복 technical/articulations/ornaments의 기존 손실 collector를 원래 index로 연결했다. CV actual12흐름에서 경고2/1/1·마지막 글자 읽기와 음악 출력 보존을 확인했다. FM 누적692파일6574검사와 Node5 및 독립49037입력 검증을 통과했다.
- 남은 범위: 해당 기존 모델의 묶음 읽기/손실 안내 범위를 검증했다. 새 기호·발음·모든 표시 속성·scalar tremolo/editorial/visibility와 외부/물리 검수는 별도이며 전체 parity 완료가 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-019
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/articulations.md), [참고 2](https://handbook.musescore.org/notation/expressive-markings/ornaments.md)

수용 기준:

- 유효한 내부 반복 묶음의 실제 미지원 내용을 기존 경고로 안내하고 빈 묶음 뒤의 원래 index를 유지한다.
- singleton 경로·외부 owner prefix·strong-accent 방향/위치/대상·지원 내용의 무경고 대조를 보존한다.
- Native/MIDI/XML 투영·glyph/geometry/PDF는 바꾸지 않고960/1400 공개 상세와 끝글자 읽기·XSD/회귀를 기록한다.

검증:

- CU actualA13086 exit0:12flows48files Native12/reopen12/MIDI12/PDF12·sourcewarning0/control2/1/1·XSD12/1481unchanged. Initial tail visibility not approved.
- Red9/control1→focused4files88/type·App7(filtered222)/related19; CV actualB46881 exit0:12flows48files warning2/1/1+originalpaths·lastglyph12 readable,960control actualrootwheel1·Native/MIDI/XML/PDF equal originalA·XSD12/1482unchanged. FL6555 before this change.
- FM 원래92850 exit0→즉시 독립92070 exit0·receipt 본문 확인:692파일6574검사/Node5·외부1skip·1188.27초·49037입력 변경0. CV profile/fixed와 CW 실제 Help4조건/manual5 통과. metadata 상태를 포함한 최종 Help는 이어서 확인한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-025 · 기존 단일 트레몰로의 기본형·묶음 가져오기

- 현재: 유일한 single1–3 지시의 기본형/복수 묶음 손실을 실제 CX/CY로 확인하고 기존 reader를 연결했다. FN 누적694파일6600검사·Node5와 독립50206입력 검증을 통과했다.
- 남은 범위: 해당 기존 단일 지시 읽기/여러 지시 손실 안내 범위를 마감했다. 새 marks/두 음/무측정·여러 지시 작성/합성/해석·모든 속성/editorial/visibility·물리/외부 검수는 별도이며 전체 parity 완료가 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-023
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/tremolos-and-rolls.md)

수용 기준:

- 기존 single1–3 기본형/유일한 지시의 외부·내부 묶음을 읽고 Native/XML/MIDI/기존 피아노 명령을 정상 대조와 일치시킨다.
- 실제960/1400 선 잉크·Native 재열기·PDF와 원본/XSD를 확인한다.
- 여러 지시를 임의 선택/합성하거나 새 모델을 추가하지 않고 unsupported 값 정책을 유지한다.

검증:

- Red10/대조8→focused5files57/type·관련2files60. 실제 A2/CX52830→B2/CY64898 각10flows40files Native10/reopen10/MIDI10/PDF10·source1483불변/XSD10·정상 대조 파일 일치. 원래A/CT성공과B/CT실패는 승인근거에서 제외/보존. FM6574는 수정전.
- FN 원래75608 exit0→즉시 독립47480 exit0·receipt 본문 확인:694파일6600검사/Node5·외부1skip·1174.39초·50206입력 변경0. DA profile/fixed와 DB Help4조건/manual5 통과. metadata 상태 포함 최종 Help 후속.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-026 · 여러 트레몰로 지시의 기존 손실 안내

- 현재: 현재 단일 지시 모델의 여러 트레몰로 누락을 원래 위치별로 안내한다. 실제 원본 투영과 출력은 바꾸지 않았다. FN 누적694파일6600검사·Node5와 독립50206입력 검증을 통과했다.
- 남은 범위: 해당 기존 단일 지시 읽기/여러 지시 손실 안내 범위를 마감했다. 새 marks/두 음/무측정·여러 지시 작성/합성/해석·모든 속성/editorial/visibility·물리/외부 검수는 별도이며 전체 parity 완료가 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-025
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/tremolos-and-rolls.md)

수용 기준:

- 원래 여러 지시의 위치별 기존 손실을 안내하며 임의 선택·합성·거부나 음악 투영 변경을 하지 않는다.
- 빈 묶음 뒤의 index와 외부 owner·유일한 지원 지시의 무경고 대조를 보존한다.
- 실제960/1400 상세/마지막 글자·Native 재열기·MIDI/PDF와 원본/XSD·회귀를 확인한다.

검증:

- Red6/대조2→focused4files45/type. CZ actualA64335→DA actualB85311 각10flows40files Native10/reopen10/MIDI10/PDF10·경고0→2/정상0·원래경로·마지막글자6조건·원래파일동일·XSD10/source1483/1484불변. FM6574는 두 트레몰로 수정전.
- FN 원래75608 exit0→즉시 독립47480 exit0·receipt 본문 확인:694파일6600검사/Node5·외부1skip·1174.39초·50206입력 변경0. DA profile/fixed와 DB Help4조건/manual5 통과. metadata 상태 포함 최종 Help 후속.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-027 · 표기 기호 숨김 설정의 가져오기 손실 안내

- 현재: 표기 묶음의 숨김 지정을 보존하지 못하는 기존 손실을 원래 위치·한국어 요약/상태로 안내한다. 같은 family30만 요약하며 현재 표시·재생·출력은 유지한다. 동일DD 실제chrome200%/coarse4조건·원문30/31·내부읽기·Native4 바이트 보존을 확인했다. FO 누적696파일6615검사·Node5와 독립50921입력 검증을 통과했다.
- 남은 범위: 기존 숨김 설정 손실 안내·한국어 요약/상태·같은family 반복요약과 실제 확대읽기 범위를 마감했다. 원래 비표시 복원/편집·편집층/다른표시속성·물리/외부 검수는 별도이며 전체 parity 완료가 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-019
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/expressive-markings/articulations.md)

수용 기준:

- 명시no의 원래 묶음/파트 주소와 손실 내용을 안내하며 음표 자체 숨김과 구분한다.
- 기본/yes/빈/편집층만의 묶음에는 이 경고를 만들지 않고 Native/XML/MIDI/기존 피아노 명령과 실제 표시·출력을 보존한다.
- 한국어 우선/기술원문·반복30/혼합31 정책·실제960/1400·새family200%/coarse/내부읽기/Native를 확인한다.

검증:

- 최초red10/대조5→core후 UI2red/13pass→관련5files56/type. DC actualA25747→DD actualB2 41087 각12flows48files Native12/reopen12/MIDI12/PDF12·경고0→1/정상0·요약/끝글자4조건·원래파일동일·XSD12/source1484/1486불변. 원래B70920 p가정 실패는 보존·실제Text span 문자Range로도구수정. FN6600은 수정전.
- SameDD QA-only62804 exit0:4conditions960/1400×family30/mixed31, chromeText200/coarseCDP·targets>=72CSSpx·lastreport/footerglyph·trustedreaderwheel rootsame·syntheticreadingkeys/selection/dirty/history/stoppedtransport·Native4bytes/XSD6/source1486unchanged. Not physicaltouch/OSfont/native keyboard/SR approval.
- FO 원래4477 exit0→즉시 독립15654 exit0·receipt 본문 확인:696파일6615검사/Node5·외부1skip·1174.84초·50921입력 변경0/제품1486불변. DD profile/fixed와 DE HelpP2/manual5·문서gate PASS. metadata 마감 상태 포함 최종Help는 후속.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-028 · 표기 묶음의 편집자 주석·편집층 손실 안내

- 현재: 원본 표기 묶음의 편집자 주석·편집층·참고용 지정 손실을 원래 주소·원문·한국어 요약/상태로 안내한다. 실제 DG16흐름96파일/두XML32전체XSD·Native/PDF/MIDI/현재 음소거시계 보존과 확대읽기4조건을 확인했다. FP 누적698파일6630검사/Node5 및 독립51766입력 변경0을 확인했다.
- 남은 범위: 기존 손실 안내·한국어 요약/상태·동종 반복과 실제 확대읽기 범위만 마감했다. 원래 주석/편집층·참고재생 복원과 물리/외부 검수·전체 parity는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-027
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 의미 있는 원문·속성·0·공백과 뒤 묶음/다른 파트 주소를 기술 정보에 남기고 빈/default-only는 조용히 유지한다.
- reference=yes는 표시/재생 범위 손실로 구분하며 동종 반복만 요약한다.
- Native/XML/MIDI/PDF와 실제 현행 시간을 보존하고 원래 편집 의미 복원으로 과장하지 않는다.

검증:

- 실패12/대조3→관련8files90/type PASS. 실제 DF before16flows96files·XSD24+실제32·현행 음소거시계6조건은 무경고 손실 재현이다. DG after 후속.
- DG74536 exit0:16flows96files Native16/reopen16/MIDI16/PDF16각1쪽·실제두XML32XSD/source+두투영24XSD/1488불변. before Native/MIDI/두XML·PDF이미지 동일. 같은DG11295 density4조건/Native4bytes/XSD6·profile/fixed71085 PASS. 첫10298 outDir경로오류는welcome전/로그보존·자체생성물130개 바이트동일이동,제품/검사조건변경없음. FO6615수정전.
- FP original97911 terminal0 → immediate independent10432 terminal0 → receipt BODY READ:698files6630tests/Node5, external1skip,1177.70s,51766inputs unchanged. Product1488 remains stable. Metadata closure/help final is subsequent only.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-029 · 참고용 편집층의 표시·재생 구분 보존 설계

- 현재: level reference=yes의 원래 표시용 범위는 현행 단일 부착기호 모델에 없다. 실제 참고페르마타도 일반페르마타처럼 현재 약3초로 재생된다.
- 남은 범위: 현재 시간은 원본 의미 보존의 승인 근거가 아니다. 복수 편집층·범위·기존Native·출력·선택/undo·재생을 함께 표현할 계약이 필요하다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: SMG-025-028
- 소스: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 원래 편집층 범위·표시전용·재생구분을 적용할 모델과 기존 파일 호환 정책을 먼저 정한다.
- 실제 정상 종료한 외부 대조와 원본·두XML·Native·표시·재생을 각각 비교한다.

검증:

- DF actual6조건은 현행 재현만이며 source playback 의미/외부 호환성 PASS가 아니다. 모델 변경 미적용.
- 실제HelpR4조건은 읽기 가능했으나 partial label이 범위를 과장하므로 FP receipt 후 metadata만 scope-decision으로 정정한다. 제품 모델 변경 아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-030 · 페르마타 모양·방향·복수 지정의 손실 안내

- 현재: 기존페르마타모델에서손실되는모양·방향·복수지정을원문·소유주소·한국어요약/짧은상태로안내한다. 기본형과현재Native/재생/출력은유지하며실제DK16흐름96파일과확대읽기4조건을확인했다. FQ누적700파일6646검사/Node5와독립52762입력변경0을확인했다.
- 남은 범위: 음표/쉼표의표기묶음에서기존모양·방향·개수손실안내/한국어/동종반복·실제확대읽기범위만마감했다. 원래shape복원/전용편집/시간모델·마디선소유기호와물리/외부검수·전체parity는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 원래모양·방향·복수지정의손실을주소·원문과한국어우선안내로표시한다.
- 기본empty/normal/upright와기존Native/MIDI/현재hold·기호배치를보존한다.
- 동종반복·혼합경고와실제960/1400·두XML·Native/PDF를검증하고원래shape복원으로과장하지않는다.

검증:

- 동일DI1513 exit0:16flows96files Native16/reopen16/MIDI16/PDF16각1쪽·실제두XML32전체XSD/source투영24전체XSD/1488불변. 화면의실제ink와PDF는기본형1개/경고0. 현재음소거시계6조건은기술적현행관측일뿐원래시간/청음승인아님.
- 최초11red/대조5→관련10files106/type PASS. DI1513→DK39475 각16flows96files Native16/reopen16/MIDI16/PDF16각1쪽·실제두XML32전체XSD/source투영24XSD·before바이트/이미지동일/1490불변. DK62685 density4조건 family30/mixed31 chrome200/coarse min72 Native4bytes/XSD6 PASS. FP6630은수정전.
- FQ original96719 terminal0→즉시미리작성한독립64359 terminal0→receipt본문확인:700files6646tests/Node5,external1skip,1177.66s,52762inputs unchanged. 현재1490제품동일성확인후metadata만마감한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-031 · 마디선 소유 페르마타의 가져오기 손실 안내

- 현재: 원래 마디선소유 페르마타의 손실을 별도 주소·원문·위치와 한국어요약/짧은상태로 안내한다. 실제DP18흐름108파일 및 동종30/혼합31 확대읽기4조건을 확인했으며 기존Native/표시·clock은 유지한다.
- 남은 범위: 마디선 소유 페르마타의 기존 손실 안내 범위는 FR 누적 gate와 DR 최종 Help까지 통과했다. 원래 기호·정지 시간의 모델/편집 복원, 물리·외부 앱 검수와 전체 parity는 별도다. 끝 음표로 기호를 옮기지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-030
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 마디선소유 기호를 음표소유와 구분하며 원래part/measure/barline/fermata주소·원문을 안내한다.
- 정상note-only/none/repeat-only와 현재Native/MIDI/clock/출력을 보존하고 원래시간을 자동 합성하지 않는다.
- 한국어우선/동종반복·다른경고와 혼합·실제960/1400/두XML/Native/PDF를 검증하고 기호복원으로 과장하지 않는다.

검증:

- DM87840 actualA2 exit0:18flows108files Native18/reopen18/MIDI18/PDF18각1쪽·실제두XML36전체XSD/source투영27전체XSD/1490불변. 현행음소거시계6조건 약2/4초는 원래마디선hold/청음/외부의미 승인이 아니다. 첫 초기single QA어댑터 실패는 원래로그 보존·plain으로 일치시켜 통과, 제품/검사조건/기한 변경없음.
- 최초13red/대조4→관련13files139/type PASS. DM87840→DP27569 각18flows108files Native18/reopen18/MIDI18/PDF18각1쪽·실제두XML36전체XSD/source투영27전체XSD·기존바이트/PDF이미지동일/1493불변. DP56070 density4조건 family30/mixed31 chrome200/coarse min72 Native4bytes/XSD6 PASS. DP profile/fixed88401 PASS. FQ6646은 수정전.
- FR702files6663tests/Node5 PASS, external1skip/1172.89sec. 53931inputs during214/463/675/1084 unchanged; original40532 terminal0 → immediate independent79451 terminal0 → receipt BODY READ before edits/build. Scoped diagnosis only, baseline unchanged.
- DR42878 build/HelpY2216 two actual paragraph conditions and final2files5/manual/backlog/roadmap/queue2354 PASS. Product1493 unchanged from FR; baseline unchanged.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-024-004 · 마디선 세뇨·코다의 가져오기 손실 안내

- 현재: 마디선 세뇨·코다 손실을 원래위치·raw기호/label/divisions·한국어요약과짧은상태로 안내한다. 실제DS16흐름96파일/확대읽기4조건에서 현재Native/clock/출력 보존을 확인했다.
- 남은 범위: 마디선 세뇨·코다의 기존 손실 안내 범위는 FS 누적 gate와 DT 최종 Help까지 통과했다. 원래 기호·재생target/jump모델·편집/전체parity와물리·외부검수는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-024-001
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/repeats/jumps-and-markers.md)

수용 기준:

- 실제barline child만 원래part/measure/barline/kind주소와 위치·label/divisions·기호원문으로 진단하고 label-only/no-mark는 조용히 유지한다.
- 두기호·다른소유자·style/fermata/sound 혼합을 구분하며 새eventIndex/target/jump·schema를 만들지 않는다.
- 한국어우선·기술정보·동종반복만 요약하며 현재Native/MIDI/clock/두XML/PDF와 selection/dirty/undo를 보존한다.

검증:

- FR동결중memory/stdin9XSD관측 보존. 종료 receipt 후 동일DR60649 actual16흐름96파일 Native16/reopen16/MIDI16/PDF16·실제두XML32전체XSD/source투영24전체XSD·제품1493변경0. 기호무경고손실/label-only대조·현재음소거시계6관측은 제품수정이나 원래재생승인이 아니다.
- 95580 first-red11/controls4 original log retained. 69410 focused15→34495 related14files130 and87133type PASS. Existing sound path expectation corrected from nonexistent @ suffix to the already established .dalsegno path; no product behavior/assertion reduction. Product1495, only parse/App existing files changed plus two regression files. Actual after/full pending.
- DS33585 build, afterC77019 actual16flows96files Native16/reopen16/MIDI16/PDF16각1쪽·실제twoXML32fullXSD/source투영24XSD. Warning0controls/1marker/2pair; oldNative/MIDI/twoXML bytes andPDF rasters same/current1495stable. B23198 wrong helper folder pre-start failure retained; owned16700 exact-check termination, corrected path C/same assertions. DS80204 density4conditions family30/mixed31 chrome200/coarseCDP min72 Native4bytes/XSD6; profile14390/fixed60227 PASS. FR6663 predates this change.
- DS HelpZ5742 two actual paragraph conditions and gates72249 manual2files5/backlog/manual/roadmap/queue/scopeddiff PASS. Product1495 unchanged. FS cumulative next; FR6663 predates this product edit.
- FS704files6678tests/Node5 PASS, external1skip/1181.62sec. 54635inputs during191/454/787 unchanged; product1495 at1030 unchanged. Original68837 terminal0 ->immediate independent85783 terminal0 ->receipt BODY READ before edits/build. Named diagnostics only; baseline unchanged.
- DT92344 metadata build and85393 HelpAA two actual paragraph conditions PASS. Product1495 same as FS. Subsequent editorial audit84158 adds no product source changes.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-032 · 마디선 편집자 주석·편집층 손실 안내

- 현재: 마디선 편집자 주석·편집층 손실을 독립 소유주소·원문/속성·참고 지정과 한국어/짧은상태로 안내한다. 실제DV10흐름60파일과 확대읽기4조건에서 기존Native/두XML/MIDI/PDF·현재모델 보존을 확인했다.
- 남은 범위: 마디선 editorial의 기존 손실 안내 범위는 FT 누적 gate까지 통과했다. 원래주석/참고층 표시·재생/전체parity·물리·외부검수는별도이며현재score를참고용이라는이유로삭제하지않는다. 최종metadata Help는후속으로기록한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-028
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 마디선소유footnote/level의원래part/measure/barline/kind주소·원문·속성을별도로안내하고새eventIndex를만들지않는다.
- empty/default-only대조와기존다른owner/family를보존하고reference손실을자동재생수정으로해석하지않는다.
- 한국어우선/기술정보/동종반복·현재Native/MIDI/두XML/PDF/dirty/선택/undo를failure-first와실제960/1400·적절한누적gate로확인한다.

검증:

- FS동결중memory/stdin6fullXSD관측. 종료 receipt 후 동일DT84158 actual10flows60files Native10/reopen10/MIDI10/PDF10each1page·actualtwoXML20fullXSD/sourceprojection15XSD·product1495unchanged. Warning0 metadata loss; plain/empty-defaultquiet. Audit only, not a fix or original editorial semantics approval.
- 87206 initial12red/6controls retained. Intermediate91504 new aggregate/single identical Korean wording led to ambiguous text query; changed aggregate information-topic wording to match existing notation-report convention, collapsed children/count/visibility expectations preserved.73560 focused4files33 then41884 related18files163/type23250 PASS. Only parse/App existing code changed plus two regression files; product1497. Actual after/full pending.
- DT84158 before→DV52448 after each10flows60files Native10/reopen10/MIDI10/PDF10each1page·actualtwoXML20fullXSD/sourceprojection15XSD; oldNative/MIDI/twoXML bytes/PDF rasters same/current1497unchanged. SameDV75086 density4conditions family30/mixed31 chrome200/coarseCDP min72 Native4bytes/XSD6; profile23549/fixed39751/HelpAC68386 four actual paragraphs PASS.7old note-owner full score/report objects match pre-extraction API exactly. FS6678 is before this edit.
- DV HelpAC68386 actual4paragraphs and59381 manual2files5/backlog/manual/roadmap/queue/scopeddiff PASS; product1497unchanged. FT cumulative next, FS6678 predates current edit.
- FT706files6696tests/Node5 PASS, external1skip/1183.73sec.55378inputs during287/705 unchanged; product1497 at1048 unchanged. Original75055 terminal0 ->immediate independent73938 terminal0 ->receipt BODY READ before edits/build. Scoped loss diagnostics, baseline unchanged.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-023 · 시스템·표현 글자와 연습표 출력 오류의 실제 수정 경로 안내

- 현재: 시스템/표현 글자와 연습표의 실제 글자·테두리 오류를 기존 속성 문구 수정/PDF 설정으로 안내하도록 수정했다. 8red/기존대조4→관련7파일58/type·격리DZ actual C/D8흐름72파일/16차단·HelpAG2조건·profile/fixed를 통과했다. 200% 표현 글자 오류의 두 폭/fine-coarse4조건도 확인했다. FV누적707파일6708검사·Node5/외부1skip1178.61초와56961입력불변을 확인했다.
- 남은 범위: 이 작은 안내 수정은 완료했다. 실제 세로 초과 fixture와 다른 글자 유형의200%·물리 OS/IME/dialog/SR/청음은 미검수다. 경계/모델 변경이나 전체 글자·parity 승인이 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/notation/print-page-ink.ts](../../src/renderer/src/notation/print-page-ink.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/staff-system-and-expression-text.md)

수용 기준:

- 세 글자 유형의 출력 오류가 실제 이름과 기존 속성 문구 수정/PDF 설정을 안내한다.
- 기존 보표 글자·파트 이름/header와 일반 수동 기호 안내, 실제 경계/안전 선택 페이지/hit 제외를 보존한다.
- 연습표 글자는 안에 있고 테두리만 초과한 실제 사례도 정확하게 안내한다.
- 960/1400 실제 수정 전후 Native/XML/MIDI/PNG/PDF 잉크·한 번 확정/undo/redo/재열기와 사본 dirty를 보존한다.

검증:

- 관련 focused/typecheck와 필요한 격리 production/Electron·실제 출력.
- A6/B2 실제8흐름72파일·16차단(native채널0), XML16전체XSD·Native24/재열기8·MIDI8·PDF8/PNG8·한 번 수정/undo/redo/dirty를 확인했다. 보이는 세 고유 PDF·폭별 래스터를 검토했다.
- FU707파일6700검사/Node5·외부1skip1189.73초와 동일 제품1498이며 새 수정/누적 검사 통과로 계산하지 않는다.
- 새 가로/세로 글자6개와 glyph-safe border-only2개가 수정 전 red8, 기존 staff/general/part-label 대조4가 PASS였다. 수정 후 관련7파일58검사와 typecheck를 통과했다. 실제 수정후 production은 아직 실행 전이다.
- actual C/D8흐름72파일: 새 안내/차단16회 native0·Native24/재열기8·XML16전체XSD/MIDI8/PDF8/PNG8. beforeA/B와 Native/XML/MIDI/PNG/PDF래스터 바이트·PDF글자 동일, glyph-safe/border-only 대조 보존. actual HelpAG2/profile overlay-0/fixed PASS·baseline불변.
- 실제200% 표현글자960/1400×fine/coarse4조건의PDF/PNG8차단,Native8불변·마지막글자읽기/스크롤·출력버튼/focus/선택글자Space default 취소없음·재생없음 PASS. 사전 nearest/footer와subpixel 메뉴 실패는 도구 범위로 보존했고 strict guard/기한을 유지한 center reveal을 썼다. DOM/CDP이며 물리/OS 승인이 아니다.
- FV 누적 전체: Vitest707파일6708검사·Node-native5 PASS, 외부opt-in1파일/1검사skip, 실제1178.61초. 원래99547 종료0 관측 직후 사전 독립52595 종료0→receipt 본문 읽기 후 편집을 재개했다. 고정56961입력과 현재1498제품은 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-050 · 페달 기호·선의 표기와 속성 편집

- 현재: 수동서스테인과가져온악보CC64재생·Native/MIDI/XML보존은이미가능하다.페달기호/선은현재화면/PDF에그려지지않고공개팔레트/속성편집기가없다.
- 남은 범위: 표시기호/선/anchor·선택/편집/저장속성모델은별도설계가필요하다.손실안내001을그래픽구현완료로확대하지않는다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/playback/piano-transport.ts](../../src/renderer/src/playback/piano-transport.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/keyboard/pedal.md)

수용 기준:

- 수동연주상태와악보CC64,페달표시/선·속성편집의경계를설계한다.
- 기존재생·Native/출력보존을확인하고기호/선의모델·범위를결정한뒤구현한다.

검증:

- 실제12완료흐름72파일·XML24전체XSD/Native재열기·MIDI·PDF12동일래스터와화면직접검토.
- FV707파일6708검사·Node5/외부1skip은이조사의제품수정전기준이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-050-001 · 페달 표시 기호의 가져오기 손실 안내

- 현재: 페달기호표시손실을기존보고서에추가했다. 새5red/대조5→관련9파일125/type·격리EB actual12흐름72파일/Native재열기/XML24전체XSD/MIDI/PDF·HelpAI4/profile/fixed와읽기확대4조건을통과했다.표시모델/CC64·출력내용은유지한다. 최신 누적FX의710파일6726검사·Node5/외부1skip과58249입력불변을 확인했다.
- 남은 범위: 기존 보고서의 좁은 페달 표시 손실 안내는 완료했다. 그래픽/속성 편집은 부모050의 별도 설계다. 원래FW실패와 물리OS/IME/dialog/SR/청음·외부앱 미검수는 그대로 남긴다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/notation/NotationPreview.tsx](../../src/renderer/src/notation/NotationPreview.tsx), [src/renderer/src/playback/piano-transport.ts](../../src/renderer/src/playback/piano-transport.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/keyboard/pedal.md)

수용 기준:

- 명시sign및기본형의가져오기에서표시기호손실과보존되는페달재생을구분해안내한다.
- 숨김/sound-only/일반대조와기존line/미지원type경고를보존하고중복안내를만들지않는다.
- 원래파트·마디·direction경로와원문기술정보,Native/이력·선택·MIDI/XML/PDF를보존한다.
- focused/typecheck·실제960/1400보고서/키보드읽기·넓은변경누적gate를확인한다.

검증:

- 실제12완료흐름72파일·XML24전체XSD/Native재열기·MIDI·PDF12동일래스터와화면직접검토.
- FV707파일6708검사·Node5/외부1skip은이조사의제품수정전기준이다.
- 새5red/대조5→관련9파일125검사(27651)·assets/type/EB빌드84260 PASS.기존warning두expectation을새개수/경로로강화하고원래실패를보존했다.
- actual C84163두폭12흐름72파일·Native12재열기/XML24전체XSD/MIDI12/PDF12와beforeA/B Native/XML/MIDI/PDF래스터·글자동일을확인했다.
- density D11478두폭/fine-coarse4조건HTML200/기술코드32px·토글72px·경로읽기/hit/Space·Arrow/focus/Native8불변.물리/CDP를구분했다.
- HelpAI75061두폭×부모/자식4문단정본전체·profile overlay-0/fixed PASS;baseline불변.
- FW94251/즉시독립16551 receipt본문확인:707파일6682PASS/2파일36FAIL/외부1skip1174.73초,고정57657입력변경0.Node는선행실패로미실행.원래마디번호테스트두파일의혼합보고서기대만강화후관련5파일112/typePASS.새누적gate대기.
- FX 누적 전체는 Vitest 710파일·6,726검사와 Node-native 5검사가 통과했다. 외부 opt-in 1파일/1검사는 skip이며 실제 1171.99초였다. 원래23580 종료0 관측 직후 사전 독립8879를 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정58,249입력과 현재1,503소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-051 · 범위 이명동음 정리와 실음·기보음 분리 전환

- 현재: 기존단일음표와화음전체의J/속성버튼은지원한다. 선택밖임시표상속보존버그는001로분리했다.
- 남은 범위: 범위자동최적화·샤프/플랫일괄정리와실음/기보음별Ctrl/Cmd+J는선택·projection·입력/저장정책을별도설계해야한다.
- 정책 변경 검토: 필요. 기존 승인 범위를 넘는 부분만 별도 제안하고 독립 작업은 계속한다.
- 의존성: SMG-015
- 소스: [src/renderer/src/editor/pitch-editing.ts](../../src/renderer/src/editor/pitch-editing.ts), [src/renderer/src/StudioChordProperties.tsx](../../src/renderer/src/StudioChordProperties.tsx), [src/renderer/src/editor/enharmonic-neighbor-accidentals.test.ts](../../src/renderer/src/editor/enharmonic-neighbor-accidentals.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/respell-pitches.md)

수용 기준:

- 기존단일이벤트J와추가범위자동정리·실음/기보음분리전환을구분한다.
- 다중선택/조성/이조·undo·Native/XML/화면정책을결정한뒤구현한다.

검증:

- 실제oldEB두폭×버튼/J4흐름36파일의Native/undo/redo·XML/MIDI/PDF뒤원래연주보존에서실패했다.
- 수정후관련6파일71검사PASS이며실제앱·누적gate는후속이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-051-001 · 이명동음 전환 뒤 이웃음 재생 보존

- 현재: J 뒤 선택하지 않은 음의 임시표 상속 변화를 보존하도록 기존 어댑터를 수정했다. 관련71/App4/type·EC actual14흐름126파일/XML28전체XSD·Native/undo/재열기·원래MIDI동일·PDF5고유페이지, 실제잉크두폭·HelpAJ4/profile/fixed를 확인했다. 최신 누적FX의710파일6726검사·Node5/외부1skip과58249입력불변을 확인했다.
- 남은 범위: J 이명동음 어댑터의 이웃음 보존은 완료했다. 다른 음높이 이동의 상속 영향은 별도 조사 후보이며 다중 선택/자동최적화·projection은 부모051의 별도 설계다. 물리OS/IME/dialog/SR/청음·외부앱은 미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/editor/pitch-editing.ts](../../src/renderer/src/editor/pitch-editing.ts), [src/renderer/src/StudioChordProperties.tsx](../../src/renderer/src/StudioChordProperties.tsx), [src/renderer/src/editor/enharmonic-neighbor-accidentals.test.ts](../../src/renderer/src/editor/enharmonic-neighbor-accidentals.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/notation/pitch/respell-pitches.md)

수용 기준:

- J또는기존속성버튼은선택음의소리와이웃음의원래소리를보존한다.
- 변할이웃음만alter를명시하며원래자동값·legacyprimary·ID/기호/가사·다른성부와마디를임의정규화하지않는다.
- 동일명령/undo1회·redo·Native재열기·MIDI/두XML·실제960/1400/PDF를확인한다.

검증:

- 실제oldEB두폭×버튼/J4흐름36파일의Native/undo/redo·XML/MIDI/PDF뒤원래연주보존에서실패했다.
- 수정후관련6파일71검사PASS이며실제앱·누적gate는후속이다.
- 관련6파일71검사·filtered App4(다른166미실행), assets/type/격리EC13878 PASS.
- actual4938 두폭/버튼·J/6종14흐름126파일:Native56/XML28전체XSD/MIDI14/PDF14/이미지14.원래6입력은red와같고MIDI원래바이트동일·고유5PDF직접검토.
- actual E2000 두폭의실제flat/sharp/natural잉크·선택/viewport/hit·Native4/MIDI보존 PASS. 앞선C그룹가정/D자료형비교실패를보존했다.
- HelpAJ12052 두폭×부모/자식4문단정본전체/profile overlay-0/fixed PASS;baseline불변.현재1503제품/native29 해시유지.
- FX 누적 전체는 Vitest 710파일·6,726검사와 Node-native 5검사가 통과했다. 외부 opt-in 1파일/1검사는 skip이며 실제 1171.99초였다. 원래23580 종료0 관측 직후 사전 독립8879를 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정58,249입력과 현재1,503소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-052 · 선택 음높이 이동의 이웃음 보존

- 현재: 선택음의 기존 온음계/반음/옥타브 이동 결과를 유지하고 이웃 임시표 상속만 보존하도록 기존 private 어댑터를 공유했다. 관련89/App8/type·EE 실제14흐름126파일+캡처14/XML28전체XSD/MIDI독립참조/Native·undo·재열기/PDF고유5페이지와 J두폭·HelpAL4/profile/fixed를 확인했다. 최신 누적 FY711파일6744검사·Node5/외부1skip과59235입력불변을 확인했다.
- 남은 범위: 기존 유효 음높이 이동의 이웃음 보존 수용 범위는 완료했다. 다중선택·이명동음wrap·임시표버튼의 적용범위는 확장하지 않았다. A–G 이름 변경의 영향은 아직 읽기 가설이며 별도 실제 명령 확인이 필요하다. 물리 OS/IME/dialog/SR/청음·외부앱은 미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-051-001
- 소스: [src/renderer/src/editor/pitch-editing.ts](../../src/renderer/src/editor/pitch-editing.ts), [src/renderer/src/editor/pitch-movement-neighbor-accidentals.test.ts](../../src/renderer/src/editor/pitch-movement-neighbor-accidentals.test.ts), [src/renderer/src/StudioChordProperties.tsx](../../src/renderer/src/StudioChordProperties.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/editing-notes-and-rests.md)

수용 기준:

- 유효 온음계/반음/옥타브 이동은 선택음의 기존 결과만 바꾸고 이웃의 원래 소리를 보존한다.
- 기존 keymap·단일/화음전체 범위·alter/옥타브한계와 atomic rejection을 유지한다.
- 자동값/legacyprimary·ID/가사/기호·다른성부/마디·J회귀·한번undo/redo/Native재열기를 유지한다.
- 실제960/1400 기존키/버튼·두XML/MIDI/PDF와 focused/type·필요한누적gate를 확인한다.

검증:

- 기존 실제 명령12red/명시대조6과 oldED8흐름72파일이 선택 밖 소리 보존에서 실패했다.
- shared private adapter 수정후 관련7파일89검사PASS. 수정후production/전체는아직미실행이다.
- EE 실제14흐름126파일+별도이동캡처14:Native56/XML28전체XSD/MIDI14독립참조/PDF14+래스터14,고유5페이지직접검토.
- 관련89/App8(type필터밖162미실행)/type/isolatedEE·J두폭/HelpAL4wholecanonical/profileoverlay0/fixed/manual5/docgate PASS;baseline불변.
- FY 누적 전체는 Vitest711파일6744검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1179.74초였다. 원래60742 종료0 관측 직후 사전 독립36393을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정59235입력과 현재1504소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-053 · 음 이름 변경의 이웃음 보존

- 현재: 기존A–G의선택음결과/화음→단음·쉼표변환/입력모드를보존하며이웃음만보호하도록private어댑터를재사용했다. 관련95/App11/type·EG 실제12흐름108파일+캡처12/두XML24전체XSD/MIDI독립기대·Native/undo/재열기/PDF고유5페이지와HelpAN/profile/fixed를확인했다. FZ 누적 전체는 Vitest712파일6750검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1184.72초였다. 원래83675 종료0 관측 직후 사전 독립42753을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정59920입력과 현재1505소스는 변경0이다.
- 남은 범위: 기존A–G선택음변경의이웃음보존수용범위는완료했다. 화음→단음/쉼표변환·입력모드·키/한계·schema/모델은확장하지않았다.선택임시표버튼의영향은별도읽기가설이며실제명령/UI확인이필요하다.물리OS/IME/dialog/SR/청음·외부앱은미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-052
- 소스: [src/renderer/src/editor/pitch-editing.ts](../../src/renderer/src/editor/pitch-editing.ts), [src/renderer/src/editor/pitch-letter-neighbor-accidentals.test.ts](../../src/renderer/src/editor/pitch-letter-neighbor-accidentals.test.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/editing-notes-and-rests.md)

수용 기준:

- 기존A–G선택음결과는유지하고이웃의원래소리만보존한다.
- 화음→단음/쉼표변환·keymap/범위거부·ID/기호/가사·다른성부/마디·정확undo/Native를유지한다.
- 실제960/1400 기존키/공개메뉴·두XML/MIDI/PDF와관련focused/type·누적gate를확인한다.

검증:

- 실제명령4red/대조2와기존EF4흐름36파일이마지막독립MIDI기대에서실패했다.
- private어댑터재사용후 신규6PASS이며기존유효/거부회귀와production은후속이다.
- 수정후관련8파일95/App11(필터밖159미실행)/assets/type/격리EG·actual12흐름108파일+캡처12/XML24전체XSD/MIDI독립참조/PDF고유5페이지직접검토·HelpAN2width/profileoverlay0/fixed PASS;baseline불변.현재1505소스고정.누적전체후속.
- FZ 누적 전체는 Vitest712파일6750검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1184.72초였다. 원래83675 종료0 관측 직후 사전 독립42753을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정59920입력과 현재1505소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-054 · 선택 임시표의 이웃음 보존

- 현재: 기존선택임시표의단음/화음전체alter결과를유지하고이웃음만보존하도록private계산을재사용했다. 관련104/App11/type·EI실제12흐름108파일+캡처12/두XML24전체XSD/MIDI독립기대·Native/undo/재열기/PDF고유4페이지와HelpAP/profile/fixed를확인했다. GA 누적 전체는 Vitest713파일6759검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1190.67초였다. 원래66780 종료0 관측 직후 사전 독립7540을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정60650입력과 현재1506소스는 변경0이다.
- 남은 범위: 기존선택임시표버튼의이웃음보존수용범위는완료했다.다음입력의임시표상속·화음전체alter·키/한계·모델/schema는바꾸지않았다.화음구성음추가/제거의임시표영향은별도읽기가설이며실제App확인이필요하다.물리OS/IME/dialog/SR/청음·외부앱은미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-053
- 소스: [src/renderer/src/editor/pitch-editing.ts](../../src/renderer/src/editor/pitch-editing.ts), [src/renderer/src/editor/accidental-neighbor-pitches.test.ts](../../src/renderer/src/editor/accidental-neighbor-pitches.test.ts), [src/renderer/src/StudioNoteToolbar.tsx](../../src/renderer/src/StudioNoteToolbar.tsx), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/entering-notes-and-rests.md)

수용 기준:

- 선택한단음/화음전체의기존alter결과와이웃의원래소리를유지한다.
- 다음입력모드의임시표상속·화음범위·ID/가사/기호·다른성부/마디·한번undo·Native를유지한다.
- 실제960/1400기존임시표버튼·두XML/MIDI/PDF와focused/type·필요한누적gate를확인한다.

검증:

- 실제명령4red/대조5와EH두폭/단음·화음4흐름36파일이마지막독립MIDI기대에서실패했다.
- 기존private계산재사용뒤신규9PASS;관련회귀/production은후속이다.
- 관련9파일104/App11(다른159필터미실행)/type/isolatedEI·actual12흐름108사본+캡처12/XML24전체XSD/MIDI독립참조·Native/undo/재열기/PDF4고유직접검토·HelpAP2width/profileoverlay0/fixed PASS,baseline불변.1506소스고정.누적전체후속.
- GA 누적 전체는 Vitest713파일6759검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1190.67초였다. 원래66780 종료0 관측 직후 사전 독립7540을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정60650입력과 현재1506소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-055 · 화음 구성음 편집의 이웃음 보존

- 현재: 선택음의기존화음구성음결과·중복no-op·비음높이경로를보존하면서이웃음만보호하도록기존리듬명령/private계산을연결했다.관련112/App문맥11/속성4/type·EK 실제16흐름144파일+캡처16/두XML32전체XSD/MIDI독립참조/Native·undo·재열기/PDF고유4페이지와HelpAR/profile/fixed를확인했다. GB 누적 전체는 Vitest715파일6774검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1197.60초였다. 원래73668 종료0 관측 직후 사전 독립93231을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정61817입력과 현재1510소스는 변경0이다.
- 남은 범위: 기존화음구성음추가/제거의이웃음보존과Native음역밖추가의원자적거부수용범위를완료했다.기준음/마지막구성음/중복·legacyprimary·Shift+A–G·입력·모델/schema범위는확장하지않았다.Native와MIDI/XML/PDF음역은구분하며물리/외부검수는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-054
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/editor/pitch-editing.ts](../../src/renderer/src/editor/pitch-editing.ts), [src/renderer/src/App.chord-neighbor-pitches.test.tsx](../../src/renderer/src/App.chord-neighbor-pitches.test.tsx), [src/renderer/src/StudioChordProperties.tsx](../../src/renderer/src/StudioChordProperties.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/entering-notes-and-rests.md)

수용 기준:

- 기존화음구성음추가/제거의선택음결과는유지하며이웃의원래소리만보존한다.
- 기존Shift+A–G/중복no-op/첫기준음제거불가·legacyprimary범위·기호/가사·다른성부/마디·정확undo/Native를유지한다.
- 실제960/1400기존메뉴·공유속성과키·두XML/MIDI/PDF·focused/type와필요한누적gate를확인한다.

검증:

- 실제App3red/대조5와EJ B두폭6흐름54파일이마지막독립MIDI기대에서실패했다. A는명령전가시성실패이며따로보존했다.
- 기존handler의pitch변경만리듬/privateadapter로연결후App8PASS;관련회귀/production은후속이다.
- 관련10파일112/App문맥11/기존속성4/type/격리EK·actual16흐름144사본+캡처16/XML32전체XSD/MIDI독립참조/PDF4고유직접검토/HelpAR2width/profileoverlay0/fixed PASS,baseline불변.1508소스고정.누적gate후속.
- 범위guard가추가된최종EL에서정상화음대조5흐름45파일을재확인했다.이웃음보존·Native/XML/MIDI/PDF래스터는이전EK결과와바이트동일하다.새기능검사로중복합산하지않는다.
- GB 누적 전체는 Vitest715파일6774검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1197.60초였다. 원래73668 종료0 관측 직후 사전 독립93231을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정61817입력과 현재1510소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-056 · 화음 추가의 저장 가능 음역 보호

- 현재: 기존Native음역을벗어나는화음추가를명령전에거부하고원본/선택/dirty/history를보존한다.관련119/App문맥11/속성4/type·EL 실제14흐름/Native48/MIDI10/캡처28,현재055대조5흐름45파일과HelpAS/profile/fixed를확인했다. GB 누적 전체는 Vitest715파일6774검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1197.60초였다. 원래73668 종료0 관측 직후 사전 독립93231을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정61817입력과 현재1510소스는 변경0이다.
- 남은 범위: 기존화음구성음추가/제거의이웃음보존과Native음역밖추가의원자적거부수용범위를완료했다.기준음/마지막구성음/중복·legacyprimary·Shift+A–G·입력·모델/schema범위는확장하지않았다.Native와MIDI/XML/PDF음역은구분하며물리/외부검수는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-055
- 소스: [src/renderer/src/editor/pitch-editing.ts](../../src/renderer/src/editor/pitch-editing.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.chord-native-range.test.tsx](../../src/renderer/src/App.chord-native-range.test.tsx), [src/renderer/src/editor/pitch-range.ts](../../src/renderer/src/editor/pitch-range.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/basics/entering-notes-and-rests.md)

수용 기준:

- 저장할수없는구성음추가는score/dirty/selection/undo를바꾸지않고안내와함께원자적으로거부한다.
- 기존허용범위의원본저장·정상구성음/Shift+A–G·legacyprimary/중복no-op·undo/Native재열기를유지한다.
- 실제960/1400공개속성과키·Native와지원MIDI대조/focused/type·필요한누적gate를확인하며포맷별음역을혼용하지않는다.

검증:

- App2red/대조5,현재EK두폭4흐름에서D10/Native too_big maximum9의저장전실패·bridge/dialog추가호출0·원본undo저장을확인했다.
- 기존persistabilityguard/안내뒤신규App7PASS,production/관련누적회귀는후속이다.
- 관련11파일119/App문맥11/속성4/type/격리EL·actualNative14흐름(거부4/정상10) Native48/MIDI10/캡처28·최종055대조5흐름45파일(기존Native/XML/MIDI/raster동일)·HelpAS2width/profileoverlay0/fixed PASS,baseline불변.1510소스고정.누적gate후속.
- GB 누적 전체는 Vitest715파일6774검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1197.60초였다. 원래73668 종료0 관측 직후 사전 독립93231을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정61817입력과 현재1510소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-057 · MIDI 음높이 표현 범위의 손실 없는 출력 정책

- 현재: 승인된MIDI음높이범위차단을기존출력/오류/request-owner경로에연결했다.관련15파일115/type·EO 실제20흐름(차단10/정상10) Native50/MIDI20·정상바이트·undo/재시도/재열기를확인했다. GC 누적 전체는 Vitest718파일6801검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1196.90초였다. 원래48525 종료0 관측 직후 사전 독립55487을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정62634입력과 현재1514소스는 변경0이다.
- 남은 범위: 승인된MIDI실제출력음0..127사전검사수용범위와새오류chrome200%/default·CDPcoarse읽기4조건을확인했다.Native/내부재생/다른출력음역과물리/외부승인은확장하지않는다.200%전체retry동선과사용자가위험파트/마디를찾는동선은별도후보다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/working-with-midi.md)

수용 기준:

- 제품정책을확정하기전출력/Native음역을임의변경하지않는다.
- 승인된범위에서실제MIDI출력음·정상경계·화음/이조·기존생략정책을분리한다.
- 원본Native/선택/dirty/undo·요청소유권·수정후재시도와960/1400실제파일을보존검증한다.

검증:

- 실제현재EM960/1400×5조건10흐름:음높이차이4/정확대조6,Native20/MIDI10·캡처10·재열기/1510소스불변.
- 기존GB715파일6774검사/Node5/외부1skip은현재제품전체PASS이며새정책구현PASS가아니다.
- 승인뒤유효range-red-b는단위7/App4실패+정상대조5였다.초기TABfixture/키수정retry가정오류와로그를별도보존한다.
- 관련15파일115/type/EO 실제960/1400×10조건20흐름:차단10/정상10,Native50/MIDI20/캡처30·bridge/dialog0·dirty/선택/history·기존수정/undo/재시도·재열기PASS.현재1514소스고정·누적GC후속.
- 보강H관련118/type·같은EO scopeI2흐름Native2/MIDI2로총보/위험파트차단·정상다른파트정확출력·Native전체/view재열기PASS.F+I합계22흐름Native52/MIDI22,최신1514소스고정.신규MIDI14/App5=19와selector8은GC에포함한다.
- GC 누적 전체는 Vitest718파일6801검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1196.90초였다. 원래48525 종료0 관측 직후 사전 독립55487을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정62634입력과 현재1514소스는 변경0이다.
- 동일EP default/CDPcoarse×960/1400 chrome200%4조건:요약16→32px/기보40px불변·첫끝glyph/technical72px·읽기키/상태·Native12/MIDI4 PASS.기본미디어fine양성과200%전체retry는별도이며footer끝이미보임/wheel0이다.제품1514/GC6801/baseline유지.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-057-001 · MIDI 음역 오류의 읽을 수 있는 원인 위치

- 현재: 요청시점의실제원인파트·보표·마디를기본요약에표시한다.9red/7대조→관련97/type·마지막문맥6·EQ J4흐름Native10·F전체200%4조건Native12/MIDI4·HelpAX/profile/fixed PASS.새누적GD는준비중이다. GD 누적 전체는 Vitest719파일6803검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1201.35초였다. 원래41172 종료0 관측 직후 사전 독립46500을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정63139입력과 현재1515소스는 변경0이다.
- 남은 범위: 요청시점의읽을수있는원인위치·원본전체중복이름번호·snapshot/재시도와Native/undo보존의좁은수용범위는완료했다.물리OSblur/IME/SR/청음/외부앱검수는별도이며inactive renderer focusout adapter통과로대신하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-057
- 소스: [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.midi-pitch-location.test.tsx](../../src/renderer/src/App.midi-pitch-location.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/working-with-midi.md)

수용 기준:

- 원인주소의사람이읽을수있는파트이름·보표·기존마디번호를기본한국어요약에서확인한다.
- 전체/선택파트·동일이름·다른선택·요청snapshot/새이름재시도·raw기술정보를보존한다.
- 주파수차단/바이트·Native/선택/dirty/history·정상MIDI·공통UI/모델/schema/bridge를바꾸지않고actual960/1400·큰글자조건과누적gate를검증한다.

검증:

- 단위target7/App기본요약2실패+7대조,actualEP두폭4실패는MIDI차단정상이후위치누락단계에서발생했다.
- 관련14파일97/type PASS이며새기능은기존출력정책의표시보강이다.최신production/누적gate는후속이다.
- EQ J4경로는이름snapshot/newretry·정확undo/Native를검증했다.part이름확정은inactive/no-native-focusout관측뒤명시적renderer focusout을사용했으며물리blur승인이아니다.F4조건은fine/coarse·전체200%실제18actions와재시도/Native12/MIDI4를검증했다.최신누적GD는후속이다.
- GD 누적 전체는 Vitest719파일6803검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1201.35초였다. 원래41172 종료0 관측 직후 사전 독립46500을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정63139입력과 현재1515소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-008 · MIDI 빠르기 오류의 기본·위치별 수정 범위 안내

- 현재: 기본/위치별진단대상을기존MidiTempoRangeError에전달해요청score의기본빠르기/원래마디번호·총보공통범위를안내한다.8red/대조7·ER실제8위치누락후관련81/type·문맥22/ES G8조건Native20/MIDI8/F200%읽기8조건·HelpAZ/profile/fixed PASS.최신누적GE는후속이다. GE 누적 전체는 Vitest721파일6811검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1258.87초였다. 원래1864 종료0 관측 직후 사전 독립94429를 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정63673입력과 현재1517소스는 변경0이다.
- 남은 범위: 기본/위치별빠르기·원래마디번호와총보공통수정범위안내의좁은수용범위를완료했다.오류target은기존출력거부의진단자료이며모델/schema/재생/입력범위를바꾸지않는다.실제OSfocus/IME/SR/청음/외부앱은별도검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-001-003
- 소스: [src/renderer/src/midi/serialize-midi.ts](../../src/renderer/src/midi/serialize-midi.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.midi-tempo-location.test.tsx](../../src/renderer/src/App.midi-tempo-location.test.tsx), [src/renderer/src/midi/tempo-error-source.test.ts](../../src/renderer/src/midi/tempo-error-source.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 기본빠르기와위치별빠르기의수정대상을기본한국어요약에서구분한다.
- 원래마디번호·별칭/선택파트·요청score/선택불변·raw기술정보를보존한다.
- 기존tempo범위/바이트·원본/Native/undo/재시도와actual960/1400·focused/type/필요한누적gate를검증한다.

검증:

- 변경전8red/대조7과ER실제8실패는기존거부/Native정상이후위치안내누락단계에서발생했다.제품수정/재검증은후속이다.
- ES G8조건(기본/concrete4조건의dirty MIDI retry·정확undo/Native재열기포함),F200%읽기8조건/960position두조건실제footerwheel1·root불변,정상참조4바이트동일·HelpAZ2/profile/fixed PASS.미활성입력은renderer focusout adapter이며물리blur승인이아니다.
- GE 누적 전체는 Vitest721파일6811검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1258.87초였다. 원래1864 종료0 관측 직후 사전 독립94429를 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정63673입력과 현재1517소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-001-009 · 파트 사본의 총보 공통 빠르기 전달 범위

- 현재: 사용자 승인에 따라 정렬된 파트 MIDI·두 XML 사본의 총보 공통 빠르기를 유지한다. first-red와 기존 guard를 보존했고 관련46/type·문맥60·교환 App209, 실제 두 폭의 6조건/30파일과 반복 추가2조건/10파일이 통과했다. 현재 GG 전체725파일6860검사·Node5/외부1skip, 고정64765입력·1523소스 변경0을 확인했다. EX profile/fixed/Help4조건 통과, baseline 변경 없음.
- 남은 범위: 같은 마디 시작·실제 길이를 가진 사본의 승인 범위를 완료했다. 비정렬 시간 구조의 보간, live/PDF 투영 변경, 새 모델과 외부 앱·청음·물리 입력 검수는 포함하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-001-001
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/App.notation-exchange.test.tsx](../../src/renderer/src/App.notation-exchange.test.tsx), [src/renderer/src/editor/part-swing-export.ts](../../src/renderer/src/editor/part-swing-export.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/tempo-markings.md)

수용 기준:

- 동일시간구조의concrete/alias/선택파트대조와현재총보/사본의시간차이를actual메뉴·MIDI/두XML로확인한다.
- 현재정책과바꿀범위의승인을확인한뒤의미있는first-red와기존guard/대조를유지한다.
- 원본/Native/선택/dirty/undo·출력소유권·MIDI표현범위/XSD와실제두폭검증을보존한다.

검증:

- ET두폭×3anchor6조건,Native12/MIDI6/XML12 XSD와source1517불변.현재차이와대조군이관측됐으며수정/정책은pending이다.
- 승인후first-redA3실패6대조/B기존기대2실패→C11/필터207skip·E5파일46/type PASS.원래총보guard/Native·이력assertion은유지한다.새production/누적은미실행이다.
- 승인 구현 EW 실제6조건/30파일(Native12·재열기6/MIDI6/XML12전체XSD), 모두0/2/6초. 정상 alias/selected 4조건의12사본은 기존 바이트와 동일하다. H 전체교환209검사 PASS. 최종누적은 아직 미실행이다.
- GG 전체725파일6860검사·Node-native5 PASS, 외부opt-in1파일/1검사 skip,1278.06초. 원래89822 종료0→독립77671 종료0→receipt 본문 확인 뒤 편집 재개. 고정64765입력과1523소스 변경0.
- EX 반복 추가 J 두 폭에서 MIDI·구조 유지/반복 펼치기 XML은 모두0/2/6/8/12초. Native4/재열기2/XML4전체XSD, 원본 반복·소유권과 history0 보존. 제품 변경 없는 회귀 coverage다.
- 최종 완료 분류 EY build/HelpBE4조건·typecheck·설명서/로드맵/큐 검증 PASS. 실제1400 지원 문단 PNG 검토. GG 이후1523제품/테스트 소스 동일. 후속은 QA와 문서뿐이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-050-002 · 소프트·소스테누토 페달 재생 지시의 손실 안내

- 현재: 20red/8대조→관련81/type·확대160파일1953검사/외부1skip,EV실제12조건72파일/Native12재열기·XML24전체XSD/MIDI12/PDF12·200%읽기8·HelpBC4/profile/fixed를확인했다.기존EU4대조와출력동일·현재1520소스고정이며새누적GF는후속이다. GF 누적 전체는 Vitest723파일6839검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1230.51초였다. 원래41515 종료0 관측 직후 사전 독립94946을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정64119입력과 현재1520소스는 변경0이다.
- 남은 범위: 기존모델에서소프트·소스테누토지시가보존되지않는다는손실안내수용범위를완료했다.새CC66/67·원래발음/선/속성/모델은별도설계다.물리OS/IME/dialog/SR·청음·외부앱검수는미완이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/idiomatic-notation/keyboard/pedal.md)

수용 기준:

- direction/directsound의두속성yes/no/수치/0명시손실을실제owner/path/value로알린다.
- 생략/기존damper·기호손실/navigation/dynamics대조를보존하고새재생/모델/차단을만들지않는다.
- 원래model/Native/MIDI/XML과선택/dirty/undo·동일파일재가져오기소유권·실제두폭확인을보존한다.

검증:

- first-redB20fail8control, current greenC7files81/type PASS; oldEUactual12조건의warning0·Native12/MIDI12/재열기12·source/copy12fullXSD.
- EVactual8336exit0:12조건72파일·Native12/reopen12/MIDI12/XML24fullXSD/PDF12onepage; archivedEU4조건MIDI/XML바이트·PDF래스터동일. matrix16source/copy32fullXSD. readerD8/Native8/끝glyph·trustedwheel;HelpBC4/profileclassic15/fixed PASS,baseline불변.
- GF 누적 전체는 Vitest723파일6839검사와 Node-native5검사가 통과했다. 외부opt-in1파일/1검사는skip이며 실제1230.51초였다. 원래41515 종료0 관측 직후 사전 독립94946을 실행해 종료0과 receipt 본문을 확인한 뒤 편집을 재개했다. 고정64119입력과 현재1520소스는 변경0이다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-011-012 · 같은 문서의 선택 대상 변경과 표기 속성 후보 소유권

- 현재: 현재마디clef/가사음절수정의GR전체745파일7025검사·Node5 PASS,외부1skip·고정72031/1549소스변경0을독립확인했다. 관련67/type·기존targeted3·GD실제36조건/Native78/재열기14·M캡처2/Native2·CC Help2를유지하며scope/버튼/가사절탐색/명령/Native/undo를보존한다.
- 남은 범위: 두선택기수정의현재누적gate와완료분류GE/CD Help는통과했다. 쉼표/범위/비활성선택왕복은후속현행coverage다. 물리OS/IME/SR·외부앱·전체편집UX는별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-011-011
- 소스: [src/renderer/src/StudioNoteDecorations.tsx](../../src/renderer/src/StudioNoteDecorations.tsx), [src/renderer/src/SpanProperties.tsx](../../src/renderer/src/SpanProperties.tsx), [src/renderer/src/App.measure-signature-owner.test.tsx](../../src/renderer/src/App.measure-signature-owner.test.tsx), [src/renderer/src/App.part-setup-target-owner.test.tsx](../../src/renderer/src/App.part-setup-target-owner.test.tsx), [src/renderer/src/App.measure-clef-target-owner.test.tsx](../../src/renderer/src/App.measure-clef-target-owner.test.tsx), [src/renderer/src/App.lyric-syllabic-target-owner.test.tsx](../../src/renderer/src/App.lyric-syllabic-target-owner.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/opening-and-saving-scores.md)

수용 기준:

- A 후보→같은 문서의 B 선택→bare Tab은 B를 수정하지 않는다. 같은 A의 무관한 rerender는 후보를 유지한다.
- B에서 새 명시 편집은 명령1회/undo1회이며 Native·이웃 geometry·MIDI/XML·선택을 보존한다.
- 실제 DOM 활성화와 CDP 포인터를 구분해 두 폭을 검사하며 원래 정상 경로를 유지한다.

검증:

- unit4red/4대조, App3red/3대조. actual EY DOM2red/포인터2PASS; C/D는 QA 진입 오류로 구분한다.
- G7파일104/type PASS. 실제 EZ H span4조건 Native24/재열기4, K note2조건 Native10/재열기2. M 실제 focused visible selector + trusted CDP Tab8조건:baseline4red/current4PASS, Native8. 원래 정상 포인터 대조 유지. 1525소스; 현재 누적은후속.
- FA build/profileclassic15/fixed와 HelpBG 두 장×두 폭4조건, 설명서/로드맵/큐/docverifier/scoped diff PASS. 검증 중1525소스 변경0·baseline 동일. 현재 누적GH는후속.
- GH 전체727파일6874검사·Node-native5 PASS, 외부opt-in1파일/1검사 skip, 실제1280.29초. 원래26314 종료0→독립37199 종료0→receipt 본문 확인 뒤 편집 재개. 고정65277입력과1525소스 변경0.
- 완료 분류 FB build/BH Help4조건과 문서 gate PASS. 현재1525제품/테스트 소스는 GH 이후 동일하며, 실제1400 지원 문단 PNG를 검토했다.
- 동일현재제품의추가현행대조L: 표현글자대상Select에서A미확정후보다음다른마디B와같은owner테마rerender를960/1400×4조건으로검사했다. B는oldtriggerdisconnected/닫힘/bareTab뒤B유지,같은A는trigger/후보유지후명시Tab선택. Native4전체/dirtyclean/history0보존. 기존TextPropertyInput identity/request key의coverage이며새제품수정/새issue는없고물리/native키검증이아니다.
- 같은제품TextPropertyInput후속S: 서로다른마디·같은문구/tick의늦은A조합끝/blur와현재B초안/저장guard,정상확정/취소를960/1400×6조건으로검사했다. Native8전체·한명령/한undo/redo·최종0·원본보존. 저장2경로의현재안내는clip/hit/aria연결/안정좌표로확인했고IPC0이다. P의DOM문구만기다린캡처한계/R진단을보존하고S검증도구만보완했다. 새제품수정/물리IME승인이아니다.
- GN동일1545소스/FV실제빠르기위치Select6조건: 다른마디같은96BPM은이전trigger/미확정후보격리,같은owner theme는후보유지후Tab확정/focus,Escape취소는현재위치유지. 탐색0명령/clean,실제BPM수정1명령·redo/undo와전체Native18·원본해시보존. 기존key/owner guard의coverage이며새제품결함/물리입력승인이아니다.
- GN동일1545소스/FV문서교체후속H4조건: A/B의동일score/note/tempoID·BPM과다른제목/음높이에서이전후보/조합노드격리·늦은이벤트뒤새99draft보존·전역Save actualIPC0/visiblearia안내·Escape복원. 정상현재수정1명령/redo/undo·전체Native16과원본보존. 기존generation/request/draft guard의coverage이며새제품수정없음.
- 마디signature후속 baseline FV12조건 중 DOM선택전환4누출/renderer-trusted pointer4정상·같은owner취소4정상. App신규4검사의2red/2대조→부모private key한줄. 관련4파일12/type PASS. FW greenF12조건 모두Native전체불변,positiveG4조건은기존key전파/단일meter변경·한명령/undo/redo·Native16/재열기4정확보존. 일반물리pointer결함으로과장하지않는다.
- GO전체740파일7002통과/2실패/외부1skip,Node미실행·고정70723변경0·직후독립receipt보존. 도구전체remount범위를signature Select만으로좁히기전action1red/4대조. 기존실패2검사 assertion유지 PASS(나머지365skip),관련4파일13/type PASS. FY실제후보/클릭/취소12+정상확정4+동일버튼연속실행4조건,Native44·재열기4·BZ Help2 PASS. 현재GP전체후속.
- 최종GP742파일7005검사·Node-native5 PASS, 외부opt-in1파일1검사skip, 실제1243.78초. 원래28054 종료0 직후 독립36636 종료0 및 receipt본문 확인 뒤 편집재개. 고정70978입력과현재1546소스 변경0. GO실패로그/기존assertion/전체도구수명 유지.
- 동일FY/1546소스후속U8조건:960/1400×다른보표/다른파트×signature2종,이전후보폐기/A복귀/noopTab·새B명시편집1명령·정확범위/이웃/Native40/재열기8/undo/redoPASS. V실제필드캡처2+Native2에서scope/값/viewport/hit직접검토. fixture/S/T의QA오류와U상단캡처한계보존. 새제품수정/물리OS승인이아니다.
- PartSetup후속baselineFY12조건:DOM다른동일값대상4누출/정상rendererpointer4·같은owner취소4대조;신규App3red/5정상→선택기별owner추가후관련5파일56/typePASS. 기존properties한검사는이전target의해제노드를캐시하므로현재공개필드를다시찾고old노드해제assertion추가,원래scope/score/undoassertion유지. actual/전체후속.
- GA green12조건Native12+positiveH10조건Native34/재열기8 PASS. 같은staff다른마디/같은part다른staff·nextinstrument후보유지,새targetscope/한명령·정확undo/redo·이웃Native전체보존. properties전체139 PASS(기존score/scopeassertion유지·해제된targetfield캐시조회보완). CA Help2정본문구/미완분류PASS. 현재1547소스/GQ누적후속.
- GQ전체743파일7013검사·Node-native5 PASS,외부opt-in1파일1검사skip,실제1252.51초. 원래58820 종료0직후독립49031 종료0과receipt본문읽기뒤편집재개. 고정71352입력/현재1547소스변경0. baseline불변/원래실패로그유지.
- GQ동일1547핵심소스의완료분류GB빌드/CB Help2조건PASS. 정본전체문구·resolved범주·기능partial·Escape후상태보존과960dark실제PNG를직접검토. baseline불변/새전체반복실행없음.
- GQ동일1547소스/GB의measure-clefD6조건에서DOM같은값B전환2누출·정상rendererpointer2/같은owner취소2정상,실제Native6비교. B진입viewport실패/C검색포커스진단보존,명시settingsbuttonfocus로D진입복구·strict가시성/hit유지. 새제품수정/해결PASS가아니며동일기존백로그를재개했다.
- measureclefApp3red/2대조→privateSelect owner;기존staff-document-owner는해제된oldtarget노드disabled조회대신현재공개Selectdisabled/닫힘과old노드해제assertion으로보완했다. 원래score/historyguard유지. lyric실제GC12조건DOM4누출/pointer4정상/themeEscape4정상·Native12,App3red/4대조→syllabic Select의주소/음표/절owner만추가했다. 관련8파일67/type PASS,현재production/전체후속.
- GD현재measureclef6control+6positive/Native30/reopen6,lyric12control+12positive/Native48/reopen8 PASS:총36조건/Native78/reopen14. 정상pointer/같은owner·한마디scope/해당verse·nextverse탐색·기존inlineArrowDown·정확undo/redo유지. M저장재열기field캡처2Native2로L의직전paint캡처한계를보완했고추가조건중복합산없음. CC Help2/관련8파일67/typePASS. 현재1549소스/GR전체후속.
- GR전체745파일7025검사·Node-native5 PASS,외부opt-in1파일1검사skip,실제1249.50초. original75405 종료0직후independent4113 종료0과receipt본문읽기뒤편집재개. monitor13910은같은handle만관측/중복실행없음. 고정72031입력/현재1549핵심소스변경0·baseline불변.
- GR동일1549핵심소스의완료분류GE빌드/CD Help2조건PASS. 전체정본문구/resolved범주/featurepartial·독립verse/nextpreset·Escape후상태보존과960dark실제PNG를검토했다. GD/CC미완분류의역사적증거유지·새전체반복계산없음.
- GE/GR 동일1549소스의 비활성 선택 왕복18조건(960/1400, 마디clef6·가사1/2절12), Native score36 무변경·history0·복귀 bareTab/openTab·대표PNG2 직접검토. 새제품수정/전체반복/PDF/물리OS승인 아님.
- GE/GR동일1549소스: PDF프리셋/용지/방향의 총보/파트보·동일ID문서교체승인/취소24조건, Native score/partLayouts/settings/view84·정확undo/redo·대표PNG2검토 PASS. 기존key의현행QA이며 제품수정/새PDF/물리OS승인아님. A의없는버튼대기실패는보존했다.
- GE/GR동일소스: 실제잘못된Native의main검증거부→App오류안내12조건,현재PDF후보/문서보존·명시1명령/undo/redo·Native score/layout/settings/view36. C tracker의reject누락보존/D관측만정정. 새제품/PDF/물리승인아님.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-007 · MusicXML 음표 반복 회차 조건의 가져오기 손실 안내

- 현재: 일반 note 반복 회차 조건의 무경고 손실을 unit9/App2/실제4조건에서 재현한 뒤 기존 진단 collector와 한국어 안내로 수정했다. 관련7파일55/type·FD build·실제6조건36파일/Native6재열기/XML12fullXSD/PDF6이미지동일을 확인했다. 후속에서는 기본 한국어 안내도 기존 공통 위치 formatter를 거쳐 파트·마디를 표시한다. 원래 기술 정보의 위치·값·경로는 이미 존재했으며 그대로 유지했다.
- 남은 범위: 이 손실 진단 수용 범위는 완료했다. 현재 재생·사본은 조건을 적용하지 않으며 조건부 음표 모델/재생·원본 속성 보존은 별도 정책/설계 범위다. 전체 외부 호환성을 완료한 것은 아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/note-pass-warning.test.ts](../../src/musicxml/note-pass-warning.test.ts), [src/renderer/src/App.note-pass-warning.test.tsx](../../src/renderer/src/App.note-pass-warning.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 일반 note time-only 원본 발생별 경로/조건값/파트/마디/인덱스를 기존 tie 조건과 독립적으로 안내한다.
- 무지정 대조에는 경고를 만들지 않으며 현재 score/Native/MIDI/XML·원본 파일을 변경하지 않는다.
- 한국어 안내와 기술 정보, 실제 가져오기·사본·PDF·Native 재열기 및 편집/undo 계약을 검사한다.
- 기본 한국어 안내에서도 원본 파트·마디를 식별하고 기존 기술 정보와 선택/undo/Native 계약을 유지한다.

검증:

- unit9red/2PASS와 App2red/1PASS 보존. 수정 후 focused14/type PASS.
- FB 실제960dark/1400light:4누락/2무지정 대조, Native6재열기6/MIDI6/XML12/PDF6/PNG6 보존. 현재 build 후 재검증 대기.
- 수정후 FD build/F 실제6조건36파일 PASS, Native/MIDI/두XML·기보PDF이미지 보존. 관련7files55/type PASS. GH 전체는 이 수정/14신규검사 전이며 새누적 gate는후속이다.
- GI 현재누적731files6899tests/Node5 PASS·외부opt-in1file/1test skip,1292.64초. original67632→즉시독립16396→receipt본문READ. 고정66470입력·1531소스변경0. 원래실패/QA오류/baseline보존.
- 위치 후속: 기존 App 강화4red/3대조→관련6파일46검사·추가 App5파일17검사·실제 report2파일5검사/type PASS. FN actual D 960dark/1400light 8조건48파일, 기본위치8/기술정보8·Native8재열기/XML16fullXSD/PDF8이미지동일. 40파일바이트동일, PDF8개는메타데이터차이/이미지동일. GI전체는피치카토와이위치수정전이다.
- GK현재누적735files6939tests/Node-native5 PASS·외부opt-in1file/1test skip,1319.33초. 원래21450→즉시사전독립48490→receipt본문READ뒤편집재개. 고정68481입력·현재1537소스변경0. GJ1실패는유효한복합경고의단일버튼가정으로보존하고source별기술정보/정확한경고수와Native/Space계약을강화한뒤통과했다. baseline/기존음악모델은보존한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-008 · MusicXML 음표 연주 시작·종료 시점 조정 손실 안내

- 현재: note attack/release 비영 값의 unit6/App1·실제4조건 무경고 누락을 진단 collector/한국어 안내로 수정했다. 관련60/type·MusicXML확대152파일1885검사/외부1skip·FF실제6조건36파일/Native재열기·XML12fullXSD·PDF6이미지동일을 확인했다. 후속에서는 기본 한국어 안내도 기존 공통 위치 formatter를 거쳐 파트·마디를 표시한다. 원래 기술 정보의 위치·값·경로는 이미 존재했으며 그대로 유지했다.
- 남은 범위: 이 손실 진단 수용 범위만 완료했다. 음표별 연주offset 모델/재생과 원본 속성 영구 보존은 미지원이며 별도 설계 범위다. 명시0은 음악적 조정 손실 경고를 만들지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/note-performance-warning.test.ts](../../src/musicxml/note-performance-warning.test.ts), [src/renderer/src/App.note-performance-warning.test.tsx](../../src/renderer/src/App.note-performance-warning.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 비영 attack/release 각각의 원래 값·파트/마디/음표/경로를 진단하며 기존 음가/재생은 바꾸지 않는다.
- 명시0/무지정은 음악적 조정 손실 경고를 만들지 않는다. 두 속성은 독립적으로 진단한다.
- 한국어 우선/기술정보와 실제 가져오기·Native/MIDI/XML/PDF 보존을 확인한다.
- 기본 한국어 안내에서도 원본 파트·마디를 식별하고 기존 기술 정보와 선택/undo/Native 계약을 유지한다.

검증:

- 현재 unit6/App1red·4대조, source/copy16fullXSD. 실제 baseline은 다음이다.
- 수정후관련7files60/type와MusicXML확대152files1885tests/외부1skip·FF build/F actual6조건36파일 PASS. Native/MIDI/두XML24파일과PDF이미지6개동일. source/copy16전체XSD. 최신전체는후속이다.
- GI 현재누적731files6899tests/Node5 PASS·외부opt-in1file/1test skip,1292.64초. original67632→즉시독립16396→receipt본문READ. 고정66470입력·1531소스변경0. 원래실패/QA오류/baseline보존.
- 위치 후속: 기존 App 강화4red/3대조→관련6파일46검사·추가 App5파일17검사·실제 report2파일5검사/type PASS. FN actual D 960dark/1400light 8조건48파일, 기본위치8/기술정보8·Native8재열기/XML16fullXSD/PDF8이미지동일. 40파일바이트동일, PDF8개는메타데이터차이/이미지동일. GI전체는피치카토와이위치수정전이다.
- GK현재누적735files6939tests/Node-native5 PASS·외부opt-in1file/1test skip,1319.33초. 원래21450→즉시사전독립48490→receipt본문READ뒤편집재개. 고정68481입력·현재1537소스변경0. GJ1실패는유효한복합경고의단일버튼가정으로보존하고source별기술정보/정확한경고수와Native/Space계약을강화한뒤통과했다. baseline/기존음악모델은보존한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-009 · MusicXML 피치카토·아르코 연주 지시 손실 안내

- 현재: note/sound yes/no 원본지정의무경고손실을진단한다. H current154파일1905검사/외부1skip/type·FKactual10조건60파일/Native10재열기/XML20fullXSD/PDF10이미지동일,FL/BN Help4조건과문서gate가통과했다. source파트/마디를공통formatter로보여주며빈sound오경고도차단한다.
- 남은 범위: 원본지정손실진단의명명된수용범위는완료했다. 현재재생·사본에원본주법지정을적용하지않으며새음색/주법모델·원본속성영구저장은별도설계범위다. 명시no를청음손실입증으로과장하지않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/testing/pizzicato-fixture.ts](../../src/testing/pizzicato-fixture.ts), [src/musicxml/pizzicato-warning.test.ts](../../src/musicxml/pizzicato-warning.test.ts), [src/renderer/src/App.pizzicato-warning.test.tsx](../../src/renderer/src/App.pizzicato-warning.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- note와direction/measure sound의서로다른적용범위·원래yes/no·파트/마디/인덱스를기존경고에정확히연결한다.
- 미지정대조와기존score/Native/MIDI/XML/기보를보존하고일반technical경고와중복을구분한다.
- 한국어우선/원문기술정보·실제가져오기/재열기/사본/필요한PDF를검증한다. 실제음색구현이나청음승인으로과장하지않는다.

검증:

- 현재read-only8조건/source-copy16fullXSD PASS, warnings0. 실제App/Electron red와제품수정은미실행.
- 수용범위가정해지면failure-first와focused/type·필요한actual960/1400·Native/MIDI/XML/PDF를실행한다. 넓은변경단위에전체검사.
- 첫red:unit12/App3실패·무지정/technical/XSD4대조PASS.19검사,28source/copy전체pinnedXSD. 실제10495실행관측후기록한다.
- C 빈sound오경고3조건/D명명대조1red를수정했다. G App3+actualFJ960 소스위치red뒤기존formatter로파트·마디를복구했다. 실패와검사를유지했다.
- 수정후관련9files75/type·MusicXML확대154files1905tests/외부1skip·FKbuild/H10조건60파일·Native10재열기/XML20fullXSD/PDF10이미지동일. 현재1534소스고정,GI전체는수정전이다.
- FL build/BN Help두장×두폭4조건·문서4verifier/공백검사로기능경계와원본보관안내를확인했다. E75는위치교정보강전,현재H확대1905는보강된App위치assertions를포함한다.
- 최종FM build/BQ Help4조건 PASS. done구역heading과partial메타데이터·canonical전체요약/새음색미지원문구를동시에확인했다. BO/BP의QA가정오류를보존했다. 현재1534제품/테스트소스는H이후불변이며새전체검사는후속이다.
- GK현재누적735files6939tests/Node-native5 PASS·외부opt-in1file/1test skip,1319.33초. 원래21450→즉시사전독립48490→receipt본문READ뒤편집재개. 고정68481입력·현재1537소스변경0. GJ1실패는유효한복합경고의단일버튼가정으로보존하고source별기술정보/정확한경고수와Native/Space계약을강화한뒤통과했다. baseline/기존음악모델은보존한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-024 · MusicXML 보표·시스템 글자의 마디 안 위치 손실 안내

- 현재: 무경고 위치 손실의unit6/App2/actual6조건을재현한뒤기존directionTicks/collector·공통위치formatter로진단했다. 마지막J관련9파일70검사/type·FQ K actual8조건48파일/Native8재열기/XML16fullXSD/PDF8이미지동일과짧은상태줄을확인했다. 모델·기존음악/배치는바꾸지않았다.
- 남은 범위: 이위치손실진단의좁은수용범위를완료했다. 정확한박별글자위치보존,manual default-x와표현글자timing은별도설계/감사범위다. 외부호환성이나전체글자기능완료가아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/serialize.ts](../../src/musicxml/serialize.ts), [src/testing/words-position-fixture.ts](../../src/testing/words-position-fixture.ts), [src/musicxml/words-position-warning.test.ts](../../src/musicxml/words-position-warning.test.ts), [src/renderer/src/App.words-position-warning.test.tsx](../../src/renderer/src/App.words-position-warning.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/staff-system-and-expression-text.md)

수용 기준:

- scalar staff/system글자의실제nonzero source tick을마디단위손실로안내하고파트/마디/words경로·position·명시offset을보존한다.
- 원점/상쇄offset·지원표현글자대조에거짓위치손실경고를만들지않는다. tempo/rhythm/복수조각·default-x는이번추론대상에서제외한다.
- 현재score/Native/MIDI/XML·자동앵커/PDF·편집/undo와기술정보열람키를보존하고960/1400 actual파일을검사한다.

검증:

- readonly10조건6loss/4control·source/copy20fullXSD. unit6/App2red·5대조를보존한다.
- FO actual baseline8조건48파일/Native8재열기/XML16fullXSD/PDF8을끝낸뒤진단6누락assertion실패. 제품수정전이다.
- H관련9파일70검사/type PASS. source/copy20fullpinnedXSD·FP H실제960dark/1400light8조건48파일/Native8재열기/XML16fullXSD/PDF8이미지동일. 40파일바이트동일/PDF8메타데이터차이. H직접UI/PDF래스터검토.
- 상태줄full문구관찰뒤I App2red/1대조를추가해기존짧은요약패턴을재사용했다. G XSD테스트identifier오류는원래실패로그를보존하고H에서수정후20전체XSD를통과했다.
- 초기backlog gate의추측한handbook URL이기존공식index에없어실패했다. 기존028015의실제indexedURL을확인해수정하며원래실패는별도로기록한다.
- I footer2red/1대조→J9파일70검사/type·piano assets PASS. FQ K실제8조건은기본위치6/짧은상태줄6·무경고대조2/Native8재열기/XML16fullXSD/PDF8래스터동일. 1537현재소스이며GI전체는피치카토20+위치follow-up1+이범위19신규검사전이다. 최종Help/현재누적은후속gate다.
- GJ전체734파일6938PASS/1실패·외부1skip/Node미실행,68413입력변경0/원래5269→독립5116→receipt본문READ. navigation App의단일기술정보버튼가정을원본별2경고계약으로강화한뒤M실제3파일21/type·FR mixed4조건24파일/Native4재열기/XML8fullXSD/PDF4를확인했다. GK최신전체대기이며GJ실패는보존한다.
- GK현재누적735files6939tests/Node-native5 PASS·외부opt-in1file/1test skip,1319.33초. 원래21450→즉시사전독립48490→receipt본문READ뒤편집재개. 고정68481입력·현재1537소스변경0. GJ1실패는유효한복합경고의단일버튼가정으로보존하고source별기술정보/정확한경고수와Native/Space계약을강화한뒤통과했다. baseline/기존음악모델은보존한다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-028-025 · MusicXML 표현 글자의 원본 박별 위치와 divisions 읽기

- 현재: 기존ExpressionText.tick에ordered directionTicks를연결해source cursor/divisions읽기를1줄수정했다. 관련6파일125·MusicXML151파일1917/외부1skip·type·notation/native5파일27과FS actual F8조건56파일/G4조건24파일을확인했다.
- 남은 범위: 이번지원표현글자의시점읽기와파트/보표소유권수용범위는GL739파일6960/Node5(외부1skip)까지완료했다. 이미저장된Native tick은재해석하지않으며staff/system마디단위배치,다른서식/수동좌표·외부앱검증은별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/testing/expression-position-fixture.ts](../../src/testing/expression-position-fixture.ts), [src/musicxml/expression-position.test.ts](../../src/musicxml/expression-position.test.ts), [src/renderer/src/App.expression-position.test.tsx](../../src/renderer/src/App.expression-position.test.tsx), [src/testing/expression-owner-fixture.ts](../../src/testing/expression-owner-fixture.ts), [src/musicxml/expression-owner.test.ts](../../src/musicxml/expression-owner.test.ts), [src/renderer/src/App.expression-owner.test.tsx](../../src/renderer/src/App.expression-owner.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/text/staff-system-and-expression-text.md)

수용 기준:

- implicit cursor와divisions단위상대offset을기존tick으로변환하고명시0/음수상쇄/fraction/상속/backup-forward를보존한다.
- 기존Studio 출력·원점대조,음악/타임라인/MIDI·명령/undo·Native저장/재열기를유지한다.
- 실제960/1400에서표현객체선택·속성의박위치·수정/undo와구조유지/반복펼치기XML/PDF를검증한다.
- staff/system의마디단위정책과기존진단을변경하지않고미지원서식·수동geometry·외부승인을추가하지않는다.

검증:

- readonly11조건9wrong/2control·source/expected두XML33fullXSD·독립XMLcursor검사. unit10red(9위치+fraction때문에멈춘XSD)/2대조·App3red/1대조를보존한다.
- FR 실제baseline8조건48파일/Native8재열기/XML16fullXSD/PDF8을끝낸뒤6위치차이assertion실패를확인했다. 수정전이다.
- D관련6파일125/type·MusicXML확대151files1917tests PASS/외부opt-in1skip,notation/native5files27 PASS. source/두XML33fullpinnedXSD.
- FS F실제8조건56파일/Native16재열기/XML16fullXSD/PDF8, MIDI8·기존Native8바이트동일/원점출력보존. E숨김blur전파실패는기존public DOM Input/focusout어댑터로분리했으며기대/assertion은유지한다. trusted/native Enter·물리IME승인이아니다.
- FS G실제4조건24파일/Native4재열기/XML8fullXSD/PDF4에서음수/소수source가2박/1.5박으로표시됨을Select의가시좌표와실제출력으로확인했다. F/G대표UI/PDF직접검토. 현재1540소스는고정이며GK6939전체는이수정전이다.
- FT최종격리build/BT실제Help6조건에서완료구역/원본시점읽기/기존Native비재해석문구를확인했다. 1540현재소스D이후변경0,baseline변경없음. GK전체는이한줄과16신규검사전이다.
- 기존025소유권후속: 원본divisions2/4·backup/relativeoffset·같은문구dolce의파트/보표tick0/13440/33600. 신규5검사/관련7파일42/type·독립source/copy/expanded6fullXSD. FT actual8조건56파일/Native16쓰기·8재열기/XML16fullXSD/MIDI8/PDF8을확인했다. 제품변경없는회귀coverage이며C/D/E QA가정·가림실패는보존하고실제label helper/측정scroll로고쳤다. GK전체는이전소스이며GL누적은후속이다.
- GL누적739파일6960검사/Node-native5 PASS,외부opt-in1파일/1검사skip/1324.95초. 원래57797exit0→즉시독립79259exit0→receipt본문READ후편집재개. 고정69218입력·현재1543소스변경0. 앞선시점읽기한줄/16신규검사와현재소유권5검사를포함한다.
- GL뒤동일1543소스로반복/명시적줄바꿈raw대보표·합주2조건의독립XMLcursor와source/copy/expanded6fullXSD를대조했다. source4/6표현이펼친8/12개로정확히복제되고tick/owner/Native/MIDI/원본문서가보존된다. 실제두악보단renderer/PDF는후속이며제품수정은없다. G의undefined키QA비교실패와H정정을보존한다.
- 반복·명시적줄바꿈J실제960dark/1400light8조건58파일: Native16쓰기/8재열기/XML16fullXSD/MIDI8/PDF8의10페이지모두사전검토이미지와동일. 8마디하단cantabile3.5박만한명령으로수정/undo/redo·원복하고원래owner·[7,8,7,8]와파트범위를유지했다. 대보표/합주총보와Piano파트의서로다른현행layout필터를구분한다. 동일1543소스GL를재사용하며새제품수정/전체재실행은없다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-004 · MusicXML MIDI 뱅크 지정의 손실 안내

- 현재: 기존collector/한국어안내에MIDI bank값·instrument참조·소유파트/마디/path를진단한다. 관련35/type·MusicXML155파일1971검사/외부1skip·GG actualQ12조건72출력/Native12재열기/XML24fullXSD/MIDI12/PDF12와대표화면2/PDF2를확인했다. 현재GS누적747파일7040검사·Node5 PASS/외부1skip·고정72807/1552핵심소스변경0. 최종완료분류의실제Help검증은후속이다. 완료분류GH build/T Help2조건도통과했고정본전체요약·완료구역/partial범위·Escape상태보존과960darkPNG를검토했다.
- 남은 범위: 명명된손실안내수용범위와새원문의chrome200%fine/coarse읽기16조건을확인했다. 원래bank발음/CC0/32·음원/채널모델·200%전체편집/파일출력/상태줄전체읽기·물리OS/IME/dialog/SR·청음/외부앱은별도설계/미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/testing/midi-bank-fixture.ts](../../src/testing/midi-bank-fixture.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/mixer.md)

수용 기준:

- 원본의명시bank1/16384·다른파트·정의순서·직접sound/direction별정확한값/참조/경로/위치를안내한다.
- program/mixer경고·원본score/Native/MIDI/XML·선택/undo·로컬믹서를바꾸지않고무지정/정의만대조는무경고다.
- 한국어기본안내와기술정보원문을구분하고표시밀도/파일저장경로를실제앱에서검증한다.
- 새모델/음원/은행선택지원으로확대하지않고필요한focused/type/production/누적gate와미검증을기록한다.

검증:

- failure-firstunit/App및source/control/copy fullXSD
- 기존program/mixer관련검사·typecheck·격리build/실제Native/XML/MIDI·문서gate
- 누적test:all동결→원래terminal종료→직후독립hash검사→receipt본문확인뒤편집재개
- GG actualQ원래93204 종료0/12조건72출력·한쪽PDF12/폭별6이미지동일,한국어소유파트/마디와정확한bank/instrument/path·technical초기접힘보존. QA진입/비교가정실패는별도보존.
- GS whole747파일7040검사·Node-native5 PASS/외부1skip·1248.19초. 원래35003 종료0관측→즉시독립종료0→receipt본문확인뒤편집재개. 고정72807입력과현재1552소스변경0.
- GH/T 실제Help960dark/1400light2조건: 정본전체문구·완료구역/partial한계·Escape후문서/선택/dirty/transport·960대표PNG검토 PASS,1552소스GS동일·baseline불변.
- GH/GS동일1552소스 QA-only C:chrome글자200%·fine/coarse16조건/Native16·source4fullXSD·glyph40불변/summary32/button72·실제trustedwheel2–3회/scrollend/마지막원문glyph·읽기7키·같은source초기화PASS. A/B고정wheel/input실패보존·제품변경없음.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-005 · MusicXML 원본 MIDI 채널 지정의 손실 안내

- 현재: readonly11/33fullXSD·GH 실제8조건6누락/대조2·Native8과신규17의11red/6대조후기존collector/한국어formatter를보완했다. 관련52/type·MusicXML확대I156파일1984검사/외부1skipPASS. 수집파일channel1기대경로1개만추가하고G원래실패를보존했다. 새production/누적gate는후속이며GS는수정전이다. GI actualM14조건84출력(Native14재열기/두XML28fullXSD/MIDI14/PDF14),대표화면2/PDF2검토·unpitched App3도통과했다. 현재1555소스이며GT누적·최종Help는후속이다. GT 전체 749파일/7057검사·Node5 PASS, 외부1skip. 원래45778 종료0→직후 독립검사 종료0→receipt본문 확인 뒤 편집 재개; 고정73473입력/현재1555핵심소스 변경0. 완료 분류의 실제 Help 검증은 후속이다. GJ 완료 분류 빌드/실제Help Q 960dark·1400light 2조건도 통과했고 정본 전체 문구·완료구역/partial·Escape 상태와 960PNG를 검토했다.
- 남은 범위: 명명된 채널 손실 안내와 200% 진단 읽기 범위를 검증했다. 원본 채널 라우팅·외부 음원 복원, 물리 OS/IME/dialog/SR·청음·외부 앱 및 전체 200% 편집은 별도 설계/미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/testing/midi-channel-metadata-fixture.ts](../../src/testing/midi-channel-metadata-fixture.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/mixer.md)

수용 기준:

- 명시channel1/10/16·다른파트·정의순서·direct/direction sound의원문/참조/경로/소유파트·마디를안내한다.
- 기존program/bank/mixer진단과score/Native/MIDI/XML·현재채널배정·선택/undo·로컬믹서를보존한다.
- 정의만/무지정과기존metadata만인대조에서channel오경고가없고한국어기본/원문기술정보를보호한다.
- 생성source/control/copy전체XSD·관련/type/실제앱·누적gate와원래실패/미검증을보존한다.

검증:

- failure-firstunit/App및fullpinnedXSD·실제MIDIevent채널비교
- 기존program/bank/mixer/unpitched/수집fixture회귀·type·격리build/Native/XML/MIDI/PDF·도움말검증
- 넓은변경단위의test:all동결→원래terminal→즉시독립검증→receipt본문확인
- GI/M actual960dark/1400light×6생성/1수집14조건84출력·Native14재열기/XML28fullXSD/MIDI14/PDF14/폭별7동일이미지·대표2화면/2PDF검토PASS. 원래2609 종료0·현재1555소스고정·원본수집filehash보존. 새외부앱/채널복원/물리승인아님.
- GI 동일1555소스의chrome글자200%·fine/coarse A16조건(1/3/5경고와무지정)·Native16/source4fullXSD·button72/glyph불변·trustedwheel2–3회/scrollend/마지막원문·읽기7키·같은source초기화PASS. 대표PNG2검토·새제품/PDF/물리승인아님.
- GT 전체749파일7057검사·Node-native5 PASS/외부1skip·1252.55초. 원래45778 종료0→직후 독립검사 종료0→receipt본문확인. 고정73473입력과현재1555핵심소스변경0. 실제Help완료분류검증은후속이며전체목표active/미커밋이다.
- GJ build 원래41706 종료0/Help Q 원래55319 종료0. 실제2조건의완료구역/정본전체문구·현재파트순서채널정책·원본라우팅미지원·strict viewport/hit·Escape상태보존,960darkPNG직접검토PASS. 1555핵심소스GT동일·baseline불변.
- GJ/GT동일1555소스 QA-only MXL B: 실제960/1400×5case10조건/60출력·Native10재열기/MIDI10/두XML20fullXSD/PDF10·원본5fullXSD, 폭별5와기존plain대비10래스터동일·대표화면1/PDF1검토PASS. 원래71695 종료0·source/core해시보존.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-006 · MusicXML 원본 MIDI 악기 이름·장치 지정의 손실 안내

- 현재: 기존 collector/한국어 formatter와 ordered raw facts로 원래 이름·장치 text/port/id·정확 경로·소유파트/마디를 안내한다. 신규26중21red/5대조 후 관련U11파일83·O확대158파일2008/외부1skip·GL타입/빌드 PASS. 실제W20조건120출력/Native20재열기/XML40fullXSD/MIDI20/PDF20·200%읽기X/Y동일16조건도 확인했다. GU누적과 최종Help는 후속이다. GU 전체751파일7083검사·Node5 PASS/외부1skip·1259.12초. 원래21361 종료0→직후 독립검사 종료0→receipt본문 확인; 고정74438입력/current1558소스 변경0. 최종완료Help는 후속이다. GM 완료분류빌드/Help AA실제2조건도 종료0이었고 정본전체문구·완료구역/partial·공백설명·Escape상태와960PNG를검토했다.
- 남은 범위: 명명된 이름/장치 손실 안내와 원문 공백 보존을 검증했다. 원본 장치·port·음색 라우팅, 외부 음원, 물리 OS/IME/dialog/SR·청음·외부 앱과 전체200%편집/상태줄 전체읽기는 별도 범위/미검증이다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/StudioWarningReport.tsx](../../src/renderer/src/StudioWarningReport.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/mixer.md)

수용 기준:

- 유효 원본의 악기 이름/장치·port/id와 소유 파트/마디·정확한 경로를 원문 및 한국어 요약으로 구분한다.
- 명시/무지정·다른 파트·정의순서·header/direct/direction과 기존 program/bank/channel/mixer 진단을 검증한다.
- 기존 음악·Native/MIDI/XML·로컬믹서/음색·선택/undo를 보존하며 새 장치 라우팅 모델을 추가하지 않는다.
- 원래 도구 실패와 유효 source/fullXSD·실제 App 증거, 필요 구현의 failure-first/누적gate를 구분한다.

검증:

- readonly C9case/27fullXSD와 D정확경고대조, 실제E6조건36출력/Native6재열기/XML12fullXSD/MIDI6/PDF6·대표화면1/PDF1검토. 제품 수정이 아닌 누락 관측이다.
- 신규unit/App26중21red/5대조→U관련11파일83/type/buildPASS; O확대158파일2008/외부1skip·source/control/copy60fullXSD. 수집장치 정확기대경로1개만추가하고L실패/sourceprovenance보존.
- GL/W 실제960/1400 20조건120출력·Native20재열기/XML40fullXSD/MIDI20/PDF20·폭별10/이전수집2래스터동일·대표화면2/PDF2검토PASS. GK S/T 원문공백red를보존하고pre-wrap으로수정했다.
- GL/current1558 동일 X16/Y강화동일16조건: chrome200 fine/coarse·Native각16/source4fullXSD·원문/각단어가로경계/마지막glyph·읽기7키/실제wheel·초기화·glyphfont보존PASS. 물리/전체200편집출력/상태줄전체읽기승인아님.
- GU 전체751파일7083검사·Node-native5 PASS/외부1skip·1259.12초. 원래21361 종료0→즉시독립종료0→receipt본문확인. 고정74438입력/current1558핵심소스변경0. 최종완료Help는후속이다.
- GM build 원래51850 종료0·Help AA 원래50837 종료0/960dark·1400light2조건: 정본전체안내/원문공백·완료구역·라우팅미지원partial·strict bounds/hit·Escape상태보존PASS,960PNG검토·current1558소스GU동일.
- GM/GU동일1558소스 MXL B QA-only: 실제8조건48출력/Native8재열기/MIDI8/두XML16fullXSD/PDF8·source4fullXSD,폭별4쌍/plain대비8래스터동일·대표화면1/PDF1검토PASS. 원래52582 종료0·source/core해시보존·제품수정없음.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-007 · 원본 MIDI 타악기 음 번호 지정의 가져오기 손실 안내

- 현재: 신규17 중13red/4대조와 GM 실제6흐름의 누락을 보존했다. 기존collector/한국어adapter 수정 후 관련84/type·MusicXML158파일2017검사/외부1skip, F격리build 및 H18흐름/108출력( Native18재열기/XML36fullXSD/MIDI18/PDF18)·폭별9raster동일·대표화면1/PDF2를 확인했다. 현재1561소스, 새누적전체와최종Help는후속이다. GV753파일7102검사·Node5/외부1skip, 고정75207입력/1561소스변경0과 J8조건200%상태줄/Native8도확인했다. 최종L격리build/Help M4조건과설명서App4검사도통과했다. 명명범위완료,미배포.
- 남은 범위: 명명된 손실 안내 범위는 완료했다. note/unpitched 지원·원본 타악기 routing/실제 음 번호 적용·외부 앱/청음 검수는 추가하지 않았다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/musicxml/schema/musicxml-4.0/musicxml.xsd](../../src/musicxml/schema/musicxml-4.0/musicxml.xsd), [src/musicxml/unpitched-import-limits.test.ts](../../src/musicxml/unpitched-import-limits.test.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/sound-and-playback/mixer.md)

수용 기준:

- header최소/최대·두번째파트·part-list재정렬·direct/direction sound·복수악기·기존program혼합의 원래값/악기ID/주소를 안내한다.
- 한국어 기본 손실/확인 행동과 원래 raw 기술정보를 제공하고 무지정대조에 경고를 만들지 않는다.
- 현재 score/Native/재생/믹서/XML/MIDI 의미와 다른 경고를 보존하며 무음정음표/새 routing/schema를 확장하지 않는다.
- 실패core/App→관련/type→격리 build/960/1400 실제 안내와 Native/XML/MIDI/PDF→대표이미지검토→현재전체검증을 구분한다.

검증:

- readonly probeB7조건/21fullXSD, 지정6의 경고누락·대조1. A QA문법/실행실패는 보존했다.
- 신규 core/App17검사 중13실패/4대조, 원래30050 exit1을 관측했다.
- 원래79435 D6흐름/Native6 누락관측; 수정후관련7파일84/type·MusicXML158/2017/외부1skip·원래88558 F build PASS.
- 원래99297 H18흐름/Native18재열기·XML36fullXSD/MIDI18/PDF18·폭별9래스터동일, 대표화면1/PDF2검토,1561소스변경0.
- GV원래33489/독립8485 exit0·receipt본문확인,753파일7102검사·Node5/외부1skip·75207입력/1561소스변경0. 동일제품J8조건/Native8·원래36491 exit0.
- 최종L build95263/Help M80774/설명서 App47339 종료0. 실제4 Help조건에서007/001 정본전체문구·done/partial 완료구역·Escape 상태보존, 대표Help/200% PNG각1검토. 현재1561소스는GV와같다.
- 현재L/GV동일1561소스 MXL실제10흐름/Native10재열기·XML20fullXSD/MIDI10/PDF10,원본5fullXSD·폭별5/plain대비10raster동일·정확사본40쌍/Native4필드10대조·대표화면1/PDF1검토 PASS. 원래48853 exit0, QA-only/새전체반복없음.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-025-033 · 독립 임시표·사용자 확장 표기의 가져오기 손실 안내

- 현재: 직계 독립 임시표와 사용자 확장 표기를 보존하지 못할 때 기존 경고 수집기와 한국어 안내로 손실을 알린다. 원래 파트·마디·음표·container·중복 주소와 parsed source payload는 기술 정보에 보존한다. 기호 지원을 새로 구현한 것은 아니다. 제품 포함 GY 전체 755파일/7130검사와 Node5, 실제 14출력흐름 및 UI200% 12읽기흐름을 검증했다.
- 남은 범위: 독립 임시표·확장 기호의 표시/편집과 모델 원문 보존은 미지원이다. 외부 MuseScore·물리 IME/터치·OS dialog·스크린리더는 미검수다. 최종 Help는 실제960/1400에서 미배포 손실 안내 범위로 확인했다. 앞선 GX 실패 로그와 원인 미확정은 보존한다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-025-002, SMG-025-023
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/testing/additional-notation-fixture.ts](../../src/testing/additional-notation-fixture.ts)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 직계독립임시표/확장기호의정확한원래주소와값·빈기호·중복container를안내한다.
- 한국어우선/기술정보분리와원래warningpayload를유지한다.
- 기존supportedscore/Native/MIDI/두XML·일반임시표/ornament정책을보존한다.
- 실제960/1400·출력·관련검사/전체gate/문서와미검수를기록한다.

검증:

- probeA valid5 XSD:source3silentloss/controlplain0/ornament1 warning; before model/native/MIDIprojection unchanged.
- core6red12controls +App3red1control; focusedG4files42/typeG PASS.
- actualF6bug/2control flows,Native8/twoXML16fullXSD/MIDI8; no warning region. Ehelperlabel failure retained, Flabel corrected. Product fix actualproduction and whole pending.
- I isolated build/J actual14flows: Native14reopen/MIDI14/twoXML28fullXSD/PDF14one-page+images14 (84files). red32Native/MIDI/XML exact byte pairs; width7rasterpairs and equal supported-music plain PDF. Source1564 unchanged. 2notice/2PDF images reviewed; profile/fixedK +manual4 pass. GX whole/density/Help final classification still pending.
- GX authoritative receipt:752passedFiles/3failedFiles,7101passedTests/29failedTests(27timeout+2mockcount),external1skip,Node not run,16115.94s/frozen76762 unchanged. Same-source triage3files76PASS/531intentional filtered,58.09s; wrapper wall/active58.486s,current1564 unchanged. Sleep/wake inside run observed, causality not proven. GY controlled test:all pending, no assertion/testTimeout change.
- GY original45839/independent50211 exit0 and receipt read:755files/7130tests+Node5,external1skip,1344.97s,frozen76797unchanged;clock delta0.077s and own-PID idle guard exit0. EarlierGX29fail preserved, cause not proven.
- O original40629 exit0:960dark/1400light×750×exactUI2x×fine/coarse×3cases=12flows,64first/last reading endpoints strict Range/hit,Native12save/reopen,current1564unchanged. Two screens reviewed. M positioning and N fixture-kind helper failures retained; no new product change.
- Q metadata-only isolated build/typecheck/App.manual4 PASS; R original63734 exit0 actual Help960/1400 canonical loss-only summary under resolved-work section, partial feature support unchanged; logical Escape/state preserved,1567inputs unchanged. No repeat whole claimed after documentation-only update.
- MXL followup A original3036 exit0:4same-source compressed fixtures×960dark/1400light=8actual flows,Native8reopen/MIDI8/XML16fullXSD/PDF8one-page+images8,total48files. Same-source plain Native/MIDI/XML32byte pairs and PDF8raster pairs equal; width4pairs equal;1567inputs unchanged/network0. QA-only, no new feature/product mutation.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-033-008 · MusicXML 원본 재생 연주법 지정의 손실 안내

- 현재: 원본note/play와direct·direction sound/play의연주법을현재모델이보존하지못하면한국어손실안내를표시한다. 원래파트/마디/음표·play순번·instrument와parsedsource는기술정보에남는다. 11red/5대조후관련33/type/MusicXML2045·실제F18출력/G12확대읽기와GZ전체757파일7146검사/Node5가통과했다. 원래연주법적용모델은추가하지않았다.
- 남은 범위: 원래연주법의재생·모델복원은미지원이며localmixer mute와별개다. 최종Help는실제960/1400에서미배포손실안내범위로확인했다. 물리IME·OSdialog·스크린리더·청음·외부앱은미검수다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: SMG-033-001, SMG-033-003
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/testing/play-technique-fixture.ts](../../src/testing/play-technique-fixture.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 원래note/play와sound/play의지시·instrument참조·중복소유주소를잃을때안내한다.
- 원래source기술정보와한국어우선안내를분리하며local믹서음소거와동일한기능이라고표시하지않는다.
- empty/play와일반대조군에불필요한경고를만들지않고기존Native/MIDI/XML/기보·dirty·선택·undo를보존한다.
- 실제960/1400 및관련회귀·전체gate·도움말분류와미검수범위를기록한다.

검증:

- probeA:7silent-loss/2controls;source/control/copy27fullpinnedXSD;score/Native/MIDI/XML projection equal. Product unchanged.
- RedC original25505 exit1:core7/App4=11failed,5controlsPASS. GreenD original34312 exit0:4files33tests,typeD original93451 exit0.
- ActualF original99789 exit0:18flows14warnings4controls,Native18reopen/MIDI18/XML36fullXSD/PDF18onepage+images18=108files;red32Native/MIDI/XML exactbyte pairs,red8PDFraster pairs,width9pairs equal;1567sources unchanged.
- DensityG original19674 exit0:12flows750high/exactUI2x/fine-coarse,48firstlastRange+hit endpoints,Native12reopen,1567sources unchanged;2screen+1PDF reviewed.
- MusicXMLH original6412 exit0:160files2045tests,external1file1testskip,4.70s. HistoricalresponsiveH original44380 exit1 retained (wrong omitted profile flag);correctProfileI original47541 andfixedH original14651 exit0,baselineunchanged. NewwholeGZ/Help pending.
- GZ original34566 exit0, immediate independent4956 exit0 and receipt read:757files7146tests+Node5,external1file1testskip,1336.98s,frozen77574unchanged. Guardexit0/wall-active0.019s. No assertion/testTimeout/baseline changes.
- L metadata-only isolatedbuild andApp.manual4 PASS. M original78503 exit0 actualHelp960/1400 exact title/summary under completed-unreleased-work section withpartial scope andnon-support explicit;logicalEscape/state preserved,1570inputs unchanged. Core1567 sameafterGZ;no repeatwholeclaimed.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-036-010 · MusicXML 마디 우선 구조의 미지원 안내

- 현재: 유효한 score-timewise를 현재 미지원 구조로 구분하고 한국어 지원 경계·파트 우선 사본 확인과 기술정보를 제공한다. 기존 허용 범위·score/Native/undo·두 XML/MIDI/PDF는 보존한다. 관련/type/production·확대읽기/profile/fixed 및 HA759파일7159검사·Node5가 통과했다.
- 남은 범위: 명명된 미지원구조 안내 범위는 완료했다. score-timewise 변환·가져오기와 모든 MusicXML 기능 지원은 추가하지 않았다. 외부 앱 변환·물리 OSdialog/IME/SR 검수는 별도다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/musicxml/parse.ts](../../src/musicxml/parse.ts), [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/testing/timewise-format-fixture.ts](../../src/testing/timewise-format-fixture.ts), [src/musicxml/timewise-format-feedback.test.ts](../../src/musicxml/timewise-format-feedback.test.ts), [src/renderer/src/App.timewise-import-feedback.test.tsx](../../src/renderer/src/App.timewise-import-feedback.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/file-management/working-with-musicxml-files.md)

수용 기준:

- 유효한 미지원 root와 문법 오류·필수 요소 누락을 구분하고 단순 문자열로 판정하지 않는다.
- 한국어 지원 경계·원본 보관·파트 우선 사본 확인 방법과 기술정보를 제공한다.
- 현재 문서·dirty·선택·undo·Native 경로를 보존하고 지원 사본 재시도 및 기존 출력을 확인한다.

검증:

- RedA 6failed/7controls passed; pinned fullXSD2. ActualH 960/1400×4거부·2재시도,Native10/XML4fullXSD/MIDI2/PDF2+이미지2. 지원 사본은 정상이며 원래 진단은 필수score-partwise누락이다.
- GreenB 관련4파일17검사 통과. TypeB는 새 mock filePath누락4건으로 실패했고 원래 로그를 보존했다. 수정 후 검증 진행 중.
- TypeC/MusicXML C164파일2062검사 PASS/외부1skip;buildB·actualJ4거부2재시도/20파일·원래H대비18byte/raster쌍동일. K4조건200%fine/coarse·16Range끝점/Native4 PASS. profile/fixed/누적HA gate는후속.
- HA 원래4648 종료0→즉시독립83132 종료0→receipt본문READ:759files7159tests+Node5,external1file1testskip,1354.13s,78113입력변경0. profileL/fixedL/manual4·문서5gate PASS. 새최종Help분류는후속metadata다.
- O최종metadata-only build/P Help960/1400두조건 PASS;done구역·전체publicSummary·partial·Escape상태유지/대표1400검토,1573입력불변.
- 후속MXL actualA6흐름4거부2재시도·Native10/XML4fullXSD/MIDI2/PDF2·이미지2=20출력,일반XML J와18byte/raster쌍동일;현재1570소스HA동일·대표960검토.
- 후속 recent D4조건(960/1400×XML/MXL)4거부4복원재시도/Native8재열기·최근목록불변·1570소스HA동일. 세조건의오류가부분적으로viewport아래인별도UX공백은SMG037004로등록하며즉시가시성PASS로쓰지않는다.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-037-004 · 긴 최근 목록의 시작 화면 오류 노출

- 현재: 기존 Banner·viewport intent로 현재 오류만 노출하고 초점을 유지한다. 늦은 최근 목록/읽기 선택 해제와 이전 오류A→새 요청B 대기를 구분한다. 새 요청 전 안내는 B의 자동 노출을 얻지 않으며 같은 문구의 새 결과는 정상 안내한다. 관련110/type·buildE·실제F4/G6/J2·Native12바이트동일,1573소스불변. HD762파일7189검사·Node5/외부1skip,고정79505변경0을원래/독립종료및receipt본문으로확인해이범위done/partial로분류했다.
- 남은 범위: 현재 요청의 시작 화면 오류 노출, 이후 수동 이동/읽기 우선, 이전 오류와 새 요청의 소유권 분리 범위만 완료했다. 전체 접근성/물리OS·IME·SR는 별도다. 최근 파일 읽는 중의 진행 표시와 반복 reload 기한 실패의 원인은 별도 조사 후보이며 이 구현의 완료로 대신하지 않는다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [src/renderer/src/studio-r3.css](../../src/renderer/src/studio-r3.css), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/App.start-feedback-viewport.test.tsx](../../src/renderer/src/App.start-feedback-viewport.test.tsx), [src/renderer/src/App.start-feedback-late-list.test.tsx](../../src/renderer/src/App.start-feedback-late-list.test.tsx), [src/renderer/src/App.start-feedback-request-owner.test.tsx](../../src/renderer/src/App.start-feedback-request-owner.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/accessibility.md)

수용 기준:

- 실제최근목록을정상열기로만든뒤실패했을때오류의초기좌표·전체문구/기술정보도달성을측정한다.
- 필요하면기존공통Banner/토큰·scroll/focus intent를재사용해새오류를알아볼수있게하고더새로운수동이동/입력은빼앗지않는다.
- 시작작업·최근목록·취소/retry·정확Native/undo·기보와기존파일열기소유권을보존한다.

검증:

- 발견D4조건:정상거부/복원재시도4·Native8PASS,초기가시성1/4완전·3/4부분노출·수동scroll후4/4도달. 새제품수정은미실행.
- 후속은의미있는failure-first App/renderer 및실제960/1400·짧은높이/확대읽기로판정한다. 물리IME/OSdialog/SR는별도다.
- RedA7실패/11대조 중wizard의기존명시초점복귀를QA가body고정으로오해했다. 실제기존return target을확인한RedB6실패/12대조를보존했다.
- GreenC관련29/typeC PASS;명시retry재개/초기background2대조를보강한GreenD6files64tests와typeD 결과를확인한다. 실제UI와누적전체는아직미완이다.
- RedModalJ1fail21controls→nativeDialog[open]guard. GreenK7files69/typeK PASS,source1571. Lbuild/Q8conditions16RangeEndpoints+Native16reopen;N16intentconditions Native16,4trustedwheel/scrollend and2CDPArrowDown withnewmanualownership preserved. profileO/fixedO PASS,no baseline changes.
- QA F/I/J/P failures retained;P ownreload deadline cause unestablished. Q same deadline withclean history/idle navigation assertion andlifecycle telemetry passed;not a product reload fix. NewwholeHB pending;HA7159 precedes this controller.
- HB 원래22781 exit0→즉시독립43028 exit0→receipt본문READ:760files7181tests+Node5,external1file1testskip,1277.73s,frozen78897unchanged. Current1571sources. Late-valid-list andreading-selection-clear source hypotheses remain to audit before final classification.
- 후속RedB실제4위반2대조/Native6,RedC3failed1control→GreenD8files73/type;buildE/F6violations0 Native6bytepairs/G8conditions16RangeEnds Native16;H15후reloaddeadline exit1·J독립1PASS→K고유16matrix PASS. profileIclassic15/fixedI,1572core불변·baseline불변. HC전체/최종Help미완.
- HC 원래11803 exit0→즉시독립22553 exit0→receipt본문READ:761files7185tests+Node5,external1file1testskip,1313.10s,frozen79250unchanged. 최신App/new4tests포함. 이전오류/새대기요청/늦은목록소스가설은미확정.
- 요청owner RedA실제4조건(reveal1→2)/Native4·RedB단위4실패→GreenD10files110tests/typeC/buildE;실제F4이전오류가드/Native4bytepairs,G6legacy/Native6bytepairs,J2동일문구새결과/정확focusnode/Native2bytepairs. H의body문자열초점식별도구실패보존.1573source불변·baseline불변·HD전체/최종Help미완.
- HD 원래29035 exit0→즉시독립51130 exit0→receipt본문READ:762files7189tests+Node5,external1file1testskip,1292.70s,frozen79505unchanged. 현재1573core불변·baseline불변. 구현/누적gate범위done-partial,최종Help11/14후속.
- 최종M빌드/App.manual4 PASS;N 실제Help960dark/1400light x11/14장4조건 canonicaldone-partial요약·문구·bounds/hit·6RAF+220ms scroll/focus·닫기후state/1709입력불변 PASS. 대표2화면직접검토. 960troubleshooting PNG쌍차이는본문밖목차scrollbar영역12470pixels에한정,다른3쌍해시동일;전체이미지동일/외형변화원인은주장하지않는다.1573core HD후불변,문서metadata만갱신.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)

## SMG-037-005 · 최근 MusicXML 읽기의 진행 상태

- 현재: 공통 Item/Text로 현재 MusicXML행 읽기상태를 표시하며, 현재행이 목록삭제로 사라져도 파일명과 읽는중 안내를 최근영역에 유지한다. 기존 목록삭제는 읽기취소가아니며 Native전역busy·최신요청과파일보존정책을 유지한다. 최신행삭제후속 관련108/type/buildE·실제F4/G4/Native8bytepairs·Help9 H2와HF763files7203tests/Node5를확인했다. 이전현재행/재시도HE7199·Help9/11/14도각기역사적범위로보존한다.
- 남은 범위: 현재행/행삭제후 대기안내·최신요청·재시도·검증한density/Help범위만완료했다. Native는기존busy를유지한다. 물리OS/실기기·IME·SR·외부앱과전체파일열기UX는별도다. 전체parity완료가아니다.
- 정책 변경 검토: 기존 계약을 유지하는 작은 범위부터 조사한다.
- 의존성: 없음
- 소스: [src/renderer/src/App.tsx](../../src/renderer/src/App.tsx), [packages/ddirori_web/src/index.tsx](../../packages/ddirori_web/src/index.tsx), [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json), [src/renderer/src/App.recent-xml-progress.test.tsx](../../src/renderer/src/App.recent-xml-progress.test.tsx)
- 공식 근거: [참고 1](https://handbook.musescore.org/navigation/accessibility.md)

수용 기준:

- 대기중현재MusicXML행에읽는중상태를표시하고다른항목의선택가능성과초점을유지한다.
- 오래된응답은새요청의상태를지우지않으며동일경로재선택/새실패/정상완료와wizard·Native열기·unmount소유권을보존한다.
- Native기존busy·score/native·dirty/undo/선택·출력의의미를변경하지않는다.

검증:

- 제품변경전probeA4조건중XML2누락/Native2대조통과·Native4정상저장,1573core불변. 고정IPC전달지연이며실제느린디스크/물리OS검수로주장하지않는다.
- GreenC8files88tests/typeC/Dbuild PASS. ActualE960dark/1400light XML진행2/Nativebusy대조2·status bounds/hit/현재행focus/Native4bytepairs. ActualF2 A→B→oldercompletion→currentunsupportederror→recovery/Native2bytepairs.1574core불변·baseline불변. density/missingretry/Help/통합whole후속.
- 후속I89pass1fail:새missingretry2PASS,기존owner초기RAF fixture불안정. 동일제품단독owner4PASS→asyncact준비/큐존재assert추가후K8files90/typeK PASS,원래assert/timeout유지. J실제4조건960/1400x750/fine2/coarse2/긴한글파일명과Native8저장재열기bytepairs;L실제파일없음/복원4조건과Native4bytepairs. 현재1574소스불변,제품D동일/테스트만후속변경,baseline불변.
- HE 원래15001 exit0→즉시독립50353 exit0→receipt본문READ:763files7199tests+Node5,external1file1testskip,1285.31s,frozen79969unchanged. 최근진행10검사와ownerasyncact준비포함,제품/테스트1574소스HE후불변·baseline불변. 구현/통합gate범위done-partial,최종Help9/11/14후속.
- 최종O빌드/App.manual4 PASS. P실제Help960dark/1400light x파일9의3문단/문제해결11/차이14=10조건,canonical done/partial전체요약·bounds/hit/가로범위·정확focus node/6RAF+220ms scroll안정·닫기후state/1711입력불변 PASS. 대표2화면직접검토,1574제품/테스트소스HE후불변·문서metadata만갱신·baseline불변.
- 2026-11-11 후속probeA 960/1400 XML행삭제중진행누락2·Nativebusy대조2, Native4기존E와byte동일. 신규4red/기존10PASS. 목록삭제는읽기취소가아닌기존정책유지;Fallback 구현후관련3files28/typeD PASS.
- 행삭제후속 I10files108/typeD/buildE PASS;실제F4+G4긴이름/2x/fine-coarse/750px와Native8기존Ebytepairs·1574불변,Help9 H2조건/1728입력불변 PASS. HE7199는이제품수정전이며새통합gate/최종Help14후속.
- HF 원래19425 exit0→즉시독립4649 exit0→receipt본문READ:763files7203tests/Node5 PASS,external1file1testskip,1345.88s,frozen80385unchanged. 행삭제후속제품/신규4검사포함,1574제품/테스트HF후불변·기준이미지불변.
- 최종L빌드/App.manual4 PASS. M실제Help9/14 두폭4조건에서목록삭제/읽기계속과canonical전체done-partial요약·정확focus/scroll·viewport/hit·상태보존/1729입력불변PASS. 대표1400지원범위직접검토,HF후1574제품/테스트소스불변·baseline불변.

기록: [docs/releases/studio-alpha40-20261121/local-evidence-index.json](../../docs/releases/studio-alpha40-20261121/local-evidence-index.json)
