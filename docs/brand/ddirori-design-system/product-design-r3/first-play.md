# F01 Play · 내 음원을 첫 재생까지

대상 `apps/classical_local_library/`. 기존 홈/관리·catalog registration·local import·playback controller를 사용한다. R2의 탐색/현재 재생 분리 작업이 진행 중이므로 동일 영역을 통째로 다시 구현하지 않는다.

## 흐름과 화면

1. 빈 라이브러리: 제목24, 짧은 설명16, 주요 행동 ‘음원 파일 가져오기’. 폴더는 현재 지원 플랫폼과 실제 picker capability가 있을 때 보조 행동. 다른 앱/계정 요구 없음.
2. 실제 선택기: 지원 확장자·기기 다운로드/접근 가능성 확인. 선택 취소는 기존 자료 유지, 오류/완료 성취 없음. 전역 저장소 권한·설정 이동을 불필요하게 먼저 요구하지 않음.
3. 복사/분석: 실제 bytes/count가 있으면 표시, 아니면 작업명+Progress. 임시 파일과 완료 파일 구분. imported/duplicate/pending/failed/cancelled 결과를 합치지 않음.
4. 결과: 보관된 파일명·가져옴/분석 대기/실패를 보여주고 ‘작품·녹음으로 정리’로 현행 CatalogRegistrationScreen 진입. 내용을 미리 아는 데모를 자동 주입하지 않음.
5. 정리: 실제 태그/사용자 입력으로 작곡가·작품명·녹음명·악장명 확인. 작품 번호·연주자·지휘자·연도와 기존 작품/녹음 선택은 전체 폼에서 유지. 필수 데이터 요구를 숨기지 않음.
6. catalog/register/link 실제 저장 완료 뒤 해당 작품·녹음/악장에 접근. 실패는 draft·보관 파일 유지. 성공 전에 route를 닫거나 재생 가능으로 표시하지 않음.
7. ‘재생’은 실제 queue/engine 명령, engine playing snapshot 뒤 첫 성취. preparing/buffering/paused/error와 ‘현재 악장’을 구분. 자동 재생을 새 정책으로 추가하지 않음.

R3 form은 필수 필드 배치 subset이며 기존 전체 폼을 축소하라는 요구가 아니다. 리뷰의 ‘연습 녹음.wav/나의 연습곡’은 가상 fixture, 실제 파일 분석 결과가 아니다.

## 상태·보존

| 조건 | 계약 |
| --- | --- |
| duplicate | SHA256 정책의 실제 결과, 완료 count에 새 파일로 중복 합산하지 않음 |
| partial | 성공 파일 유지, 실패 파일만 사유·재시도. 복수 입력이 실제 가능한 경로에서만 사용 |
| analysis pending | 파일 보관 성공과 구분. 태그 결과를 지어내지 않으며 수동 정리 접근 유지 |
| 접근 불가/파일 미다운로드 | 접근 가능한 사본을 선택하도록 안내. 원인을 확인하지 않고 일반 권한을 요청하지 않음 |
| 정리 취소 | draft를 새 대상/실제 catalog에 반영하지 않음. 보관 파일은 관리 목록에 남음 |
| 등록 실패 | 확정되지 않은 입력·대상 ID 유지, retry는 같은 의도를 처리. 이전 snapshot/queue를 유지 |
| 재방문 | 기존 catalog는 바로 목록, 등록 전 파일은 관리/결과 진입 제공. 신규 소개 강제 표시 없음 |
| UI 전환 | 검색/테마/상세/제품군 안내가 queue·position을 초기화하지 않음. R2 adapter 계약 유지 |

## 책임과 구현 분류

1. 현재 공통 API: DdiroriStatePanel/Bach·Button·Item·Input·Banner·Progress, 테마/타이포.
2. 앱 composition: import 결과→관리/정리 진입, 단계 안내, 현재 재생 접근. importer·catalog·fileTrackLink·engine가 실제 상태 소유.
3. 공통 API 확장: 현재 필수 아님. 공유 파일 클라이언트나 catalog 객체를 UI 패키지로 이동하지 않음.
4. 목표: 첫 성취 안내·직접 다음 행동과 J02 가이드. 직접 Score 실행은 별도 기능.

목록 gap/행/라벨은 기존 토큰, 좁은 gutter16/넓은24~32, 주요 터치48, 정보 제목16/보조14. 긴 파일명은 표시명 전체 접근, 경로는 진단에만. 넓은 화면은 목록/다음 행동을 나란히 둘 수 있지만 필수 단계가 가로로 밀려 사라지지 않게 한다. 큰 글자에서 고정 높이로 압축하지 않는다.

## 수용·회귀

실제 파일→등록→첫 재생, picker cancel0회 import, 분석 대기·부분 결과·중복·복사 실패·store 실패. form local draft 취소·required focus·IME 중 submit 차단·중복 command 방지. 기존 자료/원본/queue/position·복구 정책 보존. 320/390/1024·200%·light/dark, keyboard/semantics·터치48.

현재 `local_audio_import_test`, catalog registration/management/library·playback 관련 테스트를 변경 범위에 맞춰 실행한다. 디코더·Files/클라우드 provider·오디오 세션·VoiceOver는 별도 기기 검수. metadata는 `deployment/apps/classical-local-library/ios-metadata.yaml`의 영향 내용을 AGENTS대로 갱신하고 mode:check. [반환 규약](implementation.md)을 따른다.
