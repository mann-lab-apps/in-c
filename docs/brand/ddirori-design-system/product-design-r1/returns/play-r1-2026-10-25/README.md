# Play R1 구현 반환

상태: **implemented-awaiting-review**. 구현·자동 검증·인계 완료, 디자인/실기기 검토 대기.
디자인 R1 기준은 변경하지 않았다. 기계 판독 반환은 [handoff.yaml](handoff.yaml),
실제 화면/소스 hash는 [evidence.json](evidence.json), 최종 실행은 [QA report](qa/report.json)이다.
시작 커밋: `6bb5f027cfa5df3a78094a97699c6c5a84c9f0c1`. 구현은 uncommitted.
시작 시 `revision.py --check`: PASS. 다른 웹/공통 Item 작업은 보존한다.

## 경로 대응표 (구현 전)

| 기존 홈 경로 | R1 경로 | 보존할 행동 |
| --- | --- | --- |
| 제품 서명 → 요약 카드 6개 | 라이브러리 제목, 관리 보기 → 요약 | 카탈로그/파일 개수 |
| 검색 패널 | 라이브러리 → 검색 | 기존 전체 유형 검색과 상세 진입 |
| 화면 하단 작품·녹음 목록 | 라이브러리 → 작품 필터/정렬 → 작품, 녹음 | 작품/녹음/악장 ID와 상세 경로 |
| 스캔 패널 | 관리 보기 → 스캔 | 가져오기·폴더·재스캔·데모·정리 시작 |
| 저장소 실패·누락·정리 필요 | 라이브러리에도 상태/복구 진입점 | 실제 재시도와 파일 정리 |
| 랜덤 재생 모드 | 현재 재생 보기 → 랜덤 재생 | 작품·녹음·악장 모드, 누락 정책 |
| 현재 재생 큐 | 현재 재생 보기 | 실제 engine 상태, seek, 정지, 큐 |
| 최근 감상·통계 | 감상 보기 | 이어 듣기·삭제·보관 기간·기간별 통계 |
| 상단 도구 메뉴 | 기존 상단 도구 메뉴 유지 | 발견·IMSLP·파일 정리·진단·설정 |

하단 보기 선택은 safe area 안에서 높이가 내용에 맞춰 늘어난다. 같은 Home State 안에서
표시 영역만 바꾸며 controller/repository를 재생성하지 않는다. 첫 빈 라이브러리와 검색 없음은
별개 상태로 표현한다. 새 권한/DB migration/오디오 엔진 변경/배포는 범위 밖이다.

## 수락 기준

- 보기·작품 필터·정렬·테마 변경 전후 큐/현재 index/position 유지.
- 재생 준비·실패·파일 없음·duration 미확정, 실제 retry 및 seek draft 경계 유지.
- 메타데이터 pending/failure/retry/success 계약 회귀 유지.
- 320/390/1024, 200%, light/dark, 긴 제목·safe area·semantics 검증.
- 실제 위젯 증거와 fake adapter, native simulator, 물리 기기 검증을 구분.
- iOS YAML pending/reviewed false, scene 경로 갱신과 metadata check.

## 실제 화면과 fixture

`screens/`는 `test/product_design_r1_test.dart`가 실제 제품 위젯으로 생성한 PNG다.
Flutter widget-renderer이며 iOS 스토어 스크린샷이나 가청 재생 증거가 아니다.
화면마다 hash·실제 PNG 크기·theme·fixture를 `evidence.json`에 생성한다.

- 기본 라이브러리: 기존 sampleClassicalLibrary, 작곡가 2명/작품 3개/녹음 3개.
  R1 도식의 Bach/Debussy 작품 대신 앱의 Beethoven/Dvorak ID를 그대로 사용한다.
- 재생: fake controller에 명시적으로 주입한 `track.beethoven5.kleiber.1` 한 항목,
  긴 한국어/원어 작품명, 3분 duration/42초 position. production 데모 seed가 아니다.
- 첫 빈 목록/검색 없음: emptyClassicalLibrary, 검색어 `없는 작품 qzx`.
- loading/missing/failed/unknown/disabled: 실제 PlayNowPlayingControls에 명시적 상태 fixture.
  missing과 failed는 다른 failure kind와 한국어 원인을 사용한다. 재시도 callback을 검증한다.
- metadata: 실제 MetadataEditDialog, Completer로 지연/실패/재시도/성공 제어.
  pending readOnly, 실패 draft 유지, 성공 완료 후 닫힘을 assertion으로 검증한다.
  200%에서 첫 입력의 floating label이 scroll clip에 걸리는 문제는 content 상단 여백16으로
  보완했다. 저장 contract는 변경하지 않았다. 캡처는 레이블 전환이 끝난 프레임이다.
- 320/390/1024 × text 100/200% × light/dark. DPR 1, 화면 높이 1000, bottom inset 24.
  200% 조합은 reduced motion도 켠다. Pretendard와 Material Icons를 실제로 로드한다.
  앱의 기본 시스템 글꼴을 Pretendard로 변경한 것은 아니다.
- fake fixture에는 OS picker adapter를 넣지 않아 가져오기 버튼이 비활성이다.
  production startup의 실제 adapter 준비 후 버튼 활성은 iOS smoke에서 따로 확인한다.

## 최종 검증 (2026-10-25)

- 앱 `flutter test`: **347개 PASS**, `flutter analyze`: no issues.
- 공통 `ddirori_ui`: **38개 PASS**, `flutter analyze`: no issues.
- 실제 글꼴 R1 전용 테스트 **20개 PASS**, 제품 위젯 **45장** 생성.
- format, audio fixture check, host decoder PCM 검사, 5000트랙 host benchmark PASS.
- iPhone 17 Pro / iOS26.5 전용 fixture Simulator: unsigned build PASS.
  startup/detail 2 + native audio 2 + reset 1 + 5000트랙 1 + import 1 + scene routes 1,
  총 **8개 통합 테스트 PASS**. DB schema v14.
- `run_local_qa.dart` 최종 **14/14 PASS**, source before/after 동일:
  `f6bc74180f27c89adfb9370485e99a08706c693a745b89a199bf5feee83eddb8`.
- iOS YAML check, R1 revision check, `git diff --check` PASS.
  TODO/FIXME/Flutter Demo/Counter 및 광역 cleartext 예외 검색: 일치 없음.
- 앞선 QA 실행 중 시각 결함을 수정해 `sourceChanged`가 된 run은 최종 PASS 증거에서 제외했다.
  `qa/`에는 마지막 불변 소스 실행의 report와 검증된 원본 로그만 복사했다.
- 대표 이미지를 열어 제목/시간/배지/metadata label 잘림을 확인·수정했다.
  이미지 생성·해시 일치는 사람이 모든 조합을 검수했다는 뜻이 아니다. 스토어 승인은 없다.

## 기준과 차이

| 기준 | 실제 구현 | 이유/검토 필요 |
| --- | --- | --- |
| 홈 목록 뒤 현재 재생 영역 | 고정 하단의 현재 재생 보기로 한 번에 이동 | 200% 글자에서 목록을 덮는 mini-player를 피함. 디자인 리뷰에서 이 정보 구조 승인 필요 |
| 태블릿 두 영역 가능 | 1024에서도 한 열, 여백32 | 선택 사항이며 기존 흐름/scroll 유지. 별도 큰 앨범 카드 없음 |
| 도식의 녹음 진입점 | 실제 작품/녹음 상세 라우트와 원래 ID | 리뷰 mock의 가짜 재생/저장은 가져오지 않음 |
| R1 추천색 | 기존 공통 팔레트 유지 | 최종 대표색/런처 승인은 작업 범위 밖 |
| 큐 행의 현재 표시 | `현재 악장` | 선택된 항목이 pause/error여도 `재생 중`이라고 잘못 읽지 않게 함. 실제 재생 상태는 컨트롤에서 표시 |
| 실패 재시도 | 보존된 큐를 다시 load한 뒤 실제 play | 기존 loadQueue 계약에 따라 첫 항목부터 재시작. 실패 위치로 자동 seek하는 새 정책은 추가하지 않음 |

`revision.py --check`는 시작 및 수정 후 통과했다. R1 manifest는 재생성하지 않았다.
공통 `music.dart`의 내부 진행 표시 변경은 R1 dependency hash 대상에 포함되지 않으므로,
manifest 일치가 이 내부 변경의 디자인 승인을 의미하지 않는다.
동시 작업 중 생긴 R2·악보앱·Studio 변경을 R1 기준으로 간주하거나 덮어쓰지 않았다.

## 공통 변경

- 재현: 320px/200%에서 DdiroriPlaybackProgress의 고정52px 시간 값이 두 줄로 갈라짐.
- 처리: 기존 공통 구현에서 TextScaler/TextPainter로 시간 폭을 측정하고 좁으면 시간 행과
  Slider를 분리한다. slider semantics 값도 밀리초 백분율 대신 시간 형식으로 제공한다.
- API/토큰: public constructor, callback, duration/position 의미, 토큰 변화 없음.
  앱 adapter에서 공통 소스를 복사하지 않는다.
- 실제 소비처: 현재 rg 기준 제품 호출은 PlayNowPlayingControls 한 곳이며 공통 테스트가 있다.
  Clef/Studio가 같은 API를 쓴다는 근거는 없어 새 도메인 공통 API는 제안하지 않는다.
- 영향: 같은 API의 좁은/큰 글자 높이가 늘어날 수 있다. 고정 높이 소비처를 추가하면 재검증 필요.
  공통 회귀와 전용 큰 글자/시간 semantics 테스트를 실행한다. rollback은 이 내부 변경과
  전용 테스트로 한정 가능하며 migration은 필요 없다.
- 큐·악장·검색 badge는 앱 adapter의 기존 `actions` slot으로 이동. 공통 Item API 변경 없음.

## 수행 범위와 미검수

| 항목 | 환경/증거 | 판정 범위 |
| --- | --- | --- |
| layout/상태/탐색/seek 의미 | widget tests + PNG, fake engine/repository | UI와 상태 계약; native 출력 증거 아님 |
| 메타데이터 저장 실패/재시도 | 기존 library_management 테스트 + 실제 dialog 캡처 | await/busy/draft/닫기 계약; OS 저장 실패 실측 아님 |
| SQLite/실제 파일 import | 전용 iPhone iOS26.5 Simulator, fixture 파일/DB/hash | 선택 결과 이후 복사·등록·원본 보존·재기동 |
| 실제 decoder/play/pause/seek/next/완료/복구 | iOS Simulator + 자체 합성 WAV/FLAC/AAC/ALAC | native 엔진/위치/완료 증거; 청감/물리 스피커 증거 아님 |
| Files/iCloud picker/권한 UX | OS 제공자 자동화 미수행 | fake picker·앱 내부 복사와 구분, 사용자 확인 필요 |
| background/interruption | lifecycle fake 회귀, foreground 정책 유지 | OS 전화/헤드폰/Bluetooth interruption 미검증, 백그라운드 재생 주장 없음 |
| VoiceOver/실기기 | devicectl: No devices found | semantics 검증으로 실제 낭독·읽기 순서 사용성을 대체하지 않음 |
| iPad | 1024px 실제 위젯, 이번 native 통합은 iPhone | 이번 iPad native 실행/물리 기기 미검증 |
| metadata | YAML pending/reviewed false, check 실행 | 촬영 승인·pinning·서명·업로드·출시 없음 |

사용자 점검: 짧은 개인 음원 가져오기 → 작품/녹음 등록 → 재생/seek → 네 보기·필터·테마 전환
→ 잠시 다른 앱으로 전환 후 복귀 → Files/iCloud 재가져오기 → VoiceOver로 재생·다음·정지 접근.
실제 소리·권한·읽기 순서의 결과만 별도 피드백으로 확인한다.
