# 실패와 검증 도구 교정

실패 원본은 영구 worktree의 `out/brand-qa`에 보존한다. 아래는 성공으로 바꾸거나 삭제한 기록이 아니다.

| 기록 | 원인과 처리 |
| --- | --- |
| 최초 unsigned / local ad-hoc 실행 | 앱 JS 이전 SIGTRAP. 서명만 바꿔서는 해결되지 않았다. CFBundleName 정규화만 바꾼 별도 대조군에서 시작을 확인하고 실제 builder 계약에 회귀를 추가 |
| identity=- 시도 | 의도와 달리 로컬 Developer ID 선택/서명이 시작되어 자체 프로세스를 중단. 불완전한 산출물을 사용하지 않음. 최종본은 자동 인증서 검색 없이 별도의 offline ad-hoc 서명 |
| suite-a.log | 도움말·빠르기 설명의 이전 문구2개 실패. 새 문구로 기대값을 이행하며 닫기·focus·미지원 음가 등 기존 assertion 유지. 실패 때문에 Node 단계는 해당 실행에서 미도달 |
| keys-red.log / meter-red.log | 요청한 키 동작5개와 우클릭 진입 누락을 먼저 재현 |
| key-migration-broad.log | 624 PASS/1 FAIL. 메뉴 ↓가 전역 음높이 변경까지 실행한 제품 회귀. 소비된 키의 defaultPrevented를 존중하도록 수정하고 원래0회 수정 assertion 유지 |
| curve-partial-red.log | 줄바꿈 연결부까지 뾰족하게 닫히는 문제를 재현. 실제 끝과 hanging end를 분리 |
| profile-current.log / fixed-current.log | filled 슬러와 예전 centerline bbox 차이. 변경 전후 실제 출력·다른 metrics 동일성을 검토한 뒤 각각 y/높이9값만 변경. 원본 기준과 diff 보존 |
| compat-integrated-c~j | 이미 clean인 파일의 저장 완료·가시성·스크롤된 메뉴 좌표에 대한 도구 가정 오류. 숫자 input의 selectionStart 미지원도 별도로 확인. native 편집 명령의 실제 빈값/입력 결과를 기다리고, hit/geometry 재확인과 실제 wheel로 수동 viewport 소유권을 준 뒤 클릭. DOM click·지연 증가로 우회하지 않음 |
| compat-integrated-k | F♯→반음 증가가 기존 엔진에서 F𝄪로 기록돼 G라는 철자 assertion이 실패. 실제 음높이는 같았다. native 파일의 resolved MIDI pitch를 검사하며 기존 이명동음 정책을 유지 |
| compat-integrated-l | quartet의 실제 파트 ID가 violin-1인데 도구가 part-1을 가정. 실제 fixture의 마디 ID로 선택. m/n은 실제 메뉴·native 파일·undo·PDF를 통과 |
| package-config-current.log | Vitest 파일을 node --test로 잘못 실행. 올바른 npm test 실행에서5검사 PASS |
| PDF 보조 도구 | 시스템 Python에 PIL이 없어 이미지 조합을 중단. Poppler 렌더링과 원본/변경 이미지의 개별 직접 검토 사용. 제품 의존성 변경 없음 |
| OS 캡처 | 숫자 선택·Swift 도구 구문·반환 파일명·자동 숨김 Dock의 화면 밖 좌표는 제품 오류와 구분. 실제 volume 조회, own window/AX 정보와 Dock 노출 후 자체 tile만 캡처. 기존 캐시·설정 초기화 없음 |

현재 통과는 일반적인 모든 포인터 이동/스크롤 소유권 문제의 해결 증거가 아니다. 이 도구가 사용하는 준비 동작과 실제 제품 동작의 차이를 구분한다. 이전 별도 작업의801 pointer 관찰까지 해결했다고 주장하지 않는다.

최종 ASAR 해시 비교의 첫 probe는 builder가 기본 제외하는 piano/.gitignore까지 archive에서 찾다가 중단됐다. 배포하지 않는 VCS metadata와 runtime을 구분해 모든 컴파일 main/preload/renderer8파일은 정확히 일치함을 확인했다. 별도의 실제 packaged sample/worker 검사는 유지된 assertion으로 통과했다.
