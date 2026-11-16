# Play 출시 전 완성도 보완

대상: 지속 worktree `ddirori-play-library-context-20261031`, HEAD `f57602c18ce55031833faabf37a073da437453b9`, 미커밋/미배포. 이전 commercial-quality 증거132개·소스271개와 외부 snapshot을 검증하고 보존했다. schema19·feedback2·0.1.0+4를 기준으로 자동 구현/검증/인계를 수행한다. 물리 QA/출시 승인은 별도다.

| 단계 | 수용 조건 | 보존/실패 기준 | 검증 | 상태 |
| --- | --- | --- | --- | --- |
| 재생 표시/큰 글자 | 빈 메타데이터의 구분점 제거, 최근 추가 제목의 단어 단위 배치 | 제목/조작/semantics·320/200%·기존 토큰 유지, 글자 축소 금지 | 재현 widget/model 테스트·새 실제 Flutter 캡처 | 자동 검사·선택 이미지 검수 완료 |
| 가져오기/파일 복구 | 취소·부분 성공·실패 재시도·권한/누락 복구가 실제 행동으로 연결 | 원본/성공 파일·큐/위치 보존, 중복 사본·자동 재생 금지 | import/relink·ENOSPC 부분 성공/실패 대상 재시도 | 자동 검사 완료·실제 제공자 별도 |
| 백업 | 실제 store가 읽지 못하는 값은 preview/import 전 거부 | 정상 alias/merge/undo/구버전/직접 파일 이력·DB rollback | 타입/enum·실제 merge 경로·store 재읽기·양 플랫폼 재개방/undo/재백업 | 완료·이전 비정상 백업 제한 아래 명시 |
| QA 지문 | 생성 registrant와 제품 소스의 변경 구분·규칙 버전 명시 | Java/Kotlin 제품 코드·pubspec/설정 감지 유지, 과거 report 불변 | 순수 테스트 + 실제 test/build 전후 v2 지문·생성 artifact 목록 | 완료 |
| 재생/포맷/부하 | 신뢰 가능한 MP3 fixture와 기존 native 회귀·대형 검사 | 청감/물리/배터리와 host/native 증거 구분 | MP3 PCM·양 플랫폼 native decoder·5k/20k 부하·background | 자동 검사 완료·물리 출력 별도 |
| 운영 진입 | 실제 설정/공개 URL·문의·버전/삭제/진단 설명 일치 | 개인 정보 공유 최소화, 게시/스토어 쓰기 금지 | URL 응답·설정/진단 테스트·로컬 초안 | 로컬 완료·공개 URL/게시 외부 게이트 |
| 최종 인계 | format/test/analyze/fixture/Python/native/build/metadata·새 hash 증거·복구 checkpoint | 기존 변경/증거 보존·미검증을 PASS로 변경 금지 | 실행 로그/선택 캡처·새 증거와 외부 복구 결과 | 자동 검사 완료·인계 산출물 참조 |

커밋/푸시/버전 증가/서명/archive/업로드/출시는 하지 않는다. 각 단계의 관련 검사를 마친 뒤 다음 단계로 진행하며 범위를 임의 확장하지 않는다.

## 구현과 재현

- 재생 항목의 contextParts/contextLabel은 공백·빈 값을 제외한다. 전체/축약/큐 표시와 접근성 요약은 빈 구분자를 남기지 않으며 기존 의미 있는 쉼표 semantics는 유지한다. 직접 파일 제목·ID·큐·위치는 변경하지 않는다. 기존 반례 widget 검사와 R2 회귀35개, 컴포넌트·새 설정·QA 도구24개 검사를 수행했다.
- 최근 추가 제목의 실제 scaled text 폭을 측정해 제목이 밀리면 보조 행동을 별도 줄로 옮긴다. 카드의 최소 폭도 글자 배율에 맞춰 열 수를1~4로 조정한다. 글자 축소나 의미 있는 정보의 강제 말줄임은 없다. 실제 AppleSDGothicNeo/Material 글꼴의320/200% 사전 이미지를 열어 제목의 마지막 한 글자 줄바꿈이 사라짐을 확인했다.
- 가져오기는 기존 취소·중복·부분 성공·분석 재시도·누락 재연결을 유지한다. chunk writer에 실제 파일 쓰기를 기본으로 하는 주입 경계만 추가했다. 두 번째 파일에서 ENOSPC를 주입해 첫 파일·원본·등록을 보존하고 실패 파일만 재시도/중복 방지하는 검사가 통과했다. import/feedback/relink24개를 검사했다. OS 제공자 UI/실제 디스크 소진은 하지 않았다.
- 백업은 문자열/정수/숫자 타입, 실제 import/tag/review/credit/history/retention enum, confidence 범위, 음수 byte/재생 위치 등을 검사한다. 되돌린 병합도 entity_type을 검사해 load 시 enum 오류를 막는다. preview/import 모두 기존 검증 경계를 사용하고 정상 직접/교체 파일 이력·alias/병합/undo·구버전·rollback을 유지한다. 기존 backup fixture의 accepted는 실제 enum이 아니어서 approved로 교정하고 실제 candidate store 재읽기도 추가했다. 타입/enum 손상12종과 undone merge 반례, 기존 backup/favorites/composer/relink42개를 검증했다.
- QA 지문v2는 정확한 논리 경로의 Flutter registrant만 제외한다. 현재 생성 파일의 유무/해시는 별도 before/after artifact로 기록한다. 상대 경로의 lib/android/... 같은 제품 파일까지 제외되지 않도록 검사한다. pubspec/lock/native 설정·앱 Java/Kotlin·공통 UI·fixture는 계속 제품 지문에 포함된다. 과거 report/지문은 수정하지 않는다.
- 기존 설치된 Unity6000.3.23f1의 arm64 libmp3lame.dylib는 codesign verify와 Unity TeamIdentifier9QW8UQUTAA를 확인했다. LAME3.100의 [공식 API](https://github.com/lameproject/lame/blob/master/include/lame.h)와 [라이선스](https://github.com/lameproject/lame/blob/master/COPYING)를 확인하고 자체 PCM만 인코딩했다. 새 MP3는29,779bytes, source/encoder/output hash·서명 주체를 provenance에 기록한다. 바이너리/새 앱 의존성은 추가하지 않는다. encoder 없는 환경의 --check는 저장된 source/output hash를 검사하고 native decoder 검증과 구분한다.
- MP3 host afinfo는22,050Hz·52920 valid frames와 priming/padding을 보고했다. host PCM 디코딩은 실제2.4초·마커·무음·clipping 검사를 통과했다. 기존 native mixed-format 큐에 MP3를 추가해 load/play/pause/seek/next/복원·완료/오류 복구를 두 플랫폼에서 실행한다. 모든 파일/기기나 물리 청감·gapless를 보장하지 않는다. 기존 background/queue/대형 native 검사를 재사용하며 별도 무제한 soak 기능은 추가하지 않았다.

## 운영 진입과 공개 상태

APP_VERSION_LABEL 미설정의 잘못된0.1.0(1) 기본값을 ‘개발 빌드 (버전 정보 미설정)’으로 바꿨다. 실제 배포는 기존 YAML define0.1.0(4)와 preflight 일치 검사를 유지한다. 새 버전/빌드를 생성하지 않는다. URL 미설정이어도 기기 내 데이터 처리 안내를 읽고 확인된 공개 이메일 daga4242@gmail.com으로 문의 작성을 열 수 있다. 자동 진단/개인 파일 첨부나 발송은 없다. opener 실패는 플랫폼 경로 대신 공개 연락처를 남긴다. 초기화·이미 공유한 백업/외부 원본의 범위를 안내한다. 기존 익명 feedback의 allowlist/개인 값 거부 계약도 유지한다.

2026-11-12 이 환경에서 ddirori.mannlab.app는 DNS 해석 실패, 기존 임시 Site의 privacy/support는 HTTP403이었다. 웹 도구도 접근하지 못했다. 이 결과를 전 세계 접근 불가나 공개 게시 성공으로 일반화하지 않고 URL 확인을 pending으로 둔다. 앱/YAML에 미확인 URL을 주입하지 않는다.

게시 가능한 정적 초안은 deployment/apps/classical-local-library/public-pages/에만 있다. Sites의 로컬 전용 절차로 index/privacy/support·중립 CSS를 준비하고 로컬 HTTP200·한국어 제목/내부 링크/mailto·폼/스크립트 없음 검사를 통과했다. 브라우저 도구가 제공되지 않아 시각적 브라우저 검수는 미수행이다. 앱 위젯 캡처와 웹 초안 검수를 혼동하지 않는다. 운영 주체·적용일·최종 URL·게시 승인 확인 후 공개할 수 있다. 신규 Site 등록/원격 쓰기/게시를 실행하지 않았다.

## 실행 이력

첫 host 전체 실행은824개 중 큐 semantics의 구분 문자가 바뀐1개가 실패했다. 기존 쉼표 계약을 보존해 수정했다. 이후 첫 QA runner는 host827개·분석/fixture/host signal·부하를 통과했으나 실제 글꼴의320/200% 설정 캡처에서 화면 밖 텍스트를 누르던 helper가 실패했다. 해당 실행은 최종 증거로 사용하지 않는다. 행 전체를 화면에 보이게 하고 hitTestable을 확인한 뒤 탭하도록 수정해 실제 글꼴9장·관련24개가 통과했다. 같은 과정에서 수정한 QA 도구의 변수명 컴파일 오류도 교정했으며 실패 로그를 성공으로 덮지 않는다.

경로 보완 전 source v2의 iOS simulator build 전후 해시는 `e2b4d75b6e0f5c8f734406987667d26830ea4c39a28095e452adc039ce629422`로 일치했다. 해당 runner의22검사/host827개/native21개/PNG95장은 그 시점 소스의 증거로 `play-release-hardening-20261112`에 그대로 보존한다. 아래 추가 결함 수정 소스의 최종 증거로 재사용하지 않는다.

## 최종 데이터 보존 검토에서 추가 발견한 경로

실제 SqliteLibraryMergeStore.merge는 undo snapshot에 감상 이력·IMSLP 가져오기/자료의 전체 행을 담는다. 논리 백업이 이 JSON을 그대로 복사해 원래 iOS 경로가 남고, 일반 이력은 누락 URI로 복원되므로 undo의 after-image 비교도 실패할 수 있었다. 실제 merge→export에서 `/var/mobile/...`가 남는 반례를 먼저 실패시켰다.

백업용 snapshot만 변환한다. 감상 행은 기존 portable spec을 재사용해 file ID 기반 `ddirori-backup://missing/...` 경로로 바꾸고, 백업 범위 밖 imslp_imports/resources 행은 빈 selector로 둔다. 원본 DB의 snapshot·원본 파일은 수정하지 않는다. 복원한 빈 DB에서는 undo가 이력/ID를 되돌리고, 이미 관련 자료가 있는 DB나 복원 이후 변경에는 기존 전체 after-image 충돌 검사를 유지한다. 제외된 관리 사본/가져오기 행을 undo로 새로 만들지 않는다.

중첩 행의 타입·참조·휴대 가능한 URI와 제외 테이블 공백을 검사한다. JSON escape로 감춘 private path, 모르는 file ID, 비포함 import 위조는 preview/import 전에 거부한다. 되돌린 감사 기록의 after-image는 해당 병합의 역사적 source/target 관계로 검사해 undo 후 재백업도 유지한다. 현재 이력의 소유 관계 검사는 완화하지 않는다.

legacy의 빈 undo 감사 정보와 정상 구버전 백업은 유지한다. 개인 경로를 담은 이전 비정상 백업은 가져오지 않고 원본 라이브러리의 최신 앱에서 다시 내보내도록 안내한다. 원본 DB 없이 그러한 파일만 남은 경우를 위한 별도 복구 도구는 이번에 제공하지 않는다. 그 파일이나 현재 데이터는 삭제/수정하지 않는다. 모든 임의 변조 데이터에 대한 보안을 증명했다고 표현하지 않는다.

추가 host backup/merge24개와 iOS native DB의 실제 merge→backup→빈 DB 복원→DB 재개방→undo→재백업·원본 byte 보존 검사가 통과했다. 같은 native 검사는 최종 전체 회귀의 Android에서도 통과했다.

해당 소스의 첫 전체 실행 `release_hardening_portable_final_20261112/run-laqpFu`는20검사 통과·iOS formats/background2건 시간 초과로 `incomplete`다.12~13시대 host 전원 로그에는 실제 Sleep/Deep Idle과13:52 lidopen wake가 기록됐고 native test의 elapsed도36분·background build417초로 늘었다. 환경 중단을 앱 성공으로 바꾸지 않으며 이력/실패 로그를 보존한다. 동일 소스를 `caffeinate -i`로 새 output에서 재실행한다. 앱/테스트 timeout이나 수용 기준은 완화하지 않는다.

## 실제 화면 검수와 남은 UX

최종 실행의 `library-320-2-light.png`, `release-privacy-320-2-light.png`, `release-support-failure-390-1-light.png`, `release-settings-1024-2-dark.png`, `composer-queue-320-2-light.png`, `native-playlist-detail.png`, `android-background/android-media-notification.png`를 열어 확인했다. 최근 추가 제목은320/200%에서도 한 줄이며 보조 화살표는 별도 줄이다. iOS native 미니플레이어는 태그 없는 제목과 ‘재생 중’만 표시하며 빈 구분점이 없다. 큐의 실제 작품명은 유지한다. 설정의 공개 URL 준비 상태와 메일 실패 시 연락처, 개인정보 Dialog 닫기는 확인할 수 있다. Android OS 미디어 카드에는 자체 합성 음원 제목과 조작이 표시된다. native 캡처는 simulator/emulator이며 widget 캡처는 fake controller다.

큰 글자의 개인정보 안내는 긴 문장·영문 서비스명이 여러 줄로 나뉘고, 최근 추가1열 카드의 세로 점유가 크다. 스크롤/닫기는 유지되지만 가독성과 정보 밀도는 사용자 피드백을 받아 후속 조정할 수 있다. 모든95장을 개별 육안 검수하거나 물리 VoiceOver를 수행했다고 주장하지 않는다. 자동 layout/semantics 검사와 위 선택 이미지 검수를 구분한다.

## 출시 판정과 다음 행동

판정은 **새 내부 베타 후보의 자동 검증/복구 준비**, 공개 출시 준비 완료 판정은 보류다. 이 소스는 아직 서명·배포하지 않았으며 기존0.1.0(4) 설치는 새 변경의 검증 대상이 아니다.

출시 전에 필요한 항목:

1. 새 소스 checkpoint를 기반으로 배포 후보를 별도 만들고, 실제 후보의 버전/빌드/소스 일치를 확인한다. 이번 목표는 커밋·버전 증가·서명·업로드를 승인하지 않는다.
2. 공개 개인정보·지원 HTTPS URL과 실제 내용·접근성을 확인한다. 기존 공개 이메일과 아이콘 승인은 유지하며 재요청하지 않는다. 운영 주체 표기·적용일·최종 경로·게시 승인이 확인되면 로컬 초안을 공개하고 해당 후보 설정/메타데이터를 재검증한다.
3. 사용자 iPhone Xs에서 실제 OS·설치·청감·잠금/출력 전환·interruption·파일 제공자·VoiceOver 결과를 받는다. iOS26.5 simulator 통과는 구형 OS/물리 장치 통과가 아니다. Android를 배포 대상으로 선택하면 그 물리 후보도 확인한다. 지원 기기 범위와 알려진 제한은 후보 기준으로 판단한다.

사용자는 새 후보에서5~10분 동안 태그 없는 곡/큰 글자 확인→본인 권리 MP3·FLAC·M4A 재생/seek/다음→잠금30초→사용 가능한 장치/중단→파일 선택 취소/재선택→VoiceOver·앱 정보/문의 취소를 점검한다. [체크리스트](classical-local-library-physical-device-checklist.md)의 첫 절을 사용하며 개인 파일/경로를 보내지 않는다. 자동 테스트는 임시 DB의 오류/복원을 담당하므로 개인 라이브러리 초기화나 실제 디스크 소진을 요청하지 않는다.

출시 후 개선 가능한 항목은 큰 글자 장문 안내의 정보 밀도와 더 다양한 stereo/VBR·긴 음원/gapless의 검증 확대다. 실제 사용 라이브러리 규모·배터리·물리 출력은 자동 수치로 대신 판정하지 않는다. 지원하려는 포맷/기기에서 실제 결함이 발견되면 해당 후보의 차단 항목으로 재분류한다.

## 최종 실행 결과와 인계

2026-11-12 13:57:10~14:09:19 KST의 `release_hardening_awake_final_20261112/run-6DisDl`은22항목 모두 통과했다. 시작/종료 지문v2는 `117c95938a28b3badf7eac23083dd45a2c1477e400ff2653a1a408babaa0ae2f`로 일치한다. iOS simulator build 전후도 같은 지문이며 Android 생성 registrant의 변화는 별도 artifact로만 남는다. schema19·feedback2·0.1.0+4, 실제 HEAD/미커밋 상태를 유지한다.

| 검사 | 실제 결과/한계 |
| --- | --- |
| host `flutter test` |828개 통과. 이전 기준816개에서12개 증가. 아래 캡처 재실행을 추가 테스트로 합산하지 않는다. |
| widget 캡처용 재실행 |136개 통과, host의 부분 집합. 320/390/1024·큰 글자200%·light/dark·실제 글꼴을 사용한다. |
| Python Android QA 판정 |3개 통과. 빈/다른 세션 알림을 통과시키지 않는 기존 계약 유지. |
| iOS native |iPhone17 Pro simulator/iOS26.5에서17개 통과. 실제 decoder·SQLite 재개방·OS 앱 전환·주입 명령/Now Playing을 구분한다. 물리 잠금/가청 출력은 미검증. |
| Android native |전용 ARM64 API35 emulator에서4개 통과. MP3 포함 포맷·복원/undo·큐·background/앱 소유 미디어 세션·SystemUI 실제 내용 확인. 물리 청감 미검증. |
| 별도 IMSLP live |현재 소스에서 공식 검색 API를 실제 iOS runtime으로 호출한1개 통과. 개인정보 없는 Beethoven 검색, 다운로드/권리 승인/모든 네트워크 상태 검증 아님. 기본 fixture 회귀와 분리. |
| format/analyze/fixture |lib/test/integration_test/tool format, analyze, 합성 오디오·MP3 provenance check 통과. host PCM 2.4초·주파수 marker·quiet/clipping 검사 통과. |
| 규모 |5천/2만곡 합성 host/JIT·검색 worker 검사 통과. 시간/RSS는 각 로그에 있으며 실기기 성능·배터리 결과가 아니다. |
| iOS build |unsigned simulator build 성공. bundle com.mannlab.ddirori.play,0.1.0(4),최소iOS15,background audio를 빌드된 Info.plist에서 확인. signed archive 없음. |
| metadata |Ruby13runs/40assertions·Fastlane mode:check 통과. source pending/reviewed false·영향 manual pending 유지. |
| 소스/이미지 |22개 로그 hash와95개 고유 PNG hash 검증. 대표7장 열어 검수, 전체 이미지 육안/스토어 승인 아님. |
| 잔여/네트워크/diff |앱 lib/test/integration_test/tool의 TODO/FIXME/Flutter Demo/Counter, native cleartext/NSAllowsArbitraryLoads 검색은 일치 없음(rg exit1). git diff --check 통과. |

실행 명령은 앱에서 `caffeinate -i dart run tool/run_local_qa.dart --library-ux --captures --simulator <전용 simulator> --android-device emulator-5580 --output build/release_hardening_awake_final_20261112`다. 별도 live는 `flutter test --no-pub integration_test/imslp_live_search_integration_test.dart -d <전용 simulator> --reporter expanded`다. deployment는 기존 외부 bundle 경로를 사용해 `bundle exec ruby -Ilib test/ios_metadata_test.rb`, `bundle exec fastlane prepare_ios_metadata manifest:apps/classical-local-library/ios-metadata.yaml mode:check`를 실행했다.

최종 증거는 [play-release-hardening-final-20261112](evidence/play-release-hardening-final-20261112/)의 report/log·source-files·files.sha256·handoff에 둔다. 이전132개/144개 증거 registry와 기존 commercial-quality 외부 archive의 hash도 변경되지 않았다. 중단/실패 로그는 해당 이력 이름으로 보존하며 성공으로 바꾸지 않는다.

외부 checkpoint 위치는 `/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-snapshots/20261112-release-hardening/`다. `snapshot.json`이 실제 archive hash·파일 수·임시 index 복원 검사의 결과를 기록한다. archive의 manifest/바이너리 patch/파일을 이용해 기록된 baseCommit의 **새 깨끗한 작업 공간**에 복구한다. dirty checkout에 덮어쓰지 않는다. 실제 index 변경·커밋·푸시·버전 증가·서명/archive·업로드·공개 게시/스토어 작업은 수행하지 않는다. 기존 iOS simulator는 보존하고 이번에 실행한 전용 Android emulator와 로컬 HTTP server만 종료한다.
