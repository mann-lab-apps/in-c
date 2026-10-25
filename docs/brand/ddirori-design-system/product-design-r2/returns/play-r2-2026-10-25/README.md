# Play R2 반환

상태: **implemented-awaiting-review**. 제품 적용·자동 검증·반환 완료, 사람 대상 검토 대기.
기준 HEAD `827ad18203e673b1e923d00cbcf0fd7f3af755d7`. 구현은 미커밋이며
[handoff.yaml](handoff.yaml), [evidence.json](evidence.json), [QA report](qa/report.json)를 반환한다.
시작 시 R2 `revision.py` 인자 없는 검사: 590개 해시 일치. `--check` 옵션은 이 버전에 없다.
역사적 manifest를 수정하거나 재생성하지 않는다. 기존 미커밋 웹/디자인 작업은 보존한다.

## 적용 Backlog와 경로 대응 (구현 전)

| ID | 기존 경로/행동 | R2 적용 |
| --- | --- | --- |
| P01 | 라이브러리 검색/필터/작품/녹음 | 첫 행동과 네 보기 유지 |
| P02 | 현재 재생 → 긴 작품/녹음 설명을 컨트롤과 큐 행에 반복 | 상위 맥락과 악장 행 분리, 혼합 큐는 연속 구간마다 맥락 표시, 파일 정보 펼침/실제 상세 진입 |
| P03 | 현재 재생 보기에서만 조작, 작품/녹음은 별도 route | Home과 Work/Recording route에 같은 실제 snapshot 연결, 넓으면 옆 재생 영역, 좁으면 하단 조작과 상세 진입 |
| 보존 | 관리 → 가져오기/폴더/정리/요약, 감상 → 이력/통계 | 같은 경로와 명령 유지 |
| 보존 | 현재 재생 → 랜덤/누락 정책 | 큐 아래 기존 설정 유지 |

탐색 데이터는 route의 Work/Recording ID로, 재생은 controller snapshot으로 읽는다.
검색·보기·테마·상세 펼침은 재생 명령을 실행하지 않는다. retry는 기존 큐 재로드와 첫 항목 재생 정책을 유지한다.
공통 API 추가 없이 앱 adapter에서 구성한다. 실제 기기/파일 권한/청감과 widget·fake·simulator 증거를 구분해 반환한다.

## 실제 구현과 보존 계약

- `PlayPlaybackScope`가 Home 소유의 읽기 전용 presentation snapshot과 기존 명령을 route에 연결한다.
  scope는 엔진/큐/파일/repository를 만들지 않는다. Work/Recording route는 기존 ID와 표시 데이터를 유지한다.
- Home/Work/Recording에서 가용 폭800 이상은 별도340px 재생 영역, 좁으면 목록과 분리된 하단 조작이다.
  340px은 앱 조합 값이며 공통 token이 아니다. `재생 상세 열기`는 실제 snapshot의 full controls를 보여준다.
- 모바일에는 악장과 현재 녹음·상태를 함께 표시한다. 전체 문자열은 semantics와 재생 상세에서 확인한다.
  200%에서 축약부 높이를 고정하지 않고 줄바꿈한다. 좁은 현재 재생 보기의 하단에는 조작만 반복해
  긴 큐를 끝까지 읽은 뒤에도 pause/next/stop에 도달한다. 기능을 제거하지 않는다.
- 같은 맥락의 큐는 작품/녹음을 상단에 한 번만 표시한다. 혼합 큐는 연속 구간마다 제목을 표시하고
  현재 재생 조작에도 실제 현재 항목의 맥락을 유지한다. 큐 순서·ID·누락 정책은 변경하지 않는다.
- `음원 정보 N`은 파일명/출처/작품/녹음을 보여주고 절대경로를 숨긴다. `녹음 정보 열기`는 실제 상세 route다.
  큐에 남은 녹음 ID가 현재 카탈로그에서 사라졌으면 한국어 안내 후 돌아오며 큐를 바꾸지 않는다.
- metadata await/busy/draft/실패 재시도/성공 후 닫기와 R1의 라이브러리·관리·감상·랜덤 경로를 유지한다.
- seek draft는 기존 공통 Progress에서 관리한다. 앱 key에 곡/파일/오류/pause 경계를 넣어 변경 시 draft를 폐기한다.
  engine tick은 key를 바꾸지 않는다. 확정은 기존 Home 명령 gate를 통과하며 pending 중 중복 요청은 실행하지 않는다.
- 재시도는 원래 큐 전체를 load하고 첫 항목부터 재생한다. 실패 위치 복원·새 큐 편집·streaming은 추가하지 않았다.

## 실제 캡처 조건

`screens/`의 50장은 실제 Flutter 제품/adapter 위젯을 테스트 renderer에서 촬영했다.
리뷰 메모리 플레이어 코드를 가져오지 않았으며 native 플러그인/물리 청감 증거로 분류하지 않는다.

| 파일/조건 | fixture·상태 |
| --- | --- |
| `browse-b-*` | 교향곡5 클라이버 A의4악장 큐·42초 재생 중 브렌델 B 상세 탐색 |
| `browse-end-*` | B 마지막 악장까지 목록 스크롤, A pause 조작은 계속 접근 가능 |
| `queue-*` matrix | 같은 A 큐 pause 상태로 복귀, 순서/위치 보존 |
| `queue-context-*`, `mixed-queue-*` | 같은 맥락1회, A→정보 없는 다른 작품→A 순서를 구분 |
| `file-info-*` | 실제 파일 정보 dialog, fixture 파일명만 표시 |
| `retry-error-*`, `retry-success-*` | A의3번째 악장 error snapshot → 기존4개 큐의 첫 항목부터 재시작 |
| `seek-success-*` | 키보드 ArrowRight 확정1회 → 실제 fake controller position 반영 |
| `safe-area-*` | 1024px/200% dark, left32/right44/bottom24 inset |
| `states/*` | 기존 R1 테스트를 현 소스에서 실행한 첫 빈 목록/검색 없음/loading/missing/load failure/unknown/disabled |

matrix는320/390/1024 × textScale1/2 × light/dark, 높이1000/DPR1/bottom24이다.
200%에서 reduced motion을 켰다. 실제 Pretendard/Material Icons를 테스트에서 로드하며
제품 기본 글꼴이나 대표색/launcher를 변경하지 않는다. source ID는 기존 sampleClassicalLibrary다.
A의 작품명만 한영 긴 제목으로 표시하는 presentation fixture이며 실제 DB를 바꾸지 않는다.
metadata가 없는 혼합 항목은 원인을 숨기거나 연주자를 추론하지 않고 `정보 없음`으로 표시한다.

## 검사와 증거

최종 실행(2026-10-25): **QA14/14 PASS**, 앱 **365개 PASS**, analyze no issues,
iPhone 17 Pro / iOS26.5 unsigned build 및 **9개 통합 테스트 PASS**. DB schema v14.
native decoder2 + startup/detail2 + reset1 + large library1 + import1 + scene routes2이다.
R2 전용17개·상태 캡처용6개도 통과했고 원본 로그를 보존한다.
QA 전후 소스 해시: `19555e86e571676e6936673e93daaab470b5019935ac596c4a9eac11c70679fc`.
metadata check와 `git diff --check` 통과, TODO/FIXME/Flutter Demo/Counter 및 광역 cleartext 예외 검색은 일치 없음.

증거 수집 시점의 역사적 R2 manifest design/dependencies/artifacts는 그대로 일치한다. product capture 기준 차이14개는
이번 Play 적용6개 + Score/Studio 동시 작업8개다. 새 앱 adapter/test 파일은 sourceHashes와 diff에 포함한다.
시작 기준을 현재 코드에 맞춰 재생성하지 않았고 다른 서비스 변경은 이번 적용으로 검수했다고 주장하지 않는다.

- `dart format lib test integration_test tool`, `flutter test`, `flutter analyze`.
- R2 전용17개, R1 및 library/playback/management/metadata 포함 전체365개 테스트.
- A 재생/B 탐색의 명령0회·state 동일성·pause 후 큐/42초 유지, 목록 끝48px 조작과 safe area.
- seek draft 중 engine tick, 동일 duration의 곡 변경, pause/error 폐기, pending 중 확정1회, Flutter keyboard seek/time semantics.
- 같은 맥락/혼합 큐, 누락 metadata, 개인 경로 비노출, 오류 후 원래4개 큐 첫 항목 재시작.
- iOS YAML의 문구·queue/recording scene·A 재생/B 탐색 새 scene 및 manual pending을 갱신했다.
  버전/build/source commit pin은 변경하지 않았다. mode:check 로그를 연결한다.
- 최종 `qa/report.json`에는 명령별 exit code·원본 로그 hash·실행 전후 소스 fingerprint가 있다.
  `collect-evidence.cjs`는 현재 fingerprint와 PASS report/log를 대조한 뒤에만 증거를 묶는다.
  초기 lint/안전 영역 실패 run을 최종 PASS 증거로 사용하지 않는다.
- `evidence.json`은 실제 PNG 크기/조건/hash·제품 소스 hash·실행 시 HEAD를 기록하고,
  `implementation.diff`는 새 파일까지 포함한다. `design-revision.snapshot.json`은 원본 manifest의 바이트 복사다.
- 시작의 R2 전체 검사590개 일치를 기준으로 삼았다. 적용 후 역사적 제품 해시의 차이는
  `baseline-comparison.json`에 남기며 다른 서비스 동시 변경도 따로 기록한다. manifest 재생성 없음.

## 시안 차이와 공통 영향

| 기준 | 실제 | 이유/영향 |
| --- | --- | --- |
| 리뷰3탭 | R1 네 보기와 실제 Work/Recording route 유지 | 기존 관리·감상·랜덤·검색 범위 보존 |
| 리뷰 모바일 상단 전체 재생 블록 | 하단 축약 조작 + 별도 재생 상세 | 목록 끝에서도 접근, 안전 영역과 큰 글자 높이 확보 |
| 추천800/340 | 앱 layout에서800/340 사용 | 공통 token/API로 승격하지 않음 |
| 혼합 큐 맥락 | 연속 구간 heading + 현재 조작의 맥락 | 같은 제목 악장/다른 녹음을 구분 |
| 범용 Transport 확장 | 기존 Item/Button/Status/Progress + Play adapter | 새 공통 API 수요 없음, 다른 두 소비처를 추정하지 않음 |

`packages/ddirori_ui`와 공통 token/API 변경은0이다. 공통 소스 복사·분기 없음.
플레이 전용 composition과 snapshot 연결만 추가했으므로 다른 앱 caller migration은 없다.
추가 공통 API 제안은 없다. 실제 사용자 검토에서 반복 수요가 확인되면 별도 제안한다.

## 미검수와 사용자 확인

- 물리 기기: devicectl에서 연결 기기 없음. 실제 VoiceOver 발화·탐색 사용성과 하드웨어 키보드는 미검증.
- 실제 Files/iCloud 제공자의 선택·권한 상실 UX, 실제 MP3/FLAC/M4A 청감·스피커/유선/Bluetooth·OS interruption은 사용자 확인 대상.
- native simulator 재생/seek/완료/복구와 host decoder PCM은 물리 출력 증거가 아니다.
  A/B UI scene의 fixture controller는 fake이며 native decoder 검사는 별도 테스트다.
- iPad는1024px widget 검증이며 이번 native 통합 대상은 iPhone이다. 사람 대상 사용성·디자인 승인·최종 색/런처 승인은 포함하지 않는다.
- metadata pending/reviewed false 유지. 스토어 촬영 승인·pinning·서명·업로드·출시는 수행하지 않는다.

사용자 확인 동선: A 녹음 재생 → 검색/작품에서 B 녹음 열기 → 마지막 악장까지 스크롤 → 축약/옆 조작 pause/next
→ 재생 상세에서 seek → 뒤로 복귀 후 A의 상태/큐 확인. VoiceOver에서 B 탐색 정보와 A 현재 재생을 구별해 읽는지 확인한다.
