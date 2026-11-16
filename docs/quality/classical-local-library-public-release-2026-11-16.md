# Play 공개 출시 실행 기록 — 2026-11-16

대상은 지속 worktree `ddirori-play-library-context-20261031`와 branch `feature/ddirori-play-library-context-20261031`다. 시작 HEAD는 `f57602c18ce55031833faabf37a073da437453b9`이며 기존 누적 미커밋 변경을 보존한다. 이전 최종 소스279개·증거152개·외부 snapshot hash의 일치를 확인했다. 이전 report나 snapshot은 수정하지 않는다.

| 구분 | 수용 조건 | 실패/보존 계약 | 담당·현재 상태 |
| --- | --- | --- | --- |
| 코드 | 앱/Dart·배포/Ruby가 같은 v1/v2 fixture를 읽고 잘못된 구조를 거부 | unknown/private/type·P0/P1 차단, 자동 선언과 물리 결과 분리 | PASS: host830, Ruby112 |
| 후보 연결 | 피드백을 실제 소스/IPA 후보와 별도 비식별 manifest로 연결 | 같은 버전/build의 다른 소스나 오래된 응답을 재사용하지 않음 | 구현·단위 PASS, 실제 후보와 사용자 receipt 대기 |
| 운영 페이지 | 검토 가능한 초안·실제 공개 URL·앱 define 일치 | 승인 없는 게시/다른 웹 작업 덮어쓰기 금지 | PASS: 사용자 게시 승인·운영 URL 확인 |
| checkpoint | 검증된 Play 변경만 선별 commit/push·복구 자료 | 실제 제품 commit만 pin, 기존 작업·다른 앱 보존 | agent, 검증 후 |
| 후보 | 확정 버전/새 build의 artifact·서명·IPA hash·내부 접근 확인 | 내부 전용/공개용 구분·기존 빌드 보존 | 1.0.0 사용자 확정·Apple 기존1~4 확인·후보5 준비 |
| 사용자 QA | 실제 후보를 설치한 Xs 결과와 지원 기기 범위 확인 | 개인 음원/경로 수집·미확인 PASS 금지 | 사용자, 새 후보 후 |
| 스토어 | 최종 문구·촬영·선언·심사 정보·정확한 원격 변경 목록 | 게시/스토어 쓰기/심사/출시 단계별 명시 승인 | agent 준비/운영자 승인 필요 |

시작 preflight 단위 테스트는8개 중1개 실패했다. 실제 metadata가 pending인데 테스트가 source checkpoint pass를 고정 기대하는 기존 상태 의존 문제다. v2 계약 반례와 함께 테스트를 독립적인 입력 계약으로 정리한다. 이 실패를 기존 제품 기능 결함이나 성공으로 바꿔 기록하지 않는다.

Sites 조회에서 기존 Play 프로젝트 `appgprj_6adf02812900819183930e3a60cf7231`은 public·version1이다. 기존 `ddirori.mannlab.app` 연결은 DNS/SSL pending이다. 기존 모브랜드 웹 작업 공간은 읽기만 하며 수정하지 않는다. 새 사이트 등록·공개 배포·접근 정책 변경을 하지 않았다.

판정은 현재 No-Go다. 코드 검증/자료 준비, 내부 후보, 심사 제출, 심사 승인, 실제 공개를 구분한다. 목표는 공개 출시 전까지 완료로 표시하지 않으며 외부 입력을 기다리는 동안 독립 작업을 계속한다.

## 이번 실행에서 확인한 사실

- 전체 Flutter host830개·analyze·오디오 fixture check 통과. 실제 iOS composer/병합/백업→복원→undo 회귀1개 통과. 이는 사용자 Xs 청감이나 store 후보 설치 증거가 아니다.
- 배포 Ruby112개·400 assertions 통과. 공유 synthetic fixture는 Dart/Ruby 계약 검사용이며 실제 사용자 응답이 아니다. 후보 binding은 실제 IPA/source hash·버전·시각·사용자 관찰 receipt를 검사하며 물리 검수를 대신하지 않는다.
- 사용자가 승인한 웹 범위만 production ddirori 저장소에 반영했다. commit `5a0d7f90f5a176966fffc9f06ddb344d793cf6a3`, [Pages run43805476424](https://github.com/mann-lab-apps/ddirori/actions/runs/43805476424) 성공. `/play/privacy/` 신규·`/play/` 링크·시행일2026-11-16, 운영자만랩·공개 이메일daga4242@gmail.com. DNS/GA/다른 제품은 보존했다.
- 웹 검토: 기존6페이지/181개 로컬 참조와 새 경로를 검사했다. 390px 기본·320px 글자2배·1024px 글자2배에서 실브라우저 캡처/가로 overflow/키보드 skip-link 확인. 글자2배는 DOM 계산 크기 기반 대체 검사이며 OS Dynamic Type 또는 물리 VoiceOver가 아니다. 기존 사이트는 dark preference에서도 밝은 테마를 유지한다.
- 기존 배포 프로젝트의 YAML→runtime JSON과 `Deployment::Pipeline`을 재사용한다. Play의 Android 배포 서명은 미설정이므로 `android:null`을 명시하고 Android 배포 명령은 차단한다. Android 앱 기능을 제거하지 않는다. 다른 앱의 기존 양 플랫폼 서명 검사는 유지한다.
- 서명된 기존 Play0.1.0(1) IPA를 실제 검사한 baseline으로 사용한다(SHA256 `373542867ce5a519b5711712e59fbd287f7890604ab3d0e1de1c57e6e68f2127`). 원본 IPA와 기존 archive는 보존한다. 새 export의 `testFlightInternalTestingOnly:false`는 후속 공개 심사 가능한 바이너리를 만들되 현재 배포 대상은 내부 QA에 한정한다.
- issuer 정보는 사용자 채팅으로 재요청하지 않고 기존 GitHub Secrets 인증으로 읽기 전용 조회했다. [run43807181275](https://github.com/mann-lab-apps/in-c/actions/runs/43807181275)에서 앱6828809673/bundle 일치·public draft1.0·기존build1~4 VALID를 확인했다. 사용자가 확정한 목표1.0.0과 원격 초안1.0의 차이는 남아 있으며 스토어 쓰기 승인 전 수정하지 않는다. buildUploads 조회는 ROLE_NOT_VALID403으로 진행 중 업로드 유무를 보증하지 않는다. 별도 진단 ref만 push했으며 실제 desktop Release workflow는 변경하지 않았다.

## 스토어 촬영 범위

Apple의 기기/locale별 최대10장 규칙에 따라 기존12 scene 중7개만 이번 제출 세트로 선택했다. 선택은 library, song_browse, playlist_create, movement_queue, favorites, imslp_search, work_detail이다. library_search, metadata_edit, library_sections, recording_detail, browsing_playback은 중복 설명을 줄이기 위해 촬영 세트에서 제외했으며 제품 기능과 테스트는 유지한다. iPhone/iPad 각7장 총14장을 실제 고정 소스에서 촬영할 예정이며 현재 촬영 완료로 판정하지 않는다.

운영자 확정값은 버전1.0.0·만랩·ddirori.com URI·기존 승인 아이콘·무료·한국 우선이다. 공개 Store 쓰기·심사·출시와 사용자 물리 QA는 이 결정으로 자동 승인되지 않는다.

추가 읽기 전용 확인: 기존 self-hosted Mac runner에서 사용자 지정 Desktop 키와 기존 Secrets의 issuer 조합으로 [run43809020423](https://github.com/mann-lab-apps/in-c/actions/runs/43809020423)이 성공했다. 빌드·업로드1~4 모두 COMPLETE/VALID이고 다음 페이지가 없다. 앞의 ROLE_NOT_VALID는 repository-secret 역할 제한이며 사용자 지정 키에서는 해결됐다. issuer/키 내용을 로그·저장소로 추출하지 않았다. 확인 시점 새 후보 번호5가 비어 있음을 검증했으며 공개 Store 쓰기는 하지 않았다.

## 제품 checkpoint

실제 제품 commit은 `2814dbd30aa5764ec70544772d6fcd418260367f`다. 이전 누적 Play 기능/QA와 이번1.0.0+5·운영 URL·feedback/binding 도구를 검증 후 포함했으며 다른 앱의 작업은 포함하지 않았다. 제품 fingerprint v2는 `ff88d244cb3d8caf3d868f462a1357827d2f235c7cb69dbfea1953f59c63a982`다. 이 commit이 존재한 뒤 YAML source를 pin하고 content.reviewed와 미완료 manual은 false/pending으로 유지했다. 빌드 checkout은 이 제품 commit을 그대로 사용하고 후속 메타데이터 commit을 제품 소스로 오인하지 않는다.
