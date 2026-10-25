# 구현 책임·우선순위·인계

## 현재 API로 충분한 부분

| 구성 | 실제 공통 API | 앱 책임 |
| --- | --- | --- |
| 빈 상태·첫 성취 | StatePanel/Bach·Text·Button·Flutter 대응 | 실제 신규/기존/수신/복구 상태와 표시 빈도 |
| 가져오기/등록 | Item·Input·Select·Dialog/Sheet·Banner·Progress | 파일 picker·권한·copy·catalog·validation·비동기 결과 |
| 연결 후속 안내 | ProductSignature+정확한 행동 Button | 현재 capability·수동 가이드·명시적 source/receiver 결과 |
| 설치/불명 상태 | ServiceLink의 현재 availability | 진짜 설치 판정·URL allowlist·manual fallback |
| 작업 면 | 기존 앱 viewer/toolbar·공통 도구 조합 | audio/PDF/score command·좌표·page·selection·undo |

새 공통 API가 필요한 blocker는 없다. R3의 단계 목록은 의미 있는 HTML recipe이며 새로운 공통 Stepper 제품을 만들지 않았다. 네이티브 picker/menu와 웹의 시각 차이는 플랫폼 차이다. 네이티브 chooser를 웹 모양으로 복제하는 제품 요구가 아니다.

ServiceLink action label 확장은 설계 후보지만 현재 두 실제 구현 소비처를 충족하지 않는다. 먼저 두 앱의 수동 안내 composition에서 실제 수요를 확인한다. 공통 변경을 제안할 때는 재현·현재 API 한계·두 소비처·전후 API/token·migration·회귀/다른 서비스 영향을 기록한다. 파일/라우팅/엔진을 UI 패키지에 넣거나 앱별로 공통 소스를 복사하지 않는다.

## 권장 구현 순서

| ID | 우선 | 범위·이유 | 수용 기준 |
| --- | --- | --- | --- |
| R3-S01 | P1 · 첫 점검 | Score import/linked-file의 persistence 전 모델 갱신과 실패 결과 조사 | 성공·취소·실패·부분 native 수신에서 목록/사본/metadata 정합성, retry 의미를 실제 테스트로 확인. 필요 제품 수정은 앱 controller/store 범위 |
| R3-P01 | P1 | Play 가져오기 결과→작품/녹음 정리→첫 재생 동선 | 파일 import만 성공했다고 재생 가능한 작품이라 안내하지 않음. 실제 catalog 저장/engine 확인, partial/analysis/duplicate 복구 |
| R3-S02 | P1 | Score PDF 추가→열기→첫 주석, 외부 수신 진입 | PDF ready와 실제 주석 저장 결과, 기존 page/zoom/selection·복구 보존 |
| R3-T01 | P1 | Studio 새 악보→실제 입력→프로젝트 저장 | 기존 R2 입력/선택·IME 수정 보존. generation/snapshot·cancel·save fail·reopen 검사 |
| R3-J01 | P2 | Studio PDF 성공 뒤 수동 Score 가이드 | 출력·프로젝트 저장·사용자 전달·수신 완료 구분, desktop/mobile 기기 차이 표시 |
| R3-J02 | P2 | Play 관리 음원 내보내기/Score 연결 음원 가이드 | 실제 관리 파일 조건·선택 형식 교집합·대상 악보 선택·사본 수명·오디오 정책 보존 |
| R3-C01 | 보류 | ServiceLink actionLabel 등 공통 확장 | 두 실제 구현 소비처와 현재 조합 한계를 확인한 뒤 별도 revision |
| R3-D01 | 보류 | Score→Play 관련 녹음 검색 | 공통 식별 매핑/검색 진입·개인 자료 가용성이 설계되기 전 UI를 노출하지 않음 |

**먼저 세 앱의 독립적인 첫 성취를 안정화하고, 그다음 수동 연결 안내를 붙이는 순서**를 추천한다. 연결 버튼은 기본 작업 성공을 대신할 수 없다. 디자인 작업은 위 전체 범위를 명세/시안으로 완성했고 제품 구현 우선순위를 나눈 것이다.

## 경로 전후 mapping

| 서비스 | 현행 | R3 추가/조정 | 보존 |
| --- | --- | --- | --- |
| Play | Home/관리 가져오기→파일/후보→CatalogRegistration→실제 라이브러리/재생 | 결과의 다음 행동과 최초 상태 구분, 성공 시 해당 자료 접근, 선택적 J02 안내 | Work/Recording/Movement ID·매핑·queue·seek·원본/사본·기존 네 보기·R2 배치 |
| Score | 악보함 추가/native PDF 수신→store/controller→Viewer→주석 | 실제 저장 경계 후 결과, 수신 파일의 적절한 진입, 최초 주석 안내, J01/J02 수동 안내 | PDF/annotation·lastPage·crop·performance·연습·library 선택/검색·R2 viewer |
| Studio | StartScreen→NewScoreWizard→command→project.save / pdf.save | 첫 행동 위계·맥락 안내·실제 첫 저장 피드백·PDF 후속 가이드 | templates·실제 keymap/IME·selection·undo·dock·generation·최근/복구·R2 |

기능 축소·엔진 교체·schema migration·계정·cloud·자동 작품 매칭·대표색/launcher 변경은 범위 밖. 실제 연결 구현을 이번 시안의 가짜 task로 대체하지 않는다.

## 인계 시작과 반환

AGENTS→Git/worktree→진행 중 R2/서비스 반환→R3 revision hash 확인→현재 소스와 차이 판단. 해시가 바뀌면 원인을 조사하고 새 작업 기준을 기록한다. 과거 manifest를 통과시키려고 재생성하지 않는다. 작업 중 다른 서비스 파일을 되돌리거나 일괄 stage하지 않는다.

`product-design-r3/returns/<service>-<revision>/`에 다음을 반환한다.

- 실제 commit 또는 uncommitted+diff/소스 해시, 사용 R3 manifest SHA, 적용 backlog.
- 구현 전후 경로/도메인 mapping, 현재 API·앱 adapter·추가 공통 제안 구분.
- 실제 제품 화면: fixture·viewport·DPR·theme·textScale·runtime·신규/기존/수신·실패/취소/복구 상태.
- 실행 command·결과·로그, 캡처/시각 검토·키보드/접근성 범위.
- source 성공과 receiver 성공의 실제 확인 범위, manual 전달과 OS 직접 진입 구분.
- 시안 차이와 이유: 플랫폼·제품 예외·구현 누락·공통 개선.
- 보존한 queue/page/selection/undo/dirty·원본과 사본 수명.
- 미실행 기기/provider·IME·스크린리더/사용자 테스트와 남은 판단.

Play/Score 제품 UI·기능 변경 시 AGENTS에 따라 해당 `ios-metadata.yaml`의 pending/reviewed false·실제 설명/release notes·영향 scenes/steps/assertions/manual을 갱신하고 mode:check한다. 미래 commit·버전·촬영 해시·권한/권리 답변을 추측하지 않는다. Studio desktop 범위에는 불필요한 iOS 편집을 하지 않는다. 원격 업로드/배포/심사·커밋/푸시는 별도 요청 범위다.
