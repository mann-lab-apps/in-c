# Play 상용 품질 평가·QA 보강

후속 보완(2026-11-12): 아래 평가/증거는 당시 기록으로 유지한다. 재생 빈 표시·큰 글자·가져오기 ENOSPC·백업 타입과 portable undo·QA 지문v2·MP3·운영 진입의 최신 구현/검증과 공개 출시 게이트는 [출시 전 완성도 보완](classical-local-library-release-hardening-2026-11-12.md)을 따른다. 최신 자동 통과가 물리 QA나 공개 게시 승인을 대신하지 않는다.

평가 대상은 지속 worktree `ddirori-play-library-context-20261031`의 schema19/0.1.0+4 미커밋 소스다. 원본 저장소·다른 앱·배포 빌드와 구분한다. 기존 composer-context 증거와 복구 snapshot은 보존한다. 새 기능·배포·커밋·푸시는 이번 범위가 아니다.

초기 판정: 핵심 기능은 내부 베타 후보 수준이다. 공개 상용 출시 준비 완료로 판정할 증거는 부족하다. 테스트 수를 점수로 환산하지 않고 데이터 무결성·재생·접근성·실제 플랫폼·운영을 구분한다.

| 검사 | 수용 조건 | 실패 기준 | 증거 | 상태 |
| --- | --- | --- | --- | --- |
| 백업 복구 | 존재하는 ID 사이의 소유 관계와 로드 가능한 JSON을 검증, 잘못된 백업은 DB 변경 전 거부 | 다른 곡/작품의 참조를 혼합하거나 재시작을 깨는 payload 허용 | SQLite 반례/정상 왕복/구버전/실패 rollback·native | 자동/native 통과 |
| Android QA | 실제 앱 미디어 세션/알림 내용이 준비된 뒤 캡처, 제한 시간·실패 구분 | 빈 OS 전환 frame/다른 앱 알림을 PASS 근거로 사용 | 순수 판정 테스트·전용 emulator·생성 hash·직접 이미지 확인 | emulator 통과 |
| IMSLP live | 공개 고정 질의로 실제 연결 진단, 실패 시 앱의 안전한 fallback과 구분 | fixture 성공을 live 성공으로 표현하거나 접근 제한 우회 | 별도 native live 진단·기존 장애 fixture | 2026-11-12 응답 통과 |
| 회귀·인계 | format/test/analyze/fixture·새 QA output/hash·metadata check·복구 snapshot | 이전 증거 덮어쓰기/미검증 승인/다른 작업 변경 | 실행 로그·source/evidence registry | 통과·물리/배포 별도 |

참고 기준(2026-11-12 공식 문서 확인): [Flutter testing](https://docs.flutter.dev/testing/overview)은 단위/위젯/통합 검증의 범위가 다름을 설명한다. [Android Core quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)의 상태 복귀·데이터·플랫폼 기준과 음악 앱의 지속 재생 정책을 함께 평가한다. [TestFlight](https://developer.apple.com/testflight/)는 사용자 피드백을 받는 베타 단계이며 공개 출시 승인을 대신하지 않는다.

물리 Xs/Android 청감·VoiceOver/TalkBack·실제 문서 제공자·Bluetooth/전화·장시간 실제 라이브러리는 사용자 QA로 남긴다. Apple/스토어 상태·운영 선언·현재 배포 artifact는 새로 검증하지 않은 값을 통과로 표시하지 않는다. 유료 farm/API·원본 음원 수정·개인 파일 수집·서명/업로드는 하지 않는다.

## 발견한 결함과 보완

1. 원래 백업은 잘못된 이름/태그 JSON·교정값과 출처 불일치를 preview 단계에서 허용했다. 기존 트랜잭션은 삽입 실패 rollback은 보장하지만 삽입 가능한 잘못된 JSON이 이후 repository 읽기를 깨는 문제까지 막지 못했다. 저장 모델과 같은 MetadataOverride decoder를 공유하고 중첩 JSON·이름/출처/태그·병합 감사 형식을 검사한다. 관계 검사 중 타입/JSON 오류도 사용자용 LibraryBackupException으로 정리한다.
2. 존재하는 ID만 조합하면 다른 작품의 악장/감상 이력을 섞을 수 있었다. 작품/녹음의 active alias를 해석해 관계를 검사한다. 순환·self·중복 active alias는 거부한다. 정상적인 chained Work merge의 이력과 원래 녹음 관계는 보존한다. 파일 교체 전 이력은 현재 파일 매핑과 다를 수 있으므로 현재 매핑과 같도록 강제하지 않는다.
3. 백업 내보내기가 감상한 경로보다 원래 catalog track의 file ID를 우선해 교체 파일의 이력을 잘못 연결했다. 등록된 실제 감상 경로가 있으면 해당 file ID를 우선한다. 원본 태그·음원 byte·DB schema를 변경하지 않는다.
4. Android QA는 유효한 PNG 생성/해시만 검사해 SystemUI 전환 중 빈 frame도 통과할 수 있었다. 실제 앱의 같은 media-session record, 해당 SystemUI 미디어 카드의 정확한 합성 제목과 enabled controls를 함께 확인한다. 새 계층만 허용하고 기한·실패 report를 추가했다. 판정의 빈 화면/잘못된 앱/다른 곡/조작 누락/timeout 반례를 순수 Python으로 검사한다.

Android 조사 실행에서 원래 재생 waveform 때문에 UIAutomator idle 획득 실패를 실제 실패로 기록했다. 전용 AVD에서 animation scale을0으로 두고 OS pause가 native 엔진에 반영된 뒤(next marker 직전) 안정된 일시정지 카드를 촬영한다. API35의 실제 header_title/qs_media_controls 구조를 확인해 판정 fixture를 수정했다. 세 번의 실패 로그는 성공으로 바꾸지 않는다. 마지막 단독 runner는 실제 OS pause/next/play/stop과 UI 계층/이미지 확인을 통과했다. 물리 청감·알림 버튼 터치는 검증하지 않았다.

수정 전 history 파일 ID 반례와 중첩 work_part JSON 반례가 실패했고 수정 후 backup 테스트11개가 통과했다. 손상 JSON10종과 관계 오류2종은 preview/import 양쪽 거부 및 기존 DB 데이터 불변을 검사한다. 정상 복원 후 실제 metadata override/merge store 읽기·중복 복원·기존 rollback·직접 파일 이력·구버전 호환을 함께 회귀한다. 최종 전체 실행 전 시험 실행은 새 반례 추가로 중단했으며 최종 증거와 합치지 않는다.

## 상용 수준 판단 기준

| 영역 | 판단 | 근거와 한계 |
| --- | --- | --- |
| 로컬 관리·재생 기능 | 내부 베타에 충분 | 가져오기·검색·재생목록·큐/위치·작곡가/시대·백업 기능과 회귀가 존재한다. 기능 수가 공개 출시 품질을 증명하지는 않는다. |
| 데이터 복구 | 이번 결함 보완 후 자동 회귀 가능 | DB 변경 전 반례 거부·정상 병합/교체/구버전 복원 확인. 실제 사용자의 파일 제공자·복구 UX는 별도다. |
| 오디오·플랫폼 | 자동/native 범위만 확인 | 실제 엔진/플랫폼 상태와 host PCM 디코딩을 구분한다. 물리 출력·구형 OS·실제 MP3 positive fixture는 미검증이다. |
| 접근성·화면 | 자동 semantics/레이아웃 + 일부 이미지 검수 | 320/390/1024·200%·light/dark 검사. 320/200% 보관함 최근 추가 제목의 한 글자 줄바꿈 등 가독성 polish는 남는다. 실제 스크린리더 발화는 미검증이다. |
| 규모·장시간 | 합성 부하 측정만 확인 | 5천/2만 곡 host/JIT·worker 검색을 실행한다. Mac RSS와 시간을 Xs의 메모리/성능 또는 OS eviction 결과로 표현하지 않는다. |
| 배포·운영 | 이번에 판정하지 않음 | 현재 미커밋 작업본을 실제 배포 후보/기존 TestFlight와 혼동하지 않는다. 공개 URL 주입·metadata pin·release artifact/정책 검수는 제출 전 별도 게이트다. |

권고: 기능 추가보다 현재 작업본의 검증된 후보를 제공한 뒤 사용자 Xs 최소 동선과 실제 보관함 피드백을 먼저 수집한다. 물리 QA 미응답을 PASS로 해석하지 않고, 치명 문제 없이 해당 게이트를 확인한 뒤 공개 출시 여부를 판단한다. 유료 테스트 인프라나 전체 실기기 매트릭스를 먼저 요구하지 않는다.

캡처에서 확인한 낮은 우선순위 UX: 정보가 없는 직접 파일의 전체 재생/미니플레이어에 구분점만 남는 보조 텍스트가 보인다(`native-creation-result.png`, `native-playlist-detail.png`). 320/200%의 ‘최근 추가한 음악’ 제목은 마지막 한 글자로 줄바꿈될 수 있다(`library-320-2-light.png`). 오디오/저장 실패는 아니지만 “모든 상용 UX가 완성됐다”는 판단의 근거로 이 캡처를 사용하지 않는다. 다음 화면 polish에서는 빈 필드 조합을 숨기는 표시 규칙과 언어별 줄바꿈을 우선 다룬다.

## 최종 실행

최종 runner: `apps/classical_local_library/build/commercial_quality_final_20261112/run-tfDYpp`, 2026-11-12 10:30–10:40 KST. [보관한 report](evidence/play-commercial-quality-20261112/report.json)의21검사가 모두 통과했다.

- 전체 host **816개**, 별도 Python **3개**, format/analyze/fixture/host decoder·5천/2만 곡 부하 통과. widget capture 재실행133개는 host 테스트의 부분집합이므로 새 테스트 수에 더하지 않는다. 큰 보관함 host 검색은2만 곡 약0.45–0.53초, 최대 RSS 약484MB로 측정됐으며 Xs 수치나 배포 성능 보장은 아니다.
- iOS26.5 simulator native **17개**: library1/system scenes5/music actions6/formats3/background2. Android API35 전용 emulator native **3개**: context1/queue1/background1. 실제 OS app switch와 미디어 키에 native 엔진 상태가 응답했고 새 손상 백업 거부를 두 플랫폼의 실제 SQLite에서 확인했다. 물리 청감/버튼 터치 검증은 아니다.
- IMSLP 공개 고정 질의 Beethoven의 별도 iOS live **1개** 통과. 종료 시점의 네트워크 증거이며 향후 가용성/권리 승인이 아니다. 빌드 후 재실행과 QA 도구8개/Android context 재실행은 중복으로 테스트 수에 더하지 않는다.
- `flutter build ios --simulator --no-codesign` 통과. 빌드된 Info.plist의 bundle `com.mannlab.ddirori.play`, version0.1.0/build4, minimum iOS15.0, UIBackgroundModes audio를 직접 검사했다. 서명 archive/배포 후보 검증은 하지 않았다.
- metadata Ruby13 runs/40 assertions, Fastlane check, git diff --check 통과. TODO/FIXME/Flutter Demo/Counter는 lib/test/integration_test/tool에서 발견되지 않았다. YAML pending/reviewed false와 버전/schema19를 유지했다.
- 새 PNG **86장**(widget82/native iOS3/Android1)을 파이프라인에서 생성·해시 검증했다. 직접 열어 확인한 최종 이미지는 library-320-2-light/composer-editor-320-2-light/search-failed-390-1-light/native-creation-result/native-playlist-detail/composer-imslp-390-1-light 및 Android 알림7장이다. 모든 이미지를 개별 사람 검수했다고 표현하지 않는다. 웹 시안/스토어 촬영 승인으로 승격하지 않는다.

QA 실행 전후 fingerprint는 `53f9affa6664dc4cb86ab7f59b0b72e2b2ba68478dd96ac464ebec50074b7747`로 일치한다. 이후 일반 iOS simulator build가 Git-ignored `android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java`의 integration_test 등록을 제거해 현재 fingerprint는 `606e955cb37a13dadf821b157f366752447d477abfe582e23f2381a7c8792d74`다. 해당 파일의 이전 바이트만 **메모리에서** 대입해 원래 QA fingerprint가 정확히 재현되는지 검사했다. 제품 파일을 되돌리거나 원본 report의 hash/PASS를 수정하지 않았다. [생성 파일 차이 증거](evidence/play-commercial-quality-20261112/generated-only-drift.json), 빌드 후 실제 native/live·QA 도구 재검사와 현재 source271개 hash를 별도로 보관했다. 동일 hash라고 숨기지 않는다.

새 [증거 목록](evidence/play-commercial-quality-20261112/files.sha256.json)은132개 파일 hash를 포함한다. 과거 composer-context117개/알림 보충5개 증거와 이전 외부 snapshot의 hash도 그대로였다. 복구 checkpoint는 저장소 밖 `ddirori-play-snapshots/20261112-commercial-quality/play-worktree-final.tar.gz`와 `snapshot.json`에 둔다. 기준 HEAD `f57602c18ce55031833faabf37a073da437453b9`의 새 깨끗한 worktree에만 복원하며 dirty worktree를 덮어쓰지 않는다. index/커밋/푸시/배포는 변경하지 않는다.

최종 판단: **현재 작업본은 내부 베타 후보로 적합하다. 공개 상용 출시 준비 완료 판정은 보류한다.** 남은 물리 검증은 [약10분 사용자 동선](classical-local-library-physical-device-checklist.md)에 묶었다. 실제 후보 설치·Xs/구형 OS·MP3·청감/액세서리/제공자/스크린리더·장시간 실제 보관함과 공개 배포 설정을 확인한 뒤 출시 여부를 판단한다.
