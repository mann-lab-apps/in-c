# 서비스 연결 계약

## 공통 완료 모델

`출발 작업 → source pending → 파일 결과 → 사용자 전달 → receiver 선택 → receiver pending → 수신 저장 → 다음 작업`.

출발 앱과 수신 앱은 각각 자기 성공·취소·실패만 확인한다. OS share success가 ‘Score에 저장됨’은 아니다. 현재는 공통 transfer ID나 callback protocol이 없다. R3 시안의 도착/복귀 버튼·한 메모리 request의 replay 방지는 검토 도구이며 제품의 실제 앱 간 통신이 아니다.

미래 adapter가 필요하다면 논리적인 작업 ID·허용된 route/context·명시적 결과를 사용한다. 임의 URL·전역 경로·private 파일을 context에 넣지 않는다. 파일은 host 플랫폼이 제공하는 읽기 권한/수명·안전한 복사 정책으로 다룬다. 설치 unknown과 not-installed를 합치지 않는다. 미설치 판정·공식 배포 URL이 없으면 안내만 제공하고 설치 성공으로 가정하지 않는다.

## J01 · 만든 PDF로 연습하기

| 항목 | 계약 |
| --- | --- |
| 목적 | 편집 가능한 원본을 보존하면서 Score에서 읽고 주석·연습 |
| 현재 진입 | Studio 기존 내보내기→PDF 변환. 파일 저장 성공 주변에 수동 후속 안내를 제안 |
| 버튼 | 현재 ‘PDF 변환’의 실제 command 보존. 후속 설명은 ‘PDF로 연습 이어가기’/‘가져오는 방법’. 직접 앱 열기가 없으면 ‘Score에서 열기’ 금지 |
| 출발 데이터 | 현재 score/part·page setup에서 생성한 PDF 사본. .chromatics/MusicXML을 PDF로 가장하지 않음 |
| 저장 | PDF 출력은 현재 프로젝트 snapshot의 편집 저장과 별개. 필요하면 프로젝트 저장을 별도 제안하되 기존 dirty 처리를 바꾸지 않음 |
| 전달 | Studio desktop→사용자가 선택한 파일 보관 방법→Score mobile. 공유 폴더/서비스·USB·OS 전달은 사용자 선택이며 띠로리 cloud sync가 아님 |
| 도착 | Score PDF picker, 또는 실제 지원되는 PDF document/intent 수신. 앱 내부 PDF 사본과 library persistence 성공 뒤 문서 열기 |
| 첫 화면 | 정상 지면·파일명·페이지. 첫 열기는 현재 정책, 동일 PDF가 기존 악보라고 자동 병합하지 않음 |
| 다음 행동 | 읽기→선택적으로 주석/연습. Studio의 editable score 데이터가 넘어온 것처럼 설명하지 않음 |
| 원본/사본 | Studio project, 내보낸 PDF, Score 내부 PDF는 독립. 이후 Studio 수정은 Score에 자동 반영되지 않음 |
| 복귀 | OS 앱 전환/사용자 기기 전환. Studio 문서·선택·undo·dirty 유지. 실제 전용 returnContext는 C 목표 |

### 상태와 수용

- source 저장 취소: 파일 결과 없음, 문서/선택 유지, 수신 성공 없음.
- PDF 출력 실패: 같은 문서에서 재시도. 기존 PDF가 있으면 새 요청 결과와 구분.
- 기기 전달 미완료/앱 없음/설치 불명: 파일 보관·수동 가져오기 안내. 무한 대기나 자동 설치 상태 없음.
- 수신 파일 없음/접근 불가: 다운로드한/접근 가능한 사본 선택. 개인 파일의 절대경로를 기본 안내에 노출하지 않음.
- 다른 형식 선택: .musicxml/.chromatics는 Score PDF 경로에서 거절. 확장자 변경을 변환으로 안내하지 않음.
- 수신 저장 실패: 성공 count·열기·환영을 미리 확정하지 않음. 부분 복사/남은 사본·중복 재시도 정책을 현재 저장소와 대조.
- 성공 후 재전달: 현재 제품이 내용 중복 제거를 보장하지 않으면 새 사본 생성 여부를 설명. native bridge의 동일 경로 억제를 전체 transaction dedupe로 확대하지 않음.

실제 PDF3페이지에서 출력 파일/Score 사본의 파일명·페이지 수·본문 확인, 주석 저장·반환 후 원본 내용 유지. OS dialog 취소와 기기 간 전달은 실제 기기/desktop 검수로 분리한다.

## J02 · 듣던 음원을 악보에 연결하기

| 항목 | 계약 |
| --- | --- |
| 목적 | 내가 가진 녹음으로 악보를 보며 연습 |
| 현재 진입 | Play 관리→파일 작업→앱 관리 복사본 내보내기. Score에서는 악보 정보→연결 파일, 이후 연습→연결 음원 |
| 표시 조건 | 실제 ManagedAudioLibrary가 completed·존재하는 관리 사본을 제공할 때. 스캔 참조/누락 파일을 내보낼 수 있다고 표시하지 않음 |
| 전달 데이터 | 음원 파일 사본·표시명·가능한 MIME. 개인 경로·Play queue index·local work ID를 Score 식별자로 전달하지 않음 |
| 형식 | 선택 확장자 교집합 MP3/WAV/M4A/FLAC/OGG. codec/profile은 기기 검사. ALAC/OPUS는 자동 변환 기능 없음 |
| 수동 단계 | OS 파일 보관→Score에서 사용자가 대상 악보 선택→악보 정보의 연결 파일 picker→사본 저장/metadata 반영 |
| 도착 | 기존 PDF·현재 페이지·주석을 유지하고 연결 음원 목록 갱신. 파일명이 비슷하다고 다른 악보에 자동 연결하지 않음 |
| 다음 행동 | 연습 도구→연결 음원→사용자가 재생. 브랜드 효과음·자동 재생 없음 |
| 재생 책임 | Play 재생 상태와 Score 연습 상태는 별도. 시안 source는 이미 일시정지42초. 실제 navigation이 무조건 stop/seek를 호출하지 않음. 두 엔진의 오디오 세션 정책을 실제 플랫폼에서 확인 |
| 사본 수명 | Play 관리 사본·사용자 보관 사본·Score 연결 사본이 별개. 삭제/수정이 다른 앱에 동기화되지 않음 |
| 복귀 | Play queue·current recording·position·pause 의도를 보존. Score page·선택·연결 파일도 유지. 양방향 상태 동기화를 새로 만들지 않음 |

### 상태와 수용

공유 dismissed/unavailable/failed/success 각각의 현재 결과를 보존한다. success는 OS share 결과이며 파일 앱 보관이나 Score 추가를 증명하지 않는다. 수신 과정은 별도 선택이다. 원본 파일 없음·접근 거절·Score 미지원 형식·수신 저장 실패는 각 단계에 복구를 제공한다. 완료한 파일을 지우고 처음부터 다시 가져오게 하지 않는다.

현재 직접 오디오 수신 intent를 확인하지 못했으므로 “Score로 바로 보내기” UI는 C 목표다. 수동 가이드가 첫 구현 범위다. 현재 연결 파일 저장 실패 시 파일·metadata의 정합성은 제품에서 검사한다. 교차 앱 동시 재생·다른 기기·화면 잠금·audio route는 기기 검사이며 R3 메모리 시안 통과로 보증하지 않는다.

## 공통 UI와 host의 경계

- 공통 가능: ProductSignature·Item·Button·Dialog·Banner·Progress·ServiceLink의 현재 availability 표현.
- 앱 composition: 작업 결과 옆 후속 안내, 수동 안내 sheet/dialog, 파일명·형식·원본/사본 설명.
- host adapter: 현재 file capability, export/import command, URI grant·복사·중복·과거 응답 억제, 공식 URL allowlist, 실제 설치 판단·return routing.
- 제품 기능: 직접 앱 전환·자동 대상 매칭·호환성 변환·공유 계정은 별도 범위.

ServiceLink의 현재 action label은 available=‘열기’, install=‘설치 안내 보기’ 등으로 고정이다. ‘가져오는 방법’을 열면서 ServiceLink의 ‘열기’ 버튼을 재사용하면 결과를 오해할 수 있다. R3는 수동 안내에 ProductSignature+명확한 Button을 조합하고, ServiceLink는 리뷰의 설치/불명 상태 표현에 사용했다. 후속 API actionLabel/보조 행동 확장은 두 실제 구현 소비처에서 같은 계약을 확인한 후 제안한다. 현재 두 여정은 설계 소비처이지 이미 구현된 두 소비처가 아니다.
