# Play 작곡가·시대·IMSLP 맥락

작업 경로: 지속 worktree `ddirori-play-library-context-20261031`, 기준 HEAD `f57602c18ce55031833faabf37a073da437453b9`. 시작 시 기존 소스262개와 증거104개 hash, 외부 composer-foundation snapshot hash가 모두 일치했다. 이전 미커밋 변경·증거·snapshot을 보존하며 커밋/푸시/배포하지 않는다.

| 범위 | 수용 조건 | 보존/실패 기준 | 검증 | 상태 |
| --- | --- | --- | --- | --- |
| 독립 작곡가 | 기존 인물 ID에 명시적 작곡가 역할·이름/확인 별칭/출처, 파일 연결·해제 | 가짜 작품/녹음 없음, 동명이인 자동 병합 금지, 태그/교정/실패 draft 보존 | 단위·SQLite·백업·widget·iOS/Android native 재시작 | 통과 |
| 시대 | 작품 시대와 작곡가 활동 시대 구분, 다중 시대·추정·미상, 교정/필터 | 원래 periodLabel 보존, 녹음/발매 연도 추론 금지, 큐/위치 불변 | 우선순위/미분류·widget·저장/복원·canonical 편집/undo | 통과 |
| IMSLP | 확인 맥락 검색, 일치/차이 근거, 확인 후 링크 변경/해제 | 파일 종류/권리 별개, 병합/undo ID·재생 보존, 자동 scraping 없음 | fixture·지연 응답·SQLite·병합/undo·widget | 통과·live API/실기기 별도 |

설계: 기존 catalog repository·ClassicalPerson ID를 재사용한다. 작곡가 profile(사용자 확인 역할·별칭 출처·명시적 파일 연결/제외·활동 시대)과 작품의 시대 assessment만 nullable JSON으로 additive 확장한다. 기존 인물/작품/녹음/파일·태그·교정·출처·ID와 원래 periodLabel은 보존한다. 기존 작품의 composer 관계도 계속 작곡가 역할로 인정한다. 파일 연결 해제는 태그 삭제가 아니라 해당 확인 ID 연결의 제외이며 원문 그룹/즉시 재생은 유지한다.

UI는 Play adapter에서 기존 Ddirori 행/입력/버튼/상태와 native Dialog를 합성한다. 공통 API·토큰·브랜드·탭을 변경하지 않는다. 작곡가 관리와 시대 필터는 보관함 보조 동선이고 파일/오디오/repository는 앱 책임이다. 저장 await/busy/취소·실패 draft 보존·성공 후 닫기를 고정한다.

필수 검증: format/test/analyze/fixture, 기존 runner의 새 output·전후 소스 hash·새 캡처 직접 검수, 전용 iOS/Android native 회귀, metadata Ruby/Fastlane와 diff check. 실기기 청감·제공자·VoiceOver/TalkBack은 대체 검사와 구분한다.

## 공식 자료 확인 (2026-11-12)

- [IMSLP API](https://imslp.org/wiki/IMSLP:API)는 인물/작품 목록 API를 설명한다. 기존 앱의 MediaWiki 검색이 녹음 파일 조회나 무제한 이용 권한까지 보장한다고 해석하지 않는다.
- [저작권 안내](https://imslp.org/wiki/IMSLP:Copyright_Made_Simple)는 지역·자료별 차이와 예외를 명시한다. 앱이 다운로드 권리를 자동 판정하지 않는다.
- [개인정보](https://imslp.org/wiki/IMSLP:Privacy_policy)는 사이트 요청 정보 수집을 설명한다. 검색 시 사용자가 확인한 작곡가/작품 텍스트만 전송하고 파일/전체 경로는 전송하지 않는다.
- `IMSLP:Terms_of_Use` 주소는404였다. 사이트가 실제 연결하는 [General disclaimer](https://imslp.org/wiki/IMSLP:General_disclaimer)와 [Licensing Policy and Guidelines](https://imslp.org/wiki/IMSLP:Licensing_Policy_and_Guidelines)를 확인했다. 작품/판본/녹음의 지역·라이선스 검토를 분리하며 공식 다운로드 지원 계약은 확인되지 않아 기존 공식 페이지를 통한 수동 가져오기 경로를 유지한다.
- [시대별 인물 탐색](https://imslp.org/wiki/Browse_people_by_time_period)도 인물 탐색 자료이며 개별 작품의 시대를 증명하지 않는다. 앱의6개 시대 값은 사용자 선택을 위한 탐색 어휘로, 경계 연도나 활동/생몰/녹음 연도로 분류하지 않는다. 외부 작곡가 데이터셋·시대 사전은 추가하지 않았다.

## 구현·호환 정책

- `ClassicalPerson.composerProfile`의 존재를 명시적 작곡가 역할로 읽고 기존 Work.composerId 관계도 인정한다. 한글/원어/기존 영어/확인 별칭·확인 출처와 기존 생몰연도/역할/ID를 유지한다. 기존 다른 역할 인물도 확인 후 같은 ID에 작곡가 역할을 추가한다. 새 인물은 사용자 생성 안정 ID를 사용하고 기본 사전은 주입하지 않는다.
- 명시적 파일 연결은 profile의 file ID 목록에, 연결 제외는 제외 목록에 저장한다. 원본 태그·교정·파일/작품 매핑을 수정하지 않는다. 정확한 이름/별칭이 여러 인물에 해당하면 ID를 주장하지 않는다. 기존 카탈로그 등록의 slug 동등성은 비라틴 문자를 같은 값으로 축약할 수 있어, 원문 이름/확인 별칭의 대소문자·공백 정규화 동등성으로 교체하고 모호한 작곡가는 등록을 거부한다.
- 작곡가 작업은 같은 repository에서 직렬화하고 최신 catalog를 읽어 저장한다. SQLite catalog save transaction과 기존 beforeCommit 실패 주입을 재사용한다. `_replaceCatalog`도 기존 origin 값을 보존한다. 기존 UI 경계의 저장 await/busy·중복/Back 차단·실패 draft/재시도·성공 후 닫기를 유지한다.
- schema19는 nullable composer_profile_json/period_assessment_json 두 열만 추가하고 재적용 시 중복 ALTER하지 않는다. 구버전 DB는 null로 읽고 구버전 논리 백업의 누락 열은 null로 보완한다. 잘못된 새 JSON은 백업 검증에서 거부한다. 충돌하는 백업은 기존 conflict 정책으로 처리하며 새 데이터를 구버전 값으로 덮어쓰지 않는다. schema/feedback/앱 버전은 각각19/2/0.1.0+4다.
- 시대는 실제 catalog 트랙의 Work assessment, 기존 Work.periodLabel, 작곡가 활동 시대 순서다. 확인 출처·복수 시대·추정/확인 상태를 별도 저장하고 기존 자유 입력은 보존한다. 기존 label은 알려진6개 어휘의 정확한 대응만 분류하며 출처 미기록 추정으로 표시한다. 이해하지 못하는 기존 자유 입력을 작곡가 시대로 덮어쓰지 않는다. 활동 시대를 곡에 적용할 때는 항상 작품 시대 미확인 추정으로 표시한다. 확인된 빈 시대 목록도 저장할 수 있으며 미분류 필터로 접근한다.
- 시대 필터는 방문별 상태로 검색/정렬/스크롤 복귀와 함께 유지하고 영구 사용자 설정으로 추가하지 않았다. 같은 엔진·큐/position을 유지한다. 재생목록의 저장 순서나 클래스식 planner 범위를 변경하지 않는다. 원본 음원·태그·앨범/작품/악장 의미를 유지한다.
- IMSLP는 확인한 작곡가/Work 맥락으로 검색 입력을 준비하되 검색 버튼 전송은 사용자 행동이다. 결과별 정확한 이름/별칭·작품명/번호의 일치/차이를 설명하고 권리·녹음의 일치를 추정하지 않는다. 병합된 Work 진입은 canonical ID로 중복 제거하며 연결/취소/변경/해제·merge/undo를 검사한다. 페이지 변경은 이전 자료 목록만 transaction으로 해제하고 로컬 파일/가져오기 이력은 유지한다.
- 공식 작품 HTTPS 페이지와 파일/분류/도움말 namespace를 구분한다. 검색 실패는 재시도와 공식 검색 페이지 동선으로 복구한다. 늦은 응답은 query/work/cancel/dispose generation으로 무효화한다. 경로 형태의 질의는 client/UI 경계에서 전송 전에 거부한다.
- IMSLP 캐시는 메모리5분/최대32개, 공백/대소문자 정규화 질의+limit 키다. 같은 요청을 합치며 시작 간격1초는 앱의 보수적 정책이다. 성공한 비어 있지 않은 결과만 저장하고 실패/빈 결과/손상 응답을 정상 캐시로 만들지 않는다.12초 timeout,429 등 기존 오류 분류를 보존하며 자동 retry/live 테스트를 기본 회귀에 넣지 않는다. clock/delay/HTTP 주입으로 실제 대기 없이 검증한다. 앱 종료 후 캐시가 남지 않는다.

## 실행 결과

구현 전 수용 조건을 기록했다. 최종 실행/환경·증거·미검수·복구 checkpoint는 실제 검증 후 추가한다.

개발 중 schema19 기대값3곳과 tooltip의0높이 overlay anchor를 누르던 기존 테스트 helper를 교정했다. 수용 assertion은 유지하고 실제 IconButton을 스크롤/탭하도록 했다. 새 독립 작곡가/시대/IMSLP 테스트에서 실제 catalog 역할과 이름 slug 모호성을 발견해 정확한 이름/별칭 비교로 고쳤다.

첫 runner `build/composer_context_verified_20261112/run-DfPsOz`에서 host810개·분석/fixture/성능·캡처133개·native library는 통과했다. 실제 글꼴의320px/200% 작곡가 편집 캡처에서 첫 floating label이 scroll 경계에 잘려 native-system-scenes 시작 시 runner를 중단했다. 두 편집 dialog의 상단 padding16과 실제 label/viewport 좌표 assertion을 추가했다. 첫 실행의 이미지/로그를 수정 소스의 최종 증거로 재사용하지 않는다.

두 번째 runner도 host 통과 후 중단했다. 독립 작곡가만 존재하고 직접 파일 감상 이력이 있는 경우 legacy bootstrap의 catalog_works 개수 검사만으로 기존 작곡가를 빈/샘플 카탈로그로 교체할 수 있는 경로를 코드 검토에서 발견했다. 기존 people이 있으면 bootstrap을 건너뛰고, 참조한 legacy Work/Recording/Track이 실제로 하나도 없을 때도 변경하지 않도록 수정했다. 재시작/이력 회귀와 실제 native DB 재연결 동선에 이 조건을 추가했다. 수정 후 catalog/새 domain22개가 통과했으며 최종 검증은 새 output에서 진행한다.

동일한 무결성 검토에서 시대 편집도 IMSLP와 같은 canonical Work ID를 사용하도록 repository resolver와 관리 목록에 연결하고 실제 merge/undo 전후 교정 대상·원문 보존을 검사했다. 이 변경을 포함하기 전 세 번째 host 실행도 중단했다. 수정된 소스에서 새 domain13개/UI18개·분석이 통과했다. 최종은 `build/composer_context_complete_20261112`의 새 실행을 사용한다.

`build/composer_context_complete_20261112/run-ioP8Ic`는 host810개 통과/1개 실패였다. 기존 settings 백업 테스트가 real DB preview를 고정100ms만 기다리고 확인 dialog를 검사해 부하 중 실패했다. production 백업 결과를 바꾸지 않고 실제 dialog 표시까지 최대5초 내 관측하도록 테스트 동기화를 고쳤다(성공/내용/가져오기 assertion 유지). 해당8개 테스트가 통과했다. 실패 실행을 최종 PASS로 바꾸지 않고 최종은 `build/composer_context_checks_20261112`의 새 실행을 사용한다.

해당 후속 실행의 host811개·분석/fixture/성능·캡처133개·native library는 통과했다. 직접 파일 감상 이력을 추가한 새 native 시나리오의 백업 계약을 검토하며, 기존 validator가 catalog 이력만 인정해 직접 파일 이력의 export를 거부하는 누락을 확인했다. file ID가 실제 백업 파일에 있고 track/recording/work ID가 모두 정확한 `local-file:<fileId>`인 경우만 허용했다. 위조 ID 조합은 계속 거부하며 재생 이력이나 가짜 Work를 삭제/생성해 우회하지 않았다. 실제 백업/복원과 위조 참조 거부 테스트를 추가하고 새 최종 실행에서 검증한다.

## 최종 검증과 인계

2026-11-12 09:55–10:07 KST, `build/composer_context_regression_20261112/run-qPS5wv`의20개 검사 모두 통과했다. 최종 실행 명령은 다음과 같다.

```sh
dart run tool/run_local_qa.dart --library-ux --captures \
  --simulator 38B3F034-2212-4566-B09B-AC5DFEEB1187 \
  --android-device emulator-5580 \
  --output build/composer_context_regression_20261112
```

| 검사 | 실제 결과 |
| --- | --- |
| 소스 전후 fingerprint | 모두 `1e88fa1f6d039982e7d9c0581462641bb682656ad0e54ea80d037431897af81f` |
| Flutter/Dart | 3.47.2 / 3.13.2 |
| format | lib/test/integration_test/tool 194개·변경0 |
| 전체 host | 812개 통과 (새 domain14개·UI18개 포함) |
| widget 캡처 회귀 | 133개 통과; host와 겹치는 재실행이므로 합산하지 않음 |
| analyze/fixture/decoder/capability | 통과; 포맷 capability의 미지원/미검증은 별도 유지 |
| 대형 보관함/검색/stress | 통과; host fileEntries85,830µs·검색246,561µs·max RSS366,559,232bytes, 물리 성능 아님 |
| iOS native | library1 / system-scenes5 / music-actions6 / formats3 / background2, 합계17개 플랫폼 실행 통과 |
| Android native | context1 / queue1 / background1, 합계3개 플랫폼 실행 통과 |
| 배포 도구 | Ruby13회/40assertions·실패0, Fastlane mode:check 성공 |
| diff | `git diff --check` 통과 |
| 이미지 | 주 실행86개 생성/hash 검증 + Android 보충1개. 아래 시각 판정과 구분 |

iOS는 기존 전용 iPhone17Pro/iOS26.5 simulator, Xcode26.5(17F42)를 사용했다. Android는 전용 `DDIRORI_QA_Play_API35_20261111` API35 google_apis arm64 AVD다. iOS/Android native 검사는 같은 기기에서 직렬로 실행했다. 새 native 시나리오는 실제 FLAC/just_audio를 pause/seek한 상태에서 standalone composer+직접 이력의 DB 재연결/legacy bootstrap, 작품 시대·IMSLP 참조·논리 백업 복원과 큐/항목/position 불변을 검증했다. iOS 실제 OS 앱 전환에서 index0→3→12 완료·위치 저장·자동 재개 금지, Android 실제 HOME/sleep/wake·foreground service·active session·pause/next/play/stop을 확인했다. 가청 출력 검증은 false다.

[주 실행 증거](evidence/play-composer-context-20261112/report.json)에 원본 로그/이미지·`handoff.json`, 현재 제품/공통 소스와 YAML의 `source-files.json`, 증거의 `files.sha256.json`을 보관했다. 과거 evidence와 snapshot은 덮어쓰지 않았다.

최신 주 실행에서 작곡가 관리390px/light, 편집320px/200%/light, 작품 시대1024px/200%/dark, IMSLP390px/light·320px/200%/light, 시대 필터가 있는 작곡가 상세390px/light의6개 PNG를 직접 열었다. floating label과 저장/취소, 긴 이름·출처·미분류/다중 시대, IMSLP 일치/차이와 파일 종류 안내가 표시된다. 큰 글자 화면은 스크롤 상태이며 한 이미지에 모든 필드가 동시에 담기지 않는다. 키보드/semantics·busy/오류·취소·지연 응답은 자동 widget 검사로 분리했다.

주 실행 Android PNG는 실제 전환 중 빈 System UI frame이므로 미디어 카드의 시각 통과 근거에서 제외했다. 원본은 수정하지 않았다. 같은 소스에서 `python3 tool/run_android_background_audio_qa.py --device emulator-5580 --output build/composer_context_android_notification_20261112`를 다시 실행해 기능 PASS와 새 캡처를 생성했다. 보충 PNG를 직접 열어 합성 곡명·아티스트·재생/이전/다음/정지·진행 표시를 확인했다. [보충 증거](evidence/play-composer-context-android-notification-20261112/result.json)에 명령 결과·소스 hash·이미지 hash를 별도로 보관했다. 이 재실행을 새 고유 테스트로 합산하지 않는다. fixed0.4초 촬영 대기는 드물게 빈 전환 frame을 얻을 수 있으며 PNG 유효성 검사가 시각 내용을 대신하지 않는다는 진단 한계를 기록한다.

## 미검수·복구·종료

- IMSLP 공식 문서/정책은 조회했으며 검색/장애/연결 자동 회귀는 fixture다. live API 호출과 실제 외부 브라우저/제공자 사용성은 이번 결과로 통과 처리하지 않았다. 공식 페이지 수동 경로와 검색 실패 fallback을 유지한다.
- iPhone Xs/Android 물리 청감, VoiceOver/TalkBack 실제 발화·순서·focus, Files/문서 제공자, Bluetooth/유선·전화 interruption, 제조사 절전·gapless 실측은 미검수다. 기존 MP3 encoder/이전 iOS runtime 한계도 그대로 남긴다. 5~10분 사용자 동선은 물리 기기 체크리스트에 기록했다.
- 새 작곡가 사전/자동 지문·생몰연도 기반 시대 판정, 새 연주자 탐색·계정/동기화·scraping·유료 API는 추가하지 않았다. 공통 ddirori_ui API·색·아이콘은 그대로다.
- 기준 HEAD와 버전0.1.0+4·feedback2 유지, schema19 additive 확장이다. 제품은 미커밋이고 YAML은 pending/reviewed false다. 커밋·푸시·서명 archive·업로드·배포하지 않았다.
- 복구 checkpoint는 저장소 밖 `ddirori-play-snapshots/20261112-composer-context/play-worktree-final.tar.gz`와 `snapshot.json`이다. 기존 미커밋 변경·새 소스/문서·현재/과거 증거를 포함하고 각 파일 hash와 별도 임시 index의 tracked patch 적용 검사를 수행한다. 실제 index는 변경하지 않는다. 복구는 기준 HEAD의 새 깨끗한 worktree에 수행하고 기존 dirty worktree를 덮어쓰지 않는다.

이번 세 작업의 로컬 구현·검증·인계를 마치고 목표를 종료한다. 추가 기능을 자동 선정하지 않는다. 물리/live 미검수를 출시 승인으로 해석하지 않는다.
