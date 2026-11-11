# Play 보관함 후속 구현

기준: `cb29d398` 위의 library-context 미커밋 작업을 그대로 보존하고 이어간다.
작업 브랜치 `feature/ddirori-play-library-context-20261031`, 배포·커밋하지 않는다.

| 작업 | 재현/수용 조건 | 상태 |
| --- | --- | --- |
| M1 표시 정확성 | 미승인 경로 추론을 표시하지 않음, 교정/승인/태그 우선순위, 재생 중 메타데이터만 갱신 | 검증 완료: display/search/queue 단위, native Now Playing 정보 교정 |
| M2 iOS 탐색 | 실제 route의 swipe 완료/취소, 검색/스크롤 복원, 엔진 소유권 유지 | 검증 완료: widget와 native 실제 포인터 swipe 완료·취소 |
| M3 재생목록 | 검색·목록/곡 정렬, 표시 순서와 수동 저장 순서 분리, 재시작 설정 유지 | 검증 완료: query/widget, native SQLite close/open |
| M4 분류 | 표시·순서 편집, 모두 숨김에서 복구, 설정 저장과 실패 복구 | 검증 완료: v15→v16·백업·실패 draft·모두 숨김 복구·viewport matrix |
| M5 표지 | 로컬 내장 아트, 사용자 선택 사본·교체·삭제, 크기 한도·fallback·백업 정책 | 검증 완료: 내장 FLAC/원본 hash/교체 실패·취소/지연 로딩/native 저장·재조회 |
| M6 디자인 | 현재 생성물의 정확한 stale 원인 조사, 공식 generator, 좁은 완료 안내 개선·캡처 | 검증 완료: full specification 검사·공통 Flutter/React 소비처·실제 Flutter 캡처 |
| 물리 QA | Xs 실제 청감·VoiceOver 발화·제공자·Bluetooth·전화 | 외부 의존 |

공통 패키지 API는 실제 부족 사례·소비처 영향을 확인한 경우만 변경한다.
실제 파일·ID·원본 태그·이력·큐·위치와 시스템 미디어 계약을 보존한다.
각 단계의 실행 명령·결과·소스/이미지 해시는 아래 증거에 기록했다.

## 실제 동선과 정책

- 기본 동선은 가져오기→곡→재생이다. 클래식 등록은 계속 선택 사항이다.
- 전역 도구는 보관함에만, 상세는 해당 대상 메뉴에 둔다. 재생목록 저장 후 자동 이동하지 않고 원래 화면의 결과와 ‘보기’를 사용한다.
- `보관함→도구 더보기→보관함 분류 편집`: 네 분류의 체크와 위/아래 버튼을 제공한다. 모두 숨겨도 편집 진입이 남고 파일은 유지된다.
- `재생목록→검색/정렬→상세→곡 검색/정렬`: 목록은 생성일·수정일·이름, 곡은 저장 순서·제목·아티스트·앨범으로 정렬한다. 동률은 이름/ID로 고정한다. 화면에서 재생할 때는 검색된 표시 순서를 사용하고 편집은 원래 수동 순서를 사용한다.
- 분류·정렬은 SQLite v16, 검색어는 방문 상태에만 저장한다. 저장 실패는 이전 설정과 편집 draft를 보존한다.
- `재생목록 상세→더보기→표지 선택/제거`: 기존 파일 선택기로 읽은 관리 사본만 변경한다. 취소·손상·저장 실패는 기존 표지를 유지한다.
- 표시값은 `ListeningFileMetadata`가 공통으로 결정한다. 사용자/승인된 외부 교정→실제 태그→승인된 후보→파일명/정보 없음. 미승인 경로 추론과 inferred 출처 override는 감상 UI에서 제외하며 관리 화면의 후보는 삭제하지 않는다. 작곡가와 연주 아티스트는 구분한다. 클래식 작품 맥락은 별도 work 필드/카탈로그를 사용해 앨범명과 혼동하지 않는다.
- metadata-only controller 갱신은 같은 track/path/work/recording의 표시값만 바꾼다. native source 로드·play·seek를 호출하지 않는다. 파일 직접 큐와 연결된 클래식 큐 양쪽에 적용한다.
- Material route별 탐색 snapshot·scroll·playlist 편집 key를 소유하고 pop에서 정리한다. 실제 iOS pointer drag 취소와 완료를 검사했다. controller/repository는 상위 화면이 소유한다.

## 원본·저장·표지 경계

SQLite schema v16은 `library_view_settings`, `library_artwork` 두 테이블을 끝에 추가한다.
기존 파일·작품·녹음·악장·목록 ID와 링크는 변하지 않는다. v15 DB에서 목록을 보존한 upgrade와 v14/v15 논리 백업 호환을 검사한다.

표지는 입력 8MB·16MP·한 변16384 제한, 출력 PNG 최대512px이다. 원본 형식/태그에는 쓰지 않는다.
내장 아트는 기존 MIT `audio_metadata_reader`의 읽기를 worker isolate에서 수행하며 파일256MB 초과는 선택적 표지를 생략한다. 3초 timeout·dispose 취소와 직렬 저장, 최대128 request 캐시를 사용한다. 화면 밖 표지는 읽지 않으며 보일 때 요청한다. 새 패키지·사진 권한·외부 이미지 요청은 없다.

소유 디렉터리의 SHA-256 PNG 사본과 참조만 관리한다. 공유 hash는 참조가 남으면 삭제하지 않고, 실패한 새 참조 저장은 이전 표지를 유지한다. 앱 초기화도 소유 파일만 정리한다. 논리 백업에는 설정과 hash 참조만 포함하며 이미지 byte는 제외한다. 새 설치에서 없는 표지는 fallback으로 표시하고 내장 아트는 재추출/사용자 표지는 재선택한다. 표지 실패는 오디오 실패가 아니다.

## 추가로 재현·해결한 결함

| 재현 | 영향 | 수정·검증 |
| --- | --- | --- |
| 손상된 표시 설정 JSON으로 재시작 | 음악 저장소 전체 기동 실패 | 형식 오류만 기본 분류로 복구·안내, 원문은 저장 전 덮어쓰지 않음; 실패/재시도 widget·SQLite |
| 표지 저장소 초기화 실패 | 선택적인 표지가 전체 보관함 로드를 막음 | 기본 표지·안내로 진행, 곡 직접 재생 가능 widget |
| 표지 성공 후 손상 이미지를 선택 | 이전 지속 Toast 뒤에 오류가 가려짐 | 안내 교체; 취소/성공/오류/제거 실제 widget |
| 표지 저장 후 등록 화면 진입 | 이전 지속 안내가 하단 저장 버튼을 가림 | 명시적 화면 이동/복귀/등록 시 안내 제거; native 등록·재생 완료 |
| 큰 보관함을 열면 모든 표지 추출 시작 | 불필요한 IO/worker 대기·메모리 | viewport 지연 요청; 1000개 위젯에서 보이는 항목만 요청하고 스크롤 후 증가 검사 |
| 표지 읽기 중 dispose | worker 완료/timeout을 기다림 | 읽기 취소·drain·종료 뒤 쓰기 방지 테스트 |
| 가로 stretch 부모 안의 표지 | 80px 정사각형이 가로 막대로 렌더링 | Align으로 제약 분리; 80×80 assertion·native 재촬영 |
| 파일 큐만 표시 정책 변경 | 클래식 연결 큐에서 추론값 누출 가능 | 감상용 공통 resolver 사용·카탈로그 맥락/ID 보존 테스트 |

## 디자인 정본과 공통 영향

`build-palettes.mjs`는 고정 날짜/추천값 대신 정본 `color-system.updated/active`를 사용한다.
`api-portability.mjs`는 직렬화 JSON의 escaped import와 node_modules symlink 환경도 정규화한다. 두 환경 회귀를 추가하고 공식 snapshot/build generator를 실행했다.
실제 변화는 API snapshot의 환경 독립 React type 표기와 현재 승인된 blue를 반영하는 loader SVG 두 파일이다. Dart/CSS 역할 토큰·공통 API·역사적 revision/manifest·런처는 변경하지 않았다. 생성값을 검사 통과용으로 바꾸지 않았다.

두 실제 소비처는 `packages/ddirori_ui/example` Flutter와 `packages/ddirori_web` React 예제다. full specification verifier가 둘의 타입/분석을 실행하며 공통 Flutter 위젯 40개, generator 5개 검사가 통과했다. 새 API migration은 없다. 320px/200% 완료 안내는 기존 DdiroriBanner와 Wrap 버튼으로 충분한 폭과 보기/닫기를 제공한다.

## 증거와 한계

- `dart format lib test integration_test`: 133개 파일. 최종 포맷 후 재실행에서 변경 없음 확인.
- `flutter test --reporter expanded`: **460 PASS**. 이전441에서19개 증가. 4개 표시 정책/연결 큐/metadata-only, iOS gesture1개, 표시 설정6개, 표지8개(자체 JPEG EXIF orientation 포함). 기존 재생·백업·migration·R1/R2·대형 보관함 회귀를 포함한다.
- `flutter analyze`: **No issues**. `dart run tool/generate_audio_fixtures.dart --check`: exit0.
- 공통 Flutter **40 PASS**, generator **5 PASS**, full specification verifier `errors: []`(React 타입·Flutter example 분석 포함).
- 배포 메타데이터 **13 runs/40 assertions PASS**, `prepare_ios_metadata ... mode:check`: valid/source pending. 실제 생성 양식과 분류 편집 scene steps/assertions를 갱신했다.
- iOS 고유 integration **6 PASS**: 파일 가져오기/첫 재생/표지/정렬/SQLite 재조회1, Now Playing·metadata-only 교정·native 명령 주입1, scene/R2 browsing2, OS 전환·interruption2. 추가 캡처 실행은 같은 flow의 재실행이므로 테스트 수에 더하지 않는다.
- 환경: Xcode26.5(17F42), 전용 iPhone17 Pro iOS26.5 Simulator. background runner는 실제 Settings 앱 전환6초와 lifecycle inactive→hidden→paused→resumed, index0→3→완료12, 위치 저장·Now Playing rate1.0을 확인했다. 물리 잠금이나 가청 출력의 증거는 아니다.
- 320/390/1024px × 글자1x/2x × light/dark **12조합**의 실제 Flutter 렌더링 검사. 대표3조건에서6상태(library/list/menu/create/created/section-editor) **18 PNG**, native flow **2 PNG**를 생성했다. 생성 폼·큰 글자 Banner·분류 편집·정사각형 표지·기본 정보 fallback을 직접 열어 확인했다.
- 대형 host fixture는100명/1000작품/5000악장. 이번 실행의 검색336ms, 최대RSS382MB는 동시 로컬 검사 중 Dart host 측정이며 물리 성능 수치가 아니다. 넉넉한5초 query 회귀 상한과1000개 표지 위젯의 viewport 요청 한도 검사를 통과했다. 실제 사용자 라이브러리/저사양 기기 성능은 미검수다.
- `git diff --check`: PASS. 기존 역사적 증거와 원본 작업 트리의 변경을 되돌리지 않았다.

명령 로그·환경·소스/이미지 SHA-256은 `evidence/play-library-completion-20261031/validation.json`에 기록한다. 기존 context 증거는 당시 실행의 이력으로 보존한다. 새 캡처는 실제 Flutter 위젯/시뮬레이터이며 스토어 촬영 승인·물리 QA가 아니다.

- [생성 완료·보기/닫기: 320px/200%](evidence/play-library-completion-20261031/playlist-created-320-2-light.png)
- [분류 편집: 320px/200%](evidence/play-library-completion-20261031/section-editor-320-2-light.png)
- [재생목록 검색·정렬: 390px](evidence/play-library-completion-20261031/playlist-list-390-1-light.png)
- [iOS 실제 재생 중 생성 결과](evidence/play-library-completion-20261031/native-creation-result.png)
- [iOS 표지·기본 정보·미니플레이어](evidence/play-library-completion-20261031/native-playlist-detail.png)
- [검증 manifest·183개 소스와20개 이미지 SHA-256](evidence/play-library-completion-20261031/validation.json)

Apple Music과 정보 분류·목록/상세·미니플레이어 UX를 참고했지만 동일 앱은 아니다. 스트리밍·구독·클라우드·협업·스마트 목록·외부 앨범아트는 이번 목표 밖이다. 자동 정렬과 수동 순서를 분리하며 생성 후 원래 화면 유지/명시적인 보기는 띠로리의 사용자 피드백 정책이다. 태그가 없으면 미확인 정보를 창작하지 않는다.

### 사용자 Xs 5~10분 점검

1. Files/iCloud에서 개인 음원을 가져와 곡명·아티스트·앨범과 실제 청감 확인.
2. 재생 중 상세→검색→뒤로 swipe 취소/완료, 원래 위치·곡 유지 확인.
3. 재생목록 생성 후 원래 화면의 결과/보기, 곡 검색·정렬 후 재생과 수동 순서 편집 비교.
4. 분류를 숨기고 순서를 바꾼 뒤 재시작·복구, 표지 JPEG 방향·선택 취소·교체·제거 확인.
5. VoiceOver로 제목·분류 체크·순서 버튼·정렬·현재 곡·보기/닫기를 탐색.
6. 화면 잠금30초·다음 곡·스피커/유선/Bluetooth·실제 전화 interruption 확인. 개인 파일명/경로를 전송할 필요는 없다.

물리 청감·발화·Files 제공자 UI·실제 전화/출력 장치·실사용 대형 라이브러리 성능은 외부 의존이다. 테스트 picker·fake controller·native 명령 주입을 그 증거로 승격하지 않는다. 제품 결정/정보가 필요한 새 항목은 없고, 범위 밖 대형 기능을 추가하지 않는다. 커밋·푸시·배포·버전/build·source pin은 수행하지 않는다.
